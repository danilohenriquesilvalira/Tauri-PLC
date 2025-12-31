// ============================================================================
// PYTHON PARSER - PARSER PRINCIPAL
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

export class PythonParser {
    private tagCache: Map<string, PlcTagInfo> = new Map();
    private config: ParserConfig;
    private context: ExecutionContext;

    constructor(config?: Partial<ParserConfig>) {
        this.config = {
            enableRealTimeExecution: true,
            maxExecutionTime: 5000,
            enableTypeChecking: true,
            enableBestPracticeWarnings: true,
            pythonVersion: '3.11',
            allowedModules: ['math', 'datetime', 'time'],
            restrictedFunctions: ['exec', 'eval', 'open', 'input'],
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

    parse(code: string): ParseResult {
        const lines = code.split('\n');
        const nodes: LogicNode[] = [];
        const errors: ParseError[] = [];
        const warnings: ParseWarning[] = [];

        // Reset context for new parsing
        this.resetContext();

        let nodeId = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            try {
                const lineNode = this.parseLine(trimmedLine, i + 1, line, nodeId++);
                if (lineNode) {
                    nodes.push(lineNode);
                }
            } catch (error) {
                errors.push({
                    line: i + 1,
                    column: 0,
                    message: error instanceof Error ? error.message : 'Erro desconhecido',
                    type: 'SYNTAX',
                    severity: 'ERROR'
                });
            }
        }

        // Generate warnings and suggestions
        this.generateWarnings(nodes, warnings);
        this.generateCacheSuggestions(nodes, warnings);

        const statistics = this.generateStatistics(lines, nodes);

        return {
            success: errors.length === 0,
            nodes,
            errors,
            warnings,
            statistics
        };
    }

    private parseLine(line: string, lineNumber: number, originalLine: string, nodeId: number): LogicNode | null {
        const indentLevel = originalLine.length - originalLine.trimStart().length;
        
        // Detect node type
        const nodeType = this.detectNodeType(line);
        const tagsInvolved = this.extractTags(line);
        
        // Create base node
        const node: LogicNode = {
            id: `node_${nodeId}`,
            type: nodeType,
            summary: line,
            details: this.generateDetails(line, nodeType),
            explanation: this.generateExplanation(line, nodeType, tagsInvolved),
            rawCode: line,
            tagsInvolved,
            lineNumber,
            indentLevel
        };

        // Try to evaluate the line if it's an assignment or expression
        if (nodeType === 'ASSIGNMENT' || nodeType === 'EXPRESSION') {
            try {
                const result = this.evaluateExpression(line);
                if (result !== undefined) {
                    node.evaluationResult = result;
                }
            } catch (error) {
                // Evaluation failed, but that's okay
            }
        }

        // Set result tag for assignments
        if (nodeType === 'ASSIGNMENT') {
            const assignmentTarget = this.getAssignmentTarget(line);
            if (assignmentTarget) {
                const resultTag = this.createTagData(assignmentTarget, node.evaluationResult);
                if (resultTag) {
                    node.resultTag = resultTag;
                }
            }
        }

        return node;
    }

    private detectNodeType(line: string): PythonNodeType {
        const trimmed = line.trim();

        // Function definition
        if (trimmed.startsWith('def ')) return 'FUNCTION_DEF';
        
        // Class definition
        if (trimmed.startsWith('class ')) return 'CLASS_DEF';
        
        // Control flow
        if (trimmed.startsWith('if ')) return 'IF_STATEMENT';
        if (trimmed.startsWith('elif ')) return 'ELIF_STATEMENT';
        if (trimmed.startsWith('else:')) return 'ELSE_STATEMENT';
        
        // Loops
        if (trimmed.startsWith('for ')) return 'FOR_LOOP';
        if (trimmed.startsWith('while ')) return 'WHILE_LOOP';
        
        // Exception handling
        if (trimmed.startsWith('try:')) return 'TRY_EXCEPT';
        if (trimmed.startsWith('with ')) return 'WITH_STATEMENT';
        
        // Import statements
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) return 'IMPORT';
        
        // Return statement
        if (trimmed.startsWith('return ')) return 'RETURN';
        
        // Assignment
        if (trimmed.includes('=') && !this.isComparison(trimmed)) return 'ASSIGNMENT';
        
        // Comparison operations
        if (this.hasComparisonOperators(trimmed)) return 'COMPARISON';
        
        // Arithmetic operations
        if (this.hasArithmeticOperators(trimmed)) return 'ARITHMETIC';
        
        // Logical operations
        if (this.hasLogicalOperators(trimmed)) return 'LOGICAL';
        
        // Function call
        if (trimmed.includes('(') && trimmed.includes(')')) return 'FUNCTION_CALL';

        return 'EXPRESSION';
    }

