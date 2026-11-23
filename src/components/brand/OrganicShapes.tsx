import { cn } from '@/utils/cn'

/**
 * Composição de fundo com manchas orgânicas (verde profundo, verde suave e laranja)
 * nos cantos — a assinatura visual do NEXA. Coloque dentro de um contêiner `relative`.
 */
export function BrandBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 220 220"
        className="absolute -top-16 -right-20 size-64 lg:size-96"
        fill="none"
      >
        <path d="M70 0h150v150c-40 26-96 14-124-24S42 34 70 0z" fill="#ddebdd" />
        <path d="M128 0h92v86c-26 14-58 6-74-16s-26-48-18-70z" fill="#0b6048" opacity="0.9" />
      </svg>
      <svg
        viewBox="0 0 220 220"
        className="absolute -bottom-24 -left-24 size-64 lg:size-96"
        fill="none"
      >
        <path d="M0 70c40-22 92-10 118 28s14 86-22 122H0z" fill="#fde9c4" />
        <path d="M0 132c26-12 58-4 74 20s8 50-12 68H0z" fill="#f2a333" opacity="0.85" />
      </svg>
    </div>
  )
}

/** Silhueta de cidade bem suave para o rodapé de telas (como em "Nova Demanda"). */
export function CitySilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 70"
      preserveAspectRatio="xMidYMax slice"
      className={cn('text-nexa-100 pointer-events-none w-full', className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M0 70V46h18V30h20v16h12V18h26v28h14V34h18v12h16V10h24v36h12V26h22v20h14V38h16v8h18V22h24v24h12V32h20v14h16V14h22v32h14V40h18v6h20v24z" />
    </svg>
  )
}

/** Curva orgânica para encerrar uma ilustração ou seção colorida. */
export function WaveEdge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      className={cn('text-canvas pointer-events-none block h-8 w-full', className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M0 40V20c70 20 150-18 230-8s120 22 170 6v22z" />
    </svg>
  )
}
