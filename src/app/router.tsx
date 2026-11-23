import type { ComponentType } from 'react'
import { createHashRouter, Outlet, ScrollRestoration, type RouteObject } from 'react-router'

import { AREA_ROLES } from '@/services/permissions'

import { PublicOnly, RequireAuth, RequireRole } from './guards'
import { AppLayout } from './layouts/AppLayout'
import { FullScreenLoader } from './pages/FullScreenLoader'
import { LegalPage } from './pages/LegalPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { paths, routePatterns } from './paths'
import { reloadForUpdate } from './updates'

/**
 * ROTEADOR DO NEXA
 * ─────────────────────────────────────────────────────────────────────────────
 * • Roteamento por HASH (`/#/rota`): o app é um site estático publicado em
 *   subcaminho (GitHub Pages) — assim links diretos e recarregamentos nunca dão 404.
 * • Cada página é carregada sob demanda (um arquivo por tela), mantendo leve o
 *   primeiro acesso em redes móveis.
 * • Grupos: rotas públicas → rotas autenticadas (dentro do `AppLayout`) → áreas
 *   restritas por perfil (`RequireRole`).
 */

/** Metadados opcionais de rota, lidos pelo `AppLayout` via `useMatches()`. */
export interface RouteHandle {
  /** Oculta a navegação inferior (formulários e fluxos com barra de ação própria). */
  hideBottomNav?: boolean
}

type PageModule = { default: ComponentType }

/**
 * Adapta um `import()` de página (export default) ao formato `lazy` do roteador.
 * Se o arquivo da tela não puder ser carregado — quase sempre porque uma versão nova foi
 * publicada —, a página é recarregada uma vez antes de mostrar qualquer erro.
 */
function page(loader: () => Promise<PageModule>) {
  return async () => {
    try {
      return { Component: (await loader()).default }
    } catch (error) {
      if (reloadForUpdate()) return { Component: FullScreenLoader }
      throw error
    }
  }
}

const focused: RouteHandle = { hideBottomNav: true }

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

const publicRoutes: RouteObject[] = [
  { path: paths.welcome, lazy: page(() => import('@/features/auth/pages/WelcomePage')) },
  { path: paths.onboarding, lazy: page(() => import('@/features/auth/pages/OnboardingPage')) },
  { path: paths.login, lazy: page(() => import('@/features/auth/pages/LoginPage')) },
  { path: paths.signUp, lazy: page(() => import('@/features/auth/pages/SignUpPage')) },
  {
    path: paths.recoverPassword,
    lazy: page(() => import('@/features/auth/pages/RecoverPasswordPage')),
  },
]

const businessRoutes: RouteObject[] = [
  {
    path: paths.businessDashboard,
    lazy: page(() => import('@/features/business-management/pages/BusinessDashboardPage')),
  },
  {
    path: paths.businessProducts,
    lazy: page(() => import('@/features/business-management/pages/ProductsPage')),
  },
  {
    path: paths.businessSales,
    lazy: page(() => import('@/features/business-management/pages/SalesPage')),
  },
  {
    path: paths.businessNewSale,
    handle: focused,
    lazy: page(() => import('@/features/business-management/pages/NewSalePage')),
  },
  {
    path: paths.businessFinance,
    lazy: page(() => import('@/features/business-management/pages/FinancePage')),
  },
  {
    path: paths.businessInsights,
    lazy: page(() => import('@/features/business-management/pages/InsightsPage')),
  },
]

const adminRoutes: RouteObject[] = [
  { path: paths.admin, lazy: page(() => import('@/features/admin/pages/AdminDashboardPage')) },
  {
    path: paths.adminModeration,
    lazy: page(() => import('@/features/admin/pages/ModerationPage')),
  },
  {
    path: paths.adminCategories,
    lazy: page(() => import('@/features/admin/pages/CategoriesPage')),
  },
  {
    path: paths.adminDemands,
    lazy: page(() => import('@/features/admin/pages/AdminDemandsPage')),
  },
  { path: paths.adminEvents, lazy: page(() => import('@/features/admin/pages/AdminEventsPage')) },
  { path: paths.adminUsers, lazy: page(() => import('@/features/admin/pages/AdminUsersPage')) },
  {
    path: paths.adminInstitutions,
    lazy: page(() => import('@/features/admin/pages/AdminInstitutionsPage')),
  },
]

