import { ChevronDown, Sparkles } from 'lucide-react'

import { paths } from '@/app/paths'
import { ShareAppButton } from '@/components/domain/ShareAppDialog'
import { ButtonLink, Callout, Page, PageHeader, SectionHeader } from '@/components/ui'
import { HELP_TOPICS } from '@/data/help'

/** Ajuda e suporte: perguntas frequentes e atalho para a NEXA IA. */
export default function HelpPage() {
  return (
    <>
      <PageHeader title="Ajuda e Suporte" variant="stack" backTo={paths.profile} />
      <Page width="narrow">
        <div className="flex flex-col gap-5">
          <div className="bg-nexa-900 rounded-card flex items-center gap-4 p-5 text-white">
            <span className="bg-white/12 flex size-12 shrink-0 items-center justify-center rounded-2xl">
              <Sparkles className="text-sun-300 size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold">Pergunte à NEXA IA</p>
              <p className="text-[13px] text-white/75">
                Ela explica como usar cada recurso do app.
              </p>
            </div>
            <ButtonLink to={paths.assistantAsk('Como funciona o NEXA?')} variant="accent" size="sm">
              Abrir
            </ButtonLink>
          </div>

          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Perguntas frequentes" />
            {HELP_TOPICS.map((topic) => (
              <details key={topic.id} className="bg-surface rounded-card shadow-card group">
                <summary className="text-ink-900 flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                  {topic.question}
                  <ChevronDown
                    className="text-ink-400 size-5 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="text-ink-600 flex flex-col gap-2 px-4 pb-4 text-sm leading-relaxed">
                  {topic.answer.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </section>

          <section className="bg-surface rounded-card shadow-card flex flex-col items-start gap-1 p-4">
            <h2 className="text-ink-900 text-[15px] font-bold">Mostrar o NEXA para alguém</h2>
            <p className="text-ink-600 text-sm">
              Gere um QR Code para abrir o aplicativo em outro celular.
            </p>
            <ShareAppButton className="-ml-3" />
          </section>

          <Callout tone="demo" title="Suporte no protótipo">
            Este é um ambiente de demonstração e não há atendimento humano. Em uma versão em
            produção, este espaço traria os canais oficiais de suporte.
          </Callout>
        </div>
      </Page>
    </>
  )
}
