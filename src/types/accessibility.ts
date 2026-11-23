import type { GeoPoint, ID, IconKey, ISODate } from './common'

/**
 * ACESSIBILIDADE E MOBILIDADE
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursos de acessibilidade de locais (estabelecimentos, serviços e eventos),
 * transporte acessível e pontos de atenção no caminho (barreiras e apoios).
 * Na base demonstrativa, todos os registros são fictícios.
 */

// ── Recursos de um local ──

export type AccessibilityFeature =
  | 'step_free'
  | 'ramp'
  | 'elevator'
  | 'wide_doors'
  | 'accessible_restroom'
  | 'accessible_parking'
  | 'tactile_floor'
  | 'braille'
  | 'audio_description'
  | 'libras'
  | 'priority_service'
  | 'quiet_space'

export const ACCESSIBILITY_FEATURE_LABEL: Record<AccessibilityFeature, string> = {
  step_free: 'Entrada sem degraus',
  ramp: 'Rampa de acesso',
  elevator: 'Elevador',
  wide_doors: 'Portas e corredores largos',
  accessible_restroom: 'Banheiro acessível',
  accessible_parking: 'Vaga reservada',
  tactile_floor: 'Piso tátil',
  braille: 'Informações em braille',
  audio_description: 'Audiodescrição',
  libras: 'Atendimento em Libras',
  priority_service: 'Atendimento prioritário',
  quiet_space: 'Espaço calmo',
}

/** Ordem de exibição (mobilidade → visão → audição → atendimento). */
export const ACCESSIBILITY_FEATURES = Object.keys(
  ACCESSIBILITY_FEATURE_LABEL,
) as AccessibilityFeature[]

// ── Pontos de atenção no caminho ──

/** Barreiras: dificultam ou impedem a passagem. */
export type BarrierKind =
  'stairs' | 'steps' | 'broken_sidewalk' | 'obstacle' | 'steep_slope' | 'unsafe_crossing'

/** Apoios: recursos que ajudam no deslocamento. */
export type SupportKind =
  | 'ramp'
  | 'elevator'
  | 'audio_signal'
  | 'tactile_paving'
  | 'accessible_restroom'
  | 'accessible_parking'

export type AccessPointKind = BarrierKind | SupportKind

export const BARRIER_KINDS: BarrierKind[] = [
  'stairs',
  'steps',
  'broken_sidewalk',
  'obstacle',
  'steep_slope',
  'unsafe_crossing',
]

export const SUPPORT_KINDS: SupportKind[] = [
  'ramp',
  'elevator',
  'audio_signal',
  'tactile_paving',
  'accessible_restroom',
  'accessible_parking',
]

export const ACCESS_POINT_KIND_LABEL: Record<AccessPointKind, string> = {
  stairs: 'Escadaria',
  steps: 'Degraus',
  broken_sidewalk: 'Calçada danificada',
  obstacle: 'Obstáculo na calçada',
  steep_slope: 'Ladeira íngreme',
  unsafe_crossing: 'Travessia sem sinal sonoro',
  ramp: 'Rampa',
  elevator: 'Elevador',
  audio_signal: 'Semáforo sonoro',
  tactile_paving: 'Piso tátil',
  accessible_restroom: 'Banheiro acessível',
  accessible_parking: 'Vaga reservada',
}

export const ACCESS_POINT_ICON: Record<AccessPointKind, IconKey> = {
  stairs: 'stairs',
  steps: 'stairs',
  broken_sidewalk: 'pothole',
  obstacle: 'alert',
  steep_slope: 'slope',
  unsafe_crossing: 'footprints',
  ramp: 'ramp',
  elevator: 'elevator',
  audio_signal: 'audio',
  tactile_paving: 'footprints',
  accessible_restroom: 'restroom',
  accessible_parking: 'parking',
}

export function isBarrierKind(kind: AccessPointKind): kind is BarrierKind {
  return (BARRIER_KINDS as AccessPointKind[]).includes(kind)
}

/** Quem mais precisa saber do ponto. */
export type AccessAudience = 'blind' | 'low_vision' | 'wheelchair' | 'reduced_mobility' | 'deaf'

