import React, { useState } from 'react';
import TagsViewer from '../components/Dashboard/TagsViewer'; 
import AllTagsList from '../components/Dashboard/AllTagsList';
import { FaultDialog } from '../components/Falhas/FaultDialog';
import { FaultIcon } from '../components/Falhas/FaultIcon';
import { useFaultDetector } from '../hooks/useFaultDetector';
import { usePLC } from '../contexts/PLCContext';
import { BarChart3, AlertTriangle, Activity, Database, Wifi, WifiOff, List } from 'lucide-react';

const Falhas: React.FC = () => {
  const { data: plcData, connectionStatus } = usePLC();
  const { activeFaults, faultCount, criticalFaults, statsByCategory } = useFaultDetector({ plcData });
  const [showFaultDialog, setShowFaultDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Estatísticas do sistema
  const systemStats = {
    totalTags: (plcData?.ints?.length || 0) + (plcData?.reals?.length || 0),
    statusBits: plcData?.bit_data?.status_bits?.length || 0,
    alarmBits: plcData?.bit_data?.alarm_bits?.length || 0,
    activeFaults: faultCount,
    criticalFaults: criticalFaults.length
  };

  return (
    <div className="w-full h-full bg-gray-50">
      
      {/* Header da página */}
      <div className="bg-white border-b border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              Sistema de Monitoramento - Debug Completo
            </h1>
            <p className="text-base text-gray-600 font-edp leading-relaxed">
              Visualização em tempo real dos dados do WebSocket e sistema de falhas
            </p>
          </div>
          
          {/* Controles de visualização */}
          <div className="flex items-center gap-4">
            {/* Toggle de visualização */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Por Seções
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'flat' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4 inline mr-1" />
                Lista Completa
              </button>
            </div>

            {/* Status de conexão */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              connectionStatus.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-semibold">
                {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard de estatísticas */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          {/* Total de Tags */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600 font-semibold">TOTAL TAGS</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{systemStats.totalTags}</div>
            <div className="text-xs text-gray-500">Ints + Reals</div>
          </div>

          {/* Status Bits */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-gray-600 font-semibold">STATUS BITS</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{systemStats.statusBits}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>

          {/* Alarm Bits */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-600 font-semibold">ALARM BITS</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{systemStats.alarmBits}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>

          {/* Falhas Ativas */}
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowFaultDialog(true)}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-gray-600 font-semibold">FALHAS ATIVAS</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{systemStats.activeFaults}</div>
            <div className="text-xs text-gray-500">Clique para ver</div>
          </div>

          {/* Falhas Críticas */}
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowFaultDialog(true)}
          >
            <div className="flex items-center gap-2 mb-2">
              <FaultIcon iconName="AlertTriangle" className="w-4 h-4 text-red-700" />
              <span className="text-xs text-gray-600 font-semibold">CRÍTICAS</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{systemStats.criticalFaults}</div>
            <div className="text-xs text-gray-500">Alta prioridade</div>
          </div>

          {/* Timestamp */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-600 font-semibold">ÚLTIMA ATUALIZAÇÃO</span>
            </div>
            <div className="text-xs font-bold text-purple-600">
              {plcData?.timestamp ? new Date(plcData.timestamp).toLocaleTimeString() : '--:--:--'}
            </div>
            <div className="text-xs text-gray-500">Tempo real</div>
          </div>

        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="px-6">
        <div className="grid grid-cols-1 gap-6">
          
          {/* Visualização condicional */}
          {viewMode === 'grouped' ? (
            <>
              {/* Tags WebSocket Viewer por seções */}
              <TagsViewer />
            </>
          ) : (
            <>
              {/* Lista completa de todos os tags */}
              <AllTagsList />
            </>
          )}

        </div>
      </div>

      {/* Dialog de falhas */}
      <FaultDialog
        isOpen={showFaultDialog}
        onClose={() => setShowFaultDialog(false)}
        activeFaults={activeFaults}
      />
    </div>
  );
};

export default Falhas;