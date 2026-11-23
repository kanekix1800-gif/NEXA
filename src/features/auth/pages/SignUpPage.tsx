import { House, Landmark, Store } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import {
  Button,
  Callout,
  Checkbox,
  Field,
  IconTile,
  Input,
  PasswordInput,
  RadioCardGroup,
  Select,
} from '@/components/ui'
import { NeighborhoodPicker } from '@/components/domain/NeighborhoodPicker'
import { useAuth } from '@/contexts/AuthContext'
import type { SignUpInput } from '@/repositories'
import { INSTITUTION_CATEGORY_LABEL, type InstitutionCategory } from '@/types'
import { isAppError, toUserMessage } from '@/utils/errors'
import { PASSWORD_MIN_LENGTH } from '@/utils/password'

import { AuthShell } from '../components/AuthShell'

type Role = SignUpInput['role']

const ROLE_OPTIONS = [
  {
    value: 'resident' as const,
    title: 'Morador',
    description: 'Participe da comunidade, registre demandas e descubra o comércio do bairro.',
    icon: <IconTile icon={House} />,
  },
  {
    value: 'merchant' as const,
    title: 'Comerciante',
    description: 'Divulgue seu negócio e use as ferramentas de gestão do NEXA Business.',
    icon: <IconTile icon={Store} color="orange" />,
  },
  {
    value: 'institution' as const,
    title: 'Instituição',
    description: 'Acompanhe demandas e divulgue iniciativas (sujeito à verificação).',
    icon: <IconTile icon={Landmark} color="teal" />,
  },
]

/** Cadastro em duas etapas: escolha do perfil e dados da conta. */
export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'role' | 'details'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [neighborhoodId, setNeighborhoodId] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [institutionCategory, setInstitutionCategory] = useState<InstitutionCategory>('ngo')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!role) return
    setSubmitting(true)
    setErrors({})
    setFormError(null)
    try {
      const user = await signUp({
        name,
        email,
        password,
        role,
        neighborhoodId,
        acceptedTerms,
        institution:
          role === 'institution'
            ? { name: institutionName, category: institutionCategory }
            : undefined,
      })
      // Comerciantes seguem direto para o cadastro do estabelecimento.
      navigate(user.role === 'merchant' ? paths.newBusiness : paths.home, { replace: true })
    } catch (error) {
      if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
      setFormError(toUserMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'role') {
    return (
      <AuthShell
        title="Como você vai usar o NEXA?"
        subtitle="Escolha o tipo de conta. Você poderá conhecer os outros perfis no modo demonstração."
        backTo={paths.onboarding}
        footer={
          <p className="text-ink-600">
            Já tem conta?{' '}
            <Link to={paths.login} className="text-nexa-800 font-bold">
              Entrar
            </Link>
          </p>
        }
      >
        <RadioCardGroup
          label="Tipo de conta"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          columns={1}
          layout="row"
        />
        <Button size="lg" fullWidth disabled={!role} onClick={() => setStep('details')}>
          Continuar
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle={`Perfil: ${ROLE_OPTIONS.find((option) => option.value === role)?.title ?? ''}`}
      backTo={paths.welcome}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Nome completo" error={errors.name} required>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Como você se chama?"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="E-mail" error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field
          label="Senha"
          error={errors.password}
          hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`}
          required
        >
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field
          label="Bairro"
          error={errors.neighborhoodId}
          hint="Usamos apenas o bairro — nunca o seu endereço."
          required
        >
          <NeighborhoodPicker
            value={neighborhoodId}
            onChange={setNeighborhoodId}
            placeholder="Selecione o seu bairro"
          />
        </Field>

        {role === 'institution' && (
          <>
            <Field label="Nome da instituição" error={errors.institutionName} required>
              <Input
                value={institutionName}
                onChange={(event) => setInstitutionName(event.target.value)}
                placeholder="Ex.: Associação de Moradores"
              />
            </Field>
            <Field label="Tipo de instituição" error={errors.institutionCategory} required>
              <Select
                value={institutionCategory}
                onChange={(event) =>
                  setInstitutionCategory(event.target.value as InstitutionCategory)
                }
              >
                {Object.entries(INSTITUTION_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Callout tone="info">
              Instituições passam por verificação da administração antes de aparecer no diretório e
              de publicar em nome da organização.
            </Callout>
          </>
        )}

        <Checkbox checked={acceptedTerms} onChange={setAcceptedTerms} error={errors.acceptedTerms}>
          Li e aceito os{' '}
          <Link to={paths.terms} className="text-nexa-800 font-bold underline underline-offset-2">
            Termos de uso
          </Link>{' '}
          e o{' '}
          <Link to={paths.privacy} className="text-nexa-800 font-bold underline underline-offset-2">
            Aviso de privacidade
          </Link>
          .
        </Checkbox>

        {formError && Object.keys(errors).length === 0 && (
          <Callout tone="danger">{formError}</Callout>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Criar conta
        </Button>
        <Button variant="ghost" fullWidth onClick={() => setStep('role')}>
          Trocar tipo de conta
        </Button>
      </form>
    </AuthShell>
  )
}
