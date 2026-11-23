/**
 * Erros de aplicação. Toda falha esperada (validação, permissão, estoque…) é lançada como
 * `AppError`, para que a interface possa exibir mensagens claras em português.
 */

export type AppErrorCode =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'insufficient_stock'
  | 'storage'
  | 'network'
  | 'unavailable'
  | 'unknown'

export interface AppErrorOptions {
  /** Erros por campo (chave = nome do campo no formulário). */
  fieldErrors?: Record<string, string>
  details?: unknown
  cause?: unknown
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: unknown

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.fieldErrors = options.fieldErrors
    this.details = options.details
  }
}

/** Dados inválidos informados pelo usuário. */
export function validationError(message: string, fieldErrors?: Record<string, string>): AppError {
  return new AppError('validation', message, { fieldErrors })
}

/** É necessário estar autenticado. */
export function unauthenticatedError(message = 'Entre na sua conta para continuar.'): AppError {
  return new AppError('unauthenticated', message)
}

/** O perfil atual não tem permissão para a ação. */
export function forbiddenError(
  message = 'Seu perfil não tem permissão para realizar esta ação.',
): AppError {
  return new AppError('forbidden', message)
}

export function notFoundError(message = 'Não encontramos o que você procurava.'): AppError {
  return new AppError('not_found', message)
}

export function conflictError(message: string): AppError {
  return new AppError('conflict', message)
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function hasErrorCode(error: unknown, code: AppErrorCode): boolean {
  return isAppError(error) && error.code === code
}

const FALLBACK_MESSAGE = 'Algo não saiu como esperado. Tente novamente.'

/** Converte qualquer erro em uma mensagem segura para exibir ao usuário. */
export function toUserMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (isAppError(error)) return error.message
  return fallback
}
