import React, { useState, useEffect } from 'react';
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

  // Carregar estatísticas iniciais
  useEffect(() => {
    loadInitialStats();
    
    // Auto-refresh a cada 2 segundos
    const interval = setInterval(loadInitialStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialStats = async () => {
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
  };

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
      
      {/* Cards de Resumo - Design Elegante Unificado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Card 1 - Serviços Ativos */}
        <div className="group bg-gradient-to-br from-white via-white to-[#BECACC]/8 rounded-2xl border border-[#A3B5B8]/25 p-6 hover:border-[#90A5A8]/35 hover:shadow-[0_8px_30px_-4px_rgba(163,181,184,0.08)] transition-all duration-500 cursor-default backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-[#BECACC]/50 to-[#A3B5B8]/35 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 shadow-sm">
              <CheckCircle className="w-7 h-7 text-[#212E3E] drop-shadow-sm" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-br from-[#212E3E] to-[#424D5B] bg-clip-text text-transparent transition-all duration-300">
                {activeServices}
              </div>
              <div className="text-sm text-[#90A5A8] font-medium">de {services.length}</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#A3B5B8]/15">
            <h3 className="font-semibold text-[#212E3E] mb-1 text-sm tracking-wide">Serviços Ativos</h3>
            <p className="text-xs text-[#90A5A8] font-medium">Sistema operacional</p>
          </div>
        </div>

        {/* Card 2 - Conexões */}
        <div className="group bg-gradient-to-br from-white via-white to-[#BECACC]/8 rounded-2xl border border-[#A3B5B8]/25 p-6 hover:border-[#90A5A8]/35 hover:shadow-[0_8px_30px_-4px_rgba(163,181,184,0.08)] transition-all duration-500 cursor-default backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-[#BECACC]/50 to-[#A3B5B8]/35 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 shadow-sm">
              <Network className="w-7 h-7 text-[#212E3E] drop-shadow-sm" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-br from-[#212E3E] to-[#424D5B] bg-clip-text text-transparent transition-all duration-300">
                {totalConnections}
              </div>
              <div className="text-sm text-[#90A5A8] font-medium">conexões</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#A3B5B8]/15">
            <h3 className="font-semibold text-[#212E3E] mb-1 text-sm tracking-wide">Conexões Ativas</h3>
            <p className="text-xs text-[#90A5A8] font-medium">PLCs e clientes</p>
          </div>
        </div>

        {/* Card 3 - Broadcast */}
        <div className="group bg-gradient-to-br from-white via-white to-[#BECACC]/8 rounded-2xl border border-[#A3B5B8]/25 p-6 hover:border-[#90A5A8]/35 hover:shadow-[0_8px_30px_-4px_rgba(163,181,184,0.08)] transition-all duration-500 cursor-default backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-[#BECACC]/50 to-[#A3B5B8]/35 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 shadow-sm">
              <Zap className="w-7 h-7 text-[#212E3E] drop-shadow-sm" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-br from-[#212E3E] to-[#424D5B] bg-clip-text text-transparent transition-all duration-300">
                {wsRunning ? broadcastRate : '—'}
              </div>
              <div className="text-sm text-[#90A5A8] font-medium">Hz</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#A3B5B8]/15">
            <h3 className="font-semibold text-[#212E3E] mb-1 text-sm tracking-wide">Taxa Broadcast</h3>
            <p className="text-xs text-[#90A5A8] font-medium">{wsRunning ? 'Tempo real' : 'Inativo'}</p>
          </div>
        </div>

        {/* Card 4 - Status */}
        <div className="group bg-gradient-to-br from-white via-white to-[#BECACC]/8 rounded-2xl border border-[#A3B5B8]/25 p-6 hover:border-[#90A5A8]/35 hover:shadow-[0_8px_30px_-4px_rgba(163,181,184,0.08)] transition-all duration-500 cursor-default backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-[#BECACC]/50 to-[#A3B5B8]/35 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 shadow-sm">
              <Activity className="w-7 h-7 text-[#212E3E] drop-shadow-sm" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-br from-[#212E3E] to-[#424D5B] bg-clip-text text-transparent transition-all duration-300">
                {tcpRunning && wsRunning ? '100%' : tcpRunning || wsRunning ? '50%' : '0%'}
              </div>
              <div className="text-sm text-[#90A5A8] font-medium">saúde</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#A3B5B8]/15">
            <h3 className="font-semibold text-[#212E3E] mb-1 text-sm tracking-wide">Sistema</h3>
            <p className="text-xs text-[#90A5A8] font-medium">Operacional</p>
          </div>
        </div>
      </div>

      {/* Tabela de Serviços com Separações Detalhadas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
        
        {/* Header com Separação Visual */}
        <div className="px-8 py-6 bg-gradient-to-b from-gray-50/80 to-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#212E3E] mb-2 tracking-tight">Gerenciamento de Serviços</h2>
              <p className="text-sm text-[#7C9599]">
                Controle centralizado e monitoramento em tempo real
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white border border-[#A3B5B8]/40 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#212E3E] rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-[#212E3E]">
                    {activeServices} Serviços Ativos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Serviços com Separações Claras */}
        <div>
          {services.map((service, index) => {
            const IconComponent = service.icon;
            const isLast = index === services.length - 1;
            
            return (
              <div key={service.id} className={`group hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-300 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                <div className="px-8 py-6">
                  <div className="flex items-center justify-between">
                    
                    {/* Seção Principal com Ícone */}
                    <div className="flex items-center gap-6 flex-1">
                      
                      {/* Ícone com Indicador Visual Melhorado */}
                      <div className="relative group/icon">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden shadow-sm group-hover:shadow-lg transition-all duration-300 ${
                          service.isRunning 
                            ? 'bg-white border-2 border-[#A3B5B8]/50 group-hover:border-[#90A5A8]/60' 
                            : 'bg-gray-50 border-2 border-gray-200 group-hover:border-gray-300'
                        }`}>
                          
                          
                          <IconComponent className={`w-7 h-7 transition-all duration-300 group-hover:scale-110 ${
                            service.isRunning 
                              ? 'text-[#212E3E]' 
                              : 'text-gray-400'
                          }`} />
                          
                        </div>
                      </div>

                      {/* Informações do Serviço */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-bold text-[#212E3E] group-hover:text-[#424D5B] transition-colors duration-300">
                            {service.name}
                          </h3>
                          
                          {/* Badge de Status com Melhor Contraste */}
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 ${
                            service.isRunning 
                              ? 'bg-[#A3B5B8]/15 text-[#212E3E] border-[#A3B5B8]/40' 
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {service.status}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-[#7C9599]">
                          <span className="font-medium">{service.description}</span>
                          
                          {/* Separador visual */}
                          <div className="w-1 h-1 bg-[#BECACC] rounded-full"></div>
                          
                          {/* Badge da porta */}
                          <span className="px-2 py-1 bg-gray-100 text-[#212E3E] rounded-md font-mono text-xs font-medium border border-gray-200">
                            {service.port}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Métricas Desktop com Separação Visual */}
                    {service.isRunning && service.metrics.length > 0 && (
                      <div className="hidden xl:flex items-center gap-8 mr-6">
                        {service.metrics.slice(0, 3).map((metric, idx) => (
                          <div key={idx} className="text-center min-w-[90px] group-hover:scale-105 transition-transform duration-300">
                            <div className="text-lg font-bold text-[#212E3E] mb-1 transition-all">
                              {metric.value}
                            </div>
                            <div className="text-xs text-[#7C9599] font-medium uppercase tracking-wide">
                              {metric.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Placeholder quando desativado */}
                    {!service.isRunning && (service.id === 'tcp' || service.id === 'websocket') && (
                      <div className="hidden xl:flex items-center gap-3 mr-6">
                        <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-sm text-[#7C9599] font-medium">Aguardando ativação</span>
                        </div>
                      </div>
                    )}

                    {/* Controles com Separação Visual */}
                    <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                      {service.id === 'tcp' || service.id === 'websocket' ? (
                        service.isRunning ? (
                          <button
                            onClick={service.onStop}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#E32C2C] border border-[#E32C2C] rounded-lg hover:bg-[#c92626] hover:border-[#c92626] hover:shadow-md active:scale-95 transition-all duration-200"
                          >
                            <Square size={14} />
                            Parar
                          </button>
                        ) : (
                          <button
                            onClick={service.onStart}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#212E3E] bg-[#A3B5B8]/15 border border-[#A3B5B8]/40 rounded-lg hover:bg-[#A3B5B8]/25 hover:border-[#90A5A8]/60 hover:shadow-md active:scale-95 transition-all duration-200"
                          >
                            <Play size={14} />
                            Iniciar
                          </button>
                        )
                      ) : (
                        <div className="px-4 py-2.5 text-sm text-[#7C9599] bg-gray-50 rounded-lg border border-gray-200 font-medium">
                          Sistema
                        </div>
                      )}
                      
                      {/* Botão de configuração com separação */}
                      <div className="w-px h-8 bg-gray-200"></div>
                      
                      {/* Botão de configuração - Router para WebSocket, Settings para PostgreSQL */}
                      {service.id === 'websocket' ? (
                        <button 
                          onClick={() => setShowNetworkConfig(true)}
                          className="p-2.5 text-gray-400 hover:text-[#212E3E] hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-90"
                          title="Configurar Interfaces de Rede"
                        >
                          <Router size={16} />
                        </button>
                      ) : service.id === 'postgres' ? (
                        <button 
                          onClick={() => setShowPostgresConfig(true)}
                          className="p-2.5 text-gray-400 hover:text-[#212E3E] hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-90"
                          title="Configurar PostgreSQL"
                        >
                          <Settings size={16} />
                        </button>
                      ) : (
                        <button 
                          className="p-2.5 text-gray-300 cursor-not-allowed rounded-lg"
                          disabled
                          title="Configuração não disponível"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Métricas Mobile com Separação */}
                  {service.isRunning && service.metrics.length > 0 && (
                    <div className="xl:hidden mt-6 pt-6 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4">
                        {service.metrics.map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-xs text-gray-600 font-medium uppercase tracking-wide">{metric.label}</span>
                            <span className="text-sm font-bold text-[#212E3E]">{metric.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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