import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  AdjustmentsHorizontalIcon,
  BeakerIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

type NavItem = 'dashboard' | 'eclusa' | 'enchimento' | 'porta_jusante' | 'porta_montante' | 'usuarios' | 'falhas';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onToggle, onClose }: SidebarProps) => {
  const [activeItem, setActiveItem] = useState<NavItem>('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Detectar página atual automaticamente
  useEffect(() => {
    const pathname = location.pathname;

    if (pathname.includes('dashboard') || pathname === '/') {
      setActiveItem('dashboard');
    } else if (pathname.includes('eclusa') || pathname.includes('caldeira-eclusa')) {
      setActiveItem('eclusa');
    } else if (pathname.includes('porta-jusante')) {
      setActiveItem('porta_jusante');
    } else if (pathname.includes('porta-montante')) {
      setActiveItem('porta_montante');
    } else if (pathname.includes('enchimento')) {
      setActiveItem('enchimento');
    } else if (pathname.includes('falhas')) {
      setActiveItem('falhas');
    } else if (pathname.includes('usuarios')) {
      setActiveItem('usuarios');
    } else {
      setActiveItem('dashboard');
    }
  }, [location.pathname]);

  const handleItemClick = (itemId: NavItem, path: string) => {
    setActiveItem(itemId);
    navigate(path);
    
    // Fechar sidebar no mobile após navegação
    if (isMobile) {
      onClose();
    }
  };

  const navigationItems = [
    {
      id: 'dashboard' as NavItem,
      label: 'Dashboard',
      icon: HomeIcon,
      path: '/dashboard'
    },
    {
      id: 'eclusa' as NavItem,
      label: 'Eclusa',
      icon: RectangleStackIcon,
      path: '/eclusa-regua'
    },
    {
      id: 'enchimento' as NavItem,
      label: 'Enchimento',
      icon: BeakerIcon,
      path: '/enchimento'
    },
    {
      id: 'porta_jusante' as NavItem,
      label: 'Porta Jusante',
      icon: AdjustmentsHorizontalIcon,
      path: '/porta-jusante'
    },
    {
      id: 'porta_montante' as NavItem,
      label: 'Porta Montante',
      icon: Cog6ToothIcon,
      path: '/porta-montante'
    },
    {
      id: 'falhas' as NavItem,
      label: 'Falhas',
      icon: ExclamationTriangleIcon,
      path: '/falhas'
    },
    {
      id: 'usuarios' as NavItem,
      label: 'Usuários',
      icon: UsersIcon,
      path: '/usuarios'
    }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`
        h-screen bg-edp-marine z-50 flex flex-col transition-[width] duration-100 ease-out sticky top-0
        ${isOpen ? 'w-64' : 'w-16'}
        ${isMobile ? 'hidden' : 'flex'}
      `}>
        
        {/* Header do Sidebar */}
        <div className={`h-16 flex items-center border-b border-edp-neutral-darker flex-shrink-0 transition-[padding] duration-100 ease-out ${
          isOpen ? 'px-6 justify-between' : 'px-3 justify-center'
        }`}>
          {/* Logo EDP */}
          <div className={`flex items-center overflow-hidden transition-[width,opacity] duration-75 ease-out ${
            isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
          }`}>
            <img
              src="/LOGO_EDP_2025.svg"
              alt="EDP Logo"
              className="h-8 w-auto filter brightness-0 invert flex-shrink-0"
            />
          </div>

          {/* Toggle Button - Desktop */}
          {!isMobile && (
            <button
              onClick={onToggle}
              className={`flex items-center justify-center text-edp-neutral-lightest hover:text-edp-electric hover:bg-edp-neutral-darker rounded-lg transition-[width,height] duration-75 ease-out ${
                isOpen ? 'w-8 h-8' : 'w-10 h-10'
              }`}
              aria-label={isOpen ? "Recolher Sidebar" : "Expandir Sidebar"}
            >
              <div className="transition-transform duration-75 ease-out">
                {isOpen ? (
                  <ChevronLeftIcon className="w-5 h-5" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5" />
                )}
              </div>
            </button>
          )}


        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 overflow-y-hidden transition-[padding] duration-75 ease-out ${
          isOpen ? 'px-4' : 'px-2'
        }`}>
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id, item.path)}
                    className={`
                      w-full flex items-center rounded-lg font-edp font-medium relative group transition-[padding,gap] duration-75 ease-out
                      ${isOpen ? 'gap-3 px-3 py-3' : 'justify-center p-3'}
                      ${isActive 
                        ? 'bg-edp-electric text-edp-marine shadow-lg font-semibold' 
                        : 'text-edp-neutral-lightest hover:bg-edp-neutral-darker hover:text-edp-electric'
                      }
                    `}
                    title={!isOpen ? item.label : undefined}
                  >
                    {item.id === 'dashboard' ? (
                      <img 
                        src="/Logo_Sidebar/Dashboard.svg" 
                        alt="Dashboard" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'porta_jusante' ? (
                      <img 
                        src="/Logo_Sidebar/PortaJusante.svg" 
                        alt="Porta Jusante" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'porta_montante' ? (
                      <img 
                        src="/Logo_Sidebar/PortaMontante.svg" 
                        alt="Porta Montante" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'enchimento' ? (
                      <img 
                        src="/Logo_Sidebar/Enchimento.svg" 
                        alt="Enchimento" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'eclusa' ? (
                      <img 
                        src="/Logo_Sidebar/Eclusa_Regua.svg" 
                        alt="Eclusa" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'falhas' ? (
                      <img 
                        src="/Logo_Sidebar/Falhas.svg" 
                        alt="Falhas" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : item.id === 'usuarios' ? (
                      <img 
                        src="/Logo_Sidebar/Usuarios.svg" 
                        alt="Usuários" 
                        className={`w-6 h-6 flex-shrink-0 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                      />
                    ) : (
                      <Icon className="w-5 h-5 flex-shrink-0" />
                    )}
                    
                    <div className={`flex items-center justify-between flex-1 overflow-hidden transition-[width,opacity] duration-50 ease-out ${
                      isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
                    }`}>
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="w-2 h-2 bg-edp-marine rounded-full ml-auto flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Tooltip for collapsed state */}
                    {!isOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-edp-neutral-darkest text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0">
          {/* Copyright Info */}
          <div className={`overflow-hidden transition-[height,opacity] duration-75 ease-out ${
            isOpen ? 'h-auto opacity-100' : 'h-0 opacity-0'
          }`}>
            <div className="p-4">
              <div className="text-center">
                <div className="text-xs text-edp-neutral-light font-edp font-medium">
                  Sistema HMI EDP
                </div>
                <div className="text-xs text-edp-neutral-medium font-edp mt-1">
                  © 2025 EDP Portugal
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-edp-marine border-t border-edp-neutral-darker h-16">
          <div className="grid grid-cols-7 gap-0 h-full">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.path)}
                  className={`
                    flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 h-full
                    ${isActive 
                      ? 'text-edp-electric border-t-2 border-edp-electric bg-edp-electric/10' 
                      : 'text-edp-neutral-lightest hover:text-edp-electric hover:bg-edp-electric/5'
                    }
                  `}
                >
                  {item.id === 'dashboard' ? (
                    <img 
                      src="/Logo_Sidebar/Dashboard.svg" 
                      alt="Dashboard" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'porta_jusante' ? (
                    <img 
                      src="/Logo_Sidebar/PortaJusante.svg" 
                      alt="Porta Jusante" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'porta_montante' ? (
                    <img 
                      src="/Logo_Sidebar/PortaMontante.svg" 
                      alt="Porta Montante" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'enchimento' ? (
                    <img 
                      src="/Logo_Sidebar/Enchimento.svg" 
                      alt="Enchimento" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'eclusa' ? (
                    <img 
                      src="/Logo_Sidebar/Eclusa_Regua.svg" 
                      alt="Eclusa" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'falhas' ? (
                    <img 
                      src="/Logo_Sidebar/Falhas.svg" 
                      alt="Falhas" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : item.id === 'usuarios' ? (
                    <img 
                      src="/Logo_Sidebar/Usuarios.svg" 
                      alt="Usuários" 
                      className={`w-6 h-6 mb-1 ${isActive ? 'brightness-0 saturate-100' : ''}`}
                      style={isActive ? { filter: 'brightness(0) saturate(100%) invert(11%) sepia(22%) saturate(1687%) hue-rotate(193deg) brightness(96%) contrast(92%)' } : {}}
                    />
                  ) : (
                    <Icon className="w-5 h-5 mb-1" />
                  )}
                  <span className="text-[10px] font-edp font-medium text-center leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};