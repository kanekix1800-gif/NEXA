import type { Credential, ISODate } from '@/types'

import { DEMO_ACCOUNTS } from './demoAccounts'

/**
 * Credenciais das contas demonstrativas.
 * São derivações PBKDF2-SHA256 (120.000 iterações, sal individual) da senha pública
 * de demonstração — geradas com `hashPassword` de `src/utils/password.ts`.
 * A senha em texto puro nunca é gravada no banco local.
 */
const DERIVED: Array<Pick<Credential, 'userId' | 'salt' | 'hash'>> = [
  {
    userId: DEMO_ACCOUNTS.resident.userId,
    salt: 'yU6fGSN10zruZC6wCsNrfQ==',
    hash: 'HUCTH4qxpthtnKZzrpQGtyXtaAemjNp4zoWmyAUd2f8=',
  },
  {
    userId: DEMO_ACCOUNTS.merchant.userId,
    salt: 'C0nzUWhIyERL0JZlPFiMLA==',
    hash: 'h25g7wOAaxJ59OWDmrd1fYJ4Ta41n51JIf1S45qtl5I=',
  },
  {
    userId: DEMO_ACCOUNTS.institution.userId,
    salt: 'IXZuBNu02UI9260XOkT2Kw==',
    hash: 'GjpcQN9O4fnmwp4ESd6rAyv5O4u4+noqoaUyoZWmN1o=',
  },
  {
    userId: DEMO_ACCOUNTS.admin.userId,
    salt: '5acpDxJHKxU9K+dXAtAy+Q==',
    hash: 'ux23vDq3ubUqtip+Ub0xgku6u4xTbvL6T29JOlC8doA=',
  },
]

/** Monta os registros de credencial das contas demonstrativas. */
export function buildDemoCredentials(updatedAt: ISODate): Credential[] {
  return DERIVED.map((entry) => ({
    ...entry,
    algorithm: 'PBKDF2-SHA256',
    iterations: 120_000,
    updatedAt,
  }))
}
