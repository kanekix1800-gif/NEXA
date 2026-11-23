import { describe, expect, it } from 'vitest'

import { FIXTURE } from './testing/fixture'
import { createTestHarness } from './testing/harness'

describe('users', () => {
  it('getPublicProfile não expõe e-mail e devolve null para inexistente', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const profile = await t.repos.users.getPublicProfile(FIXTURE.users.resident2)
    expect(profile).toMatchObject({ id: FIXTURE.users.resident2, neighborhoodName: 'Centro' })
    expect(profile).not.toHaveProperty('email')
    expect(await t.repos.users.getPublicProfile('usr_nao_existe')).toBeNull()
  })

  it('listAll é exclusivo da administração e filtra por perfil e busca', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.users.listAll()).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.admin)
    const all = await t.repos.users.listAll()
    expect(all).toHaveLength(8)
    expect(all.map((u) => u.name)).toEqual(
      [...all.map((u) => u.name)].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    )

    const merchants = await t.repos.users.listAll({ role: 'merchant' })
    expect(merchants.every((u) => u.role === 'merchant')).toBe(true)
    expect(merchants).toHaveLength(2)

    const byEmail = await t.repos.users.listAll({ role: 'all', search: 'SUS@teste' })
    expect(byEmail.map((u) => u.id)).toEqual([FIXTURE.users.suspended])
    expect(await t.repos.users.listAll({ search: 'pessoa_adm' })).toHaveLength(1)
  })

  it('setStatus suspende e reativa, com proteções', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await expect(
      t.repos.users.setStatus(FIXTURE.users.resident2, 'suspended'),
    ).rejects.toMatchObject({ code: 'forbidden' })

    t.signInAs(FIXTURE.users.admin)
    const suspended = await t.repos.users.setStatus(FIXTURE.users.resident2, 'suspended')
    expect(suspended.status).toBe('suspended')
    expect((await t.repos.users.setStatus(FIXTURE.users.resident2, 'active')).status).toBe('active')

    await expect(t.repos.users.setStatus(FIXTURE.users.admin, 'suspended')).rejects.toMatchObject({
      code: 'conflict',
    })
    t.store.write(['users'], (db) => {
      const other = db.users.find((u) => u.id === FIXTURE.users.resident)
      if (other) other.isDemoAccount = true
      db.users.push({
        ...db.users[0]!,
        id: 'usr_adm2',
        username: 'adm2',
        email: 'adm2@teste.nexa.demo',
        role: 'admin',
      })
    })
    await expect(t.repos.users.setStatus('usr_adm2', 'suspended')).rejects.toMatchObject({
      code: 'conflict',
    })
    await expect(
      t.repos.users.setStatus(FIXTURE.users.resident, 'suspended'),
    ).rejects.toMatchObject({
      code: 'conflict',
    })
    await expect(t.repos.users.setStatus('usr_x', 'suspended')).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})

describe('reference', () => {
  it('lista bairros em ordem alfabética sem exigir sessão', async () => {
    const t = await createTestHarness()
    const names = (await t.repos.reference.listNeighborhoods()).map((n) => n.name)
    expect(names).toEqual(['Centro', 'Vila Esperança'])
  })

  it('lista categorias ativas por ordem, com opção de incluir inativas', async () => {
    const t = await createTestHarness()
    const active = await t.repos.reference.listCategories('demand')
    expect(active.map((c) => c.id)).toEqual([
      FIXTURE.categories.pothole,
      FIXTURE.categories.otherDemand,
    ])
    const all = await t.repos.reference.listCategories('demand', { includeInactive: true })
    expect(all).toHaveLength(3)
  })

  it('apenas administração altera categorias', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const input = {
      kind: 'event' as const,
      name: 'Esportes',
      icon: 'trophy' as const,
      color: 'blue' as const,
    }
    await expect(t.repos.reference.createCategory(input)).rejects.toMatchObject({
      code: 'forbidden',
    })
    await expect(
      t.repos.reference.updateCategory(FIXTURE.categories.culture, { name: 'Outro' }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      t.repos.reference.deleteCategory(FIXTURE.categories.culture),
    ).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('cria categoria com ordem seguinte, nome único e validações', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.admin)
    const created = await t.repos.reference.createCategory({
      kind: 'demand',
      name: '  Calçadas  ',
      icon: 'accessibility',
      color: 'teal',
      defaultInstitutionId: FIXTURE.institutions.cityHall,
    })
    expect(created).toMatchObject({
      name: 'Calçadas',
      order: 4,
      system: false,
      active: true,
      defaultInstitutionId: FIXTURE.institutions.cityHall,
    })

    await expect(
      t.repos.reference.createCategory({
        kind: 'demand',
        name: 'calcadas',
        icon: 'more',
        color: 'gray',
      }),
    ).rejects.toMatchObject({ code: 'conflict' })
    // Mesmo nome em outro tipo é permitido.
    await t.repos.reference.createCategory({
      kind: 'event',
      name: 'Calçadas',
      icon: 'more',
      color: 'gray',
    })

    await expect(
      t.repos.reference.createCategory({ kind: 'demand', name: 'A', icon: 'more', color: 'gray' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      t.repos.reference.createCategory({
        kind: 'demand',
        name: 'Com instituição falsa',
        icon: 'more',
        color: 'gray',
        defaultInstitutionId: 'ins_x',
      }),
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('atualiza categoria, impedindo nome duplicado', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.admin)
    const updated = await t.repos.reference.updateCategory(FIXTURE.categories.pothole, {
      name: 'Buraco / asfalto',
      active: false,
      defaultInstitutionId: null,
    })
    expect(updated).toMatchObject({ name: 'Buraco / asfalto', active: false })
    expect(updated.defaultInstitutionId).toBeUndefined()
    await expect(
      t.repos.reference.updateCategory(FIXTURE.categories.pothole, { name: 'OUTROS' }),
    ).rejects.toMatchObject({ code: 'conflict' })
    // Renomear para o próprio nome (outra caixa) é permitido.
    await t.repos.reference.updateCategory(FIXTURE.categories.otherDemand, { name: 'outros' })
  })

  it('exclui apenas categorias personalizadas e sem uso', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.admin)
    await expect(
      t.repos.reference.deleteCategory(FIXTURE.categories.pothole),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'Categorias do sistema não podem ser excluídas — desative-a.',
    })

    const free = await t.repos.reference.createCategory({
      kind: 'business',
      name: 'Livre',
      icon: 'store',
      color: 'gold',
    })
    await t.repos.reference.deleteCategory(free.id)
    expect(t.snapshot().categories.some((c) => c.id === free.id)).toBe(false)

    const used = await t.repos.reference.createCategory({
      kind: 'business',
      name: 'Em uso',
      icon: 'store',
      color: 'gold',
    })
    t.store.write(['businesses'], (db) => {
      const business = db.businesses[0]
      if (business) business.categoryId = used.id
    })
    await expect(t.repos.reference.deleteCategory(used.id)).rejects.toMatchObject({
      code: 'conflict',
      message: 'Há registros usando esta categoria — desative-a em vez de excluir.',
    })
    await expect(t.repos.reference.deleteCategory('cat_x')).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})
