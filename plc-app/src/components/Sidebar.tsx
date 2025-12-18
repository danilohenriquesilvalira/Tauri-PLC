/**
 * Componente: Sidebar
 * 
 * Barra lateral de navegação geral da aplicação
 * Cor de fundo: Marine Blue (#212E3E)
 * Texto: Branco
 * Hover: Electric Green (#28FF52) com texto Marine
 */

import React from 'react';
import { 
  Home, 
  Cpu,
  Video,
  Menu,
  ChevronLeft
} from 'lucide-react';
import logoEDP from '../assets/Logo_EDP.svg';

type ItemMenu = {
  id: string;
  label: string;
  icone: React.ReactNode;
  rota: string;
};

export type PropsSidebar = {
  itemAtivo?: string;
  aoClicarItem?: (id: string) => void;
  aoRecolher?: () => void;
  recolhido?: boolean;
};

const itensMenu: ItemMenu[] = [
  { id: 'visao-geral', label: 'Visão Geral', icone: <Home size={20} />, rota: '/' },
  { id: 'bits', label: 'Configurações de Bits', icone: <Cpu size={20} />, rota: '/bits' },
  { id: 'publicidade', label: 'Publicidade', icone: <Video size={20} />, rota: '/publicidade' },
];

export const Sidebar: React.FC<PropsSidebar> = ({
  itemAtivo = 'inicio',
  aoClicarItem,
  aoRecolher,
  recolhido = false
}) => {
  const handleItemClick = (id: string) => {
    if (aoClicarItem) {
      aoClicarItem(id);
    }
  };

  return (
    <>
      <aside className={`flex bg-edp-marine h-screen ${recolhido ? 'w-20' : 'w-64'} transition-[width] duration-300 ease-in-out flex-col shadow-xl flex-shrink-0`}>
        {/* Logo EDP com botão recolher */}
        <div className={`h-[76px] flex items-center ${recolhido ? 'justify-center' : 'justify-between'} border-b border-white border-opacity-20 flex-shrink-0 px-4`}>
          <div className={`transition-all duration-300 ${recolhido ? 'opacity-0 w-0 overflow-hidden absolute' : 'opacity-100 flex-1'}`}>
            {/* Margem de segurança EDP: altura "x" da espiral ao redor do logo */}
            <div className="p-2">
              <img 
                src={logoEDP} 
                alt="Logo EDP" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
          <button 
            onClick={aoRecolher}
            className="text-white hover:text-white transition-all duration-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transform hover:scale-110 active:scale-95"
            title={recolhido ? 'Expandir' : 'Recolher'}
          >
            {recolhido ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Menu de Navegação */}
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className={`space-y-2 ${recolhido ? 'px-2' : 'px-3'}`}>
            {itensMenu.map((item) => {
              const isAtivo = itemAtivo === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full
                      flex
                      items-center
                      ${recolhido ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'}
                      rounded-lg
                      transition-edp
                      transform
                      active:scale-95
                      ${isAtivo 
                        ? 'bg-white bg-opacity-20 text-white font-semibold shadow-sm' 
                        : 'text-headline-on-marine hover:bg-white hover:bg-opacity-10 hover:text-white hover:scale-105'
                      }
                    `}
                    title={recolhido ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">
                      {item.icone}
                    </span>
                    <span className={`text-base font-medium transition-all duration-300 whitespace-nowrap ${recolhido ? 'opacity-0 w-0 overflow-hidden absolute' : 'opacity-100'}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé */}
        <div className={`border-t border-white border-opacity-20 flex-shrink-0 transition-edp ${recolhido ? 'h-0 overflow-hidden' : 'h-auto p-4'}`}>
          <div className={`transition-edp ${recolhido ? 'opacity-0' : 'opacity-100'}`}>
            <p className="text-sm text-body-on-marine opacity-70 text-center">
              Sistema PLC EDP
            </p>
            <p className="text-sm text-white opacity-70 text-center mt-1">
              v1.0.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
