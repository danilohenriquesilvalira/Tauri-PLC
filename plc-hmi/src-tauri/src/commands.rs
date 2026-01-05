#[tauri::command]
pub async fn reload_websocket_tag_groups(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let mut ws_guard = websocket_state.write().await;
    match ws_guard.as_mut() {
        Some(server) => {
            server.reload_tag_groups().await?;
            Ok("WebSocket tag groups reloaded".to_string())
        }
        None => Err("WebSocket server não está rodando".to_string())
    }
}
use tauri::Emitter;
use crate::tcp_server::{TcpServer, ConnectionStats};
use crate::database::{Database, PlcStructureConfig, DataBlockConfig, TagMapping};
use crate::websocket_server::{WebSocketServer, WebSocketConfig, WebSocketStats, NetworkInterface, BackpressureMetrics};

// ✅ OTIMIZAÇÃO: Estruturas para monitoramento de memória
#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemMemoryStats {
    // TCP Server
    pub tcp_buffer_pool_active: usize,
    pub tcp_connected_clients: usize,
    pub tcp_data_cache_size: usize,
    
    // WebSocket Server  
    pub ws_tag_cache_size: usize,
    pub ws_tag_cache_usage_pct: f64,
    pub ws_mappings_cache_size: usize,
    pub ws_change_tracking_size: usize,
    pub ws_connected_clients: usize,
    
    // General
    pub total_estimated_memory_kb: usize,
    pub memory_health_status: String,
    pub last_cleanup_seconds_ago: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryHealthReport {
    pub status: String, // "healthy", "warning", "critical"
    pub memory_stats: SystemMemoryStats,
    pub recommendations: Vec<String>,
    pub auto_cleanup_enabled: bool,
}

// 🛡️ COMANDO PARA OBTER MÉTRICAS DO BACKPRESSURE ADAPTATIVO
#[tauri::command]
pub async fn get_backpressure_metrics(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<BackpressureMetrics, String> {
    let ws_guard = websocket_state.read().await;
    match ws_guard.as_ref() {
        Some(server) => Ok(server.get_backpressure_metrics()),
        None => Err("WebSocket server não está rodando".to_string())
    }
}

// 🆕 DIAGNÓSTICO DE MÚLTIPLOS PLCs - PARA MONITORAMENTO DE LONGO PRAZO
#[derive(Debug, Clone, serde::Serialize)]
pub struct MultiPlcDiagnostics {
    pub total_plcs_connected: usize,
    pub plc_tag_counts: std::collections::HashMap<String, usize>,
    pub websocket_single_server: bool,
    pub tcp_single_server: bool,
    pub architecture_status: String,
    pub scalability_notes: Vec<String>,
}

#[tauri::command]
pub async fn get_multi_plc_diagnostics(
    websocket_state: State<'_, WebSocketServerState>,
    tcp_state: State<'_, TcpServerState>,
) -> Result<MultiPlcDiagnostics, String> {
    let ws_guard = websocket_state.read().await;
    let tcp_guard = tcp_state.read().await;
    
    let plc_tag_counts = match ws_guard.as_ref() {
        Some(server) => server.get_tag_count_by_plc(),
        None => std::collections::HashMap::new(),
    };
    
    let total_plcs = plc_tag_counts.len();
    
    let mut scalability_notes = vec![
        "✅ ARQUITETURA: 1 TCP Server + 1 WebSocket Server para TODOS os PLCs".to_string(),
        "✅ Tags são namespaced por IP: {PLC_IP}:{TAG_NAME}".to_string(),
        "✅ Clientes WebSocket filtram por PLC via SUBSCRIBE".to_string(),
        "✅ Sistema pode rodar indefinidamente (anos) sem memory leaks".to_string(),
    ];
    
    if total_plcs > 5 {
        scalability_notes.push(format!("⚠️ {} PLCs conectados - considere aumentar buffer de backpressure", total_plcs));
    }
    
    Ok(MultiPlcDiagnostics {
        total_plcs_connected: total_plcs,
        plc_tag_counts,
        websocket_single_server: ws_guard.is_some(),
        tcp_single_server: tcp_guard.is_some(),
        architecture_status: if total_plcs > 0 { "healthy" } else { "no_plcs" }.to_string(),
        scalability_notes,
    })
}

use crate::database::WebSocketDbConfig;
use crate::config::{ConfigManager, AppConfig};
use tauri::{AppHandle, State};
use tokio::sync::RwLock;
use std::sync::Arc;
use serde::Deserialize;
use sqlx::Connection;

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
    server_state: State<'_, TcpServerState>, // 🆕 Adicionar acesso ao servidor TCP
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
    
    // Salvar no banco
    db.save_plc_structure(&config)
        .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    // 🆕 AUTO-INVALIDAR CACHE: Atualizar cache automaticamente após salvar
    let server_guard = server_state.read().await;
    if let Some(server) = server_guard.as_ref() {
        match server.invalidate_plc_cache(&plc_ip).await {
            Ok(msg) => println!("🔄 {}", msg),
            Err(e) => println!("⚠️ Falha ao invalidar cache: {}", e),
        }
    }
    
    Ok(format!("Configuração salva para PLC {}: {} bytes (cache atualizado)", plc_ip, total_size))
}

