import React from 'react';

interface ValveDirecionalProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  editMode?: boolean;
  rotation?: number; // Ângulo de rotação em graus
  mirrored?: boolean; // Se deve ser espelhado
}

const ValveDirecional: React.FC<ValveDirecionalProps> = ({ 
  websocketBit = 0,
  editMode = false,
  rotation = 0,
  mirrored = false
}) => {

  // Define se a válvula está aberta baseado no bit
  const isOpen = (websocketBit === 1 || websocketBit === true);

  // Cria a transformação CSS
  const transform = `${mirrored ? 'scaleX(-1)' : ''} rotate(${rotation}deg)`.trim();

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 57 38" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transform: transform,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Corpo principal da válvula */}
        <rect 
          x="-0.1" 
          y="0.1" 
          width="43.8" 
          height="22.8" 
          transform="matrix(-1 8.74228e-08 8.74228e-08 1 43.8 7)" 
          fill={isOpen ? "#22C55E" : "#808080"}
          stroke="black" 
          strokeWidth="0.2"
          style={{ transition: 'fill 0.3s ease' }}
        />
        
        {/* Linha marrom - visível quando fechada (false) */}
        <path 
          d="M27 8L27 30" 
          stroke="#753E00" 
          strokeWidth="10"
          style={{ 
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Linha laranja - visível quando aberta (true) */}
        <path 
          d="M27 30L27 24L7 12.5L7 8" 
          stroke="#E95D00" 
          strokeWidth="10"
          style={{ 
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Conectores fixos */}
        <path 
          d="M20 30L33 30L33 37L20 37L20 30Z" 
          fill="#900000" 
          stroke="#900000"
        />
        <path 
          d="M20 1L33 0.999999L33 8L20 8L20 1Z" 
          fill="#900000" 
          stroke="#900000"
        />
        <path 
          d="M1 1L13 0.999999L13 8L1 8L1 1Z" 
          fill="#900000" 
          stroke="#900000"
        />
        
        {/* Indicador de status */}
        <path 
          d="M56 22H44V29.9023H56V22Z" 
          fill={isOpen ? "#22C55E" : "#808080"}
          stroke="black" 
          strokeWidth="0.2"
          style={{ transition: 'fill 0.3s ease' }}
        />
      </svg>
    </div>
  );
};

export default ValveDirecional;
