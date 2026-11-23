import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNT_LIST, DEMO_PASSWORD } from '@/data/demoAccounts'
import { DATABASE_SCHEMA_VERSION, type Database } from '@/types'
import { distanceMeters } from '@/utils/geo'
import { verifyPassword } from '@/utils/password'

import { buildSeedDatabase } from './seed'
import { BUSINESSES, NEIGHBORHOODS } from './seed/cast'

const NOW = new Date(2026, 10, 22, 15, 0)
const DAY = 86_400_000

const db: Database = buildSeedDatabase(NOW)
const nowMs = NOW.getTime()

const ids = <T extends { id: string }>(items: readonly T[]): Set<string> =>
  new Set(items.map((item) => item.id))
const unique = (values: readonly string[]): boolean => new Set(values).size === values.length

/** Quantidade (últimos `to` dias, a partir de `from`) — janelas por instante. */
const inWindow = (iso: string, fromDays: number, toDays: number, reference = nowMs): boolean => {
  const age = reference - new Date(iso).getTime()
  return age >= fromDays * DAY && age < toDays * DAY
}

function revenue(base: Database, fromDays: number, toDays: number, reference = nowMs): number {
  return base.sales
    .filter((sale) => inWindow(sale.soldAt, fromDays, toDays, reference))
    .reduce((sum, sale) => sum + sale.totalCents, 0)
}

function expenses(base: Database, fromDays: number, toDays: number, reference = nowMs): number {
  return base.transactions
    .filter(
      (entry) => entry.type === 'expense' && inWindow(entry.date, fromDays, toDays, reference),
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0)
}

describe('contagens da base demonstrativa', () => {
  it('tem os totais definidos na especificação', () => {
    expect(db.users.filter((user) => user.role === 'resident')).toHaveLength(12)
    expect(db.businesses).toHaveLength(8)
    expect(db.institutions).toHaveLength(4)
    expect(db.posts).toHaveLength(15)
    expect(db.demands).toHaveLength(12)
    expect(db.events).toHaveLength(8)
    expect(db.notifications).toHaveLength(15)
    expect(db.news).toHaveLength(6)
    expect(db.initiatives).toHaveLength(4)
    expect(db.publicServices).toHaveLength(8)
    expect(db.reports).toHaveLength(3)
    expect(db.users).toHaveLength(24)
    expect(db.meta.demandSequence).toBe(12)
  })

  it('usa a versão de esquema atual', () => {
    expect(db.meta.schemaVersion).toBe(DATABASE_SCHEMA_VERSION)
  })
})

describe('unicidade', () => {
  it('ids, e-mails, usernames e protocolos não se repetem', () => {
    const collections = [
      db.neighborhoods,
      db.users,
      db.categories,
      db.posts,
      db.comments,
      db.reports,
      db.demands,
      db.businesses,
      db.reviews,
      db.products,
      db.sales,
      db.transactions,
      db.institutions,
      db.initiatives,
      db.publicServices,
      db.events,
      db.notifications,
      db.news,
    ]
    for (const collection of collections)
      expect(unique(collection.map((item) => item.id))).toBe(true)
    expect(unique(db.users.map((user) => user.email))).toBe(true)
    expect(unique(db.users.map((user) => user.username))).toBe(true)
    expect(unique(db.demands.map((demand) => demand.protocol))).toBe(true)
    expect(unique(db.demands.flatMap((demand) => demand.history.map((entry) => entry.id)))).toBe(
      true,
    )
  })

  it('protocolos seguem a ordem de criação', () => {
    const sorted = [...db.demands].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    expect(sorted.map((demand) => demand.protocol)).toEqual(
      sorted.map((_, index) => `NX-2026-${String(index + 1).padStart(4, '0')}`),
    )
  })
})

