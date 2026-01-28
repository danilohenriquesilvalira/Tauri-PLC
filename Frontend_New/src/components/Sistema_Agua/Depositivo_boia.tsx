import React from 'react';

interface DepositoBoiaProps {
  nivel: number; // Valor de 0 a 100 (porcentagem do nível)
  boiaAtiva?: number | boolean; // 0/false = inativa (preto), 1/true = ativa (verde)
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const DepositoBoia: React.FC<DepositoBoiaProps> = ({
  nivel = 0,
  boiaAtiva = 0,
  side = 'direito',
  editMode = false
}) => {

  // Garantir que o valor esteja entre 0 e 100
  const nivelSeguro = Math.min(100, Math.max(0, nivel));

  // Calcular a altura do preenchimento
  // O corpo do tanque vai aproximadamente de Y=37 até Y=109.7 (altura: ~72.7)
  const tanqueTop = 37;
  const tanqueBottom = 109.7;
  const alturaTotal = tanqueBottom - tanqueTop;
  const alturaPreenchimento = (nivelSeguro / 100) * alturaTotal;
  const yPreenchimento = tanqueBottom - alturaPreenchimento;

  // Cor do líquido baseada no nível
  const getLiquidColor = () => {
    if (nivelSeguro > 80) return "#3498db"; // Azul - cheio
    if (nivelSeguro > 50) return "#2980b9"; // Azul médio
    if (nivelSeguro > 20) return "#1abc9c"; // Verde água
    return "#16a085"; // Verde escuro - baixo
  };

  const liquidColor = getLiquidColor();

  // Cor da boia
  const getBoiaColor = () => {
    return boiaAtiva ? "#2ecc71" : "white"; // Verde se ativa, branco se inativa
  };

  const getBoiaStroke = () => {
    return boiaAtiva ? "#27ae60" : "black"; // Verde escuro se ativa, preto se inativa
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 67 116"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Clip path para o preenchimento do tanque */}
          <clipPath id="tanqueBoiaClip">
            <path d="M33.1396 37C42.2694 37 50.5216 37.5 56.4795 38.5C59.4625 39 61.8449 39.5 63.4697 40C64.2837 40.3 64.8803 40.6 65.2656 40.9C65.6513 41.2 65.7793 41.5 65.7793 41.8V109.699C65.7793 109.943 65.6513 110.244 65.2656 110.603C64.8803 110.961 64.2837 111.329 63.4697 111.695C61.8449 112.426 59.4625 113.096 56.4795 113.663C50.5216 114.796 42.2693 115.5 33.1396 115.5C24.01 115.5 15.7578 114.796 9.7998 113.663C6.81677 113.096 4.43442 112.426 2.80957 111.695C1.99551 111.329 1.39899 110.961 1.01367 110.603C0.627931 110.244 0.5 109.943 0.5 109.699V41.8C0.5 41.5 0.627936 41.2 1.01367 40.9C1.39899 40.6 1.99552 40.3 2.80957 40C4.43441 39.5 6.81678 39 9.7998 38.5C15.7577 37.5 24.0099 37 33.1396 37Z" />
          </clipPath>
        </defs>

        {/* Boia - retângulo pequeno - MUDA DE COR */}
        <rect
          x="53.5"
          y="96.5"
          width="5"
          height="9"
          fill={getBoiaColor()}
          stroke={getBoiaStroke()}
          strokeWidth="1"
          style={{ transition: 'fill 0.3s ease-in-out, stroke 0.3s ease-in-out' }}
        />

        {/* Haste da boia */}
        <path d="M56 96V0" stroke="black" />

        {/* Corpo do tanque - contorno */}
        <path d="M33.1396 26.5C42.2694 26.5 50.5216 27.2042 56.4795 28.3369C59.4625 28.9041 61.8449 29.5743 63.4697 30.3047C64.2837 30.6706 64.8803 31.0395 65.2656 31.3975C65.6513 31.7558 65.7793 32.0574 65.7793 32.3008V109.699C65.7793 109.943 65.6513 110.244 65.2656 110.603C64.8803 110.961 64.2837 111.329 63.4697 111.695C61.8449 112.426 59.4625 113.096 56.4795 113.663C50.5216 114.796 42.2693 115.5 33.1396 115.5C24.01 115.5 15.7578 114.796 9.7998 113.663C6.81677 113.096 4.43442 112.426 2.80957 111.695C1.99551 111.329 1.39899 110.961 1.01367 110.603C0.627931 110.244 0.5 109.943 0.5 109.699V32.3008C0.5 32.0573 0.627936 31.7559 1.01367 31.3975C1.39899 31.0395 1.99552 30.6706 2.80957 30.3047C4.43441 29.5743 6.81678 28.9041 9.7998 28.3369C15.7577 27.2042 24.0099 26.5 33.1396 26.5Z" fill="white" stroke="black" />

        {/* Preenchimento do nível - dentro do tanque */}
        {nivelSeguro > 0 && (
          <rect
            x="0.5"
            y={yPreenchimento}
            width="65.28"
            height={alturaPreenchimento + 6}
            fill={liquidColor}
            clipPath="url(#tanqueBoiaClip)"
            style={{ transition: 'all 0.5s ease-in-out' }}
          />
        )}

        {/* Contorno do tanque (redesenhar por cima do preenchimento) */}
        <path d="M33.1396 26.5C42.2694 26.5 50.5216 27.2042 56.4795 28.3369C59.4625 28.9041 61.8449 29.5743 63.4697 30.3047C64.2837 30.6706 64.8803 31.0395 65.2656 31.3975C65.6513 31.7558 65.7793 32.0574 65.7793 32.3008V109.699C65.7793 109.943 65.6513 110.244 65.2656 110.603C64.8803 110.961 64.2837 111.329 63.4697 111.695C61.8449 112.426 59.4625 113.096 56.4795 113.663C50.5216 114.796 42.2693 115.5 33.1396 115.5C24.01 115.5 15.7578 114.796 9.7998 113.663C6.81677 113.096 4.43442 112.426 2.80957 111.695C1.99551 111.329 1.39899 110.961 1.01367 110.603C0.627931 110.244 0.5 109.943 0.5 109.699V32.3008C0.5 32.0573 0.627936 31.7559 1.01367 31.3975C1.39899 31.0395 1.99552 30.6706 2.80957 30.3047C4.43441 29.5743 6.81678 28.9041 9.7998 28.3369C15.7577 27.2042 24.0099 26.5 33.1396 26.5Z" fill="none" stroke="black" />

        {/* Tampa superior - elipse */}
        <path d="M33.4863 26.5C42.5207 26.5 50.6875 27.1621 56.584 28.2285C59.5361 28.7624 61.8942 29.3942 63.5029 30.082C64.3091 30.4267 64.8992 30.7735 65.2793 31.1094C65.6617 31.4473 65.7764 31.7227 65.7764 31.9307C65.7762 32.1386 65.6614 32.4133 65.2793 32.751C64.8992 33.0869 64.3091 33.4346 63.5029 33.7793C61.8943 34.4671 59.5359 35.098 56.584 35.6318C50.6875 36.6982 42.5207 37.3603 33.4863 37.3604C24.452 37.3604 16.2852 36.6982 10.3887 35.6318C7.4364 35.0979 5.07749 34.4671 3.46875 33.7793C2.66241 33.4345 2.0725 33.0869 1.69238 32.751C1.31028 32.4133 1.19547 32.1386 1.19531 31.9307C1.19531 31.7227 1.31 31.4473 1.69238 31.1094C2.07248 30.7735 2.66251 30.4268 3.46875 30.082C5.0775 29.3942 7.43629 28.7625 10.3887 28.2285C16.2852 27.1621 24.452 26.5 33.4863 26.5Z" fill="white" stroke="black" />

      </svg>
      {/* TEXTO VIA HTML PÓS-SVG PARA GARANTIR VISIBILIDADE */}
      <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center pt-8 pointer-events-none">
        <span className="text-[6px] font-bold text-black text-center leading-tight">INIBIDOR<br />INCRUSTAÇÃO</span>
      </div>
    </div>
  );
};

export default DepositoBoia;

// Estados do depósito:
// nivel = 0 a 100 (porcentagem do nível do tanque)
// boiaAtiva = 0/false -> Branco (boia inativa)
// boiaAtiva = 1/true -> Verde #2ecc71 (boia ativa/OK)
//
// Exemplo de uso:
// <DepositoBoia nivel={75} boiaAtiva={true} />