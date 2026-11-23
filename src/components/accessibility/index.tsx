import { Mic, Square, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useMatches } from 'react-router'

import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { readableText } from '@/services/accessibility/describe'
import { playSound } from '@/services/accessibility/feedback'
import { isSpeechSupported, speak, stopSpeaking } from '@/services/accessibility/speech'
import { cn } from '@/utils/cn'

/**
 * COMPONENTES DE ACESSIBILIDADE
 * Peças pequenas usadas em todo o app: atalho para o conteúdo, anúncio de telas,
 * leitura em voz alta e ditado por voz.
 */

/** Identificador da rota que contém o layout do app (com a navegação inferior). */
export const APP_ROUTE_ID = 'app'

/** Primeiro item ao navegar por teclado: leva o foco direto ao conteúdo da tela. */
export function SkipLink() {
  return (
    <button
      type="button"
      onClick={() => {
        const main = document.querySelector<HTMLElement>('main')
        if (!main) return
        main.tabIndex = -1
        main.focus()
        main.scrollIntoView()
      }}
      className="bg-nexa-900 z-toast sr-only fixed top-3 left-3 rounded-full px-5 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed"
    >
      Pular para o conteúdo
    </button>
  )
}

function text(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Título da tela atual: o primeiro `h1`, seguido da aba ativa quando a área tem
 * várias telas com o mesmo título (NEXA Business e Administração).
 */
function currentScreenTitle(): string {
  const title = text(document.querySelector('main h1, h1'))
  const tab = text(document.querySelector('main header nav a[aria-current="page"]'))
  return title && tab && tab !== title ? `${title}, ${tab}` : title
}

/**
 * Anuncia a troca de tela — algo que um site de página única não faz sozinho:
 * atualiza o título do documento, avisa os leitores de tela por uma região viva e,
 * se a pessoa pediu, fala o nome da tela.
 */
export function RouteAnnouncer() {
  const location = useLocation()
  const { announceScreens } = useAccessibilityPreferences()
  const [message, setMessage] = useState('')
  const first = useRef(true)
  /** Última tela anunciada: filtros e abas mudam o endereço, mas não a tela. */
  const announced = useRef('')
  const announce = useRef(announceScreens)
  useEffect(() => {
    announce.current = announceScreens
  }, [announceScreens])

  useEffect(() => {
    let tries = 0
    const timer = window.setInterval(() => {
      const title = currentScreenTitle()
      tries += 1
      if (title === '' && tries < 14) return
      window.clearInterval(timer)
      document.title = title ? `${title} · NEXA` : 'NEXA — Conexões que transformam realidades'

      const isFirst = first.current
      first.current = false
      const key = `${location.pathname}|${title}`
      if (key === announced.current) return
      announced.current = key
      if (title === '') {
        setMessage('')
        return
      }
      // Na primeira tela o leitor de tela já anuncia o documento sozinho.
      if (!isFirst) setMessage(`Tela: ${title}`)
      if (announce.current) speak(`Tela: ${title}`)
    }, 140)
    return () => window.clearInterval(timer)
  }, [location.pathname, location.search])

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}

/**
 * Controla uma leitura em voz alta: começa, para e informa se está falando.
 * Só interrompe a fala que ele mesmo iniciou — avisos e anúncios de tela em andamento
 * não são cortados por um botão que não estava lendo nada.
 */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false)
  const active = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // A leitura iniciada por este botão não continua depois que ele sai da tela.
      if (active.current) stopSpeaking()
    }
  }, [])

  const stop = useCallback(() => {
    if (active.current) stopSpeaking()
  }, [])

  const start = useCallback((content: string) => {
    const ok = speak(content, {
      interrupt: true,
      onEnd: () => {
        active.current = false
        if (mounted.current) setSpeaking(false)
      },
    })
    active.current = ok
    setSpeaking(ok)
    return ok
  }, [])

  return { speaking, start, stop, supported: isSpeechSupported() }
}

interface SpeakButtonProps {
  /** Texto a ser falado (montado na hora, para refletir o estado atual). */
  text: () => string
  /** Descrição do que será ouvido (ex.: "Ouvir os detalhes da linha 101"). */
  label: string
  className?: string
}

/** Botão "Ouvir": lê em voz alta um trecho do conteúdo. Some se o aparelho não tiver voz. */
export function SpeakButton({ text: content, label, className }: SpeakButtonProps) {
  const { speaking, start, stop, supported } = useSpeaker()
  if (!supported) return null
  return (
    <button
      type="button"
      aria-label={speaking ? 'Parar a leitura' : label}
      aria-pressed={speaking}
      onClick={() => (speaking ? stop() : start(content()))}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-bold transition-colors',
        speaking ? 'bg-nexa-900 text-white' : 'bg-nexa-50 text-nexa-900 hover:bg-nexa-100',
        className,
      )}
    >
      {speaking ? (
        <Square className="size-3.5 fill-current" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
      {speaking ? 'Parar' : 'Ouvir'}
    </button>
  )
}

