import '@fontsource-variable/plus-jakarta-sans'
import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from './app/App'
import { reloadForUpdate } from './app/updates'
import { initRepositories } from './repositories'

// Mantém o aplicativo na versão publicada: ao instalar uma atualização, a página recarrega sozinha.
registerSW({ immediate: true })

// Uma publicação nova trocou os arquivos enquanto esta página estava aberta.
window.addEventListener('vite:preloadError', (event: Event) => {
  if (reloadForUpdate()) event.preventDefault()
})

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado.')
const root = container

/**
 * Carrega os dados do dispositivo (ou gera a base demonstrativa) antes de renderizar.
 * Enquanto isso, o usuário vê a tela de abertura estática definida em `index.html`.
 */
async function bootstrap(): Promise<void> {
  try {
    await initRepositories()
  } catch (error) {
    console.error('[NEXA] Falha ao carregar os dados locais.', error)
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