    private isComparison(line: string): boolean {
        const comparisons = ['==', '!=', '<=', '>=', '<', '>', ' in ', ' not in ', ' is ', ' is not '];
        return comparisons.some(op => line.includes(op));
    }

    private hasComparisonOperators(line: string): boolean {
        return this.isComparison(line);
    }

    private hasArithmeticOperators(line: string): boolean {
        const operators = ['+', '-', '*', '/', '//', '%', '**'];
        return operators.some(op => line.includes(op));
    }

    private hasLogicalOperators(line: string): boolean {
        const operators = [' and ', ' or ', ' not ', '&', '|', '^'];
        return operators.some(op => line.includes(op));
    }

    private extractTags(line: string): TagData[] {
        const tags: TagData[] = [];
        const words = line.split(/[^a-zA-Z0-9_]+/);
        
        for (const word of words) {
            if (word && this.isPotentialTag(word)) {
                const tagData = this.createTagData(word);
                if (tagData) {
                    tags.push(tagData);
                }
            }
        }

        return tags;
    }

    private isPotentialTag(word: string): boolean {
        // Se existe no cache, é uma tag válida
        if (this.tagCache.has(word) || this.tagCache.has(word.toLowerCase()) || this.tagCache.has(word.toUpperCase())) {
            return true;
        }
        
        // Se não é palavra reservada do Python e tem tamanho razoável
        return !this.isKeyword(word) && word.length > 1;
    }

    private isKeyword(word: string): boolean {
        const keywords = [
            'True', 'False', 'None', 'AND', 'OR', 'NOT', 'IF', 'ELIF', 
            'ELSE', 'FOR', 'WHILE', 'DEF', 'CLASS', 'IMPORT', 'FROM',
            'TRY', 'EXCEPT', 'WITH', 'AS', 'PASS', 'BREAK', 'CONTINUE',
            'RETURN', 'YIELD', 'LAMBDA', 'GLOBAL', 'NONLOCAL'
        ];
        return keywords.includes(word);
    }

    private createTagData(tagName: string, value?: any): TagData | null {
        // Tenta encontrar a tag no cache com o nome exato, ou variações
        const cacheInfo = this.tagCache.get(tagName) || 
                          this.tagCache.get(tagName.toLowerCase()) || 
                          this.tagCache.get(tagName.toUpperCase());
        
        // Se tem info no cache, use os valores reais do PLC
        if (cacheInfo) {
            return {
                name: cacheInfo.tag_name, // Usa o nome EXATO do cache
                type: 'VARIABLE',
                dataType: cacheInfo.data_type,
                currentValue: cacheInfo.value,
                foundInCache: true,
                status: 'OK',
                address: cacheInfo.address,
                quality: cacheInfo.quality
            };
        }
        
        // Se não tem no cache, usa valor calculado se disponível
        return {
            name: tagName,
            type: 'VARIABLE',
            dataType: this.inferDataType(value),
            currentValue: value !== undefined ? String(value) : 'N/A',
            foundInCache: false,
            status: 'NOT_FOUND'
        };
    }

