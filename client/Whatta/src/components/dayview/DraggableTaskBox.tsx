import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import axios from 'axios'
import { bus } from '@/lib/eventBus'

const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60
const { width: SCREEN_W } = Dimensions.get('window')

type DraggableTaskBoxProps = {
  id: string
  title: string | undefined
  startHour: number
  placementDate?: string | null
  done?: boolean
  anchorDate: string
  onPress?: () => void
  column: number | undefined
  totalColumns: number | undefined
  events: any[]
}

export default function DraggableTaskBox({
  id,
  title,
  startHour,
  placementDate,
  done: initialDone = false,
  anchorDate,
  onPress,
  column,
  totalColumns,
  events,
}: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)
  const [done, setDone] = useState(initialDone)
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  useEffect(() => {
    translateY.value = withSpring(startHour * 60 * PIXELS_PER_MIN)
  }, [startHour])

  const handleDrop = async (newTime: string) => {
    try {
      await axios.patch(`/task/${id}`, {
        placementDate: anchorDate,
        placementTime: newTime,
        date: anchorDate,
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id, isTask: true, date: anchorDate },
      })
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err: any) {
      console.error('❌ 테스크 시간 이동 실패:', err.message)
    }
  }

  // 롱프레스 후에만 드래그 허용
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      const maxY = 23 * 60 * PIXELS_PER_MIN // 24시 직전까지만
      const nextY = translateY.value + e.changeY
      translateY.value = Math.max(0, Math.min(maxY, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      const newMinutes = snappedY / PIXELS_PER_MIN
      const hour = Math.floor(newMinutes / 60)
      const min = Math.round(newMinutes % 60)

      const fmt = (n: number) => String(n).padStart(2, '0')
      const newTime = `${fmt(hour)}:${fmt(min)}:00`

      runOnJS(handleDrop)(newTime)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
  }))

  // ⭐ Task Overlap 계산 (column/totalColumns을 화면 너비에 반영)
  const COLUMN_GAP = 4
  const LEFT_OFFSET = 50 + 18
  const RIGHT_OFFSET = 18
  const usableWidth = SCREEN_W - LEFT_OFFSET - RIGHT_OFFSET

  const safeColumn = column ?? 0
  const safeTotalColumns = totalColumns ?? 1

const startMin = startHour * 60
const endMin = startMin + 60 // task는 기본 1시간

// 🟣 Task와 겹치는 이벤트 찾기
const overlappingEvents = events.filter(ev => {
  return !(ev.endMin <= startMin || ev.startMin >= endMin)
})

// 이벤트 겹침 오프셋
const EVENT_STAGGER = 14  // 원하는 값(픽셀)

const widthPercent = 1 / safeTotalColumns
  
const isOverlapWithEvent = overlappingEvents.length > 0

let boxWidth = usableWidth * widthPercent - COLUMN_GAP
let left = LEFT_OFFSET + safeColumn * (usableWidth * widthPercent)

if (isOverlapWithEvent) {
  boxWidth = usableWidth * 0.5
  left = LEFT_OFFSET + usableWidth * 0.5
}

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left,
            width: boxWidth,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFF80',
            borderWidth: 0.4,
            borderColor: '#333333',
            borderRadius: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 20,
          },
          style,
        ]}
      >
        {/* ✅ 체크박스 영역 */}
        <Pressable
          onPress={() => {
            const next = !done
            setDone(next)

            axios
              .patch(`/task/${id}`, {
                completed: next,
              })
              .catch((err) => console.error('❌ 테스크 체크 상태 업데이트 실패:', err))
          }}
          style={{
            width: 18,
            height: 18,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={8}
        >
          {done ? (
            <CheckOn width={18} height={18} />
          ) : (
            <CheckOff width={18} height={18} />
          )}
        </Pressable>
        {/* 제목 / 팝업 영역 */}
        <Pressable onPress={onPress} style={{ flex: 1 }} hitSlop={8}>
          <Text
            numberOfLines={1}
            style={{
              color: done ? '#999' : '#000',
              fontWeight: 'bold',
              fontSize: 12,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            {title}
          </Text>
        </Pressable>

        <View></View>
      </Animated.View>
    </GestureDetector>
  )
}