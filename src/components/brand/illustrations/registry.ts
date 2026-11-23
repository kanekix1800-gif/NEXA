import type { IllustrationKey } from '@/types'

import { cityIllustrations } from './city'
import { commerceIllustrations } from './commerce'
import { communityIllustrations } from './community'
import { onboardingIllustrations } from './onboarding'
import type { IllustrationComponent, IllustrationMap } from './types'

/**
 * Biblioteca de ilustrações do NEXA, organizada por grupo:
 *  - `city`        cidade, bairro e praça (abertura, banner da tela inicial)
 *  - `onboarding`  as quatro etapas de apresentação
 *  - `commerce`    fachadas de estabelecimentos e capas de notícias
 *  - `community`   eventos, iniciativas e demandas
 */
export const ILLUSTRATIONS: IllustrationMap = {
  ...cityIllustrations,
  ...onboardingIllustrations,
  ...commerceIllustrations,
  ...communityIllustrations,
}

export function getIllustration(key: IllustrationKey): IllustrationComponent | undefined {
  return ILLUSTRATIONS[key]
}

/** Chaves com ilustração implementada (útil para a galeria de desenvolvimento). */
export function listIllustrationKeys(): IllustrationKey[] {
  return Object.keys(ILLUSTRATIONS) as IllustrationKey[]
}
