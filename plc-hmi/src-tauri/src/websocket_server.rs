use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::Mutex as TokioMutex;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, RwLock};
use tokio::time;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use std::collections::{HashMap, BTreeMap};

use crate::database::Database;
use crate::database::TagMapping;
use crate::tcp_server::TcpServer;
use tokio::sync::mpsc;

// ============================================================================
// 🛡️ SISTEMA DE BACKPRESSURE ADAPTATIVO AUTOMÁTICO
// ============================================================================
// Este sistema auto-detecta problemas de pressão no buffer e auto-corrige
// sem fechar conexões ou perder dados críticos. Garante estabilidade total.
// ============================================================================

/// Configuração do sistema de backpressure adaptativo
#[derive(Debug, Clone)]
pub struct BackpressureConfig {
    /// Capacidade inicial do buffer
    pub initial_capacity: usize,
    /// Capacidade máxima permitida (auto-expansão)
    pub max_capacity: usize,
    /// Threshold para ativar sampling (% de uso)
    pub sampling_threshold_pct: f64,
    /// Threshold para expandir buffer (% de uso)
    pub expand_threshold_pct: f64,
    /// Threshold para voltar ao normal (% de uso)
    pub recovery_threshold_pct: f64,
    /// Intervalo mínimo entre samples quando sob pressão (ms)
    pub min_sample_interval_ms: u64,
    /// Fator de expansão do buffer
    pub expansion_factor: f64,
}

impl Default for BackpressureConfig {
    fn default() -> Self {
        Self {
            initial_capacity: 2000,
            max_capacity: 10000,        // Pode crescer até 10k entradas
            sampling_threshold_pct: 70.0,  // Inicia sampling em 70%
            expand_threshold_pct: 85.0,    // Expande buffer em 85%
            recovery_threshold_pct: 40.0,  // Volta ao normal em 40%
            min_sample_interval_ms: 50,    // Mínimo 50ms entre samples sob pressão
            expansion_factor: 1.5,         // Expande 50% por vez
        }
    }
}

/// Estado do sistema de backpressure
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BackpressureState {
    /// Sistema operando normalmente
    Normal,
    /// Sistema sob pressão leve - ativou sampling
    Sampling,
    /// Sistema sob pressão alta - buffer expandido
    Expanded,
    /// Sistema em recuperação - voltando ao normal
    Recovering,
}

/// Métricas do sistema de backpressure para monitoramento
#[derive(Debug, Clone, Serialize)]
pub struct BackpressureMetrics {
    pub state: String,
    pub current_capacity: usize,
    pub current_usage: usize,
    pub usage_percentage: f64,
    pub messages_processed: u64,
    pub messages_dropped: u64,
    pub messages_sampled: u64,
    pub auto_expansions: u64,
    pub auto_recoveries: u64,
    pub last_state_change: u64,
    pub sampling_rate: f64, // 1.0 = 100% (normal), 0.5 = 50% (sampling)
}

/// Controlador de Backpressure Adaptativo
#[derive(Debug)]
pub struct AdaptiveBackpressure {
    config: BackpressureConfig,
    state: Arc<std::sync::RwLock<BackpressureState>>,
    current_capacity: Arc<AtomicUsize>,
    current_usage: Arc<AtomicUsize>,
    messages_processed: Arc<AtomicU64>,
    messages_dropped: Arc<AtomicU64>,
    messages_sampled: Arc<AtomicU64>,
    auto_expansions: Arc<AtomicU64>,
    auto_recoveries: Arc<AtomicU64>,
    last_state_change: Arc<AtomicU64>,
    sampling_rate: Arc<std::sync::RwLock<f64>>,
    last_sample_time: Arc<std::sync::RwLock<std::time::Instant>>,
    sample_counter: Arc<AtomicU64>,
}

impl AdaptiveBackpressure {
    pub fn new(config: BackpressureConfig) -> Self {
        let initial_cap = config.initial_capacity;
        Self {
            config,
            state: Arc::new(std::sync::RwLock::new(BackpressureState::Normal)),
            current_capacity: Arc::new(AtomicUsize::new(initial_cap)),
            current_usage: Arc::new(AtomicUsize::new(0)),
            messages_processed: Arc::new(AtomicU64::new(0)),
            messages_dropped: Arc::new(AtomicU64::new(0)),
            messages_sampled: Arc::new(AtomicU64::new(0)),
            auto_expansions: Arc::new(AtomicU64::new(0)),
            auto_recoveries: Arc::new(AtomicU64::new(0)),
            last_state_change: Arc::new(AtomicU64::new(0)),
            sampling_rate: Arc::new(std::sync::RwLock::new(1.0)),
            last_sample_time: Arc::new(std::sync::RwLock::new(std::time::Instant::now())),
            sample_counter: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Verifica se deve aceitar esta mensagem (implementa sampling adaptativo)
    pub fn should_accept(&self) -> bool {
        let state = *self.state.read().unwrap();
        
        match state {
            BackpressureState::Normal => true,
            BackpressureState::Sampling | BackpressureState::Expanded => {
                // Implementar sampling baseado na taxa atual
                let rate = *self.sampling_rate.read().unwrap();
                let counter = self.sample_counter.fetch_add(1, Ordering::Relaxed);
                
                // Aceitar baseado na taxa de sampling
                // rate = 1.0 -> aceita tudo
                // rate = 0.5 -> aceita 50%
                // rate = 0.25 -> aceita 25%
                if rate >= 1.0 {
                    true
                } else {
                    let threshold = (rate * 100.0) as u64;
                    (counter % 100) < threshold
                }
            }
            BackpressureState::Recovering => true, // Durante recuperação, aceita tudo
        }
    }

    /// Registra uma mensagem processada e atualiza métricas
    pub fn record_processed(&self) {
        self.messages_processed.fetch_add(1, Ordering::Relaxed);
        let usage = self.current_usage.fetch_sub(1, Ordering::Relaxed).saturating_sub(1);
        
        // Verificar se devemos recuperar
        self.check_recovery(usage);
    }

    /// Registra uma mensagem dropada
    pub fn record_dropped(&self) {
        self.messages_dropped.fetch_add(1, Ordering::Relaxed);
    }

    /// Registra uma mensagem sampleada (ignorada por sampling)
    pub fn record_sampled(&self) {
        self.messages_sampled.fetch_add(1, Ordering::Relaxed);
    }

    /// Registra uma nova mensagem chegando e retorna se deve processar
    pub fn on_message_arrival(&self) -> bool {
        let usage = self.current_usage.fetch_add(1, Ordering::Relaxed) + 1;
        let capacity = self.current_capacity.load(Ordering::Relaxed);
        let usage_pct = (usage as f64 / capacity as f64) * 100.0;

        // Auto-ajustar estado baseado na pressão
        self.auto_adjust_state(usage_pct, usage, capacity);

        // Decidir se aceita esta mensagem
        if self.should_accept() {
            true
        } else {
            self.current_usage.fetch_sub(1, Ordering::Relaxed);
            self.record_sampled();
            false
        }
    }

    /// Auto-ajusta o estado do sistema baseado na pressão atual
    fn auto_adjust_state(&self, usage_pct: f64, usage: usize, capacity: usize) {
        let mut state = self.state.write().unwrap();
        let old_state = *state;

        match *state {
            BackpressureState::Normal => {
                if usage_pct >= self.config.expand_threshold_pct {
                    // Pressão muito alta - expandir buffer
                    *state = BackpressureState::Expanded;
                    self.expand_buffer();
                    self.update_sampling_rate(0.5); // Reduzir para 50%
                    println!("🔴 BACKPRESSURE: Normal → Expanded (uso: {:.1}%)", usage_pct);
                } else if usage_pct >= self.config.sampling_threshold_pct {
                    // Pressão média - ativar sampling
                    *state = BackpressureState::Sampling;
                    self.update_sampling_rate(0.75); // Reduzir para 75%
                    println!("🟡 BACKPRESSURE: Normal → Sampling (uso: {:.1}%)", usage_pct);
                }
            }
            BackpressureState::Sampling => {
                if usage_pct >= self.config.expand_threshold_pct {
                    // Pressão aumentou - expandir
                    *state = BackpressureState::Expanded;
                    self.expand_buffer();
                    self.update_sampling_rate(0.5);
                    println!("🔴 BACKPRESSURE: Sampling → Expanded (uso: {:.1}%)", usage_pct);
                } else if usage_pct <= self.config.recovery_threshold_pct {
                    // Pressão diminuiu - recuperar
                    *state = BackpressureState::Recovering;
                    self.update_sampling_rate(1.0);
                    println!("🟢 BACKPRESSURE: Sampling → Recovering (uso: {:.1}%)", usage_pct);
                }
            }
            BackpressureState::Expanded => {
                if usage_pct <= self.config.recovery_threshold_pct {
                    // Pressão diminuiu significativamente - iniciar recuperação
                    *state = BackpressureState::Recovering;
                    self.update_sampling_rate(1.0);
                    self.auto_recoveries.fetch_add(1, Ordering::Relaxed);
                    println!("🟢 BACKPRESSURE: Expanded → Recovering (uso: {:.1}%)", usage_pct);
                } else if usage_pct >= 95.0 && capacity < self.config.max_capacity {
                    // Ainda sob pressão crítica - expandir mais
                    self.expand_buffer();
                    self.update_sampling_rate(0.25); // Sampling agressivo
                    println!("🔴🔴 BACKPRESSURE: Expansão adicional (uso: {:.1}%)", usage_pct);
                }
            }
            BackpressureState::Recovering => {
                if usage_pct >= self.config.sampling_threshold_pct {
                    // Pressão voltou - voltar ao sampling
                    *state = BackpressureState::Sampling;
                    self.update_sampling_rate(0.75);
                    println!("🟡 BACKPRESSURE: Recovering → Sampling (uso: {:.1}%)", usage_pct);
                } else if usage_pct <= self.config.recovery_threshold_pct / 2.0 {
                    // Totalmente recuperado
                    *state = BackpressureState::Normal;
                    self.update_sampling_rate(1.0);
                    // Opcionalmente reduzir capacidade se muito grande
                    self.maybe_shrink_buffer();
                    println!("🟢 BACKPRESSURE: Recovering → Normal (uso: {:.1}%)", usage_pct);
                }
            }
        }

        if *state != old_state {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            self.last_state_change.store(now, Ordering::Relaxed);
        }
    }

    /// Expande o buffer automaticamente
    fn expand_buffer(&self) {
        let current = self.current_capacity.load(Ordering::Relaxed);
        let new_capacity = ((current as f64 * self.config.expansion_factor) as usize)
            .min(self.config.max_capacity);
        
        if new_capacity > current {
            self.current_capacity.store(new_capacity, Ordering::Relaxed);
            self.auto_expansions.fetch_add(1, Ordering::Relaxed);
            println!("📈 BACKPRESSURE: Buffer expandido {} → {} (max: {})", 
                    current, new_capacity, self.config.max_capacity);
        }
    }

    /// Reduz o buffer se estiver muito grande e o sistema estiver tranquilo
    fn maybe_shrink_buffer(&self) {
        let current = self.current_capacity.load(Ordering::Relaxed);
        let usage = self.current_usage.load(Ordering::Relaxed);
        let usage_pct = (usage as f64 / current as f64) * 100.0;
        
        // Só reduzir se uso estiver muito baixo e capacidade acima do inicial
        if usage_pct < 20.0 && current > self.config.initial_capacity {
            let new_capacity = (current / 2).max(self.config.initial_capacity);
            self.current_capacity.store(new_capacity, Ordering::Relaxed);
            println!("📉 BACKPRESSURE: Buffer reduzido {} → {}", current, new_capacity);
        }
    }

    /// Atualiza a taxa de sampling
    fn update_sampling_rate(&self, rate: f64) {
        let mut sampling = self.sampling_rate.write().unwrap();
        *sampling = rate.clamp(0.1, 1.0);
    }

    /// Verifica se deve iniciar recuperação
    fn check_recovery(&self, current_usage: usize) {
        let capacity = self.current_capacity.load(Ordering::Relaxed);
        let usage_pct = (current_usage as f64 / capacity as f64) * 100.0;
        
        if usage_pct <= self.config.recovery_threshold_pct {
            let state = *self.state.read().unwrap();
            if state == BackpressureState::Sampling || state == BackpressureState::Expanded {
                // Trigger auto-adjustment na próxima mensagem
            }
        }
    }

    /// Obtém métricas atuais do sistema
    pub fn get_metrics(&self) -> BackpressureMetrics {
        let state = *self.state.read().unwrap();
        let capacity = self.current_capacity.load(Ordering::Relaxed);
        let usage = self.current_usage.load(Ordering::Relaxed);
        
        BackpressureMetrics {
            state: format!("{:?}", state),
            current_capacity: capacity,
            current_usage: usage,
            usage_percentage: (usage as f64 / capacity as f64) * 100.0,
            messages_processed: self.messages_processed.load(Ordering::Relaxed),
            messages_dropped: self.messages_dropped.load(Ordering::Relaxed),
            messages_sampled: self.messages_sampled.load(Ordering::Relaxed),
            auto_expansions: self.auto_expansions.load(Ordering::Relaxed),
            auto_recoveries: self.auto_recoveries.load(Ordering::Relaxed),
            last_state_change: self.last_state_change.load(Ordering::Relaxed),
            sampling_rate: *self.sampling_rate.read().unwrap(),
        }
    }

    /// Reseta as métricas (para debugging/monitoramento)
    pub fn reset_metrics(&self) {
        self.messages_processed.store(0, Ordering::Relaxed);
        self.messages_dropped.store(0, Ordering::Relaxed);
        self.messages_sampled.store(0, Ordering::Relaxed);
    }
}

// ============================================================================
// FIM DO SISTEMA DE BACKPRESSURE
// ============================================================================

// ✅ Helper para base64 encode simples
fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    
    for chunk in data.chunks(3) {
        let mut buf = [0u8; 3];
        for (i, &byte) in chunk.iter().enumerate() {
            buf[i] = byte;
        }
        
        let b = (buf[0] as u32) << 16 | (buf[1] as u32) << 8 | buf[2] as u32;
        result.push(CHARS[((b >> 18) & 63) as usize] as char);
        result.push(CHARS[((b >> 12) & 63) as usize] as char);
        result.push(if chunk.len() > 1 { CHARS[((b >> 6) & 63) as usize] as char } else { '=' });
        result.push(if chunk.len() > 2 { CHARS[(b & 63) as usize] as char } else { '=' });
    }
    
    result
}

// 🆕 FUNÇÃO PARA ORDENAR TAGS POR ORDEM NATURAL (Word0, Word1, Word2...)
fn sort_tags_naturally(tags: HashMap<String, String>) -> BTreeMap<String, String> {
    use std::cmp::Ordering;
    
    let mut sorted_entries: Vec<(String, String)> = tags.into_iter().collect();
    
    // Função de comparação natural para tags como Word0, Word1, etc.
    sorted_entries.sort_by(|a, b| {
        let name_a = &a.0;
        let name_b = &b.0;
        
        // Extrair parte numérica se existir (ex: Word0 -> 0, Word10 -> 10)
        let get_numeric_suffix = |s: &str| -> Option<u32> {
            let chars: Vec<char> = s.chars().collect();
            let mut number_start = None;
            
            // Encontrar onde começam os dígitos
            for (i, &c) in chars.iter().enumerate() {
                if c.is_ascii_digit() {
                    number_start = Some(i);
                    break;
                }
            }
            
            if let Some(start) = number_start {
                let number_str: String = chars[start..].iter().collect();
                number_str.parse::<u32>().ok()
            } else {
                None
            }
        };
        
        // Extrair prefixo e número
        let prefix_a = name_a.trim_end_matches(|c: char| c.is_ascii_digit());
        let prefix_b = name_b.trim_end_matches(|c: char| c.is_ascii_digit());
        let num_a = get_numeric_suffix(name_a);
        let num_b = get_numeric_suffix(name_b);
        
        // Primeiro ordenar por prefixo (Word, Int, Real, etc.)
        match prefix_a.cmp(prefix_b) {
            Ordering::Equal => {
                // Se prefixos são iguais, ordenar por número
                match (num_a, num_b) {
                    (Some(a), Some(b)) => a.cmp(&b),  // Ordem numérica: 0, 1, 2, 10, 11...
                    (Some(_), None) => Ordering::Less,    // Números vêm antes
                    (None, Some(_)) => Ordering::Greater, // Números vêm antes
                    (None, None) => name_a.cmp(name_b),   // Ordem alfabética
                }
            }
            other => other
        }
    });
    
    // Converter para BTreeMap ordenado
    sorted_entries.into_iter().collect()
}

// ✅ ESTRUTURA PARA SERIALIZAR ATUALIZAÇÕES DE CACHE
#[derive(Debug, Clone)]
struct CacheUpdateData {
    plc_ip: String,
    variables: Vec<crate::tcp_server::PlcVariable>,
    timestamp: u64,
}

// 🚀 MELHORIA FASE 2: Batching inteligente para otimizar serialização
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct SubscriptionFilter {
    areas: Vec<String>,
    categories: Vec<String>,
    include_all_faults: bool,
}

#[derive(Debug)]
struct BatchedPayload {
    filter: SubscriptionFilter,
    client_ids: Vec<u64>,
    cached_json: Option<String>,
    cached_msgpack: Option<String>,
    last_update: std::time::Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub ip: String,
    pub is_active: bool,
    pub interface_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub host: String,
    pub port: u16,
    pub max_clients: u32,
    pub broadcast_interval_ms: u64,
    pub enabled: bool,
    pub bind_interfaces: Vec<String>,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8765,
            max_clients: 100,
            broadcast_interval_ms: 1000,
            enabled: false,
            bind_interfaces: vec!["0.0.0.0".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketStats {
    pub active_connections: u64,
    pub total_connections: u64,
    pub messages_sent: u64,
    pub bytes_sent: u64,
    pub uptime_seconds: u64,
    pub server_status: String,
    pub broadcast_rate_hz: f64,
}

// 🚀 SISTEMA DE CACHE INTELIGENTE PARA PERFORMANCE MÁXIMA
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTagValue {
    pub tag_name: String,
    pub plc_ip: String,
    pub value: String,
    pub data_type: String,
    pub timestamp_ns: u128,
    pub collect_mode: String,           // Mantido para serialização JSON
    #[serde(skip)]
    pub collect_mode_enum: CollectMode, // 🚀 OTIMIZAÇÃO: Enum pré-computado
    pub interval_s: u64,
    pub last_sent: u128,
    pub changed: bool,
    #[serde(skip)]
    pub last_value: Option<String>,     // 🚀 OTIMIZAÇÃO: Tracking inline (evita DashMap extra)
    // 🆕 CAMPOS PARA FILTRAGEM INTELIGENTE
    pub area: Option<String>,     // ENCH, ESVZ, JUS, MONT, ESGT, ECLUS
    pub category: Option<String>, // PROC, FAULT, EVENT (simplificado)
}

// 🚀 OTIMIZAÇÃO: Enum para collect_mode - evita comparações de string repetidas
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum CollectMode {
    OnChange,  // Envia apenas quando valor muda
    #[default]
    Interval,  // Envia em intervalos fixos (padrão)
    Unknown,   // Modo não reconhecido
}

impl CollectMode {
    /// Converte string para enum (normalizado uma vez no insert)
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "on_change" | "onchange" | "change" => CollectMode::OnChange,
            "interval" | "periodic" => CollectMode::Interval,
            _ => CollectMode::Unknown,
        }
    }
}

#[derive(Debug)]
pub struct SmartCache {
    // Cache principal: tag_name -> dados
    tag_cache: Arc<DashMap<String, CachedTagValue>>,
    // Grupos de intervalos: interval_s -> lista de tag_names
    interval_groups: Arc<RwLock<HashMap<u64, Vec<String>>>>,
    // Controle de mudanças para tags em modo "change"
    change_tracking: Arc<DashMap<String, String>>,
    
    // 🚀 ÍNDICE SECUNDÁRIO: Tags on_change para iteração rápida
    // Em vez de iterar 7500 tags, iteramos apenas os ~500 on_change
    on_change_index: Arc<DashMap<String, ()>>, // tag_key -> () (só precisamos da key)
    
    // 🆕 CACHE DE TAG MAPPINGS - EVITA CONSULTAS AO BANCO!
    tag_mappings_cache: Arc<DashMap<String, Vec<TagMapping>>>, // plc_ip -> tags
    tag_mappings_last_update: Arc<RwLock<std::time::Instant>>,
    
    // ✅ OTIMIZAÇÃO: Controle de memória e LRU
    cache_size_limit: usize, // Máximo de entradas no cache
    memory_pressure_threshold: AtomicUsize, // Threshold para limpeza automática
    last_cleanup: Arc<RwLock<std::time::Instant>>, // Última limpeza de memória
}

#[derive(Debug)]
pub struct ConnectedClient {
    pub id: u64,
    pub address: SocketAddr,
    pub connected_at: std::time::SystemTime,
    pub messages_received: Arc<AtomicU64>,
    // ✅ MELHORIA: Namespacing por eclusa/PLC
    pub subscribed_plcs: Arc<RwLock<std::collections::HashSet<String>>>,
    pub client_type: ClientType,
    // 🆕 FILTROS GRANULARES PARA SUBSCRIBE INTELIGENTE
    pub subscribed_areas: Arc<RwLock<std::collections::HashSet<String>>>,     // ENCH, ESVZ, JUS, MONT, ESGT, ECLUS
    pub subscribed_categories: Arc<RwLock<std::collections::HashSet<String>>>, // PROC, FAULT, EVENT
    pub include_all_faults: Arc<AtomicBool>, // Sempre receber TODAS as falhas/eventos (para painel de alarmes)
    // 🆕 CANAL PARA ENVIO DE MENSAGENS FILTRADAS PARA ESTE CLIENTE
    pub filtered_tx: Option<mpsc::Sender<String>>,
}

impl ConnectedClient {
    // 🛡️ FIX RACE CONDITION: Obter snapshot atômico de todos os filtros
    pub async fn get_filter_snapshot(&self) -> (
        std::collections::HashSet<String>,
        std::collections::HashSet<String>,
        std::collections::HashSet<String>,
        bool
    ) {
        // Usar tokio::join! para adquirir todos os locks simultaneamente
        let (plcs_guard, areas_guard, categories_guard) = tokio::join!(
            self.subscribed_plcs.read(),
            self.subscribed_areas.read(),
            self.subscribed_categories.read()
        );
        let include_faults = self.include_all_faults.load(Ordering::Acquire);
        
        // Clonar tudo enquanto ainda temos os locks
        (plcs_guard.clone(), areas_guard.clone(), categories_guard.clone(), include_faults)
    }
}

#[derive(Debug, Clone)]
pub enum ClientType {
    Global,           // Recebe de todos PLCs (comportamento atual)
    Filtered(Vec<String>), // Recebe apenas PLCs específicos (nova funcionalidade)
}

pub struct WebSocketServer {
    config: WebSocketConfig,
    is_running: Arc<AtomicBool>,
    connected_clients: Arc<DashMap<u64, ConnectedClient>>,
    active_connections: Arc<AtomicU64>,
    total_connections: Arc<AtomicU64>,
    messages_sent: Arc<AtomicU64>,
    bytes_sent: Arc<AtomicU64>,
    start_time: std::time::SystemTime,
    app_handle: AppHandle,
    database: Arc<Database>,
    tcp_server: Option<Arc<RwLock<Option<TcpServer>>>>,
    broadcast_sender: Option<broadcast::Sender<String>>,
    server_handle: Option<tokio::task::JoinHandle<()>>,
    broadcast_handle: Option<tokio::task::JoinHandle<()>>,
    interval_handles: Arc<TokioMutex<Vec<tokio::task::JoinHandle<()>>>>,
    smart_cache: Arc<SmartCache>,
    cache_updater_handle: Option<tokio::task::JoinHandle<()>>,
    // ✅ MELHORIA: Broadcasting por PLC específico
    plc_broadcast_channels: Arc<DashMap<String, broadcast::Sender<String>>>,
    // 🚀 MELHORIA FASE 2: Batching inteligente para otimizar serialização
    batched_payloads: Arc<DashMap<u64, BatchedPayload>>, // Hash do filtro -> payload cached
    // 🛡️ SISTEMA DE BACKPRESSURE ADAPTATIVO AUTOMÁTICO
    backpressure: Arc<AdaptiveBackpressure>,
}

impl SmartCache {
    pub fn new() -> Self {
        Self {
            tag_cache: Arc::new(DashMap::new()),
            interval_groups: Arc::new(RwLock::new(HashMap::new())),
            change_tracking: Arc::new(DashMap::new()),
            // 🚀 ÍNDICE SECUNDÁRIO PARA TAGS ON_CHANGE
            on_change_index: Arc::new(DashMap::new()),
            // 🆕 INICIALIZAR CACHE DE MAPPINGS
            tag_mappings_cache: Arc::new(DashMap::new()),
            tag_mappings_last_update: Arc::new(RwLock::new(std::time::Instant::now())),
            
            // 🚀 MELHORIA FASE 2: Cache expansível sem limites fixos (preparado para 7500+ tags)
            cache_size_limit: 15000, // Expandido: suporta até 15k tags (~3MB) - bem acima de 7500
            memory_pressure_threshold: AtomicUsize::new(12000), // Limpeza apenas quando realmente necessário
            last_cleanup: Arc::new(RwLock::new(std::time::Instant::now())),
        }
    }

