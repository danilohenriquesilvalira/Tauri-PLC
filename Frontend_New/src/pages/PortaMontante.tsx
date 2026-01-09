import React from 'react';
import { usePLC } from '../contexts/PLCContext';
import ContraPeso20t from '../components/Porta_Montante/Porta_Montante_Contrapeso';
import PortaMontanteRegua from '../components/Porta_Montante/PortaMontanteRegua';
import MotorMontante from '../components/Porta_Montante/Motor_Montante';
import { Card } from '../components/ui/Card';
import { InfoCard } from '../components/ui/InfoCard';
import { StatusCard } from '../components/ui/StatusCard';
import {
  CogIcon,
  PlayIcon,
  StopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';


interface PortaMontanteProps {
  sidebarOpen?: boolean;
}

// 🏗️ CONFIGURAÇÃO DOS CONTRAPESOS E RÉGUA - SEPARADO MOBILE/DESKTOP
const CONTRAPESO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 40.7,    // % da altura total (posição Y)
      horizontalPercent: 68.65,  // % da largura total (posição X)
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 40.7,    // % da altura total (posição Y)
      horizontalPercent: 23.75,  // % da largura total (posição X)
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 34.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 83,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 34.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 9.6,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  }
};

// 📏 CONFIGURAÇÃO DA RÉGUA PORTA MONTANTE - SEPARADO MOBILE/DESKTOP
const REGUA_CONFIG = {
  desktop: {
    verticalPercent: 20,      // % da altura total (posição Y)
    horizontalPercent: 20.95,    // % da largura total (posição X) - VOLTA POSIÇÃO ORIGINAL
    widthPercent: 58.16,      // % da largura total (tamanho) +34% (57.02 * 1.02)
    heightPercent: 72.00,     // % da altura total (tamanho) +34% (70.59 * 1.02)
  },
  mobile: {
    verticalPercent: 7,      // % da altura total (posição Y)
    horizontalPercent: 22.5,    // % da largura total (posição X) - ajustado para mobile
    widthPercent: 55.4,      // % da largura total (tamanho) +34% (65.17 * 1.02)
    heightPercent: 100,    // % da altura total (tamanho) +34% (112.68 * 1.02)
  }
};


// ⚙️ CONFIGURAÇÃO DOS MOTORES PORTA MONTANTE - SEPARADO MOBILE/DESKTOP
const MOTOR_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 3.75,      // % da altura total (posição Y)
      horizontalPercent: 69.3,    // % da largura total (posição X)
      widthPercent: 7.4,        // % da largura total (tamanho) - 45% menor
      heightPercent: 9.2,       // % da altura total (tamanho) - 45% menor
    },
    esquerdo: {
      verticalPercent: 3.9,      // % da altura total (posição Y)
      horizontalPercent: 23.25,    // % da largura total (posição X)
      widthPercent: 7.4,        // % da largura total (tamanho) - 45% menor
      heightPercent: 9.2,       // % da altura total (tamanho) - 45% menor
    }
  },
  mobile: {
    direito: {
      verticalPercent: 0,      // % da altura total (posição Y)
      horizontalPercent: 81.5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    },
    esquerdo: {
      verticalPercent: 0,      // % da altura total (posição Y)
      horizontalPercent: 5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    }
  }
};


