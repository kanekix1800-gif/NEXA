/**
 * PREFERÊNCIAS DE ACESSIBILIDADE DO APARELHO
 * ─────────────────────────────────────────────────────────────────────────────
 * Valem para o aparelho inteiro — inclusive antes de entrar na conta — e ficam
 * guardadas somente nele (localStorage). Nunca são enviadas a lugar nenhum e não
 * fazem parte dos dados da conta: restaurar a base demonstrativa não as apaga.
 *
 * Este módulo não depende do React: os demais serviços (voz, sons, vibração) leem
 * as preferências atuais por `getPreferences()`.
 */

export type TextScale = 'normal' | 'large' | 'xlarge'
export type ContrastMode = 'normal' | 'high'
export type ReadingFont = 'default' | 'legible' | 'dyslexia'
export type MotionMode = 'system' | 'reduced'

/** O que a pessoa quer ver em destaque ao se deslocar pela cidade. */
export type MobilityHighlight = 'step_free' | 'accessible_transit' | 'audio_tactile' | 'libras'

export interface AccessibilityPreferences {
  // ── Visão e leitura ──
  textScale: TextScale
  contrast: ContrastMode
  font: ReadingFont
  /** Mais espaço entre letras, palavras e linhas. */
  textSpacing: boolean
  /** Contorno de foco mais grosso e links sublinhados. */
  strongFocus: boolean

  // ── Movimento e tempo ──
  motion: MotionMode
  /** Avisos temporários ficam mais tempo na tela. */
  longerNotices: boolean

  // ── Voz ──
  /** Fala o nome de cada tela ao abrir. */
  announceScreens: boolean
  /** Fala o item tocado ou focado. */
  speakOnTouch: boolean
  /** Fala avisos e confirmações. */
  speakNotices: boolean
  /** Mostra o botão "Ouvir tela" em todas as telas. */
  readerButton: boolean
  /** Voz escolhida (identificador do navegador) ou `null` para a voz padrão em português. */
  voiceURI: string | null
  /** Velocidade da fala (0,6 a 2). */
  speechRate: number
  /** Tom da voz (0,5 a 1,5). */
  speechPitch: number

  // ── Sons e vibração ──
  sounds: boolean
  /** Volume dos sons (0 a 1). */
  soundVolume: number
  haptics: boolean

  // ── Ditado por voz ──
  dictation: boolean

  // ── Mobilidade ──
  highlights: MobilityHighlight[]
  /**
   * A pessoa quer ser avisada das barreiras no caminho: mostra-as no mapa e lembra a
   * escolha na aba Alertas (o acompanhamento da posição começa lá, com um toque).
   */
  proximityAlerts: boolean
}

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textScale: 'normal',
  contrast: 'normal',
  font: 'default',
  textSpacing: false,
  strongFocus: false,
  motion: 'system',
  longerNotices: false,
  announceScreens: false,
  speakOnTouch: false,
  speakNotices: false,
  readerButton: false,
  voiceURI: null,
  speechRate: 1,
  speechPitch: 1,
  sounds: false,
  soundVolume: 0.6,
  haptics: false,
  dictation: false,
  highlights: [],
  proximityAlerts: false,
}

export const SPEECH_RATE_RANGE = { min: 0.6, max: 2, step: 0.1 } as const
export const SPEECH_PITCH_RANGE = { min: 0.5, max: 1.5, step: 0.1 } as const

const STORAGE_KEY = 'nexa:acessibilidade'

const TEXT_SCALES: TextScale[] = ['normal', 'large', 'xlarge']
const FONTS: ReadingFont[] = ['default', 'legible', 'dyslexia']
const HIGHLIGHTS: MobilityHighlight[] = [
  'step_free',
  'accessible_transit',
  'audio_tactile',
  'libras',
]

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100))
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Converte qualquer valor (por exemplo, o que estava gravado por uma versão anterior)
 * em preferências válidas: campos desconhecidos são ignorados e valores inválidos
 * voltam ao padrão.
 */
