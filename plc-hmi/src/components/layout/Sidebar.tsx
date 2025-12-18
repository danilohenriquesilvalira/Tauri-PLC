import React, { useState } from 'react';
import { 
  Home, 
  Gauge,
  Settings,
  Menu,
  ChevronLeft,
  Database
} from 'lucide-react';
import logoDanilo from '../../assets/Logo_Danilo.svg';

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export type SidebarProps = {
  activeItem?: string;
  onItemClick?: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Início', icon: <Home size={20} /> },
  { id: 'monitor', label: 'Monitoramento', icon: <Gauge size={20} /> },
  { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem = 'home',
  onItemClick,
  collapsed = false,
  onToggleCollapse
}) => {
  const handleItemClick = (id: string) => {
    if (onItemClick) {
      onItemClick(id);
    }
  };

  return (
    <aside className={`flex bg-edp-marine h-screen ${collapsed ? 'w-20' : 'w-64'} transition-[width] duration-300 flex-col shadow-xl flex-shrink-0`}>
      {/* Logo EDP */}
      <div className={`h-[76px] flex items-center ${collapsed ? 'justify-center' : 'justify-between'} border-b border-white/20 px-4`}>
        <div className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute' : 'opacity-100 flex-1'}`}>
          <div className="p-2 flex items-center gap-3">
            <img 
              src={logoDanilo} 
              alt="Logo Danilo" 
              className="h-12 w-auto object-contain"
            />
            <div className="flex flex-col items-center">
              <span className="text-white font-semibold text-lg">Automação</span>
              <span className="text-white/70 font-normal text-sm">Industrial</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onToggleCollapse}
          className="text-white hover:bg-white/10 transition-edp p-2 rounded-lg transform hover:scale-110 active:scale-95"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className={`space-y-2 ${collapsed ? 'px-2' : 'px-3'}`}>
          {menuItems.map((item) => {
            const isActive = activeItem === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center
                    ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'}
                    rounded-lg transition-edp transform active:scale-95
                    ${isActive 
                      ? 'bg-white/20 text-white font-semibold shadow-sm' 
                      : 'text-white hover:bg-white/10 hover:scale-105'
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className={`text-base font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className={`border-t border-white/20 transition-edp ${collapsed ? 'h-0 overflow-hidden' : 'h-auto p-4'}`}>
        <div className={`transition-edp ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-sm text-white/70 text-center">Sistema HMI</p>
          <p className="text-sm text-white/70 text-center mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
