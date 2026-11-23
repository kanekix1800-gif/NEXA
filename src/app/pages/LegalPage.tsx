import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { Logo } from '@/components/brand/Logo'
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/data/legal'
import { cn } from '@/utils/cn'

import { paths } from '../paths'

/** Termos de uso e aviso de privacidade — acessíveis com ou sem sessão. */
export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const navigate = useNavigate()
  const sections = kind === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const title = kind === 'terms' ? 'Termos de uso' : 'Aviso de privacidade'

  return (
    <div className="pt-safe mx-auto min-h-dvh w-full max-w-2xl px-5 pb-12">
      <header className="flex h-16 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-ink-800 hover:bg-ink-100 -ml-2.5 flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Logo size="sm" />
        <span className="w-11" />
      </header>

      <nav aria-label="Documentos" className="bg-nexa-50 mt-2 inline-flex rounded-full p-1">
        {[
          { to: paths.terms, label: 'Termos de uso', active: kind === 'terms' },
          { to: paths.privacy, label: 'Privacidade', active: kind === 'privacy' },
        ].map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            replace
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-bold',
              tab.active ? 'bg-nexa-900 text-white' : 'text-ink-600',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <main className="mt-5">
        <h1 className="text-ink-900 text-[1.625rem] leading-tight font-extrabold">{title}</h1>
        <p className="text-ink-500 mt-1 text-sm">Versão resumida do protótipo de demonstração.</p>
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="text-ink-900 text-[17px] font-bold">{section.title}</h2>
              <div className="text-ink-700 mt-2 flex flex-col gap-2 text-[15px] leading-relaxed">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
