import type { ColorKey, GeoPoint, ID, ISODate, IconKey, IllustrationKey } from './common'

export type InstitutionCategory =
  | 'city_hall'
  | 'municipal_department'
  | 'ngo'
  | 'community_association'
  | 'education'
  | 'business_support'

export const INSTITUTION_CATEGORY_LABEL: Record<InstitutionCategory, string> = {
  city_hall: 'Prefeituras',
  municipal_department: 'Secretarias municipais',
  ngo: 'ONGs',
  community_association: 'Associações comunitárias',
  education: 'Instituições de ensino',
  business_support: 'Apoio empresarial',
}

/**
 * Instituição do diretório.
 * IMPORTANTE: os registros demonstrativos NÃO representam parceria oficial —
 * usamos ícones genéricos (nunca logotipos) e sinalizamos isso na interface.
 */
export interface Institution {
  id: ID
  name: string
  category: InstitutionCategory
  /** Frase curta exibida nas listagens (ex.: "Serviços e informações"). */
  tagline: string
  description: string
  /** Áreas de atuação. */
  areas: string[]
  /** Serviços oferecidos à comunidade. */
  services: string[]
  phone?: string
  email?: string
  website?: string
  address?: string
  neighborhoodId?: ID
  location?: GeoPoint
  icon: IconKey
  color: ColorKey
  /** Instituições não verificadas ficam fora do diretório público até revisão da administração. */
  verified: boolean
  /** Registro de exemplo do modo demonstração (sem vínculo oficial). */
  isDemo: boolean
  createdAt: ISODate
}

/** Iniciativa/programa divulgado por uma instituição. */
export interface Initiative {
  id: ID
  institutionId: ID
  title: string
  description: string
  illustration?: IllustrationKey
  imageUrl?: string
  status: 'active' | 'finished'
  /** Publicação do feed gerada ao divulgar a iniciativa. */
  postId?: ID
  createdBy: ID
  createdAt: ISODate
}

export type PublicServiceKind =
  | 'health'
  | 'education'
  | 'social'
  | 'safety'
  | 'transport'
  | 'leisure'
  | 'environment'
  | 'citizenship'

export const PUBLIC_SERVICE_KIND_LABEL: Record<PublicServiceKind, string> = {
  health: 'Saúde',
  education: 'Educação',
  social: 'Assistência social',
  safety: 'Segurança',
  transport: 'Transporte',
  leisure: 'Lazer e esporte',
  environment: 'Meio ambiente',
  citizenship: 'Cidadania',
}

/** Serviço/equipamento público de referência (ex.: UBS, escola, CRAS). Dados demonstrativos. */
export interface PublicService {
  id: ID
  name: string
  kind: PublicServiceKind
  description: string
  address: string
  neighborhoodId: ID
  location: GeoPoint
  /** Horário de atendimento em texto livre (ex.: "Seg a sex, 7h às 17h"). */
  hours: string
  phone?: string
  /** Instituição responsável pelo serviço, quando houver. */
  institutionId?: ID
  icon: IconKey
  color: ColorKey
}

// ── Modelos de visualização ──

export interface InstitutionView extends Institution {
  neighborhoodName?: string
  /** Total de demandas encaminhadas à instituição. */
  demandCount: number
  /** Demandas encaminhadas ainda em aberto. */
  openDemandCount: number
  initiativeCount: number
  /** O usuário atual representa esta instituição. */
  isMine: boolean
}

export interface InitiativeView extends Initiative {
  institutionName: string
  institutionIcon: IconKey
  institutionColor: ColorKey
  isMine: boolean
}

export interface PublicServiceView extends PublicService {
  neighborhoodName: string
  institutionName?: string
  distanceMeters: number | null
}
