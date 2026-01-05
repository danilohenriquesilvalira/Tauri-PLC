import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { usePLC } from '../../../contexts/PLCContext';

interface RadarChartProps {
  height?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ height = 200 }) => {
  const { data: plcData } = usePLC();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [tooltipActive, setTooltipActive] = React.useState(false);
  
  // Valores dos radares de velocidade em m/s
  const jusante = Number(plcData?.reals?.[116]) || 0;   // Radar Jusante
  const montante = Number(plcData?.reals?.[117]) || 0;  // Radar Montante  
  const caldeira = Number(plcData?.reals?.[118]) || 0;  // Radar Caldeira

  // Histórico de dados reais dos radares
  const [historyData, setHistoryData] = React.useState<Array<{time: number, jusante: number, montante: number, caldeira: number}>>([]);

  // Atualizar histórico com valores reais do PLC
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHistoryData(prev => {
        const newData = [...prev, {
          time: now,
          jusante: jusante,
          montante: montante,
          caldeira: caldeira
        }].slice(-30); // Manter apenas os últimos 30 pontos
        return newData;
      });
    }, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, [jusante, montante, caldeira]);

  // Dados para o gráfico (apenas valores reais)
  const chartData = React.useMemo(() => {
    return historyData.map((point, index) => ({
      time: index,
      jusante: point.jusante,
      montante: point.montante,
      caldeira: point.caldeira
    }));
  }, [historyData]);

  // Detectar cliques fora do gráfico para esconder tooltip
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
        setTooltipActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Tooltip customizado com controle manual
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && tooltipActive) {
      return (
        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 pointer-events-none">
          <p className="text-xs font-medium text-gray-600 mb-1">Ponto {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="font-medium capitalize">{entry.dataKey}:</span>
              <span className="font-bold">{entry.value.toFixed(1)}m/s</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      ref={chartRef}
      className="bg-gray-200 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Header azul - retângulo para ícone e título */}
      <div className="bg-slate-700 text-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-edp-electric rounded px-1.5 py-1 flex items-center justify-center">
              <svg className="w-4 h-4 text-edp-marine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h4 className="text-sm font-medium">Radares de Velocidade</h4>
          </div>
          
          {/* Valores no header - lado direito */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-300">Jus</div>
              <div className="font-bold text-green-400">{jusante.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-300">Mon</div>
              <div className="font-bold text-green-400">{montante.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-300">Cal</div>
              <div className="font-bold text-green-400">{caldeira.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico preenchendo todo o espaço restante */}
      <div 
        className="flex-1 w-full"
        onMouseEnter={() => setTooltipActive(true)}
        onTouchStart={() => setTooltipActive(true)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCaldeiraRadar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C9599" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#90A5A8" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorMontanteRadar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0CD3F8" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#3DDCF9" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorJusanteRadar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#263CC8" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#4759D0" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <YAxis domain={[0, 5]} hide />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: '3 3' }}
              animationDuration={150}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="caldeira"
              stroke="#7C9599"
              strokeWidth={2}
              fill="url(#colorCaldeiraRadar)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="montante"
              stroke="#0CD3F8"
              strokeWidth={2}
              fill="url(#colorMontanteRadar)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="jusante"
              stroke="#263CC8"
              strokeWidth={2}
              fill="url(#colorJusanteRadar)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChart;