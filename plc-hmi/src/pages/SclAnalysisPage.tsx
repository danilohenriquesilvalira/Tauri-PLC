import React, { useState, useEffect, useMemo } from 'react';
import { 
    Play, Code, Terminal, Activity, Cpu, 
    CheckCircle2, XCircle, Server, AlertTriangle, Clock, 
    RefreshCw, Eye, Hash, Binary, Layers, BookOpen, 
    X, FileCode, Bookmark, Copy, Check
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

// Importar do parser SCL
import { 
    SclParser,
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
    const [sclCode, setSclCode] = useState<string>(
        '// Exemplo de lógica SCL\nMotor := Sensor_1 AND NOT Falha;'
    );
    const [parsedNodes, setParsedNodes] = useState<LogicNode[]>([]);
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

    // Parser SCL instance
    const parser = useMemo(() => new SclParser(), []);

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
            if (selectedPlc) {
                const cache = await loadTagsFromCache(selectedPlc);
                parser.setTagCache(cache);
            }

            const result = parser.parse(sclCode);
            setParsedNodes(result.nodes);
            setParseErrors(result.errors);

        } catch (error) {
            console.error('Erro ao processar código:', error);
        } finally {
            setIsAnalysing(false);
            setLoading(false);
        }
    };

    const useExample = (example: ExampleCode) => {
        setSclCode(example.code);
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
        return (
            <span className="text-xs font-mono font-medium text-edp-marine bg-edp-neutral-lighter px-2 py-0.5 rounded">
                {dataType || '?'}
            </span>
        );
    };

    const ValueDisplay = ({ tag }: { tag: TagData }) => {
        if (!tag.foundInCache) {
            return <span className="text-edp-neutral-medium italic">N/A</span>;
        }

        if (tag.dataType === 'BOOL') {
            const isTrue = tag.currentValue === 'TRUE' || tag.currentValue === '1';
            return (
                <span className={`font-bold ${isTrue ? 'text-green-600' : 'text-edp-semantic-red'}`}>
                    {isTrue ? 'TRUE' : 'FALSE'}
                </span>
            );
        }

        return <span className="font-mono font-medium text-edp-marine">{tag.currentValue}</span>;
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-edp-neutral-lighter">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-edp-marine rounded-lg">
                        <Code className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="font-bold text-edp-marine text-lg">Análise SCL</h1>
                        <p className="text-xs text-edp-neutral-medium">Parser SCL Siemens com integração PLC</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Badge SCL */}
                    <div className="flex items-center gap-2 bg-edp-marine/5 px-3 py-2 rounded-lg border border-edp-marine/20">
                        <FileCode size={16} className="text-edp-marine" />
                        <span className="text-sm font-medium text-edp-marine">SCL Siemens</span>
                    </div>

                    {/* Botão Exemplos */}
                    <button
                        onClick={() => setShowExamples(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-edp-slate bg-white hover:bg-edp-neutral-lighter rounded-lg border border-edp-neutral-lighter transition-colors"
                    >
                        <BookOpen size={16} />
                        Exemplos
                    </button>

                    {/* Botão Referência */}
                    <button
                        onClick={() => setShowReference(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-edp-slate bg-white hover:bg-edp-neutral-lighter rounded-lg border border-edp-neutral-lighter transition-colors"
                    >
                        <Bookmark size={16} />
                        Guia
                    </button>

                    <div className="h-8 w-px bg-edp-neutral-lighter" />

                    {/* Seletor de PLC */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-edp-neutral-lighter">
                        <Server size={16} className="text-edp-slate" />
                        <select
                            value={selectedPlc}
                            onChange={(e) => {
                                setSelectedPlc(e.target.value);
                                setUseRealData(e.target.value !== "");
                                if (e.target.value) loadTagsFromCache(e.target.value);
                            }}
                            className="bg-transparent text-sm font-medium text-edp-marine focus:outline-none cursor-pointer"
                        >
                            <option value="">Selecione PLC</option>
                            {availablePlcs.map((plc) => (
                                <option key={plc} value={plc}>{plc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        useRealData 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-edp-semantic-light-red border-edp-semantic-red/20'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            useRealData ? 'bg-green-500 animate-pulse' : 'bg-edp-semantic-yellow'
                        }`} />
                        <span className={`text-xs font-semibold ${
                            useRealData ? 'text-green-700' : 'text-edp-semantic-red'
                        }`}>
                            {useRealData ? 'Online' : 'Offline'}
                        </span>
                        {tagCache.size > 0 && (
                            <span className="text-xs text-edp-neutral-medium">
                                ({Math.floor(tagCache.size / 2)} tags)
                            </span>
                        )}
                    </div>

                    {/* Atualizar */}
                    <button
                        onClick={loadAvailablePlcs}
                        disabled={loading}
                        className="p-2 text-edp-slate hover:text-edp-marine hover:bg-edp-neutral-lighter rounded-lg transition-colors"
                        title="Atualizar PLCs"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Botão Analisar */}
                    <button
                        onClick={runParser}
                        disabled={isAnalysing || loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white bg-edp-marine hover:bg-edp-marine-100 disabled:opacity-50 transition-colors"
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
                <div className="flex flex-col bg-edp-marine rounded-xl overflow-hidden shadow-lg">
                    <div className="px-4 py-3 bg-edp-marine-100 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={16} className="text-white/70" />
                            <span className="text-white/90 text-sm font-semibold">Código SCL</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-white/50 text-xs">{sclCode.split('\n').length} linhas</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">SCL</span>
                        </div>
                    </div>
                    <textarea
                        value={sclCode}
                        onChange={(e) => setSclCode(e.target.value)}
                        className="flex-1 w-full bg-edp-marine text-white/90 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed placeholder-white/30"
                        spellCheck={false}
                        placeholder="// Digite seu código SCL aqui..."
                    />
                </div>

                {/* Painel de Resultado */}
                <div className="flex flex-col bg-white rounded-xl overflow-hidden border border-edp-neutral-lighter shadow-sm">
                    <div className="px-4 py-3 bg-edp-neutral-white-wash border-b border-edp-neutral-lighter flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-edp-slate" />
                            <span className="text-edp-marine text-sm font-semibold">Resultado da Análise</span>
                        </div>
                        {lastUpdate && (
                            <div className="flex items-center gap-1 text-xs text-edp-neutral-medium">
                                <Clock size={12} />
                                {lastUpdate.toLocaleTimeString('pt-BR')}
                            </div>
                        )}
                    </div>

                    {/* Erros */}
                    {parseErrors.length > 0 && (
                        <div className="p-4 border-b border-edp-neutral-lighter bg-edp-semantic-light-red">
                            <h4 className="text-sm font-semibold text-edp-semantic-red mb-2 flex items-center gap-2">
                                <XCircle size={16} />
                                Erros de Sintaxe
                            </h4>
                            <div className="space-y-1">
                                {parseErrors.map((error, i) => (
                                    <div key={i} className="text-sm text-edp-semantic-red">
                                        Linha {error.line}: {error.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Conteúdo */}
                    {parsedNodes.length > 0 ? (
                        <div className="flex-1 overflow-auto p-4">
                            {parsedNodes.map((node) => (
                                <div key={node.id} className="space-y-4">
                                    
                                    {/* Resultado Principal */}
                                    {node.resultTag && (
                                        <div className={`p-4 rounded-lg border-2 ${
                                            node.resultTag.currentValue === 'true' || node.resultTag.currentValue === 'TRUE'
                                                ? 'bg-green-50 border-green-300'
                                                : 'bg-red-50 border-red-300'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-edp-marine">
                                                    {node.resultTag.name}
                                                </span>
                                                <span className={`text-lg font-bold ${
                                                    node.resultTag.currentValue === 'true' || node.resultTag.currentValue === 'TRUE'
                                                        ? 'text-green-600'
                                                        : 'text-edp-semantic-red'
                                                }`}>
                                                    {node.resultTag.currentValue === 'true' || node.resultTag.currentValue === 'TRUE' 
                                                        ? 'TRUE' 
                                                        : 'FALSE'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Código Original */}
                                    <div className="bg-edp-marine/5 rounded-lg p-3 border border-edp-marine/10">
                                        <div className="text-xs text-edp-neutral-medium mb-1 uppercase tracking-wide">
                                            Código
                                        </div>
                                        <code className="text-sm font-mono text-edp-marine">
                                            {node.summary}
                                        </code>
                                    </div>

                                    {/* Explicação */}
                                    <div className="bg-white rounded-lg border border-edp-neutral-lighter">
                                        <div className="px-4 py-2 border-b border-edp-neutral-lighter bg-edp-neutral-white-wash">
                                            <span className="text-sm font-semibold text-edp-marine">
                                                Análise da Lógica
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <pre className="text-sm text-edp-slate leading-relaxed whitespace-pre-wrap font-sans">
                                                {node.explanation}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Tags Envolvidas */}
                                    {node.tagsInvolved.length > 0 && (
                                        <div className="bg-white rounded-lg border border-edp-neutral-lighter">
                                            <div className="px-4 py-2 border-b border-edp-neutral-lighter bg-edp-neutral-white-wash flex items-center gap-2">
                                                <Cpu size={14} className="text-edp-slate" />
                                                <span className="text-sm font-semibold text-edp-marine">
                                                    Tags do PLC ({node.tagsInvolved.length})
                                                </span>
                                            </div>
                                            <div className="divide-y divide-edp-neutral-lighter">
                                                {node.tagsInvolved.map((tag: TagData, idx: number) => (
                                                    <div key={idx} className="px-4 py-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {tag.foundInCache ? (
                                                                <CheckCircle2 size={16} className="text-green-500" />
                                                            ) : (
                                                                <AlertTriangle size={16} className="text-edp-semantic-yellow" />
                                                            )}
                                                            <code className="font-mono font-medium text-edp-marine">
                                                                {tag.name}
                                                            </code>
                                                            <TypeBadge dataType={tag.dataType} />
                                                        </div>
                                                        <ValueDisplay tag={tag} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-edp-neutral-medium p-8">
                            <Activity size={40} className="text-edp-neutral-lighter mb-4" />
                            <p className="text-sm font-medium text-edp-slate mb-1">Nenhuma análise realizada</p>
                            <p className="text-xs text-edp-neutral-medium text-center max-w-xs">
                                Escreva código SCL no editor e clique em "Analisar"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Exemplos */}
            {showExamples && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-edp-neutral-white-wash border-b border-edp-neutral-lighter flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BookOpen size={24} className="text-edp-marine" />
                                <h2 className="text-lg font-bold text-edp-marine">Exemplos SCL</h2>
                            </div>
                            <button onClick={() => setShowExamples(false)} className="p-2 hover:bg-edp-neutral-lighter rounded-lg text-edp-slate">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            <div className="w-48 bg-edp-neutral-white-wash border-r border-edp-neutral-lighter p-3 overflow-y-auto">
                                {EXAMPLE_CATEGORIES.map((cat: { id: ExampleCategory; name: string; icon: string; description: string }) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                                            selectedCategory === cat.id 
                                                ? 'bg-edp-marine text-white' 
                                                : 'text-edp-slate hover:bg-edp-neutral-lighter'
                                        }`}
                                    >
                                        <span className="mr-2">{cat.icon}</span>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="grid gap-3">
                                    {getExamplesByCategory(selectedCategory).map((example: ExampleCode) => (
                                        <div key={example.id} className="bg-edp-neutral-white-wash rounded-lg border border-edp-neutral-lighter p-4 hover:border-edp-marine transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-edp-marine">{example.title}</h4>
                                                    <p className="text-xs text-edp-neutral-medium">{example.description}</p>
                                                </div>
                                            </div>
                                            <pre className="bg-edp-marine text-white/90 p-3 rounded text-xs font-mono overflow-x-auto mb-3">
                                                {example.code}
                                            </pre>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(example.code, example.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-edp-slate bg-white border border-edp-neutral-lighter rounded hover:bg-edp-neutral-lighter"
                                                >
                                                    {copiedExample === example.id ? <Check size={14} /> : <Copy size={14} />}
                                                    {copiedExample === example.id ? 'Copiado!' : 'Copiar'}
                                                </button>
                                                <button
                                                    onClick={() => useExample(example)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-edp-marine rounded hover:bg-edp-marine-100"
                                                >
                                                    <Play size={14} />
                                                    Usar
                                                </button>
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
                        <div className="px-6 py-4 bg-edp-neutral-white-wash border-b border-edp-neutral-lighter flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bookmark size={24} className="text-edp-marine" />
                                <h2 className="text-lg font-bold text-edp-marine">Guia SCL Siemens</h2>
                            </div>
                            <button onClick={() => setShowReference(false)} className="p-2 hover:bg-edp-neutral-lighter rounded-lg text-edp-slate">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Operadores */}
                            <div>
                                <h3 className="font-bold text-edp-marine mb-3">Operadores SCL</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Lógicos</div>
                                        <code className="text-edp-slate">AND, OR, XOR, NOT</code>
                                    </div>
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Comparação</div>
                                        <code className="text-edp-slate">=, &lt;&gt;, &gt;, &lt;, &gt;=, &lt;=</code>
                                    </div>
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Aritmética</div>
                                        <code className="text-edp-slate">+, -, *, /, MOD</code>
                                    </div>
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Atribuição</div>
                                        <code className="text-edp-slate">:=</code>
                                    </div>
                                </div>
                            </div>

                            {/* Estruturas */}
                            <div>
                                <h3 className="font-bold text-edp-marine mb-3">Estruturas de Controle</h3>
                                <div className="bg-edp-marine rounded-lg p-4 text-sm font-mono text-white/90 space-y-1">
                                    <div><span className="text-edp-semantic-yellow">IF</span> condição <span className="text-edp-semantic-yellow">THEN</span></div>
                                    <div className="pl-4 text-white/60">// código</div>
                                    <div><span className="text-edp-semantic-yellow">ELSIF</span> condição <span className="text-edp-semantic-yellow">THEN</span></div>
                                    <div className="pl-4 text-white/60">// código</div>
                                    <div><span className="text-edp-semantic-yellow">ELSE</span></div>
                                    <div className="pl-4 text-white/60">// código</div>
                                    <div><span className="text-edp-semantic-yellow">END_IF;</span></div>
                                </div>
                            </div>

                            {/* Tipos */}
                            <div>
                                <h3 className="font-bold text-edp-marine mb-3">Tipos de Dados</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['BOOL', 'INT', 'DINT', 'REAL', 'WORD', 'DWORD', 'BYTE', 'STRING', 'TIME'].map((dt) => (
                                        <TypeBadge key={dt} dataType={dt} />
                                    ))}
                                </div>
                            </div>

                            {/* Timers/Counters */}
                            <div>
                                <h3 className="font-bold text-edp-marine mb-3">Timers e Counters</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Timers</div>
                                        <code className="text-edp-slate">TON, TOF, TP, TONR</code>
                                    </div>
                                    <div className="bg-edp-neutral-white-wash p-3 rounded-lg border border-edp-neutral-lighter">
                                        <div className="font-semibold text-edp-marine mb-1">Counters</div>
                                        <code className="text-edp-slate">CTU, CTD, CTUD</code>
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