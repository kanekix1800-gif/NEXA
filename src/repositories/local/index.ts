import type { Repositories } from '../contracts'
import { createAIConversationsRepository } from './aiConversations'
import { createAuthRepository } from './auth'
import { createBusinessesRepository } from './businesses'
import { createLocalContext } from './context'
import { createDemandsRepository } from './demands'
import { createEventsRepository } from './events'
import { createInstitutionsRepository } from './institutions'
import { createMapRepository } from './map'
import { createModerationRepository } from './moderation'
import { createNewsRepository } from './news'
import { createNotificationsRepository } from './notifications'
import { createPostsRepository } from './posts'
import { createProductsRepository } from './products'
import { createReferenceRepository } from './reference'
import { createSalesRepository } from './sales'
import { createSettingsRepository } from './settings'
import { createStatsRepository } from './stats'
import type { LocalStore } from './store'
import { createSystemRepository } from './system'
import { createTransactionsRepository } from './transactions'
import { createUsersRepository } from './users'

/**
 * Implementação LOCAL (modo demonstração) de todos os repositórios do NEXA,
 * com persistência no próprio dispositivo. Cada repositório fica em um arquivo
 * desta pasta e recebe o mesmo contexto (`LocalContext`).
 */
export function createLocalRepositories(store: LocalStore): Repositories {
  const ctx = createLocalContext(store)
  return {
    auth: createAuthRepository(ctx),
    users: createUsersRepository(ctx),
    reference: createReferenceRepository(ctx),
    posts: createPostsRepository(ctx),
    moderation: createModerationRepository(ctx),
    demands: createDemandsRepository(ctx),
    businesses: createBusinessesRepository(ctx),
    products: createProductsRepository(ctx),
    sales: createSalesRepository(ctx),
    transactions: createTransactionsRepository(ctx),
    institutions: createInstitutionsRepository(ctx),
    events: createEventsRepository(ctx),
    notifications: createNotificationsRepository(ctx),
    news: createNewsRepository(ctx),
    stats: createStatsRepository(ctx),
    map: createMapRepository(ctx),
    aiConversations: createAIConversationsRepository(ctx),
    settings: createSettingsRepository(ctx),
    system: createSystemRepository(ctx),
  }
}
