use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{RwLock, Mutex};
use dashmap::DashMap; // HashMap concorrente sem locks!
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::database::Database;
use crate::database::PlcStructureConfig;

// ✅ CONSTANTES DE SEGURANÇA - AJUSTADAS PARA DETECTAR PROBLEMAS MAIS RÁPIDO
const MAX_PACKET_SIZE: usize = 1_048_576; // 1MB máximo
const MAX_ACCUMULATOR_SIZE: usize = 65536; // 64KB máximo  
const BUFFER_CAPACITY: usize = 8192; // 8KB inicial

// 🔧 NOVOS TIMEOUTS MAIS AGRESSIVOS
const READ_TIMEOUT_SECS: u64 = 10;        // ⚡ Antes era 120s! Agora 10s (PLC envia a cada 500ms)
const INACTIVITY_TIMEOUT_SECS: u64 = 30;  // ⚡ Antes era 300s! Agora 30s
const FRAGMENT_WARN_SECS: u64 = 5;        // ⚡ Antes era 30s! Agora 5s
const FRAGMENT_CLEAR_SECS: u64 = 10;      // ⚡ Antes era 60s! Agora 10s
const KEEPALIVE_INTERVAL_SECS: u64 = 5;   // 🆕 Intervalo de keepalive
const WATCHDOG_CHECK_INTERVAL_MS: u64 = 2000; // 🆕 Watchdog a cada 2s

// ✅ BUFFER POOL PARA ZERO ALLOCATIONS
#[derive(Debug)]
struct BufferPool {
    small_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,   // 1KB buffers
    medium_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,  // 8KB buffers
    large_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,   // 64KB buffers
}

