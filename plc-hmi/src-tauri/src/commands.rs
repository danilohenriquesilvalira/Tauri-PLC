use crate::tcp_server::{TcpServer, ConnectionStats};
use crate::database::{Database, PlcStructureConfig, DataBlockConfig, TagMapping};
use crate::websocket_server::{WebSocketServer, WebSocketConfig, WebSocketStats, NetworkInterface};
use crate::database::WebSocketDbConfig;
use crate::config::{ConfigManager, AppConfig};
use tauri::{AppHandle, State};
use tokio::sync::RwLock;
use std::sync::Arc;

pub type TcpServerState = Arc<RwLock<Option<TcpServer>>>;
pub type WebSocketServerState = Arc<RwLock<Option<WebSocketServer>>>;

#[tauri::command]
pub async fn start_tcp_server(
    port: u16,
    app_handle: AppHandle,
    server_state: State<'_, TcpServerState>,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    let mut server_guard = server_state.write().await;
    
    if server_guard.is_some() {
        return Err("Servidor TCP já está rodando".to_string());
    }
    
    let mut server = TcpServer::new(port, app_handle, Some(db.inner().clone()));
    
    match server.start_server().await {
        Ok(msg) => {
            *server_guard = Some(server);
            Ok(msg)
        }
        Err(e) => Err(e)
    }
}

#[tauri::command]
pub async fn stop_tcp_server(
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let mut server_guard = server_state.write().await;
    
    match server_guard.as_mut() {
        Some(server) => {
            let result = server.stop_server().await;
            *server_guard = None;
            result
        }
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

// Comando para obter interfaces de rede disponíveis
#[tauri::command]
pub async fn get_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
    WebSocketServer::get_available_network_interfaces()
}

// Comando para configurar e salvar interfaces WebSocket
#[tauri::command]
pub async fn save_websocket_config(
    config: WebSocketConfig,
    websocket_state: State<'_, WebSocketServerState>,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    let ws_guard = websocket_state.read().await;
    
    // Verificar se o servidor está rodando
    if ws_guard.is_some() {
        return Err("Pare o WebSocket server antes de alterar a configuração".to_string());
    }
    
    // Validar interfaces
    if config.bind_interfaces.is_empty() {
        return Err("Pelo menos uma interface deve ser selecionada".to_string());
    }
    
    for interface in &config.bind_interfaces {
        if interface.is_empty() {
            return Err("Interface vazia não é permitida".to_string());
        }
    }
    
    // Converter para formato do banco
    let db_config = WebSocketDbConfig {
        host: config.host.clone(),
        port: config.port,
        max_clients: config.max_clients,
        broadcast_interval_ms: config.broadcast_interval_ms,
        enabled: config.enabled,
        bind_interfaces: config.bind_interfaces.clone(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    // Salvar no banco
    db.save_websocket_config(&db_config)
        .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    Ok(format!("Configuração WebSocket salva: {} interfaces na porta {}", 
              config.bind_interfaces.len(), config.port))
}

// Comando para carregar configuração WebSocket do banco
#[tauri::command]
pub async fn load_websocket_config(
    db: State<'_, Arc<Database>>,
) -> Result<WebSocketDbConfig, String> {
    db.load_websocket_config()
        .map_err(|e| format!("Erro ao carregar configuração: {}", e))
}

#[tauri::command]
pub async fn disconnect_plc(
    client_ip: String,
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            server.disconnect_client(client_ip).await
        }
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

#[tauri::command]
pub async fn allow_plc_reconnect(
    client_ip: String,
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            server.allow_reconnect(client_ip).await
        }
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

#[tauri::command]
pub async fn get_connection_stats(
    server_state: State<'_, TcpServerState>,
) -> Result<ConnectionStats, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_connection_stats().await),
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

#[tauri::command]
pub async fn get_connected_clients(
    server_state: State<'_, TcpServerState>,
) -> Result<Vec<String>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_connected_clients().await),
        None => Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn get_all_known_plcs(
    server_state: State<'_, TcpServerState>,
) -> Result<Vec<(String, String)>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_all_known_plcs().await),
        None => Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn get_all_plc_bytes(
    server_state: State<'_, TcpServerState>,
) -> Result<std::collections::HashMap<String, u64>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_all_bytes().await),
        None => Ok(std::collections::HashMap::new())
    }
}

