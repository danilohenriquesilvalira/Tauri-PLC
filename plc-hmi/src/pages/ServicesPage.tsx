import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Server,
  Database,
  Wifi,
  Activity,
  Play,
  Square,
  Settings,
  Zap,
  CheckCircle,
  Network,
  Router,
} from 'lucide-react';

import { WebSocketNetworkConfig } from '../components/websocket/WebSocketNetworkConfig';
import { PostgresConfigModal } from '../components/Admin';

interface TcpServerStats {
  active_connections: number;
  total_connections: number;
  last_data_time: number;
  server_status: string;
  plc_status: string;
}

interface WebSocketStats {
  active_connections: number;
  total_connections: number;
  messages_sent: number;
  bytes_sent: number;
  uptime_seconds: number;
  server_status: string;
  broadcast_rate_hz: number;
}

export const ServicesPage: React.FC = () => {
  const [tcpStats, setTcpStats] = useState<TcpServerStats | null>(null);
  const [wsStats, setWsStats] = useState<WebSocketStats | null>(null);
  const [tcpRunning, setTcpRunning] = useState(false);
  const [wsRunning, setWsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const [showPostgresConfig, setShowPostgresConfig] = useState(false);

  const loadInitialStats = useCallback(async () => {
    try {
      // TCP Stats
      try {
        const tcp = await invoke<TcpServerStats>('get_connection_stats');
        setTcpStats(tcp);
        setTcpRunning(tcp.server_status === 'Rodando');
      } catch {
        setTcpStats(null);
        setTcpRunning(false);
      }

      // WebSocket Stats
      try {
        const ws = await invoke<WebSocketStats>('get_websocket_stats');
        setWsStats(ws);
        setWsRunning(ws.server_status === 'Rodando');
      } catch {
        setWsStats(null);
        setWsRunning(false);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
      setLoading(false);
    }
  }, []);

  // ✅ Carregar estatísticas iniciais
  useEffect(() => {
    loadInitialStats();
    
    // Auto-refresh a cada 2 segundos
    const interval = setInterval(loadInitialStats, 2000);
    return () => clearInterval(interval);
  }, [loadInitialStats]);

  const handleStartTcp = async () => {
    try {
      await invoke('start_tcp_server', { port: 8502 });
      setTcpRunning(true);
    } catch (error) {
      console.error('Erro ao iniciar TCP:', error);
    }
  };

  const handleStopTcp = async () => {
    try {
      await invoke('stop_tcp_server');
      setTcpRunning(false);
      setTcpStats(null);
    } catch (error) {
      console.error('Erro ao parar TCP:', error);
    }
  };

  const handleStartWebSocket = async () => {
    try {
      console.log('🔄 Botão Iniciar: Usando config HARDCODED (SEM banco!)');
      
      // 🚀 PASSO 1: CONFIG DIRETA - SEM TOCAR NO BANCO!
      const config = {
        host: '0.0.0.0',
        port: 8765,
        max_clients: 100,
        broadcast_interval_ms: 1000, // 1 segundo fixo
        enabled: true,
        bind_interfaces: ['0.0.0.0']
      };
      
      console.log('🚀 Config HARDCODED:', config);
      console.log('🚀 Iniciando WebSocket agora...');
      
      // Chamar direto - SEM timeout para ver erro real
      const result = await invoke('start_websocket_server', { config });
      console.log('✅ WebSocket iniciado:', result);
      
      setWsRunning(true);
    } catch (error) {
      console.error('❌ Botão Iniciar: Erro:', error);
      alert(`Erro ao iniciar WebSocket: ${error}`);
    }
  };

  const handleStopWebSocket = async () => {
    try {
      await invoke('stop_websocket_server');
      setWsRunning(false);
      setWsStats(null);
    } catch (error) {
      console.error('Erro ao parar WebSocket:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-edp-marine"></div>
      </div>
    );
  }

  const services = [
    {
      id: 'tcp',
      name: 'TCP Server',
      description: 'Comunicação com PLCs Siemens',
      port: '8502',
      icon: Server,
      isRunning: tcpRunning,
      status: tcpRunning ? 'Operacional' : 'Parado',
      metrics: tcpStats && tcpRunning ? [
        { label: 'PLCs Ativos', value: tcpStats.active_connections },
        { label: 'Total', value: tcpStats.total_connections },
        { label: 'Status', value: tcpStats.plc_status }
      ] : [],
      onStart: handleStartTcp,
      onStop: handleStopTcp
    },
    {
      id: 'websocket',
      name: 'WebSocket Server',
      description: 'Broadcast em tempo real',
      port: '8765',
      icon: Wifi,
      isRunning: wsRunning,
      status: wsRunning ? 'Transmitindo' : 'Parado',
      metrics: wsStats && wsRunning ? [
        { label: 'Dashboards', value: wsStats.active_connections },
        { label: 'Taxa', value: `${wsStats.broadcast_rate_hz} Hz` }
      ] : [],
      onStart: handleStartWebSocket,
      onStop: handleStopWebSocket
    },
    {
      id: 'database',
      name: 'SQLite Database',
      description: 'Persistência de dados',
      port: 'Local',
      icon: Database,
      isRunning: true,
      status: 'Operacional',
      metrics: [
        { label: 'Tipo', value: 'SQLite 3' },
        { label: 'Localização', value: 'Local' }
      ],
      onStart: () => {},
      onStop: () => {}
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'Banco de dados robusto',
      port: '5432',
      icon: Database,
      isRunning: true,
      status: 'Configurável',
      metrics: [
        { label: 'Tipo', value: 'PostgreSQL' },
        { label: 'Configuração', value: 'Avançada' }
      ],
      onStart: () => {},
      onStop: () => {}
    },
  ];

  const activeServices = services.filter(s => s.isRunning).length;
  const totalConnections = (tcpStats?.active_connections || 0) + (wsStats?.active_connections || 0);
  const broadcastRate = wsRunning ? (wsStats?.broadcast_rate_hz || 0) : 0;

  return (
    <div className="space-y-6">
      
      {/* Cards de Resumo - Design Unificado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1 - Serviços Ativos */}
        <div className="bg-white rounded-xl border border-edp-marine/15 p-6 hover:border-edp-marine/25 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-edp-marine rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-edp-marine">
                {activeServices}
              </div>
              <div className="text-sm text-edp-slate">de {services.length}</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-edp-marine/10">
            <h3 className="font-medium text-edp-marine text-sm">Serviços Ativos</h3>
            <p className="text-xs text-edp-slate mt-1">Sistema operacional</p>
          </div>
        </div>

        {/* Card 2 - Conexões */}
        <div className="bg-white rounded-xl border border-edp-marine/15 p-6 hover:border-edp-marine/25 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-edp-marine rounded-xl flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-edp-marine">
                {totalConnections}
              </div>
              <div className="text-sm text-edp-slate">conexões</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-edp-marine/10">
            <h3 className="font-medium text-edp-marine text-sm">Conexões Ativas</h3>
            <p className="text-xs text-edp-slate mt-1">PLCs e clientes</p>
          </div>
        </div>

        {/* Card 3 - Broadcast */}
        <div className="bg-white rounded-xl border border-edp-marine/15 p-6 hover:border-edp-marine/25 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-edp-marine rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-edp-marine">
                {wsRunning ? broadcastRate : '—'}
              </div>
              <div className="text-sm text-edp-slate">Hz</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-edp-marine/10">
            <h3 className="font-medium text-edp-marine text-sm">Taxa Broadcast</h3>
            <p className="text-xs text-edp-slate mt-1">{wsRunning ? 'Tempo real' : 'Inativo'}</p>
          </div>
        </div>

        {/* Card 4 - Status */}
        <div className="bg-white rounded-xl border border-edp-marine/15 p-6 hover:border-edp-marine/25 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-edp-marine rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-edp-marine">
                {tcpRunning && wsRunning ? '100%' : tcpRunning || wsRunning ? '50%' : '0%'}
              </div>
              <div className="text-sm text-edp-slate">saúde</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-edp-marine/10">
            <h3 className="font-medium text-edp-marine text-sm">Sistema</h3>
            <p className="text-xs text-edp-slate mt-1">Operacional</p>
          </div>
        </div>
      </div>

      {/* Gerenciamento de Serviços Modernizado */}
      <div className="bg-white rounded-xl border border-edp-marine/15 overflow-hidden">
        
        {/* Header Limpo e Moderno */}
        <div className="px-8 py-6 border-b border-edp-marine/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-edp-marine tracking-tight mb-1">Gerenciamento de Serviços</h2>
              <p className="text-sm text-edp-slate">
                Controle centralizado e monitoramento em tempo real
              </p>
            </div>
            
            {/* Status Badge Moderno */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-edp-marine/5 border border-edp-marine/20 rounded-lg">
                <div className="w-2 h-2 bg-edp-marine rounded-full"></div>
                <span className="text-sm font-medium text-edp-marine">
                  {activeServices} de {services.length} ativos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Serviços Modernizada */}
        <div className="divide-y divide-edp-marine/8">
          {services.map((service) => {
            const IconComponent = service.icon;
            
            return (
              <div key={service.id} className="group hover:bg-edp-neutral-white-wash transition-all duration-200">
                <div className="px-8 py-6">
                  <div className="flex items-center">
                    
                    {/* Ícone */}
                    <div className="flex-shrink-0 mr-5">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          service.isRunning 
                            ? 'bg-edp-marine text-white' 
                            : 'bg-edp-slate/10 text-edp-slate'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        
                        {/* Indicador de Status */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          service.isRunning ? 'bg-green-500' : 'bg-edp-slate'
                        }`}></div>
                      </div>
                    </div>

                    {/* Informações do Serviço */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-edp-marine">
                          {service.name}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-100 ${
                          service.isRunning 
                            ? 'text-edp-marine' 
                            : 'text-edp-slate'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-edp-slate">
                        <span>{service.description}</span>
                        <span className="font-mono text-xs text-edp-marine bg-gray-100 px-2 py-1 rounded">
                          {service.port}
                        </span>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="flex items-center">
                      {service.isRunning && service.metrics.length > 0 ? (
                        <div className="flex items-center gap-8 mr-8">
                          {service.metrics.slice(0, 3).map((metric, idx) => (
                            <div key={idx} className="text-center min-w-[80px]">
                              <div className="text-base font-semibold text-edp-marine">
                                {metric.value}
                              </div>
                              <div className="text-xs text-edp-slate mt-1">
                                {metric.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mr-8">
                          {!service.isRunning && (service.id === 'tcp' || service.id === 'websocket') && (
                            <span className="text-sm text-edp-slate">Serviço parado</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Controles */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {service.id === 'tcp' || service.id === 'websocket' ? (
                        service.isRunning ? (
                          <button
                            onClick={service.onStop}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-edp-semantic-red border border-edp-semantic-red rounded-lg hover:bg-red-600 transition-colors duration-200"
                          >
                            <Square size={14} />
                            Parar
                          </button>
                        ) : (
                          <button
                            onClick={service.onStart}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-edp-marine bg-edp-marine/5 border border-edp-marine/20 rounded-lg hover:bg-edp-marine/10 transition-colors duration-200"
                          >
                            <Play size={14} />
                            Iniciar
                          </button>
                        )
                      ) : (
                        <div className="px-4 py-2 text-sm text-edp-slate bg-edp-slate/5 rounded-lg border border-edp-slate/10 font-medium">
                          Sistema
                        </div>
                      )}
                      
                      {/* Botões de Configuração */}
                      {service.id === 'websocket' ? (
                        <button 
                          onClick={() => setShowNetworkConfig(true)}
                          className="p-2.5 text-edp-slate hover:text-edp-marine hover:bg-edp-marine/5 rounded-lg transition-colors duration-200"
                          title="Configurar Interfaces de Rede"
                        >
                          <Router size={16} />
                        </button>
                      ) : service.id === 'postgres' ? (
                        <button 
                          onClick={() => setShowPostgresConfig(true)}
                          className="p-2.5 text-edp-slate hover:text-edp-marine hover:bg-edp-marine/5 rounded-lg transition-colors duration-200"
                          title="Configurar PostgreSQL"
                        >
                          <Settings size={16} />
                        </button>
                      ) : (
                        <button 
                          className="p-2.5 text-edp-slate/40 cursor-not-allowed rounded-lg"
                          disabled
                          title="Configuração não disponível"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Configuração de Rede WebSocket */}
      <WebSocketNetworkConfig
        isVisible={showNetworkConfig}
        onClose={() => setShowNetworkConfig(false)}
        isServerRunning={wsRunning}
        onConfigurationSaved={() => {
          setWsRunning(true);
          loadInitialStats(); // Recarregar stats
        }}
      />

      {/* Modal de Configuração do PostgreSQL */}
      <PostgresConfigModal
        isVisible={showPostgresConfig}
        onClose={() => setShowPostgresConfig(false)}
      />
    </div>
  );
};

export default ServicesPage;