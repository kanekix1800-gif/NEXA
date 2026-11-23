import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import type { AuthRedirectState } from '@/app/guards'
import { DEFAULT_AUTHENTICATED_PATH, paths } from '@/app/paths'
import { Button, Callout, ConfirmDialog, Field, Input, PasswordInput } from '@/components/ui'
import { config } from '@/config'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_PASSWORD } from '@/data/demoAccounts'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { UserRole } from '@/types'
import { isAppError, toUserMessage } from '@/utils/errors'
import { isPasswordCryptoAvailable } from '@/utils/password'

import { AuthShell } from '../components/AuthShell'
import { DemoAccess } from '../components/DemoAccess'

const ROLES: UserRole[] = ['resident', 'merchant', 'institution', 'admin']

/** Entrar: e-mail e senha, e acesso rápido aos perfis demonstrativos. */
export default function LoginPage() {
  const { signIn, signInDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [demoRole, setDemoRole] = useState<UserRole | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const destination =
    (location.state as AuthRedirectState | null)?.from ?? DEFAULT_AUTHENTICATED_PATH

  const enterDemo = async (role: UserRole) => {
    setDemoRole(role)
    setFormError(null)
    try {
      await signInDemo(role)
      navigate(destination, { replace: true })
    } catch (error) {
      setFormError(toUserMessage(error))
      setDemoRole(null)
    }
  }

  // Link direto para um perfil demonstrativo: /entrar?demo=merchant (um QR Code por perfil).
  const autoDemo = useRef(false)
  const requestedDemo = params.get('demo') as UserRole | null
  useEffect(() => {
    if (autoDemo.current || !config.isDemoMode) return
    if (requestedDemo && ROLES.includes(requestedDemo)) {
      autoDemo.current = true
      void enterDemo(requestedDemo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedDemo])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await signIn({ email, password })
      navigate(destination, { replace: true })
    } catch (error) {
      if (isAppError(error) && error.fieldErrors) setFieldErrors(error.fieldErrors)
      setFormError(toUserMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const reset = useAction(() => repos.system.resetDemoData(), {
    success: 'Dados restaurados. Escolha um perfil para começar de novo.',
  })

  return (
    <AuthShell
      title="Entrar"
      subtitle="Que bom ter você de volta à sua comunidade."
      footer={
        <p className="text-ink-600">
          Ainda não tem conta?{' '}
          <Link to={paths.signUp} className="text-nexa-800 font-bold">
            Criar conta
          </Link>
        </p>
      }
    >
      {config.isDemoMode && <DemoAccess pendingRole={demoRole} onSelect={enterDemo} />}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {config.isDemoMode && (
          <p className="text-ink-500 -mb-1 text-center text-xs font-semibold tracking-wide uppercase">
            ou entre com e-mail e senha
          </p>
        )}
        <Field label="E-mail" error={fieldErrors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Senha" error={fieldErrors.password}>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <div className="-mt-1 flex justify-end">
          <Link to={paths.recoverPassword} className="text-nexa-800 text-[0.8125rem] font-bold">
            Esqueci minha senha
          </Link>
        </div>

        {formError && (
          <Callout tone="danger" title="Não foi possível entrar">
            {formError}
          </Callout>
        )}
        {!isPasswordCryptoAvailable() && (
          <Callout tone="warning">
            O acesso por senha exige conexão segura (HTTPS). Use o acesso rápido acima.
          </Callout>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Entrar
        </Button>
      </form>

      {config.isDemoMode && (
        <Callout tone="demo" title="Ambiente de demonstração">
          Contas e conteúdos são fictícios e ficam guardados apenas neste aparelho. As contas
          demonstrativas usam a senha <strong>{DEMO_PASSWORD}</strong>.
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-nexa-800 mt-1.5 block font-bold underline underline-offset-2"
          >
            Restaurar dados demonstrativos
          </button>
        </Callout>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restaurar dados demonstrativos?"
        description="Tudo o que foi criado neste aparelho será apagado e a base volta ao estado inicial."
        confirmLabel="Restaurar"
        tone="danger"
        onConfirm={async () => {
          await reset.run()
        }}
      />
    </AuthShell>
  )
}
