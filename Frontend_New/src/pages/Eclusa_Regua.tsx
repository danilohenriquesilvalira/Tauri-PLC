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
  UserIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { Card } from '../components/ui/Card';
import { InfoCard } from '../components/ui/InfoCard';
import { StatusCard } from '../components/ui/StatusCard';

// 🎯 CONFIGURAÇÕES DOS COMPONENTES DE NÍVEL - Separação Desktop/Mobile
const NIVEL_CONFIG = {
  caldeira: {
    desktop: {
      verticalPercent: 44.9,  // % da altura da caldeira (posição Y)
      horizontalPercent: 25.3, // % da largura da caldeira (posição X)
      widthPercent: 64.6,     // % da largura da caldeira (tamanho)
      heightPercent: 62,    // % da altura da caldeira (tamanho)
    },
    mobile: {
      verticalPercent: 38.5,  // Ajuste para mobile
      horizontalPercent: 22.0,
      widthPercent: 68.0,
      heightPercent: 58.0,
    }
  },
  jusante: {
    desktop: {
      verticalPercent: 44.9,  // Posicionado na parte inferior
      horizontalPercent: 88.0, // Lado direito
      widthPercent: 12.0,     // Largura ajustada
      heightPercent: 6.5      // Altura ajustada
    },
    mobile: {
      verticalPercent: 42.0,
      horizontalPercent: 83.0,
      widthPercent: 14.0,
      heightPercent: 10.0
    }
  },
  montante: {
    desktop: {
      verticalPercent: 38.1,  // Posicionado na parte superior esquerda
      horizontalPercent: 0.0, // Lado esquerdo
      widthPercent: 25.4,     // Largura ajustada
      heightPercent: 11.0,    // Altura ajustada
    },
    mobile: {
      verticalPercent: 28.0,
      horizontalPercent: 1.0,
      widthPercent: 22.0,
      heightPercent: 14.0,
    }
  }
};

// 🚪 CONFIGURAÇÕES DOS COMPONENTES DE PORTA - Separação Desktop/Mobile
const PORTA_CONFIG = {
  jusante: {
    desktop: {
      verticalPercent: 38.2,    // % da altura total (posição Y)
      horizontalPercent: 79.5,  // % da largura total (posição X)
      widthPercent: 5,          // % da largura total (tamanho)
      heightPercent: 16,        // % da altura total (tamanho)
    },
    mobile: {
      verticalPercent: 28.0,
      horizontalPercent: 76.5,
      widthPercent: 10,
      heightPercent: 18,
    }
  },
  montante: {
    desktop: {
      verticalPercent: 36.8,  // % da altura total (posição Y)
      horizontalPercent: 25.5, // % da largura total (posição X)
      widthPercent: 1.5,      // % da largura total (tamanho)
      heightPercent: 18,      // % da altura total (tamanho)
    },
    mobile: {
      verticalPercent: 16.0,
      horizontalPercent: 24.0,
      widthPercent: 2.5,
      heightPercent: 16,
    }
  }
};

