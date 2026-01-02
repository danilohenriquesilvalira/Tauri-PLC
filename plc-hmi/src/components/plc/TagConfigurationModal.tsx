import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Tag, X, Plus, Trash2, Eye, CheckCircle, Power, Pencil, Filter, Download, Upload, FileSpreadsheet, AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

// 🆕 ÁREAS DOS EQUIPAMENTOS (para SUBSCRIBE inteligente)
type AreaType = 'ENH' | 'ESV' | 'PJU' | 'PMO' | 'SCO' | 'EDR' | 'GER' | '';

const AREAS: { key: AreaType; label: string; description: string }[] = [
  { key: '', label: 'Selecione...', description: '' },
  { key: 'ENH', label: 'ENH - Enchimento', description: 'Sistema de enchimento da câmara' },
  { key: 'ESV', label: 'ESV - Esvaziamento', description: 'Sistema de esvaziamento da câmara' },
  { key: 'PJU', label: 'PJU - Porta Jusante', description: 'Porta do lado jusante' },
  { key: 'PMO', label: 'PMO - Porta Montante', description: 'Porta do lado montante' },
  { key: 'SCO', label: 'SCO - Sala de Comando', description: 'Sala de comando e controle' },
  { key: 'EDR', label: 'EDR - Esgoto/Drenagem', description: 'Sistema de esgoto e drenagem' },
  { key: 'GER', label: 'GER - Geral', description: 'Variáveis gerais do sistema' },
];

// 🆕 CATEGORIAS DOS TAGS (para SUBSCRIBE inteligente)
type CategoryType = 'PROC' | 'FAULT' | 'EVENT' | 'ALARM' | 'CMD' | '';

const CATEGORIES: { key: CategoryType; label: string; description: string; color: string }[] = [
  { key: '', label: 'Selecione...', description: '', color: '' },
  { key: 'PROC', label: 'PROC - Processo', description: 'Variáveis de processo (níveis, temperaturas, posições)', color: 'bg-blue-100 text-blue-800' },
  { key: 'FAULT', label: 'FAULT - Falha', description: 'Bits de falha de equipamentos', color: 'bg-red-100 text-red-800' },
  { key: 'EVENT', label: 'EVENT - Evento', description: 'Eventos do sistema (porta abriu, ciclo iniciou)', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'ALARM', label: 'ALARM - Alarme', description: 'Alarmes críticos do sistema', color: 'bg-orange-100 text-orange-800' },
  { key: 'CMD', label: 'CMD - Comando', description: 'Comandos enviados ao PLC', color: 'bg-purple-100 text-purple-800' },
];

interface TagMapping {
  id?: number;
  plc_ip: string;
  variable_path: string;
  tag_name: string;
  description?: string;
  unit?: string;
  enabled: boolean;
  created_at: number;
  collect_mode?: 'on_change' | 'interval';
  collect_interval_s?: number;
  // 🆕 CAMPOS PARA SUBSCRIBE INTELIGENTE
  area?: AreaType;      // ENH, ESV, PJU, PMO, SCO, EDR, GER
  category?: CategoryType; // PROC, FAULT, EVENT, ALARM, CMD
}

interface ImportedTag {
  variable_path: string;
  tag_name: string;
  description: string;
  unit: string;
  collect_mode: 'on_change' | 'interval';
  collect_interval_s: number;
  enabled: boolean;
  isValid: boolean;
  error?: string;
  // 🆕 CAMPOS PARA SUBSCRIBE INTELIGENTE
  area?: AreaType;
  category?: CategoryType;
}

interface TagConfigurationModalProps {
  plcIp: string;
  onClose: () => void;
  onSaved?: () => void;
}

// ============================================================================
// TIPOS DE DADOS
// ============================================================================

type DataType = 'ALL' | 'Word' | 'Int' | 'Real' | 'Bool' | 'DWord' | 'DInt' | 'LReal';

