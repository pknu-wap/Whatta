import React, { useState, useEffect } from 'react'
import { Modal, View, FlatList, Dimensions, StyleSheet, Pressable, Text, Alert } from 'react-native'
import OCREventCard from './OcrEventCard'
import colors from '@/styles/colors'
import { createEvent, CreateEventPayload } from '@/api/event_api'
import { getMyLabels, createLabel } from '@/api/label_api'

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
  events: OCREventDisplay[]
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

  /** 📌 요일 반복 */
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
      on: [map[key]],
      endDate: null,
      exceptionDates: [],
    }
  }

  // ⭐ 시간표 라벨 ID 저장
  const [timetableLabelId, setTimetableLabelId] = useState<number | null>(null)

  /** ⭐ Step 1: 라벨 목록 불러오고, '시간표' 없으면 생성 */
  useEffect(() => {
    const initLabel = async () => {
      const list = await getMyLabels()
      let label = list.find(l => l.title === '시간표')

      if (!label) {
        // 자동 생성
        label = await createLabel('시간표')
      }

      setTimetableLabelId(label.id)
    }

    initLabel()
  }, [])

  /** ⭐ Step 2: OCR events → editedEvents 초기 세팅 (라벨 자동 적용) */
  const [editedEvents, setEditedEvents] = useState<(CreateEventPayload & { id: string })[]>([])

  useEffect(() => {
    if (!timetableLabelId) return // 라벨 준비되면 실행

    setEditedEvents(
      events.map(ev => ({
        id: ev.id,
        title: ev.title,
        content: ev.content ?? '',
        labels: [timetableLabelId],        // ★ 라벨 자동 적용
        startDate: ev.date,
        endDate: ev.date,
        startTime: ev.startTime ? `${ev.startTime}:00` : null,
        endTime: ev.endTime ? `${ev.endTime}:00` : null,
        repeat: mapWeekDayToRepeat(ev.weekDay),
        colorKey: 'FFD966',
        reminderNoti: { day: 0, hour: 0, minute: 0 },
      }))
    )
  }, [events, timetableLabelId])

  /** ⭐ 모두 저장 */
  const handleSaveAll = async () => {
    try {
      for (const payload of editedEvents) {
        await createEvent(payload)
      }

      onSaveAll?.()
      onClose()

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
                    title={item.title}
                    date={item.startDate}
                    week={undefined}
                    startTime={item.startTime?.slice(0, 5)}
                    endTime={item.endTime?.slice(0, 5)}
                    

                    onSubmit={(finalPayload) => {
                      setEditedEvents(prev =>
                        prev.map(ev =>
                          ev.id === item.id
                            ? { ...ev, ...finalPayload, repeat: ev.repeat }
                            : ev
                        )
                      )

                      onAddEvent({ ...finalPayload, repeat: item.repeat })
                    }}

                    onClose={onClose}
                  />
                </View>
              )
            }}
          />

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