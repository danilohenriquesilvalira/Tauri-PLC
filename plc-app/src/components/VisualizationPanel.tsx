import React, { useState, useEffect, useMemo, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { PlcData, VideoConfig, BitConfig } from '../types';
import { parseTemplate } from '../utils/templateParser';

export const VisualizationPanel: React.FC = () => {
  const [plcData, setPlcData] = useState<PlcData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [videos, setVideos] = useState<VideoConfig[]>([]);
  const [bitConfigs, setBitConfigs] = useState<BitConfig[]>([]);
  const [currentView, setCurrentView] = useState<'plc' | 'video'>('plc');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [viewStartTime, setViewStartTime] = useState(Date.now());
  const [videoControlConfig, setVideoControlConfig] = useState<{ wordIndex: number; bitIndex: number }>({ wordIndex: 3, bitIndex: 3 });
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Refs para valores atualizados no intervalo (stale closure fix)
  const currentViewRef = useRef(currentView);
  const videosRef = useRef(videos);
  const plcDataRef = useRef(plcData);
  const videoControlConfigRef = useRef(videoControlConfig);
  const currentVideoIndexRef = useRef(currentVideoIndex);
  const viewStartTimeRef = useRef(viewStartTime);
  
  // Atualizar refs quando estados mudam
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);
  
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);
  
  useEffect(() => {
    plcDataRef.current = plcData;
  }, [plcData]);
  
  useEffect(() => {
    videoControlConfigRef.current = videoControlConfig;
  }, [videoControlConfig]);
  
  useEffect(() => {
    currentVideoIndexRef.current = currentVideoIndex;
  }, [currentVideoIndex]);
  
  useEffect(() => {
    viewStartTimeRef.current = viewStartTime;
  }, [viewStartTime]);

  // Listener PLC - executado uma vez
  useEffect(() => {
    console.log('🎧 [Panel] Configurando listener PLC...');
    const setupListener = async () => {
      try {
        const unlisten = await listen<{ message: PlcData }>('plc-data', (event) => {
          console.log('📡 [Panel] Dados PLC recebidos!', {
            timestamp: event.payload.message.timestamp,
            variablesCount: Object.keys(event.payload.message.variables).length
          });
          setPlcData(event.payload.message);
          setIsConnected(true);
          setLastUpdate(new Date());
        });
        console.log('✅ [Panel] Listener PLC configurado com sucesso');
        return unlisten;
      } catch (error) {
        console.error('❌ [Panel] Erro ao configurar listener:', error);
      }
    };

    let unlistenFn: any;
    setupListener().then(fn => { unlistenFn = fn; });

    return () => {
      console.log('🔌 [Panel] Removendo listener PLC');
      if (unlistenFn) unlistenFn();
    };
  }, []); // Executa apenas uma vez

  // Carregar configurações - executado uma vez
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        // FORÇAR configuração para Word[3].3
        console.log('🔧 [Panel] FORÇANDO configuração para Word[3].3');
        await invoke('set_video_control_config', { wordIndex: 3, bitIndex: 3 });
        
        const [videosData, bitConfigsData, videoControlData] = await Promise.all([
          invoke<VideoConfig[]>('get_enabled_videos'),
          invoke<BitConfig[]>('get_all_bit_configs'),
          invoke<[number, number]>('get_video_control_config')
        ]);
        
        console.log('📦 [Panel] Dados carregados do backend:', {
          videosTotal: videosData.length,
          videos: videosData,
          bitConfigs: bitConfigsData.length,
          videoControl: videoControlData
        });
        
        setVideos(videosData);
        setBitConfigs(bitConfigsData);
        setVideoControlConfig({ wordIndex: videoControlData[0], bitIndex: videoControlData[1] });
        
        console.log('✅ [Panel] Configurações aplicadas ao state:', {
          videos: videosData.length,
          bitConfigs: bitConfigsData.length,
          videoControl: `Word[${videoControlData[0]}].${videoControlData[1]}`
        });
      } catch (error) {
        console.error('❌ [Panel] Erro ao carregar configurações:', error);
      }
    };

    loadConfigs();
  }, []); // Executa apenas uma vez

  // Atualizar relógio - independente
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []); // Executa apenas uma vez

  // Carregar vídeo atual
  useEffect(() => {
    const loadVideoSrc = async () => {
      if (currentView === 'video' && videos[currentVideoIndex]) {
        const video = videos[currentVideoIndex];
        console.log('🎬 [Panel] Carregando vídeo:', video.file_path);
        
        try {
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const src = convertFileSrc(video.file_path);
          console.log('✅ [Panel] URL gerada:', src);
          setVideoSrc(src);
        } catch (error) {
          console.error('❌ [Panel] Erro ao converter vídeo:', error);
          setVideoSrc(video.file_path);
        }
      }
    };
    
    loadVideoSrc();
  }, [currentVideoIndex, currentView, videos]);

  // Verificar bit de controle e alternar entre vídeo e PLC
  useEffect(() => {
    console.log('⏰ [Panel] Criando intervalo de verificação...');
    const viewInterval = setInterval(() => {
      console.log('⏰⏰⏰ [INTERVALO EXECUTANDO] ⏰⏰⏰');
      
      // Usar refs para ter valores atualizados
      const currentViewValue = currentViewRef.current;
      const videosValue = videosRef.current;
      const plcDataValue = plcDataRef.current;
      const videoControlConfigValue = videoControlConfigRef.current;
      const currentVideoIndexValue = currentVideoIndexRef.current;
      const viewStartTimeValue = viewStartTimeRef.current;
      
      console.log('📊 [Panel DEBUG] Valores do intervalo:', {
        currentView: currentViewValue,
        videosLength: videosValue.length,
        plcDataExists: !!plcDataValue,
        currentVideoIndex: currentVideoIndexValue
      });
      
      // Verificar se o bit de controle de vídeos está ativo
      let shouldShowVideos = false;
      if (plcDataValue?.variables) {
        const wordKey = `Word[${videoControlConfigValue.wordIndex}]`;
        const wordValue = plcDataValue.variables[wordKey] || 0;
        const bitValue = ((wordValue >> videoControlConfigValue.bitIndex) & 1) === 1;
        shouldShowVideos = bitValue;
        
        console.log('🔥 [INTERVALO] Verificação do bit:', {
          wordKey,
          wordValue,
          bitIndex: videoControlConfigValue.bitIndex,
          bitValue,
          shouldShowVideos
        });
      }
      
      console.log('🎬 [Panel] Estado COMPLETO:', {
        shouldShowVideos,
        currentView: currentViewValue,
        videosCarregados: videosValue.length,
        videosDetalhes: videosValue.map(v => ({ name: v.name, enabled: v.enabled })),
        videoControl: `Word[${videoControlConfigValue.wordIndex}].${videoControlConfigValue.bitIndex}`,
        decisao: shouldShowVideos && videosValue.length > 0 ? 'DEVE MOSTRAR VIDEOS' : 'DEVE MOSTRAR PLC'
      });

      const now = Date.now();

      console.log('🎯🎯🎯 [DECISÃO] 🎯🎯🎯', {
        shouldShowVideos,
        'videos.length': videosValue.length,
        condicao: shouldShowVideos && videosValue.length > 0,
        currentView: currentViewValue,
        decisao: (shouldShowVideos && videosValue.length > 0) ? '📹 VAI MOSTRAR VIDEOS' : '📊 VAI MOSTRAR PLC'
      });

      if (shouldShowVideos && videosValue.length > 0) {
        // BIT ATIVO - Mostrar vídeos
        console.log('🎬🎬🎬 [ENTROU NA CONDIÇÃO DE VIDEOS] 🎬🎬🎬', {
          shouldShowVideos,
          videosLength: videosValue.length,
          currentView: currentViewValue
        });
        
        if (currentViewValue === 'plc') {
          // Mudar de PLC para vídeo
          console.log('🚀🚀🚀 [MUDANDO PARA VÍDEOS AGORA!!!] 🚀🚀🚀');
          console.log('📹 [Panel] Vídeos disponíveis:', videosValue.length);
          setCurrentView('video');
          setCurrentVideoIndex(0);
          setViewStartTime(now);
        } else if (currentViewValue === 'video') {
          // Continuar rotacionando vídeos
          const currentVideo = videosValue[currentVideoIndexValue];
          const elapsed = (now - viewStartTimeValue) / 1000;
          
          console.log('🎬 [ROTAÇÃO] Status do vídeo:', {
            currentVideoIndex: currentVideoIndexValue,
            videoName: currentVideo?.name,
            duration: currentVideo?.duration,
            elapsed: Math.floor(elapsed),
            shouldRotate: currentVideo && elapsed >= currentVideo.duration
          });
          
          if (currentVideo && elapsed >= currentVideo.duration) {
            if (currentVideoIndexValue + 1 < videosValue.length) {
              console.log(`🔄 [Panel] Próximo vídeo: ${currentVideoIndexValue + 1}`);
              setCurrentVideoIndex(currentVideoIndexValue + 1);
              setViewStartTime(now);
            } else {
              console.log('🔁 [Panel] Reiniciando ciclo de vídeos');
              setCurrentVideoIndex(0);
              setViewStartTime(now);
            }
          }
        }
      } else {
        // BIT INATIVO - Mostrar dados PLC
        if (currentViewValue === 'video') {
          console.log('⛔ [Panel] Bit inativo - Voltando para dados PLC');
          setCurrentView('plc');
          setCurrentVideoIndex(0);
          setViewStartTime(now);
        }
      }
    }, 1000);

    return () => {
      console.log('🛑 [Panel] Limpando intervalo');
      clearInterval(viewInterval);
    };
  }, []); // SEM dependências para o intervalo funcionar!

  // Função para verificar se o bit de controle de vídeos está ativo
  const checkVideoControlBit = (): boolean => {
    if (!plcData?.variables) {
      console.log('⚠️ [Panel] Sem dados PLC');
      return false;
    }

    const wordKey = `Word[${videoControlConfig.wordIndex}]`;
    const wordValue = plcData.variables[wordKey] || 0;
    
    console.log('🔥🔥🔥 [BIT CONTROL CHECK] 🔥🔥🔥', {
      wordKey,
      wordValue,
      wordValueBinario: wordValue.toString(2).padStart(16, '0'),
      bitIndex: videoControlConfig.bitIndex,
      calculoBit: `(${wordValue} >> ${videoControlConfig.bitIndex}) & 1`,
      resultadoCalculo: (wordValue >> videoControlConfig.bitIndex) & 1,
      todasWords: plcData.variables
    });
    
    const bitValue = ((wordValue >> videoControlConfig.bitIndex) & 1) === 1;
    
    console.log(`🔍 [Panel] Resultado FINAL:`, {
      wordKey,
      wordValue,
      bitIndex: videoControlConfig.bitIndex,
      bitValue,
      mensagem: bitValue ? '✅ BIT ATIVO - DEVE MOSTRAR VIDEOS!' : '❌ BIT INATIVO - MOSTRAR PLC'
    });
    
    return bitValue;
  };

  const getEclusaStatus = () => {
    if (!plcData) return 'Sem Dados';
    
    const faseAtual = plcData.variables.fase_eclusa || 1;
    const eclusaAtiva = plcData.variables.eclusa_ativa || false;
    
    if (!eclusaAtiva) return 'Inativa';
    
    switch (faseAtual) {
      case 1: return 'Aguardando Embarcação';
      case 2: return 'Entrada de Água';
      case 3: return 'Elevação da Embarcação';
      case 4: return 'Saída da Embarcação';
      case 5: return 'Drenagem';
      default: return `Fase ${faseAtual}`;
    }
  };

  const getSemaforoColor = () => {
    if (!isConnected || !plcData) return 'bg-gray-400';
    
    const excessoVel = plcData.variables.excesso_velocidade || false;
    const eclusaAtiva = plcData.variables.eclusa_ativa || false;
    
    if (excessoVel) return 'bg-red-500';
    if (eclusaAtiva) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // useMemo para recalcular mensagens ativas quando plcData ou bitConfigs mudam
  const activeMessages = useMemo(() => {
    if (!plcData?.variables || bitConfigs.length === 0) {
      console.log('🔍 [VisualizationPanel] Sem dados PLC ou bitConfigs vazios:', {
        plcData: !!plcData,
        variables: !!plcData?.variables,
        bitConfigsCount: bitConfigs.length
      });
      return [];
    }
    
    console.log('🔍 [VisualizationPanel] RECALCULANDO mensagens ativas:', {
      totalBitConfigs: bitConfigs.length,
      plcVariables: Object.keys(plcData.variables).length,
      timestamp: plcData.timestamp
    });
    
    const messages: Array<{ 
      message: string; 
      color: string; 
      priority: number;
      fontSize: number;
      position: string;
      fontFamily: string;
      fontWeight: string;
      textShadow: boolean;
      letterSpacing: number;
    }> = [];
    
    bitConfigs.forEach(bitConfig => {
      if (!bitConfig.enabled) return;
      
      const wordKey = `Word[${bitConfig.word_index}]`;
      const wordValue = plcData.variables[wordKey] || 0;
      const bitValue = ((wordValue >> bitConfig.bit_index) & 1) === 1;
      
      console.log(`🔍 [Bit Check] ${wordKey}.${bitConfig.bit_index} (${bitConfig.name}):`, {
        wordValue,
        bitValue,
        message: bitConfig.message,
        useTemplate: bitConfig.use_template
      });
      
      // Só adicionar mensagem se bit estiver ATIVO (1)
      if (bitValue) {
        // Decidir qual mensagem usar: template com variáveis ou mensagem estática
        let finalMessage: string;
        
        if (bitConfig.use_template && bitConfig.message_template) {
          // Usar template e substituir {Word[N]} por valores reais
          finalMessage = parseTemplate(bitConfig.message_template, plcData.variables);
          console.log(`✅ [Template Processado] ${bitConfig.name}:`, {
            template: bitConfig.message_template,
            resultado: finalMessage
          });
        } else {
          // Usar mensagem estática normal
          finalMessage = bitConfig.message;
          console.log(`✅ [Bit ATIVO] Adicionando: ${finalMessage}`);
        }
        
        if (finalMessage.trim()) {
          messages.push({
            message: finalMessage,
            color: bitConfig.color,
            priority: bitConfig.priority,
            fontSize: bitConfig.font_size,
            position: bitConfig.position,
            fontFamily: bitConfig.font_family || 'Arial Black',
            fontWeight: bitConfig.font_weight || 'bold',
            textShadow: bitConfig.text_shadow !== undefined ? bitConfig.text_shadow : true,
            letterSpacing: bitConfig.letter_spacing || 2
          });
        }
      }
    });
    
    console.log('📊 [VisualizationPanel] Total mensagens ativas:', messages.length);
    
    // Ordenar por prioridade (maior primeiro)
    return messages.sort((a, b) => b.priority - a.priority);
  }, [plcData, bitConfigs]); // Recalcula quando plcData ou bitConfigs mudam

  const currentVideo = videos[currentVideoIndex];

  // LOG GIGANTE PARA DEBUG
  console.log('🚨🚨🚨 [ESTADO COMPLETO DO PAINEL] 🚨🚨🚨', {
    currentView,
    currentVideoIndex,
    videosLength: videos.length,
    currentVideo,
    videoSrc,
    videoControlConfig,
    plcConnected: isConnected,
    plcDataExists: !!plcData
  });

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden text-white">
      {/* FULL SCREEN - Alternância entre PLC e Vídeos */}
      {currentView === 'plc' ? (
          // Modo PLC - Mensagens dos Bits Ativos
          <div className="w-full h-full flex flex-col justify-center items-center p-8">
            {activeMessages.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-center items-center space-y-4">
                {activeMessages.slice(0, 5).map((msg, index) => (
                  <div 
                    key={index}
                    className="w-full flex items-center justify-center transform transition-all duration-500"
                    style={{ 
                      animation: `fadeIn 0.5s ease-in ${index * 0.1}s both`,
                      flex: 1,
                      maxHeight: `${100 / Math.min(activeMessages.length, 5)}%`
                    }}
                  >
                    <p 
                      style={{ 
                        color: msg.color,
                        fontSize: `${msg.fontSize}px`,
                        fontFamily: msg.fontFamily,
                        fontWeight: msg.fontWeight,
                        letterSpacing: `${msg.letterSpacing}px`,
                        textShadow: msg.textShadow ? `0 0 50px ${msg.color}, 0 0 100px ${msg.color}, 0 0 150px ${msg.color}, 0 0 200px ${msg.color}` : 'none',
                        textTransform: 'uppercase',
                        lineHeight: 1.1,
                        textAlign: 'center',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        wordWrap: 'break-word',
                        hyphens: 'auto',
                        WebkitFontSmoothing: 'antialiased'
                      }}
                    >
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          // Modo Vídeo - FULL SCREEN
          <div className="w-full h-full flex items-center justify-center">
            {(() => {
              console.log('🎥 [Panel RENDER] Modo VIDEO ativo!', {
                currentVideoIndex,
                videosLength: videos.length,
                currentVideo: videos[currentVideoIndex],
                videoSrc
              });
              return null;
            })()}
            {currentVideo && videoSrc ? (
              <video
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onError={() => {
                  console.error('❌ [Panel] Erro ao carregar vídeo:', currentVideo.file_path);
                  console.error('❌ [Panel] URL:', videoSrc);
                }}
                onLoadedData={() => {
                  console.log('✅ [Panel] Vídeo carregado:', currentVideo.name);
                  if (videoRef.current) {
                    videoRef.current.play().then(() => {
                      console.log('▶️ [Panel] Vídeo reproduzindo!');
                    }).catch(err => {
                      console.error('❌ [Panel] Erro ao dar play:', err);
                    });
                  }
                }}
              >
                Seu navegador não suporta o elemento de vídeo.
              </video>
            ) : null}
          </div>
        )}
        
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
    </div>
  );
};