// 🆕 COMANDO: Recarregar cache de configurações PLC
#[tauri::command]
pub async fn reload_plc_configs_cache(
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            server.reload_plc_configs_cache().await
        }
        None => Err("❌ Servidor TCP não está rodando".to_string())
    }
}

// 🆕 COMANDO: Invalidar cache de um PLC específico
#[tauri::command]
pub async fn invalidate_plc_cache(
    plc_ip: String,
    server_state: State<'_, TcpServerState>,
) -> Result<String, String> {
    let server_guard = server_state.read().await;
    
    match server_guard.as_ref() {
        Some(server) => {
            server.invalidate_plc_cache(&plc_ip).await
        }
        None => Err("❌ Servidor TCP não está rodando".to_string())
    }
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
    websocket_state: State<'_, WebSocketServerState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let mut tag_to_save = tag;
    tag_to_save.created_at = chrono::Utc::now().timestamp();
    
    // Debug: verificar dados que chegaram do frontend
    println!("🔍 Backend: Tag recebido do frontend - enabled: {}", tag_to_save.enabled);
    
    // Verificar se o tag já existe (por plc_ip + variable_path)
    let tag_exists = db.load_tag_mappings(&tag_to_save.plc_ip)
        .map(|tags| tags.iter().any(|t| t.variable_path == tag_to_save.variable_path))
        .unwrap_or(false);
    match db.save_tag_mapping(&tag_to_save) {
        Ok(tag_id) => {
            // Sempre emitir status-changed
            let _ = app_handle.emit(
                "tag-status-changed",
                serde_json::json!({
                    "tag_name": tag_to_save.tag_name,
                    "plc_ip": tag_to_save.plc_ip,
                    "enabled": tag_to_save.enabled
                })
            );
            // Só emitir tag-created se for realmente novo
            if !tag_exists {
                let _ = app_handle.emit(
                    "tag-created",
                    serde_json::json!({
                        "id": tag_id,
                        "plc_ip": tag_to_save.plc_ip,
                        "variable_path": tag_to_save.variable_path,
                        "tag_name": tag_to_save.tag_name,
                        "description": tag_to_save.description,
                        "unit": tag_to_save.unit,
                        "enabled": tag_to_save.enabled,
                        "created_at": tag_to_save.created_at,
                        "collect_mode": tag_to_save.collect_mode,
                        "collect_interval_s": tag_to_save.collect_interval_s
                    })
                );
            }
            // Sempre recarregar grupos de tags do WebSocket
            let _ = reload_websocket_tag_groups(websocket_state).await;
            if tag_to_save.enabled {
                println!("🔄 Tag '{}' ativado, WebSocket será notificado automaticamente no próximo ciclo", tag_to_save.tag_name);
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
pub async fn save_tag_mappings_bulk(
    tags: Vec<TagMapping>,
    db: State<'_, Arc<Database>>,
    websocket_state: State<'_, WebSocketServerState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    if tags.is_empty() {
        return Err("Lista de tags vazia".to_string());
    }

    let plc_ip = tags[0].plc_ip.clone(); // Assumir que todos são do mesmo PLC
    let timestamp = chrono::Utc::now().timestamp();
    
    // Preparar tags com timestamp
    let tags_to_save: Vec<TagMapping> = tags
        .into_iter()
        .map(|mut tag| {
            tag.created_at = timestamp;
            tag
        })
        .collect();

    // Verificar tags existentes de uma vez só
    let existing_tags = db.load_tag_mappings(&plc_ip)
        .map_err(|e| format!("Erro ao verificar tags existentes: {}", e))?;
    
    let existing_paths: std::collections::HashSet<String> = existing_tags
        .iter()
        .map(|t| t.variable_path.clone())
        .collect();

    // Filtrar duplicatas
    let new_tags_only: Vec<TagMapping> = tags_to_save
        .into_iter()
        .filter(|tag| !existing_paths.contains(&tag.variable_path))
        .collect();

    if new_tags_only.is_empty() {
        return Err("Todas as variáveis selecionadas já foram mapeadas".to_string());
    }

    println!("🔍 Backend: Salvando {} tags em lote (filtrados {} duplicatas)", 
             new_tags_only.len(), existing_paths.len());

    // Salvar em lote usando transação
    match db.save_tag_mappings_bulk(&new_tags_only) {
        Ok(tag_ids) => {
            let successful_count = tag_ids.iter().filter(|&&id| id > 0).count();
            
            // Emitir eventos para tags criados com sucesso
            for (tag, &tag_id) in new_tags_only.iter().zip(tag_ids.iter()) {
                if tag_id > 0 {
                    let _ = app_handle.emit(
                        "tag-created",
                        serde_json::json!({
                            "id": tag_id,
                            "plc_ip": tag.plc_ip,
                            "variable_path": tag.variable_path,
                            "tag_name": tag.tag_name,
                            "description": tag.description,
                            "unit": tag.unit,
                            "enabled": tag.enabled,
                            "created_at": tag.created_at,
                            "collect_mode": tag.collect_mode,
                            "collect_interval_s": tag.collect_interval_s
                        })
                    );
                }
            }

            // ✅ CORREÇÃO: Só recarregar WebSocket UMA VEZ ao final
            let _ = reload_websocket_tag_groups(websocket_state).await;
            
            println!("🔄 Tags em lote ativados, WebSocket recarregado UMA VEZ");

            Ok(format!("{} tags criados com sucesso em lote", successful_count))
        },
        Err(e) => Err(format!("Erro ao salvar tags em lote: {}", e))
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
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    db.delete_tag_mapping(&plc_ip, &variable_path)
        .map_err(|e| format!("Erro ao deletar tag: {}", e))?;
    // Sempre recarregar grupos de tags do WebSocket
    let _ = reload_websocket_tag_groups(websocket_state).await;
    Ok(format!("Tag {} removido", variable_path))
}

#[tauri::command]
pub async fn delete_tag_mappings_bulk(
    ids: Vec<i64>,
    db: State<'_, Arc<Database>>,
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let count = ids.len();
    db.delete_tag_mappings_bulk(ids)
        .map_err(|e| format!("Erro ao deletar tags: {}", e))?;
    // Sempre recarregar grupos de tags do WebSocket
    let _ = reload_websocket_tag_groups(websocket_state).await;
    Ok(format!("{} tags removidos com sucesso", count))
}

// DEBUG: Limpar TODOS os tags de um PLC (para teste)
#[tauri::command]
pub async fn debug_clear_all_tags(
    plc_ip: String,
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    match db.debug_clear_all_plc_tags(&plc_ip) {
        Ok(count) => {
            Ok(format!("DEBUG: {} tags removidos do banco para PLC {}", count, plc_ip))
        }
        Err(e) => Err(format!("Erro ao limpar tags: {}", e))
    }
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

use crate::database::PostgresConfig;

#[tauri::command]
pub async fn save_postgres_config(
    config: PostgresConfig,
    db: State<'_, Arc<Database>>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    match db.save_postgres_config(&config) {
        Ok(_) => {
            // Emitir evento de configuração salva
            let _ = app_handle.emit(
                "postgres-config-saved",
                serde_json::json!({
                    "host": config.host,
                    "port": config.port,
                    "user": config.user,
                    "database": config.database,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                })
            );
            Ok("Configuração PostgreSQL salva com sucesso".to_string())
        },
        Err(e) => {
            // Emitir evento de erro
            let _ = app_handle.emit(
                "postgres-config-error",
                serde_json::json!({
                    "operation": "save_config",
                    "error": format!("{}", e),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                })
            );
            Err(format!("Erro ao salvar configuração: {}", e))
        }
    }
}

#[tauri::command]
pub async fn load_postgres_config(
    db: State<'_, Arc<Database>>,
) -> Result<Option<PostgresConfig>, String> {
    db.load_postgres_config()
        .map_err(|e| format!("Erro ao carregar configuração: {}", e))
}

#[derive(Deserialize)]
pub struct PostgresTestConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

#[tauri::command]
pub async fn test_postgres_connection(
    config: PostgresTestConfig,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use tokio_postgres::{NoTls, Config};
    
    println!("🔍 Tentando conectar no PostgreSQL com tokio-postgres: {}:{}@{}/{}", 
             config.user, config.port, config.host, config.database);
    
    // Usar tokio-postgres diretamente para evitar problemas de encoding do sqlx
    let mut pg_config = Config::new();
    pg_config
        .host(&config.host)
        .port(config.port)
        .user(&config.user)
        .password(&config.password)
        .dbname(&config.database)
        .application_name("plc-hmi");
    
    match pg_config.connect(NoTls).await {
        Ok((client, connection)) => {
            println!("✅ Conexão tokio-postgres estabelecida!");
            
            // Spawnar a conexão em background
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            // Testar uma query simples
            match client.query("SELECT 1 as test", &[]).await {
                Ok(rows) => {
                    println!("✅ Query executada! Resultado: {} linhas", rows.len());
                    handle.abort(); // Limpar conexão
                    
                    // Emitir evento de teste bem-sucedido
                    let _ = app_handle.emit(
                        "postgres-connection-success",
                        serde_json::json!({
                            "host": config.host,
                            "port": config.port,
                            "user": config.user,
                            "database": config.database,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        })
                    );
                    
                    Ok("✅ Conexão PostgreSQL funcionando perfeitamente!".to_string())
                },
                Err(e) => {
                    println!("❌ Erro na query: {}", e);
                    handle.abort();
                    
                    // Emitir evento de erro na query
                    let _ = app_handle.emit(
                        "postgres-connection-error",
                        serde_json::json!({
                            "host": config.host,
                            "port": config.port,
                            "operation": "test_query",
                            "error": format!("{}", e),
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        })
                    );
                    
                    Err(format!("❌ Conexão OK mas erro na query: {}", e))
                }
            }
        },
        Err(e) => {
            let error_msg = e.to_string();
            println!("❌ Erro de conexão tokio-postgres: {}", error_msg);
            
            // Fallback para sqlx se tokio-postgres também falhar
            println!("🔄 Tentando fallback com sqlx...");
            
            let url = format!(
                "postgresql://{}:{}@{}:{}/{}",
                config.user, config.password, config.host, config.port, config.database
            );
            
            match sqlx::postgres::PgConnection::connect(&url).await {
                Ok(mut conn) => {
                    match sqlx::query("SELECT 1").fetch_one(&mut conn).await {
                        Ok(_) => Ok("✅ Conexão PostgreSQL (sqlx fallback) funcionando!".to_string()),
                        Err(e) => Err(format!("❌ Erro no fallback: {}", e))
                    }
                },
                Err(sqlx_error) => {
                    // Mensagens amigáveis baseadas nos dois erros
                    if error_msg.contains("password") || sqlx_error.to_string().contains("password") {
                        Err("❌ Falha na autenticação: Verifique usuário e senha".to_string())
                    } else if error_msg.contains("database") || sqlx_error.to_string().contains("database") {
                        Err(format!("❌ Database '{}' não encontrada", config.database))
                    } else if error_msg.contains("Connection refused") || sqlx_error.to_string().contains("Connection refused") {
                        Err("❌ PostgreSQL não está rodando na porta especificada".to_string())
                    } else if error_msg.contains("role") || sqlx_error.to_string().contains("role") {
                        Err(format!("❌ Usuário '{}' não existe", config.user))
                    } else {
                        Err(format!("❌ Erro de conexão: {} | Fallback: {}", error_msg, sqlx_error))
                    }
                }
            }
        }
    }
}

// Validar nome de banco (segurança)
fn validate_database_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Nome do banco não pode estar vazio".to_string());
    }
    
    if name.len() > 63 {
        return Err("Nome do banco não pode ter mais de 63 caracteres".to_string());
    }
    
    // Apenas letras, números e underscore
    if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return Err("Nome do banco pode conter apenas letras, números e underscore".to_string());
    }
    
    // Não pode começar com número
    if name.chars().next().unwrap().is_ascii_digit() {
        return Err("Nome do banco não pode começar com número".to_string());
    }
    
    // Palavras reservadas do PostgreSQL
    let reserved = ["postgres", "template0", "template1", "user", "admin", "root", "system"];
    if reserved.contains(&name.to_lowercase().as_str()) {
        return Err("Nome do banco não pode ser uma palavra reservada".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn create_postgres_database(
    config: PostgresTestConfig,
    database_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use tokio_postgres::{NoTls, Config};
    
    // Validar nome do banco
    validate_database_name(&database_name)?;
    
    println!("🔧 Criando banco de dados '{}' no PostgreSQL...", database_name);
    
    // Conectar na database padrão 'postgres' para criar nova database
    let mut pg_config = Config::new();
    pg_config
        .host(&config.host)
        .port(config.port)
        .user(&config.user)
        .password(&config.password)
        .dbname("postgres") // Conecta na DB padrão para criar nova
        .application_name("plc-hmi");
    
    match pg_config.connect(NoTls).await {
        Ok((client, connection)) => {
            println!("✅ Conectado ao PostgreSQL para criar banco");
            
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            // Usar query preparada para segurança (evitar SQL injection)
            let create_query = format!("CREATE DATABASE \"{}\"", database_name);
            
            match client.batch_execute(&create_query).await {
                Ok(_) => {
                    println!("✅ Banco '{}' criado com sucesso!", database_name);
                    handle.abort();
                    
                    // Emitir evento de sucesso
                    let _ = app_handle.emit(
                        "postgres-database-created",
                        serde_json::json!({
                            "host": config.host,
                            "port": config.port,
                            "database": database_name,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        })
                    );
                    
                    Ok(format!("Banco de dados '{}' criado com sucesso!", database_name))
                },
                Err(e) => {
                    println!("❌ Erro ao criar banco: {}", e);
                    handle.abort();
                    
                    let error_msg = e.to_string();
                    if error_msg.contains("already exists") {
                        Err(format!("O banco '{}' já existe", database_name))
                    } else if error_msg.contains("permission denied") {
                        Err("Usuário não tem permissão para criar bancos".to_string())
                    } else {
                        // Emitir evento de erro
                        let _ = app_handle.emit(
                            "postgres-database-error",
                            serde_json::json!({
                                "operation": "create_database",
                                "database": database_name,
                                "error": error_msg,
                                "timestamp": chrono::Utc::now().to_rfc3339()
                            })
                        );
                        
                        Err(format!("Erro ao criar banco: {}", error_msg))
                    }
                }
            }
        },
        Err(e) => {
            println!("❌ Erro de conexão: {}", e);
            Err(format!("Não foi possível conectar ao PostgreSQL: {}", e))
        }
    }
}

#[tauri::command]
pub async fn list_postgres_databases(
    config: PostgresTestConfig,
    _app_handle: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    use tokio_postgres::{NoTls, Config};
    
    println!("📋 Listando bancos de dados no PostgreSQL...");
    
    let mut pg_config = Config::new();
    pg_config
        .host(&config.host)
        .port(config.port)
        .user(&config.user)
        .password(&config.password)
        .dbname("postgres")
        .application_name("plc-hmi");
    
    match pg_config.connect(NoTls).await {
        Ok((client, connection)) => {
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            // Query para listar bancos (excluindo templates)
            let query = "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname";
            
            match client.query(query, &[]).await {
                Ok(rows) => {
                    let databases: Vec<String> = rows
                        .iter()
                        .map(|row| row.get::<_, String>(0))
                        .collect();
                    
                    println!("✅ Encontrados {} bancos", databases.len());
                    handle.abort();
                    
                    Ok(databases)
                },
                Err(e) => {
                    println!("❌ Erro ao listar bancos: {}", e);
                    handle.abort();
                    Err(format!("Erro ao listar bancos: {}", e))
                }
            }
        },
        Err(e) => {
            println!("❌ Erro de conexão: {}", e);
            Err(format!("Não foi possível conectar ao PostgreSQL: {}", e))
        }
    }
}

#[tauri::command]
pub async fn drop_postgres_database(
    config: PostgresTestConfig,
    database_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use tokio_postgres::{NoTls, Config};
    
    // Validações de segurança
    validate_database_name(&database_name)?;
    
    // Não permitir excluir bancos críticos
    let protected_dbs = ["postgres", "template0", "template1"];
    if protected_dbs.contains(&database_name.as_str()) {
        return Err("Não é possível excluir bancos do sistema".to_string());
    }
    
    println!("🗑️ Excluindo banco de dados '{}'...", database_name);
    
    let mut pg_config = Config::new();
    pg_config
        .host(&config.host)
        .port(config.port)
        .user(&config.user)
        .password(&config.password)
        .dbname("postgres")
        .application_name("plc-hmi");
    
    match pg_config.connect(NoTls).await {
        Ok((client, connection)) => {
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            let drop_query = format!("DROP DATABASE \"{}\"", database_name);
            
            match client.batch_execute(&drop_query).await {
                Ok(_) => {
                    println!("✅ Banco '{}' excluído com sucesso!", database_name);
                    handle.abort();
                    
                    // Emitir evento de sucesso
                    let _ = app_handle.emit(
                        "postgres-database-dropped",
                        serde_json::json!({
                            "database": database_name,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        })
                    );
                    
                    Ok(format!("Banco de dados '{}' excluído com sucesso!", database_name))
                },
                Err(e) => {
                    println!("❌ Erro ao excluir banco: {}", e);
                    handle.abort();
                    
                    let error_msg = e.to_string();
                    if error_msg.contains("does not exist") {
                        Err(format!("O banco '{}' não existe", database_name))
                    } else if error_msg.contains("being accessed") {
                        Err(format!("O banco '{}' está sendo usado por outras conexões", database_name))
                    } else {
                        Err(format!("Erro ao excluir banco: {}", error_msg))
                    }
                }
            }
        },
        Err(e) => {
            println!("❌ Erro de conexão: {}", e);
            Err(format!("Não foi possível conectar ao PostgreSQL: {}", e))
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DatabaseTable {
    pub name: String,
    pub row_count: Option<u64>,
    pub columns: Vec<DatabaseColumn>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DatabaseColumn {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DatabaseInspection {
    pub database_name: String,
    pub tables: Vec<DatabaseTable>,
    pub total_tables: usize,
}

#[tauri::command]
pub async fn inspect_postgres_database(
    config: PostgresTestConfig,
    database_name: String,
    app_handle: tauri::AppHandle,
) -> Result<DatabaseInspection, String> {
    use tokio_postgres::{NoTls, Config};
    
    // Validações de segurança
    validate_database_name(&database_name)?;
    
    println!("🔍 Inspecionando estrutura do banco '{}'...", database_name);
    
    let mut pg_config = Config::new();
    pg_config
        .host(&config.host)
        .port(config.port)
        .user(&config.user)
        .password(&config.password)
        .dbname(&database_name)
        .application_name("plc-hmi");
    
    match pg_config.connect(NoTls).await {
        Ok((client, connection)) => {
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            // Query para obter lista de tabelas
            let tables_query = "
                SELECT 
                    table_name
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            ";
            
            match client.query(tables_query, &[]).await {
                Ok(table_rows) => {
                    let mut tables: Vec<DatabaseTable> = Vec::new();
                    
                    for table_row in table_rows {
                        let table_name: String = table_row.get(0);
                        
                        // Obter colunas da tabela
                        let columns_query = "
                            SELECT 
                                c.column_name,
                                c.data_type,
                                c.is_nullable,
                                COALESCE(pk.is_primary, false) as is_primary_key
                            FROM information_schema.columns c
                            LEFT JOIN (
                                SELECT 
                                    kc.column_name,
                                    true as is_primary
                                FROM information_schema.table_constraints tc
                                JOIN information_schema.key_column_usage kc 
                                    ON tc.constraint_name = kc.constraint_name
                                    AND tc.table_schema = kc.table_schema
                                WHERE tc.constraint_type = 'PRIMARY KEY'
                                AND tc.table_name = $1
                                AND tc.table_schema = 'public'
                            ) pk ON c.column_name = pk.column_name
                            WHERE c.table_name = $1
                            AND c.table_schema = 'public'
                            ORDER BY c.ordinal_position
                        ";
                        
                        let mut columns: Vec<DatabaseColumn> = Vec::new();
                        match client.query(columns_query, &[&table_name]).await {
                            Ok(column_rows) => {
                                println!("📊 Tabela '{}': {} colunas encontradas", table_name, column_rows.len());
                                for column_row in column_rows {
                                    let column = DatabaseColumn {
                                        name: column_row.get(0),
                                        data_type: column_row.get(1),
                                        is_nullable: column_row.get::<_, String>(2) == "YES",
                                        is_primary_key: column_row.get(3),
                                    };
                                    println!("  📝 Coluna: {} ({}) - PK: {} - NULL: {}", 
                                        column.name, column.data_type, column.is_primary_key, column.is_nullable);
                                    columns.push(column);
                                }
                            },
                            Err(e) => {
                                println!("⚠️ Erro ao obter colunas da tabela {}: {}", table_name, e);
                            }
                        }
                        
                        // Contar linhas da tabela (com limite para performance)
                        let count_query = format!("SELECT COUNT(*) FROM \"{}\" LIMIT 1000000", table_name);
                        let row_count = match client.query(&count_query, &[]).await {
                            Ok(count_rows) => {
                                if let Some(row) = count_rows.get(0) {
                                    Some(row.get::<_, i64>(0) as u64)
                                } else {
                                    None
                                }
                            },
                            Err(_) => None,
                        };
                        
                        tables.push(DatabaseTable {
                            name: table_name,
                            row_count,
                            columns,
                        });
                    }
                    
                    let inspection = DatabaseInspection {
                        database_name: database_name.clone(),
                        tables: tables.clone(),
                        total_tables: tables.len(),
                    };
                    
                    println!("✅ Estrutura do banco '{}' inspecionada: {} tabelas encontradas", database_name, tables.len());
                    handle.abort();
                    
                    // Emitir evento de sucesso
                    let _ = app_handle.emit(
                        "postgres-database-inspected",
                        serde_json::json!({
                            "database": database_name,
                            "tables_count": tables.len(),
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        })
                    );
                    
                    Ok(inspection)
                },
                Err(e) => {
                    println!("❌ Erro ao inspecionar banco: {}", e);
                    handle.abort();
                    
                    let error_msg = e.to_string();
                    if error_msg.contains("does not exist") {
                        Err(format!("O banco '{}' não existe", database_name))
                    } else {
                        Err(format!("Erro ao inspecionar banco: {}", error_msg))
                    }
                }
            }
        },
        Err(e) => {
            println!("❌ Erro de conexão: {}", e);
            Err(format!("Não foi possível conectar ao banco '{}': {}", database_name, e))
        }
    }
}

// ============================================================================
// COMANDOS PARA PARSER DE LÓGICA - ACESSO DIRETO AO CACHE
// ============================================================================

#[tauri::command]
pub async fn get_real_time_tag_values(
    plc_ip: String,
    tcp_state: State<'_, TcpServerState>,
    db: State<'_, Arc<Database>>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let mut result = std::collections::HashMap::new();
    
    // 1. Buscar dados brutos do cache TCP
    let server_guard = tcp_state.read().await;
    
    if let Some(server) = server_guard.as_ref() {
        // Acessar cache interno do TCP server
        let latest_data = server.get_plc_data(&plc_ip);
        
        if let Some(plc_data) = latest_data.await {
            println!("📊 Dados TCP para {}: {} variáveis", plc_ip, plc_data.variables.len());
            
            // 2. Buscar mapeamentos do banco
            match db.load_tag_mappings(&plc_ip) {
                Ok(mappings) => {
                    println!("🗂️ Mapeamentos carregados: {}", mappings.len());
                    
                    // 3. Processar tags ativos
                    for mapping in mappings.iter().filter(|m| m.enabled) {
                        // Buscar variável TCP correspondente
                        if let Some(tcp_var) = plc_data.variables.iter().find(|v| {
                            // Para bits: Word[0].1 -> procurar Word[0]
                            if mapping.variable_path.contains('.') {
                                let base_name = mapping.variable_path.split('.').next().unwrap_or("");
                                v.name == base_name
                            } else {
                                v.name == mapping.variable_path
                            }
                        }) {
                            let final_value = if mapping.variable_path.contains('.') {
                                // Extrair bit
                                let parts: Vec<&str> = mapping.variable_path.split('.').collect();
                                if parts.len() == 2 {
                                    if let Ok(bit_index) = parts[1].parse::<u8>() {
                                        if let Ok(int_val) = tcp_var.value.parse::<u64>() {
                                            let bit_val = (int_val >> bit_index) & 1;
                                            if bit_val == 1 { "TRUE".to_string() } else { "FALSE".to_string() }
                                        } else {
                                            tcp_var.value.clone()
                                        }
                                    } else {
                                        tcp_var.value.clone()
                                    }
                                } else {
                                    tcp_var.value.clone()
                                }
                            } else {
                                tcp_var.value.clone()
                            };
                            
                            result.insert(mapping.tag_name.clone(), final_value);
                            println!("✅ Tag processado: {} = {}", mapping.tag_name, result.get(&mapping.tag_name).unwrap());
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Erro ao carregar mapeamentos: {}", e);
                    return Err(format!("Erro ao carregar mapeamentos: {}", e));
                }
            }
        } else {
            return Err(format!("Nenhum dado disponível para PLC {}", plc_ip));
        }
    } else {
        return Err("Servidor TCP não está rodando".to_string());
    }
    
    println!("🎯 Total de tags processados: {}", result.len());
    Ok(result)
}

// ============================================================================
// COMANDOS PARA SCL ANALYSIS
// ============================================================================

// Estrutura para retornar tag com tipo de dado
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SclTagInfo {
    pub tag_name: String,
    pub value: String,
    pub data_type: String,  // "BOOL", "INT", "WORD", "REAL", "DINT", "DWORD"
    pub variable_path: String,
}

/// Comando para obter tags com tipo de dado para análise SCL
/// Retorna informações completas incluindo o data_type inferido
/// ✅ OTIMIZADO: Usa cache do WebSocket quando disponível, evitando consultas ao banco
// ✅ OTIMIZAÇÃO: Comando para monitoramento de memória do sistema
#[tauri::command]
pub async fn get_system_memory_stats(
    tcp_state: State<'_, TcpServerState>,
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<SystemMemoryStats, String> {
    // Coletar estatísticas do TCP Server
    let (tcp_buffer_active, tcp_clients, tcp_cache_size) = {
        let tcp_server_guard = tcp_state.read().await;
        if let Some(tcp_server) = tcp_server_guard.as_ref() {
            let stats = tcp_server.get_memory_stats();
            (stats.0, tcp_server.get_connected_clients_count(), stats.1)
        } else {
            (0, 0, 0)
        }
    };

    // Coletar estatísticas do WebSocket Server
    let (ws_cache_size, ws_cache_pct, ws_mappings, ws_tracking, ws_clients) = {
        let ws_server_guard = websocket_state.read().await;
        if let Some(ws_server) = ws_server_guard.as_ref() {
            let cache_stats = ws_server.get_cache_memory_stats();
            let ws_stats = ws_server.get_stats();
            (cache_stats.0, cache_stats.3, cache_stats.1, cache_stats.2, ws_stats.active_connections as usize)
        } else {
            (0, 0.0, 0, 0, 0)
        }
    };

    // Calcular estimativa de memória total (aproximada)
    let total_memory_kb = (tcp_buffer_active * 8) + // ~8KB por buffer médio
                         (tcp_cache_size / 1000) +  // Cache TCP ~1KB por entrada
                         (ws_cache_size / 5) +      // ~200 bytes por tag cached
                         (ws_mappings * 2) +        // ~2KB por mapping
                         (ws_tracking / 10);        // ~100 bytes por tracking

    // Determinar status de saúde
    let health_status = if ws_cache_pct > 90.0 || total_memory_kb > 10240 {
        "critical".to_string()
    } else if ws_cache_pct > 75.0 || total_memory_kb > 5120 {
        "warning".to_string()
    } else {
        "healthy".to_string()
    };

    Ok(SystemMemoryStats {
        tcp_buffer_pool_active: tcp_buffer_active,
        tcp_connected_clients: tcp_clients,
        tcp_data_cache_size: tcp_cache_size,
        ws_tag_cache_size: ws_cache_size,
        ws_tag_cache_usage_pct: ws_cache_pct,
        ws_mappings_cache_size: ws_mappings,
        ws_change_tracking_size: ws_tracking,
        ws_connected_clients: ws_clients,
        total_estimated_memory_kb: total_memory_kb,
        memory_health_status: health_status,
        last_cleanup_seconds_ago: 0, // Implementar se necessário
    })
}

#[tauri::command]
pub async fn get_memory_health_report(
    tcp_state: State<'_, TcpServerState>,
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<MemoryHealthReport, String> {
    let memory_stats = get_system_memory_stats(tcp_state, websocket_state).await?;
    
    let mut recommendations = Vec::new();
    let status = memory_stats.memory_health_status.clone();
    
    match status.as_str() {
        "critical" => {
            recommendations.push("Memória crítica! Reinicie o sistema se possível".to_string());
            recommendations.push("Reduza o número de tags monitorados".to_string());
            recommendations.push("Verifique se há vazamentos de memória".to_string());
        },
        "warning" => {
            recommendations.push("Uso de memória alto. Monitore frequentemente".to_string());
            recommendations.push("Considere reduzir intervalos de cache".to_string());
        },
        _ => {
            recommendations.push("Sistema operando dentro dos parâmetros normais".to_string());
        }
    }

    if memory_stats.ws_tag_cache_usage_pct > 80.0 {
        recommendations.push("Cache de tags próximo do limite. Limpeza automática ativa".to_string());
    }

    Ok(MemoryHealthReport {
        status,
        memory_stats,
        recommendations,
        auto_cleanup_enabled: true, // Sempre ativo com as otimizações
    })
}

#[tauri::command]
pub async fn force_memory_cleanup(
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let ws_server_guard = websocket_state.read().await;
    if let Some(ws_server) = ws_server_guard.as_ref() {
        let cleaned = ws_server.force_cache_cleanup().await;
        if cleaned {
            Ok("Limpeza de memória executada com sucesso".to_string())
        } else {
            Ok("Limpeza não necessária - memória dentro dos limites".to_string())
        }
    } else {
        Err("WebSocket server não está ativo".to_string())
    }
}

// ✅ MELHORIA: Comando para cliente se inscrever em PLCs específicos
#[tauri::command]
pub async fn subscribe_client_to_plcs(
    client_id: u64,
    plc_ips: Vec<String>,
    websocket_state: State<'_, WebSocketServerState>,
) -> Result<String, String> {
    let ws_server_guard = websocket_state.read().await;
    if let Some(ws_server) = ws_server_guard.as_ref() {
        ws_server.subscribe_to_plcs(client_id, plc_ips.clone()).await?;
        Ok(format!("Cliente {} inscrito em PLCs: {:?}", client_id, plc_ips))
    } else {
        Err("WebSocket server não está ativo".to_string())
    }
}

// ✅ MELHORIA: Comando para listar PLCs disponíveis
#[tauri::command]
pub async fn get_available_plcs(
    tcp_state: State<'_, TcpServerState>,
) -> Result<Vec<String>, String> {
    let tcp_server_guard = tcp_state.read().await;
    if let Some(tcp_server) = tcp_server_guard.as_ref() {
        let connected_plcs = tcp_server.get_all_plc_data().await;
        Ok(connected_plcs.keys().cloned().collect())
    } else {
        Ok(vec![]) // Retorna lista vazia se TCP não ativo
    }
}

#[tauri::command]
pub async fn get_scl_tags(
    plc_ip: String,
    tcp_state: State<'_, TcpServerState>,
    websocket_state: State<'_, WebSocketServerState>,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<SclTagInfo>, String> {
    let mut result = Vec::new();
    
    // 1. Buscar dados brutos do cache TCP
    let server_guard = tcp_state.read().await;
    
    if let Some(server) = server_guard.as_ref() {
        let latest_data = server.get_plc_data(&plc_ip);
        
        if let Some(plc_data) = latest_data.await {
            println!("🔍 SCL: Dados TCP para {}: {} variáveis", plc_ip, plc_data.variables.len());
            
            // 2. Tentar buscar mapeamentos do CACHE do WebSocket primeiro
            let mappings = {
                let ws_guard = websocket_state.read().await;
                if let Some(ws_server) = ws_guard.as_ref() {
                    // Tentar obter do cache interno do WebSocket
                    ws_server.get_cached_tag_mappings(&plc_ip).await
                } else {
                    None
                }
            };
            
            // Se cache não disponível, buscar do banco (fallback)
            let mappings = match mappings {
                Some(cached) => {
                    println!("⚡ SCL: {} mapeamentos do CACHE (zero I/O!)", cached.len());
                    cached
                }
                None => {
                    println!("⚠️ SCL: Cache não disponível, buscando do banco...");
                    match db.load_tag_mappings(&plc_ip) {
                        Ok(m) => {
                            println!("📂 SCL: {} mapeamentos carregados do banco", m.len());
                            m
                        }
                        Err(e) => {
                            return Err(format!("Erro ao carregar mapeamentos: {}", e));
                        }
                    }
                }
            };
            
            // 3. Processar tags ativos
            for mapping in mappings.iter().filter(|m| m.enabled) {
                // Determinar se é extração de bit (Word[0].3)
                let is_bit_extraction = mapping.variable_path.contains('.') 
                    && !mapping.variable_path.starts_with("DB");
                
                // Nome base para buscar no TCP
                let search_name = if is_bit_extraction {
                    mapping.variable_path.split('.').next().unwrap_or("")
                } else {
                    &mapping.variable_path
                };
                
                // Buscar variável TCP correspondente
                if let Some(tcp_var) = plc_data.variables.iter().find(|v| v.name == search_name) {
                    // Determinar valor e tipo
                    let (final_value, data_type) = if is_bit_extraction {
                        // Extrair bit da Word
                        let parts: Vec<&str> = mapping.variable_path.split('.').collect();
                        if parts.len() == 2 {
                            if let Ok(bit_index) = parts[1].parse::<u8>() {
                                if let Ok(int_val) = tcp_var.value.parse::<u64>() {
                                    let bit_val = (int_val >> bit_index) & 1;
                                    let value = if bit_val == 1 { "TRUE".to_string() } else { "FALSE".to_string() };
                                    (value, "BOOL".to_string())
                                } else {
                                    (tcp_var.value.clone(), tcp_var.data_type.clone())
                                }
                            } else {
                                (tcp_var.value.clone(), tcp_var.data_type.clone())
                            }
                        } else {
                            (tcp_var.value.clone(), tcp_var.data_type.clone())
                        }
                    } else {
                        // Valor inteiro (WORD, INT, REAL, etc.)
                        (tcp_var.value.clone(), tcp_var.data_type.clone())
                    };
                    
                    result.push(SclTagInfo {
                        tag_name: mapping.tag_name.clone(),
                        value: final_value,
                        data_type,
                        variable_path: mapping.variable_path.clone(),
                    });
                }
            }
        } else {
            return Err(format!("Nenhum dado disponível para PLC {}", plc_ip));
        }
    } else {
        return Err("Servidor TCP não está rodando".to_string());
    }
    
    println!("🎯 SCL: Total de {} tags processados", result.len());
    Ok(result)
}

// ============================================================================
// COMANDOS DE LEITURA/ESCRITA DE ARQUIVOS
// ============================================================================

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("Erro ao escrever arquivo: {}", e))
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))
}