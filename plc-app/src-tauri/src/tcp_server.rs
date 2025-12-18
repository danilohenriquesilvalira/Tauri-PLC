use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio::time::{sleep, timeout};
use serde::{Deserialize, Serialize};
use crate::database::Database;
use std::sync::Weak;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcData {
    pub timestamp: String,
    pub variables: HashMap<String, f64>,
}

#[derive(Clone)]
pub struct TcpServer {
    port: u16,
    tx: broadcast::Sender<PlcData>,
    is_running: Arc<AtomicBool>,
    connection_count: Arc<AtomicU64>,
    last_data_time: Arc<AtomicU64>,
    database: Option<Weak<Database>>,
}

impl TcpServer {
    pub fn new(port: u16) -> Self {
        let (tx, _) = broadcast::channel(1000); // Increased buffer
        Self {
            port,
            tx,
            is_running: Arc::new(AtomicBool::new(false)),
            connection_count: Arc::new(AtomicU64::new(0)),
            last_data_time: Arc::new(AtomicU64::new(0)),
            database: None,
        }
    }
    
    pub fn set_database(&mut self, database: Weak<Database>) {
        self.database = Some(database);
    }
    
    async fn log_error(&self, category: &str, message: &str, details: &str) {
        if let Some(db_weak) = &self.database {
            if let Some(db) = db_weak.upgrade() {
                let _ = db.add_system_log("error", category, message, details).await;
            }
        }
    }
    
