use crate::tcp_server::{PlcVariable, PlcDataPacket};
use crate::database::{Database, DataBlockConfig, PlcStructureConfig};
use std::sync::Arc;
use std::time::Duration;

/// Converte bytes para WORD (16-bit unsigned)
fn bytes_to_word(high_byte: u8, low_byte: u8) -> u16 {
    // PLCs geralmente usam big-endian (high byte primeiro)
    ((high_byte as u16) << 8) | (low_byte as u16)
}

/// Parseia dados usando configuração estruturada do banco de dados
fn parse_with_config(raw_data: &[u8], blocks: &[DataBlockConfig]) -> Vec<PlcVariable> {
    let mut variables = Vec::new();
    let mut offset = 0;
    
    for block in blocks {
        let type_size = match block.data_type.as_str() {
            "BYTE" => 1,
            "WORD" | "INT" => 2,
            "DWORD" | "DINT" | "REAL" => 4,
            "LWORD" | "LINT" | "LREAL" => 8,
            _ => continue,
        };
        
        for i in 0..block.count {
            if offset + type_size > raw_data.len() {
                break;
            }
            
            let value_str = match block.data_type.as_str() {
                "BYTE" => {
                    let val = raw_data[offset];
                    format!("{}", val)
                }
                "WORD" => {
                    let val = bytes_to_word(raw_data[offset], raw_data[offset + 1]);
                    format!("{}", val)
                }
                "INT" => {
                    let val = bytes_to_word(raw_data[offset], raw_data[offset + 1]) as i16;
                    format!("{}", val)
                }
                "DWORD" => {
                    let val = ((raw_data[offset] as u32) << 24) |
                             ((raw_data[offset + 1] as u32) << 16) |
                             ((raw_data[offset + 2] as u32) << 8) |
                             (raw_data[offset + 3] as u32);
                    format!("{}", val)
                }
                "DINT" => {
                    let bytes = [raw_data[offset], raw_data[offset + 1], 
                                raw_data[offset + 2], raw_data[offset + 3]];
                    let val = i32::from_be_bytes(bytes);
                    format!("{}", val)
                }
                "REAL" => {
                    let bytes = [raw_data[offset], raw_data[offset + 1], 
                                raw_data[offset + 2], raw_data[offset + 3]];
                    let val = f32::from_be_bytes(bytes);
                    format!("{:.6}", val)
                }
                "LWORD" => {
                    let val = ((raw_data[offset] as u64) << 56) |
                             ((raw_data[offset + 1] as u64) << 48) |
                             ((raw_data[offset + 2] as u64) << 40) |
                             ((raw_data[offset + 3] as u64) << 32) |
                             ((raw_data[offset + 4] as u64) << 24) |
                             ((raw_data[offset + 5] as u64) << 16) |
                             ((raw_data[offset + 6] as u64) << 8) |
                             (raw_data[offset + 7] as u64);
                    format!("{}", val)
                }
                "LINT" => {
                    let bytes = [raw_data[offset], raw_data[offset + 1], 
                                raw_data[offset + 2], raw_data[offset + 3],
                                raw_data[offset + 4], raw_data[offset + 5],
                                raw_data[offset + 6], raw_data[offset + 7]];
                    let val = i64::from_be_bytes(bytes);
                    format!("{}", val)
                }
                "LREAL" => {
                    let bytes = [raw_data[offset], raw_data[offset + 1], 
                                raw_data[offset + 2], raw_data[offset + 3],
                                raw_data[offset + 4], raw_data[offset + 5],
                                raw_data[offset + 6], raw_data[offset + 7]];
                    let val = f64::from_be_bytes(bytes);
                    format!("{:.6}", val)
                }
                _ => String::from("?"),
            };
            
            variables.push(PlcVariable {
                name: format!("{}[{}]", block.name, i),
                value: value_str,
                data_type: block.data_type.clone(),
                unit: None,
            });
            
            offset += type_size;
        }
    }
    
    variables
}

