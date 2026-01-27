import React from 'react';
import BombaPressurizacao from '../components/sistema_agua/Bomba_Pressurizacao';
import Condutivimetro from '../components/sistema_agua/Condutivimetro';
import DepositoEntrada from '../components/sistema_agua/Deposito_entrada';
import FiltroCarvao from '../components/sistema_agua/filtro_carvao';
import Redox from '../components/sistema_agua/redox';

interface SistemaAguaProps {
  sidebarOpen?: boolean;
}

// CONFIGURACAO DA BOMBA PRESSURIZACAO
const BOMBA_CONFIG = {
  desktop: {
    verticalPercent: 0,
    horizontalPercent: 5,
    widthPercent: 12,
    heightPercent: 15,
  },
  mobile: {
    verticalPercent: 70,
    horizontalPercent: 5,
    widthPercent: 25,
    heightPercent: 15,
  }
};

// CONFIGURACAO DO CONDUTIVIMETRO
const CONDUTIVIMETRO_CONFIG = {
  desktop: {
    verticalPercent: 60,
    horizontalPercent: 20,
    widthPercent: 8,
    heightPercent: 12,
  },
  mobile: {
    verticalPercent: 70,
    horizontalPercent: 35,
    widthPercent: 18,
    heightPercent: 12,
  }
};

// CONFIGURACAO DO DEPOSITO ENTRADA
const DEPOSITO_CONFIG = {
  desktop: {
    verticalPercent: 10,
    horizontalPercent: 35,
    widthPercent: 15,
    heightPercent: 50,
  },
  mobile: {
    verticalPercent: 5,
    horizontalPercent: 30,
    widthPercent: 35,
    heightPercent: 45,
  }
};

// CONFIGURACAO DO FILTRO CARVAO
const FILTRO_CONFIG = {
  desktop: {
    verticalPercent: 10,
    horizontalPercent: 55,
    widthPercent: 8,
    heightPercent: 45,
  },
  mobile: {
    verticalPercent: 55,
    horizontalPercent: 60,
    widthPercent: 15,
    heightPercent: 35,
  }
};

// CONFIGURACAO DO REDOX
const REDOX_CONFIG = {
  desktop: {
    verticalPercent: 55,
    horizontalPercent: 70,
    widthPercent: 10,
    heightPercent: 18,
  },
  mobile: {
    verticalPercent: 70,
    horizontalPercent: 60,
    widthPercent: 20,
    heightPercent: 18,
  }
};

