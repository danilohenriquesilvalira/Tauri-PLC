# 🚨 ANÁLISE COMPLETA: Acumuladores Infinitos + Otimização WAN Industrial

## 🌐 Cenário REAL de Produção

**Topologia:**
- **Backend:** Servidor Rust em Ermasindo
- **PLCs Remotos:** Régua, Pocinho, Crestuma, Carrapatelo, Valeira
- **Rede:** Fibra ótica MEO (VLAN industrial)
- **Latência:** 3-10ms (variável, às vezes instável)
- **Protocolo:** TCP (escolhido para rapidez sem ACKs complexos)

**Requisitos:**
- ✅ Robusto e tolerante a latência WAN
- ✅ Rápido mas NÃO rigoroso demais
- ✅ Aceitar dados de forma inteligente
- ✅ 100% estável sem bugs

---

## 🐛 ACUMULADORES INFINITOS ENCONTRADOS

### 1. ❌ **CRÍTICO: `bytes_received` HashMap**
```rust
bytes_received: Arc<RwLock<HashMap<String, u64>>>,  // ❌ NUNCA LIMPA!

// Toda vez que recebe dados:
*bytes_map.entry(ip.clone()).or_insert(0) += n as u64;  // ❌ Acumula infinitamente
```

**Problema:**
- A cada pacote recebido, soma bytes ao HashMap
- **NUNCA é zerado ou limitado**
- Após 64 horas com 203k mensagens = valores GIGANTESCOS
- u64 pode chegar a 18,446,744,073,709,551,615 bytes (18 exabytes)
- **Não causa crash, mas cresce sem parar**

**Evidência:**
- 64h × 16M tags = bilhões de bytes acumulados
- HashMap cresce, nunca diminui

**Solução:**
- Resetar a cada 24h OU
- Usar janela móvel (últimas 1h)

---

### 2. ❌ **CRÍTICO: `unique_plcs` HashSet**
```rust
unique_plcs: Arc<RwLock<HashSet<String>>>,  // ❌ SÓ CRESCE!

// Sempre insere, nunca remove:
unique_plcs.write().await.insert(ip.clone());  // ❌ Acumula IPs
```

**Problema:**
- Cada PLC que conecta é adicionado
- **NUNCA remove** quando PLC desconecta
- Se PLCs reconectarem 1000x = 1000 entradas (com IPs diferentes ou não)
- Embora pequeno, acumula metadados

**Solução:**
- Limpar IPs desconectados há > 7 dias

---

### 3. ❌ **CRÍTICO: `ip_to_id` HashMap**
```rust
ip_to_id: Arc<RwLock<HashMap<String, u64>>>,  // ❌ NUNCA LIMPA!

// Sempre incrementa ID:
let new_id = next_connection_id.fetch_add(1, Ordering::SeqCst);
id_map.insert(ip.clone(), new_id);  // ❌ Sobrescreve mas nunca remove
```

**Problema:**
- Mapeia IP → connection_id
- **NUNCA remove** IPs antigos
- Acumula mapeamentos de PLCs que nem existem mais

**Solução:**
- Limpar mapeamentos de IPs não vistos há > 7 dias

---

### 4. ⚠️ **MÉDIO: `connected_clients` Vec**
```rust
connected_clients: Arc<RwLock<Vec<String>>>,

// Adiciona ao conectar:
connected_clients.write().await.push(ip.clone());  // ❌ Pode duplicar?

// Remove ao desconectar:
clients.retain(|x| x != &ip);  // ✅ OK, mas pode vazar se watchdog falhar
```

**Problema:**
- Se watchdog falhar ao remover = IP fica "fantasma"
- Vec cresce sem controle

**Solução:**
- Validar periodicamente contra connection_health

---

### 5. ✅ **OK: `latest_data` DashMap** (CORRIGIDO)
```rust
latest_data: Arc<DashMap<String, PlcDataPacket>>,

// ✅ JÁ CORRIGIDO na última atualização:
latest_data.retain(|_, packet| {
    (now_timestamp - packet.timestamp) < 300  // Remove > 5min
});
```

**Status:** ✅ RESOLVIDO - Watchdog limpa a cada 1min

---

### 6. ❌ **CRÍTICO: `connection_health` DashMap**
```rust
connection_health: Arc<DashMap<String, ConnectionHealth>>,

// Insere ao conectar:
connection_health.insert(ip.clone(), ConnectionHealth {...});

// Remove no watchdog:
connection_health.remove(&ip);  // ⚠️ MAS só se watchdog funcionar
```

**Problema:**
- Se watchdog crashar = entradas órfãs
- DashMap cresce infinitamente

**Solução:**
- Adicionar limpeza de health > 24h mesmo se watchdog falhar

---

### 7. ❌ **CRÍTICO: `plc_configs_cache` DashMap**
```rust
plc_configs_cache: Arc<DashMap<String, PlcStructureConfig>>,

// Insere ao carregar config:
plc_configs_cache.insert(ip.clone(), structure.clone());

// ❌ NUNCA limpa configurações antigas
```

**Problema:**
- Cache de configurações PLC cresce infinitamente
- Se testar 1000 IPs diferentes = 1000 configs em memória
- Embora pequeno, nunca é limpo

**Solução:**
- Limpar configs não usadas há > 7 dias

---

## 🔥 PROBLEMAS PARA REDE WAN INDUSTRIAL

