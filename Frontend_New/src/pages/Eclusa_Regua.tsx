import React from 'react';
import NivelCaldeira from '../components/Eclusa/caldeira/Nivel_Caldeira';
import NivelJusante from '../components/Eclusa/caldeira/Nivel_Jusante';
import NivelMontante from '../components/Eclusa/caldeira/Nivel_Montante';
import PortaJusante from '../components/Eclusa/caldeira/PortaJusante';
import PortaMontante from '../components/Eclusa/caldeira/PortaMontante';
import SemaforoSimples from '../components/Eclusa/caldeira/SemaforoSimples';
import TubulacaoValvulas from '../components/Eclusa/caldeira/TubulacaoValvulas';
import { usePLC } from '../contexts/PLCContext';
import { useNav } from '../contexts/NavContext';
import { useSimulacao } from '../contexts/SimulacaoContext';
import {
  CogIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { Card } from '../components/ui/Card';
import { StatusCard } from '../components/ui/StatusCard';

// 🗺️ CANVAS ÚNICO DE COORDENADAS FIXAS (estilo WinCC: viewBox fixo, o SVG escala
// como um todo pra caber em qualquer tela). Sem mais tabela mobile/desktop separada:
// a posição relativa de cada elemento é sempre a mesma, só o tamanho final muda.
const VIEWBOX_W = 1000;
const VIEWBOX_H = 510;

const LAYOUT = {
  caldeiraEclusa: { x: 0, y: 200, width: 1000, height: 217 },
  paredeEclusa: { x: -3, y: 300, width: 1006, height: 176 },
  nivelCaldeira: { x: 254, y: 281, width: 518, height: 118 },
  nivelJusante: { x: 760, y: 359, width: 260, height: 40 },
  nivelMontante: { x: 0, y: 281, width: 255, height: 100 },
  portaJusante: { x: 726, y: 271, width: 50, height: 160 },
  portaMontante: { x: 255, y: 217, width: 15, height: 180 },
  semaforo1: { x: 150, y: 223, width: 35, height: 40 },
  semaforo2: { x: 300, y: 228, width: 35, height: 40 },
  semaforo3: { x: 500, y: 228, width: 35, height: 40 },
  semaforo4: { x: 800, y: 224, width: 35, height: 40 },
  basePortaJusante: { x: 572, y: 268, width: 400, height: 134 },
  tubulacao: { x: 60, y: 347, width: 900, height: 150 },
  infoCards: { x: 0, y: 0, width: 1000, height: 196 }
};

interface EclusaReguaProps {
  sidebarOpen?: boolean; // Prop para detectar estado do sidebar
}

const EclusaRegua: React.FC<EclusaReguaProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);
  const { setParamAction } = useNav();
  React.useEffect(() => {
    setParamAction(() => setMenuParametrosOpen(true));
    return () => setParamAction(null);
  }, [setParamAction]);

  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });

  const isMobile = windowWidth < 1024;

  // 📐 Mede o espaço REALMENTE disponível via ResizeObserver
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

  //� LISTENER COMPLETO: Detecta resize E zoom com visualViewport
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

  // 📡 USAR O SISTEMA PLC EXISTENTE (sem criar nova conexão!)
  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA ECLUS usando sendCommand
  // ⚡ OTIMIZADO: Força re-subscribe no mount da página para dados frescos
  const hasSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset ref no mount para garantir novo subscribe
    hasSubscribedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;

      // Enviar subscribe específico para ECLUS via sendCommand
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['ECLUS'],
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
        console.log('📡 [Eclusa_Regua] Subscribe ECLUS enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // 🔥 SISTEMA REAL - USANDO TAGS DO WEBSOCKET ECLUS

  // 🎯 NÍVEIS - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const nivelJusante = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_JUSANTE_COTA_'] || '0');    // Nível da Jusante Cota
  const nivelCaldeira = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_CALD_COTA_'] || '0');     // Nível da Caldeira Cota  
  const nivelMontante = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.NIV_MONT_COTA_'] || '0');     // Nível da Montante Cota

  // 🎯 DIFERENÇAS DE NÍVEL - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const diffMontCald = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.DIFF_MONT_CALD_'] || '0');    // Diferença Montante-Caldeira
  const diffCaldJus = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.DIFF_CALD_JUS_'] || '0');      // Diferença Caldeira-Jusante

  // 🎯 MÍNIMO MONTANTE COTA - TAG REAL DO WEBSOCKET ECLUS (para animação)
  const minMontCota = parseFloat(plcData?.tags?.['ECLUS_GEST_NIV.MIN_MONT_COTA_'] || '0');       // Mínimo Montante Cota

  // 🎯 VELOCIDADES DOS RADARES - TAGS REAIS DO WEBSOCKET ECLUS (data type real)
  const radarJusante = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_JUSANT_'] || '0');            // Velocidade Radar Jusante
  const radarMontante = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_MONT_'] || '0');             // Velocidade Radar Montante
  const radarCaldeira = parseFloat(plcData?.tags?.['ECLUS_RADAR_VEL_CALD_'] || '0');             // Velocidade Radar Caldeira (se disponível)


  // Inteligência ISA-104: Detectar status dos níveis
  const toleranciaNormal = 0.05; // 5cm conforme ISA-104
  const toleranciaCritica = 0.15; // 15cm limite crítico

  // Status da caldeira (principal) - usando diferenças do WebSocket
  const statusCaldeira = React.useMemo(() => {
    const maxDiff = Math.max(Math.abs(diffMontCald), Math.abs(diffCaldJus));
    if (maxDiff > toleranciaCritica) return 'critico';
    if (maxDiff > toleranciaNormal) return 'alerta';
    return 'normal';
  }, [diffMontCald, diffCaldJus, toleranciaNormal, toleranciaCritica]);



  // 🎯 PORTAS - TAGS REAIS DO WEBSOCKET ECLUS (data type REAL - 0 a 100)
  const portaJusanteValue = parseFloat(plcData?.tags?.['ECLUS_PORTA_JUSANTE_MOV'] || '0');
  const portaMontanteValue = parseFloat(plcData?.tags?.['ECLUS_PORTA_MONT_MOV'] || '0');

  // Extrair dados dos semáforos do PLC (bit_data.status_bits)
  const statusBits = plcData?.bit_data?.status_bits || [];

  // Função para calcular word e bit de uma posição (reutilizável)
  const getBitFromPosition = (position: number) => {
    const wordIndex = Math.floor(position / 16);  // posição ÷ 16
    const bitIndex = position % 16;              // posição % 16
    const wordData = statusBits[wordIndex] || [];
    return wordData[bitIndex] || false;
  };


  // Extrair bits das válvulas da tubulação do PLC - USANDO A FUNÇÃO CORRETA
  const bitMontanteCaldeira = getBitFromPosition(132); // Bit 132 - Word 8 Bit 4
  const bitCaldeiraJusante = getBitFromPosition(133);  // Bit 133 - Word 8 Bit 5

  // ── SIMULAÇÃO ──────────────────────────────────────────────────────────────
  const { simulacaoAtiva, values: sim } = useSimulacao();

  // Valores efetivos: substitui PLC pela simulação quando ativa
  // Visual (0–100): alimenta os componentes de animação SVG
  const efNivelCaldeira   = simulacaoAtiva ? sim.nivelCaldeira   : nivelCaldeira;
  const efNivelMontante   = simulacaoAtiva ? sim.nivelMontante   : nivelMontante;
  const efNivelJusante    = simulacaoAtiva ? sim.nivelJusante    : nivelJusante;
  const efPortaMontante   = simulacaoAtiva ? sim.portaMontante   : portaMontanteValue;
  // O componente PortaJusante usa convenção interna invertida (0=oculta/aberta, 100=visível/fechada),
  // ao contrário de PortaMontante (0=fechada,100=aberta). Na simulação controlamos o valor lógico
  // (0=fechada,100=aberta, igual ao montante) e só invertemos aqui ao alimentar o componente visual.
  // Em modo real mantém-se o valor bruto do PLC, sem alterar o comportamento já validado em produção.
  const efPortaJusante    = simulacaoAtiva ? (100 - sim.portaJusante) : portaJusanteValue;
  // Valor para exibição (badge): sempre "% aberto" intuitivo (invertido para acompanhar o sentido real de abertura)
  const dispPortaJusante  = simulacaoAtiva ? (100 - sim.portaJusante) : portaJusanteValue;
  const efValvMontante    = simulacaoAtiva ? sim.valvulaMontante : bitMontanteCaldeira;
  const efValvJusante     = simulacaoAtiva ? sim.valvulaJusante  : bitCaldeiraJusante;
  // Display (metros): alimenta os cards de texto
  const dispNivelCaldeira = simulacaoAtiva ? sim.nivelCaldeiraMt : nivelCaldeira;
  const dispNivelMontante = simulacaoAtiva ? sim.nivelMontanteMt : nivelMontante;
  const dispNivelJusante  = simulacaoAtiva ? sim.nivelJusanteMt  : nivelJusante;
  // ──────────────────────────────────────────────────────────────────────────

  // Semáforos: usa simulação quando ativa, senão lê PLC
  const getSemaforoLeds = (semaforoNum: number) => {
    if (simulacaoAtiva) return sim.sem[semaforoNum - 1] ?? { verde: false, vermelho: true };
    return getSemaforoLedsPlc(semaforoNum);
  };

  const getSemaforoLedsPlc = (semaforoNum: number) => {

    // Mapeamento individual de cada LED:
    // Semafaro_verde_1: 151, Semafaro_vermelho_1: 152
    // Semafaro_verde_2: 153, Semafaro_vermelho_2: 154  
    // Semafaro_verde_3: 155, Semafaro_vermelho_3: 156
    // Semafaro_verde_4: 157, Semafaro_vermelho_4: 158

    switch (semaforoNum) {
      case 1:
        const verde1 = getBitFromPosition(207); // Word[9] Bit[7]
        const vermelho1 = getBitFromPosition(206); // Word[9] Bit[8]
        return { verde: verde1, vermelho: vermelho1 };

      case 2:
        const verde2 = getBitFromPosition(209); // Word[9] Bit[9]
        const vermelho2 = getBitFromPosition(208); // Word[9] Bit[10]
        return { verde: verde2, vermelho: vermelho2 };

      case 3:
        const verde3 = getBitFromPosition(211); // Word[9] Bit[11]
        const vermelho3 = getBitFromPosition(210); // Word[9] Bit[12]
        return { verde: verde3, vermelho: vermelho3 };

      case 4:
        const verde4 = getBitFromPosition(212); // Word[9] Bit[13]
        const vermelho4 = getBitFromPosition(213); // Word[9] Bit[14]
        return { verde: verde4, vermelho: vermelho4 };

      default:
        return { verde: false, vermelho: false };
    }
  };



  const dimensions = React.useMemo(() => {
    const layoutAspectRatio = VIEWBOX_W / VIEWBOX_H; // 1000/510 ≈ 1.96
    const availableWidth = containerSize.width > 0 ? containerSize.width : windowWidth - 32;
    const availableHeight = containerSize.height > 0 ? containerSize.height : window.innerHeight - 160;

    let baseWidth: number;
    let baseHeight: number;

    const widthBasedHeight = availableWidth / layoutAspectRatio;

    if (widthBasedHeight <= availableHeight) {
      baseWidth = availableWidth;
      baseHeight = baseWidth / layoutAspectRatio;
    } else {
      baseHeight = availableHeight;
      baseWidth = baseHeight * layoutAspectRatio;
    }

    baseWidth = Math.max(baseWidth, isMobile ? 300 : 500);
    baseHeight = Math.max(baseHeight, isMobile ? 210 : 350);

    return {
      maxWidth: baseWidth,
      baseHeight,
      shouldRender: baseWidth > 100 && baseHeight > 100
    };
  }, [windowWidth, isMobile, containerSize]);

  const { maxWidth, baseHeight, shouldRender } = dimensions;

  return (
    <>
    <div
      className="w-full h-full flex flex-col items-center relative pb-20 lg:pb-[104px]"
      style={{
        overflow: 'hidden',
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >

      {/* 📱 PAINEL MOBILE - FLOW-BASED (padrão PortaJusante) */}
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
              maxWidth: `${maxWidth}px` // Usa o mesmo maxWidth responsivo
            }}
          >
            {/* Cards horizontais compactos - sempre visíveis */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">

              {/* CARD 1 — NÍVEIS DA ECLUSA */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[7px] uppercase tracking-wide text-center leading-tight">
                    NÍVEIS DA ECLUSA
                  </h3>
                </div>
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Montante</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {dispNivelMontante.toFixed(2)} <span className="text-gray-400 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Caldeira</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {dispNivelCaldeira.toFixed(2)} <span className="text-gray-400 text-[7px]">m</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-1 text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Jusante</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {dispNivelJusante.toFixed(2)} <span className="text-gray-400 text-[7px]">m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2 — STATUS DO SISTEMA */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[7px] uppercase tracking-wide text-center leading-tight">
                    STATUS DO SISTEMA
                  </h3>
                </div>
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Operação</div>
                    <div className="font-mono font-bold text-green-600 text-[10px]">AUTO</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Níveis</div>
                    <div className={`font-mono font-bold text-[10px] ${statusCaldeira === 'normal' ? 'text-green-600' : statusCaldeira === 'alerta' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {statusCaldeira === 'normal' ? 'NORMAL' : statusCaldeira === 'alerta' ? 'ALERTA' : 'CRÍTICO'}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-1 text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Diff</div>
                    <div className={`font-mono font-bold text-[10px] ${Math.abs(diffMontCald) > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                      {diffMontCald.toFixed(3)} <span className="text-gray-400 text-[7px]">m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3 — INFORMAÇÕES OPERACIONAIS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[7px] uppercase tracking-wide text-center leading-tight whitespace-nowrap">
                    INFO. OPERACIONAL
                  </h3>
                </div>
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Operador</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      J. SILVA
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Porta Mont.</div>
                    <div className="font-mono font-bold text-edp-marine text-[10px]">
                      {Math.round(efPortaMontante)}%
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-1 text-center">
                    <div className="text-[7px] text-gray-500 font-medium uppercase">Porta Jus.</div>
                    <div className="font-mono font-bold text-edp-marine text-[10px]">
                      {Math.round(dispPortaJusante)}%
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}


      <div
        ref={containerRef}
        className={`w-full max-w-[1920px] flex flex-col items-center ${isMobile ? 'justify-start' : 'justify-center'} relative flex-1 min-h-0`}
      >

        {/* 🗺️ CANVAS ÚNICO: um só <svg viewBox> com coordenadas fixas (LAYOUT).
            O navegador escala o SVG inteiro pra caber em qualquer tela — mesma
            posição relativa em mobile e desktop, só o tamanho final muda. */}
        {shouldRender ? (
          <svg
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            preserveAspectRatio="xMidYMid meet"
            width="100%"
            height="100%"
            style={{
              maxWidth: `${maxWidth}px`,
              height: `${baseHeight}px`
            }}
          >
            {/* Caldeira - imagem de fundo */}
            <image
              href="/Eclusa/Caldeira_Eclusa.svg"
              x={LAYOUT.caldeiraEclusa.x}
              y={LAYOUT.caldeiraEclusa.y}
              width={LAYOUT.caldeiraEclusa.width}
              height={LAYOUT.caldeiraEclusa.height}
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Componente Nível Montante - Dados reais do PLC */}
            <foreignObject
              x={LAYOUT.nivelMontante.x}
              y={LAYOUT.nivelMontante.y}
              width={LAYOUT.nivelMontante.width}
              height={LAYOUT.nivelMontante.height}
            >
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <NivelMontante websocketValue={efNivelMontante} editMode={false} />
              </div>
            </foreignObject>

            {/* Componente Nível Jusante - Dados reais do PLC */}
            <foreignObject
              x={LAYOUT.nivelJusante.x}
              y={LAYOUT.nivelJusante.y}
              width={LAYOUT.nivelJusante.width}
              height={LAYOUT.nivelJusante.height}
            >
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <NivelJusante websocketValue={efNivelJusante} editMode={false} />
              </div>
            </foreignObject>

            {/* Componente Nível Caldeira - Dados reais do PLC */}
            <foreignObject
              x={LAYOUT.nivelCaldeira.x}
              y={LAYOUT.nivelCaldeira.y}
              width={LAYOUT.nivelCaldeira.width}
              height={LAYOUT.nivelCaldeira.height}
            >
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <NivelCaldeira websocketValue={efNivelCaldeira} editMode={false} />
              </div>
            </foreignObject>

            {/* Semáforos - Dados reais do PLC */}
            <foreignObject x={LAYOUT.semaforo1.x} y={LAYOUT.semaforo1.y} width={LAYOUT.semaforo1.width} height={LAYOUT.semaforo1.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <SemaforoSimples ledVerde={getSemaforoLeds(1).verde} ledVermelho={getSemaforoLeds(1).vermelho} editMode={true} />
              </div>
            </foreignObject>
            <foreignObject x={LAYOUT.semaforo2.x} y={LAYOUT.semaforo2.y} width={LAYOUT.semaforo2.width} height={LAYOUT.semaforo2.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <SemaforoSimples ledVerde={getSemaforoLeds(2).verde} ledVermelho={getSemaforoLeds(2).vermelho} editMode={true} />
              </div>
            </foreignObject>
            <foreignObject x={LAYOUT.semaforo3.x} y={LAYOUT.semaforo3.y} width={LAYOUT.semaforo3.width} height={LAYOUT.semaforo3.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <SemaforoSimples ledVerde={getSemaforoLeds(3).verde} ledVermelho={getSemaforoLeds(3).vermelho} editMode={true} />
              </div>
            </foreignObject>
            <foreignObject x={LAYOUT.semaforo4.x} y={LAYOUT.semaforo4.y} width={LAYOUT.semaforo4.width} height={LAYOUT.semaforo4.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <SemaforoSimples ledVerde={getSemaforoLeds(4).verde} ledVermelho={getSemaforoLeds(4).vermelho} editMode={true} />
              </div>
            </foreignObject>

            {/* Parede - por cima dos níveis */}
            <image
              href="/Eclusa/Parede_Eclusa.svg"
              x={LAYOUT.paredeEclusa.x}
              y={LAYOUT.paredeEclusa.y}
              width={LAYOUT.paredeEclusa.width}
              height={LAYOUT.paredeEclusa.height}
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Componente Porta Jusante - Dados reais do PLC */}
            <foreignObject x={LAYOUT.portaJusante.x} y={LAYOUT.portaJusante.y} width={LAYOUT.portaJusante.width} height={LAYOUT.portaJusante.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <PortaJusante websocketValue={efPortaJusante} editMode={false} instant={false} />
              </div>
            </foreignObject>

            {/* Componente Porta Montante - Dados reais do PLC */}
            <foreignObject x={LAYOUT.portaMontante.x} y={LAYOUT.portaMontante.y} width={LAYOUT.portaMontante.width} height={LAYOUT.portaMontante.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <PortaMontante
                  websocketValue={efPortaMontante}
                  editMode={false}
                  instant={false}
                />
              </div>
            </foreignObject>

            {/* Base Porta Jusante SVG */}
            <image
              href="/Eclusa/Base_Porta_Jusante.svg"
              x={LAYOUT.basePortaJusante.x}
              y={LAYOUT.basePortaJusante.y}
              width={LAYOUT.basePortaJusante.width}
              height={LAYOUT.basePortaJusante.height}
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Componente Tubulação e Válvulas - Dados reais do PLC */}
            <foreignObject x={LAYOUT.tubulacao.x} y={LAYOUT.tubulacao.y} width={LAYOUT.tubulacao.width} height={LAYOUT.tubulacao.height}>
              <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full">
                <TubulacaoValvulas
                  bitMontanteCaldeira={efValvMontante}
                  bitCaldeiraJusante={efValvJusante}
                  editMode={false}
                />
              </div>
            </foreignObject>

            {/* 🟢 RETÂNGULO HORIZONTAL COM CARDS DENTRO - por cima de tudo, só desktop */}
            {!isMobile && (
              <foreignObject
                x={LAYOUT.infoCards.x}
                y={LAYOUT.infoCards.y}
                width={LAYOUT.infoCards.width}
                height={LAYOUT.infoCards.height}
              >
                <div
                  {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
                  className="w-full h-full"
                >
                {/* CARDS DENTRO DO RETÂNGULO */}
                {(() => {
                  // HTML dentro de foreignObject renderiza em px CSS diretos (sem herdar scale do viewBox).
                  // Escala proporcional ao maxWidth para suportar janelas menores/maiores.
                  const s = Math.max(0.7, Math.min(1.1, maxWidth / 1400));
                  const fontSizeCard = (px: number) => Math.round(px * s);
                  const spacingCard = (px: number) => Math.round(px * s);
                  const gapCards = Math.round(6 * s);
                  const paddingCard = Math.round(5 * s);

                  return (
                    <div
                      className="w-full h-full flex items-stretch justify-center"
                      style={{ padding: `${paddingCard}px` }}
                    >
                      <div
                        className="grid grid-cols-4 w-full h-full"
                        style={{ gap: `${gapCards}px` }}
                      >
                        {/* 1º CARD - INFORMAÇÕES OPERACIONAIS */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(7)}px` }}
                            >
                              INFORMAÇÕES OPERACIONAIS
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Operador:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">J. SILVA</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Turno:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">MANHÃ</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Modo:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">REMOTO</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Porta Montante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-edp-marine">{Math.round(efPortaMontante)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Porta Jusante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-edp-marine">{Math.round(dispPortaJusante)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* 2º CARD - NÍVEIS DA ECLUSA */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(7)}px` }}
                            >
                              NÍVEIS DA ECLUSA
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Montante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{dispNivelMontante.toFixed(2)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Caldeira:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{dispNivelCaldeira.toFixed(2)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Jusante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-[#212E3E]">{dispNivelJusante.toFixed(2)} m</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Diff:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${Math.abs(diffMontCald) > 0.05 ? 'text-red-600' : 'text-green-600'}`}>{diffMontCald.toFixed(3)} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Status:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${statusCaldeira === 'normal' ? 'text-green-600' : statusCaldeira === 'alerta' ? 'text-yellow-600' : 'text-red-600'}`}>{statusCaldeira === 'normal' ? 'NORMAL' : statusCaldeira === 'alerta' ? 'ALERTA' : 'CRÍTICO'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3º CARD - VELOCIDADES DOS RADARES */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(7)}px` }}
                            >
                              VELOCIDADES RADARES
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Montante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarMontante > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarMontante.toFixed(2)} m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Caldeira:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarCaldeira > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarCaldeira.toFixed(2)} m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Jusante:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${radarJusante > 2.0 ? 'text-red-600' : 'text-[#212E3E]'}`}>{radarJusante.toFixed(2)} m/s</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Máx:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-red-600">2.00 m/s</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Status:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">OK</span>
                            </div>
                          </div>
                        </div>

                        {/* 4º CARD - STATUS DO SISTEMA */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
                          <div
                            className="bg-edp-marine text-white rounded-t-lg flex-shrink-0"
                            style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}
                          >
                            <h3
                              className="font-semibold uppercase tracking-wide truncate"
                              style={{ fontSize: `${fontSizeCard(7)}px` }}
                            >
                              STATUS DO SISTEMA
                            </h3>
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly" style={{ padding: `${spacingCard(3)}px ${spacingCard(6)}px` }}>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Operação:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">AUTO</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Níveis:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${statusCaldeira === 'normal' ? 'text-green-600' : 'text-red-600'}`}>{statusCaldeira === 'normal' ? 'OK' : 'ALERTA'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Válvulas:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className={`font-mono font-semibold ${bitMontanteCaldeira || bitCaldeiraJusante ? 'text-green-600' : 'text-gray-500'}`}>{bitMontanteCaldeira || bitCaldeiraJusante ? 'ABERTAS' : 'FECHADAS'}</span>
                            </div>
                            <div className="border-t border-gray-300"></div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Conexão:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-medium text-gray-500">Controle:</span>
                              <span style={{ fontSize: `${fontSizeCard(9)}px` }} className="font-mono font-semibold text-green-600">LOCAL</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              </foreignObject>
            )}

          </svg>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{
                height: '400px',
                maxWidth: '1200px',
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
              w-full max-h-[85vh] rounded-t-3xl
              animate-in slide-in-from-bottom duration-300
              sm:w-[95vw] sm:max-h-[90vh] sm:rounded-2xl
              md:w-[85vw] md:max-w-3xl md:max-h-[800px] md:rounded-2xl
              md:animate-in md:fade-in md:zoom-in
              lg:max-w-4xl
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
            {/* Header */}
            <div className="bg-edp-marine px-3 py-2.5 lg:px-4 lg:py-3 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 lg:w-9 lg:h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CogIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs lg:text-sm font-bold tracking-wide">PARÂMETROS</h2>
                    <p className="text-white/60 text-[10px] lg:text-xs mt-0.5">Configurações e Monitorização</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ touchAction: 'manipulation' }}
                >
                  <XMarkIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com scroll */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              <div className="p-2.5 lg:p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-4">

                  {/* IGUALDADE DE NÍVEIS MONTANTE */}
                  <Card title="Igualdade Níveis Montante" icon={<ArrowUpIcon className="w-4 h-4" />} variant="default" className="h-fit">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Tolerância</span>
                        <span className="text-[11px] font-mono font-bold text-gray-900">0.05 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Tempo Estab.</span>
                        <span className="text-[11px] font-mono font-bold text-gray-900">30 s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Status</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                          <span className="text-green-600 font-semibold text-[11px]">OK</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Bypass</span>
                        <button className="px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-medium">Desabilitado</button>
                      </div>
                    </div>
                  </Card>

                  {/* IGUALDADE DE NÍVEIS JUSANTE */}
                  <Card title="Igualdade Níveis Jusante" icon={<ArrowDownIcon className="w-4 h-4" />} variant="default" className="h-fit">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Tolerância</span>
                        <span className="text-[11px] font-mono font-bold text-gray-900">0.03 m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Tempo Estab.</span>
                        <span className="text-[11px] font-mono font-bold text-gray-900">25 s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Status</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                          <span className="text-green-600 font-semibold text-[11px]">OK</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Bypass</span>
                        <button className="px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-medium">Desabilitado</button>
                      </div>
                    </div>
                  </Card>

                  {/* CONFIGURAÇÕES SISTEMA */}
                  <Card title="Configurações Sistema" icon={<WrenchScrewdriverIcon className="w-4 h-4" />} variant="default" className="h-fit lg:col-span-2">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                          <div className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Timeout Operação</div>
                          <div className="text-sm font-mono font-bold text-blue-800 mt-0.5">30 <span className="text-[10px]">seg</span></div>
                        </div>
                        <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                          <div className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Ciclo Automático</div>
                          <div className="text-sm font-mono font-bold text-green-800 mt-0.5">ATIVO</div>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                        <span className="text-gray-500 text-[11px] font-medium">Manutenção Programada</span>
                        <span className="text-[11px] font-mono font-semibold text-orange-600">15 dias</span>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-3 py-2.5 lg:px-4 lg:py-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2 lg:justify-end">
                <button
                  onClick={() => setMenuParametrosOpen(false)}
                  className="flex-1 lg:flex-none lg:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs lg:text-sm font-medium transition-colors"
                  style={{ touchAction: 'manipulation' }}
                >
                  Fechar
                </button>
                <button
                  className="flex-1 lg:flex-none lg:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs lg:text-sm font-medium transition-colors shadow-sm"
                  style={{ touchAction: 'manipulation' }}
                >
                  Guardar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EclusaRegua;