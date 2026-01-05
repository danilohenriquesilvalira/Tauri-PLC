# Sistema HMI - Frontend React

Frontend moderno para o sistema HMI de comunicação com PLC Siemens, desenvolvido com React, TypeScript, Vite e Tailwind CSS.

## 🚀 Tecnologias

- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool ultra-rápido
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Ícones modernos
- **WebSocket** - Comunicação em tempo real

## 📦 Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Executar em modo de desenvolvimento:**
```bash
npm run dev
```

3. **Build para produção:**
```bash
npm run build
```

4. **Preview da build:**
```bash
npm run preview
```

## 🌐 Configuração

### WebSocket
O frontend conecta automaticamente no WebSocket em `ws://localhost:8081/ws`. Para alterar a URL, modifique o arquivo `src/contexts/PLCContext.tsx`:

```typescript
<PLCProvider websocketUrl="ws://seu-servidor:porta/ws">
```

### Porta de Desenvolvimento
Por padrão, o servidor de desenvolvimento roda na porta 3000. Para alterar, modifique `vite.config.ts`.

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── BitVisualization.tsx
│   ├── ConnectionStatus.tsx
│   ├── Dashboard.tsx
│   ├── DataCard.tsx
│   ├── RawDataDisplay.tsx
│   └── TabNavigation.tsx
├── contexts/           # Contextos React
│   └── PLCContext.tsx
├── hooks/              # Custom hooks
│   └── useWebSocket.ts
├── types/              # Definições TypeScript
│   └── plc.ts
├── utils/              # Utilitários
│   └── formatters.ts
├── App.tsx             # Componente principal
├── main.tsx            # Entry point
└── index.css           # Estilos globais
```

## 📊 Funcionalidades

### Layout Moderno e Responsivo
- **Header profissional** com status de conexão em tempo real
- **Sidebar responsiva** com navegação intuitiva
- **Design mobile-first** que se adapta a qualquer tela
- **Interface touch-friendly** para tablets e smartphones

### Dashboard Executivo
- **Estatísticas em tempo real** dos dados do PLC
- **Status de conexão** WebSocket e PLC
- **Contadores** de diferentes tipos de dados
- **Visualização de métricas** principais
- **Cards informativos** com dados consolidados

### Dados Brutos
- **Visualização completa** de Words, Integers, Reals e Strings
- **Formatação hexadecimal** para Words
- **Todos os dados sem limitação** (não apenas os primeiros 20)
- **Interface responsiva** para diferentes tamanhos de tela

### Visualização Bit a Bit Ultra Moderna
- **Representação visual** dos bits de cada Word em formato binário
- **Separação por categoria**: Status (azul), Alarmes (vermelho), Eventos (verde)
- **Visualização expansível** para análise detalhada
- **Bits ativos destacados** com cores diferenciadas
- **Interface interativa** com hover e expandir/recolher

### Monitoramento de Equipamentos
- **6 equipamentos principais**: Enchimento, Esvaziamento, Portas, Esgoto, Comando
- **Status em tempo real** com indicadores visuais
- **Abas organizadas**: Status, Integers, Reals
- **Contadores de alarmes** e eventos por equipamento
- **Dados técnicos detalhados** para cada sistema

### Interface de Comandos PLC
- **Envio de comandos** Words, Integers, Reals e Strings
- **Validação em tempo real** dos valores inseridos
- **Interface drag-and-drop** para adicionar/remover comandos
- **Verificação de conectividade** antes do envio
- **Feedback visual** do status dos comandos

### Sistema de Logs Avançado
- **4 tipos de logs**: Info, Success, Warning, Error
- **Filtros avançados** por tipo e busca textual
- **Export para JSON** dos logs filtrados
- **Logs automáticos** de conexão e eventos do sistema
- **Interface limpa** com cores diferenciadas por tipo

### Status de Conexão Inteligente
- **Header integrado** com informações de conexão
- **Indicadores visuais** de status online/offline
- **Contagem de PLCs** conectados em tempo real
- **Timestamp** da última atualização
- **Reconexão automática** em caso de falha

## 🎨 Design System

### Cores
- **Primary**: Azul (#3b82f6)
- **Success**: Verde (#22c55e) 
- **Warning**: Amarelo (#f59e0b)
- **Danger**: Vermelho (#ef4444)

### Tipografia
- **Sans**: Inter (padrão do sistema)
- **Mono**: JetBrains Mono (para dados técnicos)

## 🔧 Desenvolvimento

### Scripts Disponíveis
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview da build
- `npm run lint` - Linting do código

### Convenções
- **Components**: PascalCase
- **Hooks**: camelCase com prefixo "use"
- **Types**: PascalCase com sufixo adequado
- **Utils**: camelCase

## 🔌 Integração com Backend

O frontend conecta automaticamente com o backend Go via WebSocket. Certifique-se de que:

1. O backend esteja rodando na porta 8081
2. O endpoint WebSocket `/ws` esteja disponível
3. Os tipos TypeScript estejam sincronizados com as estruturas Go

## 📝 Próximas Features

- [ ] Interface de comandos para PLC
- [ ] Visualização por equipamentos
- [ ] Sistema de logs avançado
- [ ] Gráficos históricos
- [ ] Configurações de usuário
- [ ] Temas claro/escuro
- [ ] Export de dados

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.