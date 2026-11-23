import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import {
  AsyncView,
  Avatar,
  Badge,
  Button,
  DemoBadge,
  EmptyState,
  FilterChips,
  SearchInput,
} from '@/components/ui'
import { useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { USER_ROLE_LABEL, type User, type UserRole } from '@/types'
import { formatDate } from '@/utils/dates'

import { AdminShell } from '../components/AdminShell'

type RoleFilter = UserRole | 'all'

const FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'resident', label: 'Moradores' },
  { value: 'merchant', label: 'Comerciantes' },
  { value: 'institution', label: 'Instituições' },
  { value: 'admin', label: 'Administração' },
]

/** Usuários cadastrados: consulta e suspensão de contas. */
export default function AdminUsersPage() {
  const me = useCurrentUser()
  const [role, setRole] = useState<RoleFilter>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const users = useQuery({
    queryKey: ['users', 'admin', { role, search: deferredSearch }],
    queryFn: () => repos.users.listAll({ role, search: deferredSearch }),
    placeholderData: (previous) => previous,
  })
  const setStatus = useAction(
    (user: User) =>
      repos.users.setStatus(user.id, user.status === 'active' ? 'suspended' : 'active'),
    { success: (user) => (user.status === 'suspended' ? 'Conta suspensa.' : 'Conta reativada.') },
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail ou usuário…"
          label="Buscar usuários"
        />
        <FilterChips
          ariaLabel="Filtrar por perfil"
          options={FILTERS}
          value={role}
          onChange={setRole}
        />
        <AsyncView
          query={users}
          empty={<EmptyState icon={Users} title="Nenhum usuário encontrado" />}
        >
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
              {items.map((user) => {
                const locked = user.id === me.id || user.role === 'admin' || user.isDemoAccount
                return (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar name={user.name} avatar={user.avatar} photoUrl={user.photoUrl} />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-ink-900 truncate text-sm font-bold">{user.name}</p>
                      <p className="text-ink-500 truncate text-xs">
                        @{user.username} · {user.email} · desde {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge>{USER_ROLE_LABEL[user.role]}</Badge>
                      {user.isDemoAccount && <DemoBadge label="Demo" />}
                      {user.status === 'suspended' && <Badge color="terracotta">Suspensa</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant={user.status === 'active' ? 'outline' : 'secondary'}
                      disabled={locked || setStatus.pending}
                      title={
                        locked
                          ? 'Contas demonstrativas, de administração e a sua própria não podem ser suspensas.'
                          : undefined
                      }
                      onClick={() => void setStatus.run(user)}
                    >
                      {user.status === 'active' ? 'Suspender' : 'Reativar'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </AsyncView>
      </div>
    </AdminShell>
  )
}
