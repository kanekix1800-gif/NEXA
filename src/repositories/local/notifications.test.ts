import { describe, expect, it } from 'vitest'

import type { AIMessage, AppNotification } from '@/types'

import { readSession } from './session'
import { FIXTURE } from './testing/fixture'
import { createTestHarness, type TestHarness } from './testing/harness'

function notification(
  id: string,
  userId: string,
  extra: Partial<AppNotification> = {},
): AppNotification {
  return {
    id,
    userId,
    category: 'community',
    title: `Título ${id}`,
    body: 'Corpo',
    read: false,
    createdAt: '2026-11-18T10:00:00.000Z',
    ...extra,
  }
}

async function withNotifications(): Promise<TestHarness> {
  const t = await createTestHarness()
  t.store.write(['notifications'], (db) => {
    db.notifications.push(
      notification('n1', FIXTURE.users.resident, { createdAt: '2026-11-18T08:00:00.000Z' }),
      notification('n2', FIXTURE.users.resident, {
        category: 'demands',
        createdAt: '2026-11-18T09:00:00.000Z',
      }),
      notification('n3', FIXTURE.users.resident, {
        read: true,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
      notification('n4', FIXTURE.users.resident2),
    )
  })
  return t
}

describe('notifications', () => {
  it('lista só as do usuário, mais recentes primeiro, com filtros', async () => {
    const t = await withNotifications()
    t.signInAs(FIXTURE.users.resident)
    const all = await t.repos.notifications.list()
    expect(all.map((n) => n.id)).toEqual(['n2', 'n1', 'n3'])
    expect((await t.repos.notifications.list({ category: 'demands' })).map((n) => n.id)).toEqual([
      'n2',
    ])
    expect((await t.repos.notifications.list({ unreadOnly: true })).map((n) => n.id)).toEqual([
      'n2',
      'n1',
    ])
    expect(await t.repos.notifications.unreadCount()).toBe(2)

    t.signInAs(FIXTURE.users.resident2)
    expect((await t.repos.notifications.list()).map((n) => n.id)).toEqual(['n4'])
  })

  it('exige sessão', async () => {
    const t = await withNotifications()
    await expect(t.repos.notifications.list()).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('marca como lida/não lida e recusa notificações de outra pessoa', async () => {
    const t = await withNotifications()
    t.signInAs(FIXTURE.users.resident)
    await t.repos.notifications.markRead('n1')
    expect(await t.repos.notifications.unreadCount()).toBe(1)
    await t.repos.notifications.markRead('n1', false)
    expect(await t.repos.notifications.unreadCount()).toBe(2)

    await expect(t.repos.notifications.markRead('n4')).rejects.toMatchObject({ code: 'not_found' })
    await expect(t.repos.notifications.remove('n4')).rejects.toMatchObject({ code: 'not_found' })
    expect(t.snapshot().notifications.find((n) => n.id === 'n4')?.read).toBe(false)
  })

  it('marca todas (ou de uma categoria) sem tocar nas de outros usuários', async () => {
    const t = await withNotifications()
    t.signInAs(FIXTURE.users.resident)
    await t.repos.notifications.markAllRead('demands')
    expect(await t.repos.notifications.unreadCount()).toBe(1)
    await t.repos.notifications.markAllRead()
    expect(await t.repos.notifications.unreadCount()).toBe(0)
    expect(t.snapshot().notifications.find((n) => n.id === 'n4')?.read).toBe(false)
  })

  it('remove a própria notificação', async () => {
    const t = await withNotifications()
    t.signInAs(FIXTURE.users.resident)
    await t.repos.notifications.remove('n1')
    expect((await t.repos.notifications.list()).map((n) => n.id)).toEqual(['n2', 'n3'])
  })
})

describe('settings', () => {
  it('cria e grava as preferências padrão quando faltam', async () => {
    const t = await createTestHarness()
    t.store.write(['userSettings'], (db) => {
      db.userSettings = []
    })
    t.signInAs(FIXTURE.users.resident)
    const settings = await t.repos.settings.get()
    expect(settings).toMatchObject({
      userId: FIXTURE.users.resident,
      locationConsent: 'unset',
      motion: 'system',
    })
    expect(t.snapshot().userSettings).toHaveLength(1)
  })

  it('atualiza mesclando notificações e valida valores', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const updated = await t.repos.settings.update({
      locationConsent: 'granted',
      motion: 'reduced',
      notifications: { events: false },
    })
    expect(updated.locationConsent).toBe('granted')
    expect(updated.motion).toBe('reduced')
    expect(updated.notifications).toMatchObject({ events: false, community: true, system: true })

    await expect(t.repos.settings.update({ motion: 'turbo' as never })).rejects.toMatchObject({
      code: 'validation',
    })
    await expect(
      t.repos.settings.update({ notifications: { events: 'sim' as never } }),
    ).rejects.toMatchObject({ code: 'validation' })
    expect((await t.repos.settings.get()).motion).toBe('reduced')
  })
})

describe('system', () => {
  it('getInfo informa modo, armazenamento e data da carga', async () => {
    const t = await createTestHarness()
    const info = await t.repos.system.getInfo()
    expect(info).toEqual({
      isDemoMode: true,
      storage: 'memory',
      seededAt: t.snapshot().meta.seededAt,
    })
  })

  it('resetDemoData restaura a base e encerra a sessão', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    t.store.write(['users'], (db) => {
      db.users = db.users.filter((u) => u.id !== FIXTURE.users.resident2)
    })
    expect(t.snapshot().users).toHaveLength(7)
    await t.repos.system.resetDemoData()
    expect(t.snapshot().users).toHaveLength(8)
    expect(readSession()).toBeNull()
  })
})

describe('news', () => {
  it('lista e busca notícias sem sessão', async () => {
    const t = await createTestHarness()
    t.store.write(['news'], (db) => {
      const base = db.news[0]
      if (!base) throw new Error('fixture sem notícia')
      db.news.push(
        { ...base, id: 'nws_velha', publishedAt: '2026-01-01T00:00:00.000Z' },
        { ...base, id: 'nws_media', publishedAt: '2026-06-01T00:00:00.000Z' },
      )
    })
    expect((await t.repos.news.list()).map((n) => n.id)).toEqual([
      FIXTURE.news,
      'nws_media',
      'nws_velha',
    ])
    expect((await t.repos.news.list({ limit: 2 })).map((n) => n.id)).toEqual([
      FIXTURE.news,
      'nws_media',
    ])
    expect((await t.repos.news.get(FIXTURE.news))?.title).toContain('ônibus')
    expect(await t.repos.news.get('nws_x')).toBeNull()
  })
})

describe('aiConversations', () => {
  const message = (id: string, role: AIMessage['role'] = 'user'): AIMessage => ({
    id,
    role,
    content: `Mensagem ${id}`,
    createdAt: '2026-11-18T12:00:00.000Z',
  })

  it('guarda o histórico por usuário e limpa', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    expect(await t.repos.aiConversations.getMessages()).toEqual([])
    await t.repos.aiConversations.appendMessages([message('a'), message('b', 'assistant')])
    await t.repos.aiConversations.appendMessages([message('c')])
    expect((await t.repos.aiConversations.getMessages()).map((m) => m.id)).toEqual(['a', 'b', 'c'])

    t.signInAs(FIXTURE.users.resident2)
    expect(await t.repos.aiConversations.getMessages()).toEqual([])

    t.signInAs(FIXTURE.users.resident)
    await t.repos.aiConversations.clear()
    expect(await t.repos.aiConversations.getMessages()).toEqual([])
  })

  it('mantém apenas as 200 mais recentes', async () => {
    const t = await createTestHarness()
    t.signInAs(FIXTURE.users.resident)
    const batch = Array.from({ length: 150 }, (_, i) => message(`m${i}`))
    await t.repos.aiConversations.appendMessages(batch)
    await t.repos.aiConversations.appendMessages(batch.map((m) => ({ ...m, id: `x${m.id}` })))
    const stored = await t.repos.aiConversations.getMessages()
    expect(stored).toHaveLength(200)
    expect(stored[0]?.id).toBe('m100')
    expect(stored.at(-1)?.id).toBe('xm149')
  })

  it('exige sessão', async () => {
    const t = await createTestHarness()
    await expect(t.repos.aiConversations.getMessages()).rejects.toMatchObject({
      code: 'unauthenticated',
    })
  })
})
