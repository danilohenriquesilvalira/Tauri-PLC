use crate::tcp_server::{TcpServer, ConnectionStats};
use crate::database::{Database, PlcStructureConfig, DataBlockConfig};
use tauri::{AppHandle, State};
use tokio::sync::RwLock;
use std::sync::Arc;

pub type TcpServerState = Arc<RwLock<Option<TcpServer>>>;

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
pub async fn get_plc_variable(_variable_name: String) -> Result<Option<f64>, String> {
    Ok(None)
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