import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PLCProvider } from './contexts/PLCContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SimulacaoProvider } from './contexts/SimulacaoContext';
import { SimulacaoEnchimentoProvider } from './contexts/SimulacaoEnchimentoContext';
import { SimulacaoEsvaziamentoProvider } from './contexts/SimulacaoEsvaziamentoContext';
import { SimulacaoPortaMontanteProvider } from './contexts/SimulacaoPortaMontanteContext';
import { SimulacaoPortaJusanteProvider } from './contexts/SimulacaoPortaJusanteContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout';
import EclusaRegua from './pages/Eclusa_Regua';
import PortaMontante from './pages/PortaMontante';
import PortaJusante from './pages/PortaJusante';
import Enchimento from './pages/Enchimento';
import Esvaziamento from './pages/Esvaziamento';
import WebSocketDebug from './pages/WebSocketDebug';
import Falhas from './pages/Falhas';
import Login from './pages/Login';

// Protege qualquer rota — redireciona para /login se não autenticado
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  // 🔒 Prevenir zoom manual — HMI com responsividade automática
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    const preventZoomWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('wheel', preventZoomWheel, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('wheel', preventZoomWheel);
    };
  }, []);

  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/eclusa-regua" replace /> : <Login />}
      />

      {/* Protected HMI routes */}
      <Route path="/eclusa-regua"    element={<ProtectedRoute><Layout><EclusaRegua /></Layout></ProtectedRoute>} />
      <Route path="/porta-montante"  element={<ProtectedRoute><Layout><PortaMontante /></Layout></ProtectedRoute>} />
      <Route path="/porta-jusante"   element={<ProtectedRoute><Layout><PortaJusante /></Layout></ProtectedRoute>} />
      <Route path="/enchimento"      element={<ProtectedRoute><Layout><Enchimento /></Layout></ProtectedRoute>} />
      <Route path="/esvaziamento"    element={<ProtectedRoute><Layout><Esvaziamento /></Layout></ProtectedRoute>} />
      <Route path="/falhas"          element={<ProtectedRoute><Layout><WebSocketDebug /></Layout></ProtectedRoute>} />
      <Route path="/debug-melhorado" element={<ProtectedRoute><Layout><Falhas /></Layout></ProtectedRoute>} />

      {/* Root → login ou eclusa */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/eclusa-regua' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/eclusa-regua' : '/login'} replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <PLCProvider>
          <SimulacaoProvider>
          <SimulacaoEnchimentoProvider>
          <SimulacaoEsvaziamentoProvider>
          <SimulacaoPortaMontanteProvider>
          <SimulacaoPortaJusanteProvider>
            <AppRoutes />
          </SimulacaoPortaJusanteProvider>
          </SimulacaoPortaMontanteProvider>
          </SimulacaoEsvaziamentoProvider>
          </SimulacaoEnchimentoProvider>
          </SimulacaoProvider>
        </PLCProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
