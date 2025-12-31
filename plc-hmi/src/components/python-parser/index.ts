// ============================================================================
// PYTHON PARSER - EXPORTAÇÕES
// ============================================================================

// Tipos
export * from './types';

// Exemplos
export * from './examples';

// Parser principal
export { PythonParser, pythonParser } from './python-parser';

// Utilitários
export const getDataTypeColor = (dataType: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        'BOOL': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
        'INT': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
        'DINT': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
        'REAL': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
        'WORD': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
        'DWORD': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
        'STRING': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
        'ARRAY': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
        'OBJECT': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
        'UNKNOWN': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
    };
    
    return colors[dataType] || colors['UNKNOWN'];
};

// Função para detectar se o código parece ser Python
export const detectPythonCode = (code: string): boolean => {
    const pythonIndicators = [
        /def\s+\w+\s*\(/,           // function definition
        /class\s+\w+/,             // class definition
        /if\s+.*:/,                // if statement
        /for\s+\w+\s+in\s+/,       // for loop
        /while\s+.*:/,             // while loop
        /import\s+\w+/,            // import statement
        /from\s+\w+\s+import/,     // from import
        /elif\s+.*:/,              // elif statement
        /try\s*:/,                 // try block
        /except\s*.*:/,            // except block
        /with\s+.*:/,              // with statement
        /lambda\s+.*:/,            // lambda expression
        /^\s*#/m,                  // comments
        /^\s*"""/m,                // docstrings
        /\band\b|\bor\b|\bnot\b/,  // boolean operators
        /\bTrue\b|\bFalse\b|\bNone\b/, // boolean/null values
    ];
    
    let score = 0;
    for (const indicator of pythonIndicators) {
        if (indicator.test(code)) {
            score++;
        }
    }
    
    return score >= 2; // Need at least 2 indicators to consider it Python
};

// Função para formatar código Python
export const formatPythonCode = (code: string): string => {
    return code
        .split('\n')
        .map(line => line.trimRight()) // Remove trailing whitespace
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'); // Replace multiple empty lines with double
};

// Função para obter sintaxe highlighting básico
export const getPythonSyntaxHighlight = (code: string): string => {
    return code
        // Keywords
        .replace(/\b(def|class|if|elif|else|for|while|try|except|with|import|from|return|yield|lambda|global|nonlocal|pass|break|continue)\b/g, 
                 '<span class="text-purple-600 font-semibold">$1</span>')
        // Built-in values
        .replace(/\b(True|False|None)\b/g, 
                 '<span class="text-blue-600 font-semibold">$1</span>')
        // Strings
        .replace(/(['"`])(.*?)\1/g, 
                 '<span class="text-green-600">$1$2$1</span>')
        // Comments
        .replace(/(#.*$)/gm, 
                 '<span class="text-gray-500 italic">$1</span>')
        // Numbers
        .replace(/\b(\d+\.?\d*)\b/g, 
                 '<span class="text-orange-600">$1</span>');
};