export const ACCESS_AUDIENCE_LABEL: Record<AccessAudience, string> = {
  blind: 'Pessoas cegas',
  low_vision: 'Baixa visão',
  wheelchair: 'Cadeira de rodas',
  reduced_mobility: 'Mobilidade reduzida',
  deaf: 'Pessoas surdas',
}

export interface AccessPoint {
  id: ID
  kind: AccessPointKind
  title: string
  description: string
  /** Referência textual do local (ex.: "Rua das Acácias, esquina com a praça"). */
  addressHint: string
  neighborhoodId: ID
  location: GeoPoint
  /** Caminho alternativo sugerido (apenas barreiras). */
  alternative?: string
  /** Públicos para os quais o ponto é mais relevante. */
  audiences: AccessAudience[]
  /** Última conferência do registro. */
  checkedAt: ISODate
  /** Registro fictício da base demonstrativa. */
  isDemo: boolean
}

export interface AccessPointView extends AccessPoint {
  neighborhoodName: string
  /** `barrier` = dificulta a passagem; `support` = ajuda no deslocamento. */
  nature: 'barrier' | 'support'
  /** Distância até o ponto de referência do usuário, em metros. */
  distanceMeters: number
}

// ── Transporte acessível ──

export type TransitFeature =
  | 'lift'
  | 'low_floor'
  | 'wheelchair_space'
  | 'audio_announcements'
  | 'visual_display'
  | 'priority_seats'

export const TRANSIT_FEATURE_LABEL: Record<TransitFeature, string> = {
  lift: 'Elevador para cadeira de rodas',
  low_floor: 'Piso baixo',
  wheelchair_space: 'Espaço para cadeira de rodas',
  audio_announcements: 'Aviso sonoro das paradas',
  visual_display: 'Painel com a próxima parada',
  priority_seats: 'Assentos preferenciais',
}

export const TRANSIT_FEATURES = Object.keys(TRANSIT_FEATURE_LABEL) as TransitFeature[]

/** Quanto da frota da linha é acessível. */
export type FleetAccessibility = 'all' | 'partial' | 'none'

export const FLEET_ACCESSIBILITY_LABEL: Record<FleetAccessibility, string> = {
  all: 'Todos os ônibus acessíveis',
  partial: 'Parte dos ônibus acessível',
  none: 'Sem ônibus acessíveis',
}

export type StopFeature = 'shelter' | 'bench' | 'tactile_paving' | 'level_boarding' | 'audio_info'

export const STOP_FEATURE_LABEL: Record<StopFeature, string> = {
  shelter: 'Abrigo coberto',
  bench: 'Banco',
  tactile_paving: 'Piso tátil',
  level_boarding: 'Embarque no nível da calçada',
  audio_info: 'Informação sonora',
}

export interface TransitStop {
  id: ID
  name: string
  addressHint: string
  neighborhoodId: ID
  location: GeoPoint
  features: StopFeature[]
}

export interface TransitLine {
  id: ID
  /** Número exibido no letreiro (ex.: "101"). */
  code: string
  name: string
  /** Paradas em ordem, do ponto inicial ao final. */
  stopIds: ID[]
  fleet: FleetAccessibility
  features: TransitFeature[]
  /** Intervalo entre partidas, em minutos. */
  frequencyMinutes: number
  /** Primeira e última partida do dia, no formato "HH:mm". */
  firstDeparture: string
  lastDeparture: string
  /** Observação para quem precisa de acessibilidade. */
  note?: string
  isDemo: boolean
}

export interface TransitLineView extends TransitLine {
  stops: Array<TransitStop & { neighborhoodName: string }>
  /** Bairros atendidos, na ordem do trajeto e sem repetição. */
  neighborhoodNames: string[]
  /** Próximas partidas de hoje ("HH:mm"); vazio quando a operação já encerrou. */
  nextDepartures: string[]
  /** A linha tem pelo menos parte da frota acessível. */
  accessible: boolean
}

export interface TransitStopView extends TransitStop {
  neighborhoodName: string
  /** Linhas que passam pela parada. */
  lines: Array<{ id: ID; code: string; name: string; accessible: boolean }>
  distanceMeters: number
}
