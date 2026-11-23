import {
  ChartColumn,
  Check,
  Heart,
  MapPin,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
} from 'lucide-react'
import type { SVGProps } from 'react'

import { Blobs, Frame, Glyph, Hills, P, Sparkle } from '../scene'
import type { IllustrationMap } from '../types'

type Props = SVGProps<SVGSVGElement>

function Leaf({ x, y, rotate, color }: { x: number; y: number; rotate: number; color: string }) {
  return (
    <path
      d="M0 0c-16-22-10-52 0-70 10 18 16 48 0 70z"
      fill={color}
      transform={`translate(${x} ${y}) rotate(${rotate})`}
    />
  )
}

interface PersonProps {
  x: number
  y: number
  skin: string
  hair: string
  top: string
  /** Cabelo: `short`, `curly` ou `long`. */
  style: 'short' | 'curly' | 'long'
  scale?: number
}

/** Pessoa em busto, no estilo flat da marca. */
function Person({ x, y, skin, hair, top, style, scale = 1 }: PersonProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {style === 'long' && (
        <path
          d="M-27 -66c0-20 12-32 27-32s27 12 27 32v40c0 6-4 9-9 9h-36c-5 0-9-3-9-9z"
          fill={hair}
        />
      )}
      {style === 'curly' && <circle cx="0" cy="-74" r="33" fill={hair} />}
      <path d="M-48 60c0-36 20-54 48-54s48 18 48 54z" fill={top} />
      <rect x="-9" y="-14" width="18" height="26" rx="8" fill={skin} />
      <ellipse cx="0" cy="-40" rx="23" ry="26" fill={skin} />
      {style !== 'curly' && (
        <path
          d="M-24 -44c-1-20 10-31 24-31s25 11 24 31c-4-11-12-16-24-16s-20 5-24 16z"
          fill={hair}
        />
      )}
      {style === 'curly' && (
        <path d="M-24 -42c1-17 11-26 24-26s23 9 24 26c-6-8-14-11-24-11s-18 3-24 11z" fill={hair} />
      )}
      <circle cx="-9" cy="-38" r="2.600" fill={P.ink} />
      <circle cx="9" cy="-38" r="2.600" fill={P.ink} />
      <path
        d="M-8 -27c3 4 13 4 16 0"
        stroke={P.ink}
        strokeWidth="2.600"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  )
}

/** Etapa 1 — três pessoas reunidas em torno de um celular. */
function OnboardingCommunity(props: Props) {
  return (
    <Frame bg={P.cream100} {...props}>
      <circle cx="200" cy="150" r="126" fill={P.green100} />
      <Leaf x={66} y={214} rotate={-28} color={P.green400} />
      <Leaf x={92} y={228} rotate={-8} color={P.green600} />
      <Leaf x={332} y={212} rotate={30} color={P.green400} />
      <Leaf x={308} y={230} rotate={10} color={P.green800} />
      <Person
        x={112}
        y={214}
        skin="#9a643f"
        hair="#1f1a17"
        top={P.green800}
        style="curly"
        scale={0.92}
      />
      <Person
        x={290}
        y={214}
        skin="#e8b98f"
        hair="#7a4a2b"
        top={P.sun400}
        style="long"
        scale={0.92}
      />
      <Person
        x={200}
        y={226}
        skin="#c98f62"
        hair="#4a2f21"
        top={P.teal}
        style="short"
        scale={1.08}
      />
      {/* Celular */}
      <rect x="178" y="216" width="44" height="68" rx="9" fill={P.ink} />
      <rect x="182" y="222" width="36" height="56" rx="5" fill={P.cream50} />
      <circle cx="200" cy="244" r="9" fill={P.sun400} />
      <rect x="188" y="260" width="24" height="5" rx="2.500" fill={P.green300} />
      <Sparkle x={258} y={70} size={11} />
      <Sparkle x={134} y={64} size={8} color={P.green600} />
    </Frame>
  )
}

