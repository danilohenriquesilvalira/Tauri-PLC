import React from 'react';

interface ValvulaVerticalProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  editMode?: boolean;
}

const ValvulaVertical: React.FC<ValvulaVerticalProps> = ({
  websocketBit = 0,
  editMode = false
}) => {
  
  // Define se a válvula está aberta baseado no bit
  const isOpen = (websocketBit === 1 || websocketBit === true);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 41 43" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <path 
          d="M14 8L26 8L26 1L14 0.999999L14 8Z" 
          fill="#900000" 
          stroke="#900000"
        />
        
        <rect 
          x="8.1" 
          y="8.1" 
          width="24.8" 
          height="34.8" 
          fill={isOpen ? "#22C55E" : "#808080"}
          stroke="black" 
          strokeWidth="0.2"
          style={{ transition: 'fill 0.3s ease' }}
        />
        
        {/* Linha marrom - visível quando fechada (false) */}
        <path 
          d="M8.5 33C17.0915 33 23.4085 33 32 33" 
          stroke="#753E00" 
          strokeWidth="10"
          style={{ 
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Linha laranja - visível quando aberta (true) */}
        <path 
          d="M20 8V30.8679C20 31.9724 20.8954 32.8679 21.9999 32.8679L33 32.8682" 
          stroke="#FC6500" 
          strokeWidth="10"
          style={{ 
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        <path 
          d="M8 39V27H1V39H8Z" 
          fill="#900000" 
          stroke="#900000"
        />
        
        <path 
          d="M40 39V27H33V39H40Z" 
          fill="#900000" 
          stroke="#900000"
        />
      </svg>
    </div>
  );
};

export default ValvulaVertical;
