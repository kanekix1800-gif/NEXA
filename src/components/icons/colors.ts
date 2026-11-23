import type { ColorKey, DemandStatus, Urgency } from '@/types'

/**
 * Estilos das cores nomeadas (categorias, marcadores e gráficos).
 * As classes são escritas por extenso para que o Tailwind as detecte.
 */
export interface ColorStyle {
  /** Cor forte em hexadecimal (marcadores do mapa, gráficos, SVG). */
  hex: string
  /** Cor suave em hexadecimal (fundos em SVG/mapa). */
  softHex: string
  /** Fundo suave + texto forte (ícones em "pastilhas", selos). */
  soft: string
  /** Apenas a cor do texto/ícone. */
  text: string
  /** Fundo forte com texto claro. */
  solid: string
  /** Borda na cor suave. */
  border: string
}

export const COLOR_STYLES: Record<ColorKey, ColorStyle> = {
  green: {
    hex: '#0b6048',
    softHex: '#ddebdd',
    soft: 'bg-nexa-100 text-nexa-800',
    text: 'text-nexa-800',
    solid: 'bg-nexa-800 text-white',
    border: 'border-nexa-200',
  },
  orange: {
    hex: '#b96c0a',
    softHex: '#fde9c4',
    soft: 'bg-sun-100 text-sun-700',
    text: 'text-sun-700',
    solid: 'bg-sun-400 text-ink-900',
    border: 'border-sun-200',
  },
  terracotta: {
    hex: '#b5472f',
    softHex: '#f8e2da',
    soft: 'bg-terracotta-50 text-terracotta-600',
    text: 'text-terracotta-600',
    solid: 'bg-terracotta-600 text-white',
    border: 'border-terracotta-50',
  },
  teal: {
    hex: '#1f7078',
    softHex: '#dff0f1',
    soft: 'bg-teal-50 text-teal-600',
    text: 'text-teal-600',
    solid: 'bg-teal-600 text-white',
    border: 'border-teal-50',
  },
  blue: {
    hex: '#2f5d9b',
    softHex: '#e2eaf8',
    soft: 'bg-blue-50 text-blue-600',
    text: 'text-blue-600',
    solid: 'bg-blue-600 text-white',
    border: 'border-blue-50',
  },
  purple: {
    hex: '#6a4fa0',
    softHex: '#ebe5f6',
    soft: 'bg-purple-50 text-purple-600',
    text: 'text-purple-600',
    solid: 'bg-purple-600 text-white',
    border: 'border-purple-50',
  },
  pink: {
    hex: '#a8456f',
    softHex: '#f8e3ec',
    soft: 'bg-pink-50 text-pink-600',
    text: 'text-pink-600',
    solid: 'bg-pink-600 text-white',
    border: 'border-pink-50',
  },
  gold: {
    hex: '#7d6200',
    softHex: '#fbf1c9',
    soft: 'bg-gold-50 text-gold-700',
    text: 'text-gold-700',
    solid: 'bg-gold-700 text-white',
    border: 'border-gold-50',
  },
  gray: {
    hex: '#49544e',
    softHex: '#eceeeb',
    soft: 'bg-ink-100 text-ink-600',
    text: 'text-ink-600',
    solid: 'bg-ink-600 text-white',
    border: 'border-ink-200',
  },
}

export const COLOR_KEYS = Object.keys(COLOR_STYLES) as ColorKey[]

export const COLOR_LABEL: Record<ColorKey, string> = {
  green: 'Verde',
  orange: 'Laranja',
  terracotta: 'Terracota',
  teal: 'Verde-azulado',
  blue: 'Azul',
  purple: 'Roxo',
  pink: 'Rosa',
  gold: 'Dourado',
  gray: 'Cinza',
}

export function getColorStyle(key: ColorKey | undefined | null): ColorStyle {
  return (key && COLOR_STYLES[key]) || COLOR_STYLES.gray
}

/** Paleta ordenada para séries de gráficos (Recharts). */
export const CHART_COLORS = [
  '#0b6048',
  '#f2a333',
  '#1f7078',
  '#b5472f',
  '#2f5d9b',
  '#6a4fa0',
  '#a8456f',
  '#8b928d',
] as const

/** Cores semânticas de gráficos financeiros. */
export const CHART_SEMANTIC = {
  income: '#0b6048',
  expense: '#e08a14',
  profit: '#1f7078',
  grid: '#e9e4d8',
  axis: '#626a65',
} as const

/** Cor associada a cada status de demanda. */
export const DEMAND_STATUS_COLOR: Record<DemandStatus, ColorKey> = {
  registered: 'orange',
  in_review: 'blue',
  in_progress: 'purple',
  resolved: 'green',
  closed: 'gray',
}

/** Cor associada a cada grau de urgência. */
export const URGENCY_COLOR: Record<Urgency, ColorKey> = {
  low: 'teal',
  medium: 'orange',
  high: 'terracotta',
}
