import { useQuery } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { paths } from '@/app/paths'
import { LocationPicker } from '@/components/map'
import {
  Button,
  Callout,
  EmptyState,
  Field,
  ImagePicker,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonList,
  StickyActionBar,
  Switch,
  SwitchRow,
  Textarea,
} from '@/components/ui'
import { config } from '@/config'
import { useAuth, useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos, type BusinessInput } from '@/repositories'
import { WEEKDAY_LABEL, type BusinessView, type GeoPoint, type WeekSchedule } from '@/types'
import { isAppError } from '@/utils/errors'
import { defaultSchedule } from '@/utils/schedule'

/** Explica ao morador como divulgar um negócio (e oferece o caminho adequado). */
function ResidentGate() {
  const user = useCurrentUser()
  const { becomeMerchant, signInDemo } = useAuth()
  const navigate = useNavigate()
  const convert = useAction(() => becomeMerchant(), {
    success: 'Sua conta agora é de comerciante. Cadastre seu estabelecimento!',
  })
  const switchProfile = useAction(() => signInDemo('merchant'), {
    onSuccess: () => navigate(paths.businessDashboard),
  })

  return (
    <EmptyState
      icon={Store}
      title="Divulgue seu negócio no NEXA"
      description={
        user.isDemoAccount
          ? 'O cadastro de estabelecimentos é feito por contas de comerciante. Você está no perfil demonstrativo de morador — experimente o perfil de comerciante para conhecer o NEXA Business.'
          : 'Para cadastrar um estabelecimento, sua conta passa a ser do tipo Comerciante. Você continua com acesso a todos os recursos da comunidade.'
      }
      action={
        user.isDemoAccount ? (
          <Button loading={switchProfile.pending} onClick={() => void switchProfile.run()}>
            Entrar como comerciante (demonstração)
          </Button>
        ) : (
          <Button loading={convert.pending} onClick={() => void convert.run()}>
            Quero ser comerciante
          </Button>
        )
      }
    />
  )
}