// 🚦 CONFIGURAÇÕES DOS SEMÁFOROS - Separação Desktop/Mobile
const SEMAFORO_CONFIG = {
  semaforo1: {
    desktop: {
      verticalPercent: 32.0,  // Parte superior
      horizontalPercent: 22.0, // Esquerda
      widthPercent: 3.5,        // Tamanho ajustado
      heightPercent: 4.0,      // Altura ajustada
    },
    mobile: {
      verticalPercent: 12.0,
      horizontalPercent: 20.0,
      widthPercent: 4.5,
      heightPercent: 4.0,
    }
  },
  semaforo2: {
    desktop: {
      verticalPercent: 32.9,  // Ligeiramente abaixo
      horizontalPercent: 38.0, // Centro-esquerda
      widthPercent: 3.5,        // Tamanho ajustado
      heightPercent: 4.0,      // Altura ajustada
    },
    mobile: {
      verticalPercent: 14.0,
      horizontalPercent: 36.0,
      widthPercent: 4.5,
      heightPercent: 4.0,
    }
  },
  semaforo3: {
    desktop: {
      verticalPercent: 32.9,  // Mesmo nível do 2
      horizontalPercent: 65.0, // Centro-direita
      widthPercent: 3.5,        // Tamanho ajustado
      heightPercent: 4.0,      // Altura ajustada
    },
    mobile: {
      verticalPercent: 14.0,
      horizontalPercent: 63.0,
      widthPercent: 4.5,
      heightPercent: 4.0,
    }
  },
  semaforo4: {
    desktop: {
      verticalPercent: 32.5,  // Parte superior
      horizontalPercent: 85.0, // Direita
      widthPercent: 3.5,        // Tamanho ajustado
      heightPercent: 4.0,      // Altura ajustada
    },
    mobile: {
      verticalPercent: 12.0,
      horizontalPercent: 82.0,
      widthPercent: 4.5,
      heightPercent: 6.0,
    }
  }
};

// 🏗️ CONFIGURAÇÃO DA BASE PORTA JUSANTE - Separação Desktop/Mobile
const BASE_PORTA_JUSANTE_CONFIG = {
  desktop: {
    verticalPercent: 36.8,    // Posicionado no meio-inferior
    horizontalPercent: 64.3,  // Centro horizontal
    widthPercent: 40,       // Largura reduzida
    heightPercent: 14.6,      // Altura reduzida
  },
  mobile: {
    verticalPercent: 37.0,
    horizontalPercent: 46.0,
    widthPercent: 55,
    heightPercent: 22.0,
  }
};

// 🔧 CONFIGURAÇÃO DA TUBULAÇÃO E VÁLVULAS - Separação Desktop/Mobile
const TUBULACAO_CONFIG = {
  desktop: {
    verticalPercent: 45.8,    // Parte inferior
    horizontalPercent: 5,   // Margem esquerda
    widthPercent: 90,       // Largura total
    heightPercent: 15,      // Altura ajustada
  },
  mobile: {
    verticalPercent: 52.0,
    horizontalPercent: 3,
    widthPercent: 94,
    heightPercent: 18,
  }
};

// 🏢 CONFIGURAÇÃO DA CALDEIRA_ECLUSA.SVG (SVG Principal) - Separação Desktop/Mobile
const CALDEIRA_ECLUSA_CONFIG = {
  desktop: {
    verticalPercent: 30.0,    // Posição vertical baseada no maxWidth (30% da largura)
    horizontalPercent: 50.0,  // Centro horizontal
    widthPercent: 100,         // 85% da largura disponível
    heightPercent: 100,       // Altura calculada pelo aspect ratio
  },
  mobile: {
    verticalPercent: 35.0,    // Posição vertical ajustada para mobile
    horizontalPercent: 50.0,  // Centro horizontal
    widthPercent: 95,         // 95% da largura no mobile
    heightPercent: 100,       // Altura calculada pelo aspect ratio
  }
};

// 🧱 CONFIGURAÇÃO DA PAREDE_ECLUSA.SVG (SVG Principal) - Separação Desktop/Mobile  
const PAREDE_ECLUSA_CONFIG = {
  desktop: {
    verticalPercent: 41.1,    // Posição abaixo da caldeira (45% da largura)
    horizontalPercent: 50.0,  // Centro horizontal
    widthPercent: 100.60,         // 90% da largura disponível
    heightPercent: 100.0,       // Altura calculada pelo aspect ratio
  },
  mobile: {
    verticalPercent: 50.0,    // Posição ajustada para mobile
    horizontalPercent: 50.0,  // Centro horizontal
    widthPercent: 98,         // 98% da largura no mobile
    heightPercent: 100,       // Altura calculada pelo aspect ratio
  }
};

