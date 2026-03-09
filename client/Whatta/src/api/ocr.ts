import { http } from '@/lib/http'

export async function requestOCR(base64: string, ext?: string) {
  const cleanBase64 = base64.includes(',')
    ? base64.split(',')[1]
    : base64

  const lower = (ext ?? 'jpg').toLowerCase()

  const format =
    lower === 'png'
      ? 'png'
      : lower === 'jpeg'
      ? 'jpeg'
      : 'jpg'

  const res = await http.post('/ocr', {
    imageType: 'COLLEGE_TIMETABLE',
    image: {
      format,
      name: `timetable.${format}`,
      data: cleanBase64,
    },
  })

  return res.data?.data?.events ?? []
}