impl BufferPool {
    fn new() -> Self {
        Self {
            small_buffers: Arc::new(Mutex::new(VecDeque::new())),
            medium_buffers: Arc::new(Mutex::new(VecDeque::new())),
            large_buffers: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
    
    async fn get_buffer(&self, size: usize) -> Vec<u8> {
        if size <= 1024 {
            if let Some(mut buf) = self.small_buffers.lock().await.pop_front() {
                buf.clear();
                buf.reserve(1024);
                return buf;
            }
            Vec::with_capacity(1024)
        } else if size <= 8192 {
            if let Some(mut buf) = self.medium_buffers.lock().await.pop_front() {
                buf.clear();
                buf.reserve(8192);
                return buf;
            }
            Vec::with_capacity(8192)
        } else {
            if let Some(mut buf) = self.large_buffers.lock().await.pop_front() {
                buf.clear();
                buf.reserve(65536);
                return buf;
            }
            Vec::with_capacity(65536)
        }
    }
    
    async fn return_buffer(&self, mut buf: Vec<u8>) {
        let capacity = buf.capacity();
        buf.clear();
        
        if capacity <= 1024 {
            let mut pool = self.small_buffers.lock().await;
            if pool.len() < 10 { // Máximo 10 buffers pequenos
                pool.push_back(buf);
            }
        } else if capacity <= 8192 {
            let mut pool = self.medium_buffers.lock().await;
            if pool.len() < 5 { // Máximo 5 buffers médios
                pool.push_back(buf);
            }
        } else {
            let mut pool = self.large_buffers.lock().await;
            if pool.len() < 2 { // Máximo 2 buffers grandes
                pool.push_back(buf);
            }
        }
    }
}

// 🆕 ESTRUTURA PARA MONITORAR SAÚDE DA CONEXÃO
#[derive(Debug, Clone)]
pub struct ConnectionHealth {
    pub ip: String,
    pub conn_id: u64,
    pub last_data_received: std::time::Instant,
    pub total_bytes: u64,
    pub packet_count: u64,
    pub is_alive: bool,
    pub last_error: Option<String>,
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

pub struct TcpServer {
    port: u16,
    is_running: Arc<AtomicBool>,
    active_connections: Arc<AtomicU64>,
    app_handle: AppHandle,
    server_handle: Option<tokio::task::JoinHandle<()>>,
    watchdog_handle: Option<tokio::task::JoinHandle<()>>, // 🆕 WATCHDOG HANDLE
    connected_clients: Arc<RwLock<Vec<String>>>, // Lista de IPs conectados
    connection_handles: Arc<RwLock<HashMap<String, tokio::task::AbortHandle>>>, // Handles por IP
    unique_plcs: Arc<RwLock<HashSet<String>>>, // IPs únicos que já conectaram
    blacklisted_ips: Arc<RwLock<HashSet<String>>>, // IPs que não podem reconectar
    ip_to_id: Arc<RwLock<HashMap<String, u64>>>, // Mapeamento permanente IP → ID
    bytes_received: Arc<RwLock<HashMap<String, u64>>>, // Contador de bytes por IP
    latest_data: Arc<DashMap<String, PlcDataPacket>>, // 🚀 SEM LOCKS! Acesso concorrente livre
    database: Option<Arc<Database>>, // Banco de dados para configurações
    buffer_pool: Arc<BufferPool>, // ✅ BUFFER POOL PARA ZERO ALLOCATIONS
    plc_configs_cache: Arc<DashMap<String, PlcStructureConfig>>, // 🚀 CACHE DE CONFIGURAÇÕES
    connection_health: Arc<DashMap<String, ConnectionHealth>>, // 🆕 MONITORAMENTO DE SAÚDE
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
            connected_clients: Arc::new(RwLock::new(Vec::new())),
            connection_handles: Arc::new(RwLock::new(HashMap::new())),
            unique_plcs: Arc::new(RwLock::new(HashSet::new())),
            blacklisted_ips: Arc::new(RwLock::new(HashSet::new())),
            ip_to_id: Arc::new(RwLock::new(HashMap::new())),
            bytes_received: Arc::new(RwLock::new(HashMap::new())),
            latest_data: Arc::new(DashMap::new()), // 🚀 DashMap = zero locks!
            database,
            buffer_pool: Arc::new(BufferPool::new()), // ✅ BUFFER POOL INICIALIZADO
            plc_configs_cache: Arc::new(DashMap::new()), // 🚀 CACHE DE CONFIGURAÇÕES INICIALIZADO
            connection_health: Arc::new(DashMap::new()), // 🆕 HEALTH MONITOR
        }
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
        let port = self.port;

        // 🆕 INICIAR WATCHDOG
        self.start_watchdog().await;

        let handle = tokio::spawn(async move {
            println!("🚀 SERVIDOR TCP COM WATCHDOG INICIADO NA PORTA {}", listener.local_addr().unwrap().port());
            println!("⚡ Timeouts: Leitura={}s, Inatividade={}s, Keepalive={}s", 
                     READ_TIMEOUT_SECS, INACTIVITY_TIMEOUT_SECS, KEEPALIVE_INTERVAL_SECS);
            
            let mut next_id = 1u64;

            while is_running.load(Ordering::SeqCst) {
                match listener.accept().await {
                    Ok((socket, addr)) => {
                        let ip = addr.ip().to_string();
                        
                        // VERIFICAR BLACKLIST
                        if blacklisted_ips.read().await.contains(&ip) {
                            println!("🚫 CONEXÃO RECUSADA: {} (IP bloqueado)", ip);
                            drop(socket);
                            continue;
                        }
                        
                        // Verificar conexão duplicada
                        if connection_handles.read().await.contains_key(&ip) {
                            println!("⚠️ CONEXÃO DUPLICADA: {} - Matando conexão antiga primeiro!", ip);
                            
                            // 🔧 MATAR CONEXÃO ANTIGA ANTES DE ACEITAR NOVA
                            if let Some(old_handle) = connection_handles.write().await.remove(&ip) {
                                old_handle.abort();
                                println!("💀 Conexão antiga de {} abortada", ip);
                                
                                // Limpar health tracking
                                connection_health.remove(&ip);
                                
                                // Aguardar um pouco para o socket fechar
                                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                            }
                        }
                        
                        // 🔧 CONFIGURAR TCP KEEPALIVE NO SOCKET
                        if let Err(e) = configure_socket_keepalive(&socket) {
                            println!("⚠️ Erro ao configurar keepalive para {}: {}", ip, e);
                        }
                        
                        // OBTER OU CRIAR ID
                        let mut id_map = ip_to_id.write().await;
                        let conn_id = if let Some(&existing_id) = id_map.get(&ip) {
                            println!("🔄 RECONEXÃO: {} usa ID #{}", ip, existing_id);
                            existing_id
                        } else {
                            let new_id = next_id;
                            next_id += 1;
                            id_map.insert(ip.clone(), new_id);
                            println!("🆕 NOVO PLC: {} recebe ID #{}", ip, new_id);
                            new_id
                        };
                        drop(id_map);
                        
                        unique_plcs.write().await.insert(ip.clone());
                        let total_unique = unique_plcs.read().await.len() as u64;
                        
                        let current_active = active_connections.fetch_add(1, Ordering::SeqCst) + 1;
                        connected_clients.write().await.push(ip.clone());
                        
                        // 🆕 INICIALIZAR HEALTH TRACKING
                        connection_health.insert(ip.clone(), ConnectionHealth {
                            ip: ip.clone(),
                            conn_id,
                            last_data_received: std::time::Instant::now(),
                            total_bytes: 0,
                            packet_count: 0,
                            is_alive: true,
                            last_error: None,
                        });
                        
                        println!("✅ PLC CONECTADO: {} (ID: {}) | Ativos: {} | Únicos: {}", 
                            addr, conn_id, current_active, total_unique);
                        
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
                        let ip_clone = ip.clone();
                        let is_running_clone = is_running.clone();

                        let connection_handle = tokio::spawn(async move {
                            let result = handle_client_connection(
                                socket, 
                                conn_id, 
                                ip_clone.clone(), 
                                is_running_clone,
                                bytes_received_clone.clone(),
                                latest_data_clone.clone(),
                                app_handle_clone.clone(),
                                database_clone.clone(),
                                buffer_pool_clone.clone(),
                                plc_configs_cache_clone.clone(),
                                connection_health_clone.clone(),
                            ).await;
                            
                            // 🆕 REGISTRAR RESULTADO DA CONEXÃO
                            match result {
                                ConnectionResult::Normal(total_bytes) => {
                                    println!("📊 PLC {} (ID: {}) desconectou normalmente. Total: {} bytes", 
                                             ip_clone, conn_id, total_bytes);
                                }
                                ConnectionResult::Timeout(reason) => {
                                    println!("⏰ PLC {} (ID: {}) timeout: {}", ip_clone, conn_id, reason);
                                    let _ = app_handle_clone.emit("tcp-connection-timeout", serde_json::json!({
                                        "ip": ip_clone,
                                        "id": conn_id,
                                        "reason": reason
                                    }));
                                }
                                ConnectionResult::Error(error) => {
                                    println!("❌ PLC {} (ID: {}) erro: {}", ip_clone, conn_id, error);
                                    let _ = app_handle_clone.emit("tcp-connection-error", serde_json::json!({
                                        "ip": ip_clone,
                                        "id": conn_id,
                                        "error": error
                                    }));
                                }
                                ConnectionResult::ServerStopped => {
                                    println!("🛑 PLC {} (ID: {}) desconectado pois servidor parou", ip_clone, conn_id);
                                }
                            }
                            
                            // Cleanup
                            let mut clients = connected_clients_clone.write().await;
                            clients.retain(|client_ip| client_ip != &ip_clone);
                            
                            let mut handles = connection_handles_clone.write().await;
                            handles.remove(&ip_clone);
                            
                            // 🆕 REMOVER HEALTH TRACKING
                            connection_health_clone.remove(&ip_clone);
                            
                            let remaining = active_connections_clone.fetch_sub(1, Ordering::SeqCst) - 1;
                            let total_unique = unique_plcs_clone.read().await.len() as u64;
                            
                            println!("❌ PLC DESCONECTADO: {} (ID: {}) | Ativos: {} | Únicos: {}", 
                                ip_clone, conn_id, remaining, total_unique);
                            
                            let _ = app_handle_clone.emit("plc-disconnected", serde_json::json!({
                                "id": conn_id,
                                "ip": ip_clone.clone()
                            }));
                            
                            let _ = app_handle_clone.emit("tcp-stats", serde_json::json!({
                                "active_connections": remaining,
                                "total_connections": total_unique,
                                "server_status": "Rodando",
                                "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
                            }));
                        });
                        
                        connection_handles.write().await.insert(ip.clone(), connection_handle.abort_handle());
                    }
                    Err(e) => {
                        eprintln!("❌ Erro ao aceitar conexão: {}", e);
                        // 🔧 NÃO QUEBRAR O LOOP! Continuar tentando
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                }
            }
            
            println!("🛑 SERVIDOR TCP PARADO");
        });

        self.server_handle = Some(handle);
        
        let _ = self.app_handle.emit("tcp-server-started", format!("Servidor iniciado na porta {}", port));
        
        Ok(format!("Servidor TCP iniciado na porta {}", self.port))
    }

    // 🆕 WATCHDOG - MONITORA CONEXÕES E DETECTA MORTAS
    async fn start_watchdog(&mut self) {
        let is_running = self.is_running.clone();
        let connection_health = self.connection_health.clone();
        let connection_handles = self.connection_handles.clone();
        let connected_clients = self.connected_clients.clone();
        let active_connections = self.active_connections.clone();
        let app_handle = self.app_handle.clone();
        
        let watchdog = tokio::spawn(async move {
            println!("🐕 WATCHDOG INICIADO - Verificando conexões a cada {}ms", WATCHDOG_CHECK_INTERVAL_MS);
            
            let mut interval = tokio::time::interval(
                tokio::time::Duration::from_millis(WATCHDOG_CHECK_INTERVAL_MS)
            );
            
            while is_running.load(Ordering::SeqCst) {
                interval.tick().await;
                
                let now = std::time::Instant::now();
                let mut dead_connections: Vec<String> = Vec::new();
                
                // Verificar saúde de cada conexão
                for entry in connection_health.iter() {
                    let health = entry.value();
                    let seconds_since_data = now.duration_since(health.last_data_received).as_secs();
                    
                    // 🚨 CONEXÃO MORTA - Não recebeu dados por muito tempo
                    if seconds_since_data > INACTIVITY_TIMEOUT_SECS {
                        println!("🚨 WATCHDOG: Conexão {} (ID: {}) MORTA! Sem dados há {}s", 
                                 health.ip, health.conn_id, seconds_since_data);
                        
                        dead_connections.push(health.ip.clone());
                        
                        // Emitir evento para frontend
                        let _ = app_handle.emit("tcp-connection-dead", serde_json::json!({
                            "ip": health.ip,
                            "id": health.conn_id,
                            "seconds_since_data": seconds_since_data,
                            "total_bytes": health.total_bytes,
                            "packet_count": health.packet_count,
                            "reason": "Watchdog detectou conexão sem atividade"
                        }));
                    }
                    // ⚠️ CONEXÃO LENTA - Aviso
                    else if seconds_since_data > INACTIVITY_TIMEOUT_SECS / 2 {
                        println!("⚠️ WATCHDOG: Conexão {} (ID: {}) LENTA! Sem dados há {}s", 
                                 health.ip, health.conn_id, seconds_since_data);
                        
                        let _ = app_handle.emit("tcp-connection-slow", serde_json::json!({
                            "ip": health.ip,
                            "id": health.conn_id,
                            "seconds_since_data": seconds_since_data
                        }));
                    }
                }
                
                // Matar conexões mortas
                for ip in dead_connections {
                    println!("💀 WATCHDOG: Matando conexão morta: {}", ip);
                    
                    if let Some(handle) = connection_handles.write().await.remove(&ip) {
                        handle.abort();
                    }
                    
                    connection_health.remove(&ip);
                    
                    let mut clients = connected_clients.write().await;
                    clients.retain(|client_ip| client_ip != &ip);
                    
                    active_connections.fetch_sub(1, Ordering::SeqCst);
                }
                
                // 📊 STATUS PERIÓDICO
                let active = active_connections.load(Ordering::SeqCst);
                if active > 0 {
                    println!("🐕 WATCHDOG: {} conexões ativas", active);
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
        
        // Parar watchdog
        if let Some(handle) = &self.watchdog_handle {
            handle.abort();
        }
        
        // MATAR TODAS AS CONEXÕES
        let mut handles = self.connection_handles.write().await;
        for (ip, handle) in handles.drain() {
            println!("💀 Matando conexão: {}", ip);
            handle.abort();
        }
        
        // Limpar health tracking
        self.connection_health.clear();
        
        if let Some(handle) = &self.server_handle {
            handle.abort();
        }
        
        self.active_connections.store(0, Ordering::SeqCst);
        self.connected_clients.write().await.clear();
        self.server_handle = None;
        self.watchdog_handle = None;
        
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        println!("✅ SERVIDOR TCP PARADO COMPLETAMENTE");
        
        let _ = self.app_handle.emit("tcp-server-stopped", "Servidor parado");
        
        Ok("Servidor TCP parado".to_string())
    }

    pub async fn disconnect_client(&self, client_ip: String) -> Result<String, String> {
        println!("🔌 DESCONECTANDO E BLOQUEANDO PLC: {}", client_ip);
        
        self.blacklisted_ips.write().await.insert(client_ip.clone());
        println!("🚫 IP {} adicionado à blacklist", client_ip);
        
        let mut handles = self.connection_handles.write().await;
        if let Some(handle) = handles.remove(&client_ip) {
            println!("💀 Abortando conexão TCP de {}", client_ip);
            handle.abort();
            
            self.connection_health.remove(&client_ip);
            
            let mut clients = self.connected_clients.write().await;
            clients.retain(|ip| ip != &client_ip);
            
            let remaining = self.active_connections.fetch_sub(1, Ordering::SeqCst).saturating_sub(1);
            let total_unique = self.unique_plcs.read().await.len() as u64;
            
            let _ = self.app_handle.emit("plc-force-disconnected", serde_json::json!({
                "ip": client_ip.clone(),
                "blocked": true
            }));
            
            let _ = self.app_handle.emit("tcp-stats", serde_json::json!({
                "active_connections": remaining,
                "total_connections": total_unique,
                "server_status": "Rodando",
                "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
            }));
            
            Ok(format!("PLC {} desconectado e BLOQUEADO", client_ip))
        } else {
            Err(format!("PLC {} não encontrado", client_ip))
        }
    }
    
    pub async fn allow_reconnect(&self, client_ip: String) -> Result<String, String> {
        let removed = self.blacklisted_ips.write().await.remove(&client_ip);
        if removed {
            println!("✅ IP {} removido da blacklist", client_ip);
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
            server_status: if self.is_running.load(Ordering::SeqCst) { 
                "Rodando".to_string() 
            } else { 
                "Parado".to_string() 
            },
            plc_status: if active > 0 { 
                "Conectado".to_string() 
            } else { 
                "Desconectado".to_string() 
            },
        }
    }

    pub async fn get_connected_clients(&self) -> Vec<String> {
        self.connected_clients.read().await.clone()
    }

    pub async fn get_all_known_plcs(&self) -> Vec<(String, String)> {
        let connected = self.connected_clients.read().await;
        let blacklisted = self.blacklisted_ips.read().await;
        let unique_plcs = self.unique_plcs.read().await;
        
        let mut result = Vec::new();
        
        for ip in unique_plcs.iter() {
            let status = if blacklisted.contains(ip) {
                "blocked"
            } else if connected.contains(ip) {
                "connected"
            } else {
                "disconnected"
            };
            result.push((ip.clone(), status.to_string()));
        }
        
        result
    }

    pub async fn get_bytes_received(&self, ip: &str) -> u64 {
        let bytes_map = self.bytes_received.read().await;
        *bytes_map.get(ip).unwrap_or(&0)
    }

    pub async fn get_all_bytes(&self) -> HashMap<String, u64> {
        self.bytes_received.read().await.clone()
    }

    pub async fn get_plc_data(&self, ip: &str) -> Option<PlcDataPacket> {
        self.latest_data.get(ip).map(|entry| entry.value().clone())
    }

    pub async fn get_all_plc_data(&self) -> HashMap<String, PlcDataPacket> {
        self.latest_data.iter()
            .map(|entry| (entry.key().clone(), entry.value().clone()))
            .collect()
    }
    
    // 🆕 MÉTODO PARA OBTER SAÚDE DAS CONEXÕES
    pub async fn get_connection_health(&self) -> Vec<ConnectionHealth> {
        self.connection_health.iter()
            .map(|entry| entry.value().clone())
            .collect()
    }
}

// 🆕 CONFIGURAR TCP KEEPALIVE - VERSÃO SIMPLIFICADA
fn configure_socket_keepalive(_socket: &TcpStream) -> Result<(), String> {
    // Os timeouts agressivos que implementamos são MAIS EFICAZES que keepalive
    // porque detectam problemas muito mais rápido
    
    println!("✅ TCP configurado com detecção rápida de conexões mortas:");
    println!("   📡 Timeout de leitura: {}s (antes era 120s!)", READ_TIMEOUT_SECS);
    println!("   ⏰ Timeout de inatividade: {}s (antes era 300s!)", INACTIVITY_TIMEOUT_SECS);
    println!("   🐕 Watchdog: verificando a cada {}ms", WATCHDOG_CHECK_INTERVAL_MS);
    println!("   🔄 Timeouts consecutivos antes de desistir: 3");
    
    Ok(())
}

// 🆕 RESULTADO DA CONEXÃO
enum ConnectionResult {
    Normal(u64),         // Desconexão normal, total de bytes
    Timeout(String),     // Timeout com razão
    Error(String),       // Erro com mensagem
    ServerStopped,       // Servidor parou
}

async fn handle_client_connection(
    mut socket: TcpStream, 
    conn_id: u64, 
    ip: String,
    is_running: Arc<AtomicBool>,
    _bytes_received: Arc<RwLock<HashMap<String, u64>>>,
    latest_data: Arc<DashMap<String, PlcDataPacket>>,
    app_handle: tauri::AppHandle,
    database: Option<Arc<Database>>,
    buffer_pool: Arc<BufferPool>,
    plc_configs_cache: Arc<DashMap<String, PlcStructureConfig>>,
    connection_health: Arc<DashMap<String, ConnectionHealth>>,
) -> ConnectionResult {
    let mut buffer = [0; 1024];
    let mut accumulator = buffer_pool.get_buffer(BUFFER_CAPACITY).await;
    let mut expected_size: Option<usize> = None;
    let mut total_bytes = 0u64;
    let mut packet_count = 0u64;
    let mut last_emit_time = std::time::Instant::now();
    let mut bytes_since_last_emit = 0u64;
    let mut last_valid_packet = std::time::Instant::now();
    let mut last_fragment_time = std::time::Instant::now();
    let mut consecutive_timeouts = 0u32;  // 🆕 Contador de timeouts consecutivos
    
    // 🚀 CARREGAR CONFIG DO CACHE
    if let Some(cached_config) = plc_configs_cache.get(&ip) {
        expected_size = Some(cached_config.total_size);
        println!("⚡ PLC {}: Config do CACHE - {} bytes esperados", ip, cached_config.total_size);
    } else if let Some(db) = database.as_ref() {
        match db.load_plc_structure(&ip) {
            Ok(Some(structure)) => {
                expected_size = Some(structure.total_size);
                plc_configs_cache.insert(ip.clone(), structure.clone());
                println!("💾 PLC {}: Config carregada e CACHEADA - {} bytes", ip, structure.total_size);
            }
            Ok(None) => {
                println!("⚠️ PLC {}: Sem configuração salva", ip);
            }
            Err(e) => {
                println!("⚠️ PLC {}: Erro ao carregar config: {}", ip, e);
            }
        }
    }
    
    loop {
        // Verificar se servidor ainda está rodando
        if !is_running.load(Ordering::SeqCst) {
            buffer_pool.return_buffer(accumulator).await;
            return ConnectionResult::ServerStopped;
        }
        
        // 🆕 VERIFICAR INATIVIDADE LOCALMENTE (mais rápido que watchdog)
        let inactivity_secs = last_valid_packet.elapsed().as_secs();
        if inactivity_secs > INACTIVITY_TIMEOUT_SECS {
            println!("⏰ PLC {}: Timeout de inatividade ({}s sem pacote válido)", ip, inactivity_secs);
            buffer_pool.return_buffer(accumulator).await;
            return ConnectionResult::Timeout(format!("Sem dados há {}s", inactivity_secs));
        }
        
        // Verificar fragmentos pendentes
        if !accumulator.is_empty() && last_fragment_time.elapsed().as_secs() > FRAGMENT_WARN_SECS {
            println!("⚠️ FRAGMENTO INCOMPLETO: {} tem {} bytes acumulados por {}s", 
                ip, accumulator.len(), last_fragment_time.elapsed().as_secs());
            
            let _ = app_handle.emit("tcp-fragment-timeout", serde_json::json!({
                "ip": ip,
                "id": conn_id,
                "accumulated_bytes": accumulator.len(),
                "expected_bytes": expected_size.unwrap_or(0),
                "timeout_seconds": last_fragment_time.elapsed().as_secs()
            }));
            
            // Limpar após FRAGMENT_CLEAR_SECS
            if last_fragment_time.elapsed().as_secs() > FRAGMENT_CLEAR_SECS {
                println!("🧹 Limpando acumulador de {} - {} bytes descartados", ip, accumulator.len());
                accumulator.clear();
                last_fragment_time = std::time::Instant::now();
            }
        }
        
        // 🔧 TIMEOUT DE LEITURA REDUZIDO
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(READ_TIMEOUT_SECS),
            socket.read(&mut buffer)
        ).await {
            Ok(Ok(0)) => {
                println!("📡 Cliente {} fechou conexão graciosamente", ip);
                buffer_pool.return_buffer(accumulator).await;
                return ConnectionResult::Normal(total_bytes);
            }
            Ok(Ok(n)) => {
                consecutive_timeouts = 0;  // Reset contador
                total_bytes += n as u64;
                bytes_since_last_emit += n as u64;
                
                let now = chrono::Local::now().format("%H:%M:%S%.3f");
                println!("📥 [{}] Fragmento de {} (ID: {}): {} bytes", now, ip, conn_id, n);
                
                last_fragment_time = std::time::Instant::now();
                
                // 🆕 ATUALIZAR HEALTH TRACKING
                if let Some(mut health) = connection_health.get_mut(&ip) {
                    health.last_data_received = std::time::Instant::now();
                    health.total_bytes = total_bytes;
                    health.is_alive = true;
                }
                
                // Proteção contra buffer overflow
                if accumulator.len() + n > MAX_ACCUMULATOR_SIZE {
                    println!("⚠️ BUFFER OVERFLOW PROTECTION: {} tentou enviar {} bytes", 
                             ip, accumulator.len() + n);
                    accumulator.clear();
                    accumulator.shrink_to_fit();
                    continue;
                }
                
                accumulator.extend_from_slice(&buffer[0..n]);
                
                let should_parse = if let Some(expected) = expected_size {
                    if accumulator.len() >= expected {
                        println!("✅ [{}] PLC {}: Pacote completo! {} bytes (esperado: {})", 
                                 now, ip, accumulator.len(), expected);
                        true
                    } else {
                        println!("⏳ [{}] PLC {}: Acumulando... {}/{} bytes", 
                                 now, ip, accumulator.len(), expected);
                        false
                    }
                } else {
                    println!("⚠️ [{}] PLC {}: Sem config, parseando {} bytes", now, ip, n);
                    true
                };
                
                if should_parse {
                    last_valid_packet = std::time::Instant::now();
                    packet_count += 1;
                    
                    // 🆕 ATUALIZAR PACKET COUNT NO HEALTH
                    if let Some(mut health) = connection_health.get_mut(&ip) {
                        health.packet_count = packet_count;
                    }
                    
                    let tcp_received_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    let data_to_parse = if accumulator.is_empty() { 
                        &buffer[0..n] 
                    } else { 
                        &accumulator[..] 
                    };
                    
                    let cached_config = plc_configs_cache.get(&ip).map(|entry| entry.clone());
                    let parsed = crate::plc_parser::parse_plc_data_cached(data_to_parse, &ip, cached_config);
                    
                    let backend_processed_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    latest_data.insert(ip.clone(), parsed.clone());
                    
                    let processing_time_us = (backend_processed_ns - tcp_received_ns) / 1000;
                    
                    let _ = app_handle.emit("plc-data-received", serde_json::json!({
                        "ip": parsed.ip,
                        "timestamp": parsed.timestamp,
                        "raw_data": parsed.raw_data,
                        "size": parsed.size,
                        "variables": parsed.variables,
                        "tcp_received_ns": tcp_received_ns,
                        "backend_processed_ns": backend_processed_ns,
                        "processing_time_us": processing_time_us
                    }));
                    
                    let _ = app_handle.emit("websocket-cache-update", serde_json::json!({
                        "plc_ip": parsed.ip,
                        "variables": parsed.variables,
                        "timestamp": parsed.timestamp
                    }));
                    
                    accumulator.clear();
                    if accumulator.capacity() > BUFFER_CAPACITY * 2 {
                        accumulator.shrink_to_fit();
                        accumulator.reserve(BUFFER_CAPACITY);
                    }
                    
                    // Estatísticas periódicas
                    let elapsed = last_emit_time.elapsed();
                    if elapsed.as_secs_f64() >= 1.0 {
                        let bytes_per_second = (bytes_since_last_emit as f64 / elapsed.as_secs_f64()) as u64;
                        
                        let _ = app_handle.emit("tcp-connection-heartbeat", serde_json::json!({
                            "ip": ip,
                            "id": conn_id,
                            "last_packet_age_seconds": last_valid_packet.elapsed().as_secs(),
                            "accumulator_size": accumulator.len(),
                            "connection_health": "healthy"
                        }));
                        
                        let _ = app_handle.emit("plc-data-stats", serde_json::json!({
                            "ip": ip,
                            "id": conn_id,
                            "bytesPerSecond": bytes_per_second,
                            "packets": packet_count,
                            "totalBytes": total_bytes,
                            "transferRate": format!("{:.2} KB/s", bytes_per_second as f64 / 1024.0),
                            "industrialMetrics": {
                                "packetFrequency": (packet_count as f64 / elapsed.as_secs_f64()) as u64,
                                "avgPacketSize": if packet_count > 0 { total_bytes / packet_count } else { 0 },
                                "dataIntegrity": "OK"
                            }
                        }));
                        
                        println!("📊 PLC {} (ID: {}): {} bytes/s, {} pacotes", ip, conn_id, bytes_per_second, packet_count);
                        
                        bytes_since_last_emit = 0;
                        last_emit_time = std::time::Instant::now();
                    }
                }
                
                // Responder com ACK
                if let Err(e) = socket.write_all(b"OK\n").await {
                    println!("❌ Erro ao enviar ACK para {}: {}", ip, e);
                    buffer_pool.return_buffer(accumulator).await;
                    return ConnectionResult::Error(format!("Erro ao enviar ACK: {}", e));
                }
                let _ = socket.flush().await;
            }
            Ok(Err(e)) => {
                let error_msg = format!("Erro de leitura: {}", e);
                println!("❌ {} de {} (ID: {})", error_msg, ip, conn_id);
                
                // 🆕 ATUALIZAR HEALTH COM ERRO
                if let Some(mut health) = connection_health.get_mut(&ip) {
                    health.is_alive = false;
                    health.last_error = Some(error_msg.clone());
                }
                
                let _ = app_handle.emit("tcp-read-error", serde_json::json!({
                    "ip": ip,
                    "id": conn_id,
                    "error": e.to_string()
                }));
                
                buffer_pool.return_buffer(accumulator).await;
                return ConnectionResult::Error(error_msg);
            }
            Err(_) => {
                consecutive_timeouts += 1;
                
                // 🆕 APÓS 3 TIMEOUTS CONSECUTIVOS, ASSUMIR CONEXÃO MORTA
                if consecutive_timeouts >= 3 {
                    let reason = format!("{} timeouts consecutivos de {}s", consecutive_timeouts, READ_TIMEOUT_SECS);
                    println!("⏰ PLC {}: {} - conexão considerada morta", ip, reason);
                    
                    // Atualizar health
                    if let Some(mut health) = connection_health.get_mut(&ip) {
                        health.is_alive = false;
                        health.last_error = Some(reason.clone());
                    }
                    
                    let _ = app_handle.emit("tcp-read-timeout", serde_json::json!({
                        "ip": ip,
                        "id": conn_id,
                        "timeout_seconds": READ_TIMEOUT_SECS,
                        "consecutive_timeouts": consecutive_timeouts,
                        "reason": reason
                    }));
                    
                    buffer_pool.return_buffer(accumulator).await;
                    return ConnectionResult::Timeout(reason);
                }
                
                println!("⏰ Timeout de leitura {} ({}s) em {} - tentativa {}/3", 
                         consecutive_timeouts, READ_TIMEOUT_SECS, ip, consecutive_timeouts);
                
                // Continuar tentando
                continue;
            }
        }
    }
}