function BusinessForm({ business }: { business: BusinessView | null }) {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const user = useCurrentUser()
  const categories = useQuery({
    queryKey: ['reference', 'categories', 'business'],
    queryFn: () => repos.reference.listCategories('business'),
  })
  const neighborhoods = useQuery({
    queryKey: ['reference', 'neighborhoods'],
    queryFn: () => repos.reference.listNeighborhoods(),
  })

  const [name, setName] = useState(business?.name ?? '')
  const [categoryId, setCategoryId] = useState(business?.categoryId ?? '')
  const [description, setDescription] = useState(business?.description ?? '')
  const [cover, setCover] = useState<string[]>(business?.coverUrl ? [business.coverUrl] : [])
  const [address, setAddress] = useState(business?.address ?? '')
  const [neighborhoodId, setNeighborhoodId] = useState(
    business?.neighborhoodId ?? user.neighborhoodId,
  )
  const [location, setLocation] = useState<GeoPoint | null>(business?.location ?? null)
  const [phone, setPhone] = useState(business?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(business?.whatsapp ?? '')
  const [instagram, setInstagram] = useState(business?.instagram ?? '')
  const [tags, setTags] = useState((business?.tags ?? []).join(', '))
  const [schedule, setSchedule] = useState<WeekSchedule>(business?.schedule ?? defaultSchedule())
  const [allowNegativeStock, setAllowNegativeStock] = useState(
    business?.settings?.allowNegativeStock ?? false,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useAction(
    async () => {
      const input: BusinessInput = {
        name,
        categoryId,
        description,
        coverUrl: cover[0] ?? null,
        address,
        neighborhoodId,
        location: location as GeoPoint,
        phone,
        whatsapp: whatsapp || undefined,
        instagram: instagram || undefined,
        schedule,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        settings: { allowNegativeStock },
      }
      return business ? repos.businesses.update(business.id, input) : repos.businesses.create(input)
    },
    {
      success: business ? 'Estabelecimento atualizado.' : 'Estabelecimento cadastrado!',
      onSuccess: async (saved) => {
        await refresh()
        navigate(paths.business(saved.id), { replace: true })
      },
      onError: (error) => {
        if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
      },
    },
  )

  const setDay = (day: number, patch: Partial<{ open: string; close: string }> | null) => {
    setSchedule((current) => {
      const next = [...current] as WeekSchedule
      next[day] =
        patch === null ? null : { ...(next[day] ?? { open: '08:00', close: '18:00' }), ...patch }
      return next
    })
  }

  return (
    <>
      <Page bottomNav={false} width="narrow" className="pb-32">
        <div className="flex flex-col gap-5 pt-2">
          <Field label="Nome do estabelecimento" error={errors.name} required>
            <Input
              value={name}
              maxLength={config.limits.businessNameMaxLength}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Categoria" error={errors.categoryId} required>
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Selecione</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Descrição"
            error={errors.description}
            counter={`${description.length}/${config.limits.businessDescriptionMaxLength}`}
            required
          >
            <Textarea
              rows={4}
              maxLength={config.limits.businessDescriptionMaxLength}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="O que o seu negócio oferece? O que o torna especial?"
            />
          </Field>
          <div>
            <p className="text-ink-800 mb-2 text-[13px] font-bold">Imagem de capa (opcional)</p>
            <ImagePicker value={cover} onChange={setCover} max={1} label="Adicionar capa" />
          </div>

          <Field label="Endereço" error={errors.address} required>
            <Input
              value={address}
              maxLength={config.limits.addressMaxLength}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Rua, número — bairro"
            />
          </Field>
          <Field label="Bairro" error={errors.neighborhoodId} required>
            <Select
              value={neighborhoodId}
              onChange={(event) => setNeighborhoodId(event.target.value)}
            >
              {(neighborhoods.data ?? []).map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="text-ink-800 mb-2 text-[13px] font-bold">
              Localização no mapa <span className="text-danger-500">*</span>
            </p>
            <LocationPicker value={location} onChange={setLocation} color="orange" icon="store" />
            {errors.location && (
              <p className="text-danger-600 mt-2 text-xs font-semibold">{errors.location}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone" error={errors.phone} hint="Com DDD." required>
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="WhatsApp (opcional)" error={errors.whatsapp}>
              <Input
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Instagram (opcional)" error={errors.instagram}>
            <Input
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="@seunegocio"
            />
          </Field>
          <Field
            label="Destaques (opcional)"
            error={errors.tags}
            hint="Separe por vírgulas. Ex.: Entrega, Aceita Pix"
          >
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </Field>

          <fieldset className="bg-surface rounded-card shadow-card p-4">
            <legend className="text-ink-800 float-left mb-2 text-[13px] font-bold">
              Horário de funcionamento
            </legend>
            <div className="divide-line clear-both divide-y">
              {schedule.map((hours, day) => (
                <div key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                  <span className="text-ink-800 w-28 text-sm font-semibold">
                    {WEEKDAY_LABEL[day]}
                  </span>
                  <Switch
                    checked={hours !== null}
                    onChange={(open) => setDay(day, open ? {} : null)}
                    label={`Abre ${WEEKDAY_LABEL[day]}`}
                  />
                  {hours ? (
                    <span className="ml-auto flex items-center gap-1.5">
                      <input
                        type="time"
                        aria-label={`Abertura — ${WEEKDAY_LABEL[day]}`}
                        value={hours.open}
                        onChange={(event) => setDay(day, { open: event.target.value })}
                        className="border-line bg-surface h-10 rounded-xl border px-2 text-sm"
                      />
                      <span className="text-ink-400 text-sm">às</span>
                      <input
                        type="time"
                        aria-label={`Fechamento — ${WEEKDAY_LABEL[day]}`}
                        value={hours.close}
                        onChange={(event) => setDay(day, { close: event.target.value })}
                        className="border-line bg-surface h-10 rounded-xl border px-2 text-sm"
                      />
                    </span>
                  ) : (
                    <span className="text-ink-400 ml-auto text-sm">Fechado</span>
                  )}
                </div>
              ))}
            </div>
            {errors.schedule && (
              <p className="text-danger-600 mt-2 text-xs font-semibold">{errors.schedule}</p>
            )}
          </fieldset>

          {business && (
            <div className="bg-surface rounded-card shadow-card px-4">
              <SwitchRow
                title="Permitir venda sem estoque"
                description="Quando ativado, o NEXA Business aceita vendas acima do estoque disponível (o estoque fica negativo)."
                checked={allowNegativeStock}
                onChange={setAllowNegativeStock}
              />
            </div>
          )}

          <Callout tone="info">
            As informações do estabelecimento ficam públicas no Comércio Local. Dados de vendas,
            estoque e finanças são sempre privados.
          </Callout>
        </div>
      </Page>
      <StickyActionBar width="narrow">
        <Button
          size="lg"
          fullWidth
          loading={save.pending}
          disabled={!location}
          onClick={() => {
            setErrors({})
            void save.run()
          }}
        >
          {business ? 'Salvar alterações' : 'Cadastrar estabelecimento'}
        </Button>
      </StickyActionBar>
    </>
  )
}

/** Cadastro e edição de estabelecimento (somente o proprietário edita). */
export default function BusinessFormPage() {
  const { id } = useParams()
  const user = useCurrentUser()
  const editing = Boolean(id)
  const business = useQuery({
    queryKey: ['businesses', id ?? 'mine', 'form'],
    queryFn: () => (id ? repos.businesses.get(id) : repos.businesses.getMine()),
    enabled: user.role === 'merchant' || user.role === 'admin',
  })

  const title = editing ? 'Editar estabelecimento' : 'Cadastrar estabelecimento'
  let content
  if (user.role === 'resident') {
    content = (
      <Page bottomNav={false} width="narrow">
        <ResidentGate />
      </Page>
    )
  } else if (user.role === 'institution') {
    content = (
      <Page bottomNav={false} width="narrow">
        <EmptyState
          icon={Store}
          title="Recurso para comerciantes"
          description="O cadastro de estabelecimentos é feito por contas de comerciante."
        />
      </Page>
    )
  } else if (business.isLoading) {
    content = (
      <Page bottomNav={false} width="narrow">
        <SkeletonList count={4} />
      </Page>
    )
  } else if (!editing && business.data) {
    // Comerciante que já tem negócio: o cadastro vira edição.
    return <Navigate to={paths.editBusiness(business.data.id)} replace />
  } else if (editing && (!business.data || (!business.data.isMine && user.role !== 'admin'))) {
    content = (
      <Page bottomNav={false} width="narrow">
        <EmptyState
          icon={Store}
          title="Você não pode editar este estabelecimento"
          description="Somente o proprietário pode alterar estas informações."
        />
      </Page>
    )
  } else {
    content = <BusinessForm key={business.data?.id ?? 'novo'} business={business.data ?? null} />
  }

  return (
    <>
      <PageHeader title={title} variant="stack" backTo={paths.businesses} />
      {content}
    </>
  )
}
