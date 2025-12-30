import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Network, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Wifi,
  Globe,
  Router,
  CheckCircle
} from 'lucide-react';

interface NetworkInterface {
  name: string;
  ip: string;
  is_active: boolean;
  interface_type: string;
}

interface WebSocketNetworkConfigProps {
  isVisible: boolean;
  onClose: () => void;
  isServerRunning: boolean;
  onConfigurationSaved?: () => void;
}

export const WebSocketNetworkConfig: React.FC<WebSocketNetworkConfigProps> = ({
  isVisible,
  onClose,
  isServerRunning,
  onConfigurationSaved
}) => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterfaces, setSelectedInterfaces] = useState<string[]>(['0.0.0.0']);
  const [port, setPort] = useState<number>(8765);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isVisible) {
      console.log('🚀 Modal WebSocket aberto - usando config HARDCODED (SEM banco!)');
      
      // ✅ CONFIG HARDCODED - SEM tocar no banco!
      setInterfaces([
        { name: "Todas as Interfaces", ip: "0.0.0.0", is_active: true, interface_type: "All" },
        { name: "Localhost", ip: "127.0.0.1", is_active: true, interface_type: "Loopback" }
      ]);
      setSelectedInterfaces(['0.0.0.0']);
      setPort(8765);
      setLoading(false);
      
      console.log('✅ Modal configurado com sucesso!');
    }
  }, [isVisible]);


  const loadInitialData = async () => {
    // 🚫 DESABILITADO - SEM acessar banco
    console.log('ℹ️ Usando config hardcoded');
  };

  const handleInterfaceToggle = (ip: string) => {
    setSelectedInterfaces(prev => {
      if (prev.includes(ip)) {
        // Se for "Todas as Interfaces" (0.0.0.0), não permitir desmarcar se for a única
        if (ip === '0.0.0.0' && prev.length === 1) {
          return prev;
        }
        return prev.filter(i => i !== ip);
      } else {
        // Se selecionar "Todas as Interfaces", limpar outras seleções
        if (ip === '0.0.0.0') {
          return ['0.0.0.0'];
        }
        // Se selecionar outra interface, remover "Todas as Interfaces"
        const newSelection = prev.filter(i => i !== '0.0.0.0');
        return [...newSelection, ip];
      }
    });
  };

  const handleSave = async () => {
    if (selectedInterfaces.length === 0) {
      alert('Selecione pelo menos uma interface');
      return;
    }

    try {
      console.log('🔄 Salvando configuração e iniciando WebSocket...');
      
      // Configuração com interfaces selecionadas
      const config = {
        host: selectedInterfaces[0],
        port: port,
        max_clients: 100,
        broadcast_interval_ms: 1000, // 1 segundo fixo
        enabled: true,
        bind_interfaces: selectedInterfaces
      };

      console.log('📝 Config:', config);

      // 🚀 DIRETO PARA START - SEM salvar no banco!
      console.log('⚡ Iniciando WebSocket...');
      const startResult = await invoke('start_websocket_server', { config });
      console.log('✅ WebSocket iniciado:', startResult);
      
      // 🚫 SALVAMENTO DESABILITADO (banco de dados causa travamento)
      // Futuramente podemos reativar quando resolver o deadlock do banco
      
      alert(`✅ WebSocket configurado e iniciado!\nInterfaces: ${selectedInterfaces.join(', ')}\nPorta: ${port}`);
      
      if (onConfigurationSaved) {
        onConfigurationSaved();
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Erro:', error);
      alert(`Erro: ${error}`);
    }
  };

  const getInterfaceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'loopback':
        return <Network className="w-4 h-4 text-[#424D5B]" />;
      case 'all':
        return <Globe className="w-4 h-4 text-[#424D5B]" />;
      default:
        return <Wifi className="w-4 h-4 text-[#424D5B]" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Seguindo padrão PLC */}
        <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
              <Router size={20} className="text-[#212E3E]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configuração de Rede WebSocket</h2>
              <p className="text-xs text-gray-400">Porta {port} • Configuração de interfaces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna Esquerda: Configuração de Porta (1 coluna) */}
            <div className="lg:col-span-1 flex flex-col space-y-4">
              <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-[#212E3E] mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#212E3E]">Configuração da Porta</h3>
                    <p className="text-xs text-[#7C9599] mt-1">
                      Defina a porta do WebSocket
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    disabled={isServerRunning}
                    className="w-full px-3 py-2 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="8765"
                    min="1024"
                    max="65535"
                  />
                </div>
              </div>

              {/* Status Info - Expandido para ocupar espaço restante */}
              {isServerRunning ? (
                <div className="flex-1 p-6 bg-amber-50 border border-amber-200 rounded-lg flex flex-col justify-center items-center text-center">
                  <div className="mb-6">
                    <Network className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-amber-700 mb-2">Servidor WebSocket Ativo</h3>
                  </div>
                  <p className="text-base text-amber-600 leading-relaxed max-w-xs">
                    O servidor está rodando e recebendo conexões. Pare o servidor antes de alterar a configuração de interfaces.
                  </p>
                </div>
              ) : (
                <div className="flex-1 p-6 bg-blue-50 border border-blue-200 rounded-lg flex flex-col justify-center items-center text-center">
                  <div className="mb-6">
                    <Network className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-blue-700 mb-2">Pronto para Configurar</h3>
                  </div>
                  <p className="text-base text-blue-600 leading-relaxed max-w-xs">
                    Configure as interfaces de rede onde o WebSocket deve ouvir e clique em "Iniciar WebSocket" para aplicar.
                  </p>
                </div>
              )}
            </div>

            {/* Coluna Direita: Interfaces de Rede (2 colunas) */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-[#212E3E]">
                    Interfaces de Rede Disponíveis
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadInitialData}
                      className="flex items-center gap-1 text-sm text-[#7C9599] hover:text-[#212E3E] transition-colors px-2 py-1 rounded"
                      title="Atualizar interfaces"
                    >
                      🔄 Atualizar
                    </button>
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="flex items-center gap-1 text-sm text-[#7C9599] hover:text-[#212E3E] transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expanded ? 'Recolher' : 'Expandir'}
                    </button>
                  </div>
                </div>

                {/* Área de interfaces com altura fixa */}
                <div className="h-64 border border-[#BECACC] rounded-lg overflow-hidden">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#212E3E]"></div>
                      <span className="text-[#212E3E] ml-3">Detectando interfaces...</span>
                    </div>
                  ) : (
                    <div className={`p-3 h-full transition-all duration-300 overflow-y-auto ${expanded ? '' : ''}`} 
                         style={{
                           maxHeight: expanded ? 'none' : '200px'
                         }}>
                      <div className="space-y-3">
                        {interfaces.map((interface_item) => (
                          <div
                            key={interface_item.ip}
                            className={`p-3 bg-white border rounded-lg transition-all cursor-pointer ${
                              selectedInterfaces.includes(interface_item.ip)
                                ? 'border-[#212E3E] bg-[#212E3E]/5'
                                : 'border-[#BECACC] hover:border-[#212E3E]/50'
                            } ${isServerRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => !isServerRunning && handleInterfaceToggle(interface_item.ip)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getInterfaceIcon(interface_item.interface_type)}
                                <div>
                                  <div className="font-medium text-[#212E3E] text-sm">
                                    {interface_item.name}
                                  </div>
                                  <div className="text-xs text-[#7C9599] flex items-center gap-2">
                                    <span className="font-mono">{interface_item.ip}</span>
                                    <span className="px-1.5 py-0.5 bg-[#F1F4F4] border border-[#BECACC] rounded text-xs">
                                      {interface_item.interface_type}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                selectedInterfaces.includes(interface_item.ip)
                                  ? 'border-[#212E3E] bg-[#212E3E]'
                                  : 'border-[#BECACC]'
                              }`}>
                                {selectedInterfaces.includes(interface_item.ip) && (
                                  <Check className="w-2.5 h-2.5 text-white" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Resumo da Configuração - Expandido para ocupar espaço restante */}
              <div className="flex-1 bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4 flex flex-col">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-[#212E3E] mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#212E3E]">Resumo da Configuração</h3>
                    <p className="text-xs text-[#7C9599] mt-1">
                      {selectedInterfaces.length} interface{selectedInterfaces.length !== 1 ? 's' : ''} selecionada{selectedInterfaces.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded p-3 font-mono text-xs space-y-1 mt-3 border border-[#BECACC]">
                  <div className="text-[#212E3E] flex justify-between">
                    <span>Porta:</span> <span>{port}</span>
                  </div>
                  <div className="text-[#7C9599] text-xs mt-2">Endpoints:</div>
                  {selectedInterfaces.map(ip => (
                    <div key={ip} className="text-[#212E3E] pl-2">
                      ws://{ip}:{port}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4">
                  <div className="bg-white border border-[#BECACC] rounded p-3">
                    <h4 className="font-semibold text-[#212E3E] text-sm mb-2">Informações da Configuração:</h4>
                    <ul className="text-xs text-[#7C9599] space-y-1">
                      <li>• <strong>Total de interfaces:</strong> {selectedInterfaces.length}</li>
                      <li>• <strong>Protocolo:</strong> WebSocket (ws://)</li>
                      <li>• <strong>Porta configurada:</strong> {port}</li>
                      <li>• <strong>Máx. clientes:</strong> 100 conexões</li>
                      <li>• <strong>Taxa broadcast:</strong> 10 Hz</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Seguindo padrão PLC */}
        <div className="px-6 py-4 border-t border-[#BECACC] flex justify-end gap-3 bg-[#F1F4F4]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F1F4F4] text-[#212E3E] rounded-lg font-semibold transition-colors text-sm border border-[#BECACC]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isServerRunning || selectedInterfaces.length === 0}
            className="px-6 py-2 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Router className="w-4 h-4" />
            {isServerRunning ? 'Salvar Configuração' : 'Iniciar WebSocket'}
          </button>
        </div>
      </div>
    </div>
  );
};