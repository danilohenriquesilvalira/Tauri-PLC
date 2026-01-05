// Lista de avatares disponíveis
const AVATARS = {
  // Avatares femininos (sem prefixo M_)
  femininos: [
    'Avatar_0.svg',
    'Avatar_1.svg', 
    'Avatar_2.svg',
    'Avatar_3.svg',
    'Avatar_4.svg',
    'Avatar_8.svg',
    'Avatar_9.svg',
    'Avatar_10.svg',
    'Avatar_11.svg',
    'Avatar_12.svg'
  ],
  // Avatares masculinos (com prefixo M_)
  masculinos: [
    'M_Avatar_5.svg',
    'M_Avatar_6.svg',
    'M_Avatar_7.svg',
    'M_Avatar_13.svg',
    'M_Avatar_14.svg',
    'M_Avatar_15.svg'
  ]
};

/**
 * Gera um avatar aleatório baseado no nome do usuário
 * Usa o nome para determinar se é masculino/feminino e gera um hash consistente
 */
export const generateAvatarUrl = (nome: string, genero?: 'M' | 'F'): string => {
  // Normalizar nome para hash consistente
  const normalizedName = nome.toLowerCase().trim();
  
  // Lista de nomes tipicamente femininos para detecção automática
  const nomesFemininos = [
    'ana', 'maria', 'lucia', 'carla', 'paula', 'sofia', 'beatriz', 'clara',
    'helena', 'julia', 'gabriela', 'fernanda', 'amanda', 'patricia', 'sandra',
    'monica', 'daniela', 'roberta', 'camila', 'priscila', 'natalia', 'jessica',
    'mariana', 'carolina', 'giovanna', 'isabela', 'larissa', 'bruna', 'rafaela'
  ];
  
  // Detectar gênero automaticamente se não fornecido
  let avatarList: string[];
  
  if (genero === 'M') {
    avatarList = AVATARS.masculinos;
  } else if (genero === 'F') {
    avatarList = AVATARS.femininos;
  } else {
    // Auto-detecção baseada no nome
    const primeiroNome = normalizedName.split(' ')[0];
    const isFeminino = nomesFemininos.some(nome => 
      primeiroNome.includes(nome) || nome.includes(primeiroNome)
    );
    
    avatarList = isFeminino ? AVATARS.femininos : AVATARS.masculinos;
  }
  
  // Gerar hash consistente baseado no nome
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Selecionar avatar baseado no hash
  const avatarIndex = Math.abs(hash) % avatarList.length;
  const selectedAvatar = avatarList[avatarIndex];
  
  return `/Avatar/${selectedAvatar}`;
};

/**
 * Gera avatar aleatório (para preview no formulário)
 */
export const generateRandomAvatarUrl = (): string => {
  const allAvatars = [...AVATARS.femininos, ...AVATARS.masculinos];
  const randomIndex = Math.floor(Math.random() * allAvatars.length);
  return `/Avatar/${allAvatars[randomIndex]}`;
};

/**
 * Lista todos os avatares disponíveis para seleção manual
 */
export const getAllAvatars = () => {
  return {
    femininos: AVATARS.femininos.map(avatar => `/Avatar/${avatar}`),
    masculinos: AVATARS.masculinos.map(avatar => `/Avatar/${avatar}`),
    todos: [...AVATARS.femininos, ...AVATARS.masculinos].map(avatar => `/Avatar/${avatar}`)
  };
};

/**
 * Valida se uma URL de avatar é válida
 */
export const isValidAvatarUrl = (url: string): boolean => {
  if (!url) return false;
  
  const allAvatars = [...AVATARS.femininos, ...AVATARS.masculinos];
  const avatarName = url.split('/').pop();
  
  return allAvatars.includes(avatarName || '');
};