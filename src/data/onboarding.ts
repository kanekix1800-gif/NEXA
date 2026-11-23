import type { IllustrationKey } from '@/types'

/** Etapas da apresentação inicial do app. */
export interface OnboardingStep {
  id: string
  title: string
  description: string
  illustration: IllustrationKey
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'comunidade',
    title: 'Uma cidade mais conectada',
    description: 'Participe, encontre soluções, apoie o comércio local e faça a diferença!',
    illustration: 'onb-community',
  },
  {
    id: 'voz',
    title: 'Sua voz transforma',
    description:
      'Registre problemas do bairro, apoie as demandas de outros moradores e acompanhe cada etapa até a solução.',
    illustration: 'onb-voice',
  },
  {
    id: 'comercio',
    title: 'Valorize o comércio local',
    description:
      'Descubra os negócios perto de você e, se você empreende, organize produtos, vendas e finanças com o NEXA Business.',
    illustration: 'onb-commerce',
  },
  {
    id: 'ia',
    title: 'Inteligência para transformar',
    description:
      'A NEXA IA ajuda a descrever demandas, entender o que acontece na sua região e tomar decisões melhores para o seu negócio.',
    illustration: 'onb-ai',
  },
]
