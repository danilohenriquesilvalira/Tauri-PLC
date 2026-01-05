// Sistema organizado de mensagens de notificação
export const NotificationMessages = {
  
  // 🚨 CRÍTICAS - Problemas que afetam operação
  CRITICAL: {
    plcBlocked: (ip: string) => ({
      type: 'error' as const,
      title: 'PLC Bloqueado',
      message: `${ip} foi desconectado e bloqueado por segurança`
    }),
    
    systemError: (operation: string, details: string) => ({
      type: 'error' as const,
      title: 'Falha do Sistema',
      message: `Erro em ${operation}: ${details}`
    }),
    
    noData: (ip: string) => ({
      type: 'error' as const,
      title: 'PLC Sem Resposta',
      message: `${ip} parou de enviar dados`
    }),
    
    databaseError: (details: string) => ({
      type: 'error' as const,
      title: 'Erro de Banco',
      message: `Falha no banco de dados: ${details}`
    }),
    
    // 🆕 BACKPRESSURE - Só notifica quando crítico
    bufferOverflow: (dropRate: number) => ({
      type: 'error' as const,
      title: 'Buffer Sobrecarregado',
      message: `${dropRate.toFixed(1)}% das mensagens descartadas - sistema sob pressão`
    }),
    
    // 🆕 MEMÓRIA CRÍTICA
    memoryCritical: (usageMB: number) => ({
      type: 'error' as const,
      title: 'Memória Crítica',
      message: `Uso de ${usageMB.toFixed(1)}MB - considere reiniciar serviços`
    }),
    
    // 🆕 CONEXÃO MORTA (Watchdog detectou)
    connectionDead: (ip: string, secondsSinceData: number) => ({
      type: 'error' as const,
      title: 'Conexão Morta',
      message: `${ip} sem dados há ${secondsSinceData}s - conexão encerrada pelo Watchdog`
    }),
    
    // 🆕 TIMEOUT DE CONEXÃO TCP
    connectionTimeout: (ip: string, reason: string) => ({
      type: 'error' as const,
      title: 'Timeout de Conexão',
      message: `${ip} timeout: ${reason}`
    }),
    
    // 🆕 ERRO DE CONEXÃO TCP
    connectionError: (ip: string, error: string) => ({
      type: 'error' as const,
      title: 'Erro de Conexão',
      message: `${ip} erro: ${error}`
    }),
    
    // 🆕 ERRO NO WEBSOCKET
    websocketError: (operation: string, details: string) => ({
      type: 'error' as const,
      title: 'Erro WebSocket',
      message: `Falha em ${operation}: ${details}`
    }),
    
    // 🆕 CLIENTE WEBSOCKET ERRO
    websocketClientError: (clientId: number, error: string) => ({
      type: 'error' as const,
      title: 'Erro Cliente WebSocket',
      message: `Cliente #${clientId}: ${error}`
    })
  },

  // ⚠️ AVISOS - Situações que precisam atenção
  WARNING: {
    plcDisconnected: (ip: string) => ({
      type: 'warning' as const,
      title: 'PLC Desconectou',
      message: `${ip} saiu da rede`
    }),
    
    highLatency: (ip: string, latencyMs: number) => ({
      type: 'warning' as const,
      title: 'Comunicação Lenta',
      message: `${ip} respondendo em ${latencyMs}ms`
    }),
    
    serverOverload: (activeConnections: number) => ({
      type: 'warning' as const,
      title: 'Servidor Sobrecarregado',
      message: `${activeConnections} PLCs conectados simultaneamente`
    }),
    
    securityAlert: (blockedCount: number) => ({
      type: 'warning' as const,
      title: 'Alerta de Segurança',
      message: `${blockedCount} IP(s) bloqueados por tentativas suspeitas`
    }),
    
    // 🆕 BACKPRESSURE - Sampling ativado (não crítico mas importante)
    bufferPressure: (usagePct: number) => ({
      type: 'warning' as const,
      title: 'Buffer sob Pressão',
      message: `Uso em ${usagePct.toFixed(0)}% - sistema adaptando automaticamente`
    }),
    
    // 🆕 CACHE DE TAGS ALTO
    tagCacheHigh: (count: number, maxCount: number) => ({
      type: 'warning' as const,
      title: 'Cache de Tags Alto',
      message: `${count}/${maxCount} tags em cache (${((count/maxCount)*100).toFixed(0)}%)`
    }),
    
    // 🆕 CONEXÃO LENTA (Watchdog aviso)
    connectionSlow: (ip: string, secondsSinceData: number) => ({
      type: 'warning' as const,
      title: 'Conexão Lenta',
      message: `${ip} sem dados há ${secondsSinceData}s - possível problema`
    }),
    
    // 🆕 BACKPRESSURE SAMPLING ATIVADO
    backpressureSampling: (samplingRate: number) => ({
      type: 'warning' as const,
      title: 'Sampling Ativado',
      message: `Sistema sob pressão - aceitando ${(samplingRate * 100).toFixed(0)}% das mensagens`
    }),
    
    // 🆕 BUFFER EXPANDIDO
    bufferExpanded: (oldCapacity: number, newCapacity: number) => ({
      type: 'warning' as const,
      title: 'Buffer Expandido',
      message: `Capacidade aumentada: ${oldCapacity} → ${newCapacity} para lidar com carga`
    })
  },

  // ℹ️ INFORMAÇÕES - Status e operações normais
  INFO: {
    plcConnected: (ip: string, id: number) => ({
      type: 'success' as const,
      title: 'PLC Conectou',
      message: `${ip} online (ID #${id})`
    }),
    
    serverStarted: (port: number) => ({
      type: 'success' as const,
      title: 'Servidor Iniciado',
      message: `Sistema TCP ativo na porta ${port}`
    }),
    
    serverStopped: () => ({
      type: 'info' as const,
      title: 'Servidor Parado',
      message: 'Sistema TCP foi interrompido'
    }),
    
    configSaved: (configType: string) => ({
      type: 'success' as const,
      title: 'Configuração Salva',
      message: `${configType} atualizada com sucesso`
    }),
    
    websocketClient: (action: 'conectou' | 'desconectou', address: string, totalClients: number) => ({
      type: 'info' as const,
      title: 'Cliente WebSocket',
      message: `${address} ${action} (${totalClients} ativo${totalClients !== 1 ? 's' : ''})`
    }),
    
    // 🆕 WEBSOCKET INICIADO
    websocketStarted: (port: number) => ({
      type: 'success' as const,
      title: 'WebSocket Ativo',
      message: `Broadcast iniciado na porta ${port}`
    }),
    
    // 🆕 WEBSOCKET PARADO
    websocketStopped: () => ({
      type: 'info' as const,
      title: 'WebSocket Parado',
      message: 'Broadcast interrompido'
    }),
    
    // 🆕 BUFFER RECUPERADO
    bufferRecovered: () => ({
      type: 'success' as const,
      title: 'Sistema Normalizado',
      message: 'Buffer de broadcast recuperado - operação normal'
    })
  },

  // 🔧 SISTEMA - Eventos internos importantes
  SYSTEM: {
    startupCheck: (service: string, status: 'ok' | 'error') => ({
      type: status === 'ok' ? 'success' as const : 'warning' as const,
      title: status === 'ok' ? 'Sistema OK' : 'Serviço Offline',
      message: `${service}: ${status === 'ok' ? 'funcionando' : 'não disponível'}`
    }),
    
    performanceAlert: (resource: string, value: string) => ({
      type: 'warning' as const,
      title: 'Performance',
      message: `${resource}: ${value}`
    }),
    
    maintenanceMode: (enabled: boolean) => ({
      type: 'info' as const,
      title: enabled ? 'Modo Manutenção' : 'Operação Normal',
      message: enabled ? 'Sistema em manutenção' : 'Sistema em operação normal'
    })
  }
};

