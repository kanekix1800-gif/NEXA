import { Copy, QrCode as QrCodeIcon } from 'lucide-react'
import { useState } from 'react'

import { absoluteUrl, paths } from '@/app/paths'
import { Button, FilterChips, Modal, notify, QrCode, type ChoiceOption } from '@/components/ui'
import { config } from '@/config'
import { DEMO_ACCOUNT_LIST } from '@/data/demoAccounts'
import { USER_ROLE_LABEL, type UserRole } from '@/types'
import { cn } from '@/utils/cn'

type Target = 'home' | UserRole

interface ShareAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * QR Code de acesso: abre o NEXA em outro aparelho. No modo demonstração, o código pode
 * levar direto a um dos perfis prontos — sem cadastro e sem senha.
 */
export function ShareAppDialog({ open, onOpenChange }: ShareAppDialogProps) {
  const [target, setTarget] = useState<Target>('home')

  const options: ChoiceOption<Target>[] = [
    { value: 'home', label: 'Tela inicial' },
    ...DEMO_ACCOUNT_LIST.map((account) => ({
      value: account.role as Target,
      label: USER_ROLE_LABEL[account.role],
    })),
  ]
  const url = absoluteUrl(target === 'home' ? paths.welcome : paths.demoAs(target))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      notify.success('Link copiado.')
    } catch {
      notify.error('Não foi possível copiar', 'Selecione o endereço exibido e copie manualmente.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Abrir o NEXA em outro aparelho"
      description="Aponte a câmera do celular para o código."
      size="sm"
      footer={
        <Button
          variant="secondary"
          fullWidth
          leftIcon={<Copy className="size-4" />}
          onClick={() => void copy()}
        >
          Copiar link
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {config.isDemoMode && (
          <FilterChips
            ariaLabel="Abrir como"
            options={options}
            value={target}
            onChange={setTarget}
            className="self-stretch"
          />
        )}
        <div className="shadow-card rounded-3xl bg-white p-3">
          <QrCode value={url} label="QR Code para abrir o NEXA" className="size-56" />
        </div>
        <p className="text-ink-600 text-center text-[13px]">
          {target === 'home'
            ? 'Abre a tela inicial do NEXA.'
            : `Entra direto no perfil demonstrativo de ${USER_ROLE_LABEL[target].toLowerCase()}, sem cadastro e sem senha.`}
        </p>
        <p className="text-ink-500 text-center text-xs break-all select-all">{url}</p>
      </div>
    </Modal>
  )
}

/** Atalho discreto que abre o QR Code de acesso. */
export function ShareAppButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'text-nexa-800 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-bold',
          className,
        )}
      >
        <QrCodeIcon className="size-4" aria-hidden />
        Abrir em outro aparelho
      </button>
      <ShareAppDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
