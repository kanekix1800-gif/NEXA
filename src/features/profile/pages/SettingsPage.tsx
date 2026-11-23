import { useQuery } from '@tanstack/react-query'
import { Download, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import {
  Button,
  Callout,
  Card,
  ConfirmDialog,
  Field,
  Modal,
  notify,
  Page,
  PageHeader,
  PasswordInput,
  SectionHeader,
  Select,
  SkeletonList,
  SwitchRow,
} from '@/components/ui'
import { config } from '@/config'
import { useAuth, useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { NOTIFICATION_CATEGORY_LABEL, type NotificationCategory, type UserSettings } from '@/types'
import { formatDateTime } from '@/utils/dates'
import { isAppError } from '@/utils/errors'

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const change = useAction(() => repos.auth.changePassword(current, next), {
    success: 'Senha alterada.',
    onSuccess: onClose,
    onError: (error) => {
      if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
    },
  })
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Alterar senha"
      size="sm"
      footer={
        <Button fullWidth loading={change.pending} onClick={() => void change.run()}>
          Salvar nova senha
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Senha atual" error={errors.currentPassword}>
          <PasswordInput
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field
          label="Nova senha"
          error={errors.newPassword ?? errors.password}
          hint="Mínimo de 8 caracteres, com letras e números."
        >
          <PasswordInput
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** Configurações: notificações, movimento, localização, privacidade (LGPD) e dados demonstrativos. */
export default function SettingsPage() {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const settings = useQuery({
    queryKey: ['settings', user.id],
    queryFn: () => repos.settings.get(),
  })
  const info = useQuery({ queryKey: ['system', 'info'], queryFn: () => repos.system.getInfo() })
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const update = useAction((patch: Parameters<typeof repos.settings.update>[0]) =>
    repos.settings.update(patch),
  )
  const exportData = useAction(
    async () => {
      const data = await repos.auth.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `nexa-meus-dados-${user.username}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
    { success: 'Arquivo com os seus dados gerado.' },
  )

  const current: UserSettings | undefined = settings.data

  return (
    <>
      <PageHeader title="Configurações" variant="stack" backTo={paths.profile} />
      <Page width="narrow">
        {!current ? (
          <SkeletonList count={3} />
        ) : (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <SectionHeader title="Notificações" />
              <Card padding="none" className="divide-line divide-y px-4">
                {(Object.keys(NOTIFICATION_CATEGORY_LABEL) as NotificationCategory[]).map(
                  (category) => (
                    <SwitchRow
                      key={category}
                      title={NOTIFICATION_CATEGORY_LABEL[category]}
                      checked={current.notifications[category]}
                      onChange={(checked) =>
                        void update.run({ notifications: { [category]: checked } })
                      }
                    />
                  ),
                )}
              </Card>
            </section>

            <section className="flex flex-col gap-2">
              <SectionHeader title="Acessibilidade" />
              <Card>
                <Field
                  label="Animações"
                  hint="“Reduzido” desativa transições e movimentos da interface."
                >
                  <Select
                    value={current.motion}
                    onChange={(e) =>
                      void update.run({ motion: e.target.value as UserSettings['motion'] })
                    }
                  >
                    <option value="system">Seguir o aparelho</option>
                    <option value="reduced">Movimento reduzido</option>
                    <option value="full">Movimento completo</option>
                  </Select>
                </Field>
              </Card>
            </section>

            <section className="flex flex-col gap-2">
              <SectionHeader title="Localização" />
              <Card padding="none" className="px-4">
                <SwitchRow
                  title="Usar a localização do aparelho"
                  description="Posição aproximada, usada só para marcar locais e calcular distâncias. Sem ela, usamos o centro do seu bairro."
                  checked={current.locationConsent === 'granted'}
                  onChange={(checked) =>
                    void update.run({ locationConsent: checked ? 'granted' : 'denied' })
                  }
                />
              </Card>
            </section>

            <section className="flex flex-col gap-2">
              <SectionHeader title="Privacidade e dados" />
              <Card className="flex flex-col gap-3">
                <p className="text-ink-600 text-[13px] leading-snug">
                  Você controla os seus dados (LGPD): pode baixar uma cópia ou excluir a conta a
                  qualquer momento. Veja o{' '}
                  <Link
                    to={paths.privacy}
                    className="text-nexa-800 font-bold underline underline-offset-2"
                  >
                    Aviso de privacidade
                  </Link>{' '}
                  e os{' '}
                  <Link
                    to={paths.terms}
                    className="text-nexa-800 font-bold underline underline-offset-2"
                  >
                    Termos de uso
                  </Link>
                  .
                </p>
                <Button
                  variant="secondary"
                  leftIcon={<Download className="size-4" />}
                  loading={exportData.pending}
                  onClick={() => void exportData.run()}
                >
                  Baixar meus dados
                </Button>
                {!user.isDemoAccount && (
                  <>
                    <Button variant="outline" onClick={() => setChangingPassword(true)}>
                      Alterar senha
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-danger-600"
                      leftIcon={<Trash2 className="size-4" />}
                      onClick={() => setConfirm('delete')}
                    >
                      Excluir minha conta
                    </Button>
                  </>
                )}
              </Card>
            </section>

            {config.isDemoMode && (
              <section className="flex flex-col gap-2">
                <SectionHeader title="Modo demonstração" />
                <Callout tone="demo" title="Dados fictícios, guardados neste aparelho">
                  Nada é enviado a servidores: contas, publicações, demandas e vendas ficam apenas
                  no seu navegador
                  {info.data &&
                    ` (${info.data.storage === 'indexeddb' ? 'armazenamento local' : 'somente nesta sessão'})`}
                  .{info.data && ` Base gerada em ${formatDateTime(info.data.seededAt)}.`}
                </Callout>
                <Button
                  variant="outline"
                  leftIcon={<RotateCcw className="size-4" />}
                  onClick={() => setConfirm('reset')}
                >
                  Restaurar dados demonstrativos
                </Button>
              </section>
            )}
          </div>
        )}
      </Page>

      {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}

      <ConfirmDialog
        open={confirm === 'reset'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Restaurar dados demonstrativos?"
        description="Tudo o que foi criado neste aparelho será apagado e a base volta ao estado inicial. Você precisará entrar de novo."
        confirmLabel="Restaurar"
        tone="danger"
        onConfirm={async () => {
          await repos.system.resetDemoData()
          await signOut()
          notify.success('Dados demonstrativos restaurados.')
          navigate(paths.login, { replace: true })
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Excluir a sua conta?"
        description="Seus dados pessoais, publicações, comentários e avaliações serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir conta"
        tone="danger"
        onConfirm={async () => {
          try {
            await repos.auth.deleteMyAccount()
            await signOut()
            notify.success('Conta excluída.')
            navigate(paths.welcome, { replace: true })
          } catch (error) {
            notify.error(isAppError(error) ? error.message : 'Não foi possível excluir a conta.')
          }
        }}
      />
    </>
  )
}
