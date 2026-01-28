// src/model/sistemaModel.ts
// Sistema de Tratamento de Água - Modelo Completo baseado no Esquema Elétrico PLC

// ============================================
// TIPOS E INTERFACES
// ============================================

export type SistemaState = {
  // ============ TANQUES E NÍVEIS ============
  nivelEntrada: number;           // Depósito de entrada (0-100%)
  nivelDosador: number;           // Inibidor de incrustação (0-100%)
  nivelTanqueFinal: number;       // Tanque pressurizado com boia (0-100%)

  // ============ ENTRADAS DIGITAIS - PROTEÇÕES (%I0.x) ============
  // TRUE = OK, FALSE = Disparo/Falha
  protBomba: boolean;             // %I0.2 - Proteção térmica bomba pressurização
  protDescalc1: boolean;          // %I0.3 - Proteção descalcificador 1 (ou Filtro 1)
  protDescalc2: boolean;          // %I0.4 - Proteção descalcificador 2 (ou Filtro 2)
  protFiltroCarvao: boolean;      // %I0.5 - Proteção filtro carvão ativado
  protRedox: boolean;             // %I0.6 - Proteção indicador Redox
  protOsmose: boolean;            // %I0.7 - Proteção sistema osmose
  protCondutivimetro: boolean;    // %I1.0 - Proteção condutivímetro

  // ============ ENTRADAS DIGITAIS - SENSORES (%I1.x, %I8.0) ============
  pressostatoBomba: boolean;      // %I1.2 - Pressostato (TRUE = pressão OK)
  boiaDeposito: boolean;          // %I8.0 - Boia tanque final (TRUE = cheio)

  // ============ ENTRADAS DIGITAIS - ALARMES (%I8.x) ============
  // TRUE = Alarme ativo, FALSE = Normal
  alarmeDescalc1: boolean;        // %I8.1 - Alarme descalcificador 1
  alarmeDescalc2: boolean;        // %I8.2 - Alarme descalcificador 2
  alarmeFiltroCarvao: boolean;    // %I8.3 - Alarme filtro carvão
  alarmeRedox: boolean;           // %I8.4 - Alarme Redox fora da faixa
  alarmeOsmose: boolean;          // %I8.5 - Alarme sistema osmose
  alarmeCondutivimetro: boolean;  // %I8.6 - Alarme condutividade alta

  // ============ ENTRADAS ANALÓGICAS (%IWxxx) ============
  redox: number;                  // %IW112 - Valor Redox (mV) - típico 200-800
  pressaoLinha: number;           // %IW114 - Pressão na linha (bar) - típico 0-6
  condutividade: number;          // %IW118 - Condutividade (µS/cm) - típico 0.01-5.0

  // ============ SAÍDAS DIGITAIS (%Q0.x) ============
  bombaRecirculacao: boolean;     // %Q0.0 - Comando bomba pressurização
  comandoOsmose: boolean;         // %Q0.1 - Comando auxiliar osmose
  pirilampoVerde: boolean;        // %Q0.2 - Indicação sistema OK
  pirilampoVermelho: boolean;     // %Q0.3 - Indicação alarme/falha
  corneta: boolean;               // %Q0.4 - Alarme sonoro

  // ============ PARÂMETROS CONFIGURÁVEIS ============
  parametros: {
    // Limites de Alarme
    maxRedox: number;             // Limite superior Redox (ex: 800 mV)
    minRedox: number;             // Limite inferior Redox (ex: 100 mV)
    maxCondutividade: number;     // Limite máximo condutividade (ex: 2.0 µS)

    // Setpoints Operacionais
    pressaoMinima: number;        // Pressão mínima para operar osmose (ex: 2.5 bar)
    pressaoNominal: number;       // Pressão nominal de operação (ex: 4.5 bar)

    // Níveis do Tanque de Entrada
    nivelBaixoEntrada: number;    // Nível baixo para parar bomba (ex: 15%)
    nivelAltoEntrada: number;     // Nível para permitir ligar bomba (ex: 30%)

    // Histerese da Boia do Tanque Final
    nivelBoiaLiga: number;        // Nível para pedir água (ex: 85%)
    nivelBoiaDesliga: number;     // Nível para parar de encher (ex: 98%)
  };

  // ============ OVERRIDES PARA SIMULAÇÃO ============
  overrides: {
    redox?: number;               // Força valor de Redox
    condutividade?: number;       // Força valor de condutividade
    pressaoLinha?: number;        // Força valor de pressão
  };

  // ============ VISUALIZAÇÃO DOS TRECHOS/TUBOS ============
  trechos: {
    t1: boolean;  // Alimentação → Depósito Entrada
    t2: boolean;  // Depósito → Bomba → Filtros
    t3: boolean;  // Filtros → Carvão
    t4: boolean;  // Carvão → Redox → Osmose
    t5: boolean;  // Osmose → Tanque Final
    t6: boolean;  // Tanque → Condutivímetro → Micro Filtração
    t7: boolean;  // Micro Filtração → Polimento → Ponto de Uso
  };

  // ============ ESTATÍSTICAS ============
  tempoOperacao: number;          // Segundos de operação
  ciclosCompletos: number;        // Quantas vezes encheu o tanque final
};

