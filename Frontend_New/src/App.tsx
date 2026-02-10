import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PLCProvider } from './contexts/PLCContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/layout';
import Dashboard from './pages/Dashboard';
import EclusaRegua from './pages/Eclusa_Regua';
import PortaMontante from './pages/PortaMontante';
import PortaJusante from './pages/PortaJusante';
import Enchimento from './pages/Enchimento';
import WebSocketDebug from './pages/WebSocketDebug';
import Falhas from './pages/Falhas';

const App = () => {
  // 🔒 PREVENIR ZOOM MANUAL - Aplicação HMI com responsividade automática
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventZoomWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Prevenir pinch-to-zoom
    document.addEventListener('touchmove', preventZoom, { passive: false });
    
    // Prevenir zoom via Ctrl+Scroll
    document.addEventListener('wheel', preventZoomWheel, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('wheel', preventZoomWheel);
    };
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <PLCProvider>
          <Routes>
            {/* Rotas do Sistema HMI */}
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />

            <Route
              path="/eclusa-regua"
              element={
                <Layout>
                  <EclusaRegua />
                </Layout>
              }
            />

            <Route
              path="/porta-montante"
              element={
                <Layout>
                  <PortaMontante />
                </Layout>
              }
            />

            <Route
              path="/porta-jusante"
              element={
                <Layout>
                  <PortaJusante />
                </Layout>
              }
            />

            <Route
              path="/enchimento"
              element={
                <Layout>
                  <Enchimento />
                </Layout>
              }
            />

            <Route
              path="/falhas"
              element={
                <Layout>
                  <WebSocketDebug />
                </Layout>
              }
            />

            <Route
              path="/debug-melhorado"
              element={
                <Layout>
                  <Falhas />
                </Layout>
              }
            />
            
            {/* Rota Raiz - Redireciona para Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Rota 404 - Redireciona para Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </PLCProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
