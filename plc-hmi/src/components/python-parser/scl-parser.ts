// ============================================================================
// SCL PARSER - PARSER INTELIGENTE PARA SIEMENS SCL (CORRIGIDO)
// ============================================================================

import type { 
    ParseResult, 
    LogicNode, 
    TagData, 
    PlcTagInfo, 
    PythonNodeType,
    ParseError, 
    ParseWarning, 
    ParseStatistics,
    ParserConfig,
    ExecutionContext
} from './types';

export type SclNodeType = 
    | 'ASSIGNMENT'
    | 'IF_STATEMENT'
    | 'ELSIF_STATEMENT'
    | 'ELSE_STATEMENT'
    | 'CASE_STATEMENT'
    | 'FOR_LOOP'
    | 'WHILE_LOOP'
    | 'REPEAT_LOOP'
    | 'FUNCTION_BLOCK'
    | 'FUNCTION'
    | 'REGION'
    | 'COMPARISON'
    | 'ARITHMETIC'
    | 'LOGICAL'
    | 'FUNCTION_CALL'
    | 'TIMER'
    | 'COUNTER'
    | 'EXPRESSION';

// ============================================================================
// NOVO: Interface para variáveis locais em execução
// ============================================================================
interface LocalVariable {
    name: string;
    value: any;
    dataType: string;
    source: 'cache' | 'local';
}

// ============================================================================
// NOVO: Interface para resultado de execução
// ============================================================================
interface ExecutionResult {
    variable: string;
    value: any;
    dataType: string;
    expression: string;
}

export class SclParser {
    private tagCache: Map<string, PlcTagInfo> = new Map();
    private config: ParserConfig;
    private context: ExecutionContext;
    
    // NOVO: Mapa de variáveis locais para manter contexto durante execução
    private localVariables: Map<string, LocalVariable> = new Map();
    
    // NOVO: Lista de resultados de execução
    private executionResults: ExecutionResult[] = [];
    
    // NOVO: Lista de warnings durante execução
    private executionWarnings: string[] = [];
    
    // NOVO: Lista de passos de execução para explicação
    private executionSteps: string[] = [];

    private readonly SCL_KEYWORDS = new Set([
        'IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF',
        'CASE', 'OF', 'END_CASE',
        'FOR', 'TO', 'BY', 'DO', 'END_FOR',
        'WHILE', 'END_WHILE',
        'REPEAT', 'UNTIL', 'END_REPEAT',
        'EXIT', 'CONTINUE', 'RETURN', 'GOTO',
        'FUNCTION', 'FUNCTION_BLOCK', 'END_FUNCTION', 'END_FUNCTION_BLOCK',
        'PROGRAM', 'END_PROGRAM',
        'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_TEMP', 'VAR_STATIC', 'END_VAR',
        'CONST', 'END_CONST', 'TYPE', 'END_TYPE', 'STRUCT', 'END_STRUCT',
        'REGION', 'END_REGION',
        'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD',
        'SINT', 'INT', 'DINT', 'LINT', 'USINT', 'UINT', 'UDINT', 'ULINT',
        'REAL', 'LREAL', 'TIME', 'DATE', 'TIME_OF_DAY', 'TOD', 'DATE_AND_TIME', 'DT',
        'STRING', 'WSTRING', 'CHAR', 'WCHAR', 'ARRAY', 'POINTER', 'REF_TO',
        'AND', 'OR', 'XOR', 'NOT', 'TRUE', 'FALSE', 'NULL', 'MOD',
        'ABS', 'SQR', 'SQRT', 'LN', 'LOG', 'EXP', 'SIN', 'COS', 'TAN',
        'ROUND', 'TRUNC', 'CEIL', 'FLOOR', 'MAX', 'MIN', 'LIMIT', 'SEL', 'MUX',
        'SHL', 'SHR', 'ROL', 'ROR', 'LEN', 'LEFT', 'RIGHT', 'MID', 'CONCAT',
        'TON', 'TOF', 'TP', 'TONR', 'CTU', 'CTD', 'CTUD', 'R_TRIG', 'F_TRIG'
    ]);

