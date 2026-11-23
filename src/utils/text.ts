/** Normaliza texto para buscas: minúsculas, sem acentos e sem espaços duplicados. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Verifica se TODAS as palavras da busca aparecem em algum dos campos informados
 * (ignorando acentos e maiúsculas). Busca vazia sempre corresponde.
 */
export function matchesSearch(
  query: string | undefined,
  ...fields: Array<string | undefined | null>
): boolean {
  const normalizedQuery = normalizeText(query ?? '')
  if (normalizedQuery === '') return true
  const haystack = normalizeText(fields.filter(Boolean).join(' '))
  return normalizedQuery.split(' ').every((term) => haystack.includes(term))
}

/** Corta o texto no limite informado, sem quebrar palavras, adicionando reticências. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const slice = value.slice(0, maxLength - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

/** Iniciais de um nome (até 2 letras), para avatares de reserva. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/** Primeiro nome, para saudações ("Olá, Antonio!"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/** Escolhe singular/plural: `pluralize(2, 'apoio', 'apoios')` → "2 apoios". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Converte um texto em "slug" para nomes de usuário (ex.: "Ana Costa" → "ana_costa"). */
export function slugify(value: string, separator = '_'): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '')
}
