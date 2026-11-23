import type { ID, User, UserRole } from '@/types'

/**
 * PERMISSÕES POR PERFIL
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonte única das regras de autorização. É usada pelos repositórios (que recusam
 * a operação) e pela interface (que esconde/desabilita o que não é permitido).
 * Em uma migração para o Supabase, estas regras correspondem às políticas RLS.
 */

export type Permission =
  // Comunidade
  | 'post:create'
  | 'post:delete'
  | 'comment:delete'
  | 'content:report'
  | 'content:moderate'
  // Demandas
  | 'demand:create'
  | 'demand:support'
  | 'demand:manage'
  | 'demand:close'
  | 'demand:assign'
  | 'demand:delete'
  // Comércio
  | 'business:create'
  | 'business:edit'
  | 'business:panel'
  | 'business:manage'
  | 'business:review'
  | 'business:favorite'
  // Eventos
  | 'event:create'
  | 'event:attend'
  | 'event:manage'
  | 'event:delete'
  // Instituições
  | 'institution:panel'
  | 'institution:edit'
  | 'institution:verify'
  | 'initiative:publish'
  | 'initiative:manage'
  // Administração
  | 'admin:access'
  | 'category:manage'
  | 'user:manage'

/** Dados mínimos do recurso necessários para decidir permissões "de dono". */
export interface PermissionResource {
  /** Autor/criador/proprietário do recurso. */
  ownerId?: ID
  /** Instituição responsável (demandas, iniciativas) ou a própria instituição. */
  institutionId?: ID
  /** Estabelecimento relacionado. */
  businessId?: ID
  /** Demanda ainda em aberto (para `demand:close`). */
  isOpen?: boolean
}

type Actor = Pick<User, 'id' | 'role' | 'status' | 'businessId' | 'institutionId'>

const ALL_ROLES: UserRole[] = ['resident', 'merchant', 'institution', 'admin']

function isOwner(actor: Actor, resource?: PermissionResource): boolean {
  return resource?.ownerId !== undefined && resource.ownerId === actor.id
}

function representsInstitution(actor: Actor, resource?: PermissionResource): boolean {
  return (
    actor.role === 'institution' &&
    actor.institutionId !== undefined &&
    resource?.institutionId !== undefined &&
    actor.institutionId === resource.institutionId
  )
}

/**
 * Indica se o usuário pode executar a ação.
 * Para permissões que dependem do recurso (ex.: excluir a própria publicação),
 * informe `resource`; sem ele, a resposta considera apenas o perfil.
 */
export function can(
  actor: Actor | null | undefined,
  permission: Permission,
  resource?: PermissionResource,
): boolean {
  if (!actor || actor.status !== 'active') return false
  const { role } = actor
  const isAdmin = role === 'admin'

  switch (permission) {
    // ── Comunidade ──
    case 'post:create':
    case 'content:report':
      return ALL_ROLES.includes(role)
    case 'post:delete':
    case 'comment:delete':
      return isAdmin || isOwner(actor, resource)
    case 'content:moderate':
      return isAdmin

    // ── Demandas ──
    case 'demand:create':
      return ALL_ROLES.includes(role)
    case 'demand:support':
      // O autor não apoia a própria demanda.
      return !isOwner(actor, resource)
    case 'demand:manage':
      // Status institucional: somente a instituição responsável ou a administração.
      return isAdmin || representsInstitution(actor, resource)
    case 'demand:close':
      // O autor pode encerrar a própria demanda enquanto ela estiver em aberto.
      return isAdmin || (isOwner(actor, resource) && resource?.isOpen !== false)
    case 'demand:assign':
    case 'demand:delete':
      return isAdmin

    // ── Comércio ──
    case 'business:create':
      // Comerciante que ainda não possui estabelecimento.
      return role === 'merchant' && actor.businessId === undefined
    case 'business:edit':
      return isAdmin || isOwner(actor, resource)
    case 'business:panel':
      // Acesso à área NEXA Business: comerciante com estabelecimento cadastrado.
      return role === 'merchant' && actor.businessId !== undefined
    case 'business:manage':
      // Dados privados de UM negócio — somente o proprietário (nem a administração acessa).
      // Exige sempre o recurso: sem `businessId` a resposta é "não".
      return (
        role === 'merchant' &&
        actor.businessId !== undefined &&
        resource?.businessId === actor.businessId
      )
    case 'business:review':
      // O proprietário não avalia o próprio estabelecimento.
      return !isOwner(actor, resource)
    case 'business:favorite':
      return true

    // ── Eventos ──
    case 'event:create':
    case 'event:attend':
      return ALL_ROLES.includes(role)
    case 'event:manage':
      return isAdmin || isOwner(actor, resource)
    case 'event:delete':
      return isAdmin

    // ── Instituições ──
    case 'institution:panel':
      return role === 'institution' && actor.institutionId !== undefined
    case 'institution:edit':
      return isAdmin || representsInstitution(actor, resource)
    case 'institution:verify':
      return isAdmin
    case 'initiative:publish':
      return role === 'institution' && actor.institutionId !== undefined
    case 'initiative:manage':
      return isAdmin || representsInstitution(actor, resource)

    // ── Administração ──
    case 'admin:access':
    case 'category:manage':
    case 'user:manage':
      return isAdmin

    default: {
      const exhaustive: never = permission
      return exhaustive
    }
  }
}

/** Perfis que podem acessar cada área restrita do aplicativo (usado nas rotas protegidas). */
export const AREA_ROLES = {
  business: ['merchant'],
  institutionPanel: ['institution'],
  admin: ['admin'],
} as const satisfies Record<string, readonly UserRole[]>
