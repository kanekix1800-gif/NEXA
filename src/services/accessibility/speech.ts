import { getPreferences } from './preferences'

/**
 * VOZ (leitura em voz alta)
 * ─────────────────────────────────────────────────────────────────────────────
 * Usa a síntese de voz do próprio navegador (Web Speech API): nada é enviado para
 * fora do aparelho por este módulo. As vozes disponíveis dependem do sistema.
 *
 * Quem já usa um leitor de tela (TalkBack, VoiceOver, NVDA) não precisa destas
 * opções: elas existem para quem quer ouvir o app sem configurar um leitor.
 */

export interface VoiceOption {
  uri: string
  name: string
  lang: string
  /** Voz instalada no aparelho (funciona sem internet). */
  local: boolean
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null
}

export function isSpeechSupported(): boolean {
  return synth() !== null && typeof SpeechSynthesisUtterance !== 'undefined'
}

function isPortuguese(lang: string): boolean {
  return lang.toLowerCase().replace('_', '-').startsWith('pt')
}

function isBrazilian(lang: string): boolean {
  return lang.toLowerCase().replace('_', '-') === 'pt-br'
}

/** Ordena as vozes em português: Brasil primeiro e, entre iguais, as instaladas no aparelho. */
export function sortPortugueseVoices<
  T extends { lang: string; localService: boolean; name: string },
>(voices: readonly T[]): T[] {
  return voices
    .filter((voice) => isPortuguese(voice.lang))
    .sort(
      (a, b) =>
        Number(isBrazilian(b.lang)) - Number(isBrazilian(a.lang)) ||
        Number(b.localService) - Number(a.localService) ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
}

function portugueseVoices(): SpeechSynthesisVoice[] {
  return sortPortugueseVoices(synth()?.getVoices() ?? [])
}

/**
 * Vozes em português disponíveis no aparelho. Em vários navegadores a lista chega
 * com atraso, por isso a função espera um pouco antes de desistir.
 */
export function loadVoices(timeoutMs = 1500): Promise<VoiceOption[]> {
  const engine = synth()
  const toOptions = (): VoiceOption[] =>
    portugueseVoices().map((voice) => ({
      uri: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      local: voice.localService,
    }))
  if (!engine) return Promise.resolve([])
  if (engine.getVoices().length > 0) return Promise.resolve(toOptions())

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      engine.removeEventListener?.('voiceschanged', finish)
      resolve(toOptions())
    }
    const timer = setTimeout(finish, timeoutMs)
    engine.addEventListener?.('voiceschanged', finish)
  })
}

/**
 * Divide um texto longo em trechos curtos, cortando em fim de frase sempre que
 * possível. Alguns navegadores interrompem falas muito longas no meio.
 */
export function splitForSpeech(text: string, maxLength = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean === '') return []
  const sentences = clean.match(/[^.!?;:]+[.!?;:]*\s*/g) ?? [clean]
  const chunks: string[] = []
  let buffer = ''
  const flush = () => {
    if (buffer.trim() !== '') chunks.push(buffer.trim())
    buffer = ''
  }
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      flush()
      // Frase maior que o limite: corta em espaços.
      let rest = sentence.trim()
      while (rest.length > maxLength) {
        const cut = rest.lastIndexOf(' ', maxLength)
        const at = cut > 0 ? cut : maxLength
        chunks.push(rest.slice(0, at).trim())
        rest = rest.slice(at).trim()
      }
      buffer = rest
      continue
    }
    if ((buffer + sentence).length > maxLength) flush()
    buffer += sentence
  }
  flush()
  return chunks
}

export interface SpeakOptions {
  /** Interrompe o que estiver sendo falado (padrão: entra na fila). */
  interrupt?: boolean
  /**
   * Chamado uma única vez quando esta fala termina — porque chegou ao fim, porque
   * outra fala a interrompeu ou porque `stopSpeaking()` foi chamado.
   */
  onEnd?: () => void
}

/**
 * Fala que tem alguém esperando o fim (um botão "Ouvir" mostrando "Parar").
 * Só existe uma por vez: uma nova fala com `onEnd` ou com `interrupt` encerra a anterior.
 */
let activeEnd: (() => void) | null = null

function settle(): void {
  const end = activeEnd
  activeEnd = null
  end?.()
}

/** Fala um texto com a voz, a velocidade e o tom escolhidos nas preferências. */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  const engine = synth()
  const chunks = splitForSpeech(text)
  if (!engine || !isSpeechSupported() || chunks.length === 0) {
    options.onEnd?.()
    return false
  }
  if (options.interrupt) {
    // Quem estava sendo ouvido é avisado na hora: o navegador nem sempre dispara
    // o fim de uma fala cancelada.
    settle()
    engine.cancel()
  } else if (options.onEnd) {
    settle()
  }

  const prefs = getPreferences()
  const voices = portugueseVoices()
  const voice = voices.find((candidate) => candidate.voiceURI === prefs.voiceURI) ?? voices[0]
  const onEnd = options.onEnd
  if (onEnd) activeEnd = onEnd

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk)
    utterance.lang = voice?.lang ?? 'pt-BR'
    if (voice) utterance.voice = voice
    utterance.rate = prefs.speechRate
    utterance.pitch = prefs.speechPitch
    if (index === chunks.length - 1 && onEnd) {
      const done = () => {
        // Só encerra se esta ainda for a fala em andamento.
        if (activeEnd === onEnd) settle()
      }
      utterance.onend = done
      utterance.onerror = done
    }
    engine.speak(utterance)
  })
  return true
}

/** Interrompe qualquer fala em andamento. */
export function stopSpeaking(): void {
  settle()
  synth()?.cancel()
}

export function isSpeaking(): boolean {
  const engine = synth()
  return Boolean(engine && (engine.speaking || engine.pending))
}

let unlocked = false

/**
 * Libera a voz no iPhone. O Safari ignora, em silêncio, qualquer fala iniciada fora
 * de um toque enquanto a página ainda não tiver falado DENTRO de um toque. Chamada
 * no primeiro toque da pessoa, esta função faz uma fala vazia e inaudível — a partir
 * daí, anúncios de tela, avisos e alertas de barreira podem ser falados.
 */
export function unlockSpeech(): void {
  const engine = synth()
  if (unlocked || !engine || !isSpeechSupported()) return
  unlocked = true
  try {
    // Sem `cancel()`: não pode cortar uma fala que esteja em andamento.
    const silent = new SpeechSynthesisUtterance('')
    silent.volume = 0
    engine.speak(silent)
  } catch {
    // Navegador sem suporte completo: as falas iniciadas por toque continuam funcionando.
  }
}