// ============================================
// ESTADO INICIAL
// ============================================

export const estadoInicial: SistemaState = {
  // Tanques
  nivelEntrada: 50,
  nivelDosador: 100,
  nivelTanqueFinal: 20,

  // Proteções (todas OK por padrão)
  protBomba: true,
  protDescalc1: true,
  protDescalc2: true,
  protFiltroCarvao: true,
  protRedox: true,
  protOsmose: true,
  protCondutivimetro: true,

  // Sensores Digitais
  pressostatoBomba: false,
  boiaDeposito: false,

  // Alarmes (nenhum ativo)
  alarmeDescalc1: false,
  alarmeDescalc2: false,
  alarmeFiltroCarvao: false,
  alarmeRedox: false,
  alarmeOsmose: false,
  alarmeCondutivimetro: false,

  // Valores Analógicos
  redox: 350,
  pressaoLinha: 0,
  condutividade: 0.05,

  // Saídas (tudo desligado)
  bombaRecirculacao: false,
  comandoOsmose: false,
  pirilampoVerde: false,
  pirilampoVermelho: false,
  corneta: false,

  // Parâmetros
  parametros: {
    maxRedox: 800,
    minRedox: 100,
    maxCondutividade: 2.0,
    pressaoMinima: 2.5,
    pressaoNominal: 4.5,
    nivelBaixoEntrada: 15,
    nivelAltoEntrada: 30,
    nivelBoiaLiga: 85,
    nivelBoiaDesliga: 98,
  },

  // Overrides vazios
  overrides: {},

  // Trechos (todos desligados)
  trechos: {
    t1: false,
    t2: false,
    t3: false,
    t4: false,
    t5: false,
    t6: false,
    t7: false,
  },

  // Estatísticas
  tempoOperacao: 0,
  ciclosCompletos: 0,
};

// ============================================
// FUNÇÃO DE SIMULAÇÃO PRINCIPAL
// ============================================