    constructor(config?: Partial<ParserConfig>) {
        this.config = {
            enableRealTimeExecution: true,
            maxExecutionTime: 5000,
            enableTypeChecking: true,
            enableBestPracticeWarnings: false,
            pythonVersion: '3.11',
            allowedModules: [],
            restrictedFunctions: [],
            ...config
        };

        this.context = {
            variables: new Map(),
            functions: new Map(),
            imports: new Set(),
            globals: new Map(),
            plcTags: new Map()
        };
    }

    setTagCache(cache: Map<string, PlcTagInfo>): void {
        this.tagCache = cache;
        this.context.plcTags = cache;
    }

    getConfig(): ParserConfig {
        return this.config;
    }

    parse(code: string): ParseResult {
        const lines = code.split('\n');
        const errors: ParseError[] = [];
        const warnings: ParseWarning[] = [];

        this.resetContext();
        
        // NOVO: Resetar estado de execução
        this.resetExecution();
        
        // NOVO: Carregar variáveis do cache
        this.loadCacheVariables();

        // Extrair tags (suporta com e sem aspas)
        const allTagsInCode = this.extractAllTagsFromCode(code);
        
        // NOVO: Executar código completo ao invés de só analisar
        this.executeFullCode(code);
        
        // NOVO: Construir explicação baseada na execução
        const fullExplanation = this.buildExecutionExplanation();
        
        // Determinar resultado final
        const lastResult = this.executionResults[this.executionResults.length - 1];
        
        const node: LogicNode = {
            id: 'scl_logic_analysis',
            type: this.detectLogicType(code),
            summary: this.generateLogicSummary(code),
            details: fullExplanation,
            explanation: fullExplanation,
            rawCode: code,
            tagsInvolved: allTagsInCode,
            evaluationResult: lastResult?.value,
            lineNumber: 1
        };

        if (lastResult) {
            node.resultTag = {
                name: lastResult.variable,
                type: 'VARIABLE',
                dataType: lastResult.dataType,
                currentValue: this.formatValue(lastResult.value),
                foundInCache: this.findInCache(lastResult.variable) !== null,
                status: 'OK'
            };
        }

        // Adicionar warnings
        for (const warn of this.executionWarnings) {
            warnings.push({
                line: 0,
                message: warn,
                type: 'RUNTIME_WARNING'
            });
        }

        const statistics = this.generateStatistics(lines, allTagsInCode);

        return {
            success: errors.length === 0,
            nodes: [node],
            errors,
            warnings,
            statistics
        };
    }

    // ========================================================================
    // NOVO: RESET DE EXECUÇÃO
    // ========================================================================
    
    private resetExecution(): void {
        this.localVariables.clear();
        this.executionResults = [];
        this.executionWarnings = [];
        this.executionSteps = [];
    }

    // ========================================================================
    // NOVO: CARREGAR VARIÁVEIS DO CACHE
    // ========================================================================
    
    private loadCacheVariables(): void {
        const processed = new Set<string>();
        
        this.tagCache.forEach((tagInfo, _key) => {
            // Evitar duplicatas (cache pode ter lowercase e normal)
            if (processed.has(tagInfo.tag_name)) return;
            processed.add(tagInfo.tag_name);
            
            this.localVariables.set(tagInfo.tag_name, {
                name: tagInfo.tag_name,
                value: this.parseTagValue(tagInfo),
                dataType: tagInfo.data_type,
                source: 'cache'
            });
        });
    }
    
    private parseTagValue(tagInfo: PlcTagInfo): any {
        const value = tagInfo.value;
        const type = tagInfo.data_type.toUpperCase();
        
        switch (type) {
            case 'BOOL':
                return value === 'TRUE' || value === '1';
            case 'INT':
            case 'DINT':
            case 'SINT':
            case 'LINT':
            case 'USINT':
            case 'UINT':
            case 'UDINT':
            case 'ULINT':
            case 'BYTE':
            case 'WORD':
            case 'DWORD':
            case 'LWORD':
                return parseInt(value) || 0;
            case 'REAL':
            case 'LREAL':
                return parseFloat(value) || 0;
            default:
                // Tenta detectar pelo valor
                if (value === 'TRUE') return true;
                if (value === 'FALSE') return false;
                if (!isNaN(Number(value))) return Number(value);
                return value;
        }
    }