    private inferDataType(value: any): string {
        if (value === undefined || value === null) return 'UNKNOWN';
        if (typeof value === 'boolean') return 'BOOL';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'INT' : 'REAL';
        }
        if (typeof value === 'string') return 'STRING';
        if (Array.isArray(value)) return 'ARRAY';
        if (typeof value === 'object') return 'OBJECT';
        return 'UNKNOWN';
    }

    private getAssignmentTarget(line: string): string | null {
        const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
        return match ? match[2] : null;
    }

    private evaluateExpression(line: string): any {
        try {
            if (line.includes('=') && !this.isComparison(line)) {
                // Assignment
                const [left, right] = line.split('=', 2).map(s => s.trim());
                const value = this.evaluateRightSide(right);
                this.context.variables.set(left, value);
                
                // Se o lado esquerdo é uma tag PLC conhecida, mostra sugestão
                const leftTag = this.tagCache.get(left) || this.tagCache.get(left.toUpperCase());
                if (leftTag) {
                    // console.log(`💡 Tag ${left} no PLC tem valor atual: ${leftTag.value}`);
                }
                
                return value;
            } else {
                // Expression
                return this.evaluateRightSide(line);
            }
        } catch (error) {
            // console.error('Erro na avaliação:', error);
            return undefined;
        }
    }

    private evaluateRightSide(expression: string): any {
        let processedExpression = expression.trim();
        
        // Extrai todas as palavras da expressão para verificar se são tags
        const words = processedExpression.split(/[^a-zA-Z0-9_]+/);
        
        for (const word of words) {
            if (word.length > 0) {
                // Procura a tag no cache (exato, lowercase, uppercase)
                const tagInfo = this.tagCache.get(word) || 
                               this.tagCache.get(word.toLowerCase()) || 
                               this.tagCache.get(word.toUpperCase());
                
                if (tagInfo) {
                    let value = tagInfo.value;
                    
                    // Converte para o tipo apropriado
                    if (tagInfo.data_type === 'BOOL') {
                        const boolValue = value.toLowerCase() === 'true' || value === '1' || value === 'TRUE';
                        value = boolValue ? 'true' : 'false';
                    } else if (tagInfo.data_type === 'INT' || tagInfo.data_type === 'DINT') {
                        value = String(parseInt(value) || 0);
                    } else if (tagInfo.data_type === 'REAL') {
                        value = String(parseFloat(value) || 0.0);
                    } else {
                        // STRING ou outros tipos
                        value = `"${value}"`;
                    }
                    
                    // Substitui a palavra exata na expressão
                    const regex = new RegExp(`\\b${word}\\b`, 'g');
                    processedExpression = processedExpression.replace(regex, value);
                    
                    // console.log(`🏷️ Tag encontrada: ${word} (${tagInfo.tag_name}) = ${tagInfo.value} (${tagInfo.data_type})`);
                }
            }
        }

        // Converte operadores Python para JavaScript
        processedExpression = processedExpression
            .replace(/\band\b/g, '&&')
            .replace(/\bor\b/g, '||')
            .replace(/\bnot\s+/g, '!')
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null');

        try {
            // Avalia a expressão processada
            const result = new Function('return ' + processedExpression)();
            
            // if (substitutionsMade) {
            //     console.log(`📊 Avaliação: ${expression} → ${processedExpression} = ${result}`);
            // }
            
            return result;
        } catch (error) {
            // console.warn(`⚠️ Erro ao avaliar expressão: ${expression}`, error);
            return undefined;
        }
    }

    private generateDetails(_line: string, nodeType: PythonNodeType): string {
        switch (nodeType) {
            case 'ASSIGNMENT':
                return `Atribuição de valor à variável`;
            case 'IF_STATEMENT':
                return `Estrutura condicional IF`;
            case 'FOR_LOOP':
                return `Loop FOR para iteração`;
            case 'WHILE_LOOP':
                return `Loop WHILE condicional`;
            case 'FUNCTION_DEF':
                return `Definição de função`;
            case 'COMPARISON':
                return `Operação de comparação`;
            case 'ARITHMETIC':
                return `Operação aritmética`;
            case 'LOGICAL':
                return `Operação lógica`;
            case 'FUNCTION_CALL':
                return `Chamada de função`;
            default:
                return `Expressão Python`;
        }
    }

    private generateExplanation(line: string, nodeType: PythonNodeType, tags: TagData[]): string {
        let explanation = '';
        
        // Verifica se é uma operação lógica específica
        if (line.includes(' and ')) {
            explanation = `Operação lógica AND: o resultado será TRUE apenas se AMBOS os valores forem TRUE.`;
        } else if (line.includes(' or ')) {
            explanation = `Operação lógica OR: o resultado será TRUE se PELO MENOS UM dos valores for TRUE.`;
        } else if (line.includes(' not ')) {
            explanation = `Operação lógica NOT: inverte o valor (TRUE vira FALSE, FALSE vira TRUE).`;
        } else {
            switch (nodeType) {
                case 'ASSIGNMENT':
                    const target = this.getAssignmentTarget(line);
                    explanation = `Atribui o resultado da operação à variável '${target}'.`;
                    break;
                
                case 'IF_STATEMENT':
                    explanation = `Condição IF: executa o código apenas se a condição for TRUE.`;
                    break;
                
                case 'COMPARISON':
                    explanation = `Comparação entre valores para determinar TRUE ou FALSE.`;
                    break;
                
                default:
                    explanation = `Operação Python executada com os valores das tags.`;
                    break;
            }
        }
        
        // Adiciona informações detalhadas das tags com valores reais
        if (tags.length > 0) {
            const tagDetails = tags.map(tag => {
                if (tag.foundInCache) {
                    return `${tag.name} = ${tag.currentValue}`;
                } else {
                    return `${tag.name} (não encontrado)`;
                }
            }).join(', ');
            
            explanation += ` | Tags utilizadas: ${tagDetails}`;
        }
        
        return explanation;
    }

    private generateWarnings(nodes: LogicNode[], warnings: ParseWarning[]): void {
        if (!this.config.enableBestPracticeWarnings) return;

        const usedVariables = new Set<string>();
        const definedVariables = new Set<string>();

        for (const node of nodes) {
            // Track variable usage
            if (node.type === 'ASSIGNMENT') {
                const target = this.getAssignmentTarget(node.rawCode);
                if (target) {
                    definedVariables.add(target);
                }
            }

            // Track variable references
            for (const tag of node.tagsInvolved) {
                usedVariables.add(tag.name);
            }
        }

        // Check for unused variables
        for (const variable of definedVariables) {
            if (!usedVariables.has(variable)) {
                warnings.push({
                    line: 0,
                    column: 0,
                    message: `Variável '${variable}' definida mas não utilizada`,
                    type: 'UNUSED_VARIABLE'
                });
            }
        }
    }

    private generateCacheSuggestions(nodes: LogicNode[], warnings: ParseWarning[]): void {
        const availableTags = Array.from(this.tagCache.keys());
        const usedTags = new Set<string>();
        
        // Coleta todas as tags usadas no código
        for (const node of nodes) {
            for (const tag of node.tagsInvolved) {
                usedTags.add(tag.name);
            }
        }
        
        // Sugere tags similares para tags não encontradas
        for (const node of nodes) {
            for (const tag of node.tagsInvolved) {
                if (!tag.foundInCache) {
                    const similarTags = this.findSimilarTags(tag.name, availableTags);
                    if (similarTags.length > 0) {
                        warnings.push({
                            line: node.lineNumber || 0,
                            column: 0,
                            message: `Tag '${tag.name}' não encontrada. Você quis dizer: ${similarTags.slice(0, 3).join(', ')}?`,
                            type: 'UNDEFINED_VARIABLE'
                        });
                    }
                }
            }
        }
        
        // Sugere tags não utilizadas que poderiam ser úteis
        const unusedRelevantTags = availableTags.filter(tag => 
            !usedTags.has(tag) && 
            (tag.includes('SENSOR') || tag.includes('MOTOR') || tag.includes('ALARM'))
        );
        
        if (unusedRelevantTags.length > 0 && unusedRelevantTags.length <= 5) {
            warnings.push({
                line: 0,
                column: 0,
                message: `💡 Tags PLC disponíveis que você pode usar: ${unusedRelevantTags.slice(0, 5).join(', ')}`,
                type: 'BEST_PRACTICE'
            });
        }
    }

    private findSimilarTags(target: string, availableTags: string[]): string[] {
        return availableTags
            .filter(tag => {
                const similarity = this.calculateSimilarity(target.toLowerCase(), tag.toLowerCase());
                return similarity > 0.6; // 60% de similaridade
            })
            .sort((a, b) => {
                const simA = this.calculateSimilarity(target.toLowerCase(), a.toLowerCase());
                const simB = this.calculateSimilarity(target.toLowerCase(), b.toLowerCase());
                return simB - simA;
            });
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    private generateStatistics(lines: string[], nodes: LogicNode[]): ParseStatistics {
        let codeLines = 0;
        let commentLines = 0;
        let emptyLines = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                emptyLines++;
            } else if (trimmed.startsWith('#')) {
                commentLines++;
            } else {
                codeLines++;
            }
        }

        const allTags = nodes.flatMap(n => n.tagsInvolved);
        const tagsFoundInCache = allTags.filter(t => t.foundInCache).length;
        const tagsNotFoundInCache = allTags.filter(t => !t.foundInCache).length;

        return {
            totalLines: lines.length,
            codeLines,
            commentLines,
            emptyLines,
            variablesFound: new Set(allTags.map(t => t.name)).size,
            functionsFound: nodes.filter(n => n.type === 'FUNCTION_DEF').length,
            classesFound: nodes.filter(n => n.type === 'CLASS_DEF').length,
            tagsFoundInCache,
            tagsNotFoundInCache
        };
    }

    private resetContext(): void {
        this.context.variables.clear();
        this.context.functions.clear();
        this.context.imports.clear();
        this.context.globals.clear();
    }
}

// Instância padrão do parser
export const pythonParser = new PythonParser();