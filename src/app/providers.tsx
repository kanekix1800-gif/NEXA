import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { notify, Toaster } from '@/components/ui/toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { repos, subscribeToDataChanges, subscribeToPersistErrors } from '@/repositories'

import { queryClient } from './queryClient'

/**
 * Revalida as consultas sempre que os dados mudam (inclusive o usuário atual).
 * As alterações são agrupadas: várias gravações seguidas geram uma única revalidação.
 */
function DataChangeBridge() {
  useEffect(() => {
    let scheduled = false
    return subscribeToDataChanges(() => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        void queryClient.invalidateQueries()
      })
    })
  }, [])

  // Avisa (uma única vez) se o aparelho não conseguir gravar os dados.
  const warned = useRef(false)
  useEffect(
    () =>
      subscribeToPersistErrors(() => {
        if (warned.current) return
        warned.current = true
        notify.warning(
          'Não foi possível salvar neste aparelho',
          'O NEXA continua funcionando, mas as alterações podem se perder ao fechar a página.',
        )
      }),
    [],
  )
  return null
}

/** Aplica a preferência de movimento do usuário (Configurações → Movimento). */
function MotionPreference({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const settings = useQuery({
    queryKey: ['settings', user?.id ?? 'anon'],
    queryFn: () => repos.settings.get(),
    enabled: Boolean(user),
  })
  const preference = user ? (settings.data?.motion ?? 'system') : 'system'

  useEffect(() => {
    const root = document.documentElement
    if (preference === 'reduced') root.dataset.motion = 'reduce'
    else delete root.dataset.motion
  }, [preference])

  return (
    <MotionConfig
      reducedMotion={preference === 'reduced' ? 'always' : preference === 'full' ? 'never' : 'user'}
    >
      {children}
    </MotionConfig>
  )
}

/** Provedores globais do aplicativo (consultas, autenticação, movimento e avisos). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DataChangeBridge />
      <AuthProvider>
        <MotionPreference>{children}</MotionPreference>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
