
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
  
  // Movimento vertical - PROPORCIONAL À ALTURA DO CONTAINER
  const maxDeslocamentoPercent = 47.52; // 47.52% da altura do container (movimento aumentado em mais 10%)
  const deslocamentoVertical = (valor / 100) * maxDeslocamentoPercent;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 298 470"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{
          transform: `translateY(-${deslocamentoVertical}%) ${side === 'esquerdo' ? 'scaleX(-1)' : ''}`,
          transition: 'transform 0.5s ease-in-out'
        }}
      >
        <image
          href="/Enchimento/Pistao_enchimento.svg"
          width="298"
          height="470"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
};

export default PistaoEnchimento;