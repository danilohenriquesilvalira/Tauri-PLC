import React from 'react';

interface ValvulaGavetaProps {
  websocketBit: number | boolean; // Bit do status word (0, 1, true ou false)
  editMode?: boolean;
}

const ValvulaGaveta: React.FC<ValvulaGavetaProps> = ({
  websocketBit = 0,
  editMode = false
}) => {

  // Define a cor da válvula gaveta de acordo com o bit (0/false = cinza, 1/true = laranja)
  const corValvula = (websocketBit === 1 || websocketBit === true) ? 'rgb(219, 88, 0)' : '#808080';
  
  // Cor para as partes escuras (versão mais escura da cor principal)
  const corEscura = (websocketBit === 1 || websocketBit === true) ? 'rgb(159, 64, 0)' : '#606060';

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 379 354" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Mantemos todos os elementos originais com seus gradientes, apenas o retângulo principal muda de cor */}
        <path d="M371.422 305.067L378.21 301.609V149.455L371.422 145.997V305.067Z" fill="url(#paint0_linear_1779_268)"/>
        <path d="M371.422 352.46L368.476 353.997H342.861L339.787 352.46V98.6141L342.861 97.0771H368.476L371.422 98.6141V352.46Z" fill={corEscura}/>
        <path d="M368.476 123.074H342.861V167.004H368.476V123.074Z" fill="url(#paint2_linear_1779_268)"/>
        <path d="M368.477 97.0771L371.422 98.6141V352.46L368.477 353.997" fill={corEscura}/>
        <path d="M342.861 353.997L339.787 352.46V98.6141L342.861 97.0771" fill={corEscura}/>
        <path d="M339.784 316.863L331.715 313.789V137.428L339.784 134.227V316.863Z" fill={corEscura}/>
        
        {/* Aplicação da cor dinâmica APENAS na parte principal da válvula */}
        <path 
          d="M331.715 137.419H46.4897V313.779H331.715V137.419Z" 
          fill={corValvula}
          style={{ transition: 'fill 0.3s ease' }}
        />
        
        <path d="M330.562 155.219H47.6426V185.317H330.562V155.219Z" fill="url(#paint7_linear_1779_268)"/>
        <path d="M38.4238 316.865L46.4926 313.792V137.431L38.4238 134.357V316.865Z" fill={corEscura}/>
        <path d="M6.78802 305.067L0 301.609V149.455L6.78802 145.997V305.067Z" fill="url(#paint9_linear_1779_268)"/>
        <path d="M38.4228 352.46L35.4771 353.997H9.73383L6.78809 352.46V98.6141L9.73383 97.0771H35.4771L38.4228 98.6141V352.46Z" fill={corEscura}/>
        <path d="M35.4771 123.074H9.73389V167.004H35.4771V123.074Z" fill="url(#paint11_linear_1779_268)"/>
        <path d="M35.478 97.0771L38.4238 98.6141V352.46L35.478 353.997" fill={corEscura}/>
        <path d="M9.73383 353.997L6.78809 352.46V98.6141L9.73383 97.0771" fill={corEscura}/>
        <path d="M222.597 137.811C222.597 137.811 210.558 152.924 189.169 152.924C167.78 152.924 155.741 137.811 155.741 137.811V92.7285H222.597V137.811Z" fill={corEscura}/>
        <path d="M174.184 150.357C167.524 148.051 162.786 144.209 162.786 144.209V93.4912H174.184C174.184 93.4912 174.184 149.204 174.184 150.357Z" fill="url(#paint15_linear_1779_268)"/>
        <path d="M155.741 92.7229H222.597L215.168 87.3438H163.042L155.741 92.7229Z" fill={corEscura}/>
        <path d="M174.184 92.0857H162.786L168.677 87.9873H177.514L174.184 92.0857Z" fill="white"/>
        <path d="M211.326 24.3408H167.012V87.3541H211.326V24.3408Z" fill={corEscura}/>
        <path d="M179.18 24.9844H171.623V86.5888H179.18V24.9844Z" fill="url(#paint18_linear_1779_268)"/>
        <path d="M95.0344 24.3344C88.3744 24.3344 82.8672 18.9552 82.8672 12.1672C82.8672 5.37918 88.2464 0 95.0344 0H283.05C289.71 0 295.217 5.37918 295.217 12.1672C295.217 18.9552 289.838 24.3344 283.05 24.3344H95.0344Z" fill={corEscura}/>
        <path d="M82.9951 12.1641C82.9951 18.824 88.3743 24.3313 95.1623 24.3313H283.178C289.838 24.3313 295.345 18.9521 295.345 12.1641H82.9951Z" fill={corEscura}/>
        
        <defs>
          <linearGradient id="paint0_linear_1779_268" x1="374.847" y1="46.9032" x2="374.847" y2="214.359" gradientUnits="userSpaceOnUse">
            <stop stopColor="#AFAFAE"/>
            <stop offset="1" stopColor="#424242"/>
          </linearGradient>
          <linearGradient id="paint2_linear_1779_268" x1="355.653" y1="121.81" x2="355.653" y2="141.433" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
          </linearGradient>
          <linearGradient id="paint7_linear_1779_268" x1="189.08" y1="152.737" x2="189.08" y2="170.057" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
          </linearGradient>
          <linearGradient id="paint9_linear_1779_268" x1="3.3894" y1="62.2004" x2="3.3894" y2="202.744" gradientUnits="userSpaceOnUse">
            <stop stopColor="#AFAFAE"/>
            <stop offset="1" stopColor="#424242"/>
          </linearGradient>
          <linearGradient id="paint11_linear_1779_268" x1="22.5896" y1="121.81" x2="22.5896" y2="141.433" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
          </linearGradient>
          <linearGradient id="paint15_linear_1779_268" x1="162.085" y1="121.907" x2="168.202" y2="121.907" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
          </linearGradient>
          <linearGradient id="paint18_linear_1779_268" x1="170.935" y1="55.8305" x2="173.755" y2="55.8305" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F2F2F2" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#F7F7F7" stopOpacity="0.7"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default ValvulaGaveta;
