import React, { useState } from 'react';
import { usePLC } from '../contexts/PLCContext';
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

interface EnchimentoProps {
  sidebarOpen?: boolean;
}

// Configuração responsiva da BASE dos pistões - REDUZIDO 30%
const BASE_PISTAO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 84.9,
      horizontalPercent: 74.2,
      widthPercent: 18.872, // 26.96 * 0.7 (redução de 30%)
      heightPercent: 50.3216, // 71.888 * 0.7 (redução de 30%)
    },
    esquerdo: {
      verticalPercent: 84.9,
      horizontalPercent: 0.9,
      widthPercent: 18.872, // 26.96 * 0.7 (redução de 30%)
      heightPercent: 50.3216, // 71.888 * 0.7 (redução de 30%)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 144,
      horizontalPercent: 78,
      widthPercent: 21.84, // 31.2 * 0.7 (redução de 30%)
      heightPercent: 55, // 62.4 * 0.7 (redução de 30%)
    },
    esquerdo: {
      verticalPercent: 144,
      horizontalPercent: 0.2,
      widthPercent: 21.84, // 31.2 * 0.7 (redução de 30%)
      heightPercent: 55, // 62.4 * 0.7 (redução de 30%)
    }
  }
};

// Configuração responsiva do PISTÃO MÓVEL - REDUZIDO 30%
const PISTAO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 56,
      horizontalPercent: 68.5,
      widthPercent: 30.324, // 43.32 * 0.7 (redução de 30%)
      heightPercent: 75.81, // 108.3 * 0.7 (redução de 30%)
    },
    esquerdo: {
      verticalPercent: 56,
      horizontalPercent: -4.8,
      widthPercent: 30.324, // 43.32 * 0.7 (redução de 30%)
      heightPercent: 75.81, // 108.3 * 0.7 (redução de 30%)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 125,
      horizontalPercent: 71.2,
      widthPercent: 35.378, // 50.54 * 0.7 (redução de 30%)
      heightPercent: 82, // 86.64 * 0.7 (redução de 30%)
    },
    esquerdo: {
      verticalPercent: 125,
      horizontalPercent: -6.5,
      widthPercent: 35.378, // 50.54 * 0.7 (redução de 30%)
      heightPercent: 82, // 86.64 * 0.7 (redução de 30%)
    }
  }
};

// Configuração responsiva dos CILINDROS - REDUZIDO MAIS 2%
const CILINDRO_CONFIG = {
  desktop: {
    direito: {
      verticalPercent: 14.5,
      horizontalPercent: 77.8,
      widthPercent: 11.675794, // 11.914076 * 0.98 (redução adicional de 2%)
      heightPercent: 58.37899,  // 59.57040 * 0.98 (redução adicional de 2%)
    },
    esquerdo: {
      verticalPercent: 14.5,
      horizontalPercent: 4.5,
      widthPercent: 11.675794, // 11.914076 * 0.98 (redução adicional de 2%)
      heightPercent: 58.37899,  // 59.57040 * 0.98 (redução adicional de 2%)
    }
  },
  mobile: {
    direito: {
      verticalPercent: 63.8,
      horizontalPercent: 77.6,
      widthPercent: 22.7, // 22.338893 * 0.98 (redução adicional de 2%)
      heightPercent: 68.9,  // 65.15509 * 0.98 (redução adicional de 2%)
    },
    esquerdo: {
      verticalPercent: 63.8,
      horizontalPercent: -0.3,
      widthPercent: 22.7, // 22.338893 * 0.98 (redução adicional de 2%)
      heightPercent: 68.9,  // 65.15509 * 0.98 (redução adicional de 2%)
    }
  }
};

// Configuração responsiva do PIPE SYSTEM - para ajustes de posição e altura
const PIPE_SYSTEM_CONFIG = {
  desktop: {
    verticalPercent: -2,      // % da altura total (posição Y) - ajustável
    horizontalPercent: 0,    // % da largura total (posição X) - ajustável  
    widthPercent: 94,       // % da largura total (tamanho) - ajustável
    heightPercent: 94,      // % da altura total (tamanho) - ajustável
  },
  mobile: {
    verticalPercent: 50,      // % da altura total (posição Y) - ajustável
    horizontalPercent: 0,    // % da largura total (posição X) - ajustável
    widthPercent: 100,       // % da largura total (tamanho) - ajustável
    heightPercent: 100,      // % da altura total (tamanho) - ajustável
  }
};