    async fn log_warning(&self, category: &str, message: &str, details: &str) {
        if let Some(db_weak) = &self.database {
            if let Some(db) = db_weak.upgrade() {
                let _ = db.add_system_log("warning", category, message, details).await;
            }
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.is_running.store(true, Ordering::SeqCst);
        
        let listener = TcpListener::bind(format!("0.0.0.0:{}", self.port)).await?;
        println!("╔════════════════════════════════════════════════════════════╗");
        println!("║  🚀 SERVIDOR TCP INICIADO - PORTA {}                    ║", self.port);
        println!("║  ⚡ Modo: Ultra-Robusto com Auto-Reconexão             ║");
        println!("║  📊 Logs otimizados: Stats a cada 500 pacotes         ║");
        println!("║  💚 Health check: A cada 5 minutos                    ║");
        println!("╚════════════════════════════════════════════════════════════╝");
        
        // Inicia monitor de health
        let health_monitor = self.clone();
        tokio::spawn(async move {
            health_monitor.start_health_monitor().await;
        });
        
        loop {
            match listener.accept().await {
                Ok((socket, addr)) => {
                    let conn_id = self.connection_count.fetch_add(1, Ordering::SeqCst) + 1;
                    
                    // Check if this is our PLC
                    if addr.ip().to_string() == "192.168.1.33" {
                        println!("🎉 PLC CONECTADO! Conexão #{} de {} estabelecida com sucesso", conn_id, addr);
                    } else {
                        println!("✅ Nova conexão #{} de {}", conn_id, addr);
                    }
                    
                    let tx = self.tx.clone();
                    let last_data_time = self.last_data_time.clone();
                    let server_clone = self.clone();
                    
                    tokio::spawn(async move {
                        if let Err(e) = handle_connection_robust(socket, tx, last_data_time, conn_id, server_clone).await {
                            eprintln!("❌ Conexão #{} encerrada: {:?}", conn_id, e);
                        } else {
                            println!("✅ Conexão #{} encerrada normalmente", conn_id);
                        }
                    });
                }
                Err(e) => {
                    eprintln!("❌ Erro ao aceitar conexão: {:?}", e);
                    self.log_error("tcp", "Erro ao aceitar conexão TCP", &format!("{:?}", e)).await;
                    sleep(Duration::from_secs(1)).await;
                }
            }
        }
    }
    
    async fn start_health_monitor(&self) {
        loop {
            sleep(Duration::from_secs(300)).await; // Check every 5 minutes instead of 30s
            
            let last_data = self.last_data_time.load(Ordering::SeqCst);
            let total_connections = self.connection_count.load(Ordering::SeqCst);
            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
            
            if last_data == 0 {
                println!("📡 Status: Aguardando primeira comunicação do PLC (Total conexões: {})", total_connections);
            } else if (now - last_data) > 120 {
                let msg = format!("⚠️ PLC SILENCIOSO há {} segundos", now - last_data);
                println!("{} (Total conexões: {})", msg, total_connections);
                self.log_warning("plc", &msg, &format!("Total conexões: {}", total_connections)).await;
            } else {
                // Only log if actually needed (connection is healthy, no need for spam)
                println!("💚 PLC ESTÁVEL - {} conexões ativas, última comunicação há {}s", total_connections, now - last_data);
            }
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<PlcData> {
        self.tx.subscribe()
    }

    pub async fn connect_to_plc(&self, plc_ip: &str, plc_port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let tx = self.tx.clone();
        let last_data_time = self.last_data_time.clone();
        let plc_address = format!("{}:{}", plc_ip, plc_port);
        let server_clone = self.clone();
        
        println!("🔄 Iniciando conexão robusta com PLC em {}", plc_address);
        
        tokio::spawn(async move {
            let mut retry_count = 0;
            let mut backoff_delay = Duration::from_secs(2);
            
            loop {
                match timeout(Duration::from_secs(10), TcpStream::connect(&plc_address)).await {
                    Ok(Ok(socket)) => {
                        retry_count = 0;
                        backoff_delay = Duration::from_secs(2);
                        println!("✅ Conectado ao PLC {}", plc_address);
                        
                        if let Err(e) = handle_connection_robust(socket, tx.clone(), last_data_time.clone(), 0, server_clone.clone()).await {
                            eprintln!("❌ Erro na comunicação com PLC: {:?}", e);
                            server_clone.log_error("plc", "Erro na comunicação com PLC", &format!("{:?}", e)).await;
                        }
                        
                        println!("🔄 Conexão com PLC perdida, tentando reconectar...");
                    }
                    Ok(Err(e)) => {
                        retry_count += 1;
                        eprintln!("❌ Falha ao conectar com PLC {} (tentativa {}): {:?}", plc_address, retry_count, e);
                        if retry_count % 5 == 0 { // Log a cada 5 tentativas
                            server_clone.log_error("plc", &format!("Falha ao conectar com PLC após {} tentativas", retry_count), &format!("Endereço: {} - Erro: {:?}", plc_address, e)).await;
                        }
                    }
                    Err(_) => {
                        retry_count += 1;
                        eprintln!("❌ Timeout ao conectar com PLC {} (tentativa {})", plc_address, retry_count);
                        if retry_count % 5 == 0 { // Log a cada 5 tentativas
                            server_clone.log_error("plc", &format!("Timeout ao conectar com PLC após {} tentativas", retry_count), &format!("Endereço: {}", plc_address)).await;
                        }
                    }
                }
                
                // Backoff exponential até 30 segundos
                sleep(backoff_delay).await;
                if backoff_delay < Duration::from_secs(30) {
                    backoff_delay = std::cmp::min(backoff_delay * 2, Duration::from_secs(30));
                }
                
                if retry_count % 10 == 0 {
                    println!("💪 Tentativa #{} de reconexão com PLC - mantendo persistência", retry_count);
                }
            }
        });
        
        Ok(())
    }
}

async fn handle_connection_robust(
    mut socket: TcpStream,
    tx: broadcast::Sender<PlcData>,
    last_data_time: Arc<AtomicU64>,
    conn_id: u64,
    server: TcpServer,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Configure socket options
    socket.set_nodelay(true)?;
    
    let mut buffer = vec![0u8; 8192]; // Bigger buffer
    let mut total_bytes_received = 0u64;
    let mut packets_processed = 0u64;
    let connection_start = Instant::now();
    
    println!("🔗 Conexão #{} estabelecida - configurando keepalive", conn_id);

    loop {
        // Use timeout for reads to detect dead connections
        match timeout(Duration::from_secs(30), socket.read(&mut buffer)).await {
            Ok(Ok(0)) => {
                println!("📡 Conexão #{} encerrada pelo peer", conn_id);
                break;
            }
            Ok(Ok(n)) => {
                total_bytes_received += n as u64;
                packets_processed += 1;
                
                // Update last data time
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                last_data_time.store(now, Ordering::SeqCst);
                
                // Log periodic stats (every 500 packets instead of 100)
                if packets_processed % 500 == 0 {
                    let elapsed = connection_start.elapsed().as_secs();
                    let rate = if elapsed > 0 { total_bytes_received / elapsed } else { 0 };
                    println!("📊 Conexão #{}: {} pacotes, {} bytes, {}s ativo, {} bytes/s", 
                        conn_id, packets_processed, total_bytes_received, elapsed, rate);
                }
                
                // Process data with error handling
                match process_plc_data(&buffer[..n], &tx).await {
                    Ok(_) => {
                        // Send robust ACK with timestamp
                        let ack_response = format!("ACK:{}\r\n", now);
                        if let Err(e) = timeout(Duration::from_secs(5), socket.write_all(ack_response.as_bytes())).await {
                            eprintln!("❌ Erro ao enviar ACK na conexão #{}: {:?}", conn_id, e);
                            server.log_error("tcp", &format!("Erro ao enviar ACK na conexão #{}", conn_id), &format!("{:?}", e)).await;
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Erro ao processar dados da conexão #{}: {:?}", conn_id, e);
                        server.log_warning("tcp", &format!("Erro ao processar dados da conexão #{}", conn_id), &format!("{:?}", e)).await;
                        // Continue mesmo com erro de parsing
                    }
                }
            }
            Ok(Err(e)) => {
                eprintln!("❌ Erro de leitura na conexão #{}: {:?}", conn_id, e);
                server.log_error("tcp", &format!("Erro de leitura na conexão #{}", conn_id), &format!("{:?}", e)).await;
                break;
            }
            Err(_) => {
                // Send keepalive ping (silent, no log spam)
                if let Err(_) = timeout(Duration::from_secs(5), socket.write_all(b"PING\r\n")).await {
                    println!("💔 Conexão #{} não responde ao PING após 30s - encerrando", conn_id);
                    break;
                }
                // Connection still alive after PING, continue silently
            }
        }
    }
    
    let elapsed = connection_start.elapsed();
    println!("📋 Conexão #{} finalizada: {}s ativo, {} pacotes, {} bytes", 
        conn_id, elapsed.as_secs(), packets_processed, total_bytes_received);
    
    Ok(())
}

async fn process_plc_data(
    data: &[u8], 
    tx: &broadcast::Sender<PlcData>
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Try JSON first
    let data_str = String::from_utf8_lossy(data);
    
    if let Ok(plc_data) = serde_json::from_str::<PlcData>(&data_str) {
        tx.send(plc_data)?;
        return Ok(());
    }
    
    // Parse binary data as Words with validation
    if data.len() < 2 {
        return Err("Dados insuficientes".into());
    }
    
    let mut variables = HashMap::new();
    let num_words = data.len() / 2;
    
    // Limit to reasonable number of words
    for i in 0..num_words.min(128) {
        let byte_index = i * 2;
        if byte_index + 1 < data.len() {
            let word_value = u16::from_be_bytes([
                data[byte_index],
                data[byte_index + 1]
            ]);
            variables.insert(format!("Word[{}]", i), word_value as f64);
        }
    }
    
    // Add metadata
    variables.insert("total_bytes".to_string(), data.len() as f64);
    variables.insert("total_words".to_string(), num_words as f64);
    variables.insert("connection_quality".to_string(), 100.0);
    
    // Add derived variables for common PLC patterns
    if let Some(&status_word) = variables.get("Word[0]") {
        variables.insert("sistema_ativo".to_string(), if (status_word as u16) & 0x0001 != 0 { 1.0 } else { 0.0 });
        variables.insert("emergencia".to_string(), if (status_word as u16) & 0x0002 != 0 { 1.0 } else { 0.0 });
        variables.insert("manutencao".to_string(), if (status_word as u16) & 0x0004 != 0 { 1.0 } else { 0.0 });
    }
    
    let plc_data = PlcData {
        timestamp: chrono::Utc::now().to_rfc3339(),
        variables,
    };
    
    tx.send(plc_data)?;
    Ok(())
}
