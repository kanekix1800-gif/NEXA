import { QueryClient } from '@tanstack/react-query'

import { isAppError } from '@/utils/errors'

/**
 * Cliente de consultas (TanStack Query) do aplicativo.
 *
 * Estratégia de atualização: qualquer gravação nos repositórios dispara
 * `subscribeToDataChanges` (ver `providers.tsx`), que revalida as consultas ativas.
 * Por isso os dados podem ficar "frescos" por mais tempo sem risco de tela desatualizada.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Erros de aplicação (validação, permissão, não encontrado…) não melhoram com nova tentativa.
        retry: (failureCount, error) => !isAppError(error) && failureCount < 1,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()

/** Chaves de consulta compartilhadas entre módulos. */
export const queryKeys = {
  currentUser: ['auth', 'current-user'] as const,
}
