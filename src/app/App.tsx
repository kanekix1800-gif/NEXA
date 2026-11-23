import { RouterProvider } from 'react-router/dom'

import { AppProviders } from './providers'
import { router } from './router'

/** Componente raiz: provedores globais + roteador. */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