describe('integridade referencial', () => {
  const userIds = ids(db.users)
  const categoryIds = ids(db.categories)
  const neighborhoodIds = ids(db.neighborhoods)
  const institutionIds = ids(db.institutions)
  const businessIds = ids(db.businesses)
  const productIds = ids(db.products)
  const eventIds = ids(db.events)
  const demandIds = ids(db.demands)
  const postIds = ids(db.posts)
  const commentIds = ids(db.comments)

  it('usuários apontam para bairro, estabelecimento e instituição existentes', () => {
    for (const user of db.users) {
      expect(neighborhoodIds.has(user.neighborhoodId)).toBe(true)
      if (user.businessId) expect(businessIds.has(user.businessId)).toBe(true)
      if (user.institutionId) expect(institutionIds.has(user.institutionId)).toBe(true)
    }
    expect(ids(db.userSettings.map((s) => ({ id: s.userId })))).toEqual(userIds)
  })

  it('estabelecimentos, categorias e instituições', () => {
    for (const business of db.businesses) {
      expect(userIds.has(business.ownerId)).toBe(true)
      expect(categoryIds.has(business.categoryId)).toBe(true)
      expect(neighborhoodIds.has(business.neighborhoodId)).toBe(true)
    }
    for (const category of db.categories) {
      if (category.defaultInstitutionId)
        expect(institutionIds.has(category.defaultInstitutionId)).toBe(true)
    }
    for (const institution of db.institutions) {
      if (institution.neighborhoodId)
        expect(neighborhoodIds.has(institution.neighborhoodId)).toBe(true)
    }
    for (const service of db.publicServices) {
      expect(neighborhoodIds.has(service.neighborhoodId)).toBe(true)
      if (service.institutionId) expect(institutionIds.has(service.institutionId)).toBe(true)
    }
  })

  it('avaliações e favoritos (autor nunca é o dono; uma avaliação por usuário e loja)', () => {
    for (const review of db.reviews) {
      const business = db.businesses.find((candidate) => candidate.id === review.businessId)
      expect(business).toBeDefined()
      expect(userIds.has(review.authorId)).toBe(true)
      expect(review.authorId).not.toBe(business?.ownerId)
      expect(review.rating).toBeGreaterThanOrEqual(1)
      expect(review.rating).toBeLessThanOrEqual(5)
    }
    expect(unique(db.reviews.map((review) => `${review.businessId}|${review.authorId}`))).toBe(true)
    for (const favorite of db.favorites) {
      expect(userIds.has(favorite.userId)).toBe(true)
      expect(businessIds.has(favorite.businessId)).toBe(true)
    }
  })

  it('produtos, vendas e lançamentos', () => {
    for (const product of db.products) expect(businessIds.has(product.businessId)).toBe(true)
    for (const sale of db.sales) {
      expect(businessIds.has(sale.businessId)).toBe(true)
      expect(userIds.has(sale.createdBy)).toBe(true)
      for (const item of sale.items) expect(productIds.has(item.productId)).toBe(true)
    }
    for (const entry of db.transactions) {
      expect(businessIds.has(entry.businessId)).toBe(true)
      expect(userIds.has(entry.createdBy)).toBe(true)
    }
  })

  it('publicações e comentários', () => {
    for (const post of db.posts) {
      expect(userIds.has(post.authorId)).toBe(true)
      expect(neighborhoodIds.has(post.neighborhoodId)).toBe(true)
      if (post.institutionId) expect(institutionIds.has(post.institutionId)).toBe(true)
      if (post.businessId) expect(businessIds.has(post.businessId)).toBe(true)
      if (post.linkedDemandId) expect(demandIds.has(post.linkedDemandId)).toBe(true)
      if (post.linkedEventId) expect(eventIds.has(post.linkedEventId)).toBe(true)
      expect(post.likedBy.length).toBeGreaterThanOrEqual(2)
      expect(post.likedBy.length).toBeLessThanOrEqual(12)
      expect(unique(post.likedBy)).toBe(true)
      for (const id of post.likedBy) expect(userIds.has(id)).toBe(true)
    }
    for (const comment of db.comments) {
      expect(userIds.has(comment.authorId)).toBe(true)
      const targets = comment.targetType === 'post' ? postIds : demandIds
      expect(targets.has(comment.targetId)).toBe(true)
    }
    for (const report of db.reports) {
      expect(userIds.has(report.reporterId)).toBe(true)
      expect((report.targetType === 'post' ? postIds : commentIds).has(report.targetId)).toBe(true)
    }
  })

  it('demandas', () => {
    for (const demand of db.demands) {
      expect(userIds.has(demand.authorId)).toBe(true)
      expect(categoryIds.has(demand.categoryId)).toBe(true)
      expect(neighborhoodIds.has(demand.neighborhoodId)).toBe(true)
      expect(institutionIds.has(demand.institutionId ?? '')).toBe(true)
      expect(unique(demand.supporterIds)).toBe(true)
      expect(demand.supporterIds).not.toContain(demand.authorId)
      for (const id of demand.supporterIds) expect(userIds.has(id)).toBe(true)
      expect(demand.location).not.toBeNull()
      expect(demand.history[0]?.message).toBe('Demanda registrada.')
      expect(demand.history[1]?.actorKind).toBe('system')
      for (const entry of demand.history)
        if (entry.actorKind !== 'citizen') expect(entry.simulated).toBe(true)
    }
    const dem1 = db.demands.find((demand) => demand.id === 'dem_01')
    expect(dem1?.supporterIds).toHaveLength(11)
    expect(dem1?.status).toBe('in_progress')
    expect(db.demands.filter((demand) => demand.aiSuggestion).length).toBe(3)
  })

  it('eventos', () => {
    for (const event of db.events) {
      expect(categoryIds.has(event.categoryId)).toBe(true)
      expect(neighborhoodIds.has(event.neighborhoodId)).toBe(true)
      expect(userIds.has(event.createdBy)).toBe(true)
      expect(unique(event.attendeeIds)).toBe(true)
      for (const id of event.attendeeIds) expect(userIds.has(id)).toBe(true)
      const organizerIds = { user: userIds, institution: institutionIds, business: businessIds }
      expect(organizerIds[event.organizer.kind].has(event.organizer.id)).toBe(true)
      expect(new Date(event.endsAt).getTime()).toBeGreaterThan(new Date(event.startsAt).getTime())
    }
    const oficina = db.events.find((event) => event.title === 'Oficina de Educação Financeira')
    expect(oficina?.capacity).toBe(20)
    expect(oficina?.attendeeIds).toHaveLength(14)
    const mutirao = db.events.find((event) => event.title === 'Mutirão de Revitalização da Praça')
    expect(mutirao?.attendeeIds).toContain('usr_antonio')
  })

  it('iniciativas, notificações e notícias', () => {
    for (const initiative of db.initiatives) {
      expect(institutionIds.has(initiative.institutionId)).toBe(true)
      expect(userIds.has(initiative.createdBy)).toBe(true)
    }
    for (const notification of db.notifications) {
      expect(userIds.has(notification.userId)).toBe(true)
      expect(notification.link?.startsWith('/')).toBe(true)
    }
    expect(db.notifications.filter((n) => n.userId === 'usr_antonio')).toHaveLength(8)
    for (const article of db.news) {
      if (article.linkedEventId) expect(eventIds.has(article.linkedEventId)).toBe(true)
      expect(article.body.length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('Padaria do Bairro: vendas e finanças', () => {
  const padaria = BUSINESSES.padaria.id

  it('cada venda tem exatamente um lançamento de receita com o mesmo valor', () => {
    for (const sale of db.sales) {
      const entries = db.transactions.filter((entry) => entry.saleId === sale.id)
      expect(entries).toHaveLength(1)
      expect(entries[0]?.category).toBe('sales')
      expect(entries[0]?.type).toBe('income')
      expect(entries[0]?.amountCents).toBe(sale.totalCents)
    }
    expect(db.transactions.filter((entry) => entry.category === 'sales')).toHaveLength(
      db.sales.length,
    )
  })

  it('total = soma dos itens − desconto', () => {
    for (const sale of db.sales) {
      const subtotal = sale.items.reduce(
        (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
        0,
      )
      expect(sale.items.length).toBeGreaterThanOrEqual(1)
      expect(sale.items.length).toBeLessThanOrEqual(4)
      expect(sale.subtotalCents).toBe(subtotal)
      expect(sale.totalCents).toBe(subtotal - sale.discountCents)
      expect(sale.discountCents).toBeGreaterThanOrEqual(0)
      expect(sale.totalCents).toBeGreaterThan(0)
      expect(sale.businessId).toBe(padaria)
      expect(sale.createdBy).toBe('usr_carla')
    }
  })

  it('o histórico cobre 63 dias, com 4 a 7 vendas por dia completo, nunca no futuro', () => {
    const perDay = new Map<string, number>()
    for (const sale of db.sales) {
      const sold = new Date(sale.soldAt)
      expect(sold.getTime()).toBeLessThanOrEqual(nowMs)
      expect(nowMs - sold.getTime()).toBeLessThan(63 * DAY)
      const key = `${sold.getFullYear()}-${sold.getMonth()}-${sold.getDate()}`
      perDay.set(key, (perDay.get(key) ?? 0) + 1)
      const hour = sold.getHours() + sold.getMinutes() / 60
      expect(hour).toBeGreaterThanOrEqual(6)
      expect(hour).toBeLessThan(sold.getDay() === 0 ? 13 : 20)
    }
    const today = `${NOW.getFullYear()}-${NOW.getMonth()}-${NOW.getDate()}`
    for (const [key, count] of perDay) {
      if (key === today) continue
      expect(count).toBeGreaterThanOrEqual(4)
      expect(count).toBeLessThanOrEqual(7)
    }
    expect(perDay.size).toBeGreaterThanOrEqual(62)
  })

  it('as formas de pagamento seguem a distribuição esperada', () => {
    const share = (method: string): number =>
      db.sales.filter((sale) => sale.paymentMethod === method).length / db.sales.length
    expect(share('pix')).toBeGreaterThan(0.35)
    expect(share('pix')).toBeLessThan(0.55)
    expect(share('cash')).toBeGreaterThan(0.1)
    expect(share('debit_card')).toBeGreaterThan(0.1)
    expect(share('credit_card')).toBeGreaterThan(0.07)
  })

  it('Pão francês é o item mais vendido dos últimos 7 dias', () => {
    const quantities = new Map<string, number>()
    for (const sale of db.sales.filter((entry) => inWindow(entry.soldAt, 0, 7))) {
      for (const item of sale.items)
        quantities.set(item.productName, (quantities.get(item.productName) ?? 0) + item.quantity)
    }
    const [top] = [...quantities.entries()].sort((a, b) => b[1] - a[1])
    expect(top?.[0]).toBe('Pão francês')
  })

  it('o faturamento cresce (7 e 30 dias) e as despesas recentes são maiores', () => {
    expect(revenue(db, 0, 7)).toBeGreaterThan(revenue(db, 7, 14))
    expect(revenue(db, 0, 30)).toBeGreaterThan(revenue(db, 30, 60))
    expect(expenses(db, 0, 30)).toBeGreaterThan(expenses(db, 30, 60))
    expect(revenue(db, 0, 30)).toBeGreaterThan(expenses(db, 0, 30))
  })

  it('mantém os comparativos em outros dias e horários de geração', () => {
    for (const [day, hour] of [
      [23, 9],
      [24, 7],
      [25, 20],
      [26, 12],
      [27, 3],
      [28, 18],
      [29, 11],
    ] as const) {
      const date = new Date(2026, 10, day, hour, 0)
      const other = buildSeedDatabase(date)
      const ref = date.getTime()
      expect(revenue(other, 0, 7, ref)).toBeGreaterThan(revenue(other, 7, 14, ref))
      expect(revenue(other, 0, 30, ref)).toBeGreaterThan(revenue(other, 30, 60, ref))
      expect(expenses(other, 0, 30, ref)).toBeGreaterThan(expenses(other, 30, 60, ref))
      for (const sale of other.sales)
        expect(new Date(sale.soldAt).getTime()).toBeLessThanOrEqual(ref)
    }
  })

  it('exatamente 3 produtos com estoque baixo e nenhum rastreado zerado', () => {
    const products = db.products.filter((product) => product.businessId === padaria)
    expect(products.length).toBeGreaterThanOrEqual(15)
    const low = products.filter(
      (product) => product.trackStock && product.stock > 0 && product.stock <= product.minStock,
    )
    expect(low).toHaveLength(3)
    for (const product of products) {
      expect(product.stock).toBeGreaterThanOrEqual(0)
      if (product.trackStock) expect(product.stock).toBeGreaterThan(0)
    }
    for (const product of db.products) expect(product.stock).toBeGreaterThanOrEqual(0)
    expect(products.find((product) => product.name === 'Pão francês')?.priceCents).toBe(90)
  })

  it('nota média das avaliações bate com a especificação', () => {
    const average = (businessId: string): { avg: number; count: number } => {
      const list = db.reviews.filter((review) => review.businessId === businessId)
      return {
        avg: list.reduce((sum, review) => sum + review.rating, 0) / list.length,
        count: list.length,
      }
    }
    const padariaAvg = average(padaria)
    expect(padariaAvg.count).toBe(9)
    expect(Math.round(padariaAvg.avg * 10) / 10).toBe(4.8)
    expect(average(BUSINESSES.farmacia.id).count).toBe(7)
    expect(Math.round(average(BUSINESSES.farmacia.id).avg * 10) / 10).toBe(4.7)
    expect(average(BUSINESSES.mercadinho.id).count).toBe(5)
    expect(Math.round(average(BUSINESSES.mercadinho.id).avg * 10) / 10).toBe(4.6)
    for (const key of ['restaurante', 'salao', 'tecnofix', 'atelie', 'pet'] as const) {
      const { avg, count } = average(BUSINESSES[key].id)
      expect(count).toBeGreaterThanOrEqual(3)
      expect(count).toBeLessThanOrEqual(5)
      expect(avg).toBeGreaterThanOrEqual(4.3)
      expect(avg).toBeLessThanOrEqual(4.9)
    }
  })

  it('o morador demo avaliou a TecnoFix, não a Padaria, e favoritou Farmácia e Sabor de Casa', () => {
    const mine = db.reviews
      .filter((review) => review.authorId === 'usr_antonio')
      .map((review) => review.businessId)
    expect(mine).toContain(BUSINESSES.tecnofix.id)
    expect(mine).not.toContain(padaria)
    const favorites = db.favorites
      .filter((favorite) => favorite.userId === 'usr_antonio')
      .map((f) => f.businessId)
    expect(favorites.sort()).toEqual([BUSINESSES.farmacia.id, BUSINESSES.restaurante.id].sort())
  })
})

describe('datas', () => {
  it('há pelo menos 5 eventos futuros e 2 realizados', () => {
    expect(
      db.events.filter((event) => new Date(event.startsAt).getTime() > nowMs).length,
    ).toBeGreaterThanOrEqual(5)
    expect(
      db.events.filter((event) => new Date(event.endsAt).getTime() < nowMs).length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('nenhuma data de conteúdo está no futuro (exceto início/fim de eventos)', () => {
    const dates: string[] = [
      ...db.users.map((user) => user.createdAt),
      ...db.businesses.flatMap((b) => [b.createdAt, b.updatedAt]),
      ...db.reviews.map((r) => r.createdAt),
      ...db.favorites.map((f) => f.createdAt),
      ...db.products.flatMap((p) => [p.createdAt, p.updatedAt]),
      ...db.sales.flatMap((s) => [s.soldAt, s.createdAt]),
      ...db.transactions.flatMap((t) => [t.date, t.createdAt]),
      ...db.posts.map((p) => p.createdAt),
      ...db.comments.map((c) => c.createdAt),
      ...db.reports.flatMap((r) => [r.createdAt, ...(r.resolvedAt ? [r.resolvedAt] : [])]),
      ...db.demands.flatMap((d) => [
        d.createdAt,
        d.updatedAt,
        ...d.history.map((h) => h.createdAt),
      ]),
      ...db.events.map((e) => e.createdAt),
      ...db.initiatives.map((i) => i.createdAt),
      ...db.institutions.map((i) => i.createdAt),
      ...db.notifications.map((n) => n.createdAt),
      ...db.news.map((n) => n.publishedAt),
    ]
    for (const iso of dates) expect(new Date(iso).getTime()).toBeLessThanOrEqual(nowMs)
  })

  it('o histórico de cada demanda é cronológico', () => {
    for (const demand of db.demands) {
      const times = demand.history.map((entry) => new Date(entry.createdAt).getTime())
      expect([...times].sort((a, b) => a - b)).toEqual(times)
    }
  })

  it('comentários não antecedem seus alvos', () => {
    for (const comment of db.comments) {
      const target =
        comment.targetType === 'post'
          ? db.posts.find((post) => post.id === comment.targetId)
          : db.demands.find((demand) => demand.id === comment.targetId)
      expect(new Date(comment.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(target?.createdAt ?? 0).getTime(),
      )
    }
  })
})

describe('contas demonstrativas', () => {
  it('as 4 contas existem com os papéis certos e a senha confere', async () => {
    expect(DEMO_ACCOUNT_LIST).toHaveLength(4)
    for (const account of DEMO_ACCOUNT_LIST) {
      const user = db.users.find((candidate) => candidate.id === account.userId)
      expect(user?.role).toBe(account.role)
      expect(user?.email).toBe(account.email)
      expect(user?.isDemoAccount).toBe(true)
      expect(user?.status).toBe('active')
      const credential = db.credentials.find((candidate) => candidate.userId === account.userId)
      expect(credential).toBeDefined()
      if (credential) expect(await verifyPassword(DEMO_PASSWORD, credential)).toBe(true)
    }
    expect(db.users.filter((user) => user.isDemoAccount)).toHaveLength(4)
  })

  it('comerciante e instituição demo apontam para a Padaria e a Prefeitura', () => {
    expect(db.users.find((user) => user.id === 'usr_carla')?.businessId).toBe('biz_padaria')
    expect(db.users.find((user) => user.id === 'usr_roberto')?.institutionId).toBe('ins_prefeitura')
  })
})

describe('geografia e dados fictícios', () => {
  it('distâncias do centro da Vila Esperança: 500 m, 700 m e 1000 m', () => {
    const center = db.neighborhoods.find((nb) => nb.id === NEIGHBORHOODS.vila.id)?.center
    expect(center).toBeDefined()
    if (!center) return
    const distance = (id: string): number => {
      const business = db.businesses.find((candidate) => candidate.id === id)
      return business ? distanceMeters(center, business.location) : Number.NaN
    }
    expect(Math.abs(distance(BUSINESSES.padaria.id) - 500)).toBeLessThanOrEqual(15)
    expect(Math.abs(distance(BUSINESSES.farmacia.id) - 700)).toBeLessThanOrEqual(15)
    expect(Math.abs(distance(BUSINESSES.mercadinho.id) - 1000)).toBeLessThanOrEqual(15)
  })

  it('demandas ficam a até ~450 m do centro do seu bairro', () => {
    for (const demand of db.demands) {
      const center = db.neighborhoods.find((nb) => nb.id === demand.neighborhoodId)?.center
      if (center && demand.location)
        expect(distanceMeters(center, demand.location)).toBeLessThanOrEqual(450)
    }
  })

  it('todos os telefones começam com "00" e tudo é marcado como demonstrativo', () => {
    const phones = [
      ...db.businesses.flatMap((b) => [b.phone, ...(b.whatsapp ? [b.whatsapp] : [])]),
      ...db.institutions.flatMap((i) => (i.phone ? [i.phone] : [])),
      ...db.publicServices.flatMap((s) => (s.phone ? [s.phone] : [])),
    ]
    expect(phones.length).toBeGreaterThan(0)
    for (const phone of phones) expect(phone.startsWith('00')).toBe(true)
    for (const business of db.businesses) expect(business.isDemo).toBe(true)
    for (const institution of db.institutions) {
      expect(institution.isDemo).toBe(true)
      expect(institution.verified).toBe(true)
      expect(institution.website).toBeUndefined()
    }
    for (const user of db.users) expect(user.email.endsWith('@nexa.demo')).toBe(true)
  })

  it('o SEBRAE traz o aviso de que não há parceria oficial', () => {
    const sebrae = db.institutions.find((institution) => institution.id === 'ins_sebrae')
    expect(sebrae?.description).toContain(
      'o NEXA não possui parceria oficial com a instituição citada',
    )
  })

  it('horários da Padaria e da Farmácia', () => {
    const padaria = db.businesses.find((b) => b.id === 'biz_padaria')
    const farmacia = db.businesses.find((b) => b.id === 'biz_farmacia')
    expect(padaria?.schedule[0]).toEqual({ open: '06:00', close: '13:00' })
    expect(padaria?.schedule[3]).toEqual({ open: '06:00', close: '20:00' })
    for (const hours of farmacia?.schedule ?? [])
      expect(hours).toEqual({ open: '07:00', close: '22:00' })
  })
})

describe('moderação e feed', () => {
  it('há uma publicação suspeita de rifa com denúncia de spam aberta', () => {
    const rifa = db.posts.find((post) => post.content.includes('RIFA'))
    expect(rifa).toBeDefined()
    const report = db.reports.find((candidate) => candidate.targetId === rifa?.id)
    expect(report?.reason).toBe('spam')
    expect(report?.status).toBe('open')
    expect(db.reports.filter((r) => r.status === 'open')).toHaveLength(2)
    expect(db.reports.filter((r) => r.status === 'dismissed')).toHaveLength(1)
  })

  it('as publicações exigidas existem com o texto exato', () => {
    const texts = db.posts.map((post) => post.content)
    expect(texts).toContain('Alguém sabe se o posto de saúde do bairro vai abrir no sábado?')
    expect(texts).toContain('Vamos juntos na ação de arrecadação de alimentos!')
    expect(texts).toContain('Estamos organizando um mutirão para revitalizar a praça do bairro.')
    expect(db.posts.filter((post) => post.category === 'demand')).toHaveLength(4)
    expect(db.posts.filter((post) => post.category === 'event')).toHaveLength(3)
    expect(db.posts.filter((post) => post.category === 'commerce')).toHaveLength(2)
  })
})

describe('determinismo', () => {
  it('duas gerações com a mesma data são idênticas', () => {
    const again = buildSeedDatabase(new Date(2026, 10, 22, 15, 0))
    const { credentials: firstCredentials, ...first } = db
    const { credentials: secondCredentials, ...second } = again
    expect(second).toEqual(first)
    expect(secondCredentials.map((c) => c.hash)).toEqual(firstCredentials.map((c) => c.hash))
  })
})
