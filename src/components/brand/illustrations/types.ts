import type { ComponentType, SVGProps } from 'react'

import type { IllustrationKey } from '@/types'

/**
 * Uma ilustração é um componente que renderiza um `<svg>` COMPLETO com
 * `viewBox="0 0 400 300"` (proporção 4:3) e repassa as props recebidas ao `<svg>`.
 *
 * Como as ilustrações são recortadas em miniaturas quadradas e em faixas largas
 * (`preserveAspectRatio="xMidYMid slice"`), o assunto principal deve ficar dentro
 * da área central segura: x de 70 a 330 e y de 20 a 280.
 */
export type IllustrationComponent = ComponentType<SVGProps<SVGSVGElement>>

export type IllustrationMap = Partial<Record<IllustrationKey, IllustrationComponent>>

/** Dimensões do quadro padrão das ilustrações. */
export const ILLUSTRATION_VIEWBOX = { width: 400, height: 300 } as const
