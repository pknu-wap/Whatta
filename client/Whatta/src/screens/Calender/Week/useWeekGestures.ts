import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { bus } from '@/lib/eventBus'
import { addDays } from '@/screens/Calender/Week/date'

type UseWeekGesturesParams = {
  anchorDate: string
  isZoomed: boolean
  setIsZoomed: Dispatch<SetStateAction<boolean>>
  screenWidth: number
}

export function useWeekGestures({
  anchorDate,
  isZoomed,
  setIsZoomed,
  screenWidth,
}: UseWeekGesturesParams) {
  const scale = useSharedValue(1)
  const swipeTranslateX = useSharedValue(0)

  const handleSwipe = (direction: 'prev' | 'next') => {
    const step = isZoomed ? 5 : 7
    const offset = direction === 'next' ? step : -step
    const nextDate = addDays(anchorDate, offset)
    bus.emit('calendar:set-date', nextDate)
  }

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          'worklet'
          let next = e.translationX
          const maxOffset = screenWidth * 0.15
          if (next > maxOffset) next = maxOffset
          if (next < -maxOffset) next = -maxOffset
          swipeTranslateX.value = next
        })
        .onEnd(() => {
          'worklet'
          const current = swipeTranslateX.value
          const trigger = screenWidth * 0.06

          if (current > trigger) {
            swipeTranslateX.value = withTiming(screenWidth * 0.15, { duration: 120 }, () => {
              runOnJS(handleSwipe)('prev')
              swipeTranslateX.value = withTiming(0, { duration: 160 })
            })
          } else if (current < -trigger) {
            swipeTranslateX.value = withTiming(-screenWidth * 0.15, { duration: 120 }, () => {
              runOnJS(handleSwipe)('next')
              swipeTranslateX.value = withTiming(0, { duration: 160 })
            })
          } else {
            swipeTranslateX.value = withTiming(0, { duration: 150 })
          }
        }),
    [anchorDate, isZoomed, screenWidth],
  )

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => {
          scale.value = e.scale
        })
        .onEnd(() => {
          const current = scale.value
          if (current > 1.05 && !isZoomed) {
            runOnJS(setIsZoomed)(true)
          } else if (current < 0.95 && isZoomed) {
            runOnJS(setIsZoomed)(false)
          }
          scale.value = withTiming(1, { duration: 150 })
        }),
    [isZoomed, setIsZoomed],
  )

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, swipeGesture),
    [pinchGesture, swipeGesture],
  )

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }))
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return {
    composedGesture,
    swipeStyle,
    animatedStyle,
  }
}
