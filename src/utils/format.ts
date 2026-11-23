import type { Cents } from '@/types'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('pt-BR')

const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Normaliza espaços especiais do Intl (NBSP) para espaço comum, facilitando testes e buscas. */
function tidy(value: string): string {
  return value.replace(/[  ]/g, ' ')
}

/** Formata centavos como moeda: `formatCurrency(123456)` → "R$ 1.234,56". */
export function formatCurrency(cents: Cents): string {
  return tidy(currencyFormatter.format(cents / 100))
}

/** Moeda compacta para eixos de gráficos: `formatCurrencyCompact(1234500)` → "R$ 12,3 mil". */
export function formatCurrencyCompact(cents: Cents): string {
  return tidy(compactCurrencyFormatter.format(cents / 100))
}

/** Número com separador de milhar: `formatNumber(12345)` → "12.345". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** Número compacto: `formatCompact(1250)` → "1,3 mil". */
export function formatCompact(value: number): string {
  return tidy(compactNumberFormatter.format(value))
}

/**
 * Variação percentual com sinal: `formatChange(0.125)` → "+12,5%".
 * `null` (sem base de comparação) → "—".
 */
export function formatChange(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—'
  const percent = ratio * 100
  const rounded = Math.abs(percent) >= 100 ? Math.round(percent) : Math.round(percent * 10) / 10
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${numberFormatter.format(Math.abs(rounded))}%`
}

/** Percentual simples: `formatPercent(0.42)` → "42%". */
export function formatPercent(ratio: number): string {
  return `${numberFormatter.format(Math.round(ratio * 100))}%`
}

/**
 * Distância amigável: 480 → "480 m", 1000 → "1 km", 1240 → "1,2 km".
 * Valores abaixo de 1 km são arredondados para dezenas de metros.
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return ''
  if (meters < 950) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10)
    return `${rounded} m`
  }
  const km = meters / 1000
  const value = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10
  return `${numberFormatter.format(value)} km`
}

/** Nota com uma casa decimal: `formatRating(4.8)` → "4,8". */
export function formatRating(rating: number | null): string {
  if (rating === null) return '—'
  return rating.toFixed(1).replace('.', ',')
}

/** Quantidade de estoque/venda sem zeros desnecessários: 2 → "2", 1.5 → "1,5". */
export function formatQuantity(value: number): string {
  return numberFormatter.format(Math.round(value * 1000) / 1000)
}

/** Formata telefone brasileiro com 10 ou 11 dígitos; devolve o original se não reconhecer. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

/**
 * Converte o texto digitado em um campo de valor para centavos.
 * Aceita "12", "12,5", "12,50", "1.234,56" e "R$ 12,50". Retorna `null` se inválido.
 */
export function parseCurrencyInput(value: string): Cents | null {
  const cleaned = value.replace(/[R$\s]/g, '')
  if (cleaned === '') return null
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

/** Centavos → texto para preencher um campo de valor: 1250 → "12,50". */
export function centsToInput(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}
