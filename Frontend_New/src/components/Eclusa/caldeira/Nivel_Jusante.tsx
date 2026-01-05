import { useState, useEffect } from 'react';

interface NivelJusanteProps {
  nivel?: number;
  scale?: number;
  editMode?: boolean;
  websocketValue?: number | null;
  width?: number;
  height?: number;
  componentWidth?: number;
  componentHeight?: number;
}

export default function NivelJusante({
  nivel = 50,
  editMode = false,
  websocketValue = null,
  componentWidth,
  componentHeight
}: NivelJusanteProps) {
  const [nivelAtual, setNivelAtual] = useState<number | null>(null);
  const [isManualControl] = useState(false);

  useEffect(() => {
    if (websocketValue !== null && !isManualControl) {
      setNivelAtual(websocketValue);
    }
  }, [websocketValue, isManualControl]);

  // Sempre renderiza agora (para funcionar no HMIEditor)
  const displayNivel = nivelAtual ?? websocketValue ?? nivel;

  return (
    <div className="w-full h-full">        
      <svg
        className="w-full h-full"
        viewBox="0 0 185 73"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <defs>
          <clipPath id="nivelJusanteClip">
            <rect x="0" y={73 - (displayNivel / 100) * 73} width="185" height={(displayNivel / 100) * 73} />
          </clipPath>
        </defs>
        <path
          d="M184.5 73.0032H0.5L0 0H65.5H184.5V73.0032Z"
          fill={isManualControl ? "#FF6B00" : "#1E00FF"}
          clipPath="url(#nivelJusanteClip)"
          style={{ transition: 'all 0.5s ease-in-out' }}
        />
      </svg>
      
    </div>
  );
}