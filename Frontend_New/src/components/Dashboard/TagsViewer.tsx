import React, { useState, useMemo } from 'react';
import { usePLC } from '../../contexts/PLCContext';
import { Search, Filter, Eye, EyeOff } from 'lucide-react';

const TagsViewer: React.FC = () => {
  const { data: plcData, connectionStatus } = usePLC();
  const [expandedSections, setExpandedSections] = useState<string[]>(['ints', 'reals', 'bits', 'alarm_bits']);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  const filteredData = useMemo(() => {
    if (!plcData) return null;

    const filterBits = (bits: boolean[][], sectionName: string) => {
      if (!showOnlyActive) return bits;
      return bits.map(wordBits => wordBits.filter(bit => bit));
    };

    return {
      ...plcData,
      bit_data: plcData.bit_data ? {
        ...plcData.bit_data,
        status_bits: filterBits(plcData.bit_data.status_bits || [], 'status_bits'),
        alarm_bits: filterBits(plcData.bit_data.alarm_bits || [], 'alarm_bits'),
        event_bits: filterBits(plcData.bit_data.event_bits || [], 'event_bits')
      } : plcData.bit_data
    };
  }, [plcData, showOnlyActive]);

  // Debug removido para evitar spam no console e rate limiting

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header com controles */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Tags WebSocket - Debug Completo</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Controles de filtro */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <button
            onClick={() => setShowOnlyActive(!showOnlyActive)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
              showOnlyActive ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Apenas Ativos
          </button>

          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded border">
            🔥 TODOS OS TAGS VISÍVEIS - SEM LIMITAÇÕES
          </div>
        </div>
      </div>

      {!filteredData ? (
        <div className="text-center py-8 text-gray-500">
          Aguardando dados do WebSocket...
        </div>
      ) : (
        <div className="space-y-4">
          {/* DEBUG INFO MELHORADO */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              📊 Estatísticas dos Dados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="text-gray-600">Integers</div>
                <div className="text-xl font-bold text-green-600">{filteredData.ints?.length || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="text-gray-600">Reais</div>
                <div className="text-xl font-bold text-purple-600">{filteredData.reals?.length || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="text-gray-600">Status Bits</div>
                <div className="text-xl font-bold text-yellow-600">{filteredData.bit_data?.status_bits?.length || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="text-gray-600">Alarm Bits</div>
                <div className="text-xl font-bold text-red-600">{filteredData.bit_data?.alarm_bits?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* INTS */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('ints')}
              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <span className="font-semibold text-green-800">
                Integers ({filteredData.ints?.length || 0} itens)
              </span>
              <span className={`transform transition-transform ${isExpanded('ints') ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isExpanded('ints') && (
              <div className="p-3 bg-gray-50">
                <div className="mb-3">
                  <span className="text-sm text-green-600 font-bold">
                    🎯 MOSTRANDO TODOS OS {filteredData.ints?.length || 0} INTEGERS SEM CORTAR
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-2 max-h-[600px] overflow-y-auto">
                  {filteredData.ints?.map((value, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border hover:bg-green-50 transition-colors">
                      <div className="font-mono text-green-600 mb-1">Int[{index}]</div>
                      <div className="font-bold text-lg">{value}</div>
                      <div className="text-gray-500 text-[10px]">0x{value.toString(16).toUpperCase().padStart(4, '0')}</div>
                    </div>
                  )) || <div className="text-gray-500">Nenhum dado</div>}
                </div>
              </div>
            )}
          </div>

          {/* REALS */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('reals')}
              className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <span className="font-semibold text-purple-800">
                Reais ({filteredData.reals?.length || 0} itens)
              </span>
              <span className={`transform transition-transform ${isExpanded('reals') ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isExpanded('reals') && (
              <div className="p-3 bg-gray-50">
                <div className="mb-3">
                  <span className="text-sm text-purple-600 font-bold">
                    🎯 MOSTRANDO TODOS OS {filteredData.reals?.length || 0} REAIS SEM CORTAR
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-[600px] overflow-y-auto">
                  {filteredData.reals?.map((value, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border hover:bg-purple-50 transition-colors">
                      <div className="font-mono text-purple-600 mb-1">Real[{index}]</div>
                      <div className="font-bold text-lg">{value.toFixed(3)}</div>
                      <div className="text-gray-500 text-[10px]">{value.toExponential(2)}</div>
                    </div>
                  )) || <div className="text-gray-500">Nenhum dado</div>}
                </div>
              </div>
            )}
          </div>

          {/* STATUS BITS */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('bits')}
              className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
            >
              <span className="font-semibold text-yellow-800 flex items-center gap-2">
                Status Bits ({filteredData.bit_data?.status_bits?.length || 0} words)
                {showOnlyActive && (
                  <span className="text-xs bg-yellow-200 px-2 py-1 rounded">Apenas ativos</span>
                )}
              </span>
              <span className={`transform transition-transform ${isExpanded('bits') ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isExpanded('bits') && (
              <div className="p-3 bg-gray-50">
                <div className="mb-3">
                  <span className="text-sm text-yellow-600 font-bold">
                    🎯 MOSTRANDO TODAS AS {filteredData.bit_data?.status_bits?.length || 0} WORDS DE STATUS SEM CORTAR
                  </span>
                </div>
                <div className="space-y-3 max-h-[800px] overflow-y-auto">
                  {filteredData.bit_data?.status_bits?.map((wordBits, wordIndex) => {
                    const activeBits = wordBits?.filter(bit => bit).length || 0;
                    return (
                      <div key={wordIndex} className="bg-white p-3 rounded-lg border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-yellow-600 font-semibold">Status Word[{wordIndex}]</div>
                          <div className="text-xs text-gray-500">
                            {activeBits} de 16 bits ativos
                          </div>
                        </div>
                        <div className="grid grid-cols-16 gap-1">
                          {wordBits?.map((bit, bitIndex) => {
                            const globalBitNumber = wordIndex * 16 + bitIndex;
                            return (
                              <div
                                key={bitIndex}
                                className={`w-10 h-10 text-[9px] flex flex-col items-center justify-center rounded transition-all duration-200 ${
                                  bit 
                                    ? 'bg-green-500 text-white font-bold shadow-lg transform scale-105' 
                                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                }`}
                                title={`Bit ${globalBitNumber} (Word ${wordIndex}, Bit ${bitIndex}): ${bit ? 'ON' : 'OFF'}`}
                              >
                                <span className="leading-none font-semibold">{bitIndex}</span>
                                <span className="text-[7px] leading-none opacity-70">#{globalBitNumber}</span>
                              </div>
                            );
                          }) || (
                            <div className="text-gray-500 text-xs col-span-16 text-center py-2">Nenhum bit</div>
                          )}
                        </div>
                      </div>
                    );
                  }) || <div className="text-gray-500">Nenhum dado</div>}
                </div>
              </div>
            )}
          </div>

          {/* ALARM BITS */}
          <div className="border rounded-lg border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
            <button
              onClick={() => toggleSection('alarm_bits')}
              className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <span className="font-semibold text-red-800 flex items-center gap-2">
                🚨 Alarm Bits ({filteredData.bit_data?.alarm_bits?.length || 0} words)
                {showOnlyActive && (
                  <span className="text-xs bg-red-200 px-2 py-1 rounded">Apenas ativos</span>
                )}
              </span>
              <span className={`transform transition-transform ${isExpanded('alarm_bits') ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isExpanded('alarm_bits') && (
              <div className="p-3 bg-gradient-to-b from-red-50 to-white">
                <div className="mb-3">
                  <span className="text-sm text-red-600 font-bold">
                    🔥 MOSTRANDO TODAS AS {filteredData.bit_data?.alarm_bits?.length || 0} WORDS DE ALARME SEM CORTAR
                  </span>
                </div>
                <div className="space-y-3 max-h-[800px] overflow-y-auto">
                  {filteredData.bit_data?.alarm_bits?.map((wordBits, wordIndex) => {
                    const activeBits = wordBits?.filter(bit => bit).length || 0;
                    const wordNumber = 17 + wordIndex; // AlarmBits[0] = Word 17
                    return (
                      <div key={wordIndex} className={`bg-white p-3 rounded-lg border-2 shadow-md ${
                        activeBits > 0 ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-red-700 font-bold">
                            🔥 Alarm Word[{wordIndex}] (PLC Word {wordNumber})
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            activeBits > 0 ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {activeBits} alarmes ativos
                          </div>
                        </div>
                        <div className="grid grid-cols-16 gap-1">
                          {wordBits?.map((bit, bitIndex) => {
                            const globalBitNumber = wordNumber * 16 + bitIndex;
                            return (
                              <div
                                key={bitIndex}
                                className={`w-10 h-10 text-[9px] flex flex-col items-center justify-center rounded transition-all duration-300 ${
                                  bit 
                                    ? 'bg-red-500 text-white font-bold shadow-lg transform scale-110 animate-pulse' 
                                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                }`}
                                title={`Alarm Bit ${globalBitNumber} (Word ${wordNumber}, Bit ${bitIndex}): ${bit ? 'ATIVO' : 'INATIVO'}`}
                              >
                                <span className="leading-none font-bold">{bitIndex}</span>
                                <span className="text-[7px] leading-none opacity-70">W{wordNumber}</span>
                              </div>
                            );
                          }) || (
                            <div className="text-gray-500 text-xs col-span-16 text-center py-2">Nenhum bit</div>
                          )}
                        </div>
                      </div>
                    );
                  }) || <div className="text-gray-500">Nenhum dado</div>}
                </div>
              </div>
            )}
          </div>

          {/* STRINGS */}
          {filteredData.strings && filteredData.strings.length > 0 && (
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('strings')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <span className="font-semibold text-blue-800">
                  🔤 Strings ({filteredData.strings?.length || 0} itens)
                </span>
                <span className={`transform transition-transform ${isExpanded('strings') ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {isExpanded('strings') && (
                <div className="p-3 bg-gray-50">
                  <div className="mb-3">
                    <span className="text-sm text-blue-600 font-bold">
                      🎯 MOSTRANDO TODAS AS {filteredData.strings?.length || 0} STRINGS SEM CORTAR
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredData.strings?.map((value, index) => (
                      <div key={index} className="text-sm bg-white p-3 rounded border hover:bg-blue-50 transition-colors">
                        <div className="font-mono text-blue-600 mb-1">String[{index}]</div>
                        <div className="font-bold break-all text-gray-800">{value}</div>
                        <div className="text-xs text-gray-500 mt-1">Tamanho: {value?.length || 0} caracteres</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INFO COMPLETA */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              ✅ INFORMAÇÕES COMPLETAS - TODOS OS DADOS VISÍVEIS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600 font-semibold">Última Atualização</div>
                <div className="font-mono text-green-600">
                  {filteredData.timestamp ? new Date(filteredData.timestamp).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600 font-semibold">Tamanho dos Dados</div>
                <div className="font-mono text-blue-600">
                  {filteredData.bytes_size ? `${filteredData.bytes_size} bytes` : 'N/A'}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600 font-semibold">Total de Tags</div>
                <div className="font-mono text-purple-600">
                  {((filteredData.ints?.length || 0) + (filteredData.reals?.length || 0) + (filteredData.strings?.length || 0)).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600 font-semibold">Total de Bits</div>
                <div className="font-mono text-orange-600">
                  {((filteredData.bit_data?.status_bits?.reduce((acc, word) => acc + (word?.length || 0), 0) || 0) + 
                    (filteredData.bit_data?.alarm_bits?.reduce((acc, word) => acc + (word?.length || 0), 0) || 0)).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-gray-600">
              🚀 SISTEMA OTIMIZADO - NENHUMA LIMITAÇÃO APLICADA - TODOS OS DADOS MOSTRADOS
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsViewer;