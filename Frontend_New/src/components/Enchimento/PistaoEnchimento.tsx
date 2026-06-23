
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
  // resolve de forma diferente do Chrome/Blink. Altura do viewBox base = 470.
  const maxDeslocamentoPercent = 45; // reduzido (era 47.52%) - a 100% estava a bater na parte preta do topo
  const deslocamentoVerticalUnits = (valor / 100) * (maxDeslocamentoPercent / 100) * 470;

  // O deslocamento sobe até ~223 unidades, ou seja, a imagem passa a ocupar
  // y negativo dentro do seu próprio viewBox. Um <svg> recorta o que sai do
  // viewBox (igual a um foreignObject) - "overflow:visible" não é fiável no
  // Safari/WebKit (confirmado noutros componentes desta página), por isso a
  // correção real é alargar o viewBox para cima (margem extra = 224, um
  // pouco maior que o deslocamento máximo), e o componente pai (Enchimento.tsx)
  // compensa aumentando a caixa do foreignObject na mesma proporção, para o
  // tamanho/posição visual no resto da página não mudar.
  const MARGEM_TOPO = 224;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 -${MARGEM_TOPO} 298 ${470 + MARGEM_TOPO}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Espelhamento em UNIDADES DO VIEWBOX (não scaleX(-1) em %CSS no <svg>
            raiz) - evita depender de transform-origin percentual, que o
            Safari/WebKit (iOS) resolve de forma diferente do Chrome/Blink
            dentro de um foreignObject (causava o lado esquerdo "explodir"
            de tamanho só no iPhone real). */}
        <g style={{ transform: side === 'esquerdo' ? 'scale(-1, 1) translate(-298px, 0px)' : 'none' }}>
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
        </g>
      </svg>
    </div>
  );
};

export default PistaoEnchimento;