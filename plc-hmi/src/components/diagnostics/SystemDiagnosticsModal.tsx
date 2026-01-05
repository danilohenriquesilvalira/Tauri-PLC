import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import {
    X,
    Activity,
    Gauge,
    Wifi,
    Server,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    HardDrive,
    Network,
    Settings2
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface BackpressureMetrics {
    state: string;                  // Nome do estado (Normal, Sampling, Expanded, Recovering)
    current_capacity: number;       // Capacidade atual do buffer
    current_usage: number;          // Uso atual do buffer
    usage_percentage: number;       // Porcentagem de uso (0-100)
    messages_processed: number;     // Total de mensagens processadas
    messages_dropped: number;       // Total de mensagens descartadas
    messages_sampled: number;       // Total de mensagens amostradas
    auto_expansions: number;        // Quantidade de expansões automáticas
    auto_recoveries: number;        // Quantidade de recuperações automáticas
    last_state_change: number;      // Timestamp da última mudança de estado
    sampling_rate: number;          // Taxa de sampling atual (0.0-1.0)
}

interface MultiPlcDiagnostics {
    total_plcs_connected: number;
    plc_tag_counts: Record<string, number>;
    websocket_single_server: boolean;
    tcp_single_server: boolean;
    architecture_status: string;
    scalability_notes: string[];
}

interface SystemMemoryStats {
    tcp_buffer_pool_active: number;
    tcp_connected_clients: number;
    tcp_data_cache_size: number;
    ws_tag_cache_size: number;
    ws_tag_cache_usage_pct: number;
    ws_mappings_cache_size: number;
    ws_change_tracking_size: number;
    ws_connected_clients: number;
    total_estimated_memory_kb: number;
    memory_health_status: string;
    last_cleanup_seconds_ago: number;
}

interface Props {
    isVisible: boolean;
    onClose: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const SystemDiagnosticsModal: React.FC<Props> = ({ isVisible, onClose }) => {
    const [activeTab, setActiveTab] = useState<'backpressure' | 'plc' | 'memory'>('backpressure');
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Estados dos dados
    const [backpressure, setBackpressure] = useState<BackpressureMetrics | null>(null);
    const [plcDiagnostics, setPlcDiagnostics] = useState<MultiPlcDiagnostics | null>(null);
    const [memoryStats, setMemoryStats] = useState<SystemMemoryStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ========================================================================
    // FUNÇÕES DE CARREGAMENTO
    // ========================================================================

    const loadBackpressureMetrics = useCallback(async () => {
        try {
            const data = await invoke<BackpressureMetrics>('get_backpressure_metrics');
            setBackpressure(data);
            setError(null);
        } catch (err) {
            console.error('Erro ao carregar backpressure:', err);
            setError('WebSocket não está rodando');
        }
    }, []);

    const loadPlcDiagnostics = useCallback(async () => {
        try {
            const data = await invoke<MultiPlcDiagnostics>('get_multi_plc_diagnostics');
            setPlcDiagnostics(data);
            setError(null);
        } catch (err) {
            console.error('Erro ao carregar diagnóstico PLC:', err);
            setError('Erro ao carregar diagnóstico de PLCs');
        }
    }, []);

    const loadMemoryStats = useCallback(async () => {
        try {
            const data = await invoke<SystemMemoryStats>('get_system_memory_stats');
            setMemoryStats(data);
            setError(null);
        } catch (err) {
            console.error('Erro ao carregar stats de memória:', err);
            setError('Erro ao carregar estatísticas de memória');
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadBackpressureMetrics(),
            loadPlcDiagnostics(),
            loadMemoryStats()
        ]);
        setLoading(false);
    }, [loadBackpressureMetrics, loadPlcDiagnostics, loadMemoryStats]);

    // Carregar dados quando modal abre
    useEffect(() => {
        if (isVisible) {
            loadAllData();
        }
    }, [isVisible, loadAllData]);

    // Auto-refresh
    useEffect(() => {
        if (isVisible && autoRefresh) {
            const interval = setInterval(loadAllData, 2000);
            return () => clearInterval(interval);
        }
    }, [isVisible, autoRefresh, loadAllData]);

    if (!isVisible) return null;

    // ========================================================================
    // COMPONENTES AUXILIARES
    // ========================================================================

    const getStateColor = (state: string) => {
        switch (state?.toLowerCase()) {
            case 'normal': return 'text-green-600 bg-green-100';
            case 'sampling': return 'text-yellow-600 bg-yellow-100';
            case 'expanded': return 'text-orange-600 bg-orange-100';
            case 'recovering': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStateIcon = (state: string) => {
        switch (state?.toLowerCase()) {
            case 'normal': return <CheckCircle className="w-4 h-4" />;
            case 'sampling': return <TrendingDown className="w-4 h-4" />;
            case 'expanded': return <TrendingUp className="w-4 h-4" />;
            case 'recovering': return <RefreshCw className="w-4 h-4" />;
            default: return <Minus className="w-4 h-4" />;
        }
    };

    const formatNumber = (num: number | undefined | null): string => {
        if (num === undefined || num === null) return '—';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    // ========================================================================
    // TAB: BACKPRESSURE
    // ========================================================================

    const BackpressureTab = () => (
        <div className="space-y-6">
            {/* Estado Atual */}
            <div className="bg-gradient-to-r from-edp-marine/5 to-transparent rounded-xl p-6 border border-edp-marine/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-edp-marine rounded-lg flex items-center justify-center">
                            <Gauge className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-edp-marine">Sistema de Backpressure Adaptativo</h3>
                            <p className="text-sm text-edp-slate">Auto-ajuste de capacidade do buffer</p>
                        </div>
                    </div>
                    {backpressure && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStateColor(backpressure.state)}`}>
                            {getStateIcon(backpressure.state)}
                            <span className="font-medium text-sm capitalize">{backpressure.state}</span>
                        </div>
                    )}
                </div>

                {backpressure ? (
                    <>
                        {/* Barra de Progresso */}
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-edp-slate">Uso do Buffer</span>
                                <span className="font-mono font-medium text-edp-marine">
                                    {backpressure.current_usage ?? 0} / {backpressure.current_capacity ?? 0}
                                </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${
                                        (backpressure.usage_percentage ?? 0) > 85 ? 'bg-red-500' :
                                        (backpressure.usage_percentage ?? 0) > 70 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(backpressure.usage_percentage ?? 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-edp-slate mt-1">
                                <span>0%</span>
                                <span className="font-medium">{(backpressure.usage_percentage ?? 0).toFixed(1)}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Métricas em Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <div className="text-2xl font-bold text-edp-marine">{formatNumber(backpressure.messages_processed)}</div>
                                <div className="text-xs text-edp-slate mt-1">Processadas</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <div className="text-2xl font-bold text-yellow-600">{formatNumber(backpressure.messages_sampled)}</div>
                                <div className="text-xs text-edp-slate mt-1">Amostradas</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <div className="text-2xl font-bold text-red-600">{formatNumber(backpressure.messages_dropped)}</div>
                                <div className="text-xs text-edp-slate mt-1">Descartadas</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-edp-slate">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <p>WebSocket não está rodando</p>
                    </div>
                )}
            </div>

            {/* Ajustes Automáticos */}
            {backpressure && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-edp-marine/10">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-edp-marine">Expansões</span>
                        </div>
                        <div className="text-3xl font-bold text-edp-marine">{backpressure.auto_expansions ?? 0}</div>
                        <p className="text-xs text-edp-slate mt-1">Buffer expandido automaticamente</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-edp-marine/10">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingDown className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-edp-marine">Recuperações</span>
                        </div>
                        <div className="text-3xl font-bold text-edp-marine">{backpressure.auto_recoveries ?? 0}</div>
                        <p className="text-xs text-edp-slate mt-1">Sistema recuperado automaticamente</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ========================================================================
    // TAB: PLC DIAGNOSTICS
    // ========================================================================

    const PlcTab = () => (
        <div className="space-y-6">
            {/* Arquitetura */}
            <div className="bg-gradient-to-r from-edp-marine/5 to-transparent rounded-xl p-6 border border-edp-marine/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-edp-marine rounded-lg flex items-center justify-center">
                        <Network className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-edp-marine">Arquitetura Multi-PLC</h3>
                        <p className="text-sm text-edp-slate">Configuração de servidores e conexões</p>
                    </div>
                </div>

                {plcDiagnostics ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Server className={`w-4 h-4 ${plcDiagnostics.tcp_single_server ? 'text-green-600' : 'text-red-600'}`} />
                                <span className="text-sm font-medium text-edp-marine">TCP Server</span>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded inline-block ${plcDiagnostics.tcp_single_server ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {plcDiagnostics.tcp_single_server ? '✓ Servidor Único' : '✗ Não configurado'}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Wifi className={`w-4 h-4 ${plcDiagnostics.websocket_single_server ? 'text-green-600' : 'text-red-600'}`} />
                                <span className="text-sm font-medium text-edp-marine">WebSocket Server</span>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded inline-block ${plcDiagnostics.websocket_single_server ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {plcDiagnostics.websocket_single_server ? '✓ Servidor Único' : '✗ Não configurado'}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-edp-slate">Carregando...</div>
                )}
            </div>

            {/* PLCs Conectados */}
            {plcDiagnostics && (
                <div className="bg-white rounded-xl border border-edp-marine/10 overflow-hidden">
                    <div className="px-5 py-4 border-b border-edp-marine/10 flex items-center justify-between">
                        <h3 className="font-semibold text-edp-marine">PLCs Conectados</h3>
                        <span className="text-sm font-mono bg-edp-marine/10 px-2 py-1 rounded text-edp-marine">
                            {plcDiagnostics.total_plcs_connected} PLCs
                        </span>
                    </div>
                    
                    {Object.keys(plcDiagnostics.plc_tag_counts).length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {Object.entries(plcDiagnostics.plc_tag_counts).map(([ip, count]) => (
                                <div key={ip} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="font-mono text-sm text-edp-marine">{ip}</span>
                                    </div>
                                    <span className="text-sm text-edp-slate">{count} tags</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-5 py-8 text-center text-edp-slate">
                            <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhum PLC conectado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Notas de Escalabilidade */}
            {plcDiagnostics && plcDiagnostics.scalability_notes.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Notas de Arquitetura
                    </h4>
                    <ul className="space-y-2">
                        {plcDiagnostics.scalability_notes.map((note, idx) => (
                            <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                                <span className="mt-1">•</span>
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    // ========================================================================
    // TAB: MEMORY
    // ========================================================================

    const MemoryTab = () => (
        <div className="space-y-6">
            {/* Visão Geral */}
            <div className="bg-gradient-to-r from-edp-marine/5 to-transparent rounded-xl p-6 border border-edp-marine/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-edp-marine rounded-lg flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-edp-marine">Uso de Memória</h3>
                            <p className="text-sm text-edp-slate">Monitoramento em tempo real</p>
                        </div>
                    </div>
                    {memoryStats && (
                        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            memoryStats.memory_health_status === 'healthy' ? 'bg-green-100 text-green-700' :
                            memoryStats.memory_health_status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {memoryStats.memory_health_status === 'healthy' ? '✓ Saudável' :
                             memoryStats.memory_health_status === 'warning' ? '⚠ Atenção' : '✗ Crítico'}
                        </div>
                    )}
                </div>

                {memoryStats ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="text-3xl font-bold text-edp-marine">
                                {((memoryStats.total_estimated_memory_kb ?? 0) / 1024).toFixed(1)} MB
                            </div>
                            <div className="text-xs text-edp-slate mt-1">Memória Total Estimada</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="text-3xl font-bold text-edp-marine">
                                {memoryStats.last_cleanup_seconds_ago ?? 0}s
                            </div>
                            <div className="text-xs text-edp-slate mt-1">Desde última limpeza</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-edp-slate">Carregando...</div>
                )}
            </div>

            {/* Detalhes por Componente */}
            {memoryStats && (
                <div className="grid grid-cols-2 gap-4">
                    {/* TCP Server */}
                    <div className="bg-white rounded-xl p-5 border border-edp-marine/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Server className="w-5 h-5 text-edp-marine" />
                            <span className="font-semibold text-edp-marine">TCP Server</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Buffer Pool Ativo</span>
                                <span className="font-mono text-edp-marine">{memoryStats.tcp_buffer_pool_active ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Clientes Conectados</span>
                                <span className="font-mono text-edp-marine">{memoryStats.tcp_connected_clients ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Cache de Dados</span>
                                <span className="font-mono text-edp-marine">{memoryStats.tcp_data_cache_size ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* WebSocket Server */}
                    <div className="bg-white rounded-xl p-5 border border-edp-marine/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Wifi className="w-5 h-5 text-edp-marine" />
                            <span className="font-semibold text-edp-marine">WebSocket Server</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Cache de Tags</span>
                                <span className="font-mono text-edp-marine">{memoryStats.ws_tag_cache_size ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Uso do Cache</span>
                                <span className="font-mono text-edp-marine">{(memoryStats.ws_tag_cache_usage_pct ?? 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-edp-slate">Clientes WebSocket</span>
                                <span className="font-mono text-edp-marine">{memoryStats.ws_connected_clients ?? 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ========================================================================
    // RENDER PRINCIPAL
    // ========================================================================

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-edp-marine px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Diagnóstico do Sistema</h2>
                            <p className="text-sm text-white/70">Monitoramento avançado de performance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Auto Refresh Toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                autoRefresh 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-white/10 text-white/60'
                            }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                            <span>{autoRefresh ? 'Auto' : 'Parado'}</span>
                        </button>
                        
                        {/* Manual Refresh */}
                        <button
                            onClick={loadAllData}
                            disabled={loading}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        
                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('backpressure')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'backpressure'
                                    ? 'border-edp-marine text-edp-marine bg-white'
                                    : 'border-transparent text-edp-slate hover:text-edp-marine'
                            }`}
                        >
                            <Gauge className="w-4 h-4" />
                            Backpressure
                        </button>
                        <button
                            onClick={() => setActiveTab('plc')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'plc'
                                    ? 'border-edp-marine text-edp-marine bg-white'
                                    : 'border-transparent text-edp-slate hover:text-edp-marine'
                            }`}
                        >
                            <Network className="w-4 h-4" />
                            Multi-PLC
                        </button>
                        <button
                            onClick={() => setActiveTab('memory')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'memory'
                                    ? 'border-edp-marine text-edp-marine bg-white'
                                    : 'border-transparent text-edp-slate hover:text-edp-marine'
                            }`}
                        >
                            <HardDrive className="w-4 h-4" />
                            Memória
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                    {error && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm text-yellow-800">{error}</span>
                        </div>
                    )}
                    
                    {activeTab === 'backpressure' && <BackpressureTab />}
                    {activeTab === 'plc' && <PlcTab />}
                    {activeTab === 'memory' && <MemoryTab />}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SystemDiagnosticsModal;
