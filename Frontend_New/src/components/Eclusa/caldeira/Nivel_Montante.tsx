import { useState, useEffect } from 'react';

interface NivelMontanteProps {
  nivel?: number;
  scale?: number;
  editMode?: boolean;
  websocketValue?: number | null;
  width?: number;
  height?: number;
  componentWidth?: number;
  componentHeight?: number;
}

export default function NivelMontante({
  nivel = 50,
  editMode = false,
  websocketValue = null,
  componentWidth,
  componentHeight
}: NivelMontanteProps) {
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
        viewBox="0 0 296 137"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <defs>
          <clipPath id="nivelMontanteClip">
            <rect x="0" y={137 - (displayNivel / 100) * 137} width="296" height={(displayNivel / 100) * 137} />
          </clipPath>
        </defs>
        <path
          d="M223.559 136.5H0V0.5H180H184.689H296V44H252L231.5 131H224L223.559 136.5Z"
          fill={isManualControl ? "#FF6B00" : "#1E00FF"}
          clipPath="url(#nivelMontanteClip)"
          style={{ transition: 'all 0.5s ease-in-out' }}
        />
      </svg>
      
    </div>
  );
}