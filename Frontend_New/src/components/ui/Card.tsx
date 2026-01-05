import React from 'react';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  icon,
  variant = 'default',
  className = '',
  onClick
}) => {
  // Cores padrão EDP baseadas no card existente
  const getVariantStyles = () => {
    switch (variant) {
      case 'info':
        return {
          header: 'bg-blue-600',
          container: 'bg-blue-50 border-blue-200'
        };
      case 'success':
        return {
          header: 'bg-green-600',
          container: 'bg-green-50 border-green-200'
        };
      case 'warning':
        return {
          header: 'bg-yellow-600',
          container: 'bg-yellow-50 border-yellow-200'
        };
      case 'danger':
        return {
          header: 'bg-red-600',
          container: 'bg-red-50 border-red-200'
        };
      default:
        return {
          header: 'bg-[#212E3E]', // Cor padrão EDP do card existente
          container: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className={`w-full rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${styles.container} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Header Section - RETÂNGULO EM CIMA como solicitado */}
      {(title || icon) && (
        <div className={`${styles.header} px-4 py-3`}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-6 h-6 text-white flex-shrink-0">
                {icon}
              </div>
            )}
            {title && (
              <h3 className="text-sm font-semibold text-white truncate">
                {title}
              </h3>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};