export function sanitizePreferences(value: unknown): AccessibilityPreferences {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const defaults = DEFAULT_PREFERENCES
  const highlights = Array.isArray(raw.highlights)
    ? HIGHLIGHTS.filter((item) => (raw.highlights as unknown[]).includes(item))
    : defaults.highlights
  return {
    textScale: TEXT_SCALES.includes(raw.textScale as TextScale)
      ? (raw.textScale as TextScale)
      : defaults.textScale,
    contrast: raw.contrast === 'high' ? 'high' : 'normal',
    font: FONTS.includes(raw.font as ReadingFont) ? (raw.font as ReadingFont) : defaults.font,
    textSpacing: flag(raw.textSpacing, defaults.textSpacing),
    strongFocus: flag(raw.strongFocus, defaults.strongFocus),
    motion: raw.motion === 'reduced' ? 'reduced' : 'system',
    longerNotices: flag(raw.longerNotices, defaults.longerNotices),
    announceScreens: flag(raw.announceScreens, defaults.announceScreens),
    speakOnTouch: flag(raw.speakOnTouch, defaults.speakOnTouch),
    speakNotices: flag(raw.speakNotices, defaults.speakNotices),
    readerButton: flag(raw.readerButton, defaults.readerButton),
    voiceURI: typeof raw.voiceURI === 'string' && raw.voiceURI !== '' ? raw.voiceURI : null,
    speechRate: clamp(
      raw.speechRate,
      SPEECH_RATE_RANGE.min,
      SPEECH_RATE_RANGE.max,
      defaults.speechRate,
    ),
    speechPitch: clamp(
      raw.speechPitch,
      SPEECH_PITCH_RANGE.min,
      SPEECH_PITCH_RANGE.max,
      defaults.speechPitch,
    ),
    sounds: flag(raw.sounds, defaults.sounds),
    soundVolume: clamp(raw.soundVolume, 0, 1, defaults.soundVolume),
    haptics: flag(raw.haptics, defaults.haptics),
    dictation: flag(raw.dictation, defaults.dictation),
    highlights,
    proximityAlerts: flag(raw.proximityAlerts, defaults.proximityAlerts),
  }
}

function readStored(): AccessibilityPreferences {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    return sanitizePreferences(stored ? JSON.parse(stored) : null)
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

let current: AccessibilityPreferences = readStored()
const listeners = new Set<() => void>()

/** Preferências atuais (objeto estável: só muda de referência quando algo muda). */
export function getPreferences(): AccessibilityPreferences {
  return current
}

export function subscribeToPreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function commit(next: AccessibilityPreferences): AccessibilityPreferences {
  current = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sem armazenamento (ex.: navegação privada): vale apenas enquanto a página estiver aberta.
  }
  for (const listener of listeners) listener()
  return next
}

/** Altera uma ou mais preferências e grava no aparelho. */
export function updatePreferences(
  patch: Partial<AccessibilityPreferences>,
): AccessibilityPreferences {
  return commit(sanitizePreferences({ ...current, ...patch }))
}

/** Volta todas as preferências ao padrão. */
export function resetPreferences(): AccessibilityPreferences {
  return commit({ ...DEFAULT_PREFERENCES })
}

/** Quantas opções estão diferentes do padrão (para mostrar "3 opções ativas"). */
export function countActivePreferences(prefs: AccessibilityPreferences): number {
  const defaults = DEFAULT_PREFERENCES
  let count = 0
  for (const key of Object.keys(defaults) as Array<keyof AccessibilityPreferences>) {
    // Ajustes finos da voz e do volume não contam como "opção ativa".
    if (
      key === 'voiceURI' ||
      key === 'speechRate' ||
      key === 'speechPitch' ||
      key === 'soundVolume'
    ) {
      continue
    }
    if (key === 'highlights') count += prefs.highlights.length
    else if (prefs[key] !== defaults[key]) count += 1
  }
  return count
}

// ── Efeitos visuais ──────────────────────────────────────────────────────────

/**
 * Aplica as preferências visuais ao documento, como atributos `data-*` no <html>.
 * Os estilos correspondentes ficam em `src/styles/index.css`.
 */
export function applyToDocument(prefs: AccessibilityPreferences, root: HTMLElement): void {
  const set = (name: string, value: string | null) => {
    if (value === null) delete root.dataset[name]
    else root.dataset[name] = value
  }
  set('textScale', prefs.textScale === 'normal' ? null : prefs.textScale)
  set('contrast', prefs.contrast === 'high' ? 'high' : null)
  set('font', prefs.font === 'default' ? null : prefs.font)
  set('textSpacing', prefs.textSpacing ? 'wide' : null)
  set('focus', prefs.strongFocus ? 'strong' : null)
  set('motion', prefs.motion === 'reduced' ? 'reduce' : null)
}

