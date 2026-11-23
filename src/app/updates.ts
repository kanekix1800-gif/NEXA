/**
 * ATUALIZAÇÕES DO SITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Quando uma nova versão é publicada, os arquivos da versão anterior deixam de existir
 * no servidor. Uma página que ficou aberta precisa ser recarregada para não tentar abrir
 * telas que já não estão lá.
 */

const RELOAD_KEY = 'nexa:recarregado-em'
const MIN_INTERVAL_MS = 20_000

/**
 * Recarrega a página para buscar a versão publicada.
 * Não repete a recarga em sequência (por exemplo, sem conexão): nesse caso devolve
 * `false` e quem chamou mostra o erro normalmente.
 */
export function reloadForUpdate(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < MIN_INTERVAL_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Sem armazenamento de sessão não há como evitar recargas repetidas.
    return false
  }
  window.location.reload()
  return true
}
