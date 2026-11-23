import type { Credential } from '@/types'

import { AppError } from './errors'

/**
 * Derivação de senha com PBKDF2-SHA256 (Web Crypto).
 * O app NUNCA armazena senhas em texto puro: guardamos apenas sal + derivação.
 */

export const PASSWORD_ALGORITHM = 'PBKDF2-SHA256' as const
export const PASSWORD_ITERATIONS = 120_000
const KEY_LENGTH_BITS = 256
const SALT_LENGTH_BYTES = 16

export const PASSWORD_MIN_LENGTH = 8

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * O Web Crypto só existe em contextos seguros (HTTPS ou localhost). Ao abrir o app por
 * HTTP em um IP da rede local, por exemplo, o login por senha fica indisponível — o acesso
 * rápido às contas demonstrativas continua funcionando, pois não depende de senha.
 */
export function isPasswordCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  if (!isPasswordCryptoAvailable()) {
    throw new AppError(
      'unavailable',
      'O acesso por senha exige uma conexão segura (HTTPS). Use o acesso rápido do modo demonstração ou abra o NEXA pelo endereço oficial.',
    )
  }
  const encoded = new TextEncoder().encode(password.normalize('NFKC'))
  const keyMaterial = await crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    KEY_LENGTH_BITS,
  )
  return new Uint8Array(bits)
}

export type PasswordHash = Pick<Credential, 'algorithm' | 'iterations' | 'salt' | 'hash'>

/** Gera sal aleatório e deriva a senha. */
export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = new Uint8Array(new ArrayBuffer(SALT_LENGTH_BYTES))
  crypto.getRandomValues(salt)
  const hash = await derive(password, salt, PASSWORD_ITERATIONS)
  return {
    algorithm: PASSWORD_ALGORITHM,
    iterations: PASSWORD_ITERATIONS,
    salt: toBase64(salt),
    hash: toBase64(hash),
  }
}

/** Confere a senha informada com a credencial armazenada (comparação em tempo constante). */
export async function verifyPassword(
  password: string,
  credential: Pick<Credential, 'iterations' | 'salt' | 'hash'>,
): Promise<boolean> {
  const expected = fromBase64(credential.hash)
  const actual = await derive(password, fromBase64(credential.salt), credential.iterations)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i += 1) diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0)
  return diff === 0
}

/**
 * Valida a política de senha. Retorna a mensagem de erro ou `null` quando a senha é aceita.
 * Política: mínimo de 8 caracteres, com pelo menos uma letra e um número.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  if (password.length > 128) return 'A senha deve ter no máximo 128 caracteres.'
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return 'A senha deve combinar letras e números.'
  }
  return null
}

/** Token aleatório seguro para URLs (ex.: redefinição de senha simulada). */
export function createSecureToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
