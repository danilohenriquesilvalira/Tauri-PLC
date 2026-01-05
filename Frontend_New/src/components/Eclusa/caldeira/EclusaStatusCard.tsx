import React from 'react';
import { usePLC } from '../../../contexts/PLCContext';

interface EclusaStatusCardProps {
  height?: number;
}

const EclusaStatusCard: React.FC<EclusaStatusCardProps> = ({ height = 180 }) => {
  const { data: plcData, connectionStatus } = usePLC();

  // Dados do operador - hardcoded sem login
  const operadorNome = 'Operador';

  // Status da operação baseado nos dados PLC
  const portaJusante = plcData?.ints?.[42] || 0;
  const portaMontante = plcData?.ints?.[59] || 0;

  // Determinar status operacional da eclusa
  const getStatusEclusa = () => {
    if (!connectionStatus.connected) return { status: 'Sem Operação', color: 'text-red-600', bg: 'bg-red-100' };
    if (portaJusante > 0 || portaMontante > 0) return { status: 'Operando Local', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Telecomando', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const statusEclusa = getStatusEclusa();

  // Status da comunicação
  const getStatusComunicacao = () => {
    if (connectionStatus.connected) return { status: 'Sem Falha', color: 'text-green-600', bg: 'bg-green-100' };
    return { status: 'Com Falha', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const statusComunicacao = getStatusComunicacao();

  // Status dos alarmes (simulado - pode ser baseado em PLC real)
  const hasAlarmes = false; // TODO: conectar com dados reais do PLC
  const statusAlarmes = hasAlarmes 
    ? { status: 'Ativo', color: 'text-red-600', bg: 'bg-red-100' }
    : { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };

  // Responsividade baseada na altura
  const isSmall = height < 160;
  
  return (
    <div 
      className="bg-gray-200 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Header azul - igual aos outros cards */}
      <div className="bg-slate-700 text-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-edp-electric rounded px-1.5 py-1 flex items-center justify-center">
              <svg className="w-4 h-4 text-edp-marine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h4 className="text-sm font-medium">Status da Eclusa</h4>
          </div>
          
          {/* Valores no header - lado direito igual aos outros cards */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-300">Con</div>
              <div className={`font-bold ${connectionStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                {connectionStatus.connected ? 'OK' : 'OFF'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-300">Op</div>
              <div className={`font-bold ${statusEclusa.color.includes('green') ? 'text-green-400' : statusEclusa.color.includes('yellow') ? 'text-yellow-400' : 'text-red-400'}`}>
                {statusEclusa.status === 'Telecomando' ? 'TEL' : statusEclusa.status === 'Operando Local' ? 'LOC' : 'OFF'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo com 6 seções - responsividade inteligente */}
      <div className="flex-1 w-full bg-gray-200 px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex flex-col justify-center overflow-hidden">
        {/* Grid responsivo: 2 colunas em mobile, 3 em desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 h-full min-h-0">
          
          {/* 1. Operador */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                {operadorNome}
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Operador
              </div>
            </div>
          </div>

          {/* 2. Status da Eclusa */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                {statusEclusa.status}
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Status
              </div>
            </div>
          </div>

          {/* 3. Comunicação */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                {statusComunicacao.status}
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Com.
              </div>
            </div>
          </div>

          {/* 4. Alarmes */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                {statusAlarmes.status}
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Alarmes
              </div>
            </div>
          </div>

          {/* 5. Emergência */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                Normal
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Emerg.
              </div>
            </div>
          </div>

          {/* 6. Servidor */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 p-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-medium text-gray-700 truncate leading-tight">
                Online
              </div>
              <div className="text-xs sm:text-xs text-gray-500 leading-tight">
                Servidor
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EclusaStatusCard;