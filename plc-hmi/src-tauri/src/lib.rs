mod tcp_server;
mod commands;
mod plc_parser;
mod database;
mod websocket_server;
mod config;

use commands::{TcpServerState, WebSocketServerState};
use database::Database;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Inicializar banco de dados
      let db = Database::new(&app.handle())
        .expect("Falha ao inicializar banco de dados");
      app.manage(Arc::new(db));
      
      Ok(())
    })
    .manage(TcpServerState::default())
    .manage(WebSocketServerState::default())
    .invoke_handler(tauri::generate_handler![
      commands::start_tcp_server,
      commands::stop_tcp_server,
      commands::connect_to_plc,
      commands::disconnect_plc,
      commands::allow_plc_reconnect,
      commands::get_connection_stats,
      commands::get_connected_clients,
      commands::get_all_known_plcs,
      commands::get_all_plc_bytes,
      commands::get_plc_data,
      commands::get_all_plc_data,
      commands::auto_discover_plc,
      commands::scan_network_for_plcs,
      commands::test_plc_connection,
      commands::get_latest_plc_data,
      commands::get_plc_variable,
      commands::save_plc_structure,
      commands::load_plc_structure,
      commands::list_configured_plcs,
      commands::delete_plc_structure,
      commands::debug_show_plc_structure,
      commands::save_tag_mapping,
      commands::load_tag_mappings,
      commands::delete_tag_mapping,
      commands::get_active_tags,
      commands::get_plc_variables_for_mapping,
      commands::start_websocket_server,
      commands::stop_websocket_server,
      commands::get_websocket_stats,
      commands::get_websocket_clients,
      commands::update_websocket_config,
      commands::get_websocket_config,
      commands::check_first_run,
      commands::save_initial_config,
      commands::get_app_config,
      commands::get_default_db_path,
      commands::validate_db_path,
      commands::get_network_interfaces,
      commands::save_websocket_config,
      commands::load_websocket_config,
      commands::fix_websocket_broadcast_interval,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
