import type { LucideIcon } from 'lucide-react'
import type { ReactNode, SVGProps } from 'react'

import type { IllustrationComponent } from './types'

/**
 * KIT DE CENA das ilustrações do NEXA.
 * Todas as ilustrações usam o mesmo quadro (400×300), a mesma paleta e os mesmos
 * elementos (colinas, manchas orgânicas, emblemas com ícone), o que mantém a
 * biblioteca visualmente coesa. O assunto fica na área central, pois as cenas são
 * recortadas em miniaturas quadradas e em faixas largas.
 */

/** Paleta das ilustrações (alinhada aos tokens de `src/styles/index.css`). */
export const P = {
  green950: '#03352a',
  green900: '#064d3b',
  green800: '#0b6048',
  green600: '#1c8263',
  green400: '#67b393',
  green300: '#9fcdb3',
  green200: '#c5dfcc',
  green100: '#ddebdd',
  green50: '#eef5ec',
  cream50: '#fffdf8',
  cream100: '#faf5ec',
  cream200: '#f3ebdb',
  cream300: '#e9ddc6',
  sun100: '#fde9c4',
  sun200: '#fad590',
  sun300: '#f6be5c',
  sun400: '#f2a333',
  sun600: '#b96c0a',
  terracotta: '#b5472f',
  terracottaSoft: '#f8e2da',
  teal: '#1f7078',
  tealSoft: '#dff0f1',
  blue: '#2f5d9b',
  blueSoft: '#e2eaf8',
  purple: '#6a4fa0',
  purpleSoft: '#ebe5f6',
  pink: '#a8456f',
  pinkSoft: '#f8e3ec',
  gold: '#7d6200',
  goldSoft: '#fbf1c9',
  ink: '#102820',
  white: '#ffffff',
} as const

type SvgProps = SVGProps<SVGSVGElement>

/** Quadro padrão: `<svg viewBox="0 0 400 300">` com fundo. Repassa as props ao `<svg>`. */
export function Frame({ bg, children, ...props }: SvgProps & { bg: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="400" height="300" fill={bg} />
      {children}
    </svg>
  )
}

/** Manchas orgânicas de fundo. */
export function Blobs({ color, color2 }: { color: string; color2?: string }) {
  return (
    <>
      <path d="M250 0h150v150c-40 22-92 10-118-28S222 30 250 0z" fill={color} />
      <path d="M0 150c38-18 84-6 104 30s8 84-28 120H0z" fill={color2 ?? color} opacity="0.7" />
    </>
  )
}

/** Colinas orgânicas no rodapé da cena. */
export function Hills({ back, front }: { back: string; front: string }) {
  return (
    <>
      <path d="M0 236c60-30 130-34 200-14s140 14 200-18v96H0z" fill={back} />
      <path d="M0 262c70-22 150-20 220-4s120 8 180-14v56H0z" fill={front} />
    </>
  )
}

/** Ícone do lucide desenhado dentro da cena (centralizado em x, y). */
export function Glyph({
  icon: Icon,
  x,
  y,
  size,
  color,
  strokeWidth = 2,
}: {
  icon: LucideIcon
  x: number
  y: number
  size: number
  color: string
  strokeWidth?: number
}) {
  return (
    <Icon
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      color={color}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  )
}

export function Sparkle({
  x,
  y,
  size = 10,
  color = P.sun400,
}: {
  x: number
  y: number
  size?: number
  color?: string
}) {
  const s = size
  return (
    <path
      d={`M${x} ${y - s}c${s * 0.15} ${s * 0.55} ${s * 0.45} ${s * 0.85} ${s} ${s}c-${s * 0.55} ${s * 0.15}-${s * 0.85} ${s * 0.45}-${s} ${s}c-${s * 0.15}-${s * 0.55}-${s * 0.45}-${s * 0.85}-${s}-${s}c${s * 0.55}-${s * 0.15} ${s * 0.85}-${s * 0.45} ${s}-${s}z`}
      fill={color}
    />
  )
}

export function Tree({
  x,
  y,
  scale = 1,
  color = P.green600,
}: {
  x: number
  y: number
  scale?: number
  color?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="-22" width="6" height="24" rx="3" fill={P.sun600} />
      <circle cx="0" cy="-38" r="20" fill={color} />
      <circle cx="-9" cy="-30" r="11" fill={color} />
      <circle cx="10" cy="-30" r="12" fill={color} />
    </g>
  )
}

export interface CoverSpec {
  icon: LucideIcon
  /** Fundo da cena. */
  bg: string
  /** Mancha de fundo. */
  blob: string
  /** Cor principal (toldo, anel do emblema, alfinete). */
  accent: string
  /** Cor do ícone. */
  ink?: string
  hillBack?: string
  hillFront?: string
}

