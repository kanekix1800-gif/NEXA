import { nowISO } from '@/utils/clock'
import { validationError } from '@/utils/errors'

import type { AIConversationsRepository } from '../contracts'
import { requireUser, type LocalContext } from './context'

const MAX_MESSAGES = 200

export function createAIConversationsRepository(ctx: LocalContext): AIConversationsRepository {
  return {
    async getMessages() {
      await ctx.latency(0.3)
      return ctx.store.read((db) => {
        const user = requireUser(db)
        return db.aiConversations.find((item) => item.userId === user.id)?.messages ?? []
      })
    },

    async appendMessages(messages) {
      await ctx.latency(0.2)
      if (!Array.isArray(messages)) throw validationError('Mensagens inválidas.')
      ctx.store.write(['aiConversations'], (db) => {
        const user = requireUser(db)
        let conversation = db.aiConversations.find((item) => item.userId === user.id)
        if (!conversation) {
          conversation = { userId: user.id, messages: [], updatedAt: nowISO() }
          db.aiConversations.push(conversation)
        }
        conversation.messages = [...conversation.messages, ...messages].slice(-MAX_MESSAGES)
        conversation.updatedAt = nowISO()
      })
    },

    async clear() {
      await ctx.latency(0.2)
      ctx.store.write(['aiConversations'], (db) => {
        const user = requireUser(db)
        db.aiConversations = db.aiConversations.filter((item) => item.userId !== user.id)
      })
    },
  }
}
