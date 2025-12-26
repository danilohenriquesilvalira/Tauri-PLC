import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, X, Plus, Trash2, Eye, AlertCircle, CheckCircle, Tag, Power, Pencil } from 'lucide-react';

interface TagMapping {
  id?: number;
  plc_ip: string;
  variable_path: string;    // Ex: "Word[5]", "Real[10]"
  tag_name: string;         // Ex: "temperatura_forno"
  description?: string;     // Ex: "Temperatura do forno principal"
  unit?: string;           // Ex: "°C", "bar", "rpm"
  enabled: boolean;
  created_at: number;
  collect_mode?: 'on_change' | 'interval';
  collect_interval_s?: number;
}

interface TagConfigurationModalProps {
  plcIp: string;
  onClose: () => void;
  onSaved: () => void;
}

export const TagConfigurationModal: React.FC<TagConfigurationModalProps> = ({ plcIp, onClose, onSaved }) => {
  const [tags, setTags] = useState<TagMapping[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState<Partial<TagMapping>>({
    plc_ip: plcIp,
    variable_path: '',
    tag_name: '',
    description: '',
    unit: '',
    enabled: true,
    collect_mode: 'on_change',
    collect_interval_s: 1,
  });
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [currentTab, setCurrentTab] = useState<'registered' | 'add'>('registered');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [previewingTag, setPreviewingTag] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [editingTag, setEditingTag] = useState<TagMapping | null>(null);
  const [editTagData, setEditTagData] = useState<Partial<TagMapping> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tagsPerPage = 7;
  const handleEditTag = (tag: TagMapping) => {
    setEditingTag(tag);
    setEditTagData({ ...tag });
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditTagData(null);
  };

  const handleSaveEditTag = async () => {
    if (!editTagData || !editTagData.variable_path || !editTagData.tag_name) {
      setError('Variável e nome do tag são obrigatórios');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const tagToSave: TagMapping = {
        ...editingTag,
        ...editTagData,
      } as TagMapping;
      await invoke('save_tag_mapping', { tag: tagToSave });
      await loadData();
      setEditingTag(null);
      setEditTagData(null);
      setHasUnsavedChanges(true);
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp: tagToSave.plc_ip } }));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Carregar dados existentes
  useEffect(() => {
    loadData();
  }, [plcIp]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar tags existentes e variáveis disponíveis em paralelo
      const [existingTags, variables] = await Promise.all([
        invoke<TagMapping[]>('load_tag_mappings', { plcIp }),
        invoke<string[]>('get_plc_variables_for_mapping', { plcIp })
      ]);
      
      console.log('🔍 Frontend: Tags carregados:', existingTags);
      setTags(existingTags);
      setAvailableVariables(variables);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.variable_path || !newTag.tag_name) {
      setError('Variável e nome do tag são obrigatórios');
      return;
    }

    // Verificar se tag name já existe
    if (tags.some(t => t.tag_name === newTag.tag_name)) {
      setError('Nome do tag já existe. Escolha outro nome.');
      return;
    }

    // Verificar se variável já foi mapeada
    if (tags.some(t => t.variable_path === newTag.variable_path)) {
      setError('Esta variável já foi mapeada. Edite o tag existente.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const tagToSave: TagMapping = {
        ...newTag as TagMapping,
        created_at: Date.now(),
      };
      
      console.log('🔍 Frontend: Salvando tag:', tagToSave);
      await invoke('save_tag_mapping', { tag: tagToSave });
      
      // Recarregar tags
      await loadData();
      // Atualizar destaque do botão de tags imediatamente
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
      }
      
      // Resetar formulário
      setNewTag({
        plc_ip: plcIp,
        variable_path: '',
        tag_name: '',
        description: '',
        unit: '',
        enabled: true,
      });
      setShowAddForm(false);
      setHasUnsavedChanges(true);
      
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Função para criar múltiplos tags
  const handleBulkCreateTags = async () => {
    if (selectedVariables.length === 0) {
      setError('Selecione pelo menos uma variável');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      let successCount = 0;
      const errors = [];

      for (const variable of selectedVariables) {
        try {
          const autoTagName = variable.replace(/[\[\]]/g, '_').toLowerCase();
          
          const tagToSave: TagMapping = {
            plc_ip: plcIp,
            variable_path: variable,
            tag_name: autoTagName,
            description: newTag.description || '',
            unit: newTag.unit || '',
            enabled: true,
            collect_mode: newTag.collect_mode || 'on_change',
            collect_interval_s: newTag.collect_interval_s || 1,
            created_at: Date.now(),
          };
          
          await invoke('save_tag_mapping', { tag: tagToSave });
          successCount++;
          
        } catch (err) {
          errors.push(`${variable}: ${err}`);
        }
      }
      
      // Recarregar tags
      await loadData();
      
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
      }
      
      // Resetar formulário
      setSelectedVariables([]);
      setBulkMode(false);
      setNewTag({
        plc_ip: plcIp,
        variable_path: '',
        tag_name: '',
        description: '',
        unit: '',
        enabled: true,
        collect_mode: 'on_change',
        collect_interval_s: 1,
      });
      setHasUnsavedChanges(true);
      
      if (errors.length > 0) {
        setError(`${successCount} tags criados. Erros: ${errors.slice(0, 2).join(', ')}`);
      }
      
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };





  const handleDeleteTag = async (plcIp: string, variablePath: string) => {
    try {
      setError(null);
      await invoke('delete_tag_mapping', { plcIp, variablePath });
      await loadData();
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
      }
      setHasUnsavedChanges(true);
    } catch (err) {
      setError(String(err));
    }
  };

  const toggleTagEnabled = async (tag: TagMapping) => {
    try {
      setError(null);
      const updatedTag = { ...tag, enabled: !tag.enabled };
      await invoke('save_tag_mapping', { tag: updatedTag });
      await loadData();
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp: tag.plc_ip } }));
      }
        // Notificação persistente ao desativar
        if (!tag.enabled) {
          window.dispatchEvent(new CustomEvent('tag-disabled-notification', { detail: { tagName: tag.tag_name, plcIp: tag.plc_ip } }));
        }
      setHasUnsavedChanges(true);
    } catch (err) {
      setError(String(err));
    }
  };

  const handlePreviewTag = async (tag: TagMapping) => {
    try {
      setError(null);
      setPreviewingTag(tag.tag_name);
      
      // Buscar valor atual da variável PLC
      const variableValue = await invoke<string>('get_plc_variable', { 
        plcIp: tag.plc_ip, 
        variableName: tag.variable_path 
      });
      
      setPreviewData({
        tag_name: tag.tag_name,
        variable_path: tag.variable_path,
        current_value: variableValue,
        unit: tag.unit,
        timestamp: new Date().toLocaleTimeString()
      });
      
    } catch (err) {
      setError(`Erro ao obter preview: ${err}`);
      setPreviewingTag(null);
      setPreviewData(null);
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

  // Variáveis disponíveis que ainda não foram mapeadas
  const unmappedVariables = availableVariables.filter(
    variable => !tags.some(tag => tag.variable_path === variable)
  );

  // ✅ PAGINAÇÃO
  const totalPages = Math.ceil(tags.length / tagsPerPage);
  const startIndex = (currentPage - 1) * tagsPerPage;
  const endIndex = startIndex + tagsPerPage;
  const paginatedTags = tags.slice(startIndex, endIndex);

  // Resetar página se necessário após mudanças
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);



  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#212E3E]"></div>
            <span className="text-[#212E3E]">Carregando configuração de tags...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full h-[90vh] min-h-[700px] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Compacto e limpo */}
        <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
              <Tag size={20} className="text-[#212E3E]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configuração de Tags</h2>
              <p className="text-xs text-gray-400">PLC: {plcIp}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* Stats e ações - Linha única compacta */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#212E3E]"></div>
                <span className="text-gray-600">Variáveis:</span>
                <span className="font-bold text-[#212E3E]">{availableVariables.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#212E3E]"></div>
                <span className="text-gray-600">Ativos:</span>
                <span className="font-bold text-[#212E3E]">{tags.filter(t => t.enabled).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7C9599]"></div>
                <span className="text-gray-600">Não mapeadas:</span>
                <span className="font-bold text-[#7C9599]">{unmappedVariables.length}</span>
              </div>
            </div>
            {/* Navegação por Abas - Azul Marine */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setCurrentTab('registered')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                  currentTab === 'registered'
                    ? 'bg-[#212E3E] text-white shadow-lg'
                    : 'text-gray-600 hover:text-[#212E3E] hover:bg-white/50'
                }`}
              >
                <Tag size={16} />
                Tags Registrados
              </button>
              <button
                onClick={() => setCurrentTab('add')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                  currentTab === 'add'
                    ? 'bg-[#212E3E] text-white shadow-lg'
                    : 'text-gray-600 hover:text-[#212E3E] hover:bg-white/50'
                }`}
              >
                <Plus size={16} />
                Adicionar Tag
              </button>
            </div>
          </div>


          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Erro</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Conteúdo das Abas */}
          <div className="flex-1 overflow-hidden">
            {/* ABA: Tags Registrados */}
            {currentTab === 'registered' && (
              <div className="relative h-full">
                
                
                {tags.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-16 text-gray-500 bg-[#F1F4F4] rounded-lg border border-[#BECACC] w-full">
                      <Tag className="mx-auto mb-4 text-[#7C9599]" size={48} />
                      <h3 className="text-lg font-semibold text-[#212E3E] mb-2">Nenhum tag configurado</h3>
                      <p className="text-sm text-gray-600">Use as abas "Adicionar Tag" ou "Múltiplos" para começar</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header da Paginação */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="text-sm text-gray-600">
                        Exibindo {startIndex + 1}-{Math.min(endIndex, tags.length)} de {tags.length} tags
                      </div>
                      <div className="text-sm font-semibold text-[#212E3E]">
                        Página {currentPage} de {totalPages}
                      </div>
                    </div>

                    {/* Tags da Página Atual */}
                    <div className="py-4 pb-20 overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
                      <div className="space-y-3">
                        {paginatedTags.map((tag) => (
                          <div
                            key={`${tag.variable_path}-${tag.tag_name}`}
                            className="bg-white rounded-lg border border-[#BECACC] hover:border-[#212E3E] p-4 transition-all hover:shadow-md"
                          >
                            <div className="flex items-center gap-4">
                              {/* Indicador de status */}
                              <div className={`w-1 h-16 rounded-full ${tag.enabled ? 'bg-[#212E3E]' : 'bg-[#BECACC]'}`}></div>
                              {/* Conteúdo principal */}
                              <div className="flex-1 grid grid-cols-4 gap-4">
                                {/* Variável */}
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Variável</div>
                                  <div className="font-mono text-sm font-bold text-[#212E3E]">{tag.variable_path}</div>
                                </div>
                                {/* Tag Name */}
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Tag</div>
                                  <div className="text-sm font-bold text-[#212E3E]">{tag.tag_name}</div>
                                </div>
                                {/* Descrição */}
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Descrição</div>
                                  <div className="text-sm text-gray-700 flex items-center gap-2">
                                    {tag.description || '-'}
                                    {tag.unit && (
                                      <span className="px-2 py-0.5 bg-[#E6EBEC] text-[#212E3E] text-xs rounded font-semibold">
                                        {tag.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Status */}
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Status</div>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    tag.enabled 
                                      ? 'bg-[#212E3E] text-[#28FF52]' 
                                      : 'bg-[#E6EBEC] text-[#7C9599]'
                                  }`}>
                                    {tag.enabled ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                              </div>
                              {/* Ações */}
                              <div className="flex items-center gap-2">
                                {/* Toggle */}
                                <button
                                  onClick={() => toggleTagEnabled(tag)}
                                  className={`p-2.5 rounded-lg transition-all ${
                                    tag.enabled 
                                      ? 'bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52]' 
                                      : 'bg-[#E6EBEC] hover:bg-[#BECACC] text-[#7C9599]'
                                  }`}
                                  title={tag.enabled ? 'Desativar' : 'Ativar'}
                                >
                                  <Power size={16} />
                                </button>
                                {/* Editar */}
                                <button
                                  onClick={() => handleEditTag(tag)}
                                  className="p-2.5 rounded-lg transition-all bg-[#E6EBEC] hover:bg-[#212E3E] text-[#212E3E] hover:text-[#28FF52] flex items-center justify-center"
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                                {/* Preview */}
                                <button
                                  onClick={() => handlePreviewTag(tag)}
                                  className={`p-2.5 rounded-lg transition-all ${
                                    previewingTag === tag.tag_name
                                      ? 'bg-[#212E3E] text-white'
                                      : 'bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E]'
                                  }`}
                                  title="Visualizar"
                                >
                                  <Eye size={16} />
                                </button>
                                {/* Excluir */}
                                <button
                                  onClick={() => handleDeleteTag(tag.plc_ip, tag.variable_path)}
                                  className="p-2.5 bg-[#E6EBEC] hover:bg-red-100 text-[#E32C2C] rounded-lg transition-all"
                                  title="Remover"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Navegação da Paginação - FIXO EMBAIXO SEMPRE */}
                    {totalPages > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pt-4 pb-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            ← Anterior
                          </button>
                          
                          {/* Números das páginas - Inteligente */}
                          <div className="flex items-center gap-1">
                            {(() => {
                              const pages = [];
                              const showFirst = currentPage > 3;
                              const showLast = currentPage < totalPages - 2;
                              
                              // Primeira página
                              if (showFirst) {
                                pages.push(
                                  <button
                                    key={1}
                                    onClick={() => setCurrentPage(1)}
                                    className="px-3 py-2 rounded-lg transition-all font-semibold bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E]"
                                  >
                                    1
                                  </button>
                                );
                                if (currentPage > 4) {
                                  pages.push(<span key="dots1" className="px-2 text-gray-400">...</span>);
                                }
                              }
                              
                              // Páginas próximas
                              const start = Math.max(1, currentPage - 2);
                              const end = Math.min(totalPages, currentPage + 2);
                              
                              for (let i = start; i <= end; i++) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`px-3 py-2 rounded-lg transition-all font-semibold ${
                                      i === currentPage
                                        ? 'bg-[#212E3E] text-[#28FF52]'
                                        : 'bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E]'
                                    }`}
                                  >
                                    {i}
                                  </button>
                                );
                              }
                              
                              // Última página
                              if (showLast) {
                                if (currentPage < totalPages - 3) {
                                  pages.push(<span key="dots2" className="px-2 text-gray-400">...</span>);
                                }
                                pages.push(
                                  <button
                                    key={totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="px-3 py-2 rounded-lg transition-all font-semibold bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E]"
                                  >
                                    {totalPages}
                                  </button>
                                );
                              }
                              
                              return pages;
                            })()}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            Próxima →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ABA: Adicionar Tag - Altura Completa */}
            {currentTab === 'add' && (
              <div className="h-full flex flex-col">
                
                {/* Conteúdo Principal - Usa toda altura */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  
                  {/* Coluna Esquerda - Altura completa */}
                  <div className="flex flex-col h-full">
                    
                    {/* Configuração Principal - Flex para ocupar espaço */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                      <h4 className="text-lg font-bold text-[#212E3E] mb-6 border-b border-gray-200 pb-3 ">
                        Configuração do Tag
                      </h4>
                      
                      <div className="flex-1 space-y-6">
                        {/* Variável PLC */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide ">
                              Variável PLC *
                            </label>
                            <button
                              type="button"
                              onClick={() => setBulkMode(!bulkMode)}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                bulkMode 
                                  ? 'bg-[#212E3E] text-[#28FF52]' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {bulkMode ? 'Modo Único' : 'Modo Múltiplo'}
                            </button>
                          </div>
                          
                          {!bulkMode ? (
                            <select
                              value={newTag.variable_path}
                              onChange={(e) => setNewTag({ ...newTag, variable_path: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm font-mono bg-white"
                            >
                              <option value="">Selecione uma variável...</option>
                              {unmappedVariables.map(variable => (
                                <option key={variable} value={variable}>{variable}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-gray-600">
                                  {unmappedVariables.length} variáveis disponíveis
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVariables([...unmappedVariables])}
                                    className="text-xs px-2 py-1 bg-[#212E3E] text-[#28FF52] rounded font-semibold"
                                  >
                                    Selecionar Todos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVariables([])}
                                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-semibold"
                                  >
                                    Limpar
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                                <div className="space-y-1">
                                  {unmappedVariables.map(variable => (
                                    <label key={variable} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                                      <input
                                        type="checkbox"
                                        checked={selectedVariables.includes(variable)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedVariables([...selectedVariables, variable]);
                                          } else {
                                            setSelectedVariables(selectedVariables.filter(v => v !== variable));
                                          }
                                        }}
                                        className="rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E]"
                                      />
                                      <span className="font-mono">{variable}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {selectedVariables.length > 0 && (
                                <div className="text-xs text-[#212E3E] font-semibold">
                                  {selectedVariables.length} de {unmappedVariables.length} variáveis selecionadas
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-400 mt-1">
                            {bulkMode ? 'Selecione múltiplas variáveis para criar tags automaticamente' : 'Escolha a variável PLC que será mapeada'}
                          </p>
                        </div>

                        {/* Nome do Tag */}
                        {!bulkMode && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Nome do Tag *
                            </label>
                            <input
                              type="text"
                              value={newTag.tag_name}
                              onChange={(e) => setNewTag({ ...newTag, tag_name: e.target.value })}
                              placeholder="ex: temperatura_forno"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm bg-white"
                            />
                            <p className="text-xs text-gray-400 mt-1">Nome único para identificar o tag no sistema</p>
                          </div>
                        )}

                        {/* Aviso para modo múltiplo */}
                        {bulkMode && (
                          <div className="bg-[#E6EBEC] border border-[#212E3E] rounded-lg p-3">
                            <div className="text-xs font-semibold text-[#212E3E] mb-1">Modo Múltiplo Ativo</div>
                            <div className="text-xs text-gray-600">
                              Os nomes dos tags serão gerados automaticamente baseados nas variáveis.<br/>
                              Ex: Word[5] → word_5
                            </div>
                          </div>
                        )}
                        
                        {/* Grid: Unidade + Modo */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Unidade
                            </label>
                            <input
                              type="text"
                              value={newTag.unit}
                              onChange={(e) => setNewTag({ ...newTag, unit: e.target.value })}
                              placeholder="°C, bar, rpm"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm bg-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Modo de Coleta
                            </label>
                            <select
                              value={newTag.collect_mode}
                              onChange={e => setNewTag({ ...newTag, collect_mode: e.target.value as 'on_change' | 'interval' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm bg-white"
                            >
                              <option value="on_change">Apenas quando mudar</option>
                              <option value="interval">A cada intervalo</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Intervalo - Condicional */}
                        {newTag.collect_mode === 'interval' && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Intervalo (segundos)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={newTag.collect_interval_s || 1}
                              onChange={e => setNewTag({ ...newTag, collect_interval_s: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm text-center bg-white"
                            />
                            <p className="text-xs text-gray-400 mt-1">Frequência de coleta em segundos (1-60)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Coluna Direita - Altura completa */}
                  <div className="flex flex-col h-full space-y-6">
                    
                    {/* Descrição - Flex para ocupar mais espaço */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                      <h4 className="text-lg font-bold text-[#212E3E] mb-6 border-b border-gray-200 pb-3 ">
                        Informações Detalhadas
                      </h4>
                      
                      <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide ">
                          Descrição
                        </label>
                        <div className="flex-1 min-h-0">
                          <textarea
                            value={newTag.description}
                            onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                            placeholder="Descreva o que este tag representa...\n\nEx: Temperatura do forno principal da linha de produção A, responsável pelo controle do processo de aquecimento do material."
                            className="w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E] text-sm bg-white resize-none"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 flex-shrink-0">Descrição detalhada para facilitar identificação e manutenção</p>
                      </div>
                    </div>
                    
                    {/* Preview - Altura fixa */}
                    {newTag.variable_path && newTag.tag_name && (
                      <div className="bg-[#212E3E] rounded-xl p-6 text-white">
                        <h4 className="text-lg font-bold text-[#28FF52] mb-4 border-b border-[#28FF52]/20 pb-3">
                          Preview do WebSocket
                        </h4>
                        <div className="bg-black/40 rounded-xl p-4 font-mono text-sm">
                          <div className="text-[#28FF52]">{"{"}</div>
                          <div className="ml-4 text-white">
                            "{newTag.tag_name}": <span className="text-[#28FF52]">valor_atual</span>
                            {newTag.unit && <span className="text-gray-400"> // {newTag.unit}</span>}
                          </div>
                          <div className="text-[#28FF52]">{"}"}</div>
                        </div>
                        <p className="text-sm text-gray-300 mt-4">
                          Assim o tag aparecerá no WebSocket em tempo real
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botões Fixos Embaixo */}
                <div className="border-t border-gray-200 p-6 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {bulkMode ? (
                        <>
                          <span className="font-bold">Modo Múltiplo:</span> Selecione variáveis • Tags serão nomeados automaticamente
                        </>
                      ) : (
                        <>
                          <span className="font-bold">*</span> Campos obrigatórios • Tag será ativado automaticamente
                        </>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (bulkMode) {
                            handleBulkCreateTags();
                          } else {
                            handleAddTag();
                          }
                          if (!error) {
                            setCurrentTab('registered');
                            setNewTag({
                              plc_ip: plcIp,
                              variable_path: '',
                              tag_name: '',
                              description: '',
                              unit: '',
                              enabled: true,
                              collect_mode: 'on_change',
                              collect_interval_s: 1,
                            });
                          }
                        }}
                        disabled={
                          saving || 
                          (bulkMode ? selectedVariables.length === 0 : !newTag.variable_path || !newTag.tag_name)
                        }
                        className="px-8 py-3 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                      >
                        <Save size={18} />
                        {saving ? 'Salvando...' : bulkMode ? `Criar ${selectedVariables.length} Tags` : 'Criar Tag'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
          {/* Formulário de Edição */}
          {editingTag && editTagData && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
              <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl border border-[#BECACC] p-0 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-[#212E3E]">
                  <h4 className="font-semibold text-white text-sm">Editar Tag <span className="text-[#28FF52]">{editingTag.tag_name}</span></h4>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors"
                    title="Fechar edição"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form className="grid grid-cols-1 gap-3 p-4">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Variável</label>
                      <input type="text" value={editTagData.variable_path} readOnly className="px-2 py-1 border border-[#BECACC] rounded bg-gray-100 text-gray-500 text-xs" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Nome</label>
                      <input type="text" value={editTagData.tag_name} readOnly className="px-2 py-1 border border-[#BECACC] rounded bg-gray-100 text-gray-500 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Descrição</label>
                      <input type="text" value={editTagData.description} onChange={e => setEditTagData({ ...editTagData, description: e.target.value })} className="px-2 py-1 border border-[#BECACC] rounded text-xs" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Unidade</label>
                      <input type="text" value={editTagData.unit} onChange={e => setEditTagData({ ...editTagData, unit: e.target.value })} className="px-2 py-1 border border-[#BECACC] rounded text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Modo</label>
                      <select value={editTagData.collect_mode} onChange={e => setEditTagData({ ...editTagData, collect_mode: e.target.value as 'on_change' | 'interval' })} className="px-2 py-1 border border-[#BECACC] rounded text-xs">
                        <option value="on_change">Apenas se mudar</option>
                        <option value="interval">Por ciclo</option>
                      </select>
                    </div>
                    {editTagData.collect_mode === 'interval' && (
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#212E3E] uppercase tracking-wide">Intervalo (s)</label>
                        <input type="number" min={1} max={60} value={editTagData.collect_interval_s || 1} onChange={e => setEditTagData({ ...editTagData, collect_interval_s: Number(e.target.value) })} className="px-2 py-1 border border-[#BECACC] rounded text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={handleSaveEditTag} disabled={saving} className="flex-1 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] px-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow">
                      <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-2 rounded-lg text-xs font-semibold transition-all shadow flex items-center justify-center">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Preview de Tag Específico */}
          {previewData && (
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-900 font-semibold mb-3 flex items-center gap-2">
                <Eye size={16} />
                Preview: {previewData.tag_name}
                <button 
                  onClick={() => { setPreviewData(null); setPreviewingTag(null); }}
                  className="ml-auto p-1 hover:bg-blue-100 rounded text-blue-600"
                >
                  <X size={16} />
                </button>
              </h4>
              <div className="bg-white rounded p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Variável PLC:</span>
                    <div className="font-mono text-blue-700">{previewData.variable_path}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Valor Atual:</span>
                    <div className="font-mono text-green-700">
                      {previewData.current_value} {previewData.unit || ''}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Timestamp:</span>
                    <div className="text-gray-700">{previewData.timestamp}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">WebSocket JSON:</span>
                    <div className="font-mono text-purple-700">
                      "{previewData.tag_name}": {previewData.current_value}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {tags.filter(t => t.enabled).length} tags ativos serão expostos via WebSocket
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 bg-edp-marine hover:bg-[#2a3f52] text-white rounded-lg transition-colors font-medium"
              >
                Fechar
              </button>
              <button
                onClick={onSaved}
                className="px-6 py-2.5 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-bold transition-colors shadow-md"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>


        {/* Modal de Confirmação */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10" onClick={cancelClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#212E3E] mb-1">Alterações não salvas</h3>
                  <p className="text-sm text-gray-600">
                    Você fez alterações nos tags. Deseja realmente fechar sem salvar?
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelClose}
                  className="px-4 py-2 bg-[#212E3E] hover:bg-[#2a3f52] text-white rounded-lg font-medium transition-colors"
                >
                  Continuar Editando
                </button>
                <button
                  onClick={confirmClose}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
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