// 🎯 HELPER para criar notificações personalizadas rapidamente
export const createNotification = {
  success: (title: string, message: string, plcIp?: string) => ({ type: 'success' as const, title, message, plcIp }),
  warning: (title: string, message: string, plcIp?: string) => ({ type: 'warning' as const, title, message, plcIp }),
  error: (title: string, message: string, plcIp?: string) => ({ type: 'error' as const, title, message, plcIp }),
  info: (title: string, message: string, plcIp?: string) => ({ type: 'info' as const, title, message, plcIp })
};

// Utilitário para filtrar notificações por contexto
export const NotificationFilters = {
  // Não notificar configurações padrão
  shouldNotifyConfig: (config: any): boolean => {
    // Se WebSocket está com valores padrão, não notificar
    if (config.max_clients === 100 && config.port === 8765) {
      return false;
    }
    return true;
  },
  
  // Não notificar conexões únicas de WebSocket (spam)
  shouldNotifyWebSocketClient: (totalClients: number): boolean => {
    // Só notificar se for mais de 1 cliente ou evento especial
    return totalClients > 1;
  },
  
  // Só notificar performance se for crítica
  shouldNotifyPerformance: (metric: string, value: number): boolean => {
    switch (metric) {
      case 'memory':
        return value > 200; // Só acima de 200MB
      case 'latency':
        return value > 50; // Só acima de 50ms
      case 'connections':
        return value >= 8; // Só 8+ conexões simultâneas
      default:
        return false;
    }
  },
  
  // 🆕 BACKPRESSURE - Só notificar em situações importantes
  // Recebe métricas brutas do backend e calcula drop rate
  shouldNotifyBackpressure: (
    state: string, 
    usagePct: number, 
    messagesDropped: number,
    messagesProcessed: number
  ): 'none' | 'warning' | 'error' | 'success' => {
    // Calcular drop rate percentual
    const totalMessages = messagesProcessed + messagesDropped;
    const dropRate = totalMessages > 0 ? (messagesDropped / totalMessages) * 100 : 0;
    
    // Normalizar state para lowercase para comparação
    const normalizedState = state.toLowerCase();
    
    // Crítico: mais de 5% de drops
    if (dropRate > 5) return 'error';
    
    // Warning: buffer acima de 80% (mas sem drops significativos)
    if (usagePct > 80 && normalizedState !== 'normal') return 'warning';
    
    // Success: voltou ao normal após problema
    if (normalizedState === 'normal' && usagePct < 30) return 'success';
    
    // Não notificar situações normais
    return 'none';
  },
  
  // 🆕 MEMÓRIA - Só notificar em situações críticas
  shouldNotifyMemory: (usageKB: number, healthStatus: string): 'none' | 'warning' | 'error' => {
    const usageMB = usageKB / 1024;
    
    // Crítico: acima de 500MB ou status crítico
    if (usageMB > 500 || healthStatus === 'critical') return 'error';
    
    // Warning: acima de 300MB ou status warning
    if (usageMB > 300 || healthStatus === 'warning') return 'warning';
    
    return 'none';
  },
  
  // 🆕 CACHE DE TAGS - Só notificar quando perto do limite
  shouldNotifyTagCache: (currentSize: number, maxSize: number): boolean => {
    const usagePct = (currentSize / maxSize) * 100;
    return usagePct > 85; // Só notificar acima de 85%
  }
};