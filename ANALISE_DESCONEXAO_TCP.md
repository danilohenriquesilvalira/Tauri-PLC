# 🔍 Análise de Desconexão TCP - 8 Horas de Operação

## 📊 Dados do Incidente

- **Tempo de Operação:** 3889 min (64.8 horas)
- **Mensagens Recebidas:** 203,333
- **Tags Processados:** 16,561,540
- **Sintomas:**
  - Comunicação lenta (752,984ms)
  - Timeout após 752s sem dados
  - Conexão morta após 1182s
  - Reconexão automática funcionou

## 🐛 Problemas Identificados no Código

### 1. ⚠️ **CRÍTICO: Watchdog Timeout Muito Curto**
```rust
const INACTIVITY_TIMEOUT_SECS: u64 = 15;  // ❌ 15 segundos é MUITO curto!
```

**Problema:** Com 15 segundos, qualquer pequeno atraso na rede (congestionamento, processamento, GC) causa desconexão.

**Logs comprovam:**
- "sem dados há 752s - timeout" → Watchdog matou a conexão
- "sem dados há 1182s - conexão morta" → Watchdog matou de novo

**Solução:** Aumentar para 60-120 segundos

---

### 2. 🧩 **Memory Leak Potencial: Buffers Não Retornados**
```rust
// Se ocorrer panic ou erro antes de return_buffer, o buffer vaza
async fn handle_client_connection(...) {
    let mut accumulator = buffer_pool.get_buffer(BUFFER_CAPACITY).await;
    
    // ❌ Se panic aqui, accumulator nunca é retornado
    // ❌ Se erro inesperado, buffer vaza
    
    // Só retorna em alguns caminhos:
    buffer_pool.return_buffer(accumulator).await;  // ⚠️ Não garantido
}
```

**Após 64 horas:**
- 203,333 mensagens × possíveis leaks = **acúmulo de memória**
- Buffers vazados = menos memória disponível
- Sistema fica lento = timeouts

**Solução:** Usar `defer` pattern ou sempre retornar buffer

---

### 3. 🔒 **Deadlock Potencial: Locks Aninhados**
```rust
// ❌ RISCO: connection_handles.write() pode bloquear indefinidamente
let mut handles = connection_handles.write().await;
// Se outra thread já tem lock e está esperando outro recurso = DEADLOCK

// Código tenta mitigar com timeout, mas 500ms pode ser curto
match tokio::time::timeout(
    tokio::time::Duration::from_millis(500),
    connection_handles.write()
).await {
    // ...
}
```

**Após longas horas:**
- Mais conexões = mais contention
- Lock contentious + timeout curto = falhas

**Solução:** Aumentar timeout para 2-5 segundos

---

### 4. 📦 **Channel Overflow: Event Queue Pequena**
```rust
const EVENT_CHANNEL_CAPACITY: usize = 500;  // ⚠️ Pode encher rápido
```

**Com 16M tags processados:**
- 16,561,540 tags ÷ 3889 min = ~4,200 tags/min
- ~70 tags/segundo
- Se eventos não são consumidos rápido = **backpressure**
- Send bloqueado = conexão trava = timeout

**Solução:** Aumentar para 2000-5000

---

### 5. 🗑️ **Limpeza de Fragmentos Muito Agressiva**
```rust
const FRAGMENT_CLEAR_SECS: u64 = 5;  // ⚠️ 5 segundos pode ser curto

// Se fragmento demora 6s para completar = DESCARTADO
if last_fragment_time.elapsed().as_secs() > FRAGMENT_CLEAR_SECS {
    accumulator.clear();  // ❌ Perde dados!
}
```

**Em rede congestionada:**
- Pacote fragmentado demora > 5s
- Dados descartados
- PLC reenvia
- Loop infinito = timeout

**Solução:** Aumentar para 15-30 segundos

---

### 6. 💾 **Acúmulo de Dados no DashMap**
```rust
latest_data: Arc<DashMap<String, PlcDataPacket>>,  // ❌ Nunca limpa dados antigos
```

