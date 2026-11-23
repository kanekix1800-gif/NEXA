import { paths } from '@/app/paths'
import { config } from '@/config'
import { DEMO_ACCOUNTS } from '@/data/demoAccounts'
import {
  INSTITUTION_CATEGORY_LABEL,
  type AvatarSpec,
  type ColorKey,
  type Credential,
  type Database,
  type IconKey,
  type Institution,
  type InstitutionCategory,
  type User,
  type UserRole,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import {
  AppError,
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from '@/utils/errors'
import { createId } from '@/utils/id'
import {
  createSecureToken,
  hashPassword,
  validatePassword,
  verifyPassword,
  type PasswordHash,
} from '@/utils/password'
import { isValidUsername, suggestUsername, USERNAME_RULE_MESSAGE } from '@/utils/username'

import type {
  AuthRepository,
  PersonalDataExport,
  ProfileUpdateInput,
  SignUpInput,
} from '../contracts'
import {
  defaultSettings,
  optionalImage,
  optionalText,
  pushNotification,
  requireEmail,
  requireRecord,
  requireText,
  requireUser,
  settingsOf,
  type LocalContext,
} from './context'
import { clearSession, readSession, writeSession } from './session'

const RESET_TOKEN_MINUTES = 30
const SIGN_IN_ERROR = 'E-mail ou senha incorretos.'
const SIGN_UP_ROLES: ReadonlyArray<string> = ['resident', 'merchant', 'institution']

const INSTITUTION_STYLE: Record<InstitutionCategory, { icon: IconKey; color: ColorKey }> = {
  city_hall: { icon: 'landmark', color: 'green' },
  municipal_department: { icon: 'building', color: 'blue' },
  ngo: { icon: 'hand-heart', color: 'orange' },
  community_association: { icon: 'users', color: 'teal' },
  education: { icon: 'school', color: 'purple' },
  business_support: { icon: 'briefcase', color: 'gold' },
}

const SKINS: AvatarSpec['skin'][] = ['light', 'tan', 'medium', 'brown', 'dark']
const HAIRS: AvatarSpec['hair'][] = [
  'short',
  'buzz',
  'curly',
  'afro',
  'long',
  'bob',
  'bun',
  'wavy',
  'bald',
]
const HAIR_COLORS: AvatarSpec['hairColor'][] = [
  'black',
  'brown',
  'chestnut',
  'blonde',
  'gray',
  'red',
]
const TOPS: AvatarSpec['top'][] = ['green', 'orange', 'cream', 'teal', 'terracotta', 'navy']
const BACKGROUNDS: AvatarSpec['background'][] = ['mint', 'sand', 'peach', 'sage', 'sky']

/** Avatar inicial variado e determinístico a partir do nome. */
function avatarFromName(name: string): AvatarSpec {
  let seed = 2166136261
  for (const char of name.toLowerCase()) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  }
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed >>> 8
  }
  const pick = <T>(items: T[]): T => items[next() % items.length] as T
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairColor: pick(HAIR_COLORS),
    top: pick(TOPS),
    background: pick(BACKGROUNDS),
  }
}

function assertPassword(password: unknown, field: string): string {
  const value = typeof password === 'string' ? password : ''
  const problem = validatePassword(value)
  if (problem) throw validationError(problem, { [field]: problem })
  return value
}

function assertNeighborhood(db: Database, id: unknown): string {
  if (typeof id !== 'string' || !db.neighborhoods.some((item) => item.id === id)) {
    const message = 'Selecione um bairro válido.'
    throw validationError(message, { neighborhoodId: message })
  }
  return id
}

interface ValidSignUp {
  name: string
  email: string
  role: Exclude<UserRole, 'admin'>
  neighborhoodId: string
  password: string
  institution?: { name: string; category: InstitutionCategory }
}

function validateSignUp(db: Database, input: SignUpInput): ValidSignUp {
  const name = requireText(input.name, {
    field: 'name',
    label: 'O nome',
    min: 3,
    max: config.limits.nameMaxLength,
  })
  const email = requireEmail(input.email)
  if (!SIGN_UP_ROLES.includes(input.role)) {
    const message = 'Selecione um tipo de conta válido.'
    throw validationError(message, { role: message })
  }
  const neighborhoodId = assertNeighborhood(db, input.neighborhoodId)
  const password = assertPassword(input.password, 'password')
  if (input.acceptedTerms !== true) {
    const message = 'Aceite os termos de uso e o aviso de privacidade para criar a conta.'
    throw validationError(message, { acceptedTerms: message })
  }

  let institution: ValidSignUp['institution']
  if (input.role === 'institution') {
    const institutionName = requireText(input.institution?.name, {
      field: 'institutionName',
      label: 'O nome da instituição',
      min: 3,
      max: 80,
    })
    const category = input.institution?.category
    if (!category || !(category in INSTITUTION_CATEGORY_LABEL)) {
      const message = 'Selecione a categoria da instituição.'
      throw validationError(message, { institutionCategory: message })
    }
    institution = { name: institutionName, category }
  }

  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    const message = 'Já existe uma conta com este e-mail.'
    throw new AppError('conflict', message, { fieldErrors: { email: message } })
  }
  return { name, email, role: input.role, neighborhoodId, password, institution }
}

