import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavProvider } from '../../contexts/NavContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <NavProvider>
      <div className="w-full h-screen flex flex-col bg-edp-neutral-white-wash overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden bg-edp-neutral-white-wash">
          <div className="h-full overflow-y-auto pb-20 lg:pb-24">
            <div className="w-full max-w-full p-4 lg:p-6 h-full">
              {children}
            </div>
          </div>
        </main>
        <Sidebar />
      </div>
    </NavProvider>
  );
};