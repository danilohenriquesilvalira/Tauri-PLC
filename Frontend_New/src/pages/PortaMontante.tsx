import React from 'react';
import { usePLC } from '../contexts/PLCContext';
import ContraPeso20t from '../components/Porta_Montante/Porta_Montante_Contrapeso';
import PortaMontanteRegua from '../components/Porta_Montante/PortaMontanteRegua';
import MotorMontante from '../components/Porta_Montante/Motor_Montante';
import { Card } from '../components/ui/Card';
import { InfoCard } from '../components/ui/InfoCard';
import { StatusCard } from '../components/ui/StatusCard';
import {
  CogIcon,
  PlayIcon,
  StopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

// Declaração global para window.lastContrapesoTime
declare global {
  interface Window {
    lastContrapesoTime?: number;
  }
}


interface PortaMontanteProps {
  sidebarOpen?: boolean;
}

// 🟢 CONFIGURAÇÃO DOS RETÂNGULOS DE DEMARCAÇÃO - ÁREAS LATERAIS LIVRES
// 📍 Posição é FIXA, apenas largura/altura/gap são ajustáveis
const DEMARCACAO_LATERAL_CONFIG = {
  desktop: {
    gap: 20,                     // 📏 Espaçamento entre retângulos e SVG (px)
    esquerdo: {
      verticalPercent: 0,        // % da altura (topo = 0)
      widthPercent: 50,          // % da largura total - comprime se não couber
      heightPercent: 110,        // % da altura total - AUMENTADO para cards maiores
    },
    direito: {
      verticalPercent: 0,        // % da altura (topo = 0)
      widthPercent: 50,          // % da largura total - comprime se não couber
      heightPercent: 110,        // % da altura total - AUMENTADO para cards maiores
    }
  }
};

// 🏗️ CONFIGURAÇÃO DOS CONTRAPESOS E RÉGUA - SEPARADO MOBILE/DESKTOP
const CONTRAPESO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 40.5,    // % da altura total (posição Y)
      horizontalPercent: 41.5,  // % da largura total (posição X)
      widthPercent: 100,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 40.5,    // % da altura total (posição Y)
      horizontalPercent: -41.1,  // % da largura total (posição X)
      widthPercent: 100,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 34.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 83,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    },
    esquerdo: {
      verticalPercent: 34.8,    // % da altura total (posição Y) - mesmo que desktop
      horizontalPercent: 9.6,  // % da largura total (posição X) - ajustado para mobile
      widthPercent: 8,          // % da largura total (tamanho)
      heightPercent: 60,        // % da altura total (tamanho)
    }
  }
};

// 📏 CONFIGURAÇÃO DA RÉGUA PORTA MONTANTE - SEPARADO MOBILE/DESKTOP
const REGUA_CONFIG = {
  desktop: {
    verticalPercent: 22.8,      // % da altura total (posição Y)
    horizontalPercent: 0,    // % da largura total (posição X) - VOLTA POSIÇÃO ORIGINAL
    widthPercent: 100,      // % da largura total (tamanho) +34% (57.02 * 1.02)
    heightPercent: 72.3,     // % da altura total (tamanho) +34% (70.59 * 1.02)
  },
  mobile: {
    verticalPercent: 7,      // % da altura total (posição Y)
    horizontalPercent: 22.5,    // % da largura total (posição X) - ajustado para mobile
    widthPercent: 55.4,      // % da largura total (tamanho) +34% (65.17 * 1.02)
    heightPercent: 100,    // % da altura total (tamanho) +34% (112.68 * 1.02)
  }
};


// ⚙️ CONFIGURAÇÃO DOS MOTORES PORTA MONTANTE - SEPARADO MOBILE/DESKTOP
const MOTOR_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 4.7,      // % da altura total (posição Y)
      horizontalPercent: 42,    // % da largura total (posição X)
      widthPercent: 100,        // % da largura total (tamanho) - 45% menor
      heightPercent: 7,       // % da altura total (tamanho) - 45% menor
    },
    esquerdo: {
      verticalPercent: 4.7,      // % da altura total (posição Y)
      horizontalPercent: -42,    // % da largura total (posição X)
      widthPercent: 100,        // % da largura total (tamanho) - 45% menor
      heightPercent: 7,       // % da altura total (tamanho) - 45% menor
    }
  },
  mobile: {
    direito: {
      verticalPercent: 0,      // % da altura total (posição Y)
      horizontalPercent: 81.5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    },
    esquerdo: {
      verticalPercent: 0,      // % da altura total (posição Y)
      horizontalPercent: 5,    // % da largura total (posição X)
      widthPercent: 13.5,       // % da largura total (tamanho) - 10% menor
      heightPercent: 16.2,      // % da altura total (tamanho) - 10% menor
    }
  }
};


