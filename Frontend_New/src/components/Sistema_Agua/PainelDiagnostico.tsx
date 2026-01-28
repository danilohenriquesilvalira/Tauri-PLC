// src/components/PainelDiagnostico.tsx
// Painel de Diagnóstico - Mostra todas as Entradas/Saídas do PLC

import React from 'react';
import { SistemaState } from '../../model/sistemaModel';

interface PainelDiagnosticoProps {
    state: SistemaState;
    dispatch: React.Dispatch<any>;
    onClose: () => void;
}

// LED para indicação
const LED: React.FC<{ ativo: boolean; cor?: 'verde' | 'vermelho' | 'amarelo' | 'azul' }> = ({
    ativo,
    cor = 'verde'
}) => {
    const cores = {
        verde: ativo ? 'bg-emerald-500 shadow-emerald-400' : 'bg-emerald-900/30',
        vermelho: ativo ? 'bg-red-500 shadow-red-400' : 'bg-red-900/30',
        amarelo: ativo ? 'bg-amber-400 shadow-amber-300' : 'bg-amber-900/30',
        azul: ativo ? 'bg-blue-500 shadow-blue-400' : 'bg-blue-900/30',
    };

    return (
        <div className={`w-3 h-3 rounded-full transition-all ${cores[cor]} ${ativo ? 'shadow-lg' : ''}`} />
    );
};

