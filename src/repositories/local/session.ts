import type { Session } from '@/types'

/**
 * Sessão local do modo demonstração.
 * Guardamos apenas o identificador do usuário e o início da sessão (nunca senhas).
 */

const SESSION_KEY = 'nexa:session'

let memorySession: Session | null = null

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readSession(): Session | null {
  const store = storage()
  if (!store) return memorySession
  try {
    const raw = store.getItem(SESSION_KEY)
    if (!raw) return memorySession
    const parsed = JSON.parse(raw) as Partial<Session> | null
    if (parsed && typeof parsed.userId === 'string' && typeof parsed.startedAt === 'string') {
      return { userId: parsed.userId, startedAt: parsed.startedAt }
    }
    return null
  } catch {
    return memorySession
  }
}

export function writeSession(session: Session): void {
  memorySession = session
  try {
    storage()?.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Sem acesso ao armazenamento: a sessão vale apenas enquanto a aba estiver aberta.
  }
}

export function clearSession(): void {
  memorySession = null
  try {
    storage()?.removeItem(SESSION_KEY)
  } catch {
    // Nada a fazer.
  }
}
