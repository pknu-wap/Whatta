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
  const pinchActive = useSharedValue(0)
  const transitionLock = useSharedValue(0)

  const handleSwipe = (direction: 'prev' | 'next') => {
    const step = isZoomed ? 5 : 7
    const offset = direction === 'next' ? step : -step
    const nextDate = addDays(anchorDate, offset)
    bus.emit('calendar:set-date', nextDate)
  }

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          'worklet'
          if (pinchActive.value || transitionLock.value) return

          let next = e.translationX
          const maxOffset = screenWidth * 0.15
          if (next > maxOffset) next = maxOffset
          if (next < -maxOffset) next = -maxOffset
          swipeTranslateX.value = next
        })
        .onEnd(() => {
          'worklet'
          if (pinchActive.value || transitionLock.value) {
            swipeTranslateX.value = withTiming(0, { duration: 180 })
            return
          }

          const current = swipeTranslateX.value
          const trigger = screenWidth * 0.062

          if (current > trigger) {
            transitionLock.value = 1
            swipeTranslateX.value = withTiming(screenWidth * 0.15, { duration: 130 }, () => {
              runOnJS(handleSwipe)('prev')
              swipeTranslateX.value = withTiming(0, { duration: 170 }, () => {
                transitionLock.value = 0
              })
            })
          } else if (current < -trigger) {
            transitionLock.value = 1
            swipeTranslateX.value = withTiming(-screenWidth * 0.15, { duration: 130 }, () => {
              runOnJS(handleSwipe)('next')
              swipeTranslateX.value = withTiming(0, { duration: 170 }, () => {
                transitionLock.value = 0
              })
            })
          } else {
            swipeTranslateX.value = withTiming(0, { duration: 140 })
          }
        }),
    [anchorDate, isZoomed, screenWidth],
  )

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          'worklet'
          if (transitionLock.value) return
          pinchActive.value = 1
        })
        .onUpdate((e) => {
          'worklet'
          if (transitionLock.value) return
          const next = Math.max(0.92, Math.min(e.scale, 1.08))
          scale.value = next
        })
        .onEnd(() => {
          'worklet'
          if (transitionLock.value) {
            scale.value = withTiming(1, { duration: 180 })
            pinchActive.value = 0
            return
          }

          const current = scale.value
          const shouldZoomIn = current > 1.04 && !isZoomed
          const shouldZoomOut = current < 0.96 && isZoomed

          if (shouldZoomIn) {
            transitionLock.value = 1
            runOnJS(setIsZoomed)(true)
            scale.value = withTiming(1, { duration: 150 }, () => {
              transitionLock.value = 0
            })
          } else if (shouldZoomOut) {
            transitionLock.value = 1
            runOnJS(setIsZoomed)(false)
            scale.value = withTiming(1, { duration: 150 }, () => {
              transitionLock.value = 0
            })
          } else {
            scale.value = withTiming(1, { duration: 140 })
          }
          pinchActive.value = 0
        })
        .onFinalize(() => {
          'worklet'
          pinchActive.value = 0
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
