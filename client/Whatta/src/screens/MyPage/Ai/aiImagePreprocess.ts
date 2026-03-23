import { Image } from 'react-native'

const TARGET_MAX_BYTES = 1024 * 1024
const PRESET_ATTEMPTS = [
  { longestSide: 1920, compress: 0.78 },
  { longestSide: 1920, compress: 0.72 },
  { longestSide: 1600, compress: 0.72 },
] as const

type ImageSize = {
  width: number
  height: number
}

export type PreparedAiImage = {
  uri: string
  base64: string
  format: 'jpg' | 'jpeg' | 'png'
  contentType: 'image/jpeg' | 'image/png'
  byteSize: number
}

function normalizeFormat(ext?: string): PreparedAiImage['format'] {
  const lower = (ext ?? 'jpg').toLowerCase()
  if (lower === 'png') return 'png'
  if (lower === 'jpeg') return 'jpeg'
  return 'jpg'
}

function toContentType(format: PreparedAiImage['format']): PreparedAiImage['contentType'] {
  if (format === 'png') return 'image/png'
  return 'image/jpeg'
}

function getImageSize(uri: string) {
  return new Promise<ImageSize>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

async function getBlobSize(uri: string) {
  const response = await fetch(uri)
  const blob = await response.blob()
  return blob.size
}

function buildResizeAction(size: ImageSize, longestSide: number) {
  const currentLongest = Math.max(size.width, size.height)
  if (currentLongest <= longestSide) return []

  if (size.width >= size.height) {
    return [{ resize: { width: longestSide } }]
  }

  return [{ resize: { height: longestSide } }]
}

export async function preprocessAiImage(params: {
  uri: string
  base64: string
  ext?: string
}): Promise<PreparedAiImage> {
  const { uri, base64, ext } = params
  const fallbackFormat = normalizeFormat(ext)
  const fallbackResult: PreparedAiImage = {
    uri,
    base64,
    format: fallbackFormat,
    contentType: toContentType(fallbackFormat),
    byteSize: Math.ceil((base64.length * 3) / 4),
  }

  let manipulateAsync: (typeof import('expo-image-manipulator'))['manipulateAsync'] | undefined
  let jpegFormat: unknown

  try {
    const module = await import('expo-image-manipulator')
    manipulateAsync = module.manipulateAsync
    jpegFormat = module.SaveFormat?.JPEG
  } catch (error) {
    return fallbackResult
  }

  if (!manipulateAsync || !jpegFormat) {
    return fallbackResult
  }

  try {
    const originalSize = await getImageSize(uri)
    let bestResult: PreparedAiImage | null = null

    for (const preset of PRESET_ATTEMPTS) {
      const result = await manipulateAsync(
        uri,
        buildResizeAction(originalSize, preset.longestSide),
        {
          compress: preset.compress,
          format: jpegFormat as NonNullable<typeof import('expo-image-manipulator')['SaveFormat']>[keyof typeof import('expo-image-manipulator')['SaveFormat']],
          base64: true,
        },
      )

      const byteSize = await getBlobSize(result.uri)
      bestResult = {
        uri: result.uri,
        base64: result.base64 ?? '',
        format: 'jpg',
        contentType: 'image/jpeg',
        byteSize,
      }

      if (byteSize <= TARGET_MAX_BYTES) {
        break
      }
    }

    if (!bestResult || !bestResult.base64) {
      return fallbackResult
    }

    return bestResult
  } catch (error) {
    return fallbackResult
  }
}
