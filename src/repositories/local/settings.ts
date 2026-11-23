import type { ConsentState, UserSettings } from '@/types'
import { nowISO } from '@/utils/clock'
import { validationError } from '@/utils/errors'

import type { SettingsRepository } from '../contracts'
import { defaultSettings, requireUser, type LocalContext } from './context'

const CONSENTS: ReadonlyArray<ConsentState> = ['unset', 'granted', 'denied']
const MOTIONS: ReadonlyArray<UserSettings['motion']> = ['system', 'reduced', 'full']

export function createSettingsRepository(ctx: LocalContext): SettingsRepository {
  return {
    async get() {
      await ctx.latency(0.5)
      // Leitura pura na imensa maioria das vezes; só grava quando as preferências ainda não existem.
      const existing = ctx.store.read((db) => {
        const user = requireUser(db)
        return db.userSettings.find((item) => item.userId === user.id) ?? null
      })
      if (existing) return existing
      return ctx.store.write(['userSettings'], (db) => {
        const user = requireUser(db)
        let settings = db.userSettings.find((item) => item.userId === user.id)
        if (!settings) {
          settings = defaultSettings(user.id)
          db.userSettings.push(settings)
        }
        return settings
      })
    },

    async update(patch) {
      await ctx.latency()
      return ctx.store.write(['userSettings'], (db) => {
        const user = requireUser(db)
        let settings = db.userSettings.find((item) => item.userId === user.id)
        if (!settings) {
          settings = defaultSettings(user.id)
          db.userSettings.push(settings)
        }
        if (patch.locationConsent !== undefined) {
          if (!CONSENTS.includes(patch.locationConsent)) {
            throw validationError('Valor de consentimento inválido.')
          }
          settings.locationConsent = patch.locationConsent
        }
        if (patch.motion !== undefined) {
          if (!MOTIONS.includes(patch.motion)) {
            throw validationError('Preferência de movimento inválida.')
          }
          settings.motion = patch.motion
        }
        if (patch.notifications) {
          const merged = { ...settings.notifications }
          for (const [key, value] of Object.entries(patch.notifications)) {
            if (!(key in merged)) throw validationError('Categoria de notificação inválida.')
            if (typeof value !== 'boolean') {
              throw validationError('Preferência de notificação inválida.')
            }
            merged[key as keyof typeof merged] = value
          }
          settings.notifications = merged
        }
        settings.updatedAt = nowISO()
        return settings
      })
    },
  }
}
