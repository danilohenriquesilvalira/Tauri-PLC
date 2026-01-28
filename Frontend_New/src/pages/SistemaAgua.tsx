import React, { useEffect, useReducer, useState, useRef, useMemo } from 'react';
import { sistemaReducer, estadoInicial, SistemaState, getStatusGeral, formatarTempo } from '../model/sistemaModel';
import BombaPressurizacao from '../components/Sistema_Agua/Bomba_Pressurizacao';
import Condutivimetro from '../components/Sistema_Agua/Condutivimetro';
import DepositoEntrada from '../components/Sistema_Agua/Deposito_entrada';
import FiltroCarvao from '../components/Sistema_Agua/Filtro_Carvao';
import Redox from '../components/Sistema_Agua/Redox';
import ColunaPolimento from '../components/Sistema_Agua/Colunapolimetro';
import InibidorIncrustacao from '../components/Sistema_Agua/Depositivo_boia';
import Filtro from '../components/Sistema_Agua/Filtro';
import MicroFiltracao from '../components/Sistema_Agua/MicroFiltracao';
import Circuito from '../components/Sistema_Agua/Pipe_Sistema';
import SistemaOsmose from '../components/Sistema_Agua/Sistema_Osmose';

interface SistemaAguaProps {
  sidebarOpen?: boolean;
}

type ModoOperacao = 'PARADO' | 'AUTOMATICO';

// ============================================
// CONFIGURAÇÕES DE POSICIONAMENTO
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

// ============================================
// ÍCONES SVG MODERNOS
// ============================================
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M6 6h12v12H6z" />
  </svg>
);

const ResetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CycleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const SpeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const DropletIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const GaugeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 2v4" />
    <path d="m16.2 7.8 2.9-2.9" />
    <path d="M18 12h4" />
    <path d="m16.2 16.2 2.9 2.9" />
    <path d="M12 18v4" />
    <path d="m4.9 19.1 2.9-2.9" />
    <path d="M2 12h4" />
    <path d="m4.9 4.9 2.9 2.9" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

// ============================================
// COMPONENTE LED MODERNO
// ============================================
const LED: React.FC<{
  on: boolean;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'cyan' | 'purple' | 'orange';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}> = ({ on, color, pulse = false, size = 'md', label }) => {
  const colors = {
    green: { on: 'bg-emerald-500 shadow-emerald-500/60', off: 'bg-emerald-900/40' },
    red: { on: 'bg-red-500 shadow-red-500/60', off: 'bg-red-900/40' },
    yellow: { on: 'bg-amber-400 shadow-amber-400/60', off: 'bg-amber-900/40' },
    blue: { on: 'bg-blue-500 shadow-blue-500/60', off: 'bg-blue-900/40' },
    cyan: { on: 'bg-cyan-500 shadow-cyan-500/60', off: 'bg-cyan-900/40' },
    purple: { on: 'bg-purple-500 shadow-purple-500/60', off: 'bg-purple-900/40' },
    orange: { on: 'bg-orange-500 shadow-orange-500/60', off: 'bg-orange-900/40' },
  };

  const sizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`
        ${sizes[size]} rounded-full transition-all duration-300
        ${on ? colors[color].on + ' shadow-lg' : colors[color].off}
        ${on && pulse ? 'animate-pulse' : ''}
      `} />
      {label && <span className="text-xs text-gray-600 font-medium">{label}</span>}
    </div>
  );
};

