// ============================================================================
// PYTHON/SCL PARSER - TIPOS
// ============================================================================

// Informação do tag vinda do backend (cache)
export interface PlcTagInfo {
    tag_name: string;
    value: string;
    data_type: string;  // "BOOL", "INT", "WORD", "REAL", "DINT", "DWORD"
    address?: string;
    quality?: string;
}

// Tag analisado com status
export interface TagData {
    name: string;
    type: 'VARIABLE' | 'CONSTANT' | 'FUNCTION' | 'METHOD' | 'UNKNOWN';
    dataType: string;
    currentValue: string;
    foundInCache: boolean;
    status: 'OK' | 'NOK' | 'NOT_FOUND';
    address?: string;
    quality?: string;
}

// Tipos de nós de lógica Python/SCL
export type PythonNodeType = 
    | 'ASSIGNMENT'
    | 'IF_STATEMENT' 
    | 'ELIF_STATEMENT'
    | 'ELSE_STATEMENT'
    | 'FOR_LOOP'
    | 'WHILE_LOOP'
    | 'FUNCTION_DEF'
    | 'CLASS_DEF'
    | 'COMPARISON'
    | 'ARITHMETIC'
    | 'LOGICAL'
    | 'FUNCTION_CALL'
    | 'LIST_COMPREHENSION'
    | 'DICTIONARY'
    | 'LIST'
    | 'TUPLE'
    | 'TRY_EXCEPT'
    | 'WITH_STATEMENT'
    | 'IMPORT'
    | 'RETURN'
    | 'EXPRESSION';

// Nó de lógica analisado
export interface LogicNode {
    id: string;
    type: PythonNodeType;
    summary: string;
    details: string;
    explanation: string;
    children?: LogicNode[];
    rawCode: string;
    tagsInvolved: TagData[];
    resultTag?: TagData;
    evaluationResult?: boolean | number | string | object;
    lineNumber?: number;
    indentLevel?: number;
    parentNode?: string;
}

// Resultado do parser
export interface ParseResult {
    success: boolean;
    nodes: LogicNode[];
    errors: ParseError[];
    warnings: ParseWarning[];
    statistics: ParseStatistics;
}

// Erro de parsing
export interface ParseError {
    line: number;
    column?: number;
    message: string;
    type: 'SYNTAX' | 'SEMANTIC' | 'RUNTIME' | 'TAG_NOT_FOUND';
    severity: 'ERROR' | 'WARNING' | 'INFO';
}

// Aviso de parsing - ATUALIZADO com mais tipos
export interface ParseWarning {
    line: number;
    column?: number;
    message: string;
    type: 
        | 'UNUSED_VARIABLE' 
        | 'UNDEFINED_VARIABLE' 
        | 'TYPE_MISMATCH' 
        | 'BEST_PRACTICE'
        | 'WARNING'           // Aviso genérico
        | 'DIVISION_BY_ZERO'  // Divisão por zero
        | 'NAN_RESULT'        // Resultado NaN
        | 'OVERFLOW'          // Overflow numérico
        | 'RUNTIME_WARNING';  // Aviso de runtime
}

// Estatísticas do parsing
export interface ParseStatistics {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    emptyLines: number;
    variablesFound: number;
    functionsFound: number;
    classesFound: number;
    tagsFoundInCache: number;
    tagsNotFoundInCache: number;
}

// Exemplos de código
export interface ExampleCode {
    id: string;
    title: string;
    description: string;
    code: string;
    category: ExampleCategory;
    complexity: 'simple' | 'medium' | 'complex';
    tags: string[];
    dataTypes: string[];
    expectedOutput?: string;
    explanation?: string;
}

// Categorias de exemplos
export type ExampleCategory = 
    | 'basic'
    | 'control_flow'
    | 'loops'
    | 'functions'
    | 'classes'
    | 'data_structures'
    | 'file_io'
    | 'error_handling'
    | 'plc_integration'
    | 'automation';

// Configuração do parser
export interface ParserConfig {
    enableRealTimeExecution: boolean;
    maxExecutionTime: number;
    enableTypeChecking: boolean;
    enableBestPracticeWarnings: boolean;
    pythonVersion: '3.8' | '3.9' | '3.10' | '3.11' | '3.12';
    allowedModules: string[];
    restrictedFunctions: string[];
}

// Contexto de execução
export interface ExecutionContext {
    variables: Map<string, any>;
    functions: Map<string, Function>;
    imports: Set<string>;
    globals: Map<string, any>;
    plcTags: Map<string, PlcTagInfo>;
}