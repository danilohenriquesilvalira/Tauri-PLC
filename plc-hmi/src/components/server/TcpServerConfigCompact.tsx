import React, { useState, useEffect } from 'react';
import { useTcpServer } from '../../hooks/useTcpServer';
import { PlcConnectionTable } from '../plc/PlcConnectionTable';
import {
  Server,
  Wifi,
  WifiOff,
  Search,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  Settings,
  Activity
} from 'lucide-react';

interface DiscoveredPlc {
  ip: string;
  port: number;
  status: 'online' | 'offline' | 'testing';
  manufacturer?: string;
  model?: string;
  response_time?: number;
}

export const TcpServerConfigCompact: React.FC = () => {
  const {
    isServerRunning,
    isPlcConnected,
    connectionStats,
    connections,
    startTcpServer,
    stopTcpServer,
    connectToPlc,
    disconnectFromPlc,
    scanNetworkForPlcs,
  } = useTcpServer();

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPlcs, setDiscoveredPlcs] = useState<DiscoveredPlc[]>([]);
  const [selectedPlc, setSelectedPlc] = useState<DiscoveredPlc | null>(null);
  const [serverPort, setServerPort] = useState(8502);

  // Detectar PLCs automaticamente quando conectarem no servidor
  useEffect(() => {
    // Não fazer scan - aguardar conexões no servidor
  }, []);

  // Simular detecção de PLC baseado nas conexões TCP
  useEffect(() => {
    if (isServerRunning && connections && Array.isArray(connections) && connections.length > 0) {
      const plcConnections = connections.filter(conn => conn?.is_plc === true);
      
      // Remover duplicatas baseado no endereço
      const uniquePlcs = plcConnections.filter((conn, index, self) =>
        index === self.findIndex(c => c.address === conn.address)
      );
      
      const detectedPlcs = uniquePlcs.map((conn) => ({
        ip: conn.address?.split(':')[0] || 'unknown',
        port: parseInt(conn.address?.split(':')[1] || '8502'),
        status: 'online' as const,
        manufacturer: 'PLC Conectado',
        model: 'TCP-Industrial',
        response_time: 1
      }));

      // Só atualizar se a lista mudou
      if (detectedPlcs.length > 0) {
        const currentAddresses = discoveredPlcs.map(p => `${p.ip}:${p.port}`);
        const newAddresses = detectedPlcs.map(p => `${p.ip}:${p.port}`);
        
        if (JSON.stringify(currentAddresses.sort()) !== JSON.stringify(newAddresses.sort())) {
          console.log('🎉 Lista de PLCs atualizada!');
          setDiscoveredPlcs(detectedPlcs);
          if (!selectedPlc) {
            setSelectedPlc(detectedPlcs[0]);
          }
        }
      }
    } else if (!isServerRunning || !connections || connections.length === 0) {
      // Limpar lista se servidor parou ou sem conexões
      if (discoveredPlcs.length > 0) {
        setDiscoveredPlcs([]);
        setSelectedPlc(null);
      }
    }
  }, [connections, isServerRunning]);

  const autoScanNetwork = async () => {
    // Não fazer scan - instruir usuário
    console.log('ℹ️ Configure seu PLC para conectar no servidor TCP');
  };

  const handleStartServer = async () => {
    if (!isServerRunning) {
      await startTcpServer(serverPort);
    }
  };

  const handleStopServer = async () => {
    if (isServerRunning) {
      console.log('🛑 Frontend: Chamando stopTcpServer...');
      const result = await stopTcpServer();
      console.log('🛑 Frontend: Resultado stopTcpServer:', result);
    }
  };

  const handleConnectToPlc = async () => {
    if (selectedPlc && !isPlcConnected) {
      console.log('🔌 Frontend: Chamando connectToPlc...', selectedPlc);
      const result = await connectToPlc(selectedPlc.ip, selectedPlc.port);
      console.log('🔌 Frontend: Resultado connectToPlc:', result);
    }
  };

  const handleDisconnectFromPlc = async () => {
    if (isPlcConnected) {
      console.log('❌ Frontend: Chamando disconnectFromPlc...');
      const result = await disconnectFromPlc();
      console.log('❌ Frontend: Resultado disconnectFromPlc:', result);
    }
  };

  const handleQuickConnect = async (plc: DiscoveredPlc) => {
    setSelectedPlc(plc);
    if (!isServerRunning) {
      await startTcpServer(serverPort);
      setTimeout(() => connectToPlc(plc.ip, plc.port), 1000);
    } else {
      await connectToPlc(plc.ip, plc.port);
    }
  };

  return (
    <div className="space-y-5">
      {/* Configurações de PLC - Foco em conexões e gerenciamento */}
      <PlcConnectionTable />
    </div>
  );
};