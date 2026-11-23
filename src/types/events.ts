import type { GeoPoint, ID, ISODate, IllustrationKey } from './common'
import type { EntityAvatar } from './community'
import type { Category } from './demands'
import type { PublicProfile } from './user'

/** Quem organiza o evento. O nome é "fotografado" na criação. */
export interface EventOrganizer {
  kind: 'user' | 'institution' | 'business'
  id: ID
  name: string
}

/** Evento comunitário. */
export interface CommunityEvent {
  id: ID
  title: string
  description: string
  categoryId: ID
  /** Ilustração de capa (biblioteca NEXA). */
  illustration?: IllustrationKey
  /** Imagem de capa enviada (data URL). Tem precedência sobre a ilustração. */
  imageUrl?: string
  startsAt: ISODate
  endsAt: ISODate
  /** Nome do local (ex.: "UBS Central"). */
  venue: string
  address?: string
  neighborhoodId: ID
  location?: GeoPoint
  organizer: EventOrganizer
  /** IDs dos usuários com presença confirmada. */
  attendeeIds: ID[]
  /** Limite de vagas (opcional). */
  capacity?: number
  status: 'scheduled' | 'cancelled'
  createdBy: ID
  createdAt: ISODate
}

// ── Modelo de visualização ──

/** A lista de participantes não é exposta: a interface recebe contagem, estado e uma prévia. */
export interface EventView extends Omit<CommunityEvent, 'attendeeIds'> {
  /** Como exibir o organizador (nome, rota e imagem). */
  organizerView: { name: string; to?: string; avatar: EntityAvatar }
  category: Category
  neighborhoodName: string
  attendeeCount: number
  attendingByMe: boolean
  /** O evento já terminou. */
  isPast: boolean
  /** Não há mais vagas. */
  isFull: boolean
  /** O usuário atual criou o evento. */
  isMine: boolean
  /** O usuário atual pode editar/cancelar (criador ou administração). */
  canManage: boolean
  /** Primeiros participantes, para exibir avatares. */
  attendeesPreview: PublicProfile[]
}
