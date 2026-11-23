import { createElement, type SVGProps } from 'react'

import type { IllustrationKey } from '@/types'
import { cn } from '@/utils/cn'

import { getIllustration } from './illustrations/registry'

interface IllustrationProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** Chave da ilustração na biblioteca NEXA. */
  name: IllustrationKey
  /** Descrição para leitores de tela. Quando ausente, a ilustração é tratada como decorativa. */
  title?: string
}

/**
 * Renderiza uma ilustração da biblioteca NEXA preenchendo o contêiner
 * (recorte centralizado, como `object-fit: cover`).
 *
 * Exemplo: `<Illustration name="bakery" className="size-20 rounded-2xl" />`
 */
export function Illustration({ name, title, className, ...props }: IllustrationProps) {
  const Component = getIllustration(name)
  const a11y = title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true } as const)

  if (!Component) {
    return <IllustrationFallback className={className} {...a11y} {...props} />
  }

  // `createElement` (em vez de JSX) porque o componente vem do registro de ilustrações:
  // é uma referência estável definida fora da renderização, apenas escolhida pela chave.
  return createElement(Component, {
    preserveAspectRatio: 'xMidYMid slice',
    className: cn('block h-full w-full', className),
    ...a11y,
    ...props,
  })
}

/** Quadro neutro usado quando a chave ainda não possui ilustração. */
function IllustrationFallback({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn('block h-full w-full', className)}
      {...props}
    >
      <rect width="400" height="300" fill="#ddebdd" />
      <path d="M0 230 C 90 190, 180 250, 270 215 S 360 190, 400 215 V300 H0 Z" fill="#c5dfcc" />
      <circle cx="310" cy="80" r="34" fill="#fad590" />
      <g transform="translate(168 108)" stroke="#0b6048" strokeWidth="5.5" fill="none">
        <line x1="14" y1="44.5" x2="14" y2="19.5" />
        <line x1="18.47" y1="17.72" x2="48.6" y2="49.5" />
        <line x1="50" y1="49" x2="50" y2="19.5" />
        <circle cx="14" cy="13" r="6.5" strokeWidth="4.5" />
        <circle cx="14" cy="51" r="6.5" strokeWidth="4.5" />
        <circle cx="50" cy="13" r="6.5" strokeWidth="4.5" />
        <circle cx="50" cy="51" r="8.75" fill="#f2a333" stroke="none" />
      </g>
    </svg>
  )
}
