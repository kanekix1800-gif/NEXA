import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNTS } from '@/data/demoAccounts'
import type { Database, Demand, CommunityEvent, Post } from '@/types'

import type { SignUpInput } from '../contracts'
import { clearSession, readSession } from './session'
import { buildFixtureDatabase, FIXTURE } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const SIGN_UP: SignUpInput = {
  name: 'Joana Souza',
  email: 'Joana@Exemplo.com',
  password: 'senha1234',
  role: 'resident',
  neighborhoodId: FIXTURE.neighborhoods.vila,
  acceptedTerms: true,
}

async function signedUp(t: TestHarness, overrides: Partial<SignUpInput> = {}) {
  const user = await t.repos.auth.signUp({ ...SIGN_UP, ...overrides })
  t.signOut()
  return user
}

function post(id: string, authorId: string, extra: Partial<Post> = {}): Post {
  return {
    id,
    authorId,
    category: 'discussion',
    content: 'Conteúdo',
    neighborhoodId: FIXTURE.neighborhoods.vila,
    likedBy: [],
    moderation: 'visible',
    createdAt: new Date().toISOString(),
    ...extra,
  }
}

function demand(id: string, authorId: string, extra: Partial<Demand> = {}): Demand {
  const createdAt = new Date().toISOString()
  return {
    id,
    protocol: `NX-2026-${id}`,
    authorId,
    categoryId: FIXTURE.categories.pothole,
    title: 'Buraco',
    description: 'Um buraco grande na rua.',
    photos: [],
    location: null,
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

describe('auth — cadastro', () => {
  it('cria conta completa, sem guardar a senha, e inicia a sessão', async () => {
    const t = await createTestHarness()
    const user = await t.repos.auth.signUp(SIGN_UP)

    expect(user.email).toBe('joana@exemplo.com')
    expect(user.username).toBe('joana_souza')
    expect(user.termsAcceptedAt).toBeTruthy()
    expect(readSession()?.userId).toBe(user.id)
    expect((await t.repos.auth.getCurrentUser())?.id).toBe(user.id)

    const db = t.snapshot()
    const credential = db.credentials.find((item) => item.userId === user.id)
    expect(credential?.algorithm).toBe('PBKDF2-SHA256')
    expect(JSON.stringify(credential)).not.toContain('senha1234')
    expect(db.userSettings.some((item) => item.userId === user.id)).toBe(true)
    const welcome = db.notifications.filter((item) => item.userId === user.id)
    expect(welcome).toHaveLength(1)
    expect(welcome[0]?.category).toBe('system')
    expect(welcome[0]?.link).toBe('/inicio')
  })

  it('rejeita e-mail duplicado sem diferenciar maiúsculas', async () => {
    const t = await createTestHarness()
    await signedUp(t)
    const error = await t.repos.auth
      .signUp({ ...SIGN_UP, email: 'JOANA@exemplo.COM' })
      .catch((e) => e)
    expect(error).toMatchObject({ code: 'conflict' })
    expect(error.fieldErrors.email).toBe('Já existe uma conta com este e-mail.')
  })

  it('rejeita senha fraca e termos não aceitos', async () => {
    const t = await createTestHarness()
    const weak = await t.repos.auth.signUp({ ...SIGN_UP, password: 'abc' }).catch((e) => e)
    expect(weak).toMatchObject({ code: 'validation' })
    expect(weak.fieldErrors.password).toBeTruthy()

    const terms = await t.repos.auth.signUp({ ...SIGN_UP, acceptedTerms: false }).catch((e) => e)
    expect(terms).toMatchObject({ code: 'validation' })
    expect(terms.fieldErrors.acceptedTerms).toBeTruthy()
    expect(t.snapshot().users.some((u) => u.email === 'joana@exemplo.com')).toBe(false)
  })

  it('cria a instituição não verificada no cadastro institucional', async () => {
    const t = await createTestHarness()
    await expect(t.repos.auth.signUp({ ...SIGN_UP, role: 'institution' })).rejects.toMatchObject({
      code: 'validation',
    })

    const user = await t.repos.auth.signUp({
      ...SIGN_UP,
      role: 'institution',
      institution: { name: 'Associação Rio Claro', category: 'community_association' },
    })
    const institution = t.snapshot().institutions.find((item) => item.id === user.institutionId)
    expect(institution).toMatchObject({
      name: 'Associação Rio Claro',
      verified: false,
      isDemo: false,
      tagline: 'Aguardando verificação',
    })
  })

  it('gera usernames únicos para nomes iguais', async () => {
    const t = await createTestHarness()
    const first = await signedUp(t)
    const second = await signedUp(t, { email: 'outra@exemplo.com' })
    expect(first.username).not.toBe(second.username)
  })
})

describe('auth — entrada e sessão', () => {
  it('entra com a senha correta e recusa a incorreta com a mesma mensagem', async () => {
    const t = await createTestHarness()
    const created = await signedUp(t)

    const user = await t.repos.auth.signIn({ email: ' JOANA@exemplo.com ', password: 'senha1234' })
    expect(user.id).toBe(created.id)
    expect(readSession()?.userId).toBe(created.id)

    t.signOut()
    const wrongPassword = await t.repos.auth
      .signIn({ email: SIGN_UP.email, password: 'errada123' })
      .catch((e) => e)
    const unknownEmail = await t.repos.auth
      .signIn({ email: 'ninguem@exemplo.com', password: 'senha1234' })
      .catch((e) => e)
    // Usuário da fixture sem credencial.
    const noCredential = await t.repos.auth
      .signIn({ email: 'res@teste.nexa.demo', password: 'senha1234' })
      .catch((e) => e)
    for (const error of [wrongPassword, unknownEmail, noCredential]) {
      expect(error).toMatchObject({ code: 'validation', message: 'E-mail ou senha incorretos.' })
    }
    expect(readSession()).toBeNull()
  })

  it('bloqueia conta suspensa e encerra a sessão dela', async () => {
    const t = await createTestHarness()
    const created = await signedUp(t)
    t.store.write(['users'], (db) => {
      const target = db.users.find((u) => u.id === created.id)
      if (target) target.status = 'suspended'
    })
    await expect(
      t.repos.auth.signIn({ email: SIGN_UP.email, password: 'senha1234' }),
    ).rejects.toMatchObject({
      code: 'forbidden',
      message: 'Esta conta está suspensa. Fale com a administração do NEXA.',
    })

    t.signInAs(created.id)
    expect(await t.repos.auth.getCurrentUser()).toBeNull()
    expect(readSession()).toBeNull()
  })

  it('getCurrentUser limpa a sessão de conta inexistente', async () => {
    const t = await createTestHarness()
    t.signInAs('usr_fantasma')
    expect(await t.repos.auth.getCurrentUser()).toBeNull()
    expect(readSession()).toBeNull()
  })

  it('signInDemo: indisponível na fixture e funcional com seed que contém a conta', async () => {
    const plain = await createTestHarness()
    await expect(plain.repos.auth.signInDemo('resident')).rejects.toMatchObject({
      code: 'not_found',
      message: 'Perfil demonstrativo indisponível. Restaure os dados demonstrativos.',
    })

    const t = await createTestHarness({
      seed: (now) => {
        const db: Database = buildFixtureDatabase(now)
        const base = db.users[0]
        if (!base) throw new Error('fixture vazia')
        db.users.push({
          ...base,
          id: DEMO_ACCOUNTS.resident.userId,
          username: 'antonio',
          email: DEMO_ACCOUNTS.resident.email,
          isDemoAccount: true,
        })
        return db
      },
    })
    t.signInAs(FIXTURE.users.admin)
    const user = await t.repos.auth.signInDemo('resident')
    expect(user.id).toBe(DEMO_ACCOUNTS.resident.userId)
    expect(readSession()?.userId).toBe(user.id)
  })

  it('signOut encerra a sessão', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await t.repos.auth.signOut()
    expect(readSession()).toBeNull()
  })
})

describe('auth — senhas', () => {
  it('redefinição: token de uso único', async () => {
    const t = await createTestHarness()
    await signedUp(t)
    const { simulated, resetToken } = await t.repos.auth.requestPasswordReset(SIGN_UP.email)
    expect(simulated).toBe(true)
    expect(resetToken).toBeTruthy()

    await expect(t.repos.auth.resetPassword(resetToken ?? '', 'fraca')).rejects.toMatchObject({
      code: 'validation',
    })
    await t.repos.auth.resetPassword(resetToken ?? '', 'novaSenha99')
    await expect(
      t.repos.auth.resetPassword(resetToken ?? '', 'outraSenha99'),
    ).rejects.toMatchObject({
      code: 'validation',
      message: 'Link de redefinição inválido ou expirado.',
    })
    await expect(
      t.repos.auth.signIn({ email: SIGN_UP.email, password: 'senha1234' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await t.repos.auth.signIn({ email: SIGN_UP.email, password: 'novaSenha99' })
  })

  it('redefinição: token expira em 30 minutos e novo pedido substitui o anterior', async () => {
    const t = await createTestHarness()
    await signedUp(t)
    const first = await t.repos.auth.requestPasswordReset(SIGN_UP.email)
    const second = await t.repos.auth.requestPasswordReset(SIGN_UP.email)
    expect(t.snapshot().passwordResets).toHaveLength(1)
    await expect(
      t.repos.auth.resetPassword(first.resetToken ?? '', 'novaSenha99'),
    ).rejects.toMatchObject({
      code: 'validation',
    })

    t.setNow(new Date(new Date(2026, 10, 18, 12, 31).getTime()))
    await expect(
      t.repos.auth.resetPassword(second.resetToken ?? '', 'novaSenha99'),
    ).rejects.toMatchObject({
      code: 'validation',
      message: 'Link de redefinição inválido ou expirado.',
    })
  })

  it('pedido para e-mail desconhecido ou suspenso devolve token nulo', async () => {
    const t = await createTestHarness()
    const unknown = await t.repos.auth.requestPasswordReset('ninguem@exemplo.com')
    expect(unknown).toEqual({ simulated: true, resetToken: null })
    const suspended = await t.repos.auth.requestPasswordReset('sus@teste.nexa.demo')
    expect(suspended.resetToken).toBeNull()
  })

  it('changePassword confere a senha atual e valida a nova', async () => {
    const t = await createTestHarness()
    const user = await signedUp(t)
    t.signInAs(user.id)

    const wrong = await t.repos.auth.changePassword('errada123', 'novaSenha99').catch((e) => e)
    expect(wrong).toMatchObject({ code: 'validation' })
    expect(wrong.fieldErrors.currentPassword).toBe('Senha atual incorreta.')
    await expect(t.repos.auth.changePassword('senha1234', 'curta')).rejects.toMatchObject({
      code: 'validation',
    })
    await t.repos.auth.changePassword('senha1234', 'novaSenha99')
    t.signOut()
    await t.repos.auth.signIn({ email: SIGN_UP.email, password: 'novaSenha99' })
  })

  it('changePassword em conta sem credencial é conflito', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.auth.changePassword('x', 'novaSenha99')).rejects.toMatchObject({
      code: 'conflict',
    })
  })
})

describe('auth — perfil', () => {
  it('atualiza dados e valida username', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)

    const updated = await t.repos.auth.updateProfile({
      name: '  Rita Nova  ',
      username: 'rita.nova',
      bio: 'Moro aqui há anos.',
      neighborhoodId: FIXTURE.neighborhoods.centro,
    })
    expect(updated).toMatchObject({
      name: 'Rita Nova',
      username: 'rita.nova',
      bio: 'Moro aqui há anos.',
      neighborhoodId: FIXTURE.neighborhoods.centro,
    })

    const invalid = await t.repos.auth.updateProfile({ username: 'Nome inválido!' }).catch((e) => e)
    expect(invalid).toMatchObject({ code: 'validation' })
    expect(invalid.fieldErrors.username).toBeTruthy()

    const taken = await t.repos.auth.updateProfile({ username: 'pessoa_res2' }).catch((e) => e)
    expect(taken).toMatchObject({ code: 'conflict' })

    await expect(t.repos.auth.updateProfile({ neighborhoodId: 'nb_x' })).rejects.toMatchObject({
      code: 'validation',
    })
    const cleared = await t.repos.auth.updateProfile({ bio: '' })
    expect(cleared.bio).toBeUndefined()
  })

  it('exige sessão', async () => {
    const t = await createTestHarness()
    await expect(t.repos.auth.updateProfile({ name: 'Fulano' })).rejects.toMatchObject({
      code: 'unauthenticated',
    })
  })

  it('becomeMerchant converte moradores e bloqueia demais casos', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    expect((await t.repos.auth.becomeMerchant()).role).toBe('merchant')
    await expect(t.repos.auth.becomeMerchant()).rejects.toMatchObject({ code: 'conflict' })

    t.store.write(['users'], (db) => {
      const target = db.users.find((u) => u.id === FIXTURE.users.resident2)
      if (target) target.isDemoAccount = true
    })
    t.signInAs(FIXTURE.users.resident2)
    await expect(t.repos.auth.becomeMerchant()).rejects.toMatchObject({
      code: 'conflict',
      message:
        'Contas demonstrativas não mudam de perfil. Entre com o perfil Comerciante de demonstração.',
    })
  })
})

