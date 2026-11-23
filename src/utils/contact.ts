import { formatPhone } from './format'

/**
 * CONTATOS SEGUROS
 * ─────────────────────────────────────────────────────────────────────────────
 * Os registros da base demonstrativa são fictícios. Para que um toque em "Ligar" ou
 * "WhatsApp" nunca alcance um número, perfil ou site REAL de terceiros, os contatos
 * de registros demonstrativos (`isDemo`) não viram links: `href` é `null` e a
 * interface exibe o aviso de contato demonstrativo.
 */

export type ContactKind = 'phone' | 'whatsapp' | 'email' | 'instagram' | 'website'

export interface ContactAction {
  kind: ContactKind
  /** Rótulo do botão (ex.: "Ligar"). */
  label: string
  /** Valor exibido (ex.: "(31) 99999-0000"). */
  value: string
  /** Link real, ou `null` quando o registro é demonstrativo. */
  href: string | null
}

export interface ContactSource {
  isDemo: boolean
  phone?: string
  whatsapp?: string
  email?: string
  instagram?: string
  website?: string
}

const digits = (value: string) => value.replace(/\D/g, '')

/** Lista as formas de contato disponíveis para um estabelecimento ou instituição. */
export function contactActions(source: ContactSource): ContactAction[] {
  const actions: ContactAction[] = []
  const link = (href: string) => (source.isDemo ? null : href)

  if (source.phone) {
    actions.push({
      kind: 'phone',
      label: 'Ligar',
      value: formatPhone(source.phone),
      href: link(`tel:+55${digits(source.phone)}`),
    })
  }
  if (source.whatsapp) {
    actions.push({
      kind: 'whatsapp',
      label: 'WhatsApp',
      value: formatPhone(source.whatsapp),
      href: link(`https://wa.me/55${digits(source.whatsapp)}`),
    })
  }
  if (source.email) {
    actions.push({
      kind: 'email',
      label: 'E-mail',
      value: source.email,
      href: link(`mailto:${source.email}`),
    })
  }
  if (source.instagram) {
    const handle = source.instagram.replace(/^@/, '')
    actions.push({
      kind: 'instagram',
      label: 'Instagram',
      value: `@${handle}`,
      href: link(`https://instagram.com/${handle}`),
    })
  }
  if (source.website) {
    actions.push({
      kind: 'website',
      label: 'Site',
      value: source.website.replace(/^https?:\/\//, ''),
      href: link(source.website),
    })
  }
  return actions
}

export const DEMO_CONTACT_NOTICE =
  'Este é um registro demonstrativo: os contatos são fictícios e não abrem ligações nem conversas reais.'
