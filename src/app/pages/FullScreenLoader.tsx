import { LogoMark } from '@/components/brand/Logo'

/** Carregamento em tela cheia (inicialização do app e verificação de sessão). */
export function FullScreenLoader({ label = 'Carregando o NEXA…' }: { label?: string }) {
  return (
    <div
      className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <LogoMark size={56} className="animate-pulse-soft" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
