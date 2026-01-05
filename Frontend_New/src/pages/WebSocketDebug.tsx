import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePLC } from '../contexts/PLCContext';

// ============================================================================
// 🎯 PÁGINA DE DEBUG WEBSOCKET - TESTE COMPLETO DE SUBSCRIBE
// ============================================================================
// Esta página conecta diretamente ao WebSocket Rust (porta 8765) e mostra
// todos os tags recebidos em tempo real. Suporta filtros de subscribe.
// ============================================================================

interface TagData {
  [key: string]: string;
}

interface ConnectionStats {
  messagesReceived: number;
  tagsProcessed: number;
  lastUpdate: Date | null;
  connectionTime: number;
}

// Áreas disponíveis no sistema
const AREAS = ['ENCH', 'ESVZ', 'JUS', 'MONT', 'ESGT', 'ECLUS'] as const;
// Categorias disponíveis
const CATEGORIES = ['PROC', 'FAULT', 'EVENT'] as const;

// Decodificador Base64
function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodificador MessagePack real (subset para Map<String, String>)
function decodeMsgPack(bytes: Uint8Array): TagData {
  let offset = 0;
  
  function readUint8(): number {
    return bytes[offset++];
  }
  
  function readUint16(): number {
    const val = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    return val;
  }
  
  function readUint32(): number {
    const val = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;
    return val >>> 0;
  }
  
  function readString(length: number): string {
    const strBytes = bytes.slice(offset, offset + length);
    offset += length;
    return new TextDecoder().decode(strBytes);
  }
  
  function readValue(): string {
    const type = readUint8();
    
    // fixstr (0xa0 - 0xbf)
    if (type >= 0xa0 && type <= 0xbf) {
      const length = type - 0xa0;
      return readString(length);
    }
    // str8 (0xd9)
    else if (type === 0xd9) {
      const length = readUint8();
      return readString(length);
    }
    // str16 (0xda)
    else if (type === 0xda) {
      const length = readUint16();
      return readString(length);
    }
    // str32 (0xdb)
    else if (type === 0xdb) {
      const length = readUint32();
      return readString(length);
    }
    // positive fixint (0x00 - 0x7f)
    else if (type <= 0x7f) {
      return type.toString();
    }
    // negative fixint (0xe0 - 0xff)
    else if (type >= 0xe0) {
      return (type - 256).toString();
    }
    // uint8 (0xcc)
    else if (type === 0xcc) {
      return readUint8().toString();
    }
    // uint16 (0xcd)
    else if (type === 0xcd) {
      return readUint16().toString();
    }
    // uint32 (0xce)
    else if (type === 0xce) {
      return readUint32().toString();
    }
    // int8 (0xd0)
    else if (type === 0xd0) {
      const val = readUint8();
      return (val > 127 ? val - 256 : val).toString();
    }
    // int16 (0xd1)
    else if (type === 0xd1) {
      const val = readUint16();
      return (val > 32767 ? val - 65536 : val).toString();
    }
    // int32 (0xd2)
    else if (type === 0xd2) {
      const val = readUint32();
      return (val > 2147483647 ? val - 4294967296 : val).toString();
    }
    // float32 (0xca)
    else if (type === 0xca) {
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      view.setUint8(0, bytes[offset]);
      view.setUint8(1, bytes[offset + 1]);
      view.setUint8(2, bytes[offset + 2]);
      view.setUint8(3, bytes[offset + 3]);
      offset += 4;
      return view.getFloat32(0, false).toString();
    }
    // float64 (0xcb)
    else if (type === 0xcb) {
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, bytes[offset + i]);
      }
      offset += 8;
      return view.getFloat64(0, false).toString();
    }
    // true (0xc3)
    else if (type === 0xc3) {
      return 'TRUE';
    }
    // false (0xc2)
    else if (type === 0xc2) {
      return 'FALSE';
    }
    // nil (0xc0)
    else if (type === 0xc0) {
      return '';
    }
    
    return `[unknown:0x${type.toString(16)}]`;
  }
  
  function readMap(): TagData {
    const type = readUint8();
    let size = 0;
    
    // fixmap (0x80 - 0x8f)
    if (type >= 0x80 && type <= 0x8f) {
      size = type - 0x80;
    }
    // map16 (0xde)
    else if (type === 0xde) {
      size = readUint16();
    }
    // map32 (0xdf)
    else if (type === 0xdf) {
      size = readUint32();
    }
    else {
      console.warn(`MessagePack: tipo inesperado no início: 0x${type.toString(16)}`);
      return {};
    }
    
    const result: TagData = {};
    for (let i = 0; i < size; i++) {
      const key = readValue();
      const value = readValue();
      result[key] = value;
    }
    
    return result;
  }
  
  try {
    return readMap();
  } catch (e) {
    console.error('Erro ao decodificar MessagePack:', e);
    return {};
  }
}

