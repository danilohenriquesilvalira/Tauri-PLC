import React from 'react';

interface StatusCardProps {
  title: string;
  variant: 'automatic' | 'success' | 'warning' | 'error';
  className?: string;
  containerWidth?: number;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  variant,
  className = '',
  containerWidth = 250
}) => {
  // Cor de fundo baseada no variant
  const bgColor = {
    automatic: 'bg-gray-100',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    error: 'bg-red-50'
  }[variant];

  const borderColor = {
    automatic: 'border-gray-300',
    success: 'border-emerald-300',
    warning: 'border-amber-300',
    error: 'border-red-300'
  }[variant];

  const textColor = {
    automatic: 'text-gray-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    error: 'text-red-700'
  }[variant];

  // Escala baseada no containerWidth
  const scale = Math.max(0.6, Math.min(1.4, containerWidth / 250));
  const fontSize = Math.max(9, Math.min(15, 11 * scale));
  const paddingY = Math.max(6, Math.min(12, 8 * scale));
  const paddingX = Math.max(8, Math.min(16, 12 * scale));

  return (
    <div
      className={`${bgColor} ${borderColor} ${textColor} border rounded-lg shadow-sm ${className}`}
      style={{
        padding: `${paddingY}px ${paddingX}px`,
      }}
    >
      <div
        className="font-semibold uppercase tracking-wide text-center leading-snug"
        style={{ fontSize: `${fontSize}px` }}
      >
        {title}
      </div>
    </div>
  );
};