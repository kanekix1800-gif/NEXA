import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { resetClock } from '@/utils/clock'

/**
 * Configuração global dos testes automatizados (Vitest + Testing Library).
 * O Web Crypto (PBKDF2) usado nas senhas é fornecido pelo próprio Node.
 */

// APIs de navegador ausentes no jsdom.
if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }),
    })
  }

  class ObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return []
    }
  }
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= ObserverStub
  globals.IntersectionObserver ??= ObserverStub

  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = vi.fn()
  }
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetClock()
})