// ── Perfis prontos ───────────────────────────────────────────────────────────

export type PresetKey = 'blind' | 'low_vision' | 'deaf' | 'motor' | 'reading' | 'calm'

export interface AccessibilityPreset {
  key: PresetKey
  title: string
  description: string
  /** Opções ligadas pelo perfil (as demais não são alteradas). */
  patch: Partial<AccessibilityPreferences>
}

export const PRESETS: AccessibilityPreset[] = [
  {
    key: 'blind',
    title: 'Sou cego(a)',
    description:
      'Fala as telas, os itens tocados e os avisos; liga sons, vibração e alertas de barreiras.',
    patch: {
      announceScreens: true,
      speakOnTouch: true,
      speakNotices: true,
      readerButton: true,
      sounds: true,
      haptics: true,
      longerNotices: true,
      dictation: true,
      proximityAlerts: true,
      highlights: ['audio_tactile', 'accessible_transit'],
    },
  },
  {
    key: 'low_vision',
    title: 'Tenho baixa visão',
    description: 'Texto muito grande, alto contraste, foco realçado e o botão "Ouvir tela".',
    patch: {
      textScale: 'xlarge',
      contrast: 'high',
      strongFocus: true,
      readerButton: true,
      longerNotices: true,
      highlights: ['audio_tactile'],
    },
  },
  {
    key: 'deaf',
    title: 'Sou surdo(a) ou ouço pouco',
    description:
      'Vibração no lugar dos sons, avisos por mais tempo e destaque para atendimento em Libras.',
    patch: {
      haptics: true,
      sounds: false,
      longerNotices: true,
      highlights: ['libras'],
    },
  },
  {
    key: 'motor',
    title: 'Uso cadeira de rodas ou tenho mobilidade reduzida',
    description: 'Destaca caminhos sem degraus e ônibus acessíveis; texto maior e ditado por voz.',
    patch: {
      textScale: 'large',
      longerNotices: true,
      dictation: true,
      highlights: ['step_free', 'accessible_transit'],
    },
  },
  {
    key: 'reading',
    title: 'Tenho dislexia ou dificuldade de leitura',
    description: 'Fonte própria para dislexia, avisos por mais tempo e o botão "Ouvir tela".',
    patch: {
      font: 'dyslexia',
      readerButton: true,
      longerNotices: true,
    },
  },
  {
    key: 'calm',
    title: 'Sou sensível a movimento',
    description: 'Desliga animações e transições e deixa os avisos por mais tempo.',
    patch: {
      motion: 'reduced',
      longerNotices: true,
    },
  },
]

/** Indica se todas as opções do perfil já estão ligadas. */
export function isPresetActive(
  prefs: AccessibilityPreferences,
  preset: AccessibilityPreset,
): boolean {
  return (Object.keys(preset.patch) as Array<keyof AccessibilityPreferences>).every((key) => {
    const wanted = preset.patch[key]
    if (key === 'highlights') {
      return (wanted as MobilityHighlight[]).every((item) => prefs.highlights.includes(item))
    }
    return prefs[key] === wanted
  })
}

/** Liga as opções do perfil, somando os destaques de mobilidade aos já escolhidos. */
export function applyPreset(preset: AccessibilityPreset): AccessibilityPreferences {
  const highlights = [...new Set([...current.highlights, ...(preset.patch.highlights ?? [])])]
  return updatePreferences({ ...preset.patch, highlights })
}

/** Desliga as opções do perfil, devolvendo cada uma ao valor padrão. */
export function clearPreset(preset: AccessibilityPreset): AccessibilityPreferences {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(preset.patch) as Array<keyof AccessibilityPreferences>) {
    patch[key] = DEFAULT_PREFERENCES[key]
  }
  const removed = preset.patch.highlights ?? []
  patch.highlights = current.highlights.filter((item) => !removed.includes(item))
  return updatePreferences(patch as Partial<AccessibilityPreferences>)
}
