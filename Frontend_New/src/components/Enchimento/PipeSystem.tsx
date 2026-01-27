
import React from 'react';

// PipeSystem mantém posição fixa - não precisa de configuração responsiva complexa

interface PipeSystemProps {
  // Receber os bits individualmente como o CilindroEnchimento (podem ser number ou boolean)
  bit9?: number | boolean;
  bit11?: number | boolean;
  bit12?: number | boolean;
  bit13?: number | boolean;
  bit16?: number | boolean;
  bit17?: number | boolean;
  bit18?: number | boolean;
  bit19?: number | boolean;
  bit20?: number | boolean;
  bit21?: number | boolean;
  bit22?: number | boolean;  // PIPE 7 ESQUERDO
  bit23?: number | boolean;
  bit24?: number | boolean;
  bit25?: number | boolean;
  bit26?: number | boolean;
  bit27?: number | boolean;  // PIPE 8 ESQUERDO
  bit28?: number | boolean;  // PIPE 9 ESQUERDO
  bit30?: number | boolean;
  bit31?: number | boolean;
  bit33?: number | boolean;
  bit34?: number | boolean;
  bit36?: number | boolean;
  editMode?: boolean;
}

const PipeSystem: React.FC<PipeSystemProps> = ({ 
  bit9 = 0,
  bit11 = 0,
  bit12 = 0,
  bit13 = 0,
  bit16 = 0,
  bit17 = 0,
  bit18 = 0,
  bit19 = 0,
  bit20 = 0,
  bit21 = 0,
  bit22 = 0,  // PIPE 7 ESQUERDO
  bit23 = 0,
  bit24 = 0,
  bit25 = 0,
  bit26 = 0,
  bit27 = 0,  // PIPE 8 ESQUERDO
  bit28 = 0,  // PIPE 9 ESQUERDO
  bit30 = 0,
  bit31 = 0,
  bit33 = 0,
  bit34 = 0,
  bit36 = 0,
  editMode = false
}) => {
  // Função para obter cor baseada no bit (igual ao CilindroEnchimento)
  const getColor = (bitValue: number | boolean): string => {
    return (bitValue === 1 || bitValue === true) ? '#FC6500' : '#753E00';
  };

  // SVG do sistema de tubulações - usando seu SVG original correto
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent', pointerEvents: 'none' }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1348 423"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        {/* Pipe 2 DIREITA - M23.3 - ENCH_SIN_CIRC_SUBIDA */}
        <path 
          d="M416.5 285.5L416.5 422.5" 
          stroke={getColor(bit9)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 3 DIREITA - DB1.DBX1.4 - ENCH_OM_VALV_DESC_COMP_A  */}
        <path 
          d="M394.5 200H442.001L442.501 280.5H395.001" 
          stroke={getColor(bit11)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 1 DIREITA - M23.4 - ENCH_SIN_AG_SUBID */}
        <path 
          d="M442.5 15H287.5V319H248.5M442.5 15V180.5H394.5" 
          stroke={getColor(bit12)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 1 DIREITA - M23.4 - ENCH_SIN_AG_SUBID */}
        <path 
          d="M202 319H216.5" 
          stroke={getColor(bit12)}
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 1 DIREITA - M23.4 - ENCH_SIN_AG_SUBID */}
        <path 
          d="M442.5 15H489C489 21.8342 489 26.1658 489 33M489 49.5C489 51.8431 489 53.6569 489 56V62" 
          stroke={getColor(bit12)}
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 1 DIREITA - M23.4 - ENCH_SIN_AG_SUBID */}
        <path 
          d="M202.5 30.5H239V5H5V368.5H353V280.5H368.711" 
          stroke={getColor(bit12)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 3 DIREITA - DB1.DBX1.4 - ENCH_OM_VALV_DESC_COMP_A*/}
        <path 
          d="M96 31.5L50 31.5004V286.5M70 319H95.5" 
          stroke={getColor(bit11)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/*  */}
        <path 
          d="M31.5 319.5H22.5V348" 
          stroke={getColor(bit17)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 2 DIREITA - M23.3 - ENCH_SIN_CIRC_SUBIDA */}
        <path 
          d="M31.5 319H22.5V349.501H259.5M291 349.501H320V180.5H357.5" 
          stroke={getColor(bit9)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 4 DIREITA - M23.1 - ENCH_EM_SUB_LENTA  */}
        <path 
          d="M489.5 85V126" 
          stroke={getColor(bit19)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 5 DIREITA - M28.0 -  ENCH_HMI_B_LIG_VD2_0_DIR */}
        <path 
          d="M489.5 162.5V199.5" 
          stroke={getColor(bit20)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 6 DIREITA  - I4.0 - ENCH_RM_BOMB_DIR Bit 21 */}
        <path 
          d="M489.5 236.5V399" 
          stroke={getColor(bit21)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 7 - DIREITA - M28.1  - ENCH_HMI_VD1_VD2_LIG_DIR */}
        <path 
          d="M488 15H539V33.5M539 49.5C539 53.991 539 57.509 539 62" 
          stroke={getColor(bit23)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 9 - DIREITA - DB1.DBX2.2 - ENCH_OM_VD2_COMP_DIR */}
        <path 
          d="M537.5 15H589V33M509 199.5V178H589V85M589 62C589 57.3137 589 54.1863 589 49.5" 
          stroke={getColor(bit24)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 8 - DIREITA - M23.2 - ENCH_EM_SUB_RAP */}
        <path 
          d="M539 85C539 95.1536 539 101.846 539 112H509V126" 
          stroke={getColor(bit25)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 2 - ESQUERDA - M23.7 - ENCH_SIN_CIRC_SUBIDA_ESQ */}
        <path 
          d="M931.5 285.5L931.5 422.501" 
          stroke={getColor(bit26)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 3 - ESQUERDA - DB1.DBX1.7 - ENCH_OM_VALV_DESC_COMP_B */}
        <path 
          d="M953.504 200H906.004L905.504 280.501H953.003" 
          stroke={getColor(bit30)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 1 - ESQUERDA - M24.0 - ENCH_SIN_AG_SUBID_ESQ */}
        <path 
          d="M1146 319.003H1131.5M905.502 15H1060.5V319.003H1099.5M905.502 15V180.502H953.501M905.502 15H859.002C859.002 21.8342 859.002 26.1659 859.002 33.0002M859.002 49.5003C859.002 51.8435 859.002 53.6572 859.002 56.0004V62.0004" 
          stroke={getColor(bit31)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/*Pipe 1 - ESQUERDA - M24.0 - ENCH_SIN_AG_SUBID_ESQ  */}
        <path 
          d="M1145.5 30.5002H1109V5H1343V368.503H995.002V280.503H979.291" 
          stroke={getColor(bit33)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 3 - ESQUERDA - DB1.DBX1.7 - ENCH_OM_VALV_DESC_COMP_B */}
        <path 
          d="M1252 31.5L1298 31.5004V286.502M1278 319.003H1252.5" 
          stroke={getColor(bit34)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/*  */}
        <path 
          d="M1316.5 319.5H1325.5V348" 
          stroke={getColor(bit36)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 2 - ESQUERDA - M23.7 - ENCH_SIN_CIRC_SUBIDA_ESQ */}
        <path 
          d="M1316.5 319.001H1325.5V349.503H1088.5M1057 349.503H1028V180.5H990.502" 
          stroke={getColor(bit26)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />

        {/* Pipe 4 - ESQUERDA - M23.5 - ENCH_EM_SUB_LENTA_ESQ */}
        <path 
          d="M858.504 85V126" 
          stroke={getColor(bit16)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 5 - ESQUERDA - M28.2 - ENCH_HMI_B_LIG_VD2_0_ESQ */}
        <path 
          d="M858.504 162.5V199.501" 
          stroke={getColor(bit17)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 6 - ESQUERDA - I4.5 - ENCH_RM_BOMB_ESQ */}
        <path 
          d="M858.504 236.5V399.002" 
          stroke={getColor(bit18)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        
        {/* Pipe 7 - ESQUERDA - M28.3 - ENCH_HMI_VD1_VD2_LIG_ESQ */}
        <path 
          d="M860.004 15H809.004V33.5002M809.004 49.5003C809.004 53.9914 809.004 57.5094 809.004 62.0004" 
          stroke={getColor(bit22)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />

        {/* Pipe 9 - ESQUERDA - DB1.DBX2.7 - ENCH_OM_VD2_COMP_ESQ */}
        <path 
          d="M810.504 15H759.004V33.0002M839.004 199.502V178.002H759.004V85.0007M759.004 62.0004C759.004 57.3141 759.004 54.1867 759.004 49.5003" 
          stroke={getColor(bit28)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
        

        {/* Pipe 8 - ESQUERDA - M23.6 - ENCH_EM_SUB_RAP_ESQ */}
        <path 
          d="M809.004 85C809.004 95.1537 809.004 101.847 809.004 112H839.004V126" 
          stroke={getColor(bit27)} 
          strokeWidth="10"
          style={{ transition: 'stroke 0.3s ease-in-out' }}
        />
      </svg>
    </div>
  );
};

export default PipeSystem;