const PortaMontante: React.FC<PortaMontanteProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 🎯 LARGURA DO SIDEBAR - Aberto: 256px (w-64), Fechado: 64px (w-16)
  const sidebarWidth = sidebarOpen ? 256 : 64;

  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });
  
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const [mobileCardsOpen, setMobileCardsOpen] = React.useState(false);

  // ============================================
  // SISTEMA DE COORDENADAS UNIFICADO
  // ============================================
  // A correção de responsividade usa um ÚNICO sistema de coordenadas
  // baseado no container central que mantém aspect ratio fixo.
  // 
  // IMPORTANTE: Porta Montante usa aspect ratio 1075/1098 (quase quadrado)
  // Os percentuais de posicionamento foram calibrados para esse ratio!
  // ============================================

  // 🚀 MEMOIZAR TODAS AS DIMENSÕES - EVITA RECÁLCULOS EM CADA RE-RENDER
  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    // Aspect ratio original da Porta Montante (1075 x 1098)
    const aspectRatio = 1075 / 1098;

    // Calcula o espaço disponível - EXPANSÃO TOTAL PARA TELAS GRANDES
    const availableWidth = windowWidth - 32; // Sem limite de 1920px
    const availableHeight = window.innerHeight - 100;

    // Determina o tamanho máximo mantendo aspect ratio
    let baseWidth: number;
    let baseHeight: number;

    const widthBasedHeight = availableWidth / aspectRatio;

    if (widthBasedHeight <= availableHeight) {
      baseWidth = availableWidth; // EXPANSÃO TOTAL - usa toda largura disponível
      baseHeight = baseWidth / aspectRatio;
    } else {
      baseHeight = availableHeight;
      baseWidth = baseHeight * aspectRatio;
    }

    // Garante valores mínimos
    baseWidth = Math.max(baseWidth, isMobile ? 300 : 500);
    baseHeight = Math.max(baseHeight, isMobile ? 300 : 500);

    // ESCALA ULTRA-INTELIGENTE: cresce progressivamente com a tela
    // Em telas pequenas: mínimo 0.55, em telas grandes: até 0.95, em telas ultra-wide: até 1.0
    let scale: number;
    if (isMobile) {
      scale = 0.90;
    } else {
      // Base scale: 0.55 para 1920px, crescendo linearmente
      const baseScale = windowWidth / 1920 * 0.70;

      // Ajuste progressivo: mais agressivo em telas grandes
      if (windowWidth <= 1920) {
        scale = Math.max(0.55, baseScale);
      } else if (windowWidth <= 2560) {
        // De 1920px a 2560px: de 0.70 até 0.85
        scale = 0.70 + ((windowWidth - 1920) / (2560 - 1920)) * 0.15;
      } else if (windowWidth <= 3840) {
        // De 2560px a 3840px: de 0.85 até 0.95
        scale = 0.85 + ((windowWidth - 2560) / (3840 - 2560)) * 0.10;
      } else {
        // Acima de 3840px: até 0.98 (quase tela cheia)
        scale = Math.min(0.98, 0.95 + ((windowWidth - 3840) / 1920) * 0.03);
      }
    }

    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    // Adicionar maxWidth igual à PortaJusante
    const containerWidth = Math.min(windowWidth - 32, 1920);
    const maxWidth = Math.max(containerWidth, 300);

    return {
      isMobile,
      maxWidth,
      baseWidth: scaledWidth,
      baseHeight: scaledHeight,
      alturaTotal: scaledHeight,
      shouldRender: scaledWidth > 100 && scaledHeight > 100
    };
  }, [windowWidth]);

  // Desestruturar para uso
  const { isMobile, maxWidth, baseWidth, baseHeight, alturaTotal, shouldRender } = dimensions;

  // 🎯 CÁLCULO DO ESPAÇO DISPONÍVEL PARA RETÂNGULOS LATERAIS
  const espacoLateral = React.useMemo(() => {
    // Layout tem padding p-4 (16px) mobile / lg:p-6 (24px) desktop
    const paddingLayout = isMobile ? 32 : 48;
    const larguraConteudo = windowWidth - sidebarWidth - paddingLayout;
    const espacoDisponivel = Math.max(0, (larguraConteudo - baseWidth) / 2);
    // Margem de segurança
    return Math.max(0, espacoDisponivel - 16);
  }, [windowWidth, sidebarWidth, baseWidth, isMobile]);

  // � LISTENER COMPLETO: Detecta resize E zoom com visualViewport
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => setWindowWidth(window.innerWidth), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA MONT usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para MONT via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['MONT'],
        categories: ['PROC', 'FAULT', 'EVENT'],
        include_all_faults: true
      };

      // Usar sendCommand para enviar subscribe
      sendCommand({
        plc_ip: '',
        tag_name: 'SUBSCRIBE',
        variable: JSON.stringify(subscribeCmd),
        value: 'SUBSCRIBE',
        data_type: 'STRING'
      });

      if (import.meta.env.DEV) {
        console.log('📡 [PortaMontante] Subscribe MONT enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🎯 DADOS DOS CONTRAPESOS, RÉGUA E MOTORES - MONT WEBSOCKET (TAGS REAIS)
  // 📍 USANDO TAGS REAIS DO WEBSOCKET MONT - DATA TYPE INTEGER
  const reguaPortaMontanteRaw = plcData?.tags?.['MONT_MOVIMENTAR_PORTA_MONTANTE'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_PORTA_MONTANTE'], 10) : 0;    // Tag real MONT porta montante (régua)
  const contrapesoDirectoRaw = plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_DIREITO'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_CONTRA_PESO_DIREITO'], 10) : 0;   // Tag real MONT contrapeso direito
  const contrapesoEsquerdoRaw = plcData?.tags?.['MONT_MOVIMENTAR_CONTRA_PESO_ESQUERDO'] ?
    parseInt(plcData.tags['MONT_MOVIMENTAR_CONTRA_PESO_ESQUERDO'], 10) : 0;  // Tag real MONT contrapeso esquerdo

  // MOTORES - Velocidade
  const motorDireitoVeloc = plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_ESCRAV_DIR'] ?
    parseFloat(plcData.tags['MONT_GEST_MOT.VELOC_MOT_ESCRAV_DIR']) : 0;       // Tag MONT motor direito velocidade
  const motorEsquerdoVeloc = plcData?.tags?.['MONT_GEST_MOT.VELOC_MOT_MEST_ESQ'] ?
    parseFloat(plcData.tags['MONT_GEST_MOT.VELOC_MOT_MEST_ESQ']) : 0;      // Tag MONT motor esquerdo velocidade

  // VELOCIDADES OPERACIONAIS
  const velocidadeSubida = plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_SUB'] ?
    parseFloat(plcData.tags['MONT_VELOC_VAR.VELOC_1_SUB']) : 0;           // Velocidade subida
  const velocidadeDescida = plcData?.tags?.['MONT_VELOC_VAR.VELOC_1_DESC'] ?
    parseFloat(plcData.tags['MONT_VELOC_VAR.VELOC_1_DESC']) : 0;          // Velocidade descida

  // ANIMAÇÃO DOS MOTORES (para indicar se está em movimento)
  const animMotorDireito = plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_DIR'] ?
    parseInt(plcData.tags['MONT_WINCC_ANIM_MONT_MOT_DIR'], 10) : 0;       // Animação motor direito
  const animMotorEsquerdo = plcData?.tags?.['MONT_WINCC_ANIM_MONT_MOT_ESQ'] ?
    parseInt(plcData.tags['MONT_WINCC_ANIM_MONT_MOT_ESQ'], 10) : 0;       // Animação motor esquerdo

  // 🔄 NORMALIZAÇÃO DIRETA DOS VALORES MONT (igual página PortaJusante)
  // WebSocket MONT provavelmente já envia valores normalizados ou precisam normalização direta
  const contrapesoDirecto = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoDirectoRaw));
  }, [contrapesoDirectoRaw]);

  const contrapesoEsquerdo = React.useMemo(() => {
    return Math.max(0, Math.min(100, contrapesoEsquerdoRaw));
  }, [contrapesoEsquerdoRaw]);

  const reguaPortaMontante = React.useMemo(() => {
    return Math.max(0, Math.min(100, reguaPortaMontanteRaw));
  }, [reguaPortaMontanteRaw]);

  // Motor status para animação (1 = ligado, 0 = desligado)
  const motorDireito = animMotorDireito;
  const motorEsquerdo = animMotorEsquerdo;

  // 🔍 DEBUG CRÍTICO: Monitorar valores em tempo real para detectar atraso
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now();
      if (!window.lastContrapesoTime) window.lastContrapesoTime = now;
      const interval = now - window.lastContrapesoTime;
      window.lastContrapesoTime = now;

      console.log(`🎯 [${interval}ms] MONT Contrapeso D: ${contrapesoDirecto}% | E: ${contrapesoEsquerdo}% | Raw: ${contrapesoDirectoRaw}/${contrapesoEsquerdoRaw}`);
    }
  }, [contrapesoDirecto, contrapesoEsquerdo, contrapesoDirectoRaw, contrapesoEsquerdoRaw]);

  // Configuração responsiva SIMPLES - igual outros componentes
  const configAtual = isMobile ? CONTRAPESO_CONFIG.mobile : CONTRAPESO_CONFIG.desktop;
  const contrapesoDireitoConfig = configAtual.direito;
  const contrapesoEsquerdoConfig = configAtual.esquerdo;

  const reguaConfigAtual = isMobile ? REGUA_CONFIG.mobile : REGUA_CONFIG.desktop;

  const motorConfigAtual = isMobile ? MOTOR_CONFIG.mobile : MOTOR_CONFIG.desktop;
  const motorDireitoConfig = motorConfigAtual.direito;
  const motorEsquerdoConfig = motorConfigAtual.esquerdo;


  // 🎯 LARGURA INTELIGENTE DOS CARDS - MEMOIZADA PARA PERFORMANCE
  const cardWidthValue = React.useMemo(() => {
    // 🎯 CALCULAR ESPAÇO DISPONÍVEL PARA CARDS (esquerda/direita do SVG)
    const espacoTotalDisponivel = windowWidth - maxWidth;
    const espacoPorLado = espacoTotalDisponivel / 2;

    // 🎯 PORCENTAGEM DO ESPAÇO DISPONÍVEL - MAIS AGRESSIVA EM TELAS GRANDES
    // Em telas pequenas: 20-25%, em telas grandes: até 35%
    const porcentagemEspaco = Math.min(0.35, Math.max(0.20, windowWidth / 3840 * 0.15 + 0.20));
    const cardBaseadoEspaco = espacoPorLado * porcentagemEspaco;

    // 🎯 CARD BASEADO NO MAXWIDTH - GARANTE MÍNIMO
    const cardBaseadoMaxWidth = maxWidth * 0.18;

    // 🎯 USAR O MAIOR VALOR ENTRE OS DOIS CÁLCULOS PARA GARANTIR VISIBILIDADE
    let finalCardWidth = Math.max(cardBaseadoEspaco, cardBaseadoMaxWidth);

    // 🎯 LIMITES MAIS FLEXÍVEIS PARA TELAS GRANDES
    const minWidth = isMobile ? 220 : 280;
    const maxWidthLimit = isMobile ? 350 : Math.max(500, windowWidth * 0.15); // Até 15% da tela em telas grandes

    finalCardWidth = Math.max(finalCardWidth, minWidth);
    finalCardWidth = Math.min(finalCardWidth, maxWidthLimit);

    return finalCardWidth;
  }, [maxWidth, windowWidth, isMobile]);

  // 🎯 FUNÇÃO WRAPPER PARA COMPATIBILIDADE (não quebra código existente)
  const cardWidth = () => cardWidthValue;

  // 🎯 SISTEMA RESPONSIVO MELHORADO PARA CARDS AUTO-AJUSTÁVEIS
  const getResponsiveCardFontSize = React.useCallback((baseSize: number, type: 'header' | 'label' | 'value' = 'label') => {
    const cardW = cardWidthValue;

    // Escala baseada na largura do card (350px = escala base 1.0 para melhor proporção)
    let scaleFactor = cardW / 350;
    scaleFactor = Math.max(scaleFactor, 0.8); // Mínimo 80% - aumentado para evitar fontes muito pequenas
    scaleFactor = Math.min(scaleFactor, 1.6); // Máximo 160% - aumentado para melhor aproveitamento do espaço

    // Ajustes por tipo - mais equilibrados
    if (type === 'header') scaleFactor *= 1.15; // Aumentado para headers mais visíveis
    else if (type === 'value') scaleFactor *= 1.1; // Aumentado para valores mais legíveis

    return Math.max(baseSize * scaleFactor, type === 'header' ? 12 : 10); // Mínimos aumentados
  }, [cardWidthValue]);

  const getResponsiveCardSpacing = React.useCallback((baseSpacing: number) => {
    const cardW = cardWidthValue;
    let scaleFactor = cardW / 350; // 350px = escala base 1.0 para melhor proporção
    scaleFactor = Math.max(scaleFactor, 0.9); // Mínimo 90% - aumentado para evitar espaçamento muito apertado
    scaleFactor = Math.min(scaleFactor, 1.5); // Máximo 150% - aumentado para melhor aproveitamento
    return Math.max(baseSpacing * scaleFactor, 6); // Mínimo aumentado para 6px
  }, [cardWidthValue]);

  // CÁLCULO DO ESPAÇO DISPONÍVEL REAL - SEM CONSIDERAR SIDEBAR
  const larguraTotalTela = windowWidth;
  const espacoUsadoPorComponentes = maxWidth; // Usar maxWidth que mantém o tamanho original
  const espacoSobrandoTotal = Math.max(0, larguraTotalTela - espacoUsadoPorComponentes);

  const espacoDisponivelEsquerda = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando
  const espacoDisponivelDireita = Math.max(0, espacoSobrandoTotal / 2); // Metade do espaço sobrando

  // 🎯 PROTEÇÃO CONTRA SOBREPOSIÇÃO - CONSIDERA MARGEM LATERAL + SEGURANÇA
  const espacoLateralDisponivel = Math.max(0, (windowWidth - baseWidth) / 2);
  const margemLateralCard = baseWidth * 0.02; // Margem left/right do card
  const margemSeguranca = 30; // Margem de segurança para NUNCA encostar nos SVGs
  const espacoNecessario = cardWidthValue + margemLateralCard + margemSeguranca;
  const cardsCabem = windowWidth >= 1200 ? (espacoLateralDisponivel >= espacoNecessario) : true;

  // Performance optimization: Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('🎯 PORTAMONTANTE - CARDS INTELIGENTES:', {
      container_width: windowWidth,
      maxWidth_limitado: `${maxWidth.toFixed(0)}px (max 1920px)`,
      espaco_lateral_disponivel: `${espacoLateralDisponivel.toFixed(0)}px`,
      card_width: `${cardWidthValue.toFixed(0)}px`,
      margem_lateral_card: `${margemLateralCard.toFixed(0)}px`,
      margem_seguranca: `${margemSeguranca}px`,
      espaco_necessario: `${espacoNecessario.toFixed(0)}px`,
      cards_cabem: cardsCabem ? '✅ SIM - RENDERIZAR' : '❌ NÃO - OCULTAR PARA EVITAR SOBREPOSIÇÃO',
      calculo: `${espacoLateralDisponivel.toFixed(0)}px >= ${espacoNecessario.toFixed(0)}px ? ${cardsCabem}`,
      card_final: `${cardWidthValue.toFixed(0)}px`,
      limites: `min=${isMobile ? 220 : 280}px, max=${isMobile ? 350 : Math.max(500, windowWidth * 0.15).toFixed(0)}px`
    });
  }

  return (
    <div className="w-full h-auto flex flex-col items-center relative">

      {/*  PAINEL MOBILE - SISTEMA UNIVERSAL RESPONSIVO */}
      {isMobile && (
        <div
          className="w-full mt-4 mb-4 relative"
          style={{
            padding: `0 ${Math.max(6, Math.min(16, windowWidth * 0.02))}px` // Padding adaptativo universal
          }}
        >
          <div
            className="mx-auto"
            style={{
              maxWidth: `${Math.min(windowWidth - 12, 1200)}px` // Adaptativo para qualquer tela
            }}
          >
            {/* Cards horizontais compactos - sempre visíveis */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {/* CARD DADOS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    DADOS
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Posição:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {(reguaPortaMontante * 12.5 / 100).toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Abertura:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {reguaPortaMontante}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Dif. E/D:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span className="text-gray-500 text-[6px]">mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD MOTORES */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    MOTORES
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  {/* MOTOR DIREITO */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[7px] text-gray-600 font-medium uppercase">M. DIREITO</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${motorDireito === 1 ? 'bg-green-500' : motorDireito === 2 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                        {Math.round(1450 + Math.random() * 100)} <span className="text-gray-500 text-[6px]">RPM</span>
                      </span>
                      <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                        {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500 text-[6px]">A</span>
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-1">
                    {/* MOTOR ESQUERDO */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[7px] text-gray-600 font-medium uppercase">M. ESQUERDO</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${motorEsquerdo === 1 ? 'bg-green-500' : motorEsquerdo === 2 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {Math.round(1450 + Math.random() * 100)} <span className="text-gray-500 text-[6px]">RPM</span>
                        </span>
                        <span className="font-mono font-bold text-[#212E3E] text-[8px]">
                          {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500 text-[6px]">A</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD CONTRAPESOS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    CONTRAPESOS
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Esquerdo:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {contrapesoEsquerdo}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {contrapesoDirecto}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Status:</div>
                      <div className="font-mono font-bold text-green-600 text-[8px]">
                        OPER.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Parâmetros Mobile */}
            {menuParametrosOpen && (
              <div className="mt-4 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-top duration-200">
                <div className="bg-[#212E3E] text-white px-3 py-2">
                  <h3
                    className="font-bold uppercase tracking-wide text-center"
                    style={{ fontSize: `${Math.max(8, Math.min(12, windowWidth * 0.025))}px` }}
                  >
                    PARÂMETROS PORTA MONTANTE
                  </h3>
                </div>

                <div
                  className="max-h-80 overflow-y-auto"
                  style={{ padding: `${Math.max(8, Math.min(16, windowWidth * 0.025))}px` }}
                >
                  <div className="grid grid-cols-1 gap-3">
                    {/* PROGRAMA ABERTURA */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4
                        className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                        style={{ fontSize: `${Math.max(8, Math.min(11, windowWidth * 0.022))}px` }}
                      >
                        <ArrowUpIcon
                          style={{
                            width: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`,
                            height: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`
                          }}
                        />
                        PROGRAMA ABERTURA
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            Posição Alvo:
                          </span>
                          <span
                            className="font-mono font-bold text-[#212E3E]"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            8.50 m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            RPM Configurado:
                          </span>
                          <span
                            className="font-mono font-bold text-[#212E3E]"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            1450 RPM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PROGRAMA FECHAMENTO */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4
                        className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                        style={{ fontSize: `${Math.max(8, Math.min(11, windowWidth * 0.022))}px` }}
                      >
                        <ArrowDownIcon
                          style={{
                            width: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`,
                            height: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`
                          }}
                        />
                        PROGRAMA FECHAMENTO
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            Posição Alvo:
                          </span>
                          <span
                            className="font-mono font-bold text-[#212E3E]"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            0.00 m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            RPM Configurado:
                          </span>
                          <span
                            className="font-mono font-bold text-[#212E3E]"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            1200 RPM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LASER MONTANTE */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4
                        className="font-bold text-[#212E3E] mb-2 flex items-center gap-2"
                        style={{ fontSize: `${Math.max(8, Math.min(11, windowWidth * 0.022))}px` }}
                      >
                        <EyeIcon
                          style={{
                            width: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`,
                            height: `${Math.max(10, Math.min(14, windowWidth * 0.03))}px`
                          }}
                        />
                        LASER MONTANTE
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            Área Protegida:
                          </span>
                          <span
                            className="font-mono font-bold text-green-600"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            LIVRE
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className="text-gray-600 font-medium"
                            style={{ fontSize: `${Math.max(6, Math.min(9, windowWidth * 0.018))}px` }}
                          >
                            Leitura Cota:
                          </span>
                          <span
                            className="font-mono font-bold text-[#212E3E]"
                            style={{ fontSize: `${Math.max(7, Math.min(10, windowWidth * 0.02))}px` }}
                          >
                            {(reguaPortaMontante * 12.5 / 100 + 125.5).toFixed(2)} m
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* BOTÃO MOBILE - Canto inferior direito */}
      {isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-[#212E3E] to-[#2A3A4E] text-white shadow-xl flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
          style={{
            padding: `${Math.max(6, Math.min(8, windowWidth * 0.015))}px ${Math.max(8, Math.min(12, windowWidth * 0.025))}px`,
            fontSize: `${Math.max(8, Math.min(10, windowWidth * 0.02))}px`,
            borderRadius: `${Math.max(8, Math.min(12, windowWidth * 0.025))}px`,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div
            className="bg-white/20 rounded p-0.5 flex items-center justify-center"
            style={{
              width: `${Math.max(16, Math.min(20, windowWidth * 0.04))}px`,
              height: `${Math.max(16, Math.min(20, windowWidth * 0.04))}px`,
              borderRadius: `${Math.max(4, Math.min(6, windowWidth * 0.012))}px`
            }}
          >
            <CogIcon
              className="text-white"
              style={{
                width: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`,
                height: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`
              }}
            />
          </div>
          <span className="font-medium tracking-wide">PARÂMETROS</span>
          <div
            className={`transition-transform duration-200 ${menuParametrosOpen ? 'rotate-180' : 'rotate-0'}`}
            style={{
              width: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`,
              height: `${Math.max(10, Math.min(12, windowWidth * 0.025))}px`
            }}
          >
            <ChevronUpIcon className="w-full h-full text-white/80" />
          </div>
        </button>
      )}

      {/* BOTÃO DESKTOP - Grande com texto NO FUNDO (acima de 1024px) */}
      <button
        onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
        className="hidden xl:flex fixed bottom-6 right-6 z-50 px-8 py-5 bg-[#212E3E] text-white rounded-2xl shadow-2xl items-center gap-5 hover:scale-105 transition-all duration-200 touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <CogIcon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <div className="font-bold text-lg">PARÂMETROS</div>
          <div className="text-sm opacity-80">Porta Montante</div>
        </div>
      </button>

      {/* DIALOG PARÂMETROS - RESPONSIVO */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setMenuParametrosOpen(false)}
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Dialog Container - 100% responsivo e ajustável */}
          <div
            className="
              bg-white shadow-2xl overflow-hidden flex flex-col
              w-full h-[85vh] rounded-t-3xl
              animate-in slide-in-from-bottom duration-300
              sm:w-[95vw] sm:h-[90vh] sm:rounded-2xl
              md:w-[85vw] md:max-w-3xl md:h-[85vh] md:max-h-[800px] md:rounded-2xl
              md:animate-in md:fade-in md:zoom-in
              lg:max-w-4xl lg:h-[80vh]
              xl:max-w-5xl
            "
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain'
            }}
          >
            {/* Header azul escuro EDP */}
            <div className="bg-[#212E3E] p-1.5 md:p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-3">
                  <div className="w-5 h-5 md:w-10 md:h-10 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
                    <CogIcon className="w-2.5 h-2.5 md:w-5 md:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[10px] md:text-base font-bold truncate">PARÂMETROS</h2>
                    <p className="text-gray-300 text-xs md:text-sm mt-0.5 hidden md:block">Configurações e Monitoramento</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="w-5 h-5 md:w-10 md:h-10 rounded bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ touchAction: 'manipulation' }}
                >
                  <XMarkIcon className="w-2.5 h-2.5 md:w-5 md:h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com scroll */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="p-1.5 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-4">

                  {/* PROGRAMA ABERTURA AUTOMÁTICA */}
                  <Card
                    title="PROGRAMA ABERTURA"
                    icon={<ArrowUpIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Posição Alvo:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">8.50 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">RPM Configurado:</span>
                        <div className="flex items-center gap-0.5 md:gap-2">
                          <ArrowUpIcon className="w-2.5 h-2.5 md:w-4 md:h-4 text-slate-600" />
                          <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">1450 RPM</span>
                        </div>
                      </div>
                      <div className="flex gap-1 md:gap-3 pt-1">
                        <button className="flex-1 bg-[#212E3E] hover:bg-[#2A3A4E] text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <PlayIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          INICIAR
                        </button>
                        <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <StopIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          PARAR
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* PROGRAMA FECHAMENTO AUTOMÁTICO */}
                  <Card
                    title="PROGRAMA FECHAMENTO"
                    icon={<ArrowDownIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Posição Alvo:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.00 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">RPM Configurado:</span>
                        <div className="flex items-center gap-0.5 md:gap-2">
                          <ArrowDownIcon className="w-2.5 h-2.5 md:w-4 md:h-4 text-slate-600" />
                          <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">1200 RPM</span>
                        </div>
                      </div>
                      <div className="flex gap-1 md:gap-3 pt-1">
                        <button className="flex-1 bg-[#212E3E] hover:bg-[#2A3A4E] text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <PlayIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          INICIAR
                        </button>
                        <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 md:py-3 px-1 md:px-4 rounded transition-colors flex items-center justify-center gap-0.5 md:gap-2 font-medium text-[8px] md:text-sm">
                          <StopIcon className="w-2.5 h-2.5 md:w-4 md:h-4" />
                          PARAR
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* PARÂMETROS LASER MONTANTE */}
                  <Card
                    title="LASER MONTANTE"
                    icon={<EyeIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Área Protegida:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">LIVRE</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Leitura Cota:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">
                          {(reguaPortaMontante * 12.5 / 100 + 125.5).toFixed(2)} m
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Status:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">OPERACIONAL</span>
                      </div>
                    </div>
                  </Card>

                  {/* LIMITES E ALARMES */}
                  <Card
                    title="LIMITES & ALARMES"
                    icon={<ShieldCheckIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="grid grid-cols-2 gap-1 md:gap-3">
                        <div className="space-y-1 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Limite Abertura:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">12.50 m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Limite Fecho:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">0.00 m</span>
                          </div>
                        </div>
                        <div className="space-y-1 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Desnível Defeito:</span>
                            <span className="text-slate-600 font-mono font-bold text-[8px] md:text-sm">±5 mm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[8px] md:text-sm">Desnível Stop:</span>
                            <span className="text-gray-900 font-mono font-bold text-[8px] md:text-sm">±10 mm</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 md:pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium text-[8px] md:text-sm">Desnível Alarme:</span>
                          <span className="text-gray-900 font-mono font-bold text-[8px] md:text-lg">±15 mm</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>

              {/* Footer com ações */}
              <div className="bg-gray-50 px-1.5 py-1.5 md:px-4 md:py-4 border-t border-gray-200 flex-shrink-0 safe-area-bottom">
                <div className="flex flex-col-reverse gap-1 md:flex-row md:justify-end md:gap-3">
                  <button
                    onClick={() => setMenuParametrosOpen(false)}
                    className="w-full md:w-auto px-2 py-1.5 md:px-6 md:py-2.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded transition-colors font-medium text-[9px] md:text-base"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Fechar
                  </button>
                  <button
                    className="w-full md:w-auto px-2 py-1.5 md:px-6 md:py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-[#212E3E] rounded transition-colors font-medium text-[9px] md:text-base shadow-lg"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Container do SVG - SISTEMA ORIGINAL INALTERADO */}
      <div
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center relative z-10"
        style={{
          height: 'auto',
          minHeight: '50vh',
          overflow: 'visible'
        }}
      >

        {shouldRender ? (
          <>
            <div
              className="relative w-full flex flex-col items-center justify-center"
              style={{
                maxWidth: `${baseWidth}px`,
                height: `${baseHeight}px`,
                minHeight: `${baseHeight}px`,
                border: '1px solid red' // 🔴 Demarcação da área dos SVGs
              }}
            >
            
            {/* 🟢 PAINEL ESQUERDO - DENTRO DO RETÂNGULO VERDE */}
            {!isMobile && espacoLateral > 50 && (() => {
              const configEsq = DEMARCACAO_LATERAL_CONFIG.desktop.esquerdo;
              const gap = DEMARCACAO_LATERAL_CONFIG.desktop.gap;

              const larguraDesejada = (baseWidth * configEsq.widthPercent) / 100;
              const larguraFinal = Math.min(larguraDesejada, espacoLateral - gap);
              const posicaoFixa = -larguraFinal - gap;

              if (larguraFinal <= 50) return null;

              // Escala suave para responsividade - FONTES MAIORES
              const escala = Math.min(1.15, larguraFinal / 260);
              const fontSize = (base: number) => Math.max(9, base * escala * 1.1);
              const spacing = (base: number) => Math.max(5, base * escala);

              return (
                <div
                  className="absolute flex flex-col overflow-hidden"
                  style={{
                    top: `${(baseHeight * configEsq.verticalPercent) / 100}px`,
                    left: `${posicaoFixa}px`,
                    width: `${larguraFinal}px`,
                    height: `${(baseHeight * configEsq.heightPercent) / 100}px`,
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    border: '2px dashed rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    zIndex: 200,
                    padding: `${spacing(10)}px`
                  }}
                >
                  {/* DADOS OPERACIONAIS */}
                  <div className="bg-white/95 border border-gray-200/60 rounded-lg shadow-sm overflow-hidden" style={{ flexShrink: 0, marginBottom: `${spacing(8)}px` }}>
                    <div className="bg-edp-marine text-white" style={{ padding: `${spacing(6)}px ${spacing(8)}px` }}>
                      <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: `${fontSize(11)}px` }}>
                        DADOS OPERACIONAIS
                      </h3>
                    </div>
                    <div style={{ padding: `${spacing(8)}px` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: `${spacing(5)}px` }}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Posição:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {(reguaPortaMontante * 12.5 / 100).toFixed(2)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>m</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Abertura:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {reguaPortaMontante}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
                          </span>
                        </div>
                        <div className="border-t border-gray-200 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Dif. E/D:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>mm</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Contrap. E:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {contrapesoEsquerdo}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Contrap. D:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {contrapesoDirecto}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STATUS CARDS - ESTILO ORIGINAL EDP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: `${spacing(6)}px`, flexShrink: 0 }}>
                    <StatusCard
                      title="COMANDO EM AUTOMÁTICO"
                      variant="automatic"
                      containerWidth={larguraFinal}
                    />
                    <StatusCard
                      title="IGUALDADE DE NÍVEIS PRESENTE"
                      variant="success"
                      containerWidth={larguraFinal}
                    />
                    <StatusCard
                      title="FALTA IGUALDADE DE NÍVEIS"
                      variant="error"
                      containerWidth={larguraFinal}
                    />
                  </div>
                </div>
              );
            })()}

            {/* 🟢 PAINEL DIREITO - DENTRO DO RETÂNGULO VERDE */}
            {!isMobile && espacoLateral > 50 && (() => {
              const configDir = DEMARCACAO_LATERAL_CONFIG.desktop.direito;
              const gap = DEMARCACAO_LATERAL_CONFIG.desktop.gap;

              const posicaoFixa = baseWidth + gap;
              const larguraDesejada = (baseWidth * configDir.widthPercent) / 100;
              const larguraFinal = Math.min(larguraDesejada, espacoLateral - gap);

              if (larguraFinal <= 50) return null;

              // Escala suave para responsividade - FONTES MAIORES
              const escala = Math.min(1.15, larguraFinal / 260);
              const fontSize = (base: number) => Math.max(9, base * escala * 1.1);
              const spacing = (base: number) => Math.max(5, base * escala);

              return (
                <div
                  className="absolute flex flex-col overflow-hidden"
                  style={{
                    top: `${(baseHeight * configDir.verticalPercent) / 100}px`,
                    left: `${posicaoFixa}px`,
                    width: `${larguraFinal}px`,
                    height: `${(baseHeight * configDir.heightPercent) / 100}px`,
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    border: '2px dashed rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    zIndex: 200,
                    padding: `${spacing(10)}px`
                  }}
                >
                  {/* MOTORES */}
                  <div className="bg-white/95 border border-gray-200/60 rounded-lg shadow-sm overflow-hidden" style={{ flexShrink: 0, marginBottom: `${spacing(8)}px` }}>
                    <div className="bg-edp-marine text-white" style={{ padding: `${spacing(6)}px ${spacing(8)}px` }}>
                      <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: `${fontSize(11)}px` }}>
                        MOTORES
                      </h3>
                    </div>
                    <div style={{ padding: `${spacing(8)}px` }}>
                      {/* Motor Direito */}
                      <div style={{ marginBottom: `${spacing(6)}px` }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: `${spacing(3)}px` }}>
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>M. DIREITO</span>
                          <div className={`rounded-full ${animMotorDireito > 0 ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${fontSize(8)}px`, height: `${fontSize(8)}px` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {Math.round(motorDireitoVeloc)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>RPM</span>
                          </span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>A</span>
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Motor Esquerdo */}
                      <div>
                        <div className="flex justify-between items-center" style={{ marginBottom: `${spacing(3)}px` }}>
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>M. ESQUERDO</span>
                          <div className={`rounded-full ${animMotorEsquerdo > 0 ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${fontSize(8)}px`, height: `${fontSize(8)}px` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {Math.round(motorEsquerdoVeloc)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>RPM</span>
                          </span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {(12.5 + Math.random() * 2).toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>A</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SISTEMA STATUS */}
                  <div className="bg-white/95 border border-gray-200/60 rounded-lg shadow-sm overflow-hidden" style={{ flexShrink: 0 }}>
                    <div className="bg-edp-marine text-white" style={{ padding: `${spacing(6)}px ${spacing(8)}px` }}>
                      <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: `${fontSize(11)}px` }}>
                        SISTEMA
                      </h3>
                    </div>
                    <div style={{ padding: `${spacing(8)}px` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: `${spacing(5)}px` }}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Pressão:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            2.4 <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>bar</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Temperatura:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            24.5<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>°C</span>
                          </span>
                        </div>
                        <div className="border-t border-gray-200 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Vibração:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            NORMAL
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Status:</span>
                          <span className="font-mono font-bold text-green-600" style={{ fontSize: `${fontSize(13)}px` }}>
                            OK
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SVG Base Porta Montante - CENTRALIZADO */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                zIndex: 1
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1075 1098"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-sm"
              >
                <image
                  href="/PortaMontante/Base_Porta_Montante.svg"
                  width="1075"
                  height="1098"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* 🎯 CONTRAPESO DIREITO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 57 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA UNIFICADO: baseWidth horizontal + baseHeight vertical
                top: `${(baseHeight * contrapesoDireitoConfig.verticalPercent) / 100}px`,
                left: `${(baseWidth * contrapesoDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(baseWidth * contrapesoDireitoConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * contrapesoDireitoConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout'
              }}
            >
              <ContraPeso20t
                websocketValue={contrapesoDirecto}
                editMode={false}
              />
            </div>

            {/* 🎯 CONTRAPESO ESQUERDO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 58 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA UNIFICADO: baseWidth horizontal + baseHeight vertical
                top: `${(baseHeight * contrapesoEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(baseWidth * contrapesoEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(baseWidth * contrapesoEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * contrapesoEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 10,
                contain: 'layout'
              }}
            >
              <ContraPeso20t
                websocketValue={contrapesoEsquerdo}
                editMode={false}
              />
            </div>

            {/* 📏 RÉGUA PORTA MONTANTE - WEBSOCKET ÍNDICE 56 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA UNIFICADO: baseWidth horizontal + baseHeight vertical
                top: `${(baseHeight * reguaConfigAtual.verticalPercent) / 100}px`,
                left: `${(baseWidth * reguaConfigAtual.horizontalPercent) / 100}px`,
                width: `${(baseWidth * reguaConfigAtual.widthPercent) / 100}px`,
                height: `${(baseHeight * reguaConfigAtual.heightPercent) / 100}px`,
                zIndex: 5,
                contain: 'layout'
              }}
            >
              <PortaMontanteRegua
                websocketValue={reguaPortaMontante}
                editMode={false}
              />
            </div>

            {/* ⚙️ MOTOR DIREITO - WEBSOCKET ÍNDICE 50 */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA UNIFICADO: baseWidth horizontal + baseHeight vertical
                top: `${(baseHeight * motorDireitoConfig.verticalPercent) / 100}px`,
                left: `${(baseWidth * motorDireitoConfig.horizontalPercent) / 100}px`,
                width: `${(baseWidth * motorDireitoConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * motorDireitoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorMontante
                websocketValue={motorDireito}
                editMode={false}
                direction="left"
              />
            </div>

            {/* ⚙️ MOTOR ESQUERDO - WEBSOCKET ÍNDICE 51 - ESPELHADO */}
            <div
              className="absolute"
              style={{
                // 📐 SISTEMA UNIFICADO: baseWidth horizontal + baseHeight vertical
                top: `${(baseHeight * motorEsquerdoConfig.verticalPercent) / 100}px`,
                left: `${(baseWidth * motorEsquerdoConfig.horizontalPercent) / 100}px`,
                width: `${(baseWidth * motorEsquerdoConfig.widthPercent) / 100}px`,
                height: `${(baseHeight * motorEsquerdoConfig.heightPercent) / 100}px`,
                zIndex: 15
              }}
            >
              <MotorMontante
                websocketValue={motorEsquerdo}
                editMode={false}
                direction="right"
              />
            </div>

            {/* 🚪 INDICADOR STATUS PORTA - RESPONSIVO MOBILE/DESKTOP - CENTRALIZADO COM SVG */}
            {reguaPortaMontante >= 95 && (
              <div
                className="absolute flex items-center justify-center z-20"
                style={{
                  top: `${isMobile ? (alturaTotal * 4) / 100 : (alturaTotal * 5) / 100}px`, // Mobile: 4%, Desktop: 5%
                  left: `50%`, // Centralizado horizontalmente
                  transform: 'translateX(-50%)', // Ajuste de centralização
                  width: `${isMobile ? (baseWidth * 30) / 100 : (baseWidth * 16) / 100}px`, // Baseado no SVG
                  height: `${isMobile ? (alturaTotal * 2.5) / 100 : (alturaTotal * 6) / 100}px` // Mobile: bem menor
                }}
              >
                <div className={`bg-green-600 border border-green-500 rounded-md w-full ${isMobile ? 'p-1.5' : 'p-3'}`}>
                  <div className="text-center">
                    <div className={`font-bold text-[#212E3E] uppercase tracking-wide ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      PORTA ABERTA
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reguaPortaMontante <= 5 && (
              <div
                className="absolute flex items-center justify-center z-20"
                style={{
                  bottom: `${isMobile ? (alturaTotal * 4) / 100 : (alturaTotal * 5) / 100}px`, // Mobile: 4%, Desktop: 5%
                  left: `50%`, // Centralizado horizontalmente
                  transform: 'translateX(-50%)', // Ajuste de centralização
                  width: `${isMobile ? (baseWidth * 30) / 100 : (baseWidth * 16) / 100}px`, // Baseado no SVG
                  height: `${isMobile ? (alturaTotal * 2.5) / 100 : (alturaTotal * 6) / 100}px` // Mobile: bem menor
                }}
              >
                <div className={`bg-yellow-600 border border-yellow-500 rounded-md w-full ${isMobile ? 'p-1.5' : 'p-3'}`}>
                  <div className="text-center">
                    <div className={`font-bold text-[#212E3E] uppercase tracking-wide ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      PORTA FECHADA
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
          </>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{
                height: '600px',
                maxWidth: '800px',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite'
              }}
            >
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default PortaMontante;