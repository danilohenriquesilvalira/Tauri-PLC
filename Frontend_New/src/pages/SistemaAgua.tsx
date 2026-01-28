import React from 'react';
import { sistemaReducer, estadoInicial, SistemaState } from '../model/sistemaModel';
import BombaPressurizacao from '../components/Sistema_Agua/Bomba_Pressurizacao';
import Condutivimetro from '../components/Sistema_Agua/Condutivimetro';
import DepositoEntrada from '../components/Sistema_Agua/Deposito_entrada';
import FiltroCarvao from '../components/Sistema_Agua/Filtro_Carvao';
import Redox from '../components/Sistema_Agua/Redox';
import ColunaPolimento from '../components/Sistema_Agua/Colunapolimetro';
import InibidorIncrustacao from '../components/Sistema_Agua/Depositivo_boia'; // Renamed conceptually in UI
import Filtro from '../components/Sistema_Agua/Filtro';
import MicroFiltracao from '../components/Sistema_Agua/MicroFiltracao';
import Circuito from '../components/Sistema_Agua/Pipe_Sistema';
import SistemaOsmose from '../components/Sistema_Agua/Sistema_Osmose';

interface SistemaAguaProps {
  sidebarOpen?: boolean;
}

// ============================================
// TIPOS
// ============================================
type ModoOperacao = 'PARADO' | 'AUTOMATICO';

// ============================================
// CONFIGURAÇÕES DE POSICIONAMENTO (DESKTOP E MOBILE)
// ============================================
const BOMBA_CONFIG = {
  desktop: { verticalPercent: 57.6, horizontalPercent: -39.7, widthPercent: 100, heightPercent: 12 },
  mobile: { verticalPercent: 70, horizontalPercent: 5, widthPercent: 20, heightPercent: 12 }
};

const CONDUTIVIMETRO_CONFIG = {
  desktop: { verticalPercent: 51, horizontalPercent: 15.8, widthPercent: 100, heightPercent: 12 },
  mobile: { verticalPercent: 85, horizontalPercent: 5, widthPercent: 15, heightPercent: 10 }
};

const DEPOSITO_CONFIG = {
  desktop: { verticalPercent: 6, horizontalPercent: -50, widthPercent: 100, heightPercent: 40 },
  mobile: { verticalPercent: 5, horizontalPercent: 25, widthPercent: 25, heightPercent: 40 }
};

const FILTRO_CARVAO_CONFIG = {
  desktop: { verticalPercent: 20.6, horizontalPercent: -10.2, widthPercent: 100, heightPercent: 40 },
  mobile: { verticalPercent: 50, horizontalPercent: 55, widthPercent: 12, heightPercent: 35 }
};

const REDOX_CONFIG = {
  desktop: { verticalPercent: -1.9, horizontalPercent: 15.5, widthPercent: 100, heightPercent: 16 },
  mobile: { verticalPercent: 85, horizontalPercent: 25, widthPercent: 15, heightPercent: 15 }
};

const COLUNA_POLIMENTO_CONFIG = {
  desktop: { verticalPercent: 62.5, horizontalPercent: 39.6, widthPercent: 100, heightPercent: 40 },
  mobile: { verticalPercent: 50, horizontalPercent: 70, widthPercent: 12, heightPercent: 35 }
};

const DEPOSITO_BOIA_CONFIG = {
  desktop: { verticalPercent: 25.5, horizontalPercent: 25, widthPercent: 100, heightPercent: 19 },
  mobile: { verticalPercent: 85, horizontalPercent: 45, widthPercent: 15, heightPercent: 20 }
};

const FILTRO_CONFIG = {
  desktop: { verticalPercent: 12, horizontalPercent: -22.3, widthPercent: 100, heightPercent: 18 },
  mobile: { verticalPercent: 50, horizontalPercent: 70, widthPercent: 10, heightPercent: 20 }
};

const FILTRO_CONFIG_2 = {
  desktop: { verticalPercent: 35.5, horizontalPercent: -22.3, widthPercent: 100, heightPercent: 18 },
  mobile: { verticalPercent: 50, horizontalPercent: 80, widthPercent: 10, heightPercent: 20 }
};

const FILTRO_CONFIG_3 = {
  desktop: { verticalPercent: 12, horizontalPercent: 2.6, widthPercent: 100, heightPercent: 18 },
  mobile: { verticalPercent: 60, horizontalPercent: 70, widthPercent: 10, heightPercent: 20 }
};

