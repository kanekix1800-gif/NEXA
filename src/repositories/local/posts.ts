import { paths } from '@/app/paths'
import { config } from '@/config'
import { can } from '@/services/permissions'
import {
  POST_CATEGORY_LABEL,
  REPORT_REASON_LABEL,
  type ContentReport,
  type Database,
  type ID,
  type Post,
  type PostCategory,
  type ReportReason,
  type User,
} from '@/types'
import { nowISO } from '@/utils/clock'
import { conflictError, forbiddenError, notFoundError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'
import { matchesSearch, truncate } from '@/utils/text'

import type { CreatePostInput, PostsRepository } from '../contracts'
import {
  neighborhoodName,
  optionalImage,
  optionalText,
  pushNotification,
  requirePermission,
  requireRecord,
  requireText,
  requireUser,
  requireVerifiedInstitution,
  type LocalContext,
} from './context'
import {
  canSeePost,
  deleteComments,
  deletePosts,
  insertComment,
  insertPost,
  isAdmin,
  listCommentViews,
  postByline,
  toCommentView,
  toPostView,
} from './posts.shared'

const POST_NOT_FOUND = 'Publicação não encontrada.'
const COMMENT_NOT_FOUND = 'Comentário não encontrado.'

function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === 'string' && Object.hasOwn(POST_CATEGORY_LABEL, value)
}

function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && Object.hasOwn(REPORT_REASON_LABEL, value)
}

/** Publicação visível para o usuário ou `not_found` (ocultas só para autor e administração). */
function requireVisiblePost(db: Database, id: ID, viewer: User): Post {
  const post = requireRecord(db.posts, id, POST_NOT_FOUND)
  if (!canSeePost(post, viewer)) throw notFoundError(POST_NOT_FOUND)
  return post
}

/** Valida em nome de quem a publicação será feita. */
function resolvePublisher(
  db: Database,
  user: User,
  publishAs: CreatePostInput['publishAs'],
): { institutionId?: ID; businessId?: ID } {
  const mode = publishAs ?? 'self'
  if (mode === 'self') return {}
  if (mode === 'institution') return { institutionId: requireVerifiedInstitution(db, user).id }
  if (mode === 'business') {
    const business =
      user.role === 'merchant' && user.businessId
        ? db.businesses.find((candidate) => candidate.id === user.businessId)
        : undefined
    if (!business) {
      throw forbiddenError(
        'Somente comerciantes com estabelecimento cadastrado podem publicar em nome de um negócio.',
      )
    }
    return { businessId: business.id }
  }
  const message = 'Escolha em nome de quem publicar.'
  throw validationError(message, { publishAs: message })
}