    // ========================================================================
    // NOVO: EXECUTAR CÓDIGO COMPLETO
    // ========================================================================
    
    private executeFullCode(code: string): void {
        const cleanCode = this.cleanCodeForAnalysis(code);
        
        // Detectar tipo principal de estrutura
        const hasIf = /\bIF\b/i.test(cleanCode);
        const hasFor = /\bFOR\b/i.test(cleanCode);
        const hasWhile = /\bWHILE\b/i.test(cleanCode);
        const hasRepeat = /\bREPEAT\b/i.test(cleanCode);
        const hasCase = /\bCASE\b/i.test(cleanCode);
        const hasTimer = /\b(TON|TOF|TP|TONR)\b/i.test(cleanCode);
        const hasCounter = /\b(CTU|CTD|CTUD)\b/i.test(cleanCode);
        
        // Executar estrutura IF
        if (hasIf) {
            this.executeIfStructure(cleanCode);
            
            // Executar atribuições após o END_IF
            const afterIfMatch = cleanCode.match(/END_IF\s*;?\s*([\s\S]*)/i);
            if (afterIfMatch && afterIfMatch[1].trim()) {
                this.executeAssignments(afterIfMatch[1]);
            }
        }
        // Explicar loops (não executa, só explica)
        else if (hasFor || hasWhile || hasRepeat) {
            const loopType = hasFor ? 'FOR_LOOP' : hasWhile ? 'WHILE_LOOP' : 'REPEAT_LOOP';
            this.executionSteps.push(this.explainLoop(cleanCode, loopType));
            
            // Ainda tenta executar atribuições dentro/fora do loop
            this.executeAssignments(cleanCode);
        }
        // Explicar CASE
        else if (hasCase) {
            const tags = this.extractAllTagsFromCode(code);
            this.executionSteps.push(this.explainCase(cleanCode, tags));
            this.executeAssignments(cleanCode);
        }
        // Explicar Timers
        else if (hasTimer) {
            this.executionSteps.push(this.explainTimer(cleanCode));
            this.executeAssignments(cleanCode);
        }
        // Explicar Counters
        else if (hasCounter) {
            this.executionSteps.push(this.explainCounter(cleanCode));
            this.executeAssignments(cleanCode);
        }
        // Só atribuições
        else {
            this.executeAssignments(cleanCode);
        }
    }

    // ========================================================================
    // NOVO: EXECUTAR ESTRUTURA IF
    // ========================================================================
    
    private executeIfStructure(code: string): void {
        // Extrair IF ... THEN ... ELSE ... END_IF
        const ifMatch = code.match(/IF\s+(.+?)\s+THEN([\s\S]*?)(?:ELSE([\s\S]*?))?END_IF/i);
        if (!ifMatch) return;
        
        const condition = ifMatch[1].trim();
        const thenBlock = ifMatch[2] || '';
        const elseBlock = ifMatch[3] || '';
        
        // Mostrar condição
        this.executionSteps.push(`IF ${this.cleanForDisplay(condition)}`);
        
        // Mostrar valores das variáveis na condição
        const varsInCondition = this.formatTagValuesUsed(condition);
        if (varsInCondition) {
            this.executionSteps.push(varsInCondition.trim());
        }
        
        // Mostrar avaliação passo a passo se tiver operadores lógicos
        if (this.hasLogicOperators(condition)) {
            const stepByStep = this.evaluateConditionStepByStep(condition);
            if (stepByStep.includes('→')) {
                this.executionSteps.push(stepByStep.trim());
            }
        }
        
        // Avaliar condição usando variáveis locais
        const conditionResult = this.evaluateExpressionWithLocals(condition);
        
        this.executionSteps.push(`Condição: ${conditionResult === true ? 'VERDADEIRA' : 'FALSA'}`);
        
        if (conditionResult === true) {
            this.executionSteps.push(`→ Executa bloco THEN`);
            this.executeAssignments(thenBlock);
        } else if (elseBlock.trim()) {
            this.executionSteps.push(`→ Executa bloco ELSE`);
            this.executeAssignments(elseBlock);
        } else {
            this.executionSteps.push(`→ Nenhum bloco executado`);
        }
    }

