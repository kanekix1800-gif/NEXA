import type { NewsRepository } from '../contracts'
import type { LocalContext } from './context'

export function createNewsRepository(ctx: LocalContext): NewsRepository {
  return {
    async list(options = {}) {
      await ctx.latency(0.6)
      return ctx.store.read((db) => {
        const sorted = [...db.news].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        const { limit } = options
        return limit !== undefined && limit >= 0 ? sorted.slice(0, limit) : sorted
      })
    },

    async get(id) {
      await ctx.latency(0.4)
      return ctx.store.read((db) => db.news.find((article) => article.id === id) ?? null)
    },
  }
}
