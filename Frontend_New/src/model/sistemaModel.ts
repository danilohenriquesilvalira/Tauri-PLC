// src/model/sistemaModel.ts

export type SistemaState = {
  nivelEntrada: number;

  // Refatorado: Tanque Inibidor (Dosador Químico) e Tanque Pressurizado (Boia)
  nivelDosador: number; // Tanque pequeno com "remédio" (baixa lentamente com o uso)
  nivelTanquePressurizado: number; // O "pulo do gato" - Tanque que a bomba enche

  bombaLigada: boolean;
  osmoseLigada: boolean;

  // Sensores Digitais
  boiaTanqueCheio: boolean; // Boia do tanque final

  pressao: number; // Pressão da Bomba Principal
  pressaoSaida: number; // Pressão na Linha de Saída (PT)
  vazao: number;

  condutividade: number;
  redox: number;

  trechos: {
    t1: boolean;
    t2: boolean;
    t3: boolean;
    t4: boolean;
    t5: boolean;
    t6: boolean;
    t7: boolean;
  };
};

export const estadoInicial: SistemaState = {
  nivelEntrada: 30,
  nivelDosador: 100, // Começa cheio de produto químico
  nivelTanquePressurizado: 10,

  bombaLigada: false,
  osmoseLigada: false,
  boiaTanqueCheio: false,

  pressao: 0,
  pressaoSaida: 0,
  vazao: 0,

  condutividade: 0.5,
  redox: 250,

  trechos: {
    t1: false,
    t2: false,
    t3: false,
    t4: false,
    t5: false,
    t6: false,
    t7: false,
  },
};

export function simularSistema(
  s: SistemaState,
  velocidade: number
): SistemaState {
  const n = { ...s, trechos: { ...s.trechos } };

  // Parâmetros
  const NIVEL_ENTRADA_START = 90;
  const NIVEL_ENTRADA_STOP = 10;
  const PRESSAO_NOMINAL = 4.5;
  const PRESSAO_MIN_OPERAR = 3.0;

  // 1. ÁGUA DA RUA (Enche tanque entrada)
  if (n.nivelEntrada < 100) {
    n.nivelEntrada = Math.min(100, n.nivelEntrada + (0.08 * velocidade));
    n.trechos.t1 = true;
  } else {
    n.trechos.t1 = false;
  }

  // 2. ALARMES
  const alarmeSeco = n.nivelEntrada <= NIVEL_ENTRADA_STOP;
  const alarmeRedox = n.redox > 800 || n.redox < 100;
  const alarmeCondutividade = n.condutividade > 2.0;
  const sistemaEmFalha = alarmeSeco || alarmeRedox || alarmeCondutividade;

  // 3. BOMBA DE PRESSURIZAÇÃO
  // Trabalha para encher o Tanque Hidropneumático (que tem a Boia)
  const tanqueFinalCheio = n.nivelTanquePressurizado >= 98;
  const tanqueFinalPedeAgua = n.nivelTanquePressurizado <= 85;

  // Lógica da Boia (Histerese)
  if (!n.boiaTanqueCheio && tanqueFinalCheio) n.boiaTanqueCheio = true;
  if (n.boiaTanqueCheio && tanqueFinalPedeAgua) n.boiaTanqueCheio = false;

  // Lógica da Bomba
  if (!n.bombaLigada) {
    if (n.nivelEntrada >= NIVEL_ENTRADA_START && !n.boiaTanqueCheio && !sistemaEmFalha) {
      n.bombaLigada = true;
    }
  } else {
    if (alarmeSeco || n.boiaTanqueCheio || sistemaEmFalha) {
      n.bombaLigada = false;
    }
  }

  // 4. PRESSÃO E FLUXO PRINCIPAL
  if (n.bombaLigada) {
    if (n.pressao < PRESSAO_NOMINAL) n.pressao += 0.15 * velocidade;
    if (n.nivelEntrada > 0) n.nivelEntrada -= 0.15 * velocidade; // Consome água da entrada
  } else {
    if (n.pressao > 0) n.pressao = Math.max(0, n.pressao - 0.3 * velocidade);
  }

  const fluxoPrincipal = n.pressao >= PRESSAO_MIN_OPERAR;

  // Ativa os tubos da linha principal
  n.trechos.t2 = fluxoPrincipal; // Bomba -> Filtros
  n.trechos.t3 = fluxoPrincipal; // Filtros -> Carvão
  n.trechos.t4 = fluxoPrincipal; // Carvão -> Filtros
  n.osmoseLigada = fluxoPrincipal;
  n.trechos.t5 = fluxoPrincipal; // Filtros -> Osmose -> Tanque Final

  // 5. PROCESSAMENTO (Osmose + Dosador)
  if (n.osmoseLigada) {
    // Consumo do Inibidor de Incrustação (Gota a gota)
    if (n.nivelDosador > 0) n.nivelDosador -= 0.005 * velocidade;

    // Simulação Redox
    n.redox = 350 + (Math.sin(Date.now() / 3000) * 30) + (Math.random() * 5);

    // Produção de Água (Enche o Tanque Pressurizado)
    if (n.nivelTanquePressurizado < 100) {
      n.nivelTanquePressurizado = Math.min(100, n.nivelTanquePressurizado + (0.1 * velocidade));
    }
  } else {
    if (n.redox > 250) n.redox -= 0.5;
  }

  // 6. DISTRIBUIÇÃO (Do Tanque Pressurizado para o Ponto de Uso)
  // O tanque hidropneumático empurra a água para T6 e T7
  const pressaoHidropneumatica = (n.nivelTanquePressurizado / 100) * 3.5;

  // Simula consumo no ponto de uso (sempre que tiver pressão, o usuário gasta um pouco)
  const temPressaoParaUso = pressaoHidropneumatica > 1.0;

  n.trechos.t6 = temPressaoParaUso;
  n.trechos.t7 = temPressaoParaUso;

  if (temPressaoParaUso) {
    n.pressaoSaida = pressaoHidropneumatica;
    n.condutividade = 0.05 + (Math.random() * 0.02);

    // O uso consome água do tanque pressurizado
    n.nivelTanquePressurizado = Math.max(0, n.nivelTanquePressurizado - (0.05 * velocidade));
  } else {
    n.pressaoSaida = 0;
    n.condutividade = 0;
  }

  return n;
}

type Action =
  | { type: 'TICK'; velocidade: number }
  | { type: 'RESET' }
  | { type: 'SET_NIVEL_ENTRADA'; valor: number };

export function sistemaReducer(
  state: SistemaState,
  action: Action
): SistemaState {
  switch (action.type) {
    case 'TICK':
      return simularSistema(state, action.velocidade);
    case 'RESET':
      return estadoInicial;
    case 'SET_NIVEL_ENTRADA':
      return { ...state, nivelEntrada: action.valor };
    default:
      return state;
  }
}
