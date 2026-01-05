
import React from 'react';

interface CilindroEnchimentoProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const CilindroEnchimento: React.FC<CilindroEnchimentoProps> = ({ 
  websocketBit = 0,
  side = 'direito',
  editMode = false
}) => {
  
  // Define a cor do retângulo de acordo com o bit (0/false = marrom, 1/true = laranja)
  const corRetangulo = (websocketBit === 1 || websocketBit === true) ? "#FC6500" : "#753E00";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 108 371" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transform: side === 'esquerdo' ? 'scaleX(-1)' : 'none',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Retângulo central - muda de cor conforme o bit */}
        <path 
          d="M96 24.5V288.5H12.001L12.499 24.5H96Z" 
          fill={corRetangulo} 
          stroke="black"
          style={{
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        
        {/* Elementos fixos que sempre aparecem com as mesmas cores */}
        <path d="M96 24.5V20.5H99.5V5H96V1H12V5H8.5V20.5H12.5L12.5 24.5H90.0001H96Z" fill="black" stroke="black"/>
        <path d="M8 20.5V5H1V20.5H8Z" fill="#900000" stroke="#900000"/>
        <path d="M107 20.5V5H100V20.5H107Z" fill="#900000" stroke="#900000"/>
        <path d="M96 370.5V308.5H99.5V293H96V289H12V293H8.5V308.5H12.5L12.5 370.5H90.0001H96Z" fill="black" stroke="black"/>
        <path d="M8 308.5V293H1V308.5H8Z" fill="#900000" stroke="#900000"/>
        <path d="M107 308.5V293H100V308.5H107Z" fill="#900000" stroke="#900000"/>
      </svg>
    </div>
  );
};

export default CilindroEnchimento;

// Exemplo de uso:
// <CilindroEnchimento estado={0} /> -> Retângulo marrom (#753E00)
// <CilindroEnchimento estado={1} /> -> Retângulo laranja (#FC6500)
// <CilindroEnchimento estado={false} /> -> Retângulo marrom (#753E00)
// <CilindroEnchimento estado={true} /> -> Retângulo laranja (#FC6500)
