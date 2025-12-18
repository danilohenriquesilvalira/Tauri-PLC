use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::database::Database;

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
    latest_data: Arc<RwLock<HashMap<String, PlcDataPacket>>>, // Últimos dados recebidos por IP
    database: Option<Arc<Database>>, // Banco de dados para configurações
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
            latest_data: Arc::new(RwLock::new(HashMap::new())),
            database,
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
                                database_clone.clone()
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
        let data_map = self.latest_data.read().await;
        data_map.get(ip).cloned()
    }

    pub async fn get_all_plc_data(&self) -> HashMap<String, PlcDataPacket> {
        self.latest_data.read().await.clone()
    }
}

async fn handle_client_connection(
    mut socket: TcpStream, 
    conn_id: u64, 
    ip: String,
    is_running: Arc<AtomicBool>,
    _bytes_received: Arc<RwLock<HashMap<String, u64>>>,
    latest_data: Arc<RwLock<HashMap<String, PlcDataPacket>>>,
    app_handle: tauri::AppHandle,
    database: Option<Arc<Database>>
) -> u64 {
    let mut buffer = [0; 1024];
    let mut total_bytes = 0u64;
    let mut packet_count = 0u64;
    let mut last_emit_time = std::time::Instant::now();
    let mut bytes_since_last_emit = 0u64;
    
    loop {
        // Verificar se servidor ainda está rodando
        if !is_running.load(Ordering::SeqCst) {
            println!("🛑 Fechando conexão {} pois servidor parou", ip);
            break;
        }
        
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(30), // 30s timeout
            socket.read(&mut buffer)
        ).await {
            Ok(Ok(0)) => {
                println!("📡 Cliente {} (ID: {}) fechou conexão", ip, conn_id);
                break;
            }
            Ok(Ok(n)) => {
                total_bytes += n as u64;
                packet_count += 1;
                bytes_since_last_emit += n as u64;
                
                println!("📥 Dados recebidos de {} (ID: {}): {} bytes", ip, conn_id, n);
                
                // Timestamp de recepção TCP (nanosegundos)
                let tcp_received_ns = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos();
                
                // Parse e armazena os dados recebidos
                let parsed = crate::plc_parser::parse_plc_data(&buffer[0..n], &ip, database.as_ref());
                
                // Adicionar métricas de transferência
                let backend_processed_ns = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos();
                
                {
                    let mut data_map = latest_data.write().await;
                    data_map.insert(ip.clone(), parsed.clone());
                }
                
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
                
                // Emitir estatísticas a cada 1 segundo para calcular taxa
                let elapsed = last_emit_time.elapsed();
                if elapsed.as_secs_f64() >= 1.0 {
                    // Calcular bytes por segundo
                    let bytes_per_second = (bytes_since_last_emit as f64 / elapsed.as_secs_f64()) as u64;
                    
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
                
                // Responder com ACK simples
                if let Err(_) = socket.write_all(b"OK\n").await {
                    println!("❌ Erro ao enviar ACK para {}", ip);
                    break;
                }
            }
            Ok(Err(e)) => {
                println!("❌ Erro de leitura de {} (ID: {}): {}", ip, conn_id, e);
                break;
            }
            Err(_) => {
                println!("⏰ Timeout na conexão {} (ID: {})", ip, conn_id);
                break;
            }
        }
    }
    
    total_bytes
}