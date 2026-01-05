import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="w-full h-screen flex bg-edp-neutral-white-wash overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar 
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-hidden bg-edp-neutral-white-wash">
          <div className="h-full overflow-y-auto">
            <div className="w-full max-w-full p-4 lg:p-6 h-full">
              {typeof children === 'object' && children && 'type' in children ? 
                React.cloneElement(children as React.ReactElement, { sidebarOpen: isSidebarOpen }) : 
                children
              }
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};