/**
 * Botão flutuante "Ouvir tela": lê o conteúdo principal do começo ao fim.
 * Aparece quando a opção está ligada em Acessibilidade.
 */
export function ReaderButton() {
  const { readerButton } = useAccessibilityPreferences()
  const location = useLocation()
  const insideApp = useMatches().some((match) => match.id === APP_ROUTE_ID)
  const { speaking, start, stop, supported } = useSpeaker()

  // Ao trocar de tela, a leitura da tela anterior para (outras falas seguem).
  useEffect(() => stop, [location.pathname, stop])

  if (!readerButton || !supported) return null
  return (
    <button
      type="button"
      data-no-read
      aria-pressed={speaking}
      onClick={() => {
        if (speaking) {
          stop()
          return
        }
        const content = readableText(document.querySelector('main'))
        start(content || 'Não há conteúdo para ler nesta tela.')
      }}
      className={cn(
        'shadow-float z-fab fixed left-4 inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors lg:right-10 lg:bottom-28 lg:left-auto',
        // No app, fica acima da navegação inferior e da linha dos botões de ação;
        // nas telas de entrada, encosta na base (elas reservam esse espaço).
        insideApp
          ? 'bottom-[calc(var(--nexa-bottom-nav-height)+var(--nexa-safe-bottom)+5.25rem)]'
          : 'bottom-[calc(var(--nexa-safe-bottom)+0.75rem)]',
        speaking ? 'bg-sun-400 text-ink-900' : 'bg-nexa-900 text-white',
      )}
    >
      {speaking ? (
        <Square className="size-4 fill-current" aria-hidden />
      ) : (
        <Volume2 className="size-5" aria-hidden />
      )}
      {speaking ? 'Parar leitura' : 'Ouvir tela'}
    </button>
  )
}

// ── Ditado por voz ───────────────────────────────────────────────────────────

interface RecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function isDictationSupported(): boolean {
  return recognitionConstructor() !== null
}

interface DictationButtonProps {
  /** Recebe cada trecho reconhecido (frase pronta). */
  onText: (text: string) => void
  /** Chamado quando o microfone é negado ou o reconhecimento falha. */
  onError?: (message: string) => void
  /** Nome do campo que receberá o texto (ex.: "a descrição"). */
  field: string
  className?: string
}

/**
 * Microfone ao lado de um campo: transforma a fala em texto, uma frase por toque.
 * Aparece quando o ditado está ligado em Acessibilidade e o navegador oferece
 * reconhecimento de voz — que é feito pelo navegador e pode enviar o áudio ao
 * serviço do fabricante.
 */
export function DictationButton({ onText, onError, field, className }: DictationButtonProps) {
  const { dictation } = useAccessibilityPreferences()
  const [listening, setListening] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const handlers = useRef({ onText, onError })
  useEffect(() => {
    handlers.current = { onText, onError }
  })

  useEffect(() => () => recognition.current?.abort(), [])

  const Constructor = recognitionConstructor()
  if (!dictation || !Constructor) return null

  const toggle = () => {
    if (listening) {
      recognition.current?.stop()
      return
    }
    // O microfone não deve captar a própria voz do aplicativo.
    stopSpeaking()
    const instance = new Constructor()
    instance.lang = 'pt-BR'
    // Uma frase por toque: no modo contínuo, alguns navegadores repetem o texto já entregue.
    instance.continuous = false
    instance.interimResults = false
    let delivered = ''
    instance.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result?.[0]?.transcript.trim()
        if (!result?.isFinal || !transcript || transcript === delivered) continue
        // Se o navegador reenviar o que já foi entregue, aproveita só o trecho novo.
        const fresh =
          delivered && transcript.startsWith(delivered)
            ? transcript.slice(delivered.length).trim()
            : transcript
        delivered = transcript
        if (fresh) handlers.current.onText(fresh)
      }
    }
    instance.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      handlers.current.onError?.(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Permita o uso do microfone para ditar o texto.'
          : 'Não foi possível reconhecer a fala agora. Tente de novo ou digite o texto.',
      )
    }
    instance.onend = () => {
      setListening(false)
      playSound('off')
    }
    recognition.current = instance
    try {
      instance.start()
      setListening(true)
      playSound('on')
    } catch {
      handlers.current.onError?.('Não foi possível iniciar o ditado neste aparelho.')
    }
  }

  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={listening ? 'Parar o ditado' : `Ditar ${field} por voz`}
      onClick={toggle}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
        listening
          ? 'bg-danger-600 animate-pulse-soft text-white'
          : 'bg-nexa-50 text-nexa-900 hover:bg-nexa-100',
        className,
      )}
    >
      <Mic className="size-5" aria-hidden />
    </button>
  )
}