const FILTRO_CONFIG_4 = {
  desktop: { verticalPercent: 35.5, horizontalPercent: 2.6, widthPercent: 100, heightPercent: 18 },
  mobile: { verticalPercent: 60, horizontalPercent: 80, widthPercent: 10, heightPercent: 20 }
};

const MICROFILTRACAO_CONFIG = {
  desktop: { verticalPercent: 63.4, horizontalPercent: 27.3, widthPercent: 100, heightPercent: 26 },
  mobile: { verticalPercent: 25, horizontalPercent: 5, widthPercent: 8, heightPercent: 20 }
};

const SISTEMA_OSMOSE_CONFIG = {
  desktop: { verticalPercent: -1.4, horizontalPercent: 41.0, widthPercent: 100, heightPercent: 46 },
  mobile: { verticalPercent: 5, horizontalPercent: 55, widthPercent: 40, heightPercent: 45 }
};

const CIRCUITO_CONFIG = {
  desktop: { verticalPercent: 0, horizontalPercent: 0, widthPercent: 100, heightPercent: 100 },
  mobile: { verticalPercent: 0, horizontalPercent: 0, widthPercent: 100, heightPercent: 100 }
};

// ============================================
// PARÂMETROS DE SIMULAÇÃO
// ============================================
const SIM = {
  velocidadeEnchimento: 1.5,
  velocidadeEsvaziamento: 0.8,
  velocidadeTransferencia: 1.2,
  nivelMinimo: 15,
  nivelMaximo: 98,
  nivelBoia: 75,
  intervalo: 80,
};

const SistemaAgua: React.FC<SistemaAguaProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);


  // ESTADO ÚNICO INDUSTRIAL
  const [state, dispatch] = React.useReducer(sistemaReducer, estadoInicial);
  const [modo, setModo] = React.useState<ModoOperacao>('PARADO');
  const [ciclos, setCiclos] = React.useState(0);
  const [velocidade, setVelocidade] = React.useState(1);
  const [showParams, setShowParams] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  const addLog = React.useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  // ============================================
  // SIMULAÇÃO CONTÍNUA - SISTEMA REAL
  // ============================================
  // O sistema funciona assim na realidade:
  // 1. Água entra continuamente no Depósito de Entrada
  // 2. Quando tem água suficiente, a Bomba puxa e envia para filtros
  // 3. Água passa pelos filtros em sequência (processo contínuo)
  // 4. Osmose e Redox processam a água
  // 5. Água tratada vai para Depósito intermediário (com boia)
  // 6. Do depósito, passa pelo condutivímetro e micro filtração
  // 7. Polimento final e entrega no ponto de uso
  // É um FLUXO CONTÍNUO - não tem etapas que param e reiniciam!

  React.useEffect(() => {
    if (modo !== 'AUTOMATICO') return;
    const timer = setInterval(() => {
      dispatch({ type: 'TICK', velocidade });
    }, 100);
    return () => clearInterval(timer);
  }, [modo, velocidade]);

  // ============================================
  // LOG INICIAL
  // ============================================
  React.useEffect(() => {
    if (modo === 'AUTOMATICO' && logs.length === 0) {
      addLog('🚀 Sistema iniciado em modo contínuo');
      addLog('💧 Alimentação de água ativa');
      addLog('⚙️ Processo de tratamento em operação');
    }
  }, [modo, logs.length, addLog]);
  // ============================================
  // CONTROLES
  // ============================================
  const iniciar = () => {
    addLog('▶️ Sistema INICIADO - Modo contínuo ativo');
    setModo('AUTOMATICO');
    setLogs([]);
  };

  const parar = () => {
    addLog('⏹️ Sistema PARADO');
    setModo('PARADO');
  };

  const resetar = () => {
    setModo('PARADO');
    setCiclos(0);
    dispatch({ type: 'RESET' });
    setLogs(['🔄 Sistema resetado - Pronto para iniciar']);
  };
  // ============================================
  // RESPONSIVIDADE
  // ============================================
  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    const aspectRatio = 16 / 9;
    const availableWidth = windowWidth - 32;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 800;

    let baseWidth = Math.min(availableWidth, 1920);
    let baseHeight = baseWidth / aspectRatio;

    if (baseHeight > availableHeight) {
      baseHeight = availableHeight;
      baseWidth = baseHeight * aspectRatio;
    }

    const scale = isMobile ? 0.95 : 0.85;
    return {
      isMobile,
      baseWidth: baseWidth * scale,
      baseHeight: baseHeight * scale
    };
  }, [windowWidth]);

  const { isMobile, baseWidth, baseHeight } = dimensions;

  // Configs responsivas
  const bombaConfig = isMobile ? BOMBA_CONFIG.mobile : BOMBA_CONFIG.desktop;
  const condutivimetroConfig = isMobile ? CONDUTIVIMETRO_CONFIG.mobile : CONDUTIVIMETRO_CONFIG.desktop;
  const depositoConfig = isMobile ? DEPOSITO_CONFIG.mobile : DEPOSITO_CONFIG.desktop;
  const filtroCarvaoConfig = isMobile ? FILTRO_CARVAO_CONFIG.mobile : FILTRO_CARVAO_CONFIG.desktop;
  const redoxConfig = isMobile ? REDOX_CONFIG.mobile : REDOX_CONFIG.desktop;
  const colunaPolimentoConfig = isMobile ? COLUNA_POLIMENTO_CONFIG.mobile : COLUNA_POLIMENTO_CONFIG.desktop;
  const depositoBoiaConfig = isMobile ? DEPOSITO_BOIA_CONFIG.mobile : DEPOSITO_BOIA_CONFIG.desktop;
  const filtroConfig = isMobile ? FILTRO_CONFIG.mobile : FILTRO_CONFIG.desktop;
  const filtroConfig2 = isMobile ? FILTRO_CONFIG_2.mobile : FILTRO_CONFIG_2.desktop;
  const filtroConfig3 = isMobile ? FILTRO_CONFIG_3.mobile : FILTRO_CONFIG_3.desktop;
  const filtroConfig4 = isMobile ? FILTRO_CONFIG_4.mobile : FILTRO_CONFIG_4.desktop;
  const microFiltracaoConfig = isMobile ? MICROFILTRACAO_CONFIG.mobile : MICROFILTRACAO_CONFIG.desktop;
  const sistemaOsmoseConfig = isMobile ? SISTEMA_OSMOSE_CONFIG.mobile : SISTEMA_OSMOSE_CONFIG.desktop;
  const circuitoConfig = isMobile ? CIRCUITO_CONFIG.mobile : CIRCUITO_CONFIG.desktop;

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // RENDER
  // ============================================
  const getStatusColor = () => {
    return modo === 'AUTOMATICO' ? '#22c55e' : '#6b7280';
  };

  const getStatusText = () => {
    return modo === 'AUTOMATICO' ? 'OPERANDO' : 'PARADO';
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-transparent">
      <div className="w-full h-full flex items-center justify-center">

        {/* Container Central */}
        <div className="relative" style={{ width: `${baseWidth}px`, height: `${baseHeight}px` }}>

          {/* CIRCUITO/PIPES */}
          <div className="absolute" style={{
            top: 0, left: 0, width: '100%', height: '100%', zIndex: 1
          }}>
            <Circuito
              trecho1={state.trechos.t1}
              trecho2={state.trechos.t2}
              trecho3={state.trechos.t3}
              trecho4={state.trechos.t4}
              trecho5={state.trechos.t5}
              trecho6={state.trechos.t6}
              trecho7={state.trechos.t7}
            />
          </div>

          {/* DEPOSITO ENTRADA */}
          <div className="absolute" style={{
            top: `${(baseHeight * depositoConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * depositoConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * depositoConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * depositoConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <DepositoEntrada websocketValue={state.nivelEntrada} side="esquerdo" />
          </div>

          {/* BOMBA */}
          <div className="absolute" style={{
            top: `${(baseHeight * bombaConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * bombaConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * bombaConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * bombaConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <BombaPressurizacao websocketValue={state.bombaLigada ? 1 : 0} side="esquerdo" />
          </div>

          {/* FILTRO 1 */}
          <div className="absolute" style={{
            top: `${(baseHeight * filtroConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * filtroConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * filtroConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * filtroConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Filtro side="esquerdo" />
          </div>

          {/* FILTRO 2 */}
          <div className="absolute" style={{
            top: `${(baseHeight * filtroConfig2.verticalPercent) / 100}px`,
            left: `${(baseWidth * filtroConfig2.horizontalPercent) / 100}px`,
            width: `${(baseWidth * filtroConfig2.widthPercent) / 100}px`,
            height: `${(baseHeight * filtroConfig2.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Filtro side="esquerdo" />
          </div>

          {/* FILTRO CARVÃO */}
          <div className="absolute" style={{
            top: `${(baseHeight * filtroCarvaoConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * filtroCarvaoConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * filtroCarvaoConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * filtroCarvaoConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <FiltroCarvao websocketValue={state.bombaLigada ? 1 : 0} side="esquerdo" />
          </div>

          {/* FILTRO 3 */}
          <div className="absolute" style={{
            top: `${(baseHeight * filtroConfig3.verticalPercent) / 100}px`,
            left: `${(baseWidth * filtroConfig3.horizontalPercent) / 100}px`,
            width: `${(baseWidth * filtroConfig3.widthPercent) / 100}px`,
            height: `${(baseHeight * filtroConfig3.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Filtro side="esquerdo" />
          </div>

          {/* FILTRO 4 */}
          <div className="absolute" style={{
            top: `${(baseHeight * filtroConfig4.verticalPercent) / 100}px`,
            left: `${(baseWidth * filtroConfig4.horizontalPercent) / 100}px`,
            width: `${(baseWidth * filtroConfig4.widthPercent) / 100}px`,
            height: `${(baseHeight * filtroConfig4.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Filtro side="esquerdo" />
          </div>

          {/* REDOX */}
          <div className="absolute" style={{
            top: `${(baseHeight * redoxConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * redoxConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * redoxConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * redoxConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Redox websocketValue={state.redox} side="esquerdo" />
          </div>

          {/* SISTEMA OSMOSE */}
          <div className="absolute" style={{
            top: `${(baseHeight * sistemaOsmoseConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * sistemaOsmoseConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * sistemaOsmoseConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * sistemaOsmoseConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <SistemaOsmose side="esquerdo" />
          </div>

          {/* INIBIDOR INCRUSTAÇÃO */}
          <div className="absolute" style={{
            top: `${(baseHeight * depositoBoiaConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * depositoBoiaConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * depositoBoiaConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * depositoBoiaConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <InibidorIncrustacao nivel={state.nivelDosador} boiaAtiva={true} side="esquerdo" />
          </div>

          {/* CONDUTIVIMETRO */}
          <div className="absolute" style={{
            top: `${(baseHeight * condutivimetroConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * condutivimetroConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * condutivimetroConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * condutivimetroConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <Condutivimetro websocketValue={state.condutividade} side="esquerdo" />
          </div>

          {/* MICRO FILTRAÇÃO */}
          <div className="absolute" style={{
            top: `${(baseHeight * microFiltracaoConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * microFiltracaoConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * microFiltracaoConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * microFiltracaoConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <MicroFiltracao side="esquerdo" />
          </div>

          {/* COLUNA POLIMENTO */}
          <div className="absolute" style={{
            top: `${(baseHeight * colunaPolimentoConfig.verticalPercent) / 100}px`,
            left: `${(baseWidth * colunaPolimentoConfig.horizontalPercent) / 100}px`,
            width: `${(baseWidth * colunaPolimentoConfig.widthPercent) / 100}px`,
            height: `${(baseHeight * colunaPolimentoConfig.heightPercent) / 100}px`,
            zIndex: 10
          }}>
            <ColunaPolimento side="esquerdo" />
          </div>

          {/* ============================================ */}
          {/* BARRA INFERIOR - BOTÕES + VALORES */}
          {/* ============================================ */}
          {/* ============================================ */}
          {/* PAINEL DE CONTROLE UNIFICADO (CENTRALIZADO) */}
          {/* ============================================ */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-[98%] sm:w-auto">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-2 flex flex-wrap md:flex-nowrap justify-center items-center gap-2 md:gap-3 transition-all">

              {/* SEÇÃO 1: BOTÕES DE COMANDO */}
              <div className="flex items-center gap-2">
                {/* Home */}
                <button className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all border border-gray-200 text-gray-600 shadow-sm active:scale-95">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </button>

                {/* Alarme */}
                <button className="w-10 h-10 bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-200 rounded-xl flex items-center justify-center transition-all text-gray-800 active:scale-95">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </button>

                <div className="h-6 w-px bg-gray-300 mx-1"></div>

                {/* Play/Iniciar */}
                <button onClick={iniciar} disabled={modo === 'AUTOMATICO'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 ${modo === 'AUTOMATICO' ? 'bg-green-500 ring-2 ring-green-200 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>

                {/* Stop/Parar */}
                <button onClick={parar} disabled={modo === 'PARADO'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 ${modo === 'PARADO' ? 'bg-gray-200 text-gray-400' : 'bg-red-500 hover:bg-red-400 text-white'
                    }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>

                {/* Reset */}
                <button onClick={resetar} className="w-10 h-10 bg-orange-500 hover:bg-orange-400 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  </svg>
                </button>

                {/* Config */}
                <button onClick={() => setShowParams(!showParams)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm active:scale-95 ${showParams ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              {/* DIVISOR VISUAL */}
              <div className="hidden md:block h-8 w-px bg-gray-200"></div>

              {/* SEÇÃO 2: VALORES DOS SENSORES */}
              <div className="flex items-center gap-5 px-2">

                {/* Entrada */}
                <div className="flex flex-col items-center min-w-[50px]">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Entrada</span>
                  <div className="text-sm font-mono font-bold text-blue-600 leading-none">{state.nivelEntrada.toFixed(0)}%</div>
                  <div className="w-10 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${state.nivelEntrada}%` }} />
                  </div>
                </div>

                {/* Redox */}
                <div className="flex flex-col items-center min-w-[50px] border-l border-gray-100 pl-3">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Redox</span>
                  <div className="text-sm font-mono font-bold text-emerald-600 leading-none">{state.redox.toFixed(0)}</div>
                  <span className="text-[8px] text-gray-400 mt-0.5">mV</span>
                </div>

                {/* Condutividade */}
                <div className="flex flex-col items-center min-w-[50px] border-l border-gray-100 pl-3">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Cond.</span>
                  <div className="text-sm font-mono font-bold text-amber-600 leading-none">{state.condutividade.toFixed(2)}</div>
                  <span className="text-[8px] text-gray-400 mt-0.5">µS</span>
                </div>

                {/* Inibidor (Antigo Depósito Boia) */}
                <div className="flex flex-col items-center min-w-[50px] border-l border-gray-100 pl-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Inibidor</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-purple-600 leading-none">{state.nivelDosador.toFixed(0)}%</div>
                  <div className="w-10 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${state.nivelDosador}%` }} />
                  </div>
                </div>

                {/* Tanque Intermediário (Boia) */}
                <div className="flex flex-col items-center min-w-[50px] border-l border-gray-100 pl-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tanque</span>
                    {state.boiaTanqueCheio && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                  </div>
                  <div className="text-sm font-mono font-bold text-cyan-600 leading-none">{state.nivelTanquePressurizado.toFixed(0)}%</div>
                  <div className="w-10 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${state.nivelTanquePressurizado}%` }} />
                  </div>
                </div>

                {/* PT Saída */}
                <div className="flex flex-col items-center min-w-[50px] border-l border-gray-100 pl-3 pr-2">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Saída PT</span>
                  <div className="text-lg font-mono font-bold text-indigo-600 leading-none">{state.pressaoSaida.toFixed(1)}</div>
                  <span className="text-[8px] text-gray-400 mt-0.5">bar</span>
                </div>
              </div>

              {/* STATUS COMPACTO */}
              <div className="hidden lg:flex flex-col items-end pl-3 border-l border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${modo === 'AUTOMATICO' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-[10px] font-bold text-gray-700 leading-none">{modo === 'AUTOMATICO' ? 'ON' : 'OFF'}</span>
                </div>
                <span className="text-[9px] text-gray-400 leading-none mt-1">Ciclos: {ciclos}</span>
              </div>
            </div>
          </div>

          {/* PAINEL CONFIG (popup) */}
          {showParams && (
            <div className="absolute bottom-24 left-4 z-50 bg-white rounded-xl shadow-2xl p-4 w-64 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-800 text-sm">Configurações</span>
                <button onClick={() => setShowParams(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Velocidade</span>
                    <span className="font-bold text-blue-600">{velocidade}x</span>
                  </div>
                  <input type="range" min="0.5" max="5" step="0.5" value={velocidade}
                    onChange={(e) => setVelocidade(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-500" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Nível Entrada</span>
                    <span className="font-bold text-cyan-600">{state.nivelEntrada.toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={state.nivelEntrada}
                    onChange={(e) => dispatch({ type: 'SET_NIVEL_ENTRADA', valor: Number(e.target.value) })}
                    disabled={modo === 'AUTOMATICO'}
                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-cyan-500 disabled:opacity-40" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Nível Inibidor</span>
                    <span className="font-bold text-purple-600">{state.nivelDosador.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-purple-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${state.nivelDosador}%` }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Tubulações</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <div key={n} className="flex-1 text-center">
                        <div className={`h-3 rounded ${state.trechos[`t${n}` as keyof SistemaState['trechos']] ? 'bg-cyan-400' : 'bg-gray-200'}`} />
                        <span className="text-[8px] text-gray-400">T{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div >
  );
};

export default SistemaAgua;