#[tauri::command]
pub async fn get_plc_data(
    client_ip: String,
    server_state: State<'_, TcpServerState>,
) -> Result<Option<crate::tcp_server::PlcDataPacket>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_plc_data(&client_ip).await),
        None => Ok(None)
    }
}

#[tauri::command]
pub async fn get_all_plc_data(
    server_state: State<'_, TcpServerState>,
) -> Result<std::collections::HashMap<String, crate::tcp_server::PlcDataPacket>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => Ok(server.get_all_plc_data().await),
        None => Ok(std::collections::HashMap::new())
    }
}

// Comandos dummy para compatibilidade (remover depois)
#[tauri::command]
pub async fn connect_to_plc(
    _plc_ip: String,
    _plc_port: u16,
) -> Result<String, String> {
    Ok("O PLC deve conectar no servidor, não o contrário".to_string())
}

#[tauri::command]
pub async fn scan_network_for_plcs() -> Result<Vec<String>, String> {
    Ok(vec!["Configure seu PLC para conectar no servidor".to_string()])
}

#[tauri::command]
pub async fn auto_discover_plc() -> Result<Vec<String>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn test_plc_connection(_ip: String, _port: u16) -> Result<bool, String> {
    Ok(false)
}

#[tauri::command]
pub async fn get_latest_plc_data() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
pub async fn get_plc_variable(
    plc_ip: String,
    variable_name: String,
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            if let Some(data_packet) = server.get_plc_data(&plc_ip).await {
                // Procurar a variável específica
                if let Some(variable) = data_packet.variables.iter()
                    .find(|v| v.name == variable_name) {
                    Ok(variable.value.clone())
                } else {
                    Err(format!("Variável '{}' não encontrada no PLC {}", variable_name, plc_ip))
                }
            } else {
                Err(format!("Nenhum dado disponível para PLC {}", plc_ip))
            }
        }
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

// ============================================================================
// COMANDOS DE CONFIGURAÇÃO DE ESTRUTURA DE DADOS
// ============================================================================

#[tauri::command]
pub async fn save_plc_structure(
    plc_ip: String,
    blocks: Vec<DataBlockConfig>,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    // Calcular tamanho total
    let mut total_size = 0;
    for block in &blocks {
        let type_size = match block.data_type.as_str() {
            "BYTE" => 1,
            "WORD" | "INT" => 2,
            "DWORD" | "DINT" | "REAL" => 4,
            "LWORD" | "LINT" | "LREAL" => 8,
            _ => return Err(format!("Tipo inválido: {}", block.data_type)),
        };
        total_size += type_size * block.count as usize;
    }
    
    let config = PlcStructureConfig {
        plc_ip: plc_ip.clone(),
        blocks,
        total_size,
        last_updated: chrono::Utc::now().timestamp(),
    };
    
    db.save_plc_structure(&config)
        .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    Ok(format!("Configuração salva para PLC {}: {} bytes", plc_ip, total_size))
}

