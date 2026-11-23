import type { NotificationsRepository } from '../contracts'
import { requireRecord, requireUser, type LocalContext } from './context'

export function createNotificationsRepository(ctx: LocalContext): NotificationsRepository {
  return {
    async list(filters = {}) {
      await ctx.latency(0.6)
      return ctx.store.read((db) => {
        const user = requireUser(db)
        return db.notifications
          .filter((item) => item.userId === user.id)
          .filter(
            (item) =>
              !filters.category || filters.category === 'all' || item.category === filters.category,
          )
          .filter((item) => !filters.unreadOnly || !item.read)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      })
    },

    async unreadCount() {
      await ctx.latency(0.3)
      return ctx.store.read((db) => {
        const user = requireUser(db)
        return db.notifications.filter((item) => item.userId === user.id && !item.read).length
      })
    },

    async markRead(id, read = true) {
      await ctx.latency(0.3)
      ctx.store.write(['notifications'], (db) => {
        const user = requireUser(db)
        const own = db.notifications.filter((item) => item.userId === user.id)
        requireRecord(own, id, 'Notificação não encontrada.').read = read
      })
    },

    async markAllRead(category) {
      await ctx.latency(0.3)
      ctx.store.write(['notifications'], (db) => {
        const user = requireUser(db)
        for (const item of db.notifications) {
          if (item.userId === user.id && (!category || item.category === category)) item.read = true
        }
      })
    },

    async remove(id) {
      await ctx.latency(0.3)
      ctx.store.write(['notifications'], (db) => {
        const user = requireUser(db)
        const own = db.notifications.filter((item) => item.userId === user.id)
        requireRecord(own, id, 'Notificação não encontrada.')
        db.notifications = db.notifications.filter((item) => item.id !== id)
      })
    },
  }
}
