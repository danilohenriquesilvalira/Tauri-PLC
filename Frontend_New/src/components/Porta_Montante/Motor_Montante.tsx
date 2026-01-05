

import React from 'react';

interface MotorMontanteProps {
  websocketValue: number;
  editMode?: boolean;
  direction?: 'left' | 'right';
}

const MotorMontante: React.FC<MotorMontanteProps> = ({ 
  websocketValue = 0,
  editMode = false,
  direction = 'left'
}) => {
  // Detectar se é mobile
  const isMobile = window.innerWidth < 1024;

  // Tamanhos diferentes para desktop e mobile
  const svgWidth = isMobile ? "90" : "82";
  const svgHeight = isMobile ? "50" : "40";
  
  const currentStatus = websocketValue as (0 | 1 | 2);

  const getMainColor = () => {
    switch (currentStatus) {
      case 1: return "#2ecc71"; // Verde para operacional
      case 2: return "#e74c3c"; // Vermelho para falha
      default: return "#95a5a6"; // Cinza para inativo
    }
  };

  const mainColor = getMainColor();
  const secondaryColor = currentStatus === 1 ? "#27ae60" : (currentStatus === 2 ? "#c0392b" : "#7f8c8d");
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        viewBox="0 0 82 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ 
          transition: 'all 0.5s ease-in-out',
          transform: direction === 'right' ? 'scaleX(-1)' : 'none',
          transformOrigin: 'center'
        }}
      >
          <path d="M19.9999 9.45996H23.5334V26.3437H19.9999V9.45996Z" fill="url(#paint0_linear_1825_122)" stroke="#646567" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          {/* Corpo principal do motor */}
          <path d="M29.3816 1H71.6187V34.8046H29.3816V1Z" fill={mainColor} stroke="#8C8C91" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          <path d="M29.6913 4.49609H71.3911V10.2418H29.6913V4.49609Z" fill="url(#paint2_linear_1825_122)"/>
          <path d="M71.3706 1.09375H71.5359V34.731H71.3706V1.09375Z" fill="url(#paint3_linear_1825_122)"/>
          
          {/* Parte lateral esquerda */}
          <path d="M29.3816 31.5142L23.5337 28.3159V7.50882L29.3816 4.29199V31.5142Z" fill={secondaryColor} stroke="#8C8C91" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          <path d="M23.6574 13.1614L29.2573 11.7297V7.08105L23.6574 9.60989V13.1614Z" fill="url(#paint5_linear_1825_122)"/>
          
          {/* Parte lateral direita */}
          <path d="M81 32.722L71.6186 34.8046V1L81 3.08257V32.722Z" fill={secondaryColor} stroke="#8C8C91" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          <path d="M71.8667 10.2418L80.8555 11.2087V6.16959L71.8667 4.49609V10.2418Z" fill="url(#paint7_linear_1825_122)"/>
          <path d="M30.6008 2.9896L30.3115 3.21273V4.55153H31.7786V5.18374H66.9486V4.12386H30.5801V2.9896H30.6008ZM30.6008 8.43776H66.9692V10.0183H31.7993V8.86543H30.3321V7.52663L30.6214 7.3035V8.43776H30.6008ZM30.6008 1V2.09707H66.9692V3.04538H31.7993V2.58052H30.3321V1.24173L30.6008 1ZM30.6008 5.12795V6.2994H66.9692V7.35928H31.7993V6.70848H30.3321V5.36968L30.6008 5.12795ZM30.6008 9.9625V11.1153H66.9692V13.2165H31.7993V11.543H30.3321V10.2042L30.6008 9.9625ZM30.6008 13.1421V14.295H66.9692V16.3962H31.7993V14.7227H30.3321V13.3839L30.6008 13.1421ZM30.6008 16.3404V17.4932H66.9692V19.5944H31.7993V17.9209H30.3321V16.5635L30.6008 16.3404Z" fill="url(#paint8_linear_1825_122)"/>
          <path d="M66.9487 2.09707H30.5802V1H66.9487V2.09707ZM66.9487 4.14245H30.5802V3.04538H66.9487V4.14245ZM66.9487 6.2994H30.5802V5.20233H66.9487V6.2994ZM66.9487 8.43776H30.5802V7.34069H66.9487V8.43776ZM66.9487 11.1153H30.5802V10.0183H66.9487V11.1153ZM66.9487 14.295H30.5802V13.2165H66.9487V14.295ZM66.9487 17.4932H30.5802V16.3962H66.9487V17.4932Z" fill="url(#paint9_linear_1825_122)" stroke="#8C8C91" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          {/* Base do motor */}
          <path d="M34.1135 34.8057H67.7544V38.9894H34.1135V34.8057Z" fill="url(#paint10_linear_1825_122)" stroke="#8C8C91" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M34.1135 34.8057H67.7544V36.1259H34.1135V34.8057Z" fill="#646567" stroke="#646567" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M48.1648 38.9882V22.0859C48.1648 22.0859 47.9168 23.1086 46.6563 25.0796C46.6563 25.0796 46.4704 32.4802 45.0239 34.8045V38.9882H48.1648Z" fill="#646567" stroke="#646567" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          {/* Painel frontal do motor */}
          <path d="M48.165 22.1055H64.6135V39.0078H48.165V22.1055Z" fill={mainColor} stroke="#646567" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          <path d="M62.9603 23.0909C62.9603 23.3698 63.2083 23.593 63.5182 23.593C63.8282 23.593 64.0762 23.3698 64.0762 23.0909C64.0762 22.812 63.8282 22.5889 63.5182 22.5889C63.2083 22.5889 62.9603 22.812 62.9603 23.0909ZM49.2808 22.5889C49.5908 22.5889 49.8387 22.812 49.8387 23.0909C49.8387 23.3698 49.5908 23.593 49.2808 23.593C48.9709 23.593 48.7229 23.3698 48.7229 23.0909C48.7229 22.812 48.9709 22.5889 49.2808 22.5889ZM63.5182 37.483C63.8282 37.483 64.0762 37.7061 64.0762 37.985C64.0762 38.2639 63.8282 38.4871 63.5182 38.4871C63.2083 38.4871 62.9603 38.2639 62.9603 37.985C62.9603 37.7061 63.2083 37.483 63.5182 37.483ZM49.2808 37.483C49.5908 37.483 49.8387 37.7061 49.8387 37.985C49.8387 38.2639 49.5908 38.4871 49.2808 38.4871C48.9709 38.4871 48.7229 38.2639 48.7229 37.985C48.7229 37.7061 48.9709 37.483 49.2808 37.483Z" fill="url(#paint12_linear_1825_122)" stroke="#575756" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M62.5886 37.2964V23.7783H50.2109" stroke="white" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M50.2109 23.7783V37.2964H62.5886" stroke="#646567" strokeWidth="0.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          
          {/* Gradientes */}
          <defs>
            <linearGradient id="paint0_linear_1825_122" x1="21.7653" y1="8.92561" x2="21.7653" y2="21.2031" gradientUnits="userSpaceOnUse">
              <stop stopColor="#575756"/>
              <stop offset="0.0158648" stopColor="#5D5C5C"/>
              <stop offset="0.1171" stopColor="#797878"/>
              <stop offset="0.2183" stopColor="#8D8D8C"/>
              <stop offset="0.3189" stopColor="#999998"/>
              <stop offset="0.4178" stopColor="#9D9D9C"/>
              <stop offset="0.5402" stopColor="#979696"/>
              <stop offset="0.7122" stopColor="#848484"/>
              <stop offset="0.9127" stopColor="#676666"/>
              <stop offset="1" stopColor="#575756"/>
            </linearGradient>
            <linearGradient id="paint2_linear_1825_122" x1="50.5425" y1="5.00809" x2="50.5425" y2="7.37895" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="paint3_linear_1825_122" x1="71.4532" y1="20.0994" x2="71.4532" y2="33.8665" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ECECEC"/>
              <stop offset="0.1504" stopColor="#E8E8E8"/>
              <stop offset="0.3032" stopColor="#DCDCDC"/>
              <stop offset="0.4572" stopColor="#C7C7C7"/>
              <stop offset="0.612" stopColor="#ABABAB"/>
              <stop offset="0.7675" stopColor="#868686"/>
              <stop offset="0.9214" stopColor="#5A5A5A"/>
              <stop offset="1" stopColor="#404040"/>
            </linearGradient>
            <linearGradient id="paint5_linear_1825_122" x1="25.9806" y1="7.40073" x2="26.4687" y2="10.8722" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="paint7_linear_1825_122" x1="76.8263" y1="5.15045" x2="76.4738" y2="7.66402" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="paint8_linear_1825_122" x1="48.6263" y1="4.33769" x2="48.6263" y2="45.6186" gradientUnits="userSpaceOnUse">
              <stop stopColor="#666666"/>
              <stop offset="1" stopColor="#1A1A1A"/>
            </linearGradient>
            <linearGradient id="paint9_linear_1825_122" x1="48.771" y1="1.21577" x2="48.771" y2="34.8602" gradientUnits="userSpaceOnUse">
              <stop/>
              <stop offset="0.0475815"/>
              <stop offset="0.1509"/>
              <stop offset="0.2395"/>
              <stop offset="0.3025"/>
              <stop offset="0.4074"/>
              <stop offset="0.514"/>
              <stop offset="0.6214"/>
              <stop offset="0.7294"/>
              <stop offset="0.8378"/>
              <stop offset="0.9452"/>
              <stop offset="1"/>
            </linearGradient>
            <linearGradient id="paint10_linear_1825_122" x1="95.5562" y1="21.4568" x2="19.6094" y2="53.924" gradientUnits="userSpaceOnUse">
              <stop stopColor="white"/>
              <stop offset="1" stopColor="#7C7C7B"/>
            </linearGradient>
            <linearGradient id="paint12_linear_1825_122" x1="57.137" y1="29.7283" x2="44.9837" y2="46.2284" gradientUnits="userSpaceOnUse">
              <stop stopColor="#666666"/>
              <stop offset="1" stopColor="#1A1A1A"/>
            </linearGradient>
          </defs>
        </svg>
    </div>
  );
};

export default MotorMontante;