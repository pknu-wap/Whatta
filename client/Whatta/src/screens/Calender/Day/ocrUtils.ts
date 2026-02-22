import { useState } from 'react'
import { Alert } from 'react-native'
import { http } from '@/lib/http'
import { getDateOfWeek } from './dateUtils'
import type { OCREventDisplay } from '@/screens/More/OcrEventCardSlider'
import { useEffect } from 'react'
import { bus } from '@/lib/eventBus'

export function useDayOCR() {
  const [ocrSplashVisible, setOcrSplashVisible] = useState(false)
  const [ocrModalVisible, setOcrModalVisible] = useState(false)
  const [ocrEvents, setOcrEvents] = useState<OCREventDisplay[]>([])
  const [imagePopupVisible, setImagePopupVisible] = useState(false)

  useEffect(() => {
  const handler = (payload?: { source?: string }) => {
    if (payload?.source !== 'Day') return
    setImagePopupVisible(true)
  }

  bus.on('popup:image:create', handler)
  return () => bus.off('popup:image:create', handler)
}, [])

  const sendToOCR = async (base64: string, ext?: string) => {
    try {
      setOcrSplashVisible(true)

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

      const events = res.data?.data?.events ?? []

      const parsed = events
        .map((ev: any, idx: number) => ({
          id: String(idx),
          title: ev.title ?? '',
          content: ev.content ?? '',
          weekDay: ev.weekDay ?? '',
          date: getDateOfWeek(ev.weekDay),
          startTime: ev.startTime ?? '',
          endTime: ev.endTime ?? '',
        }))
        .sort((a: OCREventDisplay, b: OCREventDisplay) =>
          a.date.localeCompare(b.date),
        )

      setOcrEvents(parsed)
      setOcrSplashVisible(false)
      setOcrModalVisible(true)
    } catch (err) {
      setOcrSplashVisible(false)
      Alert.alert('오류', 'OCR 처리 실패')
    }
  }

  return {
    ocrSplashVisible,
    ocrModalVisible,
    ocrEvents,
    imagePopupVisible,
    setImagePopupVisible,
    setOcrModalVisible,
    sendToOCR,
  }
}