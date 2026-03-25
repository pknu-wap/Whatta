import React, { useMemo, useEffect, useState, useRef } from 'react'
import { StyleSheet, View, Pressable, Dimensions, Text } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import Sidebar from '@/components/sidebars/Sidebar'
import Header from '@/components/Header'
import FabHybrid from '@/components/FloatingButton'
import { bus } from '@/lib/eventBus'
import { useNavigation } from '@react-navigation/native'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import { CUSTOM_TAB_BAR_HEIGHT } from '@/navigation/tabBarLayout'
import colors from '@/styles/colors'

type Props = {
  mode: 'push' | 'overlay'
  children: React.ReactNode
  floatingVisible?: boolean
  overlayChildren?: React.ReactNode
}

const BASE_HEADER_H = 48
const HEADER_CONTENT_OFFSET = 4

export default function ScreenWithSidebar({
  mode,
  children,
  floatingVisible = true,
  overlayChildren,
}: Props) {
  const SIDEBAR_GHOST_W = 155
  const SIDEBAR_GHOST_H = 60
  const { progress, width: sbWidth, close, isOpen } = useDrawer()
  const CLOSE_ANIM_MS = 220
  const insets = useSafeAreaInsets()
  const headerTotalH = useMemo(
    () => BASE_HEADER_H + insets.top - HEADER_CONTENT_OFFSET,
    [insets.top],
  )
  const screenWidth = useMemo(() => Dimensions.get('window').width, [])
  const navigation = useNavigation()
  const [activeCalendarMode, setActiveCalendarMode] = useState(currentCalendarView.get())
  const [filterOpen, setFilterOpen] = useState(false)
  const activeCalendarSource =
    activeCalendarMode === 'week'
      ? 'Week'
      : activeCalendarMode === 'day'
        ? 'Day'
        : 'Month'
  // 상태
  const [dragActive, setDragActive] = useState(false) // JSX 렌더용
  const [dragTitle, setDragTitle] = useState<string | null>(null)
  const dragX = useSharedValue(0) // 워크릿용 좌표
  const dragY = useSharedValue(0)
  const dragVisible = useSharedValue(0)
  const dragPrimedRef = useRef(false)
  const [ghostFold, setGhostFold] = useState(false)
  const [ghostMeta, setGhostMeta] = useState({ mode: 'day', w: 320, h: 44 })

  // 사이드바 외부 드래그 신호 수신
  useEffect(() => {
    const onStart = ({ task, x, y }: any) => {
      setDragTitle(task?.title ?? '')
      dragX.value = x
      dragY.value = y
      dragPrimedRef.current = true
      setGhostMeta({ mode: 'sidebar', w: SIDEBAR_GHOST_W, h: SIDEBAR_GHOST_H })
      setDragActive(true)
      dragVisible.value = 1

      if (isOpen) {
        setGhostFold(false)
      }
    }
    bus.on('xdrag:start', onStart)
    return () => bus.off('xdrag:start', onStart)
  }, [isOpen])

  useEffect(() => {
    const unsubscribe = currentCalendarView.subscribe(() => {
      setActiveCalendarMode(currentCalendarView.get())
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const handler = (open: boolean) => setFilterOpen(open)
    bus.on('filter:popup', handler)
    return () => bus.off('filter:popup', handler)
  }, [])

  useEffect(() => {
    // 앱 시작 시 한 번, 현재 달을 강제 재조회
    const today = new Date()
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}` // 'YYYY-MM'
    bus.emit('calendar:invalidate', { ym })
  }, [])

  // 사이드바 Pan이 방송하는 move/drop만 반영
  useEffect(() => {
    const onMove = ({ x, y }: any) => {
      dragX.value = x
      dragY.value = y
      if (dragPrimedRef.current && isOpen && !ghostFold && x > sbWidth + 12) {
        setGhostFold(true)
        bus.emit('drawer:close')
        close()
        bus.emit('xdrag:ready')
      }
    }
    const onDrop = ({ x, y }: any) => {
      dragX.value = x
      dragY.value = y
      dragPrimedRef.current = false
      setDragActive(false)
      setDragTitle(null)
      dragVisible.value = 0
      if (ghostFold) {
        setGhostFold(false)
      } else {
        bus.emit('xdrag:cancel')
      }
    }
    bus.on('xdrag:move', onMove)
    bus.on('xdrag:drop', onDrop)
    return () => {
      bus.off('xdrag:move', onMove)
      bus.off('xdrag:drop', onDrop)
    }
  }, [isOpen, sbWidth, ghostFold, close])

  const ghostStyle = useAnimatedStyle(() => {
    const OFFSET_X = -28 // 손가락보다 25px 오른쪽
    const OFFSET_Y = -15 // 손가락보다 15px 위쪽

    const dy = -ghostMeta.h + OFFSET_Y
    const dx = OFFSET_X

    return {
      transform: [{ translateX: dragX.value + dx }, { translateY: dragY.value + dy }],
      opacity: withTiming(dragVisible.value, { duration: 80 }),
    }
  })

  const ABS_FULL = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  }

  useEffect(() => {
    const handler = () => {
      // WeekView/DayView 둘 다: 레이아웃 재측정을 강제 실행
      bus.emit('calendar:force-measure')
    }
    bus.on('calendar:meta', handler)
    return () => bus.off('calendar:meta', handler)
  }, [])

  useEffect(() => {
    const handler = (meta: any) => {
      // 사이드바에서 드래그 중에는 고스트를 사이드바 카드 크기로 유지
      if (dragActive) return
      if (meta.mode === 'week') {
        setGhostMeta({
          mode: 'week',
          w: meta.dayColWidth - 2,
          h: meta.rowH - 6,
        })
      } else {
        setGhostMeta({
          mode: 'day',
          w: 320,
          h: 44,
        })
      }
    }

    bus.on('calendar:meta', handler)
    return () => bus.off('calendar:meta', handler)
  }, [dragActive])

  const ghostCardStyleDay = {
    position: 'absolute' as const,
    width: ghostMeta.w,
    height: ghostMeta.h,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5E5E5E',
    backgroundColor: '#FFFFFFF2',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    left: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }

  const ghostCardStyleWeek = {
    position: 'absolute' as const,
    width: ghostMeta.w + 8,
    height: ghostMeta.h,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5E5E5E',
    backgroundColor: '#FFFFFFE8',
    paddingHorizontal: 4,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  }

  // close() 호출 전에 항상 drawer:close 이벤트 발생
  useEffect(() => {
    const origClose = close
    const safeClose = () => {
      bus.emit('drawer:close')
      origClose()
    }
    bus.on('drawer:force-close', safeClose)
    return () => bus.off('drawer:force-close', safeClose)
  }, [close])

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
    // 고스트 폴드 시, 콘텐츠를 원래 위치/크기로
    if (ghostFold) {
      return { paddingTop: headerTotalH, transform: [] }
    }
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
    opacity: ghostFold ? 0 : 1,
    width: sbWidth,
  }))
  const showFloating = floatingVisible && !isOpen && !filterOpen
  const floatingBottomOffset = Math.max(CUSTOM_TAB_BAR_HEIGHT + insets.bottom - 18, 0)
  const viewModeBottomOffset = Math.max(CUSTOM_TAB_BAR_HEIGHT + insets.bottom - 7, 11)

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.neutral.surface,
      }}
      pointerEvents="box-none"
    >
      {/* ✅ 메인 콘텐츠 */}
      <Animated.View style={[S.content, contentStyle, { zIndex: 35 }]}>
        {children}
      </Animated.View>
      <Animated.View
        style={[S.tapCatcher, tapCatcherStyle, { top: headerTotalH, zIndex: 100 }]}
        pointerEvents={isOpen && !dragActive && !ghostFold ? 'auto' : 'none'}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            close()
            bus.emit('drawer:close') // ⬅️ 닫힘 방송
          }}
        />
      </Animated.View>
      <View
        style={[S.filterCatcher, { top: headerTotalH, zIndex: 45 }]}
        pointerEvents={filterOpen ? 'auto' : 'none'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            bus.emit('filter:close')
            bus.emit('filter:popup', false)
          }}
        />
      </View>

      {dragActive && (
        // 오버레이 자체가 PanResponder를 “직접” 받습니다.
        <View style={ABS_FULL} pointerEvents="none">
          <Animated.View
            style={[
              ghostMeta.mode === 'day' ? ghostCardStyleDay : ghostCardStyleWeek,
              ghostStyle,
            ]}
          >
            {/* DayView 고스트 */}
            {ghostMeta.mode !== 'week' && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: '100%',
                }}
              >
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderWidth: 2,
                    borderColor: '#333',
                    borderRadius: 3,
                    marginRight: 12,
                  }}
                />
                <Text style={{ fontWeight: 'bold', fontSize: 12 }} numberOfLines={1}>
                  {dragTitle}
                </Text>
              </View>
            )}

            {/* WeekView 고스트 */}
            {ghostMeta.mode === 'week' && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF80',
                  borderRadius: 3,
                  borderWidth: 0.4,
                  borderColor: '#333',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  height: '100%',
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    borderWidth: 1,
                    borderColor: '#333',
                    marginHorizontal: 3,
                  }}
                />
                <Text
                  style={{
                    color: '#000',
                    fontSize: 10,
                    fontWeight: '600',
                    flexShrink: 1,
                  }}
                >
                  {dragTitle}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      )}
      {/* ✅ 사이드바 영역 */}
      <Animated.View
        style={[
          S.sidebarWrap,
          sidebarStyle,
          { top: headerTotalH, bottom: 0, zIndex: 40, borderTopRightRadius: 25 },
        ]}
        pointerEvents={ghostFold ? 'none' : 'auto'}
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
      {overlayChildren ? (
        <View style={S.overlaySlot} pointerEvents="box-none">
          {overlayChildren}
        </View>
      ) : null}
      {showFloating ? (
        <>
          <FabHybrid
            bottomOffset={floatingBottomOffset}
            rightOffset={20}
            onPressTop1={() => {
              bus.emit('popup:schedule:create', { source: activeCalendarSource, createType: 'task' })
            }}
            onPressTop2={() => {
              bus.emit('popup:image:create', { source: activeCalendarSource })
            }}
            onPressPrimaryWhenOpen={() => {
              bus.emit('popup:schedule:create', { source: activeCalendarSource })
            }}
          />
          <View
            style={[
              S.viewModeWrap,
              {
                left: 16,
                bottom: viewModeBottomOffset,
              },
            ]}
          >
            {[
              { key: 'month', label: '월' },
              { key: 'week', label: '주' },
              { key: 'day', label: '일' },
            ].map((item) => {
              const active = activeCalendarMode === item.key
              return (
                <Pressable
                  key={item.key}
                  style={[S.viewModeChip, active && S.viewModeChipActive]}
                  onPress={() => bus.emit('calendar:set-mode', item.key)}
                >
                  <Text style={[S.viewModeText, active && S.viewModeTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </>
      ) : null}
    </View>
  )
}

const S = StyleSheet.create({
  sidebarWrap: {
    position: 'absolute',
    backgroundColor: colors.background.bg2,
  },
  headerSafeFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.surface,
  },
  overlaySlot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    elevation: 55,
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
  filterCatcher: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  viewModeWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 36,
  },
  viewModeChip: {
    minWidth: 42,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  viewModeChipActive: {
    backgroundColor: colors.background.bg2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.text3,
  },
  viewModeTextActive: {
    color: colors.text.text1,
  },
})
