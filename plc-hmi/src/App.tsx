import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { PlcMonitoring } from './components/plc/PlcMonitoring';
import { TcpServerConfigCompact } from './components/server/TcpServerConfigCompact';
import { FirstRunSetup } from './components/setup/FirstRunSetup';

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Mapeamento dos títulos das páginas (sempre executar, não condicional)
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      home: 'Início',
      monitor: 'Monitoramento',
      services: 'Serviços',
      settings: 'Configurações'
    };
    return titles[activeMenuItem] || 'Sistema HMI';
  }, [activeMenuItem]);

  // Verificar se é primeira execução
  useEffect(() => {
    checkFirstRun();
  }, []);

  const checkFirstRun = async () => {
    try {
      const firstRun = await invoke<boolean>('check_first_run');
      setIsFirstRun(firstRun);
    } catch (error) {
      console.error('Erro ao verificar primeira execução:', error);
      setIsFirstRun(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setIsFirstRun(false);
  };

  // Mostrar splash durante carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#1a2332] via-[#212E3E] to-[#2a3f52]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#28FF52]/30 border-t-[#28FF52] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar setup na primeira execução
  if (isFirstRun) {
    return <FirstRunSetup onComplete={handleSetupComplete} />;
  }

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
          {activeMenuItem === 'home' && <HomePage />}
          {activeMenuItem === 'monitor' && <PlcMonitoring />}
          {activeMenuItem === 'services' && <ServicesPage />}
          {activeMenuItem === 'settings' && <TcpServerConfigCompact />}
        </main>
      </div>
    </div>
  );
}

export default App;

