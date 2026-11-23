import { beforeEach, describe, expect, it } from 'vitest'

import { FIXTURE, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

const IMAGE = 'data:image/jpeg;base64,/9j/4AAQ'
const MINUTE = 60 * 1000

let t: TestHarness

beforeEach(async () => {
  t = await createTestHarness()
})

async function postAs(userId: string, content: string) {
  t.signInAs(userId)
  return t.repos.posts.create({ content, category: 'discussion' })
}

describe('publicações — criação', () => {
  it('cria a publicação no bairro do autor, sem expor quem curtiu', async () => {
    const post = await postAs(
      FIXTURE.users.resident,
      '  Alguém sabe se a feira de domingo vai acontecer?  ',
    )
    expect(post.content).toBe('Alguém sabe se a feira de domingo vai acontecer?')
    expect(post.neighborhoodId).toBe(FIXTURE.neighborhoods.vila)
    expect(post.neighborhoodName).toBe('Vila Esperança')
    expect(post.byline).toMatchObject({
      kind: 'user',
      name: 'Rita Moradora',
      to: `/pessoas/${FIXTURE.users.resident}`,
      avatar: { kind: 'user' },
    })
    expect(post.author.id).toBe(FIXTURE.users.resident)
    expect(post.author).not.toHaveProperty('email')
    expect(post).toMatchObject({ likeCount: 0, commentCount: 0, likedByMe: false, isMine: true })
    expect(post).not.toHaveProperty('likedBy')
  })

  it('valida conteúdo, categoria, imagem e vínculos', async () => {
    t.signInAs(FIXTURE.users.resident)
    const create = t.repos.posts.create
    await expect(create({ content: '   ', category: 'discussion' })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { content: expect.any(String) },
    })
    await expect(
      create({ content: 'x'.repeat(601), category: 'discussion' }),
    ).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(create({ content: 'Olá', category: 'politica' as never })).rejects.toMatchObject({
      code: 'validation',
      fieldErrors: { category: expect.any(String) },
    })
    await expect(
      create({ content: 'Olá', category: 'discussion', imageUrl: 'https://exemplo.com/a.png' }),
    ).rejects.toMatchObject({ code: 'validation', fieldErrors: { imageUrl: expect.any(String) } })
    await expect(
      create({ content: 'Olá', category: 'demand', linkedDemandId: 'dem_inexistente' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      create({ content: 'Olá', category: 'event', linkedEventId: 'evt_inexistente' }),
    ).rejects.toMatchObject({ code: 'validation' })
    // Comércio local só em nome de um estabelecimento.
    await expect(create({ content: 'Promoção!', category: 'commerce' })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(
      create({ content: 'Promoção!', category: 'commerce', publishAs: 'business' }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    const withImage = await create({
      content: 'Foto da praça',
      category: 'discussion',
      imageUrl: IMAGE,
    })
    expect(withImage.imageUrl).toBe(IMAGE)
  })

  it('publica em nome do estabelecimento e da instituição verificada', async () => {
    t.signInAs(FIXTURE.users.merchant)
    const commerce = await t.repos.posts.create({
      content: 'Pão quentinho às 17h!',
      category: 'commerce',
      publishAs: 'business',
    })
    expect(commerce.businessId).toBe(FIXTURE.business)
    expect(commerce.byline).toMatchObject({
      kind: 'business',
      name: 'Padaria Teste',
      to: `/comercio/${FIXTURE.business}`,
      avatar: { kind: 'business', illustration: 'bakery' },
    })

    t.signInAs(FIXTURE.users.institution)
    const official = await t.repos.posts.create({
      content: 'Campanha de vacinação no sábado.',
      category: 'social',
      publishAs: 'institution',
    })
    expect(official.institutionId).toBe(FIXTURE.institutions.cityHall)
    expect(official.byline).toMatchObject({
      kind: 'institution',
      name: 'Prefeitura Municipal',
      to: `/instituicoes/${FIXTURE.institutions.cityHall}`,
      avatar: { kind: 'institution', icon: 'landmark', color: 'green' },
    })

    t.signInAs(FIXTURE.users.resident)
    await expect(
      t.repos.posts.create({ content: 'Oi', category: 'discussion', publishAs: 'institution' }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    t.store.write(['institutions'], (db) => {
      const ngo = db.institutions.find((i) => i.id === FIXTURE.institutions.ngo)
      if (ngo) ngo.verified = false
    })
    t.signInAs(FIXTURE.users.institution2)
    await expect(
      t.repos.posts.create({ content: 'Doações', category: 'social', publishAs: 'institution' }),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('publicações — interações', () => {
  it('curte e descurte', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Bom dia, vizinhança!')
    t.signInAs(FIXTURE.users.resident2)
    const liked = await t.repos.posts.toggleLike(post.id)
    expect(liked).toMatchObject({ likeCount: 1, likedByMe: true, isMine: false })
    expect(liked).not.toHaveProperty('likedBy')
    expect(t.snapshot().posts[0]?.likedBy).toEqual([FIXTURE.users.resident2])

    const unliked = await t.repos.posts.toggleLike(post.id)
    expect(unliked).toMatchObject({ likeCount: 0, likedByMe: false })
  })

  it('comenta e notifica o autor (sem notificar quem comenta a própria publicação)', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Vamos organizar um mutirão?')
    await t.repos.posts.addComment(post.id, 'Eu mesma posso começar.')
    expect(t.snapshot().notifications).toHaveLength(0)

    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.posts.addComment(post.id, '  Conte comigo!  ')
    expect(comment).toMatchObject({ content: 'Conte comigo!', isMine: true, targetType: 'post' })
    expect(comment.author.name).toBe('Tiago Vizinho')

    const notifications = t.snapshot().notifications
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      userId: FIXTURE.users.resident,
      category: 'community',
      title: 'Novo comentário na sua publicação',
      body: 'Tiago Vizinho comentou: Conte comigo!',
      link: `/comunidade/${post.id}`,
    })

    const comments = await t.repos.posts.listComments(post.id)
    expect(comments.map((c) => c.content)).toEqual(['Eu mesma posso começar.', 'Conte comigo!'])
    expect((await t.repos.posts.get(post.id))?.commentCount).toBe(2)

    await expect(t.repos.posts.addComment(post.id, ' ')).rejects.toMatchObject({
      code: 'validation',
    })
  })

  it('exclui publicação e comentários apenas pelo autor ou pela administração', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Publicação que será excluída.')
    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.posts.addComment(post.id, 'Comentário do vizinho.')
    await t.repos.posts.report({ type: 'post', id: post.id }, 'spam')

    t.signInAs(FIXTURE.users.merchant)
    await expect(t.repos.posts.remove(post.id)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(t.repos.posts.removeComment(comment.id)).rejects.toMatchObject({
      code: 'forbidden',
    })

    t.signInAs(FIXTURE.users.resident)
    await t.repos.posts.remove(post.id)
    const db = t.snapshot()
    expect(db.posts).toHaveLength(0)
    expect(db.comments).toHaveLength(0)
    expect(db.reports).toHaveLength(0)

    const other = await postAs(FIXTURE.users.resident2, 'Outra publicação.')
    t.signInAs(FIXTURE.users.admin)
    await t.repos.posts.remove(other.id)
    expect(t.snapshot().posts).toHaveLength(0)
  })

  it('remove o próprio comentário', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Publicação.')
    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.posts.addComment(post.id, 'Vou apagar.')
    await t.repos.posts.removeComment(comment.id)
    expect(await t.repos.posts.listComments(post.id)).toHaveLength(0)
  })
})

describe('publicações — listagem', () => {
  it('filtra por categoria, autor, bairro e busca (mais recentes primeiro)', async () => {
    const first = await postAs(FIXTURE.users.resident, 'Feira de artesanato na praça')
    t.setNow(new Date(FIXTURE_NOW.getTime() + MINUTE))
    const second = await postAs(FIXTURE.users.resident2, 'Ônibus atrasado hoje')
    t.setNow(new Date(FIXTURE_NOW.getTime() + 2 * MINUTE))
    t.signInAs(FIXTURE.users.merchant)
    const third = await t.repos.posts.create({
      content: 'Promoção de bolos',
      category: 'commerce',
      publishAs: 'business',
    })

    const all = await t.repos.posts.list()
    expect(all.map((p) => p.id)).toEqual([third.id, second.id, first.id])
    expect((await t.repos.posts.list({ category: 'all' })).length).toBe(3)
    expect((await t.repos.posts.list({ category: 'commerce' })).map((p) => p.id)).toEqual([
      third.id,
    ])
    expect(
      (await t.repos.posts.list({ authorId: FIXTURE.users.resident2 })).map((p) => p.id),
    ).toEqual([second.id])
    expect(
      (await t.repos.posts.list({ neighborhoodId: FIXTURE.neighborhoods.centro })).map((p) => p.id),
    ).toEqual([second.id])
    // Busca sem acentos no conteúdo, em quem assina e no bairro.
    expect((await t.repos.posts.list({ search: 'onibus' })).map((p) => p.id)).toEqual([second.id])
    expect((await t.repos.posts.list({ search: 'padaria' })).map((p) => p.id)).toEqual([third.id])
    expect((await t.repos.posts.list({ search: 'vila esperanca' })).map((p) => p.id)).toEqual([
      third.id,
      first.id,
    ])
  })

  it('publicações ocultadas aparecem só para o autor e para a administração', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Conteúdo que será ocultado.')
    t.signInAs(FIXTURE.users.admin)
    await t.repos.moderation.setPostModeration(post.id, 'hidden')
    expect(await t.repos.posts.list()).toHaveLength(0)
    expect(await t.repos.posts.list({ includeHidden: true })).toHaveLength(1)
    expect(await t.repos.posts.get(post.id)).not.toBeNull()

    t.signInAs(FIXTURE.users.resident2)
    expect(await t.repos.posts.list()).toHaveLength(0)
    expect(await t.repos.posts.list({ includeHidden: true })).toHaveLength(0)
    expect(await t.repos.posts.get(post.id)).toBeNull()
    await expect(t.repos.posts.toggleLike(post.id)).rejects.toMatchObject({ code: 'not_found' })

    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.posts.list()).toHaveLength(0)
    expect(await t.repos.posts.list({ authorId: FIXTURE.users.resident })).toHaveLength(1)
    expect((await t.repos.posts.get(post.id))?.moderation).toBe('hidden')
  })

  it('exige usuário autenticado', async () => {
    await expect(t.repos.posts.list()).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('publicações — denúncias', () => {
  it('uma denúncia aberta por usuário e conteúdo; notifica a administração', async () => {
    const post = await postAs(FIXTURE.users.resident, 'Conteúdo polêmico.')
    await expect(t.repos.posts.report({ type: 'post', id: post.id }, 'spam')).rejects.toMatchObject(
      {
        code: 'conflict',
      },
    )

    t.signInAs(FIXTURE.users.resident2)
    await t.repos.posts.report(
      { type: 'post', id: post.id },
      'offensive',
      '  Ofende os vizinhos.  ',
    )
    await expect(t.repos.posts.report({ type: 'post', id: post.id }, 'spam')).rejects.toMatchObject(
      { code: 'conflict', message: 'Você já denunciou este conteúdo.' },
    )

    const db = t.snapshot()
    expect(db.reports).toHaveLength(1)
    expect(db.reports[0]).toMatchObject({
      targetType: 'post',
      targetId: post.id,
      reporterId: FIXTURE.users.resident2,
      reason: 'offensive',
      details: 'Ofende os vizinhos.',
      status: 'open',
    })
    expect(db.notifications.find((n) => n.userId === FIXTURE.users.admin)).toMatchObject({
      category: 'system',
      link: '/admin/moderacao',
    })

    await expect(
      t.repos.posts.report({ type: 'post', id: post.id }, 'motivo' as never),
    ).rejects.toMatchObject({ code: 'validation' })
  })
})
