import { useMemo } from 'react'
import { encode } from 'uqr'

interface QrCodeProps {
  /** Texto codificado — normalmente um endereço. */
  value: string
  /** Descrição para leitores de tela (ex.: "QR Code para abrir o NEXA"). */
  label: string
  className?: string
}

/**
 * QR Code em SVG, gerado no próprio aparelho: o endereço não é enviado a nenhum serviço.
 * Inclui a margem clara exigida pelos leitores e mantém alto contraste em qualquer tema.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const code = encode(value, { ecc: 'M', border: 4 })
    let d = ''
    for (let row = 0; row < code.size; row++) {
      for (let col = 0; col < code.size; col++) {
        if (code.data[row]?.[col]) d += `M${col},${row}h1v1h-1z`
      }
    }
    return { size: code.size, path: d }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#0b1f18" />
    </svg>
  )
}
