import { describe, expect, it } from 'vitest'

import { buildSeedDatabase } from '@/data/seed'
import { DATABASE_SCHEMA_VERSION, type Database } from '@/types'
import { AppError } from '@/utils/errors'
import { isWithinDemoArea } from '@/utils/geo'

import { buildFixtureDatabase, FIXTURE, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness } from './testing/harness'
import { upgradeDatabase } from './upgrade'

describe('mobilidade acessível — linhas de ônibus', () => {
  it('lista as linhas acessíveis primeiro, com paradas, bairros e próximas partidas', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const lines = await t.repos.mobility.listLines()

    expect(lines.map((line) => line.id)).toEqual([
      FIXTURE.mobility.accessibleLine,
      FIXTURE.mobility.inaccessibleLine,
    ])
    const [accessible, inaccessible] = lines
    expect(accessible).toMatchObject({ accessible: true, code: '10' })
    expect(accessible!.stops.map((stop) => stop.name)).toEqual([
      'Rua das Acácias',
      'Terminal Central',
    ])
    expect(accessible!.neighborhoodNames).toEqual(['Vila Esperança', 'Centro'])
    // O relógio do teste marca meio-dia: partidas a cada 30 minutos desde as 6h.
    expect(accessible!.nextDepartures).toEqual(['12:00', '12:30', '13:00'])
    expect(inaccessible).toMatchObject({ accessible: false, note: 'Sem elevador.' })
  })

  it('filtra por acessibilidade, recurso, bairro e busca', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const ids = async (filters: Parameters<typeof t.repos.mobility.listLines>[0]) =>
      (await t.repos.mobility.listLines(filters)).map((line) => line.id)

    expect(await ids({ accessibleOnly: true })).toEqual([FIXTURE.mobility.accessibleLine])
    expect(await ids({ features: ['audio_announcements'] })).toEqual([
      FIXTURE.mobility.accessibleLine,
    ])
    expect(await ids({ features: ['low_floor'] })).toEqual([])
    expect(await ids({ neighborhoodId: FIXTURE.neighborhoods.centro })).toEqual([
      FIXTURE.mobility.accessibleLine,
    ])
    expect(await ids({ search: 'circular' })).toEqual([FIXTURE.mobility.inaccessibleLine])
    // A busca ignora acentos e também encontra pela parada.
    expect(await ids({ search: 'acacias' })).toHaveLength(2)
    expect(await ids({ search: 'terminal' })).toEqual([FIXTURE.mobility.accessibleLine])
  })

  it('não mostra partidas depois do fim da operação', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const late = new Date(FIXTURE_NOW)
    late.setHours(22, 30, 0, 0)
    t.setNow(late)
    const line = await t.repos.mobility.getLine(FIXTURE.mobility.accessibleLine)
    expect(line.nextDepartures).toEqual([])
  })

  it('exige sessão e devolve erro para linha inexistente', async () => {
    const t = await createTestHarness()
    await expect(t.repos.mobility.listLines()).rejects.toMatchObject({ code: 'unauthenticated' })
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.mobility.getLine('lin_nao_existe')).rejects.toBeInstanceOf(AppError)
  })
})

