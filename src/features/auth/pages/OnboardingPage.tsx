import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import { Illustration } from '@/components/brand/Illustration'
import { Button, ButtonLink, ProgressDots } from '@/components/ui'
import { ONBOARDING_STEPS } from '@/data/onboarding'

/** Apresentação inicial em quatro etapas, com progresso, "Próximo" e "Pular". */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const step = ONBOARDING_STEPS[index]
  const last = index === ONBOARDING_STEPS.length - 1
  if (!step) return null

  return (
    <div className="bg-nexa-50 min-h-dvh">
      <div className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="flex h-14 items-center justify-between px-5">
          <span className="text-ink-500 text-xs font-semibold tabular-nums" aria-hidden>
            {index + 1} / {ONBOARDING_STEPS.length}
          </span>
          <Link
            to={paths.login}
            className="text-nexa-900 -mr-2 flex h-11 items-center rounded-full px-3 text-sm font-bold"
          >
            Pular
          </Link>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.illustration}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="aspect-[4/3] w-full overflow-hidden rounded-[2rem]"
            >
              <Illustration name={step.illustration} />
            </motion.div>
          </AnimatePresence>
        </div>

        <section
          className="bg-surface rounded-t-[2.25rem] px-6 pt-8 pb-[calc(1.5rem+var(--nexa-safe-bottom))] shadow-[0_-12px_32px_-18px_rgb(16_40_32/0.18)]"
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="min-h-32 text-center"
            >
              <h1 className="text-ink-900 text-2xl leading-tight font-extrabold">{step.title}</h1>
              <p className="text-ink-500 mx-auto mt-3 max-w-xs text-[15px] leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <ProgressDots
            total={ONBOARDING_STEPS.length}
            current={index}
            className="mt-5 justify-center"
          />

          <div className="mt-6 flex flex-col gap-2">
            {last ? (
              <>
                <ButtonLink to={paths.signUp} size="lg" fullWidth>
                  Criar minha conta
                </ButtonLink>
                <ButtonLink to={paths.login} size="lg" variant="ghost" fullWidth>
                  Já tenho conta
                </ButtonLink>
              </>
            ) : (
              <>
                <Button size="lg" fullWidth onClick={() => setIndex((current) => current + 1)}>
                  Próximo
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  fullWidth
                  onClick={() =>
                    index === 0 ? navigate(paths.welcome) : setIndex((current) => current - 1)
                  }
                >
                  Voltar
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
