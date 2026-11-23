import { addDays, startOfWeek } from 'date-fns'

import { DEMAND_STATUS_COLOR } from '@/components/icons/colors'
import {
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  OPEN_DEMAND_STATUSES,
  USER_ROLE_LABEL,
  type NamedCount,
  type TimeBucket,
  type UserRole,
} from '@/types'
import { now } from '@/utils/clock'
import { formatDayMonth } from '@/utils/dates'

import type { StatsRepository } from '../contracts'
import { requirePermission, requireUser, type LocalContext } from './context'

const WEEKS = 8
const ROLES: UserRole[] = ['resident', 'merchant', 'institution', 'admin']

/** Conta registros por semana (segunda a domingo) nas últimas 8 semanas. */
function weeklySeries(dates: string[]): TimeBucket[] {
  const currentStart = startOfWeek(now(), { weekStartsOn: 1 })
  const buckets: TimeBucket[] = []
  for (let index = WEEKS - 1; index >= 0; index -= 1) {
    const start = addDays(currentStart, -7 * index)
    const end = addDays(start, 7)
    const value = dates.filter((iso) => {
      const time = new Date(iso).getTime()
      return time >= start.getTime() && time < end.getTime()
    }).length
    buckets.push({ date: start.toISOString(), label: formatDayMonth(start), value })
  }
  return buckets
}

export function createStatsRepository(ctx: LocalContext): StatsRepository {
  return {
    async getCommunitySummary() {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireUser(db)
        const current = now().getTime()
        return {
          demandsRegistered: db.demands.length,
          demandsResolved: db.demands.filter((demand) => demand.status === 'resolved').length,
          demandsOpen: db.demands.filter((demand) => OPEN_DEMAND_STATUSES.includes(demand.status))
            .length,
          businesses: db.businesses.filter((business) => business.status === 'active').length,
          upcomingEvents: db.events.filter(
            (event) => event.status === 'scheduled' && new Date(event.endsAt).getTime() > current,
          ).length,
          residents: db.users.filter((user) => user.role === 'resident' && user.status === 'active')
            .length,
          posts: db.posts.filter((post) => post.moderation === 'visible').length,
        }
      })
    },

    async getAdminOverview() {
      await ctx.latency()
      return ctx.store.read((db) => {
        requirePermission(db, 'admin:access')

        const byCount = (a: NamedCount, b: NamedCount) =>
          b.count - a.count || a.label.localeCompare(b.label, 'pt-BR')

        const demandsByCategory: NamedCount[] = db.categories
          .filter((category) => category.kind === 'demand')
          .map((category) => ({
            key: category.id,
            label: category.name,
            count: db.demands.filter((demand) => demand.categoryId === category.id).length,
            color: category.color,
          }))
          .filter((item) => item.count > 0)
          .sort(byCount)

        const demandsByNeighborhood: NamedCount[] = db.neighborhoods
          .map((neighborhood) => ({
            key: neighborhood.id,
            label: neighborhood.name,
            count: db.demands.filter((demand) => demand.neighborhoodId === neighborhood.id).length,
          }))
          .filter((item) => item.count > 0)
          .sort(byCount)

        return {
          users: db.users.length,
          usersByRole: ROLES.map((role) => ({
            key: role,
            label: USER_ROLE_LABEL[role],
            count: db.users.filter((user) => user.role === role).length,
          })),
          businesses: db.businesses.filter((business) => business.status === 'active').length,
          institutions: db.institutions.length,
          demandsOpen: db.demands.filter((demand) => OPEN_DEMAND_STATUSES.includes(demand.status))
            .length,
          demandsResolved: db.demands.filter((demand) => demand.status === 'resolved').length,
          demandsTotal: db.demands.length,
          posts: db.posts.filter((post) => post.moderation === 'visible').length,
          events: db.events.length,
          openReports: db.reports.filter((report) => report.status === 'open').length,
          demandsByStatus: DEMAND_STATUS_ORDER.map((status) => ({
            key: status,
            label: DEMAND_STATUS_LABEL[status],
            count: db.demands.filter((demand) => demand.status === status).length,
            color: DEMAND_STATUS_COLOR[status],
          })),
          demandsByCategory,
          demandsByNeighborhood,
          demandsPerWeek: weeklySeries(db.demands.map((demand) => demand.createdAt)),
          postsPerWeek: weeklySeries(db.posts.map((post) => post.createdAt)),
        }
      })
    },
  }
}
