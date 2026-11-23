import {
  Accessibility,
  BusFront,
  CalendarDays,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  Crown,
  FileText,
  Heart,
  LogOut,
  Megaphone,
  Package,
  Pencil,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { paths } from '@/app/paths'
import {
  Avatar,
  Badge,
  ButtonLink,
  ConfirmDialog,
  DemoBadge,
  ListGroup,
  ListRow,
  Page,
} from '@/components/ui'
import { useAuth, useCurrentUser } from '@/contexts/AuthContext'
import { repos } from '@/repositories'
import { USER_ROLE_LABEL } from '@/types'

function row(icon: LucideIcon, title: string, to: string, description?: string) {
  const Icon = icon
  return (
    <ListRow
      key={to}
      leading={<Icon className="text-nexa-800 size-[1.375rem]" aria-hidden />}
      title={title}
      description={description}
      to={to}
    />
  )
}

/** Perfil do usuário e menu da conta. */
export default function ProfilePage() {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const neighborhoods = useQuery({
    queryKey: ['reference', 'neighborhoods'],
    queryFn: () => repos.reference.listNeighborhoods(),
  })
  const neighborhood = neighborhoods.data?.find((item) => item.id === user.neighborhoodId)?.name

  return (
    <Page className="pt-safe">
      <header className="flex flex-col items-center gap-2 pt-8 pb-6 text-center">
        <Avatar name={user.name} avatar={user.avatar} photoUrl={user.photoUrl} size="2xl" />
        <h1 className="text-ink-900 mt-1 text-[1.5rem] leading-tight font-extrabold">
          {user.name}
        </h1>
        <p className="text-ink-500 -mt-1 text-sm">@{user.username}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge size="md">
            {USER_ROLE_LABEL[user.role]}
            {neighborhood ? ` · ${neighborhood}` : ''}
          </Badge>
          {user.isDemoAccount && <DemoBadge label="Conta demonstrativa" />}
        </div>
        {user.bio && <p className="text-ink-600 max-w-sm text-sm">{user.bio}</p>}
        <ButtonLink
          to={paths.editProfile}
          variant="outline"
          size="sm"
          leftIcon={<Pencil className="size-4" />}
          className="mt-1"
        >
          Editar perfil
        </ButtonLink>
      </header>

      <div className="flex flex-col gap-4">
        <ListGroup>
          {row(FileText, 'Minhas Publicações', paths.myPosts)}
          {row(Megaphone, 'Minhas Demandas', paths.myDemands)}
          {row(CalendarDays, 'Meus Eventos', paths.myEvents)}
          {row(Heart, 'Meus Favoritos', paths.myFavorites)}
        </ListGroup>

        {user.role === 'merchant' && (
          <ListGroup>
            {row(
              Store,
              'Meu estabelecimento',
              user.businessId ? paths.business(user.businessId) : paths.newBusiness,
              user.businessId ? undefined : 'Cadastre o seu negócio',
            )}
            {row(ChartColumn, 'NEXA Business', paths.businessDashboard)}
            {row(Package, 'Produtos', paths.businessProducts)}
            {row(Receipt, 'Vendas', paths.businessSales)}
            {row(Wallet, 'Finanças', paths.businessFinance)}
          </ListGroup>
        )}
        {user.role === 'institution' && (
          <ListGroup>
            {row(ClipboardList, 'Painel institucional', paths.institutionPanel)}
          </ListGroup>
        )}
        {user.role === 'admin' && (
          <ListGroup>{row(ShieldCheck, 'Painel administrativo', paths.admin)}</ListGroup>
        )}

        <ListGroup>
          {row(
            Accessibility,
            'Acessibilidade',
            paths.accessibility,
            'Texto, contraste, voz, sons e vibração',
          )}
          {row(
            BusFront,
            'Mobilidade acessível',
            paths.mobility,
            'Ônibus, barreiras e alertas no caminho',
          )}
        </ListGroup>

        <ListGroup>
          {row(Crown, 'Planos', paths.plans)}
          {row(Settings, 'Configurações', paths.settings)}
          {row(CircleHelp, 'Ajuda e Suporte', paths.help)}
          <ListRow
            leading={<LogOut className="text-danger-600 size-[1.375rem]" aria-hidden />}
            title="Sair"
            tone="danger"
            hideChevron
            onClick={() => setConfirmSignOut(true)}
          />
        </ListGroup>

        <p className="text-ink-400 pb-2 text-center text-xs">
          NEXA · Conexões que transformam realidades.
        </p>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sair da conta?"
        description="Seus dados continuam guardados neste aparelho."
        confirmLabel="Sair"
        onConfirm={async () => {
          await signOut()
          navigate(paths.login, { replace: true })
        }}
      />
    </Page>
  )
}
