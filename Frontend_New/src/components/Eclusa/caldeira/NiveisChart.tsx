import React from 'react';
import { usePLC } from '../../../contexts/PLCContext';

interface NiveisChartProps {
  height?: number;
}

interface GaugeProps {
  value: number;
  label: string;
  color: string;
  maxValue?: number;
}

const ModernGauge: React.FC<GaugeProps> = ({ value, label, color, maxValue = 100 }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = `${percentage * 2.83} 283`; // 283 é aproximadamente a circunferência do círculo
  
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      {/* Container do gauge - Responsivo inteligente */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0">
        {/* Mobile: pequeno e compacto | Desktop: generoso e visível */}
        <div 
          className="relative"
          style={{ 
            width: 'min(max(60px, 15vw), 90px)', // Mobile: 60px | Desktop: até 90px
            height: 'min(max(60px, 15vw), 90px)' 
          }}
        >
          {/* Círculo de fundo */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="rgba(124, 149, 153, 0.2)"
              strokeWidth="8"
              fill="none"
              className="drop-shadow-sm"
            />
            {/* Círculo do progresso */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out drop-shadow-md"
              style={{
                filter: `drop-shadow(0 0 4px ${color}40)`
              }}
            />
          </svg>
          
          {/* Valor no centro - Texto responsivo inteligente */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="font-bold leading-none"
              style={{ 
                color: color,
                // Mobile: 14px | Desktop: até 18px
                fontSize: 'min(max(14px, 3.5vw), 18px)'
              }}
            >
              {value.toFixed(1)}
            </span>
            <span 
              className="text-gray-500 leading-none"
              style={{ 
                // Mobile: 10px | Desktop: 12px
                fontSize: 'min(max(10px, 2.5vw), 12px)' 
              }}
            >
              m
            </span>
          </div>
        </div>
      </div>
      
      {/* Label responsivo - Desktop maior */}
      <div className="flex-shrink-0 h-4 sm:h-5 flex items-center justify-center">
        <span 
          className="font-medium text-gray-600 text-center"
          style={{ 
            // Mobile: 11px | Desktop: 13px
            fontSize: 'min(max(11px, 2.8vw), 13px)' 
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

const NiveisChart: React.FC<NiveisChartProps> = ({ height = 180 }) => {
  const { data: plcData, connectionStatus } = usePLC();

  // Valores dos níveis (0-100% ou metros) - APENAS VALORES REAIS DO PLC
  const caldeira = Number(plcData?.reals?.[108]) || 0;
  const montante = Number(plcData?.reals?.[109]) || 0;
  const jusante = Number(plcData?.reals?.[107]) || 0;

  // Altura dinâmica baseada na tela
  const dynamicHeight = Math.max(140, Math.min(height, window.innerHeight * 0.25));

  return (
    <div
      className="bg-gray-200 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
      style={{ height: `${dynamicHeight}px` }}
    >
      {/* Header azul - Altura fixa para consistência */}
      <div className="flex-shrink-0 bg-slate-700 text-white px-3 py-2 h-12">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="bg-edp-electric rounded px-1.5 py-1 flex items-center justify-center">
              <svg className="w-4 h-4 text-edp-marine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h4 className="text-sm font-medium">Níveis</h4>
          </div>
          
          {/* Valores no header - responsivos */}
          <div className="flex items-center gap-2 text-xs">
            <div className="text-center hidden sm:block">
              <div className="text-gray-300">Jusante</div>
              <div className="font-bold text-green-400">{jusante.toFixed(1)}</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-gray-300">Montante</div>
              <div className="font-bold text-green-400">{montante.toFixed(1)}</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-gray-300">Caldeira</div>
              <div className="font-bold text-green-400">{caldeira.toFixed(1)}</div>
            </div>
            {/* Versão mobile compacta */}
            <div className="text-center sm:hidden">
              <div className="font-bold text-green-400 text-xs">
                {jusante.toFixed(1)} | {montante.toFixed(1)} | {caldeira.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Container dos gauges - Responsivo inteligente */}
      <div className="flex-1 flex items-stretch justify-center gap-1 sm:gap-3 md:gap-4 px-2 sm:px-4 py-2 sm:py-3 min-h-0" style={{ minHeight: '80px' }}>
        {/* Mobile: compacto | Desktop: generoso */}
        <div className="flex-1 max-w-[33%] sm:max-w-[120px]">
          <ModernGauge 
            value={jusante} 
            label="Jusante" 
            color="#143F47"
          />
        </div>
        <div className="flex-1 max-w-[33%] sm:max-w-[120px]">
          <ModernGauge 
            value={montante} 
            label="Montante" 
            color="#225E66"
          />
        </div>
        <div className="flex-1 max-w-[33%] sm:max-w-[120px]">
          <ModernGauge 
            value={caldeira} 
            label="Caldeira" 
            color="#7C9599"
          />
        </div>
      </div>
    </div>
  );
};

export default NiveisChart;