import React, { useState } from 'react';
import { usePLC } from '../contexts/PLCContext';
import { CogIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, BoltIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
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
    horizontalPercent: 15.2,     // % da largura total (posição X) - ajustável
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
  // 🚀 PERFORMANCE: Estados estáveis para evitar flashes visuais
  const [containerDimensions, setContainerDimensions] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 32, 1920);
      return { width, height: 600 };
    }
    return { width: 1200, height: 600 }; // Fallback estável
  });
  
  const [windowDimensions, setWindowDimensions] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 1920, height: 1080 }; // Fallback estável
  });
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [menuParametrosOpen, setMenuParametrosOpen] = React.useState(false);

  // 🚀 PERFORMANCE: Callback otimizado para resize (fora do useLayoutEffect)
  const updateDimensions = React.useCallback(() => {
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
  }, []);

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
    
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Detectar se é mobile
  const isMobile = React.useMemo(() => windowDimensions.width < 1024, [windowDimensions.width]);

  // 🚀 PERFORMANCE: MEMOIZAÇÃO DOS CÁLCULOS DE DIMENSÕES
  const dimensionCalculations = React.useMemo(() => {
    const enchimentoAspectRatio = 1348 / 600; // Baseado no container: width="1348" height="600"
    const maxWidth = Math.min(containerDimensions.width - 32, 1920); // 32px = margem mínima
    const enchimentoScale = isMobile ? 90 : 100; // 90% mobile, 100% desktop
    const baseEnchimentoWidth = (maxWidth * enchimentoScale) / 100;
    const baseEnchimentoHeight = baseEnchimentoWidth / enchimentoAspectRatio;
    const alturaTotal = baseEnchimentoHeight;

    return {
      maxWidth,
      baseEnchimentoWidth,
      baseEnchimentoHeight,
      alturaTotal
    };
  }, [containerDimensions.width, isMobile]);

  const { maxWidth, alturaTotal } = dimensionCalculations;
  
  // 📡 USAR O SISTEMA PLC EXISTENTE
  const { data: plcData, sendCommand, connectionStatus } = usePLC();
  
  // 🔥 SEM SIMULAÇÃO - USANDO TAGS REAIS DO WEBSOCKET ENCH
  
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
      
    }
  }, [connectionStatus.connected, sendCommand]);
  
  // 🚀 PERFORMANCE: MEMOIZAÇÃO COMPLETA DO PROCESSAMENTO WEBSOCKET (60+ TAGS)
  // Processa todas as tags WebSocket uma única vez para evitar re-renders
  const webSocketData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 PISTÕES - TAGS REAIS DO WEBSOCKET ENCH (MOVIMENTO REAL 0-100%)
      pistaoDireitoRaw: parseInt(plcData.tags['ENCH_MED_AB_CILIND.POS_DIR_INT'] || '0', 10),
      pistaoEsquerdoRaw: parseInt(plcData.tags['ENCH_MED_AB_CILIND.POS_ESQ_INT'] || '0', 10),

      // 🎯 DADOS COMPLEMENTARES - PISTÃO DIREITO
      tempoAberturaDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_SUB_A'] || '0', 10),
      velocidadeDireito: parseFloat(plcData.tags['ENCH_POSICAO_COMP.VELOC_C_A'] || '0'),
      tempoAberturaLentaDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_ESTAB_A'] || '0', 10),
      tempoFechoDireito: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_DESC_A'] || '0', 10),
      posicaoMetrosDireito: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.MED_CILIND_DIR'] || '0'),
      posicaoPorcentagemDireito: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.PORC_CILIND_DIR'] || '0'),

      // 🎯 DADOS COMPLEMENTARES - PISTÃO ESQUERDO
      tempoAberturaEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_SUB_B'] || '0', 10),
      velocidadeEsquerdo: parseFloat(plcData.tags['ENCH_POSICAO_COMP.VELOC_C_B'] || '0'),
      tempoAberturaLentaEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_ESTAB_B'] || '0', 10),
      tempoFechoEsquerdo: parseInt(plcData.tags['ENCH_POSICAO_COMP.CONTAG_TEMP_DESC_B'] || '0', 10),
      posicaoMetrosEsquerdo: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.MED_CILIND_ESQ'] || '0'),
      posicaoPorcentagemEsquerdo: parseFloat(plcData.tags['ENCH_MED_AB_CILIND.PORC_CILIND_ESQ'] || '0')
    };
  }, [plcData?.tags]);

  // Extract values with fallbacks for performance
  const pistaoDireitoRaw = webSocketData?.pistaoDireitoRaw || 0;
  const pistaoEsquerdoRaw = webSocketData?.pistaoEsquerdoRaw || 0;
  const tempoAberturaDireito = webSocketData?.tempoAberturaDireito || 0;
  const velocidadeDireito = webSocketData?.velocidadeDireito || 0;
  const tempoAberturaLentaDireito = webSocketData?.tempoAberturaLentaDireito || 0;
  const tempoFechoDireito = webSocketData?.tempoFechoDireito || 0;
  const posicaoMetrosDireito = webSocketData?.posicaoMetrosDireito || 0;
  const posicaoPorcentagemDireito = webSocketData?.posicaoPorcentagemDireito || 0;
  const tempoAberturaEsquerdo = webSocketData?.tempoAberturaEsquerdo || 0;
  const velocidadeEsquerdo = webSocketData?.velocidadeEsquerdo || 0;
  const tempoAberturaLentaEsquerdo = webSocketData?.tempoAberturaLentaEsquerdo || 0;
  const tempoFechoEsquerdo = webSocketData?.tempoFechoEsquerdo || 0;
  const posicaoMetrosEsquerdo = webSocketData?.posicaoMetrosEsquerdo || 0;
  const posicaoPorcentagemEsquerdo = webSocketData?.posicaoPorcentagemEsquerdo || 0;
  
  // 🎯 NORMALIZAÇÃO DIRETA DOS PISTÕES (0-100% do WebSocket)
  // WebSocket já envia valores normalizados para controle direto do eixo Y
  const pistaoDireito = React.useMemo(() => {
    // Garantir que o valor está entre 0-100%
    return Math.max(0, Math.min(100, pistaoDireitoRaw));
  }, [pistaoDireitoRaw]);
  
  const pistaoEsquerdo = React.useMemo(() => {
    // Garantir que o valor está entre 0-100%
    return Math.max(0, Math.min(100, pistaoEsquerdoRaw));
  }, [pistaoEsquerdoRaw]);
  
  // 🚀 PERFORMANCE: MEMOIZAÇÃO DAS VÁLVULAS, MOTORES E PIPES
  const valvulasData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 BOMBAS/MOTORES - TAGS REAIS DO WEBSOCKET ENCH (0,1,2,3 - ANIMAÇÃO)
      bombaMotorDireito: parseInt(plcData.tags['ENCH_ANIM_WINCC_ANIM_BOMBA_A_ENCH'] || '0', 10),
      bombaMotorEsquerdo: parseInt(plcData.tags['ENCH_ANIM_WINCC_ANIM_BOMBA_B_ENCH'] || '0', 10),

      // 🎯 CILINDROS - TAGS REAIS DO WEBSOCKET ENCH  
      cilindroDireito: plcData.tags['ENCH_DEF_AG_CILIND_A_DIR'] === 'TRUE' ? 1 : 0,
      cilindroEsquerdo: plcData.tags['ENCH_DEF_AG_CILIND_B_ESQ'] === 'TRUE' ? 1 : 0,

      // 🎯 TUBULAÇÕES LADO DIREITO COM TAGS REAIS ENCH (Pipes 1-9)
      pipe1Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      pipe2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0,
      pipe3Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,
      pipe4Real: plcData.tags['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0,
      pipe5Real: plcData.tags['ENCH_HMI_B_LIG_VD2_0_DIR'] === 'TRUE' ? 1 : 0,
      pipe6Real: plcData.tags['ENCH_RM_BOMB_DIR'] === 'TRUE' ? 1 : 0,
      pipe7Real: plcData.tags['ENCH_HMI_VD1_VD2_LIG_DIR'] === 'TRUE' ? 1 : 0,
      pipe8Real: plcData.tags['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0,
      pipe9Real: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0,

      // Tags reais do WebSocket ENCH para lado ESQUERDO
      pipe1EsqReal: plcData.tags['ENCH_SIN_CIRC_SUBIDA_ESQ'] === 'TRUE' ? 1 : 0,
      pipe2EsqReal: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,
      pipe3EsqReal: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      pipe4EsqReal: plcData.tags['ENCH_EM_SUB_LENTA_ESQ'] === 'TRUE' ? 1 : 0,
      pipe5EsqReal: plcData.tags['ENCH_HMI_B_LIG_VD2_0_ESQ'] === 'TRUE' ? 1 : 0,
      pipe6EsqReal: plcData.tags['ENCH_RM_BOMB_ESQ'] === 'TRUE' ? 1 : 0,
      pipe7EsqReal: plcData.tags['ENCH_HMI_VD1_VD2_LIG_ESQ'] === 'TRUE' ? 1 : 0,
      pipe8EsqReal: plcData.tags['ENCH_EM_SUB_RAP_ESQ'] === 'TRUE' ? 1 : 0,
      pipe9EsqReal: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0
    };
  }, [plcData?.tags]);

  // Extract optimized values
  const bombaMotorDireito = valvulasData?.bombaMotorDireito || 0;
  const bombaMotorEsquerdo = valvulasData?.bombaMotorEsquerdo || 0;
  const cilindroDireito = valvulasData?.cilindroDireito || 0;
  const cilindroEsquerdo = valvulasData?.cilindroEsquerdo || 0;
  const pipe1Real = valvulasData?.pipe1Real || 0;
  const pipe2Real = valvulasData?.pipe2Real || 0;
  const pipe3Real = valvulasData?.pipe3Real || 0;
  const pipe4Real = valvulasData?.pipe4Real || 0;
  const pipe5Real = valvulasData?.pipe5Real || 0;
  const pipe6Real = valvulasData?.pipe6Real || 0;
  const pipe7Real = valvulasData?.pipe7Real || 0;
  const pipe8Real = valvulasData?.pipe8Real || 0;
  const pipe9Real = valvulasData?.pipe9Real || 0;
  const pipe1EsqReal = valvulasData?.pipe1EsqReal || 0;
  const pipe2EsqReal = valvulasData?.pipe2EsqReal || 0;
  const pipe3EsqReal = valvulasData?.pipe3EsqReal || 0;
  const pipe4EsqReal = valvulasData?.pipe4EsqReal || 0;
  const pipe5EsqReal = valvulasData?.pipe5EsqReal || 0;
  const pipe6EsqReal = valvulasData?.pipe6EsqReal || 0;
  const pipe7EsqReal = valvulasData?.pipe7EsqReal || 0;
  const pipe8EsqReal = valvulasData?.pipe8EsqReal || 0;
  const pipe9EsqReal = valvulasData?.pipe9EsqReal || 0;
  
  // 🎯 MAPEAMENTO PIPES LADO DIREITO → BITS SVG
  const bit12 = pipe1Real;     // Pipe 1 DIREITA - ENCH_SIN_AG_SUBID
  const bit9 = pipe2Real;      // Pipe 2 DIREITA - ENCH_SIN_CIRC_SUBIDA  
  const bit11 = pipe3Real;     // Pipe 3 DIREITA - ENCH_OM_VALV_DESC_COMP_A
  const bit19 = pipe4Real;     // Pipe 4 DIREITA - ENCH_EM_SUB_LENTA
  const bit20 = pipe5Real;     // Pipe 5 DIREITA - ENCH_HMI_B_LIG_VD2_0_DIR
  const bit21 = pipe6Real;     // Pipe 6 DIREITA - ENCH_RM_BOMB_DIR  
  const bit23 = pipe7Real;     // Pipe 7 DIREITA - ENCH_HMI_VD1_VD2_LIG_DIR
  const bit25 = pipe8Real;     // Pipe 8 DIREITA - ENCH_EM_SUB_RAP
  const bit24 = pipe9Real;     // Pipe 9 DIREITA - ENCH_OM_VD2_COMP_DIR

  // 🎯 MAPEAMENTO PIPES LADO ESQUERDO → BITS SVG (CORRIGIDO)
  const bit26 = pipe1EsqReal;  // Pipe 1 ESQUERDA - ENCH_SIN_AG_SUBID_ESQ 
  const bit31 = pipe2EsqReal;  // Pipe 2 ESQUERDA - ENCH_SIN_CIRC_SUBIDA_ESQ
  const bit30 = pipe3EsqReal;  // Pipe 3 ESQUERDA - ENCH_OM_VALV_DESC_COMP_B
  const bit16 = pipe4EsqReal;  // Pipe 4 ESQUERDA - ENCH_EM_SUB_LENTA_ESQ
  const bit17 = pipe5EsqReal;  // Pipe 5 ESQUERDA - ENCH_HMI_B_LIG_VD2_0_ESQ
  const bit18 = pipe6EsqReal;  // Pipe 6 ESQUERDA - ENCH_RM_BOMB_ESQ
  const bit22 = pipe7EsqReal;  // Pipe 7 ESQUERDA - ENCH_HMI_VD1_VD2_LIG_ESQ (BIT ÚNICO)
  const bit27 = pipe8EsqReal;  // Pipe 8 ESQUERDA - ENCH_EM_SUB_RAP_ESQ (BIT ÚNICO)
  const bit28 = pipe9EsqReal;  // Pipe 9 ESQUERDA - ENCH_OM_VD2_COMP_ESQ (BIT ÚNICO)
  
  // 🚀 PERFORMANCE: MEMOIZAÇÃO DAS VÁLVULAS COMPLEXAS
  const valvulasComplexasData = React.useMemo(() => {
    if (!plcData?.tags) return null;

    return {
      // 🎯 VÁLVULAS VERTICAIS - BITS ÚNICOS COM TAGS ESPECÍFICOS
      valvulaVerticalDireita: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaVerticalEsquerda: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,

      // Bits extras do SVG
      bit13: Number(plcData?.bit_data?.status_bits?.[1]?.[13] || 0),
      bit36: Number(plcData?.bit_data?.status_bits?.[2]?.[4] || 0),

      // 🎯 VÁLVULAS VRC - TAGS REAIS DO WEBSOCKET ENCH
      valvulaEsquerda1: plcData.tags['ENCH_EM_SUB_LENTA'] === 'TRUE' ? 1 : 0,
      valvulaEsquerda2: plcData.tags['ENCH_EM_SUB_RAP'] === 'TRUE' ? 1 : 0,
      valvulaEsquerda3: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0,
      valvulaDireita1: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDireita2: plcData.tags['ENCH_EM_SUB_RAP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDireita3: plcData.tags['ENCH_EM_SUB_LENTA_ESQ'] === 'TRUE' ? 1 : 0,

      // VÁLVULAS GAVETA
      valvulaGavetaEsquerda1Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA'] === 'TRUE' ? 1 : 0,
      valvulaGavetaEsquerda3Real: plcData.tags['ENCH_SIN_AG_SUBID'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita1Real: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita2Real: plcData.tags['ENCH_SIN_CIRC_SUBIDA_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaGavetaDireita3Real: plcData.tags['ENCH_SIN_AG_SUBID_ESQ'] === 'TRUE' ? 1 : 0,

      // 🎯 VÁLVULAS DIRECIONAIS - TAGS REAIS DO WEBSOCKET ENCH
      valvulaDirecionalDireita1Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita2Real: plcData.tags['ENCH_OM_VALV_DIST_COMP_B'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalDireita3Real: plcData.tags['ENCH_OM_VD2_COMP_ESQ'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda1Real: plcData.tags['ENCH_OM_VALV_DESC_COMP_A'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda2Real: plcData.tags['ENCH_OM_VALV_DIST_COMP_A'] === 'TRUE' ? 1 : 0,
      valvulaDirecionalEsquerda3Real: plcData.tags['ENCH_OM_VD2_COMP_DIR'] === 'TRUE' ? 1 : 0
    };
  }, [plcData?.tags, plcData?.bit_data?.status_bits]);

  // Extract optimized values
  const valvulaVerticalDireita = valvulasComplexasData?.valvulaVerticalDireita || 0;
  const valvulaVerticalEsquerda = valvulasComplexasData?.valvulaVerticalEsquerda || 0;
  const bit13 = valvulasComplexasData?.bit13 || 0;
  const bit33 = pipe2EsqReal; // Uses already optimized value
  const bit34 = pipe3EsqReal; // Uses already optimized value
  const bit36 = valvulasComplexasData?.bit36 || 0;

  // VRC Valves
  const valvulaEsquerda1 = valvulasComplexasData?.valvulaEsquerda1 || 0;
  const valvulaEsquerda2 = valvulasComplexasData?.valvulaEsquerda2 || 0;
  const valvulaEsquerda3 = valvulasComplexasData?.valvulaEsquerda3 || 0;
  const valvulaDireita1 = valvulasComplexasData?.valvulaDireita1 || 0;
  const valvulaDireita2 = valvulasComplexasData?.valvulaDireita2 || 0;
  const valvulaDireita3 = valvulasComplexasData?.valvulaDireita3 || 0;

  // Flange valves (derived from VRC)
  const valvulaFlangeEsquerda1 = valvulaEsquerda1;
  const valvulaFlangeEsquerda2 = valvulaEsquerda2;
  const valvulaFlangeEsquerda3 = valvulaEsquerda3;
  const valvulaFlangeDireita1 = valvulaDireita1;
  const valvulaFlangeDireita2 = valvulaDireita2;
  const valvulaFlangeDireita3 = valvulaDireita3;

  // Gaveta valves
  const valvulaGavetaEsquerda1 = valvulasComplexasData?.valvulaGavetaEsquerda1Real || 0;
  const valvulaGavetaEsquerda2 = valvulasComplexasData?.valvulaGavetaEsquerda2Real || 0;
  const valvulaGavetaEsquerda3 = valvulasComplexasData?.valvulaGavetaEsquerda3Real || 0;
  const valvulaGavetaDireita1 = valvulasComplexasData?.valvulaGavetaDireita1Real || 0;
  const valvulaGavetaDireita2 = valvulasComplexasData?.valvulaGavetaDireita2Real || 0;
  const valvulaGavetaDireita3 = valvulasComplexasData?.valvulaGavetaDireita3Real || 0;

  // Directional valves
  const valvulaDirecionalEsquerda1 = valvulasComplexasData?.valvulaDirecionalEsquerda1Real || 0;
  const valvulaDirecionalEsquerda2 = valvulasComplexasData?.valvulaDirecionalEsquerda2Real || 0;
  const valvulaDirecionalEsquerda3 = valvulasComplexasData?.valvulaDirecionalEsquerda3Real || 0;
  const valvulaDirecionalDireita1 = valvulasComplexasData?.valvulaDirecionalDireita1Real || 0;
  const valvulaDirecionalDireita2 = valvulasComplexasData?.valvulaDirecionalDireita2Real || 0;
  const valvulaDirecionalDireita3 = valvulasComplexasData?.valvulaDirecionalDireita3Real || 0;
  
  // 🚀 PERFORMANCE: MEMOIZAÇÃO DE TODAS AS CONFIGURAÇÕES RESPONSIVAS
  const responsiveConfigs = React.useMemo(() => {
    const baseConfig = isMobile ? BASE_PISTAO_CONFIG.mobile : BASE_PISTAO_CONFIG.desktop;
    const pistaoConfig = isMobile ? PISTAO_CONFIG.mobile : PISTAO_CONFIG.desktop;
    const cilindroConfig = isMobile ? CILINDRO_CONFIG.mobile : CILINDRO_CONFIG.desktop;
    const pipeSystemConfig = isMobile ? PIPE_SYSTEM_CONFIG.mobile : PIPE_SYSTEM_CONFIG.desktop;
    const suportePistaConfig = isMobile ? SUPORTE_PISTA_CONFIG.mobile : SUPORTE_PISTA_CONFIG.desktop;
    const baseFundoEnchimentoConfig = isMobile ? BASE_FUNDO_ENCHIMENTO_CONFIG.mobile : BASE_FUNDO_ENCHIMENTO_CONFIG.desktop;
    const valvulaConfig = isMobile ? VALVULA_CONFIG.mobile : VALVULA_CONFIG.desktop;

    return {
      // Configurações BASE PISTAO
      basePistaoDireitoConfig: baseConfig.direito,
      basePistaoEsquerdoConfig: baseConfig.esquerdo,
      
      // Configurações PISTÃO MÓVEL
      pistaoDireitoConfig: pistaoConfig.direito,
      pistaoEsquerdoConfig: pistaoConfig.esquerdo,
      
      // Configurações CILINDROS
      cilindroDireitoConfig: cilindroConfig.direito,
      cilindroEsquerdoConfig: cilindroConfig.esquerdo,
      
      // Configurações PIPE SYSTEM
      pipeSystemConfig: pipeSystemConfig,
      
      // Configurações SUPORTE PISTA
      suportePistaEsquerdoConfig: suportePistaConfig.esquerdo,
      suportePistaDireitoConfig: suportePistaConfig.direito,
      
      // Configurações BASE FUNDO ENCHIMENTO
      baseFundoEnchimentoConfig: baseFundoEnchimentoConfig,
      
      // Configurações VÁLVULAS
      valvulaEsquerda1Config: valvulaConfig.esquerda1,
      valvulaEsquerda2Config: valvulaConfig.esquerda2,
      valvulaEsquerda3Config: valvulaConfig.esquerda3,
      valvulaDireita1Config: valvulaConfig.direita1,
      valvulaDireita2Config: valvulaConfig.direita2,
      valvulaDireita3Config: valvulaConfig.direita3
    };
  }, [isMobile]);

  // Extract configurations for easy access
  const {
    basePistaoDireitoConfig, basePistaoEsquerdoConfig,
    pistaoDireitoConfig, pistaoEsquerdoConfig,
    cilindroDireitoConfig, cilindroEsquerdoConfig,
    pipeSystemConfig: pipeSystemConfigAtual,
    suportePistaEsquerdoConfig, suportePistaDireitoConfig,
    baseFundoEnchimentoConfig: baseFundoEnchimentoConfigAtual,
    valvulaEsquerda1Config, valvulaEsquerda2Config, valvulaEsquerda3Config,
    valvulaDireita1Config, valvulaDireita2Config, valvulaDireita3Config
  } = responsiveConfigs;

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

      {/* 📱 PAINEL MOBILE - SISTEMA UNIVERSAL RESPONSIVO */}
      {isMobile && (
        <div
          className="w-full mt-4 mb-4 relative"
          style={{
            padding: `0 ${Math.max(6, Math.min(16, windowDimensions.width * 0.02))}px`
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
              {/* CARD PISTÕES */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-edp-marine text-white px-2 py-1">
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    PISTÕES
                  </h3>
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
                      <div className="text-[7px] text-gray-600 font-medium uppercase">Abertura:</div>
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
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    SISTEMA
                  </h3>
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
                    <div className="font-mono font-bold text-[#212E3E] text-[10px]">
                      {posicaoPorcentagemDireito > 50 ? 'ABRINDO' : posicaoPorcentagemDireito < 10 ? 'FECHADO' : 'PARCIAL'}
                    </div>
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
                  <h3 className="font-bold text-[8px] uppercase tracking-wide text-center leading-tight">
                    VÁLVULAS
                  </h3>
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
                bit22={bit22}
                bit27={bit27}
                bit28={bit28}
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
                width="260"
                height="165"
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
              websocketValue={bombaMotorEsquerdo}
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
              websocketValue={bombaMotorDireito}
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
              websocketBit={valvulaVerticalEsquerda}
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
              websocketBit={valvulaVerticalDireita}
              editMode={false}
            />
          </div>

          {/* 🎯 CARD PISTÃO DIREITO - ESTILO PADRÃO INFOCARD - APENAS DESKTOP */}
          {!isMobile && (
          <div 
            className="absolute z-50"
            style={{
              top: `${alturaTotal * 0.91}px`,
              left: `${maxWidth * 0.21}px`,
              width: `${maxWidth * 0.23}px`,
            }}
          >
            <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
              {/* Header Padrão InfoCard */}
              <div 
                className="bg-edp-marine text-white"
                style={{ padding: `${Math.max(6, maxWidth * 0.005)}px ${Math.max(10, maxWidth * 0.008)}px` }}
              >
                <h3 
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: `${Math.max(10, Math.min(14, maxWidth * 0.008))}px` }}
                >
                  PISTÃO DIREITO
                </h3>
              </div>
              
              {/* Conteúdo Padrão InfoCard */}
              <div style={{ padding: `${Math.max(10, maxWidth * 0.01)}px` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, maxWidth * 0.006)}px` }}>
                  
                  {/* Posição Metros */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Posição:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {posicaoMetrosDireito.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>m</span>
                    </span>
                  </div>
                  
                  {/* Abertura % */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Abertura:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {posicaoPorcentagemDireito.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>%</span>
                    </span>
                  </div>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>
                  
                  {/* Tempo Abertura */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Abertura:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoAberturaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Tempo Ab. Lenta */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Ab. Lenta:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoAberturaLentaDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Tempo Fecho */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Fecho:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoFechoDireito}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>
                  
                  {/* Velocidade */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Velocidade:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {velocidadeDireito.toFixed(4)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>m/s</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* 🎯 CARD PISTÃO ESQUERDO - ESTILO PADRÃO INFOCARD - APENAS DESKTOP */}
          {!isMobile && (
          <div 
            className="absolute z-50"
            style={{
              top: `${alturaTotal * 0.91}px`,
              left: `${maxWidth * 0.50}px`,
              width: `${maxWidth * 0.23}px`,
            }}
          >
            <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/60 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
              {/* Header Padrão InfoCard */}
              <div 
                className="bg-edp-marine text-white"
                style={{ padding: `${Math.max(6, maxWidth * 0.005)}px ${Math.max(10, maxWidth * 0.008)}px` }}
              >
                <h3 
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: `${Math.max(10, Math.min(14, maxWidth * 0.008))}px` }}
                >
                  PISTÃO ESQUERDO
                </h3>
              </div>
              
              {/* Conteúdo Padrão InfoCard */}
              <div style={{ padding: `${Math.max(10, maxWidth * 0.01)}px` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(8, maxWidth * 0.006)}px` }}>
                  
                  {/* Posição Metros */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Posição:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {posicaoMetrosEsquerdo.toFixed(3)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>m</span>
                    </span>
                  </div>
                  
                  {/* Abertura % */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Abertura:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {posicaoPorcentagemEsquerdo.toFixed(1)}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>%</span>
                    </span>
                  </div>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>
                  
                  {/* Tempo Abertura */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Abertura:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoAberturaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Tempo Ab. Lenta */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Ab. Lenta:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoAberturaLentaEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Tempo Fecho */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      T. Fecho:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {tempoFechoEsquerdo}<span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>s</span>
                    </span>
                  </div>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-300" style={{ margin: `${Math.max(4, maxWidth * 0.003)}px 0` }}></div>
                  
                  {/* Velocidade */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="font-medium text-[#212E3E] uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}
                    >
                      Velocidade:
                    </span>
                    <span 
                      className="font-mono font-bold text-[#212E3E]"
                      style={{ fontSize: `${Math.max(12, Math.min(18, maxWidth * 0.011))}px` }}
                    >
                      {velocidadeEsquerdo.toFixed(4)} <span className="text-gray-500" style={{ fontSize: `${Math.max(8, Math.min(11, maxWidth * 0.006))}px` }}>m/s</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
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


      {/* 📱 BOTÃO MOBILE - ESTILO PADRÃO PORTA MONTANTE/JUSANTE */}
      {isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-[#212E3E] to-[#2A3A4E] text-white shadow-xl flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
          style={{
            padding: `${Math.max(6, Math.min(8, windowDimensions.width * 0.015))}px ${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px`,
            fontSize: `${Math.max(8, Math.min(10, windowDimensions.width * 0.02))}px`,
            borderRadius: `${Math.max(8, Math.min(12, windowDimensions.width * 0.025))}px`,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div 
            className="bg-white/20 rounded p-0.5 flex items-center justify-center"
            style={{
              width: `${Math.max(16, Math.min(20, windowDimensions.width * 0.04))}px`,
              height: `${Math.max(16, Math.min(20, windowDimensions.width * 0.04))}px`,
              borderRadius: `${Math.max(4, Math.min(6, windowDimensions.width * 0.012))}px`
            }}
          >
            <CogIcon 
              className="text-white"
              style={{ 
                width: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`,
                height: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`
              }} 
            />
          </div>
          <span className="font-medium tracking-wide">PARÂMETROS</span>
          <div 
            className={`transition-transform duration-200 ${menuParametrosOpen ? 'rotate-180' : 'rotate-0'}`}
            style={{
              width: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`,
              height: `${Math.max(10, Math.min(12, windowDimensions.width * 0.025))}px`
            }}
          >
            <ChevronUpIcon className="w-full h-full text-white/80" />
          </div>
        </button>
      )}

      {/* 🖥️ BOTÃO DESKTOP - ESCONDIDO (só mobile tem botão agora) */}
      {!isMobile && (
        <button
          onClick={() => setMenuParametrosOpen(!menuParametrosOpen)}
          className="fixed bottom-6 right-6 z-50 px-8 py-5 bg-[#212E3E] text-white rounded-2xl shadow-2xl flex items-center gap-5 hover:scale-105 transition-all duration-200 touch-manipulation"
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
      )}

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