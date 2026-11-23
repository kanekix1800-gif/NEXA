import type { GeoPoint } from '@/types'

/**
 * Configuração central do aplicativo, lida das variáveis de ambiente públicas (VITE_*).
 * Chaves privadas NUNCA entram aqui: o frontend só conhece a URL do backend da NEXA IA.
 */

const env = import.meta.env

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

/** Centro padrão do mapa: uma praça pública usada apenas como cenário de demonstração. */
const DEFAULT_MAP_CENTER: GeoPoint = { lat: -19.932, lng: -43.9381 }

/**
 * Origem dos dados. Hoje somente `local` (persistência no navegador).
 * A camada de repositórios foi desenhada para receber uma implementação `supabase`
 * sem mudanças na interface (ver `src/repositories/contracts.ts`).
 */
const dataSource = 'local' as 'local' | 'supabase'

const aiApiUrl = readString(env.VITE_AI_API_URL, '').replace(/\/+$/, '')

export const config = {
  appName: 'NEXA',
  tagline: 'Conexões que transformam realidades.',

  dataSource,

  /**
   * Roteamento por hash ("/#/rota"): o app é publicado como site estático em subcaminho
   * (GitHub Pages), onde não há servidor para redirecionar rotas internas ao index.html.
   */
  routerMode: 'hash' as const,

  /**
   * Modo demonstração: dados fictícios armazenados no próprio dispositivo,
   * autenticação local e status institucionais simulados.
   */
  isDemoMode: dataSource === 'local',

  ai: {
    /** URL do backend seguro da NEXA IA; `null` = assistente em modo demonstrativo. */
    apiUrl: aiApiUrl === '' ? null : aiApiUrl,
    /** Tempo máximo de espera por resposta do backend (ms). */
    timeoutMs: 45_000,
  },

  map: {
    center: {
      lat: readNumber(env.VITE_MAP_CENTER_LAT, DEFAULT_MAP_CENTER.lat),
      lng: readNumber(env.VITE_MAP_CENTER_LNG, DEFAULT_MAP_CENTER.lng),
    } satisfies GeoPoint,
    defaultZoom: 15,
    /** Raio (km) considerado "área de demonstração" em torno do centro. */
    areaRadiusKm: 6,
    cityName: readString(env.VITE_CITY_NAME, 'Cidade Modelo'),
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution:
      '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },

  /** Latência simulada dos repositórios locais (0 em testes automatizados). */
  demoLatencyMs: env.MODE === 'test' ? 0 : readNumber(env.VITE_DEMO_LATENCY_MS, 220),

  limits: {
    postMaxLength: 600,
    commentMaxLength: 400,
    demandTitleMaxLength: 90,
    demandDescriptionMaxLength: 1200,
    demandMaxPhotos: 3,
    reviewMaxLength: 500,
    bioMaxLength: 200,
    nameMaxLength: 80,
    businessNameMaxLength: 60,
    businessDescriptionMaxLength: 600,
    addressMaxLength: 140,
    productNameMaxLength: 60,
    noteMaxLength: 200,
    eventTitleMaxLength: 90,
    eventDescriptionMaxLength: 1500,
    aiQuestionMaxLength: 500,
    /** Lado máximo (px) das imagens enviadas, após compressão. */
    imageMaxSide: 1080,
    /** Tamanho máximo (bytes) aceito para o arquivo original. */
    imageMaxBytes: 12 * 1024 * 1024,
  },
} as const

export type AppConfig = typeof config
