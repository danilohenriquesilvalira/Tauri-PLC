import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Database, CheckCircle, X, Plus, Trash2, RefreshCw, List, Search, Eye, Table, Key, ChevronDown, ChevronRight, Expand, Minimize2, EyeOff } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  updated_at?: number;
}

interface PostgresConfigPanelProps {
  onClose: () => void;
}

export const PostgresConfigPanel: React.FC<PostgresConfigPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<PostgresConfig>({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
    database: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  
  // Estados para navegação
  const [activeTab, setActiveTab] = useState<'config' | 'management' | 'inspection'>('config');
  
  // Estados para gerenciamento de bancos
  const [databases, setDatabases] = useState<string[]>([]);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [databaseLoading, setDatabaseLoading] = useState(false);
  
  // Estados para inspeção de banco
  const [inspectedDatabase, setInspectedDatabase] = useState<string | null>(null);
  const [databaseInspection, setDatabaseInspection] = useState<any>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  
  // Estados para verificação rápida
  const [quickCheckDatabases, setQuickCheckDatabases] = useState<string[]>([]);
  const [showQuickCheckResults, setShowQuickCheckResults] = useState(false);
  
  // Estados para expandir/recolher colunas
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Carregar configuração salva ao abrir
    invoke<PostgresConfig | null>("load_postgres_config")
      .then((saved: PostgresConfig | null) => {
        if (saved) {
          setConfig(saved);
          addNotification({
            type: 'info',
            title: 'Configuração PostgreSQL Carregada',
            message: `Configuração existente encontrada: ${saved.user}@${saved.host}:${saved.port}/${saved.database}`
          });
        }
      })
      .catch(() => {
        addNotification({
          type: 'info',
          title: 'Nova Configuração PostgreSQL',
          message: 'Nenhuma configuração anterior encontrada. Configure uma nova conexão.'
        });
      });
  }, [addNotification]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: name === 'port' ? parseInt(value) || 5432 : value });
  };

  const handleTest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      addNotification({
        type: 'info',
        title: 'Testando Conexão PostgreSQL',
        message: `Iniciando teste de conexão com ${config.user}@${config.host}:${config.port}/${config.database}...`
      });
      
      const result = await invoke<string>("test_postgres_connection", { config });
      setMessage(result);
      
      addNotification({
        type: 'success',
        title: 'PostgreSQL Conectado',
        message: `Conexão bem-sucedida com ${config.host}:${config.port} usando usuário "${config.user}"`
      });
    } catch (e: any) {
      setMessage(e.toString());
      addNotification({
        type: 'error',
        title: 'Falha na Conexão PostgreSQL',
        message: `Não foi possível conectar em ${config.host}:${config.port} - Verifique as credenciais e se o servidor está rodando`
      });
    }
    setLoading(false);
  };

  const handleTestDefault = async () => {
    setLoading(true);
    setMessage(null);
    try {
      addNotification({
        type: 'info',
        title: 'Testando Database Padrão',
        message: `Testando conexão na database padrão 'postgres' em ${config.host}:${config.port}...`
      });
      
      // Teste na database padrão 'postgres' para evitar problemas
      const testConfig = { ...config, database: 'postgres' };
      const result = await invoke<string>("test_postgres_connection", { config: testConfig });
      setMessage(result + " (testado na database padrão 'postgres')");
      
      addNotification({
        type: 'success',
        title: 'Teste Database Padrão Sucesso',
        message: `Servidor PostgreSQL funcionando! Database padrão 'postgres' acessível em ${config.host}:${config.port}`
      });
    } catch (e: any) {
      setMessage(e.toString());
      addNotification({
        type: 'error',
        title: 'Erro na Database Padrão',
        message: `Não conseguiu acessar nem a database padrão 'postgres' - Verifique se o PostgreSQL está instalado e rodando`
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      addNotification({
        type: 'info',
        title: 'Salvando Configuração PostgreSQL',
        message: `Salvando configuração de conexão no banco local...`
      });
      
      await invoke<string>("save_postgres_config", { config: { ...config, updated_at: Date.now() } });
      setMessage("Configuração salva com sucesso!");
      
      addNotification({
        type: 'success',
        title: 'Configuração PostgreSQL Salva',
        message: `Dados de conexão salvos: ${config.user}@${config.host}:${config.port}/${config.database} - Configuração persistida no SQLite local`
      });
      
      // Fechar modal após salvar
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setMessage(e.toString());
      addNotification({
        type: 'error',
        title: 'Erro ao Salvar Configuração',
        message: `Não foi possível salvar a configuração PostgreSQL no banco local - ${e.toString()}`
      });
    }
    setLoading(false);
  };

  // Listar bancos de dados
  const loadDatabases = async () => {
    if (!config.host || !config.user || !config.password) {
      setMessage("Configure a conexão antes de gerenciar bancos");
      return;
    }
    
    setDatabaseLoading(true);
    try {
      const testConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: "postgres"
      };
      
      const dbList = await invoke<string[]>("list_postgres_databases", { config: testConfig });
      setDatabases(dbList);
      
      addNotification({
        type: 'info',
        title: 'Bancos PostgreSQL Carregados',
        message: `Encontrados ${dbList.length} bancos de dados no servidor ${config.host}:${config.port}`
      });
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro ao Listar Bancos',
        message: `Não foi possível carregar a lista de bancos: ${e.toString()}`
      });
    }
    setDatabaseLoading(false);
  };

  // Criar novo banco de dados
  const createDatabase = async () => {
    if (!newDatabaseName.trim()) {
      setMessage("Digite um nome para o banco de dados");
      return;
    }
    
    setDatabaseLoading(true);
    try {
      const testConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: "postgres"
      };
      
      await invoke<string>("create_postgres_database", { 
        config: testConfig, 
        databaseName: newDatabaseName.trim() 
      });
      
      addNotification({
        type: 'success',
        title: 'Banco de Dados Criado',
        message: `Banco '${newDatabaseName}' criado com sucesso em ${config.host}:${config.port}`
      });
      
      setNewDatabaseName("");
      await loadDatabases(); // Recarregar lista
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro ao Criar Banco',
        message: `Não foi possível criar o banco '${newDatabaseName}': ${e.toString()}`
      });
    }
    setDatabaseLoading(false);
  };

  // Excluir banco de dados
  const dropDatabase = async (databaseName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o banco '${databaseName}'? Esta ação não pode ser desfeita!`)) {
      return;
    }
    
    setDatabaseLoading(true);
    try {
      const testConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: "postgres"
      };
      
      await invoke<string>("drop_postgres_database", { 
        config: testConfig, 
        databaseName 
      });
      
      addNotification({
        type: 'success',
        title: 'Banco de Dados Excluído',
        message: `Banco '${databaseName}' excluído com sucesso de ${config.host}:${config.port}`
      });
      
      await loadDatabases(); // Recarregar lista
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro ao Excluir Banco',
        message: `Não foi possível excluir o banco '${databaseName}': ${e.toString()}`
      });
    }
    setDatabaseLoading(false);
  };

  // Verificação rápida de bancos existentes
  const handleQuickCheckDatabases = async () => {
    if (!config.host || !config.user || !config.password) {
      setMessage("Configure a conexão antes de verificar bancos");
      return;
    }
    
    setDatabaseLoading(true);
    try {
      const testConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: "postgres"
      };
      
      const dbList = await invoke<string[]>("list_postgres_databases", { config: testConfig });
      setQuickCheckDatabases(dbList);
      setShowQuickCheckResults(true);
      
      addNotification({
        type: 'success',
        title: 'Verificação Concluída',
        message: `Encontrados ${dbList.length} bancos de dados no servidor`
      });
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro na Verificação',
        message: `Não foi possível verificar os bancos: ${e.toString()}`
      });
    }
    setDatabaseLoading(false);
  };

  // Inspecionar estrutura do banco
  const inspectDatabase = async (databaseName: string) => {
    setInspectionLoading(true);
    try {
      const testConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: databaseName
      };
      
      const inspection = await invoke<any>("inspect_postgres_database", { 
        config: testConfig, 
        databaseName 
      });
      
      setDatabaseInspection(inspection);
      setInspectedDatabase(databaseName);
      setActiveTab('inspection'); // Mudar para aba de inspeção
      
      addNotification({
        type: 'success',
        title: 'Banco Inspecionado',
        message: `Estrutura do banco '${databaseName}' carregada: ${inspection.total_tables} tabelas encontradas`
      });
      
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro na Inspeção',
        message: `Não foi possível inspecionar o banco '${databaseName}': ${e.toString()}`
      });
    }
    setInspectionLoading(false);
  };

  // Selecionar banco na configuração
  const selectDatabase = (databaseName: string) => {
    setConfig({ ...config, database: databaseName });
    addNotification({
      type: 'info',
      title: 'Banco Selecionado',
      message: `Banco '${databaseName}' selecionado para a configuração`
    });
  };

  // Funções para expandir/recolher tabelas
  const toggleTableExpansion = (tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const expandAllTables = () => {
    if (databaseInspection?.tables) {
      setExpandedTables(new Set(databaseInspection.tables.map((t: any) => t.name)));
    }
  };

  const collapseAllTables = () => {
    setExpandedTables(new Set());
  };

  return (
    <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
      
      {/* Header - Padrão DH Automação */}
      <div className="bg-[#212E3E] px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#28FF52] rounded-lg flex items-center justify-center">
              <Database className="text-[#212E3E]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">PostgreSQL</h2>
              <p className="text-xs text-gray-400">Gerenciamento completo de banco de dados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegação por abas */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'config' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <CheckCircle size={16} />
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'management' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <List size={16} />
            Gerenciar Bancos
          </button>
          <button
            onClick={() => setActiveTab('inspection')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'inspection' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Search size={16} />
            Inspeção
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-4">
        
        {activeTab === 'config' && (
          <>
            {/* Informação de status */}
            <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-[#212E3E] mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#212E3E]">Configuração de Conexão</h3>
                  <p className="text-xs text-[#7C9599] mt-1">
                    Configure a conexão com o PostgreSQL para armazenamento robusto de dados.
                  </p>
                </div>
              </div>
            </div>

            {/* Campos de configuração - ALINHAMENTO PERFEITO */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-[#BECACC] p-4">
                <h3 className="text-sm font-bold text-[#212E3E] mb-4 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Dados de Conexão
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#212E3E] mb-2">Host</label>
                    <input 
                      className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                      name="host" 
                      value={config.host} 
                      onChange={handleChange} 
                      placeholder="localhost" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-[#212E3E] mb-2">Porta</label>
                      <input 
                        className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                        name="port" 
                        type="number" 
                        value={config.port} 
                        onChange={handleChange} 
                        placeholder="5432" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#212E3E] mb-2">Usuário</label>
                      <input 
                        className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                        name="user" 
                        value={config.user} 
                        onChange={handleChange} 
                        placeholder="postgres" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-[#212E3E] mb-2">Senha</label>
                    <input 
                      className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                      name="password" 
                      type="password" 
                      value={config.password} 
                      onChange={handleChange} 
                      placeholder="Sua senha" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-[#212E3E] mb-2">Database</label>
                    <input 
                      className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                      name="database" 
                      value={config.database} 
                      onChange={handleChange} 
                      placeholder="meu_banco" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <List className="w-5 h-5 text-[#212E3E]" />
                    <h3 className="text-sm font-bold text-[#212E3E]">Recursos Disponíveis</h3>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="bg-white rounded-lg border border-[#BECACC]/50 p-3">
                      <h4 className="text-xs font-bold text-[#212E3E] mb-2 flex items-center gap-1">
                        <Database size={12} />
                        Gerenciamento de Bancos
                      </h4>
                      <p className="text-xs text-[#7C9599] mb-2">
                        Acesse a aba de gerenciamento para criar e excluir bancos
                      </p>
                      <button
                        onClick={() => setActiveTab('management')}
                        className="w-full px-3 py-2 bg-[#212E3E] text-white rounded-lg hover:bg-[#1a2332] transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Database size={14} />
                        Ir para Gerenciar
                      </button>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-[#BECACC]/50 p-3">
                      <h4 className="text-xs font-bold text-[#212E3E] mb-2 flex items-center gap-1">
                        <Search size={12} />
                        Inspeção de Estrutura
                      </h4>
                      <ul className="text-xs text-[#7C9599] space-y-1">
                        <li>• Visualizar tabelas e colunas</li>
                        <li>• Identificar chaves primárias</li>
                        <li>• Contar registros por tabela</li>
                        <li>• Analisar tipos de dados</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-[#BECACC]/50 p-3">
                      <h4 className="text-xs font-bold text-[#212E3E] mb-2 flex items-center gap-1">
                        <RefreshCw size={12} />
                        Verificação Rápida
                      </h4>
                      <p className="text-xs text-[#7C9599] mb-2">
                        Confira quais bancos já existem no servidor
                      </p>
                      <button
                        onClick={handleQuickCheckDatabases}
                        disabled={databaseLoading || !config.host || !config.user}
                        className="w-full px-3 py-2 bg-[#212E3E] text-white rounded-lg hover:bg-[#1a2332] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} className={databaseLoading ? "animate-spin" : ""} />
                        {databaseLoading ? "Verificando..." : "Verificar Bancos"}
                      </button>
                      
                      {quickCheckDatabases.length > 0 && showQuickCheckResults && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-[#212E3E] font-medium">
                              Encontrados ({quickCheckDatabases.length}):
                            </div>
                            <button
                              onClick={() => setShowQuickCheckResults(false)}
                              className="p-1 text-[#7C9599] hover:text-[#212E3E] rounded transition-colors"
                              title="Recolher resultados"
                            >
                              <EyeOff size={12} />
                            </button>
                          </div>
                          <div className="bg-white rounded border border-[#BECACC]/50 p-2 max-h-20 overflow-y-auto">
                            {quickCheckDatabases.map((dbName) => (
                              <div key={dbName} className="text-xs text-[#7C9599] py-0.5 flex items-center justify-between">
                                <span>{dbName}</span>
                                {dbName === 'falhas_edp' && (
                                  <span className="bg-green-100 text-green-700 px-1 rounded text-[10px]">Encontrado!</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {quickCheckDatabases.length > 0 && !showQuickCheckResults && (
                        <button
                          onClick={() => setShowQuickCheckResults(true)}
                          className="w-full mt-3 px-3 py-2 bg-white border border-[#BECACC] text-[#212E3E] rounded-lg hover:bg-[#F1F4F4] transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Eye size={14} />
                          Mostrar Resultados ({quickCheckDatabases.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </>
        )}

        {activeTab === 'management' && (
          <>
            <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-[#212E3E] mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#212E3E]">Gerenciamento de Bancos</h3>
                  <p className="text-xs text-[#7C9599] mt-1">
                    Crie, liste e gerencie bancos de dados PostgreSQL diretamente pelo sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Criar novo banco */}
              <div className="bg-white rounded-lg border border-[#BECACC] p-4">
                <h4 className="text-sm font-bold text-[#212E3E] flex items-center gap-2 mb-4">
                  <Plus size={16} />
                  Criar Novo Banco
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#212E3E] mb-2">Nome do Banco</label>
                    <input 
                      className="w-full px-3 py-2.5 bg-white text-[#212E3E] rounded-lg border border-[#BECACC] focus:border-[#212E3E] focus:ring-2 focus:ring-[#212E3E]/20 focus:outline-none transition-all" 
                      value={newDatabaseName}
                      onChange={(e) => setNewDatabaseName(e.target.value)}
                      placeholder="nome_do_banco" 
                      disabled={databaseLoading}
                    />
                    <p className="text-xs text-[#7C9599] mt-1">
                      Apenas letras, números e underscore. Não pode começar com número.
                    </p>
                  </div>
                  
                  <button
                    onClick={createDatabase}
                    disabled={databaseLoading || !newDatabaseName.trim()}
                    className="w-full px-4 py-2.5 bg-[#212E3E] text-white rounded-lg hover:bg-[#1a2332] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {databaseLoading ? "Criando..." : "Criar Banco"}
                  </button>
                </div>
              </div>

              {/* Lista de bancos */}
              <div className="bg-white rounded-lg border border-[#BECACC] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-[#212E3E] flex items-center gap-2">
                    <List size={16} />
                    Bancos Existentes ({databases.length})
                  </h4>
                  <button
                    onClick={loadDatabases}
                    disabled={databaseLoading}
                    className="p-2 text-[#212E3E] hover:bg-[#F1F4F4] rounded-lg transition-colors"
                    title="Recarregar Lista"
                  >
                    <RefreshCw size={16} className={databaseLoading ? "animate-spin" : ""} />
                  </button>
                </div>
                
                <div className="bg-[#F1F4F4] border border-[#BECACC]/50 rounded-lg max-h-64 overflow-y-auto">
                  {databases.length === 0 ? (
                    <div className="p-4 text-center text-[#7C9599] text-sm">
                      {databaseLoading ? "Carregando..." : "Clique no botão de recarregar para listar bancos"}
                    </div>
                  ) : (
                    <div className="divide-y divide-[#BECACC]/50">
                      {databases.map((dbName) => (
                        <div key={dbName} className="p-3 flex items-center justify-between hover:bg-[#F1F4F4] transition-colors">
                          <div className="flex-1">
                            <span 
                              className={`text-sm font-medium cursor-pointer hover:text-[#212E3E] transition-colors ${
                                config.database === dbName ? 'text-[#212E3E] font-bold' : 'text-[#7C9599]'
                              }`}
                              onClick={() => selectDatabase(dbName)}
                              title="Clique para selecionar este banco"
                            >
                              {dbName}
                            </span>
                            {config.database === dbName && (
                              <div className="text-xs text-[#212E3E] font-medium">Selecionado</div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {config.database === dbName && (
                              <div className="w-2 h-2 bg-[#212E3E] rounded-full"></div>
                            )}
                            <button
                              onClick={() => inspectDatabase(dbName)}
                              disabled={inspectionLoading}
                              className="p-1 text-[#212E3E] hover:bg-[#F1F4F4] rounded transition-colors"
                              title="Inspecionar estrutura"
                            >
                              <Search size={14} />
                            </button>
                            {!["postgres", "template0", "template1"].includes(dbName) && (
                              <button
                                onClick={() => dropDatabase(dbName)}
                                disabled={databaseLoading}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Excluir banco"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'inspection' && (
          <>
            {!databaseInspection ? (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto mb-4 text-[#7C9599] opacity-50" />
                <h3 className="text-lg font-bold text-[#212E3E] mb-2">Nenhum banco inspecionado</h3>
                <p className="text-[#7C9599] mb-4">
                  Use a aba de gerenciamento para inspecionar a estrutura de um banco
                </p>
                <button
                  onClick={() => setActiveTab('management')}
                  className="px-4 py-2 bg-[#212E3E] text-white rounded-lg hover:bg-[#1a2332] transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
                >
                  <List size={16} />
                  Ir para Gerenciar Bancos
                </button>
              </div>
            ) : (
              <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#212E3E]" />
                    <h3 className="text-sm font-bold text-[#212E3E]">
                      Estrutura: {inspectedDatabase}
                    </h3>
                    <span className="bg-[#212E3E] text-white px-2 py-1 rounded text-xs font-medium">
                      {databaseInspection.total_tables} tabelas
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setDatabaseInspection(null);
                      setInspectedDatabase(null);
                    }}
                    className="p-1 text-[#7C9599] hover:text-[#212E3E] rounded transition-colors"
                    title="Limpar inspeção"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Estatísticas resumidas - SEM CORES */}
                {databaseInspection.tables.length > 0 && (
                  <div className="bg-white rounded-lg border border-[#BECACC] p-3 mb-4">
                    <h4 className="text-sm font-bold text-[#212E3E] mb-3 flex items-center gap-2">
                      <CheckCircle size={14} />
                      Resumo do Banco
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]/50">
                        <div className="text-lg font-bold text-[#212E3E]">
                          {databaseInspection.total_tables}
                        </div>
                        <div className="text-xs text-[#7C9599]">Tabelas</div>
                      </div>
                      <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]/50">
                        <div className="text-lg font-bold text-[#212E3E]">
                          {databaseInspection.tables.reduce((sum: number, table: any) => sum + table.columns.length, 0)}
                        </div>
                        <div className="text-xs text-[#7C9599]">Colunas Total</div>
                      </div>
                      <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]/50">
                        <div className="text-lg font-bold text-[#212E3E]">
                          {databaseInspection.tables.reduce((sum: number, table: any) => 
                            sum + table.columns.filter((col: any) => col.is_primary_key).length, 0)}
                        </div>
                        <div className="text-xs text-[#7C9599]">Chaves Primárias</div>
                      </div>
                      <div className="bg-[#F1F4F4] rounded-lg p-3 border border-[#BECACC]/50">
                        <div className="text-lg font-bold text-[#212E3E]">
                          {databaseInspection.tables.reduce((sum: number, table: any) => 
                            table.row_count !== null ? sum + table.row_count : sum, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-[#7C9599]">Registros Total</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controles de Expandir/Recolher */}
                {databaseInspection.tables.length > 0 && (
                  <div className="flex items-center justify-between bg-white rounded-lg border border-[#BECACC] p-3">
                    <div className="text-sm font-bold text-[#212E3E] flex items-center gap-2">
                      <Table size={16} />
                      Tabelas ({databaseInspection.tables.length})
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAllTables}
                        className="px-3 py-1 bg-[#212E3E] text-white rounded text-xs font-medium hover:bg-[#1a2332] transition-colors flex items-center gap-1"
                      >
                        <Expand size={12} />
                        Expandir Todos
                      </button>
                      <button
                        onClick={collapseAllTables}
                        className="px-3 py-1 bg-[#F1F4F4] text-[#212E3E] border border-[#BECACC] rounded text-xs font-medium hover:bg-[#E8ECED] transition-colors flex items-center gap-1"
                      >
                        <Minimize2 size={12} />
                        Recolher Todos
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Tabelas */}
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {databaseInspection.tables.length === 0 ? (
                    <div className="text-center py-8 text-[#7C9599]">
                      <Table size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma tabela encontrada</p>
                      <p className="text-xs opacity-75">Este banco não possui tabelas no schema 'public'</p>
                    </div>
                  ) : (
                    databaseInspection.tables.map((table: any) => (
                      <div key={table.name} className="bg-white rounded-lg border border-[#BECACC] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTableExpansion(table.name)}
                              className="p-1 text-[#212E3E] hover:bg-[#F1F4F4] rounded transition-colors"
                              title={expandedTables.has(table.name) ? "Recolher colunas" : "Expandir colunas"}
                            >
                              {expandedTables.has(table.name) ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                            <Table size={16} className="text-[#212E3E]" />
                            <h4 className="font-bold text-[#212E3E] text-sm">{table.name}</h4>
                            <span className="bg-[#212E3E]/10 text-[#212E3E] px-2 py-1 rounded text-xs font-medium">
                              {table.columns.length} colunas
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-[#7C9599]">
                              {table.row_count !== null ? (
                                <span className="bg-[#F1F4F4] text-[#212E3E] px-2 py-1 rounded font-medium border border-[#BECACC]/50">
                                  {table.row_count.toLocaleString()} registros
                                </span>
                              ) : (
                                <span className="bg-[#F1F4F4] text-[#7C9599] px-2 py-1 rounded border border-[#BECACC]/50">
                                  Contagem indisponível
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {expandedTables.has(table.name) && (
                          table.columns.length > 0 ? (
                            <div className="space-y-3 mt-3">
                              <div className="text-xs text-[#7C9599] font-medium">
                                Estrutura das Colunas ({table.columns.length}):
                              </div>
                              <div className="bg-[#F1F4F4] rounded-lg border border-[#BECACC]/50 p-3 space-y-2">
                                {table.columns.map((column: any) => (
                                  <div key={column.name} className="flex items-center justify-between bg-white rounded px-3 py-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      {column.is_primary_key && (
                                        <div title="Chave primária">
                                          <Key size={12} className="text-yellow-600" />
                                        </div>
                                      )}
                                      <span className="font-bold text-[#212E3E]">{column.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="bg-[#212E3E]/10 text-[#212E3E] px-2 py-1 rounded font-medium">
                                        {column.data_type}
                                      </span>
                                      {!column.is_nullable && (
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded font-medium">
                                          NOT NULL
                                        </span>
                                      )}
                                      {column.is_nullable && (
                                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded">
                                          NULLABLE
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-[#7C9599] text-xs mt-3">
                              <span className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded">
                                Nenhuma coluna encontrada para esta tabela
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>


      {/* Mensagem de status */}
      {message && (
        <div className="px-6">
          <div className={`p-3 rounded-lg text-sm font-medium border ${
            message.includes('sucesso') || message.includes('bem-sucedida') || message.includes('✅')
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message}
          </div>
        </div>
      )}
      
      {/* Footer - Botões (só no modo configuração) */}
      {activeTab === 'config' && (
        <div className="bg-white border-t border-[#BECACC] p-4 flex items-center gap-2">
          <button 
            className="flex-1 px-4 py-2.5 bg-white hover:bg-[#F1F4F4] text-[#212E3E] rounded-lg border border-[#BECACC] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={handleTest} 
            disabled={loading}
          >
            {loading ? "Testando..." : "Testar"}
          </button>
          <button 
            className="flex-1 px-4 py-2.5 bg-[#F1F4F4] hover:bg-[#E8ECED] text-[#212E3E] rounded-lg border border-[#BECACC] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={handleTestDefault} 
            disabled={loading}
          >
            {loading ? "Testando..." : "Test Padrão"}
          </button>
          <button 
            className="flex-1 px-4 py-2.5 bg-[#212E3E] hover:bg-[#1a2332] text-[#28FF52] rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={handleSave} 
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
};
