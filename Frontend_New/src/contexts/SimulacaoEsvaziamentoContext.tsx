import React, { createContext, useContext, useState, useEffect } from 'react';

type Fase =
  | 'IDLE'
  | 'BOMBA_LIGA'
  | 'ALINHAR_VALVULAS'
  | 'SUBINDO'
  | 'ABERTO'
  | 'DESCENDO';

const DURACAO_MS: Record<Fase, number> = {
  IDLE:              3000,
  BOMBA_LIGA:        2000,
  ALINHAR_VALVULAS:  2000,
  SUBINDO:           50000, // subida 0→100% bem lenta e a velocidade constante
  ABERTO:            5000,
  DESCENDO:          50000, // descida 100→0% na mesma velocidade constante
};

const FASES: Fase[] = [
  'IDLE',
  'BOMBA_LIGA',
  'ALINHAR_VALVULAS',
  'SUBINDO',
  'ABERTO',
  'DESCENDO',
];

// Duração total de um ciclo completo - usada para calcular a fase a partir da hora absoluta.
const CYCLE_TOTAL_MS = FASES.reduce((sum, f) => sum + DURACAO_MS[f], 0);

export interface EsvaziamentoSimValues {
  motorDireito: number;     // 0 parado, 1 a funcionar
  motorEsquerdo: number;
  pistaoDireito: number;    // 0-100%
  pistaoEsquerdo: number;   // 0-100% (sincronizado com o direito)
  posicaoMetros: number;    // 0 - CURSO_MAX_M (mesma posição para os 2 lados)
  velocidade: number;       // m/s, magnitude (>0 só enquanto sobe/desce)
  tempoAbertura: number;    // s, contador de subida (mantém o último valor até á próxima subida)
  tempoAberturaLenta: number; // s, janela inicial da subida (arranque)
  tempoFecho: number;       // s, contador de descida (mantém o último valor até á próxima descida)
  pumpRunning: boolean;     // bomba ligada (rodando)
  valvesOpen: boolean;      // válvulas direcionais/gaveta/flange/vertical alinhadas
  risingSlow: boolean;      // subida lenta (arranque/fim de curso)
  risingFast: boolean;      // subida rápida (grosso do curso)
  descending: boolean;      // a descer (qualquer velocidade)
  fase: Fase;
  faseLabel: string;
}

// Curso máximo do cilindro em metros - valor ilustrativo (não há calibração
// real disponível em modo simulação), só para os cards mostrarem um número
// plausível e coerente com a % de abertura.
const CURSO_MAX_M = 0.600;
const SUBIDA_DESCIDA_S = DURACAO_MS.SUBINDO / 1000; // 50s

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

const FASE_LABELS: Record<Fase, string> = {
  IDLE:              'A AGUARDAR',
  BOMBA_LIGA:        'A LIGAR BOMBA',
  ALINHAR_VALVULAS:  'A ALINHAR VÁLVULAS',
  SUBINDO:           'A ABRIR - PISTÃO A SUBIR',
  ABERTO:            'ESVAZIAMENTO EM CURSO',
  DESCENDO:          'A FECHAR - PISTÃO A DESCER',
};

// Dado um instante absoluto (Date.now()), calcula em que fase do ciclo estamos e o progresso
// dentro dela. FUNÇÃO PURA do tempo (igual ao SimulacaoContext da Eclusa) - qualquer
// dispositivo, em qualquer lugar, a qualquer momento, calcula exactamente a mesma fase.
function getFaseAtTime(timestampMs: number): { fase: Fase; progress: number } {
  let t = timestampMs % CYCLE_TOTAL_MS;
  for (const fase of FASES) {
    const dur = DURACAO_MS[fase];
    if (t < dur) return { fase, progress: t / dur };
    t -= dur;
  }
  return { fase: FASES[0], progress: 0 };
}

