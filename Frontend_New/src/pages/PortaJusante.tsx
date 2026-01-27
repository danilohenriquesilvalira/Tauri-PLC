import React from 'react';
import { usePLC } from '../contexts/PLCContext';
import ContraPeso60t from '../components/Porta_Jusante/Porta_Jusante_Contrapeso';
import PortaJusanteRegua from '../components/Porta_Jusante/PortaJusanteRegua';
import MotorJusante from '../components/Porta_Jusante/Motor_Jusante';
import { Card } from '../components/ui/Card';
import { InfoCard } from '../components/ui/InfoCard';
import { StatusCard } from '../components/ui/StatusCard';
import {
  CogIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlayIcon,
  StopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';


interface PortaJusanteProps {
  sidebarOpen?: boolean;
}

// 🏗️ CONFIGURAÇÃO DOS CONTRAPESOS E RÉGUA - SEPARADO MOBILE/DESKTOP
const CONTRAPESO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 37.2,    // % da altura total (posição Y)
      horizontalPercent: 71.5,  // % da largura total (posição X)
      widthPercent: 5,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 37.2,    // % da altura total (posição Y)
      horizontalPercent: 23.5,  // % da largura total (posição X)
      widthPercent: 5,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 36.4,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 83.2,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 7.5,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 36.4,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 9.2,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 7.5,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  }
};

// 📏 CONFIGURAÇÃO DA RÉGUA PORTA JUSANTE - SEPARADO MOBILE/DESKTOP
const REGUA_CONFIG = {
  desktop: {
    verticalPercent: 46,      // % da altura total (posição Y)
    horizontalPercent: 29,    // % da largura total (posição X) - VOLTA POSIÇÃO ORIGINAL
    widthPercent: 42,         // % da largura total (tamanho) - 2% MENOR
    heightPercent: 52,        // % da altura total (tamanho) - 2% MENOR
  },
  mobile: {
    verticalPercent: 38.4,      // % da altura total (posição Y)
    horizontalPercent: 27.6,    // % da largura total (posição X) - ajustado para mobile
    widthPercent: 44.8,         // % da largura total (tamanho) - MAIOR no mobile
    heightPercent: 83,        // % da altura total (tamanho) - MAIOR
  }
};


// ⚙️ CONFIGURAÇÃO DOS MOTORES PORTA JUSANTE - SEPARADO MOBILE/DESKTOP
const MOTOR_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: -1,      // % da altura total (posição Y)
      horizontalPercent: 70,    // % da largura total (posição X)
      widthPercent: 7.4,        // % da largura total (tamanho) - 45% menor
      heightPercent: 9.2,       // % da altura total (tamanho) - 45% menor
    },
    esquerdo: {
      verticalPercent: -1,      // % da altura total (posição Y)
      horizontalPercent: 22.6,    // % da largura total (posição X)
      widthPercent: 7.4,        // % da largura total (tamanho) - 45% menor
      heightPercent: 9.2,       // % da altura total (tamanho) - 45% menor
    }
  },
  mobile: {
    direito: {
      verticalPercent: -4,      // % da altura total (posição Y)
      horizontalPercent: 80.2,    // % da largura total (posição X)
      widthPercent: 12,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    },
    esquerdo: {
      verticalPercent: -4,      // % da altura total (posição Y)
      horizontalPercent: 7.7,    // % da largura total (posição X)
      widthPercent: 12,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    }
  }
};


