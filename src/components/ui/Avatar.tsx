import { createElement } from 'react'

import { AvatarIllustration } from '@/components/brand/AvatarIllustration'
import { Illustration } from '@/components/brand/Illustration'
import { getColorStyle } from '@/components/icons/colors'
import { getIcon } from '@/components/icons/registry'
import type { AvatarSpec, EntityAvatar } from '@/types'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/text'

const SIZES = {
  xs: 'size-6 text-[0.5625rem]',
  sm: 'size-8 text-[0.6875rem]',
  md: 'size-10 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
  '2xl': 'size-24 text-2xl',
} as const

export type AvatarSize = keyof typeof SIZES

interface AvatarProps {
  /** Nome da pessoa (usado no texto alternativo e nas iniciais). */
  name: string
  photoUrl?: string
  avatar?: AvatarSpec
  size?: AvatarSize
  /** Contorno branco (para sobrepor a imagens ou agrupar). */
  ring?: boolean
  className?: string
}

/** Avatar de pessoa: foto enviada → avatar ilustrado → iniciais. */
export function Avatar({ name, photoUrl, avatar, size = 'md', ring, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'bg-nexa-100 text-nexa-900 relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        SIZES[size],
        ring && 'ring-surface ring-2',
        className,
      )}
      role="img"
      aria-label={name}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : avatar ? (
        <AvatarIllustration spec={avatar} className="size-full" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

interface EntityAvatarProps {
  /** Quem assina o conteúdo: pessoa, instituição ou estabelecimento. */
  entity: EntityAvatar
  name: string
  size?: AvatarSize
  className?: string
}

/** Avatar de quem assina um conteúdo (pessoa, instituição ou estabelecimento). */
export function EntityAvatarView({ entity, name, size = 'md', className }: EntityAvatarProps) {
  if (entity.kind === 'user') {
    return (
      <Avatar
        name={name}
        avatar={entity.avatar}
        photoUrl={entity.photoUrl}
        size={size}
        className={className}
      />
    )
  }
  if (entity.kind === 'institution') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full',
          SIZES[size],
          getColorStyle(entity.color).soft,
          className,
        )}
        role="img"
        aria-label={name}
      >
        {createElement(getIcon(entity.icon), { className: 'size-1/2', 'aria-hidden': true })}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'bg-nexa-100 inline-flex shrink-0 overflow-hidden rounded-full',
        SIZES[size],
        className,
      )}
      role="img"
      aria-label={name}
    >
      {entity.coverUrl ? (
        <img src={entity.coverUrl} alt="" className="size-full object-cover" />
      ) : (
        <Illustration name={entity.illustration ?? 'storefront'} />
      )}
    </span>
  )
}

interface AvatarGroupProps {
  people: Array<{ id: string; name: string; avatar?: AvatarSpec; photoUrl?: string }>
  /** Total real (quando a lista é apenas uma prévia). */
  total?: number
  max?: number
  size?: AvatarSize
}

/** Avatares sobrepostos com contador de excedentes. */
export function AvatarGroup({ people, total, max = 4, size = 'sm' }: AvatarGroupProps) {
  const shown = people.slice(0, max)
  const extra = (total ?? people.length) - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((person, index) => (
        <Avatar
          key={person.id}
          name={person.name}
          avatar={person.avatar}
          photoUrl={person.photoUrl}
          size={size}
          ring
          className={index > 0 ? '-ml-2' : undefined}
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'bg-cream-200 text-ink-700 ring-surface -ml-2 inline-flex items-center justify-center rounded-full font-bold ring-2',
            SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
