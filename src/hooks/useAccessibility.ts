import { useSyncExternalStore } from 'react'

import {
  getPreferences,
  subscribeToPreferences,
  type AccessibilityPreferences,
} from '@/services/accessibility/preferences'

/** Preferências de acessibilidade do aparelho, sempre atualizadas. */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  return useSyncExternalStore(subscribeToPreferences, getPreferences, getPreferences)
}
