import React from 'react';

interface CircuitoProps {
  // Array de bits para cada trecho (0 = inativo/preto, 1 = ativo/azul)
  // ou pode receber valores individuais
  trecho1?: number | boolean; // Path 1
  trecho2?: number | boolean; // Path 2
  trecho3?: number | boolean; // Path 3
  trecho4?: number | boolean; // Path 4
  trecho5?: number | boolean; // Path 5
  trecho6?: number | boolean; // Path 6
  trecho7?: number | boolean; // Path 7
  trecho8?: number | boolean; // Path 8
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const Circuito: React.FC<CircuitoProps> = ({ 
  trecho1 = 0,
  trecho2 = 0,
  trecho3 = 0,
  trecho4 = 0,
  trecho5 = 0,
  trecho6 = 0,
  trecho7 = 0,
  trecho8 = 0,
  side = 'direito',
  editMode = false
}) => {
  
  // Função para determinar a cor baseado no valor (0/false = preto, 1/true = azul)
  const getColor = (value: number | boolean): string => {
    return value ? "#58FCFB" : "black";
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 1106 450" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Trecho 1 */}
        <path 
          d="M0.5 194.5V306M0.5 306H54.5M0.5 306L7 299.5" 
          stroke={getColor(trecho1)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 2 */}
        <path 
          d="M95.5 284V254.5H177.5V307.5H214.5V76H252.5M252.5 76V148H286M252.5 76V0.5H286.5" 
          stroke={getColor(trecho2)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 3 */}
        <path 
          d="M327.5 0.5H362V74.5M362 74.5H424.5M362 74.5V148H327" 
          stroke={getColor(trecho3)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 4 */}
        <path 
          d="M455.5 74.5H528M528 74.5V0.5H562M528 74.5V148H562" 
          stroke={getColor(trecho4)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 5 */}
        <path 
          d="M603 0.5H637V72.5M603 148H637V72.5M637 72.5H724.5M724.5 72.5V0.5M724.5 72.5H878V188.5H948.5M948.5 188.5V101.5M948.5 188.5H1105V323H1009.5" 
          stroke={getColor(trecho5)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 6 */}
        <path 
          d="M972.5 323H868.5" 
          stroke={getColor(trecho6)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Trecho 7 */}
        <path 
          d="M840.5 323H726M726 323V285.5M726 323H603V449.5H514.5M445.5 449.5H514.5M514.5 449.5V405.5" 
          stroke={getColor(trecho7)}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
      </svg>
    </div>
  );
};

export default Circuito;

// Controle individual por trecho:
// trecho1 a trecho7 = 0 ou false -> Preto (inativo)
// trecho1 a trecho7 = 1 ou true -> Azul #58FCFB (ativo)
//
// Exemplo de uso:
// <Circuito trecho1={1} trecho2={0} trecho3={1} trecho4={0} trecho5={1} trecho6={0} trecho7={1} />
// ou
// <Circuito trecho1={true} trecho2={false} trecho3={true} ... />