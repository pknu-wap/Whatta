import { useCallback } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { addDays } from './dateUtils'

const { width: SCREEN_W } = Dimensions.get('window')

export function useDaySwipe(
  setAnchorDate: React.Dispatch<React.SetStateAction<string>>
) {
  const swipeTranslateX = useSharedValue(0)

  const handleSwipe = useCallback(
    (dir: 'prev' | 'next') => {
      setAnchorDate((prev) =>
        addDays(prev, dir === 'next' ? 1 : -1)
      )
    },
    [setAnchorDate]
  )

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet'
      let nx = e.translationX
      const max = SCREEN_W * 0.15
      if (nx > max) nx = max
      if (nx < -max) nx = -max
      swipeTranslateX.value = nx
    })
    .onEnd(() => {
      'worklet'
      const cur = swipeTranslateX.value
      const th = SCREEN_W * 0.06

      if (cur > th) {
        swipeTranslateX.value = withTiming(
          SCREEN_W * 0.15,
          { duration: 120 },
          () => {
            runOnJS(handleSwipe)('prev')
            swipeTranslateX.value = withTiming(0, { duration: 160 })
          }
        )
      } else if (cur < -th) {
        swipeTranslateX.value = withTiming(
          -SCREEN_W * 0.15,
          { duration: 120 },
          () => {
            runOnJS(handleSwipe)('next')
            swipeTranslateX.value = withTiming(0, { duration: 160 })
          }
        )
      } else {
        swipeTranslateX.value = withTiming(0, { duration: 150 })
      }
    })

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }))

  return {
    swipeGesture,
    swipeStyle,
  }
}