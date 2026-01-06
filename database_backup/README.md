# 📦 Database Backup - PLC System

Backup dos bancos de dados SQLite do sistema PLC.

## Arquivos

| Arquivo | Origem | Descrição |
|---------|--------|-----------|
| `plc_config_plc-app.db` | `com.admin.plc-app` | Configurações do PLC App (vídeos, bits, templates) |
| `plc_hmi_tauri-dev.db` | `com.tauri.dev` | Dados do PLC HMI (tags, configurações servidor) |

## Localização Original

Os bancos SQLite são armazenados pelo Tauri em:
```
Windows: %APPDATA%\{app-identifier}\
Linux: ~/.config/{app-identifier}/
macOS: ~/Library/Application Support/{app-identifier}/
```

## Restauração

Para restaurar, copie o arquivo `.db` correspondente para a pasta do aplicativo:

```powershell
# PLC App
Copy-Item "plc_config_plc-app.db" "$env:APPDATA\com.admin.plc-app\plc_config.db"

# PLC HMI (desenvolvimento)
Copy-Item "plc_hmi_tauri-dev.db" "$env:APPDATA\com.tauri.dev\plc_hmi.db"
```

## Última Atualização

- **Data:** 2026-01-06
- **Commit:** feat(backup): incluir backup dos bancos SQLite
