use dashmap::DashMap;
use std::sync::Mutex;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, RwLock};
use tokio::time;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use std::collections::HashMap;

use crate::database::Database;
use crate::tcp_server::TcpServer;
use tokio::sync::mpsc;

// ✅ Helper para base64 encode simples
fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    
    for chunk in data.chunks(3) {
        let mut buf = [0u8; 3];
        for (i, &byte) in chunk.iter().enumerate() {
            buf[i] = byte;
        }
        
        let b = (buf[0] as u32) << 16 | (buf[1] as u32) << 8 | buf[2] as u32;
        result.push(CHARS[((b >> 18) & 63) as usize] as char);
        result.push(CHARS[((b >> 12) & 63) as usize] as char);
        result.push(if chunk.len() > 1 { CHARS[((b >> 6) & 63) as usize] as char } else { '=' });
        result.push(if chunk.len() > 2 { CHARS[(b & 63) as usize] as char } else { '=' });
    }
    
    result
}

// ✅ ESTRUTURA PARA SERIALIZAR ATUALIZAÇÕES DE CACHE
#[derive(Debug, Clone)]
struct CacheUpdateData {
    plc_ip: String,
    variables: Vec<crate::tcp_server::PlcVariable>,
    timestamp: u64,
}

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

// 🚀 SISTEMA DE CACHE INTELIGENTE PARA PERFORMANCE MÁXIMA
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTagValue {
    pub tag_name: String,
    pub plc_ip: String,
    pub value: String,
    pub data_type: String,
    pub timestamp_ns: u128,
    pub collect_mode: String,
    pub interval_s: u64,
    pub last_sent: u128, // Último envio para WebSocket
    pub changed: bool,   // Se o valor mudou desde última leitura
}

#[derive(Debug)]
pub struct SmartCache {
    // Cache principal: tag_name -> dados
    tag_cache: Arc<DashMap<String, CachedTagValue>>,
    // Grupos de intervalos: interval_s -> lista de tag_names
    interval_groups: Arc<RwLock<HashMap<u64, Vec<String>>>>,
    // Controle de mudanças para tags em modo "change"
    change_tracking: Arc<DashMap<String, String>>, // tag_name -> last_value
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
    interval_handles: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    smart_cache: Arc<SmartCache>, // 🚀 CACHE INTELIGENTE
    cache_updater_handle: Option<tokio::task::JoinHandle<()>>, // Task para atualizar cache
}

impl SmartCache {
    pub fn new() -> Self {
        Self {
            tag_cache: Arc::new(DashMap::new()),
            interval_groups: Arc::new(RwLock::new(HashMap::new())),
            change_tracking: Arc::new(DashMap::new()),
        }
    }
    
