import React from 'react';

interface BombaPressurizacaoProps {
  websocketValue: number; // Valor do inteiro (0, 1, 2, 3)
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const BombaPressurizacao: React.FC<BombaPressurizacaoProps> = ({ 
  websocketValue = 0,
  side = 'direito',
  editMode = false
}) => {
  
  // Define colors based on websocket integer value (0, 1, 2, 3)
  const getMainColor = () => {
    switch (websocketValue) {
      case 1: return "#2ecc71"; // Verde para operacional
      case 2: return "#f39c12"; // Amarelo para manutenção
      case 3: return "#e74c3c"; // Vermelho para falha
      default: return "#AEAEAE"; // Cinza para inativo (0 ou outros valores)
    }
  };

  // Cor principal da bomba baseada no valor websocket
  const mainColor = getMainColor();
  
  // Cores secundárias que também mudam com o valor
  const getSecondaryColor = () => {
    switch (websocketValue) {
      case 1: return "#27ae60"; // Verde escuro para operacional
      case 2: return "#d68910"; // Amarelo escuro para manutenção
      case 3: return "#c0392b"; // Vermelho escuro para falha
      default: return "#8a8a8a"; // Cinza escuro para inativo
    }
  };
  
  const secondaryColor = getSecondaryColor();

  // Cor para detalhes/destaques
  const getHighlightColor = () => {
    switch (websocketValue) {
      case 1: return "#58d68d"; // Verde claro para operacional
      case 2: return "#f7dc6f"; // Amarelo claro para manutenção
      case 3: return "#ec7063"; // Vermelho claro para falha
      default: return "#c4c4c4"; // Cinza claro para inativo
    }
  };

  const highlightColor = getHighlightColor();

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 115 68" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transform: side === 'esquerdo' ? 'scaleX(1)' : 'scaleX(-1)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Base/Pés da bomba */}
        <path 
          d="M72.5971 55.8438H67.3758V59.7598H68.6811V64.1109H63.2422V66.7216H96.3107V64.1109H90.8718V59.7598H91.9596V55.8438H86.7383V59.7598H87.8261V64.1109H71.2918V59.7598H72.5971V55.8438Z" 
          fill="black" 
          stroke="black"
        />
        
        {/* Conexão superior da base */}
        <path 
          d="M66.719 55.4076C61.0625 55.4076 61.0625 52.7969 61.0625 52.7969H98.8704C98.8704 52.7969 98.8704 55.4076 94.3486 55.4076H66.719Z" 
          fill={secondaryColor} 
          stroke="black" 
          strokeWidth="0.3"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Corpo principal esquerdo da bomba - Muda de cor */}
        <path 
          d="M49.0986 15.375V48.226H32.7819H26.0376H19.0758H11.4614H5.36979V35.6077H2.10644V34.0848H0.148438V27.3406H2.10644V25.8177H5.36979V15.375H11.4614H19.0758H26.0376H32.7819H49.0986Z" 
          fill={mainColor}
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Linhas internas do corpo esquerdo */}
        <path 
          d="M11.4614 15.375H5.36979V35.6077M11.4614 15.375V48.226M11.4614 15.375H19.0758M11.4614 48.226H5.36979V35.6077M11.4614 48.226H19.0758M19.0758 15.375V48.226M19.0758 15.375H26.0376M19.0758 48.226H26.0376M26.0376 15.375V48.226M26.0376 15.375H32.7819M26.0376 48.226H32.7819M32.7819 15.375H49.0986V48.226H32.7819M32.7819 15.375V48.226M5.36979 35.6077H2.10644V34.0848H0.148438V27.3406H2.10644V25.8177H5.36979" 
          stroke="black" 
          strokeWidth="0.3"
        />
        
        {/* Conexão lateral */}
        <path 
          d="M2.97656 34.7371V26.6875H4.49946V34.7371H2.97656Z" 
          fill={highlightColor} 
          stroke="black" 
          strokeWidth="0.3"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Círculo principal (rotor/volante) - Muda de cor */}
        <circle 
          cx="97.6124" 
          cy="31.9093" 
          r="16.3843" 
          fill={mainColor} 
          stroke="black" 
          strokeWidth="0.3"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Corpo principal direito da bomba - Muda de cor */}
        <path 
          d="M49.3203 48.4431V15.3746L53.6714 11.0234H105.45L110.019 15.5921V19.9432V20.3784V24.2944V29.0806V34.0844V38.8706V43.6569V44.3096V48.4431L105.45 53.0118L53.6714 52.7943L49.3203 48.4431Z" 
          fill={mainColor}
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Linhas/grades do corpo direito */}
        <path 
          d="M53.6714 52.7942L49.3203 48.4431V15.3746L53.6714 11.0234M53.6714 52.7942L105.45 53.0118L110.019 48.4431M53.6714 52.7942V48.4431M53.6714 11.0234H105.45L110.019 15.5921M53.6714 11.0234V15.5921M110.019 15.5921H53.6714M110.019 15.5921V19.9432M110.019 48.4431V44.3096V43.6569M110.019 48.4431H53.6714M53.6714 15.5921V19.9432M53.6714 48.4431V43.6569M53.6714 43.6569H110.019M53.6714 43.6569V38.8706M110.019 43.6569V38.8706M53.6714 38.8706H110.019M53.6714 38.8706V34.0844M110.019 38.8706V34.0844M53.6714 34.0844H110.019M53.6714 34.0844V29.0806M110.019 34.0844V29.0806M53.6714 29.0806H110.019M53.6714 29.0806V24.2944M110.019 29.0806V24.2944M53.6714 24.2944H110.019M53.6714 24.2944V19.9432M110.019 24.2944V20.3784V19.9432M53.6714 19.9432H110.019" 
          stroke="black" 
          strokeWidth="0.3"
        />
        
        {/* Painel superior/tampa - Cor diferenciada */}
        <path 
          d="M66.2891 0.148438V11.0263H93.7012V0.148438H66.2891Z" 
          fill={secondaryColor} 
          stroke="black" 
          strokeWidth="0.3"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Indicadores/botões esquerdo */}
        <path 
          d="M71.0781 7.53863V3.1875H75.4293V7.53863H71.0781Z" 
          fill={highlightColor} 
          stroke="black" 
          strokeWidth="1.5"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Indicadores/botões direito */}
        <path 
          d="M85.4375 7.53863V3.1875H89.7886V7.53863H85.4375Z" 
          fill={highlightColor} 
          stroke="black" 
          strokeWidth="1.5"
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Conector/válvula superior */}
        <path 
          d="M33.6484 13.8558V15.1611H48.8774V13.8558H47.3545V10.5924H46.0491L46.042 9.03125H36.4186L36.4767 10.5924H34.9538V13.8558H33.6484Z" 
          fill={secondaryColor}
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
        
        {/* Elipse do conector */}
        <path 
          d="M41.2336 9.76959C43.891 9.76959 46.0453 9.43815 46.0453 9.02932C46.0453 8.6205 43.891 8.28906 41.2336 8.28906C38.5762 8.28906 36.4219 8.6205 36.4219 9.02932C36.4219 9.43815 38.5762 9.76959 41.2336 9.76959Z" 
          fill={highlightColor}
          style={{ transition: 'fill 0.3s ease-in-out' }}
        />
      </svg>
    </div>
  );
};

export default BombaPressurizacao;

// Estados da bomba baseado no valor websocket:
// websocketValue = 0 -> Cinza (inativo)
// websocketValue = 1 -> Verde (operando)
// websocketValue = 2 -> Amarelo (manutenção)
// websocketValue = 3 -> Vermelho (falha)