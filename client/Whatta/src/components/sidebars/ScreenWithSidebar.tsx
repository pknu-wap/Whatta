import React, { useMemo, useEffect, useRef } from 'react'
import { StyleSheet, View, Pressable, Dimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useAnimatedProps,
} from 'react-native-reanimated'
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
  const { progress, width: sbWidth, close } = useDrawer()
  const insets = useSafeAreaInsets()
  const headerTotalH = useMemo(() => BASE_HEADER_H + insets.top, [insets.top])
  const screenWidth = useMemo(() => Dimensions.get('window').width, [])
  const navigation = useNavigation<any>()
  const drawerOpenRef = useRef(false)

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

  /** ✅ 오버레이 클릭 감지 (tap catcher) */
  const tapCatcherStyle = useAnimatedStyle(() => {
    const opened = progress.value > 0.01
    return {
      opacity: interpolate(progress.value, [0, 0.01], [0, 1]),
      pointerEvents: opened ? 'auto' : 'none',
      // 사이드바가 열릴수록 오버레이의 왼쪽 경계를 '사이드바 너비'만큼 밀기
      left: interpolate(progress.value, [0, 1], [0, sbWidth]),
    }
  })

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
        style={[S.tapCatcher, tapCatcherStyle, { top: headerTotalH, zIndex: 30 }]} // ⬅️ 30 → 100
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
