import { Accessibility } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { Illustration } from '@/components/brand/Illustration'
import { Logo } from '@/components/brand/Logo'
import { BrandBackdrop, WaveEdge } from '@/components/brand/OrganicShapes'
import { ShareAppButton } from '@/components/domain/ShareAppDialog'
import { ButtonLink } from '@/components/ui'
import { config } from '@/config'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/** Tela de abertura: marca, slogan, cidade ilustrada e os primeiros passos. */
export default function WelcomePage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <BrandBackdrop />
      <main className="pt-safe relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <div className="flex justify-end px-4 pt-3">
          <Link
            to={paths.accessibility}
            className="text-nexa-900 bg-surface/80 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-bold"
          >
            <Accessibility className="size-5" aria-hidden />
            Acessibilidade
          </Link>
        </div>
        <motion.div
          {...rise(0)}
          className="flex flex-1 flex-col items-center justify-center px-6 pt-4"
        >
          <Logo size="xl" layout="stacked" withTagline />
        </motion.div>

        <motion.div {...rise(0.15)} className="relative mt-6">
          <div className="aspect-[4/3] w-full">
            <Illustration
              name="city-day"
              title="Ilustração de uma cidade com prédios, casas e árvores"
            />
          </div>
          <WaveEdge className="absolute inset-x-0 bottom-0" />
        </motion.div>

        <motion.div
          {...rise(0.3)}
          className="flex flex-col items-center gap-2 px-6 pt-2 pb-[calc(1.5rem+var(--nexa-safe-bottom))]"
        >
          <ButtonLink to={paths.onboarding} size="lg" fullWidth>
            Começar
          </ButtonLink>
          <Link
            to={paths.login}
            className="text-nexa-900 flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-bold"
          >
            Entrar
          </Link>
          <ShareAppButton />
          {config.isDemoMode && (
            <p className="text-ink-500 text-center text-xs">
              Ambiente de demonstração · todos os dados são fictícios
            </p>
          )}
        </motion.div>
      </main>
    </div>
  )
}
