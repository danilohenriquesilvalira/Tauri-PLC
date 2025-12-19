use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub database_path: String,
    pub first_run_completed: bool,
    pub tcp_port: u16,
    pub websocket_port: u16,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            database_path: String::new(),
            first_run_completed: false,
            tcp_port: 8502,
            websocket_port: 8765,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        }
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_config_dir()
            .map_err(|e| format!("Falha ao obter diretório de configuração: {}", e))?;
        
        // Criar diretório se não existir
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Falha ao criar diretório: {}", e))?;
        
        let config_path = app_dir.join("app_config.json");
        
        Ok(Self { config_path })
    }
    
    pub fn load_config(&self) -> Result<AppConfig, String> {
        if !self.config_path.exists() {
            println!("⚠️ Configuração não encontrada. Primeira execução detectada.");
            return Ok(AppConfig::default());
        }
        
        let content = fs::read_to_string(&self.config_path)
            .map_err(|e| format!("Erro ao ler configuração: {}", e))?;
        
        let config: AppConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Erro ao parsear configuração: {}", e))?;
        
        println!("✅ Configuração carregada: {:?}", self.config_path);
        Ok(config)
    }
    
    pub fn save_config(&self, config: &AppConfig) -> Result<(), String> {
        let mut config = config.clone();
        config.updated_at = chrono::Utc::now().timestamp();
        
        let json = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Erro ao serializar configuração: {}", e))?;
        
        fs::write(&self.config_path, json)
            .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
        
        println!("💾 Configuração salva: {:?}", self.config_path);
        Ok(())
    }
    
    pub fn is_first_run(&self) -> bool {
        !self.config_path.exists()
    }
    
    pub fn get_default_database_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?;
        
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Falha ao criar diretório: {}", e))?;
        
        Ok(app_dir.join("plc_hmi.db"))
    }
    
    pub fn validate_database_path(path: &str) -> Result<(), String> {
        let path = PathBuf::from(path);
        
        // Verificar se o diretório pai existe
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Não foi possível criar o diretório: {}", e))?;
            }
        }
        
        // Testar se consegue criar/abrir o arquivo
        Connection::open(&path)
            .map_err(|e| format!("Não foi possível acessar o banco de dados: {}", e))?;
        
        Ok(())
    }
}
