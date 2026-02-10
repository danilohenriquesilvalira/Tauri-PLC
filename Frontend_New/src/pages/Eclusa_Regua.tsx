import React from 'react';
import NivelCaldeira from '../components/Eclusa/caldeira/Nivel_Caldeira';
import NivelJusante from '../components/Eclusa/caldeira/Nivel_Jusante';
import NivelMontante from '../components/Eclusa/caldeira/Nivel_Montante';
import PortaJusante from '../components/Eclusa/caldeira/PortaJusante';
import PortaMontante from '../components/Eclusa/caldeira/PortaMontante';
import SemaforoSimples from '../components/Eclusa/caldeira/SemaforoSimples';
import TrendDialog from '../components/Eclusa/caldeira/TrendDialog';
import TubulacaoValvulas from '../components/Eclusa/caldeira/TubulacaoValvulas';
import { usePLC } from '../contexts/PLCContext';
import {
  CogIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WrenchScrewdriverIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Card } from '../components/ui/Card';
import { StatusCard } from '../components/ui/StatusCard';

// 🎯 CONFIGURAÇÕES DOS COMPONENTES DE NÍVEL - Separação Desktop/Mobile
// ✅ CORRIGIDO: vertical/height agora são % de baseHeight (não maxWidth)
// Conversão desktop: valor antigo / 0.7. Mobile: mesmo que desktop para posição fixa.
const NIVEL_CONFIG = {
  caldeira: {
    desktop: {
      verticalPercent: 37.3,  // % da altura da caldeira (posição Y) - relativo ao SVG caldeira
      horizontalPercent: 25.4, // % da largura da caldeira (posição X)
      widthPercent: 58.8,     // % da largura da caldeira (tamanho)
      heightPercent: 54.4,    // % da altura da caldeira (tamanho)
    },
    mobile: {
      verticalPercent: 38.5,
      horizontalPercent: 22.0,
      widthPercent: 68.0,
      heightPercent: 58.0,
    }
  },
  jusante: {
    desktop: {
      verticalPercent: 51.3,  // Convertido: 35.9 / 0.7
      horizontalPercent: 84,
      widthPercent: 16,
      heightPercent: 5.7      // Convertido: 4 / 0.7
    },
    mobile: {
      verticalPercent: 51.3,  // Mesmo que desktop - posição fixa
      horizontalPercent: 83.0,
      widthPercent: 14.0,
      heightPercent: 8.0
    }
  },
  montante: {
    desktop: {
      verticalPercent: 40.1,  // Convertido: 28 / 0.7
      horizontalPercent: 0,
      widthPercent: 25.5,
      heightPercent: 14.3,    // Convertido: 10 / 0.7
    },
    mobile: {
      verticalPercent: 40.1,  // Mesmo que desktop - posição fixa
      horizontalPercent: 1.5,
      widthPercent: 25,
      heightPercent: 14.3,
    }
  }
};

// 🚪 CONFIGURAÇÕES DOS COMPONENTES DE PORTA - Separação Desktop/Mobile
// ✅ CORRIGIDO: vertical/height agora são % de baseHeight
const PORTA_CONFIG = {
  jusante: {
    desktop: {
      verticalPercent: 38.7,    // Convertido: 27.1 / 0.7
      horizontalPercent: 72.6,
      widthPercent: 5,
      heightPercent: 22.9,      // Convertido: 16 / 0.7
    },
    mobile: {
      verticalPercent: 0,    // Mesmo que desktop - posição fixa
      horizontalPercent: 0,
      widthPercent: 10,
      heightPercent: 22.9,
    }
  },
  montante: {
    desktop: {
      verticalPercent: 31,    // Ajustado para manter posição fixa
      horizontalPercent: 25.5,
      widthPercent: 1.5,
      heightPercent: 25.7,
    },
    mobile: {
      verticalPercent: 38.0,    // Mesmo que desktop - posição fixa
      horizontalPercent: 18.3,
      widthPercent: 2.5,
      heightPercent: 25.7,
    }
  }
};