const SistemaAgua: React.FC<SistemaAguaProps> = ({ sidebarOpen = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Estados para testar animacao de cada componente
  const [bombaTestValue, setBombaTestValue] = React.useState(0);
  const [condutivimetroTestValue, setCondutivimetroTestValue] = React.useState(0);
  const [depositoTestValue, setDepositoTestValue] = React.useState(50);
  const [filtroTestValue, setFiltroTestValue] = React.useState(0);
  const [redoxTestValue, setRedoxTestValue] = React.useState(0);

  // Estado para mostrar/esconder painel de teste
  const [showTestPanel, setShowTestPanel] = React.useState(true);

  const [windowWidth, setWindowWidth] = React.useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });

  const dimensions = React.useMemo(() => {
    const isMobile = windowWidth < 1024;
    const aspectRatio = 16 / 9;
    const containerWidth = Math.min(windowWidth - 32, 1920);
    const maxWidth = Math.max(containerWidth, 300);
    const baseScale = isMobile ? 95 : 80;
    const baseWidth = (maxWidth * baseScale) / 100;
    const baseHeight = baseWidth / aspectRatio;

    return {
      isMobile,
      maxWidth,
      baseWidth,
      baseHeight,
      alturaTotal: baseHeight,
      shouldRender: maxWidth > 100 && baseHeight > 100
    };
  }, [windowWidth]);

  const { isMobile, maxWidth, alturaTotal, shouldRender } = dimensions;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(prev => {
          if (Math.abs(prev - newWidth) > 50) {
            return newWidth;
          }
          return prev;
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // CONFIGURACOES RESPONSIVAS
  const bombaConfig = isMobile ? BOMBA_CONFIG.mobile : BOMBA_CONFIG.desktop;
  const condutivimetroConfig = isMobile ? CONDUTIVIMETRO_CONFIG.mobile : CONDUTIVIMETRO_CONFIG.desktop;
  const depositoConfig = isMobile ? DEPOSITO_CONFIG.mobile : DEPOSITO_CONFIG.desktop;
  const filtroConfig = isMobile ? FILTRO_CONFIG.mobile : FILTRO_CONFIG.desktop;
  const redoxConfig = isMobile ? REDOX_CONFIG.mobile : REDOX_CONFIG.desktop;

  if (!shouldRender) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ contain: 'layout' }}
    >
      <div className={`
        w-full h-full flex items-center justify-center
        ${isMobile ? 'overflow-y-auto pb-20' : 'overflow-hidden'}
      `}>
        {/* Container Central */}
        <div
          className="relative"
          style={{
            width: `${maxWidth}px`,
            height: `${alturaTotal}px`,
            maxWidth: '1920px'
          }}
        >
          {/* BOMBA PRESSURIZACAO */}
          <div
            className="absolute"
            style={{
              top: `${(alturaTotal * bombaConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * bombaConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * bombaConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * bombaConfig.heightPercent) / 100}px`,
              zIndex: 10,
              contain: 'layout'
            }}
          >
            <BombaPressurizacao
              websocketValue={bombaTestValue}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* CONDUTIVIMETRO */}
          <div
            className="absolute"
            style={{
              top: `${(alturaTotal * condutivimetroConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * condutivimetroConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * condutivimetroConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * condutivimetroConfig.heightPercent) / 100}px`,
              zIndex: 10,
              contain: 'layout'
            }}
          >
            <Condutivimetro
              websocketValue={condutivimetroTestValue}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* DEPOSITO ENTRADA */}
          <div
            className="absolute"
            style={{
              top: `${(alturaTotal * depositoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * depositoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * depositoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * depositoConfig.heightPercent) / 100}px`,
              zIndex: 10,
              contain: 'layout'
            }}
          >
            <DepositoEntrada
              websocketValue={depositoTestValue}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* FILTRO CARVAO */}
          <div
            className="absolute"
            style={{
              top: `${(alturaTotal * filtroConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * filtroConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * filtroConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * filtroConfig.heightPercent) / 100}px`,
              zIndex: 10,
              contain: 'layout'
            }}
          >
            <FiltroCarvao
              websocketValue={filtroTestValue}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* REDOX */}
          <div
            className="absolute"
            style={{
              top: `${(alturaTotal * redoxConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * redoxConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * redoxConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * redoxConfig.heightPercent) / 100}px`,
              zIndex: 10,
              contain: 'layout'
            }}
          >
            <Redox
              websocketValue={redoxTestValue}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* BOTAO TOGGLE PAINEL DE TESTE */}
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="absolute top-2 right-2 z-50 bg-edp-marine text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-edp-marine/80 transition-all"
          >
            {showTestPanel ? 'Esconder Testes' : 'Mostrar Testes'}
          </button>

          {/* PAINEL DE TESTE - TODOS OS COMPONENTES */}
          {showTestPanel && (
            <div
              className={`absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden ${
                isMobile ? 'top-10 right-2 left-2' : 'top-10 right-2 w-64'
              }`}
              style={{ zIndex: 50, maxHeight: isMobile ? '60vh' : '80vh', overflowY: 'auto' }}
            >
              <div className="bg-edp-marine text-white px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wide">Simulacao Componentes</span>
              </div>

              <div className="p-3 space-y-4">
                {/* BOMBA */}
                <div className="border-b border-gray-200 pb-3">
                  <div className="text-[10px] font-bold text-gray-700 mb-2 uppercase">Bomba Pressurizacao</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={`bomba-${val}`}
                        onClick={() => setBombaTestValue(val)}
                        className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                          bombaTestValue === val
                            ? val === 0 ? 'bg-gray-500 text-white'
                            : val === 1 ? 'bg-green-500 text-white'
                            : val === 2 ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1">0=Inativo 1=OK 2=Manut 3=Falha</div>
                </div>

                {/* CONDUTIVIMETRO */}
                <div className="border-b border-gray-200 pb-3">
                  <div className="text-[10px] font-bold text-gray-700 mb-2 uppercase">Condutivimetro</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={`condut-${val}`}
                        onClick={() => setCondutivimetroTestValue(val)}
                        className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                          condutivimetroTestValue === val
                            ? val === 0 ? 'bg-indigo-500 text-white'
                            : val === 1 ? 'bg-indigo-500 text-white'
                            : val === 2 ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1">0=Inativo 1=OK 2=Fora 3=Alarme</div>
                </div>

                {/* DEPOSITO ENTRADA */}
                <div className="border-b border-gray-200 pb-3">
                  <div className="text-[10px] font-bold text-gray-700 mb-2 uppercase">Deposito Entrada</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={depositoTestValue}
                      onChange={(e) => setDepositoTestValue(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{depositoTestValue}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={`deposito-${val}`}
                        onClick={() => setDepositoTestValue(val)}
                        className={`px-1 py-1 text-[9px] font-medium rounded transition-all ${
                          depositoTestValue === val
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* FILTRO CARVAO */}
                <div className="border-b border-gray-200 pb-3">
                  <div className="text-[10px] font-bold text-gray-700 mb-2 uppercase">Filtro Carvao</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setFiltroTestValue(0)}
                      className={`px-2 py-1.5 text-[10px] font-medium rounded transition-all ${
                        filtroTestValue === 0
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      0 - Fechado
                    </button>
                    <button
                      onClick={() => setFiltroTestValue(1)}
                      className={`px-2 py-1.5 text-[10px] font-medium rounded transition-all ${
                        filtroTestValue === 1
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      1 - Aberto
                    </button>
                  </div>
                </div>

                {/* REDOX */}
                <div>
                  <div className="text-[10px] font-bold text-gray-700 mb-2 uppercase">Redox</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={`redox-${val}`}
                        onClick={() => setRedoxTestValue(val)}
                        className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                          redoxTestValue === val
                            ? val === 0 ? 'bg-blue-600 text-white'
                            : val === 1 ? 'bg-blue-600 text-white'
                            : val === 2 ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1">0=Inativo 1=Normal 2=Alerta 3=Alarme</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SistemaAgua;
