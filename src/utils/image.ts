import { config } from '@/config'

import { AppError, validationError } from './errors'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Valor para o atributo `accept` de campos de envio de imagem. */
export const IMAGE_ACCEPT = ACCEPTED_TYPES.join(',')

export interface ImageProcessOptions {
  /** Lado máximo em pixels após o redimensionamento. */
  maxSide?: number
  /** Qualidade JPEG (0 a 1). */
  quality?: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(validationError('Não foi possível ler esta imagem. Tente outro arquivo.'))
    }
    image.src = url
  })
}

/**
 * Valida, redimensiona e comprime uma imagem enviada pelo usuário, devolvendo um data URL JPEG.
 * A compressão acontece no próprio dispositivo: a imagem original não sai do navegador.
 * Como efeito colateral, metadados (EXIF, incluindo localização da foto) são descartados.
 */
export async function processImageFile(
  file: File,
  options: ImageProcessOptions = {},
): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw validationError('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.')
  }
  if (file.size > config.limits.imageMaxBytes) {
    throw validationError('A imagem é muito grande. O limite é de 12 MB.')
  }

  const maxSide = options.maxSide ?? config.limits.imageMaxSide
  const quality = options.quality ?? 0.76

  const image = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new AppError('unavailable', 'Seu navegador não conseguiu processar a imagem.')
  }
  // Fundo branco para imagens com transparência (o JPEG não tem canal alfa).
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

/** Verifica se o valor é um data URL de imagem (formato aceito para imagens enviadas). */
export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(value)
}
