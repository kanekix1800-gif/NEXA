/// <reference types="vite-plugin-pwa/client" />

/** Folhas de estilo carregadas sob demanda (ex.: fontes de acessibilidade). */
declare module '*.css'

/** Variáveis de ambiente públicas do NEXA (ver `.env.example`). */
interface ImportMetaEnv {
  readonly VITE_AI_API_URL?: string
  readonly VITE_MAP_CENTER_LAT?: string
  readonly VITE_MAP_CENTER_LNG?: string
  readonly VITE_CITY_NAME?: string
  readonly VITE_DEMO_LATENCY_MS?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
