import { cn } from '@/utils/cn'

/**
 * Marca NEXA: um "N" formado por nós conectados — pessoas, comércio e instituições
 * ligados em rede. O nó laranja representa a transformação gerada pelas conexões.
 */

export type LogoTone = 'brand' | 'light'

interface LogoMarkProps {
  /** Tamanho em pixels (largura = altura). */
  size?: number
  /** `brand` = verde sobre fundos claros; `light` = claro sobre fundos escuros. */
  tone?: LogoTone
  className?: string
  /** Texto alternativo. Quando ausente, o símbolo é decorativo. */
  title?: string
}

const BRAND_GREEN = '#064d3b'
const BRAND_LIGHT = '#fdfbf6'
const BRAND_ORANGE = '#f2a333'

export function LogoMark({ size = 40, tone = 'brand', className, title }: LogoMarkProps) {
  const stroke = tone === 'brand' ? BRAND_GREEN : BRAND_LIGHT
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Conexões */}
      <g stroke={stroke} strokeWidth="5.5" strokeLinecap="butt">
        <line x1="14" y1="44.5" x2="14" y2="19.5" />
        <line x1="18.47" y1="17.72" x2="48.6" y2="49.5" />
        <line x1="50" y1="49" x2="50" y2="19.5" />
      </g>
      {/* Nós */}
      <g stroke={stroke} strokeWidth="4.5">
        <circle cx="14" cy="13" r="6.5" />
        <circle cx="14" cy="51" r="6.5" />
        <circle cx="50" cy="13" r="6.5" />
      </g>
      <circle cx="50" cy="51" r="8.75" fill={BRAND_ORANGE} />
    </svg>
  )
}

const SIZES = {
  sm: { mark: 28, word: 'text-xl', tagline: 'text-[0.6875rem]', gap: 'gap-2' },
  md: { mark: 40, word: 'text-[1.75rem]', tagline: 'text-xs', gap: 'gap-2.5' },
  lg: { mark: 64, word: 'text-[2.5rem]', tagline: 'text-sm', gap: 'gap-3.5' },
  xl: { mark: 96, word: 'text-[3.25rem]', tagline: 'text-base', gap: 'gap-4' },
} as const

interface LogoProps {
  size?: keyof typeof SIZES
  tone?: LogoTone
  /** `horizontal` = símbolo ao lado do nome; `stacked` = símbolo acima do nome. */
  layout?: 'horizontal' | 'stacked'
  /** Exibe o slogan "Conexões que transformam realidades." */
  withTagline?: boolean
  className?: string
}

/** Logotipo completo: símbolo + nome (e slogan opcional). */
export function Logo({
  size = 'md',
  tone = 'brand',
  layout = 'horizontal',
  withTagline = false,
  className,
}: LogoProps) {
  const spec = SIZES[size]
  const stacked = layout === 'stacked'
  return (
    <div
      className={cn(
        'inline-flex items-center',
        stacked ? 'flex-col text-center' : 'flex-row',
        spec.gap,
        className,
      )}
    >
      <LogoMark size={spec.mark} tone={tone} />
      <div className={cn('flex flex-col', stacked && 'items-center')}>
        <span
          className={cn(
            'leading-none font-extrabold tracking-[0.06em]',
            spec.word,
            tone === 'brand' ? 'text-nexa-900' : 'text-cream-50',
          )}
        >
          NEXA
        </span>
        {withTagline && (
          <span
            className={cn(
              'mt-1.5 leading-snug font-medium',
              spec.tagline,
              tone === 'brand' ? 'text-ink-700' : 'text-cream-100/90',
            )}
          >
            Conexões que <strong className="font-bold">transformam</strong> realidades.
          </span>
        )}
      </div>
    </div>
  )
}
