import { Navigate, Outlet, useLocation } from 'react-router'

import { config } from '@/config'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { DEFAULT_AUTHENTICATED_PATH, paths } from './paths'
import { FullScreenLoader } from './pages/FullScreenLoader'

/** Estado de navegação usado para voltar à tela desejada depois do login. */
export interface AuthRedirectState {
  from?: string
}

/** Exige sessão: sem ela, leva à tela de entrada (guardando a rota de origem). */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'unauthenticated') {
    const state: AuthRedirectState = { from: `${location.pathname}${location.search}` }
    return <Navigate to={paths.login} replace state={state} />
  }
  return <Outlet />
}

const DEMO_ROLES: readonly string[] = [
  'resident',
  'merchant',
  'institution',
  'admin',
] satisfies UserRole[]

/** Perfil pedido por um link direto de demonstração (`/entrar?demo=merchant`), se houver. */
function requestedDemoRole(pathname: string, search: string): UserRole | null {
  if (!config.isDemoMode || pathname !== paths.login) return null
  const role = new URLSearchParams(search).get('demo')
  return role !== null && DEMO_ROLES.includes(role) ? (role as UserRole) : null
}

/** Rotas públicas (abertura, apresentação, entrar, cadastro): quem já entrou vai direto ao início. */
export function PublicOnly() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authenticated') {
    // Um QR Code por perfil: quem já está em outro perfil passa pela tela de entrada,
    // que faz a troca para o perfil demonstrativo pedido.
    const requested = requestedDemoRole(location.pathname, location.search)
    if (requested && user?.role !== requested) return <Outlet />
    return <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace />
  }
  return <Outlet />
}

/**
 * Restringe um grupo de rotas a determinados perfis.
 * Perfis sem acesso veem uma página explicativa (em vez de um redirecionamento silencioso),
 * deixando clara a separação de permissões.
 */
export function RequireRole({ roles, area }: { roles: readonly UserRole[]; area: string }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <AccessDeniedPage area={area} roles={roles} />
  return <Outlet />
}
