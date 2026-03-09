import { useState } from 'react'
import { Alert } from 'react-native'
import { requestOCR } from '@/api/ocr'
import { parseOCREvents } from '@/utils/ocrParser'

export function useOCR() {
  const [ocrSplashVisible, setOcrSplashVisible] = useState(false)
  const [ocrModalVisible, setOcrModalVisible] = useState(false)
  const [ocrEvents, setOcrEvents] = useState([])
  const [imagePopupVisible, setImagePopupVisible] = useState(false)

  const sendToOCR = async (base64: string, ext?: string) => {
    try {
      setOcrSplashVisible(true)

      const events = await requestOCR(base64, ext)
      const parsed = parseOCREvents(events)

      setOcrEvents(parsed)

      setOcrModalVisible(true)
    } catch (err) {
      Alert.alert('오류', 'OCR 처리 실패')
    } finally {
      setOcrSplashVisible(false)
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