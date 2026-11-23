import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { queryKeys } from '@/app/queryClient'
import { repos, type ProfileUpdateInput, type SignInInput, type SignUpInput } from '@/repositories'
import { can, type Permission, type PermissionResource } from '@/services/permissions'
import type { User, UserRole } from '@/types'

/**
 * AUTENTICAÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 * Disponibiliza o usuário atual e as ações de conta para todo o aplicativo.
 * No modo demonstração a autenticação é local (ver `src/repositories/local/auth.ts`).
 *
 *   const { user, status, signInDemo, signOut } = useAuth()
 *   const user = useCurrentUser()          // dentro de rotas protegidas (nunca nulo)
 *   const canManage = usePermission('demand:manage', { institutionId })
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  signIn(input: SignInInput): Promise<User>
  /** Acesso rápido a uma conta demonstrativa (somente no modo demonstração). */
  signInDemo(role: UserRole): Promise<User>
  signUp(input: SignUpInput): Promise<User>
  signOut(): Promise<void>
  updateProfile(patch: ProfileUpdateInput): Promise<User>
  becomeMerchant(): Promise<User>
  /** Recarrega o usuário atual (ex.: após cadastrar um estabelecimento). */
  refresh(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => repos.auth.getCurrentUser(),
    staleTime: Infinity,
  })

  /**
   * Troca de conta: publica o novo usuário (o que atualiza toda a interface) e descarta
   * os dados em cache do perfil anterior, para nada vazar de uma conta para outra.
   */
  const establish = useCallback(
    (user: User | null) => {
      queryClient.setQueryData(queryKeys.currentUser, user)
      const others = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
          query.queryKey[0] !== queryKeys.currentUser[0],
      }
      if (user) {
        // Mantém as telas montadas funcionando: zera e recarrega as consultas ativas.
        void queryClient.resetQueries(others)
      } else {
        queryClient.removeQueries(others)
      }
    },
    [queryClient],
  )

  const value = useMemo<AuthContextValue>(() => {
    const user = query.data ?? null
    const status: AuthStatus = query.isPending
      ? 'loading'
      : user
        ? 'authenticated'
        : 'unauthenticated'

    return {
      user,
      status,
      async signIn(input) {
        const signedIn = await repos.auth.signIn(input)
        establish(signedIn)
        return signedIn
      },
      async signInDemo(role) {
        const signedIn = await repos.auth.signInDemo(role)
        establish(signedIn)
        return signedIn
      },
      async signUp(input) {
        const created = await repos.auth.signUp(input)
        establish(created)
        return created
      },
      async signOut() {
        await repos.auth.signOut()
        establish(null)
      },
      async updateProfile(patch) {
        const updated = await repos.auth.updateProfile(patch)
        queryClient.setQueryData(queryKeys.currentUser, updated)
        return updated
      },
      async becomeMerchant() {
        const updated = await repos.auth.becomeMerchant()
        queryClient.setQueryData(queryKeys.currentUser, updated)
        return updated
      },
      async refresh() {
        await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
      },
    }
  }, [query.data, query.isPending, establish, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Estado de autenticação e ações de conta. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return context
}

/**
 * Usuário autenticado. Use apenas em telas protegidas por `RequireAuth`
 * (onde o usuário sempre existe).
 */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser foi usado fora de uma rota autenticada.')
  return user
}

/** Indica se o usuário atual pode executar a ação (ver `services/permissions.ts`). */
export function usePermission(permission: Permission, resource?: PermissionResource): boolean {
  const { user } = useAuth()
  return can(user, permission, resource)
}
