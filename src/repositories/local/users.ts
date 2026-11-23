import { conflictError, validationError } from '@/utils/errors'
import { matchesSearch } from '@/utils/text'

import type { UsersRepository } from '../contracts'
import {
  requirePermission,
  requireRecord,
  requireUser,
  toPublicProfile,
  type LocalContext,
} from './context'

export function createUsersRepository(ctx: LocalContext): UsersRepository {
  return {
    async getPublicProfile(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireUser(db)
        const user = db.users.find((candidate) => candidate.id === id)
        return user ? toPublicProfile(db, user) : null
      })
    },

    async listAll(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requirePermission(db, 'user:manage')
        return db.users
          .filter((user) => !filters.role || filters.role === 'all' || user.role === filters.role)
          .filter((user) => matchesSearch(filters.search, user.name, user.email, user.username))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      })
    },

    async setStatus(id, status) {
      await ctx.latency()
      return ctx.store.write(['users'], (db) => {
        const admin = requirePermission(db, 'user:manage')
        if (status !== 'active' && status !== 'suspended') {
          throw validationError('Situação de conta inválida.')
        }
        const target = requireRecord(db.users, id, 'Usuário não encontrado.')
        if (target.id === admin.id) {
          throw conflictError('Você não pode alterar a situação da sua própria conta.')
        }
        if (target.role === 'admin') {
          throw conflictError('Contas de administração não podem ser suspensas por aqui.')
        }
        if (target.isDemoAccount) {
          throw conflictError('Contas demonstrativas não podem ser suspensas.')
        }
        target.status = status
        return target
      })
    },
  }
}
