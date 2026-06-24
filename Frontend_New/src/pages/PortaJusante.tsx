import React from 'react';
import { usePLC } from '../contexts/PLCContext';
import { useNav } from '../contexts/NavContext';
import ContraPeso60t from '../components/Porta_Jusante/Porta_Jusante_Contrapeso';
import PortaJusanteRegua from '../components/Porta_Jusante/PortaJusanteRegua';
import MotorJusante from '../components/Porta_Jusante/Motor_Jusante';
import { useSimulacaoPortaJusante } from '../contexts/SimulacaoPortaJusanteContext';
import { Card } from '../components/ui/Card';
import { StatusCard } from '../components/ui/StatusCard';
import {
  CogIcon,
  PlayIcon,
  StopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';


interface PortaJusanteProps {
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

// 🗺️ CANVAS ÚNICO DE COORDENADAS FIXAS (estilo WinCC: viewBox fixo, o SVG
// escala como um todo pra caber em qualquer tela). Sem mais tabela
// mobile/desktop separada - posição relativa é sempre a mesma.
// Base_PortaJusante.svg tem 1075 x 1098, então o canvas usa essa mesma proporção.
const VIEWBOX_W = 1075;
const VIEWBOX_H = 1098;

const LAYOUT = {
  base: { x: 0, y: 0, width: 1075, height: 1098 },
  contrapesoDireito: { x: 469, y: 470, width: 1075, height: 659 },
  contrapesoEsquerdo: { x: -468, y: 470, width: 1075, height: 659 },
  // height/y ajustados para compensar a margem adicionada ao viewBox de
  // PortaJusanteRegua (evitar a porta ser cortada ao subir) - borda
  // inferior mantida no mesmo lugar (439+571=1010).
  regua: { x: 0, y: 65, width: 1075, height: 945 },
  motorDireito: { x: 457, y: 11, width: 1075, height: 77 },
  motorEsquerdo: { x: -457, y: 11, width: 1075, height: 77 },
  portaAberta: { x: 452, y: 55, width: 172, height: 66 },
  portaFechada: { x: 452, y: 977, width: 172, height: 66 }
};


const PortaJusante: React.FC<PortaJusanteProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const { setParamAction } = useNav();
  React.useEffect(() => {
    setParamAction(() => setMenuParametrosOpen(true));
    return () => setParamAction(null);
  }, [setParamAction]);
  const [mobileCardsOpen, setMobileCardsOpen] = React.useState(false);

  // Sem sidebar lateral - navegação é uma barra de botões fixa na base
  const sidebarWidth = 0;

  // 📐 Mede o espaço REALMENTE disponível (o próprio containerRef, que é
  // "flex-1" dentro de um root h-full) em vez de adivinhar
  // "window.innerHeight - 100". Assim o diagrama se ajusta certo em
  // qualquer tela/notebook/zoom, sem depender de nenhum valor fixo chutado.
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

  // ============================================
  // SISTEMA DE COORDENADAS UNIFICADO
  // ============================================
  // A correção de responsividade usa um ÚNICO sistema de coordenadas
  // baseado no container central que mantém aspect ratio fixo.
  // 
  // IMPORTANTE: Porta Jusante usa aspect ratio 1075/1098 (quase quadrado)
  // Os percentuais de posicionamento foram calibrados para esse ratio!
  // ============================================

  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    // Aspect ratio original da Porta Jusante (1075 x 1098)
    const aspectRatio = 1075 / 1098;

    // Espaço REALMENTE disponível, medido no DOM (containerSize), com
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
    baseHeight = Math.max(baseHeight, isMobile ? 300 : 500);

    // Sem multiplicador de escala extra: o cálculo acima já preenche o
    // espaço disponível (largura OU altura, o que limitar primeiro).
    // Aplicar outro fator por cima desalinhava o tamanho final do espaço
    // real, deixando sobra em branco em telas grandes.

    const maxWidth = Math.max(availableWidth, 300);

    return {
      isMobile,
      maxWidth,
      baseWidth,
      baseHeight,
      shouldRender: baseWidth > 100 && baseHeight > 100
    };
  }, [windowWidth, containerSize]);

  // Desestruturar para uso
  const { isMobile, maxWidth, baseWidth, baseHeight, shouldRender } = dimensions;

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
      resizeTimeout = setTimeout(() => setWindowWidth(window.innerWidth), 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎬 SIMULAÇÃO CONTÍNUA (igual ao padrão da Eclusa/Enchimento/Porta
  // Montante): motores ligam, a porta sobe/desce e os contrapesos movem-se
  // ao contrário ao mesmo tempo (valor invertido - ver contexto).
  const { simulacaoAtiva, values: sim } = useSimulacaoPortaJusante();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA JUS usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para JUS via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['JUS'],
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
        console.log('📡 [PortaJusante] Subscribe JUS enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🎯 DADOS DOS CONTRAPESOS, RÉGUA E MOTORES - JUS WEBSOCKET (TAGS REAIS)
  // 📍 USANDO TAGS REAIS DO WEBSOCKET JUS - DATA TYPE INTEGER
  const reguaPortaJusanteRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_PORTA_JUSANTE'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_PORTA_JUSANTE'], 10) : 0;    // Tag real JUS porta jusante (régua)
  const contrapesoDirectoRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_DIREITO'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_DIREITO'], 10) : 0;   // Tag real JUS contrapeso direito
  const contrapesoEsquerdoRaw = plcData?.tags?.['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_ESQUERDO'] ?
    parseInt(plcData.tags['JUS_ENVIA_MOVIMENTO_CONTRA_PESO_ESQUERDO'], 10) : 0;  // Tag real JUS contrapeso esquerdo
  const motorDireitoReal = plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_MEST_DIR'] ?
    parseInt(plcData.tags['JUS_DB_GEST_MOT.VELOC_MOT_MEST_DIR'], 10) : 0;       // Tag real JUS motor direito (animação)
  const motorEsquerdoReal = plcData?.tags?.['JUS_DB_GEST_MOT.VELOC_MOT_ESCRAV_ESQ'] ?
    parseInt(plcData.tags['JUS_DB_GEST_MOT.VELOC_MOT_ESCRAV_ESQ'], 10) : 0;      // Tag real JUS motor esquerdo (animação)

  // 🎬 simulado quando simulacaoAtiva, igual ao resto da página
  const contrapesoDirecto = React.useMemo(() => {
    if (simulacaoAtiva) return sim.contrapesoDireito;
    return Math.max(0, Math.min(100, contrapesoDirectoRaw));
  }, [contrapesoDirectoRaw, simulacaoAtiva, sim.contrapesoDireito]);

  const contrapesoEsquerdo = React.useMemo(() => {
    if (simulacaoAtiva) return sim.contrapesoEsquerdo;
    return Math.max(0, Math.min(100, contrapesoEsquerdoRaw));
  }, [contrapesoEsquerdoRaw, simulacaoAtiva, sim.contrapesoEsquerdo]);

  const reguaPortaJusante = React.useMemo(() => {
    if (simulacaoAtiva) return sim.reguaPortaJusante;
    return Math.max(0, Math.min(100, reguaPortaJusanteRaw));
  }, [reguaPortaJusanteRaw, simulacaoAtiva, sim.reguaPortaJusante]);

  const motorDireito = simulacaoAtiva ? sim.motorDireito : motorDireitoReal;
  const motorEsquerdo = simulacaoAtiva ? sim.motorEsquerdo : motorEsquerdoReal;

  // 🏷️ RPM/Corrente/Status derivados do estado real do motor (em vez de
  // Math.random() solto) - 0 quando parado, valor nominal quando a rodar.
  const RPM_NOMINAL = 1450;
  const CORRENTE_NOMINAL = 12.5;
  const motorDireitoRPM = motorDireito === 1 ? RPM_NOMINAL : 0;
  const motorEsquerdoRPM = motorEsquerdo === 1 ? RPM_NOMINAL : 0;
  const motorDireitoCorrente = motorDireito === 1 ? CORRENTE_NOMINAL : 0;
  const motorEsquerdoCorrente = motorEsquerdo === 1 ? CORRENTE_NOMINAL : 0;
  const statusLabel = (m: number) => (m === 1 ? 'EM FUNCIONAMENTO' : m === 2 ? 'FALHA' : 'PARADO');
  const statusCor = (m: number) => (m === 1 ? 'text-green-600' : m === 2 ? 'text-red-600' : 'text-gray-500');
  const motorDireitoStatus = statusLabel(motorDireito);
  const motorEsquerdoStatus = statusLabel(motorEsquerdo);
  const algumMotorEmFalha = motorDireito === 2 || motorEsquerdo === 2;
  const algumMotorRodando = motorDireito === 1 || motorEsquerdo === 1;
  const statusGeralMotores = algumMotorEmFalha ? 'FALHA' : algumMotorRodando ? 'EM FUNCIONAMENTO' : 'PARADO';

  return (
    <div
      className="w-full h-full flex flex-col items-center relative pb-20 lg:pb-[104px]"
      style={{
        // ✅ OVERFLOW CONTROLADO para evitar elementos vazando
        overflow: 'hidden',
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
              maxWidth: `${baseWidth}px` // Usa o mesmo baseWidth responsivo
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
                      {(reguaPortaJusante * 12.5 / 100).toFixed(2)} <span className="text-gray-500 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Abertura:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {reguaPortaJusante.toFixed(1)}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Diferença:</div>
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
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">M. Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {motorDireitoRPM} <span className="text-gray-500 text-[7px]">RPM</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">M. Esquerdo:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {motorEsquerdoRPM} <span className="text-gray-500 text-[7px]">RPM</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Status:</div>
                      <div className={`font-mono font-bold text-[9px] ${statusCor(algumMotorEmFalha ? 2 : algumMotorRodando ? 1 : 0)}`}>
                        {statusGeralMotores}
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
                      {contrapesoEsquerdo.toFixed(1)}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Direito:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {contrapesoDirecto.toFixed(1)}<span className="text-gray-500 text-[7px]">%</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Status:</div>
                      <div className={`font-mono font-bold text-[8px] ${statusCor(algumMotorRodando ? 1 : 0)}`}>
                        {algumMotorRodando ? 'EM MOVIMENTO' : 'PARADO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE PARÂMETROS */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
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
                    <p className="text-gray-300 text-xs md:text-sm mt-0.5 hidden md:block">Configurações e Monitorização</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 lg:gap-4">

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

                  {/* PARÂMETROS LASER JUSANTE */}
                  <Card
                    title="LASER JUSANTE"
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
                          {(reguaPortaJusante * 12.5 / 100 + 125.5).toFixed(2)} m
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
                    Guardar Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Container do SVG - EXPANSÃO TOTAL PARA TELAS GRANDES */}
      <div
        ref={containerRef}
        className={`w-full flex flex-col items-center ${isMobile ? 'justify-start' : 'justify-center'} relative z-10 flex-1 min-h-0`}
        style={{
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
                minHeight: `${baseHeight}px`
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
                            {(reguaPortaJusante * 12.5 / 100).toFixed(2)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>m</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Abertura:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {reguaPortaJusante.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
                          </span>
                        </div>
                        <div className="border-t border-gray-200 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Diferença:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {Math.abs(contrapesoEsquerdo - contrapesoDirecto).toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>mm</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Contrap. E:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {contrapesoEsquerdo.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>Contrap. D:</span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(13)}px` }}>
                            {contrapesoDirecto.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>%</span>
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
                          <div className={`rounded-full ${motorDireito === 1 ? 'bg-green-500' : motorDireito === 2 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${fontSize(8)}px`, height: `${fontSize(8)}px` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {motorDireitoRPM} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>RPM</span>
                          </span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {motorDireitoCorrente.toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>A</span>
                          </span>
                        </div>
                        <div className={`text-right font-mono font-bold ${statusCor(motorDireito)}`} style={{ fontSize: `${fontSize(9)}px` }}>{motorDireitoStatus}</div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Motor Esquerdo */}
                      <div>
                        <div className="flex justify-between items-center" style={{ marginBottom: `${spacing(3)}px` }}>
                          <span className="font-medium text-[#212E3E] uppercase" style={{ fontSize: `${fontSize(9)}px` }}>M. ESQUERDO</span>
                          <div className={`rounded-full ${motorEsquerdo === 1 ? 'bg-green-500' : motorEsquerdo === 2 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${fontSize(8)}px`, height: `${fontSize(8)}px` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {motorEsquerdoRPM} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>RPM</span>
                          </span>
                          <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${fontSize(12)}px` }}>
                            {motorEsquerdoCorrente.toFixed(1)} <span className="text-gray-500" style={{ fontSize: `${fontSize(8)}px` }}>A</span>
                          </span>
                        </div>
                        <div className={`text-right font-mono font-bold ${statusCor(motorEsquerdo)}`} style={{ fontSize: `${fontSize(9)}px` }}>{motorEsquerdoStatus}</div>
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
                          <span className={`font-mono font-bold ${algumMotorEmFalha ? 'text-red-600' : algumMotorRodando ? 'text-green-600' : 'text-gray-500'}`} style={{ fontSize: `${fontSize(13)}px` }}>
                            {statusGeralMotores}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 🗺️ CANVAS ÚNICO: um só <svg viewBox> com coordenadas fixas (LAYOUT).
                overflow:visible porque contrapeso/motor são intencionalmente
                mais largos que o canvas e ficam deslocados pra fora dele. */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ width: `${baseWidth}px`, height: `${baseHeight}px`, zIndex: 1 }}
            >
              <svg
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                preserveAspectRatio="xMidYMid meet"
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
                className="drop-shadow-sm"
              >
                <image
                  href="/PortaJusante/Base_PortaJusante.svg"
                  x={LAYOUT.base.x}
                  y={LAYOUT.base.y}
                  width={LAYOUT.base.width}
                  height={LAYOUT.base.height}
                  preserveAspectRatio="xMidYMid meet"
                />

                {/* 🎯 CONTRAPESO DIREITO - COM MOVIMENTO PROPORCIONAL */}
                <foreignObject x={LAYOUT.contrapesoDireito.x} y={LAYOUT.contrapesoDireito.y} width={LAYOUT.contrapesoDireito.width} height={LAYOUT.contrapesoDireito.height}>
                  <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                    <ContraPeso60t websocketValue={contrapesoDirecto} editMode={false} />
                  </div>
                </foreignObject>

                {/* 🎯 CONTRAPESO ESQUERDO - COM MOVIMENTO PROPORCIONAL */}
                <foreignObject x={LAYOUT.contrapesoEsquerdo.x} y={LAYOUT.contrapesoEsquerdo.y} width={LAYOUT.contrapesoEsquerdo.width} height={LAYOUT.contrapesoEsquerdo.height}>
                  <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                    <ContraPeso60t websocketValue={contrapesoEsquerdo} editMode={false} />
                  </div>
                </foreignObject>

                {/* 📏 RÉGUA PORTA JUSANTE - WEBSOCKET ÍNDICE 39 */}
                <foreignObject x={LAYOUT.regua.x} y={LAYOUT.regua.y} width={LAYOUT.regua.width} height={LAYOUT.regua.height}>
                  <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                    <PortaJusanteRegua websocketValue={reguaPortaJusante} editMode={false} />
                  </div>
                </foreignObject>

                {/* ⚙️ MOTOR DIREITO - WEBSOCKET ÍNDICE 28 */}
                <foreignObject x={LAYOUT.motorDireito.x} y={LAYOUT.motorDireito.y} width={LAYOUT.motorDireito.width} height={LAYOUT.motorDireito.height}>
                  <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                    <MotorJusante websocketValue={motorDireito} editMode={false} direction="left" />
                  </div>
                </foreignObject>

                {/* ⚙️ MOTOR ESQUERDO - WEBSOCKET ÍNDICE 29 - ESPELHADO */}
                <foreignObject x={LAYOUT.motorEsquerdo.x} y={LAYOUT.motorEsquerdo.y} width={LAYOUT.motorEsquerdo.width} height={LAYOUT.motorEsquerdo.height}>
                  <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                    <MotorJusante websocketValue={motorEsquerdo} editMode={false} direction="right" />
                  </div>
                </foreignObject>

                {/* 🚪 INDICADOR STATUS PORTA */}
                {reguaPortaJusante >= 95 && (
                  <foreignObject x={LAYOUT.portaAberta.x} y={LAYOUT.portaAberta.y} width={LAYOUT.portaAberta.width} height={LAYOUT.portaAberta.height}>
                    <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full flex items-center justify-center">
                      <div className="bg-green-600 border border-green-500 rounded-md w-full p-3">
                        <div className="text-center">
                          <div className="font-bold text-[#212E3E] uppercase tracking-wide text-xs">
                            PORTA ABERTA
                          </div>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                )}

                {reguaPortaJusante <= 5 && (
                  <foreignObject x={LAYOUT.portaFechada.x} y={LAYOUT.portaFechada.y} width={LAYOUT.portaFechada.width} height={LAYOUT.portaFechada.height}>
                    <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full flex items-center justify-center">
                      <div className="bg-yellow-600 border border-yellow-500 rounded-md w-full p-3">
                        <div className="text-center">
                          <div className="font-bold text-[#212E3E] uppercase tracking-wide text-xs">
                            PORTA FECHADA
                          </div>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                )}
              </svg>
            </div>

          </div>
          </>
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

    </div>
  );
};

export default PortaJusante;