    // ========================================================================
    // NOVO: EXECUTAR ATRIBUIÇÕES
    // ========================================================================
    
    private executeAssignments(code: string): void {
        // Regex para encontrar atribuições: "Var" := expr; ou Var := expr;
        const assignRegex = /"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*:=\s*([^;]+);/g;
        let match;
        
        while ((match = assignRegex.exec(code)) !== null) {
            const varName = match[1];
            const expression = match[2].trim();
            
            // Avaliar expressão usando variáveis locais
            const value = this.evaluateExpressionWithLocals(expression);
            
            // Determinar tipo baseado no valor
            const dataType = this.inferDataTypeFromValue(value);
            
            // Verificar erros
            if (value === Infinity || value === -Infinity) {
                this.executionWarnings.push(`Divisão por zero em: ${varName}`);
            }
            if (Number.isNaN(value)) {
                this.executionWarnings.push(`Resultado inválido (NaN) em: ${varName} - possível divisão por zero`);
            }
            
            // IMPORTANTE: Salvar variável local para uso em expressões seguintes
            this.localVariables.set(varName, {
                name: varName,
                value: value,
                dataType: dataType,
                source: 'local'
            });
            
            // Adicionar ao resultado
            this.executionResults.push({
                variable: varName,
                value: value,
                dataType: dataType,
                expression: expression
            });
            
            this.executionSteps.push(`${varName} := ${this.cleanForDisplay(expression)} → ${this.formatValue(value)}`);
        }
    }

    // ========================================================================
    // NOVO: AVALIAR EXPRESSÃO COM VARIÁVEIS LOCAIS
    // ========================================================================
    