/// Detecta o formato real dos dados baseado no conteúdo
fn detect_data_format(raw_data: &[u8]) -> &'static str {
    let data_len = raw_data.len();
    
    // Se é exatamente 130 bytes e múltiplo de 2, provavelmente são WORDs
    if data_len == 130 && data_len % 2 == 0 {
        return "word";
    }
    
    // Se é exatamente 520 bytes, é a estrutura mista: 65 WORDs + 65 INTs + 65 REALs
    if data_len == 520 {
        return "mixed";
    }
    
    // Analisar padrões nos dados para detectar formato
    if data_len >= 4 {
        // Verificar se há padrões de REAL (float) válidos
        let mut valid_floats = 0;
        for i in (0..data_len - 3).step_by(4) {
            let bytes = [raw_data[i], raw_data[i + 1], raw_data[i + 2], raw_data[i + 3]];
            let float_val = f32::from_be_bytes(bytes);
            if float_val.is_finite() && float_val.abs() < 1e6 && float_val.abs() > 1e-6 {
                valid_floats += 1;
            }
        }
        
        // Se mais de 30% são floats válidos, são REALs
        if valid_floats > (data_len / 4) * 3 / 10 {
            return "real";
        }
    }
    
    // Se múltiplo de 4, pode ser DWORDs
    if data_len % 4 == 0 {
        return "dword";
    }
    
    // Se múltiplo de 2, são WORDs
    if data_len % 2 == 0 {
        return "word";
    }
    
    // Senão, são bytes
    "byte"
}

/// 🚀 NOVA FUNÇÃO: Parse com cache - ZERO DATABASE CALLS!
pub fn parse_plc_data_cached(raw_data: &[u8], ip: &str, cached_config: Option<PlcStructureConfig>) -> PlcDataPacket {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0))
        .as_secs();
    
    let data_len = raw_data.len();
    
    // 🚀 USAR CONFIG DO CACHE - ZERO LOCKS!
    let variables = if let Some(config) = cached_config {
        // ✅ LOG REMOVIDO: muito verboso em produção (2Hz = 120 logs/min)
        // Config cacheada é o caminho normal, não precisa logar sempre
        
        if config.total_size == data_len {
            parse_with_config(raw_data, &config.blocks)
        } else {
            println!("⚠️ PLC {}: Tamanho diferente! Esperado {} bytes, recebido {} bytes. Usando detecção automática.",
                     ip, config.total_size, data_len);
            parse_auto_detect(raw_data)
        }
    } else {
        println!("📊 PLC {}: Sem config cacheada. Usando detecção automática em {} bytes", ip, data_len);
        parse_auto_detect(raw_data)
    };
    
    println!("📊 PLC {}: Parseados {} variáveis", ip, variables.len());
    
    PlcDataPacket {
        ip: ip.to_string(),
        timestamp,
        raw_data: raw_data.to_vec(),
        size: data_len,
        variables,
    }
}

/// ⚠️ FUNÇÃO LEGADA: Parse com database calls (EVITAR USAR!)
/// 1. Tenta usar configuração salva no banco de dados
/// 2. Se não tiver, usa detecção automática (fallback)
pub fn parse_plc_data(raw_data: &[u8], ip: &str, db: Option<&Arc<Database>>) -> PlcDataPacket {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0))
        .as_secs();
    
    let data_len = raw_data.len();
    
    // Tentar carregar configuração do banco
    let variables = if let Some(database) = db {
        if let Ok(Some(config)) = database.load_plc_structure(ip) {
            println!("✅ PLC {}: Usando configuração salva ({} blocos, {} bytes esperados)", 
                     ip, config.blocks.len(), config.total_size);
            
            if config.total_size == data_len {
                parse_with_config(raw_data, &config.blocks)
            } else {
                println!("⚠️ PLC {}: Tamanho diferente! Esperado {} bytes, recebido {} bytes. Usando detecção automática.",
                         ip, config.total_size, data_len);
                parse_auto_detect(raw_data)
            }
        } else {
            println!("📊 PLC {}: Sem configuração salva. Usando detecção automática em {} bytes", ip, data_len);
            parse_auto_detect(raw_data)
        }
    } else {
        parse_auto_detect(raw_data)
    };
    
    // ✅ LOG REMOVIDO: muito verboso em produção
    
    PlcDataPacket {
        ip: ip.to_string(),
        timestamp,
        raw_data: raw_data.to_vec(),
        size: data_len,
        variables,
    }
}

