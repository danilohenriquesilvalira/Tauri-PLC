import React from 'react';

interface FiltroProps {
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const Filtro: React.FC<FiltroProps> = ({ 
  side = 'direito',
  editMode = false
}) => {

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 42 108" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Conexão superior */}
        <path d="M22.0992 0.5H19.6094V2.67858H22.0992V0.5Z" fill="#373737" stroke="black"/>
        
        {/* Corpo do filtro - parte azul (água/líquido) */}
        <path d="M1.55469 102.109V29.4453H7.93412H10.2681H32.8295H35.319H40.4537V102.109C40.4537 102.109 38.1934 103.263 35.319 104.451C34.5245 104.779 33.6831 105.11 32.8295 105.419C31.2409 105.996 29.6102 106.499 28.1616 106.776C22.6711 107.828 19.3372 107.828 13.8468 106.776C12.728 106.562 11.5007 106.213 10.2681 105.8C9.48337 105.537 8.69651 105.248 7.93412 104.951C4.49555 103.61 1.55469 102.109 1.55469 102.109Z" fill="#4BCAFD"/>
        
        {/* Linhas do corpo */}
        <path d="M10.2681 29.4453H7.93412M10.2681 29.4453V105.8M10.2681 29.4453H32.8295M32.8295 29.4453H35.319M32.8295 29.4453V105.419M35.319 29.4453H40.4537V102.109C40.4537 102.109 38.1934 103.263 35.319 104.451M35.319 29.4453V104.451M7.93412 29.4453H1.55469V102.109C1.55469 102.109 4.49555 103.61 7.93412 104.951M7.93412 29.4453V104.951M32.8295 105.419C31.2409 105.996 29.6102 106.499 28.1616 106.776C22.6711 107.828 19.3372 107.828 13.8468 106.776C12.728 106.562 11.5007 106.213 10.2681 105.8M32.8295 105.419C33.6831 105.11 34.5245 104.779 35.319 104.451M10.2681 105.8C9.48337 105.537 8.69651 105.248 7.93412 104.951" stroke="black" strokeWidth="0.5"/>
        
        {/* Cabeça do filtro */}
        <path d="M41.701 16.2168V29.7534H0.3125V16.2168V2.67969H19.333H22.9849H41.701V16.2168Z" fill="#333333"/>
        
        {/* Linhas da cabeça */}
        <path d="M0.3125 16.2168H41.701M0.3125 16.2168V29.7534H41.701V16.2168M0.3125 16.2168V2.67969H19.333H22.9849H41.701V16.2168M0.3125 16.2168C0.3125 16.2168 0.312513 12.8355 6.76911 10.6595C9.83212 9.62724 14.3482 8.86624 21.0068 8.86624C41.701 8.86624 41.701 16.2168 41.701 16.2168" stroke="black" strokeWidth="0.5"/>
        
        {/* Suportes laterais */}
        <path d="M4.98438 0.8125V11.393L8.40749 10.1483V0.8125H4.98438Z" fill="#373737" stroke="black"/>
        <path d="M33.6016 0.8125V10.1483L37.0247 11.393V10.1483V0.8125H33.6016Z" fill="#373737" stroke="black"/>
        
        {/* Parafusos */}
        <circle cx="1.71174" cy="17.7742" r="1.71174" fill="black"/>
        <circle cx="40.2899" cy="17.7742" r="1.71174" fill="black"/>
      </svg>
    </div>
  );
};

export default Filtro;

// Componente estático - Filtro de processo
// Não requer animação, apenas representação visual