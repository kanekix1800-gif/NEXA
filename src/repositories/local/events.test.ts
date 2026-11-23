import { beforeEach, describe, expect, it } from 'vitest'

import type { EventInput } from '../contracts'
import { FIXTURE, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function at(offsetMs: number): string {
  return new Date(FIXTURE_NOW.getTime() + offsetMs).toISOString()
}

function eventInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    title: 'Sarau na praça',
    description: 'Noite de música e poesia com artistas do bairro.',
    categoryId: FIXTURE.categories.culture,
    startsAt: at(2 * DAY),
    endsAt: at(2 * DAY + 3 * HOUR),
    venue: 'Praça Central',
    neighborhoodId: FIXTURE.neighborhoods.centro,
    ...overrides,
  }
}

let t: TestHarness

beforeEach(async () => {
  t = await createTestHarness()
})

async function createAsResident(overrides: Partial<EventInput> = {}) {
  t.signInAs(FIXTURE.users.resident)
  return t.repos.events.create(eventInput(overrides))
}

describe('eventos — criação', () => {
  it('cria o evento e a publicação no feed, sem expor a lista de participantes', async () => {
    const event = await createAsResident({ capacity: 30 })
    expect(event).toMatchObject({
      title: 'Sarau na praça',
      status: 'scheduled',
      attendeeCount: 0,
      attendingByMe: false,
      isPast: false,
      isFull: false,
      isMine: true,
      canManage: true,
      capacity: 30,
      neighborhoodName: 'Centro',
      organizer: { kind: 'user', id: FIXTURE.users.resident, name: 'Rita Moradora' },
      organizerView: { name: 'Rita Moradora', to: `/pessoas/${FIXTURE.users.resident}` },
    })
    expect(event.category.name).toBe('Cultura')
    expect(event).not.toHaveProperty('attendeeIds')

    const post = t.snapshot().posts.find((p) => p.linkedEventId === event.id)
    expect(post?.category).toBe('event')
    expect(post?.content).toContain('Sarau na praça')
  })

  it('valida as datas: término depois do início e início no futuro', async () => {
    t.signInAs(FIXTURE.users.resident)
    await expect(
      t.repos.events.create(eventInput({ endsAt: at(2 * DAY - HOUR) })),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { endsAt: expect.any(String) } })
    await expect(
      t.repos.events.create(eventInput({ startsAt: at(-HOUR), endsAt: at(HOUR) })),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { startsAt: expect.any(String) } })
    await expect(
      t.repos.events.create(eventInput({ startsAt: 'amanhã cedo' })),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { startsAt: expect.any(String) } })
  })

  it('valida os demais campos', async () => {
    t.signInAs(FIXTURE.users.resident)
    const create = (overrides: Partial<EventInput>) => t.repos.events.create(eventInput(overrides))
    await expect(create({ title: 'Oi' })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ description: 'curta' })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ categoryId: FIXTURE.categories.food })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { categoryId: expect.any(String) },
    })
    await expect(create({ venue: 'X' })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ neighborhoodId: 'nb_x' })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ capacity: 0 })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ capacity: 2.5 })).rejects.toMatchObject({ code: 'validation' })
    await expect(create({ location: { lat: -23.55, lng: -46.63 } })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(create({ organizerAs: 'institution' })).rejects.toMatchObject({
      code: 'forbidden',
    })
    expect(t.snapshot().events).toHaveLength(0)
  })

  it('organiza em nome da instituição verificada', async () => {
    t.signInAs(FIXTURE.users.institution)
    const event = await t.repos.events.create(eventInput({ organizerAs: 'institution' }))
    expect(event.organizer).toMatchObject({
      kind: 'institution',
      id: FIXTURE.institutions.cityHall,
    })
    expect(event.organizerView).toMatchObject({
      name: 'Prefeitura Municipal',
      to: `/instituicoes/${FIXTURE.institutions.cityHall}`,
      avatar: { kind: 'institution', icon: 'landmark' },
    })
    expect(t.snapshot().posts[0]?.institutionId).toBe(FIXTURE.institutions.cityHall)
  })
})

