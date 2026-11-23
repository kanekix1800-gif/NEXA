import { RefreshCw } from 'lucide-react'
import { useRouteError } from 'react-router'

import { toUserMessage } from '@/utils/errors'

/** Falha ao carregar parte do app — comum logo após uma nova versão ser publicada. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    message,
  )
}

/** Página de erro das rotas: evita a "tela branca" e oferece um caminho de recuperação. */
export function RouteErrorPage() {
  const error = useRouteError()
  const outdated = isChunkLoadError(error)

  if (import.meta.env.DEV) console.error('[NEXA] Erro de rota:', error)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-danger-50 text-danger-600 flex size-16 items-center justify-center rounded-full">
        <RefreshCw className="size-8" aria-hidden />
      </span>
      <h1 className="text-ink-900 text-xl font-extrabold">
        {outdated ? 'Há uma versão nova do NEXA' : 'Algo não saiu como esperado'}
      </h1>
      <p className="text-ink-500 text-sm">
        {outdated
          ? 'Recarregue a página para continuar com a versão mais recente.'
          : toUserMessage(error, 'Não foi possível abrir esta tela. Tente recarregar a página.')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-nexa-900 hover:bg-nexa-800 mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white transition-colors"
      >
        Recarregar
      </button>
    </main>
  )
}
