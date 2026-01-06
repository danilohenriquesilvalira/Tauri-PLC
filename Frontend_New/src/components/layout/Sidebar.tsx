import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Detectar se é mobile - OTIMIZADO COM DEBOUNCE
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkIsMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newIsMobile = window.innerWidth < 1024;
        setIsMobile(prev => prev !== newIsMobile ? newIsMobile : prev); // Só atualiza se mudou
      }, 150); // Debounce 150ms
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkIsMobile);
    };
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

  const handleItemClick = useCallback((itemId: NavItem, path: string) => {
    setActiveItem(itemId);
    navigate(path);
    
    // Fechar sidebar no mobile após navegação
    if (isMobile) {
      onClose();
    }
  }, [isMobile, navigate, onClose]);

  // Função SIMPLES para ícones
  const getIconSrc = (itemId: NavItem): string => {
    const icons = {
      dashboard: '/Logo_Sidebar/Dashboard.svg',
      porta_jusante: '/Logo_Sidebar/PortaJusante.svg', 
      porta_montante: '/Logo_Sidebar/PortaMontante.svg',
      enchimento: '/Logo_Sidebar/Enchimento.svg',
      eclusa: '/Logo_Sidebar/Eclusa_Regua.svg',
      falhas: '/Logo_Sidebar/Falhas.svg',
      usuarios: '/Logo_Sidebar/Usuarios.svg'
    };
    return icons[itemId];
  };

  const navigationItems = useMemo(() => [
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
  ], []);

  return (
    <>
      {/* Desktop Sidebar - SEM TRANSIÇÕES */}
      <aside className={`
        h-screen bg-edp-marine z-50 flex flex-col sticky top-0 
        ${isOpen ? 'w-64' : 'w-16'}
        ${isMobile ? 'hidden' : 'flex'}
      `}>
        
        {/* Header do Sidebar */}
        <div className={`h-16 flex items-center border-b border-edp-neutral-darker flex-shrink-0 ${
          isOpen ? 'px-6 justify-between' : 'px-3 justify-center'
        }`}>
          {/* Logo EDP */}
          {isOpen && (
            <div className="flex items-center">
              <img
                src="/LOGO_EDP_2025.svg"
                alt="EDP Logo"
                className="h-10 w-auto filter brightness-0 invert flex-shrink-0"
              />
            </div>
          )}

          {/* Toggle Button - Desktop */}
          {!isMobile && (
            <button
              onClick={onToggle}
              className={`flex items-center justify-center text-white hover:bg-white/10 rounded-lg ${
                isOpen ? 'w-8 h-8' : 'w-10 h-10'
              }`}
              aria-label={isOpen ? "Recolher Sidebar" : "Expandir Sidebar"}
            >
              {isOpen ? (
                <ChevronLeftIcon className="w-5 h-5" />
              ) : (
                <ChevronRightIcon className="w-5 h-5" />
              )}
            </button>
          )}


        </div>

        {/* Navigation - ZERO CONFLITOS */}
        <nav className={`flex-1 py-6 overflow-hidden ${isOpen ? 'px-4' : 'px-2'}`}>
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = activeItem === item.id;
              
              return (
                <li key={item.id}>
                  {isOpen ? (
                    // VERSÃO EXPANDIDA
                    <button
                      onClick={() => handleItemClick(item.id, item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg font-edp font-medium transition-all duration-200
                        ${isActive 
                          ? 'bg-white/20 text-white font-semibold shadow-sm' 
                          : 'text-white hover:bg-white/10 hover:scale-105'
                        }
                      `}
                    >
                      <img 
                        src={getIconSrc(item.id)}
                        alt={item.label}
                        className="w-6 h-6 flex-shrink-0 brightness-0 invert"
                      />
                      <div className="flex items-center justify-between flex-1">
                        <span className="truncate whitespace-nowrap">{item.label}</span>
                        {isActive && (
                          <div className="w-2 h-2 bg-white rounded-full ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ) : (
                    // VERSÃO RECOLHIDA
                    <button
                      onClick={() => handleItemClick(item.id, item.path)}
                      className={`
                        w-full flex justify-center p-3 rounded-lg font-edp font-medium relative group transition-all duration-200
                        ${isActive 
                          ? 'bg-white/20 text-white font-semibold shadow-sm' 
                          : 'text-white hover:bg-white/10 hover:scale-105'
                        }
                      `}
                      title={item.label}
                    >
                      <img 
                        src={getIconSrc(item.id)}
                        alt={item.label}
                        className="w-6 h-6 brightness-0 invert"
                      />
                      
                      {/* Tooltip */}
                      <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="flex-shrink-0 p-4">
            <div className="text-center">
              <div className="text-xs text-edp-neutral-light font-edp font-medium">
                Sistema HMI EDP
              </div>
              <div className="text-xs text-edp-neutral-medium font-edp mt-1">
                © 2025 EDP Portugal
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-edp-marine border-t border-edp-neutral-darker h-16">
          <div className="grid grid-cols-7 gap-0 h-full">
            {navigationItems.map((item) => {
              const isActive = activeItem === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.path)}
                  className={`
                    flex flex-col items-center justify-center py-2 px-1 h-full transition-all duration-200
                    ${isActive 
                      ? 'text-white border-t-2 border-white bg-white/20' 
                      : 'text-white hover:bg-white/10'
                    }
                  `}
                >
                  <img 
                    src={getIconSrc(item.id)}
                    alt={item.label}
                    className="w-6 h-6 mb-1 brightness-0 invert"
                  />
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