#[tauri::command]
pub async fn load_plc_structure(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<Option<PlcStructureConfig>, String> {
    db.load_plc_structure(&plc_ip)
        .map_err(|e| format!("Erro ao carregar configuração: {}", e))
}

#[tauri::command]
pub async fn list_configured_plcs(
    db: State<'_, Arc<Database>>,
) -> Result<Vec<String>, String> {
    db.list_configured_plcs()
        .map_err(|e| format!("Erro ao listar PLCs: {}", e))
}

#[tauri::command]
pub async fn delete_plc_structure(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    db.delete_plc_structure(&plc_ip)
        .map_err(|e| format!("Erro ao deletar configuração: {}", e))?;
    
    Ok(format!("Configuração removida para PLC {}", plc_ip))
}

/// 🔍 DEBUG: Mostra o que está salvo no banco
#[tauri::command]
pub async fn debug_show_plc_structure(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    db.debug_show_saved_structure(&plc_ip)
        .map_err(|e| format!("Erro ao ler banco: {}", e))
}

// ============================================================================
// COMANDOS DE CONFIGURAÇÃO DE TAG MAPPINGS
// ============================================================================

#[tauri::command]
pub async fn save_tag_mapping(
    tag: TagMapping,
    db: State<'_, Arc<Database>>,
    _websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let mut tag_to_save = tag;
    tag_to_save.created_at = chrono::Utc::now().timestamp();
    
    // Debug: verificar dados que chegaram do frontend
    println!("🔍 Backend: Tag recebido do frontend - enabled: {}", tag_to_save.enabled);
    
    match db.save_tag_mapping(&tag_to_save) {
        Ok(tag_id) => {
            // Se o tag foi salvo com sucesso e está ativo, notificar WebSocket
            if tag_to_save.enabled {
                println!("🔄 Tag '{}' ativado, WebSocket será notificado automaticamente no próximo ciclo", tag_to_save.tag_name);
                
                // O WebSocket já vai pegar automaticamente na próxima consulta do banco
                // Não precisa fazer nada especial aqui, apenas confirmar que foi salvo
            }
            
            Ok(format!("Tag '{}' salvo com ID {} - {}", 
                tag_to_save.tag_name, 
                tag_id,
                if tag_to_save.enabled { "Ativado para WebSocket" } else { "Inativo" }
            ))
        },
        Err(e) => Err(format!("Erro ao salvar tag: {}", e))
    }
}

#[tauri::command]
pub async fn load_tag_mappings(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<TagMapping>, String> {
    db.load_tag_mappings(&plc_ip)
        .map_err(|e| format!("Erro ao carregar tags: {}", e))
}

#[tauri::command]
pub async fn delete_tag_mapping(
    plc_ip: String,
    variable_path: String,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    db.delete_tag_mapping(&plc_ip, &variable_path)
        .map_err(|e| format!("Erro ao deletar tag: {}", e))?;
    
    Ok(format!("Tag {} removido", variable_path))
}

#[tauri::command]
pub async fn get_active_tags(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<TagMapping>, String> {
    db.get_active_tags(&plc_ip)
        .map_err(|e| format!("Erro ao buscar tags ativos: {}", e))
}

#[tauri::command]
pub async fn get_plc_variables_for_mapping(
    plc_ip: String,
    server_state: State<'_, TcpServerState>,
) -> Result<Vec<String>, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            if let Some(data_packet) = server.get_plc_data(&plc_ip).await {
                let variable_names: Vec<String> = data_packet.variables
                    .iter()
                    .map(|v| v.name.clone())
                    .collect();
                Ok(variable_names)
            } else {
                Err("PLC não encontrado ou sem dados".to_string())
            }
        }
        None => Err("Servidor TCP não está rodando".to_string())
    }
}

// ============================================================================
// COMANDOS WEBSOCKET SERVER
// ============================================================================

