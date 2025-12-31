import React, { useState, useEffect, useMemo } from 'react';
import { 
    Play, Code, Terminal, Lightbulb, Zap, Activity, Cpu, Database, 
    CheckCircle2, XCircle, Server, AlertTriangle, ArrowRight, Clock, 
    RefreshCw, Eye, TrendingUp, Hash, Binary, Layers, BookOpen, 
    X, FileCode, Bookmark, Copy, Check
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

// Importar do parser Python
import { 
    PythonParser,
    getDataTypeColor,
    EXAMPLE_CATEGORIES,
    getExamplesByCategory
} from '../components/python-parser';
import type {
    LogicNode, 
    TagData, 
    PlcTagInfo,
    ExampleCode,
    ExampleCategory
} from '../components/python-parser';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const SclAnalysisPage: React.FC = () => {
    // Estados do código
    const [pythonCode, setPythonCode] = useState<string>(
        'resultado = Sensor_1 and Sensor_2'
    );
    const [parsedNodes, setParsedNodes] = useState<LogicNode[]>([]);
    const [parseWarnings, setParseWarnings] = useState<any[]>([]);
    const [parseErrors, setParseErrors] = useState<any[]>([]);
    const [isAnalysing, setIsAnalysing] = useState(false);

    // Estados do PLC
    const [selectedPlc, setSelectedPlc] = useState<string>("");
    const [availablePlcs, setAvailablePlcs] = useState<string[]>([]);
    const [useRealData, setUseRealData] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [tagCache, setTagCache] = useState<Map<string, PlcTagInfo>>(new Map());

    // Estados de modais
    const [showExamples, setShowExamples] = useState(false);
    const [showReference, setShowReference] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ExampleCategory>('basic');
    const [copiedExample, setCopiedExample] = useState<string | null>(null);

    // Parser Python instance
    const parser = useMemo(() => new PythonParser(), []);

    // ============================================================================
    // EFEITOS
    // ============================================================================

    useEffect(() => {
        loadAvailablePlcs();
    }, []);



    useEffect(() => {
        parser.setTagCache(tagCache);
    }, [tagCache, parser]);

    // ============================================================================
    // EXEMPLOS SIEMENS (pode ser usado em UI)
    // ============================================================================
    // Exemplo de uso: SIEMENS_VAR_EXAMPLES
    // ============================================================================
    // FUNÇÕES
    // ============================================================================

    const loadAvailablePlcs = async () => {
        setLoading(true);
        try {
            const plcs = await invoke<string[]>('get_connected_clients');
            setAvailablePlcs(plcs);

            if (plcs.length > 0 && !selectedPlc) {
                setSelectedPlc(plcs[0]);
                setUseRealData(true);
                await loadTagsFromCache(plcs[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar PLCs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTagsFromCache = async (plcIp: string) => {
        try {
            const tags = await invoke<PlcTagInfo[]>('get_scl_tags', { plcIp });
            const cache = new Map<string, PlcTagInfo>();
            for (const tag of tags) {
                cache.set(tag.tag_name, tag);
                cache.set(tag.tag_name.toLowerCase(), tag);
            }
            setTagCache(cache);
            setLastUpdate(new Date());
            return cache;
        } catch (e) {
            console.error('Erro ao carregar tags:', e);
            return new Map();
        }
    };

    const runParser = async () => {
        setIsAnalysing(true);
        setLoading(true);

        try {
            // Atualizar cache se PLC selecionado
            if (selectedPlc) {
                const cache = await loadTagsFromCache(selectedPlc);
                parser.setTagCache(cache);
            }

            // Fazer parse do código Python
            const result = parser.parse(pythonCode);
            setParsedNodes(result.nodes);
            setParseWarnings(result.warnings);
            setParseErrors(result.errors);

        } catch (error) {
            console.error('Erro ao processar código:', error);
        } finally {
            setIsAnalysing(false);
            setLoading(false);
        }
    };

    const useExample = (example: ExampleCode) => {
        setPythonCode(example.code);
        setShowExamples(false);
        setCopiedExample(example.id);
        setTimeout(() => setCopiedExample(null), 2000);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedExample(id);
        setTimeout(() => setCopiedExample(null), 2000);
    };

    // ============================================================================
    // COMPONENTES DE UI
    // ============================================================================

    const TypeBadge = ({ dataType }: { dataType: string }) => {
        const colors = getDataTypeColor(dataType);
        const icons: Record<string, React.ReactNode> = {
            'BOOL': <Binary size={10} />,
            'INT': <Hash size={10} />,
            'DINT': <Hash size={10} />,
            'REAL': <TrendingUp size={10} />,
            'WORD': <Database size={10} />,
            'DWORD': <Database size={10} />,
        };

        return (
            <span className={`inline-flex items-center gap-1 text-[10px] ${colors.bg} ${colors.text} px-1.5 py-0.5 rounded border ${colors.border} uppercase font-bold`}>
                {icons[dataType] || <Layers size={10} />} {dataType || '?'}
            </span>
        );
    };

    const ValueDisplay = ({ tag }: { tag: TagData }) => {
        if (!tag.foundInCache) {
            return <span className="text-gray-400 italic text-sm">N/A</span>;
        }

        if (tag.dataType === 'BOOL') {
            return tag.currentValue === 'TRUE' || tag.currentValue === '1' ?
                <span className="text-green-600 font-bold">TRUE</span> :
                <span className="text-red-500 font-bold">FALSE</span>;
        }

        if (tag.dataType === 'REAL') {
            return <span className="text-orange-600 font-bold font-mono">{tag.currentValue}</span>;
        }

        return <span className="text-gray-700 font-bold font-mono">{tag.currentValue}</span>;
    };

    const StatusIcon = ({ status }: { status: TagData['status'] }) => {
        switch (status) {
            case 'OK': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'NOK': return <XCircle size={16} className="text-red-500" />;
            case 'NOT_FOUND': return <AlertTriangle size={16} className="text-yellow-500" />;
            default: return <div className="w-3 h-3 rounded-full bg-gray-300" />;
        }
    };

    const getLogicTypeLabel = (type: string) => {
        const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            'ASSIGNMENT': { label: 'Atribuição', color: 'bg-green-500', icon: <ArrowRight size={14} /> },
            'IF_STATEMENT': { label: 'IF', color: 'bg-indigo-500', icon: <Code size={14} /> },
            'ELIF_STATEMENT': { label: 'ELIF', color: 'bg-indigo-400', icon: <Code size={14} /> },
            'ELSE_STATEMENT': { label: 'ELSE', color: 'bg-indigo-300', icon: <Code size={14} /> },
            'FOR_LOOP': { label: 'FOR Loop', color: 'bg-cyan-500', icon: <RefreshCw size={14} /> },
            'WHILE_LOOP': { label: 'WHILE Loop', color: 'bg-cyan-600', icon: <RefreshCw size={14} /> },
            'FUNCTION_DEF': { label: 'Definição Função', color: 'bg-teal-500', icon: <Terminal size={14} /> },
            'CLASS_DEF': { label: 'Definição Classe', color: 'bg-purple-500', icon: <Layers size={14} /> },
            'COMPARISON': { label: 'Comparação', color: 'bg-blue-500', icon: <Activity size={14} /> },
            'ARITHMETIC': { label: 'Aritmética', color: 'bg-orange-500', icon: <Hash size={14} /> },
            'LOGICAL': { label: 'Lógica Booleana', color: 'bg-purple-500', icon: <Zap size={14} /> },
            'FUNCTION_CALL': { label: 'Chamada Função', color: 'bg-teal-400', icon: <Terminal size={14} /> },
            'LIST_COMPREHENSION': { label: 'List Comprehension', color: 'bg-pink-500', icon: <Layers size={14} /> },
            'DICTIONARY': { label: 'Dicionário', color: 'bg-yellow-500', icon: <Database size={14} /> },
            'LIST': { label: 'Lista', color: 'bg-lime-500', icon: <Layers size={14} /> },
            'TUPLE': { label: 'Tupla', color: 'bg-emerald-500', icon: <Layers size={14} /> },
            'TRY_EXCEPT': { label: 'Try/Except', color: 'bg-red-500', icon: <AlertTriangle size={14} /> },
            'WITH_STATEMENT': { label: 'With', color: 'bg-violet-500', icon: <Code size={14} /> },
            'IMPORT': { label: 'Import', color: 'bg-gray-500', icon: <BookOpen size={14} /> },
            'RETURN': { label: 'Return', color: 'bg-blue-600', icon: <ArrowRight size={14} /> },
            'EXPRESSION': { label: 'Expressão', color: 'bg-gray-400', icon: <Code size={14} /> },
        };
        return configs[type] || { label: type, color: 'bg-gray-500', icon: <Code size={14} /> };
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-edp-marine/10 rounded-lg">
                        <Code className="text-edp-marine" size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 text-lg">Análise Python</h1>
                        <p className="text-xs text-gray-500">Parser Python com integração PLC em tempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Badge Python */}
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                        <FileCode size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Python 3.11</span>
                    </div>

                    {/* Botão Exemplos */}
                    <button
                        onClick={() => setShowExamples(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                        <BookOpen size={16} />
                        Exemplos
                    </button>

                    {/* Botão Referência */}
                    <button
                        onClick={() => setShowReference(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                        <Bookmark size={16} />
                        Guia
                    </button>

                    {/* Separador */}
                    <div className="h-8 w-px bg-gray-200" />

                    {/* Seletor de PLC */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Server size={16} className="text-gray-500" />
                        <select
                            value={selectedPlc}
                            onChange={(e) => {
                                setSelectedPlc(e.target.value);
                                setUseRealData(e.target.value !== "");
                                if (e.target.value) loadTagsFromCache(e.target.value);
                            }}
                            className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                        >
                            <option value="">Selecione PLC</option>
                            {availablePlcs.map((plc) => (
                                <option key={plc} value={plc}>{plc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status de Conexão */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${useRealData ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${useRealData ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        <span className={`text-xs font-semibold ${useRealData ? 'text-green-700' : 'text-yellow-700'}`}>
                            {useRealData ? 'Online' : 'Offline'}
                        </span>
                        {tagCache.size > 0 && (
                            <span className="text-xs text-gray-500">({Math.floor(tagCache.size / 2)} tags)</span>
                        )}
                    </div>

                    {/* Atualizar */}
                    <button
                        onClick={loadAvailablePlcs}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-edp-marine hover:bg-gray-100 rounded-lg transition-colors"
                        title="Atualizar PLCs"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Botão Analisar */}
                    <button
                        onClick={runParser}
                        disabled={isAnalysing || loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white bg-edp-marine hover:bg-[#1a2332] disabled:opacity-50 transition-colors"
                    >
                        {isAnalysing ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Play size={16} fill="currentColor" />
                                Analisar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                {/* Editor de Código */}
                <div className="flex flex-col bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                    <div className="px-4 py-3 bg-[#252526] border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={16} className="text-gray-400" />
                            <span className="text-gray-300 text-sm font-semibold">
                                Código Python
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs">{pythonCode.split('\n').length} linhas</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                Python
                            </span>
                        </div>
                    </div>
                    <textarea
                        value={pythonCode}
                        onChange={(e) => setPythonCode(e.target.value)}
                        className="flex-1 w-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
                        spellCheck={false}
                        placeholder="# Digite seu código Python aqui...&#10;# Use os nomes exatos das tags como estão mapeadas&#10;# O sistema reconhecerá automaticamente as tags do cache&#10;# Exemplo:&#10;# variavel = nome_da_tag&#10;# resultado = variavel and not outra_tag"
                    />
                </div>

                {/* Painel de Resultado */}
                <div className="flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-gray-500" />
                            <span className="text-gray-700 text-sm font-semibold">Resultado da Análise</span>
                            {parsedNodes.length > 0 && (
                                <span className="text-xs bg-edp-marine text-white px-2 py-0.5 rounded-full">
                                    {parsedNodes.length} {parsedNodes.length === 1 ? 'instrução' : 'instruções'}
                                </span>
                            )}
                        </div>
                        {lastUpdate && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={12} />
                                {lastUpdate.toLocaleTimeString('pt-BR')}
                            </div>
                        )}
                    </div>

                    {/* Avisos e Sugestões */}
                    {(parseWarnings.length > 0 || parseErrors.length > 0) && (
                        <div className="p-4 border-b border-gray-200">
                            {parseErrors.length > 0 && (
                                <div className="mb-3">
                                    <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                                        <XCircle size={16} />
                                        Erros ({parseErrors.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {parseErrors.map((error, i) => (
                                            <div key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                                                <span className="font-mono text-xs text-red-500">Linha {error.line}:</span> {error.message}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {parseWarnings.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-1">
                                        <AlertTriangle size={16} />
                                        Sugestões e Avisos ({parseWarnings.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {parseWarnings.map((warning, i) => (
                                            <div key={i} className={`text-sm p-2 rounded border ${
                                                warning.type === 'BEST_PRACTICE' ? 
                                                'text-blue-700 bg-blue-50 border-blue-200' : 
                                                'text-orange-700 bg-orange-50 border-orange-200'
                                            }`}>
                                                {warning.line > 0 && <span className="font-mono text-xs opacity-60">Linha {warning.line}: </span>}
                                                {warning.message}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conteúdo do Resultado */}
                    {parsedNodes.length > 0 ? (
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {parsedNodes.map((node, nodeIndex) => {
                                const logicType = getLogicTypeLabel(node.type);

                                return (
                                    <div key={node.id} className="space-y-3">
                                        {/* Card da Lógica */}
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            {/* Header do Card */}
                                            <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400 font-mono">#{nodeIndex + 1}</span>
                                                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold ${logicType.color}`}>
                                                            {logicType.icon}
                                                            {logicType.label}
                                                        </span>
                                                    </div>
                                                    {node.resultTag && (
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                                                            node.resultTag.currentValue === 'TRUE' ? 'bg-green-100' :
                                                            node.resultTag.currentValue === 'FALSE' ? 'bg-red-100' :
                                                            'bg-blue-100'
                                                        }`}>
                                                            <StatusIcon status={node.resultTag.status} />
                                                            <span className="text-sm font-bold">
                                                                {node.resultTag.name} = <ValueDisplay tag={node.resultTag} />
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <code className="text-xs font-mono text-gray-500 mt-2 block truncate">
                                                    {node.summary}
                                                </code>
                                            </div>

                                            {/* Explicação da Lógica */}
                                            <div className="p-4 bg-blue-50/50 border-b border-gray-100">
                                                <div className="flex gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg h-fit flex-shrink-0">
                                                        <Lightbulb size={18} className="text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Análise da Lógica</h4>
                                                        <p className="text-sm text-gray-600 leading-relaxed break-words">
                                                            {node.explanation || node.details}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabela de Tags */}
                                            {node.tagsInvolved.length > 0 && (
                                                <div className="p-4">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Cpu size={14} />
                                                        Tags Envolvidos ({node.tagsInvolved.length})
                                                    </h4>

                                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-12">Status</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tag</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Tipo</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-28">Cache</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {node.tagsInvolved.map((tag: TagData, tagIndex: number) => (
                                                                    <tr key={tagIndex} className={`${tag.foundInCache ? 'bg-white' : 'bg-yellow-50/50'} hover:bg-gray-50 transition-colors`}>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <StatusIcon status={tag.status} />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <code className="font-mono font-semibold text-gray-800">{tag.name}</code>
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <TypeBadge dataType={tag.dataType} />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <ValueDisplay tag={tag} />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            {tag.foundInCache ? (
                                                                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                                                                    <CheckCircle2 size={12} />
                                                                                    OK
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
                                                                                    <AlertTriangle size={12} />
                                                                                    N/A
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <Activity size={40} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Nenhuma análise realizada</p>
                            <p className="text-xs text-gray-400 text-center max-w-xs">
                                Escreva código no editor ou selecione um exemplo, depois clique em "Analisar"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Exemplos */}
            {showExamples && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BookOpen size={24} className="text-edp-marine" />
                                <h2 className="text-lg font-bold text-gray-800">Exemplos Python</h2>
                            </div>
                            <button onClick={() => setShowExamples(false)} className="p-2 hover:bg-gray-200 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Categorias */}
                            <div className="w-48 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto">
                                {EXAMPLE_CATEGORIES.map((cat: { id: ExampleCategory; name: string; icon: string; description: string }) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                                            selectedCategory === cat.id 
                                                ? 'bg-edp-marine text-white' 
                                                : 'text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span className="mr-2">{cat.icon}</span>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Lista de Exemplos */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="grid gap-3">
                                    {getExamplesByCategory(selectedCategory).map((example: ExampleCode) => (
                                        <div key={example.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-edp-marine transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{example.title}</h4>
                                                    <p className="text-xs text-gray-500">{example.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                        example.complexity === 'simple' ? 'bg-green-100 text-green-700' :
                                                        example.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {example.complexity === 'simple' ? 'Simples' :
                                                         example.complexity === 'medium' ? 'Médio' : 'Complexo'}
                                                    </span>
                                                </div>
                                            </div>
                                            <pre className="bg-[#1e1e1e] text-[#9cdcfe] p-3 rounded text-xs font-mono overflow-x-auto mb-3">
                                                {example.code}
                                            </pre>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1">
                                                    {example.dataTypes.map((dt: string) => (
                                                        <TypeBadge key={dt} dataType={dt} />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(example.code, example.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                                    >
                                                        {copiedExample === example.id ? <Check size={14} /> : <Copy size={14} />}
                                                        {copiedExample === example.id ? 'Copiado!' : 'Copiar'}
                                                    </button>
                                                    <button
                                                        onClick={() => useExample(example)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-edp-marine rounded hover:bg-[#1a2332]"
                                                    >
                                                        <Play size={14} />
                                                        Usar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Referência */}
            {showReference && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bookmark size={24} className="text-edp-marine" />
                                <h2 className="text-lg font-bold text-gray-800">Referência Python</h2>
                            </div>
                            <button onClick={() => setShowReference(false)} className="p-2 hover:bg-gray-200 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Versão Python */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <FileCode size={18} />
                                    Versão Python
                                </h3>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <div className="font-semibold text-blue-800">Python 3.11</div>
                                    <div className="text-xs text-blue-600">Parser Python otimizado para automação industrial</div>
                                </div>
                            </div>

                            {/* Operadores */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3">Operadores Python</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="font-semibold text-purple-800 mb-1">Booleanos</div>
                                        <code className="text-purple-600">and, or, not</code>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="font-semibold text-blue-800 mb-1">Comparação</div>
                                        <code className="text-blue-600">==, !=, &gt;, &lt;, &gt;=, &lt;=, in, is</code>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-lg">
                                        <div className="font-semibold text-orange-800 mb-1">Aritmética</div>
                                        <code className="text-orange-600">+, -, *, /, //, %, **</code>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="font-semibold text-green-800 mb-1">Atribuição</div>
                                        <code className="text-green-600">=, +=, -=, *=, /=</code>
                                    </div>
                                </div>
                            </div>

                            {/* Estruturas */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3">Estruturas de Controle</h3>
                                <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded-lg">
                                    <div><span className="text-purple-600">if</span> condição<span className="text-purple-600">:</span></div>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;# código</div>
                                    <div><span className="text-purple-600">elif</span> outra_condição<span className="text-purple-600">:</span></div>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;# código</div>
                                    <div><span className="text-purple-600">else</span><span className="text-purple-600">:</span></div>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;# código</div>
                                    <br />
                                    <div><span className="text-purple-600">for</span> i <span className="text-purple-600">in</span> range(10)<span className="text-purple-600">:</span></div>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;# código</div>
                                    <br />
                                    <div><span className="text-purple-600">while</span> condição<span className="text-purple-600">:</span></div>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;# código</div>
                                </div>
                            </div>

                            {/* Tipos de Dados */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3">Tipos de Dados Suportados</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['BOOL', 'INT', 'REAL', 'STRING', 'ARRAY', 'OBJECT', 'DINT', 'WORD', 'DWORD'].map((dt) => (
                                        <TypeBadge key={dt} dataType={dt} />
                                    ))}
                                </div>
                            </div>

                            {/* Tags PLC */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3">Integração com PLC</h3>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <div className="text-sm text-green-800">
                                        <strong>Tags PLC:</strong> Use os nomes EXATOS como estão mapeados no sistema<br />
                                        <strong>Sistema:</strong> Reconhece automaticamente qualquer tag do cache<br />
                                        <strong>Exemplo:</strong> <code className="bg-green-100 px-1 rounded">resultado = tag_sensor and not tag_parada</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};