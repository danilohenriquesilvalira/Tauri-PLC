import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis } from 'recharts';
import { usePLC } from '../../../contexts/PLCContext';

interface TrendDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrendDataPoint {
  time: string;
  caldeira: number;
  montante: number;
  jusante: number;
}

const TrendDialog: React.FC<TrendDialogProps> = ({ isOpen, onClose }) => {
  const { data: plcData } = usePLC();
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detectar mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Valores dos níveis
  const caldeira = Number(plcData?.reals?.[108]) || 0;
  const montante = Number(plcData?.reals?.[109]) || 0;
  const jusante = Number(plcData?.reals?.[107]) || 0;

  // Criar dados históricos quando abrir
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const data: TrendDataPoint[] = [];
      
      for (let i = 0; i < 20; i++) {
        const time = new Date(now.getTime() - (19 - i) * 3000);
        data.push({
          time: time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit'
          }),
          caldeira: caldeira + (Math.random() - 0.5) * 5,
          montante: montante + (Math.random() - 0.5) * 5,
          jusante: jusante + (Math.random() - 0.5) * 5
        });
      }
      
      setTrendData(data);
    }
  }, [isOpen]);

  // Atualizar dados
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: TrendDataPoint = {
        time: now.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        caldeira,
        montante,
        jusante
      };

      setTrendData(prev => [...prev.slice(-19), newPoint]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, caldeira, montante, jusante]);

  if (!isOpen) return null;

  // Dimensões responsivas - muito mais compacto
  const getDialogSize = () => {
    if (window.innerWidth < 480) { // Mobile pequeno
      return { width: '90%', height: '50%', maxWidth: '350px', maxHeight: '300px' };
    }
    if (window.innerWidth < 768) { // Mobile
      return { width: '85%', height: '45%', maxWidth: '400px', maxHeight: '320px' };
    }
    if (window.innerWidth < 1024) { // Tablet
      return { width: '70%', height: '40%', maxWidth: '500px', maxHeight: '350px' };
    }
    // Desktop
    return { width: '500px', height: '300px', maxWidth: '500px', maxHeight: '300px' };
  };

  const dialogSize = getDialogSize();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      <div 
        className="relative bg-gray-200 rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        style={{ 
          width: dialogSize.width,
          height: dialogSize.height,
          maxWidth: dialogSize.maxWidth,
          maxHeight: dialogSize.maxHeight,
          minHeight: '250px'
        }}
      >
        
        {/* Header compacto */}
        <div className={`bg-slate-700 text-white ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                {isMobile ? 'Trend' : 'Trend dos Níveis'}
              </h4>
            </div>
            
            <div className={`flex items-center ${isMobile ? 'gap-2 text-xs' : 'gap-3 text-xs'}`}>
              <div className="text-center">
                <div className="text-gray-300">C</div>
                <div className="font-bold text-cyan-400">{caldeira.toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-300">M</div>
                <div className="font-bold text-green-400">{montante.toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-300">J</div>
                <div className="font-bold text-violet-400">{jusante.toFixed(0)}</div>
              </div>
              
              <button
                onClick={onClose}
                className={`${isMobile ? 'ml-1 p-0.5' : 'ml-2 p-1'} rounded-full hover:bg-slate-600`}
              >
                <svg className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Gráfico compacto */}
        <div className="flex-1" style={{ height: `calc(100% - ${isMobile ? '32px' : '40px'})` }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCaldeira" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0CD3F8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0CD3F8" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorMontante" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28FF52" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#28FF52" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorJusante" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6D32FF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6D32FF" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <YAxis domain={[0, 100]} hide />
              <XAxis dataKey="time" hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #BECACC',
                  borderRadius: '8px',
                  fontSize: isMobile ? '10px' : '11px',
                  padding: isMobile ? '6px 8px' : '8px 10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(1)}%`,
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
              />
              <Area
                type="monotone"
                dataKey="caldeira"
                stroke="#0CD3F8"
                strokeWidth={isMobile ? 2 : 2.5}
                fill="url(#colorCaldeira)"
                name="caldeira"
              />
              <Area
                type="monotone"
                dataKey="montante"
                stroke="#28FF52"
                strokeWidth={isMobile ? 2 : 2.5}
                fill="url(#colorMontante)"
                name="montante"
              />
              <Area
                type="monotone"
                dataKey="jusante"
                stroke="#6D32FF"
                strokeWidth={isMobile ? 2 : 2.5}
                fill="url(#colorJusante)"
                name="jusante"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default TrendDialog;