    pub async fn clear(&self) {
        self.tag_cache.clear();
        self.change_tracking.clear();
        self.on_change_index.clear(); // 🚀 Limpar índice secundário
        let mut lock = self.interval_groups.write().await;
        lock.clear();
        // 🆕 LIMPAR CACHE DE MAPPINGS TAMBÉM
        self.tag_mappings_cache.clear();
    }
    
    // 🆕 CARREGAR TAGS DO BANCO PARA CACHE (chamado apenas quando necessário)
    pub async fn load_tag_mappings_to_cache(&self, plc_ip: &str, database: &Database) {
        match database.get_active_tags(plc_ip) {
            Ok(tags) => {
                println!("📦 Cache: Carregados {} tags ativos para PLC {}", tags.len(), plc_ip);
                self.tag_mappings_cache.insert(plc_ip.to_string(), tags);
                *self.tag_mappings_last_update.write().await = std::time::Instant::now();
            }
            Err(e) => {
                println!("⚠️ Cache: Erro ao carregar tags para {}: {}", plc_ip, e);
            }
        }
    }
    
    // 🆕 OBTER TAGS DO CACHE (ZERO CONSULTAS AO BANCO!)
    fn get_cached_tags(&self, plc_ip: &str) -> Option<Vec<TagMapping>> {
        self.tag_mappings_cache.get(plc_ip).map(|r| r.value().clone())
    }
    
    // 🆕 VERIFICAR SE CACHE PRECISA SER ATUALIZADO (só se muito antigo)
    pub async fn should_refresh_cache(&self) -> bool {
        let last_update = self.tag_mappings_last_update.read().await;
        // Só atualiza cache se tiver mais de 300 segundos (5 minutos) - REDUZIDO DRASTICAMENTE
        last_update.elapsed().as_secs() > 300
    }
    
    // ✅ ATUALIZAR CACHE COM DADOS TCP - AGORA USA CACHE DE TAGS!
    pub async fn update_from_tcp(&self, plc_ip: &str, variables: &[crate::tcp_server::PlcVariable], database: &Database) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        
        // 🆕 USAR CACHE EM VEZ DE CONSULTAR BANCO!
        let tags = if let Some(cached_tags) = self.get_cached_tags(plc_ip) {
            // ✅ CACHE HIT - ZERO I/O!
            cached_tags
        } else {
            // ⚠️ CACHE MISS - Carregar do banco (acontece raramente)
            println!("⚠️ Cache miss para PLC {} - carregando do banco", plc_ip);
            self.load_tag_mappings_to_cache(plc_ip, database).await;
            self.get_cached_tags(plc_ip).unwrap_or_default()
        };
        
        for tag in tags {
            // 🚀 LÓGICA DE EXTRAÇÃO DE BITS (Bit-Parser)
            let (search_name, bit_index) = if tag.variable_path.contains('.') && !tag.variable_path.starts_with("DB") {
                let parts: Vec<&str> = tag.variable_path.split('.').collect();
                if parts.len() == 2 {
                    if let Ok(bit) = parts[1].parse::<u8>() {
                         (parts[0], Some(bit))
                    } else {
                         (tag.variable_path.as_str(), None)
                    }
                } else {
                    (tag.variable_path.as_str(), None)
                }
            } else {
                (tag.variable_path.as_str(), None)
            };

            // Encontrar variável correspondente
            if let Some(variable) = variables.iter().find(|v| v.name == search_name) {
                let tag_key = format!("{}:{}", plc_ip, tag.tag_name);
                
                // Determinar valor final
                let final_value = if let Some(bit) = bit_index {
                    if let Ok(int_val) = variable.value.parse::<u64>() {
                         let bit_val = (int_val >> bit) & 1;
                         if bit_val == 1 { "TRUE".to_string() } else { "FALSE".to_string() }
                    } else {
                         variable.value.clone()
                    }
                } else {
                    variable.value.clone()
                };

                // 🚀 OTIMIZAÇÃO: Converter collect_mode para enum UMA VEZ (não em cada iteração)
                let collect_mode_str = tag.collect_mode.as_deref().unwrap_or("interval");
                let collect_mode_enum = CollectMode::from_str(collect_mode_str);
                
                // 🚀 OTIMIZAÇÃO: Verificar mudança inline (evita DashMap change_tracking)
                let mut value_changed = true;
                let mut last_value_inline: Option<String> = None;
                let mut preserved_last_sent: u128 = 0; // 🔧 FIX: Preservar last_sent anterior
                
                if collect_mode_enum == CollectMode::OnChange {
                    // Verificar se tag já existe no cache para comparar valor anterior
                    if let Some(existing) = self.tag_cache.get(&tag_key) {
                        value_changed = existing.value != final_value;
                        last_value_inline = Some(existing.value.clone());
                        // 🔧 FIX: Preservar last_sent se valor NÃO mudou
                        if !value_changed {
                            preserved_last_sent = existing.last_sent;
                        }
                    }
                    // 🚀 Atualizar índice secundário de tags on_change
                    self.on_change_index.insert(tag_key.clone(), ());
                } else {
                    // Para tags com intervalo, preservar last_sent se existir
                    if let Some(existing) = self.tag_cache.get(&tag_key) {
                        preserved_last_sent = existing.last_sent;
                    }
                    // Remover do índice se não for mais on_change
                    self.on_change_index.remove(&tag_key);
                }
                
                // Atualizar cache com struct otimizado
                let cached = CachedTagValue {
                    tag_name: tag.tag_name.clone(),
                    plc_ip: plc_ip.to_string(),
                    value: final_value,
                    data_type: if bit_index.is_some() { "BOOL".to_string() } else { variable.data_type.clone() },
                    timestamp_ns: now,
                    collect_mode: collect_mode_str.to_string(),
                    collect_mode_enum, // 🚀 Enum pré-computado
                    interval_s: tag.collect_interval_s.unwrap_or(1) as u64,
                    last_sent: preserved_last_sent, // 🔧 FIX: Usar valor preservado
                    changed: value_changed,
                    last_value: last_value_inline, // 🚀 Tracking inline
                    // 🆕 GUARDAR ÁREA E CATEGORIA PARA FILTRAGEM
                    area: tag.area.clone(),
                    category: tag.category.clone(),
                };
                
                self.tag_cache.insert(tag_key, cached);
            }
        }
    }
    
