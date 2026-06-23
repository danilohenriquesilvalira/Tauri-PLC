import React from 'react';

interface BasePistaoEnchimentoProps {
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const BasePistaoEnchimento: React.FC<BasePistaoEnchimentoProps> = ({ 
  side = 'esquerdo',
  editMode = false 
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 298 470"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Espelhamento em UNIDADES DO VIEWBOX (não scaleX(-1) em %CSS no <svg>
            raiz) - evita depender de transform-origin percentual, que o
            Safari/WebKit (iOS) resolve de forma diferente do Chrome/Blink
            dentro de um foreignObject. */}
        <g style={{ transform: side === 'direito' ? 'scale(-1, 1) translate(-298px, 0px)' : 'none' }}>
          <image
            href="/Enchimento/Base_Cilindro_Enchimento.svg"
            width="298"
            height="470"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
};

export default BasePistaoEnchimento;