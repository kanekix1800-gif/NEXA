import { LogoMark } from '@/components/brand/Logo'

/**
 * Marcador exibido por páginas que ainda não foram implementadas.
 * Componente PROVISÓRIO: deve desaparecer quando todos os módulos estiverem prontos.
 */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <LogoMark size={44} />
      <h1 className="text-ink-900 text-xl font-extrabold">{title}</h1>
      <p className="text-ink-500 max-w-xs text-sm">Esta tela está em construção.</p>
    </main>
  )
}
