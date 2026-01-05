import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { ActiveFault, EQUIPMENT_CATEGORIES } from '../../types/faults';
import { FaultIcon } from './FaultIcon';

interface FaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeFaults: ActiveFault[];
}

const ITEMS_PER_PAGE = 6;

export const FaultDialog: React.FC<FaultDialogProps> = ({
  isOpen,
  onClose,
  activeFaults
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Paginação
  const totalPages = Math.ceil(activeFaults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentFaults = activeFaults.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        ref={dialogRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200"
      >
        
        {/* Header Moderno */}
        <div className="bg-gradient-to-r from-edp-neutral-darkest to-edp-marine text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-edp font-semibold">Falhas Ativas ({activeFaults.length})</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
          {activeFaults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 font-edp">Nenhuma falha ativa</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden border border-gray-200/60 rounded-xl shadow-sm bg-white">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-edp font-medium text-gray-500 uppercase">Equipamento</th>
                      <th className="px-4 py-3 text-left text-xs font-edp font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-edp font-medium text-gray-500 uppercase">Localização</th>
                      <th className="px-4 py-3 text-left text-xs font-edp font-medium text-gray-500 uppercase">Detectada</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentFaults.map((fault, index) => {
                      const category = EQUIPMENT_CATEGORIES[fault.equipment];
                      return (
                        <tr key={`${fault.wordIndex}_${fault.bitIndex}_${index}`} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-blue-100/20 transition-all duration-200">
                          
                          {/* Equipamento */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200/60 rounded-lg shadow-sm">
                                <FaultIcon 
                                  iconName={category?.icon || 'Shield'} 
                                  className="w-4 h-4" 
                                  color="#374151"
                                />
                              </div>
                              <div>
                                <div className="text-sm font-edp font-medium text-gray-900">
                                  {category?.name || fault.equipment}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-edp text-gray-500">
                                  <span>W{fault.wordIndex}</span>
                                  <span>•</span>
                                  <span>B{fault.bitIndex}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Descrição */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-edp text-gray-900">
                              {fault.description}
                            </div>
                          </td>

                          {/* Localização */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-edp text-gray-900">Eclusa Régua</div>
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-edp text-gray-900">
                              {formatTimestamp(fault.timestamp)}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm font-edp text-gray-700">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, activeFaults.length)} de {activeFaults.length} falhas
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 text-sm rounded ${
                            page === currentPage
                              ? 'bg-edp-neutral-darkest text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};