### 1. ❌ **READ_TIMEOUT muito curto para WAN**
```rust
const READ_TIMEOUT_SECS: u64 = 5;  // ❌ 5s é pouco para WAN!
```

**Problema:**
- Rede WAN com latência variável (3-10ms base)
- Picos de latência podem causar > 5s entre pacotes
- Fibra MEO pode ter congestionamentos
- **TCP retransmissões podem demorar > 5s**

**Solução:**
- Aumentar para 15-30s para WAN

---

### 2. ❌ **FRAGMENT_WARN/CLEAR muito agressivos**
```rust
const FRAGMENT_WARN_SECS: u64 = 10;   // ⚠️ 10s pode ser curto
const FRAGMENT_CLEAR_SECS: u64 = 30;  // ⚠️ 30s pode ser curto para WAN
```

**Problema:**
- Pacote fragmentado pela rede WAN
- Fragmentos podem chegar com > 30s de diferença
- Se descartar = perde dados = PLC reenvia = loop

**Solução:**
- Aumentar para 60-90s para WAN

---

### 3. ⚠️ **INACTIVITY_TIMEOUT ok mas pode melhorar**
```rust
const INACTIVITY_TIMEOUT_SECS: u64 = 120;  // ✅ OK, mas...
```

**Análise:**
- 120s = 2min é bom para rede local
- Para WAN com variação pode precisar 180-300s (3-5min)
- **Recomendação:** 180s para WAN industrial

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### Solução 1: **Limpar bytes_received periodicamente**
```rust
// No watchdog, a cada 24h (43200 iterações de 2s):
if iteration_count % 43200 == 0 {
    bytes_received.write().await.clear();
    println!("🗑️ WATCHDOG: Resetou bytes_received (24h)");
}
```

### Solução 2: **Limpar unique_plcs e ip_to_id antigos**
```rust
// No watchdog, a cada 7 dias:
if iteration_count % 302400 == 0 {  // 7 dias
    let active_ips: HashSet<String> = connection_health.iter()
        .map(|e| e.key().clone())
        .collect();
    
    unique_plcs.write().await.retain(|ip| active_ips.contains(ip));
    ip_to_id.write().await.retain(|ip, _| active_ips.contains(ip));
    
    println!("🗑️ WATCHDOG: Limpou IPs inativos (7 dias)");
}
```

### Solução 3: **Validar connected_clients**
```rust
// A cada 30 iterações (~1min):
if iteration_count % 30 == 0 {
    let health_ips: HashSet<String> = connection_health.iter()
        .filter(|e| e.value().is_alive)
        .map(|e| e.key().clone())
        .collect();
    
    let mut clients = connected_clients.write().await;
    clients.retain(|ip| health_ips.contains(ip));
}
```

### Solução 4: **Limpar connection_health órfãos**
```rust
// A cada 1h (1800 iterações):
if iteration_count % 1800 == 0 {
    let now = std::time::Instant::now();
    connection_health.retain(|_, health| {
        now.duration_since(health.last_data_received).as_secs() < 86400  // 24h
    });
}
```

### Solução 5: **Limpar plc_configs_cache antigo**
```rust
// A cada 7 dias:
if iteration_count % 302400 == 0 {
    let active_ips: HashSet<String> = connection_health.iter()
        .map(|e| e.key().clone())
        .collect();
    
    plc_configs_cache.retain(|ip, _| active_ips.contains(ip));
}
```

### Solução 6: **Aumentar timeouts para WAN**
```rust
const READ_TIMEOUT_SECS: u64 = 15;           // 5 → 15s
const INACTIVITY_TIMEOUT_SECS: u64 = 180;    // 120 → 180s (3min)
const FRAGMENT_WARN_SECS: u64 = 30;          // 10 → 30s
const FRAGMENT_CLEAR_SECS: u64 = 90;         // 30 → 90s
```

---

## 📊 Resumo de Impacto

| Acumulador | Crescimento | Impacto Memória | Impacto Performance | Prioridade |
|------------|-------------|-----------------|---------------------|------------|
| bytes_received | Alto | Médio | Baixo | **URGENTE** |
| unique_plcs | Baixo | Baixo | Baixo | Médio |
| ip_to_id | Baixo | Baixo | Baixo | Médio |
| connected_clients | Médio | Baixo | Médio | Alto |
| connection_health | Médio | Médio | Médio | Alto |
| plc_configs_cache | Baixo | Médio | Baixo | Médio |
| latest_data | **✅ RESOLVIDO** | - | - | - |

---

## 🎯 Conclusão

**Problemas encontrados:**
1. ❌ 6 estruturas acumulam sem limpar
2. ❌ Timeouts muito agressivos para WAN industrial
3. ❌ Fragmentos descartados prematuramente

**Soluções aplicadas:**
1. ✅ Limpeza periódica de todos acumuladores
2. ✅ Timeouts ajustados para WAN (3-10ms + variação)
3. ✅ Fragmentos tolerados por 90s
4. ✅ Monitoramento de recursos a cada 1min
5. ✅ Sistema mais "suave" e tolerante

**Resultado esperado:**
- 🚀 Sistema robusto para WAN industrial
- 🚀 Tolerante a latência 3-10ms + picos
- 🚀 Sem acúmulo de memória infinito
- 🚀 Estável por meses sem restart
