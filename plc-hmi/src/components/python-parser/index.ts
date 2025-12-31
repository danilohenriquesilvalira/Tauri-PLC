// ============================================================================
// SCL PARSER - EXPORTAÇÕES
// ============================================================================

// Tipos
export * from './types';

// Exemplos
export * from './examples';

// Parser principal
export { SclParser, SclParser as PythonParser, sclParser, sclParser as pythonParser } from './scl-parser';

// Utilitários
export const getDataTypeColor = (dataType: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        'BOOL': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'INT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'DINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'SINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'LINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'USINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'UINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'UDINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'ULINT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'REAL': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'LREAL': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'WORD': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'DWORD': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'LWORD': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'BYTE': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'STRING': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'WSTRING': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'CHAR': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'TIME': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'DATE': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'TOD': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'DT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'ARRAY': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'STRUCT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'UDT': { bg: 'bg-edp-marine/10', text: 'text-edp-marine', border: 'border-edp-marine/20' },
        'UNKNOWN': { bg: 'bg-edp-neutral-lighter', text: 'text-edp-neutral-medium', border: 'border-edp-neutral-lighter' }
    };
    
    return colors[dataType] || colors['UNKNOWN'];
};

// Função para detectar se o código é SCL
export const detectSclCode = (code: string): boolean => {
    const sclIndicators = [
        /\bIF\b.*\bTHEN\b/i,
        /\bEND_IF\b/i,
        /\bCASE\b.*\bOF\b/i,
        /\bEND_CASE\b/i,
        /\bFOR\b.*\bTO\b.*\bDO\b/i,
        /\bEND_FOR\b/i,
        /\bWHILE\b.*\bDO\b/i,
        /\bEND_WHILE\b/i,
        /\bREPEAT\b/i,
        /\bUNTIL\b/i,
        /\bFUNCTION_BLOCK\b/i,
        /\bEND_FUNCTION_BLOCK\b/i,
        /\bVAR_INPUT\b/i,
        /\bVAR_OUTPUT\b/i,
        /\bVAR_TEMP\b/i,
        /\bEND_VAR\b/i,
        /:=/,
        /\bAND\b|\bOR\b|\bXOR\b|\bNOT\b/i,
        /\bTRUE\b|\bFALSE\b/i,
        /\bTON\b|\bTOF\b|\bTP\b/i,
        /\bCTU\b|\bCTD\b|\bCTUD\b/i,
        /\/\/.*$/m,
        /\(\*.*\*\)/,
    ];
    
    let score = 0;
    for (const indicator of sclIndicators) {
        if (indicator.test(code)) {
            score++;
        }
    }
    
    return score >= 2;
};

// Função para formatar código SCL
export const formatSclCode = (code: string): string => {
    return code
        .split('\n')
        .map(line => line.trimRight())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
};

// Manter compatibilidade
export const detectPythonCode = detectSclCode;
export const formatPythonCode = formatSclCode;