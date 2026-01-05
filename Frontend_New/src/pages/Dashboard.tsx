import React from 'react';
// import { usePLC } from '../contexts/PLCContext'; // Para futuro uso com dados reais
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  SignalIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Area, AreaChart, BarChart, Bar, ComposedChart } from 'recharts';

interface DashboardProps {
  sidebarOpen?: boolean;
}

// 🚨 DADOS SIMULADOS BASEADOS NO ARQUIVO REAL DE FALHAS - FOCADO EM ANALYTICS
const mockAnalyticsData = {
  // KPIs Principais
  kpis: {
    totalFalhas: 127,
    falhasAtivas: 8,
    falhasResolvidasHoje: 15,
    tempoMedioResolucao: 28, // minutos
    mttr: 32, // Mean Time To Repair
    mtbf: 168, // Mean Time Between Failures (horas)
    disponibilidade: 97.8, // %
    criticidadeMedia: 2.4 // 1-4 scale
  },

  // Tendências (últimas 24h)
  tendencias24h: [
    { hora: '00:00', falhas: 2, resolvidas: 1 },
    { hora: '02:00', falhas: 1, resolvidas: 3 },
    { hora: '04:00', falhas: 0, resolvidas: 2 },
    { hora: '06:00', falhas: 3, resolvidas: 1 },
    { hora: '08:00', falhas: 5, resolvidas: 4 },
    { hora: '10:00', falhas: 4, resolvidas: 6 },
    { hora: '12:00', falhas: 7, resolvidas: 5 },
    { hora: '14:00', falhas: 6, resolvidas: 8 },
    { hora: '16:00', falhas: 8, resolvidas: 7 },
    { hora: '18:00', falhas: 4, resolvidas: 9 },
    { hora: '20:00', falhas: 3, resolvidas: 6 },
    { hora: '22:00', falhas: 2, resolvidas: 4 }
  ],

  // Distribuição por Severidade
  severidades: [
    { nome: 'CRITICAL', valor: 8, percentual: 10, cor: '#ef4444' },
    { nome: 'HIGH', valor: 23, percentual: 28, cor: '#f97316' },
    { nome: 'MEDIUM', valor: 35, percentual: 43, cor: '#eab308' },
    { nome: 'LOW', valor: 15, percentual: 19, cor: '#3b82f6' }
  ],

  // Equipamentos com Mais Falhas
  topEquipamentos: [
    { nome: 'Enchimento', falhas: 45, percentual: 35 },
    { nome: 'Esvaziamento', falhas: 32, percentual: 25 },
    { nome: 'Porta Montante', falhas: 28, percentual: 22 },
    { nome: 'Porta Jusante', falhas: 15, percentual: 12 },
    { nome: 'Sala Comando', falhas: 12, percentual: 9 },
    { nome: 'Esgoto e Drenagem', falhas: 8, percentual: 6 }
  ],

  // Categorias de Falhas
  categorias: [
    { nome: 'ELÉTRICA', valor: 38, tendencia: '+12%' },
    { nome: 'MECÂNICA', valor: 29, tendencia: '-8%' },
    { nome: 'COMUNICAÇÃO', valor: 24, tendencia: '+5%' },
    { nome: 'SENSOR', valor: 21, tendencia: '+15%' },
    { nome: 'INSTRUMENTAÇÃO', valor: 15, tendencia: '-3%' }
  ],

  // Performance Mensal (últimos 6 meses)
  performanceMensal: [
    { mes: 'Maio', falhas: 89, resolvidas: 91, disponibilidade: 98.2 },
    { mes: 'Jun', falhas: 76, resolvidas: 78, disponibilidade: 98.5 },
    { mes: 'Jul', falhas: 94, resolvidas: 92, disponibilidade: 97.8 },
    { mes: 'Ago', falhas: 103, resolvidas: 106, disponibilidade: 97.1 },
    { mes: 'Set', falhas: 87, resolvidas: 89, disponibilidade: 98.3 },
    { mes: 'Out', falhas: 127, resolvidas: 118, disponibilidade: 97.8 }
  ],

  // Falhas Detalhadas para Tabela
  falhasDetalhadas: [
    {
      id: 'W17_B5',
      equipamento: 'Enchimento RG',
      severidade: 'CRITICAL',
      titulo: 'FALHA COMUNICAÇÃO COM SALA DE COMANDO',
      descricao: 'Perda de comunicação entre o painel de enchimento e a sala de comando principal',
      tempo: '15min',
      status: 'ATIVA'
    },
    {
      id: 'W18_B8', 
      equipamento: 'Enchimento RG',
      severidade: 'HIGH',
      titulo: 'DEFEITO RESPOSTA DE MARCHA BOMBA A',
      descricao: 'Bomba A não responde ao comando de marcha - verificar contator K5',
      tempo: '42min',
      status: 'EM_INVESTIGACAO'
    },
    {
      id: 'W20_B12',
      equipamento: 'Enchimento RG', 
      severidade: 'MEDIUM',
      titulo: 'VELOCIDADE ALTA FECHO COMPORTA DIREITA',
      descricao: 'Velocidade de fechamento acima do limite configurado (85 m/min)',
      tempo: '8min',
      status: 'MONITORANDO'
    },
    {
      id: 'W30_B9',
      equipamento: 'Porta Montante',
      severidade: 'HIGH', 
      titulo: 'DEFEITO FONTE ALIMENTAÇÃO 400VAC/24VDC',
      descricao: 'Tensão de saída da fonte fora dos parâmetros nominais',
      tempo: '2h',
      status: 'PENDENTE'
    },
    {
      id: 'W31_B10',
      equipamento: 'Porta Montante',
      severidade: 'LOW',
      titulo: 'LASER PORTA MONTANTE DESLIGADO', 
      descricao: 'Sistema de detecção laser fora de operação - bypass ativo',
      tempo: '30min',
      status: 'BYPASS_ATIVO'
    }
  ]
};