export function createPostsRepository(ctx: LocalContext): PostsRepository {
  return {
    async list(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const category = filters.category ?? 'all'
        const showHidden =
          (filters.includeHidden === true && isAdmin(user)) ||
          (filters.authorId !== undefined && filters.authorId === user.id)
        return db.posts
          .filter((post) => {
            if (post.moderation === 'hidden' && !showHidden) return false
            if (category !== 'all' && post.category !== category) return false
            if (filters.authorId !== undefined && post.authorId !== filters.authorId) return false
            if (
              filters.neighborhoodId !== undefined &&
              post.neighborhoodId !== filters.neighborhoodId
            ) {
              return false
            }
            return matchesSearch(
              filters.search,
              post.content,
              postByline(db, post).name,
              neighborhoodName(db, post.neighborhoodId),
            )
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((post) => toPostView(db, post, user))
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const post = db.posts.find((candidate) => candidate.id === id)
        if (!post || !canSeePost(post, user)) return null
        return toPostView(db, post, user)
      })
    },

    async create(input) {
      await ctx.latency()
      return ctx.store.write(['posts'], (db) => {
        const user = requirePermission(db, 'post:create')
        const content = requireText(input.content, {
          field: 'content',
          label: 'O texto da publicação',
          max: config.limits.postMaxLength,
        })
        if (!isPostCategory(input.category)) {
          const message = 'Escolha uma categoria válida.'
          throw validationError(message, { category: message })
        }
        const imageUrl = optionalImage(input.imageUrl, 'imageUrl')
        const publisher = resolvePublisher(db, user, input.publishAs)
        if (input.category === 'commerce' && !publisher.businessId) {
          const message = 'Publicações de comércio local são feitas em nome de um estabelecimento.'
          throw validationError(message, { category: message })
        }
        if (input.linkedDemandId && !db.demands.some((d) => d.id === input.linkedDemandId)) {
          const message = 'A demanda vinculada não foi encontrada.'
          throw validationError(message, { linkedDemandId: message })
        }
        if (input.linkedEventId && !db.events.some((e) => e.id === input.linkedEventId)) {
          const message = 'O evento vinculado não foi encontrado.'
          throw validationError(message, { linkedEventId: message })
        }

        const post = insertPost(db, {
          authorId: user.id,
          category: input.category,
          content,
          neighborhoodId: user.neighborhoodId,
          imageUrl,
          institutionId: publisher.institutionId,
          businessId: publisher.businessId,
          linkedDemandId: input.linkedDemandId,
          linkedEventId: input.linkedEventId,
        })
        return toPostView(db, post, user)
      })
    },

    async remove(id) {
      await ctx.latency()
      ctx.store.write(['posts', 'comments', 'reports'], (db) => {
        const user = requireUser(db)
        const post = requireRecord(db.posts, id, POST_NOT_FOUND)
        if (!can(user, 'post:delete', { ownerId: post.authorId })) {
          throw forbiddenError('Somente o autor ou a administração podem excluir esta publicação.')
        }
        deletePosts(db, new Set([post.id]))
      })
    },

    async toggleLike(id) {
      await ctx.latency()
      return ctx.store.write(['posts'], (db) => {
        const user = requireUser(db)
        const post = requireVisiblePost(db, id, user)
        post.likedBy = post.likedBy.includes(user.id)
          ? post.likedBy.filter((userId) => userId !== user.id)
          : [...post.likedBy, user.id]
        return toPostView(db, post, user)
      })
    },

    async listComments(postId) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const post = requireVisiblePost(db, postId, user)
        return listCommentViews(db, 'post', post.id, user)
      })
    },

    async addComment(postId, content) {
      await ctx.latency()
      return ctx.store.write(['comments', 'notifications'], (db) => {
        const user = requireUser(db)
        const post = requireVisiblePost(db, postId, user)
        const text = requireText(content, {
          field: 'content',
          label: 'O comentário',
          max: config.limits.commentMaxLength,
        })
        const comment = insertComment(db, 'post', post.id, user.id, text)
        pushNotification(
          db,
          {
            userId: post.authorId,
            category: 'community',
            title: 'Novo comentário na sua publicação',
            body: `${user.name} comentou: ${truncate(text, 80)}`,
            link: paths.post(post.id),
          },
          user.id,
        )
        return toCommentView(db, comment, user)
      })
    },

    async removeComment(commentId) {
      await ctx.latency()
      ctx.store.write(['comments', 'reports'], (db) => {
        const user = requireUser(db)
        const comment = requireRecord(db.comments, commentId, COMMENT_NOT_FOUND)
        if (!can(user, 'comment:delete', { ownerId: comment.authorId })) {
          throw forbiddenError('Somente o autor ou a administração podem excluir este comentário.')
        }
        deleteComments(db, new Set([comment.id]))
      })
    },

    async report(target, reason, details) {
      await ctx.latency()
      ctx.store.write(['reports', 'notifications'], (db) => {
        const user = requirePermission(db, 'content:report')
        if (!isReportReason(reason)) {
          const message = 'Escolha o motivo da denúncia.'
          throw validationError(message, { reason: message })
        }
        const note = optionalText(details, { field: 'details', label: 'O detalhamento', max: 500 })

        let authorId: ID
        let excerpt: string
        if (target.type === 'post') {
          const post = requireRecord(db.posts, target.id, POST_NOT_FOUND)
          authorId = post.authorId
          excerpt = post.content
        } else if (target.type === 'comment') {
          const comment = requireRecord(db.comments, target.id, COMMENT_NOT_FOUND)
          authorId = comment.authorId
          excerpt = comment.content
        } else {
          throw validationError('Conteúdo inválido para denúncia.')
        }

        if (authorId === user.id) {
          throw conflictError('Você não pode denunciar o próprio conteúdo.')
        }
        const duplicate = db.reports.some(
          (report) =>
            report.status === 'open' &&
            report.reporterId === user.id &&
            report.targetType === target.type &&
            report.targetId === target.id,
        )
        if (duplicate) throw conflictError('Você já denunciou este conteúdo.')

        const report: ContentReport = {
          id: createId('rpt'),
          targetType: target.type,
          targetId: target.id,
          reporterId: user.id,
          reason,
          status: 'open',
          createdAt: nowISO(),
        }
        if (note) report.details = note
        db.reports.push(report)

        for (const admin of db.users.filter((candidate) => candidate.role === 'admin')) {
          pushNotification(
            db,
            {
              userId: admin.id,
              category: 'system',
              title: 'Nova denúncia para revisão',
              body: `${REPORT_REASON_LABEL[reason]}: ${truncate(excerpt, 80)}`,
              link: paths.adminModeration,
            },
            user.id,
          )
        }
      })
    },
  }
}
