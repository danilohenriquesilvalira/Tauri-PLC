import React, { useState, useEffect } from 'react';
import { useTcpServer } from '../../hooks/useTcpServer';
import {
  Wifi,
  WifiOff,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Network,
  Info,
  X,
  BarChart3,
  Search,
  Settings,
  Tags,
  Database,
} from 'lucide-react';
import PlcIcon from '../../assets/Plc.svg';
import { PlcStructureModal } from './PlcStructureModal';
import { TagConfigurationModal } from './TagConfigurationModal';

interface ConnectedPlc {
  id: number;
  ip: string;
  address: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'disconnected' | 'blocked';
  bytesReceived: number;
  isActive: boolean; // Se está realmente conectado agora
}

interface PlcVariable {
  name: string;
  value: string;
  data_type: string;
  unit?: string;
}

interface PlcDataPacket {
  ip: string;
  timestamp: number;
  raw_data: number[];
  size: number;
  variables: PlcVariable[];
}

export const PlcConnectionTable: React.FC = () => {
    // Estado para PLCs com tags desativadas
    const [plcsWithDisabledTags, setPlcsWithDisabledTags] = useState<Set<string>>(new Set());
    const [knownPlcs, setKnownPlcs] = useState<Map<string, ConnectedPlc>>(new Map());
    const [selectedPlcIp, setSelectedPlcIp] = useState<string | null>(null);
    const [plcData, setPlcData] = useState<PlcDataPacket | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
    const [structureModalPlcIp, setStructureModalPlcIp] = useState<string | null>(null);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [tagModalPlcIp, setTagModalPlcIp] = useState<string | null>(null);
    const [dataTypeFilter, setDataTypeFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15); // 15 itens por página para preencher modal
    const [searchTerm, setSearchTerm] = useState('');
    // Estados para modal de métricas
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [selectedMetricsPlc, setSelectedMetricsPlc] = useState<string | null>(null);
    const [trafficHistory, setTrafficHistory] = useState<Map<string, Array<{
      timestamp: number, 
      bytesPerSecond: number, 
      packets?: number,
      packetsPerSecond?: number,
      throughput?: number,
      packetSize?: number,
      jitter?: number,
      utilization?: number,
      dataIntegrity?: string,
      timeLabel?: string
    }>>>(new Map());
    const [hoveredPoint, setHoveredPoint] = useState<{x: number, y: number, data: any} | null>(null);

    const {
      isServerRunning,
      connectionStats,
      disconnectFromPlc,
      allowPlcReconnect,
    } = useTcpServer();

    // Função para checar tags desativadas de um PLC
    const checkDisabledTags = async (plcIp: string) => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const tags = await invoke<any[]>('load_tag_mappings', { plcIp });
        const hasDisabled = tags.some(tag => tag.enabled === false);
        setPlcsWithDisabledTags(prev => {
          const updated = new Set(prev);
          if (hasDisabled) updated.add(plcIp);
          else updated.delete(plcIp);
          return updated;
        });
      } catch {}
    };


    // Checar tags desativadas ao abrir modal de tags
    useEffect(() => {
      if (isTagModalOpen && tagModalPlcIp) {
        checkDisabledTags(tagModalPlcIp);
      }
      // Listener para atualização imediata após salvar/alterar tag
      const handler = (e: any) => {
        if (e.detail && e.detail.plcIp) checkDisabledTags(e.detail.plcIp);
      };
      window.addEventListener('plc-tags-updated', handler);
      return () => window.removeEventListener('plc-tags-updated', handler);
    }, [isTagModalOpen, tagModalPlcIp]);

    // Checar todos PLCs ao montar
    useEffect(() => {
      Array.from(knownPlcs.values()).forEach(plc => checkDisabledTags(plc.ip));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knownPlcs.size]);

  // Listener para atualizar bytes em tempo real
  useEffect(() => {
    const setupBytesListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<{
        ip: string, 
        id: number, 
        bytesPerSecond: number, 
        packets: number,
        totalBytes: number,
        transferRate: string,
        industrialMetrics: {
          packetFrequency: number,
          avgPacketSize: number,
          dataIntegrity: string
        }
      }>('plc-data-stats', (event) => {
        const { ip, bytesPerSecond, industrialMetrics } = event.payload;
        
        // Atualizar taxa de bytes do PLC em tempo real
        setKnownPlcs(prev => {
          const updated = new Map(prev);
          const plc = updated.get(ip);
          if (plc) {
            plc.bytesReceived = bytesPerSecond; // Agora é bytes/s não total
            plc.lastActivity = new Date();
          }
          return updated;
        });
        
        // Armazenar histórico de tráfego para gráficos com métricas TCP precisas
        setTrafficHistory(prev => {
          const updated = new Map(prev);
          const history = updated.get(ip) || [];
          
          const now = Date.now();
          const newPoint = {
            timestamp: now,
            bytesPerSecond,
            packetsPerSecond: industrialMetrics.packetFrequency, // ✅ CORRETO: pacotes/s reais
            // Métricas TCP reais do backend
            throughput: bytesPerSecond * 8, // bits por segundo
            packetSize: industrialMetrics.avgPacketSize, // ✅ CORRETO: tamanho médio real
            jitter: history.length > 0 ? Math.abs(bytesPerSecond - history[history.length - 1].bytesPerSecond) : 0,
            utilization: (bytesPerSecond / (1024 * 1024)) * 100, // % de 1 Mbps
            dataIntegrity: industrialMetrics.dataIntegrity,
            timeLabel: new Date(now).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })
          };
          
          // Manter apenas últimos 60 pontos (1 minuto de dados)
          const updatedHistory = [...history, newPoint].slice(-60);
          updated.set(ip, updatedHistory);
          
          return updated;
        });
      });
      return unlisten;
    };

    if (isServerRunning) {
      const cleanup = setupBytesListener();
      return () => {
        cleanup.then(unlisten => unlisten());
      };
    }
  }, [isServerRunning]);

  // Atualizar PLCs conhecidos (manter histórico)
  useEffect(() => {
    const fetchConnectedPlcs = async () => {
      if (!isServerRunning) {
        // Marcar todos como desconectados quando servidor para
        setKnownPlcs(prev => {
          const updated = new Map(prev);
          updated.forEach(plc => {
            plc.status = 'disconnected';
            plc.isActive = false;
          });
          return updated;
        });
        return;
      }

      try {
        // Buscar lista completa de PLCs conhecidos (conectados, desconectados, bloqueados)
        const { invoke } = await import('@tauri-apps/api/core');
        const allKnownPlcs = await invoke<[string, string][]>('get_all_known_plcs');
        
        console.log('🔍 Todos PLCs conhecidos:', allKnownPlcs);
        
        setKnownPlcs(prev => {
          const updated = new Map(prev);
          
          // Limpar status de todos os PLCs conhecidos
          updated.forEach(plc => {
            plc.status = 'disconnected';
            plc.isActive = false;
          });
          
          // Atualizar/adicionar PLCs baseado no status do backend
          allKnownPlcs.forEach(([ip, status]) => {
            if (updated.has(ip)) {
              const plc = updated.get(ip)!;
              plc.status = status as 'connected' | 'disconnected' | 'blocked';
              plc.isActive = status === 'connected';
              if (status === 'connected') {
                plc.lastActivity = new Date();
              }
            } else {
              // Novo PLC descoberto - criar com ID único
              const newId = Math.max(0, ...Array.from(updated.values()).map(p => p.id)) + 1;
              updated.set(ip, {
                id: newId,
                ip: ip,
                address: `${ip}:8502`,
                connectedAt: new Date(),
                lastActivity: new Date(),
                status: status as 'connected' | 'disconnected' | 'blocked',
                bytesReceived: 0,
                isActive: status === 'connected',
              });
            }
          });
          
          return updated;
        });
      } catch (error) {
        console.error('❌ Erro ao buscar PLCs:', error);
      }
    };

    // Buscar a cada 500ms para atualização em tempo real
    const interval = setInterval(fetchConnectedPlcs, 500);
    fetchConnectedPlcs(); // Buscar imediatamente

    return () => clearInterval(interval);
  }, [isServerRunning]);

  const handleOpenPlcInfo = async (plc: ConnectedPlc) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<PlcDataPacket | null>('get_plc_data', { clientIp: plc.ip });
      
      if (data) {
        setPlcData(data);
        setSelectedPlcIp(plc.ip);
        setCurrentPage(1); // Reset página ao abrir
        setSearchTerm(''); // Reset busca ao abrir
        setIsModalOpen(true);
      } else {
        console.log('⚠️ Nenhum dado disponível para este PLC ainda');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do PLC:', error);
    }
  };

  const handleOpenMetrics = (plc: ConnectedPlc) => {
    setSelectedMetricsPlc(plc.ip);
    setIsMetricsModalOpen(true);
  };

  // Listener para atualizar dados do modal em tempo real
  useEffect(() => {
    if (!isModalOpen || !selectedPlcIp) return;

    const setupDataListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<PlcDataPacket>('plc-data-received', (event) => {
        const receivedData = event.payload;
        // Atualizar apenas se for do PLC que está aberto no modal
        if (receivedData.ip === selectedPlcIp) {
          setPlcData(receivedData);
        }
      });
      return unlisten;
    };

    const cleanup = setupDataListener();
    return () => {
      cleanup.then(unlisten => unlisten());
    };
  }, [isModalOpen, selectedPlcIp]);

  const handleDisconnectPlc = async (plc: ConnectedPlc) => {
    try {
      console.log('🔌 Desconectando PLC:', plc.ip);
      const result = await disconnectFromPlc(plc.ip);
      console.log('✅ Resultado:', result);
      
      // Marcar como bloqueado localmente (atualização imediata)
      setKnownPlcs(prev => {
        const updated = new Map(prev);
        const target = updated.get(plc.ip);
        if (target) {
          target.status = 'blocked';
          target.isActive = false;
        }
        return updated;
      });
    } catch (error) {
      console.error('❌ Erro ao desconectar PLC:', error);
    }
  };
  
  const handleConnectPlc = async (plc: ConnectedPlc) => {
    try {
      console.log('✅ Permitindo reconexão do PLC:', plc.ip);
      
      if (!allowPlcReconnect) {
        console.error('❌ Função allowPlcReconnect não disponível');
        return;
      }
      
      const result = await allowPlcReconnect(plc.ip);
      console.log('✅ Resultado:', result);
      
      // Marcar como desconectado (aguardando reconexão)
      setKnownPlcs(prev => {
        const updated = new Map(prev);
        const target = updated.get(plc.ip);
        if (target) {
          target.status = 'disconnected';
          target.isActive = false;
        }
        return updated;
      });
    } catch (error) {
      console.error('❌ Erro ao permitir reconexão:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'blocked':
        return <XCircle className="text-red-500" size={16} />;
      case 'disconnected':
        return <AlertCircle className="text-gray-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const formatBytes = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
    if (bytesPerSecond < 1024 * 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
    return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'blocked':
        return 'Bloqueado';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Desconhecido';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  if (!isServerRunning) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <WifiOff className="mx-auto text-gray-400 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Servidor TCP Parado</h3>
        <p className="text-gray-500 text-sm">
          Inicie o servidor TCP para ver as conexões de PLCs
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#212E3E]">Conexões PLC</h2>
            <p className="text-sm text-gray-500 mt-1">
              {knownPlcs.size} {knownPlcs.size === 1 ? 'dispositivo' : 'dispositivos'} registrados
            </p>
          </div>
          {connectionStats && (
            <div className="flex gap-3">
              <div className="bg-[#F1F4F4] rounded-lg px-5 py-3 border border-[#BECACC] text-center">
                <div className="text-2xl font-bold text-[#212E3E] leading-none mb-1">{connectionStats.active_connections}</div>
                <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Ativos</div>
              </div>
              <div className="bg-[#F1F4F4] rounded-lg px-5 py-3 border border-[#BECACC] text-center">
                <div className="text-2xl font-bold text-[#212E3E] leading-none mb-1">{connectionStats.total_connections}</div>
                <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Total</div>
              </div>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="border-t border-gray-200"></div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from(knownPlcs.values()).map((plc) => (
            <div
              key={plc.ip}
              className={`relative bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-xl ${
                plc.status === 'connected'
                  ? 'border-[#28FF52] shadow-lg shadow-[#28FF52]/10'
                  : plc.status === 'blocked'
                  ? 'border-red-300 opacity-75'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute -top-3 -right-3 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                    plc.status === 'connected'
                      ? 'bg-[#28FF52]'
                      : plc.status === 'blocked'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`}
                >
                  <div className="text-white">
                    {getStatusIcon(plc.status)}
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 -ml-3">
                    <img src={PlcIcon} alt="PLC" className="w-14 h-14" />
                    <div className="flex flex-col justify-center">
                      <span className="text-sm font-bold text-[#212E3E]">PLC #{plc.id}</span>
                      <span className="text-xs text-gray-500">Industrial Controller</span>
                    </div>
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenPlcInfo(plc)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-[#28FF52]/20 text-[#212E3E] transition-all duration-200"
                      title="Ver dados do PLC"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenMetrics(plc)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-[#28FF52]/20 text-[#212E3E] transition-all duration-200"
                      title="Métricas de tráfego em tempo real"
                    >
                      <BarChart3 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setTagModalPlcIp(plc.ip);
                        setIsTagModalOpen(true);
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        plcsWithDisabledTags.has(plc.ip)
                          ? 'bg-red-100 border-2 border-red-500 text-red-700 animate-pulse'
                          : 'bg-gray-100 hover:bg-[#28FF52]/20 text-[#212E3E]'
                      }`}
                      title={plcsWithDisabledTags.has(plc.ip) ? 'Há tags desativadas neste PLC' : 'Configurar Tags'}
                    >
                      <Tags size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setStructureModalPlcIp(plc.ip);
                        setIsStructureModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-[#28FF52]/20 text-[#212E3E] transition-all duration-200"
                      title="Configurar estrutura de dados"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-3 mb-4">
                  {/* Endereço */}
                  <div className="flex items-center gap-2 text-sm">
                    <Network size={14} className="text-gray-400" />
                    <span className="text-gray-600 font-medium">{plc.ip}:8502</span>
                  </div>

                  {/* Status e Tempo */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {plc.isActive ? `Ativo há ${getTimeAgo(plc.lastActivity)}` : 'Inativo'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        plc.status === 'connected'
                          ? 'bg-[#28FF52] text-[#212E3E]'
                          : plc.status === 'blocked'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {getStatusText(plc.status)}
                    </span>
                  </div>

                  {/* Tráfego */}
                  <div className="bg-gradient-to-r from-[#212E3E]/5 to-transparent rounded-lg p-3 border border-[#212E3E]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#28FF52]" />
                        <span className="text-xs text-gray-500">Tráfego</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#212E3E]">
                          {formatBytes(plc.bytesReceived)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Conexão */}
                <div className="w-full">
                  {plc.status === 'blocked' || plc.status === 'disconnected' ? (
                    <button
                      onClick={() => handleConnectPlc(plc)}
                      className="w-full py-2.5 px-4 bg-[#212E3E] hover:bg-[#2a3f52] text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#212E3E]/20"
                    >
                      <CheckCircle size={16} />
                      Conectar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnectPlc(plc)}
                      className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                      <XCircle size={16} />
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem se não há PLCs */}
        {knownPlcs.size === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Wifi className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum PLC conectado</h3>
            <p className="text-sm text-gray-500">Aguardando conexões na porta 8502</p>
          </div>
        )}
      </div>

      {/* Modal de Dados do PLC */}
      {isModalOpen && plcData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Header - Compacto e limpo */}
            <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
                  <Database size={20} className="text-[#212E3E]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Análise de Dados PLC</h2>
                  <p className="text-xs text-gray-400">IP: {selectedPlcIp} • {plcData.size} bytes • {new Date(plcData.timestamp * 1000).toLocaleTimeString()}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex flex-col">
              
              {/* Controles: Busca + Filtros */}
              <div className="p-4 border-b border-[#BECACC] bg-[#F1F4F4] space-y-3">
                {/* Barra de Busca */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar variável (nome ou valor)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-[#BECACC] rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#212E3E] focus:border-transparent bg-white"
                  />
                </div>
                
                {/* Filtros e Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Filtros por Tipo */}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const types = Array.from(new Set(plcData.variables.map(v => v.data_type)));
                      
                      return ['ALL', ...types].map(type => {
                        const count = type === 'ALL' 
                          ? plcData.variables.length 
                          : plcData.variables.filter(v => v.data_type === type).length;
                        
                        const isActive = dataTypeFilter === (type === 'ALL' ? 'all' : type.toLowerCase());
                        
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setDataTypeFilter(type === 'ALL' ? 'all' : type.toLowerCase());
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-[#212E3E] text-[#28FF52] shadow-sm'
                                : 'bg-white text-[#212E3E] hover:bg-[#E6EBEC] border border-[#BECACC]'
                            }`}
                          >
                            {type} ({count})
                          </button>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Info compacta */}
                  <div className="text-xs text-[#7C9599] flex items-center gap-2">
                    <span className="font-semibold text-[#212E3E]">{plcData.variables.length}</span> variáveis
                    <span className="text-[#BECACC]">•</span>
                    <span className="font-semibold text-[#212E3E]">{plcData.size}</span> bytes
                  </div>
                </div>
              </div>

              {/* Tabela com altura fixa */}
              <div className="overflow-auto bg-white" style={{height: '450px'}}>
                  <table className="min-w-full table-fixed">
                    <thead className="bg-[#F1F4F4] sticky top-0 border-b border-[#BECACC]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#212E3E] uppercase tracking-wide w-24">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#212E3E] uppercase tracking-wide w-32">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#212E3E] uppercase tracking-wide w-20">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#212E3E] uppercase tracking-wide w-28">
                          Hex
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EBEC]">
                      {(() => {
                        // Aplicar filtros: tipo + busca
                        const filteredData = plcData.variables.filter(v => {
                          const typeMatch = dataTypeFilter === 'all' || v.data_type.toLowerCase() === dataTypeFilter;
                          const searchMatch = searchTerm === '' || 
                            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            v.value.toLowerCase().includes(searchTerm.toLowerCase());
                          return typeMatch && searchMatch;
                        });
                        
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedData = filteredData.slice(startIndex, endIndex);
                        
                        return paginatedData.map((variable, index) => {
                          const typeColors = {
                            'BYTE': 'text-[#212E3E] bg-[#E6EBEC]',
                            'BIT': 'text-[#212E3E] bg-[#E6EBEC]',
                            'WORD': 'text-[#212E3E] bg-[#E6EBEC]', 
                            'INT': 'text-[#212E3E] bg-[#E6EBEC]',
                            'DWORD': 'text-[#212E3E] bg-[#E6EBEC]',
                            'DINT': 'text-[#212E3E] bg-[#E6EBEC]',
                            'REAL': 'text-[#212E3E] bg-[#E6EBEC]',
                            'STRING': 'text-[#212E3E] bg-[#E6EBEC]'
                          };
                          
                          const colorClass = typeColors[variable.data_type as keyof typeof typeColors] || 'text-[#212E3E] bg-[#E6EBEC]';
                          
                          // Calcular hex apenas se for numérico
                          let hexValue = '-';
                          try {
                            const numVal = parseFloat(variable.value);
                            if (!isNaN(numVal) && variable.data_type !== 'STRING') {
                              if (variable.data_type === 'REAL') {
                                const buffer = new ArrayBuffer(4);
                                new Float32Array(buffer)[0] = numVal;
                                const intView = new Uint32Array(buffer)[0];
                                hexValue = '0x' + intView.toString(16).toUpperCase().padStart(8, '0');
                              } else {
                                const intVal = parseInt(variable.value);
                                hexValue = '0x' + intVal.toString(16).toUpperCase().padStart(
                                  variable.data_type === 'BYTE' ? 2 :
                                  variable.data_type === 'WORD' || variable.data_type === 'INT' ? 4 : 8, '0'
                                );
                              }
                            }
                          } catch {}
                          
                          return (
                            <tr key={`${variable.data_type}-${variable.name}-${startIndex + index}`} 
                                className="hover:bg-[#F1F4F4] transition-colors">
                              <td className="px-4 py-2.5 font-mono text-sm font-semibold text-[#212E3E] truncate">
                                {variable.name}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-sm text-[#212E3E] truncate max-w-0">
                                <div className="truncate">{variable.value}</div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${colorClass}`}>
                                  {variable.data_type}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-[#7C9599] truncate">
                                {hexValue}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
              </div>

              {/* Paginação */}
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                {(() => {
                  // Aplicar mesmos filtros para contagem
                  const filteredData = plcData.variables.filter(v => {
                    const typeMatch = dataTypeFilter === 'all' || v.data_type.toLowerCase() === dataTypeFilter;
                    const searchMatch = searchTerm === '' || 
                      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      v.value.toLowerCase().includes(searchTerm.toLowerCase());
                    return typeMatch && searchMatch;
                  });
                  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
                  const startItem = (currentPage - 1) * itemsPerPage + 1;
                  const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{startItem}-{endItem}</span> de{' '}
                        <span className="font-medium">{filteredData.length}</span> variáveis
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        
                        {/* Páginas */}
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage > totalPages - 3) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                  currentPage === pageNumber
                                    ? 'bg-[#212E3E] text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Métricas em Tempo Real */}
      {isMetricsModalOpen && selectedMetricsPlc && trafficHistory.get(selectedMetricsPlc) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsMetricsModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Header - Compacto e limpo */}
            <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
                  <BarChart3 size={20} className="text-[#212E3E]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Métricas de Tráfego TCP</h2>
                  <p className="text-xs text-gray-400">PLC: {selectedMetricsPlc} • Tempo real • Janela: 1min</p>
                </div>
              </div>
              <button
                onClick={() => setIsMetricsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {(() => {
                const history = trafficHistory.get(selectedMetricsPlc) || [];
                const currentPlc = Array.from(knownPlcs.values()).find(p => p.ip === selectedMetricsPlc);
                
                if (history.length === 0) {
                  return (
                    <div className="text-center py-16 text-gray-500">
                      <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-lg">Coletando dados de tráfego...</p>
                      <p className="text-sm">Aguarde alguns segundos para visualizar as métricas</p>
                    </div>
                  );
                }

                // Estatísticas atuais
                const latestData = history[history.length - 1];
                const maxBytes = Math.max(...history.map(h => h.bytesPerSecond), 1);
                const avgBytes = history.reduce((acc, h) => acc + h.bytesPerSecond, 0) / history.length;

                return (
                  <div className="space-y-6">
                    {/* Métricas Essenciais TCP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#F1F4F4] rounded-lg p-5 border border-[#BECACC]">
                        <div className="text-3xl font-bold text-[#212E3E] mb-1">{formatBytes(latestData.bytesPerSecond)}</div>
                        <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Taxa Atual</div>
                      </div>
                      <div className="bg-[#F1F4F4] rounded-lg p-5 border border-[#BECACC]">
                        <div className="text-3xl font-bold text-[#212E3E] mb-1">{latestData.packetsPerSecond || latestData.packets || 0}</div>
                        <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Pacotes/s</div>
                      </div>
                      <div className="bg-[#F1F4F4] rounded-lg p-5 border border-[#BECACC]">
                        <div className="text-3xl font-bold text-[#212E3E] mb-1">{formatBytes(avgBytes)}</div>
                        <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Média (1min)</div>
                      </div>
                    </div>

                    {/* Gráfico de Linha Profissional */}
                    <div className="bg-white rounded-lg border border-[#BECACC] p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-[#212E3E]">Tráfego TCP em Tempo Real</h3>
                        <p className="text-xs text-[#7C9599]">Dados reais do PLC • Últimos 60 segundos</p>
                      </div>
                      
                      <div className="relative bg-[#F1F4F4] rounded-lg border border-[#E6EBEC] p-4">
                        <svg viewBox="0 0 1000 400" className="w-full h-80">
                          {/* Grid profissional */}
                          <defs>
                            <pattern id="professionalGrid" width="50" height="40" patternUnits="userSpaceOnUse">
                              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                            </pattern>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" style={{stopColor: '#28FF52', stopOpacity: 0.8}} />
                              <stop offset="100%" style={{stopColor: '#10B981', stopOpacity: 1}} />
                            </linearGradient>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{stopColor: '#28FF52', stopOpacity: 0.3}} />
                              <stop offset="100%" style={{stopColor: '#28FF52', stopOpacity: 0.05}} />
                            </linearGradient>
                          </defs>
                          
                          {/* Fundo com grid */}
                          <rect width="100%" height="100%" fill="url(#professionalGrid)" />
                          
                          {/* Linhas de referência horizontais */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                            <g key={i}>
                              <line 
                                x1="80" 
                                x2="950" 
                                y1={350 - (ratio * 280)} 
                                y2={350 - (ratio * 280)} 
                                stroke="#e2e8f0" 
                                strokeWidth="1"
                                strokeDasharray={ratio === 0.5 ? "5,5" : "2,2"}
                              />
                              <text 
                                x="10" 
                                y={355 - (ratio * 280)} 
                                fontSize="11" 
                                fill="#64748b"
                                textAnchor="start"
                              >
                                {formatBytes(maxBytes * ratio)}
                              </text>
                            </g>
                          ))}
                          
                          {/* Área preenchida sob a linha */}
                          <path
                            d={`M 80,350 ${history.map((point, index) => {
                              const x = 80 + (index / (history.length - 1)) * 870;
                              const y = 350 - ((point.bytesPerSecond / maxBytes) * 280);
                              return `L ${x},${y}`;
                            }).join(' ')} L 950,350 Z`}
                            fill="url(#areaGradient)"
                          />
                          
                          {/* Linha principal do gráfico */}
                          <polyline
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={history.map((point, index) => {
                              const x = 80 + (index / (history.length - 1)) * 870;
                              const y = 350 - ((point.bytesPerSecond / maxBytes) * 280);
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                          
                          {/* Pontos interativos com tooltip */}
                          {history.map((point, index) => {
                            const x = 80 + (index / (history.length - 1)) * 870;
                            const y = 350 - ((point.bytesPerSecond / maxBytes) * 280);
                            const isRecent = index >= history.length - 5;
                            return (
                              <g key={index}>
                                {/* Área de hover invisível maior para facilitar interação */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="8"
                                  fill="transparent"
                                  onMouseEnter={() => setHoveredPoint({x, y, data: point})}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                  style={{cursor: 'pointer'}}
                                />
                                {/* Ponto visual */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isRecent ? "3" : "2"}
                                  fill="#ffffff"
                                  stroke="#28FF52"
                                  strokeWidth="2"
                                  className={hoveredPoint && hoveredPoint.x === x ? "r-4" : ""}
                                />
                                {isRecent && (
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="6"
                                    fill="none"
                                    stroke="#28FF52"
                                    strokeWidth="1"
                                    opacity="0.5"
                                  />
                                )}
                              </g>
                            );
                          })}
                          
                          
                          {/* Eixos */}
                          <line x1="80" y1="70" x2="80" y2="350" stroke="#475569" strokeWidth="2"/>
                          <line x1="80" y1="350" x2="950" y2="350" stroke="#475569" strokeWidth="2"/>
                        </svg>
                        
                        {/* Tooltip interativo */}
                        {hoveredPoint && (
                          <div 
                            className="absolute bg-[#212E3E] text-white p-3 rounded-lg shadow-xl border border-[#28FF52] z-10 pointer-events-none"
                            style={{
                              left: Math.min(hoveredPoint.x - 80, 700), // Ajustar posição para não sair da tela
                              top: hoveredPoint.y - 120
                            }}
                          >
                            <div className="text-sm font-bold text-white mb-2">Dados TCP</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span>Taxa:</span>
                                <span className="font-mono text-[#28FF52]">{formatBytes(hoveredPoint.data.bytesPerSecond || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Pacotes:</span>
                                <span className="font-mono text-[#28FF52]">{hoveredPoint.data.packetsPerSecond || hoveredPoint.data.packets || 0}/s</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Horário:</span>
                                <span className="font-mono text-[#28FF52] text-xs">
                                  {hoveredPoint.data.timeLabel || new Date(hoveredPoint.data.timestamp).toLocaleTimeString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Legenda de tempo melhorada */}
                        <div className="flex justify-between mt-4 px-20">
                          {['-60s', '-45s', '-30s', '-15s', 'Agora'].map((label, i) => (
                            <div key={i} className="text-xs text-gray-500 font-medium text-center">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mx-auto mb-1"></div>
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status da Conexão */}
                    {currentPlc && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-[#212E3E] mb-3">Status da Conexão Industrial</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Endereço:</span>
                            <div className="font-mono">{currentPlc.address}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <div className={`font-semibold ${currentPlc.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                              {getStatusText(currentPlc.status)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Conectado há:</span>
                            <div>{getTimeAgo(currentPlc.connectedAt)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Última atividade:</span>
                            <div>{getTimeAgo(currentPlc.lastActivity)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Configuração de Estrutura */}
      {isStructureModalOpen && structureModalPlcIp && (
        <PlcStructureModal
          plcIp={structureModalPlcIp}
          onClose={() => {
            setIsStructureModalOpen(false);
            setStructureModalPlcIp(null);
          }}
          onSaved={() => {
            // Recarregar dados do PLC após salvar configuração
            console.log('✅ Configuração salva para PLC', structureModalPlcIp);
          }}
        />
      )}

      {/* Modal de Configuração de Tags */}
      {isTagModalOpen && tagModalPlcIp && (
        <TagConfigurationModal
          plcIp={tagModalPlcIp}
          onClose={() => {
            setIsTagModalOpen(false);
            setTagModalPlcIp(null);
          }}
          onSaved={() => {
            console.log('✅ Tags configurados para PLC', tagModalPlcIp);
            setIsTagModalOpen(false);
            setTagModalPlcIp(null);
          }}
        />
      )}
    </div>
  );
};