const Dashboard: React.FC<DashboardProps> = () => {
  // Estado para controle da página atual
  const [currentPage, setCurrentPage] = React.useState('overview');
  
  // Estados para filtros
  const [selectedEquipamento, setSelectedEquipamento] = React.useState('todos');
  const [selectedCategoria, setSelectedCategoria] = React.useState('todas');

  // Páginas disponíveis
  const pages = [
    { id: 'overview', name: 'Visão Geral', icon: CheckCircleIcon },
    { id: 'details', name: 'Análise Detalhada', icon: ExclamationTriangleIcon }
  ];

  // Opções de filtro
  const equipamentos = ['todos', 'Enchimento', 'Esvaziamento', 'Porta Montante', 'Porta Jusante', 'Sala Comando', 'Esgoto e Drenagem'];
  const categorias = ['todas', 'ELÉTRICA', 'MECÂNICA', 'COMUNICAÇÃO', 'SENSOR', 'INSTRUMENTAÇÃO'];

  // Função para filtrar falhas
  const falhasFiltradas = mockAnalyticsData.falhasDetalhadas.filter(falha => {
    const equipamentoMatch = selectedEquipamento === 'todos' || falha.equipamento.includes(selectedEquipamento);
    const categoriaMatch = selectedCategoria === 'todas' || Math.random() > 0.5; // Simulação - em produção usar categoria real
    return equipamentoMatch && categoriaMatch;
  });

  // Função para filtrar categorias
  const categoriasFiltradas = mockAnalyticsData.categorias.filter(categoria => {
    return selectedCategoria === 'todas' || categoria.nome === selectedCategoria;
  });

  // Componente: Indicadores de Performance Modernos
  const ModernPerformanceChart = ({ title }: { title: string }) => {
    // Dados de performance com cores EDP
    const performanceData = [
      { nome: 'Disponibilidade', valor: mockAnalyticsData.kpis.disponibilidade, meta: 95, cor: '#212E3E' },
      { nome: 'Eficiência', valor: 75, meta: 80, cor: '#976FF3' },
      { nome: 'Confiabilidade', valor: 68, meta: 75, cor: '#6CF577' },
      { nome: 'Manutenibilidade', valor: 82, meta: 85, cor: '#739397' }
    ];

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg overflow-hidden h-full">
        <div className="p-4 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 font-mulish">{title}</h3>
          
          <div className="grid grid-cols-2 gap-6 flex-1">
            {performanceData.map((item, index) => (
              <div key={index} className="flex flex-col justify-center items-center p-3">
                {/* Valor principal grande */}
                <div className="text-4xl font-bold mb-2 font-mulish" style={{ color: item.cor }}>
                  {item.valor}%
                </div>
                
                {/* Nome do indicador */}
                <div className="text-sm font-medium text-gray-700 mb-3 text-center">
                  {item.nome}
                </div>
                
                {/* Barra de progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${(item.valor / 100) * 100}%`,
                      backgroundColor: item.cor 
                    }}
                  />
                </div>
                
                {/* Meta vs Atual */}
                <div className="text-xs text-gray-500 text-center">
                  Meta: {item.meta}% | {item.valor >= item.meta ? 
                    <span className="text-green-600 font-medium">✓ Atingida</span> : 
                    <span className="text-red-600 font-medium">⚠ Abaixo</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Componente: Gráfico de Barras Moderno
  const ModernBarChart = ({ data, title }: { data: Array<{nome: string; falhas: number; percentual: number}>; title: string }) => {
    // Função para cor por quantidade (cores EDP)
    const getColorByValue = (value: number) => {
      if (value >= 40) return '#212E3E'; // Azul escuro EDP - Alto
      if (value >= 30) return '#976FF3'; // Roxo EDP - Médio-Alto  
      if (value >= 20) return '#6CF577'; // Verde EDP - Médio
      if (value >= 10) return '#739397'; // Cinza EDP - Baixo-Médio
      return '#3B3FBF'; // Azul royal EDP - Baixo
    };
    
    // Preparar dados para Recharts
    const chartData = data.map((item, index) => ({
      nome: item.nome.length > 10 ? item.nome.substring(0, 10) + '..' : item.nome,
      nomeCompleto: item.nome,
      falhas: item.falhas,
      fill: getColorByValue(item.falhas)
    }));

    // Componente para labels nas barras
    const renderCustomizedLabel = (props: any) => {
      const { x, y, width, value } = props;
      return (
        <text 
          x={x + width / 2} 
          y={y - 5} 
          fill="#212E3E" 
          textAnchor="middle" 
          fontSize="12" 
          fontWeight="600"
          fontFamily="mulish"
        >
          {value}
        </text>
      );
    };

    // Tooltip customizado
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="font-medium text-gray-800">{data.payload.nomeCompleto}</p>
            <p className="text-sm text-gray-600">
              Falhas: <span className="font-bold">{data.value}</span>
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg overflow-hidden h-full">
        <div className="p-4 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 font-mulish">{title}</h3>
          
          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 25, right: 15, left: 15, bottom: 2 }} barCategoryGap="8%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                
                {/* Linhas de referência modernas */}
                <ReferenceLine y={40} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "40", position: "insideTopRight", fill: "#64748b", fontSize: 10 }} />
                <ReferenceLine y={30} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "30", position: "insideTopRight", fill: "#64748b", fontSize: 10 }} />
                <ReferenceLine y={20} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "20", position: "insideTopRight", fill: "#64748b", fontSize: 10 }} />
                <ReferenceLine y={10} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "10", position: "insideTopRight", fill: "#64748b", fontSize: 10 }} />
                
                <XAxis 
                  dataKey="nome" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                  angle={0}
                  textAnchor="middle"
                  height={25}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={25}
                  domain={[0, 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Bar 
                  dataKey="falhas" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  label={renderCustomizedLabel}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Componente: Gráfico de Linha Moderno com Recharts
  const TrendChart = ({ data, title }: { data: Array<{hora: string; falhas: number; resolvidas: number}>; title: string }) => {
    
    // Preparar dados para Recharts
    const chartData = data.map(item => ({
      hora: item.hora,
      Falhas: item.falhas,
      Resolvidas: item.resolvidas
    }));

    // Tooltip customizado em português
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="font-medium text-gray-800 mb-1">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: <span className="font-bold">{entry.value}</span>
              </p>
            ))}
          </div>
        );
      }
      return null;
    };
    
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg overflow-hidden h-full">
        <div className="p-3 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 font-mulish">{title}</h3>
          
          {/* Gráfico Recharts ocupando TODO o card com GRADIENTES */}
          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                {/* Definições para gradientes das áreas */}
                <defs>
                  {/* Gradiente para área de Falhas - Verde EDP bem clarinho */}
                  <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6CF577" stopOpacity={0.6}/>
                    <stop offset="50%" stopColor="#6CF577" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6CF577" stopOpacity={0.05}/>
                  </linearGradient>
                  
                  {/* Gradiente para área de Resolvidas - Azul Escuro EDP bem clarinho */}
                  <linearGradient id="colorResolvidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B3FBF" stopOpacity={0.6}/>
                    <stop offset="50%" stopColor="#3B3FBF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B3FBF" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                <XAxis 
                  dataKey="hora" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* LINHAS DE REFERÊNCIA HORIZONTAIS */}
                <ReferenceLine y={12} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "12", position: "insideTopRight", fill: "#64748b", fontSize: 12 }} />
                <ReferenceLine y={9} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "9", position: "insideTopRight", fill: "#64748b", fontSize: 12 }} />
                <ReferenceLine y={6} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "6", position: "insideTopRight", fill: "#64748b", fontSize: 12 }} />
                <ReferenceLine y={3} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} label={{ value: "3", position: "insideTopRight", fill: "#64748b", fontSize: 12 }} />
                
                {/* Área com gradiente para Falhas - Verde EDP */}
                <Area 
                  type="monotone" 
                  dataKey="Falhas" 
                  stroke="#6CF577" 
                  strokeWidth={3}
                  fill="url(#colorFalhas)"
                  dot={{ fill: '#6CF577', strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 5, stroke: '#6CF577', strokeWidth: 2, fill: '#ffffff' }}
                  animationDuration={1200}
                />
                
                {/* Área com gradiente para Resolvidas - Azul Escuro EDP */}
                <Area 
                  type="monotone" 
                  dataKey="Resolvidas" 
                  stroke="#3B3FBF" 
                  strokeWidth={3}
                  fill="url(#colorResolvidas)"
                  dot={{ fill: '#3B3FBF', strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 5, stroke: '#3B3FBF', strokeWidth: 2, fill: '#ffffff' }}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Componente: Gráfico de Pizza Moderno com Recharts
  const DonutChart = ({ data, title }: { data: Array<{nome: string; valor: number; percentual: number; cor: string}>; title: string }) => {
    const totalValue = data.reduce((acc, item) => acc + item.valor, 0);
    
    // Cores padrão EDP
    const edpColors = ['#976FF3', '#6CF577', '#3B3FBF', '#739397'];
    
    // Preparar dados para Recharts com cores EDP
    const chartData = data.map((item, index) => ({
      name: item.nome,
      value: item.valor,
      fill: edpColors[index % edpColors.length],
      percentage: item.percentual
    }));

    // Tooltip customizado em português
    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="font-medium text-gray-800">{data.name}</p>
            <p className="text-sm text-gray-600">
              Falhas: <span className="font-bold">{data.value}</span>
            </p>
            <p className="text-sm text-gray-600">
              Percentagem: <span className="font-bold">{data.payload.percentage}%</span>
            </p>
          </div>
        );
      }
      return null;
    };
    
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg overflow-hidden h-full">
        <div className="p-3 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 font-mulish">{title}</h3>
          
          {/* Layout que ocupa TODO o card */}
          <div className="flex-1 flex items-stretch gap-3">
            {/* Gráfico GRANDE ocupando mais espaço */}
            <div className="w-72 h-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={130}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill}
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-gray-800 text-4xl font-bold"
                  >
                    {totalValue}
                  </text>
                  <text 
                    x="50%" 
                    y="50%" 
                    dy={25}
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-gray-500 text-sm font-medium"
                  >
                    Total de Falhas
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda ocupando o resto do espaço */}
            <div className="flex-1 flex flex-col justify-center space-y-3">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100 hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-5 h-5 rounded-full shadow-sm border border-white" 
                      style={{ backgroundColor: item.fill }}
                    ></div>
                    <span className="text-base font-medium text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-gray-800">{item.value}</span>
                    <span className="text-sm text-gray-500">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Navegação por Abas + Filtros */}
      <div className="flex-shrink-0 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Abas */}
            <nav className="-mb-px flex space-x-8">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPage(page.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    currentPage === page.id
                      ? 'border-[#28FF52] text-[#212E3E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <page.icon className="w-5 h-5" />
                  {page.name}
                </button>
              ))}
            </nav>

            {/* Filtros Modernos - só aparecem na página de análise */}
            {currentPage === 'details' && (
              <div className="flex items-center gap-6 pb-4">
                {/* Filtro por Equipamento */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 font-mulish min-w-[80px]">Equipamento</span>
                  <select
                    value={selectedEquipamento}
                    onChange={(e) => setSelectedEquipamento(e.target.value)}
                    className="text-sm border-0 bg-gray-50 rounded-xl px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#212E3E] transition-all font-mulish min-w-[140px] shadow-sm"
                  >
                    {equipamentos.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq === 'todos' ? 'Todos Equipamentos' : eq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Categoria */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 font-mulish min-w-[70px]">Categoria</span>
                  <select
                    value={selectedCategoria}
                    onChange={(e) => setSelectedCategoria(e.target.value)}
                    className="text-sm border-0 bg-gray-50 rounded-xl px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#212E3E] transition-all font-mulish min-w-[140px] shadow-sm"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'todas' ? 'Todas Categorias' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indicador de filtros ativos */}
                {(selectedEquipamento !== 'todos' || selectedCategoria !== 'todas') && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#212E3E] rounded-lg">
                    <span className="text-xs font-medium text-white font-mulish">Filtros ativos</span>
                    <button 
                      onClick={() => {
                        setSelectedEquipamento('todos');
                        setSelectedCategoria('todas');
                      }}
                      className="text-xs text-white hover:text-gray-300 font-mulish"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Container principal com scroll */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {currentPage === 'overview' ? (
            // PÁGINA 1: VISÃO GERAL - KPIs + Gráficos Principais + Gauges
            <div className="space-y-6">

              {/* KPIs Principais - Cards EDP Organizados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
                
                {/* Falhas Ativas */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 ">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 font-mulish">{mockAnalyticsData.kpis.falhasAtivas}</div>
                      <div className="text-sm text-gray-600 font-mulish">Falhas Ativas</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">CRÍTICO</span>
                      <div className="flex items-center text-red-600">
                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                        <span className="text-xs font-medium">+12%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolvidas Hoje */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 ">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 font-mulish">{mockAnalyticsData.kpis.falhasResolvidasHoje}</div>
                      <div className="text-sm text-gray-600 font-mulish">Resolvidas Hoje</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">ÓTIMO</span>
                      <div className="flex items-center text-green-600">
                        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                        <span className="text-xs font-medium">-8%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MTTR */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 ">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 font-mulish">{mockAnalyticsData.kpis.mttr}<span className="text-lg text-gray-500">min</span></div>
                      <div className="text-sm text-gray-600 font-mulish">Tempo Médio Reparo</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">MTTR</span>
                      <div className="flex items-center text-green-600">
                        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                        <span className="text-xs font-medium">-5min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disponibilidade */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 ">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 font-mulish">{mockAnalyticsData.kpis.disponibilidade}<span className="text-lg text-gray-500">%</span></div>
                      <div className="text-sm text-gray-600 font-mulish">Disponibilidade</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">SLA</span>
                      <div className="flex items-center text-green-600">
                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                        <span className="text-xs font-medium">+0.3%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Gráficos Principais */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Gráfico de Tendências 24h */}
                <TrendChart 
                  data={mockAnalyticsData.tendencias24h} 
                  title="Tendências nas Últimas 24h" 
                />

                {/* Gráfico de Severidades */}
                <DonutChart 
                  data={mockAnalyticsData.severidades} 
                  title="Distribuição por Severidade" 
                />

              </div>

              {/* Segunda Linha de Gráficos */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Equipamentos com Mais Falhas */}
                <ModernBarChart 
                  data={mockAnalyticsData.topEquipamentos} 
                  title="Equipamentos com Mais Falhas" 
                />

                {/* Indicadores de Performance Modernos */}
                <ModernPerformanceChart title="Indicadores de Performance" />

              </div>

            </div>
          ) : (
            // PÁGINA 2: ANÁLISE DETALHADA - Tabela Moderna
            <div className="space-y-6">

              {/* Stats Rápidos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-lg drop-shadow-lg text-center">
                  <div className="text-3xl font-bold text-gray-900 font-mulish">{falhasFiltradas.length}</div>
                  <div className="text-sm text-gray-600 font-mulish">Total</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg drop-shadow-lg text-center">
                  <div className="text-3xl font-bold text-red-600 font-mulish">{falhasFiltradas.filter(f => f.severidade === 'CRITICAL').length}</div>
                  <div className="text-sm text-gray-600 font-mulish">Críticas</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg drop-shadow-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600 font-mulish">{falhasFiltradas.filter(f => f.status === 'EM_INVESTIGACAO').length}</div>
                  <div className="text-sm text-gray-600 font-mulish">Investigação</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg drop-shadow-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 font-mulish">{falhasFiltradas.filter(f => f.status === 'MONITORANDO').length}</div>
                  <div className="text-sm text-gray-600 font-mulish">Monitorando</div>
                </div>
              </div>

              {/* Tabela Moderna de Falhas */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-lg drop-shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">ID</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Equipamento</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Severidade</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Título</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Descrição</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Tempo</th>
                        <th className="text-left p-4 bg-gray-50 text-sm font-semibold text-gray-700 font-mulish">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {falhasFiltradas.map((falha, index) => (
                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                          <td className="p-4">
                            <div className="text-sm font-bold text-[#212E3E] font-mulish">{falha.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-[#212E3E] rounded-full"></div>
                              <span className="text-sm font-medium text-gray-900 font-mulish">{falha.equipamento}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              falha.severidade === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              falha.severidade === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              falha.severidade === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {falha.severidade}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-medium text-gray-900 font-mulish max-w-xs">{falha.titulo}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-gray-600 font-mulish max-w-md">{falha.descricao}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-medium text-gray-700 font-mulish">{falha.tempo}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              falha.status === 'ATIVA' ? 'bg-red-100 text-red-800' :
                              falha.status === 'EM_INVESTIGACAO' ? 'bg-yellow-100 text-yellow-800' :
                              falha.status === 'MONITORANDO' ? 'bg-blue-100 text-blue-800' :
                              falha.status === 'PENDENTE' ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {falha.status === 'EM_INVESTIGACAO' ? 'INVESTIGANDO' : falha.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Footer da tabela */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-600 font-mulish">
                    Mostrando {falhasFiltradas.length} falhas de {mockAnalyticsData.falhasDetalhadas.length} total
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-mulish">
                      Anterior
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-mulish">
                      Próximo
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;