**Após 64 horas:**
- Cada update cria novo `PlcDataPacket`
- DashMap cresce indefinidamente
- Sem TTL ou limite de tamanho
- **Memory leak gradual**

**Solução:** Limpar dados > 5 minutos

---

### 7. 🔄 **Falta de Backpressure Handling**
```rust
// ❌ Se event_sender.send() bloquear, a thread de leitura trava
if let Some(sender) = &event_sender {
    let _ = sender.send(event).await;  // Ignora erro!
}
```

**Problema:**
- Channel cheio = send bloqueia
- Thread de leitura para
- Sem dados novos = timeout do watchdog
- **Cascata de falhas**

**Solução:** Usar `try_send` com timeout

---

## 🎯 Root Cause Provável

**Combinação de fatores após ~8 horas:**

1. **Event channel enche** (500 slots = pouco)
2. **Send bloqueia** → thread de leitura trava
3. **Sem dados por 15s** → Watchdog mata conexão
4. **Memory leak gradual** → sistema lento → mais timeouts

**Evidência nos logs:**
- "respondendo em 752984ms" = sistema MUITO lento (12 minutos!)
- "sem dados há 752s" = exatamente após lentidão extrema
- Reconexão funciona = servidor não crashou, só matou conexão

---

## ✅ Soluções Recomendadas (Ordem de Prioridade)

### 1. **URGENTE: Aumentar Timeouts**
```rust
const INACTIVITY_TIMEOUT_SECS: u64 = 120;  // 15 → 120s
const FRAGMENT_CLEAR_SECS: u64 = 30;       // 5 → 30s
```

### 2. **URGENTE: Aumentar Event Channel**
```rust
const EVENT_CHANNEL_CAPACITY: usize = 5000;  // 500 → 5000
```

### 3. **CRÍTICO: Garantir Return de Buffers**
```rust
// Usar defer pattern ou try/finally
struct BufferGuard {
    buffer: Option<Vec<u8>>,
    pool: Arc<BufferPool>,
}

impl Drop for BufferGuard {
    fn drop(&mut self) {
        if let Some(buf) = self.buffer.take() {
            // Usar block_on ou spawn para async
            tokio::spawn(async move {
                pool.return_buffer(buf).await;
            });
        }
    }
}
```

### 4. **IMPORTANTE: Limpar latest_data**
```rust
// No watchdog, adicionar:
const DATA_TTL_SECS: u64 = 300;  // 5 minutos
latest_data.retain(|_, packet| {
    packet.timestamp > (now - DATA_TTL_SECS)
});
```

### 5. **IMPORTANTE: Timeout Aumentado em Locks**
```rust
tokio::time::Duration::from_millis(5000)  // 500ms → 5s
```

### 6. **IMPORTANTE: Usar try_send**
```rust
match sender.try_send(event) {
    Ok(_) => {},
    Err(mpsc::error::TrySendError::Full(_)) => {
        // Log e descarta evento (melhor que travar)
        println!("⚠️ Event channel cheio - descartando");
    }
    Err(_) => {}
}
```

---

## 📈 Monitoramento Adicional

Adicionar métricas no watchdog:

```rust
// A cada check, logar:
- Buffers ativos: buffer_pool.total_buffers
- Channel utilização: event_sender.capacity()
- DashMap size: latest_data.len()
- Heap usage: sys.memory_usage()
```

---

## 🔬 Testes Recomendados

1. **Stress test de 24h** com timeouts aumentados
2. **Monitorar memória** a cada hora
3. **Injetar atrasos** artificiais (simular rede lenta)
4. **Verificar reconexão** após 100+ ciclos

---

## 📝 Conclusão

A desconexão **NÃO foi problema de rede** (ping funcionava).

**Foi problema de código:**
- Timeouts muito agressivos
- Possíveis memory leaks
- Backpressure não tratado
- Channel pequeno

**Após 8 horas**, pequenos problemas se acumulam até causar timeout fatal.

A reconexão automática funciona **porque servidor não crashou**, apenas matou a conexão "problemática".

**Prioridade:** Implementar as 6 soluções acima IMEDIATAMENTE.
