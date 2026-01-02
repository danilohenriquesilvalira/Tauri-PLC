use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagMapping {
    pub id: Option<i64>,
    pub plc_ip: String,
    pub variable_path: String,    // Ex: "Word[5]", "Real[10]"
    pub tag_name: String,         // Ex: "temperatura_forno"
    pub description: Option<String>, // Ex: "Temperatura do forno principal"
    pub unit: Option<String>,     // Ex: "°C", "bar", "rpm"
    pub enabled: bool,
    pub created_at: i64,
    pub collect_mode: Option<String>, // "on_change" ou "interval"
    pub collect_interval_s: Option<i64>, // Intervalo em segundos, se aplicável
    // 🆕 CAMPOS PARA SUBSCRIBE INTELIGENTE
    pub area: Option<String>,     // ENH, ESV, PJU, PMO, SCO, EDR, GER (equipamento)
    pub category: Option<String>, // PROC, FAULT, EVENT, ALARM, CMD (tipo de tag)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketDbConfig {
    pub host: String,
    pub port: u16,
    pub max_clients: u32,
    pub broadcast_interval_ms: u64,
    pub enabled: bool,
    pub bind_interfaces: Vec<String>, // Lista de interfaces para fazer bind
    pub updated_at: i64,
}

// ✅ DATABASE COM CONNECTION POOLING OTIMIZADO
pub struct Database {
    read_conn: Arc<Mutex<Connection>>,   // ✅ Conexão para leitura
    write_conn: Arc<Mutex<Connection>>,  // ✅ Conexão para escrita
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
    pub updated_at: i64,
}