const PortaMontante: React.FC<PortaMontanteProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  // 🎯 VALORES INICIAIS ESTÁVEIS - evita re-renders extras no carregamento
  const [containerDimensions, setContainerDimensions] = React.useState({ width: 1200, height: 600 });
  const [windowDimensions, setWindowDimensions] = React.useState({ width: 1200, height: 800 });
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const [mobileCardsOpen, setMobileCardsOpen] = React.useState(false);

  // UseLayoutEffect para calcular dimensões ANTES da renderização visual
  React.useLayoutEffect(() => {
    const initializeDimensions = () => {
      if (typeof window !== 'undefined') {
        const newWindowDimensions = { width: window.innerWidth, height: window.innerHeight };
        setWindowDimensions(newWindowDimensions);

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerDimensions({ width: rect.width, height: rect.height });
        } else {
          // Fallback: calcular dimensões baseado na janela
          const width = Math.min(newWindowDimensions.width - 32, 1920);
          setContainerDimensions({ width, height: width / 5.7 });
        }

        setIsInitialized(true);
      }
    };

    // Executar imediatamente (sem timeout)
    initializeDimensions();

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = { width: rect.width, height: rect.height };

        setContainerDimensions(prev => {
          if (Math.abs(prev.width - newDimensions.width) > 10 ||
            Math.abs(prev.height - newDimensions.height) > 10) {
            return newDimensions;
          }
          return prev;
        });
      }

      const newWindowDimensions = { width: window.innerWidth, height: window.innerHeight };
      setWindowDimensions(prev => {
        if (Math.abs(prev.width - newWindowDimensions.width) > 10 ||
          Math.abs(prev.height - newWindowDimensions.height) > 10) {
          return newWindowDimensions;
        }
        return prev;
      });
    };

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []); // Não incluir sidebarOpen para evitar recálculos desnecessários

  // Detectar se é mobile - otimizado para evitar recálculos
  const isMobile = React.useMemo(() => windowDimensions.width < 1024, [windowDimensions.width]);

  // 🎯 SISTEMA IDÊNTICO AO ECLUSA_REGUA - SEM ESCALA RESPONSIVA
  const portaMontanteAspectRatio = 1075 / 1098; // Baseado no SVG real: width="1075" height="1098"

  // 📐 EXATAMENTE IGUAL ECLUSA_REGUA - maxWidth direto - MANTER CÁLCULO ORIGINAL
  const maxWidth = Math.min(containerDimensions.width - 32, 1920); // 32px = margem mínima

  // 🎯 PORTA MONTANTE: maxWidth direto igual caldeira na Eclusa_Regua  
  const portaScale = isMobile ? 90 : 55; // 90% mobile, 55% desktop
  const basePortaWidth = (maxWidth * portaScale) / 100;
  const basePortaHeight = basePortaWidth / portaMontanteAspectRatio;

  // 🎯 ALTURA TOTAL FIXA - igual sistema Eclusa_Regua
  const alturaTotal = basePortaHeight;

  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA MONT usando sendCommand
  React.useEffect(() => {
    if (connectionStatus.connected) {
      // Enviar subscribe específico para MONT via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['MONT'],
        categories: ['PROC', 'FAULT', 'EVENT'],
        include_all_faults: true
      };

      // Usar sendCommand para enviar subscribe
      sendCommand({
        plc_ip: '',
        tag_name: 'SUBSCRIBE',
        variable: JSON.stringify(subscribeCmd),
        value: 'SUBSCRIBE',
        data_type: 'STRING'
      });

      if (import.meta.env.DEV) {
        console.log('📡 [PortaMontante] Subscribe MONT enviado:', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🎯 DADOS DOS CONTRAPESOS, RÉGUA E MOTORES - MONT WEBSOCKET (TAGS REAIS)
  // 📍 USANDO TAGS REAIS DO WEBSOCKET MONT - DATA TYPE INTEGER
  const reguaPortaMontanteRaw = plcData?.tags?.['MONT_MOVIMENTAR_PORTA_MONTANTE'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_PORTA_MONTANTE'], 10) : 0;    // Tag real MONT porta montante (régua)
  const contrapesoDirectoRaw = plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_DIREITO'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_CONTRA_PESO_DIREITO'], 10) : 0;   // Tag real MONT contrapeso direito
  const contrapesoEsquerdoRaw = plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_ESQUERDO'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_CONTRA_PESO_ESQUERDO'], 10) : 0;  // Tag real MONT contrapeso esquerdo

  // MOTORES - Velocidade
  const motorDireitoVeloc = plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_ESCRAV_DIR'] ?
    parseFloat(plcData.tags['MONT_GEST_MOT.VELOC_MOT_ESCRAV_DIR']) : 0;       // Tag MONT motor direito velocidade
  const motorEsquerdoVeloc = plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_MEST_ESQ'] ?
    parseFloat(plcData.tags['MONT_GEST_MOT.VELOC_MOT_MEST_ESQ']) : 0;      // Tag MONT motor esquerdo velocidade

  // VELOCIDADES OPERACIONAIS
  const velocidadeSubida = plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_SUB'] ?
    parseFloat(plcData.tags['MONT_VELOC_VAR.VELOC_1_SUB']) : 0;           // Velocidade subida
  const velocidadeDescida = plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_DESC'] ?
    parseFloat(plcData.tags['MONT_VELOC_VAR.VELOC_1_DESC']) : 0;          // Velocidade descida

  // ANIMAÇÃO DOS MOTORES (para indicar se está em movimento)
  const animMotorDireito = plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_DIR'] ?
    parseInt(plcData.tags['MONT_WINCC_ANIM_MONT_MOT_DIR'], 10) : 0;       // Animação motor direito
  const animMotorEsquerdo = plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_ESQ'] ?
    parseInt(plcData.tags['MONT_WINCC_ANIM_MONT_MOT_ESQ'], 10) : 0;       // Animação motor esquerdo

  // 🔄 NORMALIZAÇÃO DIRETA DOS VALORES MONT (igual página PortaJusante)
  // WebSocket MONT provavelmente já envia valores normalizados ou precisam normalização direta
  const contrapesoDirecto = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoDirectoRaw));
  }, [contrapesoDirectoRaw]);

  const contrapesoEsquerdo = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoEsquerdoRaw));
  }, [contrapesoEsquerdoRaw]);

  const reguaPortaMontante = React.useMemo(() => {
    return Math.max(0, Math.min(100, reguaPortaMontanteRaw));
  }, [reguaPortaMontanteRaw]);

  // Motor status para animação (1 = ligado, 0 = desligado)
  const motorDireito = animMotorDireito;
  const motorEsquerdo = animMotorEsquerdo;

  // Performance optimization: Debug logging only in development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🎯 [PortaMontante] Debug Tags MONT WebSocket:', {
        reguaPortaMontanteRaw: reguaPortaMontanteRaw,
        contrapesoDirectoRaw: contrapesoDirectoRaw,
        contrapesoEsquerdoRaw: contrapesoEsquerdoRaw,
        motorDireitoVeloc: motorDireitoVeloc,
        motorEsquerdoVeloc: motorEsquerdoVeloc,
        velocidadeSubida: velocidadeSubida,
        velocidadeDescida: velocidadeDescida,
        animMotorDireito: animMotorDireito,
        animMotorEsquerdo: animMotorEsquerdo,
        reguaPortaMontante: reguaPortaMontante,
        contrapesoDirecto: contrapesoDirecto,
        contrapesoEsquerdo: contrapesoEsquerdo,
        tagsDisponiveis: {
          MONT_PORTA: !!plcData?.tags?.['MONT_MOVIMENTAR_PORTA_MONTANTE'],
          MONT_CONTRA_DIR: !!plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_DIREITO'],
          MONT_CONTRA_ESQ: !!plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_ESQUERDO'],
          MONT_MOTOR_DIR: !!plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_ESCRAV_DIR'],
          MONT_MOTOR_ESQ: !!plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_MEST_ESQ'],
          MONT_VELOC_SUB: !!plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_SUB'],
          MONT_VELOC_DESC: !!plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_DESC'],
          MONT_ANIM_DIR: !!plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_DIR'],
          MONT_ANIM_ESQ: !!plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_ESQ']
        },
        connected: connectionStatus.connected
      });
    }
  }, [contrapesoDirectoRaw, contrapesoEsquerdoRaw, contrapesoDirecto, contrapesoEsquerdo,
    reguaPortaMontanteRaw, reguaPortaMontante, motorDireitoVeloc, motorEsquerdoVeloc,
    velocidadeSubida, velocidadeDescida, animMotorDireito, animMotorEsquerdo, connectionStatus.connected]);

  // Configuração responsiva SIMPLES - igual outros componentes
  const configAtual = isMobile ? CONTRAPESO_CONFIG.mobile : CONTRAPESO_CONFIG.desktop;
  const contrapesoDireitoConfig = configAtual.direito;
  const contrapesoEsquerdoConfig = configAtual.esquerdo;

  const reguaConfigAtual = isMobile ? REGUA_CONFIG.mobile : REGUA_CONFIG.desktop;

  const motorConfigAtual = isMobile ? MOTOR_CONFIG.mobile : MOTOR_CONFIG.desktop;
  const motorDireitoConfig = motorConfigAtual.direito;
  const motorEsquerdoConfig = motorConfigAtual.esquerdo;


  // 🎯 LARGURA INTELIGENTE DOS CARDS - MEMOIZADA PARA PERFORMANCE
  const cardWidthValue = React.useMemo(() => {
    // 🎯 MESMO CÁLCULO QUE OS OUTROS COMPONENTES ATÉ 1920px
    const baseCardWidth = maxWidth * 0.18;

    // 🎯 PARA TELAS > 1920px: CONTINUAR CRESCENDO (que o maxWidth não faz)
    if (containerDimensions.width > 1920) {
      // Usar a largura real do container para calcular
      const expandedMaxWidth = Math.min(containerDimensions.width - 32, 2560); // Máximo 2560px
      return expandedMaxWidth * 0.18;
    }

    return baseCardWidth;
  }, [maxWidth, containerDimensions.width]);

  // 🎯 FUNÇÃO WRAPPER PARA COMPATIBILIDADE (não quebra código existente)
  const cardWidth = () => cardWidthValue;

  // 🎯 SISTEMA RESPONSIVO MEMOIZADO PARA PERFORMANCE
  const getResponsiveCardFontSize = React.useCallback((baseSize: number, type: 'header' | 'label' | 'value' = 'label') => {
    const cardW = cardWidthValue;

    // Escala baseada na largura do card (300px = escala base 1.0)
    let scaleFactor = cardW / 300;
    scaleFactor = Math.max(scaleFactor, 0.7); // Mínimo 70%
    scaleFactor = Math.min(scaleFactor, 1.4); // Máximo 140%

    // Ajustes por tipo
    if (type === 'header') scaleFactor *= 1.1;
    else if (type === 'value') scaleFactor *= 1.05;

    return Math.max(baseSize * scaleFactor, type === 'header' ? 10 : 8);
  }, [cardWidthValue]);

  const getResponsiveCardSpacing = React.useCallback((baseSpacing: number) => {
    const cardW = cardWidthValue;
    let scaleFactor = cardW / 300; // 300px = escala base 1.0
    scaleFactor = Math.max(scaleFactor, 0.8); // Mínimo 80%
    scaleFactor = Math.min(scaleFactor, 1.3); // Máximo 130%
    return Math.max(baseSpacing * scaleFactor, 4);
  }, [cardWidthValue]);

  // CÁLCULO DO ESPAÇO DISPONÍVEL REAL - SEM CONSIDERAR SIDEBAR
  const larguraTotalTela = windowDimensions.width;
  const espacoUsadoPorComponentes = maxWidth; // Usar maxWidth que mantém o tamanho original
  const espacoSobrandoTotal = Math.max(0, larguraTotalTela - espacoUsadoPorComponentes);

  const espacoDisponivelEsquerda = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando
  const espacoDisponivelDireita = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando

  // Performance optimization: Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('🎯 PORTAMONTANTE - CARDS SEGUINDO SISTEMA DOS COMPONENTES:', {
      container_width: containerDimensions.width,
      maxWidth_limitado: `${maxWidth.toFixed(0)}px (max 1920px)`,
      card_baseado_maxWidth: `${(maxWidth * 0.18).toFixed(0)}px`,
      card_expandido: `${cardWidthValue.toFixed(0)}px`,
      diferenca: `+${(cardWidthValue - (maxWidth * 0.18)).toFixed(0)}px`,
      usando_expansao: containerDimensions.width > 1920 ? '✅ SIM' : '❌ NÃO',
      espaco_disponivel_esquerda: espacoDisponivelEsquerda,
      espaco_disponivel_direita: espacoDisponivelDireita
    });
  }

  return (
    <div className="w-full h-auto flex flex-col items-center relative">

      {/* PAINEL INDUSTRIAL ISA-104 - ESQUERDA - DESKTOP */}
      {!isMobile && (
        <div
          className="absolute z-50 flex flex-col"
          style={{
            top: `${alturaTotal * 0.05}px`,
            left: `${maxWidth * 0.02}px`,
            width: `${cardWidth()}px`,
            gap: `${Math.max(6, maxWidth * 0.005)}px`
          }}
        >
          {/* DADOS OPERACIONAIS - RESPONSIVIDADE FLUIDA */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div
              className="bg-edp-marine text-white"
              style={{ padding: `${getResponsiveCardSpacing(8)}px ${getResponsiveCardSpacing(10)}px` }}
            >
              <h3
                className="font-bold uppercase tracking-wide leading-tight"
                style={{ fontSize: `${getResponsiveCardFontSize(12, 'header')}px` }}
              >
                DADOS OPERACIONAIS
              </h3>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: `${getResponsiveCardSpacing(10)}px` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: `${getResponsiveCardSpacing(6)}px` }}>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide leading-tight"
                    style={{ fontSize: `${getResponsiveCardFontSize(9, 'label')}px` }}
                  >
                    Posição Porta:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${getResponsiveCardFontSize(14, 'value')}px` }}
                  >
                    {(reguaPortaMontante * 12.5 / 100).toFixed(2)} <span style={{ fontSize: `${getResponsiveCardFontSize(8, 'label')}px` }} className="text-gray-500">m</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide leading-tight"
                    style={{ fontSize: `${getResponsiveCardFontSize(9, 'label')}px` }}
                  >
                    Abertura:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${getResponsiveCardFontSize(14, 'value')}px` }}
                  >
                    {reguaPortaMontante}<span style={{ fontSize: `${getResponsiveCardFontSize(8, 'label')}px` }} className="text-gray-500">%</span>
                  </span>
                </div>

                <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Diferença E/D:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">mm</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Contrapeso E:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {contrapesoEsquerdo}<span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">%</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Contrapeso D:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {contrapesoDirecto}<span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">%</span>
                  </span>
                </div>

                <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Vel. Subida:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {velocidadeSubida.toFixed(3)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">m/s</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Vel. Descida:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {velocidadeDescida.toFixed(3)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">m/s</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STATUS OPERACIONAIS - RESPONSIVIDADE INTELIGENTE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(4, maxWidth * 0.004)}px` }}>
            <StatusCard
              title="COMANDO EM AUTOMÁTICO"
              variant="automatic"
              containerWidth={cardWidth()}
            />

            <StatusCard
              title="IGUALDADE DE NÍVEIS PRESENTE"
              variant="success"
              containerWidth={cardWidth()}
            />

            <StatusCard
              title="FALTA IGUALDADE DE NÍVEIS"
              variant="error"
              containerWidth={cardWidth()}
            />
          </div>
        </div>
      )}

      {/* PAINEL INDUSTRIAL ISA-104 - DIREITA - DESKTOP */}
      {!isMobile && (
        <div
          className="absolute z-50 flex flex-col"
          style={{
            top: `${alturaTotal * 0.05}px`,
            right: `${maxWidth * 0.02}px`,
            width: `${cardWidth()}px`,
            gap: `${Math.max(6, maxWidth * 0.005)}px`
          }}
        >
          {/* MOTORES - RESPONSIVIDADE FLUIDA */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div
              className="bg-edp-marine text-white"
              style={{ padding: `${Math.max(6, maxWidth * 0.005)}px ${Math.max(10, maxWidth * 0.008)}px` }}
            >
              <h3
                className="font-bold uppercase tracking-wide"
                style={{ fontSize: `${Math.max(10, Math.min(14, maxWidth * 0.008))}px` }}
              >
                MOTORES
              </h3>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: `${Math.max(8, maxWidth * 0.008)}px` }}>
              {/* MOTOR DIREITO */}
              <div style={{ marginBottom: `${Math.max(8, maxWidth * 0.008)}px` }}>
                <div className="flex justify-between items-center" style={{ marginBottom: `${Math.max(4, maxWidth * 0.004)}px` }}>
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    MOTOR DIREITO
                  </span>
                  <div className={`rounded-full ${animMotorDireito > 0 ? 'bg-green-500' : 'bg-gray-500'}`} style={{ width: `${Math.max(8, maxWidth * 0.006)}px`, height: `${Math.max(8, maxWidth * 0.006)}px` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {Math.round(motorDireitoVeloc)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">RPM</span>
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {(12.5 + Math.random() * 2).toFixed(1)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">A</span>
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>

              {/* MOTOR ESQUERDO */}
              <div style={{ marginTop: `${Math.max(8, maxWidth * 0.008)}px` }}>
                <div className="flex justify-between items-center" style={{ marginBottom: `${Math.max(4, maxWidth * 0.004)}px` }}>
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    MOTOR ESQUERDO
                  </span>
                  <div className={`rounded-full ${animMotorEsquerdo > 0 ? 'bg-green-500' : 'bg-gray-500'}`} style={{ width: `${Math.max(8, maxWidth * 0.006)}px`, height: `${Math.max(8, maxWidth * 0.006)}px` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {Math.round(motorEsquerdoVeloc)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">RPM</span>
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {(12.5 + Math.random() * 2).toFixed(1)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">A</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SISTEMA STATUS - RESPONSIVIDADE FLUIDA */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div
              className="bg-edp-marine text-white"
              style={{ padding: `${Math.max(6, maxWidth * 0.005)}px ${Math.max(10, maxWidth * 0.008)}px` }}
            >
              <h3
                className="font-bold uppercase tracking-wide"
                style={{ fontSize: `${Math.max(10, Math.min(14, maxWidth * 0.008))}px` }}
              >
                SISTEMA
              </h3>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: `${Math.max(8, maxWidth * 0.008)}px` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(6, maxWidth * 0.005)}px` }}>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Pressão:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    2.4 <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">bar</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Temperatura:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    24.5<span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">°C</span>
                  </span>
                </div>

                <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Vibração:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    NORMAL
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Status Geral:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    OPERACIONAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📱 PAINEL MOBILE - SISTEMA UNIVERSAL RESPONSIVO */}
      {isMobile && (
        <div 
          className="w-full mt-4 mb-4 relative"
          style={{
            padding: `0 ${Math.max(6, Math.min(16, windowDimensions.width * 0.02))}px` // Padding adaptativo universal
          }}
        >
          <div 
            className="mx-auto"
            style={{
              maxWidth: `${Math.min(windowDimensions.width - 12, 1200)}px` // Adaptativo para qualquer tela
            }}
          >
            {/* Cards responsivos universais */}
            <div 
              className="grid grid-cols-3 mb-2"
              style={{
                gap: `${Math.max(4, Math.min(8, windowDimensions.width * 0.01))}px` // Gap adaptativo
              }}
            >
              {/* CARD DADOS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 
                    className="font-bold uppercase tracking-wide text-center leading-tight"
                    style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                  >
                    DADOS
                  </h3>
                </div>
                <div 
                  className="space-y-1"
                  style={{ padding: `${Math.max(4, Math.min(8, windowDimensions.width * 0.004))}px` }}
                >
                  <div className="text-center">
                    <div 
                      className="text-gray-600 font-medium uppercase"
                      style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                    >
                      Posição:
                    </div>
                    <div 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px` }}
                    >
                      {(reguaPortaMontante * 12.5 / 100).toFixed(2)} 
                      <span 
                        className="text-gray-500"
                        style={{ fontSize: `${Math.max(5, Math.min(8, windowDimensions.width * 0.015))}px` }}
                      >
                        m
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-gray-600 font-medium uppercase"
                      style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                    >
                      Abertura:
                    </div>
                    <div 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px` }}
                    >
                      {reguaPortaMontante}
                      <span 
                        className="text-gray-500"
                        style={{ fontSize: `${Math.max(5, Math.min(8, windowDimensions.width * 0.015))}px` }}
                      >
                        %
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div 
                        className="text-gray-600 font-medium uppercase"
                        style={{ fontSize: `${Math.max(5, Math.min(8, windowDimensions.width * 0.015))}px` }}
                      >
                        Dif. E/D:
                      </div>
                      <div 
                        className="font-mono font-bold text-[#212E3E]"
                        style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                      >
                        {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} 
                        <span 
                          className="text-gray-500"
                          style={{ fontSize: `${Math.max(4, Math.min(7, windowDimensions.width * 0.012))}px` }}
                        >
                          mm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD MOTORES */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    MOTORES
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  {/* MOTOR DIREITO */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[7px] text-gray-600 font-medium uppercase">M. DIREITO</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${animMotorDireito > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                        {Math.round(motorDireitoVeloc)} <span className="text-gray-500 text-[6px]">RPM</span>
                      </span>
                      <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                        {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500 text-[6px]">A</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-1">
                    {/* MOTOR ESQUERDO */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[7px] text-gray-600 font-medium uppercase">M. ESQUERDO</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${animMotorEsquerdo > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {Math.round(motorEsquerdoVeloc)} <span className="text-gray-500 text-[6px]">RPM</span>
                        </span>
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500 text-[6px]">A</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-1">
                    {/* VELOCIDADES DE MOVIMENTO */}
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-center">
                        <div className="text-[7px] text-gray-600 font-medium uppercase">V. SUBIR:</div>
                        <div className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {(velocidadeSubida || 2.5).toFixed(1)} <span className="text-gray-500 text-[6px]">m/min</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[7px] text-gray-600 font-medium uppercase">V. DESCER:</div>
                        <div className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {(velocidadeDescida || 2.8).toFixed(1)} <span className="text-gray-500 text-[6px]">m/min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD CONTRAPESOS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    CONTRAPESOS
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Esquerdo:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {contrapesoEsquerdo}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {contrapesoDirecto}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Dif. E/D:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span className="text-gray-500 text-[6px]">mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* Modal Parâmetros Mobile */}
          {menuParametrosOpen && (
            <div className="mt-4 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-top duration-200">
              <div className="bg-[#212E3E] text-white px-3 py-2">
                <h3 
                  className="font-bold uppercase tracking-wide text-center"
                  style={{ fontSize: `${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px` }}
                >
                  PARÂMETROS PORTA MONTANTE
                </h3>
              </div>
              
              <div 
                className="max-h-80 overflow-y-auto"
                style={{ padding: `${Math.max(8, Math.min(16, windowDimensions.width * 0.025))}px` }}
              >
                <div className="grid grid-cols-1 gap-3">
                  {/* PROGRAMA ABERTURA */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 
                      className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                      style={{ fontSize: `${Math.max(8, Math.min(11, windowDimensions.width * 0.022))}px` }}
                    >
                      <ArrowUpIcon 
                        style={{ 
                          width: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`,
                          height: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`
                        }} 
                      />
                      PROGRAMA ABERTURA
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          Posição Alvo:
                        </span>
                        <span 
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          8.50 m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          RPM Configurado:
                        </span>
                        <span 
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          1450 RPM
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROGRAMA FECHAMENTO */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 
                      className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                      style={{ fontSize: `${Math.max(8, Math.min(11, windowDimensions.width * 0.022))}px` }}
                    >
                      <ArrowDownIcon 
                        style={{ 
                          width: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`,
                          height: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`
                        }} 
                      />
                      PROGRAMA FECHAMENTO
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          Posição Alvo:
                        </span>
                        <span 
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          0.00 m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          RPM Configurado:
                        </span>
                        <span 
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          1200 RPM
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LASER MONTANTE */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 
                      className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                      style={{ fontSize: `${Math.max(8, Math.min(11, windowDimensions.width * 0.022))}px` }}
                    >
                      <EyeIcon 
                        style={{ 
                          width: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`,
                          height: `${Math.max(10, Math.min(14, windowDimensions.width * 0.03))}px`
                        }} 
                      />
                      LASER MONTANTE
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          Área Protegida:
                        </span>
                        <span 
                          className="font-mono font-bold text-green-600"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          LIVRE
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span 
                          className="text-gray-600 font-medium"
                          style={{ fontSize: `${Math.max(6, Math.min(9, windowDimensions.width * 0.018))}px` }}
                        >
                          Leitura Cota:
                        </span>
                        <span 
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(7, Math.min(10, windowDimensions.width * 0.02))}px` }}
                        >
                          {(reguaPortaMontante * 12.5 / 100 + 125.5).toFixed(2)} m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>
      )}

      {/* BOTÃO MOBILE - Canto inferior direito */}
      {isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-[#212E3E] to-[#2A3A4E] text-white shadow-xl flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
          style={{
            padding: `${Math.max(6, Math.min(8, windowDimensions.width * 0.015))}px ${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px`,
            fontSize: `${Math.max(8, Math.min(10, windowDimensions.width * 0.02))}px`,
            borderRadius: `${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px`,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div 
            className="bg-white/20 rounded p-0.5 flex items-center justify-center"
            style={{
              width: `${Math.max(16, Math.min(20, windowDimensions.width * 0.04))}px`,
              height: `${Math.max(16, Math.min(20, windowDimensions.width * 0.04))}px`,
              borderRadius: `${Math.max(4, Math.min(6, windowDimensions.width * 0.012))}px`
            }}
          >
            <CogIcon 
              className="text-white"
              style={{ 
                width: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`,
                height: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`
              }} 
            />
          </div>
          <span className="font-medium tracking-wide">PARÂMETROS</span>
          <div 
            className={`transition-transform duration-200 ${menuParametrosOpen ? 'rotate-180' : 'rotate-0'}`}
            style={{
              width: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`,
              height: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`
            }}
          >
            <ChevronUpIcon className="w-full h-full text-white/80" />
          </div>
        </button>
      )}

      {/* BOTÃO DESKTOP - Grande com texto NO FUNDO (acima de 1024px) */}
      <button
        onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
        className="hidden xl:flex fixed bottom-6 right-6 z-50 px-8 py-5 bg-[#212E3E] text-white rounded-2xl shadow-2xl items-center gap-5 hover:scale-105 transition-all duration-200 touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <CogIcon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <div className="font-bold text-lg">PARÂMETROS</div>
          <div className="text-sm opacity-80">Porta Montante</div>
        </div>
      </button>

      {/* DIALOG PARÂMETROS - RESPONSIVO */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-2 md:p-4"
          onClick={() => setMenuParametrosOpen(false)}
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Dialog Container */}
          <div
            className="
              bg-white shadow-2xl overflow-hidden flex flex-col
              w-full max-w-[280px] max-h-[75vh] rounded-t-2xl
              animate-in slide-in-from-bottom duration-300
              md:max-w-2xl md:max-h-[80vh] md:rounded-2xl
              md:animate-in md:fade-in md:zoom-in
              lg:max-w-4xl
            "
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain'
            }}
          >
            {/* Header azul escuro EDP */}
            <div className="bg-[#212E3E] p-1.5 md:p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-3">
                  <div className="w-5 h-5 md:w-10 md:h-10 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
                    <CogIcon className="w-2.5 h-2.5 md:w-5 md:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[10px] md:text-base font-bold truncate">PARÂMETROS</h2>
                    <p className="text-gray-300 text-xs md:text-sm mt-0.5 hidden md:block">Configurações e Monitoramento</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="w-5 h-5 md:w-10 md:h-10 rounded bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ touchAction: 'manipulation' }}
                >
                  <XMarkIcon className="w-2.5 h-2.5 md:w-5 md:h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com scroll */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="p-1.5 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-4">

                  {/* PROGRAMA ABERTURA AUTOMÁTICA */}
                  <Card
                    title="PROGRAMA ABERTURA"
                    icon={<ArrowUpIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Posição Alvo:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">8.50 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">RPM Configurado:</span>
                        <div className="flex items-center gap-0.5 md:gap-2">
                          <ArrowUpIcon className="w-2.5 h-2.5 md:w-4 md:h-4 text-slate-600" />
                          <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">1450 RPM</span>
                        </div>
                      </div>
                      <div className="flex gap-1 md:gap-3 pt-1">
                        <button className="flex-1 bg-[#212E3E] hover:bg-[#2A3A4E] text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <PlayIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          INICIAR
                        </button>
                        <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <StopIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          PARAR
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* PROGRAMA FECHAMENTO AUTOMÁTICO */}
                  <Card
                    title="PROGRAMA FECHAMENTO"
                    icon={<ArrowDownIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Posição Alvo:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.00 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">RPM Configurado:</span>
                        <div className="flex items-center gap-0.5 md:gap-2">
                          <ArrowDownIcon className="w-2.5 h-2.5 md:w-4 md:h-4 text-slate-600" />
                          <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">1200 RPM</span>
                        </div>
                      </div>
                      <div className="flex gap-1 md:gap-3 pt-1">
                        <button className="flex-1 bg-[#212E3E] hover:bg-[#2A3A4E] text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <PlayIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          INICIAR
                        </button>
                        <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <StopIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          PARAR
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* PARÂMETROS LASER MONTANTE */}
                  <Card
                    title="LASER MONTANTE"
                    icon={<EyeIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Área Protegida:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">LIVRE</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Leitura Cota:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">
                          {(reguaPortaMontante * 12.5 / 100 + 125.5).toFixed(2)} m
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Status:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">OPERACIONAL</span>
                      </div>
                    </div>
                  </Card>

                  {/* LIMITES E ALARMES */}
                  <Card
                    title="LIMITES & ALARMES"
                    icon={<ShieldCheckIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="grid grid-cols-2 gap-1 md:gap-3">
                        <div className="space-y-1 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Limite Abertura:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">12.50 m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Limite Fecho:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">0.00 m</span>
                          </div>
                        </div>
                        <div className="space-y-1 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Desnível Defeito:</span>
                            <span className="text-slate-600 font-mono font-bold text-[8px] md:text-sm">±5 mm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Desnível Stop:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">±10 mm</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 md:pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium text-[8px] md:text-sm">Desnível Alarme:</span>
                          <span className="text-gray-900 font-mono font-bold text-[8px] md:text-lg">±15 mm</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>

              {/* Footer com ações */}
              <div className="bg-gray-50 px-1.5 py-1.5 md:px-4 md:py-4 border-t border-gray-200 flex-shrink-0 safe-area-bottom">
                <div className="flex flex-col-reverse gap-1 md:flex-row md:justify-end md:gap-3">
                  <button
                    onClick={() => setMenuParametrosOpen(false)}
                    className="w-full md:w-auto px-2 py-1.5 md:px-6 md:py-2.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded transition-colors font-medium text-[9px] md:text-base"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Fechar
                  </button>
                  <button
                    className="w-full md:w-auto px-2 py-1.5 md:px-6 md:py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-[#212E3E] rounded transition-colors font-medium text-[9px] md:text-base shadow-lg"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Container do SVG - SISTEMA ORIGINAL INALTERADO */}
      <div
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center relative z-10"
        style={{
          height: 'auto',
          minHeight: '50vh',
          overflow: 'visible'
        }}
      >

        {isInitialized && containerDimensions.width > 100 && windowDimensions.width > 0 ? (
          <div
            className="relative w-full flex flex-col items-center justify-center"
            style={{
              maxWidth: `${maxWidth}px`,
              height: `${alturaTotal}px`,
              minHeight: `${alturaTotal}px`
            }}
          >
            {/* SVG Base Porta Montante - CENTRALIZADO */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${basePortaWidth}px`,
                height: `${basePortaHeight}px`,
                zIndex: 1
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1075 1098"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-sm"
              >
                <image
                  href="/PortaMontante/Base_Porta_Montante.svg"
                  width="1075"
                  height="1098"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* 🎯 CONTRAPESO DIREITO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 57 */}
            <div
              className="absolute transition-all duration-200 ease-in-out"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * contrapesoDireitoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * contrapesoDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * contrapesoDireitoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * contrapesoDireitoConfig.heightPercent) / 100}px`,
                zIndex: 10
              }}
            >
              <ContraPeso20t
                websocketValue={contrapesoDirecto}
                editMode={false}
              />
            </div>

            {/* 🎯 CONTRAPESO ESQUERDO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 58 */}
            <div
              className="absolute transition-all duration-200 ease-in-out"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * contrapesoEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * contrapesoEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * contrapesoEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * contrapesoEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 10
              }}
            >
              <ContraPeso20t
                websocketValue={contrapesoEsquerdo}
                editMode={false}
              />
            </div>

            {/* 📏 RÉGUA PORTA MONTANTE - WEBSOCKET ÍNDICE 56 */}
            <div
              className="absolute transition-all duration-200 ease-in-out"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * reguaConfigAtual.verticalPercent) / 100}px`,
                left: `${(maxWidth * reguaConfigAtual.horizontalPercent) / 100}px`,
                width: `${(maxWidth * reguaConfigAtual.widthPercent) / 100}px`,
                height: `${(alturaTotal * reguaConfigAtual.heightPercent) / 100}px`,
                zIndex: 5
              }}
            >
              <PortaMontanteRegua
                websocketValue={reguaPortaMontante}
                editMode={false}
              />
            </div>

            {/* ⚙️ MOTOR DIREITO - WEBSOCKET ÍNDICE 50 */}
            <div
              className="absolute transition-all duration-200 ease-in-out"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * motorDireitoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * motorDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * motorDireitoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * motorDireitoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorMontante
                websocketValue={motorDireito}
                editMode={false}
                direction="left"
              />
            </div>

            {/* ⚙️ MOTOR ESQUERDO - WEBSOCKET ÍNDICE 51 - ESPELHADO */}
            <div
              className="absolute transition-all duration-200 ease-in-out"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * motorEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * motorEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * motorEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * motorEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorMontante
                websocketValue={motorEsquerdo}
                editMode={false}
                direction="right"
              />
            </div>

            {/* 🚪 INDICADOR STATUS PORTA - RESPONSIVO MOBILE/DESKTOP */}
            {reguaPortaMontante >= 95 && (
              <div
                className="absolute flex items-center justify-center z-20"
                style={{
                  top: `${isMobile ? (alturaTotal * 4) / 100 : (alturaTotal * 5) / 100}px`, // Mobile: 4%, Desktop: 5%
                  left: `${isMobile ? (maxWidth * 35) / 100 : (maxWidth * 42) / 100}px`, // Mobile: centralizado
                  width: `${isMobile ? (maxWidth * 30) / 100 : (maxWidth * 16) / 100}px`, // Mobile: 30% da largura
                  height: `${isMobile ? (alturaTotal * 2.5) / 100 : (alturaTotal * 6) / 100}px` // Mobile: bem menor
                }}
              >
                <div className={`bg-green-600 border border-green-500 rounded-md w-full ${isMobile ? 'p-1.5' : 'p-3'}`}>
                  <div className="text-center">
                    <div className={`font-bold text-[#212E3E] uppercase tracking-wide ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      PORTA ABERTA
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reguaPortaMontante <= 5 && (
              <div
                className="absolute flex items-center justify-center z-20"
                style={{
                  bottom: `${isMobile ? (alturaTotal * 4) / 100 : (alturaTotal * 5) / 100}px`, // Mobile: 4%, Desktop: 5%
                  left: `${isMobile ? (maxWidth * 35) / 100 : (maxWidth * 42) / 100}px`, // Mobile: centralizado
                  width: `${isMobile ? (maxWidth * 30) / 100 : (maxWidth * 16) / 100}px`, // Mobile: 30% da largura
                  height: `${isMobile ? (alturaTotal * 2.5) / 100 : (alturaTotal * 6) / 100}px` // Mobile: bem menor
                }}
              >
                <div className={`bg-yellow-600 border border-yellow-500 rounded-md w-full ${isMobile ? 'p-1.5' : 'p-3'}`}>
                  <div className="text-center">
                    <div className={`font-bold text-[#212E3E] uppercase tracking-wide ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      PORTA FECHADA
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{
                height: '600px',
                maxWidth: '800px',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite'
              }}
            >
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default PortaMontante;