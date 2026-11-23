import { useId, type SVGProps } from 'react'

import { Frame, Hills, P, Tree } from '../scene'
import type { IllustrationMap } from '../types'

interface BuildingProps {
  x: number
  /** Altura do prédio (a base fica em y = 236). */
  h: number
  w: number
  color: string
  window: string
  /** Telhado em duas águas (casa) em vez de laje. */
  roof?: string
}

const BASE_Y = 236

/** Prédio/casa simples com janelas em grade. */
function Building({ x, h, w, color, window, roof }: BuildingProps) {
  const top = BASE_Y - h
  const columns = Math.max(2, Math.floor(w / 18))
  const rows = Math.max(1, Math.floor((h - 18) / 22))
  const gap = (w - columns * 9) / (columns + 1)
  return (
    <g>
      {roof && <path d={`M${x - 5} ${top + 4}l${w / 2 + 5}-22 ${w / 2 + 5} 22z`} fill={roof} />}
      <rect x={x} y={top} width={w} height={h + 10} rx={roof ? 3 : 7} fill={color} />
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => (
          <rect
            key={`${row}-${column}`}
            x={x + gap + column * (9 + gap)}
            y={top + 12 + row * 22}
            width="9"
            height="11"
            rx="2"
            fill={window}
          />
        )),
      )}
    </g>
  )
}

/** Cidade diurna da tela de abertura: prédios em verdes, laranja e creme sobre colinas. */
function CityDay(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame bg={P.cream100} {...props}>
      <circle cx="312" cy="70" r="34" fill={P.sun200} />
      <path d="M40 92c14-12 34-12 46 0 12-6 26-2 30 10H32c-2-4 2-8 8-10z" fill={P.cream50} />
      <path d="M232 52c10-9 26-9 35 0 9-4 20-1 23 8h-64c-1-3 2-6 6-8z" fill={P.cream50} />
      {/* Prédios ao fundo */}
      <g opacity="0.55">
        <Building x={52} h={86} w={46} color={P.green200} window={P.cream50} />
        <Building x={150} h={118} w={44} color={P.green200} window={P.cream50} />
        <Building x={262} h={96} w={52} color={P.green200} window={P.cream50} />
      </g>
      {/* Prédios da frente */}
      <Building x={78} h={62} w={52} color={P.green600} window={P.sun100} roof={P.green800} />
      <Building x={128} h={98} w={40} color={P.sun300} window={P.cream50} />
      <Building x={176} h={132} w={50} color={P.green800} window={P.sun200} />
      <Building x={232} h={78} w={44} color={P.cream300} window={P.green600} roof={P.sun600} />
      <Building x={282} h={108} w={42} color={P.green400} window={P.cream50} />
      <Tree x={62} y={242} scale={0.85} color={P.green800} />
      <Tree x={344} y={244} scale={0.95} color={P.green600} />
      <Tree x={226} y={246} scale={0.55} color={P.green900} />
      <Hills back={P.green600} front={P.green900} />
    </Frame>
  )
}

/** Skyline ao entardecer do banner "Nossa cidade mais unida" (texto claro sobre a esquerda). */
function CitySunset(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  return (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6be5c" />
          <stop offset="0.55" stopColor="#f2a333" />
          <stop offset="1" stopColor="#d9732a" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={P.green950} stopOpacity="0.82" />
          <stop offset="0.6" stopColor={P.green950} stopOpacity="0.28" />
          <stop offset="1" stopColor={P.green950} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
      <circle cx="292" cy="150" r="52" fill="#fde9c4" opacity="0.85" />
      <g opacity="0.5">
        <Building x={30} h={110} w={48} color="#b5562a" window="#f6be5c" />
        <Building x={118} h={150} w={44} color="#b5562a" window="#f6be5c" />
        <Building x={214} h={124} w={54} color="#b5562a" window="#f6be5c" />
        <Building x={316} h={140} w={46} color="#b5562a" window="#f6be5c" />
      </g>
      <Building x={64} h={84} w={52} color={P.green900} window={P.sun300} />
      <Building x={152} h={120} w={46} color={P.green950} window={P.sun300} />
      <Building x={206} h={90} w={40} color={P.green800} window={P.sun200} />
      <Building x={258} h={136} w={50} color={P.green950} window={P.sun300} />
      <Building x={316} h={74} w={56} color={P.green900} window={P.sun200} />
      <Hills back={P.green900} front={P.green950} />
      <rect width="400" height="300" fill={`url(#${id}-shade)`} />
    </svg>
  )
}

/** Rua de bairro com casas, comércio e árvores. */
function Neighborhood(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame bg={P.green50} {...props}>
      <circle cx="78" cy="64" r="28" fill={P.sun200} />
      <path d="M250 70c12-10 30-10 40 0 10-5 22-1 26 9h-72c-2-4 1-7 6-9z" fill={P.cream50} />
      <Building x={56} h={70} w={64} color={P.cream300} window={P.green600} roof={P.terracotta} />
      <Building x={132} h={92} w={58} color={P.sun300} window={P.cream50} roof={P.sun600} />
      <Building x={204} h={64} w={66} color={P.green400} window={P.cream50} roof={P.green800} />
      <Building x={282} h={84} w={60} color={P.cream200} window={P.teal} roof={P.teal} />
      <Tree x={36} y={244} scale={0.8} color={P.green800} />
      <Tree x={364} y={244} scale={0.9} color={P.green600} />
      <Hills back={P.green300} front={P.green800} />
    </Frame>
  )
}

/** Praça com árvores, banco e canteiros. */
function Square(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame bg={P.green100} {...props}>
      <circle cx="320" cy="62" r="30" fill={P.sun200} />
      <path d="M0 214c70-24 140-28 200-18s130 6 200-14v118H0z" fill={P.green300} />
      <path d="M150 300c10-40 26-66 50-84 24 18 40 44 50 84z" fill={P.cream200} />
      <Tree x={88} y={226} scale={1.5} color={P.green800} />
      <Tree x={310} y={226} scale={1.7} color={P.green600} />
      <Tree x={206} y={196} scale={1.1} color={P.green900} />
      {/* Banco */}
      <g fill={P.sun600}>
        <rect x="146" y="232" width="62" height="7" rx="3" />
        <rect x="146" y="218" width="62" height="6" rx="3" />
        <rect x="152" y="238" width="5" height="16" rx="2" />
        <rect x="197" y="238" width="5" height="16" rx="2" />
      </g>
      {/* Canteiros */}
      <ellipse cx="262" cy="262" rx="34" ry="12" fill={P.green600} />
      <g fill={P.sun400}>
        <circle cx="246" cy="258" r="5" />
        <circle cx="262" cy="254" r="5" />
        <circle cx="278" cy="259" r="5" />
      </g>
    </Frame>
  )
}

/** Cidade, bairro e praça (abertura, banner da tela inicial e conteúdos gerais). */
export const cityIllustrations: IllustrationMap = {
  'city-day': CityDay,
  'city-sunset': CitySunset,
  neighborhood: Neighborhood,
  square: Square,
}
