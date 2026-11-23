import { config } from '@/config'

import type { SystemRepository } from '../contracts'
import type { LocalContext } from './context'
import { clearSession } from './session'

export function createSystemRepository(ctx: LocalContext): SystemRepository {
  return {
    async getInfo() {
      await ctx.latency(0.3)
      const seededAt = ctx.store.read((db) => db.meta.seededAt)
      return { isDemoMode: config.isDemoMode, storage: ctx.store.storageKind, seededAt }
    },

    async resetDemoData() {
      await ctx.latency()
      await ctx.store.reset()
      clearSession()
    },
  }
}
