import React from 'react';
import { ReactNode } from 'react';

interface InfoCardProps {
  title: string;
  children: ReactNode;
  variant?: 'industrial' | 'status' | 'motor' | 'system';
  className?: string;
  containerWidth?: number; // Para responsividade inteligente
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  variant = 'industrial',
  className = '',
  containerWidth = 300 // Default width
}) => {
  // Estilos modernos baseados no padrão EDP
  const getVariantStyles = () => {
    switch (variant) {
      case 'status':
        return {
          container: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200/60',
          header: 'text-white'
        };
      case 'motor':
        return {
          container: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200/60',
          header: 'text-white'
        };
      case 'system':
        return {
          container: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200/60',
          header: 'text-white'
        };
      default: // industrial
        return {
          container: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200/60',
          header: 'text-white'
        };
    }
  };

  // 🎯 RESPONSIVIDADE INTELIGENTE PARA HEADER E CONTEÚDO
  const getResponsiveHeaderFont = () => {
    if (containerWidth < 200) return 'text-xs';
    if (containerWidth < 250) return 'text-xs';
    if (containerWidth < 300) return 'text-sm';
    return 'text-sm';
  };

  const getResponsiveHeaderPadding = () => {
    if (containerWidth < 200) return 'px-2 py-1.5';
    if (containerWidth < 250) return 'px-3 py-2';
    if (containerWidth < 300) return 'px-3 py-2';
    return 'px-4 py-2.5';
  };

  const getResponsiveContentPadding = () => {
    if (containerWidth < 200) return 'p-2';
    if (containerWidth < 250) return 'p-3';
    if (containerWidth < 300) return 'p-3';
    return 'p-4';
  };

  const styles = getVariantStyles();
  const responsiveHeaderFont = getResponsiveHeaderFont();
  const responsiveHeaderPadding = getResponsiveHeaderPadding();
  const responsiveContentPadding = getResponsiveContentPadding();

  return (
    <div className={`${styles.container} border rounded-xl shadow-lg backdrop-blur-sm ${className} overflow-hidden`}>
      {/* Header Moderno com Gradiente - RESPONSIVO */}
      <div className={`bg-edp-marine text-white ${responsiveHeaderPadding}`}>
        <h3 className={`${responsiveHeaderFont} font-edp font-bold uppercase tracking-wide leading-tight`}>
          {title}
        </h3>
      </div>
      
      {/* Conteúdo RESPONSIVO */}
      <div className={`${responsiveContentPadding} space-y-2`}>
        {children}
      </div>
    </div>
  );
};