const DATA_TYPES: { key: DataType; label: string }[] = [
  { key: 'ALL', label: 'TODOS' },
  { key: 'Word', label: 'Word' },
  { key: 'Int', label: 'Int' },
  { key: 'Real', label: 'Real' },
  { key: 'Bool', label: 'Bool' },
  { key: 'DWord', label: 'DWord' },
  { key: 'DInt', label: 'DInt' },
  { key: 'LReal', label: 'LReal' },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const TagConfigurationModal: React.FC<TagConfigurationModalProps> = ({ plcIp, onClose }) => {
  // Estados principais
  const [tags, setTags] = useState<TagMapping[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<DataType>('ALL');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🆕 Filtros de área e categoria para listagem
  const [filterArea, setFilterArea] = useState<AreaType | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<CategoryType | 'ALL'>('ALL');
  
  // Estados de navegação
  const [currentTab, setCurrentTab] = useState<'tags' | 'csv' | 'individual' | 'import'>('tags');
  const [currentPage, setCurrentPage] = useState(1);
  const tagsPerPage = 8;
  
  // Estados de edição
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagData, setEditTagData] = useState<Partial<TagMapping> | null>(null);
  
  // Estados de preview
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Estados de novo tag
  const [newTag, setNewTag] = useState<Partial<TagMapping>>({
    plc_ip: plcIp,
    variable_path: '',
    tag_name: '',
    description: '',
    unit: '',
    enabled: true,
    collect_mode: 'on_change',
    collect_interval_s: 1,
    area: '',
    category: '',
  });
  
  // Estados de importação
  const [importedTags, setImportedTags] = useState<ImportedTag[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  
  // Estados de exportação
  const [exportType, setExportType] = useState<DataType>('ALL');
  const [exportWithBits, setExportWithBits] = useState(false);
  const [exportCollectMode, setExportCollectMode] = useState<'on_change' | 'interval'>('on_change');
  const [exportCollectInterval, setExportCollectInterval] = useState(1);
  const [exportArea, setExportArea] = useState<AreaType>('');
  const [exportCategory, setExportCategory] = useState<CategoryType>('');

  // ============================================================================
  // 🆕 FUNÇÃO DE AUTO-EXTRAÇÃO DE ÁREA E CATEGORIA DO NOME DO TAG
  // ============================================================================
  
  const extractAreaAndCategory = (tagName: string): { area: AreaType; category: CategoryType } => {
    // Formato esperado: {ÁREA}_{CATEGORIA}_{descrição} ou {ÁREA}_{descrição}
    // Exemplos: ENH_PROC_nivel_agua, ENH_FAULT_bomba, PJU_motor_ligado
    
    const parts = tagName.toUpperCase().split('_');
    let area: AreaType = '';
    let category: CategoryType = '';
    
    if (parts.length >= 1) {
      // Verificar se primeiro parte é uma área válida
      const possibleArea = parts[0] as AreaType;
      if (['ENH', 'ESV', 'PJU', 'PMO', 'SCO', 'EDR', 'GER'].includes(possibleArea)) {
        area = possibleArea;
      }
    }
    
    if (parts.length >= 2 && area) {
      // Verificar se segunda parte é uma categoria válida
      const possibleCategory = parts[1] as CategoryType;
      if (['PROC', 'FAULT', 'EVENT', 'ALARM', 'CMD'].includes(possibleCategory)) {
        category = possibleCategory;
      }
    }
    
    return { area, category };
  };

  // ============================================================================
  // CARREGAR DADOS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [plcIp]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [existingTags, variables] = await Promise.all([
        invoke<TagMapping[]>('load_tag_mappings', { plcIp }),
        invoke<string[]>('get_plc_variables_for_mapping', { plcIp })
      ]);

      setTags(existingTags);
      setAvailableVariables(variables);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // VARIÁVEIS FILTRADAS
  // ============================================================================

  // 🔍 Pré-calcular quais Words têm bits extraídos para performance
  const wordsWithExtractedBits = useMemo(() => {
    const wordsUsed = new Set<string>();
    
    tags.forEach(tag => {
      // Detectar padrões como "Word[0].5", "Word[10].12", "DWord[0].3", "Int[5].0"
      // Formato: Tipo[N].B onde N é o índice e B é o bit
      const bitMatch = tag.variable_path.match(/^(Word|DWord|Int|DInt)\[(\d+)\]\.(\d+)$/);
      if (bitMatch) {
        const type = bitMatch[1]; // "Word", "DWord", etc.
        const index = bitMatch[2]; // "0", "10", etc.
        // Guardar no formato "Word[0]", "DWord[10]", etc.
        wordsUsed.add(`${type}[${index}]`);
      }
    });
    
    return wordsUsed;
  }, [tags]);

  const unmappedVariables = availableVariables.filter(variable => {
    // Verificação básica: se a variável já está mapeada diretamente
    if (tags.some(tag => tag.variable_path === variable)) {
      return false;
    }
    
    // Verificação especial para tipos inteiros (Word, DWord, Int, DInt):
    // Se QUALQUER bit desta variável já foi extraído/mapeado, a variável não está disponível
    // Formato da variável: Word[0], DWord[5], Int[10], etc.
    const integerMatch = variable.match(/^(Word|DWord|Int|DInt)\[(\d+)\]$/);
    if (integerMatch) {
      // Se esta Word/DWord/Int/DInt tem algum bit extraído, não mostrar como disponível
      if (wordsWithExtractedBits.has(variable)) {
        return false;
      }
    }
    
    return true; // Variável disponível
  });


  // 🚀 OTIMIZAÇÃO: Cache dos tipos de variáveis
  const variablesByType = useMemo(() => {
    const cache: Record<DataType, string[]> = {} as Record<DataType, string[]>;
    
    // Todas as variáveis
    cache['ALL'] = unmappedVariables;
    
    // Cache por tipo
    DATA_TYPES.forEach(type => {
      if (type.key !== 'ALL') {
        if (type.key === 'Bool') {
          cache[type.key] = unmappedVariables.filter(v => v.includes('.'));
        } else {
          cache[type.key] = unmappedVariables.filter(v => v.startsWith(type.key + '['));
        }
      }
    });
    
    return cache;
  }, [unmappedVariables]);

  const getVariablesByType = (type: DataType): string[] => {
    return variablesByType[type] || [];
  };

  // 🚀 OTIMIZAÇÃO: Cache dos labels com contadores para o select
  const dataTypeOptions = useMemo(() => {
    return DATA_TYPES.map(type => ({
      ...type,
      count: getVariablesByType(type.key).length,
      label: `${type.label} (${getVariablesByType(type.key).length} variáveis)`
    }));
  }, [variablesByType]);

  // 🚀 OTIMIZAÇÃO: Cache do contador do tipo atual
  const currentTypeCount = useMemo(() => {
    return getVariablesByType(exportType).length;
  }, [exportType, variablesByType]);

  const filteredTags = tags.filter(tag => {
    // Filtro por tipo
    if (filterType !== 'ALL') {
      if (filterType === 'Bool') {
        if (!tag.variable_path.includes('.')) return false;
      } else {
        if (!tag.variable_path.startsWith(filterType + '[')) return false;
      }
    }
    
    // Filtro por texto de busca
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      const matchesName = tag.tag_name.toLowerCase().includes(search);
      const matchesDescription = tag.description?.toLowerCase().includes(search) || false;
      const matchesVariable = tag.variable_path.toLowerCase().includes(search);
      if (!matchesName && !matchesDescription && !matchesVariable) return false;
    }
    
    // Filtro por status
    if (statusFilter === 'active' && !tag.enabled) return false;
    if (statusFilter === 'inactive' && tag.enabled) return false;
    
    // 🆕 Filtro por área
    if (filterArea !== 'ALL') {
      if ((tag.area || '') !== filterArea) return false;
    }
    
    // 🆕 Filtro por categoria
    if (filterCategory !== 'ALL') {
      if ((tag.category || '') !== filterCategory) return false;
    }
    
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredTags.length / tagsPerPage);
  const startIndex = (currentPage - 1) * tagsPerPage;
  const paginatedTags = filteredTags.slice(startIndex, startIndex + tagsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ============================================================================
  // EXPORTAR CSV
  // ============================================================================

  const handleExportCSV = async () => {
    try {
      const variables = getVariablesByType(exportType);
      
      if (variables.length === 0) {
        setError(`Nenhuma variável do tipo ${exportType} disponível para exportar.`);
        return;
      }

      const SEP = ';';
      const headers = ['variable_path', 'tag_name', 'description', 'unit', 'collect_mode', 'collect_interval_s', 'enabled', 'area', 'category'];
      const rows: string[] = [];

      // Função para verificar se variável é tipo inteiro (pode expandir bits)
      const isIntegerType = (varName: string) => {
        return varName.startsWith('Word[') || varName.startsWith('DWord[') || 
               varName.startsWith('Int[') || varName.startsWith('DInt[');
      };

      variables.forEach((variable: string) => {
        if (exportWithBits && isIntegerType(variable)) {
          // Expandir bits 0-15
          for (let bit = 0; bit <= 15; bit++) {
            const bitVar = `${variable}.${bit}`;
            // 🆕 Gerar nome com área e categoria se configurados
            let tagName = '';
            if (exportArea) tagName += `${exportArea}_`;
            if (exportCategory) tagName += `${exportCategory}_`;
            tagName += variable.replace(/[\[\]]/g, '_').toLowerCase() + `_bit${bit}`;
            rows.push([bitVar, tagName, '', '', exportCollectMode, String(exportCollectInterval), 'true', exportArea, exportCategory].join(SEP));
          }
        } else {
          // 🆕 Gerar nome com área e categoria se configurados
          let tagName = '';
          if (exportArea) tagName += `${exportArea}_`;
          if (exportCategory) tagName += `${exportCategory}_`;
          tagName += variable.replace(/[\[\]]/g, '_').toLowerCase();
          rows.push([variable, tagName, '', '', exportCollectMode, String(exportCollectInterval), 'true', exportArea, exportCategory].join(SEP));
        }
      });

      const csvContent = `sep=${SEP}\r\n` + [headers.join(SEP), ...rows].join('\r\n');
      const timestamp = new Date().toISOString().slice(0, 10);
      const bitsLabel = exportWithBits ? '_bits' : '';
      const typeLabel = exportType === 'ALL' ? 'todos' : exportType.toLowerCase();
      const areaLabel = exportArea ? `_${exportArea}` : '';
      
      const filePath = await save({
        defaultPath: `tags_${typeLabel}${areaLabel}${bitsLabel}_${timestamp}.csv`,
        filters: [{ name: 'CSV (Excel)', extensions: ['csv'] }],
        title: `Exportar Tags ${exportType}`
      });

      if (filePath) {
        await invoke('write_file', { path: filePath, content: csvContent });
        console.log('✅ CSV exportado:', rows.length, 'linhas');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('os error 32')) {
        setError('Arquivo aberto no Excel. Feche e tente novamente.');
      } else {
        setError(`Erro ao exportar: ${msg}`);
      }
    }
  };

  // ============================================================================
  // IMPORTAR CSV
  // ============================================================================

  const handleImportCSV = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
        multiple: false,
        title: 'Importar Tags CSV'
      });

      if (!filePath || typeof filePath !== 'string') return;

      const fileName = filePath.split(/[/\\]/).pop() || 'arquivo.csv';
      setImportFileName(fileName);

      const text: string = await invoke('read_file', { path: filePath });
      let lines = text.split('\n').filter((line: string) => line.trim());
      
      // Ignorar sep=;
      if (lines[0]?.toLowerCase().startsWith('sep=')) {
        lines = lines.slice(1);
      }
      
      if (lines.length < 2) {
        setError('Arquivo CSV vazio ou inválido');
        return;
      }

      const dataLines = lines.slice(1);
      const imported: ImportedTag[] = [];
      
      dataLines.forEach((line: string) => {
        const separator = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const parts = line.split(separator).map((p: string) => p.trim().replace(/^"|"$/g, ''));
        
        // 🆕 Agora lê também area e category do CSV
        const [variable_path, tag_name, description, unit, collect_mode, collect_interval_s, enabled, area, category] = parts;
        
        if (!variable_path) return;

        let isValid = true;
        let errorMsg = '';

        if (!tag_name) {
          isValid = false;
          errorMsg = 'Nome obrigatório';
        } else if (tags.some(t => t.tag_name === tag_name)) {
          isValid = false;
          errorMsg = 'Nome já existe';
        } else if (tags.some(t => t.variable_path === variable_path)) {
          isValid = false;
          errorMsg = 'Variável já mapeada';
        } else if (imported.some(t => t.tag_name === tag_name)) {
          isValid = false;
          errorMsg = 'Nome duplicado no CSV';
        }

        imported.push({
          variable_path,
          tag_name: tag_name || '',
          description: description || '',
          unit: unit || '',
          collect_mode: (collect_mode === 'interval' ? 'interval' : 'on_change') as 'on_change' | 'interval',
          collect_interval_s: parseInt(collect_interval_s) || 1,
          enabled: enabled?.toLowerCase() !== 'false',
          isValid,
          error: errorMsg,
          // 🆕 Incluir area e category do CSV
          area: (area as AreaType) || '',
          category: (category as CategoryType) || '',
        });
      });

      setImportedTags(imported);
      setCurrentTab('import');
      
      console.log('📥 CSV importado:', imported.length, 'tags');
    } catch (err) {
      console.error('❌ Erro ao importar CSV:', err);
      setError('Erro ao importar arquivo CSV');
    }
  };

  // ============================================================================
  // CRIAR TAGS DA IMPORTAÇÃO
  // ============================================================================

  const handleCreateFromImport = async () => {
    const validTags = importedTags.filter(t => t.isValid);
    
    if (validTags.length === 0) {
      setError('Nenhum tag válido para importar');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const tagsToSave: TagMapping[] = validTags.map(tag => ({
        plc_ip: plcIp,
        variable_path: tag.variable_path,
        tag_name: tag.tag_name,
        description: tag.description,
        unit: tag.unit,
        enabled: tag.enabled,
        collect_mode: tag.collect_mode,
        collect_interval_s: tag.collect_interval_s,
        created_at: Date.now(),
        // 🆕 Incluir area e category na importação!
        area: tag.area || '',
        category: tag.category || '',
      }));

      await invoke('save_tag_mappings_bulk', { tags: tagsToSave });
      await loadData();

      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));

      setImportedTags([]);
      setImportFileName('');
      setCurrentTab('tags');
      
      console.log('✅ Importação concluída:', validTags.length, 'tags criados');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Editar tag importado
  const updateImportedTag = (index: number, field: keyof ImportedTag, value: any) => {
    setImportedTags(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      const tag = updated[index];
      let isValid = true;
      let error = '';

      if (!tag.tag_name) {
        isValid = false;
        error = 'Nome obrigatório';
      } else if (tags.some(t => t.tag_name === tag.tag_name)) {
        isValid = false;
        error = 'Nome já existe';
      }

      updated[index].isValid = isValid;
      updated[index].error = error;
      return updated;
    });
  };

  const removeImportedTag = (index: number) => {
    setImportedTags(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // OPERAÇÕES COM TAGS
  // ============================================================================

  const handleAddTag = async () => {
    if (!newTag.variable_path || !newTag.tag_name) {
      setError('Variável e nome são obrigatórios');
      return;
    }

    if (tags.some(t => t.tag_name === newTag.tag_name)) {
      setError('Nome do tag já existe');
      return;
    }

    if (tags.some(t => t.variable_path === newTag.variable_path)) {
      setError('Variável já mapeada');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const savedTag = { ...newTag, id: Date.now(), created_at: Date.now() };
      
      await invoke('save_tag_mapping', { 
        tag: savedTag 
      });
      
      // Atualizar estado local imediatamente para responsividade
      setTags(prevTags => [...prevTags, savedTag as TagMapping]);
      
      await loadData();
      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));

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
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (variablePath: string) => {
    try {
      await invoke('delete_tag_mapping', { plcIp, variablePath });
      await loadData();
      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
    } catch (err) {
      setError(String(err));
    }
  };

  const toggleTagEnabled = async (tag: TagMapping) => {
    try {
      await invoke('save_tag_mapping', { tag: { ...tag, enabled: !tag.enabled } });
      await loadData();
      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSaveEditTag = async () => {
    if (!editTagData?.tag_name) {
      setError('Nome do tag é obrigatório');
      return;
    }
    try {
      setSaving(true);
      await invoke('save_tag_mapping', { tag: editTagData });
      await loadData();
      setEditingTagId(null);
      setEditTagData(null);
      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
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
      window.dispatchEvent(new CustomEvent('plc-tags-updated', { detail: { plcIp } }));
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewTag = async (tag: TagMapping) => {
    try {
      const value = await invoke<string>('get_plc_variable', {
        plcIp: tag.plc_ip,
        variableName: tag.variable_path
      });
      setPreviewData({
        tag_name: tag.tag_name,
        variable_path: tag.variable_path,
        current_value: value,
        unit: tag.unit,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err) {
      setError(`Erro ao obter preview: ${err}`);
    }
  };

  const toggleSelectTag = (id: number) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTags(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map(t => t.id as number).filter(Boolean)));
    }
  };

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#212E3E] rounded-lg p-5 shadow-xl flex flex-col items-center animate-pulse">
          <Tag size={32} className="text-[#28FF52] mb-3" />
          <span className="text-white font-mono">Carregando tags...</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Padrão igual Métricas de Tráfego TCP */}
        <div className="bg-[#212E3E] px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#28FF52] rounded-md flex items-center justify-center">
              <Tag size={14} className="text-[#212E3E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Config Tags</h2>
              <p className="text-xs text-gray-400">PLC: {plcIp} • {tags.length} tags • Tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Erro */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Métricas Resumo - Cards iguais ao padrão */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]">
              <div className="text-lg font-bold text-[#212E3E] mb-0.5">{tags.length}</div>
              <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Tags</div>
            </div>
            <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]">
              <div className="text-lg font-bold text-green-600 mb-0.5">{tags.filter(t => t.enabled).length}</div>
              <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Ativos</div>
            </div>
            <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]">
              <div className="text-lg font-bold text-[#212E3E] mb-0.5">{unmappedVariables.length}</div>
              <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Disponível</div>
            </div>
            <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]">
              <div className="text-lg font-bold text-[#212E3E] mb-0.5">{availableVariables.length}</div>
              <div className="text-xs font-semibold text-[#7C9599] uppercase tracking-wide">Variáveis</div>
            </div>
          </div>

          {/* Navegação por Abas */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#BECACC]">
            <div className="flex w-full bg-[#F1F4F4] rounded-lg p-1 gap-1">
              {[
                { id: 'tags', label: 'Tags Registrados', icon: Tag },
                { id: 'csv', label: 'Exportar/Importar CSV', icon: FileSpreadsheet },
                { id: 'individual', label: 'Adicionar Individual', icon: Plus },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    currentTab === tab.id
                      ? 'bg-[#212E3E] text-white shadow-sm'
                      : 'text-[#7C9599] hover:text-[#212E3E] hover:bg-white/50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            {importedTags.length > 0 && (
              <button
                onClick={() => setCurrentTab('import')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ml-2 ${
                  currentTab === 'import'
                    ? 'bg-[#212E3E] text-white shadow-sm'
                    : 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
                }`}
              >
                <Upload size={16} />
                Revisar ({importedTags.filter(t => t.isValid).length}/{importedTags.length})
              </button>
            )}
          </div>

          {/* ================================================================== */}
          {/* TAB: TAGS REGISTRADOS */}
          {/* ================================================================== */}
          {currentTab === 'tags' && (
            <div className="space-y-3">
              {/* Filtros e Ações */}
              <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC] flex items-center justify-between gap-3 min-h-[48px]">
                <div className="flex items-center gap-2">
                  {/* Campo de Busca */}
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-[#7C9599]" />
                    <input
                      type="text"
                      placeholder="Buscar tags..."
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#212E3E] transition-colors"
                    />
                    {searchText && (
                      <button
                        onClick={() => {
                          setSearchText('');
                          setCurrentPage(1);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filtros por Tipo */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#7C9599]">
                      <Filter size={16} />
                      Filtrar:
                    </div>
                    <div className="flex gap-1">
                      {DATA_TYPES.slice(0, 4).map(type => (
                        <button
                          key={type.key}
                          onClick={() => { setFilterType(type.key); setCurrentPage(1); }}
                          className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                            filterType === type.key 
                              ? 'bg-[#212E3E] text-white' 
                              : 'bg-white text-gray-600 border border-gray-300 hover:border-[#212E3E]'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Filtro Status */}
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilter === 'active' || statusFilter === 'all'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (statusFilter === 'inactive') setStatusFilter('all');
                            else setStatusFilter('active');
                          } else {
                            setStatusFilter('inactive');
                          }
                          setCurrentPage(1);
                        }}
                        className="w-3 h-3 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      Ativos
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilter === 'inactive' || statusFilter === 'all'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (statusFilter === 'active') setStatusFilter('all');
                            else setStatusFilter('inactive');
                          } else {
                            setStatusFilter('active');
                          }
                          setCurrentPage(1);
                        }}
                        className="w-3 h-3 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      Inativos
                    </label>
                  </div>
                  
                  {/* 🆕 Filtro por Área */}
                  <select
                    value={filterArea}
                    onChange={(e) => { setFilterArea(e.target.value as AreaType | 'ALL'); setCurrentPage(1); }}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#212E3E]"
                  >
                    <option value="ALL">Área: Todas</option>
                    {AREAS.filter(a => a.key !== '').map(a => (
                      <option key={a.key} value={a.key}>{a.key}</option>
                    ))}
                  </select>
                  
                  {/* 🆕 Filtro por Categoria */}
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value as CategoryType | 'ALL'); setCurrentPage(1); }}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#212E3E]"
                  >
                    <option value="ALL">Cat: Todas</option>
                    {CATEGORIES.filter(c => c.key !== '').map(c => (
                      <option key={c.key} value={c.key}>{c.key}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  {/* Indicador compacto */}
                  {(searchText || statusFilter !== 'all' || filterType !== 'ALL' || filterArea !== 'ALL' || filterCategory !== 'ALL') && (
                    <span className="text-xs text-[#7C9599] whitespace-nowrap">{filteredTags.length} encontrados</span>
                  )}
                  
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={filteredTags.length > 0 && selectedTags.size === filteredTags.length}
                      onChange={handleSelectAll}
                      className="w-3 h-3 rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E]"
                    />
                    Selecionar todos
                  </label>
                  {selectedTags.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Trash2 size={12} />
                      Excluir ({selectedTags.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Tags */}
              {filteredTags.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-[#F1F4F4] rounded-lg border border-[#BECACC]">
                  <Tag className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-lg">Nenhum tag encontrado</p>
                  <p className="text-sm">Adicione tags na aba "Adicionar / Exportar"</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[#BECACC] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F1F4F4]">
                      <tr>
                        <th className="w-8 px-2 py-2"></th>
                        <th className="w-28 px-2 py-2 text-left text-xs font-bold text-[#7C9599] uppercase">Nome</th>
                        <th className="w-28 px-2 py-2 text-left text-xs font-bold text-[#7C9599] uppercase">Variável</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-[#7C9599] uppercase">Descrição</th>
                        <th className="w-12 px-1 py-2 text-center text-xs font-bold text-[#7C9599] uppercase">Área</th>
                        <th className="w-14 px-1 py-2 text-center text-xs font-bold text-[#7C9599] uppercase">Cat.</th>
                        <th className="w-16 px-2 py-2 text-center text-xs font-bold text-[#7C9599] uppercase">Status</th>
                        <th className="w-24 px-2 py-2 text-right text-xs font-bold text-[#7C9599] uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTags.map(tag => (
                        <tr key={tag.id} className={`border-t border-gray-100 hover:bg-[#F1F4F4] transition-colors ${
                          selectedTags.has(tag.id!) ? 'bg-blue-50' : ''
                        }`}>
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedTags.has(tag.id!)}
                              onChange={() => toggleSelectTag(tag.id!)}
                              className="w-3 h-3 rounded border-gray-300 text-[#212E3E] focus:ring-[#212E3E]"
                            />
                          </td>
                          <td className="px-2 py-2">
                            {editingTagId === tag.id ? (
                              <input
                                type="text"
                                value={editTagData?.tag_name || ''}
                                onChange={e => setEditTagData({ ...editTagData, tag_name: e.target.value })}
                                className="w-full px-2 py-1 text-xs border border-[#212E3E] rounded focus:outline-none"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEditTag();
                                  if (e.key === 'Escape') { setEditingTagId(null); setEditTagData(null); }
                                }}
                              />
                            ) : (
                              <span className="font-semibold text-xs text-[#212E3E] block truncate" title={tag.tag_name}>{tag.tag_name}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <span className="font-mono text-xs text-[#7C9599] block truncate" title={tag.variable_path}>{tag.variable_path}</span>
                          </td>
                          <td className="px-2 py-2">
                            {editingTagId === tag.id ? (
                              <input
                                type="text"
                                value={editTagData?.description || ''}
                                onChange={e => setEditTagData({ ...editTagData, description: e.target.value })}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#212E3E]"
                              />
                            ) : (
                              <span className="text-xs text-gray-600 block truncate" title={tag.description || '-'}>
                                {tag.description || '-'}
                              </span>
                            )}
                          </td>
                          {/* 🆕 Coluna Área */}
                          <td className="px-1 py-2 text-center">
                            {editingTagId === tag.id ? (
                              <select
                                value={editTagData?.area || ''}
                                onChange={e => setEditTagData({ ...editTagData, area: e.target.value as AreaType })}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#212E3E]"
                              >
                                {AREAS.map(a => (
                                  <option key={a.key} value={a.key}>{a.key || '-'}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${
                                tag.area ? 'bg-cyan-100 text-cyan-700' : 'text-gray-400'
                              }`}>
                                {tag.area || '-'}
                              </span>
                            )}
                          </td>
                          {/* 🆕 Coluna Categoria */}
                          <td className="px-1 py-2 text-center">
                            {editingTagId === tag.id ? (
                              <select
                                value={editTagData?.category || ''}
                                onChange={e => setEditTagData({ ...editTagData, category: e.target.value as CategoryType })}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#212E3E]"
                              >
                                {CATEGORIES.map(c => (
                                  <option key={c.key} value={c.key}>{c.key || '-'}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${
                                tag.category === 'FAULT' ? 'bg-red-100 text-red-700' :
                                tag.category === 'ALARM' ? 'bg-orange-100 text-orange-700' :
                                tag.category === 'EVENT' ? 'bg-yellow-100 text-yellow-700' :
                                tag.category === 'PROC' ? 'bg-blue-100 text-blue-700' :
                                tag.category === 'CMD' ? 'bg-purple-100 text-purple-700' :
                                'text-gray-400'
                              }`}>
                                {tag.category || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${
                              tag.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {tag.enabled ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-end gap-0.5">
                              {editingTagId === tag.id ? (
                                <>
                                  <button
                                    onClick={handleSaveEditTag}
                                    className="p-1 rounded"
                                    title="Salvar"
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: '#16a34a',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <CheckCircle size={14} style={{ color: '#16a34a' }} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingTagId(null); setEditTagData(null); }}
                                    className="p-1 rounded"
                                    title="Cancelar"
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: '#6b7280',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <X size={14} style={{ color: '#6b7280' }} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handlePreviewTag(tag)}
                                    className="p-1 rounded"
                                    title="Preview"
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: '#2563eb',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <Eye size={14} style={{ color: '#2563eb' }} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingTagId(tag.id!); setEditTagData({ ...tag }); }}
                                    className="p-1 rounded"
                                    title="Editar"
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: '#212E3E',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <Pencil size={14} style={{ color: '#212E3E' }} />
                                  </button>
                                  <button
                                    onClick={() => toggleTagEnabled(tag)}
                                    className="p-1 rounded"
                                    title={tag.enabled ? 'Desativar' : 'Ativar'}
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: tag.enabled ? '#16a34a' : '#9ca3af',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <Power size={14} style={{ color: tag.enabled ? '#16a34a' : '#9ca3af' }} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTag(tag.variable_path)}
                                    className="p-1 rounded"
                                    title="Excluir"
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: '#dc2626',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <Trash2 size={14} style={{ color: '#dc2626' }} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="p-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold">{startIndex + 1}-{Math.min(startIndex + tagsPerPage, filteredTags.length)}</span> de <span className="font-semibold">{filteredTags.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="px-2 py-1 text-xs font-medium bg-[#212E3E] text-white rounded">
                          {currentPage}
                        </span>
                        <span className="text-xs text-gray-500">/{totalPages}</span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB: EXPORTAR/IMPORTAR CSV */}
          {/* ================================================================== */}
          {currentTab === 'csv' && (
            <div className="space-y-6">
              {/* Seção Exportar CSV */}
              <div className="bg-white rounded-lg border border-[#BECACC] overflow-hidden">
                <div className="bg-[#F1F4F4] px-4 py-3 border-b border-[#BECACC]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Download size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#212E3E]">Exportar Template CSV</h3>
                      <p className="text-xs text-[#7C9599]">Gere um template para preencher no Excel e importar depois</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Tipo de dado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de dado</label>
                      <select
                        value={exportType}
                        onChange={e => setExportType(e.target.value as DataType)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        {dataTypeOptions.map(type => (
                          <option key={type.key} value={type.key}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Modo de Coleta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Coleta</label>
                      <select
                        value={exportCollectMode}
                        onChange={e => setExportCollectMode(e.target.value as 'on_change' | 'interval')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        <option value="on_change">On Change (ao mudar)</option>
                        <option value="interval">Intervalo (cíclico)</option>
                      </select>
                    </div>

                    {/* Intervalo de Ciclo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (segundos)</label>
                      <input
                        type="number"
                        min="1"
                        max="3600"
                        value={exportCollectInterval}
                        onChange={e => setExportCollectInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                      />
                    </div>

                    {/* Expandir Bits - só aparece para Word */}
                    {(exportType === 'Word' || exportType === 'ALL') && (
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer h-[42px]">
                          <input
                            type="checkbox"
                            checked={exportWithBits}
                            onChange={e => setExportWithBits(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          Expandir bits (0-15) para Word
                        </label>
                      </div>
                    )}

                    {/* 🆕 ÁREA DO EQUIPAMENTO PARA EXPORTAÇÃO */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Área/Equipamento
                        <span className="ml-1 text-xs text-gray-400">(prefixo)</span>
                      </label>
                      <select
                        value={exportArea}
                        onChange={e => setExportArea(e.target.value as AreaType)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        {AREAS.map(area => (
                          <option key={area.key} value={area.key}>{area.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 🆕 CATEGORIA DO TAG PARA EXPORTAÇÃO */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria
                        <span className="ml-1 text-xs text-gray-400">(PROC, FAULT...)</span>
                      </label>
                      <select
                        value={exportCategory}
                        onChange={e => setExportCategory(e.target.value as CategoryType)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Botões de Ação Principal */}
                  <div className="flex gap-3 mb-4">
                    {/* Botão Exportar */}
                    <button
                      onClick={handleExportCSV}
                      disabled={currentTypeCount === 0}
                      className="flex-1 py-3 text-sm font-bold bg-edp-marine text-white rounded-lg hover:bg-edp-marine-100 disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileSpreadsheet size={18} className="text-white" />
                      Exportar Template CSV
                    </button>

                    {/* Separador */}
                    <div className="flex items-center">
                      <div className="w-px h-12 bg-gray-300"></div>
                    </div>

                    {/* Botão Importar */}
                    <button
                      onClick={handleImportCSV}
                      className="flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: '1px solid #2563eb'
                      }}
                    >
                      <Upload size={18} style={{ color: '#ffffff' }} />
                      Selecionar e Importar Arquivo CSV
                    </button>
                  </div>

                  {/* Números simples */}
                  <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]">
                    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                      <span className="text-[#7C9599]">{currentTypeCount} variáveis</span>
                      <span className="text-[#7C9599]">{exportCollectInterval}s ciclo</span>
                      <span className="text-[#7C9599]">{exportCollectMode === 'on_change' ? 'On Change' : 'Intervalo'}</span>
                      {exportArea && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{exportArea}</span>}
                      {exportCategory && <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORIES.find(c => c.key === exportCategory)?.color || 'bg-gray-100 text-gray-800'}`}>{exportCategory}</span>}
                    </div>
                  </div>

                  {/* Botões Após Importar */}
                  {importedTags.length > 0 && (
                    <div className="border-t border-[#BECACC] pt-4 mt-4">
                      <div className="text-sm font-bold text-[#212E3E] mb-3 text-center">
                        {importedTags.length} Tags Importados
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentTab('import')}
                          className="flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                          style={{
                            backgroundColor: '#ea580c',
                            color: '#ffffff',
                            border: '1px solid #ea580c'
                          }}
                        >
                          <Eye size={16} style={{ color: '#ffffff' }} />
                          Revisar
                        </button>
                        <button
                          onClick={handleCreateFromImport}
                          disabled={saving || importedTags.filter(t => t.isValid).length === 0}
                          className="flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                          style={{
                            backgroundColor: saving || importedTags.filter(t => t.isValid).length === 0 ? '#9ca3af' : '#16a34a',
                            color: '#ffffff',
                            border: saving || importedTags.filter(t => t.isValid).length === 0 ? '1px solid #9ca3af' : '1px solid #16a34a'
                          }}
                        >
                          <CheckCircle size={16} style={{ color: '#ffffff' }} />
                          Criar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção Importar CSV */}
              <div className="bg-white rounded-lg border border-[#BECACC] overflow-hidden">
                <div className="bg-[#F1F4F4] px-4 py-3 border-b border-[#BECACC]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Upload size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#212E3E]">Formato CSV Esperado</h3>
                      <p className="text-xs text-[#7C9599]">Informações sobre o formato correto</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-[#7C9599] space-y-1">
                    <p>• Colunas: variable_path, tag_name, description, unit, collect_mode, collect_interval_s, enabled</p>
                    <p>• Separador: ponto e vírgula (;) ou vírgula (,)</p>
                    <p>• Primeira linha: cabeçalho (será ignorada)</p>
                    <p>• Exemplo: Word[100];temperatura_motor;Temperatura do motor;°C;on_change;1;true</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB: ADICIONAR INDIVIDUAL */}
          {/* ================================================================== */}
          {currentTab === 'individual' && (
            <div className="space-y-6">
              {/* Formulário Manual */}
              <div className="bg-white rounded-lg border border-[#BECACC] overflow-hidden">
                <div className="bg-[#F1F4F4] px-4 py-3 border-b border-[#BECACC]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#212E3E] rounded-lg flex items-center justify-center">
                      <Plus size={16} className="text-[#28FF52]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#212E3E]">Adicionar Tag Individual</h3>
                      <p className="text-xs text-[#7C9599]">Crie um tag manualmente selecionando a variável PLC</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variável PLC *</label>
                      <select
                        value={newTag.variable_path}
                        onChange={e => {
                          const v = e.target.value;
                          setNewTag({
                            ...newTag,
                            variable_path: v,
                            tag_name: v ? v.replace(/[\[\].]/g, '_').toLowerCase() : ''
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                      >
                        <option value="">Selecione uma variável...</option>
                        {unmappedVariables.slice(0, 100).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                        {unmappedVariables.length > 100 && (
                          <option disabled>... e mais {unmappedVariables.length - 100} variáveis</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Tag *</label>
                      <input
                        type="text"
                        value={newTag.tag_name}
                        onChange={e => setNewTag({ ...newTag, tag_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                        placeholder="nome_do_tag"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <input
                        type="text"
                        value={newTag.description}
                        onChange={e => setNewTag({ ...newTag, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                        placeholder="Descrição opcional do tag"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                      <input
                        type="text"
                        value={newTag.unit}
                        onChange={e => setNewTag({ ...newTag, unit: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                        placeholder="°C, bar, rpm, etc."
                      />
                    </div>

                    {/* Modo de Coleta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Coleta</label>
                      <select
                        value={newTag.collect_mode}
                        onChange={e => setNewTag({ ...newTag, collect_mode: e.target.value as 'on_change' | 'interval' })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        <option value="on_change">On Change (ao mudar)</option>
                        <option value="interval">Intervalo (cíclico)</option>
                      </select>
                    </div>

                    {/* Intervalo de Ciclo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (segundos)</label>
                      <input
                        type="number"
                        min="1"
                        max="3600"
                        value={newTag.collect_interval_s}
                        onChange={e => setNewTag({ ...newTag, collect_interval_s: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#212E3E]"
                      />
                    </div>

                    {/* 🆕 ÁREA DO EQUIPAMENTO */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Área/Equipamento
                        <span className="ml-1 text-xs text-gray-400">(para SUBSCRIBE)</span>
                      </label>
                      <select
                        value={newTag.area || ''}
                        onChange={e => setNewTag({ ...newTag, area: e.target.value as AreaType })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        {AREAS.map(area => (
                          <option key={area.key} value={area.key}>{area.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 🆕 CATEGORIA DO TAG */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria
                        <span className="ml-1 text-xs text-gray-400">(PROC, FAULT, EVENT...)</span>
                      </label>
                      <select
                        value={newTag.category || ''}
                        onChange={e => setNewTag({ ...newTag, category: e.target.value as CategoryType })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#212E3E]"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 🆕 DICA DE AUTO-EXTRAÇÃO */}
                  {newTag.tag_name && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700">
                        💡 <strong>Dica:</strong> Use o padrão <code className="bg-blue-100 px-1 rounded">ÁREA_CATEGORIA_descrição</code> no nome do tag
                        (ex: <code className="bg-blue-100 px-1 rounded">ENH_PROC_nivel_agua</code>) para auto-extração.
                      </p>
                      {(() => {
                        const extracted = extractAreaAndCategory(newTag.tag_name || '');
                        if (extracted.area || extracted.category) {
                          return (
                            <p className="text-xs text-blue-600 mt-1">
                              📌 Detectado: Área = <strong>{extracted.area || 'N/A'}</strong>, Categoria = <strong>{extracted.category || 'N/A'}</strong>
                              <button
                                type="button"
                                onClick={() => setNewTag({ ...newTag, area: extracted.area, category: extracted.category })}
                                className="ml-2 text-blue-800 underline hover:text-blue-900"
                              >
                                Aplicar
                              </button>
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.variable_path || !newTag.tag_name || saving}
                    className="mt-4 w-full py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: (!newTag.variable_path || !newTag.tag_name || saving) ? '#9ca3af' : '#212E3E',
                      color: '#ffffff',
                      border: (!newTag.variable_path || !newTag.tag_name || saving) ? '1px solid #9ca3af' : '1px solid #212E3E'
                    }}
                  >
                    <Plus size={16} style={{ color: '#ffffff' }} />
                    {saving ? 'Adicionando...' : 'Adicionar Tag'}
                  </button>

                  {/* Info sobre variáveis disponíveis */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">📋 Informações:</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• <span className="font-semibold">{unmappedVariables.length}</span> variáveis PLC não mapeadas</p>
                      <p>• <strong>Áreas:</strong> ENH (Enchimento), ESV (Esvaziamento), PJU (Porta Jusante), PMO (Porta Montante), SCO (Sala Comando), EDR (Esgoto/Drenagem)</p>
                      <p>• <strong>Categorias:</strong> PROC (Processo), FAULT (Falha), EVENT (Evento), ALARM (Alarme), CMD (Comando)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB: IMPORTAR */}
          {/* ================================================================== */}
          {currentTab === 'import' && importedTags.length > 0 && (
            <div className="space-y-4">
              {/* Header da Importação */}
              <div className="bg-[#F1F4F4] rounded-lg p-4 border border-[#BECACC] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#212E3E]">{importFileName}</h3>
                    <p className="text-sm text-[#7C9599]">
                      <span className="text-green-600 font-semibold">{importedTags.filter(t => t.isValid).length}</span> válidos de {importedTags.length} tags
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setImportedTags([]); setImportFileName(''); setCurrentTab('tags'); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateFromImport}
                    disabled={saving || importedTags.filter(t => t.isValid).length === 0}
                    className="px-6 py-3 text-base font-bold rounded-lg flex items-center gap-2 shadow-md"
                    style={{
                      backgroundColor: (saving || importedTags.filter(t => t.isValid).length === 0) ? '#9ca3af' : '#16a34a',
                      color: '#ffffff',
                      border: (saving || importedTags.filter(t => t.isValid).length === 0) ? '1px solid #9ca3af' : '1px solid #16a34a'
                    }}
                  >
                    <CheckCircle size={20} style={{ color: '#ffffff' }} />
                    {saving ? 'Criando...' : `Criar ${importedTags.filter(t => t.isValid).length} Tags`}
                  </button>
                </div>
              </div>

              {/* Lista de Tags Importados */}
              <div className="bg-white rounded-lg border border-[#BECACC] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F1F4F4]">
                    <tr>
                      <th className="w-10 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#7C9599] uppercase">Variável</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#7C9599] uppercase">Nome do Tag</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#7C9599] uppercase">Descrição</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-[#7C9599] uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-[#7C9599] uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedTags.slice(0, 50).map((tag, index) => (
                      <tr key={index} className={`border-t border-gray-100 ${tag.isValid ? 'bg-white' : 'bg-red-50'}`}>
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full ${tag.isValid ? 'bg-green-500' : 'bg-red-500'}`}/>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-[#7C9599]">{tag.variable_path}</span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={tag.tag_name}
                            onChange={e => updateImportedTag(index, 'tag_name', e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded ${tag.isValid ? 'border-gray-300' : 'border-red-300'} focus:outline-none focus:border-[#212E3E]`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={tag.description}
                            onChange={e => updateImportedTag(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#212E3E]"
                            placeholder="Descrição"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tag.isValid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              Válido
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700" title={tag.error}>
                              {tag.error}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeImportedTag(index)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedTags.length > 50 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                    Mostrando 50 de {importedTags.length} tags. Os demais serão importados normalmente.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setPreviewData(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#212E3E]">Preview do Tag</h3>
                <button onClick={() => setPreviewData(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-[#F1F4F4] rounded-lg p-4">
                  <div className="text-3xl font-bold text-[#212E3E]">{previewData.current_value} {previewData.unit}</div>
                  <div className="text-xs text-[#7C9599] mt-1">Valor atual às {previewData.timestamp}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[#7C9599] text-xs uppercase font-semibold">Tag</div>
                    <div className="font-semibold text-[#212E3E]">{previewData.tag_name}</div>
                  </div>
                  <div>
                    <div className="text-[#7C9599] text-xs uppercase font-semibold">Variável</div>
                    <div className="font-mono text-[#212E3E]">{previewData.variable_path}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
