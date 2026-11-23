import { ArrowDownRight, ArrowUpRight, Star, type LucideIcon } from 'lucide-react'
import { createElement, type ReactNode } from 'react'
import { Link } from 'react-router'

import { Illustration } from '@/components/brand/Illustration'
import { getColorStyle } from '@/components/icons/colors'
import { getIcon } from '@/components/icons/registry'
import type { ColorKey, IconKey, IllustrationKey, ISODate } from '@/types'
import { cn } from '@/utils/cn'
import { dateBadgeParts } from '@/utils/dates'
import { formatChange, formatRating } from '@/utils/format'
import { pluralize } from '@/utils/text'

/** Renderiza um ícone a partir da chave usada nos dados. */
export function AppIcon({ name, className }: { name: IconKey; className?: string }) {
  return createElement(getIcon(name), { className, 'aria-hidden': true })
}

const TILE_SIZES = {
  sm: 'size-9 [&_svg]:size-[1.125rem]',
  md: 'size-11 [&_svg]:size-5',
  lg: 'size-14 [&_svg]:size-6',
} as const

interface IconTileProps {
  /** Chave de ícone dos dados ou um componente do lucide. */
  icon: IconKey | LucideIcon
  /** Cor nomeada ou `brand` (verde suave da marca). */
  color?: ColorKey | 'brand'
  size?: keyof typeof TILE_SIZES
  shape?: 'rounded' | 'circle'
  className?: string
}

/** Pastilha arredondada com ícone (categorias, instituições, itens de menu). */
export function IconTile({
  icon,
  color = 'brand',
  size = 'md',
  shape = 'rounded',
  className,
}: IconTileProps) {
  const glyph = createElement(typeof icon === 'string' ? getIcon(icon) : icon, {
    'aria-hidden': true,
  })
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        TILE_SIZES[size],
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        color === 'brand' ? 'bg-nexa-50 text-nexa-900' : getColorStyle(color).soft,
        className,
      )}
    >
      {glyph}
    </span>
  )
}

/** Acesso rápido da tela inicial: quadrado arredondado com ícone e rótulo abaixo. */
export function QuickAccessTile({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-2 text-center outline-offset-4">
      <span className="bg-nexa-50 text-nexa-900 group-hover:bg-nexa-100 rounded-tile flex aspect-square w-full max-w-24 items-center justify-center transition-[background-color,transform] duration-150 group-active:scale-95">
        <Icon className="size-7" strokeWidth={1.9} aria-hidden />
      </span>
      <span className="text-ink-800 text-xs leading-tight font-semibold">{label}</span>
    </Link>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: IconKey | LucideIcon
  color?: ColorKey | 'brand'
  /** Variação em relação ao período anterior (0,12 = +12%). `null` = sem base de comparação. */
  change?: number | null
  /** Quando a alta é ruim (ex.: despesas), inverte as cores da variação. */
  invertChange?: boolean
  hint?: string
  to?: string
  className?: string
}

/** Indicador numérico (resumo comunitário e painéis). */
export function StatCard({
  label,
  value,
  icon,
  color = 'brand',
  change,
  invertChange,
  hint,
  to,
  className,
}: StatCardProps) {
  const positive = change !== undefined && change !== null && change > 0
  const negative = change !== undefined && change !== null && change < 0
  const good = invertChange ? negative : positive
  const bad = invertChange ? positive : negative

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-ink-500 text-xs leading-tight font-semibold">{label}</span>
        {icon && <IconTile icon={icon} color={color} size="sm" />}
      </div>
      <div className="text-ink-900 mt-1.5 text-[1.375rem] leading-tight font-extrabold tabular-nums">
        {value}
      </div>
      {(change !== undefined || hint) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] font-semibold">
          {change !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5',
                good && 'text-nexa-700',
                bad && 'text-danger-600',
                !good && !bad && 'text-ink-400',
              )}
            >
              {positive && <ArrowUpRight className="size-3.5" aria-hidden />}
              {negative && <ArrowDownRight className="size-3.5" aria-hidden />}
              {formatChange(change)}
            </span>
          )}
          {hint && <span className="text-ink-400">{hint}</span>}
        </div>
      )}
    </>
  )

  const box = cn('rounded-card bg-surface shadow-card block p-4', className)
  return to ? (
    <Link to={to} className={cn(box, 'hover:shadow-raised transition-shadow')}>
      {content}
    </Link>
  ) : (
    <div className={box}>{content}</div>
  )
}

