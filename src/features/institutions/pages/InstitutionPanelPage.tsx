import { useQuery } from '@tanstack/react-query'
import { ClipboardList, HandHeart, Megaphone, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { paths } from '@/app/paths'
import { ChartCard, RankingChart } from '@/components/charts'
import { DemandCard } from '@/components/domain'
import {
  AsyncView,
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  EmptyState,
  Field,
  FilterChips,
  IconButton,
  Input,
  Modal,
  Page,
  PageHeader,
  SectionHeader,
  Select,
  StatCard,
  SwitchRow,
  Textarea,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos, type DemandFilters } from '@/repositories'
import type { InstitutionView } from '@/types'
import { timeAgo } from '@/utils/dates'

type StatusFilter = NonNullable<DemandFilters['status']>

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'open', label: 'Em aberto' },
  { value: 'registered', label: 'Registradas' },
  { value: 'in_review', label: 'Em análise' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvidas' },
  { value: 'all', label: 'Todas' },
]

function InitiativeForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [shareOnFeed, setShareOnFeed] = useState(true)
  const publish = useAction(
    () => repos.institutions.publishInitiative({ title, description, shareOnFeed }),
    {
      success: 'Iniciativa divulgada!',
      onSuccess: onClose,
    },
  )
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Divulgar iniciativa"
      footer={
        <Button
          fullWidth
          loading={publish.pending}
          disabled={title.trim().length < 5 || description.trim().length < 10}
          onClick={() => void publish.run()}
        >
          Publicar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Título" required>
          <Input
            value={title}
            maxLength={90}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Programa Bairro Limpo"
          />
        </Field>
        <Field label="Descrição" hint="Mínimo de 10 caracteres." required>
          <Textarea
            rows={5}
            maxLength={1200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="bg-surface rounded-2xl px-4 shadow-card">
          <SwitchRow
            title="Publicar também na comunidade"
            checked={shareOnFeed}
            onChange={setShareOnFeed}
          />
        </div>
      </div>
    </Modal>
  )
}

