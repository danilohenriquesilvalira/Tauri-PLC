import React from 'react';

interface FiltroCarvaoProps {
  websocketValue: number; // 0 = fechado/inativo, 1 = aberto/ativo
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const FiltroCarvao: React.FC<FiltroCarvaoProps> = ({ 
  websocketValue = 0,
  side = 'direito',
  editMode = false
}) => {
  
  // Cor do contato baseada no valor websocket
  const getContatoColor = () => {
    switch (websocketValue) {
      case 1: return "#2ecc71"; // Verde - aberto/ativo
      default: return "#BEBDBB"; // Cinza - fechado/inativo
    }
  };

  const contatoColor = getContatoColor();

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 76 248" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transform: side === 'esquerdo' ? 'scaleX(1)' : 'scaleX(-1)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Parte superior - CONTATO - MUDA DE COR */}
        <path 
          d="M52.9373 8.62959C52.9373 0.25 44.6798 0.25 44.6798 0.25H30.4529C30.4529 0.25 22.1954 0.25 22.1954 8.62959V18.8265C22.1954 26.6003 29.856 26.6003 29.856 26.6003H45.2767C45.2767 26.6003 52.9373 26.6003 52.9373 18.8265V8.62959Z" 
          fill={contatoColor} 
          stroke="black" 
          strokeWidth="0.5"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Corpo principal azul */}
        <path d="M49.8242 39.1016H25.4492V44.5183C25.4492 44.5183 0.25 44.5183 0.25 69.7175V216.438H75.0234V69.7175C75.0234 44.5183 49.8242 44.5183 49.8242 44.5183V39.1016Z" fill="#2F00FA" stroke="black" strokeWidth="0.5"/>
        
        {/* Base preta */}
        <path d="M0.25 247.634V216.43H75.0234V247.634H0.25Z" fill="black" stroke="black" strokeWidth="0.5"/>
        
        {/* Conexão verde oliva */}
        <path d="M51.4053 39.0526H24.9567C24.9567 39.0526 21.4766 39.0526 21.4766 35.0614C21.4765 31.0701 21.4784 34.5918 21.4766 30.6006C21.4747 26.6094 25.4207 26.6094 25.4207 26.6094H51.4053C53.6825 27.9398 53.6825 30.6006 53.6825 30.6006V35.0614C53.6825 39.0526 51.4053 39.0526 51.4053 39.0526Z" fill="#7E8116" stroke="black" strokeWidth="0.5"/>
        
        {/* Setas amarelas */}
        <path d="M39.2224 36.0633V32.6484H35.2188V36.0633L37.2206 38.0651L39.2224 36.0633Z" fill="#FBFB36"/>
        <path d="M52.5291 36.0633V32.6484H48.5254V36.0633L50.5272 38.0651L52.5291 36.0633Z" fill="#FBFB36"/>
        <path d="M39.2224 36.0633V32.6484H35.2188V36.0633L37.2206 38.0651L39.2224 36.0633Z" stroke="black" strokeWidth="0.5"/>
        <path d="M52.5291 36.0633V32.6484H48.5254V36.0633L50.5272 38.0651L52.5291 36.0633Z" stroke="black" strokeWidth="0.5"/>
        <path d="M44.2933 29.1164L44.2933 32.5312L48.2969 32.5312L48.2969 29.1164L46.2951 27.1146L44.2933 29.1164Z" fill="#FBFB36"/>
        <path d="M44.2933 29.1164L44.2933 32.5312L48.2969 32.5312L48.2969 29.1164L46.2951 27.1146L44.2933 29.1164Z" fill="#FBFB36"/>
        <path d="M44.2933 29.1164L44.2933 32.5312L48.2969 32.5312L48.2969 29.1164L46.2951 27.1146L44.2933 29.1164Z" stroke="black" strokeWidth="0.5"/>
        <path d="M44.2933 29.1164L44.2933 32.5312L48.2969 32.5312L48.2969 29.1164L46.2951 27.1146L44.2933 29.1164Z" stroke="black" strokeWidth="0.5"/>
        
        {/* Display branco */}
        <path d="M46.1449 6.125H34.1487C34.1487 6.125 31.0587 6.125 31.0587 9.22172V12.7738C31.0587 12.7738 31.0587 15.8706 34.1487 15.8706H46.1449C49.2348 15.8706 49.2348 12.7738 49.2348 12.7738V9.22172C49.2348 6.125 46.1449 6.125 46.1449 6.125Z" fill="white"/>
        
        {/* Linhas e detalhes do display */}
        <path d="M26.3906 8.34215V15.2642M26.3906 20.1825V15.2642M26.3906 15.2642L40.7149 23.5525M34.1487 6.125H46.1449C46.1449 6.125 49.2348 6.125 49.2348 9.22172C49.2348 12.3184 49.2348 12.7738 49.2348 12.7738C49.2348 12.7738 49.2348 15.8706 46.1449 15.8706C43.0549 15.8706 37.2386 15.8706 34.1487 15.8706C31.0587 15.8706 31.0587 12.7738 31.0587 12.7738C31.0587 12.7738 31.0587 12.3184 31.0587 9.22172C31.0587 6.125 34.1487 6.125 34.1487 6.125Z" stroke="#616161" strokeWidth="0.5"/>
        
        {/* Barra azul do display */}
        <path d="M37.9297 11.3171V8.72656H46.4079V11.3171H37.9297Z" fill="#3B7EFA" stroke="#3F6A9A" strokeWidth="0.5"/>
        
        {/* Botões pretos */}
        <path d="M34.6328 15.5426V13.1875H36.3905V15.5426H34.6328Z" fill="black"/>
        <path d="M38.9125 15.5426V13.1875H40.5174V15.5426H38.9125Z" fill="black"/>
        <path d="M46.1727 15.5426H44.3385V13.1875H46.1727V15.5426Z" fill="black"/>
        <path d="M34.6328 15.5426V13.1875H36.3905V15.5426H34.6328Z" stroke="black" strokeWidth="0.5"/>
        <path d="M38.9125 15.5426V13.1875H40.5174V15.5426H38.9125Z" stroke="black" strokeWidth="0.5"/>
        <path d="M46.1727 15.5426H44.3385V13.1875H46.1727V15.5426Z" stroke="black" strokeWidth="0.5"/>
      </svg>
    </div>
  );
};

export default FiltroCarvao;

// Estados do filtro de carvão baseado no valor websocket:
// websocketValue = 0 -> Cinza #BEBDBB (fechado/inativo)
// websocketValue = 1 -> Verde #2ecc71 (aberto/ativo)