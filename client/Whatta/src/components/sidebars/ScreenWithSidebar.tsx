import React, { useMemo } from 'react'
import { StyleSheet, View, Pressable, Dimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDrawer } from '@/providers/DrawerProvider'
import Animated, { interpolate, useAnimatedStyle, useAnimatedProps } from 'react-native-reanimated'

import Sidebar from '@/components/sidebars/Sidebar'
import Header from '@/components/Header'
import colors from '@/styles/colors'

type Props = { mode: 'push' | 'overlay'; children: React.ReactNode }

const BASE_HEADER_H = 70

export default function ScreenWithSidebar({ mode, children }: Props) {
  const { progress, width: sbWidth, close } = useDrawer()
  const insets = useSafeAreaInsets()
  const headerTotalH = useMemo(() => BASE_HEADER_H + insets.top, [insets.top])

  // 화면 너비 계산
  const screenWidth = useMemo(() => Dimensions.get('window').width, [])

  // 컨텐츠만 이동/축소 (헤더 고정)
  const contentStyle = useAnimatedStyle(() => {
    const isPush = mode === 'push'

    if (isPush) {
      // 축소 비율 계산: (전체 너비 - 사이드바 너비) / 전체 너비
      const scaleValue = interpolate(
        progress.value,
        [0, 1],
        [1, (screenWidth - sbWidth) / screenWidth],
      )

      // 이동 거리 계산 (밀기 효과)
      const translateXValue = interpolate(progress.value, [0, 1], [0, sbWidth])

      // 축소 후 화면 중앙에 오도록 함: (1 - scaleValue) * screenWidth / 2 만큼 왼쪽으로 이동
      const centerOffset = interpolate(
        progress.value,
        [0, 1],
        [0, -((1 - scaleValue) * screenWidth) / 2], // 음수(-)를 사용하여 왼쪽으로 이동
      )

      return {
        transform: [
          { translateX: translateXValue + centerOffset },
          { scaleX: scaleValue },
        ],
      }
    }

    return {
      transform: undefined,
    }
  })

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-sbWidth, 0]) }],
    width: sbWidth,
  }))

  const animatedProps = useAnimatedProps(() => ({
  pointerEvents: (progress.value > 0 ? 'auto' : 'none') as 'auto' | 'none',
}));

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.neutral.surface }}
      pointerEvents="box-none"
    >
      {/* 바깥 영역 탭, 닫기 */}
      <Animated.View style={[S.tapCatcher, { top: headerTotalH, zIndex: 30 }]}
      animatedProps={animatedProps}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      {/* 사이드바 항상 위 */}
      <Animated.View
        style={[
          S.sidebarWrap,
          sidebarStyle,
          {
            top: headerTotalH,
            bottom: 0,
            zIndex: 40,
          },
        ]}
        pointerEvents="auto"
      >
        <Sidebar />
      </Animated.View>

      {/* 헤더 고정 */}
      <SafeAreaView edges={['top']} 
      style={[S.headerSafe]}
      >
        <Header />
      </SafeAreaView>

      {/* 컨텐츠: 축소 및 이동 애니메이션 적용 */}
      <Animated.View style={[S.content, contentStyle]}>{children}</Animated.View>
    </View>
  )
}

const S = StyleSheet.create({
  sidebarWrap: {
    position: 'absolute',
    backgroundColor: colors.neutral.surface,
  },
  headerSafe: {
    backgroundColor: colors.neutral.surface,
  },
  content: { flex: 1, backgroundColor: colors.neutral.surface },
  tapCatcher: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
})