function computeValues(fase: Fase, p: number): EsvaziamentoSimValues {
  let pistao = 0;
  let pumpRunning = false;
  let valvesOpen = false;
  let risingSlow = false;
  let risingFast = false;
  let descending = false;

  // Contadores: contam enquanto a fase respetiva está ativa, e mantêm o
  // último valor (a duração total) fora dela - tal como um contador real de
  // PLC guarda "quanto tempo demorou a última abertura/fecho" até à
  // operação seguinte reiniciar a contagem.
  let tempoAbertura = SUBIDA_DESCIDA_S;
  let tempoFecho = SUBIDA_DESCIDA_S;
  let tempoAberturaLenta = 5;

  switch (fase) {
    case 'IDLE':
      pistao = 0;
      break;

    case 'BOMBA_LIGA':
      pistao = 0;
      pumpRunning = true;
      break;

    case 'ALINHAR_VALVULAS':
      pistao = 0;
      pumpRunning = true;
      valvesOpen = true;
      break;

    case 'SUBINDO':
      // Linear (sem ease) = velocidade constante, sobe "1 em 1" do início ao
      // fim, sem acelerar/desacelerar no meio do curso.
      pistao = lerp(0, 100, p);
      pumpRunning = true;
      valvesOpen = true;
      risingSlow = true;
      risingFast = true;
      tempoAbertura = p * SUBIDA_DESCIDA_S;
      tempoAberturaLenta = Math.min(p * SUBIDA_DESCIDA_S, 5);
      break;

    case 'ABERTO':
      pistao = 100;
      break;

    case 'DESCENDO':
      pistao = lerp(100, 0, p);
      pumpRunning = true;
      valvesOpen = true;
      descending = true;
      tempoFecho = p * SUBIDA_DESCIDA_S;
      break;
  }

  const posicaoMetros = (pistao / 100) * CURSO_MAX_M;
  const velocidade = (risingSlow || risingFast || descending) ? CURSO_MAX_M / SUBIDA_DESCIDA_S : 0;

  return {
    motorDireito: pumpRunning ? 1 : 0,
    motorEsquerdo: pumpRunning ? 1 : 0,
    pistaoDireito: pistao,
    pistaoEsquerdo: pistao,
    posicaoMetros,
    velocidade,
    tempoAbertura,
    tempoAberturaLenta,
    tempoFecho,
    pumpRunning,
    valvesOpen,
    risingSlow,
    risingFast,
    descending,
    fase,
    faseLabel: FASE_LABELS[fase],
  };
}

const initialPhase = getFaseAtTime(Date.now());
const DEFAULT_VALUES = computeValues(initialPhase.fase, initialPhase.progress);

interface SimCtx {
  simulacaoAtiva: boolean;
  values: EsvaziamentoSimValues;
}

const SimulacaoEsvaziamentoContext = createContext<SimCtx>({
  simulacaoAtiva: true,
  values: DEFAULT_VALUES,
});

export const SimulacaoEsvaziamentoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<EsvaziamentoSimValues>(DEFAULT_VALUES);

  // 🐢 setInterval em vez de requestAnimationFrame: a página de Esvaziamento é
  // pesada (várias dezenas de SVGs/foreignObjects) e re-renderizar tudo a
  // 60x/segundo fazia o browser perder frames - a subida do pistão aparecia
  // a "saltar" em vez de subir suavemente. Continua a ser uma função pura do
  // tempo (Date.now()), só que agora amostrada a cada 200ms em vez de a cada
  // frame - suficientemente fino para uma subida de 50s (250 passos), mas
  // muito mais leve para o React voltar a desenhar.
  useEffect(() => {
    const tick = () => {
      const { fase, progress } = getFaseAtTime(Date.now());
      setValues(computeValues(fase, progress));
    };
    tick();
    const intervalId = setInterval(tick, 200);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <SimulacaoEsvaziamentoContext.Provider value={{ simulacaoAtiva: true, values }}>
      {children}
    </SimulacaoEsvaziamentoContext.Provider>
  );
};

export const useSimulacaoEsvaziamento = () => useContext(SimulacaoEsvaziamentoContext);
