import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface PlcData {
  timestamp: string;
  variables: Record<string, number>;
}

export interface ConnectionStats {
  active_connections: number;
  total_connections: number;
  last_data_time: number;
  server_status: string;
  plc_status: string;
}

export interface TcpConnection {
  connection_id: number;
  address: string;
  is_plc: boolean;
}

// 🆕 Interface para health da conexão
export interface ConnectionHealth {
  ip: string;
  conn_id: number;
  seconds_since_data: number;
  is_alive: boolean;
  last_error?: string;
}

export const useTcpServer = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isPlcConnected, setIsPlcConnected] = useState(false);
  const [latestPlcData, setLatestPlcData] = useState<PlcData | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [connections, setConnections] = useState<TcpConnection[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [availablePlcs, setAvailablePlcs] = useState<string[]>([]);
  // 🆕 Estado para saúde das conexões
  const [connectionHealth, setConnectionHealth] = useState<Map<string, ConnectionHealth>>(new Map());

  // Adiciona log ao histórico
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setServerLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]); // Mantém últimos 100 logs
  }, []);

  // Inicia o servidor TCP
  const startTcpServer = useCallback(async (port: number = 8502) => {
    try {
      const response = await invoke<string>('start_tcp_server', { port });
      setIsServerRunning(true);
      addLog(`✅ ${response}`);
      return { success: true, message: response };
    } catch (error) {
      addLog(`❌ Erro ao iniciar servidor: ${error}`);
      return { success: false, message: error as string };
    }
  }, [addLog]);

  // Para o servidor TCP
  const stopTcpServer = useCallback(async () => {
    try {
      const response = await invoke<string>('stop_tcp_server');
      setIsServerRunning(false);
      setIsPlcConnected(false);
      setConnectionHealth(new Map()); // Limpar health tracking
      addLog(`🛑 ${response}`);
      return { success: true, message: response };
    } catch (error) {
      addLog(`❌ Erro ao parar servidor: ${error}`);
      return { success: false, message: error as string };
    }
  }, [addLog]);

  // Conecta ao PLC
  const connectToPlc = useCallback(async (plcIp: string, plcPort: number = 8502) => {
    try {
      const response = await invoke<string>('connect_to_plc', {
        plcIp,
        plcPort
      });
      addLog(`🔄 ${response}`);
      return { success: true, message: response };
    } catch (error) {
      addLog(`❌ Erro ao conectar PLC: ${error}`);
      return { success: false, message: error as string };
    }
  }, [addLog]);

  // Desconecta do PLC
  const disconnectFromPlc = useCallback(async (clientIp?: string) => {
    try {
      const response = await invoke<string>('disconnect_plc', {
        clientIp: clientIp || 'all'
      });
      setIsPlcConnected(false);
      addLog(`🔌 ${response}`);
      return { success: true, message: response };
    } catch (error) {
      addLog(`❌ Erro ao desconectar PLC: ${error}`);
      return { success: false, message: error as string };
    }
  }, [addLog]);

  // Permite reconexão do PLC (remove da blacklist)
  const allowPlcReconnect = useCallback(async (clientIp: string) => {
    try {
      const response = await invoke<string>('allow_plc_reconnect', {
        clientIp
      });
      addLog(`✅ ${response}`);
      return { success: true, message: response };
    } catch (error) {
      addLog(`❌ Erro ao permitir reconexão: ${error}`);
      return { success: false, message: error as string };
    }
  }, [addLog]);

  // Auto-descoberta de PLCs
  const discoverPlcs = useCallback(async () => {
    try {
      addLog('🔍 Iniciando descoberta de PLCs...');
      const discovered = await invoke<string[]>('auto_discover_plc');
      setAvailablePlcs(discovered);
      addLog(`📡 Encontrados ${discovered.length} PLCs potenciais: ${discovered.join(', ')}`);
      return { success: true, plcs: discovered };
    } catch (error) {
      addLog(`❌ Erro na descoberta: ${error}`);
      return { success: false, plcs: [] };
    }
  }, [addLog]);

  // Escaneamento completo da rede
  const scanNetworkForPlcs = useCallback(async () => {
    try {
      addLog('🔍 Escaneando rede para PLCs...');

      // Adicionar timeout para não travar
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout no escaneamento')), 10000); // 10 segundos
      });

      const scanPromise = invoke<any[]>('scan_network_for_plcs');

      const discovered = await Promise.race([scanPromise, timeoutPromise]) as any[];

      addLog(`📡 Encontrados ${discovered?.length || 0} PLCs na rede`);
      return { success: true, plcs: discovered || [] };
    } catch (error) {
      console.error('Erro no escaneamento:', error);
      addLog(`❌ Erro no escaneamento: ${error}`);

      // Retornar PLC padrão como fallback
      const fallbackPlcs = [{
        ip: '192.168.1.33',
        port: 8502,
        status: 'online',
        manufacturer: 'PLC Industrial (Fallback)',
        model: 'TCP-8502',
        response_time: 25
      }];

      addLog('🔄 Usando configuração padrão como fallback');
      return { success: true, plcs: fallbackPlcs };
    }
  }, [addLog]);

  // Teste de conexão específica
  const testPlcConnection = useCallback(async (ip: string, port: number) => {
    try {
      const isReachable = await invoke<boolean>('test_plc_connection', { ip, port });
      return isReachable;
    } catch (error) {
      console.error(`Erro ao testar conexão ${ip}:${port}:`, error);
      return false;
    }
  }, []);

  // Obtém últimos dados do PLC
  const getLatestPlcData = useCallback(async () => {
    try {
      const data = await invoke<PlcData | null>('get_latest_plc_data');
      if (data) {
        setLatestPlcData(data);
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter dados do PLC:', error);
      return null;
    }
  }, []);

  // Obtém variável específica do PLC
  const getPlcVariable = useCallback(async (variableName: string) => {
    try {
      const value = await invoke<number | null>('get_plc_variable', { variableName });
      return value;
    } catch (error) {
      console.error(`Erro ao obter variável ${variableName}:`, error);
      return null;
    }
  }, []);

  // Obtém estatísticas de conexão
  const getConnectionStats = useCallback(async () => {
    try {
      const stats = await invoke<ConnectionStats>('get_connection_stats');
      setConnectionStats(stats);
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }, []);

  // Obtém bytes recebidos de todos os PLCs
  const getAllPlcBytes = useCallback(async () => {
    try {
      const bytesMap = await invoke<Record<string, number>>('get_all_plc_bytes');
      return bytesMap;
    } catch (error) {
      console.error('Erro ao obter bytes:', error);
      return {};
    }
  }, []);

  // 🆕 Throttle para evitar muitos re-renders
  const throttledSetPlcData = useCallback((data: PlcData) => {
    // Usar requestAnimationFrame para throttle natural
    requestAnimationFrame(() => {
      setLatestPlcData(data);
    });
  }, []);

  // Configurar listeners para eventos do backend
  useEffect(() => {
    let packetCount = 0;

    const setupListeners = async () => {
      // Listener para quando o servidor TCP é iniciado
      const unlistenServerStarted = await listen<string>('tcp-server-started', (event) => {
        setIsServerRunning(true);
        addLog(`🚀 ${event.payload}`);
      });

      // Listener para novas conexões TCP
      const unlistenNewConnection = await listen<TcpConnection>('tcp-new-connection', (event) => {
        const conn = event.payload;
        setConnections(prev => [...prev, conn]);
        addLog(`🔗 Nova conexão #${conn.connection_id} de ${conn.address}${conn.is_plc ? ' (PLC)' : ''}`);
      });

      // Listener para dados do PLC em tempo real (com throttle)
      const unlistenPlcData = await listen<PlcData>('plc-data', (event) => {
        packetCount++;
        throttledSetPlcData(event.payload);

        // Log apenas a cada 20 pacotes (mais espaçado)
        if (packetCount % 20 === 0) {
          addLog(`📊 Dados recebidos: ${Object.keys(event.payload.variables).length} variáveis (pacote #${packetCount})`);
        }
      });

      // Listener para quando PLC conecta
      const unlistenPlcConnected = await listen<any>('plc-connected', (event) => {
        setIsPlcConnected(true);
        const ip = event.payload.ip || event.payload;
        const id = event.payload.id || '?';
        addLog(`✅ PLC conectado: ${ip} (ID: ${id})`);

        // 🆕 Atualizar health tracking
        setConnectionHealth(prev => {
          const updated = new Map(prev);
          updated.set(ip, {
            ip,
            conn_id: id,
            seconds_since_data: 0,
            is_alive: true
          });
          return updated;
        });
      });

      // Listener para quando PLC desconecta
      const unlistenPlcDisconnected = await listen<any>('plc-disconnected', (event) => {
        const ip = event.payload.ip || event.payload;
        addLog(`❌ PLC desconectado: ${ip}`);

        // 🆕 Remover do health tracking
        setConnectionHealth(prev => {
          const updated = new Map(prev);
          updated.delete(ip);
          if (updated.size === 0) {
            setIsPlcConnected(false);
          }
          return updated;
        });
      });

      // Listener para estatísticas TCP
      const unlistenTcpStats = await listen<ConnectionStats>('tcp-stats', (event) => {
        setConnectionStats(event.payload);
      });

      // Listener para estatísticas de dados do PLC (bytes) - menos frequente
      const unlistenPlcDataStats = await listen<{ ip: string, id: number, bytesPerSecond: number, packets: number }>('plc-data-stats', (event) => {
        // Log apenas quando há taxa significativa
        if (event.payload.bytesPerSecond > 0) {
          addLog(`📊 PLC ${event.payload.ip} (ID #${event.payload.id}): ${event.payload.bytesPerSecond} bytes/s`);
        }
      });

      // Listener para erros TCP
      const unlistenTcpError = await listen<string>('tcp-error', (event) => {
        addLog(`❌ Erro TCP: ${event.payload}`);
      });

      // Listener para conexão fechada
      const unlistenConnectionClosed = await listen<{ connection_id: number }>('tcp-connection-closed', (event) => {
        setConnections(prev => prev.filter(conn => conn.connection_id !== event.payload.connection_id));
        addLog(`📋 Conexão #${event.payload.connection_id} fechada`);
      });

      // ========================================
      // 🆕 NOVOS LISTENERS DO WATCHDOG
      // ========================================

      // 💀 Conexão MORTA - Watchdog detectou que não há dados
      const unlistenConnectionDead = await listen<{
        ip: string,
        id: number,
        seconds_since_data: number,
        total_bytes: number,
        packet_count: number,
        reason: string
      }>('tcp-connection-dead', (event) => {
        const { ip, id, seconds_since_data, reason } = event.payload;
        addLog(`💀 CONEXÃO MORTA: ${ip} (ID: ${id})`);
        addLog(`   ⏱️ Sem dados há ${seconds_since_data}s`);
        addLog(`   📝 Motivo: ${reason}`);

        // Atualizar health
        setConnectionHealth(prev => {
          const updated = new Map(prev);
          updated.set(ip, {
            ip,
            conn_id: id,
            seconds_since_data,
            is_alive: false,
            last_error: reason
          });
          return updated;
        });
      });

      // ⚠️ Conexão LENTA - Aviso de que há problemas
      const unlistenConnectionSlow = await listen<{
        ip: string,
        id: number,
        seconds_since_data: number
      }>('tcp-connection-slow', (event) => {
        const { ip, id, seconds_since_data } = event.payload;
        addLog(`⚠️ CONEXÃO LENTA: ${ip} (ID: ${id}) - sem dados há ${seconds_since_data}s`);

        // Atualizar health
        setConnectionHealth(prev => {
          const updated = new Map(prev);
          const existing = updated.get(ip);
          updated.set(ip, {
            ...existing,
            ip,
            conn_id: id,
            seconds_since_data,
            is_alive: true // Ainda vivo, mas lento
          });
          return updated;
        });
      });

      // ⏰ Timeout de conexão
      const unlistenConnectionTimeout = await listen<{
        ip: string,
        id: number,
        reason: string
      }>('tcp-connection-timeout', (event) => {
        const { ip, id, reason } = event.payload;
        addLog(`⏰ TIMEOUT: ${ip} (ID: ${id}) - ${reason}`);
        setIsPlcConnected(false);
      });

      // ⏰ Timeout de leitura (múltiplos timeouts consecutivos)
      const unlistenReadTimeout = await listen<{
        ip: string,
        id: number,
        timeout_seconds: number,
        consecutive_timeouts: number,
        reason: string
      }>('tcp-read-timeout', (event) => {
        const { ip, id, consecutive_timeouts, reason } = event.payload;
        addLog(`⏰ TIMEOUT DE LEITURA: ${ip} (ID: ${id})`);
        addLog(`   🔄 ${consecutive_timeouts} timeouts consecutivos`);
        addLog(`   📝 ${reason}`);

        if (consecutive_timeouts >= 3) {
          setIsPlcConnected(false);
        }
      });

      // 💓 Heartbeat - sinal de vida da conexão
      const unlistenHeartbeat = await listen<{
        ip: string,
        id: number,
        last_packet_age_seconds: number,
        accumulator_size: number,
        connection_health: string
      }>('tcp-connection-heartbeat', (event) => {
        const { ip, id, last_packet_age_seconds, connection_health: health } = event.payload;

        // Atualizar health silenciosamente (sem log)
        setConnectionHealth(prev => {
          const updated = new Map(prev);
          updated.set(ip, {
            ip,
            conn_id: id,
            seconds_since_data: last_packet_age_seconds,
            is_alive: health === 'healthy'
          });
          return updated;
        });
      });

      // Cleanup function
      return () => {
        unlistenServerStarted();
        unlistenNewConnection();
        unlistenPlcData();
        unlistenPlcConnected();
        unlistenPlcDisconnected();
        unlistenTcpStats();
        unlistenPlcDataStats();
        unlistenTcpError();
        unlistenConnectionClosed();
        // 🆕 Novos listeners
        unlistenConnectionDead();
        unlistenConnectionSlow();
        unlistenConnectionTimeout();
        unlistenReadTimeout();
        unlistenHeartbeat();
      };
    };

    const cleanupPromise = setupListeners();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [addLog, throttledSetPlcData]);

  // Polling periódico para estatísticas (backup) - AUMENTADO PARA 10s
  useEffect(() => {
    if (isServerRunning) {
      const interval = setInterval(() => {
        getConnectionStats();
      }, 10000); // 🔧 ANTES: 5000ms, AGORA: 10000ms

      return () => clearInterval(interval);
    }
  }, [isServerRunning, getConnectionStats]);

  // Verificar estado inicial do servidor ao montar
  useEffect(() => {
    const checkInitialServerState = async () => {
      try {
        const stats = await invoke<ConnectionStats>('get_connection_stats');
        // Se conseguiu obter estatísticas, servidor está rodando
        if (stats.server_status === 'Rodando') {
          setIsServerRunning(true);
          setConnectionStats(stats);
          setIsPlcConnected(stats.active_connections > 0);
          addLog('✅ Servidor TCP detectado rodando na porta 8502');
        }
      } catch (error) {
        // Servidor não está rodando, manter estado inicial (false)
        console.log('Servidor TCP não está rodando');
      }
    };

    checkInitialServerState();
  }, []); // Executar apenas uma vez ao montar

  return {
    // Estados
    isServerRunning,
    isPlcConnected,
    latestPlcData,
    connectionStats,
    connections,
    serverLogs,
    availablePlcs,
    connectionHealth, // 🆕 Novo estado

    // Ações
    startTcpServer,
    stopTcpServer,
    connectToPlc,
    disconnectFromPlc,
    allowPlcReconnect,
    discoverPlcs,
    scanNetworkForPlcs,
    testPlcConnection,
    getLatestPlcData,
    getPlcVariable,
    getConnectionStats,
    getAllPlcBytes,

    // Utilidades
    clearLogs: () => setServerLogs([]),
  };
};