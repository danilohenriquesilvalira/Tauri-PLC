// ============================================================================
// PYTHON PARSER - EXEMPLOS
// ============================================================================

import type { ExampleCode, ExampleCategory } from './types';

// Exemplos básicos
export const BASIC_EXAMPLES: ExampleCode[] = [
    {
        id: 'basic_assignment',
        title: 'Atribuições Básicas',
        description: 'Operações simples com tags do PLC',
        code: `# Leitura de sensores
sensor_1 = SENSOR_01
sensor_2 = SENSOR_02

# Lógica AND
output = sensor_1 and sensor_2

# Resultado para PLC
MOTOR_01 = output`,
        category: 'basic',
        complexity: 'simple',
        tags: ['SENSOR_01', 'SENSOR_02', 'MOTOR_01'],
        dataTypes: ['BOOL', 'BOOL', 'BOOL'],
        expectedOutput: 'True/False baseado nos sensores',
        explanation: 'Lê dois sensores, faz operação AND e controla um motor'
    },
    {
        id: 'basic_math',
        title: 'Operações Matemáticas',
        description: 'Cálculos com valores analógicos',
        code: `# Leitura de valores analógicos
temperatura = TEMP_SENSOR
pressao = PRESSURE_SENSOR

# Cálculo de densidade (exemplo)
densidade = pressao / (temperatura + 273.15) * 0.348

# Limite de segurança
if densidade > 1.2:
    ALARM_HIGH = True
else:
    ALARM_HIGH = False`,
        category: 'basic',
        complexity: 'medium',
        tags: ['TEMP_SENSOR', 'PRESSURE_SENSOR', 'ALARM_HIGH'],
        dataTypes: ['REAL', 'REAL', 'BOOL'],
        explanation: 'Calcula densidade e ativa alarme se exceder limite'
    }
];