    // Atualizar cache com dados do TCP (chamado apenas quando há novos dados TCP)
    pub async fn update_from_tcp(&self, plc_ip: &str, variables: &[crate::tcp_server::PlcVariable], database: &Database) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        
        // Obter tags ativos deste PLC
        if let Ok(tags) = database.get_active_tags(plc_ip) {
            for tag in tags {
                // Encontrar variável correspondente
                if let Some(variable) = variables.iter().find(|v| v.name == tag.variable_path) {
                    let tag_key = format!("{}:{}", plc_ip, tag.tag_name);
                    
                    // Verificar mudança para tags em modo "change"
                    let mut value_changed = true;
                    if tag.collect_mode.as_deref() == Some("change") {
                        if let Some(last_value) = self.change_tracking.get(&tag_key) {
                            value_changed = last_value.value() != &variable.value;
                        }
                        self.change_tracking.insert(tag_key.clone(), variable.value.clone());
                    }
                    
                    // Atualizar cache
                    let cached = CachedTagValue {
                        tag_name: tag.tag_name.clone(),
                        plc_ip: plc_ip.to_string(),
                        value: variable.value.clone(),
                        data_type: variable.data_type.clone(),
                        timestamp_ns: now,
                        collect_mode: tag.collect_mode.unwrap_or_default(),
                        interval_s: tag.collect_interval_s.unwrap_or(1) as u64,
                        last_sent: 0, // Será atualizado quando enviado
                        changed: value_changed,
                    };
                    
                    self.tag_cache.insert(tag_key, cached);
                }
            }
        }
    }
    
    // Obter tags que precisam ser enviados baseado no intervalo
    pub async fn get_tags_for_broadcast(&self, interval_s: u64) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        let mut keys_to_update = Vec::new();
        
        // Primeira passagem: identificar tags que precisam ser enviados
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000 // Convert to seconds
            } else {
                0 // Se timestamp for menor, considerar como 0
            };
            
            let should_send = match cached.collect_mode.as_str() {
                "change" => cached.changed && time_since_last >= interval_s as u128,
                "interval" => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                _ => false,
            };
            
            if should_send {
                result.insert(cached.tag_name.clone(), cached.value.clone());
                keys_to_update.push(entry.key().clone());
            }
        }
        
        // Segunda passagem: atualizar timestamps dos tags enviados
        for key in keys_to_update {
            if let Some(mut cached_mut) = self.tag_cache.get_mut(&key) {
                cached_mut.last_sent = now;
                cached_mut.changed = false;
            }
        }
        
        result
    }
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
            interval_handles: Arc::new(std::sync::Mutex::new(Vec::new())),
            smart_cache: Arc::new(SmartCache::new()),
            cache_updater_handle: None,
        }
    }

    // ✅ ENVIO MESSAGEPACK (JSON COMPRIMIDO)
    fn send_msgpack_message(&self, broadcast_tx: &broadcast::Sender<String>, variables: &HashMap<String, String>) {
        match rmp_serde::to_vec(variables) {
            Ok(msgpack_bytes) => {
                // Converter bytes para base64 para envio via WebSocket texto
                let base64_data = base64_encode(&msgpack_bytes);
                let msgpack_message = format!("MSGPACK:{}", base64_data);
                
                if broadcast_tx.receiver_count() > 0 {
                    let _ = broadcast_tx.send(msgpack_message);
                }
                
                println!("📦 MSGPACK: {} tags → {} bytes ({}% menor que JSON)", 
                    variables.len(), 
                    msgpack_bytes.len(),
                    (100.0 * (1.0 - msgpack_bytes.len() as f64 / serde_json::to_string(variables).unwrap_or_default().len() as f64)) as i32
                );
            }
            Err(e) => {
                println!("❌ Erro MessagePack: {}. Usando JSON fallback.", e);
                // Fallback para JSON
                let message = serde_json::to_string(variables).unwrap_or_else(|_| "{}".to_string());
                if broadcast_tx.receiver_count() > 0 {
                    let _ = broadcast_tx.send(message);
                }
            }
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
        for bind_addr in bind_addresses.iter() {
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

        // Emitir evento de servidor iniciado
        let _ = self.app_handle.emit("websocket-server-started", serde_json::json!({
            "status": "started",
            "addresses": bound_addresses,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

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

        // Iniciar sistema inteligente de cache + broadcasting
        self.start_smart_broadcasting(broadcast_tx).await?;

        Ok(format!("WebSocket server rodando em: {}", bound_addresses.join(", ")))
    }

    // 🚀 SISTEMA INTELIGENTE: Cache + Broadcasting sem bloqueios TCP
    async fn start_smart_broadcasting(&mut self, broadcast_tx: broadcast::Sender<String>) -> Result<(), String> {
        let database = self.database.clone();
        let tcp_server = self.tcp_server.clone();
        let is_running = self.is_running.clone();
        let smart_cache = self.smart_cache.clone();

        println!("🚀 SISTEMA INTELIGENTE: Cache + Broadcasting sem bloqueios!");

        // ✅ CANAL PARA SERIALIZAR ATUALIZAÇÕES DE CACHE
        let (update_tx, mut update_rx) = mpsc::channel::<CacheUpdateData>(1000);
        
        // TASK 1: CACHE UPDATER - Escuta eventos TCP (ZERO acesso direto ao TCP)
        let is_running_cache = is_running.clone();
        let smart_cache_updater = smart_cache.clone();
        let database_updater = database.clone();
        let app_handle_cache = self.app_handle.clone();
        
        // ✅ TASK 1A: PROCESSADOR ATÔMICO DE CACHE (Serializa todas as atualizações)
        let atomic_cache_processor = tokio::spawn({
            let smart_cache_clone = smart_cache_updater.clone();
            let database_clone = database_updater.clone();
            let is_running_clone = is_running_cache.clone();
            async move {
                while let Some(update_data) = update_rx.recv().await {
                    if !is_running_clone.load(Ordering::SeqCst) {
                        break;
                    }
                    
                    // ✅ ATUALIZAÇÃO ATÔMICA: Uma de cada vez, sem race conditions
                    smart_cache_clone.update_from_tcp(
                        &update_data.plc_ip,
                        &update_data.variables,
                        &database_clone
                    ).await;
                }
                println!("✅ Atomic cache processor finalizado");
            }
        });
        
        // ✅ TASK 1B: EVENT LISTENER (Apenas converte eventos para o canal)
        let cache_handle = tokio::spawn(async move {
            use tauri::Listener;
            
            // Escutar evento do TCP - ZERO deadlocks!
            let _unlisten_id = app_handle_cache.listen("websocket-cache-update", move |event| {
                let payload = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload) {
                    let plc_ip = data["plc_ip"].as_str().unwrap_or("");
                    if let Some(variables_array) = data["variables"].as_array() {
                        // Converter para PlcVariable
                        let mut variables = Vec::new();
                        for var in variables_array {
                            if let (Some(name), Some(value), Some(data_type)) = (
                                var["name"].as_str(),
                                var["value"].as_str(), 
                                var["data_type"].as_str()
                            ) {
                                variables.push(crate::tcp_server::PlcVariable {
                                    name: name.to_string(),
                                    value: value.to_string(),
                                    data_type: data_type.to_string(),
                                    unit: var["unit"].as_str().map(|s| s.to_string()),
                                });
                            }
                        }
                        
                        // ✅ ENVIAR PARA CANAL ATÔMICO - Evita race conditions
                        let update_data = CacheUpdateData {
                            plc_ip: plc_ip.to_string(),
                            variables,
                            timestamp: data["timestamp"].as_u64().unwrap_or(0),
                        };
                        
                        // ✅ USAR CHANNEL PARA SERIALIZAR ATUALIZAÇÕES
                        let _ = update_tx.try_send(update_data);
                    }
                }
            });
            
            // Manter listener ativo
            while is_running_cache.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            
            // Nota: unlisten é um ID, não uma função no Tauri v2
            println!("Cache listener finalizado (ID: {})", _unlisten_id);
        });
        
        // ✅ ARMAZENAR AMBOS OS HANDLES PARA CONTROLE COMPLETO
        self.cache_updater_handle = Some(cache_handle);
        // atomic_cache_processor será gerenciado automaticamente quando o canal fechar

        // TASK 2: BROADCASTING INTELIGENTE - Usa apenas cache (zero acesso TCP)
        let smart_cache_broadcast = smart_cache.clone();
        let is_running_broadcast = is_running.clone();
        
        // ✅ BATCH PROCESSOR INTELIGENTE - Agrupa múltiplos intervalos
        let mut handles = Vec::new();
        
        
        // BATCH 1: Intervalos rápidos (1-3s) - Processamento a cada 0.5s
        let fast_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_millis(500)); // ✅ 0.5s batch
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // ✅ COLETAR DADOS DE MÚLTIPLOS INTERVALOS EM BATCH
                    for interval_s in 1..=3u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    // ✅ ENVIAR BATCH ACUMULADO SE HOUVER DADOS
                    if !batch_accumulator.is_empty() {
                        // ✅ ENVIO MESSAGEPACK (JSON COMPRIMIDO)
                        let string_map: HashMap<String, String> = batch_accumulator.iter()
                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                            .collect();
                        
                        match rmp_serde::to_vec(&string_map) {
                            Ok(msgpack_bytes) => {
                                let base64_data = base64_encode(&msgpack_bytes);
                                let msgpack_message = format!("MSGPACK:{}", base64_data);
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(msgpack_message);
                                }
                                println!("📦 MSGPACK BATCH: {} tags → {} bytes", string_map.len(), msgpack_bytes.len());
                            }
                            Err(_) => {
                                // Fallback para JSON
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
                                println!("📡 JSON FALLBACK BATCH: {} tags", batch_accumulator.len());
                            }
                        }
                        batch_accumulator.clear();
                    }
                }
            }
        });
        
        // BATCH 2: Intervalos médios (4-7s) - Processamento a cada 2s
        let medium_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(2)); // ✅ 2s batch
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // ✅ COLETAR DADOS DE INTERVALOS MÉDIOS EM BATCH
                    for interval_s in 4..=7u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    // ✅ ENVIAR BATCH ACUMULADO SE HOUVER DADOS
                    if !batch_accumulator.is_empty() {
                        // ✅ ENVIO MESSAGEPACK (JSON COMPRIMIDO)
                        let string_map: HashMap<String, String> = batch_accumulator.iter()
                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                            .collect();
                        
                        match rmp_serde::to_vec(&string_map) {
                            Ok(msgpack_bytes) => {
                                let base64_data = base64_encode(&msgpack_bytes);
                                let msgpack_message = format!("MSGPACK:{}", base64_data);
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(msgpack_message);
                                }
                                println!("📦 MSGPACK BATCH: {} tags → {} bytes", string_map.len(), msgpack_bytes.len());
                            }
                            Err(_) => {
                                // Fallback para JSON
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
                                println!("📡 JSON FALLBACK BATCH: {} tags", batch_accumulator.len());
                            }
                        }
                        batch_accumulator.clear();
                    }
                }
            }
        });
        
        // BATCH 3: Intervalos lentos (8-10s) - Processamento a cada 5s
        let slow_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(5)); // ✅ 5s batch
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // ✅ COLETAR DADOS DE INTERVALOS LENTOS EM BATCH
                    for interval_s in 8..=10u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    // ✅ ENVIAR BATCH ACUMULADO SE HOUVER DADOS
                    if !batch_accumulator.is_empty() {
                        // ✅ ENVIO MESSAGEPACK (JSON COMPRIMIDO)
                        let string_map: HashMap<String, String> = batch_accumulator.iter()
                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                            .collect();
                        
                        match rmp_serde::to_vec(&string_map) {
                            Ok(msgpack_bytes) => {
                                let base64_data = base64_encode(&msgpack_bytes);
                                let msgpack_message = format!("MSGPACK:{}", base64_data);
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(msgpack_message);
                                }
                                println!("📦 MSGPACK BATCH: {} tags → {} bytes", string_map.len(), msgpack_bytes.len());
                            }
                            Err(_) => {
                                // Fallback para JSON
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
                                println!("📡 JSON FALLBACK BATCH: {} tags", batch_accumulator.len());
                            }
                        }
                        batch_accumulator.clear();
                    }
                }
            }
        });
        
        handles.push(fast_batch_handle);
        handles.push(medium_batch_handle);
        handles.push(slow_batch_handle);
        
        // TASK 3: BROADCASTING PARA TAGS EM MODO "CHANGE"
        let broadcast_tx_change = broadcast_tx.clone();
        let smart_cache_change = smart_cache.clone();
        let is_running_change = is_running.clone();
        
        let change_handle = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(100)); // Verifica mudanças a cada 100ms
            while is_running_change.load(Ordering::SeqCst) {
                interval.tick().await;
                
                // ✅ SEGURO: Acesso APENAS ao cache para detectar mudanças
                let changed_tags = smart_cache_change.get_tags_for_broadcast(0).await; // 0 = modo change
                
                if !changed_tags.is_empty() {
                    let message = serde_json::to_string(&changed_tags).unwrap_or_else(|_| "{}".to_string());
                    if broadcast_tx_change.receiver_count() > 0 {
                        let _ = broadcast_tx_change.send(message);
                    }
                    println!("🔄 Change broadcast: {} tags alterados", changed_tags.len());
                }
            }
        });
        
        handles.push(change_handle);
        
        // Salvar handles
        let mut guard = self.interval_handles.lock().unwrap();
        *guard = handles;
        
        println!("✅ Sistema inteligente iniciado: 1 acesso TCP + {} tasks de broadcast", 11);
        Ok(())
    }

    /// Para e reinicia as tasks de broadcast de intervalos, recarregando os tags do banco
    pub async fn reload_tag_groups(&mut self) -> Result<(), String> {
        // Parar tasks antigas
        {
            let mut guard = self.interval_handles.lock().unwrap();
            for handle in guard.iter() {
                let handle: &tokio::task::JoinHandle<()> = handle;
                handle.abort();
            }
            guard.clear();
        }
        // Recriar tasks com os grupos atualizados
        if let Some(broadcast_tx) = &self.broadcast_sender {
            self.start_smart_broadcasting(broadcast_tx.clone()).await
        } else {
            Err("Broadcast sender não inicializado".to_string())
        }
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
        if let Some(handle) = self.cache_updater_handle.take() {
            handle.abort();
        }

        // Fechar todas as conexões
        self.connected_clients.clear();
        self.active_connections.store(0, Ordering::SeqCst);

        // Emitir evento de servidor parado
        let _ = self.app_handle.emit("websocket-server-stopped", serde_json::json!({
            "status": "stopped",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

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