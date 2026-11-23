import { describe, expect, it } from 'vitest'

import type { CommunityEvent, Demand, Post } from '@/types'
import { offsetPoint } from '@/utils/geo'

import { FIXTURE, FIXTURE_CENTER, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const DAY = 86_400_000

function demand(id: string, extra: Partial<Demand> = {}): Demand {
  const createdAt = new Date(FIXTURE_NOW.getTime() - DAY).toISOString()
  return {
    id,
    protocol: `NX-2026-${id}`,
    authorId: FIXTURE.users.resident,
    categoryId: FIXTURE.categories.pothole,
    title: `Demanda ${id}`,
    description: 'Descrição longa. '.repeat(20),
    photos: [],
    location: offsetPoint(FIXTURE_CENTER, 100, 100),
    addressHint: 'Perto da praça',
    neighborhoodId: FIXTURE.neighborhoods.vila,
    urgency: 'medium',
    status: 'registered',
    supporterIds: [],
    history: [],
    createdAt,
    updatedAt: createdAt,
    ...extra,
  }
}

function event(
  id: string,
  startsInDays: number,
  extra: Partial<CommunityEvent> = {},
): CommunityEvent {
  const startsAt = new Date(FIXTURE_NOW.getTime() + startsInDays * DAY)
  return {
    id,
    title: `Evento ${id}`,
    description: 'Um evento.',
    categoryId: FIXTURE.categories.culture,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 3_600_000).toISOString(),
    venue: 'Praça Central',
    neighborhoodId: FIXTURE.neighborhoods.centro,
    location: offsetPoint(FIXTURE_CENTER, 50, 50),
    organizer: { kind: 'user', id: FIXTURE.users.resident, name: 'Rita' },
    attendeeIds: [],
    status: 'scheduled',
    createdBy: FIXTURE.users.resident,
    createdAt: FIXTURE_NOW.toISOString(),
    ...extra,
  }
}

function post(id: string, extra: Partial<Post> = {}): Post {
  return {
    id,
    authorId: FIXTURE.users.resident,
    category: 'discussion',
    content: 'Olá',
    neighborhoodId: FIXTURE.neighborhoods.vila,
    likedBy: [],
    moderation: 'visible',
    createdAt: new Date(FIXTURE_NOW.getTime() - 2 * DAY).toISOString(),
    ...extra,
  }
}

async function populated(): Promise<TestHarness> {
  const t = await createTestHarness()
  t.store.write(['demands', 'events', 'posts', 'reports'], (db) => {
    db.demands.push(
      demand('d1', { supporterIds: ['a', 'b'] }),
      demand('d2', { status: 'resolved' }),
      demand('d3', { status: 'in_progress', location: null }),
      demand('d4', { status: 'closed' }),
      demand('d5', {
        categoryId: FIXTURE.categories.otherDemand,
        neighborhoodId: FIXTURE.neighborhoods.centro,
        createdAt: new Date(FIXTURE_NOW.getTime() - 20 * DAY).toISOString(),
      }),
    )
    db.events.push(
      event('e1', 3),
      event('e2', -3),
      event('e3', 4, { status: 'cancelled' }),
      event('e4', 5, { location: undefined }),
    )
    db.posts.push(post('p1'), post('p2', { moderation: 'hidden' }), post('p3'))
    db.reports.push({
      id: 'rp1',
      targetType: 'post',
      targetId: 'p2',
      reporterId: FIXTURE.users.resident2,
      reason: 'spam',
      status: 'open',
      createdAt: FIXTURE_NOW.toISOString(),
    })
  })
  return t
}

describe('stats', () => {
  it('resumo comunitário coerente com os registros', async () => {
    const t = await populated()
    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.stats.getCommunitySummary()).toEqual({
      demandsRegistered: 5,
      demandsResolved: 1,
      demandsOpen: 3,
      businesses: 1,
      upcomingEvents: 2,
      residents: 2,
      posts: 2,
    })
  })

  it('resumo exige sessão e acompanha novos registros', async () => {
    const t = await populated()
    await expect(t.repos.stats.getCommunitySummary()).rejects.toMatchObject({
      code: 'unauthenticated',
    })
    t.signInAs(FIXTURE.users.resident)
    t.store.write(['demands'], (db) => {
      db.demands.push(demand('d6'))
    })
    expect((await t.repos.stats.getCommunitySummary()).demandsRegistered).toBe(6)
  })

  it('visão administrativa é restrita e traz séries e agrupamentos', async () => {
    const t = await populated()
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.stats.getAdminOverview()).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.admin)
    const overview = await t.repos.stats.getAdminOverview()
    expect(overview).toMatchObject({
      users: 8,
      businesses: 1,
      institutions: 3,
      demandsOpen: 3,
      demandsResolved: 1,
      demandsTotal: 5,
      posts: 2,
      events: 4,
      openReports: 1,
    })
    expect(overview.usersByRole.find((r) => r.key === 'resident')).toMatchObject({
      label: 'Morador',
      count: 3,
    })
    expect(overview.demandsByStatus.map((s) => s.count)).toEqual([2, 0, 1, 1, 1])
    expect(overview.demandsByStatus[0]).toMatchObject({ label: 'Registrada', color: 'orange' })
    expect(overview.demandsByCategory[0]).toMatchObject({ label: 'Buraco na rua', count: 4 })
    expect(overview.demandsByNeighborhood).toEqual([
      { key: FIXTURE.neighborhoods.vila, label: 'Vila Esperança', count: 4 },
      { key: FIXTURE.neighborhoods.centro, label: 'Centro', count: 1 },
    ])

    expect(overview.demandsPerWeek).toHaveLength(8)
    expect(overview.postsPerWeek).toHaveLength(8)
    expect(overview.demandsPerWeek.reduce((sum, b) => sum + b.value, 0)).toBe(5)
    expect(overview.demandsPerWeek.at(-1)?.value).toBeGreaterThanOrEqual(1)
    expect(overview.demandsPerWeek[0]?.label).toMatch(/^\d{2}\/\d{2}$/)
  })
})

