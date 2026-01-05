import React from 'react';

interface ContraPeso20tProps {
  websocketValue: number;
  editMode?: boolean;
}

const ContraPeso20t: React.FC<ContraPeso20tProps> = ({ 
  websocketValue = 0, 

}) => {
  const valor = websocketValue;
  
  // COMPONENTE 100% ORIGINAL - sem movimento CSS adicional
  const maxDescida = 350;
  const posicaoContrapeso = (valor * maxDescida) / 100;
  
  // Altura da corda - do topo até o ponto de conexão
  const pontoConexaoOriginal = 20;
  const alturaCorda = pontoConexaoOriginal + posicaoContrapeso;

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* SVG IGUAL A RÉGUA - sem limitação fixa */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 109 600" 
        preserveAspectRatio="xMidYMid meet"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Contrapeso COM MOVIMENTO INTERNO ORIGINAL */}
        <g transform={`translate(0, ${posicaoContrapeso})`}>
          <path d="M92.3634 164.267C102.495 162.528 108.18 160.17 108.168 157.711L1.3319 157.727C1.35686 160.185 5.71836 162.532 15.8759 164.27C26.0333 166.008 39.7967 166.984 54.1399 166.983C68.4831 166.982 82.2319 166.005 92.3634 164.267Z" fill="url(#paint0_linear_3776_4079)"/>
          <path d="M92.3634 163.04C102.495 161.301 108.18 158.943 108.168 156.484L1.3319 156.5C1.35686 158.959 5.71836 161.306 15.8759 163.044C26.0333 164.781 39.7967 165.757 54.1399 165.757C68.4831 165.756 82.2319 164.779 92.3634 163.04Z" fill="url(#paint1_linear_3776_4079)"/>
          <path d="M1.15688 157.306H107.988L107.727 17H1.15688V157.306Z" fill="url(#paint2_linear_3776_4079)"/>
          <path d="M54.5781 8.44531C39.7975 8.44533 26.4269 9.67921 16.7607 11.6699C11.9245 12.6659 8.03518 13.8479 5.36426 15.1484C4.02807 15.7991 3.01646 16.4704 2.34375 17.1475C1.67215 17.8234 1.36426 18.4778 1.36426 19.1074C1.36436 19.7369 1.6722 20.3915 2.34375 21.0674C3.01649 21.7444 4.02815 22.4158 5.36426 23.0664C8.03517 24.3669 11.9246 25.5479 16.7607 26.5439C26.4269 28.5347 39.7975 29.7685 54.5781 29.7686C69.359 29.7686 82.7303 28.5347 92.3965 26.5439C97.2323 25.548 101.121 24.3668 103.792 23.0664C105.128 22.4158 106.141 21.7445 106.813 21.0674C107.485 20.3915 107.793 19.7369 107.793 19.1074C107.793 18.4779 107.485 17.8234 106.813 17.1475C106.141 16.4704 105.128 15.7991 103.792 15.1484C101.121 13.848 97.2324 12.6659 92.3965 11.6699C82.7303 9.67916 69.359 8.44531 54.5781 8.44531Z" fill="url(#paint3_linear_3776_4079)" stroke="#C0C0C0" strokeWidth="0.75"/>
          <path d="M31.3457 100V96.96L38.8337 89.152C39.7724 88.1707 40.4657 87.264 40.9137 86.432C41.3617 85.6 41.5857 84.7467 41.5857 83.872C41.5857 82.784 41.2444 81.9627 40.5617 81.408C39.879 80.8533 38.887 80.576 37.5857 80.576C36.5404 80.576 35.5377 80.768 34.5777 81.152C33.6177 81.5147 32.679 82.0907 31.7617 82.88L30.4177 79.808C31.335 78.9973 32.4657 78.3467 33.8097 77.856C35.175 77.3653 36.6044 77.12 38.0977 77.12C40.5297 77.12 42.3964 77.664 43.6977 78.752C44.999 79.84 45.6497 81.3973 45.6497 83.424C45.6497 84.832 45.319 86.176 44.6577 87.456C43.9964 88.7147 42.9724 90.0373 41.5857 91.424L35.3457 97.664V96.576H46.5457V100H31.3457ZM57.6372 100.32C54.9919 100.32 52.9545 99.3173 51.5252 97.312C50.0959 95.2853 49.3812 92.4053 49.3812 88.672C49.3812 84.896 50.0959 82.0267 51.5252 80.064C52.9545 78.1013 54.9919 77.12 57.6372 77.12C60.3039 77.12 62.3412 78.1013 63.7492 80.064C65.1785 82.0267 65.8932 84.8853 65.8932 88.64C65.8932 92.3947 65.1785 95.2853 63.7492 97.312C62.3412 99.3173 60.3039 100.32 57.6372 100.32ZM57.6372 96.928C59.0879 96.928 60.1652 96.2667 60.8692 94.944C61.5732 93.6 61.9252 91.4987 61.9252 88.64C61.9252 85.7813 61.5732 83.712 60.8692 82.432C60.1652 81.1307 59.0879 80.48 57.6372 80.48C56.2079 80.48 55.1305 81.1307 54.4052 82.432C53.7012 83.712 53.3492 85.7813 53.3492 88.64C53.3492 91.4987 53.7012 93.6 54.4052 94.944C55.1305 96.2667 56.2079 96.928 57.6372 96.928ZM76.3127 100.32C74.3927 100.32 72.942 99.8187 71.9607 98.816C70.9794 97.8133 70.4887 96.3093 70.4887 94.304V86.848H67.3847V83.84H70.4887V79.712L74.4887 78.688V83.84H78.8087V86.848H74.4887V94.048C74.4887 95.1573 74.702 95.936 75.1287 96.384C75.5554 96.832 76.142 97.056 76.8887 97.056C77.294 97.056 77.6354 97.024 77.9127 96.96C78.2114 96.896 78.4994 96.8107 78.7767 96.704V99.872C78.414 100.021 78.0087 100.128 77.5607 100.192C77.134 100.277 76.718 100.32 76.3127 100.32Z" fill="black"/>
        </g>
        
        {/* Corda NA FRENTE - ORIGINAL */}
        <rect 
          width="10" 
          height={alturaCorda}
          x="49"
          y="0"
          fill="black"
          style={{ zIndex: 999 }}
        />
        
        {/* Círculo preto de conexão NA FRENTE - ORIGINAL */}
        <ellipse 
          cx="54" 
          cy={20 + posicaoContrapeso} 
          rx="13.4706" 
          ry="2.45262" 
          fill="black"
          style={{ zIndex: 1000 }}
        />
        
        <defs>
          <linearGradient id="paint0_linear_3776_4079" x1="1.57692" y1="158.49" x2="108.168" y2="158.549" gradientUnits="userSpaceOnUse">
            <stop stopColor="#808080"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#808080"/>
          </linearGradient>
          <linearGradient id="paint1_linear_3776_4079" x1="1.57692" y1="157.263" x2="108.168" y2="157.323" gradientUnits="userSpaceOnUse">
            <stop stopColor="#808080"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#808080"/>
          </linearGradient>
          <linearGradient id="paint2_linear_3776_4079" x1="1.40233" y1="29.0774" x2="107.988" y2="29.0774" gradientUnits="userSpaceOnUse">
            <stop stopColor="#808080"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#808080"/>
          </linearGradient>
          <linearGradient id="paint3_linear_3776_4079" x1="0.988838" y1="19.1071" x2="108.168" y2="19.1071" gradientUnits="userSpaceOnUse">
            <stop stopColor="#808080"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#808080"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default ContraPeso20t;