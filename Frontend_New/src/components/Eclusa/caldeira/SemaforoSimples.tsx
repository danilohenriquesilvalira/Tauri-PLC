import React from 'react';

interface SemaforoSimplesProps {
  ledVerde: boolean;
  ledVermelho: boolean;
  editMode?: boolean;
}

const SemaforoSimples: React.FC<SemaforoSimplesProps> = ({ 
  ledVerde,
  ledVermelho,
  editMode = false
}) => {
  return (
    <div className="w-full h-full">
      <svg width="100%" height="100%" viewBox="0 0 21 31" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 20H13V30.3971H8V20Z" fill="black"/>
        <path d="M21 6.42512V1.82205H16.0237V0H4.97631V1.82205H0V6.42512L4.97631 10.294V10.2944H0V14.8974L4.97631 18.7663V20H16.0237V18.7663L21 14.8974V10.2944H16.0237V10.294L21 6.42512ZM10.5 17.1488C8.91752 17.1488 7.63738 15.8487 7.63738 14.2451C7.63738 12.6415 8.91752 11.3442 10.5 11.3442C12.0825 11.3442 13.3626 12.6415 13.3626 14.2451C13.3626 15.8487 12.0825 17.1488 10.5 17.1488ZM10.5 8.65581C8.91752 8.65581 7.63738 7.35854 7.63738 5.7549C7.63738 4.15126 8.91752 2.85123 10.5 2.85123C12.0825 2.85123 13.3626 4.15126 13.3626 5.7549C13.3626 7.35854 12.0825 8.65581 10.5 8.65581Z" fill="black"/>
        
        {/* LED Verde - cinza quando desligado, verde quando ativo */}
        <circle 
          cx="10.5" 
          cy="5.5" 
          r="3.5" 
          fill={ledVerde ? "#00FF26" : "#666666"}
          style={{
            filter: ledVerde ? 'drop-shadow(0 0 8px #00FF26)' : 'none',
            transition: 'all 0.3s ease-in-out'
          }}
        />
        
        {/* LED Vermelho - cinza quando desligado, vermelho quando ativo */}
        <circle 
          cx="10.5" 
          cy="14.5" 
          r="3.5" 
          fill={ledVermelho ? "#FF000D" : "#666666"}
          style={{
            filter: ledVermelho ? 'drop-shadow(0 0 8px #FF000D)' : 'none',
            transition: 'all 0.3s ease-in-out'
          }}
        />
      </svg>
    </div>
  );
};

export default SemaforoSimples;