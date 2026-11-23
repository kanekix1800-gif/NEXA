import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { paths } from '@/app/paths'
import { LocationPicker } from '@/components/map'
import {
  Button,
  EmptyState,
  Field,
  ImagePicker,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonList,
  StickyActionBar,
  SwitchRow,
  Textarea,
} from '@/components/ui'
import { NeighborhoodPicker } from '@/components/domain/NeighborhoodPicker'
import { AccessibilityFeaturesField } from '@/components/domain/PlaceAccessibility'
import { config } from '@/config'
import { useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos, type EventInput } from '@/repositories'
import type { AccessibilityFeature, EventView, GeoPoint } from '@/types'
import { now } from '@/utils/clock'
import { addDays, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/utils/dates'
import { isAppError } from '@/utils/errors'

type OrganizerAs = NonNullable<EventInput['organizerAs']>

function defaultStart(): Date {
  const date = addDays(now(), 7)
  date.setHours(9, 0, 0, 0)
  return date
}

function EventForm({ event }: { event: EventView | null }) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const categories = useQuery({
    queryKey: ['reference', 'categories', 'event'],
    queryFn: () => repos.reference.listCategories('event'),
  })
  const institution = useQuery({
    queryKey: ['institutions', 'mine'],
    queryFn: () => repos.institutions.getMine(),
    enabled: user.role === 'institution',
  })

  const start = event ? new Date(event.startsAt) : defaultStart()
  const end = event ? new Date(event.endsAt) : new Date(start.getTime() + 3 * 60 * 60 * 1000)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? '')
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(start))
  const [endsAt, setEndsAt] = useState(toDateTimeLocalValue(end))
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [neighborhoodId, setNeighborhoodId] = useState(event?.neighborhoodId ?? user.neighborhoodId)
  const [location, setLocation] = useState<GeoPoint | null>(event?.location ?? null)
  const [capacity, setCapacity] = useState(event?.capacity ? String(event.capacity) : '')
  const [accessibility, setAccessibility] = useState<AccessibilityFeature[]>(
    event?.accessibility ?? [],
  )
  const [cover, setCover] = useState<string[]>(event?.imageUrl ? [event.imageUrl] : [])
  const [organizerAs, setOrganizerAs] = useState<OrganizerAs>('self')
  const [shareOnFeed, setShareOnFeed] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const canAsInstitution = Boolean(institution.data?.verified)
  const canAsBusiness = user.role === 'merchant' && Boolean(user.businessId)

  const save = useAction(
    () => {
      const input: EventInput = {
        title,
        description,
        categoryId,
        imageUrl: cover[0] ?? null,
        startsAt: fromDateTimeLocalValue(startsAt) ?? '',
        endsAt: fromDateTimeLocalValue(endsAt) ?? '',
        venue,
        address: address || undefined,
        neighborhoodId,
        location,
        capacity: capacity ? Number(capacity) : null,
        accessibility,
        // Quem organiza e a divulgação no feed são decididos apenas na criação.
        ...(event ? {} : { organizerAs, shareOnFeed }),
      }
      return event ? repos.events.update(event.id, input) : repos.events.create(input)
    },
    {
      success: event ? 'Evento atualizado.' : 'Evento criado!',
      onSuccess: (saved) => navigate(paths.event(saved.id), { replace: true }),
      onError: (error) => {
        if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
      },
    },
  )

  return (
    <>
      <Page bottomNav={false} width="narrow" className="pb-32">
        <div className="flex flex-col gap-5 pt-2">
          <Field label="Nome do evento" error={errors.title} required>
            <Input
              value={title}
              maxLength={config.limits.eventTitleMaxLength}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Mutirão de limpeza da praça"
            />
          </Field>
          <Field label="Categoria" error={errors.categoryId} required>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
            counter={`${description.length}/${config.limits.eventDescriptionMaxLength}`}
            required
          >
            <Textarea
              rows={5}
              maxLength={config.limits.eventDescriptionMaxLength}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que vai acontecer? Quem pode participar?"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Início" error={errors.startsAt} required>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </Field>
            <Field label="Término" error={errors.endsAt} required>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Local"
            error={errors.venue}
            hint="Nome do lugar. Ex.: Praça da Matriz"
            required
          >
            <Input value={venue} maxLength={80} onChange={(e) => setVenue(e.target.value)} />
          </Field>
          <Field label="Endereço (opcional)" error={errors.address}>
            <Input
              value={address}
              maxLength={config.limits.addressMaxLength}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Field label="Bairro" error={errors.neighborhoodId} required>
            <NeighborhoodPicker value={neighborhoodId} onChange={setNeighborhoodId} />
          </Field>
          <div>
            <p className="text-ink-800 mb-2 text-[0.8125rem] font-bold">
              Localização no mapa (opcional)
            </p>
            <LocationPicker
              value={location}
              onChange={setLocation}
              color="purple"
              icon="calendar"
            />
            {errors.location && (
              <p className="text-danger-600 mt-2 text-xs font-semibold">{errors.location}</p>
            )}
          </div>
          <Field
            label="Limite de vagas (opcional)"
            error={errors.capacity}
            hint="Deixe em branco para vagas ilimitadas."
          >
            <Input
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <AccessibilityFeaturesField
            value={accessibility}
            onChange={setAccessibility}
            legend="Marque o que o evento oferece, como intérprete de Libras ou local sem degraus."
            error={errors.accessibility}
          />
          <div>
            <p className="text-ink-800 mb-2 text-[0.8125rem] font-bold">
              Imagem de capa (opcional)
            </p>
            <ImagePicker value={cover} onChange={setCover} max={1} label="Adicionar capa" />
          </div>
          {!event && (canAsInstitution || canAsBusiness) && (
            <Field label="Organizar como">
              <Select
                value={organizerAs}
                onChange={(e) => setOrganizerAs(e.target.value as OrganizerAs)}
              >
                <option value="self">{user.name}</option>
                {canAsInstitution && <option value="institution">{institution.data?.name}</option>}
                {canAsBusiness && <option value="business">Meu estabelecimento</option>}
              </Select>
            </Field>
          )}
          {!event && (
            <div className="bg-surface rounded-card shadow-card px-4">
              <SwitchRow
                title="Divulgar na comunidade"
                description="Cria uma publicação no feed convidando para o evento."
                checked={shareOnFeed}
                onChange={setShareOnFeed}
              />
            </div>
          )}
        </div>
      </Page>
      <StickyActionBar width="narrow">
        <Button
          size="lg"
          fullWidth
          loading={save.pending}
          onClick={() => {
            setErrors({})
            void save.run()
          }}
        >
          {event ? 'Salvar alterações' : 'Criar evento'}
        </Button>
      </StickyActionBar>
    </>
  )
}

/** Criação e edição de evento. */
export default function EventFormPage() {
  const { id } = useParams()
  const event = useQuery({
    queryKey: ['events', id, 'form'],
    queryFn: () => repos.events.get(id ?? ''),
    enabled: Boolean(id),
  })

  return (
    <>
      <PageHeader
        title={id ? 'Editar evento' : 'Criar evento'}
        variant="stack"
        backTo={paths.events}
      />
      {id && event.isLoading ? (
        <Page bottomNav={false} width="narrow">
          <SkeletonList count={4} />
        </Page>
      ) : id && (!event.data || !event.data.canManage) ? (
        <Page bottomNav={false} width="narrow">
          <EmptyState
            icon={CalendarDays}
            title="Você não pode editar este evento"
            description="Somente quem criou o evento ou a administração pode alterá-lo."
          />
        </Page>
      ) : (
        <EventForm key={event.data?.id ?? 'novo'} event={event.data ?? null} />
      )}
    </>
  )
}