/** Capa de estabelecimento: fachada com toldo listrado e emblema com o símbolo do negócio. */
export function storefront(spec: CoverSpec): IllustrationComponent {
  return function StorefrontIllustration(props) {
    const stripes = Array.from({ length: 8 }, (_, index) => index)
    return (
      <Frame bg={spec.bg} {...props}>
        <Blobs color={spec.blob} />
        <circle cx="330" cy="58" r="24" fill={P.sun200} />
        <Hills back={spec.hillBack ?? P.green300} front={spec.hillFront ?? P.green600} />
        {/* Fachada */}
        <rect x="104" y="150" width="192" height="104" rx="12" fill={P.cream50} />
        <rect x="124" y="194" width="74" height="44" rx="8" fill={spec.blob} />
        <rect x="226" y="190" width="46" height="64" rx="8" fill={spec.accent} />
        <circle cx="262" cy="224" r="3" fill={P.cream50} />
        {/* Toldo */}
        <rect x="96" y="140" width="208" height="16" rx="6" fill={spec.accent} />
        {stripes.map((index) => (
          <path
            key={index}
            d={`M${96 + index * 26} 154h26v14a13 13 0 0 1-26 0z`}
            fill={index % 2 === 0 ? spec.accent : P.cream50}
          />
        ))}
        {/* Emblema */}
        <circle cx="200" cy="92" r="54" fill={P.cream50} />
        <circle cx="200" cy="92" r="54" fill="none" stroke={spec.accent} strokeWidth="6" />
        <Glyph icon={spec.icon} x={200} y={92} size={58} color={spec.ink ?? spec.accent} />
        <Tree x={72} y={262} scale={0.8} color={P.green800} />
        <Tree x={332} y={266} scale={0.65} color={P.green800} />
      </Frame>
    )
  }
}

/** Capa de evento/notícia: emblema central com ícone, bandeirinhas e brilhos. */
export function badge(spec: CoverSpec & { bunting?: boolean }): IllustrationComponent {
  return function BadgeIllustration(props) {
    const flags = Array.from({ length: 9 }, (_, index) => index)
    const flagColors = [spec.accent, P.sun400, P.cream50]
    return (
      <Frame bg={spec.bg} {...props}>
        <Blobs color={spec.blob} />
        <Hills back={spec.hillBack ?? P.green300} front={spec.hillFront ?? P.green800} />
        {spec.bunting !== false && (
          <>
            <path
              d="M40 34c100 34 220 34 320 0"
              stroke={P.green900}
              strokeWidth="2.500"
              fill="none"
              opacity="0.5"
            />
            {flags.map((index) => {
              const x = 62 + index * 34.5
              const y = 42 + Math.sin((index / 8) * Math.PI) * 17
              return (
                <path key={index} d={`M${x - 11} ${y}h22l-11 22z`} fill={flagColors[index % 3]} />
              )
            })}
          </>
        )}
        <circle cx="200" cy="158" r="74" fill={spec.accent} opacity="0.16" />
        <circle cx="200" cy="158" r="60" fill={P.cream50} />
        <circle cx="200" cy="158" r="60" fill="none" stroke={spec.accent} strokeWidth="6" />
        <Glyph icon={spec.icon} x={200} y={158} size={66} color={spec.ink ?? spec.accent} />
        <Sparkle x={104} y={120} size={12} />
        <Sparkle x={298} y={104} size={9} color={spec.accent} />
        <Sparkle x={310} y={206} size={11} />
        <circle cx="92" cy="196" r="6" fill={spec.accent} opacity="0.5" />
      </Frame>
    )
  }
}

/** Capa de demanda: alfinete de mapa com o símbolo do problema sobre a rua. */
export function problem(spec: CoverSpec): IllustrationComponent {
  return function ProblemIllustration(props) {
    return (
      <Frame bg={spec.bg} {...props}>
        <Blobs color={spec.blob} />
        {/* Rua */}
        <path d="M0 232c80-14 160-16 240-8s110 6 160-6v82H0z" fill={spec.hillBack ?? P.green300} />
        <path d="M0 258h400v42H0z" fill={spec.hillFront ?? P.green900} />
        <path
          d="M24 279h44M104 279h44M184 279h44M264 279h44M344 279h44"
          stroke={P.cream100}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Sombra e alfinete */}
        <ellipse cx="200" cy="250" rx="34" ry="8" fill={P.ink} opacity="0.16" />
        <path
          d="M200 248c-34-42-66-70-66-110a66 66 0 0 1 132 0c0 40-32 68-66 110z"
          fill={spec.accent}
        />
        <circle cx="200" cy="136" r="46" fill={P.cream50} />
        <Glyph icon={spec.icon} x={200} y={136} size={52} color={spec.ink ?? spec.accent} />
        <Sparkle x={96} y={96} size={10} />
        <Sparkle x={312} y={120} size={12} color={spec.accent} />
      </Frame>
    )
  }
}
