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
      verticalPercent: 42.7,    // % da altura total (posição Y)
      horizontalPercent: 70,  // % da largura total (posição X)
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 42.7,    // % da altura total (posição Y)
      horizontalPercent: 22,  // % da largura total (posição X)
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 36.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 85.3,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 36.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 6.8,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
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
    verticalPercent: 46,      // % da altura total (posição Y)
    horizontalPercent: 26,    // % da largura total (posição X) - ajustado para mobile
    widthPercent: 48,         // % da largura total (tamanho) - MAIOR no mobile
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
      horizontalPercent: 81.5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    },
    esquerdo: {
      verticalPercent: -4,      // % da altura total (posição Y)
      horizontalPercent: 5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    }
  }
};


const PortaJusante: React.FC<PortaJusanteProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = React.useState({ width: 1200, height: 600 }); // Valores iniciais estáveis
  const [windowDimensions, setWindowDimensions] = React.useState({ width: 1200, height: 800 }); // Valores iniciais estáveis
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  
  // ✅ DETECÇÃO MOBILE ESTÁVEL - baseada no viewport, não na window
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

  // ✅ USEEFFECT ESTABILIZADO - sem race conditions
  React.useEffect(() => {
    const updateDimensions = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      
      setWindowDimensions(prev => {
        // Só atualiza se a diferença for significativa (>50px) para evitar micro-ajustes
        if (Math.abs(prev.width - vw) > 50 || Math.abs(prev.height - vh) > 50) {
          return { width: vw, height: vh };
        }
        return prev;
      });
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newContainerDimensions = { width: rect.width, height: rect.height };
        
        setContainerDimensions(prev => {
          // Só atualiza se a diferença for significativa
          if (Math.abs(prev.width - newContainerDimensions.width) > 20 || 
              Math.abs(prev.height - newContainerDimensions.height) > 20) {
            return newContainerDimensions;
          }
          return prev;
        });
      }
    };
    
    // ✅ Delay inicial para garantir que o DOM esteja pronto
    const timeoutId = setTimeout(() => {
      updateDimensions();
      setIsInitialized(true);
    }, 100);
    
    // ✅ Debounce no resize para evitar cálculos excessivos
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
    };
  }, []);

  // ✅ CÁLCULOS ESTABILIZADOS COM VALORES MÍNIMOS SEGUROS
  const portaJusanteAspectRatio = 1075 / 1098; // Baseado no SVG real: width="1075" height="1098"
  
  // ✅ DIMENSÕES SEGURAS - com mínimos garantidos para evitar componentes minúsculos
  const safeContainerWidth = Math.max(containerDimensions.width, isMobile ? 350 : 800);
  const maxWidth = Math.min(safeContainerWidth - 32, 1920); // 32px = margem mínima
  
  // ✅ ESCALAS FIXAS E PREVISÍVEIS
  const portaScale = isMobile ? 85 : 55; // Escala fixa para evitar recálculos
  const basePortaWidth = Math.max((maxWidth * portaScale) / 100, isMobile ? 300 : 500); // Mínimos seguros
  const basePortaHeight = Math.max(basePortaWidth / portaJusanteAspectRatio, isMobile ? 250 : 400);
  
  // ✅ ALTURA TOTAL COM MÍNIMO GARANTIDO
  const alturaTotal = basePortaHeight;
  
  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData } = usePLC();
  
  // Extrair dados dos contrapesos, régua e motores do PLC
  const contrapesoDirectoRaw = plcData?.ints?.[41] || 0;   // Contrapeso direito (índice 40) - Valores: 376-675
  const contrapesoEsquerdoRaw = plcData?.ints?.[40] || 0;  // Contrapeso esquerdo (índice 41) - Valores: 376-675
  const reguaPortaJusanteRaw = plcData?.ints?.[39] || 0;   // Régua porta jusante (índice 39) - Valores: 431-14
  const motorDireito = plcData?.ints?.[28] || 0;           // Motor direito (índice 28)
  const motorEsquerdo = plcData?.ints?.[29] || 0;          // Motor esquerdo (índice 29)
  
  // 🔄 NORMALIZAR PARA 0-100%
  // Contrapesos: 376 (em cima/0%) -> 675 (embaixo/100%)
  const contrapesoDirecto = ((contrapesoDirectoRaw - 376) / (675 - 376)) * 100;
  const contrapesoEsquerdo = ((contrapesoEsquerdoRaw - 376) / (675 - 376)) * 100;
  
  // Régua Porta: 431 (em cima/0%) -> 14 (embaixo/100%) - INVERTIDO!
  const reguaPortaJusante = ((431 - reguaPortaJusanteRaw) / (431 - 14)) * 100;
  
  // Configuração responsiva SIMPLES - igual outros componentes
  const configAtual = isMobile ? CONTRAPESO_CONFIG.mobile : CONTRAPESO_CONFIG.desktop;
  const contrapesoDireitoConfig = configAtual.direito;
  const contrapesoEsquerdoConfig = configAtual.esquerdo;
  
  const reguaConfigAtual = isMobile ? REGUA_CONFIG.mobile : REGUA_CONFIG.desktop;
  
  const motorConfigAtual = isMobile ? MOTOR_CONFIG.mobile : MOTOR_CONFIG.desktop;
  const motorDireitoConfig = motorConfigAtual.direito;
  const motorEsquerdoConfig = motorConfigAtual.esquerdo;
  
  
  // CÁLCULO DO ESPAÇO DISPONÍVEL REAL - SEM CONSIDERAR SIDEBAR
  const larguraTotalTela = windowDimensions.width;
  const espacoUsadoPorComponentes = maxWidth; // Usar maxWidth que mantém o tamanho original
  const espacoSobrandoTotal = Math.max(0, larguraTotalTela - espacoUsadoPorComponentes);
  
  const espacoDisponivelEsquerda = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando
  const espacoDisponivelDireita = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando

  // Debug completo do espaço disponível
  console.log('📐 ESPAÇO DISPONÍVEL REAL:', {
    tela_largura: windowDimensions.width,
    container_largura: containerDimensions.width,
    sidebar_aberto: sidebarOpen,
    espaco_usado_componentes: espacoUsadoPorComponentes,
    componentes_largura_maxima: maxWidth,
    componentes_largura_real: basePortaWidth,
    espaco_sobrando_total: espacoSobrandoTotal,
    espaco_disponivel_esquerda: espacoDisponivelEsquerda,
    espaco_disponivel_direita: espacoDisponivelDireita,
    condicao_esquerda: espacoDisponivelEsquerda > 100,
    condicao_direita: espacoDisponivelDireita > 100 && windowDimensions.width >= 1500,
    config_usada: isMobile ? 'mobile' : 'desktop',
    isMobile: isMobile
  });

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

      {/* PAINEL INDUSTRIAL ISA-104 - ESQUERDA */}
      {!isMobile && espacoDisponivelEsquerda > 100 && (
        <div 
          className="absolute top-8 z-10 flex flex-col gap-4"
          style={{ 
            left: '16px',
            width: `${Math.max(380, Math.min(espacoDisponivelEsquerda - 20, 600))}px`,
            maxHeight: 'calc(100vh - 120px)'
          }}
        >
          {/* DADOS OPERACIONAIS - USANDO INFOCARD PADRÃO */}
          <InfoCard title="DADOS OPERACIONAIS" variant="industrial">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Posição Porta:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{(reguaPortaJusante * 12.5 / 100).toFixed(2)} <span className="text-xs text-gray-500">m</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Abertura:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{reguaPortaJusante}<span className="text-xs text-gray-500">%</span></span>
              </div>
              
              <div className="border-t border-gray-600 my-3"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Diferença E/D:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span className="text-xs text-gray-500">mm</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Contrapeso E:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{contrapesoEsquerdo}<span className="text-xs text-gray-500">%</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Contrapeso D:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{contrapesoDirecto}<span className="text-xs text-gray-500">%</span></span>
              </div>
              
              <div className="border-t border-gray-600 my-3"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Velocidade:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">{(Math.random() * 0.5 + 0.1).toFixed(2)} <span className="text-xs text-gray-500">m/s</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Velocidade Nominal:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">0.25 <span className="text-xs text-gray-500">m/s</span></span>
              </div>
            </div>
          </InfoCard>

          {/* STATUS OPERACIONAIS - USANDO STATUSCARD PADRÃO */}
          <div className="flex flex-col gap-2">
            <StatusCard 
              title="COMANDO EM AUTOMÁTICO"
              variant="automatic"
            />
            
            <StatusCard 
              title="IGUALDADE DE NÍVEIS PRESENTE"
              variant="success"
            />
            
            <StatusCard 
              title="FALTA IGUALDADE DE NÍVEIS"
              variant="error"
            />
          </div>
        </div>
      )}

      {/* PAINEL INDUSTRIAL ISA-104 - DIREITA */}
      {!isMobile && espacoDisponivelDireita > 100 && windowDimensions.width >= 1500 && (
        <div 
          className="absolute top-8 z-10 flex flex-col gap-4"
          style={{ 
            right: '16px',
            width: `${Math.max(380, Math.min(espacoDisponivelDireita - 20, 600))}px`,
            maxHeight: 'calc(100vh - 120px)'
          }}
        >
          {/* MOTORES - USANDO INFOCARD PADRÃO */}
          <InfoCard title="MOTORES" variant="motor">
            {/* MOTOR DIREITO */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">MOTOR DIREITO</div>
                <div className={`w-3 h-3 rounded-full ${motorDireito === 1 ? 'bg-green-500' : motorDireito === 2 ? 'bg-red-500' : 'bg-gray-500'}`}></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-mono font-bold text-[#212E3E]">
                  {Math.round(1450 + Math.random() * 100)} <span className="text-xs text-gray-500">RPM</span>
                </div>
                <div className="text-lg font-mono font-bold text-[#212E3E]">
                  {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-xs text-gray-500">A</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-600 my-3"></div>

            {/* MOTOR ESQUERDO */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">MOTOR ESQUERDO</div>
                <div className={`w-3 h-3 rounded-full ${motorEsquerdo === 1 ? 'bg-green-500' : motorEsquerdo === 2 ? 'bg-red-500' : 'bg-gray-500'}`}></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-mono font-bold text-[#212E3E]">
                  {Math.round(1450 + Math.random() * 100)} <span className="text-xs text-gray-500">RPM</span>
                </div>
                <div className="text-lg font-mono font-bold text-[#212E3E]">
                  {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-xs text-gray-500">A</span>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* SISTEMA STATUS - USANDO INFOCARD PADRÃO */}
          <InfoCard title="SISTEMA" variant="system">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Pressão:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">2.4 <span className="text-xs text-gray-500">bar</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Temperatura:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">24.5<span className="text-xs text-gray-500">°C</span></span>
              </div>
              
              <div className="border-t border-gray-600 my-3"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Vibração:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">NORMAL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Status Geral:</span>
                <span className="text-lg font-mono font-bold text-[#212E3E]">OPERACIONAL</span>
              </div>
            </div>
          </InfoCard>
        </div>
      )}


      {/* BOTÃO MOBILE - Mesmo estilo do desktop, porém menor (abaixo de 1024px) */}
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
          <div className="text-xs opacity-80 leading-tight">Porta Jusante</div>
        </div>
      </button>

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

        {isInitialized && containerDimensions.width > 100 && windowDimensions.width > 0 ? (
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
              <ContraPeso60t 
                websocketValue={contrapesoDirecto}
                editMode={false}
              />
            </div>

            {/* 🎯 CONTRAPESO ESQUERDO - COM MOVIMENTO PROPORCIONAL */}
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
              <ContraPeso60t 
                websocketValue={contrapesoEsquerdo}
                editMode={false}
              />
            </div>

            {/* 📏 RÉGUA PORTA JUSANTE - WEBSOCKET ÍNDICE 39 */}
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
              <PortaJusanteRegua 
                websocketValue={reguaPortaJusante}
                editMode={false}
              />
            </div>

            {/* ⚙️ MOTOR DIREITO - WEBSOCKET ÍNDICE 28 */}
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
              <MotorJusante 
                websocketValue={motorDireito}
                editMode={false}
                direction="left"
              />
            </div>

            {/* ⚙️ MOTOR ESQUERDO - WEBSOCKET ÍNDICE 29 - ESPELHADO */}
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
              <MotorJusante 
                websocketValue={motorEsquerdo}
                editMode={false}
                direction="right"
              />
            </div>

            {/* 🚪 INDICADOR STATUS PORTA - ÚNICO (CONDICIONAL) */}
            {reguaPortaJusante >= 95 && (
              <div 
                className="absolute flex items-center justify-center z-20"
                style={{
                  top: `${(alturaTotal * 5) / 100}px`, // 5% do topo
                  left: `${(maxWidth * 42) / 100}px`, // Centralizado
                  width: `${(maxWidth * 16) / 100}px`, // Mais largo
                  height: `${(alturaTotal * 6) / 100}px` // Menor altura
                }}
              >
                <div className="bg-green-600 border border-green-500 rounded-md p-3 w-full">
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#212E3E] uppercase tracking-wide">
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
                  bottom: `${(alturaTotal * 5) / 100}px`, // 5% do fundo
                  left: `${(maxWidth * 42) / 100}px`, // Centralizado
                  width: `${(maxWidth * 16) / 100}px`, // Mais largo
                  height: `${(alturaTotal * 6) / 100}px` // Menor altura
                }}
              >
                <div className="bg-yellow-600 border border-yellow-500 rounded-md p-3 w-full">
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#212E3E] uppercase tracking-wide">
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