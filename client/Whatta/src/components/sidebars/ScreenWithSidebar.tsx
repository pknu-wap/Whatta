import React, { useMemo, useEffect } from 'react'
import { StyleSheet, View, Pressable, Dimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import Sidebar from '@/components/sidebars/Sidebar'
import Header from '@/components/Header'
import { bus } from '@/lib/eventBus'
import { useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import colors from '@/styles/colors'

type Props = { mode: 'push' | 'overlay'; children: React.ReactNode }

const BASE_HEADER_H = 58
const Tab = createBottomTabNavigator()

export default function ScreenWithSidebar({ mode, children }: Props) {
  const { progress, width: sbWidth, close, isOpen } = useDrawer()
  const CLOSE_ANIM_MS = 220
  const insets = useSafeAreaInsets()
  const headerTotalH = useMemo(() => BASE_HEADER_H + insets.top, [insets.top])
  const screenWidth = useMemo(() => Dimensions.get('window').width, [])
  const navigation = useNavigation()

  // 닫고 -> 실행 훅
  useEffect(() => {
    const handler = (fn: () => void) => {
      if (!isOpen) {
        fn()
        return
      }
      close()
      setTimeout(() => {
        try {
          fn()
        } catch (e) {
          console.warn(e)
        }
      }, CLOSE_ANIM_MS)
    }
    bus.on('drawer:close-then', handler)
    return () => bus.off('drawer:close-then', handler)
  }, [isOpen, close])

  // 탭 전환 가로채기
  useEffect(() => {
    const unsub = (navigation as any)?.addListener?.('tabPress', (e: any) => {
      if (!isOpen) return
      e.preventDefault?.()
      close()
      const state = (navigation as any).getState?.()
      const target = state?.routes?.find((r: any) => r.key === e.target)
      const name = target?.name
      setTimeout(() => name && (navigation as any).navigate(name), CLOSE_ANIM_MS)
    })
    return unsub
  }, [isOpen, close, navigation])

  const tapCatcherStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.01], [0, 1]),
    left: interpolate(progress.value, [0, 1], [0, sbWidth]),
  }))

  /** ✅ 콘텐츠 밀림 및 축소 애니메이션 */
  const contentStyle = useAnimatedStyle(() => {
    const isPush = mode === 'push'

    if (isPush) {
      const scaleValue = interpolate(
        progress.value,
        [0, 1],
        [1, (screenWidth - sbWidth) / screenWidth],
      )

      const translateXValue = interpolate(progress.value, [0, 1], [0, sbWidth])

      const centerOffset = interpolate(
        progress.value,
        [0, 1],
        [0, -((1 - scaleValue) * screenWidth) / 2],
      )

      return {
        paddingTop: headerTotalH,
        transform: [
          { translateX: translateXValue + centerOffset },
          { scaleX: scaleValue },
        ],
      }
    }

    return {
      paddingTop: headerTotalH,
    }
  })

  /** ✅ 사이드바 슬라이드 */
  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-sbWidth, 0]) }],
    width: sbWidth,
  }))
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.neutral.surface }}
      pointerEvents="box-none"
    >
      {/* ✅ 메인 콘텐츠 */}
      <Animated.View style={[S.content, contentStyle, { zIndex: 35 }]}>
        {children}
      </Animated.View>

      <Animated.View
        style={[S.tapCatcher, tapCatcherStyle, { top: headerTotalH, zIndex: 100 }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            close()
            bus.emit('drawer:close') // ⬅️ 닫힘 방송
          }}
        />
      </Animated.View>

      {/* ✅ 사이드바 영역 */}
      <Animated.View
        style={[
          S.sidebarWrap,
          sidebarStyle,
          { top: headerTotalH, bottom: 0, zIndex: 40 },
        ]}
        pointerEvents="auto"
      >
        <Sidebar />
      </Animated.View>

      {/* ✅ 헤더 고정 */}
      <SafeAreaView
        edges={['top']}
        style={[S.headerSafeFixed, { height: headerTotalH, zIndex: 50 }]}
      >
        <Header />
      </SafeAreaView>
    </View>
  )
}

const S = StyleSheet.create({
  sidebarWrap: {
    position: 'absolute',
    backgroundColor: colors.neutral.surface,
  },
  headerSafeFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.surface,
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
  },
  tapCatcher: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0)',
  },
})
