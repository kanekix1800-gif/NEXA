import { ImagePlus, X } from 'lucide-react'
import { useId, useState } from 'react'

import { cn } from '@/utils/cn'
import { toUserMessage } from '@/utils/errors'
import { IMAGE_ACCEPT, processImageFile } from '@/utils/image'

import { Spinner } from './feedback'

interface ImagePickerProps {
  /** Imagens selecionadas (data URLs já comprimidas). */
  value: string[]
  onChange: (value: string[]) => void
  /** Quantidade máxima de imagens. */
  max?: number
  /** Rótulo do botão de adicionar. */
  label?: string
}

/**
 * Seleção de imagens da galeria ou da câmera. As imagens são reduzidas e comprimidas
 * no próprio aparelho antes de serem guardadas (os metadados da foto são descartados).
 */
export function ImagePicker({
  value,
  onChange,
  max = 1,
  label = 'Adicionar foto',
}: ImagePickerProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const room = Math.max(0, max - value.length)
      const processed: string[] = []
      for (const file of Array.from(files).slice(0, room)) {
        processed.push(await processImageFile(file))
      }
      onChange([...value, ...processed])
    } catch (failure) {
      setError(toUserMessage(failure, 'Não foi possível adicionar a imagem.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {value.map((image, index) => (
          <div
            key={image.slice(-32) + index}
            className="relative size-24 overflow-hidden rounded-2xl"
          >
            <img src={image} alt={`Imagem ${index + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, current) => current !== index))}
              aria-label={`Remover imagem ${index + 1}`}
              className="bg-ink-900/70 absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label
            htmlFor={inputId}
            className={cn(
              'border-line-strong bg-surface text-ink-600 hover:bg-cream-50 flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-center text-[0.6875rem] font-bold transition-colors',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? <Spinner /> : <ImagePlus className="text-nexa-800 size-6" aria-hidden />}
            {busy ? 'Processando…' : label}
          </label>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={max - value.length > 1}
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {error && (
        <p className="text-danger-600 text-xs font-semibold" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