export function simularSistema(s: SistemaState, velocidade: number): SistemaState {
  const n: SistemaState = {
    ...s,
    trechos: { ...s.trechos },
    parametros: { ...s.parametros },
    overrides: { ...s.overrides },
  };

  // ========================================
  // 1. ALIMENTAÇÃO - ÁGUA DA RUA
  // ========================================
  // Simula entrada contínua de água no depósito de entrada
  if (n.nivelEntrada < 100) {
    n.nivelEntrada = Math.min(100, n.nivelEntrada + (0.08 * velocidade));
    n.trechos.t1 = true;
  } else {
    n.trechos.t1 = n.nivelEntrada < 100; // Só mostra fluxo se não estiver cheio
  }

  // ========================================
  // 2. VERIFICAÇÃO DE PROTEÇÕES TÉRMICAS
  // ========================================
  // Se qualquer proteção disparar, o sistema deve parar
  const protecoesOK =
    n.protBomba &&
    n.protDescalc1 &&
    n.protDescalc2 &&
    n.protFiltroCarvao &&
    n.protRedox &&
    n.protOsmose &&
    n.protCondutivimetro;

  // ========================================
  // 3. CÁLCULO DE ALARMES BASEADO NOS VALORES ANALÓGICOS
  // ========================================
  // Alarme de Redox: fora da faixa configurada
  n.alarmeRedox = n.redox > n.parametros.maxRedox || n.redox < n.parametros.minRedox;

  // Alarme de Condutividade: acima do limite
  n.alarmeCondutivimetro = n.condutividade > n.parametros.maxCondutividade;

  // Verificação geral de alarmes
  const alarmeAtivo =
    n.alarmeDescalc1 ||
    n.alarmeDescalc2 ||
    n.alarmeFiltroCarvao ||
    n.alarmeRedox ||
    n.alarmeOsmose ||
    n.alarmeCondutivimetro;

  // ========================================
  // 4. LÓGICA DA BOIA DO TANQUE FINAL (HISTERESE)
  // ========================================
  // A boia tem histerese para evitar liga-desliga constante
  if (n.nivelTanqueFinal >= n.parametros.nivelBoiaDesliga) {
    n.boiaDeposito = true;  // Tanque cheio - para de encher
  } else if (n.nivelTanqueFinal <= n.parametros.nivelBoiaLiga) {
    n.boiaDeposito = false; // Tanque precisa de água
  }
  // Entre 85% e 98%, mantém o estado anterior

  // ========================================
  // 5. LÓGICA DE COMANDO DA BOMBA (%Q0.0)
  // ========================================
  const condicoesLigarBomba =
    n.nivelEntrada > n.parametros.nivelAltoEntrada &&  // Tem água suficiente
    !n.boiaDeposito &&                                   // Tanque final não está cheio
    protecoesOK &&                                       // Proteções OK
    !alarmeAtivo;                                        // Sem alarmes

  const condicoesDesligarBomba =
    n.nivelEntrada <= n.parametros.nivelBaixoEntrada || // Acabou água
    n.boiaDeposito ||                                    // Tanque cheio
    !protecoesOK ||                                      // Proteção disparou
    alarmeAtivo;                                         // Alarme ativo

  // Lógica de ligar/desligar
  if (!n.bombaRecirculacao && condicoesLigarBomba) {
    n.bombaRecirculacao = true;
  }
  if (n.bombaRecirculacao && condicoesDesligarBomba) {
    n.bombaRecirculacao = false;
  }

  // ========================================
  // 6. FÍSICA DA PRESSÃO NA LINHA
  // ========================================
  if (n.bombaRecirculacao) {
    // Bomba ligada → Pressão sobe gradualmente até nominal
    if (n.pressaoLinha < n.parametros.pressaoNominal) {
      n.pressaoLinha = Math.min(
        n.parametros.pressaoNominal,
        n.pressaoLinha + (0.25 * velocidade)
      );
    }
    // Consome água do depósito de entrada
    n.nivelEntrada = Math.max(0, n.nivelEntrada - (0.12 * velocidade));
  } else {
    // Bomba desligada → Pressão cai rapidamente
    n.pressaoLinha = Math.max(0, n.pressaoLinha - (0.4 * velocidade));
  }

  // Aplica override de pressão se existir
  if (n.overrides.pressaoLinha !== undefined) {
    n.pressaoLinha = n.overrides.pressaoLinha;
  }

  // ========================================
  // 7. PRESSOSTATO (%I1.2)
  // ========================================
  // O pressostato é um contato digital que fecha quando pressão >= mínima
  n.pressostatoBomba = n.pressaoLinha >= n.parametros.pressaoMinima;

  // ========================================
  // 8. COMANDO DA OSMOSE (%Q0.1)
  // ========================================
  // Osmose só recebe comando se:
  // - Bomba está ligada
  // - Pressostato confirma pressão OK
  // - Não há alarme de Redox (água de entrada precisa estar OK)
  n.comandoOsmose = n.bombaRecirculacao && n.pressostatoBomba && !n.alarmeRedox;

  // ========================================
  // 9. PROCESSO DA OSMOSE E PRODUÇÃO DE ÁGUA
  // ========================================
  if (n.comandoOsmose) {
    // Osmose operando → Produz água tratada para o tanque final
    // A taxa de produção depende da pressão
    const eficienciaPressao = Math.min(1, (n.pressaoLinha - n.parametros.pressaoMinima) /
      (n.parametros.pressaoNominal - n.parametros.pressaoMinima));

    if (n.nivelTanqueFinal < 100) {
      n.nivelTanqueFinal = Math.min(
        100,
        n.nivelTanqueFinal + (0.12 * eficienciaPressao * velocidade)
      );
    }

    // Simula variação do Redox durante operação (se não houver override)
    if (n.overrides.redox === undefined) {
      // Redox varia naturalmente entre 300-400 mV durante operação normal
      const variacao = Math.sin(Date.now() / 3000) * 30 + (Math.random() * 10 - 5);
      n.redox = 350 + variacao;
    }

    // Consome inibidor de incrustação proporcionalmente ao fluxo
    if (n.nivelDosador > 0) {
      n.nivelDosador = Math.max(0, n.nivelDosador - (0.003 * eficienciaPressao * velocidade));
    }

    // Contador de tempo de operação
    n.tempoOperacao += velocidade * 0.1;
  } else {
    // Osmose parada → Redox tende a estabilizar
    if (n.overrides.redox === undefined && n.redox > 300) {
      n.redox = Math.max(300, n.redox - (0.5 * velocidade));
    }
  }

  // Aplica override de Redox se existir
  if (n.overrides.redox !== undefined) {
    n.redox = n.overrides.redox;
  }

  // ========================================
  // 10. DISTRIBUIÇÃO - CONSUMO NO PONTO DE USO
  // ========================================
  // Simula consumo contínuo de água tratada
  const temPressaoParaUso = n.nivelTanqueFinal > 10;

  if (temPressaoParaUso) {
    // Consome água do tanque final
    n.nivelTanqueFinal = Math.max(0, n.nivelTanqueFinal - (0.06 * velocidade));

    // Condutividade da água de saída (baixa = boa qualidade)
    if (n.overrides.condutividade === undefined) {
      // Água tratada tem condutividade muito baixa (0.01-0.1 µS típico)
      n.condutividade = 0.03 + (Math.random() * 0.04);
    }
  } else {
    // Sem água → Condutividade não mensurável
    if (n.overrides.condutividade === undefined) {
      n.condutividade = 0;
    }
  }

  // Aplica override de condutividade se existir
  if (n.overrides.condutividade !== undefined) {
    n.condutividade = n.overrides.condutividade;
  }

  // Contador de ciclos (cada vez que tanque enche)
  if (n.nivelTanqueFinal >= 98 && s.nivelTanqueFinal < 98) {
    n.ciclosCompletos += 1;
  }

  // ========================================
  // 11. SINALIZADORES (%Q0.2, %Q0.3, %Q0.4)
  // ========================================
  // Pirilampo Verde: Sistema operando normalmente
  n.pirilampoVerde = protecoesOK && !alarmeAtivo && (n.bombaRecirculacao || n.nivelTanqueFinal > 50);

  // Pirilampo Vermelho: Algum problema
  n.pirilampoVermelho = !protecoesOK || alarmeAtivo;

  // Corneta: Alarme sonoro (pode ter lógica de silenciar)
  n.corneta = n.pirilampoVermelho;

  // ========================================
  // 12. VISUALIZAÇÃO DOS TRECHOS DE TUBULAÇÃO
  // ========================================
  // T1: Alimentação (já definido acima)

  // T2: Depósito → Filtros (quando bomba liga)
  n.trechos.t2 = n.bombaRecirculacao;

  // T3: Filtros → Carvão (quando bomba liga)
  n.trechos.t3 = n.bombaRecirculacao;

  // T4: Carvão → Osmose (quando bomba liga e pressão subindo)
  n.trechos.t4 = n.bombaRecirculacao;

  // T5: Osmose → Tanque (só quando osmose produzindo)
  n.trechos.t5 = n.comandoOsmose;

  // T6: Tanque → Condutivímetro → Micro Filtração
  n.trechos.t6 = temPressaoParaUso;

  // T7: Polimento → Ponto de Uso
  n.trechos.t7 = temPressaoParaUso;

  return n;
}