describe('map', () => {
  it('gera pontos de todas as camadas com regras de visibilidade', async () => {
    const t = await populated()
    t.signInAs(FIXTURE.users.resident)
    const points = await t.repos.map.listPoints()
    const ids = points.map((p) => p.id).sort()
    expect(ids).toEqual(
      [
        'demands:d1',
        'demands:d2',
        'demands:d5',
        `businesses:${FIXTURE.business}`,
        `institutions:${FIXTURE.institutions.cityHall}`,
        'events:e1',
        `services:${FIXTURE.services.clinic}`,
        `accessibility:${FIXTURE.mobility.stairs}`,
        `accessibility:${FIXTURE.mobility.ramp}`,
        `transit:${FIXTURE.mobility.stopCentro}`,
        `transit:${FIXTURE.mobility.stopVila}`,
      ].sort(),
    )

    const d1 = points.find((p) => p.id === 'demands:d1')
    expect(d1).toMatchObject({
      layer: 'demands',
      refId: 'd1',
      to: '/demandas/d1',
      demandStatus: 'registered',
      meta: '2 apoios',
      categoryLabel: 'Buraco na rua',
      icon: 'pothole',
      color: 'terracotta',
      addressLabel: 'Perto da praça',
    })
    expect(d1?.description.length).toBeLessThanOrEqual(120)

    const business = points.find((p) => p.layer === 'businesses')
    expect(business?.to).toBe(`/comercio/${FIXTURE.business}`)
    // Quarta-feira, meio-dia: aberto.
    expect(business?.meta).toBe('Aberto agora')

    const evt = points.find((p) => p.layer === 'events')
    expect(evt).toMatchObject({ to: '/eventos/e1', addressLabel: 'Praça Central', icon: 'music' })
    expect(evt?.meta).toMatch(/^\d{2}\/\d{2} às \d+h/)
    expect(points.find((p) => p.layer === 'services')?.to).toBe(
      `/servicos/${FIXTURE.services.clinic}`,
    )
    expect(points.find((p) => p.layer === 'institutions')?.to).toBe(
      `/instituicoes/${FIXTURE.institutions.cityHall}`,
    )
  })

  it('filtra camadas e reflete mudanças nos registros', async () => {
    const t = await populated()
    t.signInAs(FIXTURE.users.resident)
    const onlyDemands = await t.repos.map.listPoints({ layers: ['demands'] })
    expect(onlyDemands.every((p) => p.layer === 'demands')).toBe(true)

    t.store.write(['demands', 'businesses'], (db) => {
      const target = db.demands.find((d) => d.id === 'd1')
      if (target) target.status = 'closed'
      const business = db.businesses[0]
      if (business) business.status = 'inactive'
    })
    const after = await t.repos.map.listPoints()
    expect(after.some((p) => p.id === 'demands:d1')).toBe(false)
    expect(after.some((p) => p.layer === 'businesses')).toBe(false)

    // Com o tempo, o evento termina e sai do mapa.
    t.setNow(new Date(2026, 10, 22, 12, 0))
    expect(await t.repos.map.listPoints({ layers: ['events'] })).toHaveLength(0)
  })

  it('mostra "Fechado" fora do horário e exige sessão', async () => {
    const t = await populated()
    await expect(t.repos.map.listPoints()).rejects.toMatchObject({ code: 'unauthenticated' })
    t.signInAs(FIXTURE.users.resident)
    t.setNow(new Date(2026, 10, 22, 12, 0)) // domingo
    const [business] = await t.repos.map.listPoints({ layers: ['businesses'] })
    expect(business?.meta).toBe('Fechado')
  })
})
