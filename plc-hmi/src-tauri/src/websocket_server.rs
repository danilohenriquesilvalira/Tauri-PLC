use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::Mutex as TokioMutex;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, RwLock};
use tokio::time;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use std::collections::HashMap;

use crate::database::Database;
use crate::database::TagMapping;
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
    pub bind_interfaces: Vec<String>,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8765,
            max_clients: 100,
            broadcast_interval_ms: 1000,
            enabled: false,
            bind_interfaces: vec!["0.0.0.0".to_string()],
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
    pub last_sent: u128,
    pub changed: bool,
}

#[derive(Debug)]
pub struct SmartCache {
    // Cache principal: tag_name -> dados
    tag_cache: Arc<DashMap<String, CachedTagValue>>,
    // Grupos de intervalos: interval_s -> lista de tag_names
    interval_groups: Arc<RwLock<HashMap<u64, Vec<String>>>>,
    // Controle de mudanças para tags em modo "change"
    change_tracking: Arc<DashMap<String, String>>,
    
    // 🆕 CACHE DE TAG MAPPINGS - EVITA CONSULTAS AO BANCO!
    tag_mappings_cache: Arc<DashMap<String, Vec<TagMapping>>>, // plc_ip -> tags
    tag_mappings_last_update: Arc<RwLock<std::time::Instant>>,
    
    // ✅ OTIMIZAÇÃO: Controle de memória e LRU
    cache_size_limit: usize, // Máximo de entradas no cache
    memory_pressure_threshold: AtomicUsize, // Threshold para limpeza automática
    last_cleanup: Arc<RwLock<std::time::Instant>>, // Última limpeza de memória
}

#[derive(Debug, Clone)]
pub struct ConnectedClient {
    pub id: u64,
    pub address: SocketAddr,
    pub connected_at: std::time::SystemTime,
    pub messages_received: Arc<AtomicU64>,
    // ✅ MELHORIA: Namespacing por eclusa/PLC
    pub subscribed_plcs: Arc<RwLock<std::collections::HashSet<String>>>,
    pub client_type: ClientType,
}

#[derive(Debug, Clone)]
pub enum ClientType {
    Global,           // Recebe de todos PLCs (comportamento atual)
    Filtered(Vec<String>), // Recebe apenas PLCs específicos (nova funcionalidade)
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
    interval_handles: Arc<TokioMutex<Vec<tokio::task::JoinHandle<()>>>>,
    smart_cache: Arc<SmartCache>,
    cache_updater_handle: Option<tokio::task::JoinHandle<()>>,
    // ✅ MELHORIA: Broadcasting por PLC específico
    plc_broadcast_channels: Arc<DashMap<String, broadcast::Sender<String>>>,
}

impl SmartCache {
    pub fn new() -> Self {
        Self {
            tag_cache: Arc::new(DashMap::new()),
            interval_groups: Arc::new(RwLock::new(HashMap::new())),
            change_tracking: Arc::new(DashMap::new()),
            // 🆕 INICIALIZAR CACHE DE MAPPINGS
            tag_mappings_cache: Arc::new(DashMap::new()),
            tag_mappings_last_update: Arc::new(RwLock::new(std::time::Instant::now())),
            
            // ✅ OTIMIZAÇÃO: Configurar limites de memória
            cache_size_limit: 2000, // Máximo 2000 tags em cache (~400KB)
            memory_pressure_threshold: AtomicUsize::new(1500), // Iniciar limpeza em 1500 tags
            last_cleanup: Arc::new(RwLock::new(std::time::Instant::now())),
        }
    }

    pub async fn clear(&self) {
        self.tag_cache.clear();
        self.change_tracking.clear();
        let mut lock = self.interval_groups.write().await;
        lock.clear();
        // 🆕 LIMPAR CACHE DE MAPPINGS TAMBÉM
        self.tag_mappings_cache.clear();
    }
    
