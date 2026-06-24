import React, { createContext, useContext, useState, useEffect } from 'react';

type Fase =
  | 'IDLE'
  | 'GATE_MONT_OPENING'
  | 'GATE_MONT_OPEN'
  | 'GATE_MONT_CLOSING'
  | 'DRAINING'
  | 'GATE_JUS_OPENING'
  | 'GATE_JUS_OPEN'
  | 'GATE_JUS_CLOSING'
  | 'FILLING';

const DURACAO_MS: Record<Fase, number> = {
  IDLE:               3000,
  GATE_MONT_OPENING:  8000,
  GATE_MONT_OPEN:     2500,
  GATE_MONT_CLOSING:  8000,
  DRAINING:           7000,
  GATE_JUS_OPENING:   8000,
  GATE_JUS_OPEN:      2500,
  GATE_JUS_CLOSING:   8000,
  FILLING:            7000,
};

const FASES: Fase[] = [
  'IDLE',
  'GATE_MONT_OPENING',
  'GATE_MONT_OPEN',
  'GATE_MONT_CLOSING',
  'DRAINING',
  'GATE_JUS_OPENING',
  'GATE_JUS_OPEN',
  'GATE_JUS_CLOSING',
  'FILLING',
];

// Duração total de um ciclo completo - usada para calcular a fase a partir da hora absoluta.
const CYCLE_TOTAL_MS = FASES.reduce((sum, f) => sum + DURACAO_MS[f], 0);

export interface EclusaSimValues {
  nivelCaldeira: number;        // 0–100 (percentagem para clip visual)
  nivelMontante: number;        // 0–100
  nivelJusante: number;         // 0–100
  nivelCaldeiraMt: number;      // metros para exibição nos cards
  nivelMontanteMt: number;
  nivelJusanteMt: number;
  portaMontante: number;        // 0–100%
  portaJusante: number;         // 0–100%
  valvulaMontante: boolean;
  valvulaJusante: boolean;
  sem: { verde: boolean; vermelho: boolean }[];  // [sem1, sem2, sem3, sem4]
  fase: Fase;
  faseLabel: string;
}

// Percentuais calibrados para alinhamento visual perfeito entre os componentes.
// Ambos partilham bottom em y=399 do viewBox principal, então:
//   Caldeira (y=281, h=118): y_surface = 399 − 118*(p/100)
//   Montante (y=281, h=100): y_surface = 381 − 100*(p/100)
//   Jusante  (y=359, h= 40): y_surface = 399 −  40*(p/100)
// Para alinhar superfícies: q_jus = p_cald × (118/40) = p_cald × 2.95
const CALD_ALTO  = 90;   // caldeira cheio   → y_surface ≈ 292.8 (cota 9.50m)
const CALD_BAIXO = 12;   // caldeira vazio   → y_surface ≈ 384.8 (cota 2.20m)
const MONT_PCT   = 88;   // montante fixo    → y_surface ≈ 293   (alinha com CALD_ALTO)
const JUS_PCT    = 35;   // jusante fixo     → y_surface ≈ 385   (alinha com CALD_BAIXO)

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// suavização ease-in-out para movimentos de porta e nível
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const FASE_LABELS: Record<Fase, string> = {
  IDLE:               'A AGUARDAR',
  GATE_MONT_OPENING:  'A ABRIR PORTA MONTANTE',
  GATE_MONT_OPEN:     'ENTRADA AUTORIZADA — MONTANTE',
  GATE_MONT_CLOSING:  'A FECHAR PORTA MONTANTE',
  DRAINING:           'A ESVAZIAR CALDEIRA',
  GATE_JUS_OPENING:   'A ABRIR PORTA JUSANTE',
  GATE_JUS_OPEN:      'SAÍDA AUTORIZADA — JUSANTE',
  GATE_JUS_CLOSING:   'A FECHAR PORTA JUSANTE',
  FILLING:            'A ENCHER CALDEIRA',
};

