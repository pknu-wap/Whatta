import React, { useState } from 'react'
import { Modal, View, FlatList, Dimensions, StyleSheet, Pressable, Text, Alert } from 'react-native'
import OCREventCard from './OcrEventCard'
import colors from '@/styles/colors'
import { createEvent, CreateEventPayload } from '@/api/event_api'

export interface OCREventDisplay {
  id: string
  title: string
  content?: string
  weekDay?: string
  date: string
  startTime?: string
  endTime?: string
}

interface Props {
  visible: boolean
  events: OCREventDisplay[]       // OCR에서 뽑힌 원본
  onClose: () => void
  onAddEvent: (ev: any) => void
  onSaveAll?: () => void
}

export default function OCREventCardSlider({
  visible,
  events,
  onClose,
  onAddEvent,
  onSaveAll,
}: Props) {

  const { width } = Dimensions.get('window')
  const ITEM_WIDTH = width * 0.88
  const SPACING = 6
  const SIDE_PADDING = (width - ITEM_WIDTH) / 1.55

const mapWeekDayToRepeat = (w?: string) => {
  if (!w) return null

  const key = w.trim().toUpperCase()
  const map: Record<string, string> = {
    MON: 'MON',
    TUE: 'TUE',
    WED: 'WED',
    THU: 'THU',
    FRI: 'FRI',
    SAT: 'SAT',
    SUN: 'SUN',
  }

  if (!map[key]) return null

  return {
    interval: 1,
    unit: 'WEEK' as const,
    on: [map[key]] as string[],
    endDate: null,
    exceptionDates: [] as string[],
  }
}

  // ⭐ editedEvents → 이제 서버에 보낼 수 있는 full payload 를 저장함
  const [editedEvents, setEditedEvents] = useState<
    (CreateEventPayload & { id: string })[]
  >([])
   React.useEffect(() => { // ✅ 여기: events가 바뀔 때마다 동기화
  setEditedEvents(
    events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      content: ev.content ?? '',
      labels: [],
      startDate: ev.date,
      endDate: ev.date,
      startTime: ev.startTime ? `${ev.startTime}:00` : null,
      endTime: ev.endTime ? `${ev.endTime}:00` : null,
      repeat: mapWeekDayToRepeat(ev.weekDay),
      colorKey: 'FFD966',
      reminderNoti: { day: 0, hour: 0, minute: 0 },
    }))
  )
}, [events]) // ✅ 여기: deps에 events 추가

  // ⭐ “모두 저장”
  const handleSaveAll = async () => {
    try {
      for (const payload of editedEvents) {
        await createEvent(payload)
      }

      onSaveAll?.()
      onClose()
      Alert.alert('성공', '모든 일정이 저장되었습니다.')
    } catch (err) {
      console.error(err)
      Alert.alert('오류', '일정 저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.centerWrap}>

          <FlatList
            data={editedEvents}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={ITEM_WIDTH + SPACING}
            ListHeaderComponent={<View style={{ width: SIDE_PADDING }} />}
            ListFooterComponent={<View style={{ width: SIDE_PADDING }} />}
            renderItem={({ item, index }) => {
              const isLast = index === editedEvents.length - 1

              return (
                <View
                  style={{
                    width: ITEM_WIDTH,
                    marginRight: isLast ? 0 : SPACING,
                  }}
                >
                  <OCREventCard
                    // OCR 원본 표시용
                    title={item.title}
                    date={item.startDate}
                    week={undefined}
                    startTime={item.startTime?.slice(0,5)}
                    endTime={item.endTime?.slice(0,5)}

                    // ⭐ 핵심: OCREventCard 에서 완성된 payload 가 들어옴
                    onSubmit={(finalPayload) => {
  setEditedEvents((prev) =>
    prev.map((ev) =>
      ev.id === item.id
        ? { ...ev, ...finalPayload, repeat: ev.repeat }  // ⭐ 반복 유지
        : ev
    )
  )

  onAddEvent({ ...finalPayload, repeat: item.repeat })  // ⭐ 유지
}}

                    onClose={onClose}
                  />
                </View>
              )
            }}
          />

          {/* 모두 저장 버튼 */}
          <Pressable style={styles.saveAllBtn} onPress={handleSaveAll}>
            <Text style={styles.saveAllText}>모두 저장</Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerWrap: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  saveAllBtn: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 64,
    width: 100,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAllText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
  },
})