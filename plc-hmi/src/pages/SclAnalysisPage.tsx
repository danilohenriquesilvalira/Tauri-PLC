import React, { useState } from 'react';
import { Play, Code, MessageSquareMore, Repeat, GitBranch, Terminal, LogOut, Lightbulb, Zap, Activity, Cpu, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// --- TIPOS ---
type TagData = {
    name: string;
    type: 'INPUT' | 'OUTPUT' | 'MEMORY' | 'DB' | 'UNKNOWN';
    dataType: string;
    description?: string;
    currentValue: string | number | boolean; // Valor em tempo real (Simulado)
    requiredValue?: string; // O que a lógica espera (ex: TRUE)
    status: 'OK' | 'NOK' | 'NEUTRAL'; // Se está atendendo a lógica
};

type LogicNode = {
    id: string;
    type: string;
    summary: string;
    details: string;
    children?: LogicNode[];
    rawCode: string;
    tagsInvolved: TagData[]; // Lista de tags encontrados nessa linha
    resultTag?: TagData; // Tag que está sendo escrito
};

export const SclAnalysisPage: React.FC = () => {
    const [sclCode, setSclCode] = useState<string>(
        '%M66.3 := %I1.4 AND %Q3.4 AND %Q3.5 AND ("DB9".DBD40 <= "DB9".DBD84);'
    );
    const [parsedNodes, setParsedNodes] = useState<LogicNode[]>([]);
    const [narrative, setNarrative] = useState<string>("");
    const [isAnalysing, setIsAnalysing] = useState(false);

    // --- ANALISADOR INTEGRADO (Parser + Simulador de Tags) ---
    const analyzeTag = (tagRaw: string): TagData => {
        const cleanTag = tagRaw.replace(/"/g, '').trim();
        let type: TagData['type'] = 'UNKNOWN';
        let dataType = "BOOL";

        if (cleanTag.startsWith('%I')) { type = 'INPUT'; dataType = 'BIT'; }
        else if (cleanTag.startsWith('%Q')) { type = 'OUTPUT'; dataType = 'BIT'; }
        else if (cleanTag.startsWith('%M')) { type = 'MEMORY'; dataType = 'BIT'; }
        else if (cleanTag.startsWith('DB') || cleanTag.includes('.')) {
            type = 'DB';
            dataType = cleanTag.includes('DBD') ? 'REAL' : 'INT';
        }

        // SIMULAÇÃO DE VALORES (Para demo - Futuramente virá do TCP)
        // Randomiza valores para parecer real
        const randomVal = Math.random() > 0.5;
        let val: any = randomVal;

        if (dataType === 'REAL') {
            val = (Math.random() * 100).toFixed(1);
        }

        return {
            name: cleanTag,
            type,
            dataType,
            currentValue: val.toString().toUpperCase(),
            status: 'NEUTRAL' // Será calculado no contexto
        };
    };

    const parseStatement = (stmt: string): LogicNode => {
        const clean = stmt.replace(/\s+/g, ' ').trim();
        const id = Math.random().toString(36).substr(2, 9);
        const tagsInvolved: TagData[] = [];
        let resultTag: TagData | undefined;

        // ASSIGNMENT SIMPLES (:=)
        const assignMatch = clean.match(/(.+?)\s*:=\s*(.+?)(?:\s*;)?$/);
        if (assignMatch) {
            const targetRaw = assignMatch[1];
            const logicRaw = assignMatch[2];

            // Analisa Target
            resultTag = analyzeTag(targetRaw);

            // Analisa Lógica (Extrair Tags)
            // Regex para pegar %I, %Q, %M, "DB..."
            const tagPattern = /(%[IQM]\w+(\.\d+)?|"\w+"\.\w+(\[\w+\])?)/g;
            const matches = logicRaw.match(tagPattern);

            if (matches) {
                matches.forEach(m => {
                    const tagInfo = analyzeTag(m);
                    // Lógica simples de status: Se espera 1 e tá 0, é NOK (Simplificado)
                    const isOk = tagInfo.currentValue === 'TRUE' || parseFloat(tagInfo.currentValue as string) > 0;
                    tagInfo.status = isOk ? 'OK' : 'NOK';

                    if (tagInfo.type !== 'UNKNOWN') tagsInvolved.push(tagInfo);
                });
            }

            // Simular Resultado Final da Lógica
            const allOk = tagsInvolved.every(t => t.status === 'OK');
            resultTag.currentValue = allOk ? 'TRUE' : 'FALSE';
            resultTag.status = allOk ? 'OK' : 'NOK';

            return {
                id, type: 'ASSIGNMENT',
                summary: `Lógica de Ativação: ${resultTag.name}`,
                details: logicRaw,
                rawCode: stmt,
                tagsInvolved,
                resultTag
            };
        }

        // IF BLOCK
        if (clean.startsWith('IF')) {
            return { id, type: 'IF_BLOCK', summary: 'Bloco Condicional', details: clean, rawCode: stmt, tagsInvolved: [], resultTag: undefined };
        }

        // FOR BLOCK
        if (clean.startsWith('FOR')) {
            return { id, type: 'FOR_LOOP', summary: 'Loop de Repetição', details: clean, rawCode: stmt, tagsInvolved: [], resultTag: undefined };
        }

        return { id, type: 'UNKNOWN', summary: 'Desconhecido', details: clean, rawCode: stmt, tagsInvolved: [], resultTag: undefined };
    };

    const splitStatements = (code: string) => {
        const parts = code.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/); // Split por ; ignorando aspas
        return parts.map(p => p.trim()).filter(p => p.length > 0);
    };

    const generateDetailedStory = (node: LogicNode): string => {
        if (node.type === 'ASSIGNMENT' && node.resultTag) {
            const failedTags = node.tagsInvolved.filter(t => t.status === 'NOK');

            let txt = `O resultado **${node.resultTag.name}** está **${node.resultTag.currentValue}**.\n`;

            if (node.resultTag.currentValue === 'FALSE') {
                if (failedTags.length > 0) {
                    txt += `⚠️ **Motivo:** A lógica falhou porque os seguintes tags não atenderam à condição:\n`;
                    failedTags.forEach(t => {
                        txt += `   • **${t.name}** está ${t.currentValue} (Esperado: TRUE/High)\n`;
                    });
                }
            } else {
                txt += `✅ **Sucesso:** Todas as condições foram atendidas (AND).`;
            }
            return txt;
        }
        return "Análise estrutural complexa. Veja detalhes abaixo.";
    };

    const runParser = () => {
        setIsAnalysing(true);
        setTimeout(() => {
            const stmts = splitStatements(sclCode);
            const nodes = stmts.map(parseStatement);
            setParsedNodes(nodes);

            if (nodes.length > 0) {
                setNarrative(generateDetailedStory(nodes[0])); // Pega história da primeira lógica principal
            }
            setIsAnalysing(false);
        }, 600);
    };

    // --- ÍCONES ---
    const TypeBadge = ({ type }: { type: string }) => {
        switch (type) {
            case 'INPUT': return <span className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase font-bold"><Cpu size={10} /> Input</span>;
            case 'OUTPUT': return <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 uppercase font-bold"><Activity size={10} /> Output</span>;
            case 'DB': return <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 uppercase font-bold"><Database size={10} /> DB</span>;
            default: return <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 uppercase font-bold">Tag</span>;
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
                <div className="flex gap-2">
                    <button onClick={runParser} disabled={isAnalysing} className="flex items-center gap-2 px-6 py-2 rounded-md font-medium text-white transition-all shadow-sm bg-edp-marine hover:bg-[#1a2332] active:scale-95">
                        {isAnalysing ? 'Diagnosticando...' : 'Rodar Diagnóstico'}
                        {!isAnalysing && <Play size={16} fill="currentColor" />}
                    </button>
                </div>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Editor */}
                <div className="flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700 shadow-md">
                    <div className="px-4 py-2 bg-[#252526] border-b border-gray-700 flex justify-between">
                        <span className="text-gray-300 text-xs font-mono font-bold">CÓDIGO FONTE</span>
                    </div>
                    <textarea
                        value={sclCode}
                        onChange={(e) => setSclCode(e.target.value)}
                        className="flex-1 w-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
                        spellCheck={false}
                    />
                </div>

                {/* Resultado: Painel de Diagnóstico */}
                <div className="flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md">

                    {parsedNodes.length > 0 ? (
                        <div className="flex-1 overflow-auto bg-gray-50/50 p-6 space-y-6">

                            {/* 1. Explicação Inteligente */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex gap-4">
                                <div className="bg-blue-50 p-3 rounded-full h-fit">
                                    <Lightbulb className="text-blue-600" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">Análise da Lógica</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{narrative}</p>
                                </div>
                            </div>

                            {/* 2. Decomposição Tag a Tag */}
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
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Tipo</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase">Valor Atual</th>
                                                    <th className="px-4 py-2 font-medium text-xs uppercase text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {node.tagsInvolved?.map((tag, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/80">
                                                        <td className="px-4 py-3 font-mono font-medium text-gray-700">{tag.name}</td>
                                                        <td className="px-4 py-3"><TypeBadge type={tag.type} /></td>
                                                        <td className="px-4 py-3 font-mono text-gray-600">
                                                            {tag.dataType === 'REAL' ? <span className="text-blue-600 font-bold">{tag.currentValue}</span> :
                                                                tag.currentValue === 'TRUE' ? <span className="text-green-600 font-bold">TRUE (1)</span> :
                                                                    <span className="text-red-500 font-bold">FALSE (0)</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {tag.status === 'OK' ?
                                                                <CheckCircle2 size={18} className="text-green-500 mx-auto" /> :
                                                                <XCircle size={18} className="text-red-500 mx-auto" />
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Resultado Final no Footer */}
                                        {node.resultTag && (
                                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Resultado Escrito em:</span>
                                                    <span className="font-mono font-bold text-gray-800">{node.resultTag.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Valor Final:</span>
                                                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${node.resultTag.currentValue === 'TRUE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {node.resultTag.currentValue}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <Activity size={48} className="mb-4" />
                            <p className="text-sm font-medium">Aguardando código...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
