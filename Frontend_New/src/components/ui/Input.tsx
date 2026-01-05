import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline' | 'login';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  variant = 'default',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = [
    // INPUTS QUADRADOS EDP - SEM BORDER RADIUS
    'w-full font-edp transition-all duration-200',
    'focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-edp-neutral-100',
    'placeholder:text-edp-neutral-500'
  ];

  const variantClasses = {
    default: [
      // Input mais fino e elegante
      'border border-gray-200 bg-white text-gray-900 rounded-lg',
      'hover:border-gray-300',
      'focus:border-[#7C9599] focus:ring-1 focus:ring-[#7C9599]/30',
      error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''
    ],
    filled: [
      // Input preenchido moderno
      'border border-transparent bg-gray-50 text-gray-900 rounded-xl',
      'hover:bg-gray-100 focus:bg-white focus:border-[#7C9599] focus:ring-2 focus:ring-[#7C9599]/20',
      error ? 'bg-red-50 border-red-300 focus:border-red-400 focus:ring-red-100' : ''
    ],
    outline: [
      // Input outline com Electric Green
      'border-2 border-edp-electric bg-transparent text-edp-neutral-900',
      'hover:border-edp-electric/80',
      'focus:border-edp-electric',
      error ? 'border-red-500 focus:border-red-500' : ''
    ],
    login: [
      // Input para página de login com tema dark
      'border-2 border-white/20 bg-white/10 text-white rounded-xl',
      'hover:border-white/30',
      'focus:border-edp-electric focus:bg-white/15',
      'placeholder:text-white/50',
      error ? 'border-red-400 focus:border-red-400' : ''
    ]
  };

  const paddingClasses = leftIcon || rightIcon 
    ? leftIcon && rightIcon 
      ? 'px-10 py-2.5'
      : leftIcon 
        ? 'pl-10 pr-3 py-2.5'
        : 'pl-3 pr-10 py-2.5'
    : 'px-3 py-2.5';

  const inputClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    paddingClasses,
    'min-h-[42px]',
    className
  ].join(' ');

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className={`block text-sm font-medium mb-2 ${
            variant === 'login' ? 'text-white/90' : 'text-gray-700'
          }`}
        >
          {label}
        </label>
      )}
      
      <div className="relative group">
        {leftIcon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 ${
            variant === 'login' ? 'text-white/60 group-focus-within:text-edp-electric' : 'text-edp-neutral-500'
          }`}>
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
            variant === 'login' ? 'text-white/60' : 'text-edp-neutral-500'
          }`}>
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className={`mt-2 text-sm font-edp font-medium ${
          variant === 'login' ? 'text-red-400' : 'text-red-600'
        }`}>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="mt-2 text-sm font-edp text-edp-neutral-600">
          {helper}
        </p>
      )}
    </div>
  );
});