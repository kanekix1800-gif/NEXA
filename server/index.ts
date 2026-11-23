import { createServer } from 'node:http'

import Anthropic from '@anthropic-ai/sdk'

import { createHandler } from './http.ts'

/**
 * NEXA IA — serviço opcional que liga a assistente a um modelo de IA de verdade.
 *
 *   npm run ai:server        (lê as variáveis do arquivo .env, se existir)
 *
 * Sem este serviço o aplicativo continua funcionando: a NEXA IA responde no modo
 * demonstrativo, com regras locais. Variáveis: ver `.env.example`.
 */

const env = (name: string): string => process.env[name]?.trim() ?? ''

const provider = env('AI_PROVIDER') || 'anthropic'
if (provider !== 'anthropic') {
  console.error(`[nexa-ia] Provedor "${provider}" não suportado. Use AI_PROVIDER=anthropic.`)
  process.exit(1)
}

if (!env('ANTHROPIC_API_KEY') && !env('ANTHROPIC_AUTH_TOKEN')) {
  console.warn(
    '[nexa-ia] ANTHROPIC_API_KEY não definida: as perguntas vão falhar até que a credencial seja configurada no servidor.',
  )
}

const model = env('AI_MODEL') || 'claude-opus-5-5'
const port = Number(env('AI_PORT') || env('PORT')) || 8787
const requestsPerMinute = Number(env('AI_RATE_LIMIT_PER_MINUTE')) || 30
const allowedOrigins = (env('AI_ALLOWED_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

// A credencial é lida do ambiente pelo próprio SDK; ela nunca é enviada ao navegador.
// O tempo limite fica abaixo do que a interface espera antes de voltar ao modo demonstrativo.
const client = new Anthropic({ timeout: 40_000, maxRetries: 1 })

const handle = createHandler({
  createMessage: (params) => client.beta.messages.create(params),
  model,
  allowedOrigins,
  requestsPerMinute,
})

createServer((req, res) => void handle(req, res)).listen(port, () => {
  console.log(`[nexa-ia] ouvindo em http://localhost:${port} · modelo ${model}`)
  console.log(`[nexa-ia] origens autorizadas: ${allowedOrigins.join(', ')}`)
})
