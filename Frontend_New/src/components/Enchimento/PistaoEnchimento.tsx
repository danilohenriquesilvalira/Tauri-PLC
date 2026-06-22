
import React from 'react';

interface PistaoEnchimentoProps {
  websocketValue: number;
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const PistaoEnchimento: React.FC<PistaoEnchimentoProps> = ({ 
  websocketValue = 0,
  side = 'direito',
  editMode = false
}) => {
  const valor = websocketValue;

  // Movimento vertical em UNIDADES DO VIEWBOX (não % CSS) - o transform é aplicado no
  // <g> do SVG, na coordenada interna do próprio SVG. Isto evita por completo a resolução
  // de altura percentual em cascata dentro do foreignObject, que Safari/WebKit (iOS)
  // resolve de forma diferente do Chrome/Blink. Altura do viewBox = 470.
  const maxDeslocamentoPercent = 47.52; // 47.52% da altura do viewBox (movimento aumentado em mais 10%)
  const deslocamentoVerticalUnits = (valor / 100) * (maxDeslocamentoPercent / 100) * 470;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 298 470"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{
          transform: side === 'esquerdo' ? 'scaleX(-1)' : 'none',
        }}
      >
        <g
          style={{
            transform: `translateY(-${deslocamentoVerticalUnits}px)`, // px aqui = unidades do viewBox (contexto SVG), não píxeis CSS
            transition: 'transform 0.5s ease-in-out',
          }}
        >
          <image
            href="/Enchimento/Pistao_enchimento.svg"
            width="298"
            height="470"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
};

export default PistaoEnchimento;