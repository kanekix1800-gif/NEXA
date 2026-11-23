import { AvatarIllustration } from '@/components/brand/AvatarIllustration'
import { Illustration } from '@/components/brand/Illustration'
import { listIllustrationKeys } from '@/components/brand/illustrations/registry'
import { Logo } from '@/components/brand/Logo'
import type { AvatarSpec } from '@/types'

const AVATARS: AvatarSpec[] = [
  { skin: 'medium', hair: 'short', hairColor: 'black', top: 'green', background: 'mint' },
  { skin: 'light', hair: 'long', hairColor: 'chestnut', top: 'orange', background: 'peach' },
  { skin: 'brown', hair: 'curly', hairColor: 'black', top: 'teal', background: 'sage' },
  { skin: 'dark', hair: 'afro', hairColor: 'black', top: 'terracotta', background: 'sand' },
  {
    skin: 'tan',
    hair: 'bob',
    hairColor: 'brown',
    top: 'navy',
    background: 'sky',
    accessory: 'glasses',
  },
  {
    skin: 'light',
    hair: 'bun',
    hairColor: 'blonde',
    top: 'cream',
    background: 'mint',
    accessory: 'earrings',
  },
  {
    skin: 'medium',
    hair: 'buzz',
    hairColor: 'black',
    top: 'orange',
    background: 'sand',
    facialHair: 'beard',
  },
  { skin: 'tan', hair: 'wavy', hairColor: 'red', top: 'green', background: 'peach' },
  {
    skin: 'light',
    hair: 'bald',
    hairColor: 'gray',
    top: 'navy',
    background: 'sage',
    facialHair: 'mustache',
    accessory: 'glasses',
  },
  {
    skin: 'brown',
    hair: 'short',
    hairColor: 'gray',
    top: 'teal',
    background: 'sky',
    facialHair: 'beard',
  },
]

/**
 * Galeria de desenvolvimento da marca: logotipo, avatares e todas as ilustrações
 * registradas, cada uma em três recortes (4:3, miniatura e faixa). Só existe em `npm run dev`.
 */
export default function BrandGallery() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-5">
      <section className="flex flex-wrap items-center gap-8">
        <Logo size="lg" withTagline />
        <div className="bg-nexa-900 rounded-card p-5">
          <Logo size="md" tone="light" withTagline />
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {AVATARS.map((spec, index) => (
          <div key={index} className="flex items-end gap-1.5">
            <span className="size-16 overflow-hidden rounded-full">
              <AvatarIllustration spec={spec} className="size-full" />
            </span>
            <span className="size-8 overflow-hidden rounded-full">
              <AvatarIllustration spec={spec} className="size-full" />
            </span>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listIllustrationKeys().map((key) => (
          <figure key={key} className="rounded-card bg-surface shadow-card flex flex-col gap-2 p-3">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl">
              <Illustration name={key} />
            </div>
            <div className="flex items-center gap-3">
              <div className="size-[4.5rem] shrink-0 overflow-hidden rounded-2xl">
                <Illustration name={key} />
              </div>
              <div className="aspect-[21/9] flex-1 overflow-hidden rounded-2xl">
                <Illustration name={key} />
              </div>
            </div>
            <figcaption className="text-ink-500 text-xs font-semibold">{key}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  )
}
