import { AppError } from '@/utils/errors'

/**
 * Cria um repositório cujos métodos lançam "não implementado".
 * Usado apenas pelos esqueletos provisórios durante a construção do projeto.
 */
export function notImplemented<T extends object>(repository: string): T {
  return new Proxy({} as T, {
    get(_target, method) {
      return async () => {
        throw new AppError(
          'unavailable',
          `Repositório local ainda não implementado: ${repository}.${String(method)}`,
        )
      }
    },
  })
}
