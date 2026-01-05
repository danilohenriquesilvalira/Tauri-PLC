import React from 'react';

interface StatusCardProps {
  title: string;
  variant: 'automatic' | 'success' | 'warning' | 'error';
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  variant,
  className = ''
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

  const styles = getVariantStyles();

  return (
    <div className={`${styles} border rounded-md p-2 ${className}`}>
      <div className="text-center">
        <div className="text-xs font-edp font-bold uppercase tracking-wide">
          {title}
        </div>
      </div>
    </div>
  );
};