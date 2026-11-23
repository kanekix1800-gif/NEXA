import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import { CitySilhouette } from '@/components/brand/OrganicShapes'
import { LocationPicker } from '@/components/map'
import {
  Button,
  ButtonLink,
  Callout,
  Field,
  IconTile,
  ImagePicker,
  Input,
  Page,
  PageHeader,
  ProgressDots,
  RadioCardGroup,
  SegmentedControl,
  SkeletonList,
  StickyActionBar,
  Switch,
  Textarea,
} from '@/components/ui'
import { config } from '@/config'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { suggestForDemand } from '@/services/ai/demandAssistant'
import {
  URGENCY_LABEL,
  type DemandAISuggestion,
  type DemandView,
  type GeoPoint,
  type Urgency,
} from '@/types'
import { isAppError } from '@/utils/errors'

const URGENCY_OPTIONS: Array<{ value: Urgency; label: string }> = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

/** Registro de demanda em três etapas: categoria, relato e local. */
export default function NewDemandPage() {
  const navigate = useNavigate()
  const categories = useQuery({
    queryKey: ['reference', 'categories', 'demand'],
    queryFn: () => repos.reference.listCategories('demand'),
  })
  const institutions = useQuery({
    queryKey: ['institutions', 'directory'],
    queryFn: () => repos.institutions.list(),
  })
  const openDemands = useQuery({
    queryKey: ['demands', { status: 'open' }],
    queryFn: () => repos.demands.list({ status: 'open' }),
  })

  const [step, setStep] = useState(0)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [location, setLocation] = useState<GeoPoint | null>(null)
  const [addressHint, setAddressHint] = useState('')
  const [shareOnFeed, setShareOnFeed] = useState(true)
  const [suggestion, setSuggestion] = useState<DemandAISuggestion | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<DemandView | null>(null)

  const category = categories.data?.find((item) => item.id === categoryId)
  const limits = config.limits

  const analyze = () => {
    setSuggestion(
      suggestForDemand(
        { title, description, categoryId: categoryId ?? undefined, location },
        { categories: categories.data ?? [], openDemands: openDemands.data ?? [] },
      ),
    )
  }

  const submit = useAction(
    () =>
      repos.demands.create({
        categoryId: categoryId ?? '',
        title,
        description,
        photos,
        location,
        addressHint,
        urgency,
        shareOnFeed,
        aiSuggestion: suggestion ?? undefined,
      }),
    {
      onSuccess: setCreated,
      onError: (error) => {
        if (isAppError(error) && error.fieldErrors) {
          setErrors(error.fieldErrors)
          // Volta para a etapa que contém o campo com erro.
          if (error.fieldErrors.title || error.fieldErrors.description) setStep(1)
        }
      },
    },
  )

  // ── Confirmação ──
  if (created) {
    return (
      <Page bottomNav={false} width="narrow" className="pt-safe">
        <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 text-center">
          <span className="bg-nexa-100 text-nexa-800 flex size-20 items-center justify-center rounded-full">
            <CircleCheck className="size-10" aria-hidden />
          </span>
          <h1 className="text-ink-900 text-2xl font-extrabold">Demanda registrada!</h1>
          <p className="text-ink-600 text-[15px]">
            Protocolo <strong className="text-ink-900">{created.protocol}</strong>. Você pode
            acompanhar cada atualização e a comunidade já pode apoiar o seu pedido.
          </p>
          {created.institution && (
            <Callout tone="demo" className="text-left">
              Encaminhamento sugerido para <strong>{created.institution.name}</strong>. Neste
              protótipo o encaminhamento é simulado — não há envio oficial ao órgão.
            </Callout>
          )}
          <div className="mt-2 flex w-full flex-col gap-2">
            <ButtonLink to={paths.demand(created.id)} size="lg" fullWidth replace>
              Acompanhar demanda
            </ButtonLink>
            {created.location && (
              <ButtonLink
                to={paths.mapFocus('demands', created.id)}
                size="lg"
                variant="secondary"
                fullWidth
                replace
              >
                Ver no mapa
              </ButtonLink>
            )}
            <ButtonLink to={paths.demands} variant="ghost" fullWidth replace>
              Ver todas as demandas
            </ButtonLink>
          </div>
        </div>
      </Page>
    )
  }

  const duplicateDemands = (suggestion?.duplicateIds ?? [])
    .map((id) => openDemands.data?.find((demand) => demand.id === id))
    .filter((demand): demand is DemandView => Boolean(demand))
  const suggestedCategory = categories.data?.find((item) => item.id === suggestion?.categoryId)
  const suggestedInstitutions = (suggestion?.institutionIds ?? [])
    .map((id) => institutions.data?.find((institution) => institution.id === id)?.name)
    .filter(Boolean)

  const canContinue =
    step === 0 ? categoryId !== null : title.trim().length >= 5 && description.trim().length >= 10

  return (
    <>
      <PageHeader
        title="Nova Demanda"
        variant="stack"
        backTo={paths.demands}
        onBack={step > 0 ? () => setStep(step - 1) : undefined}
        actions={<ProgressDots total={3} current={step} />}
      />
      <Page bottomNav={false} width="narrow" className="pb-32">
        {step === 0 && (
          <div className="flex flex-col gap-5 pt-2">
            <h2 className="text-ink-900 text-xl leading-tight font-extrabold">
              Qual problema você deseja reportar?
            </h2>
            {categories.data ? (
              <RadioCardGroup
                label="Categoria da demanda"
                value={categoryId}
                onChange={setCategoryId}
                options={categories.data.map((item) => ({
                  value: item.id,
                  title: item.name,
                  icon: <IconTile icon={item.icon} color={item.color} size="lg" />,
                }))}
              />
            ) : (
              <SkeletonList count={4} />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5 pt-2">
            <div className="flex items-center gap-3">
              {category && <IconTile icon={category.icon} color={category.color} />}
              <div>
                <h2 className="text-ink-900 text-xl leading-tight font-extrabold">
                  Conte o que está acontecendo
                </h2>
                <p className="text-ink-500 text-[13px]">{category?.name}</p>
              </div>
            </div>
            <Field
              label="Título"
              error={errors.title}
              counter={`${title.length}/${limits.demandTitleMaxLength}`}
              required
            >
              <Input
                value={title}
                maxLength={limits.demandTitleMaxLength}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Buraco grande na esquina da praça"
              />
            </Field>
            <Field
              label="Descrição"
              error={errors.description}
              hint="Explique o problema e desde quando acontece. Não inclua dados pessoais."
              counter={`${description.length}/${limits.demandDescriptionMaxLength}`}
              required
            >
              <Textarea
                rows={5}
                value={description}
                maxLength={limits.demandDescriptionMaxLength}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva o que você observou…"
              />
            </Field>
            <div>
              <p className="text-ink-800 mb-2 text-[13px] font-bold">Fotos (opcional)</p>
              <ImagePicker value={photos} onChange={setPhotos} max={limits.demandMaxPhotos} />
            </div>
            <div>
              <p className="text-ink-800 mb-2 text-[13px] font-bold">Grau de urgência sugerido</p>
              <SegmentedControl
                ariaLabel="Grau de urgência"
                options={URGENCY_OPTIONS}
                value={urgency}
                onChange={setUrgency}
                className="w-full"
              />
            </div>

            {suggestion ? (
              <Callout tone="ai" title="Sugestões da NEXA IA">
                <ul className="mt-1 flex flex-col gap-2">
                  {suggestedCategory && suggestedCategory.id !== categoryId && (
                    <li>
                      Parece ser <strong>{suggestedCategory.name}</strong>.{' '}
                      <button
                        type="button"
                        className="text-nexa-800 font-bold underline underline-offset-2"
                        onClick={() => setCategoryId(suggestedCategory.id)}
                      >
                        Trocar categoria
                      </button>
                    </li>
                  )}
                  {suggestion.summary && <li>Resumo: “{suggestion.summary}”</li>}
                  {suggestion.urgency && (
                    <li>
                      Prioridade sugerida: <strong>{URGENCY_LABEL[suggestion.urgency]}</strong>.{' '}
                      {suggestion.urgencyReasons?.[0]}{' '}
                      {suggestion.urgency !== urgency && (
                        <button
                          type="button"
                          className="text-nexa-800 font-bold underline underline-offset-2"
                          onClick={() => setUrgency(suggestion.urgency!)}
                        >
                          Usar esta urgência
                        </button>
                      )}
                    </li>
                  )}
                  {suggestedInstitutions.length > 0 && (
                    <li>Possível órgão responsável: {suggestedInstitutions.join(', ')}.</li>
                  )}
                  {duplicateDemands.length > 0 && (
                    <li>
                      Demandas parecidas já registradas — você pode apoiá-las:
                      <ul className="mt-1 flex flex-col gap-1">
                        {duplicateDemands.map((demand) => (
                          <li key={demand.id}>
                            <Link
                              to={paths.demand(demand.id)}
                              className="text-nexa-800 font-bold underline underline-offset-2"
                            >
                              {demand.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-xs opacity-80">
                  Modo demonstração: sugestões geradas por regras locais. A decisão é sempre sua.
                </p>
              </Callout>
            ) : (
              <Button
                variant="secondary"
                leftIcon={<Sparkles className="text-sun-600 size-[18px]" />}
                disabled={description.trim().length < 10}
                onClick={analyze}
              >
                Pedir sugestões à NEXA IA
              </Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5 pt-2">
            <h2 className="text-ink-900 text-xl leading-tight font-extrabold">
              Onde fica o problema?
            </h2>
            <LocationPicker
              value={location}
              onChange={setLocation}
              color={category?.color}
              icon={category?.icon}
            />
            {errors.location && <Callout tone="danger">{errors.location}</Callout>}
            <Field
              label="Ponto de referência (opcional)"
              hint="Ex.: em frente à escola, próximo à praça."
            >
              <Input
                value={addressHint}
                maxLength={120}
                onChange={(event) => setAddressHint(event.target.value)}
              />
            </Field>
            <div className="bg-surface rounded-card shadow-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-ink-900 text-sm font-bold">Publicar também na comunidade</p>
                <p className="text-ink-500 text-xs">Mais pessoas veem e apoiam a sua demanda.</p>
              </div>
              <Switch
                checked={shareOnFeed}
                onChange={setShareOnFeed}
                label="Publicar também na comunidade"
              />
            </div>
          </div>
        )}

        <CitySilhouette className="mt-10 h-16 opacity-70" />
      </Page>

      <StickyActionBar width="narrow">
        {step < 2 ? (
          <Button size="lg" fullWidth disabled={!canContinue} onClick={() => setStep(step + 1)}>
            Continuar
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            loading={submit.pending}
            onClick={() => {
              setErrors({})
              void submit.run()
            }}
          >
            {location ? 'Enviar demanda' : 'Enviar sem localização'}
          </Button>
        )}
        {step === 0 && (
          <Button size="lg" variant="ghost" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        )}
      </StickyActionBar>
    </>
  )
}
