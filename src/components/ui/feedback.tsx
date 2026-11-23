import {
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Illustration } from '@/components/brand/Illustration'
import type { IllustrationKey } from '@/types'
import { cn } from '@/utils/cn'
import { toUserMessage } from '@/utils/errors'

/** Indicador de carregamento giratório. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      className={cn('size-5 animate-spin', className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}

/** Bloco de carregamento (placeholder animado). Defina o tamanho por `className`. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

/** Lista de cartões em carregamento. */
export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-card bg-surface shadow-card flex gap-3 p-4">
          <Skeleton className="size-14 shrink-0 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon?: LucideIcon
  /** Ilustração da biblioteca NEXA (alternativa ao ícone). */
  illustration?: IllustrationKey
  title: string
  description?: string
  /** Ação principal (normalmente um botão). */
  action?: ReactNode
  className?: string
}

/** Estado vazio: explica por que não há conteúdo e oferece o próximo passo. */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
      {illustration ? (
        <div className="size-28 overflow-hidden rounded-[2rem]">
          <Illustration name={illustration} />
        </div>
      ) : Icon ? (
        <span className="bg-nexa-50 text-nexa-800 flex size-16 items-center justify-center rounded-full">
          <Icon className="size-7" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-ink-900 text-base font-bold">{title}</h3>
      {description && <p className="text-ink-500 max-w-xs text-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  /** Erro capturado (a mensagem amigável é extraída automaticamente). */
  error?: unknown
  message?: string
  onRetry?: () => void
  className?: string
}

/** Estado de erro com opção de tentar novamente. */
export function ErrorState({
  title = 'Não foi possível carregar',
  error,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}
      role="alert"
    >
      <span className="bg-danger-50 text-danger-600 flex size-16 items-center justify-center rounded-full">
        <CircleAlert className="size-7" aria-hidden />
      </span>
      <h3 className="text-ink-900 text-base font-bold">{title}</h3>
      <p className="text-ink-500 max-w-xs text-sm">{message ?? toUserMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-nexa-100 text-nexa-900 hover:bg-nexa-200 mt-1 h-10 rounded-full px-5 text-sm font-bold transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'demo' | 'ai'

const CALLOUT: Record<CalloutTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'bg-info-50 text-info-700', icon: 'text-info-600', Icon: Info },
  success: { box: 'bg-nexa-50 text-nexa-900', icon: 'text-nexa-700', Icon: CircleCheck },
  warning: { box: 'bg-sun-50 text-sun-800', icon: 'text-sun-600', Icon: TriangleAlert },
  danger: { box: 'bg-danger-50 text-danger-700', icon: 'text-danger-600', Icon: CircleAlert },
  demo: { box: 'bg-cream-200 text-ink-700', icon: 'text-sun-600', Icon: FlaskConical },
  ai: { box: 'bg-nexa-50 text-nexa-900', icon: 'text-sun-500', Icon: Sparkles },
}

interface CalloutProps {
  /** `demo` sinaliza conteúdo simulado; `ai` sinaliza sugestões da NEXA IA. */
  tone?: CalloutTone
  title?: string
  children?: ReactNode
  icon?: LucideIcon
  /** Ação opcional exibida abaixo do texto. */
  action?: ReactNode
  className?: string
}

/** Aviso contextual (informação, alerta, conteúdo demonstrativo ou sugestão da IA). */
export function Callout({ tone = 'info', title, children, icon, action, className }: CalloutProps) {
  const style = CALLOUT[tone]
  const Icon = icon ?? style.Icon
  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl p-3.5 text-[0.8125rem] leading-snug',
        style.box,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-[1.125rem] shrink-0', style.icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
