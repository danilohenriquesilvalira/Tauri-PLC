import React from 'react';

interface ValvulaFlangeProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  editMode?: boolean;
}

const ValvulaFlange: React.FC<ValvulaFlangeProps> = ({
  websocketBit = 0,
  editMode = false
}) => {
  
  // Define a cor da válvula flange de acordo com o bit (0/false = cinza, 1/true = laranja)
  const corValvulaFlange = (websocketBit === 1 || websocketBit === true) ? "#FD6500" : "#808080";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 15 22" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Corpo principal da válvula flange */}
        <path 
          d="M0.909091 0.75H13.2412C13.6019 1.62868 13.6394 2.12132 14 3V19.0466L13.0846 21.75L13 22H1L0.915351 21.75L0 19.0466V3L0.909091 0.75Z" 
          fill={corValvulaFlange}
          style={{
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        
        {/* Topo preto */}
        <path 
          d="M13 0H0.909091L0 3L14 3L13 0Z" 
          fill="black"
        />
        
        {/* Base preta */}
        <path 
          d="M1 22L13 22L14 19L2.62268e-07 19L1 22Z" 
          fill="black"
        />
      </svg>
    </div>
  );
};

export default ValvulaFlange;