    // 🆕 CARREGAR TAGS DO BANCO PARA CACHE (chamado apenas quando necessário)
    pub async fn load_tag_mappings_to_cache(&self, plc_ip: &str, database: &Database) {
        match database.get_active_tags(plc_ip) {
            Ok(tags) => {
                println!("📦 Cache: Carregados {} tags ativos para PLC {}", tags.len(), plc_ip);
                self.tag_mappings_cache.insert(plc_ip.to_string(), tags);
                *self.tag_mappings_last_update.write().await = std::time::Instant::now();
            }
            Err(e) => {
                println!("⚠️ Cache: Erro ao carregar tags para {}: {}", plc_ip, e);
            }
        }
    }
    
    // 🆕 OBTER TAGS DO CACHE (ZERO CONSULTAS AO BANCO!)
    fn get_cached_tags(&self, plc_ip: &str) -> Option<Vec<TagMapping>> {
        self.tag_mappings_cache.get(plc_ip).map(|r| r.value().clone())
    }
    
    // 🆕 VERIFICAR SE CACHE PRECISA SER ATUALIZADO (só se muito antigo)
    pub async fn should_refresh_cache(&self) -> bool {
        let last_update = self.tag_mappings_last_update.read().await;
        // Só atualiza cache se tiver mais de 60 segundos (raramente!)
        last_update.elapsed().as_secs() > 60
    }
    
    // ✅ ATUALIZAR CACHE COM DADOS TCP - AGORA USA CACHE DE TAGS!
    pub async fn update_from_tcp(&self, plc_ip: &str, variables: &[crate::tcp_server::PlcVariable], database: &Database) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        
        // 🆕 USAR CACHE EM VEZ DE CONSULTAR BANCO!
        let tags = if let Some(cached_tags) = self.get_cached_tags(plc_ip) {
            // ✅ CACHE HIT - ZERO I/O!
            cached_tags
        } else {
            // ⚠️ CACHE MISS - Carregar do banco (acontece raramente)
            println!("⚠️ Cache miss para PLC {} - carregando do banco", plc_ip);
            self.load_tag_mappings_to_cache(plc_ip, database).await;
            self.get_cached_tags(plc_ip).unwrap_or_default()
        };
        
