use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataBlockConfig {
    pub data_type: String,  // "WORD", "INT", "DWORD", "REAL", etc
    pub count: u32,         // Número de elementos
    pub name: String,       // Nome do array (ex: "Word", "Real2")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcStructureConfig {
    pub plc_ip: String,
    pub blocks: Vec<DataBlockConfig>,
    pub total_size: usize,
    pub last_updated: i64,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Falha ao obter diretório de dados");
        
        // Cria diretório se não existir
        std::fs::create_dir_all(&app_dir).expect("Falha ao criar diretório");
        
        let db_path = app_dir.join("plc_hmi.db");
        println!("📁 Banco de dados: {:?}", db_path);
        
        let conn = Connection::open(db_path)?;
        
        // Criar tabela se não existir
        conn.execute(
            "CREATE TABLE IF NOT EXISTS plc_structures (
                plc_ip TEXT PRIMARY KEY,
                config_json TEXT NOT NULL,
                total_size INTEGER NOT NULL,
                last_updated INTEGER NOT NULL
            )",
            [],
        )?;
        
        println!("✅ Banco de dados SQLite inicializado");
        
        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
    
    /// Salva a configuração de estrutura de um PLC
    pub fn save_plc_structure(&self, config: &PlcStructureConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        let config_json = serde_json::to_string(&config.blocks)
            .expect("Falha ao serializar configuração");
        
        conn.execute(
            "INSERT OR REPLACE INTO plc_structures (plc_ip, config_json, total_size, last_updated)
             VALUES (?1, ?2, ?3, ?4)",
            (
                &config.plc_ip,
                &config_json,
                config.total_size as i64,
                config.last_updated,
            ),
        )?;
        
        println!("💾 Configuração salva para PLC {}: {} bytes, {} blocos", 
                 config.plc_ip, config.total_size, config.blocks.len());
        
        Ok(())
    }
    
    /// Carrega a configuração de estrutura de um PLC
    pub fn load_plc_structure(&self, plc_ip: &str) -> Result<Option<PlcStructureConfig>> {
        let conn = self.conn.lock().unwrap();
        
        let mut stmt = conn.prepare(
            "SELECT config_json, total_size, last_updated FROM plc_structures WHERE plc_ip = ?1"
        )?;
        
        let result = stmt.query_row([plc_ip], |row| {
            let config_json: String = row.get(0)?;
            let total_size: i64 = row.get(1)?;
            let last_updated: i64 = row.get(2)?;
            
            let blocks: Vec<DataBlockConfig> = serde_json::from_str(&config_json)
                .expect("Falha ao deserializar configuração");
            
            Ok(PlcStructureConfig {
                plc_ip: plc_ip.to_string(),
                blocks,
                total_size: total_size as usize,
                last_updated,
            })
        });
        
        match result {
            Ok(config) => {
                println!("📖 Configuração carregada para PLC {}: {} blocos", plc_ip, config.blocks.len());
                Ok(Some(config))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
    
    /// Lista todos os PLCs configurados
    pub fn list_configured_plcs(&self) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        
        let mut stmt = conn.prepare("SELECT plc_ip FROM plc_structures ORDER BY last_updated DESC")?;
        
        let plcs = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>>>()?;
        
        Ok(plcs)
    }
    
    /// Remove a configuração de um PLC
    pub fn delete_plc_structure(&self, plc_ip: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute(
            "DELETE FROM plc_structures WHERE plc_ip = ?1",
            [plc_ip],
        )?;
        
        println!("🗑️ Configuração removida para PLC {}", plc_ip);
        
        Ok(())
    }
}
