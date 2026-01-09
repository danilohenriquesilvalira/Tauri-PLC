import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// 🎯 HOOK PARA SUBSCRIBE INTELIGENTE POR PÁGINA
// ============================================================================
// Cada página pode usar este hook para fazer subscribe apenas dos tags que precisa.
// Isso otimiza o tráfego de rede e o processamento no frontend.
// ============================================================================

// Áreas disponíveis
export type Area = 'ENCH' | 'ESVZ' | 'JUS' | 'MONT' | 'ESGT' | 'ECLUS';

// Categorias disponíveis  
export type Category = 'PROC' | 'FAULT' | 'EVENT';

// Configuração de subscribe
export interface SubscribeConfig {
  areas?: Area[];
  categories?: Category[];
  includeAllFaults?: boolean;
  plcIps?: string[];
}

// Configurações pré-definidas por página
export const PAGE_SUBSCRIPTIONS: Record<string, SubscribeConfig> = {
  // Página principal - recebe tudo
  'dashboard': {
    areas: ['ENCH', 'ESVZ', 'JUS', 'MONT', 'ESGT', 'ECLUS'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Página Eclusa Régua - visão geral
  'eclusa': {
    areas: ['ENCH', 'ESVZ', 'JUS', 'MONT', 'ESGT', 'ECLUS'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Página Enchimento - apenas área ENCH
  'enchimento': {
    areas: ['ENCH'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Página Porta Jusante - apenas área JUS
  'porta-jusante': {
    areas: ['JUS'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Página Porta Montante - apenas área MONT
  'porta-montante': {
    areas: ['MONT'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Página de Falhas - apenas categorias FAULT e EVENT de todas as áreas
  'falhas': {
    areas: ['ENCH', 'ESVZ', 'JUS', 'MONT', 'ESGT', 'ECLUS'],
    categories: ['FAULT', 'EVENT'],
    includeAllFaults: true
  },
  
  // Debug - recebe tudo
  'debug': {
    areas: ['ENCH', 'ESVZ', 'JUS', 'MONT', 'ESGT', 'ECLUS'],
    categories: ['PROC', 'FAULT', 'EVENT'],
    includeAllFaults: true
  }
};

/**
 * Hook para gerenciar subscribe de uma página específica
 * @param ws - Referência ao WebSocket
 * @param pageName - Nome da página (chave em PAGE_SUBSCRIPTIONS)
 * @param customConfig - Configuração customizada (opcional, sobrescreve a padrão)
 */
export const usePageSubscribe = (
  ws: WebSocket | null,
  pageName: string,
  customConfig?: SubscribeConfig
) => {
  const hasSubscribedRef = useRef(false);

  const sendSubscribe = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket não conectado, subscribe adiado');
      return false;
    }

    const config = customConfig || PAGE_SUBSCRIPTIONS[pageName] || PAGE_SUBSCRIPTIONS['dashboard'];
    
    const subscribeCmd = {
      type: 'SUBSCRIBE',
      plc_ips: config.plcIps || [],
      areas: config.areas || [],
      categories: config.categories || [],
      include_all_faults: config.includeAllFaults ?? true
    };

    try {
      ws.send(JSON.stringify(subscribeCmd));
      if (import.meta.env.DEV) {
        console.log(`📡 [${pageName}] Subscribe enviado:`, subscribeCmd);
      }
      hasSubscribedRef.current = true;
      return true;
    } catch (error) {
      console.error(`❌ [${pageName}] Erro ao enviar subscribe:`, error);
      return false;
    }
  }, [ws, pageName, customConfig]);

  // Enviar subscribe quando WebSocket conectar
  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN && !hasSubscribedRef.current) {
      // ⚡ OTIMIZAÇÃO: Send imediato para máxima velocidade
      sendSubscribe();
    }
  }, [ws?.readyState, sendSubscribe]);

  // Reset flag quando WebSocket desconectar
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      hasSubscribedRef.current = false;
    }
  }, [ws?.readyState]);

  return {
    sendSubscribe,
    isSubscribed: hasSubscribedRef.current
  };
};

/**
 * Helper para criar configuração de subscribe customizada
 */
export const createSubscribeConfig = (
  areas: Area[],
  categories: Category[] = ['PROC', 'FAULT', 'EVENT'],
  includeAllFaults: boolean = true
): SubscribeConfig => ({
  areas,
  categories,
  includeAllFaults
});