/** Estrela + nota + contagem — ex.: "4,8 (9 avaliações)". */
export function Rating({
  value,
  count,
  size = 'sm',
  className,
}: {
  value: number | null
  count?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  if (value === null) {
    return <span className={cn('text-ink-400 text-xs font-medium', className)}>Sem avaliações</span>
  }
  return (
    <span
      className={cn(
        'text-ink-700 inline-flex items-center gap-1 font-semibold',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <Star
        className={cn('fill-sun-400 text-sun-400', size === 'sm' ? 'size-3.5' : 'size-4')}
        aria-hidden
      />
      <span className="text-ink-900 font-bold">{formatRating(value)}</span>
      {count !== undefined && (
        <span className="text-ink-500 font-medium">
          ({pluralize(count, 'avaliação', 'avaliações')})
        </span>
      )}
    </span>
  )
}

/** Selo de data dos eventos: dia grande + mês em caixa alta. */
export function DateBadge({ date, className }: { date: ISODate | Date; className?: string }) {
  const { day, month } = dateBadgeParts(date)
  return (
    <span
      className={cn(
        'bg-sun-100 flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none',
        className,
      )}
    >
      <span className="text-ink-900 text-xl font-extrabold">{day}</span>
      <span className="text-sun-700 mt-0.5 text-[0.625rem] font-extrabold tracking-wider">
        {month}
      </span>
    </span>
  )
}

/** Indicador de etapas do onboarding: pontos, com o ativo alongado. */
export function ProgressDots({
  total,
  current,
  className,
}: {
  total: number
  /** Índice da etapa atual (começa em 0). */
  current: number
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Etapa ${current + 1} de ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            index === current ? 'bg-nexa-900 w-6' : 'bg-nexa-200 w-2',
          )}
        />
      ))}
    </div>
  )
}

const RATIOS = {
  square: 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
} as const

interface MediaCoverProps {
  /** Imagem enviada (tem precedência). */
  imageUrl?: string
  /** Ilustração de reserva da biblioteca NEXA. */
  illustration?: IllustrationKey
  alt: string
  ratio?: keyof typeof RATIOS
  className?: string
  /** Conteúdo sobreposto (ex.: selo). */
  children?: ReactNode
}

/** Capa de conteúdo com proporção fixa: imagem enviada ou ilustração de reserva. */
export function MediaCover({
  imageUrl,
  illustration = 'storefront',
  alt,
  ratio = '16/9',
  className,
  children,
}: MediaCoverProps) {
  return (
    <div className={cn('bg-nexa-50 relative overflow-hidden', RATIOS[ratio], className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <Illustration name={illustration} title={alt} className="size-full" />
      )}
      {children}
    </div>
  )
}

/** Linha de informação: ícone + texto (endereço, horário, telefone…). */
export function InfoRow({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('text-ink-700 flex items-start gap-2.5 text-sm', className)}>
      <Icon className="text-nexa-800 mt-0.5 size-[1.125rem] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export interface TimelineItem {
  id: string
  title: string
  description?: ReactNode
  /** Texto de data já formatado. */
  date?: string
  color?: ColorKey | 'brand'
  /** Selos ou conteúdo extra abaixo da descrição. */
  extra?: ReactNode
}

/** Linha do tempo vertical (ex.: histórico de uma demanda). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1
        const dot =
          !item.color || item.color === 'brand' ? 'bg-nexa-800' : getColorStyle(item.color).solid
        return (
          <li key={item.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!last && (
              <span
                className="bg-line-strong absolute top-4 bottom-0 left-[7px] w-0.5"
                aria-hidden
              />
            )}
            <span
              className={cn('ring-surface relative mt-1 size-4 shrink-0 rounded-full ring-4', dot)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-ink-900 text-sm font-bold">{item.title}</p>
                {item.date && <span className="text-ink-400 text-xs">{item.date}</span>}
              </div>
              {item.description && (
                <div className="text-ink-600 mt-0.5 text-[0.8125rem] leading-snug">
                  {item.description}
                </div>
              )}
              {item.extra && <div className="mt-1.5">{item.extra}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Barra de progresso simples (0 a 1). */
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className?: string
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={cn('bg-nexa-50 h-2 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <div
        className="bg-nexa-700 h-full rounded-full transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
