import { useState, useEffect, useCallback } from 'react';
import { ActiveFault, FAULT_DEFINITIONS, EQUIPMENT_CATEGORIES } from '../types/faults';

interface UseFaultDetectorProps {
  plcData: any; // Dados do WebSocket
}

export const useFaultDetector = ({ plcData }: UseFaultDetectorProps) => {
  const [activeFaults, setActiveFaults] = useState<ActiveFault[]>([]);

  // Detectar falhas ativas nos dados do PLC
  const detectActiveFaults = useCallback((data: any) => {
    if (!data?.bit_data?.alarm_bits) return;

    const newActiveFaults: ActiveFault[] = [];
    const timestamp = new Date().toISOString();

    // Verificar cada AlarmBit
    data.bit_data.alarm_bits.forEach((wordBits: boolean[], alarmIndex: number) => {
      const wordIndex = 17 + alarmIndex; // AlarmBits[0] = Word 17

      wordBits.forEach((bitValue: boolean, bitIndex: number) => {
        const key = `${wordIndex}_${bitIndex}`;
        const definition = FAULT_DEFINITIONS[key];

        if (definition && bitValue) {
          newActiveFaults.push({
            wordIndex: definition.wordIndex,
            bitIndex: definition.bitIndex,
            equipment: definition.equipment,
            description: definition.description,
            type: definition.type,
            severity: definition.severity,
            timestamp,
            isActive: true
          });
        }
      });
    });

    // Verificar EventBits (Words 48-64)
    if (data.bit_data.event_bits) {
      data.bit_data.event_bits.forEach((wordBits: boolean[], eventIndex: number) => {
        const wordIndex = 48 + eventIndex; // EventBits[0] = Word 48

        wordBits.forEach((bitValue: boolean, bitIndex: number) => {
          const key = `${wordIndex}_${bitIndex}`;
          const definition = FAULT_DEFINITIONS[key];

          if (definition && bitValue) {
            newActiveFaults.push({
              wordIndex: definition.wordIndex,
              bitIndex: definition.bitIndex,
              equipment: definition.equipment,
              description: definition.description,
              type: definition.type,
              severity: definition.severity,
              timestamp,
              isActive: true
            });
          }
        });
      });
    }

    // Atualizar falhas ativas
    setActiveFaults(newActiveFaults);

  }, []);

  // Processar dados do WebSocket
  useEffect(() => {
    if (plcData) {
      detectActiveFaults(plcData);
    }
  }, [plcData, detectActiveFaults]);

  // Estatísticas por categoria
  const getStatsByCategory = useCallback(() => {
    const stats: Record<string, { count: number; severity: string; color: string }> = {};

    activeFaults.forEach(fault => {
      const category = EQUIPMENT_CATEGORIES[fault.equipment];
      if (!stats[fault.equipment]) {
        stats[fault.equipment] = {
          count: 0,
          severity: 'LOW',
          color: category?.color || '#gray'
        };
      }
      
      stats[fault.equipment].count++;
      
      // Determinar severidade mais alta
      if (fault.severity === 'CRITICAL' || 
          (fault.severity === 'HIGH' && stats[fault.equipment].severity !== 'CRITICAL') ||
          (fault.severity === 'MEDIUM' && !['CRITICAL', 'HIGH'].includes(stats[fault.equipment].severity))) {
        stats[fault.equipment].severity = fault.severity;
      }
    });

    return stats;
  }, [activeFaults]);

  return {
    activeFaults,
    faultCount: activeFaults.length,
    criticalFaults: activeFaults.filter(f => f.severity === 'CRITICAL'),
    statsByCategory: getStatsByCategory()
  };
};