// Dado um instante absoluto (Date.now()), calcula em que fase do ciclo estamos e o progresso
// dentro dela. Isto é uma FUNÇÃO PURA do tempo - qualquer dispositivo, em qualquer lugar,
// a qualquer momento, calcula exactamente a mesma fase. Sem localStorage, sem estado por
// cliente: é assim que garantimos que telemóvel e portátil ficam sempre sincronizados.
function getFaseAtTime(timestampMs: number): { fase: Fase; progress: number } {
  let t = timestampMs % CYCLE_TOTAL_MS;
  for (const fase of FASES) {
    const dur = DURACAO_MS[fase];
    if (t < dur) return { fase, progress: t / dur };
    t -= dur;
  }
  return { fase: FASES[0], progress: 0 };
}

function computeValues(fase: Fase, p: number): EclusaSimValues {
  const red   = { verde: false, vermelho: true  };
  const green = { verde: true,  vermelho: false };

  let nivelCaldeira   = CALD_ALTO;
  let portaMontante   = 0;
  let portaJusante    = 0;
  let valvulaMontante = false;
  let valvulaJusante  = false;
  let sem = [red, red, red, red];

  switch (fase) {
    case 'IDLE':
      nivelCaldeira = CALD_ALTO;
      sem = [green, green, red, red];
      break;

    case 'GATE_MONT_OPENING':
      nivelCaldeira = CALD_ALTO;
      portaMontante = lerp(0, 100, ease(p));
      sem = [green, green, red, red];
      break;

    case 'GATE_MONT_OPEN':
      nivelCaldeira = CALD_ALTO;
      portaMontante = 100;
      sem = [green, green, red, red];
      break;

    case 'GATE_MONT_CLOSING':
      nivelCaldeira = CALD_ALTO;
      portaMontante = lerp(100, 0, ease(p));
      break;

    case 'DRAINING':
      nivelCaldeira  = lerp(CALD_ALTO, CALD_BAIXO, ease(p));
      valvulaJusante = true;
      break;

    case 'GATE_JUS_OPENING':
      nivelCaldeira = CALD_BAIXO;
      portaJusante  = lerp(0, 100, ease(p));
      sem = [red, red, green, green];
      break;

    case 'GATE_JUS_OPEN':
      nivelCaldeira = CALD_BAIXO;
      portaJusante  = 100;
      sem = [red, red, green, green];
      break;

    case 'GATE_JUS_CLOSING':
      nivelCaldeira = CALD_BAIXO;
      portaJusante  = lerp(100, 0, ease(p));
      break;

    case 'FILLING':
      nivelCaldeira   = lerp(CALD_BAIXO, CALD_ALTO, ease(p));
      valvulaMontante = true;
      break;
  }

  // Metro de exibição apenas para os cards de texto
  const caldMt = lerp(2.2, 9.5, (nivelCaldeira - CALD_BAIXO) / (CALD_ALTO - CALD_BAIXO));

  return {
    nivelCaldeira,
    nivelMontante: MONT_PCT,
    nivelJusante:  JUS_PCT,
    nivelCaldeiraMt: caldMt,
    nivelMontanteMt: 9.50,
    nivelJusanteMt:  2.20,
    portaMontante,
    portaJusante,
    valvulaMontante,
    valvulaJusante,
    sem,
    fase,
    faseLabel: FASE_LABELS[fase],
  };
}

const initialPhase = getFaseAtTime(Date.now());
const DEFAULT_VALUES = computeValues(initialPhase.fase, initialPhase.progress);

interface SimCtx {
  simulacaoAtiva: boolean;
  values: EclusaSimValues;
}

const SimulacaoContext = createContext<SimCtx>({
  simulacaoAtiva: true,
  values: DEFAULT_VALUES,
});

export const SimulacaoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<EclusaSimValues>(DEFAULT_VALUES);

  // setInterval (não requestAnimationFrame) - função pura do tempo amostrada
  // a cada 200ms, leve para o React. Re-renderizar tudo a 60x/segundo fazia
  // o browser perder frames. Mesmo padrão usado em Enchimento/Esvaziamento/
  // PortaMontante/PortaJusante.
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
    <SimulacaoContext.Provider value={{ simulacaoAtiva: true, values }}>
      {children}
    </SimulacaoContext.Provider>
  );
};

export const useSimulacao = () => useContext(SimulacaoContext);
