import React from 'react';

interface MicroFiltracaoProps {
  side?: 'direito' | 'esquerdo';
  editMode?: boolean;
}

const MicroFiltracao: React.FC<MicroFiltracaoProps> = ({ 
  side = 'direito',
  editMode = false
}) => {

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 29 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Tampa superior - elipse */}
        <path d="M14.1007 5.76102C19.8561 5.76102 24.5218 4.51684 24.5218 2.98207C24.5218 1.4473 19.8561 0.203125 14.1007 0.203125C8.34535 0.203125 3.67969 1.4473 3.67969 2.98207C3.67969 4.51684 8.34535 5.76102 14.1007 5.76102Z" fill="#F5F5F5" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Corpo superior */}
        <path d="M24.5218 2.98438H3.67969V15.1423H24.5218V2.98438Z" fill="#F5F5F5"/>
        <path d="M3.67969 2.98438V15.1423" stroke="#333333" strokeWidth="0.4"/>
        <path d="M24.5156 2.98438V15.1423" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Anel roxo/escuro */}
        <path d="M14.1007 17.9173C19.8561 17.9173 24.5218 16.6731 24.5218 15.1383C24.5218 13.6036 19.8561 12.3594 14.1007 12.3594C8.34535 12.3594 3.67969 13.6036 3.67969 15.1383C3.67969 16.6731 8.34535 17.9173 14.1007 17.9173Z" fill="#291E4D" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Conexão lateral esquerda */}
        <path d="M3.32944 7.14844H0.550493C0.358647 7.14844 0.203125 7.30396 0.203125 7.49581V10.9695C0.203125 11.1613 0.358647 11.3169 0.550493 11.3169H3.32944C3.52129 11.3169 3.67681 11.1613 3.67681 10.9695V7.49581C3.67681 7.30396 3.52129 7.14844 3.32944 7.14844Z" fill="#D5D5D5" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Conexão lateral direita */}
        <path d="M27.6419 7.14844H24.863C24.6711 7.14844 24.5156 7.30396 24.5156 7.49581V10.9695C24.5156 11.1613 24.6711 11.3169 24.863 11.3169H27.6419C27.8338 11.3169 27.9893 11.1613 27.9893 10.9695V7.49581C27.9893 7.30396 27.8338 7.14844 27.6419 7.14844Z" fill="#D5D5D5" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Elipse de transição */}
        <path d="M14.0977 19.3085C19.2775 19.3085 23.4766 18.2198 23.4766 16.8769C23.4766 15.534 19.2775 14.4453 14.0977 14.4453C8.91785 14.4453 4.71875 15.534 4.71875 16.8769C4.71875 18.2198 8.91785 19.3085 14.0977 19.3085Z" fill="white" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Corpo principal branco */}
        <path d="M23.4766 16.875H4.71875V93.2961H23.4766V16.875Z" fill="white"/>
        <path d="M4.71875 16.875V93.2961" stroke="#333333" strokeWidth="0.4"/>
        <path d="M23.4766 16.875V93.2961" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Linhas internas do filtro */}
        <path d="M8.89062 17.5703V92.6019" stroke="#DDDDDD" strokeWidth="0.4"/>
        <path d="M14.1016 17.5703V92.6019" stroke="#EEEEEE" strokeWidth="0.4"/>
        <path d="M19.3047 17.5703V92.6019" stroke="#DDDDDD" strokeWidth="0.4"/>
        
        {/* Elipse inferior */}
        <path d="M14.0977 95.7303C19.2775 95.7303 23.4766 94.6417 23.4766 93.2988C23.4766 91.9558 19.2775 90.8672 14.0977 90.8672C8.91785 90.8672 4.71875 91.9558 4.71875 93.2988C4.71875 94.6417 8.91785 95.7303 14.0977 95.7303Z" fill="#F0F0F0" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Base */}
        <path d="M22.7825 93.2969H5.41406V96.7706H22.7825V93.2969Z" fill="#F5F5F5"/>
        <path d="M5.41406 93.2969V96.7706" stroke="#333333" strokeWidth="0.4"/>
        <path d="M22.7812 93.2969V96.7706" stroke="#333333" strokeWidth="0.4"/>
        
        {/* Elipse da base */}
        <path d="M14.0983 99.2069C18.8944 99.2069 22.7825 98.1183 22.7825 96.7753C22.7825 95.4324 18.8944 94.3438 14.0983 94.3438C9.30212 94.3438 5.41406 95.4324 5.41406 96.7753C5.41406 98.1183 9.30212 99.2069 14.0983 99.2069Z" fill="#E5E5E5" stroke="#333333" strokeWidth="0.4"/>
      </svg>
    </div>
  );
};

export default MicroFiltracao;

// Componente estático - Micro Filtração
// Não requer animação, apenas representação visual