// 🚦 CONFIGURAÇÕES DOS SEMÁFOROS - Separação Desktop/Mobile
// ✅ CORRIGIDO: vertical/height agora são % de baseHeight
const SEMAFORO_CONFIG = {
  semaforo1: {
    desktop: {
      verticalPercent: 31.8,  // Convertido: 22.0 / 0.7
      horizontalPercent: 15,
      widthPercent: 3.5,
      heightPercent: 5.7,     // Convertido: 4.0 / 0.7
    },
    mobile: {
      verticalPercent: 31.4,  // Mesmo que desktop - posição fixa
      horizontalPercent: 20.0,
      widthPercent: 4.5,
      heightPercent: 5.7,
    }
  },
  semaforo2: {
    desktop: {
      verticalPercent: 32.6,  // Convertido: 22.8 / 0.7
      horizontalPercent: 30,
      widthPercent: 3.5,
      heightPercent: 5.7,
    },
    mobile: {
      verticalPercent: 32.6,
      horizontalPercent: 36.0,
      widthPercent: 4.5,
      heightPercent: 5.7,
    }
  },
  semaforo3: {
    desktop: {
      verticalPercent: 32.6,  // Convertido: 22.8 / 0.7
      horizontalPercent: 50,
      widthPercent: 3.5,
      heightPercent: 5.7,
    },
    mobile: {
      verticalPercent: 32.6,
      horizontalPercent: 63.0,
      widthPercent: 4.5,
      heightPercent: 5.7,
    }
  },
  semaforo4: {
    desktop: {
      verticalPercent: 32.0,  // Convertido: 22.4 / 0.7
      horizontalPercent: 80.0,
      widthPercent: 3.5,
      heightPercent: 5.7,
    },
    mobile: {
      verticalPercent: 32.0,
      horizontalPercent: 82.0,
      widthPercent: 4.5,
      heightPercent: 5.7,
    }
  }
};

// 🏗️ CONFIGURAÇÃO DA BASE PORTA JUSANTE - Separação Desktop/Mobile
// ✅ CORRIGIDO: vertical/height agora são % de baseHeight
const BASE_PORTA_JUSANTE_CONFIG = {
  desktop: {
    verticalPercent: 38.3,    // Convertido: 26.8 / 0.7
    horizontalPercent: 57.2,
    widthPercent: 40,
    heightPercent: 19.1,      // Convertido: 13.4 / 0.7
  },
  mobile: {
    verticalPercent: 38.3,    // Mesmo que desktop - posição fixa
    horizontalPercent: 46.0,
    widthPercent: 55,
    heightPercent: 19.1,
  }
};

// 🔧 CONFIGURAÇÃO DA TUBULAÇÃO E VÁLVULAS - Separação Desktop/Mobile
// ✅ CORRIGIDO: vertical/height agora são % de baseHeight
const TUBULACAO_CONFIG = {
  desktop: {
    verticalPercent: 49.6,    // Convertido: 34.7 / 0.7
    horizontalPercent: 6,
    widthPercent: 90,
    heightPercent: 21.4,      // Convertido: 15 / 0.7
  },
  mobile: {
    verticalPercent: 49.6,    // Mesmo que desktop - posição fixa
    horizontalPercent: 3,
    widthPercent: 94,
    heightPercent: 21.4,
  }
};

// 🏢 CONFIGURAÇÃO DA CALDEIRA_ECLUSA.SVG (SVG Principal) - Separação Desktop/Mobile
// ✅ CORRIGIDO: verticalPercent agora é % de baseHeight (não maxWidth)
const CALDEIRA_ECLUSA_CONFIG = {
  desktop: {
    verticalPercent: 28.6,    // Convertido: 20 / 0.7
    horizontalPercent: 50,
    widthPercent: 100,
    heightPercent: 100,
  },
  mobile: {
    verticalPercent: 28.6,    // Mesmo que desktop - posição fixa (era 90 - overflow!)
    horizontalPercent: 50.0,
    widthPercent: 97.2,
    heightPercent: 100,
  }
};

// 🧱 CONFIGURAÇÃO DA PAREDE_ECLUSA.SVG (SVG Principal) - Separação Desktop/Mobile
// ✅ CORRIGIDO: verticalPercent agora é % de baseHeight
const PAREDE_ECLUSA_CONFIG = {
  desktop: {
    verticalPercent: 42.9,    // Convertido: 30 / 0.7
    horizontalPercent: 50,
    widthPercent: 100.60,
    heightPercent: 100.0,
  },
  mobile: {
    verticalPercent: 42.9,    // Mesmo que desktop - posição fixa (era 100 - overflow!)
    horizontalPercent: 50.0,
    widthPercent: 98,
    heightPercent: 100,
  }
};

// 🟢 RETÂNGULO HORIZONTAL SIMPLES
const RETANGULO = {
  y: 0,           // Posição vertical (% da altura)
  largura: 100,     // Largura (% da largura total)
  altura: 28        // Altura (% da altura total)
};

interface EclusaReguaProps {
  sidebarOpen?: boolean; // Prop para detectar estado do sidebar
}

