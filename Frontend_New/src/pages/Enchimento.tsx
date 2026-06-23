import React, { useState } from 'react';
import { usePLC } from '../contexts/PLCContext';
import { useNav } from '../contexts/NavContext';
import { CogIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, BoltIcon } from '@heroicons/react/24/outline';
import { Card } from '../components/ui/Card';
import BasePistaoEnchimento from '../components/Enchimento/BasePistaoEnchimento';
import PistaoEnchimento from '../components/Enchimento/PistaoEnchimento';
import CilindroEnchimento from '../components/Enchimento/CilindroEnchimento';
import PipeSystem from '../components/Enchimento/PipeSystem';
import ValvulaOnOff from '../components/Enchimento/ValvulaOnOff';
import ValvulaFlange from '../components/Enchimento/ValvulaFlange';
import MotorEnchimento from '../components/Enchimento/MotorEnchimento';
import ValvulaGaveta from '../components/Enchimento/ValvulaGaveta';
import ValveDirecional from '../components/Enchimento/ValveDirecional';
import ValvulaVertical from '../components/Enchimento/ValvulaVertical';
import { useSimulacaoEnchimento } from '../contexts/SimulacaoEnchimentoContext';

interface EnchimentoProps {
  sidebarOpen?: boolean;
}

// 🗺️ CANVAS ÚNICO DE COORDENADAS FIXAS (estilo WinCC: viewBox fixo, o SVG
// escala como um todo pra caber em qualquer tela). Sem mais tabelas
// mobile/desktop separadas - posição relativa é sempre a mesma.
// Enchimento usa aspect ratio 16:9 (1600x900), MAS o pistão/base do pistão
// (basePistaoEsquerdo/Direito, pistaoEsquerdo/Direito) realmente "vazam" até
// y=1008 (confirmado pela geometria: viewBox interno + preserveAspectRatio
// meet). Em Chrome/Blink isso é tolerado via overflow:visible; o Safari/
// WebKit do iPhone corta nesse limite. Por isso a altura do canvas vai até
// 1008, não 900 - só o suficiente pra conter esse vazamento real, sem
// inflar o resto do layout.
const VIEWBOX_W = 1600;
const VIEWBOX_H = 1008;

const LAYOUT = {
  pipeSystem: { x: 0, y: -180, width: 1600, height: 900 },
  baseFundo: { x: 0, y: 148.5, width: 1600, height: 900 },
  basePistaoEsquerdo: { x: 14.4, y: 594, width: 320, height: 414 },
  basePistaoDireito: { x: 1264, y: 594, width: 320, height: 414 },
  // y/height compensados para a margem extra de 224 unidades adicionada ao
  // viewBox do PistaoEnchimento (ver comentário lá) - mantém o pistão visível
  // por completo enquanto sobe, sem mudar o tamanho/posição visual de hoje
  // (borda inferior permanece em y=981, igual a antes: 351+630=981).
  pistaoEsquerdo: { x: -65.6, y: 50.7, width: 480, height: 930.3 },
  pistaoDireito: { x: 1184, y: 50.7, width: 480, height: 930.3 },
  cilindroEsquerdo: { x: 96, y: 40.5, width: 160, height: 441 },
  cilindroDireito: { x: 1342.4, y: 40.5, width: 160, height: 441 },
  suportePistaEsquerdo: { x: -624, y: 380.7, width: 1600, height: 171 },
  suportePistaDireito: { x: 624, y: 380.7, width: 1600, height: 171 },
  valvulaEsquerda1: { x: 569.6, y: 67.5, width: 48, height: 72 },
  valvulaEsquerda2: { x: 628.8, y: 67.5, width: 48, height: 72 },
  valvulaEsquerda3: { x: 688, y: 67.5, width: 48, height: 72 },
  valvulaDireita1: { x: 889.6, y: 67.5, width: 48, height: 72 },
  valvulaDireita2: { x: 948.8, y: 67.5, width: 48, height: 72 },
  valvulaDireita3: { x: 1008, y: 67.5, width: 48, height: 72 },
  valvulaFlangeEsquerda1: { x: 564.8, y: 49.5, width: 32, height: 31.5 },
  valvulaFlangeEsquerda2: { x: 624, y: 49.5, width: 32, height: 31.5 },
  valvulaFlangeEsquerda3: { x: 683.2, y: 49.5, width: 32, height: 31.5 },
  valvulaFlangeDireita1: { x: 884.8, y: 49.5, width: 32, height: 31.5 },
  valvulaFlangeDireita2: { x: 945.6, y: 49.5, width: 32, height: 31.5 },
  valvulaFlangeDireita3: { x: 1003.2, y: 49.5, width: 32, height: 31.5 },
  tanqueOleo: { x: -84.8, y: 243, width: 1600, height: 414 },
  motorEsquerdo: { x: -172.8, y: 316.8, width: 1600, height: 63 },
  motorDireito: { x: 174.4, y: 316.8, width: 1600, height: 63 },
  valvulaGavetaEsquerda1: { x: 256, y: 355.5, width: 40, height: 72 },
  valvulaGavetaEsquerda2: { x: 307.2, y: 391.5, width: 40, height: 72 },
  valvulaGavetaEsquerda3: { x: 440, y: 310.5, width: 40, height: 72 },
  valvulaGavetaDireita1: { x: 1304, y: 355.5, width: 40, height: 72 },
  valvulaGavetaDireita2: { x: 1254.4, y: 391.5, width: 40, height: 72 },
  valvulaGavetaDireita3: { x: 1126.4, y: 310.5, width: 40, height: 72 },
  valvulaDirecionalEsquerda1: { x: 412.8, y: 194.4, width: 67.2, height: 72 },
  valvulaDirecionalEsquerda2: { x: 544, y: 153.9, width: 67.2, height: 72 },
  valvulaDirecionalEsquerda3: { x: 544, y: 242.1, width: 67.2, height: 72 },
  valvulaDirecionalDireita1: { x: 1120, y: 194.4, width: 67.2, height: 72 },
  valvulaDirecionalDireita2: { x: 987.2, y: 153.9, width: 67.2, height: 72 },
  valvulaDirecionalDireita3: { x: 987.2, y: 242.1, width: 67.2, height: 72 },
  valvulaVerticalEsquerda: { x: 36.8, y: 348.3, width: 48, height: 72 },
  valvulaVerticalDireita: { x: 1516.8, y: 348.3, width: 48, height: 72 }
};

