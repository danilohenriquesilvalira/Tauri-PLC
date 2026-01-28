import React from 'react';

interface ColunaPolimentoProps {
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const ColunaPolimento: React.FC<ColunaPolimentoProps> = ({ 
  side = 'direito',
  editMode = false
}) => {

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 76 233" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Cabeça/Tampa superior */}
        <path d="M54.1577 23.9297H21.3423C21.3423 23.9297 19.25 23.9297 19.25 20.2732V15.374C19.25 15.374 19.25 12.7074 23.8276 12.7074H26.1875C26.1875 12.7074 25.7812 5.92969 37.6019 5.92969C49.4226 5.92969 49.2365 12.7074 49.2365 12.7074H49.4226H51.6724C56.25 12.7074 56.25 15.374 56.25 15.374V20.2732C56.25 23.9297 54.1577 23.9297 54.1577 23.9297Z" fill="black" stroke="black"/>
        
        {/* Corpo principal azul */}
        <path d="M49.8242 23.7734H25.4492V29.1901C25.4492 29.1901 0.25 29.1901 0.25 54.3894V201.11H75.0234V54.3894C75.0234 29.1901 49.8242 29.1901 49.8242 29.1901V23.7734Z" fill="#2F00FA" stroke="black" strokeWidth="0.5"/>
        
        {/* Base preta */}
        <path d="M0.25 232.314V201.109H75.0234V232.314H0.25Z" fill="black" stroke="black" strokeWidth="0.5"/>
        
        {/* Linha de conexão superior */}
        <path d="M37.25 7.15625C44.8652 5.11515 49.1348 3.97079 56.75 1.92969" stroke="#BEBEBE" strokeWidth="4"/>
      </svg>
    </div>
  );
};

export default ColunaPolimento;

// Componente estático - Coluna de Polimento
// Não requer animação, apenas representação visual