    // ✅ FUNÇÃO AUXILIAR: Comparação inteligente de valores por tipo (DESABILITADA)
    /*
    fn values_are_different(&self, old_value: &str, new_value: &str, data_type: &str) -> bool {
        match data_type {
            "REAL" | "LREAL" => {
                // Para valores de ponto flutuante, usar tolerância pequena
                if let (Ok(old), Ok(new)) = (old_value.parse::<f64>(), new_value.parse::<f64>()) {
                    (old - new).abs() > f64::EPSILON * 10.0
                } else {
                    old_value != new_value
                }
            },
            "INT" | "DINT" | "LINT" | "WORD" | "DWORD" | "LWORD" | "BYTE" => {
                // Para valores numéricos inteiros, conversão para comparação
                if let (Ok(old), Ok(new)) = (old_value.parse::<i64>(), new_value.parse::<i64>()) {
                    old != new
                } else {
                    old_value != new_value
                }
            },
            _ => {
                // Para strings e booleanos, comparação direta
                old_value != new_value
            }
        }
    }
    */
    
    
    // Obter tags que precisam ser enviados baseado no intervalo
    // ⚠️ NOTA: Esta função reseta o estado - usar apenas para broadcast único!
    pub async fn get_tags_for_broadcast(&self, interval_s: u64) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        let mut keys_to_update = Vec::new();
        
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let should_send = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => false,
            };
            
            if should_send {
                result.insert(cached.tag_name.clone(), cached.value.clone());
                keys_to_update.push(entry.key().clone());
            }
        }
        
        for key in keys_to_update {
            if let Some(mut cached_mut) = self.tag_cache.get_mut(&key) {
                cached_mut.last_sent = now;
                cached_mut.changed = false;
            }
        }
        
        result
    }
    
    // 🚀 OTIMIZAÇÃO: Buscar APENAS tags on_change usando índice secundário
    // Performance: O(on_change_tags) ao invés de O(all_tags)
    pub fn get_on_change_tags_fast(&self) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        
        // Iterar APENAS sobre tags no índice on_change (muito mais rápido!)
        for entry in self.on_change_index.iter() {
            let tag_key = entry.key();
            if let Some(cached) = self.tag_cache.get(tag_key) {
                // Verificar se realmente mudou e pode ser enviado
                if cached.changed {
                    let time_since_last = if now >= cached.last_sent {
                        (now - cached.last_sent) / 1_000_000_000
                    } else {
                        0
                    };
                    // Mínimo 1 segundo entre envios para evitar spam
                    if time_since_last >= 1 {
                        result.insert(cached.tag_name.clone(), cached.value.clone());
                    }
                }
            }
        }
        
        result
    }
    
    // 🚀 ESTATÍSTICAS DO ÍNDICE ON_CHANGE
    pub fn get_on_change_stats(&self) -> (usize, usize) {
        let total_tags = self.tag_cache.len();
        let on_change_tags = self.on_change_index.len();
        (on_change_tags, total_tags)
    }
    
    // 🆕 OBTER TAGS SEM RESETAR ESTADO (para múltiplos clientes)
    // Usado quando vários clientes precisam receber os mesmos dados de on_change
    pub async fn get_tags_for_broadcast_readonly(&self, interval_s: u64) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let should_send = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => false,
            };
            
            if should_send {
                result.insert(cached.tag_name.clone(), cached.value.clone());
            }
        }
        
        result
    }
    
    // 🛡️ FIX RACE CONDITION: Obter E marcar atomicamente (retorna tags + marca como enviado)
    pub async fn get_and_mark_tags_atomic(&self, interval_s: u64) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        
        // 🛡️ OPERAÇÃO ATÔMICA: Leitura + Reset em uma única iteração mutável
        for mut entry in self.tag_cache.iter_mut() {
            let cached = entry.value_mut();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let should_send = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => false,
            };
            
            if should_send {
                result.insert(cached.tag_name.clone(), cached.value.clone());
                // 🛡️ RESET ATÔMICO DENTRO DA MESMA ITERAÇÃO
                cached.last_sent = now;
                cached.changed = false;
            }
        }
        
        result
    }
    
    // 🆕 RESETAR ESTADO DE TAGS ENVIADOS (chamar UMA VEZ após enviar para todos os clientes)
    // ⚠️ DEPRECATED: Usar get_and_mark_tags_atomic para evitar race conditions
    pub async fn mark_tags_as_sent(&self, interval_s: u64) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        
        for mut entry in self.tag_cache.iter_mut() {
            let cached = entry.value_mut();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let was_sent = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => false,
            };
            
            if was_sent {
                cached.last_sent = now;
                cached.changed = false;
            }
        }
    }
    
    // ✅ FUNÇÃO AUXILIAR: Atualizar status dos tags enviados
    fn update_sent_tags(&self, keys_to_update: Vec<String>, now: u128) {
        for key in keys_to_update {
            if let Some(mut cached_mut) = self.tag_cache.get_mut(&key) {
                cached_mut.last_sent = now;
                cached_mut.changed = false;
            }
        }
    }
    
    // 🆕 OBTER TAGS AGRUPADOS POR PLC (para broadcast estruturado)
    // Retorna: HashMap<plc_ip, HashMap<tag_name, value>>
    // Isso permite que o frontend receba dados organizados por PLC
    pub async fn get_tags_grouped_by_plc(&self, interval_s: u64) -> HashMap<String, HashMap<String, String>> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result: HashMap<String, HashMap<String, String>> = HashMap::new();
        
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let should_send = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => false,
            };
            
            if should_send {
                // Agrupar por PLC IP
                result
                    .entry(cached.plc_ip.clone())
                    .or_insert_with(HashMap::new)
                    .insert(cached.tag_name.clone(), cached.value.clone());
            }
        }
        
        result
    }
    
    // 🆕 OBTER LISTA DE PLCs ATIVOS NO CACHE
    pub fn get_active_plc_ips(&self) -> Vec<String> {
        let mut plc_ips: std::collections::HashSet<String> = std::collections::HashSet::new();
        for entry in self.tag_cache.iter() {
            plc_ips.insert(entry.value().plc_ip.clone());
        }
        plc_ips.into_iter().collect()
    }
    
    // 🆕 CONTAR TAGS POR PLC (para diagnóstico)
    pub fn get_tag_count_by_plc(&self) -> HashMap<String, usize> {
        let mut counts: HashMap<String, usize> = HashMap::new();
        for entry in self.tag_cache.iter() {
            *counts.entry(entry.value().plc_ip.clone()).or_insert(0) += 1;
        }
        counts
    }
    
    // 🆕 OBTER TAGS FILTRADOS POR ÁREA E CATEGORIA (para SUBSCRIBE inteligente)
    // ⚠️ NOTA: Esta função NÃO reseta estado - para múltiplos clientes
    pub async fn get_tags_filtered(
        &self, 
        interval_s: u64,
        plc_ips: &std::collections::HashSet<String>,
        areas: &std::collections::HashSet<String>,
        categories: &std::collections::HashSet<String>,
        include_all_faults: bool
    ) -> HashMap<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_nanos();
        let mut result = HashMap::new();
        
        let has_plc_filter = !plc_ips.is_empty();
        let has_area_filter = !areas.is_empty();
        let has_category_filter = !categories.is_empty();
        
        for entry in self.tag_cache.iter() {
            let cached = entry.value();
            
            // 1. Filtrar por PLC
            if has_plc_filter && !plc_ips.contains(&cached.plc_ip) {
                continue;
            }
            
            // 2. Filtrar por área (se configurado)
            if has_area_filter {
                let tag_area = cached.area.as_deref().unwrap_or("");
                let area_match = areas.contains(tag_area);
                
                // Exceção: se include_all_faults e é uma falha/evento, incluir independente da área
                let is_fault_or_event = cached.category.as_deref() == Some("FAULT") || 
                                        cached.category.as_deref() == Some("EVENT");
                
                if !area_match && !(include_all_faults && is_fault_or_event) {
                    continue;
                }
            }
            
            // 3. Filtrar por categoria (se configurado)
            if has_category_filter {
                let tag_category = cached.category.as_deref().unwrap_or("");
                let category_match = categories.contains(tag_category);
                
                // Exceção: sempre incluir FAULT e EVENT se include_all_faults
                let is_fault_or_event = tag_category == "FAULT" || tag_category == "EVENT";
                
                if !category_match && !(include_all_faults && is_fault_or_event) {
                    continue;
                }
            }
            
            // 4. Verificar timing
            let time_since_last = if now >= cached.last_sent {
                (now - cached.last_sent) / 1_000_000_000
            } else {
                0
            };
            
            // 🚀 OTIMIZAÇÃO: Usar enum ao invés de string comparison
            let should_send = match cached.collect_mode_enum {
                CollectMode::OnChange => cached.changed && time_since_last >= interval_s as u128,
                CollectMode::Interval => cached.interval_s == interval_s && time_since_last >= interval_s as u128,
                CollectMode::Unknown => time_since_last >= interval_s as u128, // Default: enviar baseado no intervalo
            };
            
            if should_send {
                result.insert(cached.tag_name.clone(), cached.value.clone());
            }
        }
        
        result
    }
    
    // 🆕 INVALIDAR CACHE DE UM PLC ESPECÍFICO (chamado quando tags mudam)
    pub fn invalidate_cache(&self, plc_ip: &str) {
        self.tag_mappings_cache.remove(plc_ip);
        println!("🔄 Cache invalidado para PLC {}", plc_ip);
    }
    
    // 🆕 INVALIDAR TODO O CACHE
    pub fn invalidate_all_cache(&self) {
        self.tag_mappings_cache.clear();
        println!("🔄 Todo cache de tags invalidado");
    }

    // ✅ OTIMIZAÇÃO: Sistema LRU automático para controle de memória
    pub async fn enforce_memory_limits(&self) -> bool {
        let current_size = self.tag_cache.len();
        
        // Se não excedeu o limite, não fazer nada
        if current_size <= self.cache_size_limit {
            return false;
        }
        
        // Calcular quantas entradas remover (20% das mais antigas)
        let entries_to_remove = (current_size - self.cache_size_limit + current_size / 5).min(current_size / 2);
        
        println!("🧹 Limpeza de cache: {} entradas, removendo {} antigas", current_size, entries_to_remove);
        
        // Coletar entries ordenadas por last_sent (mais antigo primeiro)
        let mut entries_by_age: Vec<(String, u128)> = self.tag_cache
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().last_sent))
            .collect();
        
        // Ordenar por timestamp (mais antigo primeiro)
        entries_by_age.sort_by_key(|(_, timestamp)| *timestamp);
        
        // Remover as mais antigas
        let mut removed = 0;
        for (key, _) in entries_by_age.into_iter().take(entries_to_remove) {
            self.tag_cache.remove(&key);
            self.change_tracking.remove(&key);
            removed += 1;
        }
        
        // Atualizar timestamp da última limpeza
        let mut last_cleanup = self.last_cleanup.write().await;
        *last_cleanup = std::time::Instant::now();
        
        println!("✅ Cache limpo: {} entradas removidas, {} restantes", removed, self.tag_cache.len());
        true
    }

    // ✅ OTIMIZAÇÃO: Verificar se precisa de limpeza automática  
    pub async fn should_cleanup(&self) -> bool {
        let current_size = self.tag_cache.len();
        let threshold = self.memory_pressure_threshold.load(Ordering::Relaxed);
        
        // Verificar se excedeu threshold
        if current_size <= threshold {
            return false;
        }
        
        // Verificar se faz tempo suficiente desde última limpeza (mínimo 30 segundos)
        let last_cleanup = self.last_cleanup.read().await;
        last_cleanup.elapsed().as_secs() >= 30
    }

    // ✅ OTIMIZAÇÃO: Estatísticas de uso de memória
    pub fn get_memory_stats(&self) -> (usize, usize, usize, f64) {
        let tag_cache_size = self.tag_cache.len();
        let mappings_cache_size = self.tag_mappings_cache.len();
        let change_tracking_size = self.change_tracking.len();
        let memory_usage_pct = (tag_cache_size as f64 / self.cache_size_limit as f64) * 100.0;
        
        (tag_cache_size, mappings_cache_size, change_tracking_size, memory_usage_pct)
    }
}

impl WebSocketServer {
    pub fn new(
        config: WebSocketConfig,
        app_handle: AppHandle,
        database: Arc<Database>,
        tcp_server: Option<Arc<RwLock<Option<TcpServer>>>>,
    ) -> Self {
        // 🛡️ Configurar backpressure adaptativo
        let backpressure_config = BackpressureConfig {
            initial_capacity: 2000,      // Capacidade inicial
            max_capacity: 15000,         // Suporta até 15k mensagens em fila
            sampling_threshold_pct: 70.0, // Inicia sampling em 70%
            expand_threshold_pct: 85.0,   // Expande buffer em 85%
            recovery_threshold_pct: 40.0, // Volta ao normal em 40%
            min_sample_interval_ms: 25,   // 25ms mínimo entre samples
            expansion_factor: 1.5,        // Expande 50% por vez
        };
        
        println!("🛡️ Sistema de Backpressure Adaptativo inicializado:");
        println!("   📊 Capacidade inicial: {}", backpressure_config.initial_capacity);
        println!("   📈 Capacidade máxima: {}", backpressure_config.max_capacity);
        println!("   🎯 Threshold sampling: {}%", backpressure_config.sampling_threshold_pct);
        println!("   🔴 Threshold expansão: {}%", backpressure_config.expand_threshold_pct);
        println!("   🟢 Threshold recuperação: {}%", backpressure_config.recovery_threshold_pct);
        
        Self {
            config,
            is_running: Arc::new(AtomicBool::new(false)),
            connected_clients: Arc::new(DashMap::new()),
            active_connections: Arc::new(AtomicU64::new(0)),
            total_connections: Arc::new(AtomicU64::new(0)),
            messages_sent: Arc::new(AtomicU64::new(0)),
            bytes_sent: Arc::new(AtomicU64::new(0)),
            start_time: std::time::SystemTime::now(),
            app_handle,
            database,
            tcp_server,
            broadcast_sender: None,
            server_handle: None,
            broadcast_handle: None,
            interval_handles: Arc::new(TokioMutex::new(Vec::new())),
            smart_cache: Arc::new(SmartCache::new()),
            cache_updater_handle: None,
            // ✅ MELHORIA: Inicializar channels por PLC
            plc_broadcast_channels: Arc::new(DashMap::new()),
            // 🚀 MELHORIA FASE 2: Inicializar sistema de batching
            batched_payloads: Arc::new(DashMap::new()),
            // 🛡️ BACKPRESSURE ADAPTATIVO
            backpressure: Arc::new(AdaptiveBackpressure::new(backpressure_config)),
        }
    }

    /// Obtém métricas do sistema de backpressure
    pub fn get_backpressure_metrics(&self) -> BackpressureMetrics {
        self.backpressure.get_metrics()
    }
    
    /// 🆕 DIAGNÓSTICO: Obter contagem de tags por PLC
    pub fn get_tag_count_by_plc(&self) -> HashMap<String, usize> {
        self.smart_cache.get_tag_count_by_plc()
    }
    
    /// 🆕 DIAGNÓSTICO: Obter lista de PLCs ativos no cache
    pub fn get_active_plc_ips(&self) -> Vec<String> {
        self.smart_cache.get_active_plc_ips()
    }

    // ✅ MELHORIA: Cliente se inscreve em PLCs específicos
    pub async fn subscribe_to_plcs(&self, client_id: u64, plc_ips: Vec<String>) -> Result<(), String> {
        if let Some(mut client) = self.connected_clients.get_mut(&client_id) {
            // Primeiro, coletar PLCs e criar channels se necessário
            for plc_ip in &plc_ips {
                if !self.plc_broadcast_channels.contains_key(plc_ip) {
                    let (tx, _) = broadcast::channel::<String>(1000); // 🚀 MELHORIA FASE 2: Buffer expandido para PLCs
                    self.plc_broadcast_channels.insert(plc_ip.clone(), tx);
                }
            }
            
            // Depois, atualizar subscrições do cliente
            {
                let mut subscribed_plcs = client.subscribed_plcs.write().await;
                subscribed_plcs.clear();
                for plc_ip in &plc_ips {
                    subscribed_plcs.insert(plc_ip.clone());
                }
            } // RwLock é dropado aqui
            
            // Agora podemos modificar client_type
            client.client_type = ClientType::Filtered(plc_ips);
            Ok(())
        } else {
            Err("Cliente não encontrado".to_string())
        }
    }

    // 🎯 MELHORIA FASE 2: Broadcasting otimizado APENAS por subscription filtrado
    pub async fn broadcast_to_plc_subscribers(&self, plc_ip: &str, message: String) {
        // ✅ NOVO: Broadcast APENAS filtrado - eliminando global redundante
        if let Some(tx) = self.plc_broadcast_channels.get(plc_ip) {
            let _ = tx.send(message.clone());
        }
        
        // 🚫 REMOVIDO: Broadcast global redundante (economia de 50% de tráfego)
        // Clients agora recebem APENAS dados filtrados através de seus canais específicos
        println!("📡 Broadcast filtrado apenas - PLC: {}, payload size: {} bytes", plc_ip, message.len());
    }

    // Função para detectar interfaces de rede disponíveis
    pub fn get_available_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
        use std::process::Command;
        
        let mut interfaces = Vec::new();
        
        interfaces.push(NetworkInterface {
            name: "Localhost".to_string(),
            ip: "127.0.0.1".to_string(),
            is_active: true,
            interface_type: "Loopback".to_string(),
        });
        
