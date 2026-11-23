import type { ReactNode } from 'react'

import type { AvatarSpec } from '@/types'
import { cn } from '@/utils/cn'

export interface AvatarIllustrationProps {
  spec: AvatarSpec
  /** Tamanho em pixels (largura = altura). Quando ausente, ocupa o contêiner. */
  size?: number
  className?: string
  /** Descrição para leitores de tela. Quando ausente, o avatar é decorativo. */
  title?: string
}

const SKIN = {
  light: '#f6d7bd',
  tan: '#e8b98f',
  medium: '#c98f62',
  brown: '#9a643f',
  dark: '#6b432a',
} as const

const HAIR = {
  black: '#1f1a17',
  brown: '#4a2f21',
  chestnut: '#7a4a2b',
  blonde: '#d9a441',
  gray: '#a9aba6',
  red: '#a8482b',
} as const

const TOP = {
  green: '#0b6048',
  orange: '#f2a333',
  cream: '#f3ebdb',
  teal: '#1f7078',
  terracotta: '#b5472f',
  navy: '#23395b',
} as const

const BACKGROUND = {
  mint: '#ddebdd',
  sand: '#f3ebdb',
  peach: '#fde9c4',
  sage: '#c5dfcc',
  sky: '#e4f0f6',
} as const

/** Franja/topo do cabelo, desenhado sobre a cabeça. */
const CAP = 'M30 41c-1-14 7-23 18-23s19 9 18 23c-3-8-9-12-18-12s-15 4-18 12z'

function hairBehind(style: AvatarSpec['hair'], color: string): ReactNode {
  switch (style) {
    case 'afro':
      return <circle cx="48" cy="35" r="26" fill={color} />
    case 'long':
      return (
        <path d="M26 44c0-17 9-27 22-27s22 10 22 27v24c0 4-3 6-6 6H32c-3 0-6-2-6-6z" fill={color} />
      )
    case 'bob':
      return (
        <path d="M27 42c0-16 9-25 21-25s21 9 21 25v12c0 4-3 6-6 6H33c-3 0-6-2-6-6z" fill={color} />
      )
    case 'wavy':
      return (
        <path
          d="M26 43c0-16 9-26 22-26s22 10 22 26v14c0 4-2 6-5 5s-4 2-7 2-4-2-7-2-5 2-8 2-4-3-7-2-5 0-6-3c-2-4-4-10-4-16z"
          fill={color}
        />
      )
    case 'bun':
      return <circle cx="48" cy="15" r="9" fill={color} />
    default:
      return null
  }
}

function hairFront(style: AvatarSpec['hair'], color: string): ReactNode {
  switch (style) {
    case 'bald':
      return null
    case 'buzz':
      return (
        <path
          d="M31 39c0-12 7-19 17-19s17 7 17 19c-4-6-9-9-17-9s-13 3-17 9z"
          fill={color}
          opacity="0.85"
        />
      )
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="33" cy="31" r="7" />
          <circle cx="42" cy="25" r="8" />
          <circle cx="53" cy="24" r="8" />
          <circle cx="63" cy="30" r="7" />
          <circle cx="30" cy="39" r="5" />
          <circle cx="66" cy="39" r="5" />
        </g>
      )
    case 'afro':
      return <path d="M29 40c1-12 8-19 19-19s18 7 19 19c-5-6-11-8-19-8s-14 2-19 8z" fill={color} />
    case 'wavy':
      return (
        <path
          d="M30 42c-1-14 7-24 18-24 12 0 20 9 18 24-2-8-6-12-12-13-8 4-18 4-24 13z"
          fill={color}
        />
      )
    default:
      return <path d={CAP} fill={color} />
  }
}

/**
 * Avatar ilustrado gerado a partir de `AvatarSpec` — pessoas da base demonstrativa
 * nunca usam fotos reais. Fica bem de 24 px a 96 px; o contêiner faz o recorte circular.
 */
export function AvatarIllustration({ spec, size, className, title }: AvatarIllustrationProps) {
  const skin = SKIN[spec.skin]
  const hair = HAIR[spec.hairColor]
  const feature = spec.skin === 'dark' || spec.skin === 'brown' ? '#22140d' : '#3a2a22'

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={cn('block shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="96" height="96" fill={BACKGROUND[spec.background]} />
      {hairBehind(spec.hair, hair)}

      {/* Ombros e pescoço */}
      <path d="M12 96c0-17 15-27 36-27s36 10 36 27z" fill={TOP[spec.top]} />
      <rect x="41" y="55" width="14" height="17" rx="6" fill={skin} />
      <path d="M41 66c2 4 12 4 14 0v3c-2 5-12 5-14 0z" fill="#000" opacity="0.1" />

      {/* Cabeça */}
      <circle cx="30.5" cy="44" r="4" fill={skin} />
      <circle cx="65.5" cy="44" r="4" fill={skin} />
      <ellipse cx="48" cy="42" rx="17" ry="19" fill={skin} />

      {spec.facialHair === 'beard' && (
        <path
          d="M31.5 45c1 13 8 19 16.500 19s15.500-6 16.500-19c-3 7-8 10-16.500 10s-13.500-3-16.500-10z"
          fill={hair}
          opacity="0.92"
        />
      )}

      {/* Rosto */}
      <circle cx="41" cy="43" r="2.1" fill={feature} />
      <circle cx="55" cy="43" r="2.1" fill={feature} />
      <path
        d="M42 51c2 3.200 10 3.200 12 0"
        stroke={feature}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="36" cy="49" r="3" fill="#e8674f" opacity="0.18" />
      <circle cx="60" cy="49" r="3" fill="#e8674f" opacity="0.18" />

      {spec.facialHair === 'mustache' && (
        <path
          d="M40 48.500c3-2.500 6-2.500 8-.500 2-2 5-2 8 .500-2.500 2.500-6 2.500-8 1-2 1.500-5.500 1.500-8-1z"
          fill={hair}
        />
      )}

      {hairFront(spec.hair, hair)}

      {spec.accessory === 'glasses' && (
        <g stroke={feature} strokeWidth="1.800" fill="none">
          <circle cx="41" cy="43" r="5.500" />
          <circle cx="55" cy="43" r="5.500" />
          <path d="M46.500 43h3M35.500 42l-4-1M60.500 42l4-1" strokeLinecap="round" />
        </g>
      )}
      {spec.accessory === 'earrings' && (
        <g fill="#f2a333">
          <circle cx="30" cy="50" r="2.200" />
          <circle cx="66" cy="50" r="2.200" />
        </g>
      )}
    </svg>
  )
}
