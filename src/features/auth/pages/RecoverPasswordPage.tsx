import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import { Button, Callout, Field, Input, notify, PasswordInput } from '@/components/ui'
import { repos } from '@/repositories'
import { isAppError, toUserMessage } from '@/utils/errors'
import { PASSWORD_MIN_LENGTH } from '@/utils/password'

import { AuthShell } from '../components/AuthShell'

type Stage = 'request' | 'sent' | 'reset'

/**
 * Recuperação de senha. No modo demonstração nenhum e-mail é enviado: a tela
 * informa isso e permite simular o link recebido para concluir o fluxo.
 */
export default function RecoverPasswordPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const request = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await repos.auth.requestPasswordReset(email)
      setToken(result.resetToken)
      setStage('sent')
    } catch (failure) {
      setError(toUserMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const reset = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await repos.auth.resetPassword(token, password)
      notify.success('Senha redefinida. Entre com a nova senha.')
      navigate(paths.login, { replace: true })
    } catch (failure) {
      setError(
        isAppError(failure) && failure.fieldErrors?.password
          ? failure.fieldErrors.password
          : toUserMessage(failure),
      )
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'request') {
    return (
      <AuthShell
        title="Recuperar senha"
        subtitle="Informe o e-mail da sua conta para receber as instruções."
        backTo={paths.login}
      >
        <form onSubmit={request} className="flex flex-col gap-4" noValidate>
          <Field label="E-mail" error={error}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            Enviar instruções
          </Button>
        </form>
      </AuthShell>
    )
  }

  if (stage === 'sent') {
    return (
      <AuthShell title="Confira seu e-mail" backTo={paths.login}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-nexa-100 text-nexa-800 flex size-16 items-center justify-center rounded-full">
            <MailCheck className="size-8" aria-hidden />
          </span>
          <p className="text-ink-600 text-[0.9375rem]">
            Se existir uma conta para <strong className="text-ink-900">{email}</strong>, enviaremos
            um link para criar uma nova senha.
          </p>
        </div>
        <Callout tone="demo" title="Modo demonstração">
          Nenhum e-mail é enviado de verdade neste protótipo.
          {token
            ? ' Para testar o fluxo completo, simule abaixo o link que chegaria por e-mail.'
            : ' Não há conta local com este e-mail (ou ela não pode redefinir a senha).'}
        </Callout>
        {token && (
          <Button size="lg" fullWidth onClick={() => setStage('reset')}>
            Simular link recebido
          </Button>
        )}
        <Button variant="ghost" fullWidth onClick={() => navigate(paths.login)}>
          Voltar para o login
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Nova senha"
      subtitle="Crie uma nova senha para a sua conta."
      backTo={paths.login}
    >
      <form onSubmit={reset} className="flex flex-col gap-4" noValidate>
        <Field
          label="Nova senha"
          error={error}
          hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`}
        >
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={busy}>
          Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  )
}
