import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Cpu, Power, AlertCircle, Check, Edit, Trash2, RefreshCw, MapPin, Ruler, Search, ChevronLeft, ChevronRight, X, CheckCircle, XCircle, Palette, Settings, Code, Eye } from 'lucide-react';
import type { PlcData, BitConfig } from '../types';
import { AddBitConfigForm } from '../components/AddBitConfigForm';
import { LEDPreview } from '../components/LEDPreview';
import { TemplateEditor } from '../components/TemplateEditor';

interface PaginaBitsProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  plcData: PlcData | null;
}

export const PaginaBits: React.FC<PaginaBitsProps> = ({ 
  isConnected, 
  lastUpdate, 
  plcData 
}) => {
  const [bitConfigs, setBitConfigs] = useState<BitConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBitForm, setShowAddBitForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para o modal de edição
  const [editingBit, setEditingBit] = useState<BitConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadBitConfigs();
  }, []);

  const loadBitConfigs = async () => {
    setIsLoading(true);
    try {
      const bitConfigsData = await invoke<BitConfig[]>('get_all_bit_configs');
      setBitConfigs(bitConfigsData);
    } catch (error) {
      console.error('Erro ao carregar configurações de bits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewBitConfig = async (bitConfig: {
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
  }) => {
    try {
      // Já vem em camelCase do formulário, apenas envia para o backend
      await invoke('add_bit_config', {
        wordIndex: bitConfig.wordIndex,
        bitIndex: bitConfig.bitIndex,
        name: bitConfig.name,
        message: bitConfig.message,
        messageOff: bitConfig.messageOff,
        enabled: bitConfig.enabled,
        priority: bitConfig.priority,
        color: bitConfig.color,
        fontSize: bitConfig.fontSize,
        position: bitConfig.position,
        fontFamily: bitConfig.fontFamily,
        fontWeight: bitConfig.fontWeight,
        textShadow: bitConfig.textShadow,
        letterSpacing: bitConfig.letterSpacing,
        useTemplate: bitConfig.useTemplate,
        messageTemplate: bitConfig.messageTemplate,
      });
      setShowAddBitForm(false);
      await loadBitConfigs();
      alert('Configuração de bit adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar configuração de bit:', error);
      alert(`Erro: ${error}`);
    }
  };

  // Funções para o modal de edição
  const handleEditBit = (bitConfig: BitConfig) => {
    setEditingBit(bitConfig);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingBit(null);
    setShowEditModal(false);
  };

  const handleUpdateBit = async (updatedBit: {
    name: string;
    message: string;
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
  }) => {
    if (!editingBit) return;
    
    try {
      await invoke('update_bit_config', {
        wordIndex: editingBit.word_index,
        bitIndex: editingBit.bit_index,
        name: updatedBit.name,
        message: updatedBit.message,
        messageOff: '',
        enabled: updatedBit.enabled,
        priority: updatedBit.priority,
        color: updatedBit.color,
        fontSize: updatedBit.fontSize,
        position: updatedBit.position,
        fontFamily: updatedBit.fontFamily,
        fontWeight: updatedBit.fontWeight,
        textShadow: updatedBit.textShadow,
        letterSpacing: updatedBit.letterSpacing,
        useTemplate: updatedBit.useTemplate,
        messageTemplate: updatedBit.messageTemplate,
      });
      
      handleCloseEditModal();
      await loadBitConfigs();
      alert('Configuração atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      alert(`Erro: ${error}`);
    }
  };

  const activeBits = bitConfigs.filter(b => b.enabled).length;
  const inactiveBits = bitConfigs.filter(b => !b.enabled).length;

  // Filtrar bits por busca
  const filteredBits = bitConfigs.filter(bit => 
    bit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bit.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${bit.word_index}.${bit.bit_index}`.includes(searchTerm)
  );

  // Paginação
  const totalPages = Math.ceil(filteredBits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBits = filteredBits.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Stats Cards - Design Minimalista EDP */}
      {bitConfigs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card Total de Bits */}
          <div className="bg-white border border-edp-neutral-lighter rounded-lg p-4 hover:border-edp-marine transition-colors">
            <div className="text-sm text-edp-slate mb-1">Total de Bits</div>
            <div className="text-2xl font-bold text-edp-marine font-tabular">{bitConfigs.length}</div>
          </div>
          
          {/* Card Bits Ativos */}
          <div className="bg-white border border-edp-neutral-lighter rounded-lg p-4 hover:border-edp-marine transition-colors">
            <div className="text-sm text-edp-slate mb-1">Bits Ativos</div>
            <div className="text-2xl font-bold text-edp-marine font-tabular">{activeBits}</div>
          </div>
          
          {/* Card Bits Inativos */}
          <div className="bg-white border border-edp-neutral-lighter rounded-lg p-4 hover:border-edp-slate transition-colors">
            <div className="text-sm text-edp-slate mb-1">Bits Inativos</div>
            <div className="text-2xl font-bold text-edp-slate font-tabular">{inactiveBits}</div>
          </div>
          
          {/* Card Conexão PLC */}
          <div className={`bg-white border rounded-lg p-4 transition-colors ${
            isConnected 
              ? 'border-edp-marine hover:border-edp-marine' 
              : 'border-edp-neutral-lighter hover:border-edp-slate'
          }`}>
            <div className="text-sm text-edp-slate mb-1">Conexão PLC</div>
            <div className={`text-2xl font-bold font-tabular ${
              isConnected ? 'text-edp-marine' : 'text-edp-slate'
            }`}>
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      )}

      {/* Tabela com Controles Integrados - Design EDP Compacto */}
      <div className="bg-white rounded-lg shadow-sm border border-edp-neutral-lighter overflow-hidden">
        {/* Header da Tabela com Controles */}
        <div className="px-6 py-4 border-b border-edp-neutral-lighter bg-edp-neutral-white-wash">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Contador compacto */}
              <div className="px-3 py-1.5 bg-edp-marine bg-opacity-10 rounded-lg">
                <span className="text-sm font-medium text-edp-marine font-tabular">
                  {filteredBits.length} {filteredBits.length === 1 ? 'configuração' : 'configurações'}
                </span>
              </div>
            </div>
            
            {/* Controles */}
            <div className="flex items-center gap-3">
              {/* Campo de Busca */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar configurações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-8 py-2.5 text-sm border border-edp-neutral-lighter rounded-lg bg-white focus:border-edp-marine focus:ring-1 focus:ring-edp-marine transition-colors placeholder-edp-slate"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-edp-slate" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-edp-slate hover:text-edp-marine transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Botão Recarregar */}
              <button
                onClick={loadBitConfigs}
                disabled={isLoading}
                className="p-2.5 text-edp-slate hover:text-edp-marine hover:bg-edp-neutral-white-tint rounded-lg transition-colors border border-edp-neutral-lighter hover:border-edp-marine disabled:opacity-50"
                title="Recarregar configurações"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
              
              {/* Botão Novo */}
              <button
                onClick={() => setShowAddBitForm(!showAddBitForm)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  showAddBitForm 
                    ? 'bg-edp-semantic-red text-white hover:bg-opacity-90'
                    : 'bg-edp-marine text-white hover:bg-edp-marine-100'
                }`}
              >
                <Plus size={16} className={`transition-transform ${showAddBitForm ? 'rotate-45' : ''}`} />
                {showAddBitForm ? 'Cancelar' : 'Novo Bit'}
              </button>
            </div>
          </div>
          
          {/* Indicador de Busca - Compacto */}
          {searchTerm && (
            <div className="mt-3 pt-3 border-t border-edp-neutral-lighter">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-edp-slate">
                  <Search size={14} />
                  <span>
                    {filteredBits.length} resultado{filteredBits.length !== 1 ? 's' : ''} para <strong>"{searchTerm}"</strong>
                  </span>
                </div>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-edp-marine hover:underline transition-edp"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Bit Form Integrado */}
        {showAddBitForm && (
          <div className="px-6 py-4 border-b border-edp-neutral-lighter bg-edp-marine bg-opacity-5">
            <AddBitConfigForm 
              onAdd={addNewBitConfig} 
              onCancel={() => setShowAddBitForm(false)}
              plcData={plcData}
            />
          </div>
        )}

        {/* Conteúdo da Tabela */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-edp-marine border-t-transparent mx-auto mb-4"></div>
            <p className="text-edp-slate">Carregando configurações...</p>
          </div>
        ) : filteredBits.length > 0 ? (
          <>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-edp-neutral-white-wash border-b border-edp-neutral-lighter">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-edp-marine">Bit / Mensagem</th>
                    <th className="text-center py-4 px-4 font-semibold text-edp-marine">Status PLC</th>
                    <th className="text-center py-4 px-4 font-semibold text-edp-marine">Configuração</th>
                    <th className="text-center py-4 px-4 font-semibold text-edp-marine">Prioridade</th>
                    <th className="text-center py-4 px-4 font-semibold text-edp-marine">Posição</th>
                    <th className="text-center py-4 px-4 font-semibold text-edp-marine">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edp-neutral-lighter">
                  {paginatedBits.map((bitConfig) => (
                    <BitConfigTableRow 
                      key={bitConfig.id} 
                      bitConfig={bitConfig} 
                      onEdit={() => handleEditBit(bitConfig)}
                      onUpdate={loadBitConfigs} 
                      plcData={plcData} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginação EDP */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-edp-neutral-lighter bg-edp-neutral-white-wash">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-edp-slate">
                    Mostrando <span className="font-semibold font-tabular text-edp-marine">{startIndex + 1}</span> a{' '}
                    <span className="font-semibold font-tabular text-edp-marine">{Math.min(endIndex, filteredBits.length)}</span> de{' '}
                    <span className="font-semibold font-tabular text-edp-marine">{filteredBits.length}</span> bits
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-edp-neutral-lighter rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-edp flex items-center gap-1 text-edp-marine font-medium"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((numeroPage) => (
                        <button
                          key={numeroPage}
                          onClick={() => setCurrentPage(numeroPage)}
                          className={`w-8 h-8 text-sm rounded-lg font-medium transition-edp ${
                            numeroPage === currentPage
                              ? 'bg-edp-marine text-white'
                              : 'text-edp-marine hover:bg-edp-neutral-white-tint'
                          }`}
                        >
                          {numeroPage}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
          </>
        ) : searchTerm ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-edp-neutral-white-wash rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-edp-slate" />
            </div>
            <h3 className="text-lg font-semibold text-edp-marine mb-2">Nenhum resultado encontrado</h3>
            <p className="text-edp-slate mb-4">
              Não encontramos configurações que correspondam a "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-edp-marine hover:text-edp-marine-100 underline transition-edp"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-edp-neutral-white-wash rounded-full flex items-center justify-center mx-auto mb-4">
              <Cpu size={32} className="text-edp-slate" />
            </div>
            <h3 className="text-lg font-semibold text-edp-marine mb-2">Nenhuma configuração de bit</h3>
            <p className="text-edp-slate mb-6">
              Adicione controles baseados em bits do PLC para exibição no painel
            </p>
            <button
              onClick={() => setShowAddBitForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-edp-marine text-white rounded-lg hover:bg-edp-marine-100 transition-edp font-medium mx-auto"
            >
              <Plus size={18} />
              Criar Primeiro Controle
            </button>
          </div>
        )}
      </div>


      {/* Modal de Edição */}
      {showEditModal && editingBit && (
        <EditBitModal 
          bitConfig={editingBit}
          onSave={handleUpdateBit}
          onClose={handleCloseEditModal}
          plcData={plcData}
        />
      )}
    </div>
  );
};

// Componente para linha da tabela de bits
const BitConfigTableRow: React.FC<{ 
  bitConfig: BitConfig;
  onEdit: () => void;
  onUpdate: () => void;
  plcData?: PlcData | null;
}> = ({ bitConfig, onEdit, onUpdate, plcData }) => {

  // Calcular estado atual do bit baseado nos dados do PLC
  const getCurrentBitValue = (): boolean => {
    if (!plcData?.variables) return false;
    
    const wordKey = `Word[${bitConfig.word_index}]`;
    const wordValue = plcData.variables[wordKey] || 0;
    return ((wordValue >> bitConfig.bit_index) & 1) === 1;
  };

  const bitValue = getCurrentBitValue();

  return (
    <tr className="hover:bg-edp-neutral-white-wash transition-all duration-200 group">
      <td className="py-4 px-6">
        <div className="flex items-start space-x-3">
          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: bitConfig.color }}></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-edp-marine truncate group-hover:text-edp-marine-100 transition-colors">{bitConfig.name}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-edp-neutral-white-tint text-edp-slate">
                Word[{bitConfig.word_index}].{bitConfig.bit_index}
              </span>
            </div>
            <p className="text-sm text-edp-slate truncate">{bitConfig.message || '(mensagem não definida)'}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-center">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          bitValue ? 'bg-edp-marine bg-opacity-20 text-edp-marine' : 'bg-edp-marine bg-opacity-10 text-edp-marine'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 transition-all duration-200 ${bitValue ? 'bg-edp-marine' : 'bg-edp-slate'}`}></div>
          {bitValue ? 'ON' : 'OFF'}
        </span>
      </td>
      <td className="py-4 px-6 text-center">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          bitConfig.enabled ? 'bg-edp-marine bg-opacity-10 text-edp-marine' : 'bg-edp-semantic-light-red text-edp-semantic-red'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${bitConfig.enabled ? 'bg-edp-marine' : 'bg-edp-semantic-red'}`}></div>
          {bitConfig.enabled ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="py-4 px-6 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-edp-marine bg-opacity-10 text-edp-marine font-tabular">
          {bitConfig.priority}
        </span>
      </td>
      <td className="py-4 px-6 text-center">
        <div className="space-y-1 text-xs text-edp-slate">
          <div className="flex items-center justify-center gap-1">
            <MapPin size={12} className="text-edp-slate opacity-60" />
            <span className="font-medium">{bitConfig.position === 'top' ? 'Topo' : bitConfig.position === 'center' ? 'Centro' : 'Base'}</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <Ruler size={12} className="text-edp-slate opacity-60" />
            <span className="font-tabular">{bitConfig.font_size}px</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-center">
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={onEdit}
            className="p-2 text-edp-marine hover:bg-edp-marine hover:bg-opacity-10 hover:text-edp-marine-100 rounded-lg transform transition-all duration-200 hover:scale-110 active:scale-95 group"
            title="Editar configuração"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={async () => {
              if (window.confirm(`Tem certeza que deseja deletar "${bitConfig.name}"?`)) {
                try {
                  await invoke('delete_bit_config', { wordIndex: bitConfig.word_index, bitIndex: bitConfig.bit_index });
                  onUpdate();
                  alert('Configuração deletada com sucesso!');
                } catch (error) {
                  alert(`Erro: ${error}`);
                }
              }
            }}
            className="p-2 text-edp-semantic-red hover:bg-edp-semantic-light-red hover:text-edp-semantic-red rounded-lg transform transition-all duration-200 hover:scale-110 active:scale-95"
            title="Deletar configuração"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Modal de Edição de Bit
const EditBitModal: React.FC<{
  bitConfig: BitConfig;
  onSave: (data: {
    name: string;
    message: string;
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
  }) => void;
  onClose: () => void;
  plcData?: PlcData | null;
}> = ({ bitConfig, onSave, onClose, plcData }) => {
  const [formData, setFormData] = useState({
    name: bitConfig.name,
    message: bitConfig.message,
    enabled: bitConfig.enabled,
    priority: bitConfig.priority,
    color: bitConfig.color,
    fontSize: bitConfig.font_size,
    position: bitConfig.position,
    fontFamily: bitConfig.font_family || 'Arial Black',
    fontWeight: bitConfig.font_weight || 'bold',
    textShadow: bitConfig.text_shadow !== undefined ? bitConfig.text_shadow : true,
    letterSpacing: bitConfig.letter_spacing || 3,
    useTemplate: bitConfig.use_template || false,
    messageTemplate: bitConfig.message_template || '',
  });

  // Calcular estado atual do bit
  const getCurrentBitValue = (): boolean => {
    if (!plcData?.variables) return false;
    const wordKey = `Word[${bitConfig.word_index}]`;
    const wordValue = plcData.variables[wordKey] || 0;
    return ((wordValue >> bitConfig.bit_index) & 1) === 1;
  };

  const bitValue = getCurrentBitValue();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ease-out"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ease-out scale-100 mx-4 my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-edp-neutral-lighter bg-edp-neutral-white-wash">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-edp-marine bg-opacity-10">
              <Settings size={16} className="text-edp-marine" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-edp-marine">Configuração de Bit</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-edp-neutral-white-tint text-edp-slate">
                  Word[{bitConfig.word_index}].{bitConfig.bit_index}
                </span>
                {bitValue && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-edp-marine bg-opacity-20 text-edp-marine">
                    <div className="w-1.5 h-1.5 rounded-full bg-edp-marine mr-1.5"></div>
                    Ativo
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-edp-slate hover:text-edp-marine hover:bg-edp-marine hover:bg-opacity-10 rounded-lg transition-edp"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Nome */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-edp-marine">
                  Nome do Controle
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-edp-neutral-lighter rounded-lg focus:ring-2 focus:ring-edp-marine focus:border-edp-marine transition-edp bg-edp-neutral-white-wash focus:bg-white"
                  placeholder="Ex: ECLUSA_ATIVA"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-edp-marine">
                  Status
                </label>
                <label className="flex items-center gap-2 p-2 border border-edp-neutral-lighter rounded-lg cursor-pointer hover:bg-edp-neutral-white-tint transition-edp">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 text-edp-marine rounded focus:ring-edp-marine"
                  />
                  <span className="text-sm font-medium text-edp-marine">
                    Ativo
                  </span>
                </label>
              </div>
            </div>

            {/* Mensagem */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-edp-marine">
                Mensagem
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-edp-neutral-lighter rounded-lg focus:ring-2 focus:ring-edp-marine focus:border-edp-marine transition-edp bg-edp-neutral-white-wash focus:bg-white resize-none"
                rows={2}
                placeholder="Ex: ATENÇÃO - PERIGO!"
                required={!formData.useTemplate}
              />
            </div>

            {/* Template Toggle */}
            <div className="border border-edp-violet border-opacity-30 rounded-lg p-2 bg-edp-violet bg-opacity-10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useTemplate}
                  onChange={(e) => setFormData({ ...formData, useTemplate: e.target.checked })}
                  className="w-4 h-4 text-edp-violet border-edp-neutral-lighter rounded focus:ring-edp-violet"
                />
                <Code size={14} className="text-edp-violet" />
                <span className="text-sm font-medium text-edp-violet">
                  Template Avançado
                </span>
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

            {/* Preview */}
            {!formData.useTemplate && formData.message && (
              <div className="border border-edp-semantic-yellow border-opacity-30 p-2 bg-edp-semantic-light-yellow rounded-lg">
                <div className="flex items-center gap-1 mb-2">
                  <Eye size={12} className="text-edp-semantic-yellow" />
                  <span className="text-xs font-medium text-edp-marine">Preview</span>
                </div>
                <div className="text-xs">
                  <LEDPreview
                    message={formData.message}
                    color={formData.color}
                    fontSize={Math.min(formData.fontSize, 40)}
                    fontFamily={formData.fontFamily}
                    fontWeight={formData.fontWeight}
                    textShadow={formData.textShadow}
                    letterSpacing={formData.letterSpacing}
                  />
                </div>
              </div>
            )}

            {/* Estilo */}
            <div className="border border-edp-marine border-opacity-30 p-2 rounded-lg bg-edp-marine bg-opacity-5">
              <div className="flex items-center gap-1 mb-2">
                <Palette size={14} className="text-edp-marine" />
                <h4 className="text-sm font-medium text-edp-marine">Estilo</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-edp-marine mb-1">Fonte</label>
                  <select
                    value={formData.fontFamily}
                    onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-edp-neutral-lighter rounded focus:ring-1 focus:ring-edp-marine bg-edp-neutral-white-wash"
                  >
                    <option value="Arial Black">Arial Black</option>
                    <option value="Impact">Impact</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-edp-marine mb-1">Tamanho</label>
                  <select
                    value={formData.fontSize}
                    onChange={(e) => setFormData({ ...formData, fontSize: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 text-sm border border-edp-neutral-lighter rounded focus:ring-1 focus:ring-edp-marine bg-edp-neutral-white-wash"
                  >
                    <option value="80">80px</option>
                    <option value="120">120px</option>
                    <option value="150">150px</option>
                    <option value="200">200px</option>
                    <option value="300">300px</option>
                    <option value="400">400px</option>
                  </select>
                </div>
              </div>

              <div className="mt-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.textShadow}
                    onChange={(e) => setFormData({ ...formData, textShadow: e.target.checked })}
                    className="w-3 h-3 text-edp-marine border-edp-neutral-lighter rounded focus:ring-edp-marine"
                  />
                  <span className="font-medium text-edp-marine">Efeito LED</span>
                </label>
              </div>
            </div>

            {/* Configurações Finais */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-edp-marine mb-1">Prioridade</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-sm border border-edp-neutral-lighter rounded focus:ring-1 focus:ring-edp-marine bg-edp-neutral-white-wash focus:bg-white font-tabular"
                  min="0"
                  max="999"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-edp-marine mb-1">Posição</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-edp-neutral-lighter rounded focus:ring-1 focus:ring-edp-marine bg-edp-neutral-white-wash focus:bg-white"
                >
                  <option value="top">Topo</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Base</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-edp-marine mb-1">Cor</label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-7 border border-edp-neutral-lighter rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border border-edp-neutral-lighter rounded focus:ring-1 focus:ring-edp-marine bg-edp-neutral-white-wash focus:bg-white font-mono"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2 p-4 border-t border-edp-neutral-lighter bg-edp-neutral-white-wash">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-edp-slate bg-white border border-edp-neutral-lighter rounded-lg hover:bg-edp-neutral-white-tint transition-edp font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-edp-marine text-white rounded-lg hover:bg-edp-marine-100 transition-edp font-medium shadow-sm hover:shadow"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};


export default PaginaBits;
