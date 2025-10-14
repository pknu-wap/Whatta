import React from 'react'
import { StyleSheet, View, Pressable, Text } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { TouchableWithoutFeedback } from 'react-native'
import { ts } from '@/styles/typography'

import Plus from '@/assets/icons/plus.svg'
import PlusShedule from '@/assets/icons/plusSchedule.svg'
import PlusImage from '@/assets/icons/plusScan.svg'
import PlusTask from '@/assets/icons/plusTask.svg'

const AnimatedView = Animated.createAnimatedComponent(View)

type FabProps = {
  bottomOffset?: number
  rightOffset?: number
  collapsedIcon?: React.ReactNode
  expandedIcon?: React.ReactNode
  onPressTop1?: () => void
  onPressTop2?: () => void
  onPressPrimaryWhenOpen?: () => void
}

const OFFSET_Y = 70
const SPRING = { damping: 10, stiffness: 140, overshootClamping: true }

const BTN_SIZE = 56

export default function FabHybridIOS({
  collapsedIcon = <Plus width={BTN_SIZE} height={BTN_SIZE} />,
  expandedIcon = <PlusShedule width={BTN_SIZE} height={BTN_SIZE} />,
  onPressTop1,
  onPressTop2,
  onPressPrimaryWhenOpen,
}: FabProps) {
  const open = useSharedValue(false)
  const [isOpen, setIsOpen] = React.useState(false)

  const openMenu = () => {
    open.value = true
    setIsOpen(true)
  }
  const closeMenu = () => {
    setIsOpen(false)
    open.value = false
  }
  const toggle = () => (isOpen ? closeMenu() : openMenu())

  const overlayAStyle = useAnimatedStyle(() => ({
    opacity: withTiming(open.value ? 1 : 0, { duration: 120 }),
  }))

  const useMiniAStyle = (index: number) =>
    useAnimatedStyle(() => {
      const ty = withSpring(open.value ? -(OFFSET_Y * index) : 0, SPRING)
      const openDelay = (index - 1) * 70
      const closeDelay = open.value ? 0 : (2 - index) * 50
      const opacity = open.value
        ? withDelay(openDelay, withTiming(1, { duration: 140 }))
        : withDelay(closeDelay, withTiming(0, { duration: 140 }))
      return {
        transform: [{ translateY: ty }, { scale: 1 }],
        opacity,
      }
    })

  const s1 = useMiniAStyle(1)
  const s2 = useMiniAStyle(2)

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 딤 배경 */}
      <AnimatedView
        style={[StyleSheet.absoluteFill, S.overlay, overlayAStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
      </AnimatedView>

      {/* FAB 묶음 */}
      <View pointerEvents="box-none" style={[S.wrap]}>
        {/* 미니 버튼 1 */}
        <AnimatedView
          style={[S.miniWrap, s1, S.shadow]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableWithoutFeedback
            accessibilityRole="button"
            onPress={() => {
              closeMenu()
              onPressTop1?.()
            }}
            hitSlop={10}
          >
            <View style={S.miniButtonContent}>
              <Text style={ts('label')}>할 일</Text>
              <PlusTask width={BTN_SIZE} height={BTN_SIZE} />
            </View>
          </TouchableWithoutFeedback>
        </AnimatedView>

        {/* 미니 버튼 2 (이미지로 추가) */}
        <AnimatedView
          style={[S.miniWrap, s2, S.shadow]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableWithoutFeedback
            accessibilityRole="button"
            onPress={() => {
              closeMenu()
              onPressTop2?.()
            }}
            hitSlop={10}
          >
            <View style={S.miniButtonContent}>
              <Text style={ts('label')}>이미지로 추가</Text>
              <PlusImage width={BTN_SIZE} height={BTN_SIZE} />
            </View>
          </TouchableWithoutFeedback>
        </AnimatedView>

        {/* 메인 FAB */}
        <TouchableWithoutFeedback
          accessibilityRole="button"
          onPress={() => {
            if (isOpen && onPressPrimaryWhenOpen) {
              onPressPrimaryWhenOpen()
              closeMenu()
            } else {
              toggle()
            }
          }}
          hitSlop={10}
          style={[S.iconContainer, S.shadow]}
        >
          {isOpen ? (
            <View style={S.miniButtonContent}>
              <Text style={ts('label')}>일정</Text>
              {expandedIcon}
            </View>
          ) : (
            collapsedIcon
          )}
        </TouchableWithoutFeedback>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'flex-end',
    bottom: 124,
    right: 18,
  },
  overlay: { backgroundColor: 'rgba(255,255,255,0.7)' },

  miniWrap: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  iconContainer: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: 'rgb(82, 82, 82)',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  miniButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
