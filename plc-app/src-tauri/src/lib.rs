use std::sync::Arc;
use tauri::{AppHandle, Emitter, State, Manager, WebviewWindowBuilder, WebviewUrl};
use tokio::sync::Mutex;

mod tcp_server;
mod database;
use tcp_server::{TcpServer, PlcData};
use database::{Database, BitConfig, VideoConfig, SystemLog};

#[derive(Clone, serde::Serialize)]
struct PlcDataPayload {
    message: PlcData,
}

#[derive(Clone)]
struct AppState {
    tcp_server: Arc<Mutex<Option<Arc<TcpServer>>>>,
    database: Arc<Mutex<Option<Arc<Database>>>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn start_tcp_server(
    port: u16, 
    app_handle: AppHandle,
    state: State<'_, AppState>
) -> Result<String, String> {
    let mut server_guard = state.tcp_server.lock().await;
    
    if server_guard.is_some() {
        return Ok(format!("Servidor TCP já está rodando na porta {}", port));
    }
    
    let mut server = TcpServer::new(port);
    
    // Configurar database se disponível
    if let Some(db) = state.database.lock().await.as_ref() {
        server.set_database(Arc::downgrade(db));
    }
    
    let server = Arc::new(server);
    let server_clone = server.clone();
    
    tokio::spawn(async move {
        if let Err(e) = server_clone.start().await {
            eprintln!("Erro ao iniciar servidor TCP: {:?}", e);
        }
    });
    
    let mut rx = server.subscribe();
    tokio::spawn(async move {
        while let Ok(data) = rx.recv().await {
            let _ = app_handle.emit("plc-data", PlcDataPayload { message: data });
        }
    });
    
    *server_guard = Some(server);
    
    // Log do comando manual
    if let Some(db) = state.database.lock().await.as_ref() {
        let _ = db.add_system_log(
            "info", 
            "tcp", 
            "Servidor TCP iniciado via comando", 
            &format!("Porta: {}", port)
        ).await;
    }
    
    Ok(format!("Servidor TCP iniciado na porta {}", port))
}

#[tauri::command]
async fn connect_to_plc(
    plc_ip: String, 
    plc_port: u16,
    state: State<'_, AppState>
) -> Result<String, String> {
    let server_guard = state.tcp_server.lock().await;
    
    if let Some(server) = server_guard.as_ref() {
        // Log da tentativa de conexão
        if let Some(db) = state.database.lock().await.as_ref() {
            let _ = db.add_system_log(
                "info", 
                "plc", 
                "Tentativa de conexão com PLC", 
                &format!("Endereço: {}:{}", plc_ip, plc_port)
            ).await;
        }
        
        server.connect_to_plc(&plc_ip, plc_port).await
            .map_err(|e| {
                // Log do erro se falhar
                tokio::spawn({
                    let db = state.database.clone();
                    let error_msg = format!("{:?}", e);
                    let addr = format!("{}:{}", plc_ip, plc_port);
                    async move {
                        if let Some(db) = db.lock().await.as_ref() {
                            let _ = db.add_system_log(
                                "error", 
                                "plc", 
                                "Falha ao conectar com PLC", 
                                &format!("Endereço: {} - Erro: {}", addr, error_msg)
                            ).await;
                        }
                    }
                });
                format!("Erro ao conectar ao PLC: {:?}", e)
            })?;
        Ok(format!("Conectando ao PLC em {}:{}...", plc_ip, plc_port))
    } else {
        // Log de erro de servidor não iniciado
        if let Some(db) = state.database.lock().await.as_ref() {
            let _ = db.add_system_log(
                "warning", 
                "tcp", 
                "Tentativa de conexão sem servidor TCP ativo", 
                &format!("PLC: {}:{}", plc_ip, plc_port)
            ).await;
        }
        Err("Servidor TCP não está rodando. Inicie o servidor primeiro.".to_string())
    }
}

#[tauri::command]
async fn send_plc_command(_command: String) -> Result<String, String> {
    Ok("Comando enviado com sucesso".to_string())
}

#[tauri::command]
async fn init_database(app_handle: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    // Obter o diretório de dados do app
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {:?}", e))?;
    
    // Criar diretório se não existir
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Falha ao criar diretório: {:?}", e))?;
    }
    
    // Caminho completo do banco
    let db_path = app_data_dir.join("plc_config.db");
    
    // Criar arquivo vazio se não existir
    if !db_path.exists() {
        std::fs::File::create(&db_path)
            .map_err(|e| format!("Falha ao criar arquivo: {:?}", e))?;
    }
    
    let database_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy().replace('\\', "/"));
    
    match Database::new(&database_url).await {
        Ok(db) => {
            *state.database.lock().await = Some(Arc::new(db));
            Ok(format!("Banco de dados inicializado: {}", db_path.display()))
        }
        Err(e) => Err(format!("Erro ao inicializar banco: {:?}", e))
    }
}

