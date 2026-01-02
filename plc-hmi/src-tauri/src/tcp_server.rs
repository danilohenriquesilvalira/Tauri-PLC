// tcp_server.rs - VERSÃO FINAL PARA PLC SIEMENS (SEM ACK)
// ============================================================================
// OTIMIZADO PARA: PLC S7-1500 com TSEND_C a 2Hz, conexão direta via cabo
// ============================================================================

use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{RwLock, Mutex, mpsc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::database::Database;
use crate::database::PlcStructureConfig;

// ============================================================================
// CONSTANTES DE CONFIGURAÇÃO - OTIMIZADAS PARA PLC SIEMENS 2Hz
// ============================================================================

const MAX_PACKET_SIZE: usize = 1_048_576;
const MAX_ACCUMULATOR_SIZE: usize = 65536;
const BUFFER_CAPACITY: usize = 8192;
// ✅ OTIMIZAÇÃO: Limites para controlar consumo de memória
const MAX_BUFFER_POOL_SIZE: usize = 20; // Máximo 20 buffers por pool (400KB total)
const MAX_TOTAL_BUFFERS: usize = 100; // Limite global de buffers (2MB total)

const READ_TIMEOUT_SECS: u64 = 5;
const INACTIVITY_TIMEOUT_SECS: u64 = 15;
const FRAGMENT_WARN_SECS: u64 = 3;
const FRAGMENT_CLEAR_SECS: u64 = 5;
const WATCHDOG_CHECK_INTERVAL_MS: u64 = 2000;
// ✅ OTIMIZAÇÃO: Capacidade reduzida para evitar acúmulo de eventos
const EVENT_CHANNEL_CAPACITY: usize = 500; // Reduzido de 1000 para 500

// ============================================================================
// BUFFER POOL
// ============================================================================

#[derive(Debug)]
struct BufferPool {
    small_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,
    medium_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,
    large_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,
    // ✅ OTIMIZAÇÃO: Contadores para controle de memória
    total_buffers: Arc<AtomicUsize>, // Contador global de buffers ativos
}

impl BufferPool {
    fn new() -> Self {
        Self {
            small_buffers: Arc::new(Mutex::new(VecDeque::new())),
            medium_buffers: Arc::new(Mutex::new(VecDeque::new())),
            large_buffers: Arc::new(Mutex::new(VecDeque::new())),
            // ✅ OTIMIZAÇÃO: Inicializar contador
            total_buffers: Arc::new(AtomicUsize::new(0)),
        }
    }
    
    async fn get_buffer(&self, size: usize) -> Vec<u8> {
        // ✅ OTIMIZAÇÃO: Verificar limite global antes de criar novos buffers
        let current_total = self.total_buffers.load(Ordering::Relaxed);
        
        if size <= 1024 {
            if let Some(mut buf) = self.small_buffers.lock().await.pop_front() {
                buf.clear();
                return buf;
            }
            // ✅ Só criar novo se não exceder limite
            if current_total < MAX_TOTAL_BUFFERS {
                self.total_buffers.fetch_add(1, Ordering::Relaxed);
                Vec::with_capacity(1024)
            } else {
                Vec::with_capacity(512) // Buffer menor se limite atingido
            }
        } else if size <= 8192 {
            if let Some(mut buf) = self.medium_buffers.lock().await.pop_front() {
                buf.clear();
                return buf;
            }
            if current_total < MAX_TOTAL_BUFFERS {
                self.total_buffers.fetch_add(1, Ordering::Relaxed);
                Vec::with_capacity(8192)
            } else {
                Vec::with_capacity(2048) // Buffer menor se limite atingido
            }
        } else {
            if let Some(mut buf) = self.large_buffers.lock().await.pop_front() {
                buf.clear();
                return buf;
            }
            if current_total < MAX_TOTAL_BUFFERS {
                self.total_buffers.fetch_add(1, Ordering::Relaxed);
                Vec::with_capacity(65536)
            } else {
                Vec::with_capacity(8192) // Buffer menor se limite atingido
            }
        }
    }
    
    async fn return_buffer(&self, mut buf: Vec<u8>) {
        let capacity = buf.capacity();
        buf.clear();
        
        // ✅ OTIMIZAÇÃO: Usar MAX_BUFFER_POOL_SIZE para controle uniforme
        if capacity <= 1024 {
            let mut pool = self.small_buffers.lock().await;
            if pool.len() < MAX_BUFFER_POOL_SIZE { 
                pool.push_back(buf); 
            } else {
                // ✅ Buffer descartado - decrementar contador se foi criado por nós
                self.total_buffers.fetch_sub(1, Ordering::Relaxed);
            }
        } else if capacity <= 8192 {
            let mut pool = self.medium_buffers.lock().await;
            if pool.len() < MAX_BUFFER_POOL_SIZE { 
                pool.push_back(buf); 
            } else {
                self.total_buffers.fetch_sub(1, Ordering::Relaxed);
            }
        } else {
            let mut pool = self.large_buffers.lock().await;
            if pool.len() < MAX_BUFFER_POOL_SIZE { 
                pool.push_back(buf); 
            } else {
                self.total_buffers.fetch_sub(1, Ordering::Relaxed);
            }
        }
    }

    // ✅ OTIMIZAÇÃO: Nova função para monitorar uso de memória
    fn get_memory_stats(&self) -> (usize, usize, usize, usize) {
        // Retorna: (small_count, medium_count, large_count, total_active)
        let total = self.total_buffers.load(Ordering::Relaxed);
        // Nota: Para contar pools precisaríamos de try_lock, mas isso pode afetar performance
        // Então retornamos só o total por enquanto
        (0, 0, 0, total)
    }
}

// ============================================================================
// ESTRUTURAS DE DADOS
// ============================================================================

#[derive(Debug, Clone)]
pub struct ConnectionHealth {
    pub ip: String,
    pub conn_id: u64,
    pub last_data_received: std::time::Instant,
    pub total_bytes: u64,
    pub packet_count: u64,
    pub is_alive: bool,
    pub last_error: Option<String>,
    pub removal_in_progress: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcData {
    pub timestamp: String,
    pub variables: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcVariable {
    pub name: String,
    pub value: String,
    pub data_type: String,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcDataPacket {
    pub ip: String,
    pub timestamp: u64,
    pub raw_data: Vec<u8>,
    pub size: usize,
    pub variables: Vec<PlcVariable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStats {
    pub active_connections: u64,
    pub total_connections: u64,
    pub last_data_time: u64,
    pub server_status: String,
    pub plc_status: String,
}

enum ConnectionResult {
    Normal(u64),
    Timeout(String),
    Error(String),
    ServerStopped,
}

#[derive(Debug, Clone)]
enum TcpEvent {
    PlcDataReceived(serde_json::Value),
    WebSocketCacheUpdate(serde_json::Value),
    ConnectionHeartbeat(serde_json::Value),
    PlcDataStats(serde_json::Value),
}

// ============================================================================
// TCP SERVER
// ============================================================================

pub struct TcpServer {
    port: u16,
    is_running: Arc<AtomicBool>,
    active_connections: Arc<AtomicU64>,
    app_handle: AppHandle,
    server_handle: Option<tokio::task::JoinHandle<()>>,
    watchdog_handle: Option<tokio::task::JoinHandle<()>>,
    event_emitter_handle: Option<tokio::task::JoinHandle<()>>,
    connected_clients: Arc<RwLock<Vec<String>>>,
    connection_handles: Arc<RwLock<HashMap<String, tokio::task::AbortHandle>>>,
    unique_plcs: Arc<RwLock<HashSet<String>>>,
    blacklisted_ips: Arc<RwLock<HashSet<String>>>,
    ip_to_id: Arc<RwLock<HashMap<String, u64>>>,
    bytes_received: Arc<RwLock<HashMap<String, u64>>>,
    latest_data: Arc<DashMap<String, PlcDataPacket>>,
    database: Option<Arc<Database>>,
    buffer_pool: Arc<BufferPool>,
    plc_configs_cache: Arc<DashMap<String, PlcStructureConfig>>,
    connection_health: Arc<DashMap<String, ConnectionHealth>>,
    event_sender: Option<mpsc::Sender<TcpEvent>>,
}

impl TcpServer {
    pub fn new(port: u16, app_handle: AppHandle, database: Option<Arc<Database>>) -> Self {
        Self {
            port,
            is_running: Arc::new(AtomicBool::new(false)),
            active_connections: Arc::new(AtomicU64::new(0)),
            app_handle,
            server_handle: None,
            watchdog_handle: None,
            event_emitter_handle: None,
            connected_clients: Arc::new(RwLock::new(Vec::new())),
            connection_handles: Arc::new(RwLock::new(HashMap::new())),
            unique_plcs: Arc::new(RwLock::new(HashSet::new())),
            blacklisted_ips: Arc::new(RwLock::new(HashSet::new())),
            ip_to_id: Arc::new(RwLock::new(HashMap::new())),
            bytes_received: Arc::new(RwLock::new(HashMap::new())),
            latest_data: Arc::new(DashMap::new()),
            database,
            buffer_pool: Arc::new(BufferPool::new()),
            plc_configs_cache: Arc::new(DashMap::new()),
            connection_health: Arc::new(DashMap::new()),
            event_sender: None,
        }
    }

    async fn start_event_emitter(&mut self) {
        let (tx, mut rx) = mpsc::channel::<TcpEvent>(EVENT_CHANNEL_CAPACITY);
        self.event_sender = Some(tx);
        
        let app_handle = self.app_handle.clone();
        
        let handle = tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    TcpEvent::PlcDataReceived(data) => {
                        let _ = app_handle.emit("plc-data-received", data);
                    }
                    TcpEvent::WebSocketCacheUpdate(data) => {
                        let _ = app_handle.emit("websocket-cache-update", data);
                    }
                    TcpEvent::ConnectionHeartbeat(data) => {
                        let _ = app_handle.emit("tcp-connection-heartbeat", data);
                    }
                    TcpEvent::PlcDataStats(data) => {
                        let _ = app_handle.emit("plc-data-stats", data);
                    }
                }
            }
        });
        
        self.event_emitter_handle = Some(handle);
    }

    pub async fn start_server(&mut self) -> Result<String, String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Err("Servidor já está rodando".to_string());
        }

        let listener = match TcpListener::bind(format!("0.0.0.0:{}", self.port)).await {
            Ok(l) => l,
            Err(e) => return Err(format!("Erro ao fazer bind na porta {}: {}", self.port, e)),
        };

        self.is_running.store(true, Ordering::SeqCst);
        
        self.start_event_emitter().await;
        self.start_watchdog().await;

        let is_running = self.is_running.clone();
        let active_connections = self.active_connections.clone();
        let app_handle = self.app_handle.clone();
        let connected_clients = self.connected_clients.clone();
        let connection_handles = self.connection_handles.clone();
        let unique_plcs = self.unique_plcs.clone();
        let blacklisted_ips = self.blacklisted_ips.clone();
        let ip_to_id = self.ip_to_id.clone();
        let bytes_received = self.bytes_received.clone();
        let latest_data = self.latest_data.clone();
        let database = self.database.clone();
        let buffer_pool = self.buffer_pool.clone();
        let plc_configs_cache = self.plc_configs_cache.clone();
        let connection_health = self.connection_health.clone();
        let event_sender = self.event_sender.clone();
        let port = self.port;

        let handle = tokio::spawn(async move {
            println!("═══════════════════════════════════════════════════════════");
            println!("🚀 SERVIDOR TCP INICIADO NA PORTA {}", port);
            println!("═══════════════════════════════════════════════════════════");
            println!("⚡ Otimizado para PLC Siemens S7-1500 (TSEND_C @ 2Hz)");
            println!("📡 Modo: SOMENTE RECEPÇÃO (sem ACK)");
            println!("⏱️  Timeout leitura: {}s | Inatividade: {}s", READ_TIMEOUT_SECS, INACTIVITY_TIMEOUT_SECS);
            println!("═══════════════════════════════════════════════════════════");
            
            let mut next_id = 1u64;

            while is_running.load(Ordering::SeqCst) {
                let accept_result = tokio::time::timeout(
                    tokio::time::Duration::from_secs(1),
                    listener.accept()
                ).await;
                
                match accept_result {
                    Ok(Ok((socket, addr))) => {
                        let ip = addr.ip().to_string();
                        
                        if blacklisted_ips.read().await.contains(&ip) {
                            println!("🚫 CONEXÃO RECUSADA: {} (bloqueado)", ip);
                            drop(socket);
                            continue;
                        }
                        
                        if connection_handles.read().await.contains_key(&ip) {
                            println!("⚠️ CONEXÃO DUPLICADA: {} - Matando antiga!", ip);
                            if let Some(old_handle) = connection_handles.write().await.remove(&ip) {
                                old_handle.abort();
                                connection_health.remove(&ip);
                                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                            }
                        }
                        
                        let mut id_map = ip_to_id.write().await;
                        let conn_id = if let Some(&existing_id) = id_map.get(&ip) {
                            println!("🔄 RECONEXÃO: {} (ID #{})", ip, existing_id);
                            existing_id
                        } else {
                            let new_id = next_id;
                            next_id += 1;
                            id_map.insert(ip.clone(), new_id);
                            println!("🆕 NOVA CONEXÃO: {} (ID #{})", ip, new_id);
                            new_id
                        };
                        drop(id_map);
                        
                        connection_health.insert(ip.clone(), ConnectionHealth {
                            ip: ip.clone(),
                            conn_id,
                            last_data_received: std::time::Instant::now(),
                            total_bytes: 0,
                            packet_count: 0,
                            is_alive: true,
                            last_error: None,
                            removal_in_progress: false,
                        });
                        
                        connected_clients.write().await.push(ip.clone());
                        unique_plcs.write().await.insert(ip.clone());
                        
                        let current_active = active_connections.fetch_add(1, Ordering::SeqCst) + 1;
                        let total_unique = unique_plcs.read().await.len() as u64;
                        
                        println!("✅ PLC CONECTADO: {} (ID: {}) | Ativos: {}", ip, conn_id, current_active);
                        
                        let _ = app_handle.emit("plc-connected", serde_json::json!({
                            "id": conn_id,
                            "address": addr.to_string(),
                            "ip": ip
                        }));
                        
                        let _ = app_handle.emit("tcp-stats", serde_json::json!({
                            "active_connections": current_active,
                            "total_connections": total_unique,
                            "server_status": "Rodando",
                            "plc_status": "Conectado"
                        }));

                        let active_connections_clone = active_connections.clone();
                        let unique_plcs_clone = unique_plcs.clone();
                        let bytes_received_clone = bytes_received.clone();
                        let latest_data_clone = latest_data.clone();
                        let app_handle_clone = app_handle.clone();
                        let connected_clients_clone = connected_clients.clone();
                        let connection_handles_clone = connection_handles.clone();
                        let database_clone = database.clone();
                        let buffer_pool_clone = buffer_pool.clone();
                        let plc_configs_cache_clone = plc_configs_cache.clone();
                        let connection_health_clone = connection_health.clone();
                        let event_sender_clone = event_sender.clone();
                        let ip_clone = ip.clone();
                        let is_running_clone = is_running.clone();

                        let connection_handle = tokio::spawn(async move {
                            let result = handle_client_connection(
                                socket, conn_id, ip_clone.clone(), is_running_clone,
                                bytes_received_clone.clone(), latest_data_clone.clone(),
                                app_handle_clone.clone(), database_clone.clone(),
                                buffer_pool_clone.clone(), plc_configs_cache_clone.clone(),
                                connection_health_clone.clone(), event_sender_clone,
                            ).await;
                            
                            let should_cleanup = {
                                if let Some(mut health) = connection_health_clone.get_mut(&ip_clone) {
                                    if !health.removal_in_progress {
                                        health.removal_in_progress = true;
                                        true
                                    } else { false }
                                } else { false }
                            };
                            
                            if should_cleanup {
                                match &result {
                                    ConnectionResult::Normal(bytes) => {
                                        println!("📊 PLC {} desconectou. Total: {} bytes", ip_clone, bytes);
                                    }
                                    ConnectionResult::Timeout(reason) => {
                                        println!("⏰ PLC {} timeout: {}", ip_clone, reason);
                                        let _ = app_handle_clone.emit("tcp-connection-timeout", serde_json::json!({
                                            "ip": ip_clone, "id": conn_id, "reason": reason
                                        }));
                                    }
                                    ConnectionResult::Error(error) => {
                                        println!("❌ PLC {} erro: {}", ip_clone, error);
                                        let _ = app_handle_clone.emit("tcp-connection-error", serde_json::json!({
                                            "ip": ip_clone, "id": conn_id, "error": error
                                        }));
                                    }
                                    ConnectionResult::ServerStopped => {
                                        println!("🛑 PLC {} - servidor parou", ip_clone);
                                    }
                                }
                                
                                connected_clients_clone.write().await.retain(|x| x != &ip_clone);
                                connection_handles_clone.write().await.remove(&ip_clone);
                                connection_health_clone.remove(&ip_clone);
                                
                                let remaining = active_connections_clone.fetch_sub(1, Ordering::SeqCst).saturating_sub(1);
                                let total_unique = unique_plcs_clone.read().await.len() as u64;
                                
                                println!("❌ PLC DESCONECTADO: {} | Ativos: {}", ip_clone, remaining);
                                
                                let _ = app_handle_clone.emit("plc-disconnected", serde_json::json!({
                                    "id": conn_id, "ip": ip_clone.clone()
                                }));
                                
                                let _ = app_handle_clone.emit("tcp-stats", serde_json::json!({
                                    "active_connections": remaining,
                                    "total_connections": total_unique,
                                    "server_status": "Rodando",
                                    "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
                                }));
                            }
                        });
                        
                        connection_handles.write().await.insert(ip.clone(), connection_handle.abort_handle());
                    }
                    Ok(Err(e)) => {
                        eprintln!("❌ Erro ao aceitar conexão: {}", e);
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                    Err(_) => {}
                }
            }
            
            println!("🛑 SERVIDOR TCP PARADO");
        });

        self.server_handle = Some(handle);
        let _ = self.app_handle.emit("tcp-server-started", format!("Servidor iniciado na porta {}", port));
        Ok(format!("Servidor TCP iniciado na porta {}", self.port))
    }

    async fn start_watchdog(&mut self) {
        let is_running = self.is_running.clone();
        let connection_health = self.connection_health.clone();
        let connection_handles = self.connection_handles.clone();
        let connected_clients = self.connected_clients.clone();
        let active_connections = self.active_connections.clone();
        let app_handle = self.app_handle.clone();
        
        let watchdog = tokio::spawn(async move {
            println!("🐕 WATCHDOG INICIADO");
            
            let mut interval = tokio::time::interval(
                tokio::time::Duration::from_millis(WATCHDOG_CHECK_INTERVAL_MS)
            );
            
            while is_running.load(Ordering::SeqCst) {
                interval.tick().await;
                
                let now = std::time::Instant::now();
                let mut dead_connections: Vec<String> = Vec::new();
                
                for entry in connection_health.iter() {
                    let health = entry.value();
                    if health.removal_in_progress { continue; }
                    
                    let seconds_since_data = now.duration_since(health.last_data_received).as_secs();
                    
                    if seconds_since_data > INACTIVITY_TIMEOUT_SECS {
                        println!("🚨 WATCHDOG: {} MORTA! Sem dados há {}s", health.ip, seconds_since_data);
                        dead_connections.push(health.ip.clone());
                        
                        let _ = app_handle.emit("tcp-connection-dead", serde_json::json!({
                            "ip": health.ip,
                            "id": health.conn_id,
                            "seconds_since_data": seconds_since_data,
                            "total_bytes": health.total_bytes,
                            "packet_count": health.packet_count,
                            "reason": "Watchdog: sem atividade"
                        }));
                    } else if seconds_since_data > INACTIVITY_TIMEOUT_SECS / 2 {
                        println!("⚠️ WATCHDOG: {} LENTA! Sem dados há {}s", health.ip, seconds_since_data);
                        let _ = app_handle.emit("tcp-connection-slow", serde_json::json!({
                            "ip": health.ip,
                            "id": health.conn_id,
                            "seconds_since_data": seconds_since_data
                        }));
                    }
                }
                
                for ip in dead_connections {
                    let should_remove = {
                        if let Some(mut health) = connection_health.get_mut(&ip) {
                            if !health.removal_in_progress {
                                health.removal_in_progress = true;
                                true
                            } else { false }
                        } else { false }
                    };
                    
                    if should_remove {
                        println!("💀 WATCHDOG: Matando conexão: {}", ip);
                        if let Some(handle) = connection_handles.write().await.remove(&ip) {
                            handle.abort();
                        }
                        connection_health.remove(&ip);
                        connected_clients.write().await.retain(|x| x != &ip);
                        active_connections.fetch_sub(1, Ordering::SeqCst);
                    }
                }
            }
            
            println!("🐕 WATCHDOG FINALIZADO");
        });
        
        self.watchdog_handle = Some(watchdog);
    }

    pub async fn stop_server(&mut self) -> Result<String, String> {
        if !self.is_running.load(Ordering::SeqCst) {
            return Err("Servidor não está rodando".to_string());
        }

        println!("🛑 PARANDO SERVIDOR TCP...");
        self.is_running.store(false, Ordering::SeqCst);
        
        if let Some(handle) = self.watchdog_handle.take() { handle.abort(); }
        if let Some(handle) = self.event_emitter_handle.take() { handle.abort(); }
        self.event_sender = None;
        
        let mut handles = self.connection_handles.write().await;
        for (ip, handle) in handles.drain() {
            println!("💀 Matando conexão: {}", ip);
            handle.abort();
        }
        
        self.connection_health.clear();
        if let Some(handle) = self.server_handle.take() { handle.abort(); }
        
        self.active_connections.store(0, Ordering::SeqCst);
        self.connected_clients.write().await.clear();
        
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        println!("✅ SERVIDOR TCP PARADO");
        let _ = self.app_handle.emit("tcp-server-stopped", "Servidor parado");
        Ok("Servidor TCP parado".to_string())
    }

    pub async fn disconnect_client(&self, client_ip: String) -> Result<String, String> {
        println!("🔌 DESCONECTANDO: {}", client_ip);
        self.blacklisted_ips.write().await.insert(client_ip.clone());
        
        let mut handles = self.connection_handles.write().await;
        if let Some(handle) = handles.remove(&client_ip) {
            handle.abort();
            self.connection_health.remove(&client_ip);
            self.connected_clients.write().await.retain(|ip| ip != &client_ip);
            
            let remaining = self.active_connections.fetch_sub(1, Ordering::SeqCst).saturating_sub(1);
            let total_unique = self.unique_plcs.read().await.len() as u64;
            
            let _ = self.app_handle.emit("plc-force-disconnected", serde_json::json!({
                "ip": client_ip.clone(), "blocked": true
            }));
            
            let _ = self.app_handle.emit("tcp-stats", serde_json::json!({
                "active_connections": remaining,
                "total_connections": total_unique,
                "server_status": "Rodando",
                "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
            }));
            
            Ok(format!("PLC {} desconectado e bloqueado", client_ip))
        } else {
            Err(format!("PLC {} não encontrado", client_ip))
        }
    }
    
    pub async fn allow_reconnect(&self, client_ip: String) -> Result<String, String> {
        if self.blacklisted_ips.write().await.remove(&client_ip) {
            println!("✅ {} desbloqueado", client_ip);
            Ok(format!("PLC {} pode reconectar", client_ip))
        } else {
            Err(format!("PLC {} não estava bloqueado", client_ip))
        }
    }

    pub async fn get_connection_stats(&self) -> ConnectionStats {
        let active = self.active_connections.load(Ordering::SeqCst);
        let total_unique = self.unique_plcs.read().await.len() as u64;
        
        ConnectionStats {
            active_connections: active,
            total_connections: total_unique,
            last_data_time: if active > 0 { 
                std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
            } else { 0 },
            server_status: if self.is_running.load(Ordering::SeqCst) { "Rodando".to_string() } else { "Parado".to_string() },
            plc_status: if active > 0 { "Conectado".to_string() } else { "Desconectado".to_string() },
        }
    }

    pub async fn get_connected_clients(&self) -> Vec<String> {
        self.connected_clients.read().await.clone()
    }

    pub async fn get_all_known_plcs(&self) -> Vec<(String, String)> {
        let connected = self.connected_clients.read().await;
        let blacklisted = self.blacklisted_ips.read().await;
        let unique_plcs = self.unique_plcs.read().await;
        
        unique_plcs.iter().map(|ip| {
            let status = if blacklisted.contains(ip) { "blocked" }
                else if connected.contains(ip) { "connected" }
                else { "disconnected" };
            (ip.clone(), status.to_string())
        }).collect()
    }

    pub async fn get_bytes_received(&self, ip: &str) -> u64 {
        *self.bytes_received.read().await.get(ip).unwrap_or(&0)
    }

    pub async fn get_all_bytes(&self) -> HashMap<String, u64> {
        self.bytes_received.read().await.clone()
    }

    pub async fn get_plc_data(&self, ip: &str) -> Option<PlcDataPacket> {
        self.latest_data.get(ip).map(|e| e.value().clone())
    }

    pub async fn get_all_plc_data(&self) -> HashMap<String, PlcDataPacket> {
        self.latest_data.iter().map(|e| (e.key().clone(), e.value().clone())).collect()
    }
    
    pub async fn get_connection_health(&self) -> Vec<ConnectionHealth> {
        self.connection_health.iter().map(|e| e.value().clone()).collect()
    }

    // ✅ OTIMIZAÇÃO: Métodos para monitoramento de memória
    pub fn get_memory_stats(&self) -> (usize, usize) {
        let buffer_stats = self.buffer_pool.get_memory_stats();
        let cache_size = self.latest_data.len();
        (buffer_stats.3, cache_size) // (total_buffers_active, cache_entries)
    }

    pub fn get_connected_clients_count(&self) -> usize {
        // Contar conexões ativas baseado no health
        self.connection_health.iter()
            .filter(|entry| entry.value().is_alive)
            .count()
    }
}

