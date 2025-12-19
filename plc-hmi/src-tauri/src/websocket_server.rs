use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, IpAddr};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, RwLock};
use tokio::time;
use tokio_tungstenite::{accept_async, tungstenite::Message};

use crate::database::Database;
use crate::tcp_server::TcpServer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub ip: String,
    pub is_active: bool,
    pub interface_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub host: String,
    pub port: u16,
    pub max_clients: u32,
    pub broadcast_interval_ms: u64,
    pub enabled: bool,
    pub bind_interfaces: Vec<String>, // Lista de IPs para fazer bind
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8765,
            max_clients: 100,
            broadcast_interval_ms: 1000, // 1000ms = 1 Hz (muito estável, sem travamento)
            enabled: false,
            bind_interfaces: vec!["0.0.0.0".to_string()], // Bind padrão em todas as interfaces
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketStats {
    pub active_connections: u64,
    pub total_connections: u64,
    pub messages_sent: u64,
    pub bytes_sent: u64,
    pub uptime_seconds: u64,
    pub server_status: String,
    pub broadcast_rate_hz: f64,
}

#[derive(Debug, Clone)]
pub struct ConnectedClient {
    pub id: u64,
    pub address: SocketAddr,
    pub connected_at: std::time::SystemTime,
    pub messages_received: Arc<AtomicU64>,
}

pub struct WebSocketServer {
    config: WebSocketConfig,
    is_running: Arc<AtomicBool>,
    connected_clients: Arc<DashMap<u64, ConnectedClient>>,
    active_connections: Arc<AtomicU64>,
    total_connections: Arc<AtomicU64>,
    messages_sent: Arc<AtomicU64>,
    bytes_sent: Arc<AtomicU64>,
    start_time: std::time::SystemTime,
    app_handle: AppHandle,
    database: Arc<Database>,
    tcp_server: Option<Arc<RwLock<Option<TcpServer>>>>,
    broadcast_sender: Option<broadcast::Sender<String>>,
    server_handle: Option<tokio::task::JoinHandle<()>>,
    broadcast_handle: Option<tokio::task::JoinHandle<()>>,
}

impl WebSocketServer {
    pub fn new(
        config: WebSocketConfig,
        app_handle: AppHandle,
        database: Arc<Database>,
        tcp_server: Option<Arc<RwLock<Option<TcpServer>>>>,
    ) -> Self {
        Self {
            config,
            is_running: Arc::new(AtomicBool::new(false)),
            connected_clients: Arc::new(DashMap::new()),
            active_connections: Arc::new(AtomicU64::new(0)),
            total_connections: Arc::new(AtomicU64::new(0)),
            messages_sent: Arc::new(AtomicU64::new(0)),
            bytes_sent: Arc::new(AtomicU64::new(0)),
            start_time: std::time::SystemTime::now(),
            app_handle,
            database,
            tcp_server,
            broadcast_sender: None,
            server_handle: None,
            broadcast_handle: None,
        }
    }

    // Função para detectar interfaces de rede disponíveis
    pub fn get_available_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
        use std::process::Command;
        
        let mut interfaces = Vec::new();
        
        // Adicionar localhost sempre
        interfaces.push(NetworkInterface {
            name: "Localhost".to_string(),
            ip: "127.0.0.1".to_string(),
            is_active: true,
            interface_type: "Loopback".to_string(),
        });
        
        // Adicionar todas as interfaces (0.0.0.0)
        interfaces.push(NetworkInterface {
            name: "Todas as Interfaces".to_string(),
            ip: "0.0.0.0".to_string(),
            is_active: true,
            interface_type: "All".to_string(),
        });