/// Detecção automática quando não tem configuração
fn parse_auto_detect(raw_data: &[u8]) -> Vec<PlcVariable> {
    let mut variables = Vec::new();
    let data_len = raw_data.len();
    
    // Detectar formato real dos dados
    let format = detect_data_format(raw_data);
    
    match format {
        "word" => {
            // APENAS WORDs - formato detectado
            let word_count = data_len / 2;
            for i in 0..word_count {
                let offset = i * 2;
                if offset + 1 < data_len {
                    let word_value = bytes_to_word(raw_data[offset], raw_data[offset + 1]);
                    variables.push(PlcVariable {
                        name: format!("W{}", i),
                        value: word_value.to_string(),
                        data_type: "WORD".to_string(),
                        unit: None,
                    });
                }
            }
        }
        
        "dword" => {
            // DWORDs detectados
            let dword_count = data_len / 4;
            for i in 0..dword_count {
                let offset = i * 4;
                if offset + 3 < data_len {
                    let dword_value = ((raw_data[offset] as u32) << 24) |
                                     ((raw_data[offset + 1] as u32) << 16) |
                                     ((raw_data[offset + 2] as u32) << 8) |
                                     (raw_data[offset + 3] as u32);
                    variables.push(PlcVariable {
                        name: format!("DW{}", i),
                        value: dword_value.to_string(),
                        data_type: "DWORD".to_string(),
                        unit: None,
                    });
                }
            }
        }
        
        "real" => {
            // REALs detectados
            let real_count = data_len / 4;
            for i in 0..real_count {
                let offset = i * 4;
                if offset + 3 < data_len {
                    let bytes = [raw_data[offset], raw_data[offset + 1], raw_data[offset + 2], raw_data[offset + 3]];
                    let float_value = f32::from_be_bytes(bytes);
                    variables.push(PlcVariable {
                        name: format!("R{}", i),
                        value: format!("{:.6}", float_value),
                        data_type: "REAL".to_string(),
                        unit: None,
                    });
                }
            }
        }
        
        "mixed" => {
            // Estrutura mista: 65 WORDs + 65 INTs + 65 REALs (520 bytes)
            // Array[0..64] of Word = 130 bytes (bytes 0-129)
            // Array[0..64] of Int = 130 bytes (bytes 130-259) 
            // Array[0..64] of Real = 260 bytes (bytes 260-519)
            
            // WORDs (primeiros 130 bytes)
            for i in 0..65 {
                let offset = i * 2;
                if offset + 1 < 130 {
                    let word_value = bytes_to_word(raw_data[offset], raw_data[offset + 1]);
                    variables.push(PlcVariable {
                        name: format!("W{}", i),
                        value: word_value.to_string(),
                        data_type: "WORD".to_string(),
                        unit: None,
                    });
                }
            }
            
            // INTs (próximos 130 bytes, offset 130-259)
            for i in 0..65 {
                let offset = 130 + (i * 2);
                if offset + 1 < 260 {
                    let int_value = bytes_to_word(raw_data[offset], raw_data[offset + 1]) as i16;
                    variables.push(PlcVariable {
                        name: format!("I{}", i),
                        value: int_value.to_string(),
                        data_type: "INT".to_string(),
                        unit: None,
                    });
                }
            }
            
            // REALs (últimos 260 bytes, offset 260-519)
            for i in 0..65 {
                let offset = 260 + (i * 4);
                if offset + 3 < data_len {
                    let bytes = [raw_data[offset], raw_data[offset + 1], raw_data[offset + 2], raw_data[offset + 3]];
                    let float_value = f32::from_be_bytes(bytes);
                    variables.push(PlcVariable {
                        name: format!("R{}", i),
                        value: format!("{:.6}", float_value),
                        data_type: "REAL".to_string(),
                        unit: None,
                    });
                }
            }
        }
        
        _ => {
            // BYTEs como fallback
            for i in 0..data_len {
                variables.push(PlcVariable {
                    name: format!("B{}", i),
                    value: raw_data[i].to_string(),
                    data_type: "BYTE".to_string(),
                    unit: None,
                });
            }
        }
    }
    
    variables
}
