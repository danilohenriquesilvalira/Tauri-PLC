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

interface EsvaziamentoProps {
  sidebarOpen?: boolean;
}

const VIEWBOX_W = 1600;
const VIEWBOX_H = 900;

const LAYOUT = {
  pipeSystem: { x: 0, y: -180, width: 1600, height: 900 },
  baseFundo: { x: 0, y: 148.5, width: 1600, height: 900 },
  basePistaoEsquerdo: { x: 14.4, y: 594, width: 320, height: 414 },
  basePistaoDireito: { x: 1264, y: 594, width: 320, height: 414 },
  pistaoEsquerdo: { x: -65.6, y: 351, width: 480, height: 630 },
  pistaoDireito: { x: 1184, y: 351, width: 480, height: 630 },
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

const Esvaziamento: React.FC<EsvaziamentoProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    const aspectRatio = VIEWBOX_W / VIEWBOX_H;
    const availableWidth = containerSize.width > 0 ? containerSize.width : windowWidth - 32;
    const availableHeight = containerSize.height > 0 ? containerSize.height : window.innerHeight - 160;

    let baseWidth: number;
    let baseHeight: number;
    const widthBasedHeight = availableWidth / aspectRatio;

    if (widthBasedHeight <= availableHeight) {
      baseWidth = availableWidth;
      baseHeight = baseWidth / aspectRatio;
    } else {
      baseHeight = availableHeight;
      baseWidth = baseHeight * aspectRatio;
    }

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

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(prev => Math.abs(prev - newWidth) > 50 ? newWidth : prev);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => { clearTimeout(resizeTimeout); window.removeEventListener('resize', handleResize); };
  }, []);

  const { data: plcData, sendCommand, connectionStatus } = usePLC();

  const hasSubscribedRef = React.useRef(false);
  React.useEffect(() => { hasSubscribedRef.current = false; }, []);
  React.useEffect(() => {
    if (connectionStatus.connected && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;
      const subscribeCmd = {
        type: 'SUBSCRIBE',
        plc_ips: [],
        areas: ['ESVA'],
        categories: ['PROC', 'FAULT', 'EVENT'],
        include_all_faults: true
      };
      sendCommand({
        plc_ip: '',
        tag_name: 'SUBSCRIBE',
        variable: JSON.stringify(subscribeCmd),
        value: 'SUBSCRIBE',
        data_type: 'STRING'
      });
      if (import.meta.env.DEV) {
        console.log('📡 [Esvaziamento] Subscribe ESVA enviado (mount):', subscribeCmd);
      }
    }
  }, [connectionStatus.connected, sendCommand]);

  // ── PISTÕES (posição 0–100 %) ───────────────────────────────────────────
  const webSocketData = React.useMemo(() => {
    if (!plcData?.tags) return null;
    return {
      pistaoDireitoRaw:  parseInt(plcData.tags['ESVA_MED_AB_CILIND.POS_DIR_INT']  || '0', 10),
      pistaoEsquerdoRaw: parseInt(plcData.tags['ESVA_MED_AB_CILIND.POS_ESQ_INT']  || '0', 10),

      tempoAberturaDireito:      parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_SUB_A']   || '0', 10),
      velocidadeDireito:         parseFloat(plcData.tags['ESVA_POSICAO_COMP.VELOC_C_A']          || '0'),
      tempoAberturaLentaDireito: parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_ESTAB_A'] || '0', 10),
      tempoFechoDireito:         parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_DESC_A']  || '0', 10),
      posicaoMetrosDireito:      parseFloat(plcData.tags['ESVA_MED_AB_CILIND.MED_CILIND_DIR']   || '0'),
      posicaoPorcentagemDireito: parseFloat(plcData.tags['ESVA_MED_AB_CILIND.PORC_CILIND_DIR']  || '0'),

      tempoAberturaEsquerdo:      parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_SUB_B']   || '0', 10),
      velocidadeEsquerdo:         parseFloat(plcData.tags['ESVA_POSICAO_COMP.VELOC_C_B']          || '0'),
      tempoAberturaLentaEsquerdo: parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_ESTAB_B'] || '0', 10),
      tempoFechoEsquerdo:         parseInt(plcData.tags['ESVA_POSICAO_COMP.CONTAG_TEMP_DESC_B']  || '0', 10),
      posicaoMetrosEsquerdo:      parseFloat(plcData.tags['ESVA_MED_AB_CILIND.MED_CILIND_ESQ']   || '0'),
      posicaoPorcentagemEsquerdo: parseFloat(plcData.tags['ESVA_MED_AB_CILIND.PORC_CILIND_ESQ']  || '0'),
    };
  }, [plcData?.tags]);

  const pistaoDireitoRaw        = webSocketData?.pistaoDireitoRaw        || 0;
  const pistaoEsquerdoRaw       = webSocketData?.pistaoEsquerdoRaw       || 0;
  const tempoAberturaDireito    = webSocketData?.tempoAberturaDireito    || 0;
  const velocidadeDireito       = webSocketData?.velocidadeDireito       || 0;
  const tempoAberturaLentaDireito = webSocketData?.tempoAberturaLentaDireito || 0;
  const tempoFechoDireito       = webSocketData?.tempoFechoDireito       || 0;
  const posicaoMetrosDireito    = webSocketData?.posicaoMetrosDireito    || 0;
  const posicaoPorcentagemDireito = webSocketData?.posicaoPorcentagemDireito || 0;
  const tempoAberturaEsquerdo   = webSocketData?.tempoAberturaEsquerdo   || 0;
  const velocidadeEsquerdo      = webSocketData?.velocidadeEsquerdo      || 0;
  const tempoAberturaLentaEsquerdo = webSocketData?.tempoAberturaLentaEsquerdo || 0;
  const tempoFechoEsquerdo      = webSocketData?.tempoFechoEsquerdo      || 0;
  const posicaoMetrosEsquerdo   = webSocketData?.posicaoMetrosEsquerdo   || 0;
  const posicaoPorcentagemEsquerdo = webSocketData?.posicaoPorcentagemEsquerdo || 0;

  const pistaoDireito  = React.useMemo(() => Math.max(0, Math.min(100, pistaoDireitoRaw)),  [pistaoDireitoRaw]);
  const pistaoEsquerdo = React.useMemo(() => Math.max(0, Math.min(100, pistaoEsquerdoRaw)), [pistaoEsquerdoRaw]);

  // ── VÁLVULAS, MOTORES, PIPES ─────────────────────────────────────────────
  const valvulasData = React.useMemo(() => {
    if (!plcData?.tags) return null;
    return {
      bombaMotorDireito:  parseInt(plcData.tags['ESVA_ANIM_WINCC_ANIM_BOMBA_A_ESVA'] || '0', 10),
      bombaMotorEsquerdo: parseInt(plcData.tags['ESVA_ANIM_WINCC_ANIM_BOMBA_B_ESVA'] || '0', 10),

      cilindroDireito:  plcData.tags['ESVA_DEF_AG_CILIND_A_DIR'] === 'TRUE' ? 1 : 0,
      cilindroEsquerdo: plcData.tags['ESVA_DEF_AG_CILIND_B_ESQ'] === 'TRUE' ? 1 : 0,

      // Tubulações lado DIREITO
      pipe1Real: plcData.tags['ESVA_SIN_AG_SUBID']           === 'TRUE' ? 1 : 0,
      pipe2Real: plcData.tags['ESVA_SIN_CIRC_SUBIDA']        === 'TRUE' ? 1 : 0,
      pipe3Real: plcData.tags['ESVA_OM_VALV_DESC_COMP_A']    === 'TRUE' ? 1 : 0,
      pipe4Real: plcData.tags['ESVA_EM_SUB_LENTA']           === 'TRUE' ? 1 : 0,
      pipe5Real: plcData.tags['ESVA_HMI_B_LIG_VD2_0_DIR']   === 'TRUE' ? 1 : 0,
      pipe6Real: plcData.tags['ESVA_RM_BOMB_DIR']            === 'TRUE' ? 1 : 0,
      pipe7Real: plcData.tags['ESVA_HMI_VD1_VD2_LIG_DIR']   === 'TRUE' ? 1 : 0,
      pipe8Real: plcData.tags['ESVA_EM_SUB_RAP']             === 'TRUE' ? 1 : 0,
      pipe9Real: plcData.tags['ESVA_OM_VD2_COMP_DIR']        === 'TRUE' ? 1 : 0,

      // Tubulações lado ESQUERDO
      pipe1EsqReal: plcData.tags['ESVA_SIN_CIRC_SUBIDA_ESQ']   === 'TRUE' ? 1 : 0,
      pipe2EsqReal: plcData.tags['ESVA_SIN_AG_SUBID_ESQ']      === 'TRUE' ? 1 : 0,
      pipe3EsqReal: plcData.tags['ESVA_OM_VALV_DESC_COMP_B']   === 'TRUE' ? 1 : 0,
      pipe4EsqReal: plcData.tags['ESVA_EM_SUB_LENTA_ESQ']      === 'TRUE' ? 1 : 0,
      pipe5EsqReal: plcData.tags['ESVA_HMI_B_LIG_VD2_0_ESQ']  === 'TRUE' ? 1 : 0,
      pipe6EsqReal: plcData.tags['ESVA_RM_BOMB_ESQ']           === 'TRUE' ? 1 : 0,
      pipe7EsqReal: plcData.tags['ESVA_HMI_VD1_VD2_LIG_ESQ']  === 'TRUE' ? 1 : 0,
      pipe8EsqReal: plcData.tags['ESVA_EM_SUB_RAP_ESQ']        === 'TRUE' ? 1 : 0,
      pipe9EsqReal: plcData.tags['ESVA_OM_VD2_COMP_ESQ']       === 'TRUE' ? 1 : 0,
    };
  }, [plcData?.tags]);

  const bombaMotorDireito  = valvulasData?.bombaMotorDireito  || 0;
  const bombaMotorEsquerdo = valvulasData?.bombaMotorEsquerdo || 0;
  const cilindroDireito    = valvulasData?.cilindroDireito    || 0;
  const cilindroEsquerdo   = valvulasData?.cilindroEsquerdo   || 0;
  const pipe1Real  = valvulasData?.pipe1Real  || 0;
  const pipe2Real  = valvulasData?.pipe2Real  || 0;
  const pipe3Real  = valvulasData?.pipe3Real  || 0;
  const pipe4Real  = valvulasData?.pipe4Real  || 0;
  const pipe5Real  = valvulasData?.pipe5Real  || 0;
  const pipe6Real  = valvulasData?.pipe6Real  || 0;
  const pipe7Real  = valvulasData?.pipe7Real  || 0;
  const pipe8Real  = valvulasData?.pipe8Real  || 0;
  const pipe9Real  = valvulasData?.pipe9Real  || 0;
  const pipe1EsqReal = valvulasData?.pipe1EsqReal || 0;
  const pipe2EsqReal = valvulasData?.pipe2EsqReal || 0;
  const pipe3EsqReal = valvulasData?.pipe3EsqReal || 0;
  const pipe4EsqReal = valvulasData?.pipe4EsqReal || 0;
  const pipe5EsqReal = valvulasData?.pipe5EsqReal || 0;
  const pipe6EsqReal = valvulasData?.pipe6EsqReal || 0;
  const pipe7EsqReal = valvulasData?.pipe7EsqReal || 0;
  const pipe8EsqReal = valvulasData?.pipe8EsqReal || 0;
  const pipe9EsqReal = valvulasData?.pipe9EsqReal || 0;

  // Mapeamento bits SVG lado DIREITO
  const bit12 = pipe1Real;
  const bit9  = pipe2Real;
  const bit11 = pipe3Real;
  const bit19 = pipe4Real;
  const bit20 = pipe5Real;
  const bit21 = pipe6Real;
  const bit23 = pipe7Real;
  const bit25 = pipe8Real;
  const bit24 = pipe9Real;

  // Mapeamento bits SVG lado ESQUERDO
  const bit26 = pipe1EsqReal;
  const bit31 = pipe2EsqReal;
  const bit30 = pipe3EsqReal;
  const bit16 = pipe4EsqReal;
  const bit17 = pipe5EsqReal;
  const bit18 = pipe6EsqReal;
  const bit22 = pipe7EsqReal;
  const bit27 = pipe8EsqReal;
  const bit28 = pipe9EsqReal;

  const valvulasComplexasData = React.useMemo(() => {
    if (!plcData?.tags) return null;
    return {
      valvulaVerticalDireita:  plcData.tags['ESVA_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaVerticalEsquerda: plcData.tags['ESVA_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,

      bit13: Number(plcData?.bit_data?.status_bits?.[1]?.[13] || 0),
      bit36: Number(plcData?.bit_data?.status_bits?.[2]?.[4]  || 0),

      valvulaEsquerda1: plcData.tags['ESVA_EM_SUB_LENTA']      === 'TRUE' ? 1 : 0,
      valvulaEsquerda2: plcData.tags['ESVA_EM_SUB_RAP']        === 'TRUE' ? 1 : 0,
      valvulaEsquerda3: plcData.tags['ESVA_OM_VD2_COMP_DIR']   === 'TRUE' ? 1 : 0,
      valvulaDireita1:  plcData.tags['ESVA_OM_VD2_COMP_ESQ']   === 'TRUE' ? 1 : 0,
      valvulaDireita2:  plcData.tags['ESVA_EM_SUB_RAP_ESQ']    === 'TRUE' ? 1 : 0,
      valvulaDireita3:  plcData.tags['ESVA_EM_SUB_LENTA_ESQ']  === 'TRUE' ? 1 : 0,

      valvulaGavetaEsquerda1Real: plcData.tags['ESVA_SIN_AG_SUBID']          === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda2Real: plcData.tags['ESVA_SIN_CIRC_SUBIDA']       === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda3Real: plcData.tags['ESVA_SIN_AG_SUBID']          === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita1Real:  plcData.tags['ESVA_SIN_AG_SUBID_ESQ']      === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita2Real:  plcData.tags['ESVA_SIN_CIRC_SUBIDA_ESQ']   === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita3Real:  plcData.tags['ESVA_SIN_AG_SUBID_ESQ']      === 'TRUE' ? 1 : 0,

      valvulaDirecionalDireita1Real:  plcData.tags['ESVA_OM_VALV_DESC_COMP_B']  === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita2Real:  plcData.tags['ESVA_OM_VALV_DIST_COMP_B']  === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita3Real:  plcData.tags['ESVA_OM_VD2_COMP_ESQ']      === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda1Real: plcData.tags['ESVA_OM_VALV_DESC_COMP_A']  === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda2Real: plcData.tags['ESVA_OM_VALV_DIST_COMP_A']  === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda3Real: plcData.tags['ESVA_OM_VD2_COMP_DIR']      === 'TRUE' ? 1 : 0,
    };
  }, [plcData?.tags, plcData?.bit_data?.status_bits]);

  const valvulaVerticalDireita  = valvulasComplexasData?.valvulaVerticalDireita  || 0;
  const valvulaVerticalEsquerda = valvulasComplexasData?.valvulaVerticalEsquerda || 0;
  const bit13 = valvulasComplexasData?.bit13 || 0;
  const bit33 = pipe2EsqReal;
  const bit34 = pipe3EsqReal;
  const bit36 = valvulasComplexasData?.bit36 || 0;

  const valvulaEsquerda1 = valvulasComplexasData?.valvulaEsquerda1 || 0;
  const valvulaEsquerda2 = valvulasComplexasData?.valvulaEsquerda2 || 0;
  const valvulaEsquerda3 = valvulasComplexasData?.valvulaEsquerda3 || 0;
  const valvulaDireita1  = valvulasComplexasData?.valvulaDireita1  || 0;
  const valvulaDireita2  = valvulasComplexasData?.valvulaDireita2  || 0;
  const valvulaDireita3  = valvulasComplexasData?.valvulaDireita3  || 0;

  const valvulaFlangeEsquerda1 = valvulaEsquerda1;
  const valvulaFlangeEsquerda2 = valvulaEsquerda2;
  const valvulaFlangeEsquerda3 = valvulaEsquerda3;
  const valvulaFlangeDireita1  = valvulaDireita1;
  const valvulaFlangeDireita2  = valvulaDireita2;
  const valvulaFlangeDireita3  = valvulaDireita3;

  const valvulaGavetaEsquerda1 = valvulasComplexasData?.valvulaGavetaEsquerda1Real || 0;
  const valvulaGavetaEsquerda2 = valvulasComplexasData?.valvulaGavetaEsquerda2Real || 0;
  const valvulaGavetaEsquerda3 = valvulasComplexasData?.valvulaGavetaEsquerda3Real || 0;
  const valvulaGavetaDireita1  = valvulasComplexasData?.valvulaGavetaDireita1Real  || 0;
  const valvulaGavetaDireita2  = valvulasComplexasData?.valvulaGavetaDireita2Real  || 0;
  const valvulaGavetaDireita3  = valvulasComplexasData?.valvulaGavetaDireita3Real  || 0;

  const valvulaDirecionalEsquerda1 = valvulasComplexasData?.valvulaDirecionalEsquerda1Real || 0;
  const valvulaDirecionalEsquerda2 = valvulasComplexasData?.valvulaDirecionalEsquerda2Real || 0;
  const valvulaDirecionalEsquerda3 = valvulasComplexasData?.valvulaDirecionalEsquerda3Real || 0;
  const valvulaDirecionalDireita1  = valvulasComplexasData?.valvulaDirecionalDireita1Real  || 0;
  const valvulaDirecionalDireita2  = valvulasComplexasData?.valvulaDirecionalDireita2Real  || 0;
  const valvulaDirecionalDireita3  = valvulasComplexasData?.valvulaDirecionalDireita3Real  || 0;

  // Estado textual da operação (drenagem = pistões descendo de 100→0)
  const estadoOperacao = posicaoPorcentagemDireito > 80
    ? 'CHEIO'
    : posicaoPorcentagemDireito > 10
    ? 'DRENANDO'
    : 'VAZIO';

  return (
    <div
      className="w-full h-full flex flex-col items-center relative pb-20 lg:pb-[104px]"
      style={{ touchAction: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* ── PAINEL MOBILE ─────────────────────────────────────────────────── */}
      {isMobile && (
        <div
          className="w-full mt-4 mb-4 relative"
          style={{ padding: `0 ${Math.max(6, Math.min(16, windowWidth * 0.02))}px` }}
        >
          <div className="mx-auto" style={{ width: `${baseWidth}px` }}>
            <div className="grid grid-cols-3 gap-1.5 mb-2">

              {/* CARD PISTÕES */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">PISTÕES</h3>
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
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Nível:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {((posicaoPorcentagemDireito + posicaoPorcentagemEsquerdo) / 2).toFixed(1)} <span className="text-gray-500 text-[6px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD SISTEMA */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">SISTEMA</h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Velocidade:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {((velocidadeDireito + velocidadeEsquerdo) / 2).toFixed(3)} <span className="text-gray-500 text-[7px]">m/s</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-gray-600 font-medium uppercase">Estado:</div>
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">{estadoOperacao}</div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Sync:</div>
                      <div className={`font-mono font-bold text-[9px] ${Math.abs(posicaoPorcentagemDireito - posicaoPorcentagemEsquerdo) < 5 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(posicaoPorcentagemDireito - posicaoPorcentagemEsquerdo) < 5 ? 'OK' : 'ERRO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD VÁLVULAS */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">VÁLVULAS</h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Gavetas:</div>
                      <div className="flex justify-center gap-0.5">
                        <div className={`w-1 h-1 rounded-full ${valvulaGavetaEsquerda1 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-1 h-1 rounded-full ${valvulaGavetaEsquerda2 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-1 h-1 rounded-full ${valvulaGavetaEsquerda3 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Direcionais:</div>
                      <div className="flex justify-center gap-0.5">
                        <div className={`w-1 h-1 rounded-full ${valvulaDirecionalEsquerda1 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-1 h-1 rounded-full ${valvulaDirecionalEsquerda2 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-1 h-1 rounded-full ${valvulaDirecionalEsquerda3 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <div className="text-center">
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Ativas:</div>
                      <div className="font-mono font-bold text-[#212E3E] text-[9px]">
                        {[valvulaGavetaEsquerda1, valvulaGavetaEsquerda2, valvulaGavetaEsquerda3,
                          valvulaDirecionalEsquerda1, valvulaDirecionalEsquerda2, valvulaDirecionalEsquerda3,
                          valvulaGavetaDireita1, valvulaGavetaDireita2, valvulaGavetaDireita3
                        ].filter(Boolean).length} <span className="text-gray-500 text-[6px]">/ 9</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTAINER DO DIAGRAMA ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center justify-start relative z-10 flex-1 min-h-0"
        style={{ overflow: 'visible' }}
      >
        {shouldRender ? (
          <div
            className="relative w-full flex items-center justify-center"
            style={{
              width: `${baseWidth}px` as any,
              height: `${baseHeight}px` as any,
              minHeight: `${baseHeight}px` as any,
            }}
          >
            <svg
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              height="100%"
              style={{ overflow: 'visible' }}
            >
              {/* TANQUE ÓLEO */}
              <svg x={LAYOUT.tanqueOleo.x} y={LAYOUT.tanqueOleo.y} width={LAYOUT.tanqueOleo.width} height={LAYOUT.tanqueOleo.height} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/Tanque_Oleo.svg" width="260" height="165" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* TUBULAÇÕES */}
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

              {/* CILINDROS */}
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

              {/* VÁLVULAS GAVETA */}
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

              {/* BASE FUNDO */}
              <svg x={LAYOUT.baseFundo.x} y={LAYOUT.baseFundo.y} width={LAYOUT.baseFundo.width} height={LAYOUT.baseFundo.height} viewBox="0 0 1348 600" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/Base_Fundo_Enchimento.svg" width="1348" height="600" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* MOTORES */}
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

              {/* PISTÕES */}
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

              {/* VÁLVULAS FLANGE */}
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

              {/* VÁLVULAS DIRECIONAIS */}
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

              {/* VÁLVULAS VERTICAIS */}
              <foreignObject x={LAYOUT.valvulaVerticalEsquerda.x} y={LAYOUT.valvulaVerticalEsquerda.y} width={LAYOUT.valvulaVerticalEsquerda.width} height={LAYOUT.valvulaVerticalEsquerda.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaVertical websocketBit={valvulaVerticalEsquerda} editMode={false} /></div>
              </foreignObject>
              <foreignObject x={LAYOUT.valvulaVerticalDireita.x} y={LAYOUT.valvulaVerticalDireita.y} width={LAYOUT.valvulaVerticalDireita.width} height={LAYOUT.valvulaVerticalDireita.height}>
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} className="w-full h-full"><ValvulaVertical websocketBit={valvulaVerticalDireita} editMode={false} /></div>
              </foreignObject>

              {/* SUPORTE PISTA */}
              <svg x={LAYOUT.suportePistaEsquerdo.x} y={LAYOUT.suportePistaEsquerdo.y} width={LAYOUT.suportePistaEsquerdo.width} height={LAYOUT.suportePistaEsquerdo.height} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/SuportePista.svg" width="400" height="200" preserveAspectRatio="xMidYMid meet" />
              </svg>
              <svg x={LAYOUT.suportePistaDireito.x} y={LAYOUT.suportePistaDireito.y} width={LAYOUT.suportePistaDireito.width} height={LAYOUT.suportePistaDireito.height} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <image href="/Enchimento/SuportePista.svg" width="400" height="200" preserveAspectRatio="xMidYMid meet" />
              </svg>

              {/* VÁLVULAS ON/OFF */}
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

            {/* ── CARD PISTÃO DIREITO - APENAS DESKTOP ───────────────────── */}
            {!isMobile && (
              <div className="absolute z-50" style={{ top: `${baseHeight * 0.72}px`, left: `${baseWidth * 0.21}px`, width: `${baseWidth * 0.23}px` }}>
                <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
                  <div className="bg-edp-marine text-white" style={{ padding: `${Math.max(6, baseWidth * 0.005)}px ${Math.max(10, baseWidth * 0.008)}px` }}>
                    <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: `${Math.max(10, Math.min(14, baseWidth * 0.008))}px` }}>PISTÃO DIREITO</h3>
                  </div>
                  <div style={{ padding: `${Math.max(10, baseWidth * 0.01)}px` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, baseWidth * 0.006)}px` }}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Posição:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {posicaoMetrosDireito.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Nível:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {posicaoPorcentagemDireito.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>%</span>
                        </span>
                      </div>
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Descida:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoAberturaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Lento:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoAberturaLentaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Subida:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoFechoDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Velocidade:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {velocidadeDireito.toFixed(4)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m/s</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── CARD PISTÃO ESQUERDO - APENAS DESKTOP ──────────────────── */}
            {!isMobile && (
              <div className="absolute z-50" style={{ top: `${baseHeight * 0.72}px`, left: `${baseWidth * 0.50}px`, width: `${baseWidth * 0.23}px` }}>
                <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
                  <div className="bg-edp-marine text-white" style={{ padding: `${Math.max(6, baseWidth * 0.005)}px ${Math.max(10, baseWidth * 0.008)}px` }}>
                    <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: `${Math.max(10, Math.min(14, baseWidth * 0.008))}px` }}>PISTÃO ESQUERDO</h3>
                  </div>
                  <div style={{ padding: `${Math.max(10, baseWidth * 0.01)}px` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, baseWidth * 0.006)}px` }}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Posição:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {posicaoMetrosEsquerdo.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>m</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Nível:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {posicaoPorcentagemEsquerdo.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>%</span>
                        </span>
                      </div>
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Descida:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoAberturaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Lento:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoAberturaLentaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>T. Subida:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
                          {tempoFechoEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>s</span>
                        </span>
                      </div>
                      <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, baseWidth * 0.003)}px 0` }}></div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#212E3E] uppercase tracking-wide" style={{ fontSize: `${Math.max(8, Math.min(11, baseWidth * 0.006))}px` }}>Velocidade:</span>
                        <span className="font-mono font-bold text-[#212E3E]" style={{ fontSize: `${Math.max(12, Math.min(18, baseWidth * 0.011))}px` }}>
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
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{ height: '600px', width: '800px', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
            >
              <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DE PARÂMETROS ───────────────────────────────────────────── */}
      {menuParametrosOpen && (
        <div
          className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden"
          onClick={() => setMenuParametrosOpen(false)}
          style={{ touchAction: 'none', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
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
            style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
          >
            {/* Header */}
            <div className="bg-[#212E3E] p-1.5 md:p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-3">
                  <div className="w-5 h-5 md:w-10 md:h-10 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
                    <CogIcon className="w-2.5 h-2.5 md:w-5 md:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[10px] md:text-base font-bold truncate">PARÂMETROS — ESVAZIAMENTO</h2>
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

            {/* Conteúdo */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              <div className="p-1.5 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-4">

                  <Card title="VELOCIDADE DE DESCIDA" icon={<ArrowDownIcon className="w-5 h-5" />} variant="default" className="h-fit">
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

                  <Card title="VELOCIDADE DE SUBIDA" icon={<ArrowUpIcon className="w-5 h-5" />} variant="default" className="h-fit">
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

                  <Card title="QUADRO DE POTÊNCIA" icon={<BoltIcon className="w-5 h-5" />} variant="default" className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4">
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

            {/* Footer */}
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

export default Esvaziamento;