        // Detectar interfaces específicas usando ipconfig/ifconfig
        #[cfg(windows)]
        {
            if let Ok(output) = Command::new("ipconfig").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_windows_interfaces(&output_str, &mut interfaces);
            }
        }
        
        #[cfg(unix)]
        {
            if let Ok(output) = Command::new("ip").args(["addr", "show"]).output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_unix_interfaces(&output_str, &mut interfaces);
            } else if let Ok(output) = Command::new("ifconfig").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_unix_ifconfig(&output_str, &mut interfaces);
            }
        }
        
        Ok(interfaces)
    }

    #[cfg(windows)]
    fn parse_windows_interfaces(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_adapter = String::new();
        
        for line in lines {
            let line = line.trim();
            
            if line.contains("Adaptador") || line.contains("adapter") {
                current_adapter = line.to_string();
            }
            
            if line.starts_with("Endereço IPv4") || line.starts_with("IPv4 Address") {
                if let Some(ip_part) = line.split(':').nth(1) {
                    let ip = ip_part.trim().replace("(Preferencial)", "").trim().to_string();
                    if !ip.is_empty() && ip != "127.0.0.1" {
                        interfaces.push(NetworkInterface {
                            name: if current_adapter.is_empty() { 
                                format!("Interface {}", ip) 
                            } else { 
                                current_adapter.clone() 
                            },
                            ip: ip.clone(),
                            is_active: true,
                            interface_type: "Ethernet/WiFi".to_string(),
                        });
                    }
                }
            }
        }
    }

    #[cfg(unix)]
    fn parse_unix_interfaces(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_interface = String::new();
        
        for line in lines {
            if !line.starts_with(' ') && line.contains(':') {
                current_interface = line.split(':').next().unwrap_or("").trim().to_string();
            }
            
            if line.trim().starts_with("inet ") && !line.contains("127.0.0.1") {
                if let Some(ip_part) = line.trim().split_whitespace().nth(1) {
                    let ip = ip_part.split('/').next().unwrap_or("").to_string();
                    if !ip.is_empty() {
                        interfaces.push(NetworkInterface {
                            name: current_interface.clone(),
                            ip: ip.clone(),
                            is_active: true,
                            interface_type: "Network".to_string(),
                        });
                    }
                }
            }
        }
    }

    #[cfg(unix)]
    fn parse_unix_ifconfig(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_interface = String::new();
        
        for line in lines {
            if !line.starts_with(' ') && !line.starts_with('\t') && line.contains(':') {
                current_interface = line.split(':').next().unwrap_or("").trim().to_string();
            }
            
            if line.trim().contains("inet ") && !line.contains("127.0.0.1") {
                if let Some(inet_part) = line.split("inet").nth(1) {
                    if let Some(ip) = inet_part.trim().split_whitespace().next() {
                        if !ip.is_empty() {
                            interfaces.push(NetworkInterface {
                                name: current_interface.clone(),
                                ip: ip.to_string(),
                                is_active: true,
                                interface_type: "Network".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    pub async fn start(&mut self) -> Result<String, String> {
        println!("🟢 WebSocket start() chamado");
        
        if self.is_running.load(Ordering::SeqCst) {
            return Err("WebSocket server já está rodando".to_string());
        }

        println!("🟢 Preparando endereços de bind...");
        
        // Se bind_interfaces estiver vazio ou contiver apenas um item que é o host padrão, usar o comportamento original
        let bind_addresses = if self.config.bind_interfaces.is_empty() || 
            (self.config.bind_interfaces.len() == 1 && self.config.bind_interfaces[0] == self.config.host) {
            vec![format!("{}:{}", self.config.host, self.config.port)]
        } else {
            // Criar endereços para cada interface configurada
            self.config.bind_interfaces.iter()
                .map(|ip| format!("{}:{}", ip, self.config.port))
                .collect()
        };

        let mut listeners = Vec::new();
        let mut bound_addresses = Vec::new();

        println!("🟢 Tentando bind em {} endereços: {:?}", bind_addresses.len(), bind_addresses);

        // Tentar fazer bind em cada endereço
        for bind_addr in bind_addresses {
            println!("🟢 Tentando bind em: {}", bind_addr);
            match TcpListener::bind(&bind_addr).await {
                Ok(listener) => {
                    println!("🚀 WebSocket server iniciado em: {}", bind_addr);
                    bound_addresses.push(bind_addr.clone());
                    listeners.push(listener);
                },
                Err(e) => {
                    println!("⚠️ Erro ao fazer bind em {}: {}", bind_addr, e);
                    // Continuar tentando outros endereços
                }
            }
        }

        println!("🟢 Bind completo: {} de {} endereços funcionando", listeners.len(), bound_addresses.len());

        if listeners.is_empty() {
            return Err("Não foi possível fazer bind em nenhum endereço configurado".to_string());
        }

        // Canal para broadcasting
        let (broadcast_tx, _) = broadcast::channel::<String>(1000);
        self.broadcast_sender = Some(broadcast_tx.clone());

        // Marcar como rodando
        self.is_running.store(true, Ordering::SeqCst);

        // Clonar dados necessários para as tasks
        let is_running = self.is_running.clone();
        let connected_clients = self.connected_clients.clone();
        let active_connections = self.active_connections.clone();
        let total_connections = self.total_connections.clone();
        let messages_sent = self.messages_sent.clone();
        let bytes_sent = self.bytes_sent.clone();
        let app_handle = self.app_handle.clone();
        let max_clients = self.config.max_clients;

        // Task do servidor WebSocket para cada listener
        let mut server_handles = Vec::new();
        
        for listener in listeners {
            let broadcast_tx_clone = broadcast_tx.clone();
            let is_running_clone = is_running.clone();
            let connected_clients_clone = connected_clients.clone();
            let active_connections_clone = active_connections.clone();
            let total_connections_clone = total_connections.clone();
            let messages_sent_clone = messages_sent.clone();
            let bytes_sent_clone = bytes_sent.clone();
            let app_handle_clone = app_handle.clone();
            let max_clients_clone = max_clients;

            let server_task = tokio::spawn(async move {
                while is_running_clone.load(Ordering::SeqCst) {
                    if let Ok((stream, addr)) = listener.accept().await {
                        // Verificar limite de conexões
                        if active_connections_clone.load(Ordering::SeqCst) >= max_clients_clone as u64 {
                            println!("⚠️ Limite de conexões atingido, rejeitando {}", addr);
                            drop(stream);
                            continue;
                        }

                        let client_id = total_connections_clone.fetch_add(1, Ordering::SeqCst) + 1;
                        let client = ConnectedClient {
                            id: client_id,
                            address: addr,
                            connected_at: std::time::SystemTime::now(),
                            messages_received: Arc::new(AtomicU64::new(0)),
                        };

                        connected_clients_clone.insert(client_id, client);
                        active_connections_clone.fetch_add(1, Ordering::SeqCst);

                        println!("✅ Cliente WebSocket conectado: {} (ID: {})", addr, client_id);

                        // Emitir evento para o frontend
                        let _ = app_handle_clone.emit("websocket-client-connected", serde_json::json!({
                            "client_id": client_id,
                            "address": addr.to_string(),
                            "total_clients": active_connections_clone.load(Ordering::SeqCst)
                        }));

                        // Spawnar task para lidar com este cliente
                        let broadcast_rx = broadcast_tx_clone.subscribe();
                        let connected_clients_task = connected_clients_clone.clone();
                        let active_connections_task = active_connections_clone.clone();
                        let messages_sent_task = messages_sent_clone.clone();
                        let bytes_sent_task = bytes_sent_clone.clone();
                        let app_handle_task = app_handle_clone.clone();

                        tokio::spawn(async move {
                            if let Err(e) = Self::handle_client(
                                stream,
                                client_id,
                                addr,
                                broadcast_rx,
                                connected_clients_task,
                                active_connections_task,
                                messages_sent_task,
                                bytes_sent_task,
                                app_handle_task,
                            )
                            .await
                            {
                                println!("❌ Erro no cliente {}: {}", client_id, e);
                            }
                        });
                    }
                }
            });

            server_handles.push(server_task);
        }

        // Armazenar apenas o primeiro handle por compatibilidade
        // (em uma implementação completa, você armazenaria todos os handles)
        if let Some(first_handle) = server_handles.into_iter().next() {
            self.server_handle = Some(first_handle);
        }

        // Iniciar broadcasting
        self.start_broadcasting(broadcast_tx).await?;

        Ok(format!("WebSocket server rodando em: {}", bound_addresses.join(", ")))
    }

    async fn start_broadcasting(&mut self, broadcast_tx: broadcast::Sender<String>) -> Result<(), String> {
        let database = self.database.clone();
        let tcp_server = self.tcp_server.clone();
        let is_running = self.is_running.clone();
        let interval_ms = self.config.broadcast_interval_ms;

        println!("🚀 PASSO 2: WebSocket COM TAGS do PLC!");

        let broadcast_task = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(interval_ms));
            let mut counter = 0u64;

            while is_running.load(Ordering::SeqCst) {
                interval.tick().await;
                counter += 1;
                let now = chrono::Local::now().format("%H:%M:%S%.3f");

                let mut all_tags_data = std::collections::HashMap::new();

                // 🚀 PASSO 2: LER DADOS DO TCP (DashMap = SEM LOCKS!)
                if let Some(tcp_server_ref) = &tcp_server {
                    // Tentar pegar dados do TCP - COM TIMEOUT para segurança
                    match tokio::time::timeout(
                        Duration::from_millis(100),
                        tcp_server_ref.read()
                    ).await {
                        Ok(tcp_guard) => {
                            if let Some(tcp_server_instance) = tcp_guard.as_ref() {
                                // ✅ DashMap = acesso direto sem lock!
                                let all_plc_data = tcp_server_instance.get_all_plc_data().await;
                                drop(tcp_guard); // 🔓 Liberar imediatamente!

                                // Processar PLCs FORA do lock
                                for (plc_ip, plc_data) in all_plc_data {
                                    // Buscar tags ativos para este PLC
                                    match database.get_active_tags(&plc_ip) {
                                        Ok(active_tags) => {
                                            for tag in active_tags {
                                                // Encontrar variável correspondente
                                                if let Some(variable) = plc_data.variables.iter()
                                                    .find(|v| v.name == tag.variable_path) {
                                                    
                                                    // Parse do valor
                                                    let parsed_value = Self::parse_variable_value(&variable.value, &variable.data_type);
                                                    all_tags_data.insert(tag.tag_name.clone(), parsed_value);
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            println!("⚠️ [{}] Erro ao buscar tags para {}: {}", now, plc_ip, e);
                                        }
                                    }
                                }
                            }
                        }
                        Err(_) => {
                            println!("⚠️ [{}] Timeout ao acessar TCP - pulando ciclo #{}", now, counter);
                        }
                    }
                }

                // Enviar APENAS os tags cadastrados (formato limpo!)
                if !all_tags_data.is_empty() {
                    // ✅ SÓ OS TAGS - nada mais!
                    let message = serde_json::to_string(&all_tags_data)
                        .unwrap_or_else(|_| "{}".to_string());
                    
                    println!("📡 [{}] WebSocket enviando {} tags: {} bytes", 
                        now, all_tags_data.len(), message.len());

                    // Broadcast para clientes conectados
                    if broadcast_tx.receiver_count() > 0 {
                        let _ = broadcast_tx.send(message);
                    }
                } else {
                    // Sem tags = não envia nada (silencioso)
                    if counter % 10 == 0 {
                        println!("⚠️ [{}] Nenhum tag cadastrado - broadcast #{}", now, counter);
                    }
                }
            }

            println!("🛑 Broadcast loop finalizado");
        });

        self.broadcast_handle = Some(broadcast_task);
        Ok(())
    }

    fn parse_variable_value(value: &str, data_type: &str) -> serde_json::Value {
        match data_type {
            "REAL" | "LREAL" => {
                value.parse::<f64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            "INT" | "DINT" | "LINT" => {
                value.parse::<i64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            "WORD" | "DWORD" | "LWORD" | "BYTE" => {
                value.parse::<u64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            _ => serde_json::Value::String(value.to_string())
        }
    }

    async fn handle_client(
        stream: TcpStream,
        client_id: u64,
        addr: SocketAddr,
        mut broadcast_rx: broadcast::Receiver<String>,
        connected_clients: Arc<DashMap<u64, ConnectedClient>>,
        active_connections: Arc<AtomicU64>,
        messages_sent: Arc<AtomicU64>,
        bytes_sent: Arc<AtomicU64>,
        app_handle: AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let websocket = accept_async(stream).await?;
        let (mut ws_sender, mut ws_receiver) = websocket.split();

        println!("🔌 WebSocket handshake completo para cliente {}", client_id);

        // Task para enviar mensagens broadcast para este cliente
        let send_task = tokio::spawn(async move {
            while let Ok(message) = broadcast_rx.recv().await {
                let msg_len = message.len() as u64;
                
                if let Err(e) = ws_sender.send(Message::Text(message)).await {
                    println!("❌ Erro ao enviar para cliente {}: {}", client_id, e);
                    break;
                }
                
                messages_sent.fetch_add(1, Ordering::SeqCst);
                bytes_sent.fetch_add(msg_len, Ordering::SeqCst);
            }
        });

        // Task para receber mensagens do cliente (opcional - keepalive/ping)
        let connected_clients_recv = connected_clients.clone();
        let receive_task = tokio::spawn(async move {
            while let Some(msg) = ws_receiver.next().await {
                match msg {
                    Ok(Message::Text(_text)) => {
                        // Cliente enviou mensagem - podemos usar para stats
                        if let Some(client) = connected_clients_recv.get(&client_id) {
                            client.messages_received.fetch_add(1, Ordering::SeqCst);
                        }
                    },
                    Ok(Message::Close(_)) => {
                        println!("🔐 Cliente {} fechou conexão", client_id);
                        break;
                    },
                    Ok(Message::Ping(_data)) => {
                        // Responder ping automaticamente seria feito pelo tungstenite
                        println!("📶 Ping recebido de cliente {}", client_id);
                    },
                    Err(e) => {
                        println!("❌ Erro ao receber de cliente {}: {}", client_id, e);
                        break;
                    },
                    _ => {}
                }
            }
        });

        // Aguardar qualquer uma das tasks terminar
        tokio::select! {
            _ = send_task => {},
            _ = receive_task => {}
        }

        // Cleanup
        connected_clients.remove(&client_id);
        active_connections.fetch_sub(1, Ordering::SeqCst);

        println!("🔌 Cliente {} desconectado", client_id);

        // Emitir evento de desconexão
        let _ = app_handle.emit("websocket-client-disconnected", serde_json::json!({
            "client_id": client_id,
            "address": addr.to_string(),
            "total_clients": active_connections.load(Ordering::SeqCst)
        }));

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<String, String> {
        if !self.is_running.load(Ordering::SeqCst) {
            return Err("WebSocket server não está rodando".to_string());
        }

        // Parar servidor
        self.is_running.store(false, Ordering::SeqCst);

        // Cancelar tasks
        if let Some(handle) = self.server_handle.take() {
            handle.abort();
        }
        if let Some(handle) = self.broadcast_handle.take() {
            handle.abort();
        }

        // Fechar todas as conexões
        self.connected_clients.clear();
        self.active_connections.store(0, Ordering::SeqCst);

        println!("🛑 WebSocket server parado");
        
        Ok("WebSocket server parado com sucesso".to_string())
    }

    pub fn get_stats(&self) -> WebSocketStats {
        let uptime = self.start_time.elapsed().unwrap_or_default().as_secs();
        let broadcast_rate = if self.config.broadcast_interval_ms > 0 {
            1000.0 / self.config.broadcast_interval_ms as f64
        } else {
            0.0
        };

        WebSocketStats {
            active_connections: self.active_connections.load(Ordering::SeqCst),
            total_connections: self.total_connections.load(Ordering::SeqCst),
            messages_sent: self.messages_sent.load(Ordering::SeqCst),
            bytes_sent: self.bytes_sent.load(Ordering::SeqCst),
            uptime_seconds: uptime,
            server_status: if self.is_running.load(Ordering::SeqCst) {
                "Rodando".to_string()
            } else {
                "Parado".to_string()
            },
            broadcast_rate_hz: broadcast_rate,
        }
    }

    pub fn get_connected_clients(&self) -> Vec<serde_json::Value> {
        self.connected_clients
            .iter()
            .map(|entry| {
                let client = entry.value();
                serde_json::json!({
                    "id": client.id,
                    "address": client.address.to_string(),
                    "connected_at": client.connected_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    "messages_received": client.messages_received.load(Ordering::SeqCst)
                })
            })
            .collect()
    }

    pub fn update_config(&mut self, new_config: WebSocketConfig) {
        self.config = new_config;
    }

    pub fn get_config(&self) -> &WebSocketConfig {
        &self.config
    }
}