        for tag in tags {
            // 🚀 LÓGICA DE EXTRAÇÃO DE BITS (Bit-Parser)
            let (search_name, bit_index) = if tag.variable_path.contains('.') && !tag.variable_path.starts_with("DB") {
                let parts: Vec<&str> = tag.variable_path.split('.').collect();
                if parts.len() == 2 {
                    if let Ok(bit) = parts[1].parse::<u8>() {
                         (parts[0], Some(bit))
                    } else {
                         (tag.variable_path.as_str(), None)
                    }
                } else {
                    (tag.variable_path.as_str(), None)
                }
            } else {
                (tag.variable_path.as_str(), None)
            };

            // Encontrar variável correspondente
            if let Some(variable) = variables.iter().find(|v| v.name == search_name) {
                let tag_key = format!("{}:{}", plc_ip, tag.tag_name);
                
                // Determinar valor final
                let final_value = if let Some(bit) = bit_index {
                    if let Ok(int_val) = variable.value.parse::<u64>() {
                         let bit_val = (int_val >> bit) & 1;
                         if bit_val == 1 { "TRUE".to_string() } else { "FALSE".to_string() }
                    } else {
                         variable.value.clone()
                    }
                } else {
                    variable.value.clone()
                };

                // Verificar mudança para tags em modo "change"
                let mut value_changed = true;
                if tag.collect_mode.as_deref() == Some("change") {
                    if let Some(last_value) = self.change_tracking.get(&tag_key) {
                        value_changed = last_value.value() != &final_value;
                    }
                    self.change_tracking.insert(tag_key.clone(), final_value.clone());
                }
                
                // Atualizar cache
                let cached = CachedTagValue {
                    tag_name: tag.tag_name.clone(),
                    plc_ip: plc_ip.to_string(),
                    value: final_value,
                    data_type: if bit_index.is_some() { "BOOL".to_string() } else { variable.data_type.clone() },
                    timestamp_ns: now,
                    collect_mode: tag.collect_mode.unwrap_or_default(),
                    interval_s: tag.collect_interval_s.unwrap_or(1) as u64,
                    last_sent: 0,
                    changed: value_changed,
                };
                
                self.tag_cache.insert(tag_key, cached);
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
        
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
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
        
        for key in keys_to_update {
            if let Some(mut cached_mut) = self.tag_cache.get_mut(&key) {
                cached_mut.last_sent = now;
                cached_mut.changed = false;
            }
        }
        
        result
    }
    
    // 🆕 INVALIDAR CACHE DE UM PLC ESPECÍFICO (chamado quando tags mudam)
    pub fn invalidate_cache(&self, plc_ip: &str) {
        self.tag_mappings_cache.remove(plc_ip);
        println!("🔄 Cache invalidado para PLC {}", plc_ip);
    }
    
    // 🆕 INVALIDAR TODO O CACHE
    pub fn invalidate_all_cache(&self) {
        self.tag_mappings_cache.clear();
        println!("🔄 Todo cache de tags invalidado");
    }

    // ✅ OTIMIZAÇÃO: Sistema LRU automático para controle de memória
    pub async fn enforce_memory_limits(&self) -> bool {
        let current_size = self.tag_cache.len();
        
        // Se não excedeu o limite, não fazer nada
        if current_size <= self.cache_size_limit {
            return false;
        }
        
        // Calcular quantas entradas remover (20% das mais antigas)
        let entries_to_remove = (current_size - self.cache_size_limit + current_size / 5).min(current_size / 2);
        
        println!("🧹 Limpeza de cache: {} entradas, removendo {} antigas", current_size, entries_to_remove);
        
        // Coletar entries ordenadas por last_sent (mais antigo primeiro)
        let mut entries_by_age: Vec<(String, u128)> = self.tag_cache
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().last_sent))
            .collect();
        
        // Ordenar por timestamp (mais antigo primeiro)
        entries_by_age.sort_by_key(|(_, timestamp)| *timestamp);
        
        // Remover as mais antigas
        let mut removed = 0;
        for (key, _) in entries_by_age.into_iter().take(entries_to_remove) {
            self.tag_cache.remove(&key);
            self.change_tracking.remove(&key);
            removed += 1;
        }
        
        // Atualizar timestamp da última limpeza
        let mut last_cleanup = self.last_cleanup.write().await;
        *last_cleanup = std::time::Instant::now();
        
