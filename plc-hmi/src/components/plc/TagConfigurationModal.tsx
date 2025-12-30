import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, X, Plus, Trash2, Eye, CheckCircle, Tag, Power, Pencil, Filter, Settings, RefreshCw, Clock, AlertCircle } from 'lucide-react';

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
  onSaved?: () => void;
}

export const TagConfigurationModal: React.FC<TagConfigurationModalProps> = ({ plcIp, onClose }) => {
  const [tags, setTags] = useState<TagMapping[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<'ALL' | 'WORD' | 'INT' | 'REAL' | 'BIT'>('ALL');
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
  const [currentTab, setCurrentTab] = useState<'registered' | 'add'>('registered');
  const [previewingTag, setPreviewingTag] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagData, setEditTagData] = useState<Partial<TagMapping> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tagsPerPage = 7;
  const handleEditTag = (tag: TagMapping) => {
    setEditingTagId(tag.id || null);
    setEditTagData({ ...tag });
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
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
      const tagToSave: TagMapping = editTagData as TagMapping;
      await invoke('save_tag_mapping', { tag: tagToSave });
      await loadData();
      setEditingTagId(null);
      setEditTagData(null);
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
    onClose();
  };


  // Variáveis disponíveis que ainda não foram mapeadas
  const unmappedVariables = availableVariables.filter(
    variable => !tags.some(tag => tag.variable_path === variable)
  );

  // ✅ LÓGICA DE FILTRO E BULK DELETE
  const filteredTags = tags.filter(tag => {
    if (filterType === 'ALL') return true;
    if (filterType === 'BIT') return tag.variable_path.includes('.') || tag.unit === 'BOOL';
    if (filterType === 'WORD') return tag.variable_path.startsWith('Word') && !tag.variable_path.includes('.');
    if (filterType === 'INT') return tag.variable_path.startsWith('Int');
    if (filterType === 'REAL') return tag.variable_path.startsWith('Real');
    return true;
  });

  // Atualizar paginação para usar filteredTags em vez de tags
  const tagsToDisplay = filteredTags;
  const totalPages = Math.ceil(tagsToDisplay.length / tagsPerPage);
  // ... pagiantion logic update below ...

  const toggleSelectTag = (id: number) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTags(newSelected);
  };

  const handleSelectAllFiltered = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set()); // Desmarcar tudo
    } else {
      const allIds = new Set(filteredTags.map(t => t.id as number).filter(id => id !== undefined));
      setSelectedTags(allIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTags.size === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${selectedTags.size} tags selecionados?`)) return;

    try {
      setSaving(true);
      await invoke('delete_tag_mappings_bulk', { ids: Array.from(selectedTags) });
      setSelectedTags(new Set());
      await loadData();
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // ✅ PAGINAÇÃO CORRIGIDA (Baseada na lista filtrada)
  const startIndex = (currentPage - 1) * tagsPerPage;
  const endIndex = startIndex + tagsPerPage;
  const paginatedTags = tagsToDisplay.slice(startIndex, endIndex);

  // Resetar página se necessário após mudanças
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading) {
    // ... (loader code) ...
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#212E3E] rounded-lg p-5 shadow-xl flex flex-col items-center animate-pulse">
          <Tag size={32} className="text-[#28FF52] mb-3" />
          <span className="text-white font-mono">Carregando tags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      {/* ... (wrapper e header iguais) ... */}
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header - Compacto seguindo padrão */}
        <div className="bg-[#212E3E] px-5 py-3.5 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#28FF52] rounded-lg flex items-center justify-center">
              <Tag size={18} className="text-[#212E3E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configuração de Tags</h2>
              <p className="text-xs text-gray-400">PLC: {plcIp} • {tags.length} tags • Tempo real</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo compacto */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[calc(85vh-120px)]">

          {/* Header compacto com tabs e stats */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
            {/* Navegação por Abas compactas */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setCurrentTab('registered')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${currentTab === 'registered'
                  ? 'bg-[#212E3E] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#212E3E] hover:bg-white/70'
                  }`}
              >
                <Tag size={14} />
                Tags Registrados
              </button>
              <button
                onClick={() => setCurrentTab('add')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${currentTab === 'add'
                  ? 'bg-[#212E3E] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#212E3E] hover:bg-white/70'
                  }`}
              >
                <Plus size={14} />
                Adicionar Tag
              </button>
            </div>
            
            {/* Stats compactos */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-semibold text-[#212E3E]">{tags.length}</span> tags total
              <span className="text-[#BECACC]">•</span>
              <span className="font-semibold text-[#212E3E]">{filteredTags.length}</span> visíveis
            </div>
          </div>

          {/* Filtros compactos para tags registrados */}
          {currentTab === 'registered' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 mb-3 flex items-center justify-between">
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-gray-400 uppercase mr-1 flex items-center gap-1">
                  <Filter size={11} /> Filtros:
                </div>
                <button onClick={() => setFilterType('ALL')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-[#212E3E] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Todos</button>
                <button onClick={() => setFilterType('WORD')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${filterType === 'WORD' ? 'bg-[#212E3E] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Word</button>
                <button onClick={() => setFilterType('INT')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${filterType === 'INT' ? 'bg-[#212E3E] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Int</button>
                <button onClick={() => setFilterType('REAL')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${filterType === 'REAL' ? 'bg-[#212E3E] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Real</button>
                <button onClick={() => setFilterType('BIT')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${filterType === 'BIT' ? 'bg-[#212E3E] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Bit</button>
              </div>

              {/* Ações compactas */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-medium hover:text-[#212E3E]">
                  <input type="checkbox"
                    checked={filteredTags.length > 0 && selectedTags.size === filteredTags.length}
                    onChange={handleSelectAllFiltered}
                    className="rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E] w-3 h-3"
                  />
                  Todos
                </label>

                {selectedTags.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-md text-xs font-bold transition-all"
                  >
                    <Trash2 size={12} />
                    Excluir ({selectedTags.size})
                  </button>
                )}
              </div>
            </div>
          )}


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

          {/* Conteúdo das Abas e Lista */}
          <div className="flex-1 overflow-hidden">
            {/* ABA: Tags Registrados */}
            {currentTab === 'registered' && (
              <div className="relative h-full">
                {tagsToDisplay.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    {/* ... (empty state) ... */}
                    <div className="text-center py-16 text-gray-500 bg-[#F1F4F4] rounded-lg border border-[#BECACC] w-full">
                      <p>Nenhum tag encontrado com este filtro.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header da Paginação */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="text-sm text-gray-600">
                        Exibindo {startIndex + 1}-{Math.min(endIndex, tagsToDisplay.length)} de {tagsToDisplay.length} tags
                      </div>
                      <div className="text-sm font-semibold text-[#212E3E]">
                        Página {currentPage} de {totalPages}
                      </div>
                    </div>
                    {/* Tags da Página Filtrada */}
                    <div className="py-3 pb-16 overflow-y-auto" style={{ height: '420px' }}>
                      <div className="space-y-3">
                        {paginatedTags.map((tag) => (
                          <div
                            key={`${tag.variable_path}-${tag.tag_name}`}
                            className={`bg-white rounded-lg border p-3 transition-all hover:shadow-sm ${editingTagId === tag.id ? 'border-[#212E3E] bg-[#212E3E]/5 shadow-md' : selectedTags.has(tag.id as number) ? 'border-[#212E3E] bg-blue-50' : 'border-[#BECACC]'} ${editingTagId === tag.id ? '' : 'flex items-center gap-3'}`}
                          >
                            {editingTagId === tag.id ? (
                              // MODO EDIÇÃO EXPANDIDO - Layout completo
                              <div className="space-y-4">
                                {/* Header com checkbox e status */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedTags.has(tag.id as number)}
                                      onChange={() => toggleSelectTag(tag.id as number)}
                                      className="w-4 h-4 rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E] cursor-pointer"
                                    />
                                    <div className={`w-1 h-8 rounded-full ${tag.enabled ? 'bg-[#212E3E]' : 'bg-[#BECACC]'}`}></div>
                                    <div className="text-xs font-bold text-[#212E3E] bg-[#212E3E]/10 px-2 py-1 rounded">
                                      EDITANDO: {tag.variable_path}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleSaveEditTag}
                                      className="px-4 py-2 bg-[#212E3E] text-[#28FF52] rounded-md text-sm font-bold hover:bg-[#1a2332] transition-all flex items-center gap-2"
                                      title="Salvar (Enter)"
                                    >
                                      <CheckCircle size={16} />
                                      Salvar
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md text-sm font-bold hover:bg-gray-400 transition-all flex items-center gap-2"
                                      title="Cancelar (Esc)"
                                    >
                                      <X size={16} />
                                      Cancelar
                                    </button>
                                  </div>
                                </div>

                                {/* Grid de campos editáveis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Nome do Tag */}
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome do Tag *</label>
                                    <input
                                      type="text"
                                      value={editTagData?.tag_name || ''}
                                      onChange={(e) => setEditTagData({...editTagData, tag_name: e.target.value})}
                                      className="w-full px-3 py-2 text-sm font-bold text-[#212E3E] border border-[#212E3E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditTag();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                      autoFocus
                                    />
                                  </div>

                                  {/* Descrição */}
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição</label>
                                    <input
                                      type="text"
                                      value={editTagData?.description || ''}
                                      onChange={(e) => setEditTagData({...editTagData, description: e.target.value})}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E]"
                                      placeholder="Descrição do tag"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditTag();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                  </div>

                                  {/* Unidade */}
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Unidade</label>
                                    <input
                                      type="text"
                                      value={editTagData?.unit || ''}
                                      onChange={(e) => setEditTagData({...editTagData, unit: e.target.value})}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E]"
                                      placeholder="°C, bar, rpm..."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditTag();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Configuração de Leitura */}
                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2">
                                    <Settings size={14} />
                                    Configuração de Leitura
                                  </label>
                                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                      <select
                                        value={editTagData?.collect_mode || 'on_change'}
                                        onChange={(e) => setEditTagData({...editTagData, collect_mode: e.target.value as any})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E]"
                                      >
                                        <option value="on_change">Apenas ao alterar</option>
                                        <option value="interval">Leitura cíclica</option>
                                      </select>
                                    </div>
                                    {editTagData?.collect_mode === 'interval' && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          max="3600"
                                          value={editTagData?.collect_interval_s || 1}
                                          onChange={(e) => setEditTagData({...editTagData, collect_interval_s: Number(e.target.value)})}
                                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E]"
                                        />
                                        <span className="text-sm text-gray-600 font-medium">seg</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // MODO NORMAL COMPACTO - Layout horizontal
                              <>
                                {/* Checkbox compacto */}
                                <input
                                  type="checkbox"
                                  checked={selectedTags.has(tag.id as number)}
                                  onChange={() => toggleSelectTag(tag.id as number)}
                                  className="w-4 h-4 rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E] cursor-pointer"
                                />

                                {/* Conteúdo compacto */}
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-1 h-12 rounded-full ${tag.enabled ? 'bg-[#212E3E]' : 'bg-[#BECACC]'}`}></div>

                                  <div className="flex-1 grid grid-cols-4 gap-3">
                                    <div>
                                      <div className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Variável</div>
                                      <div className="font-mono text-sm font-bold text-[#212E3E]">{tag.variable_path}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Tag</div>
                                      <div className="text-sm font-bold text-[#212E3E]">{tag.tag_name}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Descrição</div>
                                      <div className="text-sm text-gray-700 flex items-center gap-2">
                                        {tag.description || '-'}
                                        {tag.unit && (
                                          <span className="px-1.5 py-0.5 bg-[#E6EBEC] text-[#212E3E] text-xs rounded font-semibold">
                                            {tag.unit}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Status</div>
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tag.enabled
                                          ? 'bg-[#212E3E] text-[#28FF52]'
                                          : 'bg-[#E6EBEC] text-[#7C9599]'
                                          }`}>
                                          {tag.enabled ? 'Ativo' : 'Inativo'}
                                        </span>
                                        {tag.collect_mode && (
                                          <span className="text-xs text-gray-500 flex items-center gap-1">
                                            {tag.collect_mode === 'interval' ? (
                                              <>
                                                <Clock size={12} />
                                                {tag.collect_interval_s}s
                                              </>
                                            ) : (
                                              <RefreshCw size={12} />
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Ações compactas */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => toggleTagEnabled(tag)}
                                      className={`p-2 rounded-md transition-all ${tag.enabled ? 'bg-[#212E3E] text-[#28FF52]' : 'bg-[#E6EBEC] text-[#7C9599]'}`}
                                      title={tag.enabled ? 'Desativar' : 'Ativar'}
                                    >
                                      <Power size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleEditTag(tag)}
                                      className="p-2 rounded-md transition-all bg-[#E6EBEC] hover:bg-[#212E3E] text-[#212E3E] hover:text-[#28FF52]"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handlePreviewTag(tag)}
                                      className={`p-2.5 rounded-lg transition-all ${previewingTag === tag.tag_name
                                        ? 'bg-[#212E3E] text-white'
                                        : 'bg-[#E6EBEC] hover:bg-[#BECACC] text-[#212E3E]'
                                        }`}
                                      title="Visualizar"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTag(tag.plc_ip, tag.variable_path)}
                                      className="p-2 bg-[#E6EBEC] hover:bg-red-100 text-[#E32C2C] rounded-md transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
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
                                    className={`px-3 py-2 rounded-lg transition-all font-semibold ${i === currentPage
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

            {/* Mantendo ABA Add como estava */}
            {currentTab === 'add' && (
              <div className="flex-1 flex flex-col h-full bg-[#F3F5F7]">

                {/* Header com Toggle de Modo (Tabs visuais) */}
                <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm z-10">
                  <div>
                    <h3 className="text-xl font-bold text-[#212E3E]">Adicionar Novo Tag</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure o mapeamento entre variáveis do PLC e o sistema.</p>
                  </div>

                  {/* Visual Toggle */}
                  <div className="bg-gray-100 p-1.5 rounded-lg flex items-center font-medium">
                    <button
                      onClick={() => { setBulkMode(false); setSelectedVariables([]); }}
                      className={`px-5 py-2.5 rounded-md text-sm transition-all flex items-center gap-2 ${!bulkMode ? 'bg-white text-[#212E3E] shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                      <Plus size={16} /> Modo Único
                    </button>
                    <button
                      onClick={() => setBulkMode(true)}
                      className={`px-5 py-2.5 rounded-md text-sm transition-all flex items-center gap-2 ${bulkMode ? 'bg-white text-[#212E3E] shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                      <Tag size={16} /> Modo Múltiplo (Lote)
                    </button>
                  </div>
                </div>

                {/* Corpo Principal - Grid mais espaçado com Scroll */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-1 gap-6 items-start">

                    {/* Definição da Variável e Configuração */}
                    <div className="space-y-6">

                      {/* Box Principal de Seleção - ORIGEM DE DADOS */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#212E3E]"></div>
                            Origem de Dados (PLC)
                          </h4>
                          {bulkMode && (
                            <span className="bg-[#212E3E] text-[#28FF52] px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              Lote Ativo
                            </span>
                          )}
                        </div>

                        <div className="p-6">
                          {!bulkMode ? (
                            // MODO ÚNICO - Form
                            <div className="space-y-6">
                              <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Variável Base</label>
                                  <div className="relative">
                                    <select
                                      value={newTag.variable_path?.split('.')[0] || ''}
                                      onChange={(e) => {
                                        const baseVar = e.target.value;
                                        const currentBit = newTag.variable_path?.split('.')[1];
                                        setNewTag({ ...newTag, variable_path: currentBit ? `${baseVar}.${currentBit}` : baseVar });
                                      }}
                                      className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm font-mono bg-white text-[#212E3E]"
                                    >
                                      <option value="">Selecione uma variável...</option>
                                      {unmappedVariables.map(variable => (
                                        <option key={variable} value={variable}>{variable}</option>
                                      ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                      <Tag size={16} className="text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-1">
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                                    Bit <span className="text-gray-400 font-normal text-xs">(bit)</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="15"
                                    placeholder="0-15"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm font-mono text-center text-[#212E3E]"
                                    value={newTag.variable_path?.includes('.') ? newTag.variable_path.split('.')[1] : ''}
                                    onChange={(e) => {
                                      const bit = e.target.value;
                                      const baseVar = newTag.variable_path?.split('.')[0];
                                      if (baseVar) {
                                        setNewTag({
                                          ...newTag,
                                          variable_path: bit ? `${baseVar}.${bit}` : baseVar
                                        });
                                      }
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Tag (Identificador Único)</label>
                                  <input
                                    type="text"
                                    value={newTag.tag_name}
                                    onChange={(e) => setNewTag({ ...newTag, tag_name: e.target.value })}
                                    placeholder="Ex: Temp_Forno_Z1"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm font-medium bg-gray-50 focus:bg-white transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição (Opcional)</label>
                                  <input
                                    type="text"
                                    value={newTag.description || ''}
                                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                                    placeholder="Ex: Temperatura do forno"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // MODO BULK - Lista Melhorada
                            <div className="flex flex-col h-[400px]">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-600 font-medium">{unmappedVariables.length} variáveis disponíveis</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedVariables([...unmappedVariables])}
                                    className="px-3 py-1.5 text-xs font-bold text-[#212E3E] bg-gray-100 hover:bg-[#212E3E] hover:text-white rounded transition-colors"
                                  >
                                    Selecionar Tudo
                                  </button>
                                  <button
                                    onClick={() => setSelectedVariables([])}
                                    className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    Limpar Seleção
                                  </button>
                                </div>
                              </div>

                              <div className="relative flex-1 border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col shadow-inner">
                                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                  {unmappedVariables.map((v) => (
                                    <label
                                      key={v}
                                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all border ${selectedVariables.includes(v)
                                        ? 'bg-[#212E3E]/5 border-[#212E3E]/20'
                                        : 'hover:bg-gray-50 border-transparent'
                                        }`}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedVariables.includes(v) ? 'bg-[#212E3E] border-[#212E3E]' : 'border-gray-300 bg-white'}`}>
                                        {selectedVariables.includes(v) && <CheckCircle size={10} className="text-[#28FF52]" />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedVariables.includes(v)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSelectedVariables(prev => [...prev, v]);
                                          else setSelectedVariables(prev => prev.filter(x => x !== v));
                                        }}
                                      />
                                      <span className={`font-mono text-sm ${selectedVariables.includes(v) ? 'text-[#212E3E] font-bold' : 'text-gray-600'}`}>{v}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-gray-500">Selecione múltiplas para adicionar de uma vez.</span>
                                <span className={`font-bold ${selectedVariables.length > 0 ? 'text-[#212E3E]' : 'text-gray-400'}`}>
                                  {selectedVariables.length} selecionadas
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Configurações Adicionais (Unidade, Modo) */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Configuração de Leitura
                          </h4>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidade de Medida</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={newTag.unit}
                                onChange={e => setNewTag({ ...newTag, unit: e.target.value })}
                                placeholder="Ex: rpm"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm"
                              />
                              <span className="absolute right-3 top-3 text-gray-400 text-xs pointer-events-none">Opcional</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modo de Coleta</label>
                            <select
                              value={newTag.collect_mode}
                              onChange={e => setNewTag({ ...newTag, collect_mode: e.target.value as any })}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212E3E]/20 focus:border-[#212E3E] text-sm bg-white"
                            >
                              <option value="on_change">Apenas ao alterar (Event)</option>
                              <option value="interval">Cíclico (Polling)</option>
                            </select>
                          </div>

                          {newTag.collect_mode === 'interval' && (
                            <div className="col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center gap-4">
                                <div className="flex-1">
                                  <label className="block text-sm font-bold text-blue-800 mb-1">Intervalo de Polling</label>
                                  <p className="text-xs text-blue-600">Frequência de leitura em segundos.</p>
                                </div>
                                <div className="w-32">
                                  <input
                                    type="number" min="1" max="60"
                                    value={newTag.collect_interval_s}
                                    onChange={e => setNewTag({ ...newTag, collect_interval_s: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-center font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Footer Fixo */}
                <div className="bg-white border-t border-gray-200 p-6 flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#212E3E]">
                      {bulkMode ? 'Importação em Lote' : 'Criação Individual'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {bulkMode ? `${selectedVariables.length} variáveis selecionadas para importação` : 'Preencha os campos obrigatórios (*)'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (bulkMode) handleBulkCreateTags(); else handleAddTag();
                    }}
                    disabled={saving || (bulkMode ? selectedVariables.length === 0 : (!newTag.variable_path || !newTag.tag_name))}
                    className="px-8 py-3.5 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-xl font-bold shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transform active:scale-95"
                  >
                    {saving ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Save size={20} />
                        {bulkMode ? `CRIAR ${selectedVariables.length} TAGS` : 'SALVAR TAG'}
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>



      {/* PREVIEW MODAL */}
      {previewData && (
        <div className="fixed bottom-6 right-6 z-[80] bg-white rounded-lg shadow-2xl border border-blue-200 p-4 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-bold text-[#212E3E] flex items-center gap-2"><Eye size={16} className="text-blue-500" /> Preview Ao Vivo</h5>
            <button onClick={() => { setPreviewData(null); setPreviewingTag(null); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tag:</span> <span className="font-mono font-bold">{previewData.tag_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Valor:</span> <span className="font-mono font-bold text-blue-600">{previewData.current_value} {previewData.unit}</span></div>
            <div className="text-xs text-gray-400 mt-2 text-right">{previewData.timestamp}</div>
          </div>
        </div>
      )}

    </div>
  );
};