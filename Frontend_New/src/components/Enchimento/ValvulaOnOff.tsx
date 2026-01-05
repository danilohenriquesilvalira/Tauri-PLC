
import React from 'react';

interface ValvulaOnOffProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  editMode?: boolean;
}

const ValvulaOnOff: React.FC<ValvulaOnOffProps> = ({ 
  websocketBit = 0,
  editMode = false
}) => {
  
  // Define a cor da válvula de acordo com o bit (0/false = cinza, 1/true = verde)
  const corValvula = (websocketBit === 1 || websocketBit === true) ? "#00FF09" : "#808080";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 35 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Triângulo superior */}
        <path 
          d="M14.7559 27.8926H1.24414L8 16.1924L14.7559 27.8926Z" 
          fill={corValvula} 
          stroke="black" 
          strokeWidth="0.2"
          style={{
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        
        {/* Triângulo inferior */}
        <path 
          d="M14.7559 4.09961H1.24414L8 15.7998L14.7559 4.09961Z" 
          fill={corValvula} 
          stroke="black" 
          strokeWidth="0.2"
          style={{
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        
        {/* Corpo da válvula (lado direito) */}
        <path 
          d="M23.0005 28.1777L23.0005 4.21875C23.0005 4.21875 34.7539 5.30779 34.7539 16.1982C34.7539 27.0886 23.0005 28.1777 23.0005 28.1777Z" 
          fill={corValvula} 
          stroke="black" 
          strokeWidth="0.2"
          style={{
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        
        {/* Linha de conexão */}
        <path 
          d="M8 15.9922H23.0964" 
          stroke="black" 
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
};

export default ValvulaOnOff;