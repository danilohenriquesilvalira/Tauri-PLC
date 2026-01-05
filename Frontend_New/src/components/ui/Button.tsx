import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = [
    // BOTÕES QUADRADOS EDP - SEM BORDER RADIUS
    'inline-flex items-center justify-center font-edp font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ];

  const variantClasses = {
    primary: [
      // Botão primário moderno com cores EDP
      'bg-[#7C9599] text-white shadow-lg font-semibold rounded-xl',
      'hover:bg-[#6B8489] hover:shadow-xl active:bg-[#5A7378] active:scale-95',
      'border border-[#7C9599] hover:border-[#6B8489]',
      'focus:ring-2 focus:ring-[#7C9599]/30'
    ],
    secondary: [
      // Botão secundário moderno
      'bg-[#212E3E] text-white shadow-lg font-semibold rounded-xl',
      'hover:bg-[#1A252F] hover:shadow-xl active:bg-[#141E26] active:scale-95',
      'border border-[#212E3E] hover:border-[#1A252F]',
      'focus:ring-2 focus:ring-[#212E3E]/30'
    ],
    outline: [
      // Botão outline moderno
      'bg-white text-gray-700 shadow-md font-semibold rounded-xl',
      'hover:bg-gray-50 hover:shadow-lg active:bg-gray-100 active:scale-95',
      'border border-gray-200 hover:border-gray-300',
      'focus:ring-2 focus:ring-gray-200'
    ],
    ghost: [
      // Botão ghost moderno
      'bg-transparent text-gray-600 font-medium rounded-xl',
      'hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 active:scale-95',
      'border border-transparent hover:border-gray-200',
      'focus:ring-2 focus:ring-gray-200'
    ]
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-sm min-h-[44px]',
    lg: 'px-8 py-4 text-base min-h-[52px]'
  };

  const classes = [
    ...baseClasses,
    ...variantClasses[variant],
    sizeClasses[size],
    className
  ].join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};