describe('auth — dados pessoais', () => {
  it('exportMyData reúne apenas os dados do usuário, sem credenciais', async () => {
    const t = await createTestHarness()
    const user = await signedUp(t)
    t.store.write(['posts', 'demands', 'favorites'], (db) => {
      db.posts.push(post('p1', user.id), post('p2', FIXTURE.users.resident))
      db.demands.push(
        demand('d1', user.id),
        demand('d2', FIXTURE.users.resident, { supporterIds: [user.id] }),
      )
      db.favorites.push({
        userId: user.id,
        businessId: FIXTURE.business,
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    })
    t.signInAs(user.id)
    const data = await t.repos.auth.exportMyData()

    expect(data.account.id).toBe(user.id)
    expect(data.posts).toHaveLength(1)
    expect(data.demands).toHaveLength(1)
    expect(data.supportedDemandIds).toEqual(['d2'])
    expect(data.favoriteBusinessIds).toEqual([FIXTURE.business])
    expect(data.notifications).toHaveLength(1)
    expect(data.settings.userId).toBe(user.id)
    expect(JSON.stringify(data)).not.toMatch(/PBKDF2|"hash"|"salt"/)
  })

  it('deleteMyAccount remove os dados pessoais em cascata e mantém demandas', async () => {
    const t = await createTestHarness()
    const user = await signedUp(t)
    const other = FIXTURE.users.resident
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString()
    t.store.write(
      [
        'posts',
        'comments',
        'reports',
        'demands',
        'events',
        'reviews',
        'favorites',
        'aiConversations',
      ],
      (db) => {
        db.posts.push(
          post('mine', user.id, { likedBy: [] }),
          post('theirs', other, { likedBy: [user.id] }),
        )
        db.comments.push(
          {
            id: 'c1',
            targetType: 'post',
            targetId: 'theirs',
            authorId: user.id,
            content: 'oi',
            moderation: 'visible',
            createdAt: future,
          },
          {
            id: 'c2',
            targetType: 'post',
            targetId: 'mine',
            authorId: other,
            content: 'ola',
            moderation: 'visible',
            createdAt: future,
          },
          {
            id: 'c3',
            targetType: 'post',
            targetId: 'theirs',
            authorId: other,
            content: 'mantido',
            moderation: 'visible',
            createdAt: future,
          },
        )
        db.reports.push(
          {
            id: 'r1',
            targetType: 'post',
            targetId: 'mine',
            reporterId: other,
            reason: 'spam',
            status: 'open',
            createdAt: future,
          },
          {
            id: 'r2',
            targetType: 'post',
            targetId: 'theirs',
            reporterId: user.id,
            reason: 'spam',
            status: 'open',
            createdAt: future,
          },
          {
            id: 'r3',
            targetType: 'comment',
            targetId: 'c3',
            reporterId: other,
            reason: 'spam',
            status: 'open',
            createdAt: future,
          },
        )
        db.demands.push(
          demand('dm1', user.id),
          demand('dm2', other, { supporterIds: [user.id, other] }),
        )
        const baseEvent: CommunityEvent = {
          id: 'e1',
          title: 'Feira',
          description: 'Feira',
          categoryId: FIXTURE.categories.culture,
          startsAt: future,
          endsAt: future,
          venue: 'Praça',
          neighborhoodId: FIXTURE.neighborhoods.vila,
          organizer: { kind: 'user', id: user.id, name: user.name },
          attendeeIds: [user.id],
          status: 'scheduled',
          createdBy: user.id,
          createdAt: future,
        }
        db.events.push(baseEvent, {
          ...baseEvent,
          id: 'e2',
          createdBy: other,
          attendeeIds: [user.id, other],
        })
        db.reviews.push({
          id: 'rv1',
          businessId: FIXTURE.business,
          authorId: user.id,
          rating: 5,
          comment: 'ótimo',
          createdAt: future,
        })
        db.favorites.push({ userId: user.id, businessId: FIXTURE.business, createdAt: future })
        db.aiConversations.push({ userId: user.id, messages: [], updatedAt: future })
      },
    )
    await t.repos.auth.requestPasswordReset(SIGN_UP.email)
    t.signInAs(user.id)

    await t.repos.auth.deleteMyAccount()
    expect(readSession()).toBeNull()

    const db = t.snapshot()
    expect(db.users.some((u) => u.id === user.id)).toBe(false)
    expect(db.credentials.some((c) => c.userId === user.id)).toBe(false)
    expect(db.passwordResets.some((c) => c.userId === user.id)).toBe(false)
    expect(db.userSettings.some((c) => c.userId === user.id)).toBe(false)
    expect(db.notifications.some((c) => c.userId === user.id)).toBe(false)
    expect(db.favorites).toHaveLength(0)
    expect(db.reviews).toHaveLength(0)
    expect(db.aiConversations).toHaveLength(0)
    expect(db.posts.map((p) => p.id)).toEqual(['theirs'])
    expect(db.posts[0]?.likedBy).toEqual([])
    expect(db.comments.map((c) => c.id)).toEqual(['c3'])
    expect(db.reports.map((r) => r.id)).toEqual(['r3'])
    expect(db.demands.map((d) => d.id).sort()).toEqual(['dm1', 'dm2'])
    expect(db.demands.find((d) => d.id === 'dm2')?.supporterIds).toEqual([other])
    expect(db.events.find((e) => e.id === 'e1')?.status).toBe('cancelled')
    expect(db.events.find((e) => e.id === 'e1')?.attendeeIds).toEqual([])
    expect(db.events.find((e) => e.id === 'e2')?.attendeeIds).toEqual([other])
    expect(db.events.find((e) => e.id === 'e2')?.status).toBe('scheduled')
  })

  it('deleteMyAccount de comerciante inativa o negócio e remove dados de gestão', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.merchant)
    await t.repos.auth.deleteMyAccount()
    const db = t.snapshot()
    expect(db.businesses.find((b) => b.id === FIXTURE.business)?.status).toBe('inactive')
    expect(db.products.filter((p) => p.businessId === FIXTURE.business)).toHaveLength(0)
  })

  it('deleteMyAccount é bloqueado para conta demonstrativa', async () => {
    const t = await createTestHarness()
    t.store.write(['users'], (db) => {
      const target = db.users.find((u) => u.id === FIXTURE.users.resident)
      if (target) target.isDemoAccount = true
    })
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.auth.deleteMyAccount()).rejects.toMatchObject({
      code: 'conflict',
      message:
        'Contas demonstrativas não podem ser excluídas. Use “Restaurar dados demonstrativos”.',
    })
    expect(t.snapshot().users.some((u) => u.id === FIXTURE.users.resident)).toBe(true)
    expect(readSession()).not.toBeNull()
    clearSession()
  })
})