// ============================================
// TIPOS DE AÇÕES DO REDUCER
// ============================================

type Action =
  | { type: 'TICK'; velocidade: number }
  | { type: 'RESET' }
  | { type: 'SET_NIVEL_ENTRADA'; valor: number }
  | { type: 'SET_NIVEL_TANQUE_FINAL'; valor: number }
  | { type: 'SET_NIVEL_DOSADOR'; valor: number }
  | { type: 'TOGGLE_PROTECAO'; protecao: keyof Pick<SistemaState, 'protBomba' | 'protDescalc1' | 'protDescalc2' | 'protFiltroCarvao' | 'protRedox' | 'protOsmose' | 'protCondutivimetro'> }
  | { type: 'TOGGLE_ALARME'; alarme: keyof Pick<SistemaState, 'alarmeDescalc1' | 'alarmeDescalc2' | 'alarmeFiltroCarvao' | 'alarmeRedox' | 'alarmeOsmose' | 'alarmeCondutivimetro'> }
  | { type: 'UPDATE_PARAMETRO'; chave: keyof SistemaState['parametros']; valor: number }
  | { type: 'SET_OVERRIDE'; sensor: 'redox' | 'condutividade' | 'pressaoLinha'; valor: number | undefined }
  | { type: 'SILENCIAR_CORNETA' };

