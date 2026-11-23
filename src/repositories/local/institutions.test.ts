import { beforeEach, describe, expect, it } from 'vitest'

import { offsetPoint } from '@/utils/geo'

import { FIXTURE, FIXTURE_CENTER, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const DAY = 24 * 60 * 60 * 1000

let t: TestHarness

beforeEach(async () => {
  t = await createTestHarness()
})

function unverifyNgo() {
  t.store.write(['institutions'], (db) => {
    const ngo = db.institutions.find((i) => i.id === FIXTURE.institutions.ngo)
    if (ngo) ngo.verified = false
  })
}

describe('instituições — diretório', () => {
  it('lista apenas instituições verificadas, em ordem alfabética', async () => {
    t.signInAs(FIXTURE.users.resident)
    const list = await t.repos.institutions.list()
    expect(list.map((i) => i.name)).toEqual(['ONG Viva Melhor', 'Prefeitura Municipal'])
    expect(await t.repos.institutions.list({ includeUnverified: true })).toHaveLength(2)
    expect((await t.repos.institutions.list({ category: 'ngo' })).map((i) => i.id)).toEqual([
      FIXTURE.institutions.ngo,
    ])
    expect(
      (await t.repos.institutions.list({ search: 'infraestrutura' })).map((i) => i.id),
    ).toEqual([FIXTURE.institutions.cityHall])
    expect(await t.repos.institutions.get(FIXTURE.institutions.unverified)).toBeNull()

    t.signInAs(FIXTURE.users.admin)
    expect(await t.repos.institutions.list({ includeUnverified: true })).toHaveLength(3)
    expect(await t.repos.institutions.get(FIXTURE.institutions.unverified)).not.toBeNull()
  })

  it('getMine devolve a instituição da conta institucional', async () => {
    t.signInAs(FIXTURE.users.institution)
    const mine = await t.repos.institutions.getMine()
    expect(mine).toMatchObject({
      id: FIXTURE.institutions.cityHall,
      isMine: true,
      neighborhoodName: 'Centro',
    })
    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.institutions.getMine()).toBeNull()
  })

  it('edição pela própria conta ou pela administração', async () => {
    t.signInAs(FIXTURE.users.institution2)
    await expect(
      t.repos.institutions.update(FIXTURE.institutions.cityHall, { tagline: 'Outra frase' }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.institution)
    const updated = await t.repos.institutions.update(FIXTURE.institutions.cityHall, {
      tagline: '  Atendimento ao cidadão  ',
      areas: ['Obras', ' ', 'Obras', 'Iluminação'],
      phone: '',
    })
    expect(updated.tagline).toBe('Atendimento ao cidadão')
    expect(updated.areas).toEqual(['Obras', 'Iluminação'])
    await expect(
      t.repos.institutions.update(FIXTURE.institutions.cityHall, { email: 'invalido' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('verificação pela administração notifica as contas da instituição', async () => {
    t.signInAs(FIXTURE.users.institution)
    await expect(
      t.repos.institutions.setVerified(FIXTURE.institutions.ngo, false),
    ).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.admin)
    const view = await t.repos.institutions.setVerified(FIXTURE.institutions.ngo, false)
    expect(view.verified).toBe(false)
    expect(
      t.snapshot().notifications.find((n) => n.userId === FIXTURE.users.institution2),
    ).toMatchObject({
      category: 'institutions',
    })
  })
})

describe('instituições — iniciativas', () => {
  it('instituição não verificada não publica iniciativa; outros perfis também não', async () => {
    t.signInAs(FIXTURE.users.resident)
    await expect(
      t.repos.institutions.publishInitiative({
        title: 'Horta comunitária',
        description: 'Cultivo coletivo de hortaliças.',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    unverifyNgo()
    t.signInAs(FIXTURE.users.institution2)
    await expect(
      t.repos.institutions.publishInitiative({
        title: 'Horta comunitária',
        description: 'Cultivo coletivo de hortaliças.',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(t.snapshot().initiatives).toHaveLength(0)
  })

  it('iniciativa cria publicação no feed; remover apaga a publicação', async () => {
    t.signInAs(FIXTURE.users.institution)
    const initiative = await t.repos.institutions.publishInitiative({
      title: 'Mutirão de limpeza',
      description: 'Vamos limpar a praça central juntos no sábado.',
    })
    expect(initiative).toMatchObject({
      status: 'active',
      institutionId: FIXTURE.institutions.cityHall,
      institutionName: 'Prefeitura Municipal',
      isMine: true,
    })
    const post = t.snapshot().posts.find((p) => p.id === initiative.postId)
    expect(post).toMatchObject({ category: 'social', institutionId: FIXTURE.institutions.cityHall })

    t.signInAs(FIXTURE.users.resident)
    const listed = await t.repos.institutions.listInitiatives()
    expect(listed.map((i) => i.id)).toEqual([initiative.id])
    expect(listed[0]?.isMine).toBe(false)
    expect((await t.repos.institutions.get(FIXTURE.institutions.cityHall))?.initiativeCount).toBe(1)

    t.signInAs(FIXTURE.users.institution2)
    await expect(
      t.repos.institutions.updateInitiative(initiative.id, { status: 'finished' }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(t.repos.institutions.removeInitiative(initiative.id)).rejects.toMatchObject({
      code: 'forbidden',
    })

    t.signInAs(FIXTURE.users.institution)
    const finished = await t.repos.institutions.updateInitiative(initiative.id, {
      status: 'finished',
    })
    expect(finished.status).toBe('finished')
    await t.repos.institutions.removeInitiative(initiative.id)
    expect(t.snapshot().initiatives).toHaveLength(0)
    expect(t.snapshot().posts).toHaveLength(0)
  })

  it('sem publicação no feed quando shareOnFeed é falso', async () => {
    t.signInAs(FIXTURE.users.institution)
    const initiative = await t.repos.institutions.publishInitiative({
      title: 'Curso de informática',
      description: 'Aulas gratuitas para a terceira idade.',
      shareOnFeed: false,
    })
    expect(initiative.postId).toBeUndefined()
    expect(t.snapshot().posts).toHaveLength(0)
  })
})

describe('instituições — painel', () => {
  async function seedDemands() {
    t.signInAs(FIXTURE.users.resident)
    const input = {
      categoryId: FIXTURE.categories.pothole,
      title: 'Buraco na rua principal',
      description: 'Buraco grande perto do ponto de ônibus.',
      location: offsetPoint(FIXTURE_CENTER, 850, -650),
      urgency: 'medium' as const,
    }
    const first = await t.repos.demands.create(input)
    const second = await t.repos.demands.create({
      ...input,
      location: null,
      neighborhoodId: FIXTURE.neighborhoods.centro,
    })
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.demands.toggleSupport(first.id)
    return { first, second }
  }

  it('indicadores apenas para a conta da instituição e para a administração', async () => {
    const { first } = await seedDemands()

    t.signInAs(FIXTURE.users.institution)
    await t.repos.demands.updateStatus(first.id, {
      status: 'in_review',
      message: 'Em análise técnica.',
    })
    t.setNow(new Date(FIXTURE_NOW.getTime() + 2 * DAY))
    await t.repos.demands.updateStatus(first.id, { status: 'resolved', message: 'Buraco tapado.' })

    const summary = await t.repos.institutions.getPanelSummary()
    expect(summary.total).toBe(2)
    expect(summary.totalSupports).toBe(1)
    expect(summary.averageResolutionDays).toBe(2)
    expect(summary.byStatus.find((s) => s.key === 'resolved')).toMatchObject({
      label: 'Resolvida',
      count: 1,
      color: 'green',
    })
    expect(summary.byCategory).toEqual([
      { key: FIXTURE.categories.pothole, label: 'Buraco na rua', count: 2, color: 'terracotta' },
    ])
    expect(summary.byNeighborhood.map((n) => n.label).sort()).toEqual(['Centro', 'Vila Esperança'])
    expect(summary.byNeighborhood.every((n) => n.color !== undefined)).toBe(true)
    await expect(
      t.repos.institutions.getPanelSummary(FIXTURE.institutions.ngo),
    ).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.institution2)
    expect((await t.repos.institutions.getPanelSummary()).total).toBe(0)

    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.institutions.getPanelSummary()).rejects.toMatchObject({
      code: 'forbidden',
    })

    t.signInAs(FIXTURE.users.admin)
    expect((await t.repos.institutions.getPanelSummary(FIXTURE.institutions.cityHall)).total).toBe(
      2,
    )
    await expect(t.repos.institutions.getPanelSummary()).rejects.toMatchObject({
      code: 'validation',
    })

    t.signInAs(FIXTURE.users.resident)
    const view = await t.repos.institutions.get(FIXTURE.institutions.cityHall)
    expect(view).toMatchObject({ demandCount: 2, openDemandCount: 1 })
  })
})

describe('instituições — serviços públicos', () => {
  it('lista serviços com distância e filtros', async () => {
    t.signInAs(FIXTURE.users.resident2)
    const services = await t.repos.institutions.listServices()
    expect(services).toHaveLength(1)
    expect(services[0]).toMatchObject({
      id: FIXTURE.services.clinic,
      neighborhoodName: 'Centro',
      institutionName: 'Prefeitura Municipal',
    })
    expect(services[0]?.distanceMeters).toBeGreaterThan(0)
    expect(await t.repos.institutions.listServices({ kind: 'education' })).toHaveLength(0)
    expect(await t.repos.institutions.listServices({ search: 'saude' })).toHaveLength(1)

    const near = await t.repos.institutions.getService(FIXTURE.services.clinic)
    expect(near?.distanceMeters).toBe(services[0]?.distanceMeters)
    expect(await t.repos.institutions.getService('svc_x')).toBeNull()
  })
})
