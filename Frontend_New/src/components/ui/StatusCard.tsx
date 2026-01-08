import React from 'react';

interface StatusCardProps {
  title: string;
  variant: 'automatic' | 'success' | 'warning' | 'error';
  className?: string;
  containerWidth?: number; // Para responsividade inteligente
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  variant,
  className = '',
  containerWidth = 300 // Default width
}) => {
  // Estilos baseados no padrão EDP - cores suaves e delicadas
  const getVariantStyles = () => {
    switch (variant) {
      case 'automatic':
        return 'bg-gray-200 border-gray-300 text-edp-marine'; // Cinza suave como cards de usuários
      case 'success':
        return 'bg-gray-200 border-gray-300 text-edp-marine';
      case 'warning':
        return 'bg-gray-200 border-gray-300 text-edp-marine';
      case 'error':
        return 'bg-gray-200 border-gray-300 text-edp-marine';
      default:
        return 'bg-gray-200 border-gray-300 text-edp-marine';
    }
  };

  // 🎯 RESPONSIVIDADE INTELIGENTE - baseada na largura do container
  const getResponsivePadding = () => {
    // 🎯 PADDING MAIS AGRESSIVO para cards pequenos
    if (containerWidth < 180) return 'px-1.5 py-1'; // Muito pequeno
    if (containerWidth < 220) return 'px-2 py-1.5'; // Pequeno
    if (containerWidth < 260) return 'px-2.5 py-2'; // Médio
    if (containerWidth < 300) return 'px-3 py-2'; // Médio+
    return 'px-4 py-2.5'; // Grande
  };

  // 🎯 SISTEMA DINÂMICO INTELIGENTE - Calcula exatamente como os outros cards
  const getDynamicFontSize = () => {
    // Escala baseada na largura do container (280px = escala base 1.0)
    let scaleFactor = containerWidth / 280;
    scaleFactor = Math.max(scaleFactor, 0.65); // Mínimo 65%
    scaleFactor = Math.min(scaleFactor, 1.2); // Máximo 120%
    
    const baseFontSize = 13; // Tamanho base em px
    return Math.max(baseFontSize * scaleFactor, 9); // Mínimo 9px
  };

  const styles = getVariantStyles();
  const responsivePadding = getResponsivePadding();
  const dynamicFontSize = getDynamicFontSize();

  // Performance optimization: Remove debug logging in production
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`🎯 StatusCard "${title}": containerWidth=${containerWidth}px, fontSize=${dynamicFontSize.toFixed(1)}px`);
    }
  }, [containerWidth, dynamicFontSize, title]);

  return (
    <div className={`${styles} border rounded-xl shadow-sm backdrop-blur-sm ${responsivePadding} ${className}`}>
      <div className="text-center">
        <div 
          className="font-edp font-bold uppercase tracking-wide leading-tight"
          style={{ fontSize: `${dynamicFontSize}px` }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};