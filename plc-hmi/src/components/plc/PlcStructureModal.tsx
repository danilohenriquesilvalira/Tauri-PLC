import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Plus, Trash2, Save, X } from 'lucide-react';

interface DataBlockConfig {
  data_type: string;
  count: number;
  name: string;
}

interface PlcStructureModalProps {
  plcIp: string;
  onClose: () => void;
  onSaved: () => void;
}

const dataTypes = [
  { value: 'BYTE', label: 'BYTE (1 byte)', size: 1 },
  { value: 'WORD', label: 'WORD (2 bytes)', size: 2 },
  { value: 'INT', label: 'INT (2 bytes)', size: 2 },
  { value: 'DWORD', label: 'DWORD (4 bytes)', size: 4 },
  { value: 'DINT', label: 'DINT (4 bytes)', size: 4 },
  { value: 'REAL', label: 'REAL (4 bytes)', size: 4 },
  { value: 'LWORD', label: 'LWORD (8 bytes)', size: 8 },
  { value: 'LINT', label: 'LINT (8 bytes)', size: 8 },
  { value: 'LREAL', label: 'LREAL (8 bytes)', size: 8 },
];

export const PlcStructureModal: React.FC<PlcStructureModalProps> = ({ plcIp, onClose, onSaved }) => {
  const [blocks, setBlocks] = useState<DataBlockConfig[]>([
    { data_type: 'WORD', count: 65, name: 'Word' }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBlock = () => {
    setBlocks([...blocks, { data_type: 'WORD', count: 1, name: `Block${blocks.length + 1}` }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: keyof DataBlockConfig, value: string | number) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };

  const calculateTotalSize = () => {
    return blocks.reduce((total, block) => {
      const typeInfo = dataTypes.find(t => t.value === block.data_type);
      return total + (typeInfo ? typeInfo.size * block.count : 0);
    }, 0);
  };

  const handleSave = async () => {
    if (blocks.length === 0) {
      setError('Adicione pelo menos um bloco de dados');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await invoke<string>('save_plc_structure', {
        plcIp,
        blocks
      });
      console.log(result);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#212E3E] to-[#2a3f5f] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#28FF52]" />
            <div>
              <h2 className="text-xl font-bold text-white">Configurar Estrutura de Dados</h2>
              <p className="text-sm text-gray-400 mt-1">PLC: {plcIp}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-2">📋 Como configurar:</h3>
            <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
              <li>Adicione cada array/bloco que o PLC envia na ordem correta</li>
              <li>Defina o tipo de dados (WORD, INT, REAL, etc.)</li>
              <li>Informe a quantidade de elementos (ex: 65 para Array[0..64])</li>
              <li>Dê um nome descritivo para identificar cada bloco</li>
            </ol>
          </div>

          {/* Blocks */}
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div key={index} className="bg-[#212E3E] rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-400">Bloco {index + 1}</span>
                  <button
                    onClick={() => removeBlock(index)}
                    className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Tipo */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tipo de Dados</label>
                    <select
                      value={block.data_type}
                      onChange={(e) => updateBlock(index, 'data_type', e.target.value)}
                      className="w-full bg-[#1a2332] text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#28FF52] focus:outline-none"
                    >
                      {dataTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantidade */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={block.count}
                      onChange={(e) => updateBlock(index, 'count', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#1a2332] text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#28FF52] focus:outline-none"
                    />
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={block.name}
                      onChange={(e) => updateBlock(index, 'name', e.target.value)}
                      placeholder="ex: Word, Real, Int"
                      className="w-full bg-[#1a2332] text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#28FF52] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tamanho Calculado */}
                <div className="mt-2 text-xs text-gray-400">
                  Tamanho: {dataTypes.find(t => t.value === block.data_type)?.size || 0} × {block.count} = {' '}
                  <span className="text-[#28FF52]">
                    {(dataTypes.find(t => t.value === block.data_type)?.size || 0) * block.count} bytes
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Block Button */}
          <button
            onClick={addBlock}
            className="w-full bg-[#212E3E] hover:bg-[#2a3f5f] text-[#28FF52] rounded-lg p-3 flex items-center justify-center gap-2 transition-colors border border-gray-700"
          >
            <Plus className="w-5 h-5" />
            Adicionar Bloco
          </button>

          {/* Total Size */}
          <div className="bg-[#212E3E] rounded-lg p-4 border border-[#28FF52]/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Tamanho Total Esperado:</span>
              <span className="text-xl font-bold text-[#28FF52]">{calculateTotalSize()} bytes</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              O PLC deve enviar exatamente {calculateTotalSize()} bytes para corresponder a esta configuração
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#212E3E] p-4 flex items-center justify-end gap-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || blocks.length === 0}
            className="px-6 py-2 bg-[#28FF52] hover:bg-[#20cc42] text-[#212E3E] rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
};
