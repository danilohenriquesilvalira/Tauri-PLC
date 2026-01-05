import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePLC } from '@/contexts/PLCContext';
import { EQUIPMENT_CATEGORIES } from '@/types/faults';
import { useFaultDetector } from '@/hooks/useFaultDetector';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export const Header = () => {
  const location = useLocation();
  const { connectionStatus, data: plcData } = usePLC();
  const [isFaultDropdownOpen, setIsFaultDropdownOpen] = useState(false);
  const faultDropdownRef = useRef<HTMLDivElement>(null);

  // Sistema de detecção de falhas
  const {
    activeFaults,
    faultCount,
  } = useFaultDetector({ plcData });

  // Click outside para fechar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (faultDropdownRef.current && !faultDropdownRef.current.contains(event.target as Node)) {
        setIsFaultDropdownOpen(false);
      }
    };

    if (isFaultDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFaultDropdownOpen]);

  // Função para obter o nome da página atual
  const getPageTitle = () => {
    const pathname = location.pathname;
    
    if (pathname.includes('dashboard') || pathname === '/') {
      return 'Dashboard';
    } else if (pathname.includes('eclusa-regua')) {
      return 'Eclusa Régua';
    } else if (pathname.includes('porta-jusante')) {
      return 'Porta Jusante';
    } else if (pathname.includes('porta-montante')) {
      return 'Porta Montante';
    } else if (pathname.includes('enchimento')) {
      return 'Enchimento';
    } else if (pathname.includes('falhas')) {
      return 'Falhas';
    } else {
      return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-edp-neutral-white-wash border-b border-edp-neutral-lighter px-4 sm:px-6 lg:px-8 flex items-center justify-between relative z-20">
      
      {/* Nome da Página */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-edp font-bold text-edp-neutral-darkest">
        {getPageTitle()}
      </h1>

      {/* Actions Area */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* WebSocket Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
          connectionStatus.connected 
            ? 'bg-[#212E3E]/10 text-[#212E3E]' 
            : 'bg-red-50 text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus.connected ? 'bg-[#212E3E]' : 'bg-red-500'
          } ${connectionStatus.connected ? '' : 'animate-pulse'}`}></div>
          <span className="text-xs font-medium hidden sm:block">
            {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        
        {/* Sistema de Falhas - Sino */}
        <div 
          className="relative" 
          ref={faultDropdownRef}
        >
          <button 
            onClick={() => setIsFaultDropdownOpen(!isFaultDropdownOpen)}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-200 ${
              faultCount > 0 
                ? 'text-red-600 hover:text-red-700' 
                : 'text-edp-neutral-dark hover:text-edp-electric'
            }`}
            aria-label="Sistema de Falhas"
            title={faultCount > 0 ? `${faultCount} falhas ativas` : 'Nenhuma falha ativa'}
          >
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          {faultCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full animate-pulse">
              {faultCount > 9 ? '9+' : faultCount}
            </span>
          )}
          
          {/* Dropdown de Falhas */}
          {isFaultDropdownOpen && (
            <div className="absolute right-0 top-full mt-3 w-[420px] bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-[#212E3E]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-edp font-bold text-white text-sm tracking-wide">
                        Sistema de Monitoramento
                      </h3>
                      <p className="font-edp text-xs text-white/80">
                        {faultCount} {faultCount === 1 ? 'ocorrência ativa' : 'ocorrências ativas'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400/50"></div>
                    <span className="font-edp text-xs font-medium text-white/90 bg-white/10 px-3 py-1 rounded-full">
                      ATIVO
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Lista de Falhas */}
              <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {activeFaults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-edp font-semibold text-gray-600 text-sm">Sistema Operacional</p>
                    <p className="font-edp text-xs text-gray-400 mt-1">Nenhuma ocorrência detectada</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    {activeFaults.map((fault, index) => {
                      const category = EQUIPMENT_CATEGORIES[fault.equipment];
                      const isAlarm = fault.type === 'AL';
                      return (
                        <div 
                          key={`${fault.wordIndex}_${fault.bitIndex}_${index}`}
                          className={`p-4 mx-2 mb-2 rounded-xl border shadow-lg backdrop-blur-sm ${
                            isAlarm 
                              ? 'border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50/30 hover:shadow-red-200/50' 
                              : 'border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-yellow-50/30 hover:shadow-yellow-200/50'
                          } transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-full shadow-md ${
                              isAlarm 
                                ? 'bg-gradient-to-br from-red-100 to-red-200 ring-2 ring-red-300/50' 
                                : 'bg-gradient-to-br from-yellow-100 to-yellow-200 ring-2 ring-yellow-300/50'
                            }`}>
                              {isAlarm ? (
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-700" />
                              ) : (
                                <InformationCircleIcon className="w-4 h-4 text-yellow-700" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="text-sm font-edp font-bold text-edp-neutral-darkest mb-1 truncate">
                                    {category?.name || fault.equipment}
                                  </h4>
                                  <p className="text-xs font-edp text-gray-600 leading-tight line-clamp-2">
                                    {fault.description}
                                  </p>
                                </div>
                                <div className={`text-xs font-edp font-semibold px-2.5 py-1 rounded-full shadow-sm ${
                                  isAlarm 
                                    ? 'bg-red-100 text-red-800 border border-red-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  {new Date(fault.timestamp).toLocaleTimeString('pt-PT', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
