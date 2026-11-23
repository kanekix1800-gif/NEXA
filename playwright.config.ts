import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * Testes ponta a ponta do NEXA (fluxos obrigatórios A–F, permissões e persistência).
 * Rodam contra o servidor de desenvolvimento; cada teste usa um navegador "limpo",
 * portanto começa sempre com a base demonstrativa inicial.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testIgnore: /responsivo.spec.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      // Motor do Safari (WebKit) com o perfil de um iPhone.
      name: 'iphone',
      testIgnore: /responsivo.spec.ts/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      testMatch: /responsivo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
