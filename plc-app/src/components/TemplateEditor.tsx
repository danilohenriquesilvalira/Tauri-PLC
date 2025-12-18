import React, { useState } from 'react';
import { Zap, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { LEDPreview } from './LEDPreview';
import { validateTemplate, extractWordIndices, previewTemplate } from '../utils/templateParser';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textShadow: boolean;
  letterSpacing: number;
  plcData?: { variables: { [key: string]: number } } | null;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  value,
  onChange,
  color,
  fontSize,
  fontFamily,
  fontWeight,
  textShadow,
  letterSpacing,
  plcData
}) => {
  const [selectedWord, setSelectedWord] = useState<number>(0);
  
  // Inserir tag {Word[N]} no cursor
  const insertVariable = () => {
    const textarea = document.getElementById('templateTextarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `{Word[${selectedWord}]}`;
    const newText = value.substring(0, start) + tag + value.substring(end);
    
    onChange(newText);
    
    // Reposicionar cursor após a tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };
  
  // Inserir quebra de linha
  const insertLineBreak = () => {
    const textarea = document.getElementById('templateTextarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + '\n' + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    }, 0);
  };
  
  const errors = validateTemplate(value);
  const wordIndices = extractWordIndices(value);
  const hasRealData = plcData && plcData.variables;
  
  // Gerar preview: usar dados reais se disponíveis, senão simulados
  let previewText = value;
  if (value) {
    if (hasRealData) {
      // Substituir com valores reais do PLC
      previewText = value.replace(/\{Word\[(\d+)\]\}/g, (match, wordIndex) => {
        const key = `Word[${wordIndex}]`;
        const realValue = plcData.variables[key];
        return realValue !== undefined ? String(realValue) : `{?}`;
      });
    } else {
      // Usar preview simulado
      previewText = previewTemplate(value);
    }
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700 uppercase">
          <Zap className="inline w-4 h-4 mr-1 text-yellow-600" />
          Template com Variáveis Dinâmicas
        </label>
        {!hasRealData && (
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Preview simulado (sem PLC conectado)
          </span>
        )}
      </div>
      
      {/* Editor de Template */}
      <div className="border-2 border-yellow-400 rounded-lg overflow-hidden">
        <div className="bg-yellow-50 p-2 border-b border-yellow-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700">Inserir Variável:</span>
            
            <select
              value={selectedWord}
              onChange={(e) => setSelectedWord(parseInt(e.target.value))}
              className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500"
            >
              {Array.from({ length: 64 }, (_, i) => (
                <option key={i} value={i}>Word[{i}]</option>
              ))}
            </select>
            
            <button
              type="button"
              onClick={insertVariable}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-yellow-600 rounded hover:bg-yellow-700"
            >
              <Plus size={12} />
              Inserir
            </button>
            
            <button
              type="button"
              onClick={insertLineBreak}
              className="px-2 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              ↵ Nova Linha
            </button>
          </div>
        </div>
        
        <textarea
          id="templateTextarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm font-mono border-none focus:ring-0 resize-none"
          rows={4}
          placeholder="Exemplo: Velocidade: {Word[10]} km/h&#10;Distância: {Word[11]} metros"
        />
      </div>
      
      {/* Validação */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded p-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-red-800">Erros no Template:</p>
              <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Info sobre variáveis usadas */}
      {wordIndices.length > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded p-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800">Variáveis Monitoradas:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {wordIndices.map(idx => {
                  const key = `Word[${idx}]`;
                  const value = hasRealData ? plcData.variables[key] : undefined;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-white border border-blue-300 rounded"
                    >
                      {key}
                      {value !== undefined && (
                        <span className="text-blue-600 font-bold">= {value}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview LED com Template Processado */}
      {value && (
        <div className="border-4 border-green-400 rounded-lg overflow-hidden">
          <div className="bg-green-50 px-3 py-2 border-b border-green-300">
            <p className="text-xs font-bold text-green-800 uppercase">
              ⚡ Preview do Template Processado
            </p>
          </div>
          <div className="p-3">
            <LEDPreview
              message={previewText || 'Digite um template...'}
              color={color}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              textShadow={textShadow}
              letterSpacing={letterSpacing}
            />
          </div>
        </div>
      )}
      
      {/* Ajuda */}
      <div className="bg-gray-50 border border-gray-300 rounded p-3">
        <p className="text-xs font-bold text-gray-800 mb-1">💡 Dicas:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use <code className="px-1 py-0.5 bg-white border rounded">{'{Word[N]}'}</code> para inserir valores do PLC</li>
          <li>• Exemplo: <code className="px-1 py-0.5 bg-white border rounded">Velocidade: {'{Word[5]}'} km/h</code></li>
          <li>• Pressione "Nova Linha" para texto em múltiplas linhas</li>
          <li>• Combine texto fixo com variáveis dinâmicas</li>
        </ul>
      </div>
    </div>
  );
};
