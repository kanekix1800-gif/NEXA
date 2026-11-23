import { paths } from '@/app/paths'
import type {
  Comment,
  ContentReport,
  Database,
  ID,
  ModerationStatus,
  Post,
  ReportView,
} from '@/types'
import { nowISO } from '@/utils/clock'
import { conflictError, validationError } from '@/utils/errors'
import { truncate } from '@/utils/text'

import type { ModerationRepository } from '../contracts'
import {
  profileOf,
  pushNotification,
  requirePermission,
  requireRecord,
  type LocalContext,
} from './context'
import { toPostView } from './posts.shared'

const MODERATION_STATUSES: ModerationStatus[] = ['visible', 'hidden']
const RESOLVE_ACTIONS = ['dismiss', 'hide', 'remove'] as const

function assertModeration(value: unknown): asserts value is ModerationStatus {
  if (!MODERATION_STATUSES.includes(value as ModerationStatus)) {
    throw validationError('Situação de moderação inválida.')
  }
}

type ReportTarget =
  { type: 'post'; post: Post } | { type: 'comment'; comment: Comment } | { type: 'missing' }

function findTarget(db: Database, report: ContentReport): ReportTarget {
  if (report.targetType === 'post') {
    const post = db.posts.find((candidate) => candidate.id === report.targetId)
    return post ? { type: 'post', post } : { type: 'missing' }
  }
  const comment = db.comments.find((candidate) => candidate.id === report.targetId)
  return comment ? { type: 'comment', comment } : { type: 'missing' }
}

function toReportView(db: Database, report: ContentReport): ReportView {
  const target = findTarget(db, report)
  const view: ReportView = {
    ...report,
    reporter: profileOf(db, report.reporterId),
    excerpt: 'Conteúdo removido.',
  }
  if (target.type === 'post') {
    view.excerpt = truncate(target.post.content, 160)
    view.targetAuthor = profileOf(db, target.post.authorId)
    view.postId = target.post.id
    view.targetModeration = target.post.moderation
  } else if (target.type === 'comment') {
    view.excerpt = truncate(target.comment.content, 160)
    view.targetAuthor = profileOf(db, target.comment.authorId)
    if (target.comment.targetType === 'post') view.postId = target.comment.targetId
    view.targetModeration = target.comment.moderation
  }
  return view
}

/** Rota onde o autor encontra o conteúdo moderado (quando ele ainda existir). */
function contentLink(comment: Comment): string {
  return comment.targetType === 'post'
    ? paths.post(comment.targetId)
    : paths.demand(comment.targetId)
}

export function createModerationRepository(ctx: LocalContext): ModerationRepository {
  return {
    async listReports(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requirePermission(db, 'content:moderate')
        const status = filters.status ?? 'all'
        return db.reports
          .filter((report) => status === 'all' || report.status === status)
          .sort((a, b) => {
            const openA = a.status === 'open' ? 0 : 1
            const openB = b.status === 'open' ? 0 : 1
            if (openA !== openB) return openA - openB
            return b.createdAt.localeCompare(a.createdAt)
          })
          .map((report) => toReportView(db, report))
      })
    },

    async resolveReport(id, action) {
      await ctx.latency()
      ctx.store.write(['reports', 'posts', 'comments', 'notifications'], (db) => {
        const admin = requirePermission(db, 'content:moderate')
        if (!RESOLVE_ACTIONS.includes(action)) throw validationError('Ação de moderação inválida.')
        const report = requireRecord(db.reports, id, 'Denúncia não encontrada.')
        if (report.status !== 'open') throw conflictError('Esta denúncia já foi resolvida.')

        const resolvedAt = nowISO()
        const close = (row: ContentReport, status: ContentReport['status']) => {
          row.status = status
          row.resolvedAt = resolvedAt
          row.resolvedBy = admin.id
        }

        if (action === 'dismiss') {
          close(report, 'dismissed')
          return
        }

        // `hide`/`remove`: encerra esta e as demais denúncias abertas do mesmo conteúdo.
        for (const row of db.reports) {
          if (
            row.status === 'open' &&
            row.targetType === report.targetType &&
            row.targetId === report.targetId
          ) {
            close(row, 'actioned')
          }
        }

        const target = findTarget(db, report)
        if (target.type === 'missing') return

        const isPost = target.type === 'post'
        const authorId = isPost ? target.post.authorId : target.comment.authorId
        const noun = isPost ? 'Uma publicação sua' : 'Um comentário seu'

        if (action === 'hide') {
          if (isPost) target.post.moderation = 'hidden'
          else target.comment.moderation = 'hidden'
          pushNotification(
            db,
            {
              userId: authorId,
              category: 'community',
              title: 'Conteúdo ocultado pela moderação',
              body: `${noun} foi ${isPost ? 'ocultada' : 'ocultado'} por não seguir as regras de convivência do NEXA.`,
              link: isPost ? paths.post(target.post.id) : contentLink(target.comment),
            },
            admin.id,
          )
          return
        }

        // `remove`: exclui o conteúdo. As denúncias são mantidas (já encerradas) para histórico.
        let link: string | undefined
        if (isPost) {
          const postId: ID = target.post.id
          const commentIds = new Set(
            db.comments
              .filter((comment) => comment.targetType === 'post' && comment.targetId === postId)
              .map((comment) => comment.id),
          )
          db.comments = db.comments.filter((comment) => !commentIds.has(comment.id))
          db.posts = db.posts.filter((post) => post.id !== postId)
          for (const row of db.reports) {
            if (
              row.status === 'open' &&
              row.targetType === 'comment' &&
              commentIds.has(row.targetId)
            ) {
              close(row, 'actioned')
            }
          }
        } else {
          const commentId: ID = target.comment.id
          link = contentLink(target.comment)
          db.comments = db.comments.filter((comment) => comment.id !== commentId)
        }
        pushNotification(
          db,
          {
            userId: authorId,
            category: 'community',
            title: 'Conteúdo removido pela moderação',
            body: `${noun} foi ${isPost ? 'removida' : 'removido'} por não seguir as regras de convivência do NEXA.`,
            link,
          },
          admin.id,
        )
      })
    },

    async setPostModeration(postId, moderation) {
      await ctx.latency()
      return ctx.store.write(['posts'], (db) => {
        const admin = requirePermission(db, 'content:moderate')
        assertModeration(moderation)
        const post = requireRecord(db.posts, postId, 'Publicação não encontrada.')
        post.moderation = moderation
        return toPostView(db, post, admin)
      })
    },

    async setCommentModeration(commentId, moderation) {
      await ctx.latency()
      ctx.store.write(['comments'], (db) => {
        requirePermission(db, 'content:moderate')
        assertModeration(moderation)
        const comment = requireRecord(db.comments, commentId, 'Comentário não encontrado.')
        comment.moderation = moderation
      })
    },
  }
}
