import { useLocation } from 'react-router-dom';

export const Header = () => {
  const location = useLocation();

  // Função para obter o nome da página atual
  const getPageTitle = () => {
    const pathname = location.pathname;

    if (pathname.includes('eclusa-regua') || pathname === '/') {
      return 'Eclusa';
    } else if (pathname.includes('porta-jusante')) {
      return 'Porta Jusante';
    } else if (pathname.includes('porta-montante')) {
      return 'Porta Montante';
    } else if (pathname.includes('esvaziamento')) {
      return 'Esvaziamento';
    } else if (pathname.includes('enchimento')) {
      return 'Enchimento';
    } else if (pathname.includes('sistema-agua')) {
      return 'Sistema de Agua Purificada';
    } else if (pathname.includes('falhas')) {
      return 'Falhas';
    } else {
      return 'Eclusa';
    }
  };

  return (
    <header className="h-16 bg-edp-marine border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between relative z-20">

      {/* Logo + Nome da Página */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <img
          src="/EDP_Original.svg"
          alt="EDP"
          className="h-7 sm:h-8 lg:h-9 w-auto select-none flex-shrink-0"
          draggable={false}
        />
        <div className="w-px h-6 sm:h-7 bg-white/15 flex-shrink-0" />
        <h1 className="text-base sm:text-lg lg:text-xl font-edp font-medium text-white/90 tracking-wide truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Actions Area */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">

        {/* Avatar do utilizador */}
        <button
          type="button"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-edp-electric/40 transition-all duration-200 flex-shrink-0"
          title="Perfil"
        >
          <img
            src="/Avatar/Avatar_0.svg"
            alt="Avatar do utilizador"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </button>

      </div>
    </header>
  );
};