const appRoutes: RouteObject[] = [
  // Início e notícias
  { path: paths.home, lazy: page(() => import('@/features/home/pages/HomePage')) },
  { path: paths.news, lazy: page(() => import('@/features/home/pages/NewsListPage')) },
  {
    path: routePatterns.newsArticle,
    lazy: page(() => import('@/features/home/pages/NewsArticlePage')),
  },

  // Comunidade
  { path: paths.community, lazy: page(() => import('@/features/community/pages/CommunityPage')) },
  {
    path: routePatterns.newPost,
    handle: focused,
    lazy: page(() => import('@/features/community/pages/NewPostPage')),
  },
  {
    path: routePatterns.post,
    lazy: page(() => import('@/features/community/pages/PostDetailPage')),
  },
  {
    path: routePatterns.userProfile,
    lazy: page(() => import('@/features/community/pages/UserProfilePage')),
  },

  // Demandas
  { path: paths.demands, lazy: page(() => import('@/features/demands/pages/DemandsPage')) },
  {
    path: paths.newDemand,
    handle: focused,
    lazy: page(() => import('@/features/demands/pages/NewDemandPage')),
  },
  {
    path: routePatterns.demand,
    lazy: page(() => import('@/features/demands/pages/DemandDetailPage')),
  },

  // Mapa inteligente
  { path: paths.map, lazy: page(() => import('@/features/map/pages/MapPage')) },

  // Comércio local
  {
    path: paths.businesses,
    lazy: page(() => import('@/features/businesses/pages/BusinessesPage')),
  },
  {
    path: paths.newBusiness,
    handle: focused,
    lazy: page(() => import('@/features/businesses/pages/BusinessFormPage')),
  },
  {
    path: routePatterns.business,
    lazy: page(() => import('@/features/businesses/pages/BusinessDetailPage')),
  },
  {
    path: routePatterns.editBusiness,
    handle: focused,
    lazy: page(() => import('@/features/businesses/pages/BusinessFormPage')),
  },

  // NEXA IA
  { path: paths.assistant, lazy: page(() => import('@/features/ai/pages/AssistantPage')) },

  // Instituições e serviços públicos
  {
    path: paths.institutions,
    lazy: page(() => import('@/features/institutions/pages/InstitutionsPage')),
  },
  {
    path: routePatterns.institution,
    lazy: page(() => import('@/features/institutions/pages/InstitutionDetailPage')),
  },
  {
    path: routePatterns.publicService,
    lazy: page(() => import('@/features/institutions/pages/PublicServicePage')),
  },

  // Eventos
  { path: paths.events, lazy: page(() => import('@/features/events/pages/EventsPage')) },
  {
    path: paths.newEvent,
    handle: focused,
    lazy: page(() => import('@/features/events/pages/EventFormPage')),
  },
  {
    path: routePatterns.event,
    lazy: page(() => import('@/features/events/pages/EventDetailPage')),
  },
  {
    path: routePatterns.editEvent,
    handle: focused,
    lazy: page(() => import('@/features/events/pages/EventFormPage')),
  },

  // Notificações
  {
    path: paths.notifications,
    lazy: page(() => import('@/features/notifications/pages/NotificationsPage')),
  },

  // Perfil
  { path: paths.profile, lazy: page(() => import('@/features/profile/pages/ProfilePage')) },
  {
    path: paths.editProfile,
    handle: focused,
    lazy: page(() => import('@/features/profile/pages/EditProfilePage')),
  },
  { path: paths.myPosts, lazy: page(() => import('@/features/profile/pages/MyPostsPage')) },
  { path: paths.myDemands, lazy: page(() => import('@/features/profile/pages/MyDemandsPage')) },
  { path: paths.myEvents, lazy: page(() => import('@/features/profile/pages/MyEventsPage')) },
  {
    path: paths.myFavorites,
    lazy: page(() => import('@/features/profile/pages/MyFavoritesPage')),
  },
  { path: paths.settings, lazy: page(() => import('@/features/profile/pages/SettingsPage')) },
  { path: paths.help, lazy: page(() => import('@/features/profile/pages/HelpPage')) },
  { path: paths.plans, lazy: page(() => import('@/features/profile/pages/PlansPage')) },

  // Áreas restritas por perfil
  {
    element: <RequireRole roles={AREA_ROLES.business} area="NEXA Business" />,
    children: businessRoutes,
  },
  {
    element: <RequireRole roles={AREA_ROLES.institutionPanel} area="Painel institucional" />,
    children: [
      {
        path: paths.institutionPanel,
        lazy: page(() => import('@/features/institutions/pages/InstitutionPanelPage')),
      },
    ],
  },
  {
    element: <RequireRole roles={AREA_ROLES.admin} area="Painel administrativo" />,
    children: adminRoutes,
  },
]

/** Galeria de desenvolvimento (marca e ilustrações) — existe apenas em `npm run dev`. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/_dev/marca', lazy: page(() => import('@/dev/BrandGallery')) }]
  : []

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { element: <PublicOnly />, children: publicRoutes },
      // Documentos legais: acessíveis com ou sem sessão.
      { path: paths.terms, element: <LegalPage kind="terms" /> },
      { path: paths.privacy, element: <LegalPage kind="privacy" /> },
      {
        element: <RequireAuth />,
        children: [{ element: <AppLayout />, children: appRoutes }],
      },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createHashRouter(routes)