// Exemplos de controle de fluxo
export const CONTROL_FLOW_EXAMPLES: ExampleCode[] = [
    {
        id: 'if_elif_else',
        title: 'Controle Condicional',
        description: 'Múltiplas condições para controle de processo',
        code: `# Leitura do modo de operação
modo = OPERATION_MODE
emergencia = EMERGENCY_STOP

if emergencia:
    # Parada de emergência
    MOTOR_01 = False
    MOTOR_02 = False
    STATUS_LED = "RED"
elif modo == 1:
    # Modo automático
    MOTOR_01 = AUTO_SENSOR
    MOTOR_02 = not AUTO_SENSOR
    STATUS_LED = "GREEN"
elif modo == 2:
    # Modo manual
    MOTOR_01 = MANUAL_BTN_1
    MOTOR_02 = MANUAL_BTN_2
    STATUS_LED = "YELLOW"
else:
    # Modo desconhecido
    MOTOR_01 = False
    MOTOR_02 = False
    STATUS_LED = "BLUE"`,
        category: 'control_flow',
        complexity: 'medium',
        tags: ['OPERATION_MODE', 'EMERGENCY_STOP', 'AUTO_SENSOR', 'MANUAL_BTN_1', 'MANUAL_BTN_2', 'MOTOR_01', 'MOTOR_02', 'STATUS_LED'],
        dataTypes: ['INT', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'STRING'],
        explanation: 'Sistema de controle com múltiplos modos de operação'
    },
    {
        id: 'nested_conditions',
        title: 'Condições Aninhadas',
        description: 'Lógica complexa de segurança',
        code: `# Sistema de segurança multinível
nivel_acesso = ACCESS_LEVEL
senha_ok = PASSWORD_OK
biometria_ok = BIOMETRIC_OK

if nivel_acesso >= 3:
    if senha_ok and biometria_ok:
        DOOR_LOCK = False  # Destrava porta
        ACCESS_LOG = True  # Log de acesso
        if nivel_acesso == 5:
            ADMIN_MODE = True
        else:
            ADMIN_MODE = False
    else:
        DOOR_LOCK = True
        ALARM_SECURITY = True
else:
    DOOR_LOCK = True
    ACCESS_LOG = False`,
        category: 'control_flow',
        complexity: 'complex',
        tags: ['ACCESS_LEVEL', 'PASSWORD_OK', 'BIOMETRIC_OK', 'DOOR_LOCK', 'ACCESS_LOG', 'ADMIN_MODE', 'ALARM_SECURITY'],
        dataTypes: ['INT', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL'],
        explanation: 'Sistema de controle de acesso com múltiplos níveis de segurança'
    }
];

// Exemplos de loops
export const LOOP_EXAMPLES: ExampleCode[] = [
    {
        id: 'for_loop_sequence',
        title: 'Sequência Automatizada',
        description: 'Controle sequencial de válvulas',
        code: `# Lista de válvulas para sequência
valvulas = ['VALVE_01', 'VALVE_02', 'VALVE_03', 'VALVE_04']

# Ativa válvulas em sequência
for i, valvula in enumerate(valvulas):
    if SEQUENCE_STEP == i + 1:
        # Ativa válvula atual
        exec(f"{valvula} = True")
        # Desativa as outras
        for j, outras in enumerate(valvulas):
            if j != i:
                exec(f"{outras} = False")
        break`,
        category: 'loops',
        complexity: 'complex',
        tags: ['VALVE_01', 'VALVE_02', 'VALVE_03', 'VALVE_04', 'SEQUENCE_STEP'],
        dataTypes: ['BOOL', 'BOOL', 'BOOL', 'BOOL', 'INT'],
        explanation: 'Controla sequência de válvulas baseada no passo atual'
    },
    {
        id: 'while_monitoring',
        title: 'Monitoramento Contínuo',
        description: 'Loop de monitoramento de processo',
        code: `# Monitoramento de temperatura
temp_atual = TEMP_ATUAL
temp_limite = TEMP_LIMITE
aquecedor_on = False

# Loop de controle de temperatura
while temp_atual < temp_limite:
    if not aquecedor_on:
        HEATER = True
        aquecedor_on = True
    
    # Atualiza temperatura
    temp_atual = TEMP_ATUAL
    
    # Proteção contra superaquecimento
    if temp_atual > temp_limite + 5:
        HEATER = False
        ALARM_TEMP = True
        break

# Desliga aquecedor quando atingir temperatura
HEATER = False`,
        category: 'loops',
        complexity: 'medium',
        tags: ['TEMP_ATUAL', 'TEMP_LIMITE', 'HEATER', 'ALARM_TEMP'],
        dataTypes: ['REAL', 'REAL', 'BOOL', 'BOOL'],
        explanation: 'Sistema de controle de temperatura com proteção'
    }
];

// Exemplos de funções
export const FUNCTION_EXAMPLES: ExampleCode[] = [
    {
        id: 'simple_function',
        title: 'Função de Conversão',
        description: 'Converte valores entre escalas',
        code: `def celsius_to_fahrenheit(celsius):
    """Converte temperatura de Celsius para Fahrenheit"""
    return (celsius * 9/5) + 32

# Uso da função
temp_c = TEMP_CELSIUS
temp_f = celsius_to_fahrenheit(temp_c)

# Saída para display
TEMP_DISPLAY_F = temp_f`,
        category: 'functions',
        complexity: 'simple',
        tags: ['TEMP_CELSIUS', 'TEMP_DISPLAY_F'],
        dataTypes: ['REAL', 'REAL'],
        explanation: 'Função para converter temperatura e exibir resultado'
    },
    {
        id: 'plc_control_function',
        title: 'Função de Controle PLC',
        description: 'Função reutilizável para controle de motores',
        code: `def controlar_motor(sensor_start, sensor_stop, motor_output):
    """
    Controla motor baseado em sensores de start/stop
    """
    if sensor_start and not sensor_stop:
        return True
    elif sensor_stop:
        return False
    else:
        return motor_output  # Mantém estado atual

# Aplicação para múltiplos motores
MOTOR_01 = controlar_motor(START_01, STOP_01, MOTOR_01)
MOTOR_02 = controlar_motor(START_02, STOP_02, MOTOR_02)
MOTOR_03 = controlar_motor(START_03, STOP_03, MOTOR_03)`,
        category: 'functions',
        complexity: 'medium',
        tags: ['START_01', 'STOP_01', 'MOTOR_01', 'START_02', 'STOP_02', 'MOTOR_02', 'START_03', 'STOP_03', 'MOTOR_03'],
        dataTypes: ['BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL', 'BOOL'],
        explanation: 'Função reutilizável para controlar múltiplos motores'
    }
];

// Exemplos de integração PLC
export const PLC_INTEGRATION_EXAMPLES: ExampleCode[] = [
    {
        id: 'recipe_control',
        title: 'Controle de Receita',
        description: 'Sistema de dosagem por receita',
        code: `# Receita ativa
receita_id = RECIPE_ID

# Definição de receitas (simulado)
receitas = {
    1: {'ingrediente_a': 50, 'ingrediente_b': 30, 'tempo_mistura': 120},
    2: {'ingrediente_a': 75, 'ingrediente_b': 25, 'tempo_mistura': 180},
    3: {'ingrediente_a': 40, 'ingrediente_b': 60, 'tempo_mistura': 150}
}

if receita_id in receitas:
    receita = receitas[receita_id]
    
    # Configura dosagem
    DOSAGE_A_SETPOINT = receita['ingrediente_a']
    DOSAGE_B_SETPOINT = receita['ingrediente_b']
    MIX_TIME_SETPOINT = receita['tempo_mistura']
    
    # Inicia processo
    if START_PROCESS:
        DOSAGE_A_VALVE = True
        PROCESS_ACTIVE = True
else:
    # Receita inválida
    ALARM_RECIPE = True`,
        category: 'plc_integration',
        complexity: 'complex',
        tags: ['RECIPE_ID', 'DOSAGE_A_SETPOINT', 'DOSAGE_B_SETPOINT', 'MIX_TIME_SETPOINT', 'START_PROCESS', 'DOSAGE_A_VALVE', 'PROCESS_ACTIVE', 'ALARM_RECIPE'],
        dataTypes: ['INT', 'REAL', 'REAL', 'INT', 'BOOL', 'BOOL', 'BOOL', 'BOOL'],
        explanation: 'Sistema de controle baseado em receitas pré-definidas'
    }
];

// Categorias de exemplos
export const EXAMPLE_CATEGORIES = [
    { id: 'basic' as ExampleCategory, name: 'Básico', icon: '🔤', description: 'Operações fundamentais' },
    { id: 'control_flow' as ExampleCategory, name: 'Controle de Fluxo', icon: '🔀', description: 'If/else, condições' },
    { id: 'loops' as ExampleCategory, name: 'Loops', icon: '🔄', description: 'For, while loops' },
    { id: 'functions' as ExampleCategory, name: 'Funções', icon: '⚙️', description: 'Definição e uso de funções' },
    { id: 'plc_integration' as ExampleCategory, name: 'Integração PLC', icon: '🏭', description: 'Exemplos industriais' },
    { id: 'data_structures' as ExampleCategory, name: 'Estruturas de Dados', icon: '📊', description: 'Listas, dicionários' },
    { id: 'error_handling' as ExampleCategory, name: 'Tratamento de Erro', icon: '⚠️', description: 'Try/except' },
    { id: 'automation' as ExampleCategory, name: 'Automação', icon: '🤖', description: 'Processos automatizados' }
];

// Função para obter exemplos por categoria
export function getExamplesByCategory(category: ExampleCategory): ExampleCode[] {
    const allExamples = [
        ...BASIC_EXAMPLES,
        ...CONTROL_FLOW_EXAMPLES,
        ...LOOP_EXAMPLES,
        ...FUNCTION_EXAMPLES,
        ...PLC_INTEGRATION_EXAMPLES
    ];
    
    return allExamples.filter(example => example.category === category);
}

// Todos os exemplos
export const ALL_EXAMPLES = [
    ...BASIC_EXAMPLES,
    ...CONTROL_FLOW_EXAMPLES,
    ...LOOP_EXAMPLES,
    ...FUNCTION_EXAMPLES,
    ...PLC_INTEGRATION_EXAMPLES
];