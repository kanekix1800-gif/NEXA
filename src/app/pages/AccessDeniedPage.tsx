import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'

import { USER_ROLE_LABEL, type UserRole } from '@/types'

import { paths } from '../paths'

function listRoles(roles: readonly UserRole[]): string {
  const labels = roles.map((role) => USER_ROLE_LABEL[role].toLowerCase())
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} ou ${labels[labels.length - 1]}`
}

/** Exibida quando o perfil atual não tem permissão para acessar uma área restrita. */
export function AccessDeniedPage({ area, roles }: { area: string; roles: readonly UserRole[] }) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-sun-100 text-sun-700 flex size-16 items-center justify-center rounded-full">
        <ShieldAlert className="size-8" aria-hidden />
      </span>
      <h1 className="text-ink-900 text-xl font-extrabold">Acesso restrito</h1>
      <p className="text-ink-500 text-sm">
        A área <strong className="text-ink-700 font-semibold">{area}</strong> é exclusiva para
        contas de {listRoles(roles)}. Seu perfil atual não tem permissão para acessá-la.
      </p>
      <Link
        to={paths.home}
        className="bg-nexa-900 hover:bg-nexa-800 mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white transition-colors"
      >
        Voltar ao início
      </Link>
    </main>
  )
}
