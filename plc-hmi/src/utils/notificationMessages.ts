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
  }
};