const Enchimento: React.FC<EnchimentoProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 📐 Mede o espaço REALMENTE disponível (largura/altura do próprio
  // containerRef, que vira "flex-1" dentro do root e por isso recebe
  // exatamente o que sobra depois do header, painel mobile e barra inferior)
  // em vez de adivinhar "window.innerHeight - 100". Isso garante que o
  // diagrama se ajusta certo em qualquer tela/notebook/zoom, sem depender de
  // nenhum valor fixo chutado.
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 🚀 SIMPLIFICADO: Usar apenas window.innerWidth para dimensões
  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const { setParamAction } = useNav();
  React.useEffect(() => {
    setParamAction(() => setMenuParametrosOpen(true));
    return () => setParamAction(null);
  }, [setParamAction]);

  // ============================================
  // SISTEMA DE COORDENADAS UNIFICADO
  // ============================================
  // A correção de responsividade usa um ÚNICO sistema de coordenadas
  // baseado no container central que mantém aspect ratio 16:9 fixo.
  //
  // Antes: maxWidth e alturaTotal eram calculados independentemente
  // Agora: baseWidth e baseHeight mantêm proporção fixa 16:9
  //
  // Todos os componentes são posicionados usando:
  // - Horizontal: baseWidth (não mais maxWidth)
  // - Vertical: baseHeight (não mais alturaTotal)
  //
  // Isso garante que quando a tela redimensiona, AMBOS os eixos
  // escalam proporcionalmente, mantendo o layout correto.
  // ============================================
  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    // Aspect ratio segue o VIEWBOX_W/VIEWBOX_H (já inclui toda a área visual
    // real, sem depender de overflow:visible).
    const aspectRatio = VIEWBOX_W / VIEWBOX_H;

    // Espaço REALMENTE disponível, medido no DOM (containerSize), com um
    // fallback pra primeira renderização (antes do ResizeObserver disparar).
    const availableWidth = containerSize.width > 0 ? containerSize.width : windowWidth - 32;
    const availableHeight = containerSize.height > 0 ? containerSize.height : window.innerHeight - 160;

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
    baseHeight = Math.max(baseHeight, (isMobile ? 300 : 500) / aspectRatio);

    return {
      isMobile,
      baseWidth,
      baseHeight,
      shouldRender: baseWidth > 100 && baseHeight > 100
    };
  }, [windowWidth, containerSize]);

  const { isMobile, baseWidth, baseHeight, shouldRender } = dimensions;

  // � SIMPLES: Listener de resize com debounce para evitar re-renders excessivos
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(prev => {
          // Só atualiza se a diferença for significativa (>50px)
          if (Math.abs(prev - newWidth) > 50) {
            return newWidth;
          }
          return prev;
        });
      }, 150); // Debounce de 150ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 📡 USAR O SISTEMA PLC EXISTENTE
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎬 SIMULAÇÃO CONTÍNUA (igual ao padrão da Eclusa): enquanto
  // simulacaoAtiva=true, os valores simulados substituem os reais do PLC,
  // animando o ciclo completo de abertura/fecho do enchimento.
  const { simulacaoAtiva, values: sim } = useSimulacaoEnchimento();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA ENCH usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para ENCH via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['ENCH'],
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
        console.log('📡 [Enchimento] Subscribe ENCH enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🚀 PERFORMANCE: MEMOIZAÇÃO COMPLETA DO PROCESSAMENTO WEBSOCKET (60+ TAGS)
  // Processa todas as tags WebSocket uma única vez para evitar re-renders
  const webSocketData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 PISTÕES - TAGS REAIS DO WEBSOCKET ENCH (MOVIMENTO REAL 0-100%)
      pistaoDireitoRaw: parseInt(plcData.tags['ENCH_MED_AB_CILIND.POS_DIR_INT'] || '0', 10),
      pistaoEsquerdoRaw: parseInt(plcData.tags['ENCH_MED_AB_CILIND.POS_ESQ_INT'] || '0', 10),

      // 🎯 DADOS COMPLEMENTARES - PISTÃO DIREITO
      tempoAberturaDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_SUB_A'] || '0', 10),
      velocidadeDireito: parseFloat(plcData.tags['ENCH_POSICAO_COMP.VELOC_C_A'] || '0'),
      tempoAberturaLentaDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_ESTAB_A'] || '0', 10),
      tempoFechoDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_DESC_A'] || '0', 10),
      posicaoMetrosDireito: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.MED_CILIND_DIR'] || '0'),
      posicaoPorcentagemDireito: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.PORC_CILIND_DIR'] || '0'),

      // 🎯 DADOS COMPLEMENTARES - PISTÃO ESQUERDO
      tempoAberturaEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_SUB_B'] || '0', 10),
      velocidadeEsquerdo: parseFloat(plcData.tags['ENCH_POSICAO_COMP.VELOC_C_B'] || '0'),
      tempoAberturaLentaEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_ESTAB_B'] || '0', 10),
      tempoFechoEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_DESC_B'] || '0', 10),
      posicaoMetrosEsquerdo: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.MED_CILIND_ESQ'] || '0'),
      posicaoPorcentagemEsquerdo: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.PORC_CILIND_ESQ'] || '0')
    };
  }, [plcData?.tags]);

  // Extract values with fallbacks for performance (🎬 simulado quando
  // simulacaoAtiva, igual ao resto da página - mesmos campos da fase
  // SUBINDO/DESCENDO/ABERTO do contexto de simulação)
  const pistaoDireitoRaw = webSocketData?.pistaoDireitoRaw || 0;
  const pistaoEsquerdoRaw = webSocketData?.pistaoEsquerdoRaw || 0;
  const tempoAberturaDireito = simulacaoAtiva ? Math.round(sim.tempoAbertura) : (webSocketData?.tempoAberturaDireito || 0);
  const velocidadeDireito = simulacaoAtiva ? sim.velocidade : (webSocketData?.velocidadeDireito || 0);
  const tempoAberturaLentaDireito = simulacaoAtiva ? Math.round(sim.tempoAberturaLenta) : (webSocketData?.tempoAberturaLentaDireito || 0);
  const tempoFechoDireito = simulacaoAtiva ? Math.round(sim.tempoFecho) : (webSocketData?.tempoFechoDireito || 0);
  const posicaoMetrosDireito = simulacaoAtiva ? sim.posicaoMetros : (webSocketData?.posicaoMetrosDireito || 0);
  const posicaoPorcentagemDireito = simulacaoAtiva ? sim.pistaoDireito : (webSocketData?.posicaoPorcentagemDireito || 0);
  const tempoAberturaEsquerdo = simulacaoAtiva ? Math.round(sim.tempoAbertura) : (webSocketData?.tempoAberturaEsquerdo || 0);
  const velocidadeEsquerdo = simulacaoAtiva ? sim.velocidade : (webSocketData?.velocidadeEsquerdo || 0);
  const tempoAberturaLentaEsquerdo = simulacaoAtiva ? Math.round(sim.tempoAberturaLenta) : (webSocketData?.tempoAberturaLentaEsquerdo || 0);
  const tempoFechoEsquerdo = simulacaoAtiva ? Math.round(sim.tempoFecho) : (webSocketData?.tempoFechoEsquerdo || 0);
  const posicaoMetrosEsquerdo = simulacaoAtiva ? sim.posicaoMetros : (webSocketData?.posicaoMetrosEsquerdo || 0);
  const posicaoPorcentagemEsquerdo = simulacaoAtiva ? sim.pistaoEsquerdo : (webSocketData?.posicaoPorcentagemEsquerdo || 0);

  // 🎯 NORMALIZAÇÃO DIRETA DOS PISTÕES (0-100% do WebSocket)
  // WebSocket já envia valores normalizados para controle direto do eixo Y
  const pistaoDireito = React.useMemo(() => {
    if (simulacaoAtiva) return sim.pistaoDireito;
    // Garantir que o valor está entre 0-100%
    return Math.max(0, Math.min(100, pistaoDireitoRaw));
  }, [pistaoDireitoRaw, simulacaoAtiva, sim.pistaoDireito]);

  const pistaoEsquerdo = React.useMemo(() => {
    if (simulacaoAtiva) return sim.pistaoEsquerdo;
    // Garantir que o valor está entre 0-100%
    return Math.max(0, Math.min(100, pistaoEsquerdoRaw));
  }, [pistaoEsquerdoRaw, simulacaoAtiva, sim.pistaoEsquerdo]);

  // 🚀 PERFORMANCE: MEMOIZAÇÃO DAS VÁLVULAS, MOTORES E PIPES
  const valvulasData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 BOMBAS/MOTORES - TAGS REAIS DO WEBSOCKET ENCH (0,1,2,3 - ANIMAÇÃO)
      bombaMotorDireito: parseInt(plcData.tags['ENCH_ANIM_WINCC_ANIM_BOMBA_A_ENCH'] || '0', 10),
      bombaMotorEsquerdo: parseInt(plcData.tags['ENCH_ANIM_WINCC_ANIM_BOMBA_B_ENCH'] || '0', 10),

      // 🎯 CILINDROS - TAGS REAIS DO WEBSOCKET ENCH  
      cilindroDireito: plcData.tags['ENCH_DEF_AG_CILIND_A_DIR'] === 'TRUE' ? 1 : 0,
      cilindroEsquerdo: plcData.tags['ENCH_DEF_AG_CILIND_B_ESQ'] === 'TRUE' ? 1 : 0,

      // 🎯 TUBULAÇÕES LADO DIREITO COM TAGS REAIS ENCH (Pipes 1-9)
      pipe1Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      pipe2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0,
      pipe3Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,
      pipe4Real: plcData.tags['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0,
      pipe5Real: plcData.tags['ENCH_HMI_B_LIG_VD2_0_DIR'] === 'TRUE' ? 1 : 0,
      pipe6Real: plcData.tags['ENCH_RM_BOMB_DIR'] === 'TRUE' ? 1 : 0,
      pipe7Real: plcData.tags['ENCH_HMI_VD1_VD2_LIG_DIR'] === 'TRUE' ? 1 : 0,
      pipe8Real: plcData.tags['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0,
      pipe9Real: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0,

      // Tags reais do WebSocket ENCH para lado ESQUERDO
      pipe1EsqReal: plcData.tags['ENCH_SIN_CIRC_SUBIDA_ESQ'] === 'TRUE' ? 1 : 0,
      pipe2EsqReal: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,
      pipe3EsqReal: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      pipe4EsqReal: plcData.tags['ENCH_EM_SUB_LENTA_ESQ'] === 'TRUE' ? 1 : 0,
      pipe5EsqReal: plcData.tags['ENCH_HMI_B_LIG_VD2_0_ESQ'] === 'TRUE' ? 1 : 0,
      pipe6EsqReal: plcData.tags['ENCH_RM_BOMB_ESQ'] === 'TRUE' ? 1 : 0,
      pipe7EsqReal: plcData.tags['ENCH_HMI_VD1_VD2_LIG_ESQ'] === 'TRUE' ? 1 : 0,
      pipe8EsqReal: plcData.tags['ENCH_EM_SUB_RAP_ESQ'] === 'TRUE' ? 1 : 0,
      pipe9EsqReal: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0
    };
  }, [plcData?.tags]);

  // Extract optimized values (🎬 simulado quando simulacaoAtiva, igual ao
  // padrão da Eclusa - cada pipe/válvula mapeado para a fase correspondente
  // do ciclo: bomba liga → válvulas alinham → sobe lento → sobe rápido →
  // aberto → desce)
  const bombaMotorDireito = simulacaoAtiva ? sim.motorDireito : (valvulasData?.bombaMotorDireito || 0);
  const bombaMotorEsquerdo = simulacaoAtiva ? sim.motorEsquerdo : (valvulasData?.bombaMotorEsquerdo || 0);
  const cilindroDireito = valvulasData?.cilindroDireito || 0;
  const cilindroEsquerdo = valvulasData?.cilindroEsquerdo || 0;
  const rising = sim.risingSlow || sim.risingFast;
  const pipe1Real = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasData?.pipe1Real || 0);
  const pipe2Real = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasData?.pipe2Real || 0);
  const pipe3Real = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasData?.pipe3Real || 0);
  const pipe4Real = simulacaoAtiva ? (sim.risingSlow ? 1 : 0) : (valvulasData?.pipe4Real || 0);
  const pipe5Real = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe5Real || 0);
  const pipe6Real = simulacaoAtiva ? (sim.pumpRunning ? 1 : 0) : (valvulasData?.pipe6Real || 0);
  const pipe7Real = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe7Real || 0);
  const pipe8Real = simulacaoAtiva ? (sim.risingFast ? 1 : 0) : (valvulasData?.pipe8Real || 0);
  const pipe9Real = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe9Real || 0);
  const pipe1EsqReal = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasData?.pipe1EsqReal || 0);
  const pipe2EsqReal = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasData?.pipe2EsqReal || 0);
  const pipe3EsqReal = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasData?.pipe3EsqReal || 0);
  const pipe4EsqReal = simulacaoAtiva ? (sim.risingSlow ? 1 : 0) : (valvulasData?.pipe4EsqReal || 0);
  const pipe5EsqReal = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe5EsqReal || 0);
  const pipe6EsqReal = simulacaoAtiva ? (sim.pumpRunning ? 1 : 0) : (valvulasData?.pipe6EsqReal || 0);
  const pipe7EsqReal = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe7EsqReal || 0);
  const pipe8EsqReal = simulacaoAtiva ? (sim.risingFast ? 1 : 0) : (valvulasData?.pipe8EsqReal || 0);
  const pipe9EsqReal = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasData?.pipe9EsqReal || 0);

  // 🎯 MAPEAMENTO PIPES LADO DIREITO → BITS SVG
  const bit12 = pipe1Real;     // Pipe 1 DIREITA - ENCH_SIN_AG_SUBID
  const bit9 = pipe2Real;      // Pipe 2 DIREITA - ENCH_SIN_CIRC_SUBIDA  
  const bit11 = pipe3Real;     // Pipe 3 DIREITA - ENCH_OM_VALV_DESC_COMP_A
  const bit19 = pipe4Real;     // Pipe 4 DIREITA - ENCH_EM_SUB_LENTA
  const bit20 = pipe5Real;     // Pipe 5 DIREITA - ENCH_HMI_B_LIG_VD2_0_DIR
  const bit21 = pipe6Real;     // Pipe 6 DIREITA - ENCH_RM_BOMB_DIR  
  const bit23 = pipe7Real;     // Pipe 7 DIREITA - ENCH_HMI_VD1_VD2_LIG_DIR
  const bit25 = pipe8Real;     // Pipe 8 DIREITA - ENCH_EM_SUB_RAP
  const bit24 = pipe9Real;     // Pipe 9 DIREITA - ENCH_OM_VD2_COMP_DIR

  // 🎯 MAPEAMENTO PIPES LADO ESQUERDO → BITS SVG (CORRIGIDO)
  const bit26 = pipe1EsqReal;  // Pipe 1 ESQUERDA - ENCH_SIN_AG_SUBID_ESQ 
  const bit31 = pipe2EsqReal;  // Pipe 2 ESQUERDA - ENCH_SIN_CIRC_SUBIDA_ESQ
  const bit30 = pipe3EsqReal;  // Pipe 3 ESQUERDA - ENCH_OM_VALV_DESC_COMP_B
  const bit16 = pipe4EsqReal;  // Pipe 4 ESQUERDA - ENCH_EM_SUB_LENTA_ESQ
  const bit17 = pipe5EsqReal;  // Pipe 5 ESQUERDA - ENCH_HMI_B_LIG_VD2_0_ESQ
  const bit18 = pipe6EsqReal;  // Pipe 6 ESQUERDA - ENCH_RM_BOMB_ESQ
  const bit22 = pipe7EsqReal;  // Pipe 7 ESQUERDA - ENCH_HMI_VD1_VD2_LIG_ESQ (BIT ÚNICO)
  const bit27 = pipe8EsqReal;  // Pipe 8 ESQUERDA - ENCH_EM_SUB_RAP_ESQ (BIT ÚNICO)
  const bit28 = pipe9EsqReal;  // Pipe 9 ESQUERDA - ENCH_OM_VD2_COMP_ESQ (BIT ÚNICO)

  // 🚀 PERFORMANCE: MEMOIZAÇÃO DAS VÁLVULAS COMPLEXAS
  const valvulasComplexasData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 VÁLVULAS VERTICAIS - BITS ÚNICOS COM TAGS ESPECÍFICOS
      valvulaVerticalDireita: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaVerticalEsquerda: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,

      // Bits extras do SVG
      bit13: Number(plcData?.bit_data?.status_bits?.[1]?.[13] || 0),
      bit36: Number(plcData?.bit_data?.status_bits?.[2]?.[4] || 0),

      // 🎯 VÁLVULAS VRC - TAGS REAIS DO WEBSOCKET ENCH
      valvulaEsquerda1: plcData.tags['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0,
      valvulaEsquerda2: plcData.tags['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0,
      valvulaEsquerda3: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0,
      valvulaDireita1: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDireita2: plcData.tags['ENCH_EM_SUB_RAP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDireita3: plcData.tags['ENCH_EM_SUB_LENTA_ESQ'] === 'TRUE' ? 1 : 0,

      // VÁLVULAS GAVETA
      valvulaGavetaEsquerda1Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda3Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita1Real: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita3Real: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,

      // 🎯 VÁLVULAS DIRECIONAIS - TAGS REAIS DO WEBSOCKET ENCH
      valvulaDirecionalDireita1Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita2Real: plcData.tags['ENCH_OM_VALV_DIST_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita3Real: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda1Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda2Real: plcData.tags['ENCH_OM_VALV_DIST_COMP_A'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda3Real: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0
    };
  }, [plcData?.tags, plcData?.bit_data?.status_bits]);

  // Extract optimized values
  const valvulaVerticalDireita = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasComplexasData?.valvulaVerticalDireita || 0);
  const valvulaVerticalEsquerda = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasComplexasData?.valvulaVerticalEsquerda || 0);
  const bit13 = valvulasComplexasData?.bit13 || 0;
  const bit33 = pipe2EsqReal; // Uses already optimized value
  const bit34 = pipe3EsqReal; // Uses already optimized value
  const bit36 = valvulasComplexasData?.bit36 || 0;

  // VRC Valves
  const valvulaEsquerda1 = simulacaoAtiva ? (sim.risingSlow ? 1 : 0) : (valvulasComplexasData?.valvulaEsquerda1 || 0);
  const valvulaEsquerda2 = simulacaoAtiva ? (sim.risingFast ? 1 : 0) : (valvulasComplexasData?.valvulaEsquerda2 || 0);
  const valvulaEsquerda3 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaEsquerda3 || 0);
  const valvulaDireita1 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaDireita1 || 0);
  const valvulaDireita2 = simulacaoAtiva ? (sim.risingFast ? 1 : 0) : (valvulasComplexasData?.valvulaDireita2 || 0);
  const valvulaDireita3 = simulacaoAtiva ? (sim.risingSlow ? 1 : 0) : (valvulasComplexasData?.valvulaDireita3 || 0);

  // Flange valves (derived from VRC)
  const valvulaFlangeEsquerda1 = valvulaEsquerda1;
  const valvulaFlangeEsquerda2 = valvulaEsquerda2;
  const valvulaFlangeEsquerda3 = valvulaEsquerda3;
  const valvulaFlangeDireita1 = valvulaDireita1;
  const valvulaFlangeDireita2 = valvulaDireita2;
  const valvulaFlangeDireita3 = valvulaDireita3;

  // Gaveta valves
  const valvulaGavetaEsquerda1 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaEsquerda1Real || 0);
  const valvulaGavetaEsquerda2 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaEsquerda2Real || 0);
  const valvulaGavetaEsquerda3 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaEsquerda3Real || 0);
  const valvulaGavetaDireita1 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaDireita1Real || 0);
  const valvulaGavetaDireita2 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaDireita2Real || 0);
  const valvulaGavetaDireita3 = simulacaoAtiva ? (rising ? 1 : 0) : (valvulasComplexasData?.valvulaGavetaDireita3Real || 0);

  // Directional valves
  const valvulaDirecionalEsquerda1 = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalEsquerda1Real || 0);
  const valvulaDirecionalEsquerda2 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalEsquerda2Real || 0);
  const valvulaDirecionalEsquerda3 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalEsquerda3Real || 0);
  const valvulaDirecionalDireita1 = simulacaoAtiva ? (sim.descending ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalDireita1Real || 0);
  const valvulaDirecionalDireita2 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalDireita2Real || 0);
  const valvulaDirecionalDireita3 = simulacaoAtiva ? (sim.valvesOpen ? 1 : 0) : (valvulasComplexasData?.valvulaDirecionalDireita3Real || 0);

  // 🏷️ ESTADO - segue a fase real do ciclo (não só a % de posição), para
  // "Fechando" aparecer corretamente enquanto desce, mesmo antes de passar
  // dos 50%/10% que a heurística antiga usava.
  const estadoPistao = simulacaoAtiva
    ? (sim.fase === 'SUBINDO' ? 'SUBINDO'
      : sim.fase === 'DESCENDO' ? 'FECHANDO'
      : sim.fase === 'ABERTO' ? 'ABERTO'
      : sim.fase === 'IDLE' ? 'FECHADO'
      : 'PREPARANDO')
    : (posicaoPorcentagemDireito > 50 ? 'ABRINDO' : posicaoPorcentagemDireito < 10 ? 'FECHADO' : 'PARCIAL');

  return (
    <div
      className="w-full h-full flex flex-col items-center relative pb-20 lg:pb-[104px]"
      style={{
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >

      {/* 📱 PAINEL MOBILE - SISTEMA UNIVERSAL RESPONSIVO */}
      {isMobile && (
        <div
          className="w-full mt-4 mb-4 relative"
          style={{
            padding: `0 ${Math.max(6, Math.min(16, windowWidth * 0.02))}px`
          }}
        >
          <div
            className="mx-auto"
            style={{
              width: `${baseWidth}px` // Usa o mesmo baseWidth responsivo
            }}
          >
            {/* Cards horizontais compactos - sempre visíveis */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {/* CARD PISTÕES */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    PISTÕES
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {posicaoMetrosDireito.toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Esquerdo:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {posicaoMetrosEsquerdo.toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Abertura:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {((posicaoPorcentagemDireito + posicaoPorcentagemEsquerdo) / 2).toFixed(1)} <span className="text-gray-500 text-[6px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD SISTEMA - tempos de abertura/fecho */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    SISTEMA
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">T. Abertura:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {tempoAberturaDireito} <span className="text-gray-500 text-[7px]">s</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Ab. Lenta:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {tempoAberturaLentaDireito} <span className="text-gray-500 text-[7px]">s</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">T. Fecho:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {tempoFechoDireito} <span className="text-gray-500 text-[6px]">s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD VELOCIDADE */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    VELOCIDADE
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {velocidadeDireito.toFixed(3)} <span className="text-gray-500 text-[7px]">m/s</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Esquerdo:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {velocidadeEsquerdo.toFixed(3)} <span className="text-gray-500 text-[7px]">m/s</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Estado:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {estadoPistao}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container do Sistema de Enchimento */}
      <div
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center justify-start relative z-10 flex-1 min-h-0"
        style={{
          overflow: 'visible'
        }}
      >
        {shouldRender ? (
          <div
            className="relative w-full flex items-center justify-center"
            style={{
              width: `${baseWidth}px` as any,
              height: `${baseHeight}px` as any,
              minHeight: `${baseHeight}px` as any
            }}
          >
            {/* 🗺️ CANVAS ÚNICO: um só <svg viewBox> com coordenadas fixas (LAYOUT).
                Ordem dos elementos = ordem de empilhamento (quem vem depois desenha
                por cima), preservando a mesma pilha de z-index que existia antes.
                overflow:visible porque alguns elementos (motores, pistão base,
                suporte pista) são intencionalmente mais largos que o canvas. */}
            <svg
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              height="100%"
              style={{ overflow: 'visible' }}
            >
              {/* 🛢️ TANQUE OLEO - SVG ESTÁTICO */}
              <svg x={LAYOUT.tanqueOleo.x} y={LAYOUT.tanqueOleo.y} width={LAYOUT.tanqueOleo.width} height={LAYOUT.tanqueOleo.height} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/Tanque_Oleo.svg" width="260" height="165" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* SISTEMA DE TUBULAÇÕES - BACKGROUND */}
              <foreignObject x={LAYOUT.pipeSystem.x} y={LAYOUT.pipeSystem.y} width={LAYOUT.pipeSystem.width} height={LAYOUT.pipeSystem.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <PipeSystem
                    bit9={bit9} bit11={bit11} bit12={bit12} bit13={bit13} bit16={bit16}
                    bit17={bit17} bit18={bit18} bit19={bit19} bit20={bit20} bit21={bit21}
                    bit23={bit23} bit24={bit24} bit25={bit25} bit26={bit26} bit30={bit30}
                    bit31={bit31} bit33={bit33} bit34={bit34} bit36={bit36} bit22={bit22}
                    bit27={bit27} bit28={bit28}
                    editMode={false}
                  />
                </div>
              </foreignObject>

              {/* BASE PISTÃO ESQUERDO / DIREITO */}
              <foreignObject x={LAYOUT.basePistaoEsquerdo.x} y={LAYOUT.basePistaoEsquerdo.y} width={LAYOUT.basePistaoEsquerdo.width} height={LAYOUT.basePistaoEsquerdo.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <BasePistaoEnchimento side="esquerdo" editMode={false} />
                </div>
              </foreignObject>
              <foreignObject x={LAYOUT.basePistaoDireito.x} y={LAYOUT.basePistaoDireito.y} width={LAYOUT.basePistaoDireito.width} height={LAYOUT.basePistaoDireito.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <BasePistaoEnchimento side="direito" editMode={false} />
                </div>
              </foreignObject>

              {/* 🔧 CILINDRO ESQUERDO / DIREITO */}
              <foreignObject x={LAYOUT.cilindroEsquerdo.x} y={LAYOUT.cilindroEsquerdo.y} width={LAYOUT.cilindroEsquerdo.width} height={LAYOUT.cilindroEsquerdo.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <CilindroEnchimento websocketBit={cilindroEsquerdo} side="esquerdo" editMode={false} />
                </div>
              </foreignObject>
              <foreignObject x={LAYOUT.cilindroDireito.x} y={LAYOUT.cilindroDireito.y} width={LAYOUT.cilindroDireito.width} height={LAYOUT.cilindroDireito.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <CilindroEnchimento websocketBit={cilindroDireito} side="direito" editMode={false} />
                </div>
              </foreignObject>

              {/* 🚪 VÁLVULAS GAVETA - ESQUERDA 1-3 / DIREITA 1-3 */}
              <foreignObject x={LAYOUT.valvulaGavetaEsquerda1.x} y={LAYOUT.valvulaGavetaEsquerda1.y} width={LAYOUT.valvulaGavetaEsquerda1.width} height={LAYOUT.valvulaGavetaEsquerda1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaEsquerda1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaGavetaEsquerda2.x} y={LAYOUT.valvulaGavetaEsquerda2.y} width={LAYOUT.valvulaGavetaEsquerda2.width} height={LAYOUT.valvulaGavetaEsquerda2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaEsquerda2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaGavetaEsquerda3.x} y={LAYOUT.valvulaGavetaEsquerda3.y} width={LAYOUT.valvulaGavetaEsquerda3.width} height={LAYOUT.valvulaGavetaEsquerda3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaEsquerda3} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaGavetaDireita1.x} y={LAYOUT.valvulaGavetaDireita1.y} width={LAYOUT.valvulaGavetaDireita1.width} height={LAYOUT.valvulaGavetaDireita1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaDireita1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaGavetaDireita2.x} y={LAYOUT.valvulaGavetaDireita2.y} width={LAYOUT.valvulaGavetaDireita2.width} height={LAYOUT.valvulaGavetaDireita2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaDireita2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaGavetaDireita3.x} y={LAYOUT.valvulaGavetaDireita3.y} width={LAYOUT.valvulaGavetaDireita3.width} height={LAYOUT.valvulaGavetaDireita3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaGaveta websocketBit={valvulaGavetaDireita3} editMode={false} /></div>
              </foreignObject>

              {/* 🏗️ BASE FUNDO ENCHIMENTO - SVG DE FUNDO */}
              <svg x={LAYOUT.baseFundo.x} y={LAYOUT.baseFundo.y} width={LAYOUT.baseFundo.width} height={LAYOUT.baseFundo.height} viewBox="0 0 1348 600" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/Base_Fundo_Enchimento.svg" width="1348" height="600" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* ⚙️ MOTOR ESQUERDO / DIREITO */}
              <foreignObject x={LAYOUT.motorEsquerdo.x} y={LAYOUT.motorEsquerdo.y} width={LAYOUT.motorEsquerdo.width} height={LAYOUT.motorEsquerdo.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <MotorEnchimento websocketValue={bombaMotorEsquerdo} side="esquerdo" editMode={false} />
                </div>
              </foreignObject>
              <foreignObject x={LAYOUT.motorDireito.x} y={LAYOUT.motorDireito.y} width={LAYOUT.motorDireito.width} height={LAYOUT.motorDireito.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <MotorEnchimento websocketValue={bombaMotorDireito} side="direito" editMode={false} />
                </div>
              </foreignObject>

              {/* 🎯 PISTÃO ESQUERDO / DIREITO - MOVIMENTO PROPORCIONAL */}
              <foreignObject x={LAYOUT.pistaoEsquerdo.x} y={LAYOUT.pistaoEsquerdo.y} width={LAYOUT.pistaoEsquerdo.width} height={LAYOUT.pistaoEsquerdo.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <PistaoEnchimento websocketValue={pistaoEsquerdo} side="esquerdo" editMode={false} />
                </div>
              </foreignObject>
              <foreignObject x={LAYOUT.pistaoDireito.x} y={LAYOUT.pistaoDireito.y} width={LAYOUT.pistaoDireito.width} height={LAYOUT.pistaoDireito.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                  <PistaoEnchimento websocketValue={pistaoDireito} side="direito" editMode={false} />
                </div>
              </foreignObject>

              {/* 🔧 VÁLVULAS FLANGE - ESQUERDA 1-3 / DIREITA 1-3 */}
              <foreignObject x={LAYOUT.valvulaFlangeEsquerda1.x} y={LAYOUT.valvulaFlangeEsquerda1.y} width={LAYOUT.valvulaFlangeEsquerda1.width} height={LAYOUT.valvulaFlangeEsquerda1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeEsquerda1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaFlangeEsquerda2.x} y={LAYOUT.valvulaFlangeEsquerda2.y} width={LAYOUT.valvulaFlangeEsquerda2.width} height={LAYOUT.valvulaFlangeEsquerda2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeEsquerda2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaFlangeEsquerda3.x} y={LAYOUT.valvulaFlangeEsquerda3.y} width={LAYOUT.valvulaFlangeEsquerda3.width} height={LAYOUT.valvulaFlangeEsquerda3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeEsquerda3} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaFlangeDireita1.x} y={LAYOUT.valvulaFlangeDireita1.y} width={LAYOUT.valvulaFlangeDireita1.width} height={LAYOUT.valvulaFlangeDireita1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeDireita1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaFlangeDireita2.x} y={LAYOUT.valvulaFlangeDireita2.y} width={LAYOUT.valvulaFlangeDireita2.width} height={LAYOUT.valvulaFlangeDireita2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeDireita2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaFlangeDireita3.x} y={LAYOUT.valvulaFlangeDireita3.y} width={LAYOUT.valvulaFlangeDireita3.width} height={LAYOUT.valvulaFlangeDireita3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaFlange websocketBit={valvulaFlangeDireita3} editMode={false} /></div>
              </foreignObject>

              {/* ↔️ VÁLVULAS DIRECIONAIS - ESQUERDA 1-3 / DIREITA 1-3 */}
              <foreignObject x={LAYOUT.valvulaDirecionalEsquerda1.x} y={LAYOUT.valvulaDirecionalEsquerda1.y} width={LAYOUT.valvulaDirecionalEsquerda1.width} height={LAYOUT.valvulaDirecionalEsquerda1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalEsquerda1} mirrored={true} rotation={-90} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDirecionalEsquerda2.x} y={LAYOUT.valvulaDirecionalEsquerda2.y} width={LAYOUT.valvulaDirecionalEsquerda2.width} height={LAYOUT.valvulaDirecionalEsquerda2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalEsquerda2} mirrored={true} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDirecionalEsquerda3.x} y={LAYOUT.valvulaDirecionalEsquerda3.y} width={LAYOUT.valvulaDirecionalEsquerda3.width} height={LAYOUT.valvulaDirecionalEsquerda3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalEsquerda3} mirrored={true} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDirecionalDireita1.x} y={LAYOUT.valvulaDirecionalDireita1.y} width={LAYOUT.valvulaDirecionalDireita1.width} height={LAYOUT.valvulaDirecionalDireita1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalDireita1} rotation={-90} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDirecionalDireita2.x} y={LAYOUT.valvulaDirecionalDireita2.y} width={LAYOUT.valvulaDirecionalDireita2.width} height={LAYOUT.valvulaDirecionalDireita2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalDireita2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDirecionalDireita3.x} y={LAYOUT.valvulaDirecionalDireita3.y} width={LAYOUT.valvulaDirecionalDireita3.width} height={LAYOUT.valvulaDirecionalDireita3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValveDirecional websocketBit={valvulaDirecionalDireita3} editMode={false} /></div>
              </foreignObject>

              {/* ↕️ VÁLVULA VERTICAL ESQUERDA / DIREITA */}
              <foreignObject x={LAYOUT.valvulaVerticalEsquerda.x} y={LAYOUT.valvulaVerticalEsquerda.y} width={LAYOUT.valvulaVerticalEsquerda.width} height={LAYOUT.valvulaVerticalEsquerda.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaVertical websocketBit={valvulaVerticalEsquerda} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaVerticalDireita.x} y={LAYOUT.valvulaVerticalDireita.y} width={LAYOUT.valvulaVerticalDireita.width} height={LAYOUT.valvulaVerticalDireita.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaVertical websocketBit={valvulaVerticalDireita} editMode={false} /></div>
              </foreignObject>

              {/* 🏗️ SUPORTE PISTA ESQUERDO / DIREITO - SVG ESTÁTICO */}
              <svg x={LAYOUT.suportePistaEsquerdo.x} y={LAYOUT.suportePistaEsquerdo.y} width={LAYOUT.suportePistaEsquerdo.width} height={LAYOUT.suportePistaEsquerdo.height} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/SuportePista.svg" width="400" height="200" preserveAspectRatio="xMidYMid meet" />
              </svg>
              <svg x={LAYOUT.suportePistaDireito.x} y={LAYOUT.suportePistaDireito.y} width={LAYOUT.suportePistaDireito.width} height={LAYOUT.suportePistaDireito.height} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/SuportePista.svg" width="400" height="200" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* 🔧 VÁLVULAS ON/OFF - ESQUERDA 1-3 / DIREITA 1-3 */}
              <foreignObject x={LAYOUT.valvulaEsquerda1.x} y={LAYOUT.valvulaEsquerda1.y} width={LAYOUT.valvulaEsquerda1.width} height={LAYOUT.valvulaEsquerda1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaEsquerda1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaEsquerda2.x} y={LAYOUT.valvulaEsquerda2.y} width={LAYOUT.valvulaEsquerda2.width} height={LAYOUT.valvulaEsquerda2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaEsquerda2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaEsquerda3.x} y={LAYOUT.valvulaEsquerda3.y} width={LAYOUT.valvulaEsquerda3.width} height={LAYOUT.valvulaEsquerda3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaEsquerda3} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDireita1.x} y={LAYOUT.valvulaDireita1.y} width={LAYOUT.valvulaDireita1.width} height={LAYOUT.valvulaDireita1.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaDireita1} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDireita2.x} y={LAYOUT.valvulaDireita2.y} width={LAYOUT.valvulaDireita2.width} height={LAYOUT.valvulaDireita2.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaDireita2} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaDireita3.x} y={LAYOUT.valvulaDireita3.y} width={LAYOUT.valvulaDireita3.width} height={LAYOUT.valvulaDireita3.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaOnOff websocketBit={valvulaDireita3} editMode={false} /></div>
              </foreignObject>
            </svg>

            {/* 🎯 CARD PISTÃO DIREITO - ESTILO PADRÃO INFOCARD - APENAS DESKTOP */}
            {!isMobile && (
              <div
                className="absolute z-50"
                style={{
                  top: `${baseHeight * 0.72}px`,
                  left: `${baseWidth * 0.21}px`,
                  width: `${baseWidth * 0.23}px`,
                }}
              >
                <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
                  {/* Header Padrão InfoCard */}
                  <div
                    className="bg-edp-marine text-white"
                    style={{ padding: `${Math.max(6, baseWidth * 0.005)}px ${Math.max(10, baseWidth * 0.008)}px` }}
                  >
                    <h3
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(10, Math.min(14, baseWidth * 0.008))}px` }}
                    >
                      PISTÃO DIREITO
                    </h3>
                  </div>

                  {/* Conteúdo Padrão InfoCard */}
                  <div style={{ padding: `${Math.max(10, baseWidth * 0.01)}px` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, baseWidth * 0.006)}px` }}>

                      {/* Posição Metros */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Posição:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {posicaoMetrosDireito.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m</span>
                        </span>
                      </div>

                      {/* Abertura % */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Abertura:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {posicaoPorcentagemDireito.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>%</span>
                        </span>
                      </div>

                      {/* Separador */}
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>

                      {/* Tempo Abertura */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Abertura:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoAberturaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Tempo Ab. Lenta */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Ab. Lenta:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoAberturaLentaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Tempo Fecho */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Fecho:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoFechoDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Separador */}
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>

                      {/* Velocidade */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Velocidade:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {velocidadeDireito.toFixed(4)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m/s</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🎯 CARD PISTÃO ESQUERDO - ESTILO PADRÃO INFOCARD - APENAS DESKTOP */}
            {!isMobile && (
              <div
                className="absolute z-50"
                style={{
                  top: `${baseHeight * 0.72}px`,
                  left: `${baseWidth * 0.50}px`,
                  width: `${baseWidth * 0.23}px`,
                }}
              >
                <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
                  {/* Header Padrão InfoCard */}
                  <div
                    className="bg-edp-marine text-white"
                    style={{ padding: `${Math.max(6, baseWidth * 0.005)}px ${Math.max(10, baseWidth * 0.008)}px` }}
                  >
                    <h3
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(10, Math.min(14, baseWidth * 0.008))}px` }}
                    >
                      PISTÃO ESQUERDO
                    </h3>
                  </div>

                  {/* Conteúdo Padrão InfoCard */}
                  <div style={{ padding: `${Math.max(10, baseWidth * 0.01)}px` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, baseWidth * 0.006)}px` }}>

                      {/* Posição Metros */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Posição:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {posicaoMetrosEsquerdo.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m</span>
                        </span>
                      </div>

                      {/* Abertura % */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Abertura:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {posicaoPorcentagemEsquerdo.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>%</span>
                        </span>
                      </div>

                      {/* Separador */}
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>

                      {/* Tempo Abertura */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Abertura:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoAberturaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Tempo Ab. Lenta */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Ab. Lenta:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoAberturaLentaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Tempo Fecho */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          T. Fecho:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {tempoFechoEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>

                      {/* Separador */}
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>

                      {/* Velocidade */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium text-[#212E3E] uppercase tracking-wide"
                          style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}
                        >
                          Velocidade:
                        </span>
                        <span
                          className="font-mono font-bold text-[#212E3E]"
                          style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}
                        >
                          {velocidadeEsquerdo.toFixed(4)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m/s</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{
                height: '600px',
                width: '800px',
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

      {/* MODAL DE PARÂMETROS */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden"
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

                  {/* VELOCIDADE DE ABERTURA */}
                  <Card
                    title="VELOCIDADE DE ABERTURA"
                    icon={<ArrowUpIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Patamar 1 - Velocidade Alta:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.25 m/min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Patamar 1 - Velocidade Baixa:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.05 m/min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Patamar 2 - Velocidade Alta:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.30 m/min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Patamar 2 - Velocidade Baixa:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.08 m/min</span>
                      </div>
                    </div>
                  </Card>

                  {/* VELOCIDADE DE FECHAMENTO */}
                  <Card
                    title="VELOCIDADE DE FECHAMENTO"
                    icon={<ArrowDownIcon className="w-5 h-5" />}
                    variant="default"
                    className="h-fit"
                  >
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Velocidade Alta:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.20 m/min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Velocidade Baixa:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">0.03 m/min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Status Atual:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-green-600">Normal</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-[8px] md:text-sm">Tempo Operação:</span>
                        <span className="text-[8px] md:text-lg font-mono font-bold text-gray-900">125 min</span>
                      </div>
                    </div>
                  </Card>

                  {/* QUADRO DE POTÊNCIA - Ocupa as duas colunas */}
                  <Card
                    title="QUADRO DE POTÊNCIA"
                    icon={<BoltIcon className="w-5 h-5" />}
                    variant="default"
                    className="md:col-span-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4">
                      {/* L1-L2 */}
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-700 mb-1 md:mb-3 text-[8px] md:text-sm">L1-L2</h4>
                        <div className="space-y-0.5 md:space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Tensão:</span>
                            <span className="font-bold text-blue-600 text-[7px] md:text-sm">220V</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Corrente:</span>
                            <span className="font-bold text-green-600 text-[7px] md:text-sm">5.2A</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Potência:</span>
                            <span className="font-bold text-orange-600 text-[7px] md:text-sm">1.1kW</span>
                          </div>
                        </div>
                      </div>

                      {/* Parâmetros Gerais */}
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-700 mb-1 md:mb-3 text-[8px] md:text-sm">PARÂMETROS GERAIS</h4>
                        <div className="space-y-0.5 md:space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Potência Total:</span>
                            <span className="font-bold text-gray-900 text-[7px] md:text-sm">1.15 kW</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Fator de Potência:</span>
                            <span className="font-bold text-gray-900 text-[7px] md:text-sm">0.85</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Frequência:</span>
                            <span className="font-bold text-gray-900 text-[7px] md:text-sm">60.0 Hz</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Operacional */}
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-700 mb-1 md:mb-3 text-[8px] md:text-sm">STATUS OPERACIONAL</h4>
                        <div className="space-y-0.5 md:space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Estado:</span>
                            <span className="font-bold text-green-600 text-[7px] md:text-sm">Operando</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Temperatura:</span>
                            <span className="font-bold text-blue-600 text-[7px] md:text-sm">65°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-[7px] md:text-sm">Vibração:</span>
                            <span className="font-bold text-green-600 text-[7px] md:text-sm">Normal</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            </div>

            {/* Footer com ações - Fixed no mobile */}
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
      )}
    </div>
  );
};

export default Enchimento;
