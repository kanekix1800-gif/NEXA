/**
 * DESCRIÇÃO FALADA DE ELEMENTOS DA TELA
 * ─────────────────────────────────────────────────────────────────────────────
 * Usada pela opção "Ler o que eu tocar": dado o elemento tocado ou focado, monta
 * a frase a ser falada — o nome acessível do item e o que ele é (botão, link,
 * campo…). Segue a mesma lógica dos leitores de tela, de forma simplificada.
 */

const INTERACTIVE =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"]'

const READABLE = `${INTERACTIVE}, h1, h2, h3, h4, label, [role="img"], img[alt], p, li, figcaption, td, th, [data-speak]`

const MAX_LENGTH = 320

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Texto visível do elemento, ignorando o que está oculto de leitores de tela. */
function visibleText(element: Element): string {
  const clone = element.cloneNode(true) as Element
  clone.querySelectorAll('[aria-hidden="true"], script, style').forEach((node) => node.remove())
  // Imagens com descrição entram no texto.
  clone.querySelectorAll('img[alt], [role="img"][aria-label]').forEach((node) => {
    const label = node.getAttribute('alt') ?? node.getAttribute('aria-label') ?? ''
    node.replaceWith(` ${label} `)
  })
  return clean(clone.textContent)
}

function labelledBy(element: Element): string {
  const ids = element.getAttribute('aria-labelledby')
  if (!ids) return ''
  return clean(
    ids
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
      .join(' '),
  )
}

function fieldLabel(element: Element): string {
  const id = element.getAttribute('id')
  const root = element.ownerDocument
  const explicit = id ? root.querySelector(`label[for="${CSS.escape(id)}"]`) : null
  return clean(explicit?.textContent ?? element.closest('label')?.textContent)
}

/** Nome acessível: `aria-label`, `aria-labelledby`, rótulo do campo, `alt` ou o texto visível. */
export function accessibleName(element: Element): string {
  const direct = clean(element.getAttribute('aria-label')) || labelledBy(element)
  if (direct) return direct
  if (element.matches('input, select, textarea')) {
    return fieldLabel(element) || clean(element.getAttribute('placeholder'))
  }
  if (element.matches('img')) return clean(element.getAttribute('alt'))
  // Botões e chaves também podem ser nomeados por um <label for>.
  return visibleText(element) || fieldLabel(element)
}

function roleOf(element: Element): string {
  const explicit = element.getAttribute('role')
  if (explicit) return explicit
  const tag = element.tagName.toLowerCase()
  if (tag === 'a') return 'link'
  if (tag === 'button' || tag === 'summary') return 'button'
  if (tag === 'select') return 'combobox'
  if (tag === 'textarea') return 'textbox'
  if (tag === 'input') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase()
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'range') return 'slider'
    if (type === 'button' || type === 'submit') return 'button'
    return 'textbox'
  }
  if (/^h[1-6]$/.test(tag)) return 'heading'
  if (tag === 'img') return 'img'
  return ''
}

function isChecked(element: Element): boolean | null {
  const aria = element.getAttribute('aria-checked') ?? element.getAttribute('aria-pressed')
  if (aria === 'true') return true
  if (aria === 'false') return false
  if (
    element instanceof HTMLInputElement &&
    (element.type === 'checkbox' || element.type === 'radio')
  ) {
    return element.checked
  }
  return null
}

function stateOf(element: Element, role: string): string {
  const parts: string[] = []
  const checked = isChecked(element)
  if (role === 'switch') parts.push(checked ? 'ligado' : 'desligado')
  else if (role === 'checkbox') parts.push(checked ? 'marcado' : 'não marcado')
  else if (role === 'radio' || role === 'tab' || role === 'option') {
    if (checked || element.getAttribute('aria-selected') === 'true') parts.push('selecionado')
  } else if (checked !== null && role === 'button') parts.push(checked ? 'ativado' : 'desativado')

  const expanded = element.getAttribute('aria-expanded')
  if (expanded === 'true') parts.push('aberto')
  if (expanded === 'false') parts.push('fechado')
  if (
    element.getAttribute('aria-disabled') === 'true' ||
    (element as HTMLButtonElement).disabled === true
  ) {
    parts.push('indisponível')
  }
  return parts.join(', ')
}

const ROLE_LABEL: Record<string, string> = {
  button: 'botão',
  link: 'link',
  checkbox: 'caixa de seleção',
  switch: 'chave',
  radio: 'opção',
  tab: 'aba',
  option: 'opção',
  menuitem: 'item de menu',
  combobox: 'lista de opções',
  textbox: 'campo de texto',
  slider: 'controle deslizante',
  heading: 'título',
  img: 'imagem',
}

function valueOf(element: Element, role: string): string {
  if (
    role === 'textbox' &&
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
  ) {
    if (element instanceof HTMLInputElement && element.type === 'password') {
      return element.value ? 'preenchido' : 'vazio'
    }
    return element.value ? clean(element.value) : 'vazio'
  }
  if (element instanceof HTMLSelectElement) {
    return clean(element.selectedOptions[0]?.textContent)
  }
  if (role === 'slider' && element instanceof HTMLInputElement) {
    return clean(element.getAttribute('aria-valuetext')) || element.value
  }
  return ''
}

/**
 * Frase a ser falada para o elemento tocado ou focado, ou `null` quando não há o
 * que dizer (área vazia ou elemento decorativo).
 */
export function describeElement(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  if (target.closest('[aria-hidden="true"]')) return null
  // Dentro de um controle interativo, o que vale é o controle inteiro.
  const element = target.closest(INTERACTIVE) ?? target.closest(READABLE)
  if (!element) return null

  const role = roleOf(element)
  const name = accessibleName(element)
  const parts = [name, ROLE_LABEL[role] ?? '', valueOf(element, role), stateOf(element, role)]
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0 || (name === '' && !ROLE_LABEL[role])) return null

  const sentence = parts.join(', ')
  return sentence.length > MAX_LENGTH ? `${sentence.slice(0, MAX_LENGTH).trim()}…` : sentence
}

/** Texto de uma região para a leitura completa da tela ("Ouvir tela"). */
export function readableText(region: Element | null): string {
  if (!region) return ''
  const clone = region.cloneNode(true) as Element
  clone
    .querySelectorAll('[aria-hidden="true"], script, style, [data-no-read], .leaflet-container')
    .forEach((node) => node.remove())
  clone.querySelectorAll('img[alt], [role="img"][aria-label]').forEach((node) => {
    const label = node.getAttribute('alt') ?? node.getAttribute('aria-label') ?? ''
    node.replaceWith(` ${label}. `)
  })
  // Controles só com ícone entram pelo rótulo.
  clone.querySelectorAll('[aria-label]').forEach((node) => {
    if (clean(node.textContent) === '') node.textContent = ` ${node.getAttribute('aria-label')}. `
  })
  // Quebras entre blocos viram pausas na fala.
  clone
    .querySelectorAll('h1, h2, h3, h4, p, li, button, a, label, section, article, tr, summary')
    .forEach((node) => node.append('. '))
  return clean(clone.textContent)
    .replace(/(\s*\.)+/g, '.')
    .replace(/\.(?=\S)/g, '. ')
}
