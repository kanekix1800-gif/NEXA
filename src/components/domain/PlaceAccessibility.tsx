import { Accessibility } from 'lucide-react'
import { useId } from 'react'

import { Badge } from '@/components/ui'
import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import type { MobilityHighlight } from '@/services/accessibility/preferences'
import {
  ACCESSIBILITY_FEATURE_LABEL,
  ACCESSIBILITY_FEATURES,
  type AccessibilityFeature,
} from '@/types'

/** Recursos que garantem a entrada de quem não pode subir degraus. */
export const STEP_FREE_FEATURES: AccessibilityFeature[] = ['step_free', 'ramp', 'elevator']

/** Recursos que interessam a quem pediu cada destaque em Acessibilidade. */
const HIGHLIGHTED_BY: Record<MobilityHighlight, AccessibilityFeature[]> = {
  step_free: [...STEP_FREE_FEATURES, 'wide_doors', 'accessible_restroom', 'accessible_parking'],
  accessible_transit: [],
  audio_tactile: ['tactile_floor', 'braille', 'audio_description'],
  libras: ['libras'],
}

interface PlaceAccessibilityProps {
  /** `undefined` = o local ainda não informou; lista vazia = informou que não tem. */
  features: AccessibilityFeature[] | undefined
  /** Como chamar o local nas frases (ex.: "Este estabelecimento", "Este evento"). */
  subject: string
}

/**
 * Seção "Acessibilidade" das telas de detalhes: lista os recursos informados pelo
 * local e destaca os que a pessoa pediu para ver em Acessibilidade → Pela cidade.
 */
export function PlaceAccessibility({ features, subject }: PlaceAccessibilityProps) {
  const id = useId()
  const { highlights } = useAccessibilityPreferences()
  const wanted = new Set(highlights.flatMap((highlight) => HIGHLIGHTED_BY[highlight]))
  const list = ACCESSIBILITY_FEATURES.filter((feature) => (features ?? []).includes(feature))

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2 id={id} className="text-ink-900 flex items-center gap-2 text-[1.0625rem] font-bold">
        <Accessibility className="text-nexa-800 size-5" aria-hidden />
        Acessibilidade
      </h2>
      {list.length === 0 ? (
        <p className="text-ink-600 text-sm">
          {subject} ainda não informou recursos de acessibilidade.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {list.map((feature) => (
            <li key={feature}>
              <Badge
                color={wanted.has(feature) ? 'green' : 'neutral'}
                variant={wanted.has(feature) ? 'solid' : 'soft'}
                size="md"
              >
                {ACCESSIBILITY_FEATURE_LABEL[feature]}
                {wanted.has(feature) && <span className="sr-only"> (destaque para você)</span>}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-500 text-xs">
        Informações declaradas pelo próprio local, sem vistoria do NEXA.
      </p>
    </section>
  )
}

interface AccessibilityFeaturesFieldProps {
  value: AccessibilityFeature[]
  onChange: (value: AccessibilityFeature[]) => void
  /** Pergunta exibida como título (ex.: "O que o seu estabelecimento oferece?"). */
  legend: string
  error?: string | null
}

/** Grupo de caixas de seleção para informar os recursos de acessibilidade de um local. */
export function AccessibilityFeaturesField({
  value,
  onChange,
  legend,
  error,
}: AccessibilityFeaturesFieldProps) {
  const toggle = (feature: AccessibilityFeature, checked: boolean) => {
    onChange(
      ACCESSIBILITY_FEATURES.filter((item) => (item === feature ? checked : value.includes(item))),
    )
  }
  return (
    <fieldset className="bg-surface rounded-card shadow-card p-4">
      <legend className="text-ink-800 float-left mb-1 text-[0.8125rem] font-bold">
        Acessibilidade (opcional)
      </legend>
      <p className="text-ink-600 clear-both mb-3 text-xs">{legend}</p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {ACCESSIBILITY_FEATURES.map((feature) => (
          <label key={feature} className="text-ink-800 flex min-h-9 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value.includes(feature)}
              onChange={(event) => toggle(feature, event.target.checked)}
              className="accent-nexa-800 size-5 shrink-0"
            />
            {ACCESSIBILITY_FEATURE_LABEL[feature]}
          </label>
        ))}
      </div>
      {error && <p className="text-danger-600 mt-2 text-xs font-semibold">{error}</p>}
    </fieldset>
  )
}
