import { paths } from '@/app/paths'
import type {
  Comment,
  CommentView,
  Database,
  ID,
  IllustrationKey,
  Post,
  PostByline,
  PostCategory,
  PostView,
  User,
} from '@/types'
import { nowISO } from '@/utils/clock'
import { createId } from '@/utils/id'

import { neighborhoodName, profileOf } from './context'

/**
 * FUNÇÕES PURAS COMPARTILHADAS PELOS REPOSITÓRIOS DA COMUNIDADE
 * ─────────────────────────────────────────────────────────────────────────────
 * Montagem das visualizações de publicações/comentários e operações em cascata
 * usadas por publicações, moderação, demandas, eventos e instituições.
 * Todas recebem o `db` de dentro de um callback de `store.read`/`store.write`.
 */

/** Cópia rasa do objeto sem a chave indicada (remove listas internas das visualizações). */
export function withoutKey<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy: T = { ...value }
  Reflect.deleteProperty(copy, key)
  return copy as Omit<T, K>
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin'
}

/** Publicação visível para o usuário: não ocultada, ou o usuário é o autor ou da administração. */
export function canSeePost(post: Post, viewer: User | null): boolean {
  return post.moderation === 'visible' || isAdmin(viewer) || viewer?.id === post.authorId
}

/** Comentário visível para o usuário (mesma regra das publicações). */
export function canSeeComment(comment: Comment, viewer: User | null): boolean {
  return comment.moderation === 'visible' || isAdmin(viewer) || viewer?.id === comment.authorId
}

/** Quem assina a publicação: instituição, estabelecimento ou a própria pessoa. */
export function postByline(db: Database, post: Post): PostByline {
  if (post.institutionId) {
    const institution = db.institutions.find((candidate) => candidate.id === post.institutionId)
    if (institution) {
      return {
        kind: 'institution',
        name: institution.name,
        to: paths.institution(institution.id),
        avatar: { kind: 'institution', icon: institution.icon, color: institution.color },
      }
    }
  }
  if (post.businessId) {
    const business = db.businesses.find((candidate) => candidate.id === post.businessId)
    if (business) {
      return {
        kind: 'business',
        name: business.name,
        to: paths.business(business.id),
        avatar: {
          kind: 'business',
          coverUrl: business.coverUrl,
          illustration: business.illustration,
        },
      }
    }
  }
  const author = profileOf(db, post.authorId)
  const exists = db.users.some((candidate) => candidate.id === post.authorId)
  return {
    kind: 'user',
    name: author.name,
    to: exists ? paths.userProfile(post.authorId) : undefined,
    avatar: { kind: 'user', avatar: author.avatar, photoUrl: author.photoUrl },
  }
}

/** Quantidade de comentários visíveis de um conteúdo (publicação ou demanda). */
export function visibleCommentCount(
  db: Database,
  targetType: Comment['targetType'],
  targetId: ID,
): number {
  return db.comments.filter(
    (comment) =>
      comment.targetType === targetType &&
      comment.targetId === targetId &&
      comment.moderation === 'visible',
  ).length
}

/** Visualização da publicação (sem a lista de quem curtiu). */
export function toPostView(db: Database, post: Post, viewer: User | null): PostView {
  const demand = post.linkedDemandId
    ? db.demands.find((candidate) => candidate.id === post.linkedDemandId)
    : undefined
  const event = post.linkedEventId
    ? db.events.find((candidate) => candidate.id === post.linkedEventId)
    : undefined
  return {
    ...withoutKey(post, 'likedBy'),
    author: profileOf(db, post.authorId),
    byline: postByline(db, post),
    neighborhoodName: neighborhoodName(db, post.neighborhoodId),
    likeCount: post.likedBy.length,
    commentCount: visibleCommentCount(db, 'post', post.id),
    likedByMe: viewer ? post.likedBy.includes(viewer.id) : false,
    isMine: viewer?.id === post.authorId,
    linkedDemand: demand
      ? { id: demand.id, title: demand.title, protocol: demand.protocol, status: demand.status }
      : undefined,
    linkedEvent: event ? { id: event.id, title: event.title, startsAt: event.startsAt } : undefined,
  }
}

