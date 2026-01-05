export interface FaultDefinition {
  wordIndex: number;
  bitIndex: number;
  equipment: string;
  description: string;
  type: 'AL' | 'EV'; // Alarm ou Event
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ActiveFault {
  wordIndex: number;
  bitIndex: number;
  equipment: string;
  description: string;
  type: 'AL' | 'EV';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  isActive: boolean;
}

export interface FaultCategory {
  name: string;
  equipment: string;
  color: string;
  icon: string;
}

// Mapeamento completo das falhas conforme sua lista
export const FAULT_DEFINITIONS: Record<string, FaultDefinition> = {
  // Word 17 - Enchimento
  '17_0': { wordIndex: 17, bitIndex: 0, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO 24VDC ENTRADAS ANALÓGICAS', type: 'AL', severity: 'HIGH' },
  '17_1': { wordIndex: 17, bitIndex: 1, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO DESCARREGADOR SOBRETENSÕES', type: 'AL', severity: 'HIGH' },
  '17_2': { wordIndex: 17, bitIndex: 2, equipment: 'AL_EnchimentoRG', description: 'DEFEITO DESCARREGADOR SOBRETENSÕES', type: 'AL', severity: 'MEDIUM' },
  '17_3': { wordIndex: 17, bitIndex: 3, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO ALIM. ANALISADOR ENERGIA', type: 'AL', severity: 'HIGH' },
  '17_4': { wordIndex: 17, bitIndex: 4, equipment: 'AL_EnchimentoRG', description: 'FALTA ALIMENTAÇÃO 220 VDC', type: 'AL', severity: 'CRITICAL' },
  '17_5': { wordIndex: 17, bitIndex: 5, equipment: 'AL_EnchimentoRG', description: 'FALHA COMUNICAÇÃO COM SALA DE COMANDO', type: 'AL', severity: 'HIGH' },
  '17_6': { wordIndex: 17, bitIndex: 6, equipment: 'AL_EnchimentoRG', description: 'BY-PASS CONDIÇÕES REMOTAS ABERTURA COMPORTAS ATIVADO!!!!!', type: 'AL', severity: 'CRITICAL' },
  '17_7': { wordIndex: 17, bitIndex: 7, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '17_8': { wordIndex: 17, bitIndex: 8, equipment: 'AL_EnchimentoRG', description: 'EMERGÊNCIA ATIVADA', type: 'AL', severity: 'CRITICAL' },
  '17_9': { wordIndex: 17, bitIndex: 9, equipment: 'AL_EnchimentoRG', description: 'DEFEITO/ALARME FONTE ALIMENTAÇÃO 400VAC/24VDC', type: 'AL', severity: 'HIGH' },
  '17_10': { wordIndex: 17, bitIndex: 10, equipment: 'AL_EnchimentoRG', description: 'DEFEITO/ALARME FONTE ALIMENTAÇÃO 220VDC/24VDC', type: 'AL', severity: 'HIGH' },
  '17_11': { wordIndex: 17, bitIndex: 11, equipment: 'AL_EnchimentoRG', description: 'DISPARO INTERRUPTOR GERAL ALIMENTAÇÃO 3X400VAC', type: 'AL', severity: 'CRITICAL' },
  '17_12': { wordIndex: 17, bitIndex: 12, equipment: 'AL_EnchimentoRG', description: 'FALTA ALIMENTAÇÃO FORÇA MOTRIZ 3X400VAC', type: 'AL', severity: 'CRITICAL' },
  '17_13': { wordIndex: 17, bitIndex: 13, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO 24VDC ENTRADAS DIGITAIS', type: 'AL', severity: 'HIGH' },
  '17_14': { wordIndex: 17, bitIndex: 14, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO 24VDC SAIDAS DIGITAIS', type: 'AL', severity: 'HIGH' },
  '17_15': { wordIndex: 17, bitIndex: 15, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO 24VDC QUADRO FORÇA MOTRIZ', type: 'AL', severity: 'HIGH' },

  // Word 18 - Enchimento (continuação)
  '18_0': { wordIndex: 18, bitIndex: 0, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '18_1': { wordIndex: 18, bitIndex: 1, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '18_2': { wordIndex: 18, bitIndex: 2, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '18_3': { wordIndex: 18, bitIndex: 3, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '18_4': { wordIndex: 18, bitIndex: 4, equipment: 'AL_EnchimentoRG', description: 'DEFEITO AUTOMATO ERRO DIAGNOSTICO', type: 'AL', severity: 'HIGH' },
  '18_5': { wordIndex: 18, bitIndex: 5, equipment: 'AL_EnchimentoRG', description: 'DEFEITO AUTOMATO ERRO PROGRAMA', type: 'AL', severity: 'HIGH' },
  '18_6': { wordIndex: 18, bitIndex: 6, equipment: 'AL_EnchimentoRG', description: 'DEFEITO AUTOMATO ERRO MODULOS', type: 'AL', severity: 'HIGH' },
  '18_7': { wordIndex: 18, bitIndex: 7, equipment: 'AL_EnchimentoRG', description: 'DEFEITO AUTOMATO ERRO BASTIDOR', type: 'AL', severity: 'HIGH' },
  '18_8': { wordIndex: 18, bitIndex: 8, equipment: 'AL_EnchimentoRG', description: 'DEFEITO RESPOSTA DE MARCHA BOMBA A COMPORTA DIREITA', type: 'AL', severity: 'MEDIUM' },
  '18_9': { wordIndex: 18, bitIndex: 9, equipment: 'AL_EnchimentoRG', description: 'DEFEITO ARRANCADOR SUAVE BOMBA A COMPORTA DIREITA', type: 'AL', severity: 'MEDIUM' },
  '18_10': { wordIndex: 18, bitIndex: 10, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO BOMBA A COMPORTA DIREITA', type: 'AL', severity: 'HIGH' },
  '18_11': { wordIndex: 18, bitIndex: 11, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO VALVULA DISTRIBUIÇÃO COMPORTA DIREITA', type: 'AL', severity: 'HIGH' },
  '18_12': { wordIndex: 18, bitIndex: 12, equipment: 'AL_EnchimentoRG', description: 'DISPARO PROTEÇÃO VALVULA DESCIDA COMPORTA DIREITA', type: 'AL', severity: 'HIGH' },
  '18_13': { wordIndex: 18, bitIndex: 13, equipment: 'AL_EnchimentoRG', description: 'DEFEITO MEDIDA DE POSIÇÃO COMPORTA DIREITA', type: 'AL', severity: 'MEDIUM' },
  '18_14': { wordIndex: 18, bitIndex: 14, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },
  '18_15': { wordIndex: 18, bitIndex: 15, equipment: 'AL_EnchimentoRG', description: 'RESERVA', type: 'AL', severity: 'LOW' },

  // Adicionar mais conforme necessário...
  // Por agora vou adicionar algumas palavras importantes para teste
  
  // Word 21 - Esvaziamento
  '21_0': { wordIndex: 21, bitIndex: 0, equipment: 'AL_Esvaziamento', description: 'DISPARO PROTEÇÃO 24VDC ENTRADAS ANALÓGICAS', type: 'AL', severity: 'HIGH' },
  '21_8': { wordIndex: 21, bitIndex: 8, equipment: 'AL_Esvaziamento', description: 'EMERGÊNCIA ATIVADA', type: 'AL', severity: 'CRITICAL' },

  // Word 25 - Porta Jusante
  '25_0': { wordIndex: 25, bitIndex: 0, equipment: 'AL_PortaJusante', description: 'DISPARO PROTEÇÃO 24VDC QUADROS FORÇA MOTRIZ', type: 'AL', severity: 'HIGH' },
  '25_8': { wordIndex: 25, bitIndex: 8, equipment: 'AL_PortaJusante', description: 'EMERGÊNCIA ATIVADA', type: 'AL', severity: 'CRITICAL' },

  // Word 30 - Porta Montante
  '30_0': { wordIndex: 30, bitIndex: 0, equipment: 'AL_PortaMontante', description: 'DISPARO PROTEÇÃO 24VDC QUADRO FORÇA MOTRIZ-PORTA MONTANTE', type: 'AL', severity: 'HIGH' },
  '30_8': { wordIndex: 30, bitIndex: 8, equipment: 'AL_PortaMontante', description: 'EMERGÊNCIA ATIVADA-PORTA MONTANTE', type: 'AL', severity: 'CRITICAL' },

  // Word 36 - Sala de Comando
  '36_8': { wordIndex: 36, bitIndex: 8, equipment: 'AL_SalaDeComando', description: 'EMERGÊNCIA ATIVADA QUADRO SALA DE COMANDO', type: 'AL', severity: 'CRITICAL' },

  // Word 43 - Esgoto e Drenagem
  '43_8': { wordIndex: 43, bitIndex: 8, equipment: 'AL_EsgotoDrenagem', description: 'EMERGÊNCIA ACTIVADA', type: 'AL', severity: 'CRITICAL' },
};

export const EQUIPMENT_CATEGORIES: Record<string, FaultCategory> = {
  'AL_EnchimentoRG': {
    name: 'Enchimento',
    equipment: 'Sistema de Enchimento',
    color: '#3b82f6',
    icon: 'ArrowUpCircle'
  },
  'AL_Esvaziamento': {
    name: 'Esvaziamento',
    equipment: 'Sistema de Esvaziamento',
    color: '#ef4444',
    icon: 'ArrowDownCircle'
  },
  'AL_PortaJusante': {
    name: 'Porta Jusante',
    equipment: 'Porta de Jusante',
    color: '#8b5cf6',
    icon: 'Shield'
  },
  'AL_PortaMontante': {
    name: 'Porta Montante',
    equipment: 'Porta de Montante',
    color: '#06b6d4',
    icon: 'ShieldCheck'
  },
  'AL_SalaDeComando': {
    name: 'Sala de Comando',
    equipment: 'Sala de Comando',
    color: '#f59e0b',
    icon: 'CommandLine'
  },
  'AL_EsgotoDrenagem': {
    name: 'Esgoto e Drenagem',
    equipment: 'Sistema de Esgoto e Drenagem',
    color: '#10b981',
    icon: 'Droplets'
  }
};