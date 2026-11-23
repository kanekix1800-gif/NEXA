import type { AccessPoint, TransitLine, TransitStop } from './accessibility'
import type { AIConversation } from './ai'
import type { ISODate, Neighborhood } from './common'
import type { Business, Favorite, Product, Review, Sale, Transaction } from './commerce'
import type { Comment, ContentReport, Post } from './community'
import type { AppNotification, NewsArticle } from './content'
import type { Category, Demand } from './demands'
import type { CommunityEvent } from './events'
import type { Initiative, Institution, PublicService } from './institutions'
import type { Credential, User, UserSettings } from './user'

/**
 * Versão do esquema local. Ao mudar o formato dos dados, incremente e descreva em
 * `repositories/local/upgrade.ts` como levar uma base antiga para a versão nova
 * (assim o que a pessoa criou no aparelho é preservado).
 */
export const DATABASE_SCHEMA_VERSION = 2

/** Solicitação de redefinição de senha (simulada no modo demonstração). */
export interface PasswordResetToken {
  token: string
  userId: string
  expiresAt: ISODate
}

export interface DatabaseMeta {
  schemaVersion: number
  /** Momento em que a base demonstrativa foi gerada. */
  seededAt: ISODate
  /**
   * Última vez em que as datas foram "trazidas para hoje". A base demonstrativa é
   * mantida sempre atual: ao abrir o app em outro dia, todas as datas avançam juntas.
   */
  rebasedAt: ISODate
  /** Sequência usada para gerar protocolos de demandas (NX-AAAA-NNNN). */
  demandSequence: number
}

/**
 * Banco de dados local do modo demonstração.
 * Cada chave é uma "tabela": a estrutura já tem o formato de um banco relacional
 * (por exemplo, Supabase/PostgreSQL), o que permite migrar sem reescrever a interface.
 * O esquema SQL ainda não foi escrito — ver "Próximos passos" no README.
 */
export interface Database {
  meta: DatabaseMeta
  neighborhoods: Neighborhood[]
  users: User[]
  credentials: Credential[]
  passwordResets: PasswordResetToken[]
  userSettings: UserSettings[]
  categories: Category[]
  posts: Post[]
  comments: Comment[]
  reports: ContentReport[]
  demands: Demand[]
  businesses: Business[]
  reviews: Review[]
  favorites: Favorite[]
  products: Product[]
  sales: Sale[]
  transactions: Transaction[]
  institutions: Institution[]
  initiatives: Initiative[]
  publicServices: PublicService[]
  events: CommunityEvent[]
  notifications: AppNotification[]
  news: NewsArticle[]
  aiConversations: AIConversation[]
  transitLines: TransitLine[]
  transitStops: TransitStop[]
  accessPoints: AccessPoint[]
}

/** Nome de uma coleção ("tabela") do banco local. */
export type CollectionName = Exclude<keyof Database, 'meta'>

export const COLLECTION_NAMES: CollectionName[] = [
  'neighborhoods',
  'users',
  'credentials',
  'passwordResets',
  'userSettings',
  'categories',
  'posts',
  'comments',
  'reports',
  'demands',
  'businesses',
  'reviews',
  'favorites',
  'products',
  'sales',
  'transactions',
  'institutions',
  'initiatives',
  'publicServices',
  'events',
  'notifications',
  'news',
  'aiConversations',
  'transitLines',
  'transitStops',
  'accessPoints',
]
