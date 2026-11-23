import type { CommunitySeed, SeedContext } from './context'
import { buildInitiatives, buildNews, buildNotifications } from './community/content'
import { buildDemands } from './community/demands'
import { buildEvents } from './community/events'
import { buildComments, buildPosts, buildReports } from './community/posts'

/**
 * Gera a parte "viva" da base demonstrativa: demandas, eventos, publicações,
 * comentários, denúncias, iniciativas, notificações e notícias.
 * Todo o conteúdo é FICTÍCIO; as atualizações institucionais são simuladas.
 */
export function buildCommunity(ctx: SeedContext): CommunitySeed {
  const demands = buildDemands(ctx)
  const events = buildEvents(ctx)
  const { posts, idOf } = buildPosts(ctx)

  const demandCreatedAt = Object.fromEntries(demands.map((demand) => [demand.id, demand.createdAt]))
  const { comments, idOfKey } = buildComments(ctx, posts, idOf, demandCreatedAt)
  const commentDates = Object.fromEntries(
    Object.entries(idOfKey).flatMap(([key, id]) => {
      const comment = comments.find((candidate) => candidate.id === id)
      return comment ? [[key, comment.createdAt] as const] : []
    }),
  )

  return {
    posts,
    comments,
    reports: buildReports(ctx, idOf, idOfKey),
    demands,
    events,
    initiatives: buildInitiatives(ctx),
    notifications: buildNotifications(ctx, demands, idOf, commentDates),
    news: buildNews(ctx),
    demandSequence: demands.length,
  }
}
