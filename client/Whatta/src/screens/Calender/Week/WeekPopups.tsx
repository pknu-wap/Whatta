import React from 'react'
import { Alert, Modal } from 'react-native'

import { bus } from '@/lib/eventBus'
import { http } from '@/lib/http'
import { createEvent } from '@/api/event_api'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import AddImageSheet from '@/screens/More/Ocr'
import OCREventCardSlider, { OCREventDisplay } from '@/screens/More/OcrEventCardSlider'
import OcrSplash from '@/screens/More/OcrSplash'

type WeekPopupsProps = {
  taskPopupVisible: boolean
  taskPopupMode: 'create' | 'edit'
  taskPopupId: string | null
  taskPopupTask: any | null
  setTaskPopupVisible: React.Dispatch<React.SetStateAction<boolean>>
  setTaskPopupId: React.Dispatch<React.SetStateAction<string | null>>
  setTaskPopupTask: React.Dispatch<React.SetStateAction<any | null>>
  onDeleteTask: (() => void) | undefined
  eventPopupVisible: boolean
  eventPopupMode: 'create' | 'edit'
  eventPopupData: any | null
  setEventPopupVisible: React.Dispatch<React.SetStateAction<boolean>>
  setEventPopupData: React.Dispatch<React.SetStateAction<any | null>>
  imagePopupVisible: boolean
  setImagePopupVisible: React.Dispatch<React.SetStateAction<boolean>>
  ocrSplashVisible: boolean
  ocrModalVisible: boolean
  ocrEvents: OCREventDisplay[]
  setOcrModalVisible: React.Dispatch<React.SetStateAction<boolean>>
  sendToOCR: (base64: string, ext?: string) => Promise<void>
  fetchWeek: (dates: string[]) => Promise<void>
  weekDates: string[]
  anchorDate: string
}

export default function WeekPopups({
  taskPopupVisible,
  taskPopupMode,
  taskPopupId,
  taskPopupTask,
  setTaskPopupVisible,
  setTaskPopupId,
  setTaskPopupTask,
  onDeleteTask,
  eventPopupVisible,
  eventPopupMode,
  eventPopupData,
  setEventPopupVisible,
  setEventPopupData,
  imagePopupVisible,
  setImagePopupVisible,
  ocrSplashVisible,
  ocrModalVisible,
  ocrEvents,
  setOcrModalVisible,
  sendToOCR,
  fetchWeek,
  weekDates,
  anchorDate,
}: WeekPopupsProps) {
  return (
    <>
      <TaskDetailPopup
        visible={taskPopupVisible}
        mode={taskPopupMode}
        taskId={taskPopupId ?? undefined}
        initialTask={taskPopupTask}
        onClose={() => {
          setTaskPopupVisible(false)
          setTaskPopupId(null)
          setTaskPopupTask(null)
        }}
        onSave={async (form: any) => {
          const pad = (n: number) => String(n).padStart(2, '0')

          let placementDate: string | null = null
          let placementTime: string | null = null
          const fieldsToClear: string[] = []

          if (form.hasDate && form.date) {
            const d = form.date
            placementDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          } else {
            fieldsToClear.push('placementDate')
          }

          if (form.hasTime && form.time) {
            const t = form.time
            placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(
              t.getSeconds(),
            )}`
          } else {
            fieldsToClear.push('placementTime')
          }

          const reminderNoti = form.reminderNoti ?? null
          if (!reminderNoti) fieldsToClear.push('reminderNoti')

          try {
            if (taskPopupMode === 'edit') {
              if (!taskPopupId) return

              await http.patch(`/task/${taskPopupId}`, {
                title: form.title,
                content: form.memo,
                labels: form.labels,
                placementDate,
                placementTime,
                reminderNoti,
                fieldsToClear,
              })

              bus.emit('calendar:mutated', {
                op: 'update',
                item: { id: taskPopupId },
              })
            } else {
              const res = await http.post('/task', {
                title: form.title,
                content: form.memo,
                labels: form.labels,
                placementDate,
                placementTime,
                reminderNoti,
                date: placementDate ?? anchorDate,
              })

              const newId = res.data?.data?.id

              bus.emit('calendar:mutated', {
                op: 'create',
                item: { id: newId },
              })
            }

            await fetchWeek(weekDates)
            setTaskPopupVisible(false)
            setTaskPopupId(null)
            setTaskPopupTask(null)
          } catch (err) {
            console.error('❌ 테스크 저장 실패:', err)
            Alert.alert('오류', '테스크를 저장하지 못했습니다.')
          }
        }}
        onDelete={taskPopupMode === 'edit' ? onDeleteTask : undefined}
      />

      <EventDetailPopup
        visible={eventPopupVisible}
        eventId={eventPopupData?.id ?? null}
        mode={eventPopupMode}
        initial={eventPopupData ?? undefined}
        onClose={() => {
          setEventPopupVisible(false)
          setEventPopupData(null)
          fetchWeek(weekDates)
        }}
      />

      <AddImageSheet
        visible={imagePopupVisible}
        onClose={() => setImagePopupVisible(false)}
        onPickImage={(_, base64, ext) => sendToOCR(base64, ext)}
        onTakePhoto={(_, base64, ext) => sendToOCR(base64, ext)}
      />

      <Modal visible={ocrSplashVisible} transparent animationType="fade" statusBarTranslucent>
        <OcrSplash />
      </Modal>

      <OCREventCardSlider
        visible={ocrModalVisible}
        events={ocrEvents}
        onClose={() => setOcrModalVisible(false)}
        onAddEvent={async (payload) => {
          try {
            await createEvent(payload)
            await fetchWeek(weekDates)
            bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
          } catch (err) {
            console.error(err)
          }
        }}
        onSaveAll={async () => {
          await fetchWeek(weekDates)
          bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
          setOcrModalVisible(false)
        }}
      />
    </>
  )
}
