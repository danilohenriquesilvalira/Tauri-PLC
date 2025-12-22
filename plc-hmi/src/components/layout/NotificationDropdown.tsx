import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useNotificationContext } from '../../contexts/NotificationContext';
import type { Notification } from '../../hooks/useNotifications';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationContext();

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} className="text-edp-semantic-red" />;
      case 'warning': return <AlertTriangle size={16} className="text-edp-semantic-yellow" />;
      case 'success': return <CheckCircle size={16} className="text-edp-electric" />;
      case 'info': default: return <Info size={16} className="text-edp-marine" />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div className="relative">
      {/* Botão do sino */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-edp-slate hover:text-edp-marine rounded-lg transition-edp transform hover:scale-110 active:scale-95"
      >
        <Bell size={20} />
        
        {/* Badge de notificações não lidas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-edp-semantic-red text-white text-xs font-semibold rounded-full flex items-center justify-center badge-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Indicador de atividade quando há notificações */}
        {hasNotifications && unreadCount === 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-edp-electric rounded-full"></span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-edp-marine/30 z-50 max-h-[80vh] flex flex-col">
            {/* Header do dropdown */}
            <div className="px-4 py-3 border-b border-edp-marine/20 flex items-center justify-between bg-edp-neutral-white-wash rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-edp-marine" />
                <h3 className="font-semibold text-edp-marine">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="bg-edp-semantic-red text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              {/* Ações do header */}
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-edp-slate hover:text-edp-marine rounded transition-edp hover:bg-white"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                
                {hasNotifications && (
                  <button
                    onClick={clearAll}
                    className="p-1.5 text-edp-slate hover:text-edp-semantic-red rounded transition-edp hover:bg-white"
                    title="Limpar todas"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de notificações */}
            <div className="flex-1 overflow-y-auto">
              {!hasNotifications ? (
                <div className="px-4 py-8 text-center text-edp-slate">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                  <p className="text-xs opacity-75">Você está em dia!</p>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 border-b border-edp-marine/10 hover:bg-edp-neutral-white-wash cursor-pointer transition-edp group relative ${
                        !notification.read ? 'bg-gradient-to-r from-edp-electric/5 to-transparent border-l-2 border-l-edp-electric' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Ícone do tipo */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getIconForType(notification.type)}
                        </div>
                        
                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium text-edp-marine ${!notification.read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-edp-slate">
                                {formatTime(notification.timestamp)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-edp-slate hover:text-edp-semantic-red rounded transition-edp"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-edp-slate mt-0.5 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          {notification.plcIp && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-xs bg-edp-marine/10 text-edp-marine px-2 py-0.5 rounded font-mono">
                                {notification.plcIp}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Indicador não lida */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-edp-electric rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer (se houver muitas notificações) */}
            {notifications.length >= 10 && (
              <div className="px-4 py-2 border-t border-edp-marine/20 bg-edp-neutral-white-wash rounded-b-lg">
                <p className="text-xs text-edp-slate text-center">
                  Mostrando {Math.min(notifications.length, 50)} de {notifications.length} notificações
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};