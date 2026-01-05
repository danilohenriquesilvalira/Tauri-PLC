// components/Eclusa/PortaJusante.tsx - COMPONENTE PORTA JUSANTE COM WEBSOCKET
import React, { useState, useEffect } from 'react';

interface PortaJusanteProps {
  editMode?: boolean;
  websocketValue?: number | null;
  width?: number;
  height?: number;
}

export default function PortaJusante({
  editMode = false,
  websocketValue = null,
  width,
  height
}: PortaJusanteProps) {
  const [abertura, setAbertura] = useState<number | null>(null);

  // Atualiza abertura via WebSocket usando dados do sistema PLC
  useEffect(() => {
    if (websocketValue !== null && !editMode) {
      // Converte valor da porta para porcentagem de abertura (0-100)
      const aberturaPercentual = Math.max(0, Math.min(100, websocketValue));
      setAbertura(aberturaPercentual);
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
        {/* Container da Porta - movimento horizontal (deslizar) */}
        <div className="relative flex-1 flex items-center justify-center w-full h-full overflow-hidden">
          {/* Porta que desliza horizontalmente - tamanho fixo */}
          <div
            className="relative w-full h-full"
        style={{
              // Porta só começa a aparecer quando abertura > 5%
              transform: `translateX(${displayAbertura <= 5 ? 100 : 100 - displayAbertura}%)`,
              transition: 'transform 0.5s ease-in-out',
            }}
          >
            {/* SVG da porta - tamanho sempre 100% */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 85 181"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <image
                href="/Eclusa/Porta_jusante.svg"
                width="85"
                height="181"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