const EclusaRegua: React.FC<EclusaReguaProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [paredeOffsetPercent] = React.useState(-50.5); // Posição ajustada para encaixe perfeito
  const [showTrendDialog, setShowTrendDialog] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);

  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });

  const isMobile = windowWidth < 1024;

  // � LISTENER COMPLETO: Detecta resize E zoom com visualViewport
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => setWindowWidth(window.innerWidth), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const caldeiraScale = 99.4;

  // ✅ SELEÇÃO DINÂMICA DAS CONFIGURAÇÕES BASEADA NO DEVICE (padrão PortaJusante)
  const caldeiraConfig = isMobile ? NIVEL_CONFIG.caldeira.mobile : NIVEL_CONFIG.caldeira.desktop;
  const jusanteConfig = isMobile ? NIVEL_CONFIG.jusante.mobile : NIVEL_CONFIG.jusante.desktop;
  const montanteConfig = isMobile ? NIVEL_CONFIG.montante.mobile : NIVEL_CONFIG.montante.desktop;

  const portaJusanteConfig = isMobile ? PORTA_CONFIG.jusante.mobile : PORTA_CONFIG.jusante.desktop;
  const portaMontanteConfig = isMobile ? PORTA_CONFIG.montante.mobile : PORTA_CONFIG.montante.desktop;

  const semaforo1Config = isMobile ? SEMAFORO_CONFIG.semaforo1.mobile : SEMAFORO_CONFIG.semaforo1.desktop;
  const semaforo2Config = isMobile ? SEMAFORO_CONFIG.semaforo2.mobile : SEMAFORO_CONFIG.semaforo2.desktop;
  const semaforo3Config = isMobile ? SEMAFORO_CONFIG.semaforo3.mobile : SEMAFORO_CONFIG.semaforo3.desktop;
  const semaforo4Config = isMobile ? SEMAFORO_CONFIG.semaforo4.mobile : SEMAFORO_CONFIG.semaforo4.desktop;

  const basePortaJusanteConfig = isMobile ? BASE_PORTA_JUSANTE_CONFIG.mobile : BASE_PORTA_JUSANTE_CONFIG.desktop;
  const tubulacaoConfig = isMobile ? TUBULACAO_CONFIG.mobile : TUBULACAO_CONFIG.desktop;

  // ✅ CONFIGURAÇÕES DOS SVGs PRINCIPAIS (Caldeira_Eclusa.svg e Parede_Eclusa.svg)
  const caldeiraEclusaConfig = isMobile ? CALDEIRA_ECLUSA_CONFIG.mobile : CALDEIRA_ECLUSA_CONFIG.desktop;
  const paredeEclusaConfig = isMobile ? PAREDE_ECLUSA_CONFIG.mobile : PAREDE_ECLUSA_CONFIG.desktop;


  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA ECLUS usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para ECLUS via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['ECLUS'],
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
        console.log('📡 [Eclusa_Regua] Subscribe ECLUS enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🔥 SISTEMA REAL - USANDO TAGS DO WEBSOCKET ECLUS

  // 🎯 NÍVEIS - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const nivelJusante = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_JUSANTE_COTA_'] || '0');    // Nível da Jusante Cota
  const nivelCaldeira = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_CALD_COTA_'] || '0');     // Nível da Caldeira Cota  
  const nivelMontante = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_MONT_COTA_'] || '0');     // Nível da Montante Cota

  // 🎯 DIFERENÇAS DE NÍVEL - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const diffMontCald = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.DIFF_MONT_CALD_'] || '0');    // Diferença Montante-Caldeira
  const diffCaldJus = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.DIFF_CALD_JUS_'] || '0');      // Diferença Caldeira-Jusante

  // 🎯 MÍNIMO MONTANTE COTA - TAG REAL DO WEBSOCKET ECLUS (para animação)
  const minMontCota = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.MIN_MONT_COTA_'] || '0');       // Mínimo Montante Cota

  // 🎯 VELOCIDADES DOS RADARES - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const radarJusante = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_JUSANT_'] || '0');            // Velocidade Radar Jusante
  const radarMontante = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_MONT_'] || '0');             // Velocidade Radar Montante
  const radarCaldeira = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_CALD_'] || '0');             // Velocidade Radar Caldeira (se disponível)


  // Inteligência ISA-104: Detectar status dos níveis
  const toleranciaNormal = 0.05; // 5cm conforme ISA-104
  const toleranciaCritica = 0.15; // 15cm limite crítico

  // Status da caldeira (principal) - usando diferenças do WebSocket
  const statusCaldeira = React.useMemo(() => {
    const maxDiff = Math.max(Math.abs(diffMontCald), Math.abs(diffCaldJus));
    if (maxDiff > toleranciaCritica) return 'critico';
    if (maxDiff > toleranciaNormal) return 'alerta';
    return 'normal';
  }, [diffMontCald, diffCaldJus, toleranciaNormal, toleranciaCritica]);



  // 🎯 PORTAS - TAGS REAIS DO WEBSOCKET ECLUS (data type REAL - 0 a 100)
  const portaJusanteValue = parseFloat(plcData?.tags?.['ECLUS_PORTA_JUSANTE_MOV'] || '0');
  const portaMontanteValue = parseFloat(plcData?.tags?.['ECLUS_PORTA_MONT_MOV'] || '0');

  // Extrair dados dos semáforos do PLC (bit_data.status_bits)
  const statusBits = plcData?.bit_data?.status_bits || [];

  // Função para calcular word e bit de uma posição (reutilizável)
  const getBitFromPosition = (position: number) => {
    const wordIndex = Math.floor(position / 16);  // posição ÷ 16
    const bitIndex = position % 16;              // posição % 16
    const wordData = statusBits[wordIndex] || [];
    return wordData[bitIndex] || false;
  };


  // Extrair bits das válvulas da tubulação do PLC - USANDO A FUNÇÃO CORRETA
  const bitMontanteCaldeira = getBitFromPosition(132); // Bit 132 - Word 8 Bit 4
  const bitCaldeiraJusante = getBitFromPosition(133);  // Bit 133 - Word 8 Bit 5

  // Performance optimization: Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('🔧 Debug Tubulação - Status:', {
      statusBitsLength: statusBits.length,
      word8: statusBits[8] || [],
      bitMontanteCaldeira: bitMontanteCaldeira,
      bitCaldeiraJusante: bitCaldeiraJusante,
      bit132_calc: getBitFromPosition(132),
      bit133_calc: getBitFromPosition(133)
    });
  }

  // Função para obter o estado dos LEDs de cada semáforo
  const getSemaforoLeds = (semaforoNum: number) => {

    // Mapeamento individual de cada LED:
    // Semafaro_verde_1: 151, Semafaro_vermelho_1: 152
    // Semafaro_verde_2: 153, Semafaro_vermelho_2: 154  
    // Semafaro_verde_3: 155, Semafaro_vermelho_3: 156
    // Semafaro_verde_4: 157, Semafaro_vermelho_4: 158

    switch (semaforoNum) {
      case 1:
        const verde1 = getBitFromPosition(207); // Word[9] Bit[7]
        const vermelho1 = getBitFromPosition(206); // Word[9] Bit[8]
        return { verde: verde1, vermelho: vermelho1 };

      case 2:
        const verde2 = getBitFromPosition(209); // Word[9] Bit[9]
        const vermelho2 = getBitFromPosition(208); // Word[9] Bit[10]
        return { verde: verde2, vermelho: vermelho2 };

      case 3:
        const verde3 = getBitFromPosition(211); // Word[9] Bit[11]
        const vermelho3 = getBitFromPosition(210); // Word[9] Bit[12]
        return { verde: verde3, vermelho: vermelho3 };

      case 4:
        const verde4 = getBitFromPosition(212); // Word[9] Bit[13]
        const vermelho4 = getBitFromPosition(213); // Word[9] Bit[14]
        return { verde: verde4, vermelho: vermelho4 };

      default:
        return { verde: false, vermelho: false };
    }
  };



  // 🚀 MEMOIZAR DIMENSÕES - SISTEMA CORRIGIDO COM baseHeight
  // ✅ Padrão PortaJusante: baseWidth para horizontal, baseHeight para vertical
  const dimensions = React.useMemo(() => {
    // 📏 Aspect Ratios dos SVGs
    const caldeiraAspectRatio = 1168 / 253;
    const paredeAspectRatio = 1175 / 205;

    // 📐 Aspect ratio do layout Eclusa (largura:altura = 10:7)
    const layoutAspectRatio = 10 / 7;

    // 🎯 CÁLCULO PROGRESSIVO DE ESCALA (padrão das outras páginas)
    let scale: number;

    if (isMobile) {
      scale = 1.20;
    } else {
      if (windowWidth <= 1920) {
        scale = Math.max(0.75, (windowWidth / 1920) * 1.20);
      } else if (windowWidth <= 2560) {
        scale = 0.85 + ((windowWidth - 1920) / 640) * 0.15;
      } else if (windowWidth <= 3840) {
        scale = 1.00 + ((windowWidth - 2560) / 1280) * 0.08;
      } else {
        scale = Math.min(1.08, 1.08);
      }
    }

    // 📐 Cálculo com aspect ratio fixo (padrão PortaJusante)
    const sidebarWidth = 64;
    const availableWidth = windowWidth - sidebarWidth - 32;
    const availableHeight = window.innerHeight - (isMobile ? 180 : 100);

    let baseWidth: number;
    let baseHeight: number;

    const widthBasedHeight = availableWidth / layoutAspectRatio;

    if (widthBasedHeight <= availableHeight) {
      baseWidth = availableWidth;
      baseHeight = baseWidth / layoutAspectRatio;
    } else {
      baseHeight = availableHeight;
      baseWidth = baseHeight * layoutAspectRatio;
    }

    // Garante valores mínimos
    baseWidth = Math.max(baseWidth, isMobile ? 300 : 500);
    baseHeight = Math.max(baseHeight, isMobile ? 210 : 350);

    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    return {
      caldeiraAspectRatio,
      paredeAspectRatio,
      maxWidth: scaledWidth,
      baseWidth: scaledWidth,
      baseHeight: scaledHeight,
      scale,
      shouldRender: scaledWidth > 100 && scaledHeight > 100
    };
  }, [windowWidth, isMobile]);

  const { caldeiraAspectRatio, paredeAspectRatio, maxWidth, baseHeight, shouldRender } = dimensions;

  return (
    <div
      className="w-full h-auto flex flex-col items-center relative"
      style={{
        overflow: 'hidden',
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >

      {/* 📱 PAINEL MOBILE - FLOW-BASED (padrão PortaJusante) */}
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
            {/* Cards horizontais compactos - sempre visíveis - PADRONIZADO COM OUTRAS PÁGINAS */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {/* CARD NÍVEIS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    NÍVEIS
                  </h3>
                </div>
                <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Montante:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {nivelMontante.toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Caldeira:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {nivelCaldeira.toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Jusante:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {nivelJusante.toFixed(2)} <span className="text-gray-500 text-[6px]">m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD SISTEMA */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    SISTEMA
                  </h3>
                </div>
                <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Status:</div>
                    <div className={`font-mono font-bold text-[10px] ${statusCaldeira === 'normal' ? 'text-green-600' : statusCaldeira === 'alerta' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {statusCaldeira === 'normal' ? 'NORMAL' : statusCaldeira === 'alerta' ? 'ALERTA' : 'CRÍTICO'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Diferença:</div>
                    <div className={`font-mono font-bold text-[10px] ${Math.abs(diffMontCald) > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(diffMontCald).toFixed(3)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Operação:</div>
                      <div className="font-mono font-bold text-green-600 text-[9px]">
                        AUTO
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD VÁLVULAS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    VÁLVULAS
                  </h3>
                </div>
                <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Mont-Cald:</div>
                    <div className="font-mono font-bold text-[10px]">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${bitMontanteCaldeira ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {bitMontanteCaldeira ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Cald-Jus:</div>
                    <div className="font-mono font-bold text-[10px]">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${bitCaldeiraJusante ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {bitCaldeiraJusante ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Ativas:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {[bitMontanteCaldeira, bitCaldeiraJusante].filter(Boolean).length} <span className="text-gray-500 text-[6px]">/ 2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center relative"
        style={{
          height: 'auto',
          minHeight: '70vh'
        }}
      >

        {/* Container com positioning absoluto para controle total */}
        {shouldRender ? (
          <div
            className="relative w-full flex flex-col items-center"
            style={{
              maxWidth: `${maxWidth}px`,
              height: `${baseHeight}px`,
              minHeight: `${baseHeight}px`
            }}
          >
            
            {/* 🟢 RETÂNGULO HORIZONTAL COM CARDS DENTRO */}
            {!isMobile && (
              <div
                className="absolute bg-green-500/10 border-2 border-green-500/30"
                style={{
                  top: `${(baseHeight * RETANGULO.y) / 100}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `${(maxWidth * RETANGULO.largura) / 100}px`,
                  height: `${(baseHeight * RETANGULO.altura) / 100}px`,
                  zIndex: 200
                }}
              >
                {/* CARDS DENTRO DO RETÂNGULO - RESPONSIVOS */}
                {(() => {
                  // Dimensões do retângulo
                  const larguraRetangulo = (maxWidth * RETANGULO.largura) / 100;
                  const alturaRetangulo = (baseHeight * RETANGULO.altura) / 100;

                  // Escala baseada na ALTURA do retângulo (mais importante para caber)
                  // Referência: 150px altura = escala 1.0
                  const escala = Math.max(0.4, Math.min(2, alturaRetangulo / 150));

                  // Funções de responsividade
                  const fontSizeCard = (base: number) => Math.max(7, base * escala);
                  const spacingCard = (base: number) => Math.max(2, base * escala);
                  const gapCards = Math.max(4, 8 * escala);
                  const paddingCard = Math.max(3, 6 * escala);

                  return (
                    <div
                      className="w-full h-full flex items-stretch justify-center"
                      style={{ padding: `${paddingCard}px` }}
                    >
                      <div
                        className="grid grid-cols-4 w-full h-full"
                        style={{ gap: `${gapCards}px` }}
                      >
                        {/* 1º CARD - INFORMAÇÕES OPERACIONAIS */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(9)}px` }}
                            >
                              INFORMAÇÕES OPERACIONAIS
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(4)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Operador:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">J. SILVA</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Turno:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">MANHÃ</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Modo:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">REMOTO</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Barcos:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-blue-600">12</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Falhas:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-red-600">0</span>
                            </div>
                          </div>
                        </div>

                        {/* 2º CARD - NÍVEIS DA ECLUSA */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(9)}px` }}
                            >
                              NÍVEIS DA ECLUSA
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(4)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Montante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{nivelMontante.toFixed(2)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Caldeira:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{nivelCaldeira.toFixed(2)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Jusante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{nivelJusante.toFixed(2)} m</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Diff:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${Math.abs(diffMontCald) > 0.05 ? 'text-red-600' : 'text-green-600'}`}>{diffMontCald.toFixed(3)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Status:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${statusCaldeira === 'normal' ? 'text-green-600' : statusCaldeira === 'alerta' ? 'text-yellow-600' : 'text-red-600'}`}>{statusCaldeira === 'normal' ? 'NORMAL' : statusCaldeira === 'alerta' ? 'ALERTA' : 'CRÍTICO'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3º CARD - VELOCIDADES DOS RADARES */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(9)}px` }}
                            >
                              VELOCIDADES RADARES
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(4)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Montante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarMontante > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarMontante.toFixed(2)} m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Caldeira:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarCaldeira > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarCaldeira.toFixed(2)} m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Jusante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarJusante > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarJusante.toFixed(2)} m/s</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Máx:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-red-600">2.00 m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Status:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">OK</span>
                            </div>
                          </div>
                        </div>

                        {/* 4º CARD - STATUS DO SISTEMA */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(9)}px` }}
                            >
                              STATUS DO SISTEMA
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(4)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Operação:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">AUTO</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Níveis:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${statusCaldeira === 'normal' ? 'text-green-600' : 'text-red-600'}`}>{statusCaldeira === 'normal' ? 'OK' : 'ALERTA'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Válvulas:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${bitMontanteCaldeira || bitCaldeiraJusante ? 'text-green-600' : 'text-gray-500'}`}>{bitMontanteCaldeira || bitCaldeiraJusante ? 'ABERTAS' : 'FECHADAS'}</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Conexão:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(8)}px` }} className="font-medium text-gray-500">Controle:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">LOCAL</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Caldeira - Posição configurada individualmente por device */}
            <div
              className="absolute cursor-pointer"
              style={{
                top: `${(baseHeight * caldeiraEclusaConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * caldeiraEclusaConfig.horizontalPercent) / 100}px`,
                transform: `translateX(-50%)`,
                width: `${(maxWidth * caldeiraEclusaConfig.widthPercent) / 100}px`,
                height: `${((maxWidth * caldeiraEclusaConfig.widthPercent) / 100) / caldeiraAspectRatio}px`,
                zIndex: 1
              }}
              onClick={() => setShowTrendDialog(true)}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1168 253"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-sm"
              >
                <image
                  href="/Eclusa/Caldeira_Eclusa.svg"
                  width="1168"
                  height="253"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* Parede - Posição configurada individualmente por device */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * paredeEclusaConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * paredeEclusaConfig.horizontalPercent) / 100}px`,
                transform: `translateX(-50%)`,
                width: `${(maxWidth * paredeEclusaConfig.widthPercent) / 100}px`,
                height: `${((maxWidth * paredeEclusaConfig.widthPercent) / 100) / paredeAspectRatio}px`,
                zIndex: 15, // Por cima dos níveis (zIndex: 10)
                clipPath: 'inset(0)', // Força o SVG a respeitar os limites
                transition: 'all 0.2s ease-in-out' // Agora sempre tem transição suave
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1175 205"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                style={{
                  overflow: 'hidden' // Corta elementos que vazam
                }}
              >
                <image
                  href="/Eclusa/Parede_Eclusa.svg"
                  width="1175"
                  height="205"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* Componente Nível Caldeira - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${((baseHeight * caldeiraEclusaConfig.verticalPercent) / 100) + (((maxWidth * caldeiraEclusaConfig.widthPercent) / 100) / caldeiraAspectRatio * caldeiraConfig.verticalPercent) / 100}px`,
                left: `${((maxWidth * caldeiraEclusaConfig.horizontalPercent) / 100) + (((maxWidth * caldeiraEclusaConfig.widthPercent) / 100 * caldeiraConfig.horizontalPercent) / 100) - ((maxWidth * caldeiraEclusaConfig.widthPercent) / 200)}px`,
                width: `${((maxWidth * caldeiraEclusaConfig.widthPercent) / 100 * caldeiraConfig.widthPercent) / 100}px`,
                height: `${(((maxWidth * caldeiraEclusaConfig.widthPercent) / 100) / caldeiraAspectRatio * caldeiraConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <NivelCaldeira
                websocketValue={nivelCaldeira}
                editMode={false}
              />
            </div>

            {/* Componente Nível Jusante - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * jusanteConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * jusanteConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * jusanteConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * jusanteConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <NivelJusante
                websocketValue={nivelJusante}
                editMode={false}
              />
            </div>

            {/* Componente Nível Montante - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * montanteConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * montanteConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * montanteConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * montanteConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <NivelMontante
                websocketValue={nivelMontante}
                editMode={false}
              />
            </div>

            {/* Componente Porta Jusante - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * portaJusanteConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * portaJusanteConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * portaJusanteConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * portaJusanteConfig.heightPercent) / 100}px`,
                zIndex: 18,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <PortaJusante
                websocketValue={portaJusanteValue}
                editMode={false}
              />
            </div>

            {/* Componente Porta Montante - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * portaMontanteConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * portaMontanteConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * portaMontanteConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * portaMontanteConfig.heightPercent) / 100}px`,
                zIndex: 18,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <PortaMontante
                websocketValue={portaMontanteValue}
                editMode={false}
                width={(maxWidth * portaMontanteConfig.widthPercent) / 100}
                height={(baseHeight * portaMontanteConfig.heightPercent) / 100}
              />
            </div>

            {/* Semáforo 1 - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * semaforo1Config.verticalPercent) / 100}px`,
                left: `${(maxWidth * semaforo1Config.horizontalPercent) / 100}px`,
                width: `${(maxWidth * semaforo1Config.widthPercent) / 100}px`,
                height: `${(baseHeight * semaforo1Config.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <SemaforoSimples
                ledVerde={getSemaforoLeds(1).verde}
                ledVermelho={getSemaforoLeds(1).vermelho}
                editMode={true}
              />
            </div>

            {/* Semáforo 2 - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * semaforo2Config.verticalPercent) / 100}px`,
                left: `${(maxWidth * semaforo2Config.horizontalPercent) / 100}px`,
                width: `${(maxWidth * semaforo2Config.widthPercent) / 100}px`,
                height: `${(baseHeight * semaforo2Config.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <SemaforoSimples
                ledVerde={getSemaforoLeds(2).verde}
                ledVermelho={getSemaforoLeds(2).vermelho}
                editMode={true}
              />
            </div>

            {/* Semáforo 3 - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * semaforo3Config.verticalPercent) / 100}px`,
                left: `${(maxWidth * semaforo3Config.horizontalPercent) / 100}px`,
                width: `${(maxWidth * semaforo3Config.widthPercent) / 100}px`,
                height: `${(baseHeight * semaforo3Config.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <SemaforoSimples
                ledVerde={getSemaforoLeds(3).verde}
                ledVermelho={getSemaforoLeds(3).vermelho}
                editMode={true}
              />
            </div>

            {/* Semáforo 4 - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * semaforo4Config.verticalPercent) / 100}px`,
                left: `${(maxWidth * semaforo4Config.horizontalPercent) / 100}px`,
                width: `${(maxWidth * semaforo4Config.widthPercent) / 100}px`,
                height: `${(baseHeight * semaforo4Config.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <SemaforoSimples
                ledVerde={getSemaforoLeds(4).verde}
                ledVermelho={getSemaforoLeds(4).vermelho}
                editMode={true}
              />
            </div>

            {/* Base Porta Jusante SVG */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * basePortaJusanteConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * basePortaJusanteConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * basePortaJusanteConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * basePortaJusanteConfig.heightPercent) / 100}px`,
                zIndex: 18 // Por cima dos níveis (zIndex: 10)
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
              >
                <image
                  href="/Eclusa/Base_Porta_Jusante.svg"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* Componente Tubulação e Válvulas - Dados reais do PLC */}
            <div
              className="absolute"
              style={{
                top: `${(baseHeight * tubulacaoConfig.verticalPercent) / 100}px`,
                left: `${(maxWidth * tubulacaoConfig.horizontalPercent) / 100}px`,
                width: `${(maxWidth * tubulacaoConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * tubulacaoConfig.heightPercent) / 100}px`,
                zIndex: 20,
                contain: 'layout',
                willChange: 'transform'
              }}
            >
              <TubulacaoValvulas
                bitMontanteCaldeira={bitMontanteCaldeira}
                bitCaldeiraJusante={bitCaldeiraJusante}
                editMode={false}
              />
            </div>





          </div>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{
                height: '400px',
                maxWidth: '1200px',
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

      {/* Dialog de Trend */}
      <TrendDialog
        isOpen={showTrendDialog}
        onClose={() => setShowTrendDialog(false)}
      />


      {/* 📱 BOTÃO MOBILE - ESTILO PADRÃO PORTA MONTANTE/JUSANTE/ENCHIMENTO */}
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

      {/* 🖥️ BOTÃO DESKTOP - ESTILO PADRÃO */}
      {!isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-6 right-6 z-50 px-8 py-5 bg-[#212E3E] text-white rounded-2xl shadow-2xl flex items-center gap-5 hover:scale-105 transition-all duration-200 touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <CogIcon className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">PARÂMETROS</div>
            <div className="text-sm opacity-80">Eclusa Régua</div>
          </div>
        </button>
      )}

      {/* MODAL DE PARÂMETROS */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden"
          onClick={() => setMenuParametrosOpen(false)}
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Dialog Container - 100% responsivo e ajustável */}
          <div
            className="
              bg-white shadow-2xl overflow-hidden flex flex-col
              w-full h-[85vh] rounded-t-3xl
              animate-in slide-in-from-bottom duration-300
              sm:w-[95vw] sm:h-[90vh] sm:rounded-2xl
              md:w-[85vw] md:max-w-3xl md:h-[85vh] md:max-h-[800px] md:rounded-2xl
              md:animate-in md:fade-in md:zoom-in
              lg:max-w-4xl lg:h-[80vh]
              xl:max-w-5xl
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
            <div className="bg-[#212E3E] p-3 md:p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CogIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm md:text-base font-bold truncate">PARÂMETROS</h2>
                    <p className="text-gray-300 text-xs md:text-sm mt-0.5 hidden md:block">Configurações e Monitoramento</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ touchAction: 'manipulation' }}
                >
                  <XMarkIcon className="w-4 h-4 md:w-5 md:h-5" />
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
              <div className="p-3 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">

                  {/* IGUALDADE DE NÍVEIS MONTANTE */}
                  <Card
                    title="IGUALDADE NÍVEIS MONTANTE"
                    icon={<ArrowUpIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Tolerância:</span>
                        <span className="text-sm md:text-lg font-mono font-bold text-gray-900">0.05 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Tempo Estab.:</span>
                        <span className="text-sm md:text-lg font-mono font-bold text-gray-900">30 s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Status:</span>
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                          <span className="text-green-600 font-semibold text-xs md:text-sm">OK</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Bypass:</span>
                        <button className="px-2 py-1 md:px-3 md:py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded text-xs transition-colors font-medium">
                          Desabilitado
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* IGUALDADE DE NÍVEIS JUSANTE */}
                  <Card
                    title="IGUALDADE NÍVEIS JUSANTE"
                    icon={<ArrowDownIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Tolerância:</span>
                        <span className="text-sm md:text-lg font-mono font-bold text-gray-900">0.03 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Tempo Estab.:</span>
                        <span className="text-sm md:text-lg font-mono font-bold text-gray-900">25 s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Status:</span>
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                          <span className="text-green-600 font-semibold text-xs md:text-sm">OK</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-xs md:text-sm">Bypass:</span>
                        <button className="px-2 py-1 md:px-3 md:py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded text-xs transition-colors font-medium">
                          Desabilitado
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* CONFIGURAÇÕES ADICIONAIS DE SISTEMA */}
                  <Card
                    title="CONFIGURAÇÕES SISTEMA"
                    icon={<WrenchScrewdriverIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit md:col-span-2"
                  >
                    <div className="space-y-3 md:space-y-4">
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="text-center">
                          <div className="text-xs text-blue-600 font-medium mb-1">TIMEOUT OPERAÇÃO</div>
                          <div className="text-sm md:text-lg font-mono font-bold text-blue-800">30 <span className="text-xs">seg</span></div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-green-600 font-medium mb-1">CICLO AUTOMÁTICO</div>
                          <div className="text-sm md:text-lg font-mono font-bold text-green-800">ATIVO</div>
                        </div>
                      </div>
                      <div className="pt-2 md:pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs font-medium">Manutenção Programada:</span>
                          <span className="text-xs font-mono font-medium text-orange-600">15 dias</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            </div>

            {/* Footer com ações - Fixed no mobile */}
            <div className="bg-gray-50 px-3 py-3 md:px-4 md:py-4 border-t border-gray-200 flex-shrink-0 safe-area-bottom">
              <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-2.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg transition-colors font-medium text-sm md:text-base"
                  style={{ touchAction: 'manipulation' }}
                >
                  Fechar
                </button>
                <button
                  className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm md:text-base shadow-lg"
                  style={{ touchAction: 'manipulation' }}
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EclusaRegua;