#[tauri::command]
pub async fn start_websocket_server(
    config: WebSocketConfig,
    app_handle: AppHandle,
    websocket_state: State<'_, WebSocketServerState>,
    tcp_server_state: State<'_, TcpServerState>,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    println!("🔵 Iniciando WebSocket server com config: {:?}", config);
    
    // ⚠️ NÃO BLOQUEAR! Tentar lock com timeout
    println!("🔵 Tentando adquirir lock do WebSocket state...");
    let ws_guard_result = tokio::time::timeout(
        tokio::time::Duration::from_millis(500),
        websocket_state.write()
    ).await;
    
    let mut ws_guard = match ws_guard_result {
        Ok(guard) => {
            println!("✅ Lock do WebSocket adquirido!");
            guard
        }
        Err(_) => {
            println!("❌ TIMEOUT ao tentar lock do WebSocket state!");
            return Err("Timeout ao acessar estado do WebSocket".to_string());
        }
    };
    
    if ws_guard.is_some() {
        return Err("WebSocket server já está rodando".to_string());
    }
    
    println!("🔵 Criando instância do WebSocket server...");
    let mut websocket_server = WebSocketServer::new(
        config,
        app_handle,
        db.inner().clone(),
        Some(tcp_server_state.inner().clone()),
    );
    
    println!("🔵 Iniciando WebSocket server...");
    match websocket_server.start().await {
        Ok(msg) => {
            println!("✅ WebSocket server iniciado com sucesso: {}", msg);
            *ws_guard = Some(websocket_server);
            drop(ws_guard); // 🔓 LIBERAR LOCK IMEDIATAMENTE!
            println!("🔓 Lock do WebSocket liberado!");
            Ok(msg)
        }
        Err(e) => {
            println!("❌ Erro ao iniciar WebSocket server: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn stop_websocket_server(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let mut ws_guard = websocket_state.write().await;
    
    match ws_guard.as_mut() {
        Some(server) => {
            let result = server.stop().await;
            *ws_guard = None;
            result
        }
        None => Err("WebSocket server não está rodando".to_string())
    }
}

#[tauri::command]
pub async fn get_websocket_stats(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<WebSocketStats, String> {
    let ws_guard = websocket_state.read().await;
    
    match ws_guard.as_ref() {
        Some(server) => Ok(server.get_stats()),
        None => {
            // Retornar stats vazios se servidor não estiver rodando
            Ok(WebSocketStats {
                active_connections: 0,
                total_connections: 0,
                messages_sent: 0,
                bytes_sent: 0,
                uptime_seconds: 0,
                server_status: "Parado".to_string(),
                broadcast_rate_hz: 0.0,
            })
        }
    }
}

#[tauri::command]
pub async fn get_websocket_clients(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<Vec<serde_json::Value>, String> {
    let ws_guard = websocket_state.read().await;
    
    match ws_guard.as_ref() {
        Some(server) => Ok(server.get_connected_clients()),
        None => Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn update_websocket_config(
    config: WebSocketConfig,
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let mut ws_guard = websocket_state.write().await;
    
    match ws_guard.as_mut() {
        Some(server) => {
            server.update_config(config);
            Ok("Configuração do WebSocket atualizada".to_string())
        }
        None => Err("WebSocket server não está rodando".to_string())
    }
}

#[tauri::command]
pub async fn get_websocket_config(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<WebSocketConfig, String> {
    let ws_guard = websocket_state.read().await;
    
    match ws_guard.as_ref() {
        Some(server) => Ok(server.get_config().clone()),
        None => Ok(WebSocketConfig::default())
    }
}

// ============================================
// COMANDOS DE CONFIGURAÇÃO INICIAL
// ============================================

#[tauri::command]
pub fn check_first_run(app_handle: AppHandle) -> Result<bool, String> {
    let config_manager = ConfigManager::new(&app_handle)?;
    Ok(config_manager.is_first_run())
}

#[tauri::command]
pub fn get_default_db_path(app_handle: AppHandle) -> Result<String, String> {
    let path = ConfigManager::get_default_database_path(&app_handle)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn validate_db_path(path: String) -> Result<(), String> {
    ConfigManager::validate_database_path(&path)
}

#[tauri::command]
pub fn save_initial_config(
    app_handle: AppHandle,
    database_path: String,
    tcp_port: u16,
    websocket_port: u16,
) -> Result<String, String> {
    let config_manager = ConfigManager::new(&app_handle)?;
    
    // Validar caminho do banco
    ConfigManager::validate_database_path(&database_path)?;
    
    let config = AppConfig {
        database_path,
        first_run_completed: true,
        tcp_port,
        websocket_port,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    config_manager.save_config(&config)?;
    
    Ok("Configuração salva com sucesso!".to_string())
}

#[tauri::command]
pub fn get_app_config(app_handle: AppHandle) -> Result<AppConfig, String> {
    let config_manager = ConfigManager::new(&app_handle)?;
    config_manager.load_config()
}

/// URGENTE: Corrige broadcast_interval_ms para valor seguro (1000ms mínimo)
#[tauri::command]
pub async fn fix_websocket_broadcast_interval(
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    // Carregar config atual
    let current_config = db.load_websocket_config()
        .map_err(|e| format!("Erro ao carregar config: {}", e))?;
    
    let old_interval = current_config.broadcast_interval_ms;
    
    // Se já está >= 1000ms, não precisa fazer nada
    if old_interval >= 1000 {
        return Ok(format!("✅ Broadcast interval já está seguro: {}ms", old_interval));
    }
    
    // Corrigir para 1000ms (mínimo seguro)
    let mut fixed_config = current_config.clone();
    fixed_config.broadcast_interval_ms = 1000;
    fixed_config.updated_at = chrono::Utc::now().timestamp();
    
    // Salvar no banco
    db.save_websocket_config(&fixed_config)
        .map_err(|e| format!("Erro ao salvar config corrigida: {}", e))?;
    
    println!("🔧 Broadcast interval CORRIGIDO: {}ms → 1000ms", old_interval);
    Ok(format!("✅ Broadcast interval corrigido: {}ms → 1000ms (sistema agora estável)", old_interval))
}