// Configuração responsiva do SUPORTE PISTA - SVG - DOIS ELEMENTOS (ESQUERDO/DIREITO)
const SUPORTE_PISTA_CONFIG = {
  desktop: {
    esquerdo: {
      verticalPercent: 59.7,      // % da altura total (posição Y) - ajustável
      horizontalPercent: -7.1,    // % da largura total (posição X) - ajustável
      widthPercent: 35,         // % da largura total (tamanho) - ajustável
      heightPercent: 23,        // % da altura total (tamanho) - ajustável
    },
    direito: {
      verticalPercent: 59.7,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 66.0,    // % da largura total (posição X) - ajustável
      widthPercent: 35,         // % da largura total (tamanho) - ajustável
      heightPercent: 23,        // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    esquerdo: {
      verticalPercent: 117,      // % da altura total (posição Y) - ajustável
      horizontalPercent: -14,     // % da largura total (posição X) - ajustável
      widthPercent: 50,         // % da largura total (tamanho) - ajustável
      heightPercent: 26,        // % da altura total (tamanho) - ajustável
    },
    direito: {
      verticalPercent: 117.1,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 63.8,    // % da largura total (posição X) - ajustável
      widthPercent: 50,         // % da largura total (tamanho) - ajustável
      heightPercent: 26.5,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva do BASE FUNDO ENCHIMENTO - SVG DE FUNDO
const BASE_FUNDO_ENCHIMENTO_CONFIG = {
  desktop: {
    verticalPercent: 33,       // % da altura total (posição Y) - ajustável
    horizontalPercent: 0,     // % da largura total (posição X) - ajustável
    widthPercent: 100,        // % da largura total (tamanho) - ajustável
    heightPercent: 100,       // % da altura total (tamanho) - ajustável
  },
  mobile: {
    verticalPercent: 87,       // % da altura total (posição Y) - ajustável
    horizontalPercent: -5,     // % da largura total (posição X) - ajustável
    widthPercent: 110,        // % da largura total (tamanho) - ajustável
    heightPercent: 115,       // % da altura total (tamanho) - ajustável
  }
};

// Configuração responsiva das VÁLVULAS ON/OFF - 6 VÁLVULAS (3 ESQUERDA + 3 DIREITA)
const VALVULA_CONFIG = {
  desktop: {
    // LADO ESQUERDO - 3 válvulas
    esquerda1: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 33.5,     // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 36.9,     // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 40.4,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas
    direita1: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 52.2,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 55.7,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 19,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 59.2,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    // LADO ESQUERDO - 3 válvulas
    esquerda1: {
      verticalPercent: 35,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 10,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 55,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 15,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 75,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 20,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas
    direita1: {
      verticalPercent: 35,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 75,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 55,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 0,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 75,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 0,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva das VÁLVULAS FLANGE - 6 VÁLVULAS (3 ESQUERDA + 3 DIREITA)
const VALVULA_FLANGE_CONFIG = {
  desktop: {
    // LADO ESQUERDO - 3 válvulas flange
    esquerda1: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 33.1,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 36.6,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 40.1,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas flange
    direita1: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 51.97,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 55.48,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 16.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 58.91,    // % da largura total (posição X) - ajustável
      widthPercent: 2,          // % da largura total (tamanho) - ajustável
      heightPercent: 3.5,         // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    // LADO ESQUERDO - 3 válvulas flange
    esquerda1: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 34.28,    // % da largura total (posição X) - ajustável
      widthPercent: 4.3,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 37.8,    // % da largura total (posição X) - ajustável
      widthPercent: 4.7,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 41.5,    // % da largura total (posição X) - ajustável
      widthPercent: 4.4,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas flange
    direita1: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 60,    // % da largura total (posição X) - ajustável
      widthPercent: 4.3,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 65,    // % da largura total (posição X) - ajustável
      widthPercent: 4.3,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 65,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 70,    // % da largura total (posição X) - ajustável
      widthPercent: 4.3,          // % da largura total (tamanho) - ajustável
      heightPercent: 5.2,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva do TANQUE OLEO - SVG ESTÁTICO
const TANQUE_OLEO_CONFIG = {
  desktop: {
    verticalPercent: 41.7,       // % da altura total (posição Y) - ajustável
    horizontalPercent: 19.9,     // % da largura total (posição X) - ajustável
    widthPercent: 54,          // % da largura total (tamanho) - ajustável
    heightPercent: 54,         // % da altura total (tamanho) - ajustável
  },
  mobile: {
    verticalPercent: 77,       // % da altura total (posição Y) - ajustável
    horizontalPercent: 32.5,     // % da largura total (posição X) - ajustável
    widthPercent: 35,          // % da largura total (tamanho) - ajustável
    heightPercent: 100,         // % da altura total (tamanho) - ajustável
  }
};

// Configuração responsiva dos MOTORES - DOIS MOTORES (ESQUERDO/DIREITO)
const MOTOR_CONFIG = {
  desktop: {
    esquerdo: {
      verticalPercent: 51.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 30.7,    // % da largura total (posição X) - ajustável
      widthPercent: 12,         // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direito: {
      verticalPercent: 51.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 51.3,    // % da largura total (posição X) - ajustável
      widthPercent: 12,         // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    esquerdo: {
      verticalPercent: 106,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 29.2,    // % da largura total (posição X) - ajustável
      widthPercent: 20,         // % da largura total (tamanho) - ajustável
      heightPercent: 10,        // % da altura total (tamanho) - ajustável
    },
    direito: {
      verticalPercent: 106,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 50.8,    // % da largura total (posição X) - ajustável
      widthPercent: 20,         // % da largura total (tamanho) - ajustável
      heightPercent: 10,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva das VÁLVULAS GAVETA - 6 VÁLVULAS (3 ESQUERDA + 3 DIREITA)
const VALVULA_GAVETA_CONFIG = {
  desktop: {
    // LADO ESQUERDO - 3 válvulas gaveta
    esquerda1: {
      verticalPercent: 57,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 15,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 61.8,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 18,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 51,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 25.5,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas gaveta
    direita1: {
      verticalPercent: 57,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 76.5,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 61.8,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 73.5,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 51,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 66,    // % da largura total (posição X) - ajustável
      widthPercent: 2.5,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,        // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    // LADO ESQUERDO - 3 válvulas gaveta
    esquerda1: {
      verticalPercent: 115.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 14.2,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 121.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 17.5,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 108.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 25,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas gaveta
    direita1: {
      verticalPercent: 115.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 79.7,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 121.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 76.5,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 108.5,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 68.5,    // % da largura total (posição X) - ajustável
      widthPercent: 6,         // % da largura total (tamanho) - ajustável
      heightPercent: 6,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva das VÁLVULAS DIRECIONAIS - 6 VÁLVULAS (3 ESQUERDA + 3 DIREITA)
const VALVE_DIRECIONAL_CONFIG = {
  desktop: {
    // LADO ESQUERDO - 3 válvulas direcionais
    esquerda1: {
      verticalPercent: 35.7,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 24.1,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 30.3,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 31.9,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 42,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 31.9,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas direcionais
    direita1: {
      verticalPercent: 35.7,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 65.6,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 30.3,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 57.94,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 42,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 57.94,    // % da largura total (posição X) - ajustável
      widthPercent: 4.2,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    // LADO ESQUERDO - 3 válvulas direcionais
    esquerda1: {
      verticalPercent: 90,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 23.4,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    },
    esquerda2: {
      verticalPercent: 83.6,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 31.6,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    },
    esquerda3: {
      verticalPercent: 97.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 31.6,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    },
    // LADO DIREITO - 3 válvulas direcionais
    direita1: {
      verticalPercent: 90,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 67.6,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    },
    direita2: {
      verticalPercent: 83.6,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 59.4,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    },
    direita3: {
      verticalPercent: 97.2,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 59.4,    // % da largura total (posição X) - ajustável
      widthPercent: 9,         // % da largura total (tamanho) - ajustável
      heightPercent: 7.3,        // % da altura total (tamanho) - ajustável
    }
  }
};

// Configuração responsiva das VÁLVULAS VERTICAIS - 2 VÁLVULAS (ESQUERDA E DIREITA)
const VALVULA_VERTICAL_CONFIG = {
  desktop: {
    esquerda: {
      verticalPercent: 55.9,      // % da altura total (posição Y) - ajustável
      horizontalPercent:2.0,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    },
    direita: {
      verticalPercent: 55.9,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 89,    // % da largura total (posição X) - ajustável
      widthPercent: 3,          // % da largura total (tamanho) - ajustável
      heightPercent: 8,         // % da altura total (tamanho) - ajustável
    }
  },
  mobile: {
    esquerda: {
      verticalPercent: 75,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 25,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    },
    direita: {
      verticalPercent: 75,      // % da altura total (posição Y) - ajustável
      horizontalPercent: 67,    // % da largura total (posição X) - ajustável
      widthPercent: 8,          // % da largura total (tamanho) - ajustável
      heightPercent: 12,        // % da altura total (tamanho) - ajustável
    }
  }
};

const Enchimento: React.FC<EnchimentoProps> = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = React.useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = React.useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);

  // UseLayoutEffect para calcular dimensões ANTES da renderização visual
  React.useLayoutEffect(() => {
    const initializeDimensions = () => {
      if (typeof window !== 'undefined') {
        const newWindowDimensions = { width: window.innerWidth, height: window.innerHeight };
        setWindowDimensions(newWindowDimensions);
        
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerDimensions({ width: rect.width, height: rect.height });
        } else {
          // Fallback: calcular dimensões baseado na janela
          const width = Math.min(newWindowDimensions.width - 32, 1920);
          setContainerDimensions({ width, height: 600 });
        }
        
        setIsInitialized(true);
      }
    };
    
    // Executar imediatamente (sem timeout)
    initializeDimensions();
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = { width: rect.width, height: rect.height };
        
        setContainerDimensions(prev => {
          if (Math.abs(prev.width - newDimensions.width) > 10 || 
              Math.abs(prev.height - newDimensions.height) > 10) {
            return newDimensions;
          }
          return prev;
        });
      }
      
      const newWindowDimensions = { width: window.innerWidth, height: window.innerHeight };
      setWindowDimensions(prev => {
        if (Math.abs(prev.width - newWindowDimensions.width) > 10 || 
            Math.abs(prev.height - newWindowDimensions.height) > 10) {
          return newWindowDimensions;
        }
        return prev;
      });
    };
    
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Detectar se é mobile
  const isMobile = React.useMemo(() => windowDimensions.width < 1024, [windowDimensions.width]);

  // 🎯 SISTEMA IDÊNTICO AO PORTA JUSANTE/MONTANTE
  const enchimentoAspectRatio = 1348 / 600; // Baseado no container: width="1348" height="600"
  
  // 📐 EXATAMENTE IGUAL PORTA JUSANTE - maxWidth direto
  const maxWidth = Math.min(containerDimensions.width - 32, 1920); // 32px = margem mínima
  
  // 🎯 ENCHIMENTO: sistema de escala igual PortaJusante
  const enchimentoScale = isMobile ? 90 : 100; // 90% mobile, 100% desktop
  const baseEnchimentoWidth = (maxWidth * enchimentoScale) / 100;
  const baseEnchimentoHeight = baseEnchimentoWidth / enchimentoAspectRatio;
  
  // 🎯 ALTURA TOTAL DINÂMICA - igual sistema PortaJusante
  const alturaTotal = baseEnchimentoHeight;
  
  // 📡 USAR O SISTEMA PLC EXISTENTE
  const { data: plcData, sendCommand, connectionStatus } = usePLC();
  
  // 🔧 ESTADOS PARA SIMULAÇÃO DE PIPES (lado direito já mapeado)
  const [simulationMode, setSimulationMode] = useState(false);
  const [tubulacaoSimulation, setTubulacaoSimulation] = useState<{[key: string]: boolean}>({
    PIPE_1: false, PIPE_2: false, PIPE_3: false, PIPE_4: false, PIPE_5: false,
    PIPE_6: false, PIPE_7: false, PIPE_8: false, PIPE_9: false
  });
  
  // 🎯 SUBSCRIBE ESPECÍFICO PARA ÁREA ENCH usando sendCommand
  React.useEffect(() => {
    if (connectionStatus.connected) {
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
      
      console.log('📡 [Enchimento] Subscribe ENCH enviado:', subscribeCmd);
    }
  }, [connectionStatus.connected, sendCommand]);
  
  // 🔧 FUNÇÃO PARA SIMULAÇÃO DE TUBULAÇÕES
  const handleTubulacaoSimulation = (tubuId: string, value: boolean) => {
    if (!simulationMode) return;
    setTubulacaoSimulation(prev => ({ ...prev, [tubuId]: value }));
  };
  
  // Extrair dados dos pistões do PLC - SISTEMA ENCHIMENTO
  const pistaoDireitoRaw = plcData?.ints?.[0] || 310;   // Pistão direito (índice 0) - range 87 a 310
  const pistaoEsquerdoRaw = plcData?.ints?.[1] || 310;  // Pistão esquerdo (índice 1) - range 87 a 310
  
  // 🎯 NORMALIZAÇÃO DOS PISTÕES
  // PLC envia: 87 = pistão NO TOPO (100%), 310 = pistão NA BASE (0%)
  // Fórmula invertida: quanto MENOR o valor, MAIS ALTO está o pistão
  const pistaoDireito = React.useMemo(() => {
    const MIN_POS = 87;   // Posição superior (topo)
    const MAX_POS = 310;  // Posição inferior (base)
    // Inverter: 87 → 100%, 310 → 0%
    const normalized = ((MAX_POS - pistaoDireitoRaw) / (MAX_POS - MIN_POS)) * 100;
    return Math.max(0, Math.min(100, normalized));
  }, [pistaoDireitoRaw]);
  
  const pistaoEsquerdo = React.useMemo(() => {
    const MIN_POS = 87;   // Posição superior (topo)
    const MAX_POS = 310;  // Posição inferior (base)
    // Inverter: 87 → 100%, 310 → 0%
    const normalized = ((MAX_POS - pistaoEsquerdoRaw) / (MAX_POS - MIN_POS)) * 100;
    return Math.max(0, Math.min(100, normalized));
  }, [pistaoEsquerdoRaw]);
  
  // Debug dos valores dos pistões
  React.useEffect(() => {
    console.log('🔧 PISTÕES:', {
      'Dir Raw': pistaoDireitoRaw,
      'Dir %': pistaoDireito.toFixed(1),
      'Esq Raw': pistaoEsquerdoRaw,
      'Esq %': pistaoEsquerdo.toFixed(1)
    });
  }, [pistaoDireitoRaw, pistaoDireito, pistaoEsquerdoRaw, pistaoEsquerdo]);

  // Extrair dados dos motores do PLC - SISTEMA ENCHIMENTO
  const motorEsquerdo = plcData?.ints?.[8] || 0;   // Motor esquerdo (índice 8)
  const motorDireito = plcData?.ints?.[9] || 0;    // Motor direito (índice 9)
  
  // Extrair bits dos cilindros do PLC - STATUS BITS 
  // Bit 29: Word 1, Bit 13 (29 = 1*16 + 13)
  // Bit 30: Word 1, Bit 14 (30 = 1*16 + 14)
  const cilindroDireito = plcData?.bit_data?.status_bits?.[1]?.[13] || 0;  // Cilindro direito (bit 29)
  const cilindroEsquerdo = plcData?.bit_data?.status_bits?.[1]?.[14] || 0; // Cilindro esquerdo (bit 30)

  // 🎯 TUBULAÇÕES LADO DIREITO COM TAGS REAIS ENCH (Pipes 1-9)
  
  // Tags reais do WebSocket ENCH para lado DIREITO  
  const pipe1Real = plcData?.tags?.['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0;            // Pipe 1 DIREITA
  const pipe2Real = plcData?.tags?.['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0;         // Pipe 2 DIREITA  
  const pipe3Real = plcData?.tags?.['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0;     // Pipe 3 DIREITA
  const pipe4Real = plcData?.tags?.['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0;            // Pipe 4 DIREITA
  const pipe5Real = plcData?.tags?.['ENCH_HMI_B_LIG_VD2_0_DIR'] === 'TRUE' ? 1 : 0;     // Pipe 5 DIREITA
  const pipe6Real = plcData?.tags?.['ENCH_RM_BOMB_DIR'] === 'TRUE' ? 1 : 0;             // Pipe 6 DIREITA
  const pipe7Real = plcData?.tags?.['ENCH_HMI_VD1_VD2_LIG_DIR'] === 'TRUE' ? 1 : 0;     // Pipe 7 DIREITA
  const pipe8Real = plcData?.tags?.['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0;              // Pipe 8 DIREITA
  const pipe9Real = plcData?.tags?.['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0;         // Pipe 9 DIREITA
  
  // Mapeamento conforme os bits usados no PipeSystem.tsx - CORRIGIDO ✅
  const bit12 = simulationMode ? (tubulacaoSimulation.PIPE_1 ? 1 : 0) : pipe1Real;     // Pipe 1 - ENCH_SIN_AG_SUBID
  const bit19 = simulationMode ? (tubulacaoSimulation.PIPE_4 ? 1 : 0) : pipe4Real;     // Pipe 4 - ENCH_EM_SUB_LENTA
  const bit20 = simulationMode ? (tubulacaoSimulation.PIPE_5 ? 1 : 0) : pipe5Real;     // Pipe 5 - ENCH_HMI_B_LIG_VD2_0_DIR
  const bit21 = simulationMode ? (tubulacaoSimulation.PIPE_6 ? 1 : 0) : pipe6Real;     // Pipe 6 - ENCH_RM_BOMB_DIR  
  const bit23 = simulationMode ? (tubulacaoSimulation.PIPE_7 ? 1 : 0) : pipe7Real;     // Pipe 7 - ENCH_HMI_VD1_VD2_LIG_DIR
  const bit25 = simulationMode ? (tubulacaoSimulation.PIPE_8 ? 1 : 0) : pipe8Real;     // Pipe 8 - ENCH_EM_SUB_RAP
  const bit24 = simulationMode ? (tubulacaoSimulation.PIPE_9 ? 1 : 0) : pipe9Real;     // Pipe 9 - ENCH_OM_VD2_COMP_DIR
  
  // ✓ Válvulas Verticais Laterais + Pipes 2 e 3 SOBREPOSTOS no SVG
  const bit9 = simulationMode ? (tubulacaoSimulation.PIPE_2 ? 1 : 0) : pipe2Real;      // bit9: VVL1 OU Pipe 2
  const bit11 = simulationMode ? (tubulacaoSimulation.PIPE_3 ? 1 : 0) : pipe3Real;     // bit11: VVL2 OU Pipe 3
  
  // Bits do lado esquerdo (ainda não mapeados com tags reais - aguardando definição)
  const bit13 = Number(plcData?.bit_data?.status_bits?.[1]?.[13] || 0);  // TODO: Pipe esquerdo
  const bit16 = Number(plcData?.bit_data?.status_bits?.[1]?.[0] || 0);   // TODO: Pipe esquerdo
  const bit17 = Number(plcData?.bit_data?.status_bits?.[1]?.[1] || 0);   // TODO: Pipe esquerdo
  const bit18 = Number(plcData?.bit_data?.status_bits?.[1]?.[2] || 0);   // TODO: Pipe esquerdo
  const bit26 = Number(plcData?.bit_data?.status_bits?.[1]?.[10] || 0);  // TODO: Pipe esquerdo
  const bit30 = Number(plcData?.bit_data?.status_bits?.[1]?.[14] || 0);  // TODO: Pipe esquerdo
  const bit31 = Number(plcData?.bit_data?.status_bits?.[1]?.[15] || 0);  // TODO: Pipe esquerdo
  const bit33 = Number(plcData?.bit_data?.status_bits?.[2]?.[1] || 0);   // TODO: Pipe esquerdo
  const bit34 = Number(plcData?.bit_data?.status_bits?.[2]?.[2] || 0);   // TODO: Pipe esquerdo
  const bit36 = Number(plcData?.bit_data?.status_bits?.[2]?.[4] || 0);   // TODO: Pipe esquerdo

  // Extrair bits para válvulas - CORRIGIDO ✓
  // V1 = Bit 18, V2 = Bit 19, V3 = Bit 12
  // 🎯 VÁLVULAS VRC - USANDO TAGS REAIS DO WEBSOCKET ENCH
  
  // LADO ESQUERDO na animação 
  const valvulaEsquerda1 = plcData?.tags?.['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0;     // VRC1 ESQUERDO
  const valvulaEsquerda2 = plcData?.tags?.['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0;       // VRC2 ESQUERDO  
  const valvulaEsquerda3 = plcData?.tags?.['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0;      // VRC3 ESQUERDO
  
  // LADO DIREITO na animação 
  const valvulaDireita1 = plcData?.tags?.['ENCH_EM_SUB_LENTA_ESQ'] === 'TRUE' ? 1 : 0;          // VRC1 DIREITO
  const valvulaDireita2 = plcData?.tags?.['ENCH_EM_SUB_RAP_ESQ'] === 'TRUE' ? 1 : 0;            // VRC2 DIREITO
  const valvulaDireita3 = plcData?.tags?.['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0;           // VRC3 DIREITO

  // Extrair bits para válvulas flange - CORRIGIDO ✓
  const valvulaFlangeEsquerda1 = valvulaEsquerda1; // V1 - Bit 18
  const valvulaFlangeEsquerda2 = valvulaEsquerda2; // V2 - Bit 19
  const valvulaFlangeEsquerda3 = valvulaEsquerda3; // V3 - Bit 12

  // LADO DIREITO (bits 13, 24, 23)
  const valvulaFlangeDireita1 = valvulaDireita1; // Bit 13
  const valvulaFlangeDireita2 = valvulaDireita2; // Bit 24
  const valvulaFlangeDireita3 = valvulaDireita3; // Bit 23

  // 🎯 VÁLVULAS GAVETA - TAGS REAIS DO WEBSOCKET ENCH
  
  // LADO DIREITO na tela (VG1, VG2, VG3) - CORRIGIDO ✅
  const valvulaGavetaDireita1Real = plcData?.tags?.['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0;           // VG1 DIREITO - mesmo tag do PIPE 1
  const valvulaGavetaDireita2Real = plcData?.tags?.['ENCH_SIN_CIRC_SUBIDA_ESQ'] === 'TRUE' ? 1 : 0;        // VG2 DIREITO - tag diferente
  const valvulaGavetaDireita3Real = plcData?.tags?.['EENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0;          // VG3 DIREITO - mesmo tag do PIPE 1
  
  // LADO ESQUERDO na tela (VG4, VG5, VG6) - CORRIGIDO ✅
  const valvulaGavetaEsquerda1Real = plcData?.tags?.['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0;              // VG4 ESQUERDO - tag esquerdo
  const valvulaGavetaEsquerda2Real = plcData?.tags?.['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0;           // VG5 ESQUERDO - tag esquerdo
  const valvulaGavetaEsquerda3Real = plcData?.tags?.['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0;              // VG6 ESQUERDO - tag esquerdo
  
  // Valores finais das válvulas gaveta (sem simulação)
  const valvulaGavetaEsquerda1 = valvulaGavetaEsquerda1Real; // VG4 ESQUERDO - CORRIGIDO ✅
  const valvulaGavetaEsquerda2 = valvulaGavetaEsquerda2Real; // VG5 ESQUERDO - CORRIGIDO ✅
  const valvulaGavetaEsquerda3 = valvulaGavetaEsquerda3Real; // VG6 ESQUERDO - CORRIGIDO ✅
  const valvulaGavetaDireita1 = valvulaGavetaDireita1Real;   // VG1 DIREITO - CORRIGIDO ✅
  const valvulaGavetaDireita2 = valvulaGavetaDireita2Real;   // VG2 DIREITO - CORRIGIDO ✅
  const valvulaGavetaDireita3 = valvulaGavetaDireita3Real;   // VG3 DIREITO - CORRIGIDO ✅

  // 🎯 VÁLVULAS DIRECIONAIS - TAGS REAIS DO WEBSOCKET ENCH
  
  // LADO DIREITO na tela: VCD, VD1, VD2 (botões VD1, VD2, VD3)
  const valvulaDirecionalDireita1Real = plcData?.tags?.['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0;   // VCD DIREITO
  const valvulaDirecionalDireita2Real = plcData?.tags?.['ENCH_OM_VALV_DIST_COMP_B'] === 'TRUE' ? 1 : 0;   // VD1 DIREITO
  const valvulaDirecionalDireita3Real = plcData?.tags?.['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0;       // VD2 DIREITO
  
  // LADO ESQUERDO na tela: VCD, VD1, VD2 (botões VD4, VD5, VD6)
  const valvulaDirecionalEsquerda1Real = plcData?.tags?.['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0;  // VCD ESQUERDO
  const valvulaDirecionalEsquerda2Real = plcData?.tags?.['ENCH_OM_VALV_DIST_COMP_A'] === 'TRUE' ? 1 : 0;  // VD1 ESQUERDO
  const valvulaDirecionalEsquerda3Real = plcData?.tags?.['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0;      // VD2 ESQUERDO
  
  // Valores finais das válvulas direcionais (sem simulação)
  const valvulaDirecionalEsquerda1 = valvulaDirecionalEsquerda1Real; // VCD ESQUERDO
  const valvulaDirecionalEsquerda2 = valvulaDirecionalEsquerda2Real; // VD1 ESQUERDO  
  const valvulaDirecionalEsquerda3 = valvulaDirecionalEsquerda3Real; // VD2 ESQUERDO
  const valvulaDirecionalDireita1 = valvulaDirecionalDireita1Real;   // VCD DIREITO
  const valvulaDirecionalDireita2 = valvulaDirecionalDireita2Real;   // VD1 DIREITO
  const valvulaDirecionalDireita3 = valvulaDirecionalDireita3Real;   // VD2 DIREITO
  
  // Configuração responsiva BASE
  const baseConfigAtual = isMobile ? BASE_PISTAO_CONFIG.mobile : BASE_PISTAO_CONFIG.desktop;
  const basePistaoDireitoConfig = baseConfigAtual.direito;
  const basePistaoEsquerdoConfig = baseConfigAtual.esquerdo;

  // Configuração responsiva PISTÃO MÓVEL
  const pistaoConfigAtual = isMobile ? PISTAO_CONFIG.mobile : PISTAO_CONFIG.desktop;
  const pistaoDireitoConfig = pistaoConfigAtual.direito;
  const pistaoEsquerdoConfig = pistaoConfigAtual.esquerdo;

  // Configuração responsiva CILINDROS
  const cilindroConfigAtual = isMobile ? CILINDRO_CONFIG.mobile : CILINDRO_CONFIG.desktop;
  const cilindroDireitoConfig = cilindroConfigAtual.direito;
  const cilindroEsquerdoConfig = cilindroConfigAtual.esquerdo;

  // Configuração responsiva PIPE SYSTEM
  const pipeSystemConfigAtual = isMobile ? PIPE_SYSTEM_CONFIG.mobile : PIPE_SYSTEM_CONFIG.desktop;

  // Configuração responsiva SUPORTE PISTA
  const suportePistaConfigAtual = isMobile ? SUPORTE_PISTA_CONFIG.mobile : SUPORTE_PISTA_CONFIG.desktop;
  const suportePistaEsquerdoConfig = suportePistaConfigAtual.esquerdo;
  const suportePistaDireitoConfig = suportePistaConfigAtual.direito;

  // Configuração responsiva BASE FUNDO ENCHIMENTO
  const baseFundoEnchimentoConfigAtual = isMobile ? BASE_FUNDO_ENCHIMENTO_CONFIG.mobile : BASE_FUNDO_ENCHIMENTO_CONFIG.desktop;

  // Configuração responsiva VÁLVULAS
  const valvulaConfigAtual = isMobile ? VALVULA_CONFIG.mobile : VALVULA_CONFIG.desktop;
  const valvulaEsquerda1Config = valvulaConfigAtual.esquerda1;
  const valvulaEsquerda2Config = valvulaConfigAtual.esquerda2;
  const valvulaEsquerda3Config = valvulaConfigAtual.esquerda3;
  const valvulaDireita1Config = valvulaConfigAtual.direita1;
  const valvulaDireita2Config = valvulaConfigAtual.direita2;
  const valvulaDireita3Config = valvulaConfigAtual.direita3;

  // Configuração responsiva VÁLVULAS FLANGE
  const valvulaFlangeConfigAtual = isMobile ? VALVULA_FLANGE_CONFIG.mobile : VALVULA_FLANGE_CONFIG.desktop;
  const valvulaFlangeEsquerda1Config = valvulaFlangeConfigAtual.esquerda1;
  const valvulaFlangeEsquerda2Config = valvulaFlangeConfigAtual.esquerda2;
  const valvulaFlangeEsquerda3Config = valvulaFlangeConfigAtual.esquerda3;
  const valvulaFlangeDireita1Config = valvulaFlangeConfigAtual.direita1;
  const valvulaFlangeDireita2Config = valvulaFlangeConfigAtual.direita2;
  const valvulaFlangeDireita3Config = valvulaFlangeConfigAtual.direita3;

  // Configuração responsiva TANQUE OLEO
  const tanqueOleoConfigAtual = isMobile ? TANQUE_OLEO_CONFIG.mobile : TANQUE_OLEO_CONFIG.desktop;

  // Configuração responsiva MOTORES
  const motorConfigAtual = isMobile ? MOTOR_CONFIG.mobile : MOTOR_CONFIG.desktop;
  const motorEsquerdoConfig = motorConfigAtual.esquerdo;
  const motorDireitoConfig = motorConfigAtual.direito;

  // Configuração responsiva VÁLVULAS GAVETA
  const valvulaGavetaConfigAtual = isMobile ? VALVULA_GAVETA_CONFIG.mobile : VALVULA_GAVETA_CONFIG.desktop;
  const valvulaGavetaEsquerda1Config = valvulaGavetaConfigAtual.esquerda1;
  const valvulaGavetaEsquerda2Config = valvulaGavetaConfigAtual.esquerda2;
  const valvulaGavetaEsquerda3Config = valvulaGavetaConfigAtual.esquerda3;
  const valvulaGavetaDireita1Config = valvulaGavetaConfigAtual.direita1;
  const valvulaGavetaDireita2Config = valvulaGavetaConfigAtual.direita2;
  const valvulaGavetaDireita3Config = valvulaGavetaConfigAtual.direita3;

  // Configuração responsiva VÁLVULAS DIRECIONAIS
  const valvulaDirecionalConfigAtual = isMobile ? VALVE_DIRECIONAL_CONFIG.mobile : VALVE_DIRECIONAL_CONFIG.desktop;
  const valvulaDirecionalEsquerda1Config = valvulaDirecionalConfigAtual.esquerda1;
  const valvulaDirecionalEsquerda2Config = valvulaDirecionalConfigAtual.esquerda2;
  const valvulaDirecionalEsquerda3Config = valvulaDirecionalConfigAtual.esquerda3;
  const valvulaDirecionalDireita1Config = valvulaDirecionalConfigAtual.direita1;
  const valvulaDirecionalDireita2Config = valvulaDirecionalConfigAtual.direita2;
  const valvulaDirecionalDireita3Config = valvulaDirecionalConfigAtual.direita3;

  // Configuração responsiva VÁLVULAS VERTICAIS
  const valvulaVerticalConfigAtual = isMobile ? VALVULA_VERTICAL_CONFIG.mobile : VALVULA_VERTICAL_CONFIG.desktop;
  const valvulaVerticalEsquerdaConfig = valvulaVerticalConfigAtual.esquerda;
  const valvulaVerticalDireitaConfig = valvulaVerticalConfigAtual.direita;

  return (
    <div className="w-full h-auto flex flex-col items-center relative">
      
      {/* PAINEL INFORMATIVO - POSIÇÕES DOS PISTÕES */}
      {isInitialized && containerDimensions.width > 100 && (
        <div 
          className="absolute z-50"
          style={{
            top: `${alturaTotal * 0.99}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${Math.min(maxWidth * 0.4, 600)}px`,
          }}
        >
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-lg border border-gray-300 p-4">
            <h3 className="text-sm font-bold text-[#212E3E] uppercase tracking-wide mb-3 flex items-center gap-2">
              <BoltIcon className="w-4 h-4" />
              POSIÇÕES DOS PISTÕES
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Pistão Esquerdo */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Pistão Esquerdo:</span>
                  <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-white border border-gray-200 text-[#212E3E]">
                    {pistaoEsquerdoRaw}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Percentual:</span>
                  <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {pistaoEsquerdo.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Pistão Direito */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Pistão Direito:</span>
                  <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-white border border-gray-200 text-[#212E3E]">
                    {pistaoDireitoRaw}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#212E3E] uppercase tracking-wide">Percentual:</span>
                  <span className="text-sm font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    {pistaoDireito.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 PAINEL DE SIMULAÇÃO DE TUBULAÇÕES */}
      {isInitialized && containerDimensions.width > 100 && (
        <div 
          className="absolute z-50"
          style={{
            top: '20px',
            left: '20px',
            width: '400px',
          }}
        >
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-lg border border-orange-300 p-4">
            <h3 className="text-sm font-bold text-[#212E3E] uppercase tracking-wide mb-3 flex items-center gap-2">
              🔧 IDENTIFICAR TUBULAÇÕES
            </h3>
            
            {/* Toggle Modo Simulação */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-[#212E3E]">
                <input
                  type="checkbox"
                  checked={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
                Modo Simulação Ativo
              </label>
              <p className="text-xs text-gray-600 mt-1">
                {simulationMode ? '✅ Simulação habilitada' : '⚠️ Simulação desabilitada'}
              </p>
            </div>

            {/* GRID DE PIPES LADO DIREITO */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: 'PIPE_1', tag: 'ENCH_SIN_AG_SUBID' },
                { id: 'PIPE_2', tag: 'ENCH_SIN_CIRC_SUBIDA' },  
                { id: 'PIPE_3', tag: 'ENCH_OM_VALV_DESC_COMP_A' },
                { id: 'PIPE_4', tag: 'ENCH_EM_SUB_LENTA' },
                { id: 'PIPE_5', tag: 'ENCH_HMI_B_LIG_VD2_0_DIR' },
                { id: 'PIPE_6', tag: 'ENCH_RM_BOMB_DIR' },
                { id: 'PIPE_7', tag: 'ENCH_HMI_VD1_VD2_LIG_DIR' },
                { id: 'PIPE_8', tag: 'ENCH_EM_SUB_RAP' },
                { id: 'PIPE_9', tag: 'ENCH_OM_VD2_COMP_DIR' }
              ].map(({id, tag}) => {
                const isActive = tubulacaoSimulation[id];
                return (
                  <div key={id} className="mb-2">
                    <label className="text-xs font-medium text-[#212E3E] uppercase block mb-1">
                      {id} DIR
                    </label>
                    <p className="text-xs text-gray-500 mb-1 truncate">{tag}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTubulacaoSimulation(id, true)}
                        disabled={!simulationMode}
                        className={`flex-1 px-2 py-1 text-xs font-bold rounded transition-colors ${
                          !simulationMode ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                          isActive ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600 hover:bg-green-500 hover:text-white'
                        }`}
                      >
                        ON
                      </button>
                      <button
                        onClick={() => handleTubulacaoSimulation(id, false)}
                        disabled={!simulationMode}
                        className={`flex-1 px-2 py-1 text-xs font-bold rounded transition-colors ${
                          !simulationMode ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                          !isActive ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        OFF
                      </button>
                    </div>
                    <div className={`w-full h-1 rounded mt-1 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                );
              })}
            </div>

            {/* Instruções */}
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Pipes Lado DIREITO Mapeados:</strong><br/>
                ✅ Pipes 1-9 já conectados aos tags ENCH reais<br/>
                🔧 Use simulação para testar se os mapeamentos estão corretos<br/>
                📝 Aguardando mapeamento do lado ESQUERDO<br/>
                🎯 Subscribe ENCH ativo - dados em tempo real
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Container do Sistema de Enchimento */}
      <div 
        ref={containerRef}
        className="w-full max-w-[1920px] flex flex-col items-center relative z-10"
        style={{
          height: 'auto',
          minHeight: '60vh',
          overflow: 'visible'
        }}
      >
        {isInitialized && containerDimensions.width > 100 && windowDimensions.width > 0 ? (
          <div 
            className="relative w-full flex items-center justify-center"
            style={{
              maxWidth: `${maxWidth}px`,
              height: `${alturaTotal}px`,
              minHeight: `${alturaTotal}px`
            }}
          >
            {/* SISTEMA DE TUBULAÇÕES - BACKGROUND - CONFIGURAÇÃO RESPONSIVA AJUSTÁVEL */}
            <div 
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * pipeSystemConfigAtual.verticalPercent) / 100}px`,
                left: `${(maxWidth * pipeSystemConfigAtual.horizontalPercent) / 100}px`,
                width: `${(maxWidth * pipeSystemConfigAtual.widthPercent) / 100}px`,
                height: `${(alturaTotal * pipeSystemConfigAtual.heightPercent) / 100}px`,
                zIndex: 1
              }}
            >
              <PipeSystem 
                bit9={bit9}
                bit11={bit11}
                bit12={bit12}
                bit13={bit13}
                bit16={bit16}
                bit17={bit17}
                bit18={bit18}
                bit19={bit19}
                bit20={bit20}
                bit21={bit21}
                bit23={bit23}
                bit24={bit24}
                bit25={bit25}
                bit26={bit26}
                bit30={bit30}
                bit31={bit31}
                bit33={bit33}
                bit34={bit34}
                bit36={bit36}
                editMode={false}
              />
            </div>

            {/* 🏗️ BASE FUNDO ENCHIMENTO - SVG DE FUNDO - ATRÁS DOS PISTÕES MAS NA FRENTE DA BASE */}
            <div 
              className="absolute"
              style={{
                // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
                top: `${(alturaTotal * baseFundoEnchimentoConfigAtual.verticalPercent) / 100}px`,
                left: `${(maxWidth * baseFundoEnchimentoConfigAtual.horizontalPercent) / 100}px`,
                width: `${(maxWidth * baseFundoEnchimentoConfigAtual.widthPercent) / 100}px`,
                height: `${(alturaTotal * baseFundoEnchimentoConfigAtual.heightPercent) / 100}px`,
                zIndex: 8
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1348 600"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
              >
                <image
                  href="/Enchimento/Base_Fundo_Enchimento.svg"
                  width="1348"
                  height="600"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>

            {/* BASE PISTÃO ESQUERDO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * basePistaoEsquerdoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * basePistaoEsquerdoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * basePistaoEsquerdoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * basePistaoEsquerdoConfig.heightPercent) / 100}px`,
              zIndex: 5
            }}
          >
            <BasePistaoEnchimento 
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* BASE PISTÃO DIREITO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * basePistaoDireitoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * basePistaoDireitoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * basePistaoDireitoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * basePistaoDireitoConfig.heightPercent) / 100}px`,
              zIndex: 5
            }}
          >
            <BasePistaoEnchimento 
              side="direito"
              editMode={false}
            />
          </div>

          {/* 🎯 PISTÃO ESQUERDO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 1 */}
          <div 
            className="absolute transition-all duration-200 ease-in-out"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * pistaoEsquerdoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * pistaoEsquerdoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * pistaoEsquerdoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * pistaoEsquerdoConfig.heightPercent) / 100}px`,
              zIndex: 10
            }}
          >
            <PistaoEnchimento 
              websocketValue={pistaoEsquerdo}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* 🎯 PISTÃO DIREITO - COM MOVIMENTO PROPORCIONAL - WEBSOCKET ÍNDICE 0 */}
          <div 
            className="absolute transition-all duration-200 ease-in-out"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * pistaoDireitoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * pistaoDireitoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * pistaoDireitoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * pistaoDireitoConfig.heightPercent) / 100}px`,
              zIndex: 10
            }}
          >
            <PistaoEnchimento 
              websocketValue={pistaoDireito}
              side="direito"
              editMode={false}
            />
          </div>

          {/* 🔧 CILINDRO ESQUERDO - STATUS WORD BIT ÍNDICE 30 */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * cilindroEsquerdoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * cilindroEsquerdoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * cilindroEsquerdoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * cilindroEsquerdoConfig.heightPercent) / 100}px`,
              zIndex: 5
            }}
          >
            <CilindroEnchimento 
              websocketBit={cilindroEsquerdo}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* 🔧 CILINDRO DIREITO - STATUS WORD BIT ÍNDICE 29 */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * cilindroDireitoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * cilindroDireitoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * cilindroDireitoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * cilindroDireitoConfig.heightPercent) / 100}px`,
              zIndex: 5
            }}
          >
            <CilindroEnchimento 
              websocketBit={cilindroDireito}
              side="direito"
              editMode={false}
            />
          </div>

          {/* 🏗️ SUPORTE PISTA ESQUERDO - SVG ESTÁTICO - Z-INDEX MAIS ALTO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * suportePistaEsquerdoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * suportePistaEsquerdoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * suportePistaEsquerdoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * suportePistaEsquerdoConfig.heightPercent) / 100}px`,
              zIndex: 15
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 400 200"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <image
                href="/Enchimento/SuportePista.svg"
                width="400"
                height="200"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>

          {/* 🏗️ SUPORTE PISTA DIREITO - SVG ESTÁTICO - Z-INDEX MAIS ALTO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * suportePistaDireitoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * suportePistaDireitoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * suportePistaDireitoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * suportePistaDireitoConfig.heightPercent) / 100}px`,
              zIndex: 15
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 400 200"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <image
                href="/Enchimento/SuportePista.svg"
                width="400"
                height="200"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>

          {/* 🔧 VÁLVULA ESQUERDA 1 - BIT 18 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaEsquerda1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaEsquerda1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaEsquerda1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaEsquerda1Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaEsquerda1}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA ESQUERDA 2 - BIT 19 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaEsquerda2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaEsquerda2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaEsquerda2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaEsquerda2Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaEsquerda2}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA ESQUERDA 3 - BIT 12 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaEsquerda3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaEsquerda3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaEsquerda3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaEsquerda3Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaEsquerda3}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA DIREITA 1 - BIT 13 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDireita1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDireita1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDireita1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDireita1Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaDireita1}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA DIREITA 2 - BIT 24 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDireita2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDireita2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDireita2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDireita2Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaDireita2}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA DIREITA 3 - BIT 23 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDireita3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDireita3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDireita3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDireita3Config.heightPercent) / 100}px`,
              zIndex: 12
            }}
          >
            <ValvulaOnOff 
              websocketBit={valvulaDireita3}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE ESQUERDA 1 - BIT 18 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeEsquerda1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeEsquerda1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeEsquerda1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeEsquerda1Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeEsquerda1}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE ESQUERDA 2 - BIT 19 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeEsquerda2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeEsquerda2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeEsquerda2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeEsquerda2Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeEsquerda2}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE ESQUERDA 3 - BIT 12 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeEsquerda3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeEsquerda3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeEsquerda3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeEsquerda3Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeEsquerda3}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE DIREITA 1 - BIT 13 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeDireita1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeDireita1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeDireita1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeDireita1Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeDireita1}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE DIREITA 2 - BIT 24 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeDireita2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeDireita2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeDireita2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeDireita2Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeDireita2}
              editMode={false}
            />
          </div>

          {/* 🔧 VÁLVULA FLANGE DIREITA 3 - BIT 23 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaFlangeDireita3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaFlangeDireita3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaFlangeDireita3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaFlangeDireita3Config.heightPercent) / 100}px`,
              zIndex: 11
            }}
          >
            <ValvulaFlange 
              websocketBit={valvulaFlangeDireita3}
              editMode={false}
            />
          </div>

          {/* 🛢️ TANQUE OLEO - SVG ESTÁTICO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * tanqueOleoConfigAtual.verticalPercent) / 100}px`,
              left: `${(maxWidth * tanqueOleoConfigAtual.horizontalPercent) / 100}px`,
              width: `${(maxWidth * tanqueOleoConfigAtual.widthPercent) / 100}px`,
              height: `${(alturaTotal * tanqueOleoConfigAtual.heightPercent) / 100}px`,
              zIndex: 0
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 200 150"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <image
                href="/Enchimento/Tanque_Oleo.svg"
                width="200"
                height="150"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>

          {/* ⚙️ MOTOR ESQUERDO - INTEIRO 8 - ESPELHADO */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * motorEsquerdoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * motorEsquerdoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * motorEsquerdoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * motorEsquerdoConfig.heightPercent) / 100}px`,
              zIndex: 9
            }}
          >
            <MotorEnchimento 
              websocketValue={motorEsquerdo}
              side="esquerdo"
              editMode={false}
            />
          </div>

          {/* ⚙️ MOTOR DIREITO - INTEIRO 9 */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * motorDireitoConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * motorDireitoConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * motorDireitoConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * motorDireitoConfig.heightPercent) / 100}px`,
              zIndex: 9
            }}
          >
            <MotorEnchimento 
              websocketValue={motorDireito}
              side="direito"
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA ESQUERDA 1 - BIT 21 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaEsquerda1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaEsquerda1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaEsquerda1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaEsquerda1Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaEsquerda1}
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA ESQUERDA 2 - BIT 20 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaEsquerda2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaEsquerda2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaEsquerda2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaEsquerda2Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaEsquerda2}
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA ESQUERDA 3 - BIT 2 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaEsquerda3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaEsquerda3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaEsquerda3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaEsquerda3Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaEsquerda3}
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA DIREITA 1 - BIT 26 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaDireita1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaDireita1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaDireita1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaDireita1Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaDireita1}
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA DIREITA 2 - BIT 25 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaDireita2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaDireita2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaDireita2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaDireita2Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaDireita2}
              editMode={false}
            />
          </div>

          {/* 🚪 VÁLVULA GAVETA DIREITA 3 - BIT 4 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaGavetaDireita3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaGavetaDireita3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaGavetaDireita3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaGavetaDireita3Config.heightPercent) / 100}px`,
              zIndex: 7
            }}
          >
            <ValvulaGaveta 
              websocketBit={valvulaGavetaDireita3}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL ESQUERDA 1 - BIT 9 - ESPELHADA + ROTACIONADA 90° */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalEsquerda1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalEsquerda1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalEsquerda1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalEsquerda1Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalEsquerda1}
              mirrored={true}
              rotation={-90}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL ESQUERDA 2 - BIT 8 - ESPELHADA */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalEsquerda2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalEsquerda2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalEsquerda2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalEsquerda2Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalEsquerda2}
              mirrored={true}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL ESQUERDA 3 - BIT 6 - ESPELHADA */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalEsquerda3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalEsquerda3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalEsquerda3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalEsquerda3Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalEsquerda3}
              mirrored={true}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL DIREITA 1 - BIT 15 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalDireita1Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalDireita1Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalDireita1Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalDireita1Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalDireita1}
              rotation={-90}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL DIREITA 2 - BIT 10 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalDireita2Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalDireita2Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalDireita2Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalDireita2Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalDireita2}
              editMode={false}
            />
          </div>

          {/* ↔️ VÁLVULA DIRECIONAL DIREITA 3 - BIT 12 */}
          <div 
            className="absolute"
            style={{
              top: `${(alturaTotal * valvulaDirecionalDireita3Config.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaDirecionalDireita3Config.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaDirecionalDireita3Config.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaDirecionalDireita3Config.heightPercent) / 100}px`,
              zIndex: 13
            }}
          >
            <ValveDirecional 
              websocketBit={valvulaDirecionalDireita3}
              editMode={false}
            />
          </div>

          {/* ↕️ VÁLVULA VERTICAL ESQUERDA - BIT 9 */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * valvulaVerticalEsquerdaConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaVerticalEsquerdaConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaVerticalEsquerdaConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaVerticalEsquerdaConfig.heightPercent) / 100}px`,
              zIndex: 14
            }}
          >
            <ValvulaVertical 
              websocketBit={bit9}
              editMode={false}
            />
          </div>

          {/* ↕️ VÁLVULA VERTICAL DIREITA - BIT 11 */}
          <div 
            className="absolute"
            style={{
              // 📐 SISTEMA IDÊNTICO PORTA JUSANTE: maxWidth horizontal + alturaTotal vertical
              top: `${(alturaTotal * valvulaVerticalDireitaConfig.verticalPercent) / 100}px`,
              left: `${(maxWidth * valvulaVerticalDireitaConfig.horizontalPercent) / 100}px`,
              width: `${(maxWidth * valvulaVerticalDireitaConfig.widthPercent) / 100}px`,
              height: `${(alturaTotal * valvulaVerticalDireitaConfig.heightPercent) / 100}px`,
              zIndex: 14
            }}
          >
            <ValvulaVertical 
              websocketBit={bit11}
              editMode={false}
            />
          </div>
        </div>
        ) : (
          /* Loading otimizado - mantém proporções corretas */
          <div className="w-full flex items-center justify-center">
            <div 
              className="w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-pulse"
              style={{ 
                height: '600px',
                maxWidth: '800px',
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

      {/* BOTÃO MOBILE - Mesmo estilo do desktop, porém menor (abaixo de 1024px) */}
      <button
        onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
        className="xl:hidden fixed top-20 right-4 z-50 px-4 py-3 bg-[#212E3E] text-white rounded-xl shadow-lg flex items-center gap-2 touch-manipulation transition-all duration-200"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <CogIcon className="w-3 h-3" />
        </div>
        <div className="text-left min-w-0">
          <div className="font-bold text-xs leading-tight">PARÂMETROS</div>
          <div className="text-xs opacity-80 leading-tight">Enchimento</div>
        </div>
      </button>

      {/* BOTÃO DESKTOP - Grande com texto NO FUNDO (acima de 1024px) */}
      <button
        onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
        className="hidden xl:flex fixed bottom-6 right-6 z-50 px-8 py-5 bg-[#212E3E] text-white rounded-2xl shadow-2xl items-center gap-5 hover:scale-105 transition-all duration-200 touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <CogIcon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <div className="font-bold text-lg">PARÂMETROS</div>
          <div className="text-sm opacity-80">Sistema de Enchimento</div>
        </div>
      </button>

      {/* MODAL DE PARÂMETROS */}
      {menuParametrosOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-2 md:p-4 overflow-hidden"
          onClick={() => setMenuParametrosOpen(false)}
          style={{ 
            touchAction: 'none',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Dialog Container */}
          <div 
            className="
              bg-white shadow-2xl overflow-hidden flex flex-col
              w-full max-w-[280px] max-h-[75vh] rounded-t-2xl
              animate-in slide-in-from-bottom duration-300
              md:max-w-2xl md:max-h-[80vh] md:rounded-2xl
              md:animate-in md:fade-in md:zoom-in
              lg:max-w-4xl
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