impl Database {
    // Salva configuração do PostgreSQL no SQLite
    pub fn save_postgres_config(&self, config: &PostgresConfig) -> Result<()> {
        let conn = self.write_conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS postgres_config (
                id INTEGER PRIMARY KEY,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                user TEXT NOT NULL,
                password TEXT NOT NULL,
                database TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;
        conn.execute("DELETE FROM postgres_config", [])?;
        conn.execute(
            "INSERT INTO postgres_config (host, port, user, password, database, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&config.host, config.port, &config.user, &config.password, &config.database, config.updated_at),
        )?;
        Ok(())
    }

    // Carrega configuração do PostgreSQL do SQLite
    pub fn load_postgres_config(&self) -> Result<Option<PostgresConfig>> {
        let conn = self.read_conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT host, port, user, password, database, updated_at FROM postgres_config LIMIT 1")?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            Ok(Some(PostgresConfig {
                host: row.get(0)?,
                port: row.get(1)?,
                user: row.get(2)?,
                password: row.get(3)?,
                database: row.get(4)?,
                updated_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }
        /// Retorna uma lista de todos os PLCs conhecidos (apenas IPs)
        pub fn get_all_known_plcs(&self) -> Result<Vec<String>> {
            self.list_configured_plcs()
        }
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // SEMPRE usar o banco configurado primeiro
        let db_path = std::path::PathBuf::from("D:\\Banco_SQLITE\\plc_hmi.db");
        // Criar diretório se não existir
        if let Some(parent) = db_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                let _ = app_handle.emit("sqlite-error", serde_json::json!({
                    "operation": "create_dir",
                    "message": format!("Falha ao criar diretório do banco: {}", e),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }));
                return Err(rusqlite::Error::InvalidPath(parent.to_path_buf()));
            }
        }
        println!("📁 Banco de dados OTIMIZADO: {:?}", db_path);
        
        // ✅ CRIAR DUAS CONEXÕES: UMA PARA LEITURA, OUTRA PARA ESCRITA
        let read_conn = match Connection::open(&db_path) {
            Ok(c) => {
                // ✅ Otimizações para leitura
                c.pragma_update(None, "journal_mode", "WAL")?;
                c.pragma_update(None, "synchronous", "NORMAL")?;
                c.pragma_update(None, "cache_size", "10000")?;
                c.pragma_update(None, "temp_store", "memory")?;
                c
            },
            Err(e) => {
                let _ = app_handle.emit("sqlite-error", serde_json::json!({
                    "operation": "open_read_db",
                    "message": format!("Falha ao abrir banco (leitura): {}", e),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }));
                return Err(e);
            }
        };
        
        let write_conn = match Connection::open(&db_path) {
            Ok(c) => {
                // ✅ Otimizações para escrita
                c.pragma_update(None, "journal_mode", "WAL")?;
                c.pragma_update(None, "synchronous", "NORMAL")?;
                c.pragma_update(None, "cache_size", "10000")?;
                c
            },
            Err(e) => {
                let _ = app_handle.emit("sqlite-error", serde_json::json!({
                    "operation": "open_write_db",
                    "message": format!("Falha ao abrir banco (escrita): {}", e),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }));
                return Err(e);
            }
        };
        // ✅ CRIAR TABELAS COM CONEXÃO DE ESCRITA
        let write_conn_ref = &write_conn;
        if let Err(e) = write_conn_ref.execute(
            "CREATE TABLE IF NOT EXISTS plc_structures (
                plc_ip TEXT PRIMARY KEY,
                config_json TEXT NOT NULL,
                total_size INTEGER NOT NULL,
                last_updated INTEGER NOT NULL
            )",
            [],
        ) {
            let _ = app_handle.emit("sqlite-error", serde_json::json!({
                "operation": "create_table_plc_structures",
                "message": format!("Erro ao criar tabela plc_structures: {}", e),
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            return Err(e);
        }
        if let Err(e) = write_conn_ref.execute(
            "CREATE TABLE IF NOT EXISTS tag_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plc_ip TEXT NOT NULL,
                variable_path TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                description TEXT,
                unit TEXT,
                enabled INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL,
                collect_mode TEXT,
                collect_interval_s INTEGER,
                area TEXT,
                category TEXT,
                UNIQUE(plc_ip, variable_path),
                FOREIGN KEY(plc_ip) REFERENCES plc_structures(plc_ip)
            )",
            [],
        ) {
            let _ = app_handle.emit("sqlite-error", serde_json::json!({
                "operation": "create_table_tag_mappings",
                "message": format!("Erro ao criar tabela tag_mappings: {}", e),
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            return Err(e);
        }
        
        // 🔄 MIGRAÇÃO AUTOMÁTICA - SEMPRE EXECUTAR para adicionar colunas novas em tabelas existentes
        {
            let mut stmt = write_conn_ref.prepare("PRAGMA table_info(tag_mappings)")?;
            let columns: Vec<String> = stmt.query_map([], |row| row.get(1))?.filter_map(Result::ok).collect();
            
            // Migração: collect_mode
            if !columns.iter().any(|c| c == "collect_mode") {
                match write_conn_ref.execute("ALTER TABLE tag_mappings ADD COLUMN collect_mode TEXT", []) {
                    Ok(_) => println!("[MIGRATION] Coluna 'collect_mode' adicionada à tabela tag_mappings."),
                    Err(e) => println!("[MIGRATION][AVISO] Coluna 'collect_mode': {}", e),
                }
            }
            
            // Migração: collect_interval_s
            if !columns.iter().any(|c| c == "collect_interval_s") {
                match write_conn_ref.execute("ALTER TABLE tag_mappings ADD COLUMN collect_interval_s INTEGER", []) {
                    Ok(_) => println!("[MIGRATION] Coluna 'collect_interval_s' adicionada à tabela tag_mappings."),
                    Err(e) => println!("[MIGRATION][AVISO] Coluna 'collect_interval_s': {}", e),
                }
            }
            
            // 🆕 Migração: area (para subscribe por equipamento)
            if !columns.iter().any(|c| c == "area") {
                match write_conn_ref.execute("ALTER TABLE tag_mappings ADD COLUMN area TEXT", []) {
                    Ok(_) => println!("[MIGRATION] ✅ Coluna 'area' adicionada à tabela tag_mappings."),
                    Err(e) => println!("[MIGRATION][AVISO] Coluna 'area': {}", e),
                }
            }
            
            // 🆕 Migração: category (para tipo de tag: PROC, FAULT, EVENT, etc)
            if !columns.iter().any(|c| c == "category") {
                match write_conn_ref.execute("ALTER TABLE tag_mappings ADD COLUMN category TEXT", []) {
                    Ok(_) => println!("[MIGRATION] ✅ Coluna 'category' adicionada à tabela tag_mappings."),
                    Err(e) => println!("[MIGRATION][AVISO] Coluna 'category': {}", e),
                }
            }
            
            println!("[MIGRATION] ✅ Verificação de colunas concluída.");
        }
        
        if let Err(e) = write_conn_ref.execute(
            "CREATE TABLE IF NOT EXISTS websocket_config (
                id INTEGER PRIMARY KEY,
                host TEXT NOT NULL DEFAULT '0.0.0.0',
                port INTEGER NOT NULL DEFAULT 8765,
                max_clients INTEGER NOT NULL DEFAULT 100,
                broadcast_interval_ms INTEGER NOT NULL DEFAULT 100,
                enabled INTEGER NOT NULL DEFAULT 0,
                bind_interfaces_json TEXT NOT NULL DEFAULT '[\"0.0.0.0\"]',
                updated_at INTEGER NOT NULL
            )",
            [],
        ) {
            let _ = app_handle.emit("sqlite-error", serde_json::json!({
                "operation": "create_table_websocket_config",
                "message": format!("Erro ao criar tabela websocket_config: {}", e),
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            return Err(e);
        }
        // Migração para adicionar coluna bind_interfaces_json se não existir
        let _ = write_conn_ref.execute(
            "ALTER TABLE websocket_config ADD COLUMN bind_interfaces_json TEXT NOT NULL DEFAULT '[\"0.0.0.0\"]'",
            [],
        );
        // ✅ CRIAR ÍNDICES PARA PERFORMANCE
        let indexes = [
            "CREATE INDEX IF NOT EXISTS idx_plc_structures_last_updated ON plc_structures(last_updated DESC)",
            "CREATE INDEX IF NOT EXISTS idx_tag_mappings_plc_ip ON tag_mappings(plc_ip)",
            "CREATE INDEX IF NOT EXISTS idx_tag_mappings_enabled ON tag_mappings(enabled)",
            "CREATE INDEX IF NOT EXISTS idx_tag_mappings_plc_enabled ON tag_mappings(plc_ip, enabled)",
        ];
        
        for index_sql in &indexes {
            if let Err(e) = write_conn_ref.execute(index_sql, []) {
                println!("⚠️ Aviso: Falha ao criar índice: {} - {}", index_sql, e);
            }
        }
        
        println!("✅ Banco de dados SQLite OTIMIZADO inicializado com dual connections");
        
        Ok(Database {
            read_conn: Arc::new(Mutex::new(read_conn)),
            write_conn: Arc::new(Mutex::new(write_conn)),
        })
    }
    
    /// Salva a configuração de estrutura de um PLC
    pub fn save_plc_structure(&self, config: &PlcStructureConfig) -> Result<()> {
        let conn = self.write_conn.lock().unwrap();
        let config_json = match serde_json::to_string(&config.blocks) {
            Ok(json) => json,
            Err(e) => {
                // Não temos app_handle aqui, então apenas retornamos o erro
                return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(e)));
            }
        };
        if let Err(e) = conn.execute(
            "INSERT OR REPLACE INTO plc_structures (plc_ip, config_json, total_size, last_updated)
             VALUES (?1, ?2, ?3, ?4)",
            (
                &config.plc_ip,
                &config_json,
                config.total_size as i64,
                config.last_updated,
            ),
        ) {
            // Não temos app_handle aqui, então não emitimos
            return Err(e);
        }
        println!("💾 Configuração salva para PLC {}: {} bytes, {} blocos", 
                 config.plc_ip, config.total_size, config.blocks.len());
        // 🔍 DEBUG AUTOMÁTICO: Mostrar o que foi salvo
        println!("🔍 DEBUG - Estrutura salva:");
        for (i, block) in config.blocks.iter().enumerate() {
            let size_per_element = match block.data_type.as_str() {
                "WORD" | "INT" => 2,
                "DWORD" | "REAL" => 4,
                _ => 1
            };
            println!("  {}. {} [{}]: {} × {} = {} bytes", 
                i + 1, block.name, block.data_type, 
                block.count, size_per_element, 
                block.count * size_per_element);
        }
        println!("📝 JSON: {}", config_json);
        Ok(())
    }
    
    /// Carrega a configuração de estrutura de um PLC
    pub fn load_plc_structure(&self, plc_ip: &str) -> Result<Option<PlcStructureConfig>> {
        let conn = self.read_conn.lock().unwrap();
        
        let mut stmt = conn.prepare(
            "SELECT config_json, total_size, last_updated FROM plc_structures WHERE plc_ip = ?1"
        )?;
        
        let result = stmt.query_row([plc_ip], |row| {
            let config_json: String = row.get(0)?;
            let total_size: i64 = row.get(1)?;
            let last_updated: i64 = row.get(2)?;
            
            let blocks: Vec<DataBlockConfig> = serde_json::from_str(&config_json)
                .map_err(|e| rusqlite::Error::InvalidQuery)?;
            
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
        let conn = self.read_conn.lock().unwrap();
        
        let mut stmt = conn.prepare("SELECT plc_ip FROM plc_structures ORDER BY last_updated DESC")?;
        
        let plcs = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>>>()?;
        
        Ok(plcs)
    }
    
    /// Remove a configuração de um PLC
    pub fn delete_plc_structure(&self, plc_ip: &str) -> Result<()> {
        let conn = self.write_conn.lock().unwrap();
        
        conn.execute(
            "DELETE FROM plc_structures WHERE plc_ip = ?1",
            [plc_ip],
        )?;
        
        println!("🗑️ Configuração removida para PLC {}", plc_ip);
        
        Ok(())
    }
    
    /// 🔍 DEBUG: Mostra EXATAMENTE o que está salvo no banco
    pub fn debug_show_saved_structure(&self, plc_ip: &str) -> Result<String> {
        let conn = self.read_conn.lock().unwrap();
        
        let result = conn.query_row(
            "SELECT config_json, total_size, last_updated FROM plc_structures WHERE plc_ip = ?1",
            [plc_ip],
            |row| {
                let config_json: String = row.get(0)?;
                let total_size: i64 = row.get(1)?;
                let last_updated: i64 = row.get(2)?;
                Ok((config_json, total_size, last_updated))
            }
        );
        
        match result {
            Ok((json, size, timestamp)) => {
                let blocks: Vec<DataBlockConfig> = serde_json::from_str(&json)
                    .unwrap_or_else(|_| vec![]);
                
                let mut debug_output = format!("🔍 DEBUG BANCO - PLC {}:\n", plc_ip);
                debug_output.push_str(&format!("📦 Total Size: {} bytes\n", size));
                debug_output.push_str(&format!("🕐 Last Updated: {}\n", timestamp));
                debug_output.push_str(&format!("📊 Blocos salvos: {}\n\n", blocks.len()));
                
                for (i, block) in blocks.iter().enumerate() {
                    let block_size = match block.data_type.as_str() {
                        "WORD" | "INT" => block.count * 2,
                        "DWORD" | "REAL" => block.count * 4,
                        _ => 0
                    };
                    debug_output.push_str(&format!(
                        "  {}. {} [{}]: {} elementos × {} bytes = {} bytes\n",
                        i + 1,
                        block.name,
                        block.data_type,
                        block.count,
                        block_size / block.count,
                        block_size
                    ));
                }
                
                debug_output.push_str(&format!("\n📝 JSON RAW:\n{}\n", json));
                
                Ok(debug_output)
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Ok(format!("❌ Nenhuma configuração salva para PLC {}", plc_ip))
            }
            Err(e) => Err(e)
        }
    }
    
    // ============================================================================
    // MÉTODOS PARA GERENCIAR TAG MAPPINGS
    // ============================================================================
    
    /// Salva um mapeamento de tag
    pub fn save_tag_mapping(&self, tag: &TagMapping) -> Result<i64> {
        let conn = self.write_conn.lock().unwrap();
        
        let _result = conn.execute(
            "INSERT OR REPLACE INTO tag_mappings 
             (plc_ip, variable_path, tag_name, description, unit, enabled, created_at, collect_mode, collect_interval_s, area, category)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            (
                &tag.plc_ip,
                &tag.variable_path,
                &tag.tag_name,
                &tag.description,
                &tag.unit,
                tag.enabled as i32,
                tag.created_at,
                &tag.collect_mode,
                &tag.collect_interval_s,
                &tag.area,
                &tag.category,
            ),
        )?;
        
        let tag_id = conn.last_insert_rowid();
        println!("💾 Tag salvo: {} -> {} (ID: {}, Enabled: {})", tag.variable_path, tag.tag_name, tag_id, tag.enabled);
        
        Ok(tag_id)
    }
    
    /// Carrega todos os tags de um PLC
    pub fn load_tag_mappings(&self, plc_ip: &str) -> Result<Vec<TagMapping>> {
        let conn = self.read_conn.lock().unwrap();
        
        let mut stmt = conn.prepare(
            "SELECT id, plc_ip, variable_path, tag_name, description, unit, enabled, created_at, collect_mode, collect_interval_s, area, category 
             FROM tag_mappings WHERE plc_ip = ?1 ORDER BY variable_path"
        )?;

        let tag_iter = stmt.query_map([plc_ip], |row| {
            Ok(TagMapping {
                id: Some(row.get(0)?),
                plc_ip: row.get(1)?,
                variable_path: row.get(2)?,
                tag_name: row.get(3)?,
                description: row.get(4)?,
                unit: row.get(5)?,
                enabled: row.get::<usize, i32>(6)? == 1,
                created_at: row.get(7)?,
                collect_mode: row.get(8).ok(),
                collect_interval_s: row.get(9).ok(),
                area: row.get(10).ok(),
                category: row.get(11).ok(),
            })
        })?;
        
        let tags: Result<Vec<TagMapping>> = tag_iter.collect();
        let tags = tags?;
        
        // Debug: mostrar estado dos tags carregados
        // for tag in &tags {
        //     println!("📖 Tag carregado: {} = {} (enabled: {})", tag.variable_path, tag.tag_name, tag.enabled);
        // }
        println!("📖 Total: {} tags carregados para PLC {}", tags.len(), plc_ip);
        Ok(tags)
    }
    
    /// Remove um tag mapping
    pub fn delete_tag_mapping(&self, plc_ip: &str, variable_path: &str) -> Result<()> {
        let conn = self.write_conn.lock().unwrap();
        
        conn.execute(
            "DELETE FROM tag_mappings WHERE plc_ip = ?1 AND variable_path = ?2",
            [plc_ip, variable_path],
        )?;
        
        println!("🗑️ Tag removido: {} -> {}", plc_ip, variable_path);
        Ok(())
    }

    /// Salva múltiplos tags de uma vez (Bulk Save) - OTIMIZADO para evitar travamento do cache
    pub fn save_tag_mappings_bulk(&self, tags: &[TagMapping]) -> Result<Vec<i64>> {
        let mut conn = self.write_conn.lock().unwrap();
        
        if tags.is_empty() {
            return Ok(vec![]);
        }
        
        let mut tag_ids = Vec::new();
        let mut successful_count = 0;
        
        // Usar transação para performance e atomicidade
        let tx = conn.transaction()?;
        
        {
            let mut stmt = tx.prepare(
                "INSERT OR REPLACE INTO tag_mappings 
                 (plc_ip, variable_path, tag_name, description, unit, enabled, created_at, collect_mode, collect_interval_s, area, category)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
            )?;
            
            for tag in tags {
                match stmt.execute((
                    &tag.plc_ip,
                    &tag.variable_path,
                    &tag.tag_name,
                    &tag.description,
                    &tag.unit,
                    tag.enabled as i32,
                    tag.created_at,
                    &tag.collect_mode,
                    &tag.collect_interval_s,
                    &tag.area,
                    &tag.category,
                )) {
                    Ok(_) => {
                        let tag_id = tx.last_insert_rowid();
                        tag_ids.push(tag_id);
                        successful_count += 1;
                    }
                    Err(e) => {
                        println!("⚠️ Erro ao salvar tag '{}': {}", tag.tag_name, e);
                        tag_ids.push(-1); // Indica erro
                    }
                }
            }
        }
        
        tx.commit()?;
        
        println!("💾 Bulk Save: {}/{} tags salvos com sucesso", successful_count, tags.len());
        
        Ok(tag_ids)
    }

    /// Remove múltiplos tags de uma vez (Bulk Delete)
    pub fn delete_tag_mappings_bulk(&self, ids: Vec<i64>) -> Result<()> {
        let mut conn = self.write_conn.lock().unwrap();
        let tx = conn.transaction()?;
        
        {
            let mut stmt = tx.prepare("DELETE FROM tag_mappings WHERE id = ?")?;
            for id in &ids {
                stmt.execute([id])?;
            }
        }
        
        tx.commit()?;
        println!("🗑️ Bulk Delete: {} tags removidos com sucesso.", ids.len());
        Ok(())
    }
    
    /// Lista todos os tags ativos (enabled=true) de um PLC para o WebSocket
    pub fn get_active_tags(&self, plc_ip: &str) -> Result<Vec<TagMapping>> {
        let conn = self.read_conn.lock().unwrap();
        
        let mut stmt = conn.prepare(
            "SELECT id, plc_ip, variable_path, tag_name, description, unit, enabled, created_at, collect_mode, collect_interval_s, area, category 
             FROM tag_mappings WHERE plc_ip = ?1 AND enabled = 1 ORDER BY tag_name"
        )?;

        let tag_iter = stmt.query_map([plc_ip], |row| {
            Ok(TagMapping {
                id: Some(row.get(0)?),
                plc_ip: row.get(1)?,
                variable_path: row.get(2)?,
                tag_name: row.get(3)?,
                description: row.get(4)?,
                unit: row.get(5)?,
                enabled: true,
                created_at: row.get(7)?,
                collect_mode: row.get(8).ok(),
                collect_interval_s: row.get(9).ok(),
                area: row.get(10).ok(),
                category: row.get(11).ok(),
            })
        })?;
        
        let tags: Result<Vec<TagMapping>> = tag_iter.collect();
        tags
    }
    
    /// 🆕 Lista tags ativos filtrados por área e/ou categoria
    pub fn get_active_tags_filtered(&self, plc_ip: &str, areas: Option<Vec<String>>, categories: Option<Vec<String>>) -> Result<Vec<TagMapping>> {
        let conn = self.read_conn.lock().unwrap();
        
        // Construir query dinâmica baseada nos filtros
        let mut sql = String::from(
            "SELECT id, plc_ip, variable_path, tag_name, description, unit, enabled, created_at, collect_mode, collect_interval_s, area, category 
             FROM tag_mappings WHERE plc_ip = ?1 AND enabled = 1"
        );
        
        let has_area_filter = areas.as_ref().map(|a| !a.is_empty()).unwrap_or(false);
        let has_category_filter = categories.as_ref().map(|c| !c.is_empty()).unwrap_or(false);
        
        if has_area_filter {
            let area_list = areas.as_ref().unwrap();
            let placeholders: Vec<String> = (0..area_list.len()).map(|i| format!("?{}", i + 2)).collect();
            sql.push_str(&format!(" AND area IN ({})", placeholders.join(",")));
        }
        
        if has_category_filter {
            let cat_list = categories.as_ref().unwrap();
            let offset = if has_area_filter { areas.as_ref().unwrap().len() + 2 } else { 2 };
            let placeholders: Vec<String> = (0..cat_list.len()).map(|i| format!("?{}", i + offset)).collect();
            sql.push_str(&format!(" AND category IN ({})", placeholders.join(",")));
        }
        
        sql.push_str(" ORDER BY area, category, tag_name");
        
        let mut stmt = conn.prepare(&sql)?;
        
        // Bind dos parâmetros
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(plc_ip.to_string())];
        
        if let Some(ref area_list) = areas {
            for area in area_list {
                params.push(Box::new(area.clone()));
            }
        }
        
        if let Some(ref cat_list) = categories {
            for cat in cat_list {
                params.push(Box::new(cat.clone()));
            }
        }
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let tag_iter = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(TagMapping {
                id: Some(row.get(0)?),
                plc_ip: row.get(1)?,
                variable_path: row.get(2)?,
                tag_name: row.get(3)?,
                description: row.get(4)?,
                unit: row.get(5)?,
                enabled: true,
                created_at: row.get(7)?,
                collect_mode: row.get(8).ok(),
                collect_interval_s: row.get(9).ok(),
                area: row.get(10).ok(),
                category: row.get(11).ok(),
            })
        })?;
        
        let tags: Result<Vec<TagMapping>> = tag_iter.collect();
        let result = tags?;
        
        println!("📖 Tags filtrados: {} (áreas: {:?}, categorias: {:?})", result.len(), areas, categories);
        Ok(result)
    }
    
    // ============================================================================
    // MÉTODOS PARA CONFIGURAÇÕES WEBSOCKET
    // ============================================================================
    
    /// Salva configuração WebSocket
    pub fn save_websocket_config(&self, config: &WebSocketDbConfig) -> Result<()> {
        let conn = self.write_conn.lock().unwrap();
        
        // Serializar lista de interfaces para JSON
        let bind_interfaces_json = serde_json::to_string(&config.bind_interfaces)
            .unwrap_or_else(|_| "[\"0.0.0.0\"]".to_string());
        
        conn.execute(
            "INSERT OR REPLACE INTO websocket_config 
             (id, host, port, max_clients, broadcast_interval_ms, enabled, bind_interfaces_json, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                &config.host,
                config.port as i64,
                config.max_clients as i64,
                config.broadcast_interval_ms as i64,
                config.enabled as i32,
                &bind_interfaces_json,
                config.updated_at,
            ),
        )?;
        
        println!("💾 Configuração WebSocket salva: {}:{} - Interfaces: {:?}", 
                config.host, config.port, config.bind_interfaces);
        Ok(())
    }
    
    /// Carrega configuração WebSocket
    pub fn load_websocket_config(&self) -> Result<WebSocketDbConfig> {
        let conn = self.read_conn.lock().unwrap();
        
        let result = conn.query_row(
            "SELECT host, port, max_clients, broadcast_interval_ms, enabled, bind_interfaces_json, updated_at 
             FROM websocket_config WHERE id = 1",
            [],
            |row| {
                let bind_interfaces_json: String = row.get(5).unwrap_or_else(|_| "[\"0.0.0.0\"]".to_string());
                let bind_interfaces: Vec<String> = serde_json::from_str(&bind_interfaces_json)
                    .unwrap_or_else(|_| vec!["0.0.0.0".to_string()]);
                
                Ok(WebSocketDbConfig {
                    host: row.get(0)?,
                    port: row.get::<usize, i64>(1)? as u16,
                    max_clients: row.get::<usize, i64>(2)? as u32,
                    broadcast_interval_ms: row.get::<usize, i64>(3)? as u64,
                    enabled: row.get::<usize, i32>(4)? == 1,
                    bind_interfaces,
                    updated_at: row.get::<usize, i64>(6)?,
                })
            },
        );
        
        match result {
            Ok(config) => {
                println!("📖 Configuração WebSocket carregada: {}:{} - Interfaces: {:?}", 
                        config.host, config.port, config.bind_interfaces);
                Ok(config)
            },
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Retornar configuração padrão
                let default_config = WebSocketDbConfig {
                    host: "0.0.0.0".to_string(),
                    port: 8765,
                    max_clients: 100,
                    broadcast_interval_ms: 100,
                    enabled: false,
                    bind_interfaces: vec!["0.0.0.0".to_string()],
                    updated_at: chrono::Utc::now().timestamp(),
                };
                
                // Salvar configuração padrão no banco
                self.save_websocket_config(&default_config)?;
                Ok(default_config)
            },
            Err(e) => Err(e),
        }
    }
}
