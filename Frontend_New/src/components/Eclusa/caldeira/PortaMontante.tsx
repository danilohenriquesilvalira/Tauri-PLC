// components/Eclusa/PortaMontante.tsx - COMPONENTE PORTA MONTANTE COM WEBSOCKET E MOVIMENTO VERTICAL
import React, { useState, useEffect } from 'react';

interface PortaMontanteProps {
  editMode?: boolean;
  websocketValue?: number | null;
  width?: number;
  height?: number;
}

export default function PortaMontante({
  editMode = false,
  websocketValue = null,
  width,
  height
}: PortaMontanteProps) {
  const [abertura, setAbertura] = useState<number | null>(null);

  // Atualiza abertura via WebSocket usando dados do sistema PLC
  useEffect(() => {
    if (websocketValue !== null && !editMode) {
      // Converte valor da porta para porcentagem de abertura (0-100)
      const aberturaPercentual = Math.max(0, Math.min(100, websocketValue));
      setAbertura(aberturaPercentual);
      console.log(`🚪 PORTA MONTANTE: ${websocketValue} -> ${aberturaPercentual}%`);
    }
  }, [websocketValue, editMode]);

  // Usa a abertura real do WebSocket ou valor padrão
  const displayAbertura = (abertura ?? websocketValue ?? 0);

  return (
    <div className="w-full h-full"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%'
      }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center">
        {/* Container da Porta - igual aos outros componentes */}
        <div className="relative flex-1 flex items-center justify-center w-full h-full">
          <div
            className="w-full h-full"
            style={{
              transform: `translateY(${(displayAbertura / 100) * 20}px)`, // Movimento vertical suave
              transition: 'transform 0.8s ease-in-out', // Animação suave
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 16 102"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1 1H15.0814V94.5648L2.55922 100.872H1V1Z"
                fill="url(#paint0_linear_3473_660)"
                stroke="black"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.11328 1H5.92957V99.686L3.11328 100.872V1Z"
                fill="url(#paint1_linear_3473_660)"
                stroke="black"
                strokeWidth="0.767065"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.5625 1H14.3788V95.0184L11.5625 96.1485V1Z"
                fill="url(#paint2_linear_3473_660)"
                stroke="black"
                strokeWidth="0.767065"
                strokeMiterlimit="22.9256"
              />
              <path
                d="M2.40814 1H1V100.872H2.40814V1Z"
                fill="url(#paint3_linear_3473_660)"
                stroke="black"
                strokeWidth="0.767065"
                strokeMiterlimit="22.9256"
              />

              {/* Padrões diagonais */}
              <path d="M2.40814 1H1V100.872H2.40814V1Z" fill="url(#paint3_linear_3473_660)" stroke="black" strokeWidth="0.767065" strokeMiterlimit="22.9256"/>
              <path d="M2.85142 30.6837H1.70703L11.1237 17.1875H12.2681L2.85142 30.6837Z" fill="url(#paint4_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M2.92771 54.3126H1.70703L11.7515 43.5156H12.9722L2.92771 54.3126Z" fill="url(#paint5_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M2.92771 84.673H1.70703L11.7515 71.8516H12.9722L2.92771 84.673Z" fill="url(#paint6_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M2.92771 92.0967H1.70703L11.7515 86.0234H12.9722L2.92771 92.0967Z" fill="url(#paint8_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M11.1547 15.1681L1.70703 7.07031H2.94764L12.2681 15.1681H11.1547Z" fill="url(#paint9_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M11.7846 42.1612L1.70703 32.0391H3.03035L12.9722 42.1612H11.7846Z" fill="url(#paint10_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M11.7846 69.8273L1.70703 55.6562H3.03035L12.9722 69.8273H11.7846Z" fill="url(#paint11_linear_3473_660)" stroke="black" strokeWidth="0.5"/>

              {/* Seções horizontais */}
              <path d="M1.70703 6.23784C1.70703 5.89178 2.00348 5.71875 2.59639 5.71875H12.0828C12.6757 5.71875 12.9722 5.89178 12.9722 6.23784V7.06837H1.70703V6.23784Z" fill="url(#paint12_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 15.9505C1.70703 15.4314 2.00348 15.1719 2.59639 15.1719H12.0828C12.6757 15.1719 12.9722 15.4314 12.9722 15.9505V17.1963H1.70703V15.9505Z" fill="url(#paint13_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 30.7943C1.70703 30.2752 2.00348 30.0156 2.59639 30.0156H12.0828C12.6757 30.0156 12.9722 30.2752 12.9722 30.7943V32.0401H1.70703V30.7943Z" fill="url(#paint14_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 42.263C1.70703 41.7439 2.00348 41.4844 2.59639 41.4844H12.0828C12.6757 41.4844 12.9722 41.7439 12.9722 42.263V43.5088H1.70703V42.263Z" fill="url(#paint15_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 54.8316C1.70703 54.4855 2.00348 54.3125 2.59639 54.3125H12.0828C12.6757 54.3125 12.9722 54.4855 12.9722 54.8316V55.6621H1.70703V54.8316Z" fill="url(#paint16_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 70.6068C1.70703 70.0877 2.00348 69.8281 2.59639 69.8281H12.0828C12.6757 69.8281 12.9722 70.0877 12.9722 70.6068V71.8526H1.70703V70.6068Z" fill="url(#paint17_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 85.191C1.70703 84.8449 2.00348 84.6719 2.59639 84.6719H12.0828C12.6757 84.6719 12.9722 84.8449 12.9722 85.191V86.0215H1.70703V85.191Z" fill="url(#paint18_linear_3473_660)" stroke="black" strokeWidth="0.5"/>
              <path d="M1.70703 92.6128C1.70703 92.2668 2.00348 92.0938 2.59639 92.0938H12.0828C12.6757 92.0938 12.9722 92.2668 12.9722 92.6128V93.4434H1.70703V92.6128Z" fill="url(#paint19_linear_3473_660)" stroke="black" strokeWidth="0.5"/>

              {/* Gradientes */}
              <defs>
                <linearGradient id="paint0_linear_3473_660" x1="8.04072" y1="1" x2="8.04072" y2="100.872" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9C9C9C"/>
                  <stop offset="1" stopColor="#747575"/>
                </linearGradient>
                <linearGradient id="paint1_linear_3473_660" x1="5.92957" y1="50.9361" x2="3.11328" y2="50.9361" gradientUnits="userSpaceOnUse">
                  <stop offset="0.1" stopColor="#2B252C"/>
                  <stop offset="1" stopColor="white"/>
                </linearGradient>
                <linearGradient id="paint2_linear_3473_660" x1="14.3788" y1="48.5743" x2="11.5625" y2="48.5743" gradientUnits="userSpaceOnUse">
                  <stop offset="0.1" stopColor="#2B252C"/>
                  <stop offset="1" stopColor="white"/>
                </linearGradient>
                <linearGradient id="paint3_linear_3473_660" x1="1" y1="50.9361" x2="2.40814" y2="50.9361" gradientUnits="userSpaceOnUse">
                  <stop/>
                  <stop offset="1" stopColor="white"/>
                </linearGradient>
                <linearGradient id="paint4_linear_3473_660" x1="6.98757" y1="17.1875" x2="6.98757" y2="30.6837" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D9D9D9"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint5_linear_3473_660" x1="7.33961" y1="43.5156" x2="7.33961" y2="54.3126" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D9D9D9"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint6_linear_3473_660" x1="7.33961" y1="71.8516" x2="7.33961" y2="84.673" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D9D9D9"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint8_linear_3473_660" x1="7.33961" y1="86.0234" x2="7.33961" y2="92.0967" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D9D9D9"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint9_linear_3473_660" x1="12.2681" y1="11.1192" x2="1.70703" y2="11.1192" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint10_linear_3473_660" x1="12.9722" y1="37.1002" x2="1.70703" y2="37.1002" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint11_linear_3473_660" x1="12.9722" y1="62.7418" x2="1.70703" y2="62.7418" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.9" stopColor="#393339"/>
                </linearGradient>
                <linearGradient id="paint12_linear_3473_660" x1="7.33961" y1="5.71875" x2="7.33961" y2="7.06837" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.925" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint13_linear_3473_660" x1="7.33961" y1="15.1719" x2="7.33961" y2="17.1963" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint14_linear_3473_660" x1="7.33961" y1="30.0156" x2="7.33961" y2="32.0401" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint15_linear_3473_660" x1="7.33961" y1="41.4844" x2="7.33961" y2="43.5088" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint16_linear_3473_660" x1="7.33961" y1="54.3125" x2="7.33961" y2="55.6621" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint17_linear_3473_660" x1="7.33961" y1="69.8281" x2="7.33961" y2="71.8526" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint18_linear_3473_660" x1="7.33961" y1="84.6719" x2="7.33961" y2="86.0215" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
                <linearGradient id="paint19_linear_3473_660" x1="7.33961" y1="92.0938" x2="7.33961" y2="93.4434" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="0.93" stopColor="#302A31"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}