import { useQuery } from '@tanstack/react-query'
import { ChevronRight, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { DictationButton } from '@/components/accessibility'
import { ActionMenu, AppIcon, ConfirmDialog, DemoBadge, IconButton, notify } from '@/components/ui'
import { config } from '@/config'
import { useCurrentUser } from '@/contexts/AuthContext'
import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { repos } from '@/repositories'
import { AI_GREETING, AI_MODE, askAssistant, quickPromptsFor } from '@/services/ai/assistant'
import type { AIMessage } from '@/types'
import { cn } from '@/utils/cn'
import { nowISO } from '@/utils/clock'
import { createId } from '@/utils/id'

function TypingIndicator() {
  return (
    <div
      className="bg-nexa-50 inline-flex items-center gap-1.5 rounded-3xl rounded-bl-lg px-4 py-3.5"
      role="status"
      aria-label="A NEXA IA está escrevendo"
    >
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="bg-nexa-600 animate-pulse-soft size-2 rounded-full"
          style={{ animationDelay: `${dot * 180}ms` }}
        />
      ))}
    </div>
  )
}

function Bubble({ message, onRetry }: { message: AIMessage; onRetry?: () => void }) {
  const mine = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-2', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[88%] px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-line',
          mine
            ? 'bg-nexa-900 rounded-3xl rounded-br-lg text-white'
            : message.error
              ? 'bg-danger-50 text-danger-700 rounded-3xl rounded-bl-lg'
              : 'bg-nexa-50 text-ink-900 rounded-3xl rounded-bl-lg',
        )}
      >
        {message.content}
      </div>

      {message.references && message.references.length > 0 && (
        <ul className="flex w-full max-w-[88%] flex-col gap-1.5">
          {message.references.map((reference) => (
            <li key={`${reference.kind}-${reference.id}`}>
              <Link
                to={reference.to}
                className="bg-surface shadow-card hover:shadow-raised flex items-center gap-2 rounded-2xl px-3.5 py-2.5 transition-shadow"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-ink-900 block truncate text-sm font-bold">
                    {reference.title}
                  </span>
                  {reference.subtitle && (
                    <span className="text-ink-500 block truncate text-xs">
                      {reference.subtitle}
                    </span>
                  )}
                </span>
                <ChevronRight className="text-ink-400 size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {message.actions && message.actions.length > 0 && (
        <div className="flex max-w-full flex-wrap gap-2">
          {message.actions.map((action) => (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="border-nexa-800 text-nexa-900 hover:bg-nexa-50 inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-bold transition-colors"
            >
              {action.icon && <AppIcon name={action.icon} className="size-4" />}
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {message.error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-nexa-800 inline-flex items-center gap-1 text-[0.8125rem] font-bold"
        >
          <RotateCcw className="size-3.5" /> Tentar novamente
        </button>
      )}
    </div>
  )
}

/** NEXA IA: chat com histórico, sugestões rápidas e respostas que levam aos recursos do app. */
export default function AssistantPage() {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const history = useQuery({
    queryKey: ['ai', 'conversation', user.id],
    queryFn: () => repos.aiConversations.getMessages(),
    staleTime: Infinity,
  })
  const [messages, setMessages] = useState<AIMessage[] | null>(null)
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const { readerButton } = useAccessibilityPreferences()
  const prompts = quickPromptsFor(user)

  // Carrega o histórico uma única vez; depois a conversa vive no estado local.
  if (messages === null && history.data) setMessages(history.data)
  const conversation = messages ?? []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversation.length, thinking])

  const send = async (question: string) => {
    const content = question.trim().slice(0, config.limits.aiQuestionMaxLength)
    if (content === '' || thinking) return
    const userMessage: AIMessage = {
      id: createId('msg'),
      role: 'user',
      content,
      createdAt: nowISO(),
    }
    const previous = conversation
    setMessages([...previous, userMessage])
    setText('')
    setThinking(true)
    const answer = await askAssistant(content, previous, user)
    setMessages((current) => [...(current ?? []), answer])
    setThinking(false)
    // O histórico é salvo em segundo plano; falhas de gravação não interrompem a conversa.
    void repos.aiConversations.appendMessages([userMessage, answer]).catch(() => undefined)
  }

  // Pergunta recebida por link (ex.: "Conversar com a NEXA IA" no NEXA Business).
  const asked = useRef(false)
  const linkedQuestion = params.get('pergunta')
  useEffect(() => {
    if (!linkedQuestion || asked.current || messages === null) return
    asked.current = true
    setParams({}, { replace: true })
    void send(linkedQuestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedQuestion, messages])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void send(text)
  }

  const lastUserQuestion = [...conversation]
    .reverse()
    .find((message) => message.role === 'user')?.content

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col pb-[calc(var(--nexa-bottom-nav-height)+var(--nexa-safe-bottom))] lg:pb-0">
      <header className="pt-safe border-line flex items-center gap-3 border-b px-5 pb-3">
        <span className="bg-nexa-900 mt-3 flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="text-sun-300 size-5" aria-hidden />
        </span>
        <div className="mt-3 min-w-0 flex-1">
          <h1 className="text-ink-900 text-lg leading-tight font-extrabold">NEXA IA</h1>
          <p className="text-ink-500 text-xs">
            {AI_MODE === 'demo'
              ? 'Respostas simuladas com os dados do app'
              : 'Assistente conectada'}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {AI_MODE === 'demo' && <DemoBadge label="Modo demonstração" />}
          <ActionMenu
            label="Opções da conversa"
            actions={[
              {
                label: 'Limpar conversa',
                icon: <Trash2 className="size-4" />,
                tone: 'danger',
                onSelect: () => setConfirmClear(true),
              },
            ]}
            trigger={
              <IconButton label="Opções da conversa" size="sm">
                <Trash2 className="size-[1.125rem]" />
              </IconButton>
            }
          />
        </div>
      </header>

      <div
        className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', readerButton && 'pb-20')}
        aria-live="polite"
      >
        <div className="flex flex-col gap-4">
          <Bubble
            message={{ id: 'saudacao', role: 'assistant', content: AI_GREETING, createdAt: '' }}
          />

          {conversation.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              onRetry={lastUserQuestion ? () => void send(lastUserQuestion) : undefined}
            />
          ))}

          {thinking && <TypingIndicator />}

          {!thinking && (
            <div
              className="flex flex-col items-start gap-2"
              role="group"
              aria-label="Sugestões de perguntas"
            >
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => void send(prompt.prompt)}
                  className="border-line-strong bg-surface text-ink-800 hover:bg-cream-50 inline-flex min-h-11 items-center gap-2 rounded-3xl border px-4 py-2 text-left text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <AppIcon name={prompt.icon} className="text-nexa-800 size-4 shrink-0" />
                  {prompt.label}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {AI_MODE === 'live' && (
        <p className="border-line text-ink-500 border-t px-5 pt-2 text-[0.6875rem] leading-snug">
          Suas perguntas são enviadas a um serviço de IA externo para gerar a resposta, junto de
          dados públicos do aplicativo. Não informe dados pessoais.
        </p>
      )}

      <form
        onSubmit={submit}
        className={cn(
          'bg-canvas flex items-center gap-2 px-5 py-3',
          AI_MODE === 'demo' && 'border-line border-t',
        )}
      >
        <label htmlFor="pergunta-ia" className="sr-only">
          Sua pergunta
        </label>
        <input
          id="pergunta-ia"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={config.limits.aiQuestionMaxLength}
          placeholder="Digite sua pergunta…"
          autoComplete="off"
          enterKeyHint="send"
          className="border-line bg-surface text-ink-900 placeholder:text-ink-400 focus:border-nexa-600 focus:ring-nexa-100 h-12 min-w-0 flex-1 rounded-full border px-5 text-[0.9375rem] outline-none focus:ring-4"
        />
        <DictationButton
          field="a pergunta"
          onText={(spoken) =>
            setText((current) =>
              `${current} ${spoken}`.trim().slice(0, config.limits.aiQuestionMaxLength),
            )
          }
          onError={(message) => notify.warning(message)}
        />
        <IconButton
          type="submit"
          label="Enviar pergunta"
          variant="solid"
          size="lg"
          disabled={thinking || text.trim() === ''}
        >
          <Send className="size-5" />
        </IconButton>
      </form>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpar a conversa?"
        description="O histórico com a NEXA IA será apagado deste aparelho."
        confirmLabel="Limpar"
        tone="danger"
        onConfirm={async () => {
          await repos.aiConversations.clear()
          setMessages([])
        }}
      />
    </div>
  )
}
