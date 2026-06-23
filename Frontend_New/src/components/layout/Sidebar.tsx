import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useNav } from '../../contexts/NavContext';

type NavItem = 'eclusa' | 'enchimento' | 'esvaziamento' | 'porta_jusante' | 'porta_montante';

const getIconSrc = (itemId: NavItem): string => {
  const icons: Record<NavItem, string> = {
    porta_jusante: '/Logo_Sidebar/PortaJusante.svg',
    porta_montante: '/Logo_Sidebar/PortaMontante.svg',
    enchimento: '/Logo_Sidebar/Enchimento.svg',
    esvaziamento: '/Logo_Sidebar/Enchimento.svg',
    eclusa: '/Logo_Sidebar/Eclusa_Regua.svg',
  };
  return icons[itemId];
};

export const Sidebar = () => {
  const [activeItem, setActiveItem] = useState<NavItem>('eclusa');
  const navigate = useNavigate();
  const location = useLocation();
  const { paramAction } = useNav();

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('eclusa') || p.includes('caldeira-eclusa')) setActiveItem('eclusa');
    else if (p.includes('porta-jusante')) setActiveItem('porta_jusante');
    else if (p.includes('porta-montante')) setActiveItem('porta_montante');
    else if (p.includes('enchimento')) setActiveItem('enchimento');
    else if (p.includes('esvaziamento')) setActiveItem('esvaziamento');
  }, [location.pathname]);

  const handleItemClick = useCallback((itemId: NavItem, path: string) => {
    setActiveItem(itemId);
    navigate(path);
  }, [navigate]);

  const navigationItems = useMemo(() => [
    { id: 'eclusa' as NavItem, label: 'Eclusa', shortLabel: 'Eclusa', path: '/eclusa-regua' },
    { id: 'enchimento' as NavItem, label: 'Enchimento', shortLabel: 'Ench.', path: '/enchimento' },
    { id: 'esvaziamento' as NavItem, label: 'Esvaziamento', shortLabel: 'Esvaz.', path: '/esvaziamento' },
    { id: 'porta_montante' as NavItem, label: 'Porta Montante', shortLabel: 'P.Mont', path: '/porta-montante' },
    { id: 'porta_jusante' as NavItem, label: 'Porta Jusante', shortLabel: 'P.Jus', path: '/porta-jusante' },
  ], []);

  return (
    <div
      className="fixed bottom-4 lg:bottom-5 left-1/2 z-50"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className="flex items-center bg-[#0c1520]/95 backdrop-blur-2xl border border-white/[0.07] rounded-2xl">

        {/* Nav items */}
        <div className="flex items-center px-1.5 py-1.5 gap-0.5">
          {navigationItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id, item.path)}
                title={item.label}
                className={`
                  relative flex flex-col items-center justify-center
                  px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-xl
                  min-w-[48px] lg:min-w-[64px]
                  transition-all duration-200 ease-out select-none touch-manipulation
                  ${isActive
                    ? 'bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]'
                  }
                `}
              >
                <img
                  src={getIconSrc(item.id)}
                  alt={item.label}
                  className={`
                    w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] brightness-0 invert
                    transition-opacity duration-200
                    ${isActive ? 'opacity-100' : 'opacity-70'}
                  `}
                />
                <span className={`
                  mt-0.5 leading-none font-medium tracking-wide text-center
                  text-[7.5px] lg:text-[9px]
                  transition-opacity duration-200
                  ${isActive ? 'opacity-100' : 'opacity-70'}
                `}>
                  <span className="lg:hidden">{item.shortLabel}</span>
                  <span className="hidden lg:inline">{item.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider + Parâmetros cog */}
        <div className="w-px self-stretch my-2 bg-white/[0.1] flex-shrink-0" />
        <div className="px-1.5 py-1.5">
          <button
            onClick={paramAction ?? undefined}
            title="Parâmetros"
            disabled={!paramAction}
            className={`
              flex flex-col items-center justify-center gap-0.5
              px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl
              min-w-[48px] lg:min-w-[56px]
              transition-all duration-200 select-none touch-manipulation
              ${paramAction
                ? 'text-white/70 hover:text-white hover:bg-white/[0.1] active:bg-white/[0.15]'
                : 'text-white/25 cursor-default'
              }
            `}
          >
            <Cog6ToothIcon className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />
            <span className="text-[7.5px] lg:text-[9px] font-medium tracking-wide leading-none">Config.</span>
          </button>
        </div>

      </div>
    </div>
  );
};