function credentialOf(db: Database, userId: string): Credential | undefined {
  return db.credentials.find((credential) => credential.userId === userId)
}

function upsertCredential(db: Database, userId: string, hash: PasswordHash): void {
  const credential: Credential = { userId, ...hash, updatedAt: nowISO() }
  const index = db.credentials.findIndex((item) => item.userId === userId)
  if (index >= 0) db.credentials[index] = credential
  else db.credentials.push(credential)
}

export function createAuthRepository(ctx: LocalContext): AuthRepository {
  return {
    async getCurrentUser() {
      await ctx.latency(0.5)
      const session = readSession()
      if (!session) return null
      const user = ctx.store.read(
        (db) => db.users.find((candidate) => candidate.id === session.userId) ?? null,
      )
      if (!user || user.status !== 'active') {
        clearSession()
        return null
      }
      return user
    },

    async signIn(input) {
      await ctx.latency()
      const email = requireEmail(input.email)
      const password = typeof input.password === 'string' ? input.password : ''
      const found = ctx.store.read((db) => {
        const user = db.users.find((candidate) => candidate.email.toLowerCase() === email)
        const credential = user ? credentialOf(db, user.id) : undefined
        return user && credential ? { user, credential } : null
      })
      if (!found || !(await verifyPassword(password, found.credential))) {
        throw validationError(SIGN_IN_ERROR)
      }
      if (found.user.status !== 'active') {
        throw forbiddenError('Esta conta está suspensa. Fale com a administração do NEXA.')
      }
      writeSession({ userId: found.user.id, startedAt: nowISO() })
      return found.user
    },

    async signInDemo(role) {
      await ctx.latency()
      if (!config.isDemoMode)
        throw forbiddenError('O acesso rápido só existe no modo demonstração.')
      const account = DEMO_ACCOUNTS[role]
      const user = ctx.store.read(
        (db) => db.users.find((candidate) => candidate.id === account.userId) ?? null,
      )
      if (!user) {
        throw notFoundError('Perfil demonstrativo indisponível. Restaure os dados demonstrativos.')
      }
      if (user.status !== 'active') {
        throw forbiddenError('Esta conta está suspensa. Fale com a administração do NEXA.')
      }
      writeSession({ userId: user.id, startedAt: nowISO() })
      return user
    },

    async signUp(input) {
      await ctx.latency()
      const valid = ctx.store.read((db) => validateSignUp(db, input))
      const hash = await hashPassword(valid.password)

      const user = ctx.store.write(
        ['users', 'credentials', 'userSettings', 'institutions', 'notifications'],
        (db) => {
          const checked = validateSignUp(db, input)
          const createdAt = nowISO()
          const taken = new Set(db.users.map((candidate) => candidate.username))
          const id = createId('usr')

          let institutionId: string | undefined
          if (checked.institution) {
            const style = INSTITUTION_STYLE[checked.institution.category]
            const institution: Institution = {
              id: createId('ins'),
              name: checked.institution.name,
              category: checked.institution.category,
              tagline: 'Aguardando verificação',
              description: `${checked.institution.name} se cadastrou no NEXA e aguarda a verificação da administração.`,
              areas: [],
              services: [],
              neighborhoodId: checked.neighborhoodId,
              icon: style.icon,
              color: style.color,
              verified: false,
              isDemo: false,
              createdAt,
            }
            db.institutions.push(institution)
            institutionId = institution.id
          }

          const created: User = {
            id,
            name: checked.name,
            username: suggestUsername(checked.name, taken),
            email: checked.email,
            role: checked.role,
            neighborhoodId: checked.neighborhoodId,
            avatar: avatarFromName(checked.name),
            institutionId,
            status: 'active',
            isDemoAccount: false,
            termsAcceptedAt: createdAt,
            createdAt,
          }
          db.users.push(created)
          upsertCredential(db, id, hash)
          db.userSettings.push(defaultSettings(id, createdAt))
          pushNotification(db, {
            userId: id,
            category: 'system',
            title: 'Bem-vindo(a) ao NEXA!',
            body: 'Sua conta foi criada. Explore a comunidade, registre demandas e conheça o comércio local.',
            link: paths.home,
          })
          return created
        },
      )
      writeSession({ userId: user.id, startedAt: nowISO() })
      return user
    },

    async signOut() {
      await ctx.latency(0.3)
      clearSession()
    },

    async requestPasswordReset(email) {
      await ctx.latency()
      const normalized = requireEmail(email)
      const resetToken = ctx.store.write(['passwordResets'], (db) => {
        const user = db.users.find((candidate) => candidate.email.toLowerCase() === normalized)
        if (!user || user.status !== 'active') return null
        db.passwordResets = db.passwordResets.filter((item) => item.userId !== user.id)
        const token = createSecureToken()
        db.passwordResets.push({
          token,
          userId: user.id,
          expiresAt: new Date(now().getTime() + RESET_TOKEN_MINUTES * 60_000).toISOString(),
        })
        return token
      })
      return { simulated: true, resetToken }
    },

    async resetPassword(token, newPassword) {
      await ctx.latency()
      const invalid = () => validationError('Link de redefinição inválido ou expirado.')
      const findValid = (db: Database) => {
        const entry = db.passwordResets.find((item) => item.token === token)
        if (!entry || new Date(entry.expiresAt).getTime() <= now().getTime()) return null
        return db.users.some((user) => user.id === entry.userId) ? entry : null
      }
      if (!ctx.store.read((db) => findValid(db) !== null)) throw invalid()
      const password = assertPassword(newPassword, 'password')
      const hash = await hashPassword(password)
      ctx.store.write(['credentials', 'passwordResets'], (db) => {
        const entry = findValid(db)
        if (!entry) throw invalid()
        upsertCredential(db, entry.userId, hash)
        db.passwordResets = db.passwordResets.filter((item) => item.token !== token)
      })
    },

    async changePassword(currentPassword, newPassword) {
      await ctx.latency()
      const { user, credential } = ctx.store.read((db) => {
        const me = requireUser(db)
        return { user: me, credential: credentialOf(db, me.id) }
      })
      if (!credential) throw conflictError('Esta conta não possui senha cadastrada.')
      const current = typeof currentPassword === 'string' ? currentPassword : ''
      if (!(await verifyPassword(current, credential))) {
        const message = 'Senha atual incorreta.'
        throw validationError(message, { currentPassword: message })
      }
      const password = assertPassword(newPassword, 'newPassword')
      const hash = await hashPassword(password)
      ctx.store.write(['credentials'], (db) => {
        requireUser(db)
        upsertCredential(db, user.id, hash)
      })
    },

    async updateProfile(patch: ProfileUpdateInput) {
      await ctx.latency()
      return ctx.store.write(['users'], (db) => {
        const me = requireUser(db)
        const user = requireRecord(db.users, me.id)
        const next: User = { ...user }

        if (patch.name !== undefined) {
          next.name = requireText(patch.name, {
            field: 'name',
            label: 'O nome',
            min: 3,
            max: config.limits.nameMaxLength,
          })
        }
        if (patch.username !== undefined) {
          const username = String(patch.username).trim().replace(/^@/, '').toLowerCase()
          if (!isValidUsername(username)) {
            throw validationError(USERNAME_RULE_MESSAGE, { username: USERNAME_RULE_MESSAGE })
          }
          if (db.users.some((other) => other.id !== user.id && other.username === username)) {
            const message = 'Este nome de usuário já está em uso.'
            throw new AppError('conflict', message, { fieldErrors: { username: message } })
          }
          next.username = username
        }
        if (patch.bio !== undefined) {
          next.bio = optionalText(patch.bio, {
            field: 'bio',
            label: 'A bio',
            max: config.limits.bioMaxLength,
          })
        }
        if (patch.neighborhoodId !== undefined) {
          next.neighborhoodId = assertNeighborhood(db, patch.neighborhoodId)
        }
        if (patch.avatar !== undefined) next.avatar = { ...patch.avatar }
        if (patch.photoUrl !== undefined) next.photoUrl = optionalImage(patch.photoUrl, 'photoUrl')

        Object.assign(user, next)
        if (next.bio === undefined) delete user.bio
        if (next.photoUrl === undefined) delete user.photoUrl
        return user
      })
    },

    async becomeMerchant() {
      await ctx.latency()
      return ctx.store.write(['users'], (db) => {
        const user = requireUser(db)
        if (user.isDemoAccount) {
          throw conflictError(
            'Contas demonstrativas não mudam de perfil. Entre com o perfil Comerciante de demonstração.',
          )
        }
        if (user.role !== 'resident') {
          throw conflictError('Somente contas de morador podem se tornar comerciantes.')
        }
        user.role = 'merchant'
        return user
      })
    },

    async exportMyData(): Promise<PersonalDataExport> {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        return {
          exportedAt: nowISO(),
          notice:
            'Esta é uma cópia dos dados pessoais guardados neste dispositivo no modo demonstração. Senhas nunca fazem parte da exportação.',
          account: user,
          settings: settingsOf(db, user.id),
          posts: db.posts.filter((post) => post.authorId === user.id),
          comments: db.comments.filter((comment) => comment.authorId === user.id),
          demands: db.demands.filter((demand) => demand.authorId === user.id),
          supportedDemandIds: db.demands
            .filter((demand) => demand.supporterIds.includes(user.id))
            .map((demand) => demand.id),
          reviews: db.reviews.filter((review) => review.authorId === user.id),
          favoriteBusinessIds: db.favorites
            .filter((favorite) => favorite.userId === user.id)
            .map((favorite) => favorite.businessId),
          attendingEventIds: db.events
            .filter((event) => event.attendeeIds.includes(user.id))
            .map((event) => event.id),
          notifications: db.notifications.filter((item) => item.userId === user.id),
          business: db.businesses.find((business) => business.ownerId === user.id),
          aiMessages: db.aiConversations.find((item) => item.userId === user.id)?.messages ?? [],
        }
      })
    },

    async deleteMyAccount() {
      await ctx.latency()
      ctx.store.write(
        [
          'users',
          'credentials',
          'passwordResets',
          'userSettings',
          'notifications',
          'favorites',
          'reviews',
          'comments',
          'posts',
          'reports',
          'aiConversations',
          'events',
          'demands',
          'businesses',
          'products',
          'sales',
          'transactions',
        ],
        (db) => {
          const user = requireUser(db)
          if (user.isDemoAccount) {
            throw conflictError(
              'Contas demonstrativas não podem ser excluídas. Use “Restaurar dados demonstrativos”.',
            )
          }
          const id = user.id

          // Publicações do usuário e tudo que depende delas.
          const removedPosts = new Set(
            db.posts.filter((post) => post.authorId === id).map((post) => post.id),
          )
          const removedComments = new Set(
            db.comments
              .filter(
                (comment) =>
                  comment.authorId === id ||
                  (comment.targetType === 'post' && removedPosts.has(comment.targetId)),
              )
              .map((comment) => comment.id),
          )
          db.comments = db.comments.filter((comment) => !removedComments.has(comment.id))
          db.posts = db.posts.filter((post) => !removedPosts.has(post.id))
          for (const post of db.posts) post.likedBy = post.likedBy.filter((who) => who !== id)
          db.reports = db.reports.filter(
            (report) =>
              report.reporterId !== id &&
              !(report.targetType === 'post' && removedPosts.has(report.targetId)) &&
              !(report.targetType === 'comment' && removedComments.has(report.targetId)),
          )

          // Demandas permanecem (anonimizadas pela interface); apoios saem.
          for (const demand of db.demands) {
            demand.supporterIds = demand.supporterIds.filter((who) => who !== id)
          }

          // Eventos: presença removida; eventos futuros criados por ele são cancelados.
          const current = now().getTime()
          for (const event of db.events) {
            event.attendeeIds = event.attendeeIds.filter((who) => who !== id)
            if (
              event.createdBy === id &&
              event.status === 'scheduled' &&
              new Date(event.startsAt).getTime() > current
            ) {
              event.status = 'cancelled'
            }
          }

          // Comerciante: estabelecimento inativo; dados de gestão removidos.
          const ownedBusinesses = new Set(
            db.businesses.filter((business) => business.ownerId === id).map((b) => b.id),
          )
          for (const business of db.businesses) {
            if (ownedBusinesses.has(business.id)) business.status = 'inactive'
          }
          db.products = db.products.filter((product) => !ownedBusinesses.has(product.businessId))
          db.sales = db.sales.filter((sale) => !ownedBusinesses.has(sale.businessId))
          db.transactions = db.transactions.filter(
            (transaction) => !ownedBusinesses.has(transaction.businessId),
          )

          db.reviews = db.reviews.filter((review) => review.authorId !== id)
          db.favorites = db.favorites.filter((favorite) => favorite.userId !== id)
          db.notifications = db.notifications.filter((item) => item.userId !== id)
          db.aiConversations = db.aiConversations.filter((item) => item.userId !== id)
          db.userSettings = db.userSettings.filter((item) => item.userId !== id)
          db.passwordResets = db.passwordResets.filter((item) => item.userId !== id)
          db.credentials = db.credentials.filter((item) => item.userId !== id)
          db.users = db.users.filter((item) => item.id !== id)
        },
      )
      clearSession()
    },
  }
}