        interfaces.push(NetworkInterface {
            name: "Todas as Interfaces".to_string(),
            ip: "0.0.0.0".to_string(),
            is_active: true,
            interface_type: "All".to_string(),
        });

        #[cfg(windows)]
        {
            if let Ok(output) = Command::new("ipconfig").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_windows_interfaces(&output_str, &mut interfaces);
            }
        }
        
        #[cfg(unix)]
        {
            if let Ok(output) = Command::new("ip").args(["addr", "show"]).output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_unix_interfaces(&output_str, &mut interfaces);
            } else if let Ok(output) = Command::new("ifconfig").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Self::parse_unix_ifconfig(&output_str, &mut interfaces);
            }
        }
        
        Ok(interfaces)
    }

    #[cfg(windows)]
    fn parse_windows_interfaces(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_adapter = String::new();
        
        for line in lines {
            let line = line.trim();
            
            if line.contains("Adaptador") || line.contains("adapter") {
                current_adapter = line.to_string();
            }
            
            if line.starts_with("Endereço IPv4") || line.starts_with("IPv4 Address") {
                if let Some(ip_part) = line.split(':').nth(1) {
                    let ip = ip_part.trim().replace("(Preferencial)", "").trim().to_string();
                    if !ip.is_empty() && ip != "127.0.0.1" {
                        interfaces.push(NetworkInterface {
                            name: if current_adapter.is_empty() { 
                                format!("Interface {}", ip) 
                            } else { 
                                current_adapter.clone() 
                            },
                            ip: ip.clone(),
                            is_active: true,
                            interface_type: "Ethernet/WiFi".to_string(),
                        });
                    }
                }
            }
        }
    }

    #[cfg(unix)]
    fn parse_unix_interfaces(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_interface = String::new();
        
        for line in lines {
            if !line.starts_with(' ') && line.contains(':') {
                current_interface = line.split(':').next().unwrap_or("").trim().to_string();
            }
            
            if line.trim().starts_with("inet ") && !line.contains("127.0.0.1") {
                if let Some(ip_part) = line.trim().split_whitespace().nth(1) {
                    let ip = ip_part.split('/').next().unwrap_or("").to_string();
                    if !ip.is_empty() {
                        interfaces.push(NetworkInterface {
                            name: current_interface.clone(),
                            ip: ip.clone(),
                            is_active: true,
                            interface_type: "Network".to_string(),
                        });
                    }
                }
            }
        }
    }

    #[cfg(unix)]
    fn parse_unix_ifconfig(output: &str, interfaces: &mut Vec<NetworkInterface>) {
        let lines: Vec<&str> = output.lines().collect();
        let mut current_interface = String::new();
        
        for line in lines {
            if !line.starts_with(' ') && !line.starts_with('\t') && line.contains(':') {
                current_interface = line.split(':').next().unwrap_or("").trim().to_string();
            }
            
            if line.trim().contains("inet ") && !line.contains("127.0.0.1") {
                if let Some(inet_part) = line.split("inet").nth(1) {
                    if let Some(ip) = inet_part.trim().split_whitespace().next() {
                        if !ip.is_empty() {
                            interfaces.push(NetworkInterface {
                                name: current_interface.clone(),
                                ip: ip.to_string(),
                                is_active: true,
                                interface_type: "Network".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    pub async fn start(&mut self) -> Result<String, String> {
        println!("🟢 WebSocket start() chamado");
        
        if self.is_running.load(Ordering::SeqCst) {
            return Err("WebSocket server já está rodando".to_string());
        }

        println!("🟢 Preparando endereços de bind...");
        
        let bind_addresses = if self.config.bind_interfaces.is_empty() || 
            (self.config.bind_interfaces.len() == 1 && self.config.bind_interfaces[0] == self.config.host) {
            vec![format!("{}:{}", self.config.host, self.config.port)]
        } else {
            self.config.bind_interfaces.iter()
                .map(|ip| format!("{}:{}", ip, self.config.port))
                .collect()
        };

        let mut listeners = Vec::new();
        let mut bound_addresses = Vec::new();

        println!("🟢 Tentando bind em {} endereços: {:?}", bind_addresses.len(), bind_addresses);

        for bind_addr in bind_addresses.iter() {
            println!("🟢 Tentando bind em: {}", bind_addr);
            match TcpListener::bind(&bind_addr).await {
                Ok(listener) => {
                    println!("🚀 WebSocket server iniciado em: {}", bind_addr);
                    bound_addresses.push(bind_addr.clone());
                    listeners.push(listener);
                },
                Err(e) => {
                    println!("⚠️ Erro ao fazer bind em {}: {}", bind_addr, e);
                }
            }
        }

        println!("🟢 Bind completo: {} de {} endereços funcionando", listeners.len(), bound_addresses.len());

        if listeners.is_empty() {
            return Err("Não foi possível fazer bind em nenhum endereço configurado".to_string());
        }

        // 🚀 MELHORIA FASE 2: Buffer expandido para suportar 7500+ tags com múltiplas subscriptions
        let (broadcast_tx, _) = broadcast::channel::<String>(5000); // Expandido para alta capacidade
        self.broadcast_sender = Some(broadcast_tx.clone());

        self.is_running.store(true, Ordering::SeqCst);

        let _ = self.app_handle.emit("websocket-server-started", serde_json::json!({
            "status": "started",
            "addresses": bound_addresses,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

        let is_running = self.is_running.clone();
        let connected_clients = self.connected_clients.clone();
        let active_connections = self.active_connections.clone();
        let total_connections = self.total_connections.clone();
        let messages_sent = self.messages_sent.clone();
        let bytes_sent = self.bytes_sent.clone();
        let app_handle = self.app_handle.clone();
        let max_clients = self.config.max_clients;
        let database = self.database.clone(); // ✅ ADICIONAR DATABASE
        let smart_cache = self.smart_cache.clone(); // ✅ ADICIONAR SMART_CACHE

        let mut server_handles = Vec::new();
        
        for listener in listeners {
            let broadcast_tx_clone = broadcast_tx.clone();
            let is_running_clone = is_running.clone();
            let connected_clients_clone = connected_clients.clone();
            let active_connections_clone = active_connections.clone();
            let total_connections_clone = total_connections.clone();
            let messages_sent_clone = messages_sent.clone();
            let bytes_sent_clone = bytes_sent.clone();
            let app_handle_clone = app_handle.clone();
            let max_clients_clone = max_clients;
            let database_clone = database.clone(); // ✅ CLONE DATABASE
            let smart_cache_clone = smart_cache.clone(); // ✅ CLONE SMART_CACHE

            let server_task = tokio::spawn(async move {
                while is_running_clone.load(Ordering::SeqCst) {
                    if let Ok((stream, addr)) = listener.accept().await {
                        if active_connections_clone.load(Ordering::SeqCst) >= max_clients_clone as u64 {
                            println!("⚠️ Limite de conexões atingido, rejeitando {}", addr);
                            drop(stream);
                            continue;
                        }

                        let client_id = total_connections_clone.fetch_add(1, Ordering::SeqCst) + 1;
                        let client = ConnectedClient {
                            id: client_id,
                            address: addr,
                            connected_at: std::time::SystemTime::now(),
                            messages_received: Arc::new(AtomicU64::new(0)),
                            // ✅ MELHORIA: Inicializar com comportamento global (backward compatible)
                            subscribed_plcs: Arc::new(RwLock::new(std::collections::HashSet::new())),
                            client_type: ClientType::Global, // Comportamento padrão mantido
                            // 🆕 FILTROS GRANULARES - Inicialmente vazios (recebe tudo)
                            subscribed_areas: Arc::new(RwLock::new(std::collections::HashSet::new())),
                            subscribed_categories: Arc::new(RwLock::new(std::collections::HashSet::new())),
                            include_all_faults: Arc::new(AtomicBool::new(false)),
                            // 🆕 Canal será definido em handle_client
                            filtered_tx: None,
                        };

                        connected_clients_clone.insert(client_id, client);
                        active_connections_clone.fetch_add(1, Ordering::SeqCst);

                        println!("✅ Cliente WebSocket conectado: {} (ID: {})", addr, client_id);

                        let _ = app_handle_clone.emit("websocket-client-connected", serde_json::json!({
                            "client_id": client_id,
                            "address": addr.to_string(),
                            "total_clients": active_connections_clone.load(Ordering::SeqCst)
                        }));

                        let broadcast_rx = broadcast_tx_clone.subscribe();
                        let connected_clients_task = connected_clients_clone.clone();
                        let active_connections_task = active_connections_clone.clone();
                        let messages_sent_task = messages_sent_clone.clone();
                        let bytes_sent_task = bytes_sent_clone.clone();
                        let app_handle_task = app_handle_clone.clone();
                        let database_task = database_clone.clone(); // ✅ CLONE PARA TASK
                        let smart_cache_task = smart_cache_clone.clone(); // ✅ CLONE PARA TASK

                        tokio::spawn(async move {
                            if let Err(e) = Self::handle_client(
                                stream,
                                client_id,
                                addr,
                                broadcast_rx,
                                connected_clients_task,
                                active_connections_task,
                                messages_sent_task,
                                bytes_sent_task,
                                app_handle_task,
                                database_task, // ✅ PASSAR DATABASE
                                smart_cache_task, // ✅ PASSAR SMART_CACHE
                            )
                            .await
                            {
                                println!("❌ Erro no cliente {}: {}", client_id, e);
                            }
                        });
                    }
                }
            });

            server_handles.push(server_task);
        }

        if let Some(first_handle) = server_handles.into_iter().next() {
            self.server_handle = Some(first_handle);
        }

        // Iniciar sistema inteligente de cache + broadcasting
        self.start_smart_broadcasting(broadcast_tx).await?;

        Ok(format!("WebSocket server rodando em: {}", bound_addresses.join(", ")))
    }

    // 🚀 MELHORIA FASE 2: Sistema de batching inteligente para otimização de serialização
    fn create_subscription_hash(areas: &std::collections::HashSet<String>, categories: &std::collections::HashSet<String>, include_all_faults: bool) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        let mut areas_vec: Vec<_> = areas.iter().collect();
        areas_vec.sort();
        areas_vec.hash(&mut hasher);
        
        let mut cats_vec: Vec<_> = categories.iter().collect();
        cats_vec.sort();
        cats_vec.hash(&mut hasher);
        
        include_all_faults.hash(&mut hasher);
        hasher.finish()
    }

    async fn get_or_create_batched_payload(
        &self, 
        filter_hash: u64, 
        areas: &std::collections::HashSet<String>,
        categories: &std::collections::HashSet<String>, 
        include_all_faults: bool,
        client_data: HashMap<String, String>
    ) -> (String, String) { // Retorna (JSON, MessagePack)
        
        // Verificar se já temos payload cached para este filtro
        if let Some(batched) = self.batched_payloads.get_mut(&filter_hash) {
            // Cache hit - verificar se ainda está válido (1 segundo)
            if batched.last_update.elapsed().as_millis() < 1000 {
                if let (Some(json), Some(msgpack)) = (&batched.cached_json, &batched.cached_msgpack) {
                    return (json.clone(), msgpack.clone());
                }
            }
        }
        
        // Cache miss ou expirado - gerar novos payloads
        let sorted_map = sort_tags_naturally(client_data);
        
        let json_payload = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
        
        let msgpack_payload = match rmp_serde::to_vec(&sorted_map) {
            Ok(msgpack_bytes) => {
                let base64_data = base64_encode(&msgpack_bytes);
                format!("MSGPACK:{}", base64_data)
            }
            Err(_) => json_payload.clone(),
        };
        
        // Atualizar cache
        let filter = SubscriptionFilter {
            areas: areas.iter().cloned().collect(),
            categories: categories.iter().cloned().collect(),
            include_all_faults,
        };
        
        let batched_payload = BatchedPayload {
            filter,
            client_ids: Vec::new(), // Será preenchido conforme necessário
            cached_json: Some(json_payload.clone()),
            cached_msgpack: Some(msgpack_payload.clone()),
            last_update: std::time::Instant::now(),
        };
        
        self.batched_payloads.insert(filter_hash, batched_payload);
        
        (json_payload, msgpack_payload)
    }

    // 🚀 SISTEMA INTELIGENTE: Cache + Broadcasting sem bloqueios TCP
    async fn start_smart_broadcasting(&mut self, broadcast_tx: broadcast::Sender<String>) -> Result<(), String> {
        let database = self.database.clone();
        let is_running = self.is_running.clone();
        let smart_cache = self.smart_cache.clone();
        let backpressure = self.backpressure.clone();

        println!("🚀 SISTEMA INTELIGENTE: Cache + Broadcasting sem bloqueios!");
        println!("📦 Cache de tags habilitado - ZERO consultas ao banco por pacote!");
        println!("🛡️ Backpressure Adaptativo ATIVO - Auto-correção automática!");

        // 🚀 Usar capacidade do backpressure para o canal
        let initial_capacity = backpressure.get_metrics().current_capacity;
        let (update_tx, mut update_rx) = mpsc::channel::<CacheUpdateData>(initial_capacity);
        
        // TASK 1: CACHE UPDATER
        let is_running_cache = is_running.clone();
        let smart_cache_updater = smart_cache.clone();
        let database_updater = database.clone();
        let app_handle_cache = self.app_handle.clone();
        let backpressure_processor = backpressure.clone();
        
        // ✅ TASK 1A: PROCESSADOR ATÔMICO DE CACHE COM BACKPRESSURE
        let _atomic_cache_processor = tokio::spawn({
            let smart_cache_clone = smart_cache_updater.clone();
            let database_clone = database_updater.clone();
            let is_running_clone = is_running_cache.clone();
            let bp = backpressure_processor.clone();
            let app_handle_processor = app_handle_cache.clone(); // 🆕 Para emitir eventos
            
            async move {
                let mut packets_processed: u64 = 0;
                let mut last_cache_refresh = std::time::Instant::now();
                let mut last_bp_log = std::time::Instant::now();
                
                while let Some(update_data) = update_rx.recv().await {
                    if !is_running_clone.load(Ordering::SeqCst) {
                        break;
                    }
                    
                    // 🛡️ REGISTRAR MENSAGEM PROCESSADA NO BACKPRESSURE
                    bp.record_processed();
                    packets_processed += 1;
                    
                    // 🔧 REFRESH CACHE A CADA 5 MINUTOS (300 segundos)
                    let cache_elapsed_secs = last_cache_refresh.elapsed().as_secs();
                    if cache_elapsed_secs > 300 {
                        println!("🔄 Refresh periódico do cache de tags ({} pacotes processados)", packets_processed);
                        smart_cache_clone.load_tag_mappings_to_cache(&update_data.plc_ip, &database_clone).await;
                        last_cache_refresh = std::time::Instant::now();
                    }
                    
                    // 🚀 LIMPEZA ULTRA-REDUZIDA: Só a cada 2000 pacotes
                    if packets_processed % 2000 == 0 && smart_cache_clone.should_cleanup().await {
                        println!("🧹 Limpeza automática (pacote {})", packets_processed);
                        smart_cache_clone.enforce_memory_limits().await;
                    }
                    
                    // ✅ ATUALIZAÇÃO ATÔMICA (usa cache, não banco!)
                    smart_cache_clone.update_from_tcp(
                        &update_data.plc_ip,
                        &update_data.variables,
                        &database_clone
                    ).await;
                    
                    // 📊 LOG PERIÓDICO COM MÉTRICAS (5 min em produção, só critical events no meio)
                    if last_bp_log.elapsed().as_secs() >= 300 {
                        let metrics = bp.get_metrics();
                        let (cache_size, _mappings_size, _tracking_size, memory_pct) = smart_cache_clone.get_memory_stats();
                        println!("📊 WebSocket Status:");
                        println!("   📦 Pacotes: {} | Cache: {} tags ({:.1}%)", packets_processed, cache_size, memory_pct);
                        println!("   🛡️ Backpressure: {} | Uso: {:.1}% | Capacidade: {}", 
                                metrics.state, metrics.usage_percentage, metrics.current_capacity);
                        println!("   📈 Processados: {} | Sampled: {} | Dropped: {}", 
                                metrics.messages_processed, metrics.messages_sampled, metrics.messages_dropped);
                        if metrics.auto_expansions > 0 || metrics.auto_recoveries > 0 {
                            println!("   🔄 Auto-expansões: {} | Auto-recuperações: {}", 
                                    metrics.auto_expansions, metrics.auto_recoveries);
                        }
                        
                        // 🆕 EMITIR EVENTOS PARA FRONTEND QUANDO ESTADOS CRÍTICOS
                        let state_lower = metrics.state.to_lowercase();
                        if state_lower == "sampling" || state_lower == "expanded" {
                            let _ = app_handle_processor.emit("backpressure-warning", serde_json::json!({
                                "state": metrics.state,
                                "usage_percentage": metrics.usage_percentage,
                                "current_capacity": metrics.current_capacity,
                                "sampling_rate": metrics.sampling_rate,
                                "messages_dropped": metrics.messages_dropped,
                                "messages_sampled": metrics.messages_sampled,
                                "auto_expansions": metrics.auto_expansions
                            }));
                        }
                        
                        // Alertar se muitos drops
                        let total_messages = metrics.messages_processed + metrics.messages_dropped;
                        if total_messages > 0 {
                            let drop_rate = (metrics.messages_dropped as f64 / total_messages as f64) * 100.0;
                            if drop_rate > 5.0 {
                                let _ = app_handle_processor.emit("backpressure-critical", serde_json::json!({
                                    "state": metrics.state,
                                    "drop_rate_percent": drop_rate,
                                    "messages_dropped": metrics.messages_dropped,
                                    "messages_processed": metrics.messages_processed
                                }));
                            }
                        }
                        
                        // Alertar se cache de tags está alto
                        if memory_pct > 80.0 {
                            let _ = app_handle_processor.emit("tag-cache-warning", serde_json::json!({
                                "cache_size": cache_size,
                                "usage_percent": memory_pct
                            }));
                        }
                        
                        last_bp_log = std::time::Instant::now();
                    }
                }
                println!("✅ Atomic cache processor finalizado ({} pacotes)", packets_processed);
            }
        });
        
        // ✅ TASK 1B: EVENT LISTENER COM BACKPRESSURE ADAPTATIVO
        let backpressure_listener = backpressure.clone();
        let cache_handle = tokio::spawn(async move {
            use tauri::Listener;
            
            let _unlisten_id = app_handle_cache.listen("websocket-cache-update", move |event| {
                let payload = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload) {
                    let plc_ip = data["plc_ip"].as_str().unwrap_or("");
                    if let Some(variables_array) = data["variables"].as_array() {
                        
                        // 🛡️ BACKPRESSURE: Verificar se devemos aceitar esta mensagem
                        if !backpressure_listener.on_message_arrival() {
                            // Mensagem foi sampleada - ignorar sem logar (muito frequente)
                            return;
                        }
                        
                        let mut variables = Vec::new();
                        for var in variables_array {
                            if let (Some(name), Some(value), Some(data_type)) = (
                                var["name"].as_str(),
                                var["value"].as_str(), 
                                var["data_type"].as_str()
                            ) {
                                variables.push(crate::tcp_server::PlcVariable {
                                    name: name.to_string(),
                                    value: value.to_string(),
                                    data_type: data_type.to_string(),
                                    unit: var["unit"].as_str().map(|s| s.to_string()),
                                });
                            }
                        }
                        
                        let update_data = CacheUpdateData {
                            plc_ip: plc_ip.to_string(),
                            variables,
                            timestamp: data["timestamp"].as_u64().unwrap_or(0),
                        };
                        
                        // 🛡️ BACKPRESSURE: Tratar erros com registro de métricas
                        if let Err(e) = update_tx.try_send(update_data.clone()) {
                            match e {
                                mpsc::error::TrySendError::Full(_) => {
                                    // Buffer cheio mesmo com backpressure - registrar drop
                                    backpressure_listener.record_dropped();
                                    // Log apenas ocasionalmente para não sobrecarregar
                                    let dropped = backpressure_listener.get_metrics().messages_dropped;
                                    if dropped % 100 == 1 {
                                        println!("⚠️ Backpressure: {} mensagens dropadas (buffer cheio)", dropped);
                                    }
                                }
                                mpsc::error::TrySendError::Closed(_) => {
                                    println!("❌ Cache update channel fechado - parando updates");
                                    return;
                                }
                            }
                        }
                    }
                }
            });
            
            while is_running_cache.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            
            println!("Cache listener finalizado (ID: {})", _unlisten_id);
        });
        
        self.cache_updater_handle = Some(cache_handle);

        // TASK 2: BROADCASTING INTELIGENTE
        let smart_cache_broadcast = smart_cache.clone();
        let is_running_broadcast = is_running.clone();
        
        let mut handles = Vec::new();
        
        // BATCH 1: Intervalos rápidos (1-3s) - AGORA COM FILTRAGEM POR CLIENTE!
        let fast_batch_handle = tokio::spawn({
            let broadcast_tx_clone = broadcast_tx.clone();
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            let connected_clients_clone = self.connected_clients.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_millis(500));
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // 🆕 ITERAR SOBRE CADA CLIENTE CONECTADO E ENVIAR DADOS FILTRADOS
                    for client_entry in connected_clients_clone.iter() {
                        let client = client_entry.value();
                        
                        // 🛡️ FIX RACE CONDITION: Usar método atômico para snapshot de filtros
                        let (subscribed_plcs, subscribed_areas, subscribed_categories, include_all_faults) = 
                            client.get_filter_snapshot().await;
                        
                        let has_filters = !subscribed_areas.is_empty() || !subscribed_categories.is_empty();
                        
                        // Coletar dados para este cliente
                        let mut client_data: HashMap<String, String> = HashMap::new();
                        
                        if has_filters {
                            // 🎯 CLIENTE TEM FILTROS - Usar get_tags_filtered (readonly)
                            for interval_s in 1..=3u64 {
                                let filtered_tags = smart_cache_clone.get_tags_filtered(
                                    interval_s,
                                    &subscribed_plcs,
                                    &subscribed_areas,
                                    &subscribed_categories,
                                    include_all_faults
                                ).await;
                                client_data.extend(filtered_tags);
                            }
                            
                            // 🔄 ADICIONAR TAGS ON_CHANGE FILTRADAS (independente de intervalo)
                            let on_change_filtered = smart_cache_clone.get_tags_filtered(
                                0,
                                &subscribed_plcs,
                                &subscribed_areas,
                                &subscribed_categories,
                                include_all_faults
                            ).await;
                            client_data.extend(on_change_filtered);
                        } else {
                            // 📡 CLIENTE SEM FILTROS - Usar readonly para não afetar outros clientes
                            for interval_s in 1..=3u64 {
                                let tag_data = smart_cache_clone.get_tags_for_broadcast_readonly(interval_s).await;
                                client_data.extend(tag_data);
                            }
                            
                            // 🔄 ADICIONAR TAGS ON_CHANGE (independente de intervalo)
                            let on_change_data = smart_cache_clone.get_tags_for_broadcast_readonly(0).await;
                            client_data.extend(on_change_data);
                        }
                        
                        // 🚀 MELHORIA FASE 2: Enviar dados com batching inteligente (BATCH 1 - Rápido)
                        if !client_data.is_empty() {
                            if let Some(ref tx) = client.filtered_tx {
                                if has_filters {
                                    // Serialização otimizada para clientes com filtros
                                    let sorted_map = sort_tags_naturally(client_data);
                                    
                                    // Preferir MessagePack para alta performance em dados grandes
                                    if sorted_map.len() > 10 {
                                        match rmp_serde::to_vec(&sorted_map) {
                                            Ok(msgpack_bytes) => {
                                                let base64_data = base64_encode(&msgpack_bytes);
                                                let msgpack_message = format!("MSGPACK:{}", base64_data);
                                                let _ = tx.send(msgpack_message).await;
                                            }
                                            Err(_) => {
                                                let json_message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                                let _ = tx.send(json_message).await;
                                            }
                                        }
                                    } else {
                                        // JSON para payloads pequenos
                                        let json_message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                        let _ = tx.send(json_message).await;
                                    }
                                } else {
                                    // Fallback para clientes sem filtros
                                    let sorted_map = sort_tags_naturally(client_data);
                                    let message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                    let _ = tx.send(message).await;
                                }
                            }
                        }
                    }
                    
                    // 🆕 MARCAR TAGS COMO ENVIADOS APÓS TODOS OS CLIENTES RECEBEREM
                    for interval_s in 1..=3u64 {
                        smart_cache_clone.mark_tags_as_sent(interval_s).await;
                    }
                    
                    // 🔄 MARCAR TAGS ON_CHANGE COMO ENVIADOS
                    smart_cache_clone.mark_tags_as_sent(0).await;
                }
            }
        });
        
        // BATCH 2: Intervalos médios (4-7s) - AGORA COM FILTRAGEM POR CLIENTE!
        let medium_batch_handle = tokio::spawn({
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            let connected_clients_clone = self.connected_clients.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(2));
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // 🆕 ITERAR SOBRE CADA CLIENTE CONECTADO E ENVIAR DADOS FILTRADOS
                    for client_entry in connected_clients_clone.iter() {
                        let client = client_entry.value();
                        
                        // 🛡️ FIX RACE CONDITION: Usar método atômico para snapshot de filtros
                        let (subscribed_plcs, subscribed_areas, subscribed_categories, include_all_faults) = 
                            client.get_filter_snapshot().await;
                        
                        let has_filters = !subscribed_areas.is_empty() || !subscribed_categories.is_empty();
                        
                        // Coletar dados para este cliente
                        let mut client_data: HashMap<String, String> = HashMap::new();
                        
                        if has_filters {
                            // 🎯 CLIENTE TEM FILTROS - Usar get_tags_filtered (readonly)
                            for interval_s in 4..=7u64 {
                                let filtered_tags = smart_cache_clone.get_tags_filtered(
                                    interval_s,
                                    &subscribed_plcs,
                                    &subscribed_areas,
                                    &subscribed_categories,
                                    include_all_faults
                                ).await;
                                client_data.extend(filtered_tags);
                            }
                        } else {
                            // 📡 CLIENTE SEM FILTROS - Usar readonly para não afetar outros clientes
                            for interval_s in 4..=7u64 {
                                let tag_data = smart_cache_clone.get_tags_for_broadcast_readonly(interval_s).await;
                                client_data.extend(tag_data);
                            }
                        }
                        
                        // 🚀 MELHORIA FASE 2: Envio otimizado (BATCH 2 - Médio)
                        if !client_data.is_empty() {
                            if let Some(ref tx) = client.filtered_tx {
                                let sorted_map = sort_tags_naturally(client_data);
                                
                                // Otimização: Preferir MessagePack para dados médios/grandes
                                if sorted_map.len() > 8 {
                                    match rmp_serde::to_vec(&sorted_map) {
                                        Ok(msgpack_bytes) => {
                                            let base64_data = base64_encode(&msgpack_bytes);
                                            let msgpack_message = format!("MSGPACK:{}", base64_data);
                                            let _ = tx.send(msgpack_message).await;
                                        }
                                        Err(_) => {
                                            let message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                            let _ = tx.send(message).await;
                                        }
                                    }
                                } else {
                                    let message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                    let _ = tx.send(message).await;
                                }
                            }
                        }
                    }
                    
                    // 🆕 MARCAR TAGS COMO ENVIADOS APÓS TODOS OS CLIENTES RECEBEREM
                    for interval_s in 4..=7u64 {
                        smart_cache_clone.mark_tags_as_sent(interval_s).await;
                    }
                }
            }
        });
        
        // BATCH 3: Intervalos lentos (8-10s) - AGORA COM FILTRAGEM POR CLIENTE!
        let slow_batch_handle = tokio::spawn({
            let smart_cache_clone = smart_cache_broadcast.clone();
            let is_running_clone = is_running_broadcast.clone();
            let connected_clients_clone = self.connected_clients.clone();
            
            async move {
                let mut batch_timer = time::interval(Duration::from_secs(5));
                
                while is_running_clone.load(Ordering::SeqCst) {
                    batch_timer.tick().await;
                    
                    // 🆕 ITERAR SOBRE CADA CLIENTE CONECTADO E ENVIAR DADOS FILTRADOS
                    for client_entry in connected_clients_clone.iter() {
                        let client = client_entry.value();
                        
                        // 🛡️ FIX RACE CONDITION: Usar método atômico para snapshot de filtros
                        let (subscribed_plcs, subscribed_areas, subscribed_categories, include_all_faults) = 
                            client.get_filter_snapshot().await;
                        
                        let has_filters = !subscribed_areas.is_empty() || !subscribed_categories.is_empty();
                        
                        // Coletar dados para este cliente
                        let mut client_data: HashMap<String, String> = HashMap::new();
                        
                        if has_filters {
                            // 🎯 CLIENTE TEM FILTROS - Usar get_tags_filtered (readonly)
                            for interval_s in 8..=10u64 {
                                let filtered_tags = smart_cache_clone.get_tags_filtered(
                                    interval_s,
                                    &subscribed_plcs,
                                    &subscribed_areas,
                                    &subscribed_categories,
                                    include_all_faults
                                ).await;
                                client_data.extend(filtered_tags);
                            }
                        } else {
                            // 📡 CLIENTE SEM FILTROS - Usar readonly para não afetar outros clientes
                            for interval_s in 8..=10u64 {
                                let tag_data = smart_cache_clone.get_tags_for_broadcast_readonly(interval_s).await;
                                client_data.extend(tag_data);
                            }
                        }
                        
                        // 🚀 MELHORIA FASE 2: Envio otimizado (BATCH 3 - Lento)
                        if !client_data.is_empty() {
                            if let Some(ref tx) = client.filtered_tx {
                                let sorted_map = sort_tags_naturally(client_data);
                                
                                // Otimização: Preferir MessagePack para dados médios/grandes
                                if sorted_map.len() > 8 {
                                    match rmp_serde::to_vec(&sorted_map) {
                                        Ok(msgpack_bytes) => {
                                            let base64_data = base64_encode(&msgpack_bytes);
                                            let msgpack_message = format!("MSGPACK:{}", base64_data);
                                            let _ = tx.send(msgpack_message).await;
                                        }
                                        Err(_) => {
                                            let message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                            let _ = tx.send(message).await;
                                        }
                                    }
                                } else {
                                    let message = serde_json::to_string(&sorted_map).unwrap_or_else(|_| "{}".to_string());
                                    let _ = tx.send(message).await;
                                }
                            }
                        }
                    }
                    
                    // 🆕 MARCAR TAGS COMO ENVIADOS APÓS TODOS OS CLIENTES RECEBEREM
                    for interval_s in 8..=10u64 {
                        smart_cache_clone.mark_tags_as_sent(interval_s).await;
                    }
                }
            }
        });
        
        handles.push(fast_batch_handle);
        handles.push(medium_batch_handle);
        handles.push(slow_batch_handle);
        
        // TASK 3: BROADCASTING PARA TAGS EM MODO "on_change" - AGORA COM FILTRAGEM POR CLIENTE!
        let smart_cache_change = smart_cache.clone();
        let is_running_change = is_running.clone();
        let connected_clients_change = self.connected_clients.clone();
        
        let change_handle = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(100));
            while is_running_change.load(Ordering::SeqCst) {
                interval.tick().await;
                
                // 🆕 ITERAR SOBRE CADA CLIENTE CONECTADO E ENVIAR DADOS FILTRADOS
                for client_entry in connected_clients_change.iter() {
                    let client = client_entry.value();
                    
                    // Obter filtros do cliente
                    let subscribed_plcs = client.subscribed_plcs.read().await;
                    let subscribed_areas = client.subscribed_areas.read().await;
                    let subscribed_categories = client.subscribed_categories.read().await;
                    let include_all_faults = client.include_all_faults.load(Ordering::SeqCst);
                    
                    let has_filters = !subscribed_areas.is_empty() || !subscribed_categories.is_empty();
                    
                    let changed_tags = if has_filters {
                        // 🎯 CLIENTE TEM FILTROS - Usar get_tags_filtered para on_change (readonly)
                        smart_cache_change.get_tags_filtered(
                            0,
                            &subscribed_plcs,
                            &subscribed_areas,
                            &subscribed_categories,
                            include_all_faults
                        ).await
                    } else {
                        // 📡 CLIENTE SEM FILTROS - Usar readonly para não afetar outros clientes
                        smart_cache_change.get_tags_for_broadcast_readonly(0).await
                    };
                    
                    if !changed_tags.is_empty() {
                        if let Some(ref tx) = client.filtered_tx {
                            let sorted_changed_tags = sort_tags_naturally(changed_tags);
                            let message = serde_json::to_string(&sorted_changed_tags).unwrap_or_else(|_| "{}".to_string());
                            let _ = tx.send(message).await;
                        }
                    }
                }
                
                // 🆕 MARCAR TAGS on_change COMO ENVIADOS APÓS TODOS OS CLIENTES RECEBEREM
                smart_cache_change.mark_tags_as_sent(0).await;
            }
        });
        
        handles.push(change_handle);
        
        let mut guard = self.interval_handles.lock().await;
        *guard = handles;
        
        println!("✅ Sistema inteligente iniciado com cache de tags");
        Ok(())
    }

    /// Para e reinicia as tasks de broadcast, recarregando os tags do banco
    pub async fn reload_tag_groups(&mut self) -> Result<(), String> {
        // 🆕 INVALIDAR TODO O CACHE PARA FORÇAR RELOAD
        self.smart_cache.invalidate_all_cache();
        
        // Limpar cache de dados antigos
        self.smart_cache.clear().await;

        // Parar tasks antigas
        {
            let mut guard = self.interval_handles.lock().await;
            for handle in guard.iter() {
                handle.abort();
            }
            guard.clear();
        }
        
        // Recriar tasks com os grupos atualizados
        if let Some(broadcast_tx) = &self.broadcast_sender {
            self.start_smart_broadcasting(broadcast_tx.clone()).await
        } else {
            Err("Broadcast sender não inicializado".to_string())
        }
    }

    fn parse_variable_value(value: &str, data_type: &str) -> serde_json::Value {
        match data_type {
            "REAL" | "LREAL" => {
                value.parse::<f64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            "INT" | "DINT" | "LINT" => {
                value.parse::<i64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            "WORD" | "DWORD" | "LWORD" | "BYTE" => {
                value.parse::<u64>().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            },
            _ => serde_json::Value::String(value.to_string())
        }
    }

    async fn handle_client(
        stream: TcpStream,
        client_id: u64,
        addr: SocketAddr,
        mut broadcast_rx: broadcast::Receiver<String>,
        connected_clients: Arc<DashMap<u64, ConnectedClient>>,
        active_connections: Arc<AtomicU64>,
        messages_sent: Arc<AtomicU64>,
        bytes_sent: Arc<AtomicU64>,
        app_handle: AppHandle,
        database: Arc<Database>, // ✅ NOVO PARÂMETRO
        smart_cache: Arc<SmartCache>, // ✅ NOVO PARÂMETRO
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let websocket = accept_async(stream).await?;
        let (ws_sender, mut ws_receiver) = websocket.split();
        
        // ✅ Canal para envio de respostas ao cliente
        let (response_tx, mut response_rx) = mpsc::channel::<String>(100);
        let ws_sender = Arc::new(TokioMutex::new(ws_sender));

        println!("🔌 WebSocket handshake completo para cliente {}", client_id);

        // 🆕 ARMAZENAR O CANAL DE ENVIO NO CLIENTE PARA BROADCAST FILTRADO
        if let Some(mut client) = connected_clients.get_mut(&client_id) {
            client.filtered_tx = Some(response_tx.clone());
            println!("📡 Canal de filtro configurado para cliente {}", client_id);
        }

        // ✅ TASK DE ENVIO - Unificada para broadcast e respostas
        let ws_sender_clone = ws_sender.clone();
        let messages_sent_clone = messages_sent.clone();
        let bytes_sent_clone = bytes_sent.clone();
        
        let send_task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Mensagens de broadcast
                    Ok(message) = broadcast_rx.recv() => {
                        let msg_len = message.len() as u64;
                        let mut sender = ws_sender_clone.lock().await;
                        if let Err(e) = sender.send(Message::Text(message)).await {
                            println!("❌ Erro ao enviar broadcast para cliente {}: {}", client_id, e);
                            break;
                        }
                        messages_sent_clone.fetch_add(1, Ordering::SeqCst);
                        bytes_sent_clone.fetch_add(msg_len, Ordering::SeqCst);
                    }
                    // Respostas diretas ao cliente
                    Some(response) = response_rx.recv() => {
                        let msg_len = response.len() as u64;
                        let mut sender = ws_sender_clone.lock().await;
                        if let Err(e) = sender.send(Message::Text(response)).await {
                            println!("❌ Erro ao enviar resposta para cliente {}: {}", client_id, e);
                            break;
                        }
                        messages_sent_clone.fetch_add(1, Ordering::SeqCst);
                        bytes_sent_clone.fetch_add(msg_len, Ordering::SeqCst);
                    }
                }
            }
        });

        let connected_clients_recv = connected_clients.clone();
        let _app_handle_recv = app_handle.clone();
        let response_tx_clone = response_tx.clone();
        let database_recv = database.clone(); // ✅ CLONE DATABASE
        let smart_cache_recv = smart_cache.clone(); // ✅ CLONE SMART_CACHE
        
        let receive_task = tokio::spawn(async move {
            while let Some(msg) = ws_receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Some(client) = connected_clients_recv.get(&client_id) {
                            client.messages_received.fetch_add(1, Ordering::SeqCst);
                        }
                        
                        // ✅ PROCESSAR COMANDOS DO CLIENTE
                        if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                            let cmd_type = cmd.get("type").and_then(|t| t.as_str()).unwrap_or("");
                            
                            match cmd_type {
                                "LIST_PLCS" => {
                                    println!("📋 Cliente {} solicitou lista de PLCs", client_id);
                                    
                                    // ✅ BUSCAR PLCs REAIS DO BANCO DE DADOS
                                    let plcs: Vec<String> = match database_recv.list_configured_plcs() {
                                        Ok(configured_plcs) => {
                                            println!("📋 PLCs configurados no banco: {:?}", configured_plcs);
                                            configured_plcs
                                        }
                                        Err(e) => {
                                            println!("⚠️ Erro ao buscar PLCs do banco: {}", e);
                                            // Fallback: buscar do cache de tag_mappings
                                            smart_cache_recv.tag_mappings_cache
                                                .iter()
                                                .map(|entry| entry.key().clone())
                                                .collect()
                                        }
                                    };
                                    
                                    println!("📡 Enviando lista de {} PLCs para cliente {}", plcs.len(), client_id);
                                    
                                    let response = serde_json::json!({
                                        "type": "PLC_LIST",
                                        "plcs": plcs,
                                        "timestamp": SystemTime::now()
                                            .duration_since(UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis()
                                    });
                                    
                                    let _ = response_tx_clone.send(response.to_string()).await;
                                }
                                
                                "SUBSCRIBE_PLCS" => {
                                    if let Some(plc_ips) = cmd.get("plc_ips").and_then(|p| p.as_array()) {
                                        let plcs: Vec<String> = plc_ips
                                            .iter()
                                            .filter_map(|ip| ip.as_str().map(|s| s.to_string()))
                                            .collect();
                                        
                                        println!("📡 Cliente {} subscreveu em PLCs: {:?}", client_id, plcs);
                                        
                                        // Atualizar subscrições do cliente
                                        if let Some(mut client) = connected_clients_recv.get_mut(&client_id) {
                                            {
                                                let mut subscribed = client.subscribed_plcs.write().await;
                                                subscribed.clear();
                                                for plc_ip in &plcs {
                                                    subscribed.insert(plc_ip.clone());
                                                }
                                            }
                                            client.client_type = ClientType::Filtered(plcs.clone());
                                        }
                                        
                                        let response = serde_json::json!({
                                            "type": "SUBSCRIBE_ACK",
                                            "success": true,
                                            "plcs": plcs,
                                            "message": "Subscrição atualizada com sucesso"
                                        });
                                        
                                        let _ = response_tx_clone.send(response.to_string()).await;
                                    }
                                }
                                
                                // 🆕 SUBSCRIBE INTELIGENTE COM FILTROS DE ÁREA E CATEGORIA
                                "SUBSCRIBE" => {
                                    let plcs: Vec<String> = cmd.get("plc_ips")
                                        .and_then(|p| p.as_array())
                                        .map(|arr| arr.iter().filter_map(|ip| ip.as_str().map(|s| s.to_string())).collect())
                                        .unwrap_or_default();
                                    
                                    let areas: Vec<String> = cmd.get("areas")
                                        .and_then(|a| a.as_array())
                                        .map(|arr| arr.iter().filter_map(|a| a.as_str().map(|s| s.to_string())).collect())
                                        .unwrap_or_default();
                                    
                                    let categories: Vec<String> = cmd.get("categories")
                                        .and_then(|c| c.as_array())
                                        .map(|arr| arr.iter().filter_map(|c| c.as_str().map(|s| s.to_string())).collect())
                                        .unwrap_or_default();
                                    
                                    let include_all_faults = cmd.get("include_all_faults")
                                        .and_then(|f| f.as_bool())
                                        .unwrap_or(false);
                                    
                                    println!("📡 Cliente {} SUBSCRIBE inteligente:", client_id);
                                    println!("   PLCs: {:?}", plcs);
                                    println!("   Áreas: {:?}", areas);
                                    println!("   Categorias: {:?}", categories);
                                    println!("   Include All Faults: {}", include_all_faults);
                                    
                                    // Atualizar subscrições do cliente
                                    if let Some(mut client) = connected_clients_recv.get_mut(&client_id) {
                                        // PLCs
                                        {
                                            let mut subscribed_plcs = client.subscribed_plcs.write().await;
                                            subscribed_plcs.clear();
                                            for plc_ip in &plcs {
                                                subscribed_plcs.insert(plc_ip.clone());
                                            }
                                        }
                                        
                                        // Áreas (ENCH, ESVZ, JUS, MONT, ESGT, ECLUS)
                                        {
                                            let mut subscribed_areas = client.subscribed_areas.write().await;
                                            subscribed_areas.clear();
                                            for area in &areas {
                                                subscribed_areas.insert(area.clone());
                                            }
                                        }
                                        
                                        // Categorias (PROC, FAULT, EVENT)
                                        {
                                            let mut subscribed_categories = client.subscribed_categories.write().await;
                                            subscribed_categories.clear();
                                            for cat in &categories {
                                                subscribed_categories.insert(cat.clone());
                                            }
                                        }
                                        
                                        // Flag para receber todas as falhas
                                        client.include_all_faults.store(include_all_faults, Ordering::SeqCst);
                                        
                                        // Atualizar client_type
                                        if !plcs.is_empty() {
                                            client.client_type = ClientType::Filtered(plcs.clone());
                                        }
                                    }
                                    
                                    let response = serde_json::json!({
                                        "type": "SUBSCRIBE_ACK",
                                        "success": true,
                                        "plcs": plcs,
                                        "areas": areas,
                                        "categories": categories,
                                        "include_all_faults": include_all_faults,
                                        "message": "Subscrição inteligente configurada com sucesso"
                                    });
                                    
                                    let _ = response_tx_clone.send(response.to_string()).await;
                                }
                                
                                _ => {
                                    // Comando desconhecido - ignorar silenciosamente
                                }
                            }
                        }
                    },
                    Ok(Message::Close(_)) => {
                        println!("🔐 Cliente {} fechou conexão", client_id);
                        break;
                    },
                    Ok(Message::Ping(_data)) => {
                        println!("🔶 Ping recebido de cliente {}", client_id);
                    },
                    Err(e) => {
                        println!("❌ Erro ao receber de cliente {}: {}", client_id, e);
                        break;
                    },
                    _ => {}
                }
            }
        });

        tokio::select! {
            _ = send_task => {},
            _ = receive_task => {}
        }

        // 🛡️ MELHORIA CRÍTICA: Cleanup explícito e completo para evitar memory leaks
        {
            // Primeiro remover do DashMap para impedir novos envios
            if let Some((_, mut client)) = connected_clients.remove(&client_id) {
                // Fechar canal filtrado explicitamente tomando ownership
                if let Some(tx) = client.filtered_tx.take() {
                    // Dropar explicitamente para fechar o canal
                    drop(tx);
                }
                // Limpar HashSets de subscrições
                {
                    let mut plcs = client.subscribed_plcs.write().await;
                    plcs.clear();
                }
                {
                    let mut areas = client.subscribed_areas.write().await;
                    areas.clear();
                }
                {
                    let mut cats = client.subscribed_categories.write().await;
                    cats.clear();
                }
                println!("🧹 Cleanup completo para cliente {} - canais e subscrições limpos", client_id);
            }
        }
        
        active_connections.fetch_sub(1, Ordering::SeqCst);

        println!("🔌 Cliente {} desconectado com cleanup completo", client_id);

        let _ = app_handle.emit("websocket-client-disconnected", serde_json::json!({
            "client_id": client_id,
            "address": addr.to_string(),
            "total_clients": active_connections.load(Ordering::SeqCst)
        }));

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<String, String> {
        if !self.is_running.load(Ordering::SeqCst) {
            return Err("WebSocket server não está rodando".to_string());
        }

        println!("🛑 Iniciando shutdown do WebSocket server...");
        
        // 1. Sinalizar parada (tasks vão detectar isso em seus loops)
        self.is_running.store(false, Ordering::SeqCst);

        // 2. Abortar server handle
        if let Some(handle) = self.server_handle.take() {
            handle.abort();
            println!("🛑 Server handle abortado");
        }
        
        // 3. Abortar broadcast handle
        if let Some(handle) = self.broadcast_handle.take() {
            handle.abort();
            println!("🛑 Broadcast handle abortado");
        }
        
        // 4. Abortar cache updater
        if let Some(handle) = self.cache_updater_handle.take() {
            handle.abort();
            println!("🛑 Cache updater abortado");
        }

        // 🛡️ FIX: Abortar TODOS os interval handles (batches)
        {
            let mut handles = self.interval_handles.lock().await;
            for handle in handles.drain(..) {
                handle.abort();
            }
            println!("🛑 {} interval handles abortados", handles.capacity());
        }

        // 5. Limpar cache de smart_cache
        self.smart_cache.clear().await;
        println!("🧹 Smart cache limpo");

        // 6. Limpar canais de broadcast por PLC
        self.plc_broadcast_channels.clear();
        println!("🧹 PLC broadcast channels limpos");

        // 7. Limpar payloads batched
        self.batched_payloads.clear();
        println!("🧹 Batched payloads limpos");

        // 8. Limpar clientes conectados
        self.connected_clients.clear();
        self.active_connections.store(0, Ordering::SeqCst);

        let _ = self.app_handle.emit("websocket-server-stopped", serde_json::json!({
            "status": "stopped",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

        println!("🛑 WebSocket server parado completamente");
        
        Ok("WebSocket server parado com sucesso".to_string())
    }

    pub fn get_stats(&self) -> WebSocketStats {
        let uptime = self.start_time.elapsed().unwrap_or_default().as_secs();
        let broadcast_rate = if self.config.broadcast_interval_ms > 0 {
            1000.0 / self.config.broadcast_interval_ms as f64
        } else {
            0.0
        };

        WebSocketStats {
            active_connections: self.active_connections.load(Ordering::SeqCst),
            total_connections: self.total_connections.load(Ordering::SeqCst),
            messages_sent: self.messages_sent.load(Ordering::SeqCst),
            bytes_sent: self.bytes_sent.load(Ordering::SeqCst),
            uptime_seconds: uptime,
            server_status: if self.is_running.load(Ordering::SeqCst) {
                "Rodando".to_string()
            } else {
                "Parado".to_string()
            },
            broadcast_rate_hz: broadcast_rate,
        }
    }

    pub fn get_connected_clients(&self) -> Vec<serde_json::Value> {
        self.connected_clients
            .iter()
            .map(|entry| {
                let client = entry.value();
                serde_json::json!({
                    "id": client.id,
                    "address": client.address.to_string(),
                    "connected_at": client.connected_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    "messages_received": client.messages_received.load(Ordering::SeqCst)
                })
            })
            .collect()
    }

    pub fn update_config(&mut self, new_config: WebSocketConfig) {
        self.config = new_config;
    }

    pub fn get_config(&self) -> &WebSocketConfig {
        &self.config
    }

    /// Expõe o cache de tag mappings para uso externo (ex: SCL Analysis)
    /// Retorna None se o cache estiver vazio para o PLC
    pub async fn get_cached_tag_mappings(&self, plc_ip: &str) -> Option<Vec<crate::database::TagMapping>> {
        self.smart_cache.get_cached_tags(plc_ip)
    }

    // ✅ OTIMIZAÇÃO: Métodos para monitoramento de memória
    pub fn get_cache_memory_stats(&self) -> (usize, usize, usize, f64) {
        self.smart_cache.get_memory_stats()
    }

    pub async fn force_cache_cleanup(&self) -> bool {
        self.smart_cache.enforce_memory_limits().await
    }

    // 🛡️ MELHORIA CRÍTICA: Monitoring system removed as requested by user
}