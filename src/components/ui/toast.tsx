import { Toaster as SonnerToaster, toast } from 'sonner'

import { toUserMessage } from '@/utils/errors'

/** Área de avisos temporários do app (uma única instância, na raiz). */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      mobileOffset={12}
      duration={3200}
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

/** Avisos temporários ("toasts"). */
export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  info: (message: string, description?: string) => toast.info(message, { description }),
  warning: (message: string, description?: string) => toast.warning(message, { description }),
}

/** Exibe um erro com mensagem amigável (extraída de `AppError` quando houver). */
export function notifyError(error: unknown, fallback?: string): void {
  toast.error(toUserMessage(error, fallback))
}
