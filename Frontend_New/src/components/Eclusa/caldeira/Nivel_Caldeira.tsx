import React from 'react';

interface NivelCaldeiraProps {
  nivel?: number;
  scale?: number;
  editMode?: boolean;
  websocketValue?: number | null;
  width?: number;
  height?: number;
  componentWidth?: number;
  componentHeight?: number;
}

export default function NivelCaldeira({
  nivel = 50,
  editMode = false,
  websocketValue = null,
  componentWidth,
  componentHeight
}: NivelCaldeiraProps) {
  // Calcula nível diretamente do websocketValue - SEM useState para evitar re-renders desnecessários
  const displayNivel = React.useMemo(() => {
    if (websocketValue !== null) return websocketValue;
    return nivel;
  }, [websocketValue, nivel]);

  return (
    <div className="w-full h-full">        
      <svg
        className="w-full h-full"
        viewBox="0 0 687 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <defs>
          <clipPath id="nivelCaldeiraClip">
            <rect
              x="0"
              y={158 - (displayNivel / 100) * 158}
              width="687"
              height={(displayNivel / 100) * 158}
              style={{ transition: 'y 0.5s ease-in-out, height 0.5s ease-in-out' }}
            />
          </clipPath>
        </defs>
        <path
          d="M0 83.5134V0.0134258H16H25L686.5 0V157.013H674.5H673H633.5H632.5H11.5L3 144.513V88.5134L0 83.5134Z"
          fill="#1E00FF"
          clipPath="url(#nivelCaldeiraClip)"
        />
      </svg>
      
    </div>
  );
}