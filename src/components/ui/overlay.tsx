import { X } from 'lucide-react'
import { Dialog, DropdownMenu } from 'radix-ui'
import { useState, type ReactNode } from 'react'

import { cn } from '@/utils/cn'

import { Button } from './Button'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Título (obrigatório para leitores de tela). */
  title: string
  description?: string
  children?: ReactNode
  /** Rodapé fixo com as ações. */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const MODAL_SIZES = { sm: 'lg:max-w-sm', md: 'lg:max-w-lg', lg: 'lg:max-w-2xl' } as const

/**
 * Janela sobreposta responsiva: folha inferior no celular (como em apps nativos)
 * e diálogo centralizado em telas grandes. Foco, Esc e leitor de tela são tratados.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink-900/45 animate-fade-in z-overlay fixed inset-0 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            'bg-canvas z-overlay animate-rise fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col outline-none',
            'rounded-t-sheet shadow-raised',
            'lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-full lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[1.75rem]',
            MODAL_SIZES[size],
          )}
        >
          <div
            className="bg-line-strong mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full lg:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0">
              <Dialog.Title className="text-ink-900 text-lg leading-tight font-extrabold">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-ink-500 mt-1 text-sm">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="text-ink-600 hover:bg-ink-100 -mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-5">{children}</div>
          {footer && (
            <div className="border-line bg-canvas flex shrink-0 gap-3 border-t px-5 pt-3 pb-[calc(0.75rem+var(--nexa-safe-bottom))] lg:rounded-b-[1.75rem] lg:pb-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` destaca ações destrutivas. */
  tone?: 'default' | 'danger'
  /** Pode ser assíncrona: o botão mostra o carregamento até terminar. */
  onConfirm: () => void | Promise<void>
}

/** Confirmação de ação (com suporte a operações assíncronas). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" fullWidth onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            fullWidth
            loading={busy}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}

interface MenuAction {
  label: string
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface ActionMenuProps {
  /** Elemento que abre o menu (normalmente um `IconButton`). */
  trigger: ReactNode
  actions: MenuAction[]
  /** Rótulo acessível do menu. */
  label: string
}

/** Menu suspenso de ações (ex.: opções de uma publicação). */
export function ActionMenu({ trigger, actions, label }: ActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          aria-label={label}
          className="bg-surface shadow-raised border-line animate-fade-in z-overlay min-w-48 rounded-2xl border p-1.5"
        >
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={action.onSelect}
              className={cn(
                'flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-semibold outline-none select-none',
                action.tone === 'danger'
                  ? 'text-danger-600 data-[highlighted]:bg-danger-50'
                  : 'text-ink-800 data-[highlighted]:bg-nexa-50',
              )}
            >
              {action.icon}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