describe('mobilidade acessível — paradas, barreiras e apoios', () => {
  it('ordena as paradas pela distância até o bairro do usuário e informa as linhas', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident) // moradora da Vila
    const stops = await t.repos.mobility.listStops()
    expect(stops.map((stop) => stop.id)).toEqual([
      FIXTURE.mobility.stopVila,
      FIXTURE.mobility.stopCentro,
    ])
    expect(stops[0]!.lines.map((line) => line.code).sort()).toEqual(['10', '20'])
    expect(stops[0]!.lines.find((line) => line.code === '20')?.accessible).toBe(false)
    expect(stops[0]!.distanceMeters).toBeLessThan(stops[1]!.distanceMeters)

    t.signInAs(FIXTURE.users.resident2) // morador do Centro
    expect((await t.repos.mobility.listStops())[0]!.id).toBe(FIXTURE.mobility.stopCentro)
  })

  it('classifica barreiras e apoios e filtra por natureza, público, bairro e busca', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident2) // morador do Centro
    const all = await t.repos.mobility.listAccessPoints()
    expect(all.map((point) => [point.id, point.nature])).toEqual([
      [FIXTURE.mobility.stairs, 'barrier'],
      [FIXTURE.mobility.ramp, 'support'],
    ])
    // A escadaria fica a cerca de 200 m do centro do mapa.
    expect(all[0]!.distanceMeters).toBeGreaterThan(150)
    expect(all[0]!.distanceMeters).toBeLessThan(250)

    const ids = async (filters: Parameters<typeof t.repos.mobility.listAccessPoints>[0]) =>
      (await t.repos.mobility.listAccessPoints(filters)).map((point) => point.id)
    expect(await ids({ nature: 'support' })).toEqual([FIXTURE.mobility.ramp])
    expect(await ids({ audience: 'blind' })).toEqual([FIXTURE.mobility.stairs])
    expect(await ids({ audience: 'wheelchair' })).toHaveLength(2)
    expect(await ids({ neighborhoodId: FIXTURE.neighborhoods.vila })).toEqual([
      FIXTURE.mobility.ramp,
    ])
    expect(await ids({ search: 'escadaria' })).toEqual([FIXTURE.mobility.stairs])
    expect(await ids({ kinds: ['ramp', 'elevator'] })).toEqual([FIXTURE.mobility.ramp])
  })

  it('mostra as novas camadas no mapa, com rota para os detalhes', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const points = await t.repos.map.listPoints({ layers: ['accessibility', 'transit'] })
    expect(points.map((point) => point.id).sort()).toEqual([
      `accessibility:${FIXTURE.mobility.stairs}`,
      `accessibility:${FIXTURE.mobility.ramp}`,
      `transit:${FIXTURE.mobility.stopCentro}`,
      `transit:${FIXTURE.mobility.stopVila}`,
    ])
    const stairs = points.find((point) => point.refId === FIXTURE.mobility.stairs)
    expect(stairs).toMatchObject({
      icon: 'stairs',
      color: 'terracotta',
      meta: 'Barreira no caminho',
      to: `/mobilidade?aba=caminho&ponto=${FIXTURE.mobility.stairs}`,
    })
    const stop = points.find((point) => point.refId === FIXTURE.mobility.stopCentro)
    expect(stop).toMatchObject({ icon: 'bus', meta: 'Com piso tátil' })
    expect(stop!.description).toContain('Linhas 10')
  })
})

