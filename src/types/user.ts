import type { ID, ISODate } from './common'

/** Tipos de conta do NEXA. */
export type UserRole = 'resident' | 'merchant' | 'institution' | 'admin'

/** Situação da conta (controlada pela administração). */
export type UserStatus = 'active' | 'suspended'

/**
 * Especificação de um avatar ilustrado (gerado em SVG, sem fotos de pessoas reais).
 * Renderizado por `AvatarIllustration` em `src/components/brand`.
 */
export interface AvatarSpec {
  skin: 'light' | 'tan' | 'medium' | 'brown' | 'dark'
  hair: 'short' | 'buzz' | 'curly' | 'afro' | 'long' | 'bob' | 'bun' | 'wavy' | 'bald'
  hairColor: 'black' | 'brown' | 'chestnut' | 'blonde' | 'gray' | 'red'
  facialHair?: 'beard' | 'mustache'
  accessory?: 'glasses' | 'earrings'
  top: 'green' | 'orange' | 'cream' | 'teal' | 'terracotta' | 'navy'
  background: 'mint' | 'sand' | 'peach' | 'sage' | 'sky'
}

/** Conta de usuário completa. Visível apenas para o próprio usuário e para a administração. */
export interface User {
  id: ID
  name: string
  /** Nome de usuário público, sem o "@". */
  username: string
  email: string
  role: UserRole
  neighborhoodId: ID
  bio?: string
  avatar: AvatarSpec
  /** Foto enviada pelo usuário (data URL). Tem precedência sobre o avatar ilustrado. */
  photoUrl?: string
  /** Comerciante: estabelecimento vinculado à conta (quando já cadastrado). */
  businessId?: ID
  /** Conta institucional: instituição representada. */
  institutionId?: ID
  status: UserStatus
  /** Conta de acesso rápido do modo demonstração (não pode ser excluída). */
  isDemoAccount: boolean
  /** Momento do aceite dos termos de uso e do aviso de privacidade. */
  termsAcceptedAt?: ISODate
  createdAt: ISODate
}

/**
 * Perfil público de um usuário — o que OUTRAS pessoas podem ver.
 * Nunca inclui e-mail nem dados de contato (privacidade/LGPD).
 */
export interface PublicProfile {
  id: ID
  name: string
  username: string
  role: UserRole
  neighborhoodId: ID
  neighborhoodName: string
  bio?: string
  avatar: AvatarSpec
  photoUrl?: string
}

/** Credencial armazenada: somente derivação da senha (PBKDF2), nunca a senha em texto puro. */
export interface Credential {
  userId: ID
  algorithm: 'PBKDF2-SHA256'
  iterations: number
  /** Sal aleatório em base64. */
  salt: string
  /** Derivação da senha em base64. */
  hash: string
  updatedAt: ISODate
}

/** Sessão local do modo demonstração. */
export interface Session {
  userId: ID
  startedAt: ISODate
}

export type ConsentState = 'unset' | 'granted' | 'denied'

/** Preferências do usuário (por conta). */
export interface UserSettings {
  userId: ID
  /** Consentimento para uso da geolocalização do dispositivo. */
  locationConsent: ConsentState
  /** Preferência de movimento: segue o sistema, sempre reduzido ou completo. */
  motion: 'system' | 'reduced' | 'full'
  /** Categorias de notificação habilitadas. */
  notifications: {
    community: boolean
    demands: boolean
    events: boolean
    commerce: boolean
    institutions: boolean
    system: boolean
  }
  updatedAt: ISODate
}

/** Rótulos em português para cada tipo de conta. */
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  resident: 'Morador',
  merchant: 'Comerciante',
  institution: 'Instituição',
  admin: 'Administrador',
}
