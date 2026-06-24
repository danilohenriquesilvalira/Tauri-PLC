import React, { createContext, useContext, useState, useEffect } from 'react';

type Fase =
  | 'IDLE'
  | 'ABRINDO'
  | 'ABERTO'
  | 'FECHANDO';

const DURACAO_MS: Record<Fase, number> = {
  IDLE:      4000,
  ABRINDO:   40000, // porta sobe / abre - contrapeso desce ao mesmo tempo (mesmo valor partilhado)
  ABERTO:    5000,
  FECHANDO:  40000, // porta desce / fecha - contrapeso sobe ao mesmo tempo
};

const FASES: Fase[] = ['IDLE', 'ABRINDO', 'ABERTO', 'FECHANDO'];

// Duração total de um ciclo completo - usada para calcular a fase a partir da hora absoluta.
const CYCLE_TOTAL_MS = FASES.reduce((sum, f) => sum + DURACAO_MS[f], 0);

export interface PortaMontanteSimValues {
  motorDireito: number;       // 0 parado, 1 a funcionar
  motorEsquerdo: number;
  reguaPortaMontante: number; // 0-100 (0=fechada, 100=aberta)
  contrapesoDireito: number;  // 0-100 = 100 - reguaPortaMontante (sempre o contrário:
  contrapesoEsquerdo: number; // porta sobe/abre ⇒ contrapeso desce, porta desce/fecha ⇒ contrapeso sobe)
  fase: Fase;
  faseLabel: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

const FASE_LABELS: Record<Fase, string> = {
  IDLE:      'FECHADA',
  ABRINDO:   'A ABRIR',
  ABERTO:    'ABERTA',
  FECHANDO:  'A FECHAR',
};

// Dado um instante absoluto (Date.now()), calcula em que fase do ciclo estamos e o progresso
// dentro dela. FUNÇÃO PURA do tempo (igual ao padrão usado em Eclusa/Enchimento) - qualquer
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

function computeValues(fase: Fase, p: number): PortaMontanteSimValues {
  let valor = 0;
  let motorOn = false;

  switch (fase) {
    case 'IDLE':
      valor = 0;
      break;
    case 'ABRINDO':
      valor = lerp(0, 100, p); // linear - velocidade constante
      motorOn = true;
      break;
    case 'ABERTO':
      valor = 100;
      break;
    case 'FECHANDO':
      valor = lerp(100, 0, p);
      motorOn = true;
      break;
  }

  return {
    motorDireito: motorOn ? 1 : 0,
    motorEsquerdo: motorOn ? 1 : 0,
    reguaPortaMontante: valor,
    contrapesoDireito: 100 - valor,
    contrapesoEsquerdo: 100 - valor,
    fase,
    faseLabel: FASE_LABELS[fase],
  };
}

const initialPhase = getFaseAtTime(Date.now());
const DEFAULT_VALUES = computeValues(initialPhase.fase, initialPhase.progress);

interface SimCtx {
  simulacaoAtiva: boolean;
  values: PortaMontanteSimValues;
}

const SimulacaoPortaMontanteContext = createContext<SimCtx>({
  simulacaoAtiva: true,
  values: DEFAULT_VALUES,
});

export const SimulacaoPortaMontanteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<PortaMontanteSimValues>(DEFAULT_VALUES);

  // setInterval (não requestAnimationFrame) - função pura do tempo amostrada
  // a cada 200ms, leve para o React, suficientemente fino para um curso de
  // 40s (200 passos). Mesmo padrão usado em Enchimento/Esvaziamento.
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
    <SimulacaoPortaMontanteContext.Provider value={{ simulacaoAtiva: true, values }}>
      {children}
    </SimulacaoPortaMontanteContext.Provider>
  );
};

export const useSimulacaoPortaMontante = () => useContext(SimulacaoPortaMontanteContext);
