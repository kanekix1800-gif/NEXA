import { beforeEach, describe, expect, it } from 'vitest'

import { offsetPoint } from '@/utils/geo'

import type { CreateDemandInput } from '../contracts'
import { FIXTURE, FIXTURE_CENTER, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const IMAGE = 'data:image/png;base64,iVBORw0KGgo='
const DAY = 24 * 60 * 60 * 1000

function demandInput(overrides: Partial<CreateDemandInput> = {}): CreateDemandInput {
  return {
    categoryId: FIXTURE.categories.pothole,
    title: '  Buraco enorme na Rua das Flores  ',
    description: 'Há um buraco profundo em frente ao número 120 que já causou acidentes.',
    // Perto do centro da Vila Esperança.
    location: offsetPoint(FIXTURE_CENTER, 850.123, -650.456),
    urgency: 'high',
    ...overrides,
  }
}

let t: TestHarness

beforeEach(async () => {
  t = await createTestHarness()
})

async function createAsResident(overrides: Partial<CreateDemandInput> = {}) {
  t.signInAs(FIXTURE.users.resident)
  return t.repos.demands.create(demandInput(overrides))
}

describe('demandas — registro', () => {
  it('registra a demanda completa: protocolo, histórico, instituição, feed e notificação', async () => {
    const demand = await createAsResident({ photos: [IMAGE], addressHint: 'Em frente à padaria' })

    expect(demand.protocol).toBe('NX-2026-0001')
    expect(demand.title).toBe('Buraco enorme na Rua das Flores')
    expect(demand.status).toBe('registered')
    expect(demand.neighborhoodId).toBe(FIXTURE.neighborhoods.vila)
    expect(demand.neighborhoodName).toBe('Vila Esperança')
    expect(demand.institution?.id).toBe(FIXTURE.institutions.cityHall)
    expect(demand.institutionId).toBe(FIXTURE.institutions.cityHall)
    expect(demand.category.name).toBe('Buraco na rua')
    expect(demand.isMine).toBe(true)
    expect(demand.canClose).toBe(true)
    expect(demand.canManage).toBe(false)
    expect(demand.supportCount).toBe(0)
    expect(demand).not.toHaveProperty('supporterIds')
    // Precisão reduzida para 4 casas decimais.
    expect(demand.location?.lat).toBe(Number(demand.location?.lat.toFixed(4)))

    expect(demand.history).toHaveLength(2)
    expect(demand.history[0]).toMatchObject({
      actorKind: 'citizen',
      actorName: 'Rita Moradora',
      status: 'registered',
      message: 'Demanda registrada.',
      simulated: false,
    })
    expect(demand.history[1]).toMatchObject({
      actorKind: 'system',
      actorName: 'NEXA',
      simulated: true,
    })
    expect(demand.history[1]?.message).toContain('Prefeitura Municipal')

    const db = t.snapshot()
    const post = db.posts.find((candidate) => candidate.linkedDemandId === demand.id)
    expect(post).toMatchObject({
      category: 'demand',
      content: 'Registrei uma demanda: Buraco enorme na Rua das Flores',
      imageUrl: IMAGE,
      authorId: FIXTURE.users.resident,
    })

    const toInstitution = db.notifications.filter((n) => n.userId === FIXTURE.users.institution)
    expect(toInstitution).toHaveLength(1)
    expect(toInstitution[0]).toMatchObject({
      category: 'institutions',
      title: 'Nova demanda encaminhada',
      link: `/demandas/${demand.id}`,
    })
    expect(toInstitution[0]?.body).toContain('NX-2026-0001')
    expect(db.notifications.some((n) => n.userId === FIXTURE.users.resident)).toBe(false)

    const second = await t.repos.demands.create(demandInput())
    expect(second.protocol).toBe('NX-2026-0002')
  })

  it('sem instituição padrão e sem feed: um único registro no histórico e nenhuma publicação', async () => {
    const demand = await createAsResident({
      categoryId: FIXTURE.categories.otherDemand,
      location: null,
      shareOnFeed: false,
    })
    expect(demand.institution).toBeUndefined()
    expect(demand.history).toHaveLength(1)
    // Sem local: vale o bairro do autor.
    expect(demand.neighborhoodId).toBe(FIXTURE.neighborhoods.vila)
    expect(t.snapshot().posts).toHaveLength(0)
    expect(t.snapshot().notifications).toHaveLength(0)
  })

  it('valida os campos e não consome o protocolo quando falha', async () => {
    t.signInAs(FIXTURE.users.resident)
    const create = (overrides: Partial<CreateDemandInput>) =>
      t.repos.demands.create(demandInput(overrides))

    await expect(create({ title: 'Oi' })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { title: expect.any(String) },
    })
    await expect(create({ description: 'curta' })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { description: expect.any(String) },
    })
    await expect(create({ categoryId: FIXTURE.categories.inactiveDemand })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { categoryId: expect.any(String) },
    })
    await expect(create({ categoryId: FIXTURE.categories.food })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(create({ photos: [IMAGE, IMAGE, IMAGE, IMAGE] })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { photos: expect.any(String) },
    })
    await expect(create({ photos: ['https://exemplo.com/foto.jpg'] })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(create({ urgency: 'extrema' as never })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(create({ neighborhoodId: 'nb_inexistente' })).rejects.toMatchObject({
      code: 'validation',
    })

    const demand = await create({})
    expect(demand.protocol).toBe('NX-2026-0001')
  })

  it('rejeita localização fora da área de demonstração', async () => {
    t.signInAs(FIXTURE.users.resident)
    await expect(
      t.repos.demands.create(demandInput({ location: { lat: -23.5505, lng: -46.6333 } })),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { location: expect.any(String) } })
    expect(t.snapshot().demands).toHaveLength(0)
  })

  it('exige usuário autenticado', async () => {
    await expect(t.repos.demands.create(demandInput())).rejects.toMatchObject({
      code: 'unauthenticated',
    })
    await expect(t.repos.demands.list()).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('demandas — apoio', () => {
  it('o autor não apoia a própria demanda; outros apoiam e retiram o apoio', async () => {
    const demand = await createAsResident()
    await expect(t.repos.demands.toggleSupport(demand.id)).rejects.toMatchObject({
      code: 'conflict',
      message: 'Você é o autor desta demanda.',
    })

    t.signInAs(FIXTURE.users.resident2)
    const supported = await t.repos.demands.toggleSupport(demand.id)
    expect(supported.supportCount).toBe(1)
    expect(supported.supportedByMe).toBe(true)
    expect(supported).not.toHaveProperty('supporterIds')

    const notification = t.snapshot().notifications.find((n) => n.userId === FIXTURE.users.resident)
    expect(notification).toMatchObject({
      category: 'demands',
      title: 'Sua demanda recebeu um novo apoio.',
      link: `/demandas/${demand.id}`,
    })

    const withdrawn = await t.repos.demands.toggleSupport(demand.id)
    expect(withdrawn.supportCount).toBe(0)
    expect(withdrawn.supportedByMe).toBe(false)
  })

  it('demanda encerrada não recebe novos apoios', async () => {
    const demand = await createAsResident()
    await t.repos.demands.updateStatus(demand.id, { status: 'closed' })
    t.signInAs(FIXTURE.users.resident2)
    await expect(t.repos.demands.toggleSupport(demand.id)).rejects.toMatchObject({
      code: 'conflict',
    })
  })
})

describe('demandas — status', () => {
  it('morador que não é o autor não gerencia o status', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    await expect(
      t.repos.demands.updateStatus(demand.id, { status: 'in_review', message: 'Vou analisar.' }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(t.repos.demands.postUpdate(demand.id, 'Alguma novidade?')).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('instituição que não é a responsável não gerencia o status', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.institution2)
    expect((await t.repos.demands.get(demand.id))?.canManage).toBe(false)
    await expect(
      t.repos.demands.updateStatus(demand.id, {
        status: 'in_review',
        message: 'Analisando o caso.',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('instituição responsável gerencia, com atualização marcada como simulada', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.institution)
    expect((await t.repos.demands.get(demand.id))?.canManage).toBe(true)

    const updated = await t.repos.demands.updateStatus(demand.id, {
      status: 'in_review',
      message: '  Equipe técnica fará vistoria nesta semana.  ',
    })
    expect(updated.status).toBe('in_review')
    const last = updated.history[updated.history.length - 1]
    expect(last).toMatchObject({
      actorKind: 'institution',
      actorName: 'Prefeitura Municipal',
      status: 'in_review',
      message: 'Equipe técnica fará vistoria nesta semana.',
      simulated: true,
    })

    await expect(
      t.repos.demands.updateStatus(demand.id, {
        status: 'registered',
        message: 'Voltando ao início.',
      }),
    ).rejects.toMatchObject({ code: 'conflict', message: 'Mudança de status não permitida.' })
    await expect(
      t.repos.demands.updateStatus(demand.id, { status: 'in_progress' }),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { message: expect.any(String) } })

    const withUpdate = await t.repos.demands.postUpdate(demand.id, 'Vistoria agendada para sexta.')
    expect(withUpdate.status).toBe('in_review')
    expect(withUpdate.history).toHaveLength(4)
  })

  it('instituição responsável não verificada não gerencia', async () => {
    const demand = await createAsResident()
    t.store.write(['institutions'], (db) => {
      const institution = db.institutions.find((i) => i.id === FIXTURE.institutions.cityHall)
      if (institution) institution.verified = false
    })
    t.signInAs(FIXTURE.users.institution)
    expect((await t.repos.demands.get(demand.id))?.canManage).toBe(false)
    await expect(
      t.repos.demands.updateStatus(demand.id, {
        status: 'in_review',
        message: 'Analisando o caso.',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('transição inválida é recusada', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.institution)
    await expect(
      t.repos.demands.updateStatus(demand.id, {
        status: 'resolved',
        message: 'Resolvido de imediato.',
      }),
    ).rejects.toMatchObject({ code: 'conflict', message: 'Mudança de status não permitida.' })
  })

  it('o autor apenas encerra a própria demanda enquanto ela está em aberto', async () => {
    const demand = await createAsResident()
    await expect(
      t.repos.demands.updateStatus(demand.id, { status: 'in_review', message: 'Quero análise.' }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    const closed = await t.repos.demands.updateStatus(demand.id, { status: 'closed' })
    expect(closed.status).toBe('closed')
    expect(closed.canClose).toBe(false)
    expect(closed.history[closed.history.length - 1]).toMatchObject({
      actorKind: 'citizen',
      actorName: 'Rita Moradora',
      message: 'Encerrada pelo morador.',
      simulated: false,
    })

    await expect(
      t.repos.demands.updateStatus(demand.id, { status: 'closed' }),
    ).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('a administração gerencia qualquer demanda', async () => {
    const demand = await createAsResident({ categoryId: FIXTURE.categories.otherDemand })
    t.signInAs(FIXTURE.users.admin)
    const updated = await t.repos.demands.updateStatus(demand.id, {
      status: 'in_progress',
      message: 'Encaminhada para a equipe de manutenção.',
    })
    expect(updated.status).toBe('in_progress')
    expect(updated.history[updated.history.length - 1]).toMatchObject({
      actorKind: 'admin',
      actorName: 'Equipe NEXA',
      simulated: true,
    })

    const assigned = await t.repos.demands.assignInstitution(demand.id, FIXTURE.institutions.ngo)
    expect(assigned.institution?.name).toBe('ONG Viva Melhor')
    expect(t.snapshot().notifications.some((n) => n.userId === FIXTURE.users.institution2)).toBe(
      true,
    )
    const unassigned = await t.repos.demands.assignInstitution(demand.id, null)
    expect(unassigned.institution).toBeUndefined()
  })

  it('notifica o autor e os apoiadores, exceto quem fez a ação', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.demands.toggleSupport(demand.id)
    t.signInAs(FIXTURE.users.merchant)
    await t.repos.demands.toggleSupport(demand.id)

    t.signInAs(FIXTURE.users.institution)
    const before = t.snapshot().notifications.length
    await t.repos.demands.updateStatus(demand.id, {
      status: 'in_review',
      message: 'Vistoria agendada.',
    })
    const created = t.snapshot().notifications.slice(before)
    expect(created).toHaveLength(3)

    const toAuthor = created.find((n) => n.userId === FIXTURE.users.resident)
    expect(toAuthor).toMatchObject({
      category: 'demands',
      title: 'Sua demanda recebeu uma nova atualização.',
      body: 'Buraco enorme na Rua das Flores: Em análise',
      link: `/demandas/${demand.id}`,
    })
    for (const supporter of [FIXTURE.users.resident2, FIXTURE.users.merchant]) {
      expect(created.find((n) => n.userId === supporter)?.title).toBe(
        'Uma demanda que você apoia foi atualizada.',
      )
    }
    expect(created.some((n) => n.userId === FIXTURE.users.institution)).toBe(false)
  })
})

describe('demandas — consultas, comentários e remoção', () => {
  it('filtra, busca e ordena', async () => {
    const low = await createAsResident({ title: 'Lixo acumulado na praça', urgency: 'low' })
    t.setNow(new Date(FIXTURE_NOW.getTime() + DAY))
    const medium = await createAsResident({
      title: 'Calçada quebrada perto da escola',
      urgency: 'medium',
    })
    t.setNow(new Date(FIXTURE_NOW.getTime() + 2 * DAY))
    const high = await createAsResident({
      title: 'Poste caído na avenida',
      urgency: 'high',
      categoryId: FIXTURE.categories.otherDemand,
    })

    t.signInAs(FIXTURE.users.resident2)
    await t.repos.demands.toggleSupport(low.id)

    const recent = await t.repos.demands.list()
    expect(recent.map((d) => d.id)).toEqual([high.id, medium.id, low.id])
    const supported = await t.repos.demands.list({ sort: 'supported' })
    expect(supported[0]?.id).toBe(low.id)
    const urgent = await t.repos.demands.list({ sort: 'urgent' })
    expect(urgent.map((d) => d.id)).toEqual([high.id, medium.id, low.id])

    expect((await t.repos.demands.list({ search: 'calcada escola' })).map((d) => d.id)).toEqual([
      medium.id,
    ])
    expect((await t.repos.demands.list({ search: low.protocol })).map((d) => d.id)).toEqual([
      low.id,
    ])
    expect((await t.repos.demands.list({ search: 'vila esperanca' })).length).toBe(3)
    expect(
      (await t.repos.demands.list({ categoryId: FIXTURE.categories.otherDemand })).map((d) => d.id),
    ).toEqual([high.id])
    expect(
      (await t.repos.demands.list({ supportedBy: FIXTURE.users.resident2 })).map((d) => d.id),
    ).toEqual([low.id])
    expect(
      (await t.repos.demands.list({ institutionId: FIXTURE.institutions.cityHall })).length,
    ).toBe(2)

    t.signInAs(FIXTURE.users.resident)
    await t.repos.demands.updateStatus(medium.id, { status: 'closed' })
    expect((await t.repos.demands.list({ status: 'open' })).length).toBe(2)
    expect((await t.repos.demands.list({ status: 'closed' })).map((d) => d.id)).toEqual([medium.id])
  })

  it('comentários notificam o autor; remoção pela administração apaga comentários e publicação', async () => {
    const demand = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.demands.addComment(demand.id, '  Também passo por aí todo dia.  ')
    expect(comment.content).toBe('Também passo por aí todo dia.')
    expect(comment.isMine).toBe(true)
    expect(
      t.snapshot().notifications.find((n) => n.userId === FIXTURE.users.resident),
    ).toMatchObject({ category: 'demands', link: `/demandas/${demand.id}` })
    expect((await t.repos.demands.get(demand.id))?.commentCount).toBe(1)
    expect(await t.repos.demands.listComments(demand.id)).toHaveLength(1)

    await expect(t.repos.demands.remove(demand.id)).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.admin)
    await t.repos.demands.remove(demand.id)
    const db = t.snapshot()
    expect(db.demands).toHaveLength(0)
    expect(db.comments).toHaveLength(0)
    expect(db.posts).toHaveLength(0)
    expect(await t.repos.demands.get(demand.id)).toBeNull()
  })
})
