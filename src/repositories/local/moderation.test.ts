import { beforeEach, describe, expect, it } from 'vitest'

import { FIXTURE, FIXTURE_NOW } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

let t: TestHarness

beforeEach(async () => {
  t = await createTestHarness()
})

/** Publicação da moradora denunciada pelo vizinho e pela comerciante. */
async function reportedPost() {
  t.signInAs(FIXTURE.users.resident)
  const post = await t.repos.posts.create({
    content: 'Conteúdo denunciado.',
    category: 'discussion',
  })
  t.signInAs(FIXTURE.users.resident2)
  await t.repos.posts.report({ type: 'post', id: post.id }, 'spam')
  t.setNow(new Date(FIXTURE_NOW.getTime() + 60_000))
  t.signInAs(FIXTURE.users.merchant)
  await t.repos.posts.report({ type: 'post', id: post.id }, 'offensive')
  t.signInAs(FIXTURE.users.admin)
  const reports = await t.repos.moderation.listReports()
  return { post, reports }
}

describe('moderação', () => {
  it('é exclusiva da administração', async () => {
    t.signInAs(FIXTURE.users.resident)
    await expect(t.repos.moderation.listReports()).rejects.toMatchObject({ code: 'forbidden' })
    await expect(t.repos.moderation.resolveReport('rpt_x', 'dismiss')).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('lista as denúncias com trecho, autores e situação do conteúdo', async () => {
    const { post, reports } = await reportedPost()
    expect(reports).toHaveLength(2)
    // Mais recentes primeiro entre as abertas.
    expect(reports[0]?.reporter.id).toBe(FIXTURE.users.merchant)
    expect(reports[0]).toMatchObject({
      excerpt: 'Conteúdo denunciado.',
      postId: post.id,
      targetModeration: 'visible',
      status: 'open',
    })
    expect(reports[0]?.targetAuthor?.id).toBe(FIXTURE.users.resident)
  })

  it('dismiss mantém o conteúdo e encerra apenas a denúncia', async () => {
    const { post, reports } = await reportedPost()
    await t.repos.moderation.resolveReport(reports[0]!.id, 'dismiss')

    const db = t.snapshot()
    expect(db.posts.find((p) => p.id === post.id)?.moderation).toBe('visible')
    expect(db.reports.find((r) => r.id === reports[0]!.id)).toMatchObject({
      status: 'dismissed',
      resolvedBy: FIXTURE.users.admin,
    })
    expect(db.reports.find((r) => r.id === reports[1]!.id)?.status).toBe('open')
    expect(db.notifications.some((n) => n.userId === FIXTURE.users.resident)).toBe(false)

    const listed = await t.repos.moderation.listReports()
    expect(listed[0]?.status).toBe('open')
    await expect(t.repos.moderation.resolveReport(reports[0]!.id, 'hide')).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('hide oculta o conteúdo, encerra as demais denúncias e notifica o autor', async () => {
    const { post, reports } = await reportedPost()
    await t.repos.moderation.resolveReport(reports[1]!.id, 'hide')

    const db = t.snapshot()
    expect(db.posts.find((p) => p.id === post.id)?.moderation).toBe('hidden')
    expect(db.reports.every((r) => r.status === 'actioned')).toBe(true)
    expect(db.notifications.find((n) => n.userId === FIXTURE.users.resident)).toMatchObject({
      category: 'community',
      link: `/comunidade/${post.id}`,
    })
    expect(
      (await t.repos.moderation.listReports({ status: 'actioned' }))[0]?.targetModeration,
    ).toBe('hidden')
  })

  it('remove exclui o conteúdo, mantém o histórico das denúncias e notifica o autor', async () => {
    t.signInAs(FIXTURE.users.resident)
    const post = await t.repos.posts.create({
      content: 'Publicação normal.',
      category: 'discussion',
    })
    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.posts.addComment(post.id, 'Comentário ofensivo.')
    t.signInAs(FIXTURE.users.resident)
    await t.repos.posts.report({ type: 'comment', id: comment.id }, 'offensive')

    t.signInAs(FIXTURE.users.admin)
    const [report] = await t.repos.moderation.listReports({ status: 'open' })
    expect(report?.postId).toBe(post.id)
    await t.repos.moderation.resolveReport(report!.id, 'remove')

    const db = t.snapshot()
    expect(db.comments).toHaveLength(0)
    expect(db.posts).toHaveLength(1)
    expect(db.reports[0]?.status).toBe('actioned')
    expect(db.notifications.find((n) => n.userId === FIXTURE.users.resident2)).toMatchObject({
      category: 'community',
      title: 'Conteúdo removido pela moderação',
    })
    const [listed] = await t.repos.moderation.listReports()
    expect(listed?.excerpt).toBe('Conteúdo removido.')
  })

  it('remove uma publicação denunciada', async () => {
    const { post, reports } = await reportedPost()
    await t.repos.moderation.resolveReport(reports[0]!.id, 'remove')
    const db = t.snapshot()
    expect(db.posts.find((p) => p.id === post.id)).toBeUndefined()
    expect(db.reports.every((r) => r.status === 'actioned')).toBe(true)
  })

  it('altera a moderação de comentários diretamente', async () => {
    t.signInAs(FIXTURE.users.resident)
    const post = await t.repos.posts.create({ content: 'Publicação.', category: 'discussion' })
    t.signInAs(FIXTURE.users.resident2)
    const comment = await t.repos.posts.addComment(post.id, 'Comentário.')

    t.signInAs(FIXTURE.users.admin)
    await t.repos.moderation.setCommentModeration(comment.id, 'hidden')
    expect(await t.repos.posts.listComments(post.id)).toHaveLength(1)

    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.posts.listComments(post.id)).toHaveLength(0)
    expect((await t.repos.posts.get(post.id))?.commentCount).toBe(0)
    t.signInAs(FIXTURE.users.resident2)
    expect(await t.repos.posts.listComments(post.id)).toHaveLength(1)
  })
})
