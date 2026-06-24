import { useState, useEffect, useCallback, useRef } from 'react';
import { PLCData, ConnectionStatus, WriteRequest, TagData } from '../types/plc';

declare global {
  interface Window {
    wsDebugTime?: number;
    lastCacheTime?: number;
  }
}

interface UseWebSocketReturn {
  data: PLCData | null;
  connectionStatus: ConnectionStatus;
  sendCommand: (command: WriteRequest) => void;
  connect: () => void;
  disconnect: () => void;
}

// ============================================================================
// 🎯 HOOK OTIMIZADO PARA WEBSOCKET DO SERVIDOR RUST (porta 8765)
// ============================================================================
// Formato de dados do servidor:
// - JSON: { "tag_name": "value", "tag_name2": "value2", ... }
// - MessagePack: "MSGPACK:base64_encoded_data"
// ============================================================================

// Decodificador Base64 para MessagePack
function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodificador MessagePack real (subset para Map<String, String>)
function decodeMsgPack(bytes: Uint8Array): Record<string, string> {
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
      return readString(type - 0xa0);
    }
    // str8 (0xd9)
    else if (type === 0xd9) {
      return readString(readUint8());
    }
    // str16 (0xda)
    else if (type === 0xda) {
      return readString(readUint16());
    }
    // str32 (0xdb)
    else if (type === 0xdb) {
      return readString(readUint32());
    }
    // positive fixint (0x00 - 0x7f)
    else if (type <= 0x7f) {
      return type.toString();
    }
    // negative fixint (0xe0 - 0xff)
    else if (type >= 0xe0) {
      return (type - 256).toString();
    }
    // uint8, uint16, uint32, int8, int16, int32
    else if (type === 0xcc) return readUint8().toString();
    else if (type === 0xcd) return readUint16().toString();
    else if (type === 0xce) return readUint32().toString();
    else if (type === 0xd0) { const v = readUint8(); return (v > 127 ? v - 256 : v).toString(); }
    else if (type === 0xd1) { const v = readUint16(); return (v > 32767 ? v - 65536 : v).toString(); }
    else if (type === 0xd2) { const v = readUint32(); return (v > 2147483647 ? v - 4294967296 : v).toString(); }
    // float32 (0xca)
    else if (type === 0xca) {
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      for (let i = 0; i < 4; i++) view.setUint8(i, bytes[offset + i]);
      offset += 4;
      return view.getFloat32(0, false).toString();
    }
    // float64 (0xcb)
    else if (type === 0xcb) {
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      for (let i = 0; i < 8; i++) view.setUint8(i, bytes[offset + i]);
      offset += 8;
      return view.getFloat64(0, false).toString();
    }
    // true/false/nil
    else if (type === 0xc3) return 'TRUE';
    else if (type === 0xc2) return 'FALSE';
    else if (type === 0xc0) return '';
    
    return '';
  }
  
  try {
    const type = readUint8();
    let size = 0;
    
    // fixmap (0x80 - 0x8f)
    if (type >= 0x80 && type <= 0x8f) size = type - 0x80;
    // map16 (0xde)
    else if (type === 0xde) size = readUint16();
    // map32 (0xdf)
    else if (type === 0xdf) size = readUint32();
    else return {};
    
    const result: Record<string, string> = {};
    for (let i = 0; i < size; i++) {
      const key = readValue();
      const value = readValue();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

// Processar dados brutos do WebSocket
function processWebSocketData(rawData: string): TagData {
  // Verificar se é MessagePack
  if (rawData.startsWith('MSGPACK:')) {
    const base64Data = rawData.substring(8);
    const bytes = base64Decode(base64Data);
    return decodeMsgPack(bytes);
  }
  
  // Verificar se é resposta de sistema (PLC_LIST, SUBSCRIBE_ACK, etc)
  try {
    const parsed = JSON.parse(rawData);
    // Se tem campo 'type', é mensagem de sistema, não dados de tags
    if (parsed.type) {
      if (import.meta.env.DEV) {
      console.log('📩 Mensagem de sistema:', parsed.type);
    }
      return {};
    }
    return parsed;
  } catch {
    console.warn('Falha ao parsear dados do WebSocket:', rawData.substring(0, 100));
    return {};
  }
}

// Converter TagData para estrutura PLCData compatível
function convertToPLCData(tagData: TagData, existingData: PLCData | null): PLCData {
  // Manter dados existentes e mesclar novos
  const baseData: PLCData = existingData || {
    words: [],
    ints: [],
    reals: [],
    strings: [],
    tags: {},
    bit_data: { status_bits: [], alarm_bits: [], event_bits: [] },
    status_bits: { enchimento: [], esvaziamento: [], porta_jusante: [], porta_montante: [], esgoto_drenagem: [], sala_comando: [] },
    alarm_bits: { enchimento: [], esvaziamento: [], porta_jusante: [], porta_montante: [], comando_eclusa: [], esgoto_drenagem: [] },
    event_bits: { enchimento: [], esvaziamento: [], porta_jusante: [], porta_montante: [], comando_eclusa: [], esgoto_drenagem: [] },
    int_data: { enchimento: [], esvaziamento: [], porta_jusante: [], porta_montante: [], esgoto_drenagem: [], sala_comando: [] },
    real_data: { enchimento: [], esvaziamento: [], porta_jusante: [], porta_montante: [], esgoto_drenagem: [], sala_comando: [], uso_geral: [] },
    counts: { word_count: 0, int_count: 0, real_count: 0, string_count: 0 },
    timestamp: new Date().toISOString(),
    bytes_size: 0
  };

  // Mesclar novos tags
  const mergedTags = { ...baseData.tags, ...tagData };

  // Processar tags para arrays legados (Word0, Int0, Real0, etc.)
  const words: number[] = [...baseData.words];
  const ints: number[] = [...baseData.ints];
  const reals: number[] = [...baseData.reals];
  const strings: string[] = [...baseData.strings];

  for (const [tagName, value] of Object.entries(tagData)) {
    // Word0, Word1, etc.
    const wordMatch = tagName.match(/^Word(\d+)$/);
    if (wordMatch) {
      const index = parseInt(wordMatch[1], 10);
      words[index] = parseInt(value, 10) || 0;
      continue;
    }

    // Int0, Int1, etc.
    const intMatch = tagName.match(/^Int(\d+)$/);
    if (intMatch) {
      const index = parseInt(intMatch[1], 10);
      ints[index] = parseInt(value, 10) || 0;
      continue;
    }

    // Real0, Real1, etc.
    const realMatch = tagName.match(/^Real(\d+)$/);
    if (realMatch) {
      const index = parseInt(realMatch[1], 10);
      reals[index] = parseFloat(value) || 0;
      continue;
    }

    // String0, String1, etc.
    const stringMatch = tagName.match(/^String(\d+)$/);
    if (stringMatch) {
      const index = parseInt(stringMatch[1], 10);
      strings[index] = value;
      continue;
    }
  }

  return {
    ...baseData,
    words,
    ints,
    reals,
    strings,
    tags: mergedTags,
    timestamp: new Date().toISOString(),
    bytes_size: JSON.stringify(mergedTags).length
  };
}

// ============================================================================
// 🔍 DESCOBERTA AUTOMÁTICA DE SERVIDOR WEBSOCKET
// ============================================================================

async function discoverWebSocketServer(port: number = 8765): Promise<string | null> {
  // Lista de endereços para tentar
  const addressesToTry: string[] = [];
  
  // 1. Host atual da página (para quando frontend está no mesmo servidor)
  const currentHost = window.location.hostname;
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    addressesToTry.push(currentHost);
  }
  
  // 2. Localhost (para desenvolvimento)
  addressesToTry.push('localhost');
  addressesToTry.push('127.0.0.1');
  
  // 3. Tentar detectar IPs na rede local comum
  const commonLocalIPs = [
    '192.168.1.1', '192.168.1.100', '192.168.1.200',
    '192.168.0.1', '192.168.0.100', '192.168.0.200',
    '10.0.0.1', '10.0.0.100',
  ];
  addressesToTry.push(...commonLocalIPs);

  // Tentar conectar em cada endereço
  for (const host of addressesToTry) {
    const url = `ws://${host}:${port}`;
    const result = await testWebSocketConnection(url, 2000);
    if (result) {
      if (import.meta.env.DEV) {
        console.log(`✅ Servidor WebSocket encontrado em: ${url}`);
      }
      return url;
    }
  }
  
  return null;
}

async function testWebSocketConnection(url: string, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        resolve(false);
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// 🚀 HOOK PRINCIPAL - SINGLETON PARA EVITAR MÚLTIPLAS CONEXÕES
// ============================================================================

// Contador de instâncias ativas para detectar múltiplas conexões
let activeInstanceCount = 0;

export const useWebSocket = (initialUrl?: string): UseWebSocketReturn => {
  
  // Incrementar contador na montagem, decrementar na desmontagem
  useEffect(() => {
    activeInstanceCount++;
    if (import.meta.env.DEV) {
      console.log(`🔢 Instâncias WebSocket ativas: ${activeInstanceCount}`);
    }
    
    if (activeInstanceCount > 1) {
      console.error(`❌ MÚLTIPLAS CONEXÕES DETECTADAS! ${activeInstanceCount} instâncias ativas`);
      console.error('🔥 Isso causará múltiplas conexões WebSocket - verifique o código!');
    }
    
    return () => {
      activeInstanceCount--;
      if (import.meta.env.DEV) {
        console.log(`🔢 Instâncias WebSocket ativas: ${activeInstanceCount}`);
      }
    };
  }, []);
  
  // 🚀 CACHE: Carregar valores persistidos do localStorage para evitar flashes
  // ⚡ OTIMIZADO: Cache reduzido para 30 segundos para evitar dados desatualizados na navegação
  const loadCachedData = (): PLCData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem('plc-websocket-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Verificar se cache não é muito antigo (max 30 segundos - reduzido de 5 minutos)
        if (Date.now() - parsed.timestamp < 30 * 1000) {
          if (import.meta.env.DEV) {
            console.log('🔄 Cache WebSocket restaurado:', Object.keys(parsed.data?.tags || {}).length, 'tags');
          }
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar cache WebSocket:', error);
    }
    return null;
  };

  const [data, setData] = useState<PLCData | null>(loadCachedData());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastUpdate: null,
    plc_connections: 0,
    websocket_clients: 0,
    serverUrl: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const discoveredUrlRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const dataRef = useRef<PLCData | null>(null);

  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 3000;

  // Atualizar ref quando data muda
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const connect = useCallback(async () => {
    // Evitar conexões simultâneas
    if (isConnectingRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏳ Conexão já em andamento...');
      }
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (import.meta.env.DEV) {
        console.log('✅ WebSocket já conectado');
      }
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      if (import.meta.env.DEV) {
        console.log('⏳ WebSocket já tentando conectar...');
      }
      return;
    }

    isConnectingRef.current = true;

    // Fechar conexão anterior
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      let url = initialUrl || discoveredUrlRef.current;
      
      // Se não tem URL, descobrir servidor
      if (!url) {
        console.log('🔍 Procurando servidor WebSocket na rede...');
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          serverUrl: null,
        }));
        
        const discovered = await discoverWebSocketServer(8765);
        if (discovered) {
          url = discovered;
          discoveredUrlRef.current = discovered;
        } else {
          // Fallback para localhost
          url = 'ws://localhost:8765';
          console.warn('⚠️ Servidor não encontrado, usando fallback:', url);
        }
      }

      if (import.meta.env.DEV) {
        console.log('🔌 NOVA CONEXÃO WebSocket:', url);
        console.log('⚠️ Se você ver esta mensagem DUAS VEZES = BUG DE MÚLTIPLAS CONEXÕES');
      }
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado:', url);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          serverUrl: url!,
          lastUpdate: new Date(),
        }));

        // Limpar timeout de reconexão
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Enviar comando de subscribe para receber todos os dados
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          plc_ips: [],        // Vazio = todos os PLCs
          areas: [],          // Vazio = todas as áreas
          categories: [],     // Vazio = todas as categorias
          include_all_faults: true
        }));
      };

      ws.onmessage = (event) => {
        try {
          // 🔍 DEBUG: Verificar se WebSocket está recebendo dados em tempo real
          if (import.meta.env.DEV) {
            const now = Date.now();
            if (!window.wsDebugTime) window.wsDebugTime = now;
            const interval = now - window.wsDebugTime;
            window.wsDebugTime = now;
            console.log(`📥 WebSocket RX [${interval}ms]:`, event.data.substring(0, 200));
          }
          
          const tagData = processWebSocketData(event.data);
          
          // Só atualizar se recebeu dados válidos
          if (Object.keys(tagData).length > 0) {
            const newData = convertToPLCData(tagData, dataRef.current);
            setData(newData);
            
            // ⚡ OTIMIZAÇÃO: Cache apenas a cada 5 segundos para reduzir overhead
            const now = Date.now();
            if (typeof window !== 'undefined' && newData?.tags && Object.keys(newData.tags).length > 0) {
              if (!window.lastCacheTime || (now - window.lastCacheTime) > 5000) {
                try {
                  localStorage.setItem('plc-websocket-cache', JSON.stringify({
                    data: newData,
                    timestamp: now
                  }));
                  window.lastCacheTime = now;
                } catch (error) {
                  // Ignorar erro de localStorage
                }
              }
            }
            
            setConnectionStatus(prev => ({
              ...prev,
              lastUpdate: new Date(),
            }));
            
            // Disparar evento customizado para debug
            window.dispatchEvent(new CustomEvent('websocket-raw-data', {
              detail: { rawData: event.data, processedData: tagData }
            }));
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket desconectado:', event.code, event.reason);
        isConnectingRef.current = false;
        
        // 🚀 CACHE: Preservar dados durante desconexão temporária
        // Não limpar data atual, mantendo últimos valores válidos na tela
        
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
        }));

        // Reconectar automaticamente
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            baseReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1),
            30000
          );
          
          console.log(`🔄 Reconectando em ${delay}ms (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Limpar URL descoberto para forçar nova busca
            if (reconnectAttemptsRef.current > 3) {
              discoveredUrlRef.current = null;
            }
            connect();
          }, delay);
        } else {
          console.error('❌ Máximo de tentativas de reconexão atingido');
          // Reset para permitir nova tentativa manual
          reconnectAttemptsRef.current = 0;
          discoveredUrlRef.current = null;
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, [initialUrl]);

  const disconnect = useCallback(() => {
    // Limpar timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fechar WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão manual');
      wsRef.current = null;
    }

    // Resetar estado
    reconnectAttemptsRef.current = maxReconnectAttempts; // Evitar reconexão automática
    isConnectingRef.current = false;

    setConnectionStatus(prev => ({
      ...prev,
      connected: false,
    }));
  }, []);

  const sendCommand = useCallback((command: WriteRequest) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      
      // 🔥 DETECTAR COMANDO DE SUBSCRIBE ESPECIAL
      if (command.tag_name === 'SUBSCRIBE' && command.variable) {
        try {
          const subscribeCmd = JSON.parse(command.variable);
          if (import.meta.env.DEV) {
            console.log('📡 ENVIANDO SUBSCRIBE:', subscribeCmd);
          }
          wsRef.current.send(JSON.stringify(subscribeCmd));
          return;
        } catch (error) {
          console.error('❌ Erro ao processar comando subscribe:', error);
        }
      }
      
      // Comando normal de escrita
      const rustCommand = {
        type: 'WRITE_TAG',
        plc_ip: command.plc_ip || '',
        tag_name: command.tag_name || command.variable,
        value: command.value?.toString() || '',
        data_type: command.data_type || 'BOOL'
      };
      
      wsRef.current.send(JSON.stringify(rustCommand));
      if (import.meta.env.DEV) {
        console.log('📤 Comando enviado:', rustCommand);
      }
    } else {
      console.error('❌ WebSocket não conectado, comando não enviado:', command);
    }
  }, []);

  // Auto-connect na montagem
  useEffect(() => {
    const timer = setTimeout(() => {
      connect();
    }, 500);

    // CLEANUP DEFINITIVO ao desmontar componente
    return () => {
      clearTimeout(timer);
      
      console.log('🔄 LIMPEZA COMPLETA DO WEBSOCKET - COMPONENTE DESMONTADO');
      
      // Para toda tentativa de reconexão
      reconnectAttemptsRef.current = maxReconnectAttempts;
      isConnectingRef.current = false;
      
      // Limpa timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Fecha WebSocket DEFINITIVAMENTE
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        
        wsRef.current.close(1000, 'Componente desmontado');
        wsRef.current = null;
      }
      
      console.log('✅ WebSocket limpo completamente');
      console.log(`🔢 Restam ${activeInstanceCount - 1} instâncias ativas`);
    };
  }, [connect, disconnect]);

  // Monitorar visibilidade da página  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconectar se não estiver conectado
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      } else {
        // Página está oculta - reduzir atividade
        console.log('📱 Página oculta - mantendo conexão mas sem reconexões agressivas');
      }
    };

    const handleBeforeUnload = () => {
      console.log('🚪 Página sendo fechada - fechando WebSocket');
      if (wsRef.current) {
        wsRef.current.close(1000, 'Página fechando');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [connect]);

  return {
    data,
    connectionStatus,
    sendCommand,
    connect,
    disconnect,
  };
};