const PortaJusante: React.FC<PortaJusanteProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const [mobileCardsOpen, setMobileCardsOpen] = React.useState(false);

  // 🚀 SIMPLIFICADO: Usar apenas window.innerWidth para dimensões
  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });

  // 🚀 MEMOIZAR TODAS AS DIMENSÕES - EVITA RECÁLCULOS EM CADA RE-RENDER
  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    const portaJusanteAspectRatio = 1075 / 1098;
    const containerWidth = Math.min(windowWidth - 32, 1920);
    const maxWidth = Math.max(containerWidth, 300);
    const portaScale = isMobile ? 85 : 55;
    const basePortaWidth = Math.max((maxWidth * portaScale) / 100, isMobile ? 300 : 500);
    const basePortaHeight = Math.max(basePortaWidth / portaJusanteAspectRatio, isMobile ? 250 : 400);

    return {
      isMobile,
      maxWidth,
      basePortaWidth,
      basePortaHeight,
      alturaTotal: basePortaHeight,
      shouldRender: maxWidth > 100 && basePortaHeight > 100
    };
  }, [windowWidth]);

  // Desestruturar para uso
  const { isMobile, maxWidth, basePortaWidth, basePortaHeight, alturaTotal, shouldRender } = dimensions;

  // 🚀 SIMPLES: Listener de resize com debounce para evitar re-renders excessivos
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(prev => {
          // Só atualiza se a diferença for significativa (>50px)
          if (Math.abs(prev - newWidth) > 50) {
            return newWidth;
          }
          return prev;
        });
      }, 150); // Debounce de 150ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA JUS usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para JUS via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['JUS'],
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
        console.log('📡 [PortaJusante] Subscribe JUS enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🎯 DADOS DOS CONTRAPESOS, RÉGUA E MOTORES - JUS WEBSOCKET (TAGS REAIS)
  // 📍 USANDO TAGS REAIS DO WEBSOCKET JUS - DATA TYPE INTEGER
  const reguaPortaJusanteRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_PORTA_JUSANTE'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_PORTA_JUSANTE'], 10) : 0;    // Tag real JUS porta jusante (régua)
  const contrapesoDirectoRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_DIREITO'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_DIREITO'], 10) : 0;   // Tag real JUS contrapeso direito
  const contrapesoEsquerdoRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_ESQUERDO'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_ESQUERDO'], 10) : 0;  // Tag real JUS contrapeso esquerdo
  const motorDireito = plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_MEST_DIR'] ?
    parseInt(plcData.tags['JUS_DB_GEST_MOT.VELOC_MOT_MEST_DIR'], 10) : 0;       // Tag real JUS motor direito (animação)  
  const motorEsquerdo = plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_ESCRAV_ESQ'] ?
    parseInt(plcData.tags['JUS_DB_GEST_MOT.VELOC_MOT_ESCRAV_ESQ'], 10) : 0;      // Tag real JUS motor esquerdo (animação)

  // 🔄 NORMALIZAÇÃO DIRETA DOS VALORES JUS (igual página Enchimento)
  // WebSocket JUS provavelmente já envia valores normalizados ou precisam normalização direta
  const contrapesoDirecto = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoDirectoRaw));
  }, [contrapesoDirectoRaw]);

  const contrapesoEsquerdo = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoEsquerdoRaw));
  }, [contrapesoEsquerdoRaw]);

  const reguaPortaJusante = React.useMemo(() => {
    return Math.max(0, Math.min(100, reguaPortaJusanteRaw));
  }, [reguaPortaJusanteRaw]);

  // Performance optimization: Debug logging only in development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🎯 [PortaJusante] Debug Tags JUS WebSocket:', {
        reguaPortaJusanteRaw: reguaPortaJusanteRaw,
        contrapesoDirectoRaw: contrapesoDirectoRaw,
        contrapesoEsquerdoRaw: contrapesoEsquerdoRaw,
        motorDireito: motorDireito,
        motorEsquerdo: motorEsquerdo,
        reguaPortaJusante: reguaPortaJusante,
        contrapesoDirecto: contrapesoDirecto,
        contrapesoEsquerdo: contrapesoEsquerdo,
        tagsDisponiveis: {
          JUS_PORTA: !!plcData?.tags?.['JUS_ENVIA_MOVIMENTO_PORTA_JUSANTE'],
          JUS_CONTRA_DIR: !!plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_DIREITO'],
          JUS_CONTRA_ESQ: !!plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_ESQUERDO'],
          JUS_MOTOR_DIR: !!plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_MEST_DIR'],
          JUS_MOTOR_ESQ: !!plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_ESCRAV_ESQ']
        },
        connected: connectionStatus.connected
      });
    }
  }, [contrapesoDirectoRaw, contrapesoEsquerdoRaw, contrapesoDirecto, contrapesoEsquerdo,
    reguaPortaJusanteRaw, reguaPortaJusante, motorDireito, motorEsquerdo, connectionStatus.connected]);

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
    if (windowWidth > 1920) {
      // Usar a largura real do container para calcular
      const expandedMaxWidth = Math.min(windowWidth - 32, 2560); // Máximo 2560px
      return expandedMaxWidth * 0.18;
    }

    return baseCardWidth;
  }, [maxWidth, windowWidth]);

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
  const larguraTotalTela = windowWidth;
  const espacoUsadoPorComponentes = maxWidth; // Usar maxWidth que mantém o tamanho original
  const espacoSobrandoTotal = Math.max(0, larguraTotalTela - espacoUsadoPorComponentes);

  const espacoDisponivelEsquerda = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando
  const espacoDisponivelDireita = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando

  // Performance optimization: Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('🎯 CARDS SEGUINDO SISTEMA DOS COMPONENTES:', {
      window_width: windowWidth,
      maxWidth_limitado: `${maxWidth.toFixed(0)}px (max 1920px)`,
      card_baseado_maxWidth: `${(maxWidth * 0.18).toFixed(0)}px`,
      card_expandido: `${cardWidthValue.toFixed(0)}px`,
      diferenca: `+${(cardWidthValue - (maxWidth * 0.18)).toFixed(0)}px`,
      usando_expansao: windowWidth > 1920 ? '✅ SIM' : '❌ NÃO'
    });
  }

  return (
    <div
      className="w-full h-auto flex flex-col items-center relative"
      style={{
        // ✅ OVERFLOW CONTROLADO para evitar elementos vazando
        overflow: 'hidden',
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >

      {/* PAINEL INDUSTRIAL ISA-104 - ESQUERDA - DESKTOP */}
      {!isMobile && shouldRender && (
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
                    {(reguaPortaJusante * 12.5 / 100).toFixed(2)} <span style={{ fontSize: `${getResponsiveCardFontSize(8, 'label')}px` }} className="text-gray-500">m</span>
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
                    {reguaPortaJusante}<span style={{ fontSize: `${getResponsiveCardFontSize(8, 'label')}px` }} className="text-gray-500">%</span>
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
                    Velocidade:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {(Math.random() * 0.5 + 0.1).toFixed(2)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">m/s</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="font-medium text-[#212E3E] uppercase tracking-wide"
                    style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                  >
                    Velocidade Nominal:
                  </span>
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    0.25 <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">m/s</span>
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
      {!isMobile && shouldRender && (
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
                  <div className={`rounded-full ${motorDireito === 1 ? 'bg-green-500' : motorDireito === 2 ? 'bg-red-500' : 'bg-gray-500'}`} style={{ width: `${Math.max(8, maxWidth * 0.006)}px`, height: `${Math.max(8, maxWidth * 0.006)}px` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {Math.round(1450 + Math.random() * 100)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">RPM</span>
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
                  <div className={`rounded-full ${motorEsquerdo === 1 ? 'bg-green-500' : motorEsquerdo === 2 ? 'bg-red-500' : 'bg-gray-500'}`} style={{ width: `${Math.max(8, maxWidth * 0.006)}px`, height: `${Math.max(8, maxWidth * 0.006)}px` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="font-mono font-bold text-[#212E3E]"
                    style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                  >
                    {Math.round(1450 + Math.random() * 100)} <span style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }} className="text-gray-500">RPM</span>
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
            padding: `0 ${Math.max(6, Math.min(16, windowWidth * 0.02))}px`
          }}
        >
          <div
            className="mx-auto"
            style={{
              maxWidth: `${maxWidth}px` // Usa o mesmo maxWidth responsivo
            }}
          >
            {/* Cards horizontais compactos - sempre visíveis */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {/* CARD DADOS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    DADOS
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Posição:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {(reguaPortaJusante * 12.5 / 100).toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Abertura:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {reguaPortaJusante}<span className="text-gray-500 text-[7px]">%</span>
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
                      <div className={`w-1.5 h-1.5 rounded-full ${motorDireito === 1 ? 'bg-green-500' : motorDireito === 2 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                        {Math.round(1450 + Math.random() * 100)} <span className="text-gray-500 text-[6px]">RPM</span>
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
                        <div className={`w-1.5 h-1.5 rounded-full ${motorEsquerdo === 1 ? 'bg-green-500' : motorEsquerdo === 2 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {Math.round(1450 + Math.random() * 100)} <span className="text-gray-500 text-[6px]">RPM</span>
                        </span>
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500 text-[6px]">A</span>
                        </span>
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
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Status:</div>
                      <div className="font-mono font-bold text-green-600 text-[8px]">
                        OPER.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* BOTÃO MOBILE - Canto inferior direito */}
      {isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-[#212E3E] to-[#2A3A4E] text-white shadow-xl flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
          style={{
            padding: `${Math.max(6, Math.min(8, windowWidth * 0.015))}px ${Math.max(8, Math.min(12, windowWidth * 0.025))}px`,
            fontSize: `${Math.max(8, Math.min(10, windowWidth * 0.02))}px`,
            borderRadius: `${Math.max(8, Math.min(12, windowWidth * 0.025))}px`,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div 
            className="bg-white/20 rounded p-0.5 flex items-center justify-center"
            style={{
              width: `${Math.max(16, Math.min(20, windowWidth * 0.04))}px`,
              height: `${Math.max(16, Math.min(20, windowWidth * 0.04))}px`,
              borderRadius: `${Math.max(4, Math.min(6, windowWidth * 0.012))}px`
            }}
          >
            <CogIcon 
              className="text-white"
              style={{ 
                width: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`,
                height: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`
              }} 
            />
          </div>
          <span className="font-medium tracking-wide">PARÂMETROS</span>
          <div 
            className={`transition-transform duration-200 ${menuParametrosOpen ? 'rotate-180' : 'rotate-0'}`}
            style={{
              width: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`,
              height: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`
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
          <div className="text-sm opacity-80">Porta Jusante</div>
        </div>
      </button>

      {/* MODAL DE PARÂMETROS */}
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

                  {/* PARÂMETROS LASER JUSANTE */}
                  <Card
                    title="LASER JUSANTE"
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
                          {(reguaPortaJusante * 12.5 / 100 + 125.5).toFixed(2)} m
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

        {shouldRender ? (
          <div
            className="relative w-full flex flex-col items-center justify-center"
            style={{
              maxWidth: `${maxWidth}px`,
              height: `${alturaTotal}px`,
              minHeight: `${alturaTotal}px`
            }}
          >
            {/* SVG Base Porta Jusante - CENTRALIZADO */}
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
                  href="/PortaJusante/Base_PortaJusante.svg"
                  width="1075"
                  height="1098"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* 🎯 CONTRAPESO DIREITO - COM MOVIMENTO PROPORCIONAL */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * contrapesoDireitoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * contrapesoDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * contrapesoDireitoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * contrapesoDireitoConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout'
              }}
            >
              <ContraPeso60t
                websocketValue={contrapesoDirecto}
                editMode={false}
              />
            </div>

            {/* 🎯 CONTRAPESO ESQUERDO - COM MOVIMENTO PROPORCIONAL */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * contrapesoEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * contrapesoEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * contrapesoEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * contrapesoEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout'
              }}
            >
              <ContraPeso60t
                websocketValue={contrapesoEsquerdo}
                editMode={false}
              />
            </div>

            {/* 📏 RÉGUA PORTA JUSANTE - WEBSOCKET ÍNDICE 39 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * reguaConfigAtual.verticalPercent) / 100}px`,
                left: `${(maxWidth * reguaConfigAtual.horizontalPercent) / 100}px`,
                width: `${(maxWidth * reguaConfigAtual.widthPercent) / 100}px`,
                height: `${(alturaTotal * reguaConfigAtual.heightPercent) / 100}px`,
                zIndex: 5,
                contain: 'layout'
              }}
            >
              <PortaJusanteRegua
                websocketValue={reguaPortaJusante}
                editMode={false}
              />
            </div>

            {/* ⚙️ MOTOR DIREITO - WEBSOCKET ÍNDICE 28 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * motorDireitoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * motorDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * motorDireitoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * motorDireitoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorJusante
                websocketValue={motorDireito}
                editMode={false}
                direction="left"
              />
            </div>

            {/* ⚙️ MOTOR ESQUERDO - WEBSOCKET ÍNDICE 29 - ESPELHADO */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO ECLUSA_REGUA: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * motorEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * motorEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * motorEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(alturaTotal * motorEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorJusante
                websocketValue={motorEsquerdo}
                editMode={false}
                direction="right"
              />
            </div>

            {/* 🚪 INDICADOR STATUS PORTA - RESPONSIVO MOBILE/DESKTOP */}
            {reguaPortaJusante >= 95 && (
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

            {reguaPortaJusante <= 5 && (
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

export default PortaJusante;