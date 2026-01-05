import React from 'react';

interface PortaMontanteReguaProps {
  websocketValue: number;
  editMode?: boolean;
}

const PortaMontanteRegua: React.FC<PortaMontanteReguaProps> = ({ 
  websocketValue = 0,
}) => {
  const valor = websocketValue;

  // Movimentação da porta: 0% = fechada (topo), 100% = aberta (embaixo)
  const maxDescida = 350;
  const posicaoPorta = (valor * maxDescida) / 100;
  
  // Comprimento das linhas laterais
  const comprimentoLinha = 20 + posicaoPorta;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 669 800" 
        preserveAspectRatio="xMidYMid meet"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Porta com movimento vertical */}
        <g transform={`translate(0, ${posicaoPorta})`}>
          <rect x="14.3867" y="19.7812" width="15.5859" height="23.9783" fill="black"/>
          <rect x="643.82" y="18.5781" width="15.5859" height="23.9783" fill="black"/>
          <rect x="0.5" y="39.0156" width="667.659" height="381.384" fill="#7F7F7F" stroke="black"/>
          <rect x="8.44063" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="url(#paint0_linear_3818_557)" strokeWidth="0.1"/>
          <rect x="118.683" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="88.8547" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="383.542" width="100.558" height="22.118" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="123.941" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="167.206" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="210.472" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="253.738" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="297.003" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="8.44063" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="118.683" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="228.933" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="339.175" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="449.417" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <rect x="559.667" y="340.269" width="100.558" height="29.1343" fill="#4D4D4D" stroke="white" strokeWidth="0.1"/>
          <path d="M2.1582 75.1777H29.5312L179.657 375.37L179.881 375.817L180.104 375.37L330.213 75.1777H339.989L349.154 93.5029L490.115 375.37L490.339 375.817L490.562 375.37L640.67 75.1777H668.327L668.635 75.2539L495.661 421.174H484.909L476.281 403.918L476.335 403.82L476.276 403.703L335.333 121.837L335.109 121.39L334.886 121.837L185.203 421.174H174.559L168.265 408.615L165.819 403.716H165.818L1.56543 75.252L2.1582 75.1016V75.1777Z" fill="url(#paint1_radial_3818_557)" stroke="black" strokeWidth="0.5"/>
          <rect y="40.8672" width="668.659" height="32.7424" fill="#4D4D4D"/>
          <path d="M3.05856 68.9321H1.77173C1.47246 68.9321 1.20313 68.8108 1.20313 68.6442L1.20312 40.8672H3.59723L3.59723 68.6442C3.62715 68.7957 3.38775 68.9321 3.05856 68.9321Z" fill="url(#paint2_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M73.4824 68.9321H71.5521C71.1032 68.9321 70.6992 68.8108 70.6992 68.6442V40.8672H74.2904V68.6442C74.3353 68.7957 73.9762 68.9321 73.4824 68.9321Z" fill="url(#paint3_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M139.393 68.9321H137.462C137.013 68.9321 136.609 68.8108 136.609 68.6442V40.8672H140.201V68.6442C140.245 68.7957 139.886 68.9321 139.393 68.9321Z" fill="url(#paint4_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M205.299 68.9321H203.369C202.92 68.9321 202.516 68.8108 202.516 68.6442V40.8672H206.107V68.6442C206.152 68.7957 205.793 68.9321 205.299 68.9321Z" fill="url(#paint5_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M271.205 68.9321H269.275C268.826 68.9321 268.422 68.8108 268.422 68.6442V40.8672H272.013V68.6442C272.058 68.7957 271.699 68.9321 271.205 68.9321Z" fill="url(#paint6_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M337.115 68.9321H335.185C334.736 68.9321 334.332 68.8108 334.332 68.6442V40.8672H337.923V68.6442C337.968 68.7957 337.609 68.9321 337.115 68.9321Z" fill="url(#paint7_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M403.021 67.768H401.091C400.642 67.768 400.238 67.6468 400.238 67.4801V39.7031H403.829V67.4801C403.874 67.6316 403.515 67.768 403.021 67.768Z" fill="url(#paint8_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M468.924 67.768H466.994C466.545 67.768 466.141 67.6468 466.141 67.4801V39.7031H469.732V67.4801C469.777 67.6316 469.418 67.768 468.924 67.768Z" fill="url(#paint9_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M534.834 70.0961H532.904C532.455 70.0961 532.051 69.9749 532.051 69.8082V42.0312H535.642V69.8082C535.687 69.9598 535.328 70.0961 534.834 70.0961Z" fill="url(#paint10_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M600.74 70.0961H598.81C598.361 70.0961 597.957 69.9749 597.957 69.8082V42.0312H601.548V69.8082C601.593 69.9598 601.234 70.0961 600.74 70.0961Z" fill="url(#paint11_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M665.451 68.9321H663.521C663.072 68.9321 662.668 68.8108 662.668 68.6442V40.8672H666.259V68.6442C666.304 68.7957 665.945 68.9321 665.451 68.9321Z" fill="url(#paint12_linear_3818_557)" stroke="#4D4D4D" strokeWidth="0.75" strokeMiterlimit="10"/>
          <path d="M0.00115943 73.1975L0.00115959 69.4302C0.00115963 68.5541 2.88953 67.7656 6.86102 67.7656L668.66 67.7656L668.66 74.7745L6.86102 74.7745C3.25055 74.8621 0.00115938 74.1612 0.00115943 73.1975Z" fill="url(#paint13_linear_3818_557)"/>
          <path d="M0.00115942 40.4553L0.00115959 36.688C0.00115963 35.8119 2.88953 35.0234 6.86102 35.0234L668.66 35.0234L668.66 42.0323L6.86102 42.0323C3.25055 42.1199 0.00115938 41.419 0.00115942 40.4553Z" fill="url(#paint14_linear_3818_557)"/>
        </g>
        
        {/* Linhas laterais - centralizadas nos retângulos pretos */}
        <rect 
          width="10" 
          height={comprimentoLinha}
          x="17.18"
          y="0"
          fill="black"
        />
        
        <rect 
          width="10" 
          height={comprimentoLinha}
          x="646.61"
          y="0"
          fill="black"
        />
        
        <defs>
          <linearGradient id="paint0_linear_3818_557" x1="8.39062" y1="99.9137" x2="109.049" y2="99.9137" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1"/>
          </linearGradient>
          <radialGradient id="paint1_radial_3818_557" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(335.101 248.102) rotate(90) scale(173.321 333.898)">
            <stop offset="0.625" stopColor="#C4C4C4"/>
            <stop offset="0.89" stopColor="#4D4D4D"/>
          </radialGradient>
          <linearGradient id="paint2_linear_3818_557" x1="1.23305" y1="54.893" x2="3.62715" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint3_linear_3818_557" x1="70.7441" y1="54.893" x2="74.3353" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint4_linear_3818_557" x1="136.654" y1="54.893" x2="140.245" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint5_linear_3818_557" x1="202.561" y1="54.893" x2="206.152" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint6_linear_3818_557" x1="268.467" y1="54.893" x2="272.058" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint7_linear_3818_557" x1="334.377" y1="54.893" x2="337.968" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint8_linear_3818_557" x1="400.283" y1="53.729" x2="403.874" y2="53.729" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint9_linear_3818_557" x1="466.186" y1="53.729" x2="469.777" y2="53.729" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint10_linear_3818_557" x1="532.096" y1="56.0571" x2="535.687" y2="56.0571" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint11_linear_3818_557" x1="598.002" y1="56.0571" x2="601.593" y2="56.0571" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint12_linear_3818_557" x1="662.713" y1="54.893" x2="666.304" y2="54.893" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint13_linear_3818_557" x1="334.488" y1="67.8532" x2="334.488" y2="74.8621" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
          <linearGradient id="paint14_linear_3818_557" x1="334.488" y1="35.111" x2="334.488" y2="42.1199" gradientUnits="userSpaceOnUse">
            <stop stopColor="#333333"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="#333333"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default PortaMontanteRegua;