interface EclusaReguaProps {
  sidebarOpen?: boolean; // Prop para detectar estado do sidebar
}

const EclusaRegua: React.FC<EclusaReguaProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = React.useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = React.useState({ width: 1200, height: 800 }); // Valores iniciais estáveis
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [paredeOffsetPercent] = React.useState(-50.5); // Posição ajustada para encaixe perfeito
  const [showTrendDialog, setShowTrendDialog] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  
  // ✅ DETECÇÃO MOBILE ESTÁVEL - baseada no viewport, não na window (padrão PortaJusante)
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      setIsMobile(vw < 1024);
    };
    
    checkMobile();
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    mediaQuery.addListener(checkMobile);
    
    return () => mediaQuery.removeListener(checkMobile);
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
  const { data: plcData } = usePLC();
  
  // Extrair dados reais dos níveis do PLC (do sistema existente)
  const nivelJusante = plcData?.reals?.[107] || 0;    // NIV.NIV_JUSANTE_COTA (índice 107)
  const nivelCaldeira = plcData?.reals?.[108] || 0;   // NIV.NIV_CALD_COTA (índice 108)  
  const nivelMontante = plcData?.reals?.[109] || 0;   // NIV.NIV_MONT_COTA (índice 109)
  
  // Extrair dados dos radares de velocidade do PLC
  const radarMontante = plcData?.reals?.[117] || 0;   // Radar Montante (índice 117)
  const radarJusante = plcData?.reals?.[116] || 0;    // Radar Jusante (índice 118)
  const radarCaldeira = plcData?.reals?.[118] || 0;   // Radar Caldeira (índice 119)
  
  
  // Inteligência ISA-104: Detectar status dos níveis
  const toleranciaNormal = 0.05; // 5cm conforme ISA-104
  const toleranciaCritica = 0.15; // 15cm limite crítico
  
  // Status da caldeira (principal)
  const statusCaldeira = React.useMemo(() => {
    const diffMontante = Math.abs(nivelCaldeira - nivelMontante);
    const diffJusante = Math.abs(nivelCaldeira - nivelJusante);
    const maxDiff = Math.max(diffMontante, diffJusante);
    if (maxDiff > toleranciaCritica) return 'critico';
    if (maxDiff > toleranciaNormal) return 'alerta';
    return 'normal';
  }, [nivelCaldeira, nivelMontante, nivelJusante, toleranciaNormal, toleranciaCritica]);
  

  
  // Extrair dados das portas do PLC (do sistema existente)
  const portaJusanteValue = plcData?.ints?.[42] || 0;   // MOVIMENTO_PORTA_JUSANTE_CALDEIRA (índice 42)
  const portaMontanteValue = plcData?.ints?.[57] || 0; // MOVIMENTAR_PORTA_MONTANTE_CALDEIRA (índice 57)
  
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
  
  // Debug - verificar se os bits estão sendo extraídos corretamente
  console.log('🔧 Debug Tubulação - Status:', {
    statusBitsLength: statusBits.length,
    word8: statusBits[8] || [],
    bitMontanteCaldeira: bitMontanteCaldeira,
    bitCaldeiraJusante: bitCaldeiraJusante,
    bit132_calc: getBitFromPosition(132),
    bit133_calc: getBitFromPosition(133)
  });
  
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
  }, []);


  // Cálculo das proporções baseado nos viewBoxes originais
  const caldeiraAspectRatio = 1168 / 253; // width/height do Caldeira_Eclusa.svg
  const paredeAspectRatio = 1175 / 205;   // width/height do Parede_Eclusa.svg
  
  // Calcular dimensões otimizadas para o container disponível
  const maxWidth = Math.min(containerDimensions.width - 32, 1920); // 32px = margem mínima

  // ✅ DETECÇÃO MOBILE JÁ IMPLEMENTADA ACIMA COM USEEFFECT ESTÁVEL
  

  return (
    <div className="w-full h-screen flex flex-col items-center justify-end pb-8 relative">
        

        {/* PAINÉIS INFORMATIVOS - ÁREA SUPERIOR COMPLETA */}
        {isInitialized && containerDimensions.width > 100 && (
          <div 
            className="absolute top-5 z-10"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${Math.min(containerDimensions.width - (isMobile ? 16 : 32), 1920)}px`,
              height: `${Math.max(
                (maxWidth * 0.7 * (isMobile ? 0.08 : 0.18)) - 40, 
                isMobile ? 180 : 280
              )}px`
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              
              {/* 1º CARD - INFORMAÇÕES OPERACIONAIS */}
              <InfoCard title="INFORMAÇÕES OPERACIONAIS" variant="system">
                <div className="space-y-1.5 h-full flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3" />
                      Operador:
                    </span>
                    <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-white border border-gray-200 text-[#212E3E]">J. SILVA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Turno:</span>
                    <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-white border border-gray-200 text-[#212E3E]">MANHÃ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Modo:</span>
                    <span className="text-sm font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded">REMOTO</span>
                  </div>
                  
                  <div className="border-t border-gray-600 my-2"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide flex items-center gap-1.5">
                      <ClipboardDocumentListIcon className="w-3 h-3" />
                      Barcos Hoje:
                    </span>
                    <span className="text-sm font-mono font-bold text-[#212E3E] bg-blue-50 px-2 py-1 rounded">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Falhas Ativas:
                    </span>
                    <span className="text-sm font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Total Falhas:</span>
                    <span className="text-sm font-mono font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">3</span>
                  </div>
                </div>
              </InfoCard>

              {/* 2º CARD - NÍVEIS DA ECLUSA */}
              <InfoCard title="NÍVEIS DA ECLUSA" variant="industrial">
                <div className="space-y-1.5 h-full flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Nível Montante:</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${Math.abs(nivelMontante - nivelCaldeira) > 0.05 ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                      {nivelMontante.toFixed(2)} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Nível Caldeira:</span>
                    <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-white border border-gray-200">
                      {nivelCaldeira.toFixed(2)} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Nível Jusante:</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${Math.abs(nivelJusante - nivelCaldeira) > 0.05 ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                      {nivelJusante.toFixed(2)} m
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-600 my-2"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Diff. Mont/Cald:</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${Math.abs(nivelMontante - nivelCaldeira) > 0.05 ? 'text-white bg-red-500' : 'text-green-600 bg-green-50'}`}>
                      {Math.abs(nivelMontante - nivelCaldeira).toFixed(3)} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Diff. Jus/Cald:</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${Math.abs(nivelJusante - nivelCaldeira) > 0.05 ? 'text-white bg-red-500' : 'text-green-600 bg-green-50'}`}>
                      {Math.abs(nivelJusante - nivelCaldeira).toFixed(3)} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Status:</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded text-white ${statusCaldeira === 'normal' ? 'bg-green-500' : statusCaldeira === 'alerta' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {statusCaldeira === 'normal' ? 'NORMAL' : statusCaldeira === 'alerta' ? 'ALERTA' : 'CRÍTICO'}
                    </span>
                  </div>
                </div>
              </InfoCard>

              {/* 3º CARD - VELOCIDADES DOS RADARES */}
              <InfoCard title="VELOCIDADES RADARES" variant="motor">
                <div className="space-y-1.5 h-full flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Radar Mont.(117):</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${radarMontante > 2.0 ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                      {radarMontante.toFixed(2)} m/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Radar Cald.(119):</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${radarCaldeira > 2.0 ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                      {radarCaldeira.toFixed(2)} m/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Radar Jus.(118):</span>
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${radarJusante > 2.0 ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                      {radarJusante.toFixed(2)} m/s
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-600 my-2"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Velocidade Máx:</span>
                    <span className="text-sm font-mono font-bold text-white bg-red-500 px-2 py-1 rounded">2.00 m/s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Status Geral:</span>
                    <span className="text-sm font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded">OPERACIONAL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Comunicação:</span>
                    <span className="text-sm font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded">ONLINE</span>
                  </div>
                </div>
              </InfoCard>

              {/* 4º CARD - STATUS DO SISTEMA */}
              <InfoCard title="STATUS DO SISTEMA" variant="status">
                <div className="space-y-1.5">
                  <StatusCard 
                    title="OPERAÇÃO EM AUTOMÁTICO"
                    variant="automatic"
                  />
                  
                  <StatusCard 
                    title={statusCaldeira === 'normal' ? "NÍVEIS EQUALIZADOS" : "DESEQUILÍBRIO DE NÍVEIS"}
                    variant={statusCaldeira === 'normal' ? "success" : statusCaldeira === 'alerta' ? "warning" : "error"}
                  />
                  
                  <StatusCard 
                    title={bitMontanteCaldeira || bitCaldeiraJusante ? "VÁLVULAS ABERTAS" : "VÁLVULAS FECHADAS"}
                    variant={bitMontanteCaldeira || bitCaldeiraJusante ? "success" : "warning"}
                  />
                  
                  <StatusCard 
                    title="EMERGÊNCIA ATIVADA"
                    variant="error"
                  />
                  
                  <StatusCard 
                    title="SISTEMA CONECTADO"
                    variant="success"
                  />
                  
                  <StatusCard 
                    title="CONTROLE LOCAL LIBERADO"
                    variant="success"
                  />
                </div>
              </InfoCard>

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
          {isInitialized && containerDimensions.width > 100 && windowDimensions.width > 0 ? (
            <div 
              className="relative w-full flex flex-col items-center"
              style={{
                maxWidth: `${maxWidth}px`,
                height: `${maxWidth * 0.7}px` // Altura proporcional ao maxWidth (70% da largura)
              }}
            >
              {/* Caldeira - Posição configurada individualmente por device */}
              <div 
                className="absolute cursor-pointer"
                style={{
                  top: `${(maxWidth * caldeiraEclusaConfig.verticalPercent) / 100}px`,
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
                  top: `${(maxWidth * paredeEclusaConfig.verticalPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${((maxWidth * caldeiraEclusaConfig.verticalPercent) / 100) + (((maxWidth * caldeiraEclusaConfig.widthPercent) / 100) / caldeiraAspectRatio * caldeiraConfig.verticalPercent) / 100}px`,
                  left: `${((maxWidth * caldeiraEclusaConfig.horizontalPercent) / 100) + (((maxWidth * caldeiraEclusaConfig.widthPercent) / 100 * caldeiraConfig.horizontalPercent) / 100) - ((maxWidth * caldeiraEclusaConfig.widthPercent) / 200)}px`,
                  width: `${((maxWidth * caldeiraEclusaConfig.widthPercent) / 100 * caldeiraConfig.widthPercent) / 100}px`,
                  height: `${(((maxWidth * caldeiraEclusaConfig.widthPercent) / 100) / caldeiraAspectRatio * caldeiraConfig.heightPercent) / 100}px`,
                  zIndex: 10 // Camada intermediária - embaixo das estruturas
                }}
              >
                <NivelCaldeira 
                  websocketValue={nivelCaldeira}
                  editMode={false}
                />
              </div>

              {/* Componente Nível Jusante - Dados reais do PLC */}
              <div 
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * jusanteConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * jusanteConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * jusanteConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * jusanteConfig.heightPercent) / 100}px`,
                  zIndex: 10 // Abaixo das estruturas (Parede: 15, Portas: 18)
                }}
              >
                <NivelJusante 
                  websocketValue={nivelJusante}
                  editMode={false}
                />
              </div>

              {/* Componente Nível Montante - Dados reais do PLC */}
              <div 
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * montanteConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * montanteConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * montanteConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * montanteConfig.heightPercent) / 100}px`,
                  zIndex: 10 // Abaixo das estruturas (Parede: 15, Portas: 18)
                }}
              >
                <NivelMontante 
                  websocketValue={nivelMontante}
                  editMode={false}
                />
              </div>

              {/* Componente Porta Jusante - Dados reais do PLC */}
              <div 
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * portaJusanteConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * portaJusanteConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * portaJusanteConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * portaJusanteConfig.heightPercent) / 100}px`,
                  zIndex: 18 // Por cima dos níveis (zIndex: 10)
                }}
              >
                <PortaJusante 
                  websocketValue={portaJusanteValue}
                  editMode={false}
                />
              </div>

              {/* Componente Porta Montante - Dados reais do PLC */}
              <div 
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * portaMontanteConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * portaMontanteConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * portaMontanteConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * portaMontanteConfig.heightPercent) / 100}px`,
                  zIndex: 18 // Por cima dos níveis (zIndex: 10)
                }}
              >
                <PortaMontante 
                  websocketValue={portaMontanteValue}
                  editMode={false}
                />
              </div>

              {/* Semáforo 1 - Dados reais do PLC */}
              <div 
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * semaforo1Config.verticalPercent) / 100}px`,
                  left: `${(maxWidth * semaforo1Config.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * semaforo1Config.widthPercent) / 100}px`,
                  height: `${(maxWidth * semaforo1Config.heightPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * semaforo2Config.verticalPercent) / 100}px`,
                  left: `${(maxWidth * semaforo2Config.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * semaforo2Config.widthPercent) / 100}px`,
                  height: `${(maxWidth * semaforo2Config.heightPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * semaforo3Config.verticalPercent) / 100}px`,
                  left: `${(maxWidth * semaforo3Config.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * semaforo3Config.widthPercent) / 100}px`,
                  height: `${(maxWidth * semaforo3Config.heightPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * semaforo4Config.verticalPercent) / 100}px`,
                  left: `${(maxWidth * semaforo4Config.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * semaforo4Config.widthPercent) / 100}px`,
                  height: `${(maxWidth * semaforo4Config.heightPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * basePortaJusanteConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * basePortaJusanteConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * basePortaJusanteConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * basePortaJusanteConfig.heightPercent) / 100}px`,
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
                className="absolute transition-all duration-200 ease-in-out"
                style={{
                  top: `${(maxWidth * tubulacaoConfig.verticalPercent) / 100}px`,
                  left: `${(maxWidth * tubulacaoConfig.horizontalPercent) / 100}px`,
                  width: `${(maxWidth * tubulacaoConfig.widthPercent) / 100}px`,
                  height: `${(maxWidth * tubulacaoConfig.heightPercent) / 100}px`,
                  zIndex: 20 // Mais alto que todos os outros componentes
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


      {/* BOTÃO MOBILE - Posicionado na parte inferior da tela */}
      <button
        onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
        className="xl:hidden fixed bottom-20 right-4 z-50 px-4 py-3 bg-[#212E3E] text-white rounded-xl shadow-lg flex items-center gap-2 touch-manipulation transition-all duration-200"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <CogIcon className="w-3 h-3" />
        </div>
        <div className="text-left min-w-0">
          <div className="font-bold text-xs leading-tight">PARÂMETROS</div>
          <div className="text-xs opacity-80 leading-tight">Sistema</div>
        </div>
      </button>

      {/* BOTÃO DESKTOP - Posicionado na parte inferior da tela */}
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
          <div className="text-sm opacity-80">Eclusa Régua</div>
        </div>
      </button>

      {/* MODAL DE PARÂMETROS */}
      {menuParametrosOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-2 md:p-4 overflow-hidden"
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
              w-full max-w-sm max-h-[85vh] rounded-t-2xl
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