function Panel({ institution }: { institution: InstitutionView }) {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<StatusFilter>('open')
  const [categoryId, setCategoryId] = useState('')
  const creating = params.get('nova') === 'iniciativa'

  const summary = useQuery({
    queryKey: ['institutions', institution.id, 'panel'],
    queryFn: () => repos.institutions.getPanelSummary(),
  })
  const categories = useQuery({
    queryKey: ['reference', 'categories', 'demand'],
    queryFn: () => repos.reference.listCategories('demand'),
  })
  const demands = useQuery({
    queryKey: ['demands', { institutionId: institution.id, status, categoryId }],
    queryFn: () =>
      repos.demands.list({
        institutionId: institution.id,
        status,
        categoryId: categoryId || undefined,
        sort: 'urgent',
      }),
    placeholderData: (previous) => previous,
  })
  const initiatives = useQuery({
    queryKey: ['institutions', institution.id, 'initiatives'],
    queryFn: () => repos.institutions.listInitiatives({ institutionId: institution.id }),
  })
  const removeInitiative = useAction((id: string) => repos.institutions.removeInitiative(id), {
    success: 'Iniciativa removida.',
  })
  const count = (key: string) => summary.data?.byStatus.find((item) => item.key === key)?.count ?? 0

  return (
    <div className="flex flex-col gap-6">
      {!institution.verified && (
        <Callout tone="warning" title="Instituição aguardando verificação">
          Enquanto a administração do NEXA não verificar este perfil, não é possível publicar
          atualizações de demandas nem divulgar iniciativas.
        </Callout>
      )}
      <Callout tone="demo" title="Painel demonstrativo">
        As demandas são encaminhadas a esta instituição por simulação. As atualizações publicadas
        aqui aparecem para os moradores marcadas como “Simulação”.
      </Callout>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Encaminhadas" value={summary.data?.total ?? '—'} icon={ClipboardList} />
        <StatCard
          label="Em aberto"
          value={count('registered') + count('in_review') + count('in_progress')}
          icon="alert"
          color="orange"
        />
        <StatCard label="Resolvidas" value={count('resolved')} icon="shield" color="green" />
        <StatCard
          label="Tempo médio de solução"
          value={
            summary.data?.averageResolutionDays != null
              ? `${Math.round(summary.data.averageResolutionDays)} dias`
              : '—'
          }
          icon="calendar"
          color="teal"
        />
      </div>

      {summary.data && summary.data.byCategory.length > 0 && (
        <ChartCard
          title="Demandas por categoria"
          subtitle="Encaminhadas a esta instituição"
          height="h-60"
        >
          <RankingChart
            name="Demandas"
            dataKey="count"
            data={summary.data.byCategory
              .slice(0, 8)
              .map((item) => ({ name: item.label, count: item.count }))}
          />
        </ChartCard>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Demandas encaminhadas"
          to={paths.mapLayer('demands')}
          actionLabel="Ver no mapa"
        />
        <FilterChips
          ariaLabel="Filtrar por status"
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
        />
        <Select
          aria-label="Filtrar por categoria"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {(categories.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <AsyncView
          query={demands}
          empty={
            <EmptyState
              icon={Megaphone}
              title="Nenhuma demanda com estes filtros"
              className="py-8"
            />
          }
        >
          {(items) => (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((demand) => (
                <DemandCard key={demand.id} demand={demand} />
              ))}
            </div>
          )}
        </AsyncView>
        <p className="text-ink-500 text-xs">
          Abra uma demanda para consultar a localização, o histórico e publicar uma atualização.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Iniciativas"
          action={
            <Button
              size="sm"
              leftIcon={<Plus className="size-4" />}
              disabled={!institution.verified}
              onClick={() => setParams({ nova: 'iniciativa' })}
            >
              Divulgar
            </Button>
          }
        />
        <AsyncView
          query={initiatives}
          empty={
            <EmptyState
              icon={HandHeart}
              title="Nenhuma iniciativa divulgada"
              description="Apresente programas e campanhas da instituição para a comunidade."
              className="py-8"
            />
          }
        >
          {(items) => (
            <div className="flex flex-col gap-3">
              {items.map((initiative) => (
                <Card key={initiative.id} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-ink-900 text-[0.9375rem] font-bold">
                        {initiative.title}
                      </h3>
                      <Badge color={initiative.status === 'active' ? 'green' : 'neutral'}>
                        {initiative.status === 'active' ? 'Ativa' : 'Encerrada'}
                      </Badge>
                    </div>
                    <p className="text-ink-600 mt-1 line-clamp-2 text-[0.8125rem]">
                      {initiative.description}
                    </p>
                    <p className="text-ink-400 mt-1 text-xs">{timeAgo(initiative.createdAt)}</p>
                  </div>
                  <IconButton
                    label={`Remover ${initiative.title}`}
                    size="sm"
                    onClick={() => void removeInitiative.run(initiative.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </Card>
              ))}
            </div>
          )}
        </AsyncView>
      </section>

      {creating && <InitiativeForm onClose={() => setParams({}, { replace: true })} />}
    </div>
  )
}

/** Painel institucional: demandas encaminhadas, indicadores e iniciativas. */
export default function InstitutionPanelPage() {
  const institution = useQuery({
    queryKey: ['institutions', 'mine'],
    queryFn: () => repos.institutions.getMine(),
  })
  return (
    <>
      <PageHeader title="Painel institucional" subtitle={institution.data?.name} width="wide" />
      <Page width="wide">
        <AsyncView
          query={institution}
          empty={
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma instituição vinculada"
              description="Esta conta ainda não representa uma instituição."
              action={<ButtonLink to={paths.institutions}>Ver instituições</ButtonLink>}
            />
          }
        >
          {(item) => item && <Panel institution={item} />}
        </AsyncView>
      </Page>
    </>
  )
}
