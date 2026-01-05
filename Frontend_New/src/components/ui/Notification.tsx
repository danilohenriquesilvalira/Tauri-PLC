// Componente de Notificação EDP - Design System
import React, { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

interface NotificationState {
  message: string;
  type: NotificationType;
  isVisible: boolean;
}

// Hook para gerenciar notificações
export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
};

// Componente de Notificação
export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getNotificationStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-edp-semantic-green/90',
          borderColor: 'border-edp-semantic-green',
          textColor: 'text-white',
          icon: CheckCircleIcon,
          iconColor: 'text-edp-electric',
        };
      case 'error':
        return {
          bgColor: 'bg-edp-semantic-red/90',
          borderColor: 'border-edp-semantic-red',
          textColor: 'text-white',
          icon: ExclamationCircleIcon,
          iconColor: 'text-white',
        };
      case 'warning':
        return {
          bgColor: 'bg-edp-semantic-yellow/90',
          borderColor: 'border-edp-semantic-yellow',
          textColor: 'text-black',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-black',
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-edp-marine/90',
          borderColor: 'border-edp-marine',
          textColor: 'text-white',
          icon: InformationCircleIcon,
          iconColor: 'text-edp-ice',
        };
    }
  };

  const styles = getNotificationStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full">
      <div 
        className={`
          ${styles.bgColor} ${styles.borderColor} ${styles.textColor}
          border-l-4 p-4 rounded-lg shadow-2xl backdrop-blur-sm
          animate-in slide-in-from-right duration-300
          flex items-start space-x-3
        `}
        role="alert"
      >
        {/* Ícone */}
        <div className="flex-shrink-0">
          <IconComponent 
            className={`h-5 w-5 ${styles.iconColor}`}
            aria-hidden="true"
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.textColor}`}>
            {message}
          </p>
        </div>

        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className={`
            flex-shrink-0 p-1 rounded-md
            hover:bg-white/20 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-white/30
          `}
          aria-label="Fechar notificação"
        >
          <XMarkIcon 
            className={`h-4 w-4 ${styles.textColor}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
};

export default Notification;