    private evaluateExpressionWithLocals(expression: string): any {
        try {
            let expr = expression;
            
            // 1. Substituir tags COM aspas: "Tag_Name"
            expr = expr.replace(/"([^"]+)"/g, (_match, tagName) => {
                return this.getVariableValueString(tagName);
            });
            
            // 2. Substituir variáveis (ordenar por tamanho para evitar substituição parcial)
            const varNames = Array.from(this.localVariables.keys()).sort((a, b) => b.length - a.length);
            for (const varName of varNames) {
                const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
                expr = expr.replace(regex, this.getVariableValueString(varName));
            }
            
            // 3. Converter operadores SCL -> JavaScript
            expr = expr
                .replace(/\bAND\b/gi, '&&')
                .replace(/\bOR\b/gi, '||')
                .replace(/\bXOR\b/gi, '!==')
                .replace(/\bNOT\s+/gi, '!')
                .replace(/\bMOD\b/gi, '%')
                .replace(/\bTRUE\b/gi, 'true')
                .replace(/\bFALSE\b/gi, 'false')
                .replace(/<>/g, '!==')
                .replace(/(?<![<>!=:])=(?![=])/g, '===');
            
            // 4. Avaliar
            const result = new Function('return ' + expr)();
            return result;
            
        } catch (e) {
            console.error('Erro ao avaliar:', expression, e);
            return undefined;
        }
    }
    
    private getVariableValueString(name: string): string {
        // Buscar nas variáveis locais
        let variable = this.localVariables.get(name);
        
        // Tentar case-insensitive
        if (!variable) {
            for (const [key, val] of this.localVariables) {
                if (key.toLowerCase() === name.toLowerCase()) {
                    variable = val;
                    break;
                }
            }
        }
        
        if (!variable) {
            return '0'; // Default se não encontrar
        }
        
        // Converter para string de acordo com tipo
        if (typeof variable.value === 'boolean') {
            return variable.value ? 'true' : 'false';
        }
        if (typeof variable.value === 'number') {
            return String(variable.value);
        }
        if (typeof variable.value === 'string') {
            return `"${variable.value}"`;
        }
        return String(variable.value);
    }
    
    private inferDataTypeFromValue(value: any): string {
        if (value === undefined || value === null) return 'UNKNOWN';
        if (typeof value === 'boolean') return 'BOOL';
        if (typeof value === 'number') {
            if (Number.isNaN(value) || !Number.isFinite(value)) return 'REAL';
            return Number.isInteger(value) ? 'INT' : 'REAL';
        }
        if (typeof value === 'string') return 'STRING';
        return 'UNKNOWN';
    }

    // ========================================================================
    // NOVO: CONSTRUIR EXPLICAÇÃO DA EXECUÇÃO
    // ========================================================================
    
    private buildExecutionExplanation(): string {
        let explanation = '';
        
        // Mostrar passos de execução
        if (this.executionSteps.length > 0) {
            for (const step of this.executionSteps) {
                explanation += `${step}\n`;
            }
        }
        
        // Mostrar warnings
        if (this.executionWarnings.length > 0) {
            explanation += '\nAvisos:\n';
            for (const warn of this.executionWarnings) {
                explanation += `⚠ ${warn}\n`;
            }
        }
        
        // Mostrar resultados calculados (apenas variáveis locais criadas)
        const localResults = this.executionResults.filter(r => {
            const variable = this.localVariables.get(r.variable);
            return variable && variable.source === 'local';
        });
        
        if (localResults.length > 0) {
            explanation += '\nResultados:\n';
            for (const r of localResults) {
                explanation += `  ${r.variable} = ${this.formatValue(r.value)} [${r.dataType}]\n`;
            }
        }
        
        return explanation.trim();
    }
    
    private cleanForDisplay(text: string): string {
        return text.replace(/"([^"]+)"/g, '$1').trim();
    }

    // ========================================================================
    // ANÁLISE DETALHADA DE EXPRESSÕES (para mostrar valores das tags)
    // ========================================================================

    private formatTagValuesUsed(expression: string): string {
        let output = '';
        const usedVars: LocalVariable[] = [];
        
        // Encontrar variáveis usadas na expressão
        for (const [name, variable] of this.localVariables) {
            const regex = new RegExp(`["']?${this.escapeRegex(name)}["']?`, 'i');
            if (regex.test(expression)) {
                usedVars.push(variable);
            }
        }
        
        if (usedVars.length === 0) return output;
        
        output += 'Valores atuais:\n';
        for (const v of usedVars) {
            output += `  ${v.name} [${v.dataType}] = ${this.formatValue(v.value)}\n`;
        }
        
        return output;
    }

    private evaluateConditionStepByStep(expression: string): string {
        let output = 'Avaliação:\n';
        
        const hasAnd = /\bAND\b/i.test(expression);
        const hasOr = /\bOR\b/i.test(expression);
        
        if (hasAnd || hasOr) {
            const parts = expression.split(/\b(AND|OR)\b/i);
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i].trim();
                
                if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
                    continue;
                }
                
                if (part) {
                    const partResult = this.evaluateExpressionWithLocals(part);
                    output += `  ${this.cleanForDisplay(part)} → ${this.formatValue(partResult)}\n`;
                }
            }
        }
        
        return output;
    }

    private hasLogicOperators(expression: string): boolean {
        return /\b(AND|OR|XOR|NOT)\b/i.test(expression);
    }

    // ========================================================================
    // LIMPEZA DO CÓDIGO (PRESERVA ASPAS NAS TAGS)
    // ========================================================================

    private cleanCodeForAnalysis(code: string): string {
        return code
            // Remove comentários de linha
            .replace(/\/\/.*$/gm, '')
            // Remove comentários de bloco (* *)
            .replace(/\(\*[\s\S]*?\*\)/g, '')
            // Remove comentários de bloco { }
            .replace(/\{[\s\S]*?\}/g, '')
            // Remove strings literais (mas NÃO tags com aspas)
            .replace(/'[^']*'/g, "''");
    }

    // ========================================================================
    // EXTRAÇÃO DE TAGS (COM E SEM ASPAS)
    // ========================================================================

    private extractAllTagsFromCode(code: string): TagData[] {
        const tags: TagData[] = [];
        const processedNames = new Set<string>();
        
        const cleanCode = this.cleanCodeForAnalysis(code);
        
        // 1. Extrair tags COM aspas: "Tag_Name"
        const quotedTagsMatches = cleanCode.match(/"([^"]+)"/g) || [];
        for (const match of quotedTagsMatches) {
            const tagName = match.replace(/"/g, '');
            
            if (processedNames.has(tagName)) continue;
            if (this.isSclKeyword(tagName)) continue;
            
            const tagInfo = this.findInCache(tagName);
            if (tagInfo) {
                tags.push(this.createTagData(tagInfo));
                processedNames.add(tagName);
            }
        }
        
        // 2. Extrair tags SEM aspas: Tag_Name
        const normalWords = cleanCode.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        for (const word of normalWords) {
            if (processedNames.has(word)) continue;
            if (this.isSclKeyword(word)) continue;
            
            const tagInfo = this.findInCache(word);
            if (tagInfo) {
                tags.push(this.createTagData(tagInfo));
                processedNames.add(word);
            }
        }

        return tags;
    }

    private createTagData(tagInfo: PlcTagInfo): TagData {
        return {
            name: tagInfo.tag_name,
            type: 'VARIABLE',
            dataType: tagInfo.data_type,
            currentValue: tagInfo.value,
            foundInCache: true,
            status: 'OK',
            address: tagInfo.address,
            quality: tagInfo.quality
        };
    }

    // ========================================================================
    // EXPLICAÇÕES PARA ESTRUTURAS ESPECÍFICAS
    // ========================================================================

    private explainLoop(code: string, type: string): string {
        const cleanCode = this.cleanCodeForAnalysis(code);
        
        if (type === 'FOR_LOOP' || /\bFOR\b/i.test(cleanCode)) {
            const match = cleanCode.match(/FOR\s+(\w+)\s*:=\s*(\d+)\s+TO\s+(\d+)(?:\s+BY\s+(\d+))?\s+DO/i);
            if (match) {
                let exp = `Loop FOR: ${match[1]} de ${match[2]} até ${match[3]}`;
                if (match[4]) exp += ` (passo ${match[4]})`;
                return exp;
            }
        } else if (type === 'WHILE_LOOP' || /\bWHILE\b/i.test(cleanCode)) {
            const match = cleanCode.match(/WHILE\s+(.+?)\s+DO/i);
            if (match) {
                return `Loop WHILE: executa enquanto ${this.cleanForDisplay(match[1])}`;
            }
        } else if (type === 'REPEAT_LOOP' || /\bREPEAT\b/i.test(cleanCode)) {
            const match = cleanCode.match(/UNTIL\s+(.+?)\s*;/i);
            if (match) {
                return `Loop REPEAT: executa até ${this.cleanForDisplay(match[1])}`;
            }
        }
        
        return 'Estrutura de repetição';
    }

    private explainTimer(code: string): string {
        const upper = code.toUpperCase();
        if (upper.includes('TON')) return 'Timer TON: liga saída após tempo (delay on)';
        if (upper.includes('TOF')) return 'Timer TOF: desliga saída após tempo (delay off)';
        if (upper.includes('TP')) return 'Timer TP: gera pulso com duração definida';
        if (upper.includes('TONR')) return 'Timer TONR: timer com retenção';
        return 'Temporizador';
    }

    private explainCounter(code: string): string {
        const upper = code.toUpperCase();
        if (upper.includes('CTU')) return 'Contador CTU: incrementa a cada pulso';
        if (upper.includes('CTD')) return 'Contador CTD: decrementa a cada pulso';
        if (upper.includes('CTUD')) return 'Contador CTUD: conta para cima e para baixo';
        return 'Contador';
    }

    private explainCase(code: string, _tags: TagData[]): string {
        const cleanCode = this.cleanCodeForAnalysis(code);
        const match = cleanCode.match(/CASE\s+["']?(\w+)["']?\s+OF/i);
        
        if (!match) return 'Estrutura CASE';
        
        const selector = match[1];
        const variable = this.localVariables.get(selector);
        
        let exp = `Seletor: ${selector}`;
        if (variable) {
            exp += ` (valor atual: ${this.formatValue(variable.value)})`;
        }
        
        return exp;
    }

    // ========================================================================
    // DETECÇÃO DO TIPO
    // ========================================================================

    private detectLogicType(code: string): PythonNodeType {
        const cleanCode = this.cleanCodeForAnalysis(code).toUpperCase();
        
        if (/\bFUNCTION_BLOCK\b/.test(cleanCode)) return 'FUNCTION_DEF';
        if (/\bFUNCTION\b/.test(cleanCode)) return 'FUNCTION_DEF';
        if (/\bIF\b.*\bTHEN\b/.test(cleanCode)) return 'IF_STATEMENT';
        if (/\bCASE\b.*\bOF\b/.test(cleanCode)) return 'IF_STATEMENT';
        if (/\bFOR\b.*\bTO\b.*\bDO\b/.test(cleanCode)) return 'FOR_LOOP';
        if (/\bWHILE\b.*\bDO\b/.test(cleanCode)) return 'WHILE_LOOP';
        if (/\bREPEAT\b/.test(cleanCode)) return 'WHILE_LOOP';
        if (/\b(AND|OR|XOR)\b/.test(cleanCode)) return 'LOGICAL';
        if (/<>|<=|>=|[<>]/.test(cleanCode)) return 'COMPARISON';
        if (/:=/.test(cleanCode)) return 'ASSIGNMENT';
        if (/[+\-*\/]/.test(cleanCode)) return 'ARITHMETIC';

        return 'EXPRESSION';
    }

    // ========================================================================
    // FORMATAÇÃO DE VALORES
    // ========================================================================

    private formatValue(value: any): string {
        if (value === undefined) return '?';
        if (value === null) return 'NULL';
        if (value === true) return 'TRUE';
        if (value === false) return 'FALSE';
        if (Number.isNaN(value)) return 'NaN (erro)';
        if (value === Infinity) return '∞ (div/0)';
        if (value === -Infinity) return '-∞ (div/0)';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? String(value) : value.toFixed(2);
        }
        return String(value);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private findInCache(name: string): PlcTagInfo | null {
        // Tenta exato
        if (this.tagCache.has(name)) return this.tagCache.get(name)!;
        // Tenta lowercase
        if (this.tagCache.has(name.toLowerCase())) return this.tagCache.get(name.toLowerCase())!;
        // Tenta uppercase
        if (this.tagCache.has(name.toUpperCase())) return this.tagCache.get(name.toUpperCase())!;
        
        return null;
    }

    private isSclKeyword(word: string): boolean {
        return this.SCL_KEYWORDS.has(word.toUpperCase());
    }

    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private generateLogicSummary(code: string): string {
        const cleanCode = this.cleanCodeForAnalysis(code);
        const lines = cleanCode.split('\n').filter(l => l.trim());
        
        if (lines.length === 0) return 'Código vazio';
        if (lines.length === 1) return lines[0].trim();
        return `Lógica SCL com ${lines.length} linhas`;
    }

    private generateStatistics(lines: string[], tags: TagData[]): ParseStatistics {
        let codeLines = 0, commentLines = 0, emptyLines = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) emptyLines++;
            else if (trimmed.startsWith('//') || trimmed.startsWith('(*') || trimmed.startsWith('{')) commentLines++;
            else codeLines++;
        }

        return {
            totalLines: lines.length,
            codeLines,
            commentLines,
            emptyLines,
            variablesFound: tags.length,
            functionsFound: 0,
            classesFound: 0,
            tagsFoundInCache: tags.length,
            tagsNotFoundInCache: 0
        };
    }

    private resetContext(): void {
        this.context.variables.clear();
        this.context.functions.clear();
        this.context.imports.clear();
        this.context.globals.clear();
    }
}

export const sclParser = new SclParser();
export const pythonParser = sclParser;
export { SclParser as PythonParser };