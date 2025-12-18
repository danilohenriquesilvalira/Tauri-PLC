import React from 'react';
import { Bell, User, Settings, LogOut } from 'lucide-react';

export type HeaderProps = {
  titulo?: string;
  nomeUsuario?: string;
};

export const Header: React.FC<HeaderProps> = ({
  titulo = 'Dashboard HMI',
  nomeUsuario = 'Operador'
}) => {
  return (
    <header className="bg-edp-neutral-white-wash border-b border-edp-marine border-opacity-20">
      <div className="px-8 h-[76px] flex items-center justify-between">
        {/* Título */}
        <div>
          <h1 className="text-3xl font-bold text-edp-marine">
            {titulo}
          </h1>
        </div>

        {/* Ações do usuário */}
        <div className="flex items-center gap-4">
          {/* Notificações */}
          <button className="relative p-2 text-edp-slate hover:text-edp-marine rounded-lg transition-edp transform hover:scale-110 active:scale-95">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-edp-electric rounded-full animate-pulse"></span>
          </button>

          {/* Configurações */}
          <button className="p-2 text-edp-slate hover:text-edp-marine rounded-lg transition-edp transform hover:scale-110 active:scale-95">
            <Settings size={20} />
          </button>

          {/* Divisor */}
          <div className="h-8 w-px bg-edp-marine/30"></div>

          {/* Usuário */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-edp-marine">{nomeUsuario}</p>
              <p className="text-xs text-edp-slate">Operador</p>
            </div>

            {/* Avatar com menu */}
            <div className="relative group">
              <button className="w-10 h-10 bg-edp-marine text-white rounded-full flex items-center justify-center hover:bg-edp-marine-100 transition-edp transform hover:scale-110 active:scale-95 shadow-sm">
                <User size={20} />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-xl border border-edp-marine/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-edp transform translate-y-2 group-hover:translate-y-0 z-50">
                <button className="w-full px-4 py-3 text-left text-sm text-edp-slate hover:bg-edp-neutral-white-wash flex items-center gap-2 rounded-t-lg transition-edp-fast hover:translate-x-1">
                  <User size={16} />
                  Meu Perfil
                </button>
                <button className="w-full px-4 py-3 text-left text-sm text-edp-slate hover:bg-edp-neutral-white-wash flex items-center gap-2 transition-edp-fast hover:translate-x-1">
                  <Settings size={16} />
                  Configurações
                </button>
                <hr className="border-edp-marine/20" />
                <button className="w-full px-4 py-3 text-left text-sm text-edp-semantic-red hover:bg-edp-semantic-light-red flex items-center gap-2 rounded-b-lg transition-edp-fast hover:translate-x-1">
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
