// src/components/PainelControle.tsx
// Painel de Controle Industrial - Moderno, Compacto e Responsivo

import React from 'react';
import { SistemaState, getStatusGeral, formatarTempo } from '../../model/sistemaModel';

// ============================================
// TIPOS
// ============================================

type ModoOperacao = 'PARADO' | 'AUTOMATICO';

interface PainelControleProps {
  state: SistemaState;
  modo: ModoOperacao;
  velocidade: number;
  onIniciar: () => void;
  onParar: () => void;
  onResetar: () => void;
  onVelocidadeChange: (v: number) => void;
  onOpenConfig: () => void;
  onOpenDiagnostico: () => void;
  dispatch: React.Dispatch<any>;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

// Indicador LED (bolinha colorida)
const LED: React.FC<{
  ativo: boolean;
  cor: 'verde' | 'vermelho' | 'amarelo' | 'azul' | 'laranja';
  pulsante?: boolean;
  tamanho?: 'sm' | 'md' | 'lg';
  titulo?: string;
}> = ({ ativo, cor, pulsante = false, tamanho = 'md', titulo }) => {
  const cores = {
    verde: { ativo: 'bg-emerald-500 shadow-emerald-400', inativo: 'bg-emerald-900/50' },
    vermelho: { ativo: 'bg-red-500 shadow-red-400', inativo: 'bg-red-900/50' },
    amarelo: { ativo: 'bg-amber-400 shadow-amber-300', inativo: 'bg-amber-900/50' },
    azul: { ativo: 'bg-blue-500 shadow-blue-400', inativo: 'bg-blue-900/50' },
    laranja: { ativo: 'bg-orange-500 shadow-orange-400', inativo: 'bg-orange-900/50' },
  };

  const tamanhos = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div
      title={titulo}
      className={`
        ${tamanhos[tamanho]} 
        rounded-full 
        transition-all duration-300
        ${ativo ? `${cores[cor].ativo} shadow-lg` : cores[cor].inativo}
        ${ativo && pulsante ? 'animate-pulse' : ''}
      `}
    />
  );
};

// Valor com Label
const ValorSensor: React.FC<{
  label: string;
  valor: string | number;
  unidade: string;
  cor?: string;
  destaque?: boolean;
  onClick?: () => void;
  override?: boolean;
}> = ({ label, valor, unidade, cor = 'text-gray-700', destaque = false, onClick, override }) => (
  <div
    onClick={onClick}
    className={`
      flex flex-col items-center min-w-[52px] px-2 py-1 rounded-lg
      ${onClick ? 'cursor-pointer hover:bg-gray-100/80 transition-colors' : ''}
      ${destaque ? 'bg-gray-50/50' : ''}
      relative
    `}
  >
    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">
      {label}
    </span>
    <div className={`text-sm font-mono font-bold ${cor} leading-tight mt-0.5`}>
      {typeof valor === 'number' ? valor.toFixed(valor < 10 ? 2 : 0) : valor}
    </div>
    <span className="text-[7px] text-gray-400 leading-none">{unidade}</span>
    {override && (
      <div
        className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
        title="Override Ativo"
      />
    )}
  </div>
);

// Barra de Nível compacta
const BarraNivel: React.FC<{
  valor: number;
  cor: string;
}> = ({ valor, cor }) => (
  <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
    <div
      className={`h-full ${cor} rounded-full transition-all duration-300`}
      style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
    />
  </div>
);

