import { useState, useMemo } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { PlcMonitoring } from './components/plc/PlcMonitoring';
import { TcpServerConfigCompact } from './components/server/TcpServerConfigCompact';

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Mapeamento dos títulos das páginas
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      home: 'Início',
      monitor: 'Monitoramento',
      settings: 'Configurações'
    };
    return titles[activeMenuItem] || 'Sistema HMI';
  }, [activeMenuItem]);

  return (
    <div className="flex h-screen overflow-hidden bg-edp-neutral-white-wash">
      {/* Sidebar */}
      <Sidebar 
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header titulo={pageTitle} nomeUsuario="Operador" />

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Renderizar conteúdo baseado no menu ativo */}
          {activeMenuItem === 'home' && <HomePage isConnected={isConnected} />}
          {activeMenuItem === 'monitor' && <PlcMonitoring />}
          {activeMenuItem === 'settings' && <TcpServerConfigCompact />}
        </main>
      </div>
    </div>
  );
}

export default App;