/** Etapa 2 — registrar problemas e participar das decisões. */
function OnboardingVoice(props: Props) {
  return (
    <Frame bg={P.cream100} {...props}>
      <Blobs color={P.sun100} color2={P.green100} />
      <Hills back={P.green300} front={P.green800} />
      {/* Celular com mapa */}
      <rect x="146" y="44" width="108" height="196" rx="20" fill={P.ink} />
      <rect x="154" y="54" width="92" height="176" rx="13" fill={P.green50} />
      <path d="M154 140c30-14 62-14 92 0v40c-30 12-62 12-92 0z" fill={P.green200} />
      <path d="M154 104h92M190 54v176" stroke={P.cream50} strokeWidth="7" />
      <path
        d="M200 164c-16-20-30-32-30-50a30 30 0 0 1 60 0c0 18-14 30-30 50z"
        fill={P.terracotta}
      />
      <circle cx="200" cy="113" r="16" fill={P.cream50} />
      <Glyph icon={MapPin} x={200} y={113} size={20} color={P.terracotta} strokeWidth={2.4} />
      {/* Megafone */}
      <circle cx="92" cy="118" r="38" fill={P.sun400} />
      <Glyph icon={Megaphone} x={92} y={118} size={40} color={P.ink} />
      {/* Balão de confirmação */}
      <path
        d="M278 92h62a14 14 0 0 1 14 14v30a14 14 0 0 1-14 14h-30l-16 14v-14h-16a14 14 0 0 1-14-14v-30a14 14 0 0 1 14-14z"
        fill={P.green800}
      />
      <Glyph icon={Check} x={309} y={121} size={30} color={P.cream50} strokeWidth={3} />
      <Sparkle x={332} y={62} size={9} />
    </Frame>
  )
}

/** Etapa 3 — valorizar o comércio local. */
function OnboardingCommerce(props: Props) {
  const stripes = Array.from({ length: 7 }, (_, index) => index)
  return (
    <Frame bg={P.cream100} {...props}>
      <Blobs color={P.green100} color2={P.sun100} />
      <Hills back={P.green300} front={P.green800} />
      {/* Loja */}
      <rect x="92" y="112" width="182" height="134" rx="14" fill={P.cream50} />
      <rect x="110" y="160" width="76" height="52" rx="9" fill={P.green100} />
      <Glyph icon={Store} x={148} y={186} size={34} color={P.green800} />
      <rect x="208" y="156" width="46" height="90" rx="9" fill={P.green800} />
      <circle cx="244" cy="202" r="3.500" fill={P.cream50} />
      <rect x="84" y="100" width="198" height="18" rx="7" fill={P.sun600} />
      {stripes.map((index) => (
        <path
          key={index}
          d={`M${84 + index * 28.3} 116h28.300v15a14.150 14.150 0 0 1-28.300 0z`}
          fill={index % 2 === 0 ? P.sun400 : P.cream50}
        />
      ))}
      {/* Sacola e selos */}
      <circle cx="318" cy="186" r="40" fill={P.sun400} />
      <Glyph icon={ShoppingBag} x={318} y={186} size={42} color={P.ink} />
      <circle cx="306" cy="92" r="24" fill={P.pink} />
      <Glyph icon={Heart} x={306} y={92} size={24} color={P.cream50} strokeWidth={2.6} />
      <circle cx="66" cy="76" r="20" fill={P.green800} />
      <Glyph icon={Star} x={66} y={76} size={20} color={P.sun300} strokeWidth={2.6} />
    </Frame>
  )
}

/** Etapa 4 — a NEXA IA: conversa, brilho e dados. */
function OnboardingAI(props: Props) {
  return (
    <Frame bg={P.cream100} {...props}>
      <Blobs color={P.green100} color2={P.sun100} />
      <circle cx="200" cy="150" r="74" fill={P.green900} />
      <circle
        cx="200"
        cy="150"
        r="92"
        fill="none"
        stroke={P.green300}
        strokeWidth="3"
        strokeDasharray="4 12"
        strokeLinecap="round"
      />
      <Glyph icon={Sparkles} x={200} y={150} size={74} color={P.sun300} strokeWidth={1.8} />
      {/* Balões de conversa */}
      <rect x="34" y="62" width="112" height="48" rx="18" fill={P.cream50} />
      <rect x="50" y="78" width="60" height="6" rx="3" fill={P.green300} />
      <rect x="50" y="90" width="80" height="6" rx="3" fill={P.green200} />
      <rect x="264" y="182" width="106" height="62" rx="18" fill={P.green800} />
      <Glyph icon={ChartColumn} x={317} y={213} size={36} color={P.cream50} />
      <rect x="254" y="66" width="96" height="40" rx="16" fill={P.sun400} />
      <rect x="270" y="83" width="64" height="6" rx="3" fill={P.ink} opacity="0.55" />
      <rect x="40" y="196" width="92" height="40" rx="16" fill={P.green200} />
      <rect x="56" y="213" width="54" height="6" rx="3" fill={P.green800} opacity="0.6" />
      <Sparkle x={150} y={44} size={10} />
      <Sparkle x={338} y={146} size={8} color={P.green600} />
    </Frame>
  )
}

/** As quatro etapas da apresentação inicial. */
export const onboardingIllustrations: IllustrationMap = {
  'onb-community': OnboardingCommunity,
  'onb-voice': OnboardingVoice,
  'onb-commerce': OnboardingCommerce,
  'onb-ai': OnboardingAI,
}