// Linha de I/O Digital
const LinhaIO: React.FC<{
    endereco: string;
    nome: string;
    valor: boolean;
    tipo: 'entrada' | 'saida';
    onClick?: () => void;
    corLed?: 'verde' | 'vermelho' | 'amarelo' | 'azul';
}> = ({ endereco, nome, valor, tipo, onClick, corLed = 'verde' }) => (
    <div
        onClick={onClick}
        className={`
      flex items-center gap-2 py-1 px-2 rounded-lg border transition-all
      ${valor ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}
      ${onClick ? 'cursor-pointer hover:bg-gray-100' : ''}
    `}
    >
        <LED ativo={valor} cor={tipo === 'saida' ? 'azul' : (valor ? corLed : 'verde')} />
        <code className="text-[10px] text-gray-400 font-mono w-12">{endereco}</code>
        <span className={`text-xs flex-1 ${valor ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {nome}
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${valor ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
            {valor ? '1' : '0'}
        </span>
    </div>
);

// Linha de I/O Analógica
const LinhaAI: React.FC<{
    endereco: string;
    nome: string;
    valor: number;
    unidade: string;
    min?: number;
    max?: number;
}> = ({ endereco, nome, valor, unidade, min = 0, max = 100 }) => {
    const percentual = Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100));

    return (
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white border border-gray-100">
            <code className="text-[10px] text-gray-400 font-mono w-14">{endereco}</code>
            <span className="text-xs text-gray-600 flex-1">{nome}</span>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                    style={{ width: `${percentual}%` }}
                />
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 w-16 text-right">
                {valor.toFixed(valor < 10 ? 2 : 0)} {unidade}
            </span>
        </div>
    );
};

const PainelDiagnostico: React.FC<PainelDiagnosticoProps> = ({ state, dispatch, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Diagnóstico I/O do PLC</h2>
                        <p className="text-xs text-slate-300">Entradas e Saídas em tempo real</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* COLUNA 1: ENTRADAS DIGITAIS */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <h3 className="text-sm font-bold text-gray-700">ENTRADAS DIGITAIS (DI)</h3>
                            </div>

                            {/* Proteções */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Proteções Térmicas</span>
                                <LinhaIO
                                    endereco="%I0.2"
                                    nome="Prot. Bomba Pressur."
                                    valor={state.protBomba}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protBomba' })}
                                    corLed={state.protBomba ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I0.3"
                                    nome="Prot. Filtro 1"
                                    valor={state.protDescalc1}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protDescalc1' })}
                                    corLed={state.protDescalc1 ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I0.4"
                                    nome="Prot. Filtro 2"
                                    valor={state.protDescalc2}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protDescalc2' })}
                                    corLed={state.protDescalc2 ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I0.5"
                                    nome="Prot. Filtro Carvão"
                                    valor={state.protFiltroCarvao}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protFiltroCarvao' })}
                                    corLed={state.protFiltroCarvao ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I0.6"
                                    nome="Prot. Indicador Redox"
                                    valor={state.protRedox}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protRedox' })}
                                    corLed={state.protRedox ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I0.7"
                                    nome="Prot. Osmose"
                                    valor={state.protOsmose}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protOsmose' })}
                                    corLed={state.protOsmose ? 'verde' : 'vermelho'}
                                />
                                <LinhaIO
                                    endereco="%I1.0"
                                    nome="Prot. Condutivímetro"
                                    valor={state.protCondutivimetro}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_PROTECAO', protecao: 'protCondutivimetro' })}
                                    corLed={state.protCondutivimetro ? 'verde' : 'vermelho'}
                                />
                            </div>

                            {/* Sensores */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Sensores Digitais</span>
                                <LinhaIO
                                    endereco="%I1.2"
                                    nome="Pressostato Bomba"
                                    valor={state.pressostatoBomba}
                                    tipo="entrada"
                                    corLed="amarelo"
                                />
                                <LinhaIO
                                    endereco="%I8.0"
                                    nome="Boia Depósito"
                                    valor={state.boiaDeposito}
                                    tipo="entrada"
                                    corLed="amarelo"
                                />
                            </div>

                            {/* Alarmes */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Alarmes Equipamentos</span>
                                <LinhaIO
                                    endereco="%I8.1"
                                    nome="Alarme Filtro 1"
                                    valor={state.alarmeDescalc1}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_ALARME', alarme: 'alarmeDescalc1' })}
                                    corLed="vermelho"
                                />
                                <LinhaIO
                                    endereco="%I8.2"
                                    nome="Alarme Filtro 2"
                                    valor={state.alarmeDescalc2}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_ALARME', alarme: 'alarmeDescalc2' })}
                                    corLed="vermelho"
                                />
                                <LinhaIO
                                    endereco="%I8.3"
                                    nome="Alarme Filtro Carvão"
                                    valor={state.alarmeFiltroCarvao}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_ALARME', alarme: 'alarmeFiltroCarvao' })}
                                    corLed="vermelho"
                                />
                                <LinhaIO
                                    endereco="%I8.4"
                                    nome="Alarme Redox"
                                    valor={state.alarmeRedox}
                                    tipo="entrada"
                                    corLed="vermelho"
                                />
                                <LinhaIO
                                    endereco="%I8.5"
                                    nome="Alarme Osmose"
                                    valor={state.alarmeOsmose}
                                    tipo="entrada"
                                    onClick={() => dispatch({ type: 'TOGGLE_ALARME', alarme: 'alarmeOsmose' })}
                                    corLed="vermelho"
                                />
                                <LinhaIO
                                    endereco="%I8.6"
                                    nome="Alarme Condutivímetro"
                                    valor={state.alarmeCondutivimetro}
                                    tipo="entrada"
                                    corLed="vermelho"
                                />
                            </div>
                        </div>

                        {/* COLUNA 2: ANALÓGICAS E SAÍDAS */}
                        <div className="space-y-3">

                            {/* Entradas Analógicas */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <h3 className="text-sm font-bold text-gray-700">ENTRADAS ANALÓGICAS (AI)</h3>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                                <LinhaAI
                                    endereco="%IW112"
                                    nome="Indicação Redox"
                                    valor={state.redox}
                                    unidade="mV"
                                    min={0}
                                    max={1000}
                                />
                                <LinhaAI
                                    endereco="%IW114"
                                    nome="Pressão Linha"
                                    valor={state.pressaoLinha}
                                    unidade="bar"
                                    min={0}
                                    max={6}
                                />
                                <LinhaAI
                                    endereco="%IW118"
                                    nome="Valor Condutividade"
                                    valor={state.condutividade}
                                    unidade="µS"
                                    min={0}
                                    max={5}
                                />
                            </div>

                            {/* Saídas Digitais */}
                            <div className="flex items-center gap-2 mb-2 mt-4">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <h3 className="text-sm font-bold text-gray-700">SAÍDAS DIGITAIS (DO)</h3>
                            </div>

                            <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
                                <LinhaIO
                                    endereco="%Q0.0"
                                    nome="Bomba Recirculação"
                                    valor={state.bombaRecirculacao}
                                    tipo="saida"
                                />
                                <LinhaIO
                                    endereco="%Q0.1"
                                    nome="Comando Osmose"
                                    valor={state.comandoOsmose}
                                    tipo="saida"
                                />
                                <LinhaIO
                                    endereco="%Q0.2"
                                    nome="Pirilampo Verde"
                                    valor={state.pirilampoVerde}
                                    tipo="saida"
                                />
                                <LinhaIO
                                    endereco="%Q0.3"
                                    nome="Pirilampo Vermelho"
                                    valor={state.pirilampoVermelho}
                                    tipo="saida"
                                />
                                <LinhaIO
                                    endereco="%Q0.4"
                                    nome="Corneta"
                                    valor={state.corneta}
                                    tipo="saida"
                                />
                            </div>

                            {/* LEGENDA */}
                            <div className="bg-gray-100 rounded-xl p-3 mt-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Legenda</span>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <LED ativo={true} cor="verde" />
                                        <span>Proteção OK / Sensor Ativo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LED ativo={false} cor="verde" />
                                        <span>Proteção Disparo / Inativo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LED ativo={true} cor="vermelho" />
                                        <span>Alarme Ativo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LED ativo={true} cor="azul" />
                                        <span>Saída Ativa</span>
                                    </div>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-2">
                                    💡 Clique nas proteções e alarmes para simular falhas
                                </p>
                            </div>

                        </div>

                    </div>
                </div>

                {/* FOOTER */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                        Sistema de Tratamento de Água - PulseWater PRF
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PainelDiagnostico;