        println!("✅ Cache limpo: {} entradas removidas, {} restantes", removed, self.tag_cache.len());
        true
    }

    // ✅ OTIMIZAÇÃO: Verificar se precisa de limpeza automática  
    pub async fn should_cleanup(&self) -> bool {
        let current_size = self.tag_cache.len();
        let threshold = self.memory_pressure_threshold.load(Ordering::Relaxed);
        
        // Verificar se excedeu threshold
        if current_size <= threshold {
            return false;
        }
        
        // Verificar se faz tempo suficiente desde última limpeza (mínimo 30 segundos)
        let last_cleanup = self.last_cleanup.read().await;
        last_cleanup.elapsed().as_secs() >= 30
    }

    // ✅ OTIMIZAÇÃO: Estatísticas de uso de memória
    pub fn get_memory_stats(&self) -> (usize, usize, usize, f64) {
        let tag_cache_size = self.tag_cache.len();
        let mappings_cache_size = self.tag_mappings_cache.len();
        let change_tracking_size = self.change_tracking.len();
        let memory_usage_pct = (tag_cache_size as f64 / self.cache_size_limit as f64) * 100.0;
        
        (tag_cache_size, mappings_cache_size, change_tracking_size, memory_usage_pct)
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
            interval_handles: Arc::new(TokioMutex::new(Vec::new())),
            smart_cache: Arc::new(SmartCache::new()),
            cache_updater_handle: None,
            // ✅ MELHORIA: Inicializar channels por PLC
            plc_broadcast_channels: Arc::new(DashMap::new()),
        }
    }

    // ✅ MELHORIA: Cliente se inscreve em PLCs específicos
    pub async fn subscribe_to_plcs(&self, client_id: u64, plc_ips: Vec<String>) -> Result<(), String> {
        if let Some(mut client) = self.connected_clients.get_mut(&client_id) {
            // Primeiro, coletar PLCs e criar channels se necessário
            for plc_ip in &plc_ips {
                if !self.plc_broadcast_channels.contains_key(plc_ip) {
                    let (tx, _) = broadcast::channel::<String>(100);
                    self.plc_broadcast_channels.insert(plc_ip.clone(), tx);
                }
            }
            
            // Depois, atualizar subscrições do cliente
            {
                let mut subscribed_plcs = client.subscribed_plcs.write().await;
                subscribed_plcs.clear();
                for plc_ip in &plc_ips {
                    subscribed_plcs.insert(plc_ip.clone());
                }
            } // RwLock é dropado aqui
            
            // Agora podemos modificar client_type
            client.client_type = ClientType::Filtered(plc_ips);
            Ok(())
        } else {
            Err("Cliente não encontrado".to_string())
        }
    }

    // ✅ MELHORIA: Broadcasting otimizado por PLC
    pub async fn broadcast_to_plc_subscribers(&self, plc_ip: &str, message: String) {
        // Broadcast no channel específico do PLC
        if let Some(tx) = self.plc_broadcast_channels.get(plc_ip) {
            let _ = tx.send(message.clone());
        }
        
        // Manter backward compatibility: broadcast global também
        if let Some(tx) = &self.broadcast_sender {
            let _ = tx.send(format!("{{\"plc_ip\":\"{}\",\"data\":{}}}", plc_ip, message));
        }
    }

    // Função para detectar interfaces de rede disponíveis
    pub fn get_available_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
        use std::process::Command;
        
        let mut interfaces = Vec::new();
        
        interfaces.push(NetworkInterface {
            name: "Localhost".to_string(),
            ip: "127.0.0.1".to_string(),
            is_active: true,
            interface_type: "Loopback".to_string(),
        });
        
        interfaces.push(NetworkInterface {
            name: "Todas as Interfaces".to_string(),
            ip: "0.0.0.0".to_string(),
            is_active: true,
            interface_type: "All".to_string(),
        });

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
        
        let bind_addresses = if self.config.bind_interfaces.is_empty() || 
            (self.config.bind_interfaces.len() == 1 && self.config.bind_interfaces[0] == self.config.host) {
            vec![format!("{}:{}", self.config.host, self.config.port)]
        } else {
            self.config.bind_interfaces.iter()
                .map(|ip| format!("{}:{}", ip, self.config.port))
                .collect()
        };

        let mut listeners = Vec::new();
        let mut bound_addresses = Vec::new();

        println!("🟢 Tentando bind em {} endereços: {:?}", bind_addresses.len(), bind_addresses);

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
                }
            }
        }

        println!("🟢 Bind completo: {} de {} endereços funcionando", listeners.len(), bound_addresses.len());

        if listeners.is_empty() {
            return Err("Não foi possível fazer bind em nenhum endereço configurado".to_string());
        }

        // ✅ OTIMIZAÇÃO: Capacidade reduzida para controle de memória
        let (broadcast_tx, _) = broadcast::channel::<String>(200); // Reduzido de 1000 para 200
        self.broadcast_sender = Some(broadcast_tx.clone());

        self.is_running.store(true, Ordering::SeqCst);

        let _ = self.app_handle.emit("websocket-server-started", serde_json::json!({
            "status": "started",
            "addresses": bound_addresses,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

        let is_running = self.is_running.clone();
        let connected_clients = self.connected_clients.clone();
        let active_connections = self.active_connections.clone();
        let total_connections = self.total_connections.clone();
        let messages_sent = self.messages_sent.clone();
        let bytes_sent = self.bytes_sent.clone();
        let app_handle = self.app_handle.clone();
        let max_clients = self.config.max_clients;
        let database = self.database.clone(); // ✅ ADICIONAR DATABASE
        let smart_cache = self.smart_cache.clone(); // ✅ ADICIONAR SMART_CACHE

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
            let database_clone = database.clone(); // ✅ CLONE DATABASE
            let smart_cache_clone = smart_cache.clone(); // ✅ CLONE SMART_CACHE

            let server_task = tokio::spawn(async move {
                while is_running_clone.load(Ordering::SeqCst) {
                    if let Ok((stream, addr)) = listener.accept().await {
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
                            // ✅ MELHORIA: Inicializar com comportamento global (backward compatible)
                            subscribed_plcs: Arc::new(RwLock::new(std::collections::HashSet::new())),
                            client_type: ClientType::Global, // Comportamento padrão mantido
                        };

                        connected_clients_clone.insert(client_id, client);
                        active_connections_clone.fetch_add(1, Ordering::SeqCst);

                        println!("✅ Cliente WebSocket conectado: {} (ID: {})", addr, client_id);

                        let _ = app_handle_clone.emit("websocket-client-connected", serde_json::json!({
                            "client_id": client_id,
                            "address": addr.to_string(),
                            "total_clients": active_connections_clone.load(Ordering::SeqCst)
                        }));

                        let broadcast_rx = broadcast_tx_clone.subscribe();
                        let connected_clients_task = connected_clients_clone.clone();
                        let active_connections_task = active_connections_clone.clone();
                        let messages_sent_task = messages_sent_clone.clone();
                        let bytes_sent_task = bytes_sent_clone.clone();
                        let app_handle_task = app_handle_clone.clone();
                        let database_task = database_clone.clone(); // ✅ CLONE PARA TASK
                        let smart_cache_task = smart_cache_clone.clone(); // ✅ CLONE PARA TASK

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
                                database_task, // ✅ PASSAR DATABASE
                                smart_cache_task, // ✅ PASSAR SMART_CACHE
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
        let is_running = self.is_running.clone();
        let smart_cache = self.smart_cache.clone();

        println!("🚀 SISTEMA INTELIGENTE: Cache + Broadcasting sem bloqueios!");
        println!("📦 Cache de tags habilitado - ZERO consultas ao banco por pacote!");

        // ✅ OTIMIZAÇÃO: Canal otimizado para atualizações de cache  
        let (update_tx, mut update_rx) = mpsc::channel::<CacheUpdateData>(100); // Reduzido para 100
        
        // TASK 1: CACHE UPDATER
        let is_running_cache = is_running.clone();
        let smart_cache_updater = smart_cache.clone();
        let database_updater = database.clone();
        let app_handle_cache = self.app_handle.clone();
        
        // ✅ TASK 1A: PROCESSADOR ATÔMICO DE CACHE
        let _atomic_cache_processor = tokio::spawn({
            let smart_cache_clone = smart_cache_updater.clone();
            let database_clone = database_updater.clone();
            let is_running_clone = is_running_cache.clone();
            async move {
                let mut packets_processed: u64 = 0;
                let mut last_cache_refresh = std::time::Instant::now();
                
                while let Some(update_data) = update_rx.recv().await {
                    if !is_running_clone.load(Ordering::SeqCst) {
                        break;
                    }
                    
                    packets_processed += 1;
                    
                    // 🆕 REFRESH CACHE A CADA 60 SEGUNDOS (não a cada pacote!)
                    if last_cache_refresh.elapsed().as_secs() > 60 {
                        println!("🔄 Refresh periódico do cache de tags ({} pacotes processados)", packets_processed);
                        smart_cache_clone.load_tag_mappings_to_cache(&update_data.plc_ip, &database_clone).await;
                        last_cache_refresh = std::time::Instant::now();
                    }
                    
                    // ✅ OTIMIZAÇÃO: Verificar se precisa de limpeza de memória
                    if packets_processed % 50 == 0 && smart_cache_clone.should_cleanup().await {
                        println!("🧹 Iniciando limpeza automática de memória (pacote {})", packets_processed);
                        smart_cache_clone.enforce_memory_limits().await;
                    }
                    
                    // ✅ ATUALIZAÇÃO ATÔMICA (usa cache, não banco!)
                    smart_cache_clone.update_from_tcp(
                        &update_data.plc_ip,
                        &update_data.variables,
                        &database_clone
                    ).await;
                    
                    // ✅ OTIMIZAÇÃO: Log periódico com estatísticas de memória
                    if packets_processed % 100 == 0 {
                        let (cache_size, mappings_size, tracking_size, memory_pct) = smart_cache_clone.get_memory_stats();
                        println!("📊 WebSocket: {} pacotes | Cache: {} tags ({:.1}%) | Mappings: {} | Tracking: {}", 
                                packets_processed, cache_size, memory_pct, mappings_size, tracking_size);
                    }
                }
                println!("✅ Atomic cache processor finalizado ({} pacotes)", packets_processed);
            }
        });
        
        // ✅ TASK 1B: EVENT LISTENER
        let cache_handle = tokio::spawn(async move {
            use tauri::Listener;
            
            let _unlisten_id = app_handle_cache.listen("websocket-cache-update", move |event| {
                let payload = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload) {
                    let plc_ip = data["plc_ip"].as_str().unwrap_or("");
                    if let Some(variables_array) = data["variables"].as_array() {
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
                        
                        let update_data = CacheUpdateData {
                            plc_ip: plc_ip.to_string(),
                            variables,
                            timestamp: data["timestamp"].as_u64().unwrap_or(0),
                        };
                        
                        let _ = update_tx.try_send(update_data);
                    }
                }
            });
            
            while is_running_cache.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            
            println!("Cache listener finalizado (ID: {})", _unlisten_id);
        });
        
        self.cache_updater_handle = Some(cache_handle);

        // TASK 2: BROADCASTING INTELIGENTE
        let smart_cache_broadcast = smart_cache.clone();
        let is_running_broadcast = is_running.clone();
        
        let mut handles = Vec::new();
        
        // BATCH 1: Intervalos rápidos (1-3s)
        let fast_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_millis(500));
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    for interval_s in 1..=3u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    if !batch_accumulator.is_empty() {
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
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
                            }
                        }
                        batch_accumulator.clear();
                    }
                }
            }
        });
        
        // BATCH 2: Intervalos médios (4-7s)
        let medium_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(2));
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    for interval_s in 4..=7u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    if !batch_accumulator.is_empty() {
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
                            }
                            Err(_) => {
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
                            }
                        }
                        batch_accumulator.clear();
                    }
                }
            }
        });
        
        // BATCH 3: Intervalos lentos (8-10s)
        let slow_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(5));
                let mut batch_accumulator: HashMap<String, serde_json::Value> = HashMap::new();
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    for interval_s in 8..=10u64 {
                        let tag_data = smart_cache_clone.get_tags_for_broadcast(interval_s).await;
                        for (key, value) in tag_data {
                            batch_accumulator.insert(key, serde_json::Value::String(value));
                        }
                    }
                    
                    if !batch_accumulator.is_empty() {
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
                            }
                            Err(_) => {
                                let message = serde_json::to_string(&batch_accumulator).unwrap_or_else(|_| "{}".to_string());
                                if broadcast_tx_clone.receiver_count() > 0 {
                                    let _ = broadcast_tx_clone.send(message);
                                }
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
            let mut interval = time::interval(Duration::from_millis(100));
            while is_running_change.load(Ordering::SeqCst) {
                interval.tick().await;
                
                let changed_tags = smart_cache_change.get_tags_for_broadcast(0).await;
                
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
        
        let mut guard = self.interval_handles.lock().await;
        *guard = handles;
        
        println!("✅ Sistema inteligente iniciado com cache de tags");
        Ok(())
    }

    /// Para e reinicia as tasks de broadcast, recarregando os tags do banco
    pub async fn reload_tag_groups(&mut self) -> Result<(), String> {
        // 🆕 INVALIDAR TODO O CACHE PARA FORÇAR RELOAD
        self.smart_cache.invalidate_all_cache();
        
        // Limpar cache de dados antigos
        self.smart_cache.clear().await;

        // Parar tasks antigas
        {
            let mut guard = self.interval_handles.lock().await;
            for handle in guard.iter() {
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
        database: Arc<Database>, // ✅ NOVO PARÂMETRO
        smart_cache: Arc<SmartCache>, // ✅ NOVO PARÂMETRO
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let websocket = accept_async(stream).await?;
        let (ws_sender, mut ws_receiver) = websocket.split();
        
        // ✅ Canal para envio de respostas ao cliente
        let (response_tx, mut response_rx) = mpsc::channel::<String>(100);
        let ws_sender = Arc::new(TokioMutex::new(ws_sender));

        println!("🔌 WebSocket handshake completo para cliente {}", client_id);

        // ✅ TASK DE ENVIO - Unificada para broadcast e respostas
        let ws_sender_clone = ws_sender.clone();
        let messages_sent_clone = messages_sent.clone();
        let bytes_sent_clone = bytes_sent.clone();
        
        let send_task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Mensagens de broadcast
                    Ok(message) = broadcast_rx.recv() => {
                        let msg_len = message.len() as u64;
                        let mut sender = ws_sender_clone.lock().await;
                        if let Err(e) = sender.send(Message::Text(message)).await {
                            println!("❌ Erro ao enviar broadcast para cliente {}: {}", client_id, e);
                            break;
                        }
                        messages_sent_clone.fetch_add(1, Ordering::SeqCst);
                        bytes_sent_clone.fetch_add(msg_len, Ordering::SeqCst);
                    }
                    // Respostas diretas ao cliente
                    Some(response) = response_rx.recv() => {
                        let msg_len = response.len() as u64;
                        let mut sender = ws_sender_clone.lock().await;
                        if let Err(e) = sender.send(Message::Text(response)).await {
                            println!("❌ Erro ao enviar resposta para cliente {}: {}", client_id, e);
                            break;
                        }
                        messages_sent_clone.fetch_add(1, Ordering::SeqCst);
                        bytes_sent_clone.fetch_add(msg_len, Ordering::SeqCst);
                    }
                }
            }
        });

        let connected_clients_recv = connected_clients.clone();
        let app_handle_recv = app_handle.clone();
        let response_tx_clone = response_tx.clone();
        let database_recv = database.clone(); // ✅ CLONE DATABASE
        let smart_cache_recv = smart_cache.clone(); // ✅ CLONE SMART_CACHE
        
        let receive_task = tokio::spawn(async move {
            while let Some(msg) = ws_receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Some(client) = connected_clients_recv.get(&client_id) {
                            client.messages_received.fetch_add(1, Ordering::SeqCst);
                        }
                        
                        // ✅ PROCESSAR COMANDOS DO CLIENTE
                        if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                            let cmd_type = cmd.get("type").and_then(|t| t.as_str()).unwrap_or("");
                            
                            match cmd_type {
                                "LIST_PLCS" => {
                                    println!("📋 Cliente {} solicitou lista de PLCs", client_id);
                                    
                                    // ✅ BUSCAR PLCs REAIS DO BANCO DE DADOS
                                    let plcs: Vec<String> = match database_recv.list_configured_plcs() {
                                        Ok(configured_plcs) => {
                                            println!("📋 PLCs configurados no banco: {:?}", configured_plcs);
                                            configured_plcs
                                        }
                                        Err(e) => {
                                            println!("⚠️ Erro ao buscar PLCs do banco: {}", e);
                                            // Fallback: buscar do cache de tag_mappings
                                            smart_cache_recv.tag_mappings_cache
                                                .iter()
                                                .map(|entry| entry.key().clone())
                                                .collect()
                                        }
                                    };
                                    
                                    println!("📡 Enviando lista de {} PLCs para cliente {}", plcs.len(), client_id);
                                    
                                    let response = serde_json::json!({
                                        "type": "PLC_LIST",
                                        "plcs": plcs,
                                        "timestamp": SystemTime::now()
                                            .duration_since(UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis()
                                    });
                                    
                                    let _ = response_tx_clone.send(response.to_string()).await;
                                }
                                
                                "SUBSCRIBE_PLCS" => {
                                    if let Some(plc_ips) = cmd.get("plc_ips").and_then(|p| p.as_array()) {
                                        let plcs: Vec<String> = plc_ips
                                            .iter()
                                            .filter_map(|ip| ip.as_str().map(|s| s.to_string()))
                                            .collect();
                                        
                                        println!("📡 Cliente {} subscreveu em PLCs: {:?}", client_id, plcs);
                                        
                                        // Atualizar subscrições do cliente
                                        if let Some(mut client) = connected_clients_recv.get_mut(&client_id) {
                                            {
                                                let mut subscribed = client.subscribed_plcs.write().await;
                                                subscribed.clear();
                                                for plc_ip in &plcs {
                                                    subscribed.insert(plc_ip.clone());
                                                }
                                            }
                                            client.client_type = ClientType::Filtered(plcs.clone());
                                        }
                                        
                                        let response = serde_json::json!({
                                            "type": "SUBSCRIBE_ACK",
                                            "success": true,
                                            "plcs": plcs,
                                            "message": "Subscrição atualizada com sucesso"
                                        });
                                        
                                        let _ = response_tx_clone.send(response.to_string()).await;
                                    }
                                }
                                
                                _ => {
                                    // Comando desconhecido - ignorar silenciosamente
                                }
                            }
                        }
                    },
                    Ok(Message::Close(_)) => {
                        println!("🔐 Cliente {} fechou conexão", client_id);
                        break;
                    },
                    Ok(Message::Ping(_data)) => {
                        println!("🔶 Ping recebido de cliente {}", client_id);
                    },
                    Err(e) => {
                        println!("❌ Erro ao receber de cliente {}: {}", client_id, e);
                        break;
                    },
                    _ => {}
                }
            }
        });

        tokio::select! {
            _ = send_task => {},
            _ = receive_task => {}
        }

        connected_clients.remove(&client_id);
        active_connections.fetch_sub(1, Ordering::SeqCst);

        println!("🔌 Cliente {} desconectado", client_id);

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

        self.is_running.store(false, Ordering::SeqCst);

        if let Some(handle) = self.server_handle.take() {
            handle.abort();
        }
        if let Some(handle) = self.broadcast_handle.take() {
            handle.abort();
        }
        if let Some(handle) = self.cache_updater_handle.take() {
            handle.abort();
        }

        self.connected_clients.clear();
        self.active_connections.store(0, Ordering::SeqCst);

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

    /// Expõe o cache de tag mappings para uso externo (ex: SCL Analysis)
    /// Retorna None se o cache estiver vazio para o PLC
    pub async fn get_cached_tag_mappings(&self, plc_ip: &str) -> Option<Vec<crate::database::TagMapping>> {
        self.smart_cache.get_cached_tags(plc_ip)
    }

    // ✅ OTIMIZAÇÃO: Métodos para monitoramento de memória
    pub fn get_cache_memory_stats(&self) -> (usize, usize, usize, f64) {
        self.smart_cache.get_memory_stats()
    }

    pub async fn force_cache_cleanup(&self) -> bool {
        self.smart_cache.enforce_memory_limits().await
    }
}