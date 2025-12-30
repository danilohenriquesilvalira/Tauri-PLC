import React, { useState, useEffect } from 'react';
import { useTcpServer } from '../../hooks/useTcpServer';
import { PlcConnectionTable } from '../plc/PlcConnectionTable';
// Todos os imports de ícones foram removidos pois não são utilizados no JSX
// Mantendo apenas o necessário para o futuro

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
    connections,
  } = useTcpServer();

  const [discoveredPlcs, setDiscoveredPlcs] = useState<DiscoveredPlc[]>([]);
  const [selectedPlc, setSelectedPlc] = useState<DiscoveredPlc | null>(null);

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


  return (
    <div className="space-y-5">
      {/* Configurações de PLC - Foco em conexões e gerenciamento */}
      <PlcConnectionTable />
    </div>
  );
};