#[tauri::command]
async fn get_all_texts(state: State<'_, AppState>) -> Result<Vec<database::TextConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_all_texts().await
            .map_err(|e| format!("Erro ao buscar textos: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn update_text(key: String, text: String, state: State<'_, AppState>) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.update_text(&key, &text).await
            .map_err(|e| format!("Erro ao atualizar texto: {:?}", e))?;
        Ok("Texto atualizado com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_all_phases(state: State<'_, AppState>) -> Result<Vec<database::PhaseConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_all_phases().await
            .map_err(|e| format!("Erro ao buscar fases: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_phase(phase_number: i32, state: State<'_, AppState>) -> Result<Option<database::PhaseConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_phase(phase_number).await
            .map_err(|e| format!("Erro ao buscar fase: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn update_phase(
    phase_number: i32, 
    title: String, 
    description: String, 
    color: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.update_phase(phase_number, &title, &description, &color).await
            .map_err(|e| format!("Erro ao atualizar fase: {:?}", e))?;
        Ok("Fase atualizada com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn open_panel_window(app_handle: AppHandle) -> Result<String, String> {
    let _panel_window = WebviewWindowBuilder::new(&app_handle, "panel", WebviewUrl::App("src/panel.html".into()))
        .title("Painel da Eclusa")
        .inner_size(1920.0, 1080.0)
        .resizable(true)
        .decorations(true)
        .build()
        .map_err(|e| format!("Erro ao criar janela do painel: {}", e))?;

    Ok("Painel aberto".to_string())
}

#[tauri::command]
async fn close_panel_window(app_handle: AppHandle) -> Result<String, String> {
    if let Some(panel_window) = app_handle.get_webview_window("panel") {
        panel_window.close().map_err(|e| format!("Erro ao fechar painel: {}", e))?;
        Ok("Painel fechado".to_string())
    } else {
        Err("Painel não está aberto".to_string())
    }
}

#[tauri::command]
async fn get_all_bit_configs(state: State<'_, AppState>) -> Result<Vec<BitConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_all_bit_configs().await
            .map_err(|e| format!("Erro ao buscar configurações de bits: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_bit_config(word_index: i32, bit_index: i32, state: State<'_, AppState>) -> Result<Option<BitConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_bit_config(word_index, bit_index).await
            .map_err(|e| format!("Erro ao buscar configuração de bit: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn add_bit_config(
    word_index: i32,
    bit_index: i32,
    name: String,
    message: String,
    message_off: String,
    enabled: bool,
    priority: i32,
    color: String,
    font_size: i32,
    position: String,
    font_family: String,
    font_weight: String,
    text_shadow: bool,
    letter_spacing: i32,
    use_template: bool,
    message_template: String,
    state: State<'_, AppState>
) -> Result<i64, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.add_bit_config(word_index, bit_index, &name, &message, &message_off, enabled, priority, &color, font_size, &position, &font_family, &font_weight, text_shadow, letter_spacing, use_template, &message_template).await
            .map_err(|e| format!("Erro ao adicionar configuração de bit: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn update_bit_config(
    word_index: i32,
    bit_index: i32, 
    name: String,
    message: String,
    message_off: String,
    enabled: bool,
    priority: i32,
    color: String,
    font_size: i32,
    position: String,
    font_family: String,
    font_weight: String,
    text_shadow: bool,
    letter_spacing: i32,
    use_template: bool,
    message_template: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.update_bit_config(word_index, bit_index, &name, &message, &message_off, enabled, priority, &color, font_size, &position, &font_family, &font_weight, text_shadow, letter_spacing, use_template, &message_template).await
            .map_err(|e| format!("Erro ao atualizar configuração de bit: {:?}", e))?;
        Ok("Configuração de bit atualizada com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn delete_bit_config(word_index: i32, bit_index: i32, state: State<'_, AppState>) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.delete_bit_config(word_index, bit_index).await
            .map_err(|e| format!("Erro ao deletar configuração de bit: {:?}", e))?;
        Ok("Configuração de bit deletada com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_all_videos(state: State<'_, AppState>) -> Result<Vec<VideoConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_all_videos().await
            .map_err(|e| format!("Erro ao buscar vídeos: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_video(id: i64, state: State<'_, AppState>) -> Result<Option<VideoConfig>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_video(id).await
            .map_err(|e| format!("Erro ao buscar vídeo: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn add_video(
    name: String,
    #[allow(non_snake_case)]
    filePath: String,
    duration: i32,
    enabled: bool,
    priority: i32,
    description: String,
    state: State<'_, AppState>
) -> Result<i64, String> {
    println!("📹 add_video chamado: name={}, path={}, duration={}", name, filePath, duration);
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        match db.add_video(&name, &filePath, duration, enabled, priority, &description).await {
            Ok(id) => {
                println!("✅ Vídeo adicionado com ID: {}", id);
                Ok(id)
            }
            Err(e) => {
                eprintln!("❌ Erro ao adicionar vídeo: {:?}", e);
                Err(format!("Erro ao adicionar vídeo: {:?}", e))
            }
        }
    } else {
        eprintln!("❌ Banco de dados não inicializado!");
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn update_video(
    id: i64,
    name: String,
    #[allow(non_snake_case)]
    filePath: String,
    duration: i32,
    enabled: bool,
    priority: i32,
    description: String,
    #[allow(non_snake_case)]
    displayOrder: i32,
    state: State<'_, AppState>
) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.update_video(id, &name, &filePath, duration, enabled, priority, &description, displayOrder).await
            .map_err(|e| format!("Erro ao atualizar vídeo: {:?}", e))?;
        Ok("Vídeo atualizado com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn delete_video(id: i64, state: State<'_, AppState>) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.delete_video(id).await
            .map_err(|e| format!("Erro ao deletar vídeo: {:?}", e))?;
        Ok("Vídeo deletado com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_enabled_videos(state: State<'_, AppState>) -> Result<Vec<VideoConfig>, String> {
    println!("🎬 [COMMAND] get_enabled_videos chamado pelo frontend");
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        let result = db.get_enabled_videos().await
            .map_err(|e| format!("Erro ao buscar vídeos ativos: {:?}", e));
        
        match &result {
            Ok(videos) => println!("✅ [COMMAND] Retornando {} vídeos para o frontend", videos.len()),
            Err(e) => println!("❌ [COMMAND] Erro: {}", e),
        }
        
        result
    } else {
        println!("❌ [COMMAND] Banco de dados não inicializado!");
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn reorder_video(
    id: i64,
    #[allow(non_snake_case)]
    newOrder: i32,
    state: State<'_, AppState>
) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.reorder_video(id, newOrder).await
            .map_err(|e| format!("Erro ao reordenar vídeo: {:?}", e))?;
        Ok("Vídeo reordenado com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn clear_all_videos(state: State<'_, AppState>) -> Result<String, String> {
    println!("🗑️ Limpando todos os vídeos do banco...");
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.clear_all_videos().await
            .map_err(|e| format!("Erro ao limpar vídeos: {:?}", e))?;
        println!("✅ Todos os vídeos foram removidos");
        Ok("Todos os vídeos foram removidos com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
fn get_file_path(file_name: String) -> Result<String, String> {
    // Este comando seria usado com drag & drop, mas no Tauri web o file.path não está disponível
    // Por enquanto, retorna o nome do arquivo como fallback
    Ok(file_name)
}

#[tauri::command]
async fn get_video_control_config(state: State<'_, AppState>) -> Result<(i32, i32), String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        let word_index = db.get_display_config("video_control_word_index").await
            .map_err(|e| format!("Erro ao buscar word_index: {:?}", e))?
            .and_then(|v| v.parse::<i32>().ok())
            .unwrap_or(3);
            
        let bit_index = db.get_display_config("video_control_bit_index").await
            .map_err(|e| format!("Erro ao buscar bit_index: {:?}", e))?
            .and_then(|v| v.parse::<i32>().ok())
            .unwrap_or(3);
            
        Ok((word_index, bit_index))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn set_video_control_config(
    word_index: i32, 
    bit_index: i32, 
    state: State<'_, AppState>
) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.set_display_config("video_control_word_index", &word_index.to_string(), "number").await
            .map_err(|e| format!("Erro ao definir word_index: {:?}", e))?;
            
        db.set_display_config("video_control_bit_index", &bit_index.to_string(), "number").await
            .map_err(|e| format!("Erro ao definir bit_index: {:?}", e))?;
            
        Ok("Configuração do bit de controle de vídeos atualizada com sucesso".to_string())
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn get_recent_logs(limit: i32, state: State<'_, AppState>) -> Result<Vec<SystemLog>, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.get_recent_logs(limit).await
            .map_err(|e| format!("Erro ao buscar logs: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn add_system_log(
    level: String, 
    category: String, 
    message: String, 
    details: String,
    state: State<'_, AppState>
) -> Result<i64, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.add_system_log(&level, &category, &message, &details).await
            .map_err(|e| format!("Erro ao adicionar log: {:?}", e))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[tauri::command]
async fn clear_old_logs(days: i32, state: State<'_, AppState>) -> Result<String, String> {
    let db_guard = state.database.lock().await;
    
    if let Some(db) = db_guard.as_ref() {
        db.clear_old_logs(days).await
            .map_err(|e| format!("Erro ao limpar logs: {:?}", e))?;
        Ok(format!("Logs antigos de {} dias foram removidos", days))
    } else {
        Err("Banco de dados não inicializado".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            tcp_server: Arc::new(Mutex::new(None)),
            database: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            start_tcp_server, 
            send_plc_command,
            connect_to_plc,
            init_database,
            get_all_texts,
            update_text,
            get_all_phases,
            get_phase,
            update_phase,
            open_panel_window,
            close_panel_window,
            get_all_bit_configs,
            get_bit_config,
            add_bit_config,
            update_bit_config,
            delete_bit_config,
            get_all_videos,
            get_video,
            add_video,
            update_video,
            delete_video,
            get_enabled_videos,
            reorder_video,
            clear_all_videos,
            get_file_path,
            get_video_control_config,
            set_video_control_config,
            get_recent_logs,
            add_system_log,
            clear_old_logs
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Inicializa o banco de dados ANTES de tudo
            tauri::async_runtime::block_on(async {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    println!("🔄 Iniciando banco de dados...");
                    
                    // Obter o diretório de dados do app
                    let app_data_dir = app_handle.path().app_data_dir()
                        .expect("Falha ao obter diretório de dados do app");
                    
                    println!("📁 Diretório base: {:?}", app_data_dir);
                    println!("📁 Diretório existe? {}", app_data_dir.exists());
                    
                    // Criar diretório se não existir
                    if !app_data_dir.exists() {
                        match std::fs::create_dir_all(&app_data_dir) {
                            Ok(_) => println!("✅ Diretório criado com sucesso"),
                            Err(e) => {
                                eprintln!("❌ Erro ao criar diretório: {:?}", e);
                                return;
                            }
                        }
                    }
                    
                    // Caminho completo do banco
                    let db_path = app_data_dir.join("plc_config.db");
                    println!("📁 Caminho do banco: {}", db_path.display());
                    
                    // Criar arquivo vazio se não existir (para SQLite conseguir abrir)
                    if !db_path.exists() {
                        match std::fs::File::create(&db_path) {
                            Ok(_) => println!("✅ Arquivo do banco criado"),
                            Err(e) => eprintln!("⚠️ Erro ao criar arquivo: {:?}", e)
                        }
                    }
                    
                    // URL do SQLite (precisa ser absoluta)
                    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy().replace('\\', "/"));
                    println!("🔗 URL do banco: {}", db_url);
                    
                    match Database::new(&db_url).await {
                        Ok(db) => {
                            let db_arc = Arc::new(db);
                            *state.database.lock().await = Some(db_arc.clone());
                            println!("✅ Banco de dados inicializado com sucesso!");
                            
                            // Log de inicialização do sistema
                            let _ = db_arc.add_system_log(
                                "info", 
                                "database", 
                                "Sistema inicializado com sucesso", 
                                &format!("Banco: {}", db_path.display())
                            ).await;
                        }
                        Err(e) => {
                            eprintln!("❌ ERRO CRÍTICO ao inicializar banco: {:?}", e);
                            eprintln!("   Detalhes: {}", e);
                        }
                    }
                }
            });
            
            {
                let app_handle_clone = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    // Aguarda um pouco para garantir que o app está pronto
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    
                    // Inicia o servidor TCP na porta 8502
                    if let Some(state) = app_handle_clone.try_state::<AppState>() {
                        let mut server = TcpServer::new(8502);
                        
                        // Configurar database se já estiver inicializado
                        if let Some(db) = state.database.lock().await.as_ref() {
                            server.set_database(Arc::downgrade(db));
                        }
                        
                        let server = Arc::new(server);
                        let server_clone = server.clone();
                        
                        tokio::spawn(async move {
                            if let Err(e) = server_clone.start().await {
                                eprintln!("Erro ao iniciar servidor TCP: {:?}", e);
                            }
                        });
                        
                        let mut rx = server.subscribe();
                        let app_handle_clone2 = app_handle_clone.clone();
                        tokio::spawn(async move {
                            while let Ok(data) = rx.recv().await {
                                let _ = app_handle_clone2.emit("plc-data", PlcDataPayload { message: data });
                            }
                        });
                        
                        *state.tcp_server.lock().await = Some(server.clone());
                        
                        println!("🎯 Servidor TCP configurado para receber conexões do PLC em 192.168.1.33");
                        println!("⏳ Aguardando conexão do PLC na porta 8502...");
                        
                        // Log de servidor TCP iniciado
                        if let Some(db_guard) = state.database.lock().await.as_ref() {
                            let _ = db_guard.add_system_log(
                                "info", 
                                "tcp", 
                                "Servidor TCP iniciado com sucesso", 
                                "Porta: 8502 - Aguardando conexões PLC"
                            ).await;
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}