import { absoluteUrl } from '@/app/paths'

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable'

/**
 * Compartilha um link interno do NEXA: usa o compartilhamento nativo do aparelho
 * quando disponível e, na falta dele, copia o endereço.
 */
export async function shareLink(input: {
  title: string
  text?: string
  /** Rota interna (ex.: `paths.event(id)`). */
  path: string
}): Promise<ShareResult> {
  const url = absoluteUrl(input.path)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.title, text: input.text, url })
      return 'shared'
    } catch (error) {
      // O usuário fechou a folha de compartilhamento.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'unavailable'
  }
}
