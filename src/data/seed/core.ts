import type { CoreSeed, SeedContext } from './context'
import { buildFavorites, buildProducts, buildReviews } from './core/commerce'
import { buildSales, buildTransactions } from './core/finance'
import { buildUsers } from './core/people'
import {
  buildBusinesses,
  buildCategories,
  buildInstitutions,
  buildNeighborhoods,
  buildPublicServices,
} from './core/places'

/**
 * Gera a parte estrutural da base demonstrativa: lugares, pessoas, categorias,
 * instituições, serviços públicos, estabelecimentos, avaliações, produtos, vendas e
 * finanças. Tudo parte do elenco fixo (`cast.ts`); os dados são FICTÍCIOS.
 */
export function buildCore(ctx: SeedContext): CoreSeed {
  const { users, userSettings } = buildUsers(ctx)
  const products = buildProducts(ctx)
  const sales = buildSales(ctx, products)

  return {
    neighborhoods: buildNeighborhoods(ctx),
    users,
    userSettings,
    categories: buildCategories(),
    institutions: buildInstitutions(ctx),
    publicServices: buildPublicServices(ctx),
    businesses: buildBusinesses(ctx),
    reviews: buildReviews(ctx),
    favorites: buildFavorites(ctx),
    products,
    sales,
    transactions: buildTransactions(ctx, sales),
  }
}
