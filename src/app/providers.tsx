import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { notify, Toaster } from '@/components/ui/toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { subscribeToDataChanges, subscribeToPersistErrors } from '@/repositories'

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

/**
 * Aplica a preferência de movimento (Acessibilidade → Reduzir animações) às animações
 * feitas em código. As transições em CSS são tratadas por `data-motion` no <html>.
 */
function MotionPreference({ children }: { children: ReactNode }) {
  const { motion } = useAccessibilityPreferences()
  return (
    <MotionConfig reducedMotion={motion === 'reduced' ? 'always' : 'user'}>{children}</MotionConfig>
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
