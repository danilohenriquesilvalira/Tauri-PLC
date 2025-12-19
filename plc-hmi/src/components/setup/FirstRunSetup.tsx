import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Sparkles, 
  Database, 
  Server, 
  Wifi, 
  FolderOpen, 
  Check, 
  ArrowRight,
  Settings
} from 'lucide-react';

interface AppConfig {
  database_path: string;
  first_run_completed: boolean;
  tcp_port: number;
  websocket_port: number;
  created_at: number;
  updated_at: number;
}

interface SetupModalProps {
  onComplete: () => void;
}

export const FirstRunSetup: React.FC<SetupModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'config' | 'validation' | 'complete'>('welcome');
  const [dbPath, setDbPath] = useState('');
  const [tcpPort, setTcpPort] = useState(8502);
  const [wsPort, setWsPort] = useState(8765);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadDefaultPath();
  }, []);

  const loadDefaultPath = async () => {
    try {
      const defaultPath = await invoke<string>('get_default_db_path');
      setDbPath(defaultPath);
    } catch (err) {
      console.error('Erro ao carregar caminho padrão:', err);
    }
  };

  const handleBrowsePath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: dbPath,
        title: 'Selecione o diretório para o banco de dados'
      });

      if (selected && typeof selected === 'string') {
        // Adiciona o nome do arquivo ao caminho da pasta selecionada
        const fullPath = selected.endsWith('\\') ? selected + 'plc_hmi.db' : selected + '\\plc_hmi.db';
        setDbPath(fullPath);
      }
    } catch (err) {
      console.error('Erro ao selecionar caminho:', err);
      setError(`Erro ao abrir seletor: ${err}`);
    }
  };

  const validateAndSave = async () => {
    setValidating(true);
    setError('');

    try {
      // Validar caminho do banco
      await invoke('validate_db_path', { path: dbPath });

      // Salvar configuração
      await invoke('save_initial_config', {
        databasePath: dbPath,
        tcpPort: tcpPort,
        websocketPort: wsPort
      });

      setStep('complete');
      
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      setError(err || 'Erro ao salvar configuração');
    } finally {
      setValidating(false);
    }
  };

  // Welcome Screen
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1a2332] via-[#212E3E] to-[#2a3f52]">
        <div className="text-center px-8 animate-fade-in">
          {/* Logo Animado */}
          <div className="mb-8 relative">
            <img 
              src="/src/assets/Logo_Danilo.svg" 
              alt="DH System" 
              className="w-48 h-48 mx-auto relative z-10 animate-float drop-shadow-2xl"
            />
          </div>

          {/* Título */}
          <h1 className="text-5xl font-bold text-white mb-4 animate-slide-up">
            Bem-vindo ao <span className="text-[#28FF52]">DH Industrial System</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 animate-slide-up animation-delay-200">
            Sistema Profissional de Monitoramento e Controle Industrial
          </p>

          {/* Botão Iniciar */}
          <button
            onClick={() => setStep('config')}
            className="group relative px-8 py-4 bg-[#28FF52] hover:bg-[#20d944] text-[#212E3E] font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-[#28FF52]/50 animate-slide-up animation-delay-400"
          >
            <span className="flex items-center gap-3">
              <Sparkles size={24} />
              Começar Configuração
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </span>
          </button>

          {/* Versão */}
          <p className="mt-8 text-sm text-gray-500 animate-fade-in animation-delay-600">
            Versão 1.0.0 • Desenvolvido para EDP
          </p>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-fade-in { animation: fade-in 1s ease-out; }
          .animate-slide-up { animation: slide-up 0.8s ease-out; }
          .animate-float { animation: float 3s ease-in-out infinite; }
          .animation-delay-200 { animation-delay: 0.2s; }
          .animation-delay-400 { animation-delay: 0.4s; }
          .animation-delay-600 { animation-delay: 0.6s; }
        `}</style>
      </div>
    );
  }

  // Configuration Screen
  if (step === 'config') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-slide-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#212E3E] to-[#2a3f52] p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#28FF52] rounded-xl flex items-center justify-center">
                <Settings size={24} className="text-[#212E3E]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Configuração Inicial</h2>
                <p className="text-sm text-gray-300">Configure os caminhos e portas do sistema</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            
            {/* Database Path */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212E3E] mb-3">
                <Database size={16} className="text-[#28FF52]" />
                Local do Banco de Dados SQLite
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dbPath}
                  onChange={(e) => setDbPath(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#28FF52] focus:outline-none transition-colors"
                  placeholder="C:\Users\...\plc_hmi.db"
                />
                <button
                  onClick={handleBrowsePath}
                  className="px-4 py-3 bg-[#212E3E] hover:bg-[#2a3f52] text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <FolderOpen size={18} />
                  Procurar
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                O banco de dados armazena configurações de PLCs, tags e histórico
              </p>
            </div>

            {/* TCP Port */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212E3E] mb-3">
                <Server size={16} className="text-[#28FF52]" />
                Porta TCP Server (Comunicação PLC)
              </label>
              <input
                type="number"
                value={tcpPort}
                onChange={(e) => setTcpPort(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#28FF52] focus:outline-none transition-colors"
                min={1024}
                max={65535}
              />
              <p className="mt-2 text-xs text-gray-500">
                Porta para receber dados dos PLCs Siemens (padrão: 8502)
              </p>
            </div>

            {/* WebSocket Port */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212E3E] mb-3">
                <Wifi size={16} className="text-[#28FF52]" />
                Porta WebSocket Server (Broadcast)
              </label>
              <input
                type="number"
                value={wsPort}
                onChange={(e) => setWsPort(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#28FF52] focus:outline-none transition-colors"
                min={1024}
                max={65535}
              />
              <p className="mt-2 text-xs text-gray-500">
                Porta para transmitir dados em tempo real (padrão: 8765)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-200">
            <button
              onClick={() => setStep('welcome')}
              className="px-6 py-3 bg-[#212E3E] hover:bg-[#1a2332] text-white rounded-lg transition-colors font-medium"
              disabled={validating}
            >
              Voltar
            </button>
            <button
              onClick={validateAndSave}
              disabled={validating || !dbPath}
              className="px-6 py-3 bg-[#28FF52] hover:bg-[#20d944] text-[#212E3E] rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {validating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#212E3E]/30 border-t-[#212E3E] rounded-full animate-spin"></div>
                  Validando...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Salvar e Continuar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (step === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1a2332] via-[#212E3E] to-[#2a3f52]">
        <div className="text-center px-8 animate-fade-in">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-[#28FF52] rounded-full flex items-center justify-center animate-scale-in">
              <Check size={64} className="text-[#212E3E]" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Configuração Completa!
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Sistema pronto para uso
          </p>

          <div className="inline-flex items-center gap-2 text-[#28FF52]">
            <div className="w-2 h-2 bg-[#28FF52] rounded-full animate-pulse"></div>
            <span>Iniciando aplicação...</span>
          </div>
        </div>

        <style>{`
          @keyframes scale-in {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in { animation: scale-in 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  return null;
};
