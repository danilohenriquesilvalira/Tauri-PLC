import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Save, X, Copy, AlertCircle, CheckCircle } from 'lucide-react';

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

export const PlcStructureModal: React.FC<PlcStructureModalProps> = ({ plcIp, onClose, onSaved }) => {
  const [structureText, setStructureText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Carregar configuração existente ao abrir
  useEffect(() => {
    loadExistingConfig();
  }, [plcIp]);

  const loadExistingConfig = async () => {
    try {
      setLoading(true);
      const config = await invoke<any>('load_plc_structure', { plcIp });
      
      if (config && config.blocks && config.blocks.length > 0) {
        // Converter blocks para texto
        const text = config.blocks
          .map((b: DataBlockConfig) => `${b.name}[0..${b.count - 1}]`)
          .join('\n');
        setStructureText(text);
      } else {
        // Exemplo padrão
        setStructureText('Word[0..64]\nInt[0..64]\nReal[0..64]\nReal2[0..64]');
      }
    } catch (err) {
      console.log('Nenhuma configuração existente, usando exemplo padrão');
      setStructureText('Word[0..64]\nInt[0..64]\nReal[0..64]\nReal2[0..64]');
    } finally {
      setLoading(false);
    }
  };

  // Parseia a estrutura do texto com validação robusta
  const parseStructure = (text: string): DataBlockConfig[] => {
    const blocks: DataBlockConfig[] = [];
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
      
      // Formato: Nome[0..64]
      let match = trimmed.match(/^(\w+)\[0\.\.(\d+)\]$/i);
      if (match) {
        const name = match[1];
        const lastIndex = parseInt(match[2]);
        const count = lastIndex + 1;
        
        // Detectar tipo pelo nome
        const nameLower = name.toLowerCase();
        let type = 'WORD';
        if (nameLower.includes('byte')) type = 'BYTE';
        else if (nameLower.includes('dword') || nameLower.includes('dint')) type = 'DWORD';
        else if (nameLower.includes('int')) type = 'INT';
        else if (nameLower.includes('real')) type = 'REAL';
        else if (nameLower.includes('word')) type = 'WORD';
        
        blocks.push({ data_type: type, count, name });
        continue;
      }
      
      // Formato: Nome Array[0..64] of Type
      match = trimmed.match(/^(\w+)\s+Array\[0\.\.(\d+)\]\s+of\s+(\w+)$/i);
      if (match) {
        const name = match[1];
        const lastIndex = parseInt(match[2]);
        const count = lastIndex + 1;
        const type = match[3].toUpperCase();
        blocks.push({ data_type: type, count, name });
        continue;
      }
      
      // Formato simples: WORD 65
      match = trimmed.match(/^(\w+)\s+(\d+)$/i);
      if (match) {
        const nameOrType = match[1].toUpperCase();
        const count = parseInt(match[2]);
        
        const knownTypes = ['BYTE', 'WORD', 'INT', 'DWORD', 'DINT', 'REAL', 'LWORD', 'LINT', 'LREAL'];
        if (knownTypes.includes(nameOrType)) {
          blocks.push({ data_type: nameOrType, count, name: nameOrType });
        } else {
          const nameLower = nameOrType.toLowerCase();
          let type = 'WORD';
          if (nameLower.includes('byte')) type = 'BYTE';
          else if (nameLower.includes('dword') || nameLower.includes('dint')) type = 'DWORD';
          else if (nameLower.includes('int')) type = 'INT';
          else if (nameLower.includes('real')) type = 'REAL';
          blocks.push({ data_type: type, count, name: nameOrType });
        }
      }
    }
    
    return blocks;
  };

  const calculateTotalSize = (blocks: DataBlockConfig[]): number => {
    const sizes: Record<string, number> = {
      'BYTE': 1, 'WORD': 2, 'INT': 2, 'DWORD': 4, 'DINT': 4, 
      'REAL': 4, 'LWORD': 8, 'LINT': 8, 'LREAL': 8,
    };
    
    return blocks.reduce((total, block) => {
      const size = sizes[block.data_type] || 0;
      return total + (size * block.count);
    }, 0);
  };
  
  // Atualiza preview quando o texto muda
  useEffect(() => {
    if (!structureText.trim()) {
      setPreview('Digite ou cole a estrutura do PLC para ver o preview...');
      setHasUnsavedChanges(false);
      return;
    }

    try {
      const blocks = parseStructure(structureText);
      if (blocks.length === 0) {
        setPreview('⚠️ Nenhum bloco válido detectado.\n\nFormatos aceitos:\n• Word[0..64]\n• Word Array[0..64] of Word\n• WORD 65');
        setError('Formato inválido');
        return;
      }
      
      const totalSize = calculateTotalSize(blocks);
      const lines = blocks.map(b => {
        const sizes: Record<string, number> = {
          'BYTE': 1, 'WORD': 2, 'INT': 2, 'DWORD': 4, 'DINT': 4, 
          'REAL': 4, 'LWORD': 8, 'LINT': 8, 'LREAL': 8,
        };
        const size = sizes[b.data_type] || 0;
        return `  ${b.name}: ${b.data_type} × ${b.count} = ${b.count * size} bytes`;
      });
      
      setPreview(`✅ Estrutura válida!\n\nBlocos detectados:\n${lines.join('\n')}\n\n📦 Total: ${totalSize} bytes (${blocks.length} blocos)`);
      setError(null);
      setHasUnsavedChanges(true);
    } catch (err) {
      setPreview('❌ Erro ao processar estrutura');
      setError(String(err));
    }
  }, [structureText]);

  const handleSave = async () => {
    try {
      const blocks = parseStructure(structureText);
      
      if (blocks.length === 0) {
        setError('Nenhum bloco válido encontrado. Verifique o formato!');
        return;
      }

      setSaving(true);
      setError(null);

      await invoke('save_plc_structure', {
        plcIp,
        blocks
      });
      
      console.log(`✅ Configuração salva para ${plcIp}`);
      setHasUnsavedChanges(false);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError(`Falha ao salvar: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const cancelClose = () => {
    setShowConfirmClose(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#212E3E]"></div>
            <span className="text-[#212E3E]">Carregando configuração...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header - Compacto e limpo */}
        <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-[#212E3E]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configurar Estrutura de Dados</h2>
              <p className="text-xs text-gray-400">PLC: {plcIp} • Configuração de blocos</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Coluna Esquerda: Input (3 colunas) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-[#212E3E] mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#212E3E]">Cole a estrutura do TIA Portal</h3>
                    <p className="text-xs text-[#7C9599] mt-1">
                      Copie diretamente do seu programa e cole aqui!
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded p-2 font-mono text-xs space-y-1 mt-2 border border-[#BECACC]">
                  <div className="text-[#212E3E]">Word[0..64]</div>
                  <div className="text-[#212E3E]">Int[0..64]</div>
                  <div className="text-[#212E3E]">Real[0..64]</div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-[#7C9599]">
                    <span className="font-semibold text-[#212E3E]">Formatos:</span>
                    <code className="ml-2 bg-white px-1.5 py-0.5 rounded text-[#212E3E] border border-[#BECACC]">Word[0..64]</code>
                    <code className="ml-1 bg-white px-1.5 py-0.5 rounded text-[#212E3E] border border-[#BECACC]">WORD 65</code>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[#212E3E] mb-2 block">
                  Estrutura do PLC:
                </label>
                <textarea
                  value={structureText}
                  onChange={(e) => setStructureText(e.target.value)}
                  placeholder="Word[0..64]&#10;Int[0..64]&#10;Real[0..64]&#10;Real2[0..64]"
                  className="w-full h-64 bg-white text-[#212E3E] rounded-lg p-4 font-mono text-sm border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none resize-none"
                />
                <p className="text-xs text-[#7C9599] mt-2">
                  💡 Uma linha por array. O tipo é detectado automaticamente!
                </p>
              </div>

              <button
                onClick={() => setStructureText('Word[0..64]\nInt[0..64]\nReal[0..64]\nReal2[0..64]')}
                className="w-full bg-white hover:bg-[#F1F4F4] text-[#212E3E] rounded-lg p-2.5 flex items-center justify-center gap-2 transition-colors text-sm font-semibold border border-[#BECACC]"
              >
                <Copy className="w-4 h-4" />
                Usar Exemplo
              </button>
            </div>

            {/* Coluna Direita: Preview (2 colunas) */}
            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-[#212E3E] mb-2 block flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#212E3E]" />
                Preview
              </label>
              <div className="bg-[#F1F4F4] rounded-lg p-4 border border-[#BECACC] h-[450px] overflow-y-auto">
                <pre className="text-xs text-[#212E3E] whitespace-pre-wrap font-mono leading-relaxed">
                  {preview}
                </pre>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 bg-red-50 border border-[#E32C2C] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#E32C2C] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#E32C2C]">Erro ao processar</h4>
                <p className="text-sm text-[#212E3E] mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-[#BECACC] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#7C9599]">
            {hasUnsavedChanges && (
              <>
                <AlertCircle className="w-4 h-4 text-[#7C9599]" />
                <span className="font-medium">Alterações não salvas</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-white hover:bg-[#F1F4F4] text-[#212E3E] rounded-lg transition-colors font-medium border border-[#BECACC]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !structureText.trim() || !!error}
              className="px-6 py-2.5 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>

        {/* Modal de Confirmação */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10" onClick={cancelClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 border border-[#BECACC]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-[#F1F4F4] p-2 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-[#7C9599]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#212E3E] mb-1">Alterações não salvas</h3>
                  <p className="text-sm text-[#7C9599]">
                    Você tem alterações que ainda não foram salvas. Deseja realmente fechar sem salvar?
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelClose}
                  className="px-4 py-2 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-semibold transition-colors"
                >
                  Continuar Editando
                </button>
                <button
                  onClick={confirmClose}
                  className="px-4 py-2 bg-[#E32C2C] hover:bg-[#c92626] text-white rounded-lg font-semibold transition-colors"
                >
                  Fechar Sem Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
