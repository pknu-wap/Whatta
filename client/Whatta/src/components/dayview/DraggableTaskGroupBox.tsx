import React, { useEffect, useCallback } from 'react'
import { View, Text, Pressable, Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { runOnJS } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import type { DayViewTask } from '@/types/calender'
import axios from 'axios'
import { bus } from '@/lib/eventBus'

const { width: SCREEN_W } = Dimensions.get('window')
const ROW_H = 48
const PIXELS_PER_MIN = ROW_H / 60

export default function DraggableTaskGroupBox({
  group,
  startMin,
  count,
  anchorDate,
  onPress,
  setIsDraggingTask, // ⭐ DayView에서 내려받도록 추가
}: {
  group: DayViewTask[]
  startMin: number
  count: number
  anchorDate: string
  onPress: () => void
  setIsDraggingTask: (v: boolean) => void
}) {
  const translateY = useSharedValue(startMin * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  // startMin 변경 → 위치 보정
  useEffect(() => {
    translateY.value = withSpring(startMin * PIXELS_PER_MIN)
  }, [startMin])

  // ------------------------------------------
  //      ⭐ 드롭 처리 (PATCH 병렬 처리)
  // ------------------------------------------
  const handleDrop = useCallback(
    async (snappedY: number) => {
      try {
        const newStartMin = snappedY / PIXELS_PER_MIN
        const delta = newStartMin - startMin
        const fmt = (n: number) => String(n).padStart(2, '0')

        // PATCH 모두 병렬 처리 → 렌더 중단 없이 빠르게 끝남
        await Promise.all(
          group.map(async (t) => {
            const m = t.placementTime?.match(/(\d+):(\d+)/)
            if (!t.placementTime || !m) return

            const oldH = Number(m[1])
            const oldM = Number(m[2])
            const oldMin = oldH * 60 + oldM

            const newMin = oldMin + delta
            const newH = Math.floor(newMin / 60)
            const newM = newMin % 60
            const newTime = `${fmt(newH)}:${fmt(newM)}:00`

            return axios.patch(`/task/${t.id}`, {
              placementDate: anchorDate,
              placementTime: newTime,
              date: anchorDate,
            })
          }),
        )

        // 캘린더 갱신 이벤트 (1번만)
        bus.emit('calendar:mutated', {
          op: 'update',
          item: { id: null, isTask: true, date: anchorDate },
        })
      } catch (err) {
        console.log('❌ Group drop error:', err)
      } finally {
        runOnJS(setIsDraggingTask)(false) // 드래그 종료
      }
    },
    [group, startMin, anchorDate],
  )

  // ------------------------------------------
  //      ⭐ 롱프레스 → 드래그 시작
  // ------------------------------------------
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      runOnJS(setIsDraggingTask)(true) // 드래그 시작 알림
      dragEnabled.value = true
    })

  // ------------------------------------------
  //      ⭐ 드래그
  // ------------------------------------------
  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      const maxY = 23 * 60 * PIXELS_PER_MIN
      const nextY = translateY.value + e.changeY
      translateY.value = Math.max(0, Math.min(maxY, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      snappedY = Math.max(0, Math.min(23 * 60 * PIXELS_PER_MIN, snappedY))

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      runOnJS(handleDrop)(snappedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
  }))

  // UI 위치 계산 (기존과 동일)
  const LEFT_OFFSET = 50 + 18
  const RIGHT_OFFSET = 18
  const usableWidth = SCREEN_W - LEFT_OFFSET - RIGHT_OFFSET
  const boxWidth = usableWidth - 4

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: LEFT_OFFSET,
            width: boxWidth,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFF80',
            borderWidth: 0.4,
            borderRadius: 10,
            borderColor: '#333333',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            zIndex: 30,
          },
          style,
        ]}
      >
        <Pressable
          onPress={onPress}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderWidth: 2,
              borderRadius: 2,
              borderColor: '#333',
              marginRight: 14,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#FFF',
            }}
          />
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#9B4FFF' }}>
            할 일이 있어요! ({count})
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12 }}>▼</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}

