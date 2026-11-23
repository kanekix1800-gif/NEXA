import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import { cn } from '@/utils/cn'

import { IconButton } from './Button'

const WIDTHS = {
  narrow: 'max-w-xl',
  default: 'max-w-3xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
} as const

interface PageProps {
  children: ReactNode
  /** Largura máxima do conteúdo. */
  width?: keyof typeof WIDTHS
  /** Reserva o espaço da navegação inferior no celular (padrão: sim). */
  bottomNav?: boolean
  className?: string
}

/** Contêiner padrão de página: largura máxima, margens laterais e espaço para a navegação. */
export function Page({ children, width = 'default', bottomNav = true, className }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 lg:px-8',
        WIDTHS[width],
        bottomNav ? 'pb-nav lg:pb-12' : 'pb-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  /**
   * `root` = telas principais (título grande à esquerda, como "Comunidade");
   * `stack` = telas internas (botão voltar + título centralizado, como "Nova Demanda").
   */
  variant?: 'root' | 'stack'
  /** Rota usada pelo botão voltar quando não há histórico dentro do app. */
  backTo?: string
  onBack?: () => void
  /** Ações à direita (ícones ou botões). */
  actions?: ReactNode
  /** Conteúdo extra abaixo do título (ex.: busca e filtros). */
  children?: ReactNode
  width?: keyof typeof WIDTHS
}

/** Cabeçalho fixo de página. */
export function PageHeader({
  title,
  subtitle,
  variant = 'root',
  backTo,
  onBack,
  actions,
  children,
  width = 'default',
}: PageHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const goBack = () => {
    if (onBack) return onBack()
    // `key === 'default'` indica que esta é a primeira tela aberta (sem histórico no app).
    if (location.key !== 'default') navigate(-1)
    else navigate(backTo ?? paths.home, { replace: true })
  }

  return (
    <header className="bg-canvas/90 pt-safe z-sticky sticky top-0 backdrop-blur-md">
      <div className={cn('mx-auto w-full px-5 lg:px-8', WIDTHS[width])}>
        {variant === 'root' ? (
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <h1 className="text-ink-900 truncate text-[1.375rem] leading-tight font-extrabold lg:text-2xl">
                {title}
              </h1>
              {subtitle && <p className="text-ink-500 mt-0.5 text-[13px]">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
          </div>
        ) : (
          <div className="grid min-h-14 grid-cols-[2.75rem_1fr_auto] items-center gap-1 py-1.5">
            <IconButton label="Voltar" onClick={goBack} className="-ml-2.5">
              <ArrowLeft className="size-5" />
            </IconButton>
            <div className="min-w-0 text-center">
              <h1 className="text-ink-900 truncate text-[17px] font-bold">{title}</h1>
              {subtitle && <p className="text-ink-500 truncate text-xs">{subtitle}</p>}
            </div>
            <div className="flex min-w-11 items-center justify-end gap-1">{actions}</div>
          </div>
        )}
        {children && <div className="flex flex-col gap-3 pb-3">{children}</div>}
      </div>
    </header>
  )
}

interface SectionHeaderProps {
  title: string
  /** Ação à direita: informe `to` + `actionLabel` (link) ou um `action` próprio. */
  to?: string
  actionLabel?: string
  action?: ReactNode
  className?: string
}

/** Título de seção com ação opcional (ex.: "Notícias da sua região" + "Ver todas"). */
export function SectionHeader({ title, to, actionLabel, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-ink-900 text-[17px] font-bold">{title}</h2>
      {action ??
        (to && actionLabel && (
          <Link
            to={to}
            className="text-nexa-800 hover:text-nexa-900 -mr-1 inline-flex h-9 items-center gap-0.5 rounded-full px-1 text-[13px] font-bold"
          >
            {actionLabel}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ))}
    </div>
  )
}

/**
 * Barra de ação fixa no rodapé (botões como "Continuar" e "Enviar").
 * Use em telas com `hideBottomNav` e reserve espaço no conteúdo com `pb-28`.
 */
export function StickyActionBar({
  children,
  width = 'default',
}: {
  children: ReactNode
  width?: keyof typeof WIDTHS
}) {
  return (
    <div className="bg-canvas/95 border-line z-sticky fixed inset-x-0 bottom-0 border-t backdrop-blur-md lg:left-64">
      <div
        className={cn(
          'mx-auto flex w-full gap-3 px-5 pt-3 pb-[calc(0.75rem+var(--nexa-safe-bottom))] lg:px-8',
          WIDTHS[width],
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface FabProps {
  /** Descrição da ação (vira `aria-label`). */
  label: string
  icon: ReactNode
  to?: string
  onClick?: () => void
  /** Mostra o texto ao lado do ícone. */
  extended?: boolean
}

/** Botão flutuante de ação — fica acima da navegação inferior. */
export function Fab({ label, icon, to, onClick, extended = false }: FabProps) {
  const className = cn(
    'bg-nexa-900 hover:bg-nexa-800 shadow-float bottom-nav-offset z-fab fixed right-5 inline-flex items-center justify-center gap-2 rounded-full font-bold text-white transition-[background-color,transform] duration-150 active:scale-95 lg:right-10 lg:bottom-10',
    extended ? 'h-14 px-5 text-sm' : 'size-14',
  )
  const content = (
    <>
      {icon}
      {extended && label}
    </>
  )
  return to ? (
    <Link to={to} aria-label={label} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {content}
    </button>
  )
}

interface ListRowProps {
  /** Ícone ou pastilha à esquerda. */
  leading?: ReactNode
  title: string
  description?: string
  /** Conteúdo à direita, antes da seta (ex.: selo ou valor). */
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  tone?: 'default' | 'danger'
  /** Oculta a seta à direita. */
  hideChevron?: boolean
}

/** Linha de lista/menu — como o menu do Perfil e a lista de Instituições. */
export function ListRow({
  leading,
  title,
  description,
  trailing,
  to,
  onClick,
  tone = 'default',
  hideChevron,
}: ListRowProps) {
  const className =
    'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-cream-50 active:bg-cream-100'
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[15px] font-bold',
            tone === 'danger' ? 'text-danger-600' : 'text-ink-900',
          )}
        >
          {title}
        </span>
        {description && (
          <span className="text-ink-500 mt-0.5 line-clamp-2 block text-[13px] leading-snug">
            {description}
          </span>
        )}
      </span>
      {trailing}
      {!hideChevron && <ChevronRight className="text-ink-400 size-5 shrink-0" aria-hidden />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

/** Cartão que agrupa `ListRow`s com divisórias. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-card bg-surface shadow-card divide-line divide-y overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}