// Botão de Controle
const BotaoControle: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  ativo?: boolean;
  cor: 'azul' | 'verde' | 'vermelho' | 'laranja' | 'cinza';
  children: React.ReactNode;
  titulo?: string;
}> = ({ onClick, disabled, ativo, cor, children, titulo }) => {
  const cores = {
    azul: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-200',
    verde: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-200 ring-2 ring-emerald-300',
    vermelho: 'bg-red-500 hover:bg-red-400 text-white shadow-red-200',
    laranja: 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-200',
    cinza: 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center 
        transition-all duration-200 shadow-md
        active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
        ${ativo ? cores.verde : cores[cor]}
      `}
    >
      {children}
    </button>
  );
};

// ============================================
// ÍCONES SVG
// ============================================

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const IconReset = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconConfig = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDiagnostico = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconCorneta = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PainelControle: React.FC<PainelControleProps> = ({
  state,
  modo,
  velocidade,
  onIniciar,
  onParar,
  onResetar,
  onVelocidadeChange,
  onOpenConfig,
  onOpenDiagnostico,
  dispatch,
}) => {
  const statusGeral = getStatusGeral(state);

  // Verificações
  const protecoesOK =
    state.protBomba &&
    state.protDescalc1 &&
    state.protDescalc2 &&
    state.protFiltroCarvao &&
    state.protRedox &&
    state.protOsmose &&
    state.protCondutivimetro;

  const alarmeAtivo =
    state.alarmeDescalc1 ||
    state.alarmeDescalc2 ||
    state.alarmeFiltroCarvao ||
    state.alarmeRedox ||
    state.alarmeOsmose ||
    state.alarmeCondutivimetro;

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
      {/* ============================================ */}
      {/* LINHA PRINCIPAL - CONTROLES E VALORES */}
      {/* ============================================ */}
      <div className="p-2.5 flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3">

        {/* SEÇÃO 1: STATUS GERAL */}
        <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
          {/* Indicador de Status */}
          <div className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs
              ${statusGeral === 'OPERANDO' ? 'bg-emerald-100 text-emerald-700' : ''}
              ${statusGeral === 'PARADO' ? 'bg-gray-100 text-gray-500' : ''}
              ${statusGeral === 'ALARME' ? 'bg-amber-100 text-amber-700 animate-pulse' : ''}
              ${statusGeral === 'FALHA' ? 'bg-red-100 text-red-700 animate-pulse' : ''}
            `}>
              {statusGeral === 'OPERANDO' ? 'ON' : statusGeral === 'PARADO' ? 'OFF' : '⚠'}
            </div>
          </div>

          {/* Sinalizadores */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5" title="Pirilampo Verde">
              <LED ativo={state.pirilampoVerde} cor="verde" pulsante={state.pirilampoVerde} tamanho="md" />
              <span className="text-[8px] text-gray-400 hidden sm:inline">OK</span>
            </div>
            <div className="flex items-center gap-1.5" title="Pirilampo Vermelho">
              <LED ativo={state.pirilampoVermelho} cor="vermelho" pulsante={state.pirilampoVermelho} tamanho="md" />
              <span className="text-[8px] text-gray-400 hidden sm:inline">ALM</span>
            </div>
            {state.corneta && (
              <div className="flex items-center gap-1 text-red-500 animate-pulse" title="Corneta Ativa">
                <IconCorneta />
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: BOTÕES DE COMANDO */}
        <div className="flex items-center gap-1.5">
          <BotaoControle
            onClick={onIniciar}
            disabled={modo === 'AUTOMATICO'}
            ativo={modo === 'AUTOMATICO'}
            cor="azul"
            titulo="Iniciar Sistema"
          >
            <IconPlay />
          </BotaoControle>

          <BotaoControle
            onClick={onParar}
            disabled={modo === 'PARADO'}
            cor="vermelho"
            titulo="Parar Sistema"
          >
            <IconStop />
          </BotaoControle>

          <BotaoControle
            onClick={onResetar}
            cor="laranja"
            titulo="Resetar Sistema"
          >
            <IconReset />
          </BotaoControle>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <BotaoControle
            onClick={onOpenConfig}
            cor="cinza"
            titulo="Configurações"
          >
            <IconConfig />
          </BotaoControle>

          <BotaoControle
            onClick={onOpenDiagnostico}
            cor="cinza"
            titulo="Diagnóstico I/O"
          >
            <IconDiagnostico />
          </BotaoControle>
        </div>

        {/* DIVISOR */}
        <div className="hidden lg:block w-px h-10 bg-gray-200" />

        {/* SEÇÃO 3: VALORES DOS SENSORES */}
        <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap">

          {/* Nível Entrada */}
          <div className="flex flex-col items-center min-w-[52px] px-2">
            <span className="text-[8px] text-gray-400 font-bold uppercase">Entrada</span>
            <div className="text-sm font-mono font-bold text-blue-600">{state.nivelEntrada.toFixed(0)}%</div>
            <BarraNivel valor={state.nivelEntrada} cor="bg-blue-500" />
          </div>

          {/* Pressão Linha */}
          <ValorSensor
            label="Pressão"
            valor={state.pressaoLinha.toFixed(1)}
            unidade="bar"
            cor={state.pressostatoBomba ? 'text-emerald-600' : 'text-gray-500'}
            override={state.overrides.pressaoLinha !== undefined}
          />

          {/* Redox */}
          <ValorSensor
            label="Redox"
            valor={state.redox.toFixed(0)}
            unidade="mV"
            cor={state.alarmeRedox ? 'text-red-600' : 'text-emerald-600'}
            override={state.overrides.redox !== undefined}
            onClick={() => dispatch({ type: 'SET_OVERRIDE', sensor: 'redox', valor: state.overrides.redox === undefined ? state.redox : undefined })}
          />

          {/* Condutividade */}
          <ValorSensor
            label="Cond."
            valor={state.condutividade.toFixed(2)}
            unidade="µS"
            cor={state.alarmeCondutivimetro ? 'text-red-600' : 'text-amber-600'}
            override={state.overrides.condutividade !== undefined}
            onClick={() => dispatch({ type: 'SET_OVERRIDE', sensor: 'condutividade', valor: state.overrides.condutividade === undefined ? state.condutividade : undefined })}
          />

          {/* Inibidor */}
          <div className="flex flex-col items-center min-w-[52px] px-2 border-l border-gray-100">
            <span className="text-[8px] text-gray-400 font-bold uppercase">Inibidor</span>
            <div className="text-sm font-mono font-bold text-purple-600">{state.nivelDosador.toFixed(0)}%</div>
            <BarraNivel valor={state.nivelDosador} cor="bg-purple-500" />
          </div>

          {/* Tanque Final */}
          <div className="flex flex-col items-center min-w-[52px] px-2 border-l border-gray-100">
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-gray-400 font-bold uppercase">Tanque</span>
              <LED ativo={state.boiaDeposito} cor="verde" tamanho="sm" titulo="Boia" />
            </div>
            <div className="text-sm font-mono font-bold text-cyan-600">{state.nivelTanqueFinal.toFixed(0)}%</div>
            <BarraNivel valor={state.nivelTanqueFinal} cor="bg-cyan-500" />
          </div>

        </div>

        {/* DIVISOR */}
        <div className="hidden xl:block w-px h-10 bg-gray-200" />

        {/* SEÇÃO 4: SAÍDAS E EQUIPAMENTOS */}
        <div className="hidden xl:flex items-center gap-3 pl-2">
          {/* Bomba */}
          <div className="flex items-center gap-1.5" title="Bomba Recirculação">
            <LED ativo={state.bombaRecirculacao} cor="azul" pulsante={state.bombaRecirculacao} tamanho="md" />
            <span className="text-[9px] text-gray-500 font-medium">Bomba</span>
          </div>

          {/* Osmose */}
          <div className="flex items-center gap-1.5" title="Comando Osmose">
            <LED ativo={state.comandoOsmose} cor="verde" pulsante={state.comandoOsmose} tamanho="md" />
            <span className="text-[9px] text-gray-500 font-medium">Osmose</span>
          </div>

          {/* Pressostato */}
          <div className="flex items-center gap-1.5" title="Pressostato">
            <LED ativo={state.pressostatoBomba} cor="amarelo" tamanho="md" />
            <span className="text-[9px] text-gray-500 font-medium">PT</span>
          </div>
        </div>

        {/* SEÇÃO 5: VELOCIDADE */}
        <div className="hidden xl:flex flex-col items-center pl-3 border-l border-gray-200">
          <span className="text-[8px] text-gray-400 font-bold uppercase">Veloc.</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVelocidadeChange(Math.max(0.5, velocidade - 0.5))}
              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold"
            >
              -
            </button>
            <span className="text-sm font-mono font-bold text-indigo-600 w-8 text-center">{velocidade}x</span>
            <button
              onClick={() => onVelocidadeChange(Math.min(5, velocidade + 0.5))}
              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold"
            >
              +
            </button>
          </div>
        </div>

      </div>

      {/* ============================================ */}
      {/* LINHA SECUNDÁRIA - PROTEÇÕES E ALARMES */}
      {/* ============================================ */}
      <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px]">

        {/* PROTEÇÕES */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase">Prot:</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5" title="Proteção Bomba">
              <LED ativo={state.protBomba} cor="verde" tamanho="sm" />
              <span className={state.protBomba ? 'text-gray-500' : 'text-red-500 font-bold'}>Bmb</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Filtro 1">
              <LED ativo={state.protDescalc1} cor="verde" tamanho="sm" />
              <span className={state.protDescalc1 ? 'text-gray-500' : 'text-red-500 font-bold'}>F1</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Filtro 2">
              <LED ativo={state.protDescalc2} cor="verde" tamanho="sm" />
              <span className={state.protDescalc2 ? 'text-gray-500' : 'text-red-500 font-bold'}>F2</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Carvão">
              <LED ativo={state.protFiltroCarvao} cor="verde" tamanho="sm" />
              <span className={state.protFiltroCarvao ? 'text-gray-500' : 'text-red-500 font-bold'}>Crv</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Redox">
              <LED ativo={state.protRedox} cor="verde" tamanho="sm" />
              <span className={state.protRedox ? 'text-gray-500' : 'text-red-500 font-bold'}>Rdx</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Osmose">
              <LED ativo={state.protOsmose} cor="verde" tamanho="sm" />
              <span className={state.protOsmose ? 'text-gray-500' : 'text-red-500 font-bold'}>Osm</span>
            </div>
            <div className="flex items-center gap-0.5" title="Proteção Condutivímetro">
              <LED ativo={state.protCondutivimetro} cor="verde" tamanho="sm" />
              <span className={state.protCondutivimetro ? 'text-gray-500' : 'text-red-500 font-bold'}>Cnd</span>
            </div>
          </div>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* ALARMES */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase">Alm:</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5" title="Alarme Filtro 1">
              <LED ativo={state.alarmeDescalc1} cor="vermelho" pulsante={state.alarmeDescalc1} tamanho="sm" />
              <span className={!state.alarmeDescalc1 ? 'text-gray-400' : 'text-red-600 font-bold'}>F1</span>
            </div>
            <div className="flex items-center gap-0.5" title="Alarme Filtro 2">
              <LED ativo={state.alarmeDescalc2} cor="vermelho" pulsante={state.alarmeDescalc2} tamanho="sm" />
              <span className={!state.alarmeDescalc2 ? 'text-gray-400' : 'text-red-600 font-bold'}>F2</span>
            </div>
            <div className="flex items-center gap-0.5" title="Alarme Carvão">
              <LED ativo={state.alarmeFiltroCarvao} cor="vermelho" pulsante={state.alarmeFiltroCarvao} tamanho="sm" />
              <span className={!state.alarmeFiltroCarvao ? 'text-gray-400' : 'text-red-600 font-bold'}>Crv</span>
            </div>
            <div className="flex items-center gap-0.5" title="Alarme Redox">
              <LED ativo={state.alarmeRedox} cor="vermelho" pulsante={state.alarmeRedox} tamanho="sm" />
              <span className={!state.alarmeRedox ? 'text-gray-400' : 'text-red-600 font-bold'}>Rdx</span>
            </div>
            <div className="flex items-center gap-0.5" title="Alarme Osmose">
              <LED ativo={state.alarmeOsmose} cor="vermelho" pulsante={state.alarmeOsmose} tamanho="sm" />
              <span className={!state.alarmeOsmose ? 'text-gray-400' : 'text-red-600 font-bold'}>Osm</span>
            </div>
            <div className="flex items-center gap-0.5" title="Alarme Condutividade">
              <LED ativo={state.alarmeCondutivimetro} cor="vermelho" pulsante={state.alarmeCondutivimetro} tamanho="sm" />
              <span className={!state.alarmeCondutivimetro ? 'text-gray-400' : 'text-red-600 font-bold'}>Cnd</span>
            </div>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="ml-auto flex items-center gap-3 text-gray-400">
          <span>⏱ {formatarTempo(state.tempoOperacao)}</span>
          <span>🔄 {state.ciclosCompletos}</span>
        </div>

      </div>
    </div>
  );
};

export default PainelControle;