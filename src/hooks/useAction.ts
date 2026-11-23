import { useCallback, useEffect, useRef, useState } from 'react'

import { notify, notifyError } from '@/components/ui/toast'

interface ActionOptions<TResult> {
  /** Aviso exibido quando a ação termina bem. */
  success?: string | ((result: TResult) => string)
  /** Mensagem padrão quando o erro não tem texto próprio. */
  errorFallback?: string
  /** Não exibe aviso de erro (a tela trata o erro por conta própria). */
  silentError?: boolean
  onSuccess?: (result: TResult) => void
  onError?: (error: unknown) => void
}

/**
 * Executa uma ação assíncrona (normalmente uma chamada de repositório) cuidando de
 * carregamento, avisos e erros. Chamadas simultâneas são ignoradas (evita duplo toque).
 *
 *   const like = useAction((id: string) => repos.posts.toggleLike(id))
 *   <button disabled={like.pending} onClick={() => like.run(post.id)} />
 *
 * As consultas da tela são atualizadas automaticamente após qualquer gravação.
 */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: ActionOptions<TResult> = {},
) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const busy = useRef(false)
  // Mantém sempre a versão mais recente da ação e das opções, sem recriar `run`.
  const latest = useRef({ action, options })
  useEffect(() => {
    latest.current = { action, options }
  })

  // Depois que a tela é fechada, a ação ainda termina (e avisa o resultado), mas não
  // executa mais os efeitos da tela — por exemplo, uma navegação que já não faz sentido.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (busy.current) return undefined
    busy.current = true
    setPending(true)
    setError(null)
    const current = latest.current
    try {
      const result = await current.action(...args)
      const { success } = current.options
      if (success) notify.success(typeof success === 'function' ? success(result) : success)
      if (mounted.current) current.options.onSuccess?.(result)
      return result
    } catch (failure) {
      if (!current.options.silentError) notifyError(failure, current.options.errorFallback)
      if (mounted.current) {
        setError(failure)
        current.options.onError?.(failure)
      }
      return undefined
    } finally {
      busy.current = false
      if (mounted.current) setPending(false)
    }
  }, [])

  return { run, pending, error, clearError: () => setError(null) }
}
