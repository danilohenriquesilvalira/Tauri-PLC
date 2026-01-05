import React, { useMemo } from 'react';
import { usePLC } from '../../contexts/PLCContext';

interface TagInfo {
  name: string;
  value: any;
  type: 'int' | 'real' | 'status_bit' | 'alarm_bit' | 'string';
  index: number;
  wordIndex?: number;
  bitIndex?: number;
}

const AllTagsList: React.FC = () => {
  const { data: plcData, connectionStatus } = usePLC();

  const allTags = useMemo(() => {
    if (!plcData) return [];
    
    const tags: TagInfo[] = [];

    // Integers
    plcData.ints?.forEach((value, index) => {
      tags.push({
        name: `Int[${index}]`,
        value: `${value} (0x${value.toString(16).toUpperCase().padStart(4, '0')})`,
        type: 'int',
        index
      });
    });

    // Reals  
    plcData.reals?.forEach((value, index) => {
      tags.push({
        name: `Real[${index}]`,
        value: `${value.toFixed(6)} (${value.toExponential(3)})`,
        type: 'real',
        index
      });
    });

    // Status Bits
    plcData.bit_data?.status_bits?.forEach((wordBits, wordIndex) => {
      wordBits?.forEach((bit, bitIndex) => {
        const globalBit = wordIndex * 16 + bitIndex;
        tags.push({
          name: `StatusBit[W${wordIndex}:B${bitIndex}] (#${globalBit})`,
          value: bit ? 'ON (1)' : 'OFF (0)',
          type: 'status_bit',
          index: globalBit,
          wordIndex,
          bitIndex
        });
      });
    });

    // Alarm Bits
    plcData.bit_data?.alarm_bits?.forEach((wordBits, wordIndex) => {
      wordBits?.forEach((bit, bitIndex) => {
        const actualWord = 17 + wordIndex; // AlarmBits[0] = Word 17
        const globalBit = actualWord * 16 + bitIndex;
        tags.push({
          name: `AlarmBit[W${actualWord}:B${bitIndex}] (#${globalBit})`,
          value: bit ? '🔥 ATIVO (1)' : 'INATIVO (0)',
          type: 'alarm_bit',
          index: globalBit,
          wordIndex: actualWord,
          bitIndex
        });
      });
    });

    // Strings
    plcData.strings?.forEach((value, index) => {
      tags.push({
        name: `String[${index}]`,
        value: value,
        type: 'string',
        index
      });
    });

    return tags;
  }, [plcData]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'int': return 'bg-green-50 border-green-200 text-green-800';
      case 'real': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'status_bit': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'alarm_bit': return 'bg-red-50 border-red-200 text-red-800';
      case 'string': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          🎯 TODOS OS TAGS SEM LIMITAÇÃO ({allTags.length} total)
        </h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded ${
          connectionStatus.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {allTags.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aguardando dados do WebSocket...
        </div>
      ) : (
        <div className="space-y-2 max-h-[800px] overflow-y-auto">
          {allTags.map((tag, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${getTypeColor(tag.type)} hover:shadow-sm transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold">{tag.name}</span>
                  <span className="text-xs px-2 py-1 bg-white rounded border">
                    {tag.type.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-sm">
                  {tag.value}
                </div>
              </div>
              {(tag.wordIndex !== undefined && tag.bitIndex !== undefined) && (
                <div className="text-xs text-gray-600 mt-1">
                  Word: {tag.wordIndex} | Bit: {tag.bitIndex} | Global: #{tag.index}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="text-sm text-blue-800 font-semibold">📊 Resumo dos Dados:</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 text-xs">
          <div>Integers: {plcData?.ints?.length || 0}</div>
          <div>Reals: {plcData?.reals?.length || 0}</div>
          <div>Status Bits: {plcData?.bit_data?.status_bits?.reduce((acc, word) => acc + (word?.length || 0), 0) || 0}</div>
          <div>Alarm Bits: {plcData?.bit_data?.alarm_bits?.reduce((acc, word) => acc + (word?.length || 0), 0) || 0}</div>
          <div>Strings: {plcData?.strings?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default AllTagsList;