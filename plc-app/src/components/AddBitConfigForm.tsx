import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LEDPreview } from './LEDPreview';
import { TemplateEditor } from './TemplateEditor';

interface AddBitConfigFormProps {
  onAdd: (bitConfig: {
    wordIndex: number;
    bitIndex: number;
    name: string;
    message: string;
    messageOff: string;
    enabled: boolean;
    priority: number;
    color: string;
    fontSize: number;
    position: string;
    fontFamily: string;
    fontWeight: string;
    textShadow: boolean;
    letterSpacing: number;
    useTemplate: boolean;
    messageTemplate: string;
  }) => Promise<void>;
  onCancel: () => void;
  plcData?: { variables: { [key: string]: number } } | null;
}

export const AddBitConfigForm: React.FC<AddBitConfigFormProps> = ({ onAdd, onCancel, plcData }) => {
  const [formData, setFormData] = useState({
    wordIndex: 0,
    bitIndex: 0,
    name: '',
    message: '',
    messageOff: '',
    enabled: true,
    priority: 50,
    color: '#00ff00',
    fontSize: 200,
    position: 'center',
    fontFamily: 'Arial Black',
    fontWeight: 'bold',
    textShadow: true,
    letterSpacing: 5,
    useTemplate: false,
    messageTemplate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.message) {
      alert('❌ Nome e mensagem são obrigatórios!');
      return;
    }

    if (formData.wordIndex < 0 || formData.wordIndex > 63) {
      alert('❌ Grupo deve estar entre 0 e 63!');
      return;
    }

    if (formData.bitIndex < 0 || formData.bitIndex > 15) {
      alert('❌ Posição deve estar entre 0 e 15!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } catch (error) {
      console.error('Erro ao adicionar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-edp-marine-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-edp-marine-900">Novo Controle de Mensagem</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* PREVIEW LED EM TEMPO REAL */}
        <div className="border-4 border-edp-semantic-yellow p-4 bg-edp-semantic-light-yellow rounded-lg">
          <h4 className="text-sm font-bold text-yellow-800 mb-2 uppercase">⚡ Preview do Painel LED</h4>
          <LEDPreview
            message={formData.message || 'DIGITE SUA MENSAGEM'}
            color={formData.color}
            fontSize={formData.fontSize}
            fontFamily={formData.fontFamily}
            fontWeight={formData.fontWeight}
            textShadow={formData.textShadow}
            letterSpacing={formData.letterSpacing}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-edp-slate mb-1">Grupo (0-63)</label>
            <input
              type="number"
              min="0"
              max="63"
              value={formData.wordIndex}
              onChange={(e) => setFormData({ ...formData, wordIndex: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-edp-marine-500 focus:border-edp-marine-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-edp-slate mb-1">Posição (0-15)</label>
            <input
              type="number"
              min="0"
              max="15"
              value={formData.bitIndex}
              onChange={(e) => setFormData({ ...formData, bitIndex: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-edp-marine-500 focus:border-edp-marine-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-edp-slate mb-1">Prioridade</label>
            <input
              type="number"
              min="0"
              max="999"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-edp-marine-500 focus:border-edp-marine-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-edp-slate mb-1">Cor</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-edp-slate mb-1">Nome do Controle *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-edp-marine-500 focus:border-edp-marine-500"
            placeholder="Ex: Porta Montante Aberta"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-edp-slate mb-1">Mensagem (quando ativo) *</label>
          <input
            type="text"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2 text-base font-semibold border-2 border-yellow-400 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="EX: ATENÇÃO - PERIGO!"
            required={!formData.useTemplate}
          />
          <p className="text-xs text-edp-slate mt-1">💡 Esta mensagem aparecerá no painel LED quando o bit estiver ativo</p>
        </div>

        {/* TOGGLE: Usar Template com Variáveis */}
        <div className="border-2 border-edp-slate rounded-lg p-4 bg-edp-slate bg-opacity-10">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.useTemplate}
              onChange={(e) => setFormData({ ...formData, useTemplate: e.target.checked })}
              className="w-5 h-5 text-edp-marine border-edp-neutral-light rounded focus:ring-edp-marine mt-0.5"
            />
            <div className="flex-1">
              <span className="text-sm font-bold text-edp-marine block">
                🚀 Usar Template Avançado com Variáveis do PLC
              </span>
              <p className="text-xs text-edp-slate mt-1">
                Ative para incluir valores dinâmicos do PLC na mensagem (ex: velocidade, distância, temperaturas)
              </p>
            </div>
          </label>
        </div>

        {/* EDITOR DE TEMPLATE (aparece quando toggle ativado) */}
        {formData.useTemplate && (
          <TemplateEditor
            value={formData.messageTemplate}
            onChange={(value) => setFormData({ ...formData, messageTemplate: value })}
            color={formData.color}
            fontSize={formData.fontSize}
            fontFamily={formData.fontFamily}
            fontWeight={formData.fontWeight}
            textShadow={formData.textShadow}
            letterSpacing={formData.letterSpacing}
            plcData={plcData}
          />
        )}

        {/* CONFIGURAÇÕES DE ESTILO LED */}
        <div className="border-2 border-edp-electric p-4 rounded-lg bg-edp-electric bg-opacity-10">
          <h4 className="text-sm font-bold text-edp-marine mb-3">🎨 Estilo do Texto LED</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-edp-marine mb-1">Fonte para LED</label>
              <select
                value={formData.fontFamily}
                onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                className="w-full px-2 py-2 text-sm font-bold border-2 border-gray-300 rounded focus:ring-2 focus:ring-edp-marine-500"
              >
                <option value="Arial Black">Arial Black (Grosso)</option>
                <option value="Impact">Impact (Super Grosso)</option>
                <option value="Tahoma">Tahoma Bold</option>
                <option value="Verdana">Verdana Bold</option>
                <option value="monospace">Monospace (Terminal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-edp-marine mb-1">Peso da Fonte</label>
              <select
                value={formData.fontWeight}
                onChange={(e) => setFormData({ ...formData, fontWeight: e.target.value })}
                className="w-full px-2 py-2 text-sm font-bold border-2 border-gray-300 rounded focus:ring-2 focus:ring-edp-marine-500"
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito (Bold)</option>
                <option value="900">Extra Negrito (Black)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-edp-marine mb-1">Tamanho OUTDOOR (px)</label>
              <select
                value={formData.fontSize}
                onChange={(e) => setFormData({ ...formData, fontSize: parseInt(e.target.value) })}
                className="w-full px-2 py-2 text-sm font-bold border-2 border-gray-300 rounded focus:ring-2 focus:ring-edp-marine-500"
              >
                <option value="80">Pequeno - 80px</option>
                <option value="120">Médio - 120px</option>
                <option value="150">Grande - 150px</option>
                <option value="200">GIGANTE - 200px 🔥</option>
                <option value="250">COLOSSAL - 250px 💪</option>
                <option value="300">TITÂNICO - 300px ⚡</option>
                <option value="400">MEGA OUTDOOR - 400px 🚀</option>
                <option value="500">ULTRA GIGANTE - 500px ⚡⚡⚡</option>
              </select>
              <p className="text-xs text-orange-600 mt-1 font-bold">💡 Painéis outdoor precisam de fontes GIGANTES!</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-edp-marine mb-1">Espaçamento (px)</label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.letterSpacing}
                onChange={(e) => setFormData({ ...formData, letterSpacing: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-edp-marine-500"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="textShadow"
              checked={formData.textShadow}
              onChange={(e) => setFormData({ ...formData, textShadow: e.target.checked })}
              className="w-5 h-5 text-edp-marine-600 border-gray-300 rounded focus:ring-edp-marine-500"
            />
            <label htmlFor="textShadow" className="ml-2 text-sm font-bold text-edp-marine">
              💡 Ativar Efeito LED (Glow/Brilho)
            </label>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="w-4 h-4 text-edp-marine-600 border-gray-300 rounded focus:ring-edp-marine-500"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-edp-marine">Ativo</label>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-edp-marine bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-white bg-edp-marine-600 rounded hover:bg-edp-marine-700 disabled:bg-gray-400"
          >
            <Plus size={14} />
            <span>{isSubmitting ? 'Adicionando...' : 'Adicionar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
