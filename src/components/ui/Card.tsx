import { FlaskConical } from 'lucide-react'
import type { ElementType, HTMLAttributes, ReactNode } from 'react'

import { getColorStyle } from '@/components/icons/colors'
import type { ColorKey } from '@/types'
import { cn } from '@/utils/cn'

const PADDING = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' } as const
const TONES = {
  surface: 'bg-surface shadow-card',
  soft: 'bg-nexa-50',
  cream: 'bg-cream-50 border border-line',
  brand: 'bg-nexa-900 text-white',
  outline: 'bg-surface border border-line',
} as const

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  padding?: keyof typeof PADDING
  tone?: keyof typeof TONES
  /** Aplica estados de toque/hover (use em cartões clicáveis). */
  interactive?: boolean
}

/** Cartão branco arredondado — o bloco básico das telas do NEXA. */
export function Card({
  as: Tag = 'div',
  padding = 'md',
  tone = 'surface',
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card',
        TONES[tone],
        PADDING[padding],
        interactive &&
          'hover:shadow-raised transition-[box-shadow,transform] duration-150 active:scale-[0.99]',
        className,
      )}
      {...props}
    />
  )
}

interface BadgeProps {
  /** Cor nomeada, `brand` (verde suave) ou `neutral` (cinza). */
  color?: ColorKey | 'brand' | 'neutral'
  variant?: 'soft' | 'solid' | 'outline'
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/** Selo curto para status, categorias e contagens. */
export function Badge({
  color = 'brand',
  variant = 'soft',
  size = 'sm',
  icon,
  children,
  className,
}: BadgeProps) {
  const style =
    color === 'brand'
      ? {
          soft: 'bg-nexa-100 text-nexa-900',
          solid: 'bg-nexa-900 text-white',
          text: 'text-nexa-900',
        }
      : color === 'neutral'
        ? { soft: 'bg-ink-100 text-ink-600', solid: 'bg-ink-700 text-white', text: 'text-ink-600' }
        : getColorStyle(color)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2.5 text-[0.6875rem]' : 'h-7 px-3 text-xs',
        variant === 'soft' && style.soft,
        variant === 'solid' && style.solid,
        variant === 'outline' && cn('border-line-strong border bg-transparent', style.text),
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Selo discreto que identifica conteúdo ou funcionamento demonstrativo. */
export function DemoBadge({
  label = 'Demonstração',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'bg-cream-200 text-ink-700 inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-bold whitespace-nowrap',
        className,
      )}
    >
      <FlaskConical className="text-sun-600 size-3" aria-hidden />
      {label}
    </span>
  )
}

/** Contador sobreposto (ex.: notificações não lidas). Não renderiza quando zero. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'bg-sun-400 text-ink-900 ring-surface inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-extrabold ring-2',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
