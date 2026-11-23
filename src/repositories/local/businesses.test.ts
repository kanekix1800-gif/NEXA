import { describe, expect, it } from 'vitest'

import { paths } from '@/app/paths'

import { expectCode, validBusinessInput } from './businesses.testkit'
import { createTestHarness } from './testing/harness'
import { FIXTURE, FIXTURE_NOW } from './testing/fixture'

const MINUTE = 60 * 1000
const later = (minutes: number) => new Date(FIXTURE_NOW.getTime() + minutes * MINUTE)

describe('estabelecimentos', () => {
  it('monta a visualização com categoria, bairro, horário de hoje e sem avaliações', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const [view] = await t.repos.businesses.list()

    expect(view).toMatchObject({
      id: FIXTURE.business,
      neighborhoodName: 'Vila Esperança',
      rating: null,
      reviewCount: 0,
      isOpenNow: true,
      todayHours: { open: '07:00', close: '19:00' },
      isFavorite: false,
      isMine: false,
    })
    expect(view?.category.name).toBe('Alimentação')
  })

  it('calcula a distância a partir do bairro do usuário (ou do ponto informado)', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const fromVila = await t.repos.businesses.get(FIXTURE.business)
    expect(fromVila?.distanceMeters).toBeCloseTo(500, -1)

    t.signInAs(FIXTURE.users.resident2)
    const fromCentro = await t.repos.businesses.get(FIXTURE.business)
    expect(fromCentro?.distanceMeters).toBeCloseTo(Math.hypot(1200, 300), -1)

    const near = await t.repos.businesses.get(FIXTURE.business, {
      near: fromVila!.location,
    })
    expect(near!.distanceMeters!).toBeLessThan(150)
  })

  it('indica aberto/fechado conforme o horário atual', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)

    t.setNow(new Date(2026, 10, 18, 20, 0)) // quarta, 20h
    const night = await t.repos.businesses.get(FIXTURE.business)
    expect(night?.isOpenNow).toBe(false)
    expect(await t.repos.businesses.list({ onlyOpenNow: true })).toEqual([])

    t.setNow(new Date(2026, 10, 22, 10, 0)) // domingo
    const sunday = await t.repos.businesses.get(FIXTURE.business)
    expect(sunday).toMatchObject({ isOpenNow: false, todayHours: null })

    t.setNow(new Date(2026, 10, 23, 7, 0)) // segunda, 7h
    expect((await t.repos.businesses.list({ onlyOpenNow: true })).map((view) => view.id)).toEqual([
      FIXTURE.business,
    ])
  })

  it('busca por nome, categoria, destaque e bairro; filtra por categoria', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const ids = async (filters: Parameters<typeof t.repos.businesses.list>[0]) =>
      (await t.repos.businesses.list(filters)).map((view) => view.id)

    expect(await ids({ search: 'alimentacao' })).toEqual([FIXTURE.business])
    expect(await ids({ search: 'PIX' })).toEqual([FIXTURE.business])
    expect(await ids({ search: 'esperança padaria' })).toEqual([FIXTURE.business])
    expect(await ids({ search: 'farmácia' })).toEqual([])
    expect(await ids({ categoryId: FIXTURE.categories.food })).toEqual([FIXTURE.business])
    expect(await ids({ categoryId: FIXTURE.categories.services })).toEqual([])
  })

  it('ordena por distância (padrão), avaliação e nome', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchantWithoutBusiness)
    await t.repos.businesses.create(validBusinessInput()) // no Centro, perto do usuário
    t.signInAs(FIXTURE.users.resident2) // mora no Centro
    await t.repos.businesses.saveReview(FIXTURE.business, { rating: 5, comment: 'Ótimo pão!' })

    const names = async (sort?: 'distance' | 'rating' | 'name') =>
      (await t.repos.businesses.list({ sort })).map((view) => view.name)
    expect(await names()).toEqual(['Ateliê do Caio', 'Padaria Teste'])
    expect(await names('rating')).toEqual(['Padaria Teste', 'Ateliê do Caio'])
    expect(await names('name')).toEqual(['Ateliê do Caio', 'Padaria Teste'])
  })

  it('favorita e desfavorita', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)

    expect((await t.repos.businesses.toggleFavorite(FIXTURE.business)).isFavorite).toBe(true)
    expect(await t.repos.businesses.list({ onlyFavorites: true })).toHaveLength(1)
    expect((await t.repos.businesses.toggleFavorite(FIXTURE.business)).isFavorite).toBe(false)
    expect(await t.repos.businesses.list({ onlyFavorites: true })).toEqual([])
    expect(t.snapshot().favorites).toEqual([])
  })

  it('avaliações: uma por usuário (atualiza), média com 1 casa e dono não avalia', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await t.repos.businesses.saveReview(FIXTURE.business, { rating: 5, comment: '  Excelente!  ' })
    t.setNow(later(1))
    t.signInAs(FIXTURE.users.resident2)
    await t.repos.businesses.saveReview(FIXTURE.business, { rating: 4, comment: 'Muito bom.' })
    t.setNow(later(2))
    t.signInAs(FIXTURE.users.institution)
    await t.repos.businesses.saveReview(FIXTURE.business, {
      rating: 4,
      comment: 'Bom atendimento.',
    })

    let view = await t.repos.businesses.get(FIXTURE.business)
    expect(view).toMatchObject({ rating: 4.3, reviewCount: 3 }) // 13 / 3 = 4,33…

    // A moradora muda a nota: continua uma avaliação por pessoa.
    t.setNow(later(3))
    t.signInAs(FIXTURE.users.resident)
    const updated = await t.repos.businesses.saveReview(FIXTURE.business, {
      rating: 2,
      comment: 'Hoje o pão veio frio.',
    })
    expect(updated).toMatchObject({ rating: 2, isMine: true })
    expect(updated.author.name).toBe('Rita Moradora')

    view = await t.repos.businesses.get(FIXTURE.business)
    expect(view).toMatchObject({ rating: 3.3, reviewCount: 3 }) // 10 / 3 = 3,33…

    const reviews = await t.repos.businesses.listReviews(FIXTURE.business)
    expect(reviews.map((review) => review.authorId)).toEqual([
      FIXTURE.users.resident,
      FIXTURE.users.institution,
      FIXTURE.users.resident2,
    ])
    expect(reviews.map((review) => review.isMine)).toEqual([true, false, false])

    // O proprietário não avalia o próprio estabelecimento.
    t.signInAs(FIXTURE.users.merchant)
    const error = await expectCode(
      t.repos.businesses.saveReview(FIXTURE.business, { rating: 5, comment: 'O melhor!' }),
      'forbidden',
    )
    expect(error.message).toBe('Você não pode avaliar o próprio estabelecimento.')

    // O proprietário foi notificado de cada avaliação.
    const notifications = t
      .snapshot()
      .notifications.filter((entry) => entry.userId === FIXTURE.users.merchant)
    expect(notifications).toHaveLength(4)
    expect(notifications[0]).toMatchObject({
      category: 'commerce',
      title: 'Seu estabelecimento recebeu uma avaliação.',
      link: paths.business(FIXTURE.business),
    })
  })

  it('valida a avaliação e permite removê-la ao autor ou à administração', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await expectCode(
      t.repos.businesses.saveReview(FIXTURE.business, { rating: 6, comment: 'Demais!' }),
      'validation',
    )
    await expectCode(
      t.repos.businesses.saveReview(FIXTURE.business, { rating: 4.5, comment: 'Demais!' }),
      'validation',
    )
    await expectCode(
      t.repos.businesses.saveReview(FIXTURE.business, { rating: 4, comment: 'ok' }),
      'validation',
    )
    const review = await t.repos.businesses.saveReview(FIXTURE.business, {
      rating: 4,
      comment: 'Gostei bastante.',
    })

    t.signInAs(FIXTURE.users.resident2)
    await expectCode(t.repos.businesses.removeReview(review.id), 'forbidden')
    t.signInAs(FIXTURE.users.admin)
    await t.repos.businesses.removeReview(review.id)
    expect(t.snapshot().reviews).toEqual([])
  })

  it('catálogo público: somente itens ativos e visíveis, sem custo nem estoque', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    await t.repos.products.adjustStock(FIXTURE.products.cake, -2)

    t.signInAs(FIXTURE.users.resident)
    const catalog = await t.repos.businesses.listCatalog(FIXTURE.business)
    expect(catalog.map((item) => item.id).sort()).toEqual(
      [FIXTURE.products.bread, FIXTURE.products.cake, FIXTURE.products.coffee].sort(),
    )
    for (const item of catalog) {
      expect(item).not.toHaveProperty('costCents')
      expect(item).not.toHaveProperty('stock')
      expect(item).not.toHaveProperty('minStock')
      expect(item).not.toHaveProperty('trackStock')
    }
    const availability = Object.fromEntries(catalog.map((item) => [item.id, item.available]))
    expect(availability).toEqual({
      [FIXTURE.products.bread]: true,
      [FIXTURE.products.cake]: false, // sem estoque
      [FIXTURE.products.coffee]: true, // sem controle de estoque
    })
  })

  it('configurações privadas aparecem somente para o proprietário', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    const mine = await t.repos.businesses.getMine()
    expect(mine).toMatchObject({ isMine: true, settings: { allowNegativeStock: false } })

    for (const userId of [FIXTURE.users.resident, FIXTURE.users.admin]) {
      t.signInAs(userId)
      const view = await t.repos.businesses.get(FIXTURE.business)
      expect(view?.isMine).toBe(false)
      expect(view).not.toHaveProperty('settings')
      const [listed] = await t.repos.businesses.list()
      expect(listed).not.toHaveProperty('settings')
    }
  })

  it('estabelecimento inativo some para o público, mas não para o dono e a administração', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    await t.repos.businesses.update(FIXTURE.business, { status: 'inactive' })
    expect(await t.repos.businesses.get(FIXTURE.business)).not.toBeNull()

    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.businesses.get(FIXTURE.business)).toBeNull()
    expect(await t.repos.businesses.list()).toEqual([])

    t.signInAs(FIXTURE.users.admin)
    expect(await t.repos.businesses.get(FIXTURE.business)).not.toBeNull()
  })

  it('usa a categoria "Outros" quando a categoria original foi removida', async () => {
    const t = await createTestHarness()
    t.store.write(['categories'], (db) => {
      db.categories = db.categories.filter((category) => category.id !== FIXTURE.categories.food)
    })
    t.signInAs(FIXTURE.users.resident)
    const view = await t.repos.businesses.get(FIXTURE.business)
    expect(view?.category).toMatchObject({ name: 'Outros', kind: 'business' })
  })

  it('cadastra o estabelecimento do comerciante e vincula à conta', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchantWithoutBusiness)
    const created = await t.repos.businesses.create(
      validBusinessInput({
        whatsapp: '31 98888-7777',
        instagram: '@atelie.caio',
        status: 'inactive',
      }),
    )

    expect(created).toMatchObject({
      name: 'Ateliê do Caio',
      ownerId: FIXTURE.users.merchantWithoutBusiness,
      phone: '31999990000',
      whatsapp: '31988887777',
      instagram: 'atelie.caio',
      tags: ['Entrega', 'Aceita Pix'],
      status: 'active',
      isDemo: false,
      isMine: true,
      settings: { allowNegativeStock: false },
    })
    const owner = t
      .snapshot()
      .users.find((user) => user.id === FIXTURE.users.merchantWithoutBusiness)
    expect(owner?.businessId).toBe(created.id)
    expect((await t.repos.businesses.getMine())?.id).toBe(created.id)

    // Já possui estabelecimento.
    await expectCode(t.repos.businesses.create(validBusinessInput()), 'forbidden')
    // Morador não cadastra estabelecimento.
    t.signInAs(FIXTURE.users.resident)
    await expectCode(t.repos.businesses.create(validBusinessInput()), 'forbidden')
  })

  it('valida os dados do estabelecimento', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchantWithoutBusiness)
    const cases: Array<[Parameters<typeof validBusinessInput>[0], string]> = [
      [{ name: 'AB' }, 'name'],
      [{ description: 'Curta' }, 'description'],
      [{ categoryId: FIXTURE.categories.culture }, 'categoryId'],
      [{ address: 'Rua' }, 'address'],
      [{ neighborhoodId: 'nb_inexistente' }, 'neighborhoodId'],
      [{ location: { lat: 0, lng: 0 } }, 'location'],
      [{ phone: '3199999' }, 'phone'],
      [{ whatsapp: '123' }, 'whatsapp'],
      [{ email: 'email-invalido' }, 'email'],
      [{ instagram: 'com espaço' }, 'instagram'],
      [{ tags: Array.from({ length: 9 }, (_, index) => `Destaque ${index}`) }, 'tags'],
      [{ tags: ['x'.repeat(25)] }, 'tags'],
      [{ coverUrl: 'https://exemplo.com/capa.png' }, 'coverUrl'],
    ]
    for (const [overrides, field] of cases) {
      const error = await expectCode(
        t.repos.businesses.create(validBusinessInput(overrides)),
        'validation',
      )
      expect(error.fieldErrors, field).toHaveProperty(field)
    }

    const badSchedule = validBusinessInput()
    badSchedule.schedule[1] = { open: '8h', close: '18:00' }
    const error = await expectCode(t.repos.businesses.create(badSchedule), 'validation')
    expect(error.fieldErrors).toHaveProperty('schedule')
    expect(t.snapshot().businesses).toHaveLength(1)
  })

  it('edição: proprietário ou administração', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await expectCode(
      t.repos.businesses.update(FIXTURE.business, { name: 'Padaria Invadida' }),
      'forbidden',
    )

    t.signInAs(FIXTURE.users.merchant)
    const cover = 'data:image/jpeg;base64,AAAA'
    const edited = await t.repos.businesses.update(FIXTURE.business, {
      name: 'Padaria Nova',
      coverUrl: cover,
      phone: '(31) 3333-4444',
    })
    expect(edited).toMatchObject({ name: 'Padaria Nova', coverUrl: cover, phone: '3133334444' })
    const withoutCover = await t.repos.businesses.update(FIXTURE.business, { coverUrl: null })
    expect(withoutCover).not.toHaveProperty('coverUrl')

    t.signInAs(FIXTURE.users.admin)
    const byAdmin = await t.repos.businesses.update(FIXTURE.business, { name: 'Padaria Revisada' })
    expect(byAdmin.name).toBe('Padaria Revisada')
  })
})
