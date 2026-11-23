/**
 * Relógio da aplicação. Centralizar o "agora" permite testes determinísticos:
 * regras que dependem de data (evento passado, loja aberta, períodos) usam `now()`.
 */

type ClockSource = () => Date

const systemClock: ClockSource = () => new Date()

let source: ClockSource = systemClock

/** Data/hora atual segundo o relógio da aplicação. */
export function now(): Date {
  return source()
}

/** Data/hora atual em ISO 8601. */
export function nowISO(): string {
  return source().toISOString()
}

/** Substitui o relógio (uso em testes). Chame `resetClock()` ao final. */
export function setClock(value: Date | ClockSource): void {
  if (typeof value === 'function') {
    source = value
  } else {
    const fixed = value.getTime()
    source = () => new Date(fixed)
  }
}

export function resetClock(): void {
  source = systemClock
}
