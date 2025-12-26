

  import { useState, useCallback, useEffect } from 'react';
  import { listen } from '@tauri-apps/api/event';
  import { NotificationMessages, NotificationFilters } from '../utils/notificationMessages';

  // Notificação de perda/reconexão com backend Tauri
  // (deve ser declarada após os imports)

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  plcIp?: string;
}

interface InternalState {
  notifications: Notification[];
  unreadCount: number;
}

export const useNotifications = () => {
    // Remove notificação de tag desativado quando reabilitado
    const removeTagDisabledNotification = useCallback((tagName: string, plcIp: string) => {
      setState(prevState => {
        const notifications = prevState.notifications.filter((n: Notification) =>
          !(n.title === 'Tag Desativado' && n.message.includes(tagName) && (n.plcIp || '') === (plcIp || ''))
        );
        const unreadCount = notifications.filter((n: Notification) => !n.read).length;
        return { notifications, unreadCount };
      });
    }, []);
  const [state, setState] = useState<InternalState>({
    notifications: [],
    unreadCount: 0
  });


  // Adicionar nova notificação (deduplicação por contexto, persistência real)
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setState(prevState => {
      // Deduplicação: não adicionar se já existe uma igual (título, mensagem, tipo, plcIp, porta, não lida)
      const exists = prevState.notifications.some(n =>
        !n.read &&
        n.title === notification.title &&
        n.message === notification.message &&
        n.type === notification.type &&
        (n.plcIp || '') === (notification.plcIp || '')
      );
      if (exists) return prevState;

      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false
      };
      const newNotifications = [newNotification, ...prevState.notifications].slice(0, 50); // Limitar a 50 notificações
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return {
        notifications: newNotifications,
        unreadCount
      };
    });
  }, []);

  // Notificação persistente de tag desativado
  const addTagDisabledNotification = useCallback((tagName: string, plcIp: string) => {
    setState(prevState => {
      // Não adicionar se já existe igual
      const exists = prevState.notifications.some(n =>
        !n.read &&
        n.title === 'Tag Desativado' &&
        n.message.includes(tagName) &&
        (n.plcIp || '') === (plcIp || '')
      );
      if (exists) return prevState;
      const newNotification = {
        id: `tag-disabled-${plcIp}-${tagName}`,
        type: 'error' as const,
        title: 'Tag Desativado',
        message: `O tag "${tagName}" está desativado no PLC ${plcIp}. Ative para restaurar a comunicação.`,
        timestamp: new Date(),
        read: false,
        plcIp
      };
      const newNotifications = [newNotification, ...prevState.notifications].slice(0, 50);
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return { notifications: newNotifications, unreadCount };
    });
  }, []);

  // Ouvir evento global para notificação de tag desativado e backend iniciado
  useEffect(() => {
    let unlistenTauriStarted: (() => void) | null = null;
    (async () => {
      unlistenTauriStarted = await listen('tauri-started', (_event: any) => {
        addNotification({
          type: 'success',
          title: 'Backend Inicializado',
          message: 'O backend Tauri foi iniciado com sucesso.'
        });
      });
    })();
    const handler = (e: any) => {
      if (e.detail && e.detail.tagName && e.detail.plcIp) {
        addTagDisabledNotification(e.detail.tagName, e.detail.plcIp);
      }
    };
    window.addEventListener('tag-disabled-notification', handler);
    return () => {
      window.removeEventListener('tag-disabled-notification', handler);
      if (unlistenTauriStarted) unlistenTauriStarted();
    };
  }, [addTagDisabledNotification, addNotification]);

  // Ouvir evento Tauri para mudança de status de tag em tempo real
  useEffect(() => {
    const unlisten = listen('tag-status-changed', (event: any) => {
      const { tag_name, plc_ip, enabled } = event.payload || {};
      if (tag_name && plc_ip) {
        if (enabled === false) {
          addTagDisabledNotification(tag_name, plc_ip);
        } else {
          // Usar setTimeout para garantir timestamp mais recente
          setTimeout(() => {
            setState(prevState => {
              // Remover qualquer notificação de "Tag Desativado" relacionada
              const filtered = prevState.notifications.filter(n =>
                !(n.title === 'Tag Desativado' && n.message.includes(tag_name) && (n.plcIp || '') === (plc_ip || ''))
              );
              
              // Criar notificação de reativação com timestamp atual (garantidamente mais recente)
              const newNotification: Notification = {
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'success',
                title: 'Tag Reativado',
                message: `O tag "${tag_name}" foi reativado no PLC ${plc_ip}.`,
                plcIp: plc_ip,
                timestamp: new Date(),
                read: false
              };
              
              // Adicionar no início do array
              const newNotifications = [newNotification, ...filtered].slice(0, 50);
              const unreadCount = newNotifications.filter(n => !n.read).length;
              
              return { notifications: newNotifications, unreadCount };
            });
          }, 10); // 10ms delay para garantir timestamp diferente
        }
      }
    });
    return () => {
      unlisten.then(f => f && f());
    };
  }, [addTagDisabledNotification]);

  // Carregar eventos de PLC e tags do banco ao iniciar
  useEffect(() => {
    const fetchPlcAndTagEvents = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        // get_all_known_plcs retorna [ip, status][]
        const allPlcs: [string, string][] = await invoke('get_all_known_plcs');
        for (const [plcIp, status] of allPlcs) {
          // Notificar status do PLC (bloqueado, desconectado, conectado)
          if (status === 'blocked') {
            addNotification({
              type: 'error',
              title: 'PLC Bloqueado',
              message: `${plcIp} foi desconectado e bloqueado por segurança`,
              plcIp
            });
          } else if (status === 'disconnected') {
            addNotification({
              type: 'warning',
              title: 'PLC Desconectou',
              message: `${plcIp} saiu da rede`,
              plcIp
            });
          } else if (status === 'connected') {
            addNotification({
              type: 'success',
              title: 'PLC Conectado',
              message: `${plcIp} está online`,
              plcIp
            });
          }
          // Carregar tags do PLC
          const tags = await invoke<any[]>('load_tag_mappings', { plcIp });
          tags.forEach((t: any) => {
            if (t.enabled === false) {
              addTagDisabledNotification(t.tag_name, plcIp);
            } else {
              removeTagDisabledNotification(t.tag_name, plcIp);
            }
            // Se quiser notificar outros eventos de tag, adicione aqui
            // Exemplo: notificar tags recém criados/desativados, etc.
          });
        }
      } catch (e) {
        // Silencioso
      }
    };
    fetchPlcAndTagEvents();
  }, [addTagDisabledNotification, addNotification]);

  // ...existing code...

  // Marcar notificação como lida
  const markAsRead = useCallback((id: string) => {
    setState(prevState => {
      const notifications = prevState.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter(n => !n.read).length;
      
      return { notifications, unreadCount };
    });
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setState(prevState => ({
      notifications: prevState.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  }, []);

  // Remover notificação
  const removeNotification = useCallback((id: string) => {
    setState(prevState => {
      const notifications = prevState.notifications.filter(n => n.id !== id);
      const unreadCount = notifications.filter(n => !n.read).length;
      
      return { notifications, unreadCount };
    });
  }, []);

  // Limpar todas as notificações
  const clearAll = useCallback(() => {
    setState({
      notifications: [],
      unreadCount: 0
    });
  }, []);

  // 📡 ESCUTAR EVENTOS REAIS DO BACKEND
  useEffect(() => {
    let unsubscribes: Array<() => void> = [];
    let performanceMonitor: number | null = null;
    const setupEventListeners = async () => {
      // 🔗 PLC EVENTOS
      unsubscribes.push(await listen('plc-connected', (event: any) => {
        const notification = NotificationMessages.INFO.plcConnected(event.payload.ip, event.payload.id);
        addNotification({ ...notification, plcIp: event.payload.ip });
      }));
      unsubscribes.push(await listen('plc-disconnected', (event: any) => {
        const notification = NotificationMessages.WARNING.plcDisconnected(event.payload.ip);
        addNotification({ ...notification, plcIp: event.payload.ip });
      }));
      unsubscribes.push(await listen('plc-force-disconnected', (event: any) => {
        const notification = NotificationMessages.CRITICAL.plcBlocked(event.payload.ip);
        addNotification({ ...notification, plcIp: event.payload.ip });
      }));
      // 🚀 SERVIDOR TCP EVENTOS
      unsubscribes.push(await listen('tcp-server-started', (event: any) => {
        const message = event.payload as string;
        const port = parseInt(message.match(/porta (\d+)/)?.[1] || '8502');
        const notification = NotificationMessages.INFO.serverStarted(port);
        addNotification(notification);
      }));
      unsubscribes.push(await listen('tcp-server-stopped', () => {
        const notification = NotificationMessages.INFO.serverStopped();
        addNotification(notification);
      }));
      // 📡 WEBSOCKET EVENTOS REAIS
      // 📦 SQLITE ERROS CRÍTICOS
      unsubscribes.push(await listen('sqlite-error', (event: any) => {
        const { operation, message } = event.payload || {};
        addNotification({
          type: 'error',
          title: 'Erro Crítico no Banco',
          message: `Falha em ${operation || 'operação desconhecida'}: ${message || 'Erro desconhecido'}`
        });
      }));

      // 🚨 Notificação robusta de criação de tag
      unsubscribes.push(await listen('tag-created', (event: any) => {
        const payload = event.payload || {};
        addNotification({
          type: 'success',
          title: 'Novo Tag Criado',
          message: `Tag "${payload.tag_name}" (${payload.variable_path}) criado para PLC ${payload.plc_ip} (${payload.collect_mode === 'interval' ? `por ciclo: ${payload.collect_interval_s || 1}s` : 'apenas se mudar'})`,
          plcIp: payload.plc_ip
        });
      }));
      unsubscribes.push(await listen('websocket-server-started', (event: any) => {
        const addresses = event.payload.addresses || [];
        const msg = addresses.length > 0
          ? `Servidor WebSocket iniciado em: ${addresses.join(', ')}`
          : 'Servidor WebSocket iniciado';
        addNotification({
          type: 'success',
          title: 'WebSocket Iniciado',
          message: msg
        });
      }));
      unsubscribes.push(await listen('websocket-server-stopped', () => {
        addNotification({
          type: 'info',
          title: 'WebSocket Parado',
          message: 'Servidor WebSocket foi interrompido'
        });
      }));
      unsubscribes.push(await listen('websocket-client-connected', (event: any) => {
        const totalClients = event.payload.total_clients || 1;
        const address = event.payload.address || 'desconhecido';
        addNotification({
          type: 'info',
          title: 'Cliente WebSocket Conectado',
          message: `Cliente ${address} conectou (${totalClients} ativo${totalClients !== 1 ? 's' : ''})`,
        });
      }));
      unsubscribes.push(await listen('websocket-client-disconnected', (event: any) => {
        const totalClients = event.payload.total_clients || 0;
        const address = event.payload.address || 'desconhecido';
        addNotification({
          type: 'info',
          title: 'Cliente WebSocket Desconectado',
          message: `Cliente ${address} desconectou (${totalClients} ativo${totalClients !== 1 ? 's' : ''})`,
        });
      }));
      // 📊 MONITORAMENTO DE PERFORMANCE (filtrado)
      unsubscribes.push(await listen('plc-data-received', (event: any) => {
        const latencyMs = Math.round(event.payload.processing_time_us / 1000);
        if (NotificationFilters.shouldNotifyPerformance('latency', latencyMs)) {
          const notification = NotificationMessages.WARNING.highLatency(event.payload.ip, latencyMs);
          addNotification({ ...notification, plcIp: event.payload.ip });
        }
      }));
      unsubscribes.push(await listen('tcp-stats', (event: any) => {
        const activeConnections = event.payload.active_connections;
        if (NotificationFilters.shouldNotifyPerformance('connections', activeConnections)) {
          const notification = NotificationMessages.WARNING.serverOverload(activeConnections);
          addNotification(notification);
        }
      }));
      unsubscribes.push(await listen('plc-data-stats', (event: any) => {
        // Alertar apenas se PLC parou de enviar dados completamente
        if (event.payload.bytesPerSecond === 0 && event.payload.totalBytes > 0) {
          const notification = NotificationMessages.CRITICAL.noData(event.payload.ip);
          addNotification({ ...notification, plcIp: event.payload.ip });
        }
      }));
      // 🔧 MONITORAMENTO DE SISTEMA (simplificado)
      performanceMonitor = window.setInterval(() => {
        // Checagem segura para performance.memory (existe só em alguns browsers)
        const perf: any = performance;
        if (perf && perf.memory && perf.memory.usedJSHeapSize) {
          const memUsageMB = Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
          if (NotificationFilters.shouldNotifyPerformance('memory', memUsageMB)) {
            const notification = NotificationMessages.SYSTEM.performanceAlert('Memória', `${memUsageMB}MB em uso`);
            addNotification(notification);
          }
        }
      }, 120000); // Check a cada 2 minutos

      // 🗃️ POSTGRESQL EVENTOS
      unsubscribes.push(await listen('postgres-config-saved', (event: any) => {
        const { host, port, user, database } = event.payload || {};
        addNotification({
          type: 'success',
          title: 'Configuração PostgreSQL Salva',
          message: `Dados de conexão salvos: ${user}@${host}:${port}/${database} - Configuração persistida no SQLite local`
        });
      }));
      
      unsubscribes.push(await listen('postgres-config-error', (event: any) => {
        const { operation, error } = event.payload || {};
        addNotification({
          type: 'error',
          title: 'Erro PostgreSQL',
          message: `Falha na operação '${operation || 'desconhecida'}': ${error || 'Erro não especificado'}`
        });
      }));
      
      unsubscribes.push(await listen('postgres-connection-success', (event: any) => {
        const { host, port, user, database } = event.payload || {};
        addNotification({
          type: 'success',
          title: 'PostgreSQL Conectado',
          message: `Teste de conexão bem-sucedido: ${user}@${host}:${port}/${database} - Servidor PostgreSQL está respondendo`
        });
      }));
      
      unsubscribes.push(await listen('postgres-connection-error', (event: any) => {
        const { host, port, operation, error } = event.payload || {};
        addNotification({
          type: 'error',
          title: 'Erro de Conexão PostgreSQL',
          message: `Falha ao conectar em ${host}:${port} (${operation || 'teste'}): ${error || 'Erro de rede ou credenciais'}`
        });
      }));
      
      // Eventos de gerenciamento de bancos de dados
      unsubscribes.push(await listen('postgres-database-created', (event: any) => {
        const { host, port, database } = event.payload || {};
        addNotification({
          type: 'success',
          title: 'Banco de Dados Criado',
          message: `Banco '${database}' criado com sucesso em ${host}:${port} - Pronto para uso no sistema`
        });
      }));
      
      unsubscribes.push(await listen('postgres-database-dropped', (event: any) => {
        const { database } = event.payload || {};
        addNotification({
          type: 'warning',
          title: 'Banco de Dados Excluído',
          message: `Banco '${database}' foi excluído permanentemente do servidor PostgreSQL`
        });
      }));
      
      unsubscribes.push(await listen('postgres-database-error', (event: any) => {
        const { operation, database, error } = event.payload || {};
        addNotification({
          type: 'error',
          title: 'Erro de Gerenciamento PostgreSQL',
          message: `Falha na operação '${operation || 'desconhecida'}' no banco '${database || 'desconhecido'}': ${error || 'Erro não especificado'}`
        });
      }));
      
      // Eventos de inspeção de banco de dados
      unsubscribes.push(await listen('postgres-database-inspected', (event: any) => {
        const { database, tables_count } = event.payload || {};
        addNotification({
          type: 'success',
          title: 'Banco Inspecionado',
          message: `Estrutura do banco '${database}' analisada com sucesso - ${tables_count} tabelas encontradas`
        });
      }));
    };
    setupEventListeners().catch(console.error);
    return () => {
      unsubscribes.forEach(unsub => { try { unsub(); } catch {} });
      if (performanceMonitor) clearInterval(performanceMonitor);
    };
  }, [addNotification]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    addTagDisabledNotification,
    removeTagDisabledNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}