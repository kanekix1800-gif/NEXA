import { Toaster as SonnerToaster, toast } from 'sonner'

import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { signalNotice } from '@/services/accessibility/feedback'
import { toUserMessage } from '@/utils/errors'

/** Área de avisos temporários do app (uma única instância, na raiz). */
export function Toaster() {
  const { longerNotices } = useAccessibilityPreferences()
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      mobileOffset={12}
      duration={longerNotices ? 10_000 : 3200}
      closeButton={longerNotices}
      containerAriaLabel="Avisos"
      toastOptions={{
        classNames: {
          toast:
            '!rounded-2xl !border !border-line !bg-surface !text-ink-900 !shadow-raised !font-sans !text-sm !font-semibold',
          description: '!text-ink-500 !font-medium',
          success: '[&_[data-icon]]:!text-nexa-700',
          error: '[&_[data-icon]]:!text-danger-600',
          warning: '[&_[data-icon]]:!text-sun-600',
          info: '[&_[data-icon]]:!text-info-600',
        },
      }}
    />
  )
}

/**
 * Avisos temporários ("toasts"). Conforme as opções de acessibilidade, cada aviso
 * também toca um som, vibra o aparelho e é lido em voz alta.
 */
export const notify = {
  success: (message: string, description?: string) => {
    signalNotice('success', message, description)
    return toast.success(message, { description })
  },
  error: (message: string, description?: string) => {
    signalNotice('error', message, description)
    return toast.error(message, { description })
  },
  info: (message: string, description?: string) => {
    signalNotice('info', message, description)
    return toast.info(message, { description })
  },
  warning: (message: string, description?: string) => {
    signalNotice('warning', message, description)
    return toast.warning(message, { description })
  },
}

/** Exibe um erro com mensagem amigável (extraída de `AppError` quando houver). */
export function notifyError(error: unknown, fallback?: string): void {
  notify.error(toUserMessage(error, fallback))
}
