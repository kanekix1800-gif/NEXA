import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Landmark,
  Map as MapIcon,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { Illustration } from '@/components/brand/Illustration'
import { EventCard, NewsCard } from '@/components/domain'
import {
  AsyncView,
  Avatar,
  CountBadge,
  DemoBadge,
  IconTile,
  Page,
  QuickAccessTile,
  SectionHeader,
  Skeleton,
  SkeletonList,
  StatCard,
} from '@/components/ui'
import { config } from '@/config'
import { useCurrentUser } from '@/contexts/AuthContext'
import { repos } from '@/repositories'
import { firstName } from '@/utils/text'

const QUICK_ACCESS = [
  { to: paths.community, label: 'Comunidade', icon: Users },
  { to: paths.businesses, label: 'Comércio Local', icon: Store },
  { to: paths.demands, label: 'Demandas', icon: Megaphone },
  { to: paths.events, label: 'Eventos', icon: CalendarDays },
  { to: paths.institutions, label: 'Instituições', icon: Landmark },
  { to: paths.assistant, label: 'NEXA IA', icon: Sparkles },
]

/** Atalho da área exclusiva de cada perfil (NEXA Business, painel institucional ou administração). */
function RoleShortcut() {
  const user = useCurrentUser()
  const shortcut =
    user.role === 'merchant'
      ? {
          to: user.businessId ? paths.businessDashboard : paths.newBusiness,
          icon: ChartColumn,
          title: 'NEXA Business',
          text: user.businessId
            ? 'Vendas, estoque e finanças do seu negócio.'
            : 'Cadastre seu estabelecimento para começar.',
        }
      : user.role === 'institution'
        ? {
            to: paths.institutionPanel,
            icon: ClipboardList,
            title: 'Painel institucional',
            text: 'Demandas encaminhadas e iniciativas.',
          }
        : user.role === 'admin'
          ? {
              to: paths.admin,
              icon: ShieldCheck,
              title: 'Painel administrativo',
              text: 'Indicadores, moderação e categorias.',
            }
          : null
  if (!shortcut) return null
  return (
    <Link
      to={shortcut.to}
      className="bg-nexa-900 rounded-card shadow-card flex items-center gap-3.5 p-4 text-white transition-transform active:scale-[0.99]"
    >
      <span className="bg-white/12 flex size-12 shrink-0 items-center justify-center rounded-2xl">
        <shortcut.icon className="text-sun-300 size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold">{shortcut.title}</span>
        <span className="block text-[13px] text-white/75">{shortcut.text}</span>
      </span>
      <ArrowRight className="size-5 shrink-0" aria-hidden />
    </Link>
  )
}

