/**
 * Template Parser para substituir tags {Word[N]} por valores reais do PLC
 * 
 * Exemplo:
 * - Template: "Velocidade: {Word[10]} km/h - Distância: {Word[11]} m"
 * - PlcData: { variables: { "Word[10]": 85, "Word[11]": 120 } }
 * - Resultado: "Velocidade: 85 km/h - Distância: 120 m"
 */

export interface PlcVariables {
  [key: string]: number;
}

/**
 * Substitui tags {Word[N]} no template pelos valores reais
 */
export function parseTemplate(template: string, variables: PlcVariables): string {
  if (!template) return '';
  
  // Regex para encontrar tags {Word[N]} onde N é um número
  const regex = /\{Word\[(\d+)\]\}/g;
  
  return template.replace(regex, (match, wordIndex) => {
    const key = `Word[${wordIndex}]`;
    const value = variables[key];
    
    // Se a variável existe no PLC, substitui pelo valor
    // Senão, mantém a tag para indicar que está aguardando dados
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Extrai todos os índices de Words usados no template
 * Útil para saber quais variáveis do PLC precisam ser monitoradas
 */
export function extractWordIndices(template: string): number[] {
  if (!template) return [];
  
  const regex = /\{Word\[(\d+)\]\}/g;
  const indices: number[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const index = parseInt(match[1], 10);
    if (!indices.includes(index)) {
      indices.push(index);
    }
  }
  
  return indices.sort((a, b) => a - b);
}

/**
 * Valida se o template tem sintaxe correta
 * Retorna array de erros (vazio se válido)
 */
export function validateTemplate(template: string): string[] {
  if (!template) return [];
  
  const errors: string[] = [];
  const regex = /\{Word\[(\d+)\]\}/g;
  let match;
  
  // Verifica se há { ou } desbalanceados
  const openBraces = (template.match(/\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Chaves desbalanceadas: { e } devem estar em pares');
  }
  
  // Verifica se todos os Word[] são válidos
  while ((match = regex.exec(template)) !== null) {
    const index = parseInt(match[1], 10);
    if (index < 0 || index > 63) {
      errors.push(`Word[${index}] inválido: índice deve estar entre 0 e 63`);
    }
  }
  
  // Verifica se há { sem fechar corretamente
  const invalidTags = template.match(/\{(?!Word\[\d+\]\})[^}]*\}/g);
  if (invalidTags) {
    errors.push(`Tags inválidas encontradas: ${invalidTags.join(', ')} - Use formato {Word[N]}`);
  }
  
  return errors;
}

/**
 * Gera preview do template com valores simulados
 */
export function previewTemplate(template: string): string {
  if (!template) return '';
  
  const regex = /\{Word\[(\d+)\]\}/g;
  
  return template.replace(regex, (match, wordIndex) => {
    // Valores simulados para preview
    const simulatedValue = Math.floor(Math.random() * 100);
    return String(simulatedValue);
  });
}
