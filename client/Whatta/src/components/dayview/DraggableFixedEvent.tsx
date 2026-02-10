import React, { useCallback } from 'react'
import { Text, Pressable, Alert } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { http } from '@/lib/http'
import { bus } from '@/lib/eventBus'

const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

type DraggableFixedEventProps = {
  id: string
  title: string
  place: string
  startMin: number
  endMin: number
  color: string
  anchorDate: string
  onPress?: () => void
}

export default function DraggableFixedEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
  onPress,
}: DraggableFixedEventProps) {
  // ===== 공통 계산 =====
  const rawHeight = (endMin - startMin) * PIXELS_PER_MIN
  const height = rawHeight

  // ===== 드래그 상태 =====
  const translateY = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  // ===== 드롭 처리 =====
  const handleDrop = useCallback(
    async (movedY: number) => {
      try {
        const SNAP_UNIT = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP_UNIT) * SNAP_UNIT
        translateY.value = withSpring(snappedY)

        const deltaMin = snappedY / PIXELS_PER_MIN
        const newStart = startMin + deltaMin
        const newEnd = endMin + deltaMin

        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`

        const newStartTime = fmt(newStart)
        const newEndTime = fmt(newEnd)

        // 🔥 반복 일정 팝업 적용
        const detailRes = await http.get(`/event/${id}`)
        const ev = detailRes.data.data

        if (ev?.repeat) {
          const basePayload = {
            title: ev.title,
            content: ev.content ?? '',
            labels: ev.labels ?? [],
            startDate: anchorDate,
            endDate: anchorDate,
            startTime: newStartTime,
            endTime: newEndTime,
            colorKey: ev.colorKey,
          }

          const prevDay = (iso: string) => {
            const d = new Date(iso)
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
                  const occ = anchorDate
                  const prev = ev.repeat.exceptionDates ?? []
                  const next = prev.includes(occ) ? prev : [...prev, occ]

                  // 기존 반복 일정에서 제외
                  await http.patch(`/event/${id}`, {
                    repeat: {
                      ...ev.repeat,
                      exceptionDates: next,
                    },
                  })

                  // 단일 일정 만들기
                  await http.post(`/event`, {
                    ...basePayload,
                    repeat: null,
                  })

                  bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
                } catch (e) {
                  console.error('❌ 반복 단일 수정 실패:', e)
                }
              },
            },

            {
              text: '이후 일정 모두',
              onPress: async () => {
                try {
                  const cutEnd = prevDay(anchorDate)

                  // 기존 반복 일정 잘라내기
                  await http.patch(`/event/${id}`, {
                    repeat: {
                      ...ev.repeat,
                      endDate: cutEnd,
                    },
                  })

                  // 이후 반복 일정 새로 만들기
                  await http.post(`/event`, {
                    ...basePayload,
                    repeat: ev.repeat,
                  })

                  bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
                } catch (e) {
                  console.error('❌ 반복 전체 수정 실패:', e)
                }
              },
            },
          ])

          return
        }

        // 🔥 일반 일정 PATCH (기존 Fixed 로직)
        await http.patch(`/event/${id}`, {
          startDate: anchorDate,
          endDate: anchorDate,
          startTime: newStartTime,
          endTime: newEndTime,
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            isTask: false,
            startDate: anchorDate,
            endDate: anchorDate,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
      } catch (err: any) {
        console.error('❌ FixedEvent 드롭 실패:', err.message)
      }
    },
    [id, startMin, endMin, anchorDate],
  )

  // ===== 롱프레스 후 드래그 시작 =====
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  // ===== 드래그 =====
  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      const totalHeight = 24 * 60 * PIXELS_PER_MIN
      const topOffset = startMin * PIXELS_PER_MIN + translateY.value + e.changeY

      const minTop = 0
      const maxTop = totalHeight - rawHeight
      const clampedTop = Math.max(minTop, Math.min(maxTop, topOffset))
      translateY.value = clampedTop - startMin * PIXELS_PER_MIN
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const totalHeight = 24 * 60 * PIXELS_PER_MIN
      const topOffset = startMin * PIXELS_PER_MIN + translateY.value

      const minTop = 0
      const maxTop = totalHeight - rawHeight

      const clampedTop = Math.max(minTop, Math.min(maxTop, topOffset))
      const delta = clampedTop - startMin * PIXELS_PER_MIN

      translateY.value = delta
      runOnJS(handleDrop)(delta)
    })

  // ===== 합성 제스처 =====
  const composedGesture = Gesture.Simultaneous(hold, drag)

  // ===== 스타일 =====
  const style = useAnimatedStyle(() => ({
    top: startMin * PIXELS_PER_MIN + translateY.value,
  }))

  const base = color.startsWith('#') ? color : `#${color}`
  const bg = `${base}4D` 

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height,
            backgroundColor: bg,
            paddingHorizontal: 6,
            paddingTop: 10,
            zIndex: 10,
          },
          style,
        ]}
      >
        <Pressable onPress={onPress} style={{ flex: 1 }} hitSlop={10}>
          <Text
            numberOfLines={1}
            style={{
              color: '#000',
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            {title}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: '#6B6B6B',
              marginTop: 8,
              fontSize: 10,
            }}
          >
            {place}
          </Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}