export function toCommentView(db: Database, comment: Comment, viewer: User | null): CommentView {
  return {
    ...comment,
    author: profileOf(db, comment.authorId),
    isMine: viewer?.id === comment.authorId,
  }
}

/** Comentários de um conteúdo que o usuário pode ver, mais antigos primeiro. */
export function listCommentViews(
  db: Database,
  targetType: Comment['targetType'],
  targetId: ID,
  viewer: User | null,
): CommentView[] {
  return db.comments
    .filter(
      (comment) =>
        comment.targetType === targetType &&
        comment.targetId === targetId &&
        canSeeComment(comment, viewer),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((comment) => toCommentView(db, comment, viewer))
}

/** Cria e grava um comentário. Requer `comments` declarada no `write`. */
export function insertComment(
  db: Database,
  targetType: Comment['targetType'],
  targetId: ID,
  authorId: ID,
  content: string,
): Comment {
  const comment: Comment = {
    id: createId('cmt'),
    targetType,
    targetId,
    authorId,
    content,
    moderation: 'visible',
    createdAt: nowISO(),
  }
  db.comments.push(comment)
  return comment
}

export interface FeedPostInput {
  authorId: ID
  category: PostCategory
  content: string
  neighborhoodId: ID
  imageUrl?: string
  illustration?: IllustrationKey
  institutionId?: ID
  businessId?: ID
  linkedDemandId?: ID
  linkedEventId?: ID
}

/** Cria e grava uma publicação do feed. Requer `posts` declarada no `write`. */
export function insertPost(db: Database, input: FeedPostInput): Post {
  const post: Post = {
    id: createId('pst'),
    authorId: input.authorId,
    category: input.category,
    content: input.content,
    neighborhoodId: input.neighborhoodId,
    likedBy: [],
    moderation: 'visible',
    createdAt: nowISO(),
  }
  if (input.imageUrl) post.imageUrl = input.imageUrl
  if (input.illustration) post.illustration = input.illustration
  if (input.institutionId) post.institutionId = input.institutionId
  if (input.businessId) post.businessId = input.businessId
  if (input.linkedDemandId) post.linkedDemandId = input.linkedDemandId
  if (input.linkedEventId) post.linkedEventId = input.linkedEventId
  db.posts.push(post)
  return post
}

/**
 * Exclui comentários e as denúncias ligadas a eles.
 * Requer `comments` e `reports` declaradas no `write`.
 */
export function deleteComments(db: Database, commentIds: ReadonlySet<ID>): void {
  if (commentIds.size === 0) return
  db.comments = db.comments.filter((comment) => !commentIds.has(comment.id))
  db.reports = db.reports.filter(
    (report) => !(report.targetType === 'comment' && commentIds.has(report.targetId)),
  )
}

/** Exclui todos os comentários de um conteúdo (e suas denúncias). */
export function deleteCommentsOf(
  db: Database,
  targetType: Comment['targetType'],
  targetId: ID,
): void {
  const ids = new Set(
    db.comments
      .filter((comment) => comment.targetType === targetType && comment.targetId === targetId)
      .map((comment) => comment.id),
  )
  deleteComments(db, ids)
}

/**
 * Exclui publicações com seus comentários e denúncias.
 * Requer `posts`, `comments` e `reports` declaradas no `write`.
 */
export function deletePosts(db: Database, postIds: ReadonlySet<ID>): void {
  if (postIds.size === 0) return
  for (const postId of postIds) deleteCommentsOf(db, 'post', postId)
  db.posts = db.posts.filter((post) => !postIds.has(post.id))
  db.reports = db.reports.filter(
    (report) => !(report.targetType === 'post' && postIds.has(report.targetId)),
  )
}

/** Contas que representam a instituição indicada. */
export function institutionAccounts(db: Database, institutionId: ID): User[] {
  return db.users.filter(
    (user) => user.role === 'institution' && user.institutionId === institutionId,
  )
}
