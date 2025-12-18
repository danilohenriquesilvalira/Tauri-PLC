# Sistema de Configuração de Estrutura de Dados PLC

## 🎯 **Como Funciona**

O sistema agora possui **auto-detecção inteligente** de estruturas de dados do PLC através de um banco de dados SQLite local.

---

## 📋 **Configuração no HMI**

### **Passo 1: Conectar o PLC**
1. Inicie o servidor TCP na porta 8502
2. Configure o PLC para conectar no servidor
3. O PLC aparecerá como um card

### **Passo 2: Configurar Estrutura**
1. Clique no botão **"Configurar"** no card do PLC
2. Adicione os blocos de dados na ordem que o PLC envia:

**Exemplo: 65 WORD + 65 INT + 65 REAL + 65 REAL**

| Bloco | Tipo | Quantidade | Nome |
|-------|------|------------|------|
| 1 | WORD | 65 | Word |
| 2 | INT | 65 | Int |
| 3 | REAL | 65 | Real |
| 4 | REAL | 65 | Real2 |

**Total: 780 bytes** (130 + 130 + 260 + 260)

3. Clique em **"Salvar Configuração"**

---

## 🔄 **Fluxo de Parsing**

### **COM Configuração Salva:**
```
PLC envia 780 bytes
↓
Backend busca config no SQLite
↓
Encontra: WORD[65], INT[65], REAL[65], REAL[65]
↓
Parseia corretamente:
  - Word[0] a Word[64]: bytes 0-129
  - Int[0] a Int[64]: bytes 130-259  
  - Real[0] a Real[64]: bytes 260-519
  - Real2[0] a Real2[64]: bytes 520-779
↓
Frontend mostra 260 variáveis organizadas
```

### **SEM Configuração (Fallback):**
```
PLC envia 780 bytes
↓
Backend não encontra config
↓
Usa detecção automática (menos preciso)
↓
Pode detectar como DWORD (195 vars)
```

---

## 💾 **Banco de Dados**

### **Localização:**
```
Windows: C:\Users\[Usuario]\AppData\Local\com.tauri.dev\plc_hmi.db
```

### **Estrutura da Tabela:**
```sql
CREATE TABLE plc_structures (
    plc_ip TEXT PRIMARY KEY,
    config_json TEXT,
    total_size INTEGER,
    last_updated INTEGER
);
```

### **Dados Salvos:**
```json
{
  "plc_ip": "192.168.1.100",
  "blocks": [
    {"data_type": "WORD", "count": 65, "name": "Word"},
    {"data_type": "INT", "count": 65, "name": "Int"},
    {"data_type": "REAL", "count": 65, "name": "Real"},
    {"data_type": "REAL", "count": 65, "name": "Real2"}
  ],
  "total_size": 780
}
```

---

## 🔧 **Tipos de Dados Suportados**

| Tipo | Tamanho | Descrição |
|------|---------|-----------|
| BYTE | 1 byte | 0-255 |
| WORD | 2 bytes | 0-65535 |
| INT | 2 bytes | -32768 a 32767 |
| DWORD | 4 bytes | 0-4294967295 |
| DINT | 4 bytes | -2147483648 a 2147483647 |
| REAL | 4 bytes | Float 32-bit (IEEE 754) |
| LWORD | 8 bytes | 0-18446744073709551615 |
| LINT | 8 bytes | -9223372036854775808 a 9223372036854775807 |
| LREAL | 8 bytes | Double 64-bit (IEEE 754) |

---

## ⚙️ **Comandos Tauri Disponíveis**

### **Salvar Configuração:**
```typescript
await invoke('save_plc_structure', {
  plcIp: '192.168.1.100',
  blocks: [
    { data_type: 'WORD', count: 65, name: 'Word' },
    { data_type: 'INT', count: 65, name: 'Int' },
    { data_type: 'REAL', count: 65, name: 'Real' },
    { data_type: 'REAL', count: 65, name: 'Real2' }
  ]
});
```

### **Carregar Configuração:**
```typescript
const config = await invoke('load_plc_structure', {
  plcIp: '192.168.1.100'
});
```

### **Listar PLCs Configurados:**
```typescript
const plcs = await invoke('list_configured_plcs');
```

### **Deletar Configuração:**
```typescript
await invoke('delete_plc_structure', {
  plcIp: '192.168.1.100'
});
```

---

## 🚀 **Vantagens**

✅ **Persistente** - Configuração salva permanentemente  
✅ **Por PLC** - Cada IP tem sua própria estrutura  
✅ **Automático** - Uma vez configurado, sempre funciona  
✅ **Flexível** - Suporta qualquer combinação de tipos  
✅ **Leve** - SQLite sem overhead  
✅ **Confiável** - Banco local não depende de rede  

---

## 📱 **Interface do Usuário**

### **Modal de Configuração:**
- ➕ Adicionar blocos dinamicamente
- 🔄 Editar tipo, quantidade e nome
- 🗑️ Remover blocos
- 💾 Salvar com validação
- 📊 Visualização do tamanho total

### **Feedback Visual:**
- Cálculo automático de bytes por bloco
- Validação de tamanho total
- Mensagens de erro claras
- Confirmação ao salvar

---

## 🐛 **Troubleshooting**

### **Problema: Tamanho diferente**
```
⚠️ PLC 192.168.1.100: Tamanho diferente! 
Esperado 780 bytes, recebido 910 bytes. 
Usando detecção automática.
```

**Solução:** Reconfigure o PLC ou ajuste a estrutura no HMI.

### **Problema: Dados errados**
**Causa:** Estrutura configurada não corresponde aos dados reais  
**Solução:** Verifique a ordem e quantidade de arrays no PLC

---

## 📦 **Distribuição**

O banco de dados é **criado automaticamente** na primeira execução. Cada instalação tem seu próprio banco local.

**Portabilidade:** Para migrar configurações, copie o arquivo `plc_hmi.db` entre PCs.

---

## 🎓 **Exemplo Completo**

### **No TIA Portal:**
```scl
TYPE "UDT_TCP_Data"
STRUCT
    Word : Array[0..64] of Word;
    Int : Array[0..64] of Int;
    Real : Array[0..64] of Real;
    Real2 : Array[0..64] of Real;
END_STRUCT
END_TYPE
```

### **No HMI:**
1. PLC conecta → Card aparece
2. Clica "Configurar"
3. Adiciona:
   - Bloco 1: WORD × 65 = 130 bytes
   - Bloco 2: INT × 65 = 130 bytes
   - Bloco 3: REAL × 65 = 260 bytes
   - Bloco 4: REAL × 65 = 260 bytes
   - **Total: 780 bytes**
4. Salva
5. ✅ Parsing correto automaticamente!

---

**Pronto para produção!** 🚀