const WebSocketDebug: React.FC = () => {
  // 🔄 USANDO CONEXÃO COMPARTILHADA DO CONTEXTO (sem criar nova conexão)
  const { data: plcData, connectionStatus, sendCommand } = usePLC();
  
  // Estado de URL para mostrar na interface (só visual)
  const [wsUrl, setWsUrl] = useState('ws://localhost:8765');
  
  // Filtros de subscribe
  const [selectedAreas, setSelectedAreas] = useState<string[]>([...AREAS]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...CATEGORIES]);
  const [includeAllFaults, setIncludeAllFaults] = useState(true);
  const [subscribeStatus, setSubscribeStatus] = useState<string>('Usando conexão compartilhada');
  
  // Dados processados do contexto
  const [tags, setTags] = useState<TagData>({});
  const [stats, setStats] = useState<ConnectionStats>({
    messagesReceived: 0,
    tagsProcessed: 0,
    lastUpdate: null,
    connectionTime: 0
  });
  const [messages, setMessages] = useState<Array<{ time: string; type: string; content: string }>>([]);
  
  // Estados derivados do contexto
  const isConnected = connectionStatus.connected;
  const isConnecting = false; // Gerenciado pelo contexto
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null); // Manter para compatibilidade

  // Adicionar mensagem ao log
  const addMessage = useCallback((content: string, type: 'sys' | 'data' | 'err' = 'data') => {
    const time = new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
    setMessages(prev => [{ time, type, content }, ...prev].slice(0, 100));
  }, []);

  // Processar mensagem recebida
  const handleMessage = useCallback((data: string) => {
    let parsedData: TagData = {};
    let isMsgPack = false;
    
    // Verificar se é MessagePack
    if (data.startsWith('MSGPACK:')) {
      isMsgPack = true;
      try {
        const base64Data = data.substring(8);
        const bytes = base64Decode(base64Data);
        parsedData = decodeMsgPack(bytes);
      } catch (e) {
        addMessage(`❌ Erro ao decodificar MessagePack: ${e}`, 'err');
        return;
      }
    } else {
      // Tentar JSON
      try {
        const jsonData = JSON.parse(data);
        
        // Verificar se é resposta de comando (PLC_LIST, SUBSCRIBE_ACK, etc)
        if (jsonData.type) {
          if (jsonData.type === 'PLC_LIST') {
            addMessage(`📋 PLCs disponíveis: ${JSON.stringify(jsonData.plcs)}`, 'sys');
            return;
          }
          if (jsonData.type === 'SUBSCRIBE_ACK') {
            setSubscribeStatus(`✅ Subscrito - Áreas: ${jsonData.areas?.join(', ') || 'Todas'} | Categorias: ${jsonData.categories?.join(', ') || 'Todas'}`);
            addMessage(`✅ Subscribe confirmado: ${jsonData.message}`, 'sys');
            return;
          }
          // Outras respostas de sistema
          addMessage(`📩 Sistema: ${JSON.stringify(jsonData)}`, 'sys');
          return;
        }
        
        parsedData = jsonData;
      } catch {
        addMessage(`⚠️ Dados não-JSON recebidos: ${data.substring(0, 100)}...`, 'err');
        return;
      }
    }
    
    // Atualizar tags
    const tagCount = Object.keys(parsedData).length;
    if (tagCount > 0) {
      setTags(prev => ({ ...prev, ...parsedData }));
      setStats(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        tagsProcessed: prev.tagsProcessed + tagCount,
        lastUpdate: new Date()
      }));
      
      // Log resumido
      const format = isMsgPack ? 'MSGPACK' : 'JSON';
      addMessage(`📦 [${format}] ${tagCount} tags COMPLETOS - SEM LIMITAÇÃO`);
    }
  }, [addMessage]);

  // 🔄 USANDO CONEXÃO COMPARTILHADA - não precisa conectar/desconectar
  const connect = useCallback(() => {
    addMessage('🔄 Usando conexão compartilhada do contexto PLC', 'sys');
    if (connectionStatus.connected) {
      addMessage('✅ Já conectado via contexto!', 'sys');
      startTimeRef.current = Date.now();
      
      // Iniciar timer de uptime
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setStats(prev => ({
              ...prev,
              connectionTime: Math.floor((Date.now() - startTimeRef.current!) / 1000)
            }));
          }
        }, 1000);
      }
    }
  }, [connectionStatus.connected, addMessage]);

  // Desconectar (não faz nada pois usa contexto compartilhado)
  const disconnect = useCallback(() => {
    addMessage('⚠️ Não é possível desconectar - usando conexão compartilhada', 'sys');
  }, [addMessage]);

  // Enviar subscribe usando contexto
  const sendSubscribe = useCallback(() => {
    if (!connectionStatus.connected) {
      addMessage('❌ WebSocket não conectado', 'err');
      return;
    }
    
    const subscribeCmd = {
      type: 'SUBSCRIBE',
      plc_ips: [],
      areas: selectedAreas,
      categories: selectedCategories,
      include_all_faults: includeAllFaults
    };
    
    // 🔥 ENVIAR SUBSCRIBE REAL VIA CONTEXTO
    const writeRequest = {
      plc_ip: '',
      tag_name: 'SUBSCRIBE',
      variable: JSON.stringify(subscribeCmd),
      value: 'SUBSCRIBE',
      data_type: 'STRING'
    };
    
    sendCommand(writeRequest);
    addMessage(`📡 Enviando subscribe: Áreas=[${selectedAreas.join(',')}] Categorias=[${selectedCategories.join(',')}]`, 'sys');
    setSubscribeStatus('Comando enviado via contexto');
  }, [selectedAreas, selectedCategories, includeAllFaults, addMessage, connectionStatus.connected, sendCommand]);

  // Toggle área
  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  // Toggle categoria
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  // Limpar dados
  const clearData = () => {
    setTags({});
    setStats({ messagesReceived: 0, tagsProcessed: 0, lastUpdate: null, connectionTime: 0 });
    setMessages([]);
  };

  // Cleanup on unmount - contexto gerencia a conexão
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Agrupar tags por tipo/área
  const groupedTags = useMemo(() => {
    const groups: { [key: string]: { [key: string]: string } } = {
      'ENCH': {},
      'ESVZ': {},
      'JUS': {},
      'MONT': {},
      'ESGT': {},
      'ECLUS': {},
      'Word': {},
      'Int': {},
      'Real': {},
      'Other': {}
    };
    
    for (const [key, value] of Object.entries(tags)) {
      let assigned = false;
      
      // Verificar área pelo prefixo do tag
      for (const area of AREAS) {
        if (key.toUpperCase().includes(area)) {
          groups[area][key] = value;
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        // Verificar tipo de dado
        if (key.startsWith('Word')) groups['Word'][key] = value;
        else if (key.startsWith('Int')) groups['Int'][key] = value;
        else if (key.startsWith('Real')) groups['Real'][key] = value;
        else groups['Other'][key] = value;
      }
    }
    
    return groups;
  }, [tags]);

  // 🔥 ESCUTAR DADOS RAW DO WEBSOCKET DIRETO
  useEffect(() => {
    const handleRawWebSocketData = (event: any) => {
      const { rawData, processedData } = event.detail;
      
      addMessage(`📥 RAW MESSAGE: ${rawData.substring(0, 100)}${rawData.length > 100 ? '...' : ''}`, 'data');
      
      if (processedData && Object.keys(processedData).length > 0) {
        setTags(processedData);
        
        // Atualizar estatísticas
        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          tagsProcessed: Object.keys(processedData).length,
          lastUpdate: new Date()
        }));
        
        addMessage(`📦 PROCESSADO: ${Object.keys(processedData).length} tags`, 'sys');
      }
    };
    
    window.addEventListener('websocket-raw-data', handleRawWebSocketData);
    
    return () => {
      window.removeEventListener('websocket-raw-data', handleRawWebSocketData);
    };
  }, [addMessage]);

  // Sincronizar status de conexão
  useEffect(() => {
    if (connectionStatus.connected && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      addMessage('✅ Conectado via contexto compartilhado', 'sys');
    } else if (!connectionStatus.connected && startTimeRef.current) {
      startTimeRef.current = null;
      addMessage('❌ Desconectado', 'sys');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [connectionStatus.connected, addMessage]);

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🔌 WebSocket Debug - Conexão Compartilhada</h1>
        <p className="text-gray-600 text-sm">
          🔄 Usando conexão compartilhada do contexto PLC - UMA única conexão WebSocket para todo o app
        </p>
        <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
          <span className="text-green-800 text-xs font-semibold">
            ✅ SEM MÚLTIPLAS CONEXÕES - Sistema otimizado!
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.messagesReceived}</div>
          <div className="text-xs text-gray-500 uppercase">Mensagens</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.tagsProcessed}</div>
          <div className="text-xs text-gray-500 uppercase">Tags Processados</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{Object.keys(tags).length}</div>
          <div className="text-xs text-gray-500 uppercase">Tags Únicos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">{stats.connectionTime}s</div>
          <div className="text-xs text-gray-500 uppercase">Tempo Conexão</div>
        </div>
      </div>

      {/* Conexão */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Configuração de Conexão</h2>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            placeholder="ws://localhost:8765"
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isConnected}
          />
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? 'Conectando...' : 'Conectar'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Desconectar
            </button>
          )}
          <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '● Conectado' : '○ Desconectado'}
          </div>
        </div>
      </div>

      {/* Filtros de Subscribe */}
      {isConnected && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Filtros de Subscribe</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Áreas */}
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">Áreas da Eclusa</div>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(area => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedAreas.includes(area)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Categorias */}
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">Categorias</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategories.includes(cat)
                        ? cat === 'FAULT' ? 'bg-red-600 text-white' :
                          cat === 'EVENT' ? 'bg-yellow-500 text-white' :
                          'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAllFaults}
                onChange={(e) => setIncludeAllFaults(e.target.checked)}
                className="w-4 h-4"
              />
              Sempre receber todas as FAULT e EVENT (painel de alarmes)
            </label>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{subscribeStatus}</span>
              <button
                onClick={sendSubscribe}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de dados */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tags por Grupo */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Tags Recebidos ({Object.keys(tags).length})</h2>
            <button
              onClick={clearData}
              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
            >
              Limpar
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(groupedTags).map(([group, groupTags]) => {
              const tagCount = Object.keys(groupTags).length;
              if (tagCount === 0) return null;
              
              return (
                <div key={group} className="border rounded-lg overflow-hidden">
                  <div className={`px-3 py-2 text-sm font-semibold ${
                    AREAS.includes(group as typeof AREAS[number]) 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {group} ({tagCount})
                  </div>
                  <div className="p-2 max-h-96 overflow-y-auto">
                    <div className="text-xs text-center text-green-600 font-bold mb-2">
                      🎯 MOSTRANDO TODOS OS {tagCount} TAGS SEM CORTAR
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(groupTags).map(([key, value]) => (
                        <div key={key} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                          <span className="font-mono text-gray-600 truncate">{key}</span>
                          <span className={`font-bold ml-2 ${
                            value === 'TRUE' ? 'text-green-600' :
                            value === 'FALSE' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Log de Mensagens */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Log de Mensagens</h2>
            <span className="text-xs text-gray-400">Últimas 100 mensagens</span>
          </div>
          
          <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
            {messages.length === 0 ? (
              <div className="text-gray-400 text-center py-4">Aguardando mensagens...</div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 rounded ${
                    msg.type === 'sys' ? 'bg-blue-50 text-blue-800' :
                    msg.type === 'err' ? 'bg-red-50 text-red-800' :
                    'bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-gray-400">{msg.time}</span>
                  {' '}
                  {msg.content}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dados Raw */}
      <div className="bg-white rounded-lg shadow p-4">
        <details>
          <summary className="cursor-pointer font-semibold text-gray-700">
            Ver todos os Tags (JSON Raw) - {Object.keys(tags).length} tags
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg overflow-auto max-h-60 text-xs">
            {JSON.stringify(tags, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default WebSocketDebug;