// ============================================
// REDUCER
// ============================================

export function sistemaReducer(state: SistemaState, action: Action): SistemaState {
  switch (action.type) {
    case 'TICK':
      return simularSistema(state, action.velocidade);

    case 'RESET':
      return estadoInicial;

    case 'SET_NIVEL_ENTRADA':
      return { ...state, nivelEntrada: Math.max(0, Math.min(100, action.valor)) };

    case 'SET_NIVEL_TANQUE_FINAL':
      return { ...state, nivelTanqueFinal: Math.max(0, Math.min(100, action.valor)) };

    case 'SET_NIVEL_DOSADOR':
      return { ...state, nivelDosador: Math.max(0, Math.min(100, action.valor)) };

    case 'TOGGLE_PROTECAO':
      return { ...state, [action.protecao]: !state[action.protecao] };

    case 'TOGGLE_ALARME':
      return { ...state, [action.alarme]: !state[action.alarme] };

    case 'UPDATE_PARAMETRO':
      return {
        ...state,
        parametros: { ...state.parametros, [action.chave]: action.valor }
      };

    case 'SET_OVERRIDE':
      const newOverrides = { ...state.overrides };
      if (action.valor === undefined) {
        delete newOverrides[action.sensor];
      } else {
        newOverrides[action.sensor] = action.valor;
      }
      return { ...state, overrides: newOverrides };

    case 'SILENCIAR_CORNETA':
      return { ...state, corneta: false };

    default:
      return state;
  }
}

// ============================================
// HELPERS PARA A UI
// ============================================

export function getStatusGeral(state: SistemaState): 'PARADO' | 'OPERANDO' | 'ALARME' | 'FALHA' {
  const protecoesOK =
    state.protBomba &&
    state.protDescalc1 &&
    state.protDescalc2 &&
    state.protFiltroCarvao &&
    state.protRedox &&
    state.protOsmose &&
    state.protCondutivimetro;

  if (!protecoesOK) return 'FALHA';

  const alarmeAtivo =
    state.alarmeDescalc1 ||
    state.alarmeDescalc2 ||
    state.alarmeFiltroCarvao ||
    state.alarmeRedox ||
    state.alarmeOsmose ||
    state.alarmeCondutivimetro;

  if (alarmeAtivo) return 'ALARME';
  if (state.bombaRecirculacao) return 'OPERANDO';
  return 'PARADO';
}

export function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}