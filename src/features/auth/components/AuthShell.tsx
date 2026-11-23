import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { Logo } from '@/components/brand/Logo'
import { BrandBackdrop } from '@/components/brand/OrganicShapes'
import { DemoBadge } from '@/components/ui'
import { config } from '@/config'

interface AuthShellProps {
  title: string
  subtitle?: string
  /** Rota do botão voltar (padrão: tela de abertura). */
  backTo?: string
  children: ReactNode
  /** Conteúdo abaixo do cartão (links auxiliares). */
  footer?: ReactNode
}

/** Moldura das telas de conta (entrar, cadastro, recuperar senha). */
export function AuthShell({
  title,
  subtitle,
  backTo = paths.welcome,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative min-h-dvh">
      <BrandBackdrop />
      <div className="pt-safe relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
        <header className="flex h-16 items-center justify-between">
          <Link
            to={backTo}
            aria-label="Voltar"
            className="text-ink-800 hover:bg-ink-100 -ml-2.5 flex size-11 items-center justify-center rounded-full"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo size="sm" />
          <span className="flex min-w-11 justify-end">
            {config.isDemoMode && <DemoBadge label="Demo" />}
          </span>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mt-4 flex flex-1 flex-col"
        >
          <h1 className="text-ink-900 text-[1.625rem] leading-tight font-extrabold">{title}</h1>
          {subtitle && <p className="text-ink-500 mt-1.5 text-[15px]">{subtitle}</p>}
          <div className="mt-6 flex flex-col gap-5">{children}</div>
          {footer && <div className="mt-auto pt-8 text-center text-sm">{footer}</div>}
        </motion.main>
      </div>
    </div>
  )
}
