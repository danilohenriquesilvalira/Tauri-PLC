// components/Eclusa/PortaJusante.tsx - COMPONENTE PORTA JUSANTE COM WEBSOCKET
import React from 'react';

interface PortaJusanteProps {
  editMode?: boolean;
  websocketValue?: number | null;
  instant?: boolean; // true quando o valor já chega suavemente interpolado (ex: simulação) - desativa a transição CSS
}

export default function PortaJusante({
  editMode = false,
  websocketValue = null,
  instant = false
}: PortaJusanteProps) {
  // Calcula abertura diretamente do websocketValue - SEM useState para evitar animação no primeiro render
  const displayAbertura = React.useMemo(() => {
    if (websocketValue === null || editMode) return 0;
    // Converte valor da porta para porcentagem de abertura (0-100)
    return Math.max(0, Math.min(100, websocketValue));
  }, [websocketValue, editMode]);

  // Deslocamento em UNIDADES DO VIEWBOX (não % CSS) - transform aplicado no <g> do SVG,
  // na coordenada interna do próprio SVG. Evita a resolução de altura/largura percentual
  // em cascata dentro do foreignObject, que Safari/WebKit (iOS) resolve de forma diferente
  // do Chrome/Blink. Largura do viewBox = 85.
  // Porta só começa a aparecer quando abertura > 5%
  const deslocamentoHorizontalUnits = displayAbertura <= 5 ? 85 : 85 * (100 - displayAbertura) / 100;

  return (
    <div className="w-full h-full">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 85 181"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <g
          style={{
            transform: `translateX(${deslocamentoHorizontalUnits}px)`, // px aqui = unidades do viewBox (contexto SVG), não píxeis CSS
            transition: instant ? 'none' : 'transform 0.5s ease-in-out', // CSS só suaviza updates esparsos do PLC real
          }}
        >
          <image
            href="/Eclusa/Porta_jusante.svg"
            width="85"
            height="181"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
}
