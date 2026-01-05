// Tipos de Autenticação EDP - Conforme backend Go
export interface User {
  id: string;
  nome: string;
  email: string;
  id_usuario_edp: string;
  eclusa: string;
  url_avatar: string;
  cargo: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

export interface LoginRequest {
  username: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expires: string;
}

export interface UserPermissions {
  can_view_users: boolean;
  can_create_users: boolean;
  can_update_users: boolean;
  can_delete_users: boolean;
  can_block_users: boolean;
  can_manage_admin: boolean;
}

export interface UserCreateRequest {
  nome: string;
  email: string;
  senha: string;
  id_usuario_edp: string;
  eclusa: string;
  url_avatar?: string;
  cargo: string;
}

export interface UserUpdateRequest {
  nome?: string;
  email?: string;
  eclusa?: string;
  url_avatar?: string;
  cargo?: string;
}

export interface ChangePasswordRequest {
  nova_senha: string;
}

export interface ApiError {
  error: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: UserPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Constantes
export const VALID_ECLUSAS = [
  'RÉGUA',
  'POCINHO', 
  'VALEIRA',
  'CRESTUMA',
  'CARRAPATELO'
] as const;

export const VALID_CARGOS = [
  'Admin',
  'Gerente', 
  'Supervisor',
  'Técnico',
  'Operador'
] as const;

export const VALID_STATUS = [
  'Ativo',
  'Bloqueado'
] as const;

export type Eclusa = typeof VALID_ECLUSAS[number];
export type Cargo = typeof VALID_CARGOS[number];
export type Status = typeof VALID_STATUS[number];