import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Suave entrada
      setTimeout(() => setIsAnimating(false), 10);
    } else if (isVisible) {
      handleClose();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      onClose();
    }, 200); // Duração da animação de saída
  };

  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'max-w-sm mx-2',
    md: 'max-w-md mx-2',
    lg: 'max-w-lg mx-2 sm:max-w-lg',
    xl: 'max-w-2xl mx-2 sm:max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop Moderno com Blur */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal Container Responsivo */}
      <div className="flex min-h-full items-start sm:items-center justify-center p-2 sm:p-4">
        <div 
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out font-edp ${
            isAnimating 
              ? 'opacity-0 scale-95 translate-y-4' 
              : 'opacity-100 scale-100 translate-y-0'
          } max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden`}
        >
          
          {/* Header EDP Compacto */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-edp-marine border-b border-edp-neutral-lighter rounded-t-2xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-edp-electric rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-edp-marine" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white tracking-wide font-edp">
                {title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-edp-ice hover:text-white hover:bg-edp-marine-100 rounded-lg transition-all duration-200"
              aria-label="Fechar modal"
            >
              <XMarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Content Compacto */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};