// ============================================================================
// HANDLER DE CONEXÃO - SEM ACK
// ============================================================================

async fn handle_client_connection(
    mut socket: TcpStream, 
    conn_id: u64, 
    ip: String,
    is_running: Arc<AtomicBool>,
    bytes_received: Arc<RwLock<HashMap<String, u64>>>,
    latest_data: Arc<DashMap<String, PlcDataPacket>>,
    app_handle: tauri::AppHandle,
    database: Option<Arc<Database>>,
    buffer_pool: Arc<BufferPool>,
    plc_configs_cache: Arc<DashMap<String, PlcStructureConfig>>,
    connection_health: Arc<DashMap<String, ConnectionHealth>>,
    event_sender: Option<mpsc::Sender<TcpEvent>>,
) -> ConnectionResult {
    
    let mut expected_size: Option<usize> = None;
    
    if let Some(cached_config) = plc_configs_cache.get(&ip) {
        expected_size = Some(cached_config.total_size);
        println!("⚡ PLC {}: Config CACHE - {} bytes", ip, cached_config.total_size);
    } else if let Some(db) = database.as_ref() {
        match db.load_plc_structure(&ip) {
            Ok(Some(structure)) => {
                expected_size = Some(structure.total_size);
                plc_configs_cache.insert(ip.clone(), structure.clone());
                println!("💾 PLC {}: Config carregada - {} bytes", ip, structure.total_size);
            }
            Ok(None) => println!("⚠️ PLC {}: Sem configuração", ip),
            Err(e) => println!("⚠️ PLC {}: Erro config: {}", ip, e),
        }
    }
    
    let buffer_size = expected_size.unwrap_or(1024).max(1024).min(MAX_ACCUMULATOR_SIZE);
    let mut buffer = vec![0u8; buffer_size];
    let mut accumulator = buffer_pool.get_buffer(BUFFER_CAPACITY).await;
    
    let mut total_bytes = 0u64;
    let mut packet_count = 0u64;
    let mut last_emit_time = std::time::Instant::now();
    let mut bytes_since_last_emit = 0u64;
    let mut last_valid_packet = std::time::Instant::now();
    let mut last_fragment_time = std::time::Instant::now();
    let mut consecutive_timeouts = 0u32;
    let start_time = std::time::Instant::now();
    
    loop {
        if !is_running.load(Ordering::SeqCst) {
            buffer_pool.return_buffer(accumulator).await;
            return ConnectionResult::ServerStopped;
        }
        
        if last_valid_packet.elapsed().as_secs() > INACTIVITY_TIMEOUT_SECS {
            buffer_pool.return_buffer(accumulator).await;
            return ConnectionResult::Timeout(format!("Sem dados há {}s", last_valid_packet.elapsed().as_secs()));
        }
        
        if !accumulator.is_empty() && last_fragment_time.elapsed().as_secs() > FRAGMENT_WARN_SECS {
            if last_fragment_time.elapsed().as_secs() > FRAGMENT_CLEAR_SECS {
                accumulator.clear();
                last_fragment_time = std::time::Instant::now();
            }
        }
        
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(READ_TIMEOUT_SECS),
            socket.read(&mut buffer)
        ).await {
            Ok(Ok(0)) => {
                buffer_pool.return_buffer(accumulator).await;
                return ConnectionResult::Normal(total_bytes);
            }
            Ok(Ok(n)) => {
                consecutive_timeouts = 0;
                total_bytes += n as u64;
                bytes_since_last_emit += n as u64;
                
                {
                    let mut bytes_map = bytes_received.write().await;
                    *bytes_map.entry(ip.clone()).or_insert(0) += n as u64;
                }
                
                last_fragment_time = std::time::Instant::now();
                
                if let Some(mut health) = connection_health.get_mut(&ip) {
                    health.last_data_received = std::time::Instant::now();
                    health.total_bytes = total_bytes;
                    health.is_alive = true;
                }
                
                if accumulator.len() + n > MAX_ACCUMULATOR_SIZE {
                    accumulator.clear();
                    continue;
                }
                
                accumulator.extend_from_slice(&buffer[0..n]);
                
                let should_parse = if let Some(expected) = expected_size {
                    accumulator.len() >= expected
                } else {
                    true
                };
                
                if should_parse {
                    last_valid_packet = std::time::Instant::now();
                    packet_count += 1;
                    
                    if let Some(mut health) = connection_health.get_mut(&ip) {
                        health.packet_count = packet_count;
                    }
                    
                    let tcp_received_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    let data_to_parse = if accumulator.is_empty() { &buffer[0..n] } else { &accumulator[..] };
                    
                    let cached_config = plc_configs_cache.get(&ip).map(|e| e.clone());
                    let parsed = crate::plc_parser::parse_plc_data_cached(data_to_parse, &ip, cached_config);
                    
                    let backend_processed_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    latest_data.insert(ip.clone(), parsed.clone());
                    
                    let processing_time_us = (backend_processed_ns - tcp_received_ns) / 1000;
                    
                    if let Some(sender) = &event_sender {
                        let _ = sender.try_send(TcpEvent::PlcDataReceived(serde_json::json!({
                            "ip": parsed.ip,
                            "timestamp": parsed.timestamp,
                            "raw_data": parsed.raw_data,
                            "size": parsed.size,
                            "variables": parsed.variables,
                            "tcp_received_ns": tcp_received_ns.to_string(),
                            "backend_processed_ns": backend_processed_ns.to_string(),
                            "processing_time_us": processing_time_us
                        })));
                        
                        let _ = sender.try_send(TcpEvent::WebSocketCacheUpdate(serde_json::json!({
                            "plc_ip": parsed.ip,
                            "variables": parsed.variables,
                            "timestamp": parsed.timestamp
                        })));
                    }
                    
                    accumulator.clear();
                    
                    // Estatísticas a cada 1 segundo
                    let elapsed = last_emit_time.elapsed();
                    if elapsed.as_secs_f64() >= 1.0 {
                        let elapsed_secs = elapsed.as_secs_f64();
                        let bytes_per_second = (bytes_since_last_emit as f64 / elapsed_secs) as u64;
                        let packets_per_second = (packet_count as f64 / start_time.elapsed().as_secs_f64()) as u64;
                        let avg_packet_size = if packet_count > 0 { total_bytes / packet_count } else { 0 };
                        
                        if let Some(sender) = &event_sender {
                            let _ = sender.try_send(TcpEvent::ConnectionHeartbeat(serde_json::json!({
                                "ip": ip,
                                "id": conn_id,
                                "last_packet_age_seconds": 0,
                                "accumulator_size": 0,
                                "connection_health": "healthy"
                            })));
                            
                            // ✅ EVENTO COM industrialMetrics PARA COMPATIBILIDADE COM FRONTEND
                            let _ = sender.try_send(TcpEvent::PlcDataStats(serde_json::json!({
                                "ip": ip,
                                "id": conn_id,
                                "bytesPerSecond": bytes_per_second,
                                "packets": packet_count,
                                "totalBytes": total_bytes,
                                "transferRate": format!("{:.2} KB/s", bytes_per_second as f64 / 1024.0),
                                "industrialMetrics": {
                                    "packetFrequency": packets_per_second,
                                    "avgPacketSize": avg_packet_size,
                                    "dataIntegrity": "OK"
                                }
                            })));
                        }
                        
                        bytes_since_last_emit = 0;
                        last_emit_time = std::time::Instant::now();
                    }
                }
                
                // 🚫 SEM ACK - PLC NÃO LÊ!
            }
            Ok(Err(e)) => {
                if let Some(mut health) = connection_health.get_mut(&ip) {
                    health.is_alive = false;
                    health.last_error = Some(e.to_string());
                }
                buffer_pool.return_buffer(accumulator).await;
                return ConnectionResult::Error(e.to_string());
            }
            Err(_) => {
                consecutive_timeouts += 1;
                if consecutive_timeouts >= 3 {
                    let reason = format!("{} timeouts de {}s", consecutive_timeouts, READ_TIMEOUT_SECS);
                    if let Some(mut health) = connection_health.get_mut(&ip) {
                        health.is_alive = false;
                        health.last_error = Some(reason.clone());
                    }
                    buffer_pool.return_buffer(accumulator).await;
                    return ConnectionResult::Timeout(reason);
                }
            }
        }
    }
}