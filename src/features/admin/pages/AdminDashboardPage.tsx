import { useQuery } from '@tanstack/react-query'
import { CalendarDays, FileText, Flag, Landmark, Megaphone, Store, Users } from 'lucide-react'

import { paths } from '@/app/paths'
import { ChartCard, CountBarChart, DonutChart, RankingChart } from '@/components/charts'
import { AsyncView, Callout, Skeleton, StatCard } from '@/components/ui'
import { repos } from '@/repositories'
import { formatNumber } from '@/utils/format'

import { AdminShell } from '../components/AdminShell'

const count = (value: number) => formatNumber(value)

/** Visão geral administrativa: indicadores e gráficos da plataforma. */
export default function AdminDashboardPage() {
  const overview = useQuery({
    queryKey: ['stats', 'admin'],
    queryFn: () => repos.stats.getAdminOverview(),
  })
  return (
    <AdminShell>
      <AsyncView
        query={overview}
        loading={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="rounded-card h-24" />
            ))}
          </div>
        }
      >
        {(data) => (
          <div className="flex flex-col gap-6">
            {data.openReports > 0 && (
              <Callout
                tone="warning"
                title={`${data.openReports} ${data.openReports === 1 ? 'denúncia aguarda' : 'denúncias aguardam'} revisão`}
              >
                Acesse a aba Moderação para analisar os conteúdos denunciados.
              </Callout>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Usuários cadastrados"
                value={data.users}
                icon={Users}
                to={paths.adminUsers}
              />
              <StatCard
                label="Negócios cadastrados"
                value={data.businesses}
                icon={Store}
                color="orange"
                to={paths.businesses}
              />
              <StatCard
                label="Instituições"
                value={data.institutions}
                icon={Landmark}
                color="teal"
                to={paths.adminInstitutions}
              />
              <StatCard
                label="Denúncias abertas"
                value={data.openReports}
                icon={Flag}
                color="terracotta"
                to={paths.adminModeration}
              />
              <StatCard
                label="Demandas abertas"
                value={data.demandsOpen}
                icon={Megaphone}
                color="orange"
                to={paths.adminDemands}
              />
              <StatCard
                label="Demandas resolvidas"
                value={data.demandsResolved}
                icon="shield"
                color="green"
                to={paths.adminDemands}
              />
              <StatCard
                label="Publicações"
                value={data.posts}
                icon={FileText}
                color="blue"
                to={paths.adminModeration}
              />
              <StatCard
                label="Eventos"
                value={data.events}
                icon={CalendarDays}
                color="purple"
                to={paths.adminEvents}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                title="Demandas por status"
                subtitle={`${data.demandsTotal} demandas registradas`}
                empty={data.demandsTotal === 0}
              >
                <DonutChart
                  format={count}
                  data={data.demandsByStatus
                    .filter((item) => item.count > 0)
                    .map((item) => ({ name: item.label, value: item.count }))}
                />
              </ChartCard>
              <ChartCard title="Demandas por semana" subtitle="Últimas 8 semanas">
                <CountBarChart
                  name="Demandas"
                  data={data.demandsPerWeek.map((bucket) => ({
                    label: bucket.label,
                    value: bucket.value,
                  }))}
                />
              </ChartCard>
              <ChartCard title="Demandas por categoria" empty={data.demandsByCategory.length === 0}>
                <RankingChart
                  data={data.demandsByCategory
                    .slice(0, 6)
                    .map((item) => ({ name: item.label, count: item.count }))}
                  dataKey="count"
                  name="Demandas"
                />
              </ChartCard>
              <ChartCard title="Publicações por semana" subtitle="Últimas 8 semanas">
                <CountBarChart
                  name="Publicações"
                  data={data.postsPerWeek.map((bucket) => ({
                    label: bucket.label,
                    value: bucket.value,
                  }))}
                />
              </ChartCard>
              <ChartCard title="Usuários por perfil">
                <DonutChart
                  format={count}
                  data={data.usersByRole.map((item) => ({ name: item.label, value: item.count }))}
                />
              </ChartCard>
              <ChartCard
                title="Demandas por bairro"
                empty={data.demandsByNeighborhood.length === 0}
              >
                <RankingChart
                  data={data.demandsByNeighborhood.map((item) => ({
                    name: item.label,
                    count: item.count,
                  }))}
                  dataKey="count"
                  name="Demandas"
                />
              </ChartCard>
            </div>

            <Callout tone="demo">
              Indicadores calculados sobre a base demonstrativa deste aparelho. A administração não
              tem acesso aos dados financeiros dos comerciantes.
            </Callout>
          </div>
        )}
      </AsyncView>
    </AdminShell>
  )
}
