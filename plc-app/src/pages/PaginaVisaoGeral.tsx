import React, { useState, useEffect } from 'react';
import { Activity, Database, Zap, Cpu, AlertTriangle, Info, AlertCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlcData, SystemLog } from '../types';
import { CardModerno } from '../components/CardModerno';
import { invoke } from '@tauri-apps/api/core';

interface PaginaVisaoGeralProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  plcData: PlcData | null;
}

export const PaginaVisaoGeral: React.FC<PaginaVisaoGeralProps> = ({ 
  isConnected, 
  lastUpdate, 
  plcData 
}) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const recentLogs = await invoke<SystemLog[]>('get_recent_logs', { limit: 100 });
      setLogs(recentLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Paginação
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = logs.slice(startIndex, endIndex);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle size={16} className="text-edp-semantic-red" />;
      case 'error': return <AlertCircle size={16} className="text-edp-semantic-red" />;
      case 'warning': return <AlertTriangle size={16} className="text-edp-semantic-yellow" />;
      default: return <Info size={16} className="text-edp-marine" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-edp-semantic-light-red text-edp-semantic-red';
      case 'error': return 'bg-edp-semantic-red bg-opacity-10 text-edp-semantic-red';
      case 'warning': return 'bg-edp-semantic-light-yellow text-edp-semantic-yellow';
      default: return 'bg-edp-marine bg-opacity-10 text-edp-marine';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards Principais - 4 em cima */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardModerno
          titulo="Status Conexão"
          valor={isConnected ? 'Conectado' : 'Desconectado'}
          icone={Zap}
          cor={isConnected ? 'verde' : 'vermelho'}
        />
        
        <CardModerno
          titulo="Última Atualização"
          valor={lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          icone={Activity}
          cor="azul"
        />
        
        <CardModerno
          titulo="Variáveis PLC"
          valor={plcData ? Object.keys(plcData.variables).length : 0}
          icone={Database}
          cor="neutro"
        />
        
        <CardModerno
          titulo="Fase Eclusa"
          valor={plcData?.variables.fase_eclusa || 0}
          icone={Cpu}
          cor="verde"
        />
      </div>

      {/* Logs do Sistema com Controles Integrados */}
      <div className="bg-white rounded-lg shadow-sm border border-edp-neutral-lighter overflow-hidden">
        <div className="px-6 py-4 border-b border-edp-neutral-lighter bg-edp-neutral-white-wash">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-edp-marine bg-opacity-10 rounded-lg">
                <span className="text-sm font-medium text-edp-marine font-tabular">
                  {logs.length} {logs.length === 1 ? 'log' : 'logs'}
                </span>
              </div>
            </div>
            
            {/* Controles de Logs */}
            <div className="flex items-center gap-3">
              {/* Filtro por Nível */}
              <div className="relative">
                <select className="px-3 py-2.5 text-sm border border-edp-neutral-lighter rounded-lg focus:border-edp-marine focus:ring-1 focus:ring-edp-marine transition-colors bg-white appearance-none pr-8 cursor-pointer">
                  <option value="todos">Todos os níveis</option>
                  <option value="critical">Crítico</option>
                  <option value="error">Erro</option>
                  <option value="warning">Aviso</option>
                  <option value="info">Info</option>
                </select>
              </div>

              {/* Campo de Busca */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar logs..."
                  className="w-64 pl-9 pr-8 py-2.5 text-sm border border-edp-neutral-lighter rounded-lg bg-white focus:border-edp-marine focus:ring-1 focus:ring-edp-marine transition-colors placeholder-edp-slate"
                />
                <svg className="h-4 w-4 text-edp-slate absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Botão Atualizar */}
              <button
                onClick={loadLogs}
                disabled={loadingLogs}
                className="p-2.5 text-edp-slate hover:text-edp-marine hover:bg-edp-neutral-white-tint rounded-lg transition-colors border border-edp-neutral-lighter hover:border-edp-marine disabled:opacity-50"
                title="Atualizar logs"
              >
                <svg className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Botão Exportar */}
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-edp-marine text-white rounded-lg hover:bg-edp-marine-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-edp-neutral-lighter">
          {loadingLogs ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-edp-marine border-t-transparent mx-auto"></div>
              <p className="text-edp-slate mt-2 text-sm">Carregando logs...</p>
            </div>
          ) : logs.length > 0 ? (
            paginatedLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-4 hover:bg-edp-neutral-white-wash transition-colors duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-edp-slate font-mono">
                        {log.category}
                      </span>
                      <span className="text-xs text-edp-neutral-medium">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-edp-marine font-medium">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-edp-slate mt-1 font-mono bg-edp-neutral-white-wash px-2 py-1 rounded">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <Info size={32} className="text-edp-slate mx-auto mb-2" />
              <p className="text-edp-slate">Nenhum log registrado</p>
              <p className="text-xs text-edp-neutral-medium mt-1">Sistema funcionando sem eventos</p>
            </div>
          )}
        </div>

        {/* Paginação - Padrão EDP */}
        {!loadingLogs && logs.length > itemsPerPage && (
          <div className="px-4 py-3 border-t border-edp-neutral-lighter bg-edp-neutral-white-wash">
            <div className="flex items-center justify-between">
              <div className="text-sm text-edp-slate">
                Mostrando <span className="font-semibold font-tabular">{startIndex + 1}</span> a{' '}
                <span className="font-semibold font-tabular">{Math.min(endIndex, logs.length)}</span> de{' '}
                <span className="font-semibold font-tabular">{logs.length}</span> logs
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-edp-neutral-lighter rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-edp flex items-center gap-1 text-edp-marine font-medium"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 text-sm rounded-lg font-medium transition-edp ${
                            page === currentPage
                              ? 'bg-edp-marine text-headline-on-marine'
                              : 'text-edp-marine hover:bg-edp-neutral-white-tint'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-edp-slate">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-edp-neutral-lighter rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-edp flex items-center gap-1 text-edp-marine font-medium"
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginaVisaoGeral;
