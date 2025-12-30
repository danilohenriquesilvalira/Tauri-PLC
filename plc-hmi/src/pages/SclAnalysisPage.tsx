import React, { useState, useEffect } from 'react';
import { Play, Code, Repeat, Terminal, Lightbulb, Zap, Activity, Cpu, Database, CheckCircle2, XCircle, Server, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

// --- TIPOS ---

// Informação completa do tag (vem do backend)
type SclTagInfo = {
    tag_name: string;
    value: string;
    data_type: string;  // "BOOL", "INT", "WORD", "REAL", "DINT", "DWORD"
    variable_path: string;
};

type TagData = {
    name: string;
    type: 'INPUT' | 'OUTPUT' | 'MEMORY' | 'DB' | 'UNKNOWN';
    dataType: string;  // BOOL, INT, WORD, REAL, DINT, DWORD
    description?: string;
    currentValue: string;
    numericValue?: number;
    requiredValue?: string;
    status: 'OK' | 'NOK' | 'NEUTRAL' | 'NOT_FOUND';
    foundInCache: boolean;
};

type LogicNode = {
    id: string;
    type: 'ASSIGNMENT' | 'COMPARISON' | 'BOOLEAN' | 'UNKNOWN';
    summary: string;
    details: string;
    children?: LogicNode[];
    rawCode: string;
    tagsInvolved: TagData[];
    resultTag?: TagData;
};

export const SclAnalysisPage: React.FC = () => {
    const [sclCode, setSclCode] = useState<string>(
        '// Exemplos:\n' +
        '// Alarme := Sensor_1 AND Sensor_2;\n' +
        '// Bomba := Nivel >= 50;\n' +
        '// Aquecedor := Temp_Atual < Temp_Setpoint;\n\n' +
        'SENSOR_0 := Sensor_1 AND Sensor_2;'
    );
    const [parsedNodes, setParsedNodes] = useState<LogicNode[]>([]);
    const [narrative, setNarrative] = useState<string>("");
    const [isAnalysing, setIsAnalysing] = useState(false);

    // Estados para integração TCP
    const [selectedPlc, setSelectedPlc] = useState<string>("");
    const [availablePlcs, setAvailablePlcs] = useState<string[]>([]);
    const [useRealData, setUseRealData] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    // Cache de tags com tipo de dado
    const [tagCache, setTagCache] = useState<Map<string, SclTagInfo>>(new Map());

    // Carregar PLCs conectados
    useEffect(() => {
        loadAvailablePlcs();
    }, []);

    // Buscar tags COM tipo de dado do cache TCP
    const loadTagsFromCache = async (plcIp: string) => {
        try {
            console.log(`🎯 Buscando tags SCL para: ${plcIp}`);

            // Tentar usar o novo comando que retorna tipo de dado
            try {
                const tags = await invoke<SclTagInfo[]>('get_scl_tags', { plcIp });
                console.log(`✅ Tags SCL carregados:`, tags);

                const cache = new Map<string, SclTagInfo>();
                for (const tag of tags) {
                    cache.set(tag.tag_name, tag);
                    // Também adicionar por nome em lowercase para busca case-insensitive
                    cache.set(tag.tag_name.toLowerCase(), tag);
                }
                setTagCache(cache);
                return cache;
            } catch (e) {
                // Fallback: usar comando antigo
                console.log('⚠️ Fallback para get_real_time_tag_values');
                const tagValues = await invoke<{ [key: string]: string }>('get_real_time_tag_values', { plcIp });

                const cache = new Map<string, SclTagInfo>();
                for (const [name, value] of Object.entries(tagValues)) {
                    // Inferir tipo pelo valor
                    let dataType = 'UNKNOWN';
                    if (value === 'TRUE' || value === 'FALSE') {
                        dataType = 'BOOL';
                    } else if (value.includes('.')) {
                        dataType = 'REAL';
                    } else if (/^-?\d+$/.test(value)) {
                        dataType = 'INT';
                    }

                    cache.set(name, {
                        tag_name: name,
                        value,
                        data_type: dataType,
                        variable_path: ''
                    });
                    cache.set(name.toLowerCase(), {
                        tag_name: name,
                        value,
                        data_type: dataType,
                        variable_path: ''
                    });
                }
                setTagCache(cache);
                return cache;
            }
        } catch (error) {
            console.error('❌ Erro ao buscar tags:', error);
            setTagCache(new Map());
            return new Map();
        }
    };

    const loadAvailablePlcs = async () => {
        try {
            console.log('🔍 Buscando PLCs conectados...');
            const plcs = await invoke<string[]>('get_connected_clients');
            console.log('📡 PLCs encontrados:', plcs);
            setAvailablePlcs(plcs);
            if (plcs.length > 0 && !selectedPlc) {
                setSelectedPlc(plcs[0]);
                setUseRealData(true);
                console.log(`✅ PLC selecionado automaticamente: ${plcs[0]}`);
                await loadTagsFromCache(plcs[0]);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar PLCs:', error);
            setUseRealData(false);
        }
    };

    // Função para buscar tag no cache (case-insensitive)
    const findTagInCache = (tagName: string, cache: Map<string, SclTagInfo>): SclTagInfo | null => {
        // Busca exata
        if (cache.has(tagName)) {
            return cache.get(tagName)!;
        }
        // Busca case-insensitive
        if (cache.has(tagName.toLowerCase())) {
            return cache.get(tagName.toLowerCase())!;
        }
        // Busca por similaridade (remover underscores)
        const normalized = tagName.replace(/_/g, '').toLowerCase();
        for (const [key, value] of cache.entries()) {
            if (key.replace(/_/g, '').toLowerCase() === normalized) {
                return value;
            }
        }
        return null;
    };

    // Verifica se é um literal numérico
    const isNumericLiteral = (str: string): boolean => {
        return /^-?\d+(\.\d+)?$/.test(str.trim());
    };

    // Converte string para número
    const toNumeric = (value: string): number | null => {
        if (value === 'TRUE') return 1;
        if (value === 'FALSE') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    };

    // Analisar tag e buscar no cache
    const analyzeTag = (tagName: string, cache: Map<string, SclTagInfo>): TagData => {
        console.log(`🔍 analyzeTag: "${tagName}"`);

        const cachedTag = findTagInCache(tagName, cache);
        const foundInCache = cachedTag !== null;

        let currentValue = 'N/A';
        let dataType = 'UNKNOWN';
        let numericValue: number | undefined;

        if (foundInCache && cachedTag) {
            currentValue = cachedTag.value;
            dataType = cachedTag.data_type;
            const num = toNumeric(currentValue);
            if (num !== null) numericValue = num;
            console.log(`✅ Encontrado: ${tagName} = ${currentValue} (${dataType})`);
        } else {
            console.log(`❌ Tag não encontrado: ${tagName}`);
        }

        // Inferir tipo de entrada/saída pelo nome
        let type: TagData['type'] = 'MEMORY';
        const lowerName = tagName.toLowerCase();
        if (lowerName.includes('sensor') || lowerName.includes('input') || lowerName.startsWith('i_')) {
            type = 'INPUT';
        } else if (lowerName.includes('pump') || lowerName.includes('motor') || lowerName.includes('output') || lowerName.startsWith('q_')) {
            type = 'OUTPUT';
        } else if (lowerName.includes('db')) {
            type = 'DB';
        }

        return {
            name: tagName,
            type,
            dataType,
            currentValue,
            numericValue,
            status: foundInCache ? 'NEUTRAL' : 'NOT_FOUND',
            foundInCache
        };
    };

    // Detectar tipo de operação
    const detectOperationType = (expression: string): 'COMPARISON' | 'BOOLEAN' | 'SIMPLE' => {
        // Comparações (ordem importa: >= e <= antes de > e <)
        if (expression.includes('>=') || expression.includes('<=') ||
            expression.includes('<>') || expression.includes('==') ||
            /[^<>=][><][^<>=]/.test(' ' + expression + ' ') ||
            expression.match(/^[A-Za-z_]\w*\s*[><]\s*/)) {
            return 'COMPARISON';
        }

        // Booleano
        const upper = expression.toUpperCase();
        if (upper.includes(' AND ') || upper.includes(' OR ') || upper.includes('NOT ')) {
            return 'BOOLEAN';
        }

        return 'SIMPLE';
    };

    // Avaliar comparação numérica
    const evaluateComparison = (
        expression: string,
        tags: TagData[],
        cache: Map<string, SclTagInfo>
    ): { result: boolean; explanation: string } => {
        const patterns = [
            { regex: /(.+?)\s*>=\s*(.+)/, op: '>=', fn: (a: number, b: number) => a >= b, desc: 'maior ou igual a' },
            { regex: /(.+?)\s*<=\s*(.+)/, op: '<=', fn: (a: number, b: number) => a <= b, desc: 'menor ou igual a' },
            { regex: /(.+?)\s*<>\s*(.+)/, op: '<>', fn: (a: number, b: number) => a !== b, desc: 'diferente de' },
            { regex: /(.+?)\s*==\s*(.+)/, op: '==', fn: (a: number, b: number) => a === b, desc: 'igual a' },
            { regex: /(.+?)\s*>\s*(.+)/, op: '>', fn: (a: number, b: number) => a > b, desc: 'maior que' },
            { regex: /(.+?)\s*<\s*(.+)/, op: '<', fn: (a: number, b: number) => a < b, desc: 'menor que' },
        ];

        for (const pattern of patterns) {
            const match = expression.match(pattern.regex);
            if (match) {
                const leftExpr = match[1].trim();
                const rightExpr = match[2].trim();

                let leftValue: number;
                let rightValue: number;
                let leftDisplay: string;
                let rightDisplay: string;

                // Processar lado esquerdo
                if (isNumericLiteral(leftExpr)) {
                    leftValue = parseFloat(leftExpr);
                    leftDisplay = leftExpr;
                } else {
                    const leftTag = tags.find(t => t.name === leftExpr);
                    if (leftTag?.foundInCache && leftTag.numericValue !== undefined) {
                        leftValue = leftTag.numericValue;
                        leftDisplay = `${leftTag.name} (${leftTag.currentValue})`;
                    } else {
                        return { result: false, explanation: `❌ Tag não encontrado ou sem valor numérico: ${leftExpr}` };
                    }
                }

                // Processar lado direito
                if (isNumericLiteral(rightExpr)) {
                    rightValue = parseFloat(rightExpr);
                    rightDisplay = rightExpr;
                } else {
                    const rightTag = tags.find(t => t.name === rightExpr);
                    if (rightTag?.foundInCache && rightTag.numericValue !== undefined) {
                        rightValue = rightTag.numericValue;
                        rightDisplay = `${rightTag.name} (${rightTag.currentValue})`;
                    } else {
                        return { result: false, explanation: `❌ Tag não encontrado ou sem valor numérico: ${rightExpr}` };
                    }
                }

                const result = pattern.fn(leftValue, rightValue);
                const explanation = `📊 **Comparação:** ${leftDisplay} ${pattern.desc} ${rightDisplay}\n` +
                    `   ${leftValue} ${pattern.op} ${rightValue} = ${result ? '✅ VERDADEIRO' : '❌ FALSO'}`;

                return { result, explanation };
            }
        }

        return { result: false, explanation: '❌ Padrão de comparação não reconhecido' };
    };

    // Avaliar lógica booleana
    const evaluateBoolean = (expression: string, tags: TagData[]): { result: boolean; explanation: string } => {
        let jsExpr = expression;
        const substitutions: string[] = [];

        for (const tag of tags) {
            if (tag.foundInCache) {
                const boolValue = tag.currentValue === 'TRUE' || tag.currentValue === '1' ||
                    (tag.numericValue !== undefined && tag.numericValue !== 0);
                jsExpr = jsExpr.replace(new RegExp(`\\b${tag.name}\\b`, 'gi'), boolValue ? 'true' : 'false');
                tag.status = boolValue ? 'OK' : 'NOK';
                tag.requiredValue = 'TRUE';
                substitutions.push(`${tag.name} = ${boolValue ? 'TRUE' : 'FALSE'}`);
            } else {
                jsExpr = jsExpr.replace(new RegExp(`\\b${tag.name}\\b`, 'gi'), 'false');
                substitutions.push(`${tag.name} = N/A (FALSE)`);
            }
        }

        jsExpr = jsExpr
            .replace(/\bAND\b/gi, '&&')
            .replace(/\bOR\b/gi, '||')
            .replace(/\bNOT\b/gi, '!')
            .replace(/\bTRUE\b/gi, 'true')
            .replace(/\bFALSE\b/gi, 'false');

        try {
            const result = eval(jsExpr);
            const explanation = `🔗 **Lógica Booleana:**\n` +
                substitutions.map(s => `   • ${s}`).join('\n') +
                `\n   Resultado: ${result ? '✅ TRUE' : '❌ FALSE'}`;
            return { result: !!result, explanation };
        } catch (e) {
            return { result: false, explanation: `❌ Erro ao avaliar expressão: ${e}` };
        }
    };

    // Parser principal
    const parseStatement = (stmt: string, cache: Map<string, SclTagInfo>): LogicNode => {
        const clean = stmt.replace(/\s+/g, ' ').trim();
        const id = Math.random().toString(36).substr(2, 9);
        const tagsInvolved: TagData[] = [];
        let resultTag: TagData | undefined;

        // Ignorar comentários
        if (clean.startsWith('//')) {
            return { id, type: 'UNKNOWN', summary: 'Comentário', details: clean, rawCode: stmt, tagsInvolved: [] };
        }

        console.log(`🔍 PARSEANDO: "${clean}"`);

        // ASSIGNMENT: target := expression
        const assignMatch = clean.match(/^(.+?)\s*:=\s*(.+?)(?:\s*;)?$/);
        if (assignMatch) {
            const targetName = assignMatch[1].trim();
            const expression = assignMatch[2].trim();

            console.log(`🎯 TARGET: "${targetName}"`);
            console.log(`🎯 EXPRESSÃO: "${expression}"`);

            // Analisar tag de resultado
            resultTag = analyzeTag(targetName, cache);

            // Extrair identificadores da expressão
            const identifiers = expression.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
            const reservedWords = ['AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'IF', 'THEN', 'ELSE'];

            for (const ident of identifiers) {
                if (!reservedWords.includes(ident.toUpperCase())) {
                    const tag = analyzeTag(ident, cache);
                    if (!tagsInvolved.find(t => t.name === tag.name)) {
                        tagsInvolved.push(tag);
                    }
                }
            }

            console.log(`📊 TAGS ENVOLVIDOS: ${tagsInvolved.length}`);

            // Detectar tipo de operação
            const opType = detectOperationType(expression);
            let explanation = '';
            let evalResult: boolean = false;

            // Tags não encontrados
            const notFoundTags = tagsInvolved.filter(t => !t.foundInCache);

            if (opType === 'COMPARISON') {
                const { result, explanation: exp } = evaluateComparison(expression, tagsInvolved, cache);
                evalResult = result;
                explanation = exp;

                // Comparação retorna BOOL
                if (resultTag) {
                    resultTag.currentValue = result ? 'TRUE' : 'FALSE';
                    resultTag.dataType = 'BOOL';
                    resultTag.status = result ? 'OK' : 'NOK';
                }
            } else if (opType === 'BOOLEAN') {
                const { result, explanation: exp } = evaluateBoolean(expression, tagsInvolved);
                evalResult = result;
                explanation = exp;

                if (resultTag) {
                    resultTag.currentValue = result ? 'TRUE' : 'FALSE';
                    resultTag.dataType = 'BOOL';
                    resultTag.status = result ? 'OK' : 'NOK';
                }
            } else {
                // Atribuição simples
                if (tagsInvolved.length === 1) {
                    const sourceTag = tagsInvolved[0];
                    explanation = `📝 **Atribuição:** ${targetName} recebe valor de ${sourceTag.name}`;
                    if (resultTag && sourceTag.foundInCache) {
                        resultTag.currentValue = sourceTag.currentValue;
                        resultTag.dataType = sourceTag.dataType;
                        resultTag.status = 'OK';
                    }
                } else {
                    explanation = `📝 **Atribuição:** ${targetName} := ${expression}`;
                }
            }

            // Adicionar aviso sobre tags não encontrados
            if (notFoundTags.length > 0) {
                explanation += `\n\n⚠️ **Tags não encontrados no cache:**\n`;
                explanation += notFoundTags.map(t => `   • ${t.name}`).join('\n');
            }

            return {
                id,
                type: opType === 'COMPARISON' ? 'COMPARISON' : opType === 'BOOLEAN' ? 'BOOLEAN' : 'ASSIGNMENT',
                summary: `${targetName} := ${expression}`,
                details: explanation,
                rawCode: stmt,
                tagsInvolved,
                resultTag
            };
        }

        return { id, type: 'UNKNOWN', summary: 'Desconhecido', details: clean, rawCode: stmt, tagsInvolved: [] };
    };

    const splitStatements = (code: string) => {
        return code.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('//'));
    };

    const runParser = async () => {
        setIsAnalysing(true);
        setLoading(true);

        try {
            // 1. Buscar dados do cache
            let cache = tagCache;
            if (selectedPlc) {
                console.log(`🔄 Atualizando dados do PLC ${selectedPlc}...`);
                cache = await loadTagsFromCache(selectedPlc);
            }

            // 2. Processar código
            const stmts = splitStatements(sclCode);
            const nodes: LogicNode[] = [];

            for (const stmt of stmts) {
                const node = parseStatement(stmt, cache);
                if (node.type !== 'UNKNOWN') {
                    nodes.push(node);
                }
            }

            setParsedNodes(nodes);

            // 3. Gerar narrativa
            if (nodes.length > 0) {
                setNarrative(nodes[0].details);
            }
        } catch (error) {
            console.error('Erro ao processar código SCL:', error);
        } finally {
            setIsAnalysing(false);
            setLoading(false);
        }
    };

    // --- COMPONENTES DE UI ---
    const TypeBadge = ({ dataType }: { dataType: string }) => {
        switch (dataType) {
            case 'BOOL': return <span className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold"><Zap size={10} /> BOOL</span>;
            case 'INT': return <span className="flex items-center gap-1 text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200 uppercase font-bold"><Terminal size={10} /> INT</span>;
            case 'WORD': return <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 uppercase font-bold"><Database size={10} /> WORD</span>;
            case 'DWORD': return <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 uppercase font-bold"><Database size={10} /> DWORD</span>;
            case 'REAL': return <span className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border border-orange-200 uppercase font-bold"><Activity size={10} /> REAL</span>;
            case 'DINT': return <span className="flex items-center gap-1 text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 uppercase font-bold"><Terminal size={10} /> DINT</span>;
            default: return <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 uppercase font-bold"><Database size={10} /> {dataType || '?'}</span>;
        }
    };

    const ValueDisplay = ({ tag }: { tag: TagData }) => {
        if (!tag.foundInCache) {
            return (
                <span className="text-yellow-600 font-bold flex items-center gap-1">
                    <AlertTriangle size={14} />
                    NÃO ENCONTRADO
                </span>
            );
        }

        if (tag.dataType === 'BOOL') {
            return tag.currentValue === 'TRUE' ?
                <span className="text-green-600 font-bold">TRUE (1)</span> :
                <span className="text-red-500 font-bold">FALSE (0)</span>;
        }

        if (tag.dataType === 'REAL') {
            return <span className="text-orange-600 font-bold">{tag.currentValue}</span>;
        }

        if (tag.dataType === 'INT' || tag.dataType === 'DINT') {
            return <span className="text-cyan-600 font-bold">{tag.currentValue}</span>;
        }

        if (tag.dataType === 'WORD' || tag.dataType === 'DWORD') {
            return <span className="text-blue-600 font-bold">{tag.currentValue}</span>;
        }

        return <span className="text-gray-600 font-bold">{tag.currentValue}</span>;
    };

    const StatusIcon = ({ status }: { status: TagData['status'] }) => {
        switch (status) {
            case 'OK': return <CheckCircle2 size={18} className="text-green-500 mx-auto" />;
            case 'NOK': return <XCircle size={18} className="text-red-500 mx-auto" />;
            case 'NOT_FOUND': return <AlertTriangle size={18} className="text-yellow-500 mx-auto" />;
            default: return <div className="w-4 h-4 rounded-full bg-gray-300 mx-auto" />;
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                    <Code className="text-edp-marine" size={24} />
                    <span className="font-bold text-gray-700 text-lg">Diagnóstico de Lógica SCL</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Server size={16} className="text-gray-500" />
                        <select
                            value={selectedPlc}
                            onChange={(e) => {
                                setSelectedPlc(e.target.value);
                                setUseRealData(e.target.value !== "");
                                if (e.target.value) {
                                    loadTagsFromCache(e.target.value);
                                }
                            }}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-edp-marine/20"
                        >
                            <option value="">Selecione um PLC</option>
                            {availablePlcs.map((plc) => (
                                <option key={plc} value={plc}>PLC: {plc}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${useRealData ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-xs font-medium text-gray-600">
                            {useRealData ? 'TCP Real' : 'Aguardando PLC'}
                        </span>
                    </div>

                    <button
                        onClick={loadAvailablePlcs}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-edp-marine hover:bg-gray-100 rounded-md"
                        title="Atualizar PLCs"
                    >
                        <Repeat size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={runParser}
                        disabled={isAnalysing || loading}
                        className="flex items-center gap-2 px-6 py-2 rounded-md font-medium text-white bg-edp-marine hover:bg-[#1a2332] disabled:opacity-50"
                    >
                        {isAnalysing ? 'Analisando...' : 'Analisar'}
                        {!isAnalysing && <Play size={16} fill="currentColor" />}
                    </button>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Editor */}
                <div className="flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700">
                    <div className="px-4 py-2 bg-[#252526] border-b border-gray-700">
                        <span className="text-gray-300 text-xs font-mono font-bold">CÓDIGO SCL</span>
                    </div>
                    <textarea
                        value={sclCode}
                        onChange={(e) => setSclCode(e.target.value)}
                        className="flex-1 w-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-sm p-4 resize-none focus:outline-none"
                        spellCheck={false}
                    />
                </div>

                {/* Resultado */}
                <div className="flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200">
                    {parsedNodes.length > 0 ? (
                        <div className="flex-1 overflow-auto bg-gray-50/50 p-6 space-y-6">
                            {/* Status */}
                            <div className={`p-3 rounded-lg border-l-4 ${useRealData ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${useRealData ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    <span className="text-xs font-bold text-gray-700">
                                        {useRealData ? `🔗 Conectado ao PLC ${selectedPlc}` : '⚠️ Nenhum PLC selecionado'}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {tagCache.size / 2} tags no cache
                                    </span>
                                </div>
                            </div>

                            {/* Explicação */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex gap-4">
                                <div className="bg-blue-50 p-3 rounded-full h-fit">
                                    <Lightbulb className="text-blue-600" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">Análise da Lógica</h4>
                                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                                        {narrative}
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Tags */}
                            {parsedNodes.map((node, i) => (
                                <div key={i} className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <div className="h-px bg-gray-300 w-8"></div>
                                        Tabela de Tags Envolvidos
                                        <div className="h-px bg-gray-300 flex-1"></div>
                                    </h4>

                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-500 text-left">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Tag</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Tipo Dado</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Valor Atual</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Esperado</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {node.tagsInvolved?.map((tag, idx) => (
                                                    <tr key={idx} className={`hover:bg-gray-50/80 ${!tag.foundInCache ? 'bg-yellow-50' : ''}`}>
                                                        <td className="px-4 py-3 font-mono font-medium text-gray-700">{tag.name}</td>
                                                        <td className="px-4 py-3"><TypeBadge dataType={tag.dataType} /></td>
                                                        <td className="px-4 py-3 font-mono"><ValueDisplay tag={tag} /></td>
                                                        <td className="px-4 py-3 font-mono text-gray-400">{tag.requiredValue || '-'}</td>
                                                        <td className="px-4 py-3"><StatusIcon status={tag.status} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Resultado Final */}
                                        {node.resultTag && (
                                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Resultado:</span>
                                                    <span className="font-mono font-bold text-gray-800">{node.resultTag.name}</span>
                                                    <TypeBadge dataType={node.resultTag.dataType} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Valor:</span>
                                                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${node.resultTag.currentValue === 'TRUE' ? 'bg-green-100 text-green-700' :
                                                            node.resultTag.currentValue === 'FALSE' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {node.resultTag.currentValue}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Tags Disponíveis */}
                            {tagCache.size > 0 && (
                                <div className="bg-gray-100 rounded-lg p-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                        Tags Disponíveis (clique para usar)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(tagCache.entries())
                                            .filter(([key]) => !key.includes(key.toLowerCase()) || key === key.toLowerCase())
                                            .slice(0, 50) // Limitar a 50 tags
                                            .map(([_, tag]) => (
                                                <button
                                                    key={tag.tag_name}
                                                    onClick={() => setSclCode(prev => prev + ' ' + tag.tag_name)}
                                                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono hover:bg-blue-50 hover:border-blue-300"
                                                    title={`${tag.data_type}: ${tag.value}`}
                                                >
                                                    {tag.tag_name}
                                                    <span className={`ml-1 ${tag.data_type === 'BOOL' ? (tag.value === 'TRUE' ? 'text-green-600' : 'text-red-500') :
                                                            tag.data_type === 'REAL' ? 'text-orange-600' :
                                                                'text-blue-600'
                                                        }`}>
                                                        ({tag.value})
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Activity size={48} className="mb-4 opacity-50" />
                            <p className="text-sm font-medium">Clique em "Analisar" para processar o código</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};