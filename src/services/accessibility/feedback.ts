import { getPreferences } from './preferences'
import { speak } from './speech'

/**
 * SONS, VIBRAÇÃO E AVISOS FALADOS
 * ─────────────────────────────────────────────────────────────────────────────
 * Os sons são gerados na hora pelo navegador (Web Audio): não há arquivos de áudio.
 * A vibração depende do aparelho — funciona na maioria dos celulares Android e não
 * está disponível no iPhone.
 */

export type SoundName = 'success' | 'error' | 'notice' | 'alert' | 'on' | 'off'

/** Nota: [frequência em Hz, duração em segundos, pausa depois]. */
type Note = readonly [frequency: number, duration: number, gap?: number]

const SOUNDS: Record<SoundName, { wave: OscillatorType; notes: Note[] }> = {
  success: {
    wave: 'sine',
    notes: [
      [660, 0.11],
      [880, 0.16],
    ],
  },
  error: {
    wave: 'triangle',
    notes: [
      [220, 0.16, 0.05],
      [196, 0.22],
    ],
  },
  notice: { wave: 'sine', notes: [[587, 0.14]] },
  alert: {
    wave: 'square',
    notes: [
      [880, 0.12, 0.07],
      [880, 0.12, 0.07],
      [1047, 0.2],
    ],
  },
  on: {
    wave: 'sine',
    notes: [
      [523, 0.08],
      [784, 0.12],
    ],
  },
  off: {
    wave: 'sine',
    notes: [
      [784, 0.08],
      [523, 0.12],
    ],
  },
}

/** Padrões de vibração em milissegundos (vibra, pausa, vibra…). */
const VIBRATIONS: Record<SoundName, number[]> = {
  success: [40],
  error: [120, 60, 120],
  notice: [30],
  alert: [200, 80, 200, 80, 300],
  on: [25],
  off: [25],
}

let audio: AudioContext | null = null

export function isSoundSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined'
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** Toca um som curto, se os sons estiverem ligados (ou sempre, com `force`). */
export function playSound(name: SoundName, options: { force?: boolean } = {}): void {
  const prefs = getPreferences()
  if ((!prefs.sounds && !options.force) || !isSoundSupported()) return
  try {
    audio ??= new AudioContext()
    // O navegador só libera o áudio depois de um toque; se ainda estiver suspenso, tenta retomar.
    if (audio.state === 'suspended') void audio.resume()
    const volume = Math.max(0.05, prefs.soundVolume) * 0.35
    let start = audio.currentTime + 0.01
    for (const [frequency, duration, gap = 0.02] of SOUNDS[name].notes) {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = SOUNDS[name].wave
      oscillator.frequency.value = frequency
      // Ataque e queda suaves evitam estalos.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
      start += duration + gap
    }
  } catch {
    // Áudio indisponível: o aviso visual continua valendo.
  }
}

/** Vibra o aparelho, se a vibração estiver ligada (ou sempre, com `force`). */
export function vibrate(name: SoundName, options: { force?: boolean } = {}): boolean {
  if ((!getPreferences().haptics && !options.force) || !isVibrationSupported()) return false
  try {
    return navigator.vibrate(VIBRATIONS[name])
  } catch {
    return false
  }
}

export type NoticeKind = 'success' | 'error' | 'info' | 'warning'

const NOTICE_SOUND: Record<NoticeKind, SoundName> = {
  success: 'success',
  error: 'error',
  info: 'notice',
  warning: 'notice',
}

const NOTICE_PREFIX: Record<NoticeKind, string> = {
  success: '',
  error: 'Erro: ',
  info: '',
  warning: 'Atenção: ',
}

/**
 * Acompanha um aviso temporário da tela com som, vibração e fala, conforme as
 * preferências. Chamado por `notify` (ver `components/ui/toast.tsx`).
 */
export function signalNotice(kind: NoticeKind, message: string, description?: string): void {
  playSound(NOTICE_SOUND[kind])
  vibrate(NOTICE_SOUND[kind])
  if (getPreferences().speakNotices) {
    speak(`${NOTICE_PREFIX[kind]}${message}${description ? `. ${description}` : ''}`)
  }
}

/**
 * Alerta de atenção imediata (ex.: barreira no caminho). O chamador decide se o
 * alerta deve acontecer; aqui ele sempre soa, vibra e é falado, interrompendo a fala atual.
 */
export function signalAlert(message: string): void {
  playSound('alert', { force: true })
  vibrate('alert', { force: true })
  speak(message, { interrupt: true })
}
