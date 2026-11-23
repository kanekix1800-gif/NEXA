import type { ColorKey, ID, ISODate, IconKey, IllustrationKey } from './common'
import type { DemandStatus } from './demands'
import type { AvatarSpec, PublicProfile } from './user'

/** Categorias de publicação do feed comunitário. */
export type PostCategory = 'discussion' | 'event' | 'demand' | 'social' | 'commerce'

export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  discussion: 'Discussões',
  event: 'Eventos',
  demand: 'Demandas',
  social: 'Iniciativas sociais',
  commerce: 'Comércio local',
}

/** Situação de moderação de um conteúdo. `hidden` = ocultado pela administração. */
export type ModerationStatus = 'visible' | 'hidden'

/** Publicação do feed. */
export interface Post {
  id: ID
  authorId: ID
  /** Preenchido quando a publicação é feita em nome de uma instituição. */
  institutionId?: ID
  /** Preenchido quando a publicação divulga um estabelecimento. */
  businessId?: ID
  category: PostCategory
  content: string
  /** Imagem enviada pelo usuário (data URL já comprimida). */
  imageUrl?: string
  /** Ilustração da biblioteca NEXA (usada nos dados demonstrativos). */
  illustration?: IllustrationKey
  neighborhoodId: ID
  /** Demanda relacionada (uma demanda registrada também aparece no feed). */
  linkedDemandId?: ID
  /** Evento relacionado (um evento criado também aparece no feed). */
  linkedEventId?: ID
  /** IDs dos usuários que curtiram. */
  likedBy: ID[]
  moderation: ModerationStatus
  createdAt: ISODate
}

/** Comentário em uma publicação ou em uma demanda. */
export interface Comment {
  id: ID
  targetType: 'post' | 'demand'
  targetId: ID
  authorId: ID
  content: string
  moderation: ModerationStatus
  createdAt: ISODate
}

export type ReportReason = 'spam' | 'offensive' | 'misinformation' | 'privacy' | 'other'

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  spam: 'Spam ou propaganda enganosa',
  offensive: 'Conteúdo ofensivo ou discurso de ódio',
  misinformation: 'Informação falsa',
  privacy: 'Exposição de dados pessoais',
  other: 'Outro motivo',
}

export type ReportStatus = 'open' | 'dismissed' | 'actioned'

/** Denúncia de conteúdo enviada por um usuário para revisão da administração. */
export interface ContentReport {
  id: ID
  targetType: 'post' | 'comment'
  targetId: ID
  reporterId: ID
  reason: ReportReason
  details?: string
  status: ReportStatus
  createdAt: ISODate
  resolvedAt?: ISODate
  resolvedBy?: ID
}

// ── Modelos de visualização (dados já relacionados, prontos para a interface) ──

/** Imagem de quem assina um conteúdo: pessoa, instituição ou estabelecimento. */
export type EntityAvatar =
  | { kind: 'user'; avatar: AvatarSpec; photoUrl?: string }
  | { kind: 'institution'; icon: IconKey; color: ColorKey }
  | { kind: 'business'; coverUrl?: string; illustration?: IllustrationKey }

/** Quem assina a publicação na interface. */
export interface PostByline {
  kind: 'user' | 'institution' | 'business'
  /** Nome exibido (pessoa, instituição ou estabelecimento). */
  name: string
  /** Rota do perfil/página de quem publicou, quando existir. */
  to?: string
  avatar: EntityAvatar
}

/** A lista de quem curtiu não é exposta: a interface recebe apenas contagem e estado do usuário. */
export interface PostView extends Omit<Post, 'likedBy'> {
  author: PublicProfile
  byline: PostByline
  neighborhoodName: string
  likeCount: number
  commentCount: number
  likedByMe: boolean
  isMine: boolean
  linkedDemand?: { id: ID; title: string; protocol: string; status: DemandStatus }
  linkedEvent?: { id: ID; title: string; startsAt: ISODate }
}

export interface CommentView extends Comment {
  author: PublicProfile
  isMine: boolean
}

export interface ReportView extends ContentReport {
  reporter: PublicProfile
  /** Trecho do conteúdo denunciado (ou aviso de que foi removido). */
  excerpt: string
  /** Autor do conteúdo denunciado, quando ainda existir. */
  targetAuthor?: PublicProfile
  /** Publicação relacionada (a própria, ou a que contém o comentário). */
  postId?: ID
  targetModeration?: ModerationStatus
}
