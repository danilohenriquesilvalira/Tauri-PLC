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
        style={{
          transform: side === 'direito' ? 'scaleX(-1)' : 'none'
        }}
      >
        <image
          href="/Enchimento/Base_Cilindro_Enchimento.svg"
          width="298"
          height="470"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
};

export default BasePistaoEnchimento;