describe('recursos de acessibilidade dos locais', () => {
  it('o comerciante informa os recursos e a busca os encontra', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    const updated = await t.repos.businesses.update(FIXTURE.business, {
      // Ordem e repetições são normalizadas.
      accessibility: ['libras', 'ramp', 'ramp'],
    })
    expect(updated.accessibility).toEqual(['ramp', 'libras'])

    t.signInAs(FIXTURE.users.resident)
    const byFeature = await t.repos.businesses.list({ accessibility: ['step_free', 'ramp'] })
    expect(byFeature.map((business) => business.id)).toEqual([FIXTURE.business])
    expect(await t.repos.businesses.list({ accessibility: ['elevator'] })).toEqual([])
    expect(await t.repos.businesses.list({ search: 'libras' })).toHaveLength(1)
  })

  it('rejeita recursos desconhecidos', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    await expect(
      t.repos.businesses.update(FIXTURE.business, {
        accessibility: ['teletransporte'] as never,
      }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('filtra estabelecimentos pelo bairro', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const [business] = await t.repos.businesses.list()
    expect(
      await t.repos.businesses.list({ neighborhoodId: business!.neighborhoodId }),
    ).toHaveLength(1)
    expect(await t.repos.businesses.list({ neighborhoodId: 'nb_inexistente' })).toEqual([])
  })
})

describe('atualização de uma base gravada pela versão anterior', () => {
  /** Simula a base de quem abriu o app antes dos recursos de acessibilidade. */
  function versionOne(): Partial<Database> {
    const db = buildFixtureDatabase() as Partial<Database> & { meta: Database['meta'] }
    db.meta.schemaVersion = 1
    delete db.transitLines
    delete db.transitStops
    delete db.accessPoints
    return db
  }

  it('preserva o que existia e acrescenta apenas o conteúdo novo', () => {
    const old = versionOne()
    const usersBefore = old.users!.length
    const upgraded = upgradeDatabase(old, FIXTURE_NOW, buildSeedDatabase)

    expect(upgraded).not.toBeNull()
    expect(upgraded!.meta.schemaVersion).toBe(DATABASE_SCHEMA_VERSION)
    expect(upgraded!.users).toHaveLength(usersBefore)
    // Bairros antigos continuam, ganham a região e os novos são acrescentados.
    const centro = upgraded!.neighborhoods.find((nb) => nb.id === FIXTURE.neighborhoods.centro)
    expect(centro).toMatchObject({ name: 'Centro', zone: 'Região Central' })
    expect(upgraded!.neighborhoods.length).toBeGreaterThan(30)
    expect(new Set(upgraded!.neighborhoods.map((nb) => nb.id)).size).toBe(
      upgraded!.neighborhoods.length,
    )
    // Ônibus, paradas e pontos de atenção passam a existir.
    expect(upgraded!.transitLines.length).toBeGreaterThan(0)
    expect(upgraded!.transitStops.length).toBeGreaterThan(0)
    expect(upgraded!.accessPoints.length).toBeGreaterThan(0)
    // O estabelecimento demonstrativo de mesmo ID recebe os recursos de acessibilidade.
    const bakery = upgraded!.businesses.find((business) => business.id === FIXTURE.business)
    expect(bakery?.accessibility).toContain('step_free')
  })

  it('não aproveita bases vazias, incompletas ou de versão desconhecida', () => {
    expect(upgradeDatabase(null, FIXTURE_NOW, buildSeedDatabase)).toBeNull()
    const incomplete = versionOne()
    delete incomplete.posts
    expect(upgradeDatabase(incomplete, FIXTURE_NOW, buildSeedDatabase)).toBeNull()
    const unknown = versionOne()
    unknown.meta!.schemaVersion = 0
    expect(upgradeDatabase(unknown, FIXTURE_NOW, buildSeedDatabase)).toBeNull()
  })
})

describe('mobilidade na base demonstrativa', () => {
  const db = buildSeedDatabase(FIXTURE_NOW)

  it('amplia a lista de bairros, todos dentro da área de demonstração', () => {
    expect(db.neighborhoods).toHaveLength(32)
    expect(new Set(db.neighborhoods.map((nb) => nb.name)).size).toBe(32)
    expect(db.neighborhoods.every((nb) => isWithinDemoArea(nb.center))).toBe(true)
    expect(new Set(db.neighborhoods.map((nb) => nb.zone))).toEqual(
      new Set(['Região Central', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste']),
    )
  })

  it('linhas, paradas e pontos se relacionam sem pontas soltas', () => {
    const stopIds = new Set(db.transitStops.map((stop) => stop.id))
    const neighborhoodIds = new Set(db.neighborhoods.map((nb) => nb.id))
    expect(db.transitLines).toHaveLength(8)
    for (const line of db.transitLines) {
      expect(line.stopIds.length).toBeGreaterThanOrEqual(2)
      expect(line.stopIds.every((id) => stopIds.has(id))).toBe(true)
      expect(line.isDemo).toBe(true)
    }
    // Toda parada é atendida por pelo menos uma linha.
    for (const stop of db.transitStops) {
      expect(db.transitLines.some((line) => line.stopIds.includes(stop.id))).toBe(true)
      expect(neighborhoodIds.has(stop.neighborhoodId)).toBe(true)
      expect(isWithinDemoArea(stop.location)).toBe(true)
    }
    for (const point of db.accessPoints) {
      expect(neighborhoodIds.has(point.neighborhoodId)).toBe(true)
      expect(isWithinDemoArea(point.location)).toBe(true)
      expect(point.audiences.length).toBeGreaterThan(0)
      expect(point.isDemo).toBe(true)
    }
    // Há linhas sem acessibilidade (para o contraste ficar visível) e escadas destacadas para cegos.
    expect(db.transitLines.some((line) => line.fleet === 'none')).toBe(true)
    const stairs = db.accessPoints.filter((point) => point.kind === 'stairs')
    expect(stairs.length).toBeGreaterThanOrEqual(3)
    expect(stairs.every((point) => point.audiences.includes('blind') && point.alternative)).toBe(
      true,
    )
  })

  it('estabelecimentos, serviços e eventos informam recursos de acessibilidade', () => {
    expect(db.businesses.every((business) => Array.isArray(business.accessibility))).toBe(true)
    expect(db.publicServices.every((service) => (service.accessibility ?? []).length > 0)).toBe(
      true,
    )
    expect(db.events.some((event) => event.accessibility?.includes('libras'))).toBe(true)
  })
})
