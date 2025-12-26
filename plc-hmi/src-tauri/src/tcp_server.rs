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
    connected_clients: Arc<RwLock<Vec<String>>>, // Lista de IPs conectados
    connection_handles: Arc<RwLock<HashMap<String, tokio::task::AbortHandle>>>, // Handles por IP
    unique_plcs: Arc<RwLock<HashSet<String>>>, // IPs únicos que já conectaram
    blacklisted_ips: Arc<RwLock<HashSet<String>>>, // IPs que não podem reconectar
    ip_to_id: Arc<RwLock<HashMap<String, u64>>>, // Mapeamento permanente IP → ID
    bytes_received: Arc<RwLock<HashMap<String, u64>>>, // Contador de bytes por IP
    latest_data: Arc<DashMap<String, PlcDataPacket>>, // 🚀 SEM LOCKS! Acesso concorrente livre
    database: Option<Arc<Database>>, // Banco de dados para configurações
    buffer_pool: Arc<BufferPool>, // ✅ BUFFER POOL PARA ZERO ALLOCATIONS
}

impl TcpServer {
    pub fn new(port: u16, app_handle: AppHandle, database: Option<Arc<Database>>) -> Self {
        Self {
            port,
            is_running: Arc::new(AtomicBool::new(false)),
            active_connections: Arc::new(AtomicU64::new(0)),
            app_handle,
            server_handle: None,
            connected_clients: Arc::new(RwLock::new(Vec::new())),
            connection_handles: Arc::new(RwLock::new(HashMap::new())),
            unique_plcs: Arc::new(RwLock::new(HashSet::new())),
            blacklisted_ips: Arc::new(RwLock::new(HashSet::new())),
            ip_to_id: Arc::new(RwLock::new(HashMap::new())),
            bytes_received: Arc::new(RwLock::new(HashMap::new())),
            latest_data: Arc::new(DashMap::new()), // 🚀 DashMap = zero locks!
            database,
            buffer_pool: Arc::new(BufferPool::new()), // ✅ BUFFER POOL INICIALIZADO
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
        let buffer_pool = self.buffer_pool.clone(); // ✅ BUFFER POOL
        let port = self.port;

        let handle = tokio::spawn(async move {
            println!("🚀 SERVIDOR TCP COM BLACKLIST INICIADO NA PORTA {}", listener.local_addr().unwrap().port());
            let mut next_id = 1u64; // Próximo ID disponível

            while is_running.load(Ordering::SeqCst) {
                match listener.accept().await {
                    Ok((socket, addr)) => {
                        let ip = addr.ip().to_string();
                        
                        // VERIFICAR BLACKLIST - NÃO ACEITAR CONEXÃO SE ESTIVER BLOQUEADO
                        if blacklisted_ips.read().await.contains(&ip) {
                            println!("🚫 CONEXÃO RECUSADA: {} (IP bloqueado pelo usuário)", ip);
                            drop(socket); // Fechar socket imediatamente
                            continue; // Ignorar esta conexão
                        }
                        
                        // Verificar se já existe uma conexão deste IP
                        if connection_handles.read().await.contains_key(&ip) {
                            println!("⚠️ CONEXÃO DUPLICADA REJEITADA: {} (já existe uma conexão ativa)", ip);
                            drop(socket);
                            continue;
                        }
                        
                        // OBTER OU CRIAR ID PERMANENTE PARA ESTE IP
                        let mut id_map = ip_to_id.write().await;
                        let conn_id = if let Some(&existing_id) = id_map.get(&ip) {
                            println!("🔄 RECONEXÃO DETECTADA: {} usa ID existente #{}", ip, existing_id);
                            existing_id
                        } else {
                            let new_id = next_id;
                            next_id += 1;
                            id_map.insert(ip.clone(), new_id);
                            println!("🆕 NOVO PLC: {} recebe ID #{}", ip, new_id);
                            new_id
                        };
                        drop(id_map); // Liberar lock
                        
                        // Adicionar IP aos únicos
                        unique_plcs.write().await.insert(ip.clone());
                        let total_unique = unique_plcs.read().await.len() as u64;
                        
                        let current_active = active_connections.fetch_add(1, Ordering::SeqCst) + 1;
                        
                        // Adicionar à lista de clientes conectados
                        connected_clients.write().await.push(ip.clone());
                        
                        println!("✅ PLC CONECTADO: {} (ID: {}) | Ativos: {} | Únicos: {}", 
                            addr, conn_id, current_active, total_unique);
                        
                        // Emitir evento para frontend
                        let _ = app_handle.emit("plc-connected", serde_json::json!({
                            "id": conn_id,
                            "address": addr.to_string(),
                            "ip": ip
                        }));
                        
                        // Emitir stats atualizadas
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
                        let buffer_pool_clone = buffer_pool.clone(); // ✅ BUFFER POOL
                        let ip_clone = ip.clone();
                        let is_running_clone = is_running.clone();

                        let connection_handle = tokio::spawn(async move {
                            // Manter conexão ativa e contar bytes
                            let total_bytes = handle_client_connection(
                                socket, 
                                conn_id, 
                                ip_clone.clone(), 
                                is_running_clone,
                                bytes_received_clone.clone(),
                                latest_data_clone.clone(),
                                app_handle_clone.clone(),
                                database_clone.clone(),
                                buffer_pool_clone.clone() // ✅ BUFFER POOL
                            ).await;
                            
                            println!("📊 PLC {} (ID: {}) transferiu {} bytes no total", ip_clone, conn_id, total_bytes);
                            
                            // Remover da lista quando desconectar
                            let mut clients = connected_clients_clone.write().await;
                            clients.retain(|client_ip| client_ip != &ip_clone);
                            
                            // Remover handle também
                            let mut handles = connection_handles_clone.write().await;
                            handles.remove(&ip_clone);
                            
                            let remaining = active_connections_clone.fetch_sub(1, Ordering::SeqCst) - 1;
                            let total_unique = unique_plcs_clone.read().await.len() as u64;
                            
                            println!("❌ PLC DESCONECTADO: {} (ID: {}) | Ativos: {} | Únicos: {}", 
                                ip_clone, conn_id, remaining, total_unique);
                            
                            let _ = app_handle_clone.emit("plc-disconnected", serde_json::json!({
                                "id": conn_id,
                                "ip": ip_clone.clone()
                            }));
                            
                            // Emitir stats atualizadas
                            let _ = app_handle_clone.emit("tcp-stats", serde_json::json!({
                                "active_connections": remaining,
                                "total_connections": total_unique,
                                "server_status": "Rodando",
                                "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
                            }));
                        });
                        
                        // Salvar handle por IP para poder matar individualmente
                        connection_handles.write().await.insert(ip.clone(), connection_handle.abort_handle());
                    }
                    Err(e) => {
                        eprintln!("❌ Erro ao aceitar conexão: {}", e);
                        break;
                    }
                }
            }
            
            println!("🛑 SERVIDOR TCP PARADO");
        });

        self.server_handle = Some(handle);
        
        let _ = self.app_handle.emit("tcp-server-started", format!("Servidor iniciado na porta {}", port));
        
        Ok(format!("Servidor TCP iniciado na porta {}", self.port))
    }

    pub async fn stop_server(&mut self) -> Result<String, String> {
        if !self.is_running.load(Ordering::SeqCst) {
            return Err("Servidor não está rodando".to_string());
        }

        println!("🛑 PARANDO SERVIDOR TCP...");
        
        // Parar aceitar novas conexões
        self.is_running.store(false, Ordering::SeqCst);
        
        // MATAR TODAS AS CONEXÕES ATIVAS PRIMEIRO
        let mut handles = self.connection_handles.write().await;
        for (ip, handle) in handles.drain() {
            println!("💀 Matando conexão ativa: {}", ip);
            handle.abort();
        }
        
        // Matar task do servidor
        if let Some(handle) = &self.server_handle {
            handle.abort();
        }
        
        // Limpar dados
        self.active_connections.store(0, Ordering::SeqCst);
        self.connected_clients.write().await.clear();
        self.server_handle = None;
        
        // Aguardar sockets fecharem
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        println!("✅ SERVIDOR TCP PARADO COMPLETAMENTE");
        
        let _ = self.app_handle.emit("tcp-server-stopped", "Servidor parado");
        
        Ok("Servidor TCP parado".to_string())
    }

    pub async fn disconnect_client(&self, client_ip: String) -> Result<String, String> {
        println!("🔌 DESCONECTANDO E BLOQUEANDO PLC: {}", client_ip);
        
        // ADICIONAR À BLACKLIST PRIMEIRO
        self.blacklisted_ips.write().await.insert(client_ip.clone());
        println!("🚫 IP {} adicionado à blacklist - NÃO PODE RECONECTAR", client_ip);
        
        // MATAR A CONEXÃO ESPECÍFICA
        let mut handles = self.connection_handles.write().await;
        if let Some(handle) = handles.remove(&client_ip) {
            println!("💀 Abortando conexão TCP de {}", client_ip);
            handle.abort();
            
            // Remover da lista de clientes
            let mut clients = self.connected_clients.write().await;
            clients.retain(|ip| ip != &client_ip);
            
            // Atualizar contador de ativos
            let remaining = self.active_connections.fetch_sub(1, Ordering::SeqCst).saturating_sub(1);
            let total_unique = self.unique_plcs.read().await.len() as u64;
            
            // Emitir evento de desconexão forçada
            let _ = self.app_handle.emit("plc-force-disconnected", serde_json::json!({
                "ip": client_ip.clone(),
                "blocked": true
            }));
            
            // Emitir stats atualizadas
            let _ = self.app_handle.emit("tcp-stats", serde_json::json!({
                "active_connections": remaining,
                "total_connections": total_unique,
                "server_status": "Rodando",
                "plc_status": if remaining > 0 { "Conectado" } else { "Desconectado" }
            }));
            
            Ok(format!("PLC {} desconectado e BLOQUEADO (não pode reconectar)", client_ip))
        } else {
            Err(format!("PLC {} não encontrado ou já desconectado", client_ip))
        }
    }
    
    // NOVO MÉTODO: Permitir reconexão (remover da blacklist)
    pub async fn allow_reconnect(&self, client_ip: String) -> Result<String, String> {
        let removed = self.blacklisted_ips.write().await.remove(&client_ip);
        if removed {
            println!("✅ IP {} removido da blacklist - PODE CONECTAR NOVAMENTE", client_ip);
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

    // Nova função que retorna todos os PLCs conhecidos com seus status
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
        // 🚀 DashMap: acesso direto sem locks!
        self.latest_data.get(ip).map(|entry| entry.value().clone())
    }

    pub async fn get_all_plc_data(&self) -> HashMap<String, PlcDataPacket> {
        // 🚀 DashMap: acesso direto sem locks!
        self.latest_data.iter()
            .map(|entry| (entry.key().clone(), entry.value().clone()))
            .collect()
    }
}

// 🔧 CONSTANTES DE SEGURANÇA
const MAX_PACKET_SIZE: usize = 1_048_576; // 1MB máximo
const MAX_ACCUMULATOR_SIZE: usize = 65536; // 64KB máximo  
const BUFFER_CAPACITY: usize = 8192; // 8KB inicial

async fn handle_client_connection(
    mut socket: TcpStream, 
    conn_id: u64, 
    ip: String,
    is_running: Arc<AtomicBool>,
    _bytes_received: Arc<RwLock<HashMap<String, u64>>>,
    latest_data: Arc<DashMap<String, PlcDataPacket>>, // 🚀 DashMap!
    app_handle: tauri::AppHandle,
    database: Option<Arc<Database>>,
    buffer_pool: Arc<BufferPool> // ✅ BUFFER POOL
) -> u64 {
    let mut buffer = [0; 1024];
    let mut accumulator = buffer_pool.get_buffer(BUFFER_CAPACITY).await; // ✅ BUFFER DO POOL
    let mut expected_size: Option<usize> = None; // 🎯 Tamanho esperado da configuração
    let mut total_bytes = 0u64;
    let mut packet_count = 0u64;
    let mut last_emit_time = std::time::Instant::now();
    let mut bytes_since_last_emit = 0u64;
    // Timeout de inatividade: fecha conexão se não receber pacote válido por 300s
    let mut last_valid_packet = std::time::Instant::now();
    let mut last_fragment_time = std::time::Instant::now();
    let mut _fragment_timeout_logged = false;
    
    // 🔍 Carregar configuração salva para saber quantos bytes esperar
    if let Some(db) = database.as_ref() {
        match db.load_plc_structure(&ip) {
            Ok(Some(structure)) => {
                expected_size = Some(structure.total_size);
                println!("🎯 PLC {}: Esperando {} bytes por pacote (configuração salva)", ip, structure.total_size);
            }
            Ok(None) => {
                println!("⚠️ PLC {}: Sem configuração salva, aceitando qualquer tamanho", ip);
            }
            Err(e) => {
                println!("⚠️ PLC {}: Erro ao carregar configuração ({}), aceitando qualquer tamanho", ip, e);
            }
        }
    }
    
    loop {
        // Verificar se servidor ainda está rodando
        if !is_running.load(Ordering::SeqCst) {
            println!("🛑 Fechando conexão {} pois servidor parou", ip);
            break;
        }
        
        // Verificar fragmentos pendentes no acumulador (timeout de 30s para fragmento incompleto)
        if !accumulator.is_empty() && last_fragment_time.elapsed().as_secs() > 30 {
            if !_fragment_timeout_logged {
                println!("⚠️ FRAGMENTO INCOMPLETO: {} tem {} bytes acumulados por {}s - PLC parou de enviar?", 
                    ip, accumulator.len(), last_fragment_time.elapsed().as_secs());
                let _ = app_handle.emit("tcp-fragment-timeout", serde_json::json!({
                    "ip": ip,
                    "id": conn_id,
                    "accumulated_bytes": accumulator.len(),
                    "expected_bytes": expected_size.unwrap_or(0),
                    "timeout_seconds": last_fragment_time.elapsed().as_secs()
                }));
                _fragment_timeout_logged = true;
            }
            
            // Após 60s, limpar acumulador e continuar
            if last_fragment_time.elapsed().as_secs() > 60 {
                println!("🧹 Limpando acumulador de {} após 60s - {} bytes descartados", ip, accumulator.len());
                accumulator.clear();
                _fragment_timeout_logged = false;
                // Reset fragment time para evitar warning
                last_fragment_time = std::time::Instant::now();
            }
        }
        // Timeout de inatividade: se passou de 300s sem pacote válido, fecha conexão
        if last_valid_packet.elapsed().as_secs() > 300 {
            println!("⏰ Timeout de inatividade: fechando conexão {} (ID: {}) após 300s sem pacote válido", ip, conn_id);
            let _ = app_handle.emit("tcp-inactive-timeout", serde_json::json!({
                "ip": ip,
                "id": conn_id,
                "reason": "Sem pacote válido por 300s - PLC pode estar em busy state"
            }));
            break;
        }
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120), // 120s timeout - PLC pode demorar mais
            socket.read(&mut buffer)
        ).await {
            Ok(Ok(0)) => {
                println!("📡 Cliente {} (ID: {}) fechou conexão", ip, conn_id);
                break;
            }
            Ok(Ok(n)) => {
                total_bytes += n as u64;
                bytes_since_last_emit += n as u64;
                let now = chrono::Local::now().format("%H:%M:%S%.3f");
                println!("📥 [{}] Fragmento de {} (ID: {}): {} bytes", now, ip, conn_id, n);
                
                // Atualizar tempo do último fragmento
                last_fragment_time = std::time::Instant::now();
                _fragment_timeout_logged = false;
                
                // ✅ PROTEÇÃO CONTRA MEMORY LEAK
                if accumulator.len() + n > MAX_ACCUMULATOR_SIZE {
                    println!("⚠️ BUFFER OVERFLOW PROTECTION: {} tentou enviar {} bytes (max: {})", 
                             ip, accumulator.len() + n, MAX_ACCUMULATOR_SIZE);
                    accumulator.clear();
                    accumulator.shrink_to_fit();
                    continue;
                }
                
                // 📦 Adicionar fragmento ao acumulador
                accumulator.extend_from_slice(&buffer[0..n]);
                // 🎯 Verificar se temos pacote completo
                let should_parse = if let Some(expected) = expected_size {
                    // Com configuração: esperar pelo tamanho exato
                    if accumulator.len() >= expected {
                        println!("✅ [{}] PLC {}: Pacote completo! {} bytes acumulados (esperado: {})", 
                                 now, ip, accumulator.len(), expected);
                        true
                    } else {
                        println!("⏳ [{}] PLC {}: Acumulando... {}/{} bytes", 
                                 now, ip, accumulator.len(), expected);
                        false
                    }
                } else {
                    // Sem configuração: parsear cada fragmento (comportamento antigo)
                    println!("⚠️ [{}] PLC {}: Sem configuração salva, parseando fragmento de {} bytes", 
                             now, ip, n);
                    true
                };
                if should_parse {
                    last_valid_packet = std::time::Instant::now(); // Atualiza tempo do último pacote válido
                    packet_count += 1;
                    
                    // Timestamp de recepção TCP (nanosegundos)
                    let tcp_received_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    // Parse dados acumulados
                    let data_to_parse = if accumulator.is_empty() { 
                        &buffer[0..n] 
                    } else { 
                        &accumulator[..] 
                    };
                    
                    let parsed = crate::plc_parser::parse_plc_data(data_to_parse, &ip, database.as_ref());
                    
                    // Adicionar métricas de transferência
                    let backend_processed_ns = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos();
                    
                    // 🚀 DashMap: inserção direta sem locks!
                    latest_data.insert(ip.clone(), parsed.clone());
                    
                    // Calcular tempo de processamento TCP→Backend (microsegundos)
                    let processing_time_us = (backend_processed_ns - tcp_received_ns) / 1000;
                    
                    // Emite evento com dados parseados + métricas de tempo
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
                    
                    // 🚀 NOVO: Emitir evento específico para CACHE do WebSocket
                    let _ = app_handle.emit("websocket-cache-update", serde_json::json!({
                        "plc_ip": parsed.ip,
                        "variables": parsed.variables,
                        "timestamp": parsed.timestamp
                    }));
                    
                    // 🧹 Limpar acumulador após parsear e recuperar memória
                    accumulator.clear();
                    if accumulator.capacity() > BUFFER_CAPACITY * 2 {
                        accumulator.shrink_to_fit(); // ✅ Recuperar memória excessiva
                        accumulator.reserve(BUFFER_CAPACITY); // ✅ Manter capacidade mínima
                    }
                    
                    // Emitir estatísticas a cada 1 segundo para calcular taxa
                    let elapsed = last_emit_time.elapsed();
                    if elapsed.as_secs_f64() >= 1.0 {
                        // Calcular bytes por segundo
                        let bytes_per_second = (bytes_since_last_emit as f64 / elapsed.as_secs_f64()) as u64;
                        
                        // Heartbeat: emitir sinal de vida da conexão
                        let _ = app_handle.emit("tcp-connection-heartbeat", serde_json::json!({
                            "ip": ip,
                            "id": conn_id,
                            "last_packet_age_seconds": last_valid_packet.elapsed().as_secs(),
                            "accumulator_size": accumulator.len(),
                            "connection_health": if last_valid_packet.elapsed().as_secs() < 30 { "healthy" } else { "stale" }
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
                        
                        println!("📊 PLC {} (ID: {}): {} bytes/s", ip, conn_id, bytes_per_second);
                        
                        // Reset contadores
                        bytes_since_last_emit = 0;
                        last_emit_time = std::time::Instant::now();
                    }
                }
                
                // Responder com ACK simples e imediato
                if let Err(e) = socket.write_all(b"OK\n").await {
                    println!("❌ Erro ao enviar ACK para {}: {}", ip, e);
                    let _ = app_handle.emit("tcp-ack-error", serde_json::json!({
                        "ip": ip,
                        "id": conn_id,
                        "error": e.to_string()
                    }));
                    break;
                }
                // Garantir envio imediato do ACK
                let _ = socket.flush().await;
            }
            Ok(Err(e)) => {
                println!("❌ Erro de leitura de {} (ID: {}): {}", ip, conn_id, e);
                let _ = app_handle.emit("tcp-read-error", serde_json::json!({
                    "ip": ip,
                    "id": conn_id,
                    "error": e.to_string()
                }));
                break;
            }
            Err(_) => {
                println!("⏰ Timeout de leitura (120s) na conexão {} (ID: {}) - PLC pode estar ocupado", ip, conn_id);
                let _ = app_handle.emit("tcp-read-timeout", serde_json::json!({
                    "ip": ip,
                    "id": conn_id,
                    "timeout_seconds": 120,
                    "reason": "PLC não enviou dados dentro do timeout de leitura"
                }));
                break;
            }
        }
    }
    
    // ✅ RETORNAR BUFFER PARA O POOL
    buffer_pool.return_buffer(accumulator).await;
    
    total_bytes
}