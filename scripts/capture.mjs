#!/usr/bin/env node
/**
 * Captura telas do NEXA com o Playwright — usada para verificação visual e para
 * gerar as imagens da documentação.
 *
 * Pré-requisitos: app em execução (`npm run dev` ou `npm run preview`) e o Chromium
 * do Playwright instalado (`npx playwright install chromium`).
 *
 * Uso (rotas SEM a barra inicial; "raiz" = tela de abertura):
 *   node scripts/capture.mjs --route inicio --route comunidade --role resident
 *
 * Opções:
 *   --base <url>        URL do app em execução                 (padrão: http://localhost:5173)
 *   --route <rota>      Rota interna; pode repetir             (padrão: raiz)
 *   --role <perfil>     none | resident | merchant | institution | admin   (padrão: resident)
 *   --viewport <nome>   mobile (390×844) | tablet (820×1180) | desktop (1440×900)   (padrão: mobile)
 *   --out <pasta>       Pasta de saída                         (padrão: .scratch/shots)
 *   --name <prefixo>    Prefixo dos arquivos gerados
 *   --full              Captura a página inteira (com rolagem)
 *   --wait <ms>         Espera extra após o carregamento       (padrão: 1200)
 *   --motion            Mantém as animações (por padrão usa movimento reduzido)
 *   --fresh             Não reaproveita dados: cada rota abre com a base demonstrativa inicial
 *
 * A saída é um JSON com o arquivo gerado por rota e os erros de console/página
 * encontrados. O processo termina com código 1 se houver erro de página.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { chromium } from '@playwright/test'

const DEMO_USER_IDS = {
  resident: 'usr_antonio',
  merchant: 'usr_carla',
  institution: 'usr_roberto',
  admin: 'usr_helena',
}

const VIEWPORTS = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
}

function parseArgs(argv) {
  const options = {
    base: 'http://localhost:5173',
    routes: [],
    role: 'resident',
    viewport: 'mobile',
    out: '.scratch/shots',
    name: '',
    full: false,
    wait: 1200,
    motion: false,
    fresh: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => {
      i += 1
      if (argv[i] === undefined) throw new Error(`Faltou o valor de ${arg}`)
      return argv[i]
    }
    if (arg === '--base') options.base = next().replace(/\/+$/, '')
    else if (arg === '--route') options.routes.push(next())
    else if (arg === '--role') options.role = next()
    else if (arg === '--viewport') options.viewport = next()
    else if (arg === '--out') options.out = next()
    else if (arg === '--name') options.name = next()
    else if (arg === '--wait') options.wait = Number(next())
    else if (arg === '--full') options.full = true
    else if (arg === '--motion') options.motion = true
    else if (arg === '--fresh') options.fresh = true
    else throw new Error(`Opção desconhecida: ${arg}`)
  }
  if (options.routes.length === 0) options.routes.push('/')
  options.routes = options.routes.map(normalizeRoute)
  if (!VIEWPORTS[options.viewport]) throw new Error(`Viewport inválido: ${options.viewport}`)
  if (options.role !== 'none' && !DEMO_USER_IDS[options.role]) {
    throw new Error(`Perfil inválido: ${options.role}`)
  }
  return options
}

/**
 * Aceita a rota com ou sem a barra inicial ("inicio" ou "/inicio"); "raiz" = "/".
 * No Git Bash (Windows), argumentos iniciados por "/" são convertidos em caminhos do
 * Windows — por isso prefira SEM a barra inicial: `--route inicio --route demandas/nova`.
 */
function normalizeRoute(route) {
  if (/^[A-Za-z]:[\\/]/.test(route)) {
    throw new Error(
      `Rota inválida: "${route}". O Git Bash converteu a rota em um caminho do Windows. ` +
        'Informe a rota sem a barra inicial (ex.: --route inicio) ou use "raiz" para a tela de abertura.',
    )
  }
  if (route === 'raiz' || route === '' || route === '/') return '/'
  return route.startsWith('/') ? route : `/${route}`
}

function slug(route) {
  const clean = route
    .replace(/^\/+/, '')
    .replace(/[?#&=:]+/g, '-')
    .replace(/\/+/g, '_')
  return clean === '' ? 'abertura' : clean.replace(/[^a-zA-Z0-9_-]/g, '')
}

async function newContext(browser, options) {
  const context = await browser.newContext({
    ...VIEWPORTS[options.viewport],
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: options.motion ? 'no-preference' : 'reduce',
  })
  if (options.role !== 'none') {
    const session = JSON.stringify({
      userId: DEMO_USER_IDS[options.role],
      startedAt: new Date().toISOString(),
    })
    // Inicia a sessão demonstrativa antes de o app carregar.
    await context.addInitScript((value) => {
      try {
        if (!window.localStorage.getItem('nexa:session')) {
          window.localStorage.setItem('nexa:session', value)
        }
      } catch {
        // Armazenamento indisponível: segue sem sessão.
      }
    }, session)
  }
  return context
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  await mkdir(options.out, { recursive: true })

  const browser = await chromium.launch()
  const results = []
  let hasPageError = false
  let context = await newContext(browser, options)

  try {
    for (const route of options.routes) {
      if (options.fresh) {
        await context.close()
        context = await newContext(browser, options)
      }
      const page = await context.newPage()
      const consoleErrors = []
      const pageErrors = []
      const failedRequests = []
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500))
      })
      page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 800)))
      page.on('requestfailed', (request) => {
        const url = request.url()
        // Falhas de mapa/tiles externos não são erros do app.
        if (!url.includes('tile.openstreetmap.org')) failedRequests.push(url.slice(0, 200))
      })

      const url = `${options.base}/#${route.startsWith('/') ? route : `/${route}`}`
      await page.goto(url, { waitUntil: 'load', timeout: 45_000 })
      await page.evaluate(() => document.fonts?.ready).catch(() => {})
      await page.waitForTimeout(options.wait)

      const file = path.join(
        options.out,
        `${options.name ? `${options.name}-` : ''}${slug(route)}-${options.viewport}.png`,
      )
      await page.screenshot({ path: file, fullPage: options.full })
      const finalUrl = page.url()
      await page.close()

      if (pageErrors.length > 0) hasPageError = true
      results.push({ route, file, finalUrl, consoleErrors, pageErrors, failedRequests })
    }
  } finally {
    await context.close()
    await browser.close()
  }

  console.log(JSON.stringify(results, null, 2))
  process.exitCode = hasPageError ? 1 : 0
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
