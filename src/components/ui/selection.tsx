import type { KeyboardEvent, ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  /** Contagem opcional exibida ao lado do rótulo. */
  count?: number
}

interface ChoiceProps<T extends string> {
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Rótulo acessível do grupo (ex.: "Filtrar publicações"). */
  ariaLabel: string
  className?: string
}

/** Navegação por setas dentro de um grupo de opções (padrão radiogroup). */
function handleArrows<T extends string>(
  event: KeyboardEvent,
  options: ChoiceOption<T>[],
  value: T,
  onChange: (value: T) => void,
) {
  const delta =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (delta === 0) return
  event.preventDefault()
  const index = options.findIndex((option) => option.value === value)
  const next = options[(index + delta + options.length) % options.length]
  if (!next) return
  onChange(next.value)
  const group = event.currentTarget
  requestAnimationFrame(() => {
    group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  })
}

/**
 * Filtros em pílulas com rolagem horizontal — como "Todas · Discussões · Eventos"
 * na tela Comunidade. A opção ativa fica em verde profundo.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ChoiceProps<T>) {
  return (
    <div
      role="radiogroup"
      tabIndex={-1}
      aria-label={ariaLabel}
      onKeyDown={(event) => handleArrows(event, options, value, onChange)}
      className={cn('no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150',
              active
                ? 'border-nexa-900 bg-nexa-900 text-white'
                : 'border-line bg-surface text-ink-700 hover:bg-cream-50',
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined && (
              <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-ink-400')}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Controle segmentado — como "Próximos | Realizados" na tela Eventos. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ChoiceProps<T>) {
  return (
    <div
      role="radiogroup"
      tabIndex={-1}
      aria-label={ariaLabel}
      onKeyDown={(event) => handleArrows(event, options, value, onChange)}
      className={cn('bg-nexa-50 inline-flex rounded-full p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-bold whitespace-nowrap transition-colors duration-200',
              active ? 'bg-nexa-900 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
