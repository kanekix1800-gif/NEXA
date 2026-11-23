/**
 * Tipos básicos compartilhados por todo o domínio do NEXA.
 */

/** Identificador único de uma entidade. */
export type ID = string

/** Data/hora em ISO 8601 completo (resultado de `Date.prototype.toISOString`). */
export type ISODate = string

/** Valor monetário inteiro em centavos de real (evita erros de ponto flutuante). */
export type Cents = number

/** Coordenada geográfica (WGS84). */
export interface GeoPoint {
  lat: number
  lng: number
}

/** Intervalo de datas (inclusive) usado em filtros de período. */
export interface DateRange {
  from: ISODate
  to: ISODate
}

/** Bairro/região da cidade. O `center` é um ponto de referência APROXIMADO (nunca um endereço residencial). */
export interface Neighborhood {
  id: ID
  name: string
  center: GeoPoint
  /** Região da cidade (ex.: "Zona Norte"), usada para agrupar e buscar bairros. */
  zone?: string
}

/**
 * Chaves dos ícones disponíveis para dados (categorias, instituições, serviços…).
 * O mapeamento chave → componente fica em `src/components/icons/registry.ts`.
 * Mantemos chaves (strings) nos dados para que eles continuem serializáveis.
 */
export type IconKey =
  // demandas
  | 'pothole'
  | 'trash'
  | 'lightbulb'
  | 'bus'
  | 'accessibility'
  // acessibilidade e mobilidade
  | 'stairs'
  | 'slope'
  | 'ramp'
  | 'elevator'
  | 'audio'
  | 'footprints'
  | 'restroom'
  | 'parking'
  | 'droplets'
  | 'alert'
  | 'more'
  // comércio
  | 'utensils'
  | 'wrench'
  | 'shirt'
  | 'heart-pulse'
  | 'laptop'
  | 'basket'
  | 'store'
  | 'scissors'
  | 'paw'
  | 'pill'
  | 'croissant'
  // eventos
  | 'calendar'
  | 'handshake'
  | 'graduation'
  | 'music'
  | 'trophy'
  | 'heart-handshake'
  | 'sprout'
  | 'megaphone'
  | 'party'
  | 'tent'
  // instituições e serviços
  | 'landmark'
  | 'building'
  | 'hand-heart'
  | 'users'
  | 'school'
  | 'briefcase'
  | 'stethoscope'
  | 'book'
  | 'shield'
  | 'trees'
  | 'recycle'
  | 'dumbbell'
  // gerais
  | 'map-pin'
  | 'sparkles'
  | 'newspaper'
  | 'message'
  | 'star'
  | 'package'
  | 'receipt'
  | 'wallet'
  | 'chart'
  | 'bell'
  | 'settings'
  | 'info'

/**
 * Cores nomeadas para categorias, marcadores e gráficos.
 * O mapeamento cor → classes/hex fica em `src/components/icons/colors.ts`.
 */
export type ColorKey =
  'green' | 'orange' | 'terracotta' | 'teal' | 'blue' | 'purple' | 'pink' | 'gold' | 'gray'

/**
 * Ilustrações da biblioteca NEXA (SVG) usadas como capa em dados demonstrativos
 * e como alternativa quando o usuário não envia uma imagem.
 * A implementação fica em `src/components/brand/illustrations`.
 */
export type IllustrationKey =
  // cidade e marca
  | 'city-day'
  | 'city-sunset'
  | 'neighborhood'
  | 'square'
  // onboarding
  | 'onb-community'
  | 'onb-voice'
  | 'onb-commerce'
  | 'onb-ai'
  // comércio
  | 'bakery'
  | 'pharmacy'
  | 'market'
  | 'restaurant'
  | 'salon'
  | 'tech-repair'
  | 'clothing'
  | 'petshop'
  | 'storefront'
  // eventos e iniciativas
  | 'fair'
  | 'health'
  | 'donation'
  | 'workshop'
  | 'cleanup'
  | 'culture'
  | 'sports'
  | 'meeting'
  // notícias
  | 'bus-stop'
  | 'vaccination'
  | 'street-lights'
  // demandas
  | 'pothole'
  | 'trash'
  | 'dark-street'
  | 'bus'
  | 'accessibility'
  | 'sanitation'
  | 'infrastructure'
  | 'generic-demand'

/** Página de resultados genérica (reservada para paginação futura no Supabase). */
export interface Page<T> {
  items: T[]
  total: number
}
