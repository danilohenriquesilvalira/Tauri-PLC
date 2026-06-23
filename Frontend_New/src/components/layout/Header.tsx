import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export const Header = () => {
  const location          = useLocation();
  const navigate          = useNavigate();
  const { logout }        = useAuth();
  const [open, setOpen]   = useState(false);
  const dropRef           = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('eclusa-regua') || p === '/')   return 'Eclusa';
    if (p.includes('porta-jusante'))               return 'Porta Jusante';
    if (p.includes('porta-montante'))              return 'Porta Montante';
    if (p.includes('esvaziamento'))                return 'Esvaziamento';
    if (p.includes('enchimento'))                  return 'Enchimento';
    if (p.includes('sistema-agua'))                return 'Sistema de Agua Purificada';
    if (p.includes('falhas'))                      return 'Falhas';
    return 'Eclusa';
  };

  return (
    <header className="h-16 bg-edp-marine border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between relative z-20">

      {/* Logo + Título */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <img src="/EDP_Original.svg" alt="EDP"
          className="h-7 sm:h-8 lg:h-9 w-auto select-none flex-shrink-0"
          draggable={false}
        />
        <div className="w-px h-6 sm:h-7 bg-white/15 flex-shrink-0" />
        <h1 className="text-base sm:text-lg lg:text-xl font-edp font-medium text-white/90 tracking-wide truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Avatar + dropdown */}
      <div className="relative flex-shrink-0" ref={dropRef}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-white/30 transition-all duration-200 flex-shrink-0"
          title="Perfil"
        >
          <img
            src="/Avatar/Avatar_0.svg"
            alt="Avatar"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(10,20,36,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2.5">
              <UserCircleIcon className="w-5 h-5 text-white/40 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/80 text-xs font-medium truncate">Administrador</p>
                <p className="text-white/30 text-[10px] truncate">admin</p>
              </div>
            </div>

            {/* Sair */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">Sair da sessão</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
