import type { IncomingMessage, ServerResponse } from 'node:http'

import Anthropic from '@anthropic-ai/sdk'

import {
  answerChat,
  ChatInputError,
  createRateLimiter,
  LIMITS,
  parseChatRequest,
  type CreateMessage,
} from './chat.ts'

/**
 * NEXA IA — camada HTTP.
 *
 *   GET  /health  → situação do serviço (sem dados sensíveis)
 *   POST /chat    → { question, history, context } → { content }
 *
 * Só atende páginas das origens autorizadas (CORS), limita o tamanho e a frequência dos
 * pedidos e nunca devolve ao navegador detalhes do provedor de IA.
 */

export interface HandlerOptions {
  createMessage: CreateMessage
  model: string
  /** Origens (esquema + domínio, sem caminho) que podem usar o serviço. */
  allowedOrigins: string[]
  /** Pedidos por minuto aceitos de um mesmo endereço. */
  requestsPerMinute?: number
  log?: (line: string) => void
}

/** Corpo grande demais. */
class BodyTooLargeError extends Error {}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      // Acima do limite nada mais é guardado; o restante é lido só para poder responder 413.
      if (size <= maxBytes) chunks.push(chunk)
      // Muito acima do limite: encerra a conexão em vez de continuar lendo.
      else if (size > maxBytes * 8) req.destroy()
    })
    req.on('end', () => {
      if (size > maxBytes) reject(new BodyTooLargeError())
      else resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
    // Conexão encerrada antes do fim do envio (sem efeito se a leitura já terminou).
    req.on('close', () => reject(new BodyTooLargeError()))
  })
}

export function createHandler(options: HandlerOptions) {
  const allow = createRateLimiter(options.requestsPerMinute ?? 30, 60_000)
  const log = options.log ?? ((line: string) => console.log(line))

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const started = Date.now()
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const origin = req.headers.origin
    const originAllowed = origin !== undefined && options.allowedOrigins.includes(origin)

    const send = (status: number, body?: unknown, extra: Record<string, string> = {}) => {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Origin',
        ...extra,
      }
      if (originAllowed) headers['Access-Control-Allow-Origin'] = origin
      if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8'
      res.writeHead(status, headers)
      res.end(body === undefined ? undefined : JSON.stringify(body))
      // O registro nunca inclui o conteúdo das mensagens.
      log(`${req.method} ${path} ${status} ${Date.now() - started}ms`)
    }

    if (path === '/health' && req.method === 'GET') {
      send(200, { ok: true, provider: 'anthropic', model: options.model })
      return
    }

    if (path !== '/chat') {
      send(404, { error: 'not_found', message: 'Rota inexistente.' })
      return
    }

    if (!originAllowed) {
      send(403, { error: 'origin_not_allowed', message: 'Origem não autorizada.' })
      return
    }

    if (req.method === 'OPTIONS') {
      send(204, undefined, {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      })
      return
    }

    if (req.method !== 'POST') {
      send(405, { error: 'method_not_allowed', message: 'Use POST.' }, { Allow: 'POST, OPTIONS' })
      return
    }

    if (!(req.headers['content-type'] ?? '').includes('application/json')) {
      send(415, { error: 'unsupported_media_type', message: 'Envie o pedido em JSON.' })
      return
    }

    if (!allow(req.socket.remoteAddress ?? 'desconhecido')) {
      send(
        429,
        {
          error: 'rate_limited',
          message: 'Muitas perguntas em pouco tempo. Tente novamente em instantes.',
        },
        { 'Retry-After': '60' },
      )
      return
    }

    try {
      const raw = await readBody(req, LIMITS.bodyMaxBytes)
      let body: unknown
      try {
        body = JSON.parse(raw)
      } catch {
        throw new ChatInputError('O corpo do pedido não é um JSON válido.')
      }
      const answer = await answerChat(parseChatRequest(body), {
        createMessage: options.createMessage,
        model: options.model,
      })
      send(200, { content: answer.content })
    } catch (error) {
      if (error instanceof ChatInputError) {
        send(400, { error: 'invalid_request', message: error.message })
      } else if (error instanceof BodyTooLargeError) {
        send(413, { error: 'payload_too_large', message: 'Pedido grande demais.' })
      } else if (error instanceof Anthropic.RateLimitError) {
        log('[nexa-ia] limite do provedor de IA atingido')
        send(
          429,
          {
            error: 'provider_busy',
            message: 'A assistente está ocupada. Tente novamente em instantes.',
          },
          { 'Retry-After': '30' },
        )
      } else if (error instanceof Anthropic.AuthenticationError) {
        log('[nexa-ia] credencial do provedor de IA recusada: confira ANTHROPIC_API_KEY')
        send(502, {
          error: 'provider_unavailable',
          message: 'A assistente está indisponível no momento.',
        })
      } else if (error instanceof Anthropic.APIError) {
        log(`[nexa-ia] erro do provedor de IA (status ${error.status ?? 'sem status'})`)
        send(502, {
          error: 'provider_unavailable',
          message: 'A assistente está indisponível no momento.',
        })
      } else {
        log(
          `[nexa-ia] falha inesperada: ${error instanceof Error ? error.name : 'erro desconhecido'}`,
        )
        send(500, { error: 'internal_error', message: 'Não foi possível responder agora.' })
      }
    }
  }
}
