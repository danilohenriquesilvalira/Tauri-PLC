/**
 * Utilitários para formatação de dados do PLC
 */

// Formatar números para exibição
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

// Converter número para hexadecimal
export const toHex = (value: number, padding: number = 4): string => {
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
};

// Converter número para binário
export const toBinary = (value: number, bits: number = 16): string => {
  return value.toString(2).padStart(bits, '0');
};

// Extrair bits ativos de um número
export const getActiveBits = (value: number, totalBits: number = 16): number[] => {
  const activeBits: number[] = [];
  for (let i = 0; i < totalBits; i++) {
    if ((value & (1 << i)) !== 0) {
      activeBits.push(i);
    }
  }
  return activeBits;
};

// Formatar timestamp
export const formatTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('pt-BR');
};

// Formatar data completa
export const formatDateTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('pt-BR');
};

// Calcular tempo decorrido
export const getTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 10) return 'agora';
  if (seconds < 60) return `${seconds}s atrás`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h atrás`;
};

// Obter cor baseada no status
export const getStatusColor = (isActive: boolean, type: 'status' | 'alarm' | 'event' = 'status'): string => {
  if (!isActive) return 'text-gray-400';
  
  switch (type) {
    case 'status':
      return 'text-blue-500';
    case 'alarm':
      return 'text-red-500';
    case 'event':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

// Formatar tamanho de bytes
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Validar valor numérico dentro de limites
export const validateNumericInput = (
  value: string, 
  min: number, 
  max: number
): { isValid: boolean; message?: string } => {
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Valor deve ser numérico' };
  }
  
  if (numValue < min || numValue > max) {
    return { isValid: false, message: `Valor deve estar entre ${min} e ${max}` };
  }
  
  return { isValid: true };
};

// Gerar ID único
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};