// ============================================
// COMPONENTE VALOR COM BARRA
// ============================================
const ValueDisplay: React.FC<{
  label: string;
  value: number;
  unit: string;
  max?: number;
  color: string;
  barColor: string;
  hasAlarm?: boolean;
  hasOverride?: boolean;
  onClick?: () => void;
}> = ({ label, value, unit, max = 100, color, barColor, hasAlarm, hasOverride, onClick }) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-xl p-3 min-w-[100px] border border-gray-100
        ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md active:scale-[0.98]' : ''}
        transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {hasOverride && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Override Ativo" />
        )}
        {hasAlarm && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Alarme" />
        )}
      </div>

      {/* Valor */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-2xl font-bold font-mono ${hasAlarm ? 'text-red-600' : color}`}>
          {value < 10 ? value.toFixed(2) : value.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400 font-medium">{unit}</span>
      </div>

      {/* Barra de Progresso */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${hasAlarm ? 'bg-red-500' : barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE BOTÃO DE AÇÃO
// ============================================
const ActionBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant: 'play' | 'stop' | 'reset' | 'settings' | 'monitor';
  children: React.ReactNode;
}> = ({ onClick, disabled, active, variant, children }) => {
  const variants = {
    play: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30',
    stop: 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30',
    reset: 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30',
    settings: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-gray-200/50',
    monitor: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-gray-200/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-12 h-12 rounded-xl flex items-center justify-center
        transition-all duration-200 shadow-lg
        active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed
        ${active ? 'bg-emerald-500 hover:bg-emerald-400 text-white ring-4 ring-emerald-200 shadow-emerald-500/30' : variants[variant]}
      `}
    >
      {children}
    </button>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const SistemaAgua: React.FC<SistemaAguaProps> = ({ sidebarOpen = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado
  const [state, dispatch] = useReducer(sistemaReducer, estadoInicial);
  const [modo, setModo] = useState<ModoOperacao>('PARADO');
  const [velocidade, setVelocidade] = useState(1);
  const [showConfig, setShowConfig] = useState(false);
  const [showDiagnostico, setShowDiagnostico] = useState(false);
  const [sensorPopup, setSensorPopup] = useState<'redox' | 'condutividade' | 'pressao' | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // Cálculos
  const statusGeral = getStatusGeral(state);

  // Simulação
  useEffect(() => {
    if (modo !== 'AUTOMATICO') return;
    const timer = setInterval(() => dispatch({ type: 'TICK', velocidade }), 100);
    return () => clearInterval(timer);
  }, [modo, velocidade]);

  // Responsividade
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dimensions = useMemo(() => {
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const aspectRatio = 16 / 9;
    const availableWidth = windowWidth - (isMobile ? 16 : 32);
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - (isMobile ? 200 : 180) : 800;

    let baseWidth = Math.min(availableWidth, 1920);
    let baseHeight = baseWidth / aspectRatio;

    if (baseHeight > availableHeight) {
      baseHeight = availableHeight;
      baseWidth = baseHeight * aspectRatio;
    }

    const scale = isMobile ? 0.98 : isTablet ? 0.92 : 0.85;
    return { isMobile, isTablet, baseWidth: baseWidth * scale, baseHeight: baseHeight * scale };
  }, [windowWidth]);

  const { isMobile, isTablet, baseWidth, baseHeight } = dimensions;
  const getConfig = (config: { desktop: any; mobile: any }) => isMobile ? config.mobile : config.desktop;

  // Controles
  const iniciar = () => setModo('AUTOMATICO');
  const parar = () => setModo('PARADO');
  const resetar = () => { setModo('PARADO'); dispatch({ type: 'RESET' }); };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full h-full flex flex-col">

        {/* ÁREA DO DIAGRAMA */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
          <div className="relative" style={{ width: `${baseWidth}px`, height: `${baseHeight}px` }}>

            {/* CIRCUITO */}
            <div className="absolute inset-0 z-[1]">
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

            {/* COMPONENTES */}
            {[
              { Component: DepositoEntrada, config: DEPOSITO_CONFIG, props: { websocketValue: state.nivelEntrada, side: "esquerdo" } },
              { Component: BombaPressurizacao, config: BOMBA_CONFIG, props: { websocketValue: state.bombaRecirculacao ? 1 : 0, side: "esquerdo" } },
              { Component: Filtro, config: FILTRO_CONFIG, props: { side: "esquerdo" } },
              { Component: Filtro, config: FILTRO_CONFIG_2, props: { side: "esquerdo" } },
              { Component: FiltroCarvao, config: FILTRO_CARVAO_CONFIG, props: { websocketValue: state.bombaRecirculacao ? 1 : 0, side: "esquerdo" } },
              { Component: Filtro, config: FILTRO_CONFIG_3, props: { side: "esquerdo" } },
              { Component: Filtro, config: FILTRO_CONFIG_4, props: { side: "esquerdo" } },
              { Component: Redox, config: REDOX_CONFIG, props: { websocketValue: state.redox, side: "esquerdo" } },
              { Component: SistemaOsmose, config: SISTEMA_OSMOSE_CONFIG, props: { side: "esquerdo" } },
              { Component: InibidorIncrustacao, config: DEPOSITO_BOIA_CONFIG, props: { nivel: state.nivelDosador, boiaAtiva: true, side: "esquerdo" } },
              { Component: Condutivimetro, config: CONDUTIVIMETRO_CONFIG, props: { websocketValue: state.condutividade, side: "esquerdo" } },
              { Component: MicroFiltracao, config: MICROFILTRACAO_CONFIG, props: { side: "esquerdo" } },
              { Component: ColunaPolimento, config: COLUNA_POLIMENTO_CONFIG, props: { side: "esquerdo" } },
            ].map(({ Component, config, props }, idx) => {
              const cfg = getConfig(config);
              return (
                <div key={idx} className="absolute z-10" style={{
                  top: `${(baseHeight * cfg.verticalPercent) / 100}px`,
                  left: `${(baseWidth * cfg.horizontalPercent) / 100}px`,
                  width: `${(baseWidth * cfg.widthPercent) / 100}px`,
                  height: `${(baseHeight * cfg.heightPercent) / 100}px`,
                }}>
                  <Component {...props} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================ */}
        {/* PAINEL DE CONTROLE INFERIOR */}
        {/* ============================================ */}
        <div className="shrink-0 px-2 sm:px-4 pb-2 sm:pb-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

            {/* LINHA PRINCIPAL */}
            <div className="p-3 sm:p-4 flex flex-wrap lg:flex-nowrap items-center gap-3 sm:gap-4">

              {/* STATUS BOX */}
              <div className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center shrink-0
                transition-all duration-300
                ${statusGeral === 'OPERANDO' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : ''}
                ${statusGeral === 'PARADO' ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' : ''}
                ${statusGeral === 'ALARME' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white animate-pulse' : ''}
                ${statusGeral === 'FALHA' ? 'bg-gradient-to-br from-red-500 to-red-700 text-white animate-pulse' : ''}
              `}>
                <span className="text-lg sm:text-xl font-black">
                  {statusGeral === 'OPERANDO' ? 'ON' : statusGeral === 'PARADO' ? 'OFF' : 'ERR'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium opacity-80 uppercase">
                  {statusGeral}
                </span>
              </div>

              {/* SINALIZADORES */}
              <div className="flex flex-col gap-2 shrink-0">
                <LED on={state.pirilampoVerde} color="green" pulse={state.pirilampoVerde} size="lg" label="Sistema OK" />
                <LED on={state.pirilampoVermelho} color="red" pulse={state.pirilampoVermelho} size="lg" label="Alarme" />
                {state.corneta && (
                  <LED on={true} color="orange" pulse={true} size="lg" label="Corneta" />
                )}
              </div>

              {/* SEPARADOR */}
              <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

              {/* BOTÕES DE COMANDO */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <ActionBtn onClick={iniciar} disabled={modo === 'AUTOMATICO'} active={modo === 'AUTOMATICO'} variant="play">
                  <PlayIcon />
                </ActionBtn>
                <ActionBtn onClick={parar} disabled={modo === 'PARADO'} variant="stop">
                  <StopIcon />
                </ActionBtn>
                <ActionBtn onClick={resetar} variant="reset">
                  <ResetIcon />
                </ActionBtn>
                <div className="w-px h-8 bg-gray-200 mx-1" />
                <ActionBtn onClick={() => setShowConfig(!showConfig)} variant="settings">
                  <SettingsIcon />
                </ActionBtn>
                <ActionBtn onClick={() => setShowDiagnostico(true)} variant="monitor">
                  <MonitorIcon />
                </ActionBtn>
              </div>

              {/* SEPARADOR */}
              <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

              {/* VALORES DOS SENSORES */}
              <div className="flex-1 flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 lg:pb-0">
                <ValueDisplay
                  label="Entrada"
                  value={state.nivelEntrada}
                  unit="%"
                  color="text-blue-600"
                  barColor="bg-blue-500"
                />
                <ValueDisplay
                  label="Pressão"
                  value={state.pressaoLinha}
                  unit="bar"
                  max={6}
                  color="text-emerald-600"
                  barColor="bg-emerald-500"
                  hasOverride={state.overrides.pressaoLinha !== undefined}
                  onClick={() => setSensorPopup('pressao')}
                />
                <ValueDisplay
                  label="Redox"
                  value={state.redox}
                  unit="mV"
                  max={1000}
                  color="text-teal-600"
                  barColor="bg-teal-500"
                  hasAlarm={state.alarmeRedox}
                  hasOverride={state.overrides.redox !== undefined}
                  onClick={() => setSensorPopup('redox')}
                />
                <ValueDisplay
                  label="Condutiv."
                  value={state.condutividade}
                  unit="µS"
                  max={5}
                  color="text-amber-600"
                  barColor="bg-amber-500"
                  hasAlarm={state.alarmeCondutivimetro}
                  hasOverride={state.overrides.condutividade !== undefined}
                  onClick={() => setSensorPopup('condutividade')}
                />
                {!isMobile && (
                  <>
                    <ValueDisplay
                      label="Inibidor"
                      value={state.nivelDosador}
                      unit="%"
                      color="text-purple-600"
                      barColor="bg-purple-500"
                    />
                    <ValueDisplay
                      label="Tanque"
                      value={state.nivelTanqueFinal}
                      unit="%"
                      color="text-cyan-600"
                      barColor="bg-cyan-500"
                    />
                  </>
                )}
              </div>

              {/* SAÍDAS E VELOCIDADE - Desktop */}
              {!isMobile && !isTablet && (
                <>
                  <div className="w-px h-16 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <LED on={state.bombaRecirculacao} color="blue" pulse={state.bombaRecirculacao} size="md" label="Bomba" />
                      <LED on={state.comandoOsmose} color="green" pulse={state.comandoOsmose} size="md" label="Osmose" />
                      <LED on={state.pressostatoBomba} color="yellow" size="md" label="PT" />
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                      <SpeedIcon />
                      <button onClick={() => setVelocidade(Math.max(0.5, velocidade - 0.5))}
                        className="w-7 h-7 bg-white rounded-lg shadow text-sm font-bold hover:bg-gray-50">
                        -
                      </button>
                      <span className="text-sm font-bold font-mono text-indigo-600 w-10 text-center">{velocidade}x</span>
                      <button onClick={() => setVelocidade(Math.min(5, velocidade + 0.5))}
                        className="w-7 h-7 bg-white rounded-lg shadow text-sm font-bold hover:bg-gray-50">
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* LINHA DE PROTEÇÕES E ALARMES */}
            <div className="px-3 sm:px-4 py-3 bg-slate-50 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">

                {/* PROTEÇÕES */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ShieldIcon />
                    <span className="text-xs font-bold uppercase">Proteções</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { k: 'protBomba', l: 'Bomba', v: state.protBomba },
                      { k: 'protDescalc1', l: 'F1', v: state.protDescalc1 },
                      { k: 'protDescalc2', l: 'F2', v: state.protDescalc2 },
                      { k: 'protFiltroCarvao', l: 'Carvão', v: state.protFiltroCarvao },
                      { k: 'protRedox', l: 'Redox', v: state.protRedox },
                      { k: 'protOsmose', l: 'Osmose', v: state.protOsmose },
                      { k: 'protCondutivimetro', l: 'Cond', v: state.protCondutivimetro },
                    ].map(({ k, l, v }) => (
                      <button
                        key={k}
                        onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: k as any })}
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                          transition-all duration-200 hover:shadow-md
                          ${v ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}
                        `}
                      >
                        <LED on={v} color={v ? 'green' : 'red'} size="sm" />
                        <span className="hidden sm:inline">{l}</span>
                        <span className="sm:hidden">{l.slice(0, 2)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SEPARADOR */}
                <div className="hidden sm:block w-px h-8 bg-gray-300" />

                {/* ALARMES */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <AlertIcon />
                    <span className="text-xs font-bold uppercase">Alarmes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { k: 'alarmeDescalc1', l: 'F1', v: state.alarmeDescalc1, e: true },
                      { k: 'alarmeDescalc2', l: 'F2', v: state.alarmeDescalc2, e: true },
                      { k: 'alarmeFiltroCarvao', l: 'Carv', v: state.alarmeFiltroCarvao, e: true },
                      { k: 'alarmeRedox', l: 'Rdx', v: state.alarmeRedox, e: false },
                      { k: 'alarmeOsmose', l: 'Osm', v: state.alarmeOsmose, e: true },
                      { k: 'alarmeCondutivimetro', l: 'Cond', v: state.alarmeCondutivimetro, e: false },
                    ].map(({ k, l, v, e }) => (
                      <button
                        key={k}
                        onClick={() => e && dispatch({ type: 'TOGGLE_ALARME', alarme: k as any })}
                        disabled={!e}
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                          transition-all duration-200
                          ${e ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-70'}
                          ${v ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}
                        `}
                      >
                        <LED on={v} color="red" pulse={v} size="sm" />
                        <span>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ESTATÍSTICAS */}
                <div className="ml-auto flex items-center gap-4 text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon />
                    <span className="text-xs font-mono font-bold">{formatarTempo(state.tempoOperacao)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CycleIcon />
                    <span className="text-xs font-mono font-bold">{state.ciclosCompletos}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* POPUP CONFIGURAÇÕES */}
        {/* ============================================ */}
        {showConfig && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <SettingsIcon />
                  Configurações
                </h2>
                <button onClick={() => setShowConfig(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center">
                  <CloseIcon />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Velocidade */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">Velocidade da Simulação</span>
                    <span className="text-lg font-bold text-indigo-600">{velocidade}x</span>
                  </div>
                  <input type="range" min="0.5" max="5" step="0.5" value={velocidade}
                    onChange={(e) => setVelocidade(Number(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-full cursor-pointer accent-indigo-600" />
                </div>

                {/* Parâmetros de Alarme */}
                <div>
                  <span className="text-sm font-semibold text-gray-700 block mb-3">Limites de Alarme</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Redox Mínimo (mV)</label>
                      <input type="number" value={state.parametros.minRedox}
                        onChange={(e) => dispatch({ type: 'UPDATE_PARAMETRO', chave: 'minRedox', valor: Number(e.target.value) })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Redox Máximo (mV)</label>
                      <input type="number" value={state.parametros.maxRedox}
                        onChange={(e) => dispatch({ type: 'UPDATE_PARAMETRO', chave: 'maxRedox', valor: Number(e.target.value) })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Condutividade Máxima (µS)</label>
                      <input type="number" step="0.1" value={state.parametros.maxCondutividade}
                        onChange={(e) => dispatch({ type: 'UPDATE_PARAMETRO', chave: 'maxCondutividade', valor: Number(e.target.value) })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={() => setShowConfig(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* POPUP SENSOR */}
        {/* ============================================ */}
        {sensorPopup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GaugeIcon />
                  {sensorPopup === 'redox' ? 'Redox' : sensorPopup === 'condutividade' ? 'Condutividade' : 'Pressão'}
                </h2>
                <button onClick={() => setSensorPopup(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center">
                  <CloseIcon />
                </button>
              </div>

              <div className="p-6">
                {/* Valor Atual */}
                <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-6">
                  <div className="text-4xl font-bold font-mono text-gray-800">
                    {sensorPopup === 'redox' && state.redox.toFixed(0)}
                    {sensorPopup === 'condutividade' && state.condutividade.toFixed(2)}
                    {sensorPopup === 'pressao' && state.pressaoLinha.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {sensorPopup === 'redox' ? 'mV' : sensorPopup === 'condutividade' ? 'µS/cm' : 'bar'}
                  </div>
                </div>

                {/* Override */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Modo Override</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer"
                        checked={state.overrides[sensorPopup === 'pressao' ? 'pressaoLinha' : sensorPopup] !== undefined}
                        onChange={(e) => {
                          const defaults = { redox: 350, condutividade: 0.05, pressao: 3.0 };
                          dispatch({
                            type: 'SET_OVERRIDE',
                            sensor: sensorPopup === 'pressao' ? 'pressaoLinha' : sensorPopup,
                            valor: e.target.checked ? defaults[sensorPopup] : undefined
                          });
                        }}
                      />
                      <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow"></div>
                    </label>
                  </div>

                  {state.overrides[sensorPopup === 'pressao' ? 'pressaoLinha' : sensorPopup] !== undefined && (
                    <div>
                      <input type="range"
                        min={sensorPopup === 'redox' ? 0 : 0}
                        max={sensorPopup === 'redox' ? 1000 : sensorPopup === 'condutividade' ? 5 : 6}
                        step={sensorPopup === 'redox' ? 10 : 0.05}
                        value={state.overrides[sensorPopup === 'pressao' ? 'pressaoLinha' : sensorPopup] || 0}
                        onChange={(e) => dispatch({
                          type: 'SET_OVERRIDE',
                          sensor: sensorPopup === 'pressao' ? 'pressaoLinha' : sensorPopup,
                          valor: Number(e.target.value)
                        })}
                        className="w-full h-3 bg-gray-200 rounded-full cursor-pointer accent-blue-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={() => setSensorPopup(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MODAL DIAGNÓSTICO */}
        {/* ============================================ */}
        {showDiagnostico && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">

              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <MonitorIcon />
                    Diagnóstico I/O do PLC
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">Monitoramento em tempo real</p>
                </div>
                <button onClick={() => setShowDiagnostico(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
                  <CloseIcon />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                  {/* ENTRADAS DIGITAIS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 border-b border-gray-200 pb-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      ENTRADAS DIGITAIS
                    </h3>

                    {/* Proteções */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <ShieldIcon />
                        Proteções Térmicas
                      </span>
                      {[
                        { a: '%I0.2', n: 'Proteção Bomba Pressurização', k: 'protBomba', v: state.protBomba },
                        { a: '%I0.3', n: 'Proteção Filtro 1', k: 'protDescalc1', v: state.protDescalc1 },
                        { a: '%I0.4', n: 'Proteção Filtro 2', k: 'protDescalc2', v: state.protDescalc2 },
                        { a: '%I0.5', n: 'Proteção Filtro Carvão', k: 'protFiltroCarvao', v: state.protFiltroCarvao },
                        { a: '%I0.6', n: 'Proteção Indicador Redox', k: 'protRedox', v: state.protRedox },
                        { a: '%I0.7', n: 'Proteção Osmose', k: 'protOsmose', v: state.protOsmose },
                        { a: '%I1.0', n: 'Proteção Condutivímetro', k: 'protCondutivimetro', v: state.protCondutivimetro },
                      ].map(({ a, n, k, v }) => (
                        <div key={k} onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: k as any })}
                          className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all
                            ${v ? 'bg-white hover:bg-emerald-50' : 'bg-red-50 hover:bg-red-100'}`}>
                          <LED on={v} color={v ? 'green' : 'red'} size="md" />
                          <code className="text-xs text-gray-400 font-mono w-14">{a}</code>
                          <span className={`flex-1 text-sm ${v ? 'text-gray-700' : 'text-red-700 font-medium'}`}>{n}</span>
                          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {v ? '1' : '0'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Sensores */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <GaugeIcon />
                        Sensores Digitais
                      </span>
                      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white">
                        <LED on={state.pressostatoBomba} color="yellow" size="md" />
                        <code className="text-xs text-gray-400 font-mono w-14">%I1.2</code>
                        <span className="flex-1 text-sm text-gray-700">Pressostato Bomba</span>
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${state.pressostatoBomba ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {state.pressostatoBomba ? '1' : '0'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white">
                        <LED on={state.boiaDeposito} color="cyan" size="md" />
                        <code className="text-xs text-gray-400 font-mono w-14">%I8.0</code>
                        <span className="flex-1 text-sm text-gray-700">Boia Depósito</span>
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${state.boiaDeposito ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                          {state.boiaDeposito ? '1' : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Alarmes */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <AlertIcon />
                        Alarmes de Equipamentos
                      </span>
                      {[
                        { a: '%I8.1', n: 'Alarme Filtro 1', k: 'alarmeDescalc1', v: state.alarmeDescalc1, e: true },
                        { a: '%I8.2', n: 'Alarme Filtro 2', k: 'alarmeDescalc2', v: state.alarmeDescalc2, e: true },
                        { a: '%I8.3', n: 'Alarme Filtro Carvão', k: 'alarmeFiltroCarvao', v: state.alarmeFiltroCarvao, e: true },
                        { a: '%I8.4', n: 'Alarme Redox', k: 'alarmeRedox', v: state.alarmeRedox, e: false },
                        { a: '%I8.5', n: 'Alarme Osmose', k: 'alarmeOsmose', v: state.alarmeOsmose, e: true },
                        { a: '%I8.6', n: 'Alarme Condutivímetro', k: 'alarmeCondutivimetro', v: state.alarmeCondutivimetro, e: false },
                      ].map(({ a, n, k, v, e }) => (
                        <div key={k}
                          onClick={() => e && dispatch({ type: 'TOGGLE_ALARME', alarme: k as any })}
                          className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all
                            ${e ? 'cursor-pointer hover:shadow-md' : 'cursor-default opacity-80'}
                            ${v ? 'bg-red-50' : 'bg-white'}`}>
                          <LED on={v} color="red" pulse={v} size="md" />
                          <code className="text-xs text-gray-400 font-mono w-14">{a}</code>
                          <span className={`flex-1 text-sm ${v ? 'text-red-700 font-medium' : 'text-gray-600'}`}>{n}</span>
                          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${v ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                            {v ? '1' : '0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ANALÓGICAS E SAÍDAS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 border-b border-gray-200 pb-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      ENTRADAS ANALÓGICAS
                    </h3>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                      {[
                        { a: '%IW112', n: 'Indicação Redox', v: state.redox, u: 'mV', m: 1000, c: 'blue' },
                        { a: '%IW114', n: 'Pressão Linha', v: state.pressaoLinha, u: 'bar', m: 6, c: 'emerald' },
                        { a: '%IW118', n: 'Valor Condutividade', v: state.condutividade, u: 'µS', m: 5, c: 'amber' },
                      ].map(({ a, n, v, u, m, c }) => (
                        <div key={a} className="bg-white rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-gray-400 font-mono">{a}</code>
                              <span className="text-sm text-gray-700 font-medium">{n}</span>
                            </div>
                            <span className={`text-lg font-mono font-bold text-${c}-600`}>
                              {v.toFixed(v < 10 ? 2 : 0)} <span className="text-xs text-gray-400">{u}</span>
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-${c}-500 rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(100, (v / m) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 border-b border-gray-200 pb-2 mt-6">
                      <div className="w-3 h-3 rounded-full bg-indigo-500" />
                      SAÍDAS DIGITAIS
                    </h3>

                    <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                      {[
                        { a: '%Q0.0', n: 'Bomba Recirculação', v: state.bombaRecirculacao },
                        { a: '%Q0.1', n: 'Comando Osmose', v: state.comandoOsmose },
                        { a: '%Q0.2', n: 'Pirilampo Verde', v: state.pirilampoVerde },
                        { a: '%Q0.3', n: 'Pirilampo Vermelho', v: state.pirilampoVermelho },
                        { a: '%Q0.4', n: 'Corneta', v: state.corneta },
                      ].map(({ a, n, v }) => (
                        <div key={a} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white">
                          <LED on={v} color="blue" size="md" />
                          <code className="text-xs text-gray-400 font-mono w-14">{a}</code>
                          <span className={`flex-1 text-sm ${v ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{n}</span>
                          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${v ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                            {v ? '1' : '0'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Legenda */}
                    <div className="bg-gray-100 rounded-xl p-4 mt-4">
                      <span className="text-xs font-bold text-gray-500 uppercase block mb-3">Legenda</span>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <LED on={true} color="green" size="sm" />
                          <span className="text-gray-600">Proteção OK / Ativo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LED on={false} color="green" size="sm" />
                          <span className="text-gray-600">Proteção Disparada</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LED on={true} color="red" size="sm" />
                          <span className="text-gray-600">Alarme Ativo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LED on={true} color="blue" size="sm" />
                          <span className="text-gray-600">Saída Energizada</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                        Clique nas proteções e alarmes editáveis para simular falhas no sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-100 border-t border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
                <span className="text-sm text-gray-500">Sistema de Tratamento de Água - PulseWater PRF</span>
                <button onClick={() => setShowDiagnostico(false)}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SistemaAgua;