describe('eventos — presença', () => {
  it('confirmar e cancelar presença atualiza a contagem e notifica o criador', async () => {
    const event = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    const attending = await t.repos.events.toggleAttendance(event.id)
    expect(attending).toMatchObject({ attendeeCount: 1, attendingByMe: true })
    expect(attending.attendeesPreview.map((p) => p.id)).toEqual([FIXTURE.users.resident2])
    expect(t.snapshot().notifications[0]).toMatchObject({
      userId: FIXTURE.users.resident,
      category: 'events',
      title: 'Nova presença confirmada',
      link: `/eventos/${event.id}`,
    })

    const left = await t.repos.events.toggleAttendance(event.id)
    expect(left).toMatchObject({ attendeeCount: 0, attendingByMe: false })

    // O criador confirmando a própria presença não gera notificação.
    t.signInAs(FIXTURE.users.resident)
    await t.repos.events.toggleAttendance(event.id)
    expect(t.snapshot().notifications).toHaveLength(1)
  })

  it('evento lotado impede novas confirmações, mas permite cancelar', async () => {
    const event = await createAsResident({ capacity: 1 })
    t.signInAs(FIXTURE.users.resident2)
    const full = await t.repos.events.toggleAttendance(event.id)
    expect(full.isFull).toBe(true)

    t.signInAs(FIXTURE.users.merchant)
    await expect(t.repos.events.toggleAttendance(event.id)).rejects.toMatchObject({
      code: 'conflict',
      message: 'Este evento está lotado.',
    })

    t.signInAs(FIXTURE.users.resident2)
    const left = await t.repos.events.toggleAttendance(event.id)
    expect(left).toMatchObject({ attendeeCount: 0, isFull: false })

    t.signInAs(FIXTURE.users.merchant)
    expect((await t.repos.events.toggleAttendance(event.id)).attendingByMe).toBe(true)
  })

  it('evento já realizado não aceita alterações e sai da lista de próximos', async () => {
    const event = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.events.toggleAttendance(event.id)

    t.setNow(new Date(FIXTURE_NOW.getTime() + 3 * DAY))
    await expect(t.repos.events.toggleAttendance(event.id)).rejects.toMatchObject({
      code: 'conflict',
    })
    expect(await t.repos.events.list()).toHaveLength(0)
    const past = await t.repos.events.list({ when: 'past' })
    expect(past.map((e) => e.id)).toEqual([event.id])
    expect(past[0]?.isPast).toBe(true)
    expect(past[0]?.attendeeCount).toBe(1)
  })
})

describe('eventos — gestão', () => {
  it('cancelamento notifica os confirmados e oculta o evento das listas', async () => {
    const event = await createAsResident()
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.events.toggleAttendance(event.id)
    await expect(t.repos.events.cancel(event.id)).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.resident)
    const cancelled = await t.repos.events.cancel(event.id)
    expect(cancelled.status).toBe('cancelled')
    expect(
      t
        .snapshot()
        .notifications.find(
          (n) => n.userId === FIXTURE.users.resident2 && n.title === 'Evento cancelado',
        ),
    ).toMatchObject({ category: 'events', link: `/eventos/${event.id}` })

    expect(await t.repos.events.list({ createdBy: FIXTURE.users.resident })).toHaveLength(1)
    t.signInAs(FIXTURE.users.resident2)
    expect(await t.repos.events.list()).toHaveLength(0)
    expect(await t.repos.events.list({ includeCancelled: true })).toHaveLength(1)
    await expect(t.repos.events.toggleAttendance(event.id)).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('edição: somente criador ou administração; não reduz vagas abaixo dos confirmados', async () => {
    const event = await createAsResident({ capacity: 10 })
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.events.toggleAttendance(event.id)
    await expect(t.repos.events.update(event.id, { title: 'Novo título' })).rejects.toMatchObject({
      code: 'forbidden',
    })
    t.signInAs(FIXTURE.users.merchant)
    await t.repos.events.toggleAttendance(event.id)

    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.events.update(event.id, { capacity: 1 })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { capacity: expect.any(String) },
    })
    await expect(t.repos.events.update(event.id, { endsAt: at(DAY) })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { endsAt: expect.any(String) },
    })
    const updated = await t.repos.events.update(event.id, {
      title: 'Sarau de primavera',
      capacity: null,
    })
    expect(updated.title).toBe('Sarau de primavera')
    expect(updated.capacity).toBeUndefined()

    t.signInAs(FIXTURE.users.admin)
    expect((await t.repos.events.update(event.id, { venue: 'Coreto da praça' })).venue).toBe(
      'Coreto da praça',
    )
  })

  it('lista, busca e ordena os próximos eventos', async () => {
    const later = await createAsResident({ startsAt: at(5 * DAY), endsAt: at(5 * DAY + HOUR) })
    const sooner = await createAsResident({
      title: 'Oficina de grafite',
      startsAt: at(DAY),
      endsAt: at(DAY + HOUR),
    })
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.events.toggleAttendance(later.id)

    expect((await t.repos.events.list()).map((e) => e.id)).toEqual([sooner.id, later.id])
    expect((await t.repos.events.list({ search: 'grafite' })).map((e) => e.id)).toEqual([sooner.id])
    expect((await t.repos.events.list({ search: 'rita' })).length).toBe(2)
    expect(
      (await t.repos.events.list({ attendeeId: FIXTURE.users.resident2 })).map((e) => e.id),
    ).toEqual([later.id])
  })

  it('remoção é exclusiva da administração e apaga a publicação vinculada', async () => {
    const event = await createAsResident()
    await expect(t.repos.events.remove(event.id)).rejects.toMatchObject({ code: 'forbidden' })
    t.signInAs(FIXTURE.users.admin)
    await t.repos.events.remove(event.id)
    expect(t.snapshot().events).toHaveLength(0)
    expect(t.snapshot().posts).toHaveLength(0)
  })
})
