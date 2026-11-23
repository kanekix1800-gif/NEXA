import { describeElement } from './describe'
import { applyToDocument, getPreferences, subscribeToPreferences } from './preferences'
import { speak, unlockSpeech } from './speech'

/**
 * INICIALIZAÇÃO DA ACESSIBILIDADE
 * ─────────────────────────────────────────────────────────────────────────────
 * Chamada uma única vez, antes de a interface ser desenhada: aplica as preferências
 * visuais guardadas (sem "piscar" a tela no tamanho padrão), carrega a fonte
 * escolhida e liga a leitura do item tocado ou focado.
 */

/** As fontes alternativas só são baixadas quando escolhidas. */
const FONT_LOADERS = {
  legible: () =>
    Promise.all([
      import('@fontsource/atkinson-hyperlegible/latin-400.css'),
      import('@fontsource/atkinson-hyperlegible/latin-700.css'),
    ]),
  dyslexia: () =>
    Promise.all([
      import('@fontsource/opendyslexic/latin-400.css'),
      import('@fontsource/opendyslexic/latin-700.css'),
    ]),
} as const

const loadedFonts = new Set<string>()

function ensureFont(font: keyof typeof FONT_LOADERS | 'default'): void {
  if (font === 'default' || loadedFonts.has(font)) return
  loadedFonts.add(font)
  FONT_LOADERS[font]().catch(() => {
    // Sem conexão na primeira vez: tenta de novo na próxima mudança.
    loadedFonts.delete(font)
  })
}

/** Intervalo em que o mesmo item não é falado de novo (toque seguido de foco). */
const REPEAT_WINDOW_MS = 900

let started = false

export function startAccessibility(): void {
  if (started || typeof document === 'undefined') return
  started = true

  const apply = () => {
    const prefs = getPreferences()
    applyToDocument(prefs, document.documentElement)
    ensureFont(prefs.font)
  }
  apply()
  subscribeToPreferences(apply)

  let lastSpoken: { text: string; at: number } | null = null
  const speakTarget = (target: EventTarget | null) => {
    if (!getPreferences().speakOnTouch) return
    const text = describeElement(target)
    if (!text) return
    const now = Date.now()
    if (lastSpoken && lastSpoken.text === text && now - lastSpoken.at < REPEAT_WINDOW_MS) return
    lastSpoken = { text, at: now }
    speak(text, { interrupt: true })
  }

  // Primeiro toque da pessoa: libera a voz para os anúncios que não partem de um toque
  // (nome da tela, avisos, alertas de barreira). Ver `unlockSpeech`.
  const unlock = () => {
    unlockSpeech()
    document.removeEventListener('touchend', unlock, true)
    document.removeEventListener('click', unlock, true)
  }
  document.addEventListener('touchend', unlock, true)
  document.addEventListener('click', unlock, true)

  // `pointerup` (e não `pointerdown`): rolar a tela cancela o toque e não dispara a leitura.
  document.addEventListener('pointerup', (event) => speakTarget(event.target), true)
  document.addEventListener('focusin', (event) => speakTarget(event.target), true)
}
