import { slugify } from './text'

/**
 * Nome de usuário: 3 a 24 caracteres; letras minúsculas, números, "_" e ".";
 * começa e termina com letra ou número.
 */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]{1,22})[a-z0-9]$/

export const USERNAME_RULE_MESSAGE =
  'Use de 3 a 24 caracteres: letras minúsculas, números, "_" ou ".", começando e terminando com letra ou número.'

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value)
}

/** Sugere um nome de usuário único a partir do nome da pessoa. */
export function suggestUsername(name: string, taken: ReadonlySet<string>): string {
  let base = slugify(name, '_')
    .slice(0, 20)
    .replace(/^_+|_+$/g, '')
  if (base.length < 3) base = `${base}nexa`.slice(0, 20).padEnd(3, 'x')
  if (!taken.has(base)) return base
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${base.slice(0, 24 - String(suffix).length - 1)}_${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base.slice(0, 12)}_${Date.now().toString(36)}`
}
