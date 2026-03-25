import React, { useState, useEffect } from 'react'
import { Modal, View, FlatList, Dimensions, StyleSheet, Pressable, Text, Alert } from 'react-native'
import OCREventCard from './OcrEventCard'
import colors from '@/styles/colors'
import { createEvent, CreateEventPayload } from '@/api/event_api'
import { getMyLabels, createLabel } from '@/api/label_api'
import { resolveScheduleColor ,resolveSlotIndex, slotKey } from '@/styles/scheduleColorSets'

import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated'

export interface OCREventDisplay {
  id: string
  title: string
  content?: string
  weekDay?: string
  date: string
  startTime?: string
  endTime?: string
  colorKey?: string
}

interface Props {
  visible: boolean
  events: OCREventDisplay[]
  onClose: () => void
  onAddEvent: (ev: any) => void
  onSaveAll?: () => void
  colorKey?: string
}

function AnimatedCard({
  children,
  isLast,
  itemWidth,
  itemHeight,
  spacing,
  onRemove,
  id,
}: {
  children: (animateRemove: () => void) => React.ReactNode
  isLast: boolean
  itemWidth: number
  itemHeight: number
  spacing: number
  onRemove: (id: string) => void
  id: string
}) {
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const animateRemove = () => {
    translateY.value = withTiming(-40, { duration: 250 })
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(onRemove)(id)
      }
    })
  }

  return (
    <Animated.View
      style={[
        {
          width: itemWidth,
          height: itemHeight,
          marginRight: isLast ? 0 : spacing,
          marginTop: 32,
          justifyContent: 'flex-start',
          alignItems: 'center',
        },
        animStyle,
      ]}
    >
      {children(animateRemove)}
    </Animated.View>
  )
}

export default function OCREventCardSlider({
  visible,
  events,
  onClose,
  onAddEvent,
  onSaveAll,
  colorKey,
}: Props) {

  const [selectedColor, setSelectedColor] = useState(resolveScheduleColor(colorKey))

const { width: W } = Dimensions.get('window')

const CARD_BASE_W = 350
const CARD_BASE_H = 569
const CARD_RATIO = CARD_BASE_H / CARD_BASE_W

const ITEM_WIDTH = Math.min(W - 56, 350) 
const ITEM_HEIGHT = ITEM_WIDTH * CARD_RATIO

const SPACING = 12
const SIDE_PADDING = (W - ITEM_WIDTH) / 2

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

    setEditedEvents((prev) =>
      events.map((ev) => {
        const existing = prev.find((item) => item.id === ev.id)

        if (existing) {
          return {
            ...existing,
            labels:
              existing.labels?.length
                ? existing.labels.includes(timetableLabelId)
                  ? existing.labels
                  : [...existing.labels, timetableLabelId]
                : [timetableLabelId],
          }
        }

        return {
          id: ev.id,
          title: ev.title,
          content: ev.content ?? '',
          labels: [timetableLabelId],
          startDate: ev.date,
          endDate: ev.date,
          startTime: ev.startTime ? `${ev.startTime}:00` : null,
          endTime: ev.endTime ? `${ev.endTime}:00` : null,
          repeat: mapWeekDayToRepeat(ev.weekDay),
          colorKey: slotKey(resolveSlotIndex(selectedColor)),
        }
      }),
    )
  }, [events, timetableLabelId, selectedColor])

  const payloadGettersRef = React.useRef<Record<string, () => CreateEventPayload>>({})

const registerPayloadGetter = (id: string, getter: () => CreateEventPayload) => {
  payloadGettersRef.current[id] = getter
}

const unregisterPayloadGetter = (id: string) => {
  delete payloadGettersRef.current[id]
}

  /** ⭐ 모두 저장 */
const handleSaveAll = async () => {
  try {
    for (const item of editedEvents) {
      const getter = payloadGettersRef.current[item.id]

      const payload = getter
        ? getter()
        : (() => {
            const { id, ...rest } = item
            return rest
          })()

      await createEvent(payload)
      onAddEvent(payload)
    }

    onSaveAll?.()
    onClose()
  } catch (err) {
    console.error(err)
    Alert.alert('오류', '일정 저장 중 오류가 발생했습니다.')
  }
}

  const handleRemoveCard = (id: string) => {
  setEditedEvents(prev => prev.filter(ev => ev.id !== id))
}

useEffect(() => {
  if (editedEvents.length === 0) onClose()
}, [editedEvents])

  return (
    <Modal transparent visible={visible} animationType="fade">
     <View style={styles.overlay}>
<View style={styles.cardArea}>
  <View style={styles.sliderBox}>
    <FlatList
      data={editedEvents}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={ITEM_WIDTH + SPACING}
      contentContainerStyle={styles.sliderContent}
      ListHeaderComponent={<View style={{ width: SIDE_PADDING }} />}
      ListFooterComponent={<View style={{ width: SIDE_PADDING }} />}
      renderItem={({ item, index }) => {
        const isLast = index === editedEvents.length - 1

        return (
          <AnimatedCard
            id={item.id}
            isLast={isLast}
            itemWidth={ITEM_WIDTH}
            itemHeight={ITEM_HEIGHT}
            spacing={SPACING}
            onRemove={handleRemoveCard}
          >
            {(animateRemove) => (
              <OCREventCard
                title={item.title}
                week={events.find((ev) => ev.id === item.id)?.weekDay}
                date={item.startDate}
                startTime={item.startTime?.slice(0, 5)}
                endTime={item.endTime?.slice(0, 5)}
                registerPayloadGetter={(getter) => registerPayloadGetter(item.id, getter)}
                unregisterPayloadGetter={() => unregisterPayloadGetter(item.id)}
                onSubmit={async (finalPayload) => {
                  try {
                    const handleUpdateEditedEvent = (id: string, payload: CreateEventPayload) => {
                      setEditedEvents(prev =>
                        prev.map(ev => (ev.id === id ? { ...ev, ...payload } : ev))
                      )
                    }

                    const savedPayload = {
                      ...finalPayload,
                    }

                    handleUpdateEditedEvent(item.id, savedPayload)
                    await createEvent(savedPayload)

                    onAddEvent(savedPayload)
                    animateRemove()
                  } catch (e) {
                    console.error('❌ 일정 저장 실패:', e)
                    Alert.alert('오류', '일정 저장 중 문제가 발생했습니다.')
                  }
                }}
                onClose={animateRemove}
              />
            )}
          </AnimatedCard>
        )
      }}
    />
  </View>

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
    backgroundColor: 'rgba(255,255,255,0.62)',
  },

cardArea: {
  width: '100%',
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

saveAllBtn: {
  position: 'absolute',
  bottom: 90,
  alignSelf: 'center',

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
  sliderBox: {
  justifyContent: 'center',
},

sliderContent: {
  alignItems: 'center',
  paddingVertical: 16,
},
})
