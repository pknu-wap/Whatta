import React, { useCallback } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import axios from 'axios'
import { bus } from '@/lib/eventBus'

const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

let draggingEventId: string | null = null

type DraggableFlexilbeEventProps = {
  id: string
  title: string
  place: string
  startMin: number
  endMin: number
  color: string
  anchorDate: string
  isRepeat?: boolean
  onPress?: () => void
  _column?: number
  _totalColumns?: number
}

export default function DraggableFlexilbeEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
  isRepeat = false,
  onPress,
  _column
}: DraggableFlexilbeEventProps) {
  const durationMin = endMin - startMin
  const totalHeight = 24 * 60 * PIXELS_PER_MIN
  const rawHeight = durationMin * PIXELS_PER_MIN
  const height = rawHeight - 2
  const offsetY = 1

  // 절대 Y(위에서부터의 픽셀)로 관리
  const translateY = useSharedValue(startMin * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleDrop = useCallback(
    async (snappedY: number) => {
      draggingEventId = id
      try {
        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(
            2,
            '0',
          )}:00`

        // snappedY(절대 Y) → 분으로
        const newStartMin = snappedY / PIXELS_PER_MIN
        const newEndMin = newStartMin + durationMin

        const newStartTime = fmt(newStartMin)
        const newEndTime = fmt(newEndMin)
        const dateISO = anchorDate

        // 반복 일정 처리
        if (isRepeat) {
          const detailRes = await axios.get(`/event/${id}`)
          const ev = detailRes.data.data
          if (!ev?.repeat) {
            // repeat 데이터가 없으면 그냥 일반 PATCH로 fallback
            await axios.patch(`/event/${id}`, {
              startDate: dateISO,
              endDate: dateISO,
              startTime: newStartTime,
              endTime: newEndTime,
            })
            bus.emit('calendar:mutated', {
              op: 'update',
              item: {
                id,
                isTask: false,
                startDate: dateISO,
                endDate: dateISO,
                startTime: newStartTime,
                endTime: newEndTime,
              },
            })
            return
          }

          const basePayload = {
            title: ev.title,
            content: ev.content ?? '',
            labels: ev.labels ?? [],
            startDate: dateISO,
            endDate: dateISO,
            startTime: newStartTime,
            endTime: newEndTime,
            colorKey: ev.colorKey,
          }

          const ymdLocal = (iso: string) => iso // 이미 ISO라 그대로 사용
          const prevDay = (iso: string) => {
            const d = new Date(
              Number(iso.slice(0, 4)),
              Number(iso.slice(5, 7)) - 1,
              Number(iso.slice(8, 10)),
            )
            d.setDate(d.getDate() - 1)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          }

          Alert.alert('반복 일정 수정', '이후 반복하는 일정들도 반영할까요?', [
            { text: '취소', style: 'cancel' },

            {
              text: '이 일정만',
              onPress: async () => {
                try {
                  const occDate = ymdLocal(dateISO)
                  const prev = ev.repeat.exceptionDates ?? []
                  const next = prev.includes(occDate) ? prev : [...prev, occDate]

                  // 1) 기존 반복 일정에 exceptionDates 패치
                  await axios.patch(`/event/${id}`, {
                    repeat: {
                      ...ev.repeat,
                      exceptionDates: next,
                    },
                  })

                  // 2) 단일 일정 생성
                  await axios.post('/event', {
                    ...basePayload,
                    repeat: null,
                  })

                  bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
                  bus.emit('calendar:mutated', {
                    op: 'update',
                    item: { id, startDate: dateISO, endDate: dateISO },
                  })
                } catch (e) {
                  console.error('❌ 반복 단일 수정(드래그) 실패:', e)
                }
              },
            },

            {
              text: '이후 일정 모두',
              onPress: async () => {
                try {
                  const cutEnd = prevDay(dateISO)

                  // 1) 기존 반복 일정 끝을 전날로 자름
                  await axios.patch(`/event/${id}`, {
                    repeat: {
                      ...ev.repeat,
                      endDate: cutEnd,
                    },
                  })

                  // 2) 이후 구간 새 반복 일정 생성
                  await axios.post('/event', {
                    ...basePayload,
                    repeat: ev.repeat,
                  })

                  bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
                  bus.emit('calendar:mutated', {
                    op: 'update',
                    item: { id, startDate: dateISO, endDate: dateISO },
                  })
                } catch (e) {
                  console.error('❌ 반복 전체 수정(드래그) 실패:', e)
                }
              },
            },
          ])

          return
        }

        await axios.patch(`/event/${id}`, {
          startDate: dateISO,
          endDate: dateISO,
          startTime: newStartTime,
          endTime: newEndTime,
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            isTask: false,
            startDate: dateISO,
            endDate: dateISO,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
      } catch (err: any) {
        console.error('❌ 이벤트 시간 이동 실패:', err.message)
      }
    },
    [id, durationMin, anchorDate, isRepeat],
  )

  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      const minTop = 0
      const maxTop = totalHeight - rawHeight

      const nextY = translateY.value + e.changeY

      translateY.value = Math.max(minTop, Math.min(maxTop, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const minTop = 0
      const maxTop = totalHeight - rawHeight

      let snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      snappedY = Math.max(minTop, Math.min(maxTop, snappedY))

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      runOnJS(handleDrop)(snappedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    top: translateY.value + offsetY,
    transform: [{ translateX: translateX.value }],
  }))

  const backgroundColor = color.startsWith('#') ? color : `#${color}`

  // ⭐ 겹침용 계단식 offset
const BASE_LEFT = 50 + 18
const STAGGER = 32         // 하나 겹칠 때마다 오른쪽으로 32px
const MAX_STAGGER = 96        // 너무 많아지면 제한

const shift = Math.min((_column ?? 0) * STAGGER, MAX_STAGGER)

const left = BASE_LEFT + shift

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left,
            right: 18,
            height,
            backgroundColor,
            paddingHorizontal: 6,
            paddingTop: 10,
            borderRadius: 3,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Pressable onPress={onPress} style={{ flex: 1 }} hitSlop={10}>
          <Text
            style={{
              color: '#000000',
              fontWeight: '600',
              fontSize: 13,
              lineHeight: 15,
            }}
          >
            {title}
          </Text>
          {!!place && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 10,
                marginTop: 10,
                lineHeight: 10,
              }}
            >
              {place}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}