/** Tela inicial: saudação, banner, acessos rápidos, notícias, eventos e resumo comunitário. */
export default function HomePage() {
  const user = useCurrentUser()
  const neighborhoods = useQuery({
    queryKey: ['reference', 'neighborhoods'],
    queryFn: () => repos.reference.listNeighborhoods(),
  })
  const unread = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => repos.notifications.unreadCount(),
  })
  const news = useQuery({ queryKey: ['news', 3], queryFn: () => repos.news.list({ limit: 3 }) })
  const events = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => repos.events.list({ when: 'upcoming' }),
  })
  const summary = useQuery({
    queryKey: ['stats', 'community'],
    queryFn: () => repos.stats.getCommunitySummary(),
  })
  const neighborhood = neighborhoods.data?.find((item) => item.id === user.neighborhoodId)

  return (
    <Page className="pt-safe">
      <header className="flex items-center justify-between gap-3 pt-5 pb-4">
        <div className="min-w-0">
          <h1 className="text-ink-900 truncate text-[1.625rem] leading-tight font-extrabold">
            Olá, {firstName(user.name)}!
          </h1>
          <p className="text-ink-500 mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            Bem-vindo ao NEXA!
            {neighborhood && (
              <span className="text-nexa-800 inline-flex items-center gap-1 text-xs font-bold">
                <MapPin className="size-3.5" aria-hidden />
                {neighborhood.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to={paths.notifications}
            aria-label={`Notificações${unread.data ? `, ${unread.data} não lidas` : ''}`}
            className="text-ink-800 hover:bg-ink-100 relative flex size-11 items-center justify-center rounded-full"
          >
            <Bell className="size-[22px]" aria-hidden />
            <CountBadge count={unread.data ?? 0} className="absolute top-1.5 right-1.5" />
          </Link>
          <Link to={paths.profile} aria-label="Meu perfil">
            <Avatar name={user.name} avatar={user.avatar} photoUrl={user.photoUrl} size="lg" />
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-7">
        <Link
          to={paths.community}
          className="rounded-card shadow-card group relative block aspect-[21/10] overflow-hidden"
        >
          <Illustration name="city-sunset" />
          <div className="absolute inset-0 flex items-center justify-between gap-4 p-5">
            <div>
              {config.isDemoMode && <DemoBadge className="mb-2" />}
              <p className="max-w-[11rem] text-[1.375rem] leading-tight font-extrabold text-white drop-shadow-sm">
                Nossa cidade mais unida
              </p>
              <p className="mt-1 text-[13px] font-semibold text-white/85">Explore a comunidade</p>
            </div>
            <span className="text-nexa-900 flex size-11 shrink-0 items-center justify-center self-end rounded-full bg-white shadow-md transition-transform group-active:scale-90">
              <ArrowRight className="size-5" aria-hidden />
            </span>
          </div>
        </Link>

        <RoleShortcut />

        <nav
          aria-label="Acessos rápidos"
          className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6"
        >
          {QUICK_ACCESS.map((item) => (
            <QuickAccessTile key={item.to} {...item} />
          ))}
        </nav>

        <Link
          to={paths.map}
          className="bg-surface rounded-card shadow-card flex items-center gap-3.5 p-4 transition-transform active:scale-[0.99]"
        >
          <IconTile icon={MapIcon} color="teal" size="lg" />
          <span className="min-w-0 flex-1">
            <span className="text-ink-900 block text-[15px] font-bold">Mapa inteligente</span>
            <span className="text-ink-500 block text-[13px]">
              Demandas, comércio, eventos e serviços perto de você.
            </span>
          </span>
          <ArrowRight className="text-ink-400 size-5 shrink-0" aria-hidden />
        </Link>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Notícias da sua região" to={paths.news} actionLabel="Ver todas" />
          <AsyncView query={news} loading={<SkeletonList count={2} />}>
            {(items) => (
              <div className="flex flex-col gap-3">
                {items.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </AsyncView>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Próximos eventos" to={paths.events} actionLabel="Ver todos" />
          <AsyncView query={events} loading={<SkeletonList count={2} />}>
            {(items) => (
              <div className="grid gap-3 lg:grid-cols-2">
                {items.slice(0, 2).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </AsyncView>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Resumo comunitário" />
          {summary.data ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Demandas registradas"
                value={summary.data.demandsRegistered}
                icon={Megaphone}
                to={paths.demands}
              />
              <StatCard
                label="Demandas resolvidas"
                value={summary.data.demandsResolved}
                icon="shield"
                color="green"
                to={`${paths.demands}?status=resolved`}
              />
              <StatCard
                label="Negócios cadastrados"
                value={summary.data.businesses}
                icon={Store}
                color="orange"
                to={paths.businesses}
              />
              <StatCard
                label="Eventos próximos"
                value={summary.data.upcomingEvents}
                icon={CalendarDays}
                color="purple"
                to={paths.events}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="rounded-card h-24" />
              ))}
            </div>
          )}
          <p className="text-ink-400 text-center text-xs">
            Indicadores calculados a partir dos registros da plataforma.
          </p>
        </section>
      </div>
    </Page>
  )
}
