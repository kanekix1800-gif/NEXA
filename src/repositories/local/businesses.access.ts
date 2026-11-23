import { can } from '@/services/permissions'
import type { Business, Database, ID, User } from '@/types'
import { forbiddenError, notFoundError } from '@/utils/errors'

import { requirePermission, requireRecord } from './context'

/**
 * ACESSO AOS DADOS PRIVADOS DO NEXA Business
 * ─────────────────────────────────────────────────────────────────────────────
 * Produtos, vendas e lançamentos pertencem a UM estabelecimento e só podem ser
 * lidos ou alterados pelo proprietário (`business:manage`) — nem a administração
 * tem acesso. Usado pelos repositórios de produtos, vendas e lançamentos.
 */

export const MANAGE_FORBIDDEN_MESSAGE =
  'Somente o proprietário do estabelecimento pode acessar estes dados.'

/** Exige que o usuário atual seja o proprietário do estabelecimento indicado. */
export function requireBusinessManager(
  db: Database,
  businessId: ID,
): { user: User; business: Business } {
  const user = requirePermission(db, 'business:manage', { businessId }, MANAGE_FORBIDDEN_MESSAGE)
  const business = requireRecord(db.businesses, businessId, 'Estabelecimento não encontrado.')
  return { user, business }
}

/**
 * Localiza um registro privado (produto, venda, lançamento) pelo ID.
 * Registro de outro estabelecimento → `forbidden`; inexistente → `record` indefinido.
 */
export function findManagedRecord<T extends { id: ID; businessId: ID }>(
  db: Database,
  rows: T[],
  id: ID,
): { user: User; record: T | undefined } {
  const user = requirePermission(db, 'business:panel', undefined, MANAGE_FORBIDDEN_MESSAGE)
  const record = rows.find((row) => row.id === id)
  if (record && !can(user, 'business:manage', { businessId: record.businessId })) {
    throw forbiddenError(MANAGE_FORBIDDEN_MESSAGE)
  }
  return { user, record }
}

/** Como `findManagedRecord`, mas lança `not_found` quando o registro não existe. */
export function requireManagedRecord<T extends { id: ID; businessId: ID }>(
  db: Database,
  rows: T[],
  id: ID,
  notFoundMessage: string,
): { user: User; record: T } {
  const { user, record } = findManagedRecord(db, rows, id)
  if (!record) throw notFoundError(notFoundMessage)
  return { user, record }
}

/** Estabelecimento do registro (para ler as configurações privadas). */
export function businessOf(db: Database, businessId: ID): Business {
  return requireRecord(db.businesses, businessId, 'Estabelecimento não encontrado.')
}
