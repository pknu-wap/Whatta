import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFocusEffect } from '@react-navigation/native'
import { runOnJS } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { bus, EVENT } from '@/lib/eventBus'
import axios from 'axios'
import { token } from '@/lib/token'
import { refreshTokens } from '@/api/auth'

const http = axios.create({
  baseURL: 'https://whatta-server-741565423469.asia-northeast3.run.app/api',
  timeout: 8000,
})

// 요청 인터셉터
http.interceptors.request.use(
  (config) => {
    const access = token.getAccess()
    if (access) {
      config.headers.Authorization = `Bearer ${access}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 응답 인터셉터
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        await refreshTokens()
        const newAccess = token.getAccess()
        if (newAccess) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return http(originalRequest)
        }
      } catch (err) {
        console.error('[❌ 토큰 갱신 실패]', err)
      }
    }
    return Promise.reject(error)
  }
)

const pad2 = (n: number) => String(n).padStart(2, '0')
const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

function FullBleed({
  children,
  padH = 12,
  fill = false,
}: {
  children: React.ReactNode
  padH?: number
  fill?: boolean
}) {
  const [parentW, setParentW] = useState<number | null>(null)
  const screenW = Dimensions.get('window').width
  const side = parentW == null ? 0 : (screenW - parentW) / 2
  return (
    <View
      onLayout={(e) => setParentW(e.nativeEvent.layout.width)}
      style={{
        marginLeft: parentW == null ? 0 : -side,
        width: screenW,
        paddingHorizontal: padH,
        ...(fill ? { flex: 1 } : null),
      }}
    >
      {children}
    </View>
  )
}

const INITIAL_CHECKS: any[] = []

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

let draggingEventId: string | null = null

export default function DayView() {
  const [anchorDate, setAnchorDate] = useState<string>(today())
  const [checks, setChecks] = useState(INITIAL_CHECKS)
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([]) 
  const [tasks, setTasks] = useState<any[]>([])

  // ✅ 라이브바 위치 계산
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false) 
  const ROW_H = 48

  useEffect(() => {
    const updateNowTop = (scrollToCenter = false) => {
      const now = new Date()
      const hour = now.getHours()
      const min = now.getMinutes()
      const topPos = (hour * 60 + min) * PIXELS_PER_MIN
      setNowTop(topPos)

      if (scrollToCenter) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(topPos - Dimensions.get('window').height * 0.4, 0),
            animated: false,
          })
        })
        setHasScrolledOnce(true)
      }
    }

    updateNowTop(true)

  }, [])

  useFocusEffect(
    React.useCallback(() => {
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      if (nowTop != null) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(nowTop - Dimensions.get('window').height * 0.2, 0),
            animated: true,
          })
        })
      }
    }, [nowTop, anchorDate]),
  )

  const fetchDailyEvents = useCallback(async (dateISO: string) => {
    try {
      const res = await http.get('/calendar/daily', { params: { date: dateISO } })
      const data = res.data.data
      const timed = data.timedEvents || []
      const timedTasks = data.timedTasks || []
      const allDay = data.allDayTasks || []
      const floating = data.floatingTasks || []
      const allDaySpan = data.allDaySpanEvents || []

      const timelineEvents = timed.filter(
        (e: any) =>
          !e.isSpan &&
          e.clippedEndTime !== '23:59:59.999999999' &&
          e.clippedStartTime &&
          e.clippedEndTime,
      )     
      const span = [
        ...timed.filter(
          (e: any) => e.isSpan || e.clippedEndTime === '23:59:59.999999999',
        ),
        ...allDaySpan,
      ]

      setEvents(timelineEvents)
      setSpanEvents(span)
      setTasks(timedTasks)
      setChecks([
        ...allDay.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
        })),
        ...floating.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
        })),
      ])
    } catch (err) {
      console.error('❌ 일간 일정 불러오기 실패:', err)
      alert('일간 일정 불러오기 실패')
    }
  }, [])

  // 새 일정이 추가되면 즉시 재조회
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const date =
        payload.item.startDate ?? payload.item.date ?? payload.item.endDate ?? today()
      const itemDateISO = date.slice(0, 10)

      if (itemDateISO === anchorDate && payload.item.id !== draggingEventId) {
     fetchDailyEvents(anchorDate)
   } else {
     draggingEventId = null
   }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [anchorDate, fetchDailyEvents])

  useEffect(() => {
    fetchDailyEvents(anchorDate)
  }, [anchorDate, fetchDailyEvents])

  useFocusEffect(
    React.useCallback(() => {
      const onReq = () => bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      const onSet = (iso: string) => setAnchorDate(iso)
      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
      }
    }, [anchorDate]),
  )

  // 상단 박스 스크롤바 계산
  const [wrapH, setWrapH] = useState(150)
  const [contentH, setContentH] = useState(150)
  const [thumbTop, setThumbTop] = useState(0)
  const boxScrollRef = useRef<ScrollView>(null)
  const gridScrollRef = useRef<ScrollView>(null)

  const onLayoutWrap = (e: any) => setWrapH(e.nativeEvent.layout.height)
  const onContentSizeChange = (_: number, h: number) => setContentH(h)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const ratio =
      contentSize.height <= layoutMeasurement.height
        ? 0
        : contentOffset.y / (contentSize.height - layoutMeasurement.height)
    const top =
      ratio *
      (layoutMeasurement.height - thumbH(layoutMeasurement.height, contentSize.height))
    setThumbTop(top)
  }
  const showScrollbar = contentH > wrapH

  const toggleCheck = async (id: string) => {
  setChecks((prev) =>
    prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
  )

  try {
    const target = checks.find((c) => c.id === id)
    if (!target) return

    await http.put(`/task/${id}`, {
      completed: !target.done,
    })

    bus.emit('calendar:mutated', { op: 'update', item: { id } })
  } catch (err: any) {
    console.error('❌ 테스크 상태 업데이트 실패:', err.message)
  }
}

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <View style={S.screen}>
          {/* ✅ 상단 테스크 박스 */}
          <FullBleed padH={12}>
            <View style={S.taskBoxWrap}>
              <View style={S.taskBox} onLayout={onLayoutWrap}>
                <ScrollView
                  ref={boxScrollRef}
                  onScroll={onScroll}
                  onContentSizeChange={onContentSizeChange}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  contentContainerStyle={S.boxContent}
                  bounces={false}
                >
                  {spanEvents.map((t, i) => {
                    const baseColor =
                      t.colorKey && t.colorKey.toUpperCase() !== 'FFFFFF'
                        ? `#${t.colorKey}`
                        : '#8B5CF6' // ✅ 컬러키가 흰색인 경우 기본 보라색 대체
                    const bgWithOpacity = `${baseColor}26`

                    return (
                      <View
                        key={t.id ?? i}
                        style={[
                          S.chip,
                          i === 0 && { marginTop: 8 },
                          { backgroundColor: bgWithOpacity },
                        ]}
                      >
                        <View style={[S.chipBar, { backgroundColor: baseColor }]} />
                        <Text style={S.chipText} numberOfLines={1}>
                          {t.title}
                        </Text>
                      </View>
                    )
                  })}

                  {checks.map((c) => (
                    <Pressable
                      key={c.id}
                      style={S.checkRow}
                      onPress={() => toggleCheck(c.id)}
                    >
                      <View style={S.checkboxWrap}>
                        <View style={[S.checkbox, c.done && S.checkboxOn]}>
                          {c.done && <Text style={S.checkmark}>✓</Text>}
                        </View>
                      </View>
                      <Text
                        style={[S.checkText, c.done && S.checkTextDone]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </Pressable>
                  ))}

                  <View style={{ height: 8 }} />
                </ScrollView>

                {showScrollbar && (
                  <View pointerEvents="none" style={S.scrollTrack}>
                    <View
                      style={[
                        S.scrollThumb,
                        {
                          height: thumbH(wrapH, contentH),
                          transform: [{ translateY: thumbTop }],
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              <View pointerEvents="none" style={S.boxBottomLine} />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={S.fadeBelow}
              />
            </View>
            <View style={S.fadeGap} />
          </FullBleed>

          {/* ✅ 시간대 그리드 */}
          <ScrollView
            ref={gridScrollRef}
            style={S.gridScroll}
            contentContainerStyle={[S.gridContent, { position: 'relative' }]}
            showsVerticalScrollIndicator={false}
          >
            {HOURS.map((h, i) => {
              const isLast = i === HOURS.length - 1

              return (
                <View key={h} style={S.row}>
                  <View style={S.timeCol}>
                    <Text style={S.timeText}>
                      {h === 0
                        ? '오전 12시'
                        : h < 12
                          ? `오전 ${h}시`
                          : h === 12
                            ? '오후 12시'
                            : `오후 ${h - 12}시`}
                    </Text>
                  </View>

                  <View style={S.slotCol}>
                    <View style={S.verticalLine} />
                  </View>

                  {!isLast && <View pointerEvents="none" style={S.guideLine} />}
                </View>
              )
            })}

            {/* ✅ 현재시간 라이브바 */}
            {nowTop !== null && (
              <>
                <View style={[S.liveBar, { top: nowTop }]} />
                <View style={[S.liveDot, { top: nowTop - 3 }]} />
              </>
            )}
            {events.map((evt) => {
              const [sh, sm] = evt.clippedStartTime.split(':').map(Number)
              const [eh, em] = evt.clippedEndTime.split(':').map(Number)
              const startMin = sh * 60 + sm
              const endMin = eh * 60 + em
              
              return (
              <DraggableFlexalbeEvent
                key={evt.id}
                id={evt.id}
                title={evt.title}
                place={`label ${evt.labels?.[0] ?? ''}`}
                startMin={startMin}
                endMin={endMin}
                color={`#${evt.colorKey}`}
                anchorDate={anchorDate}
              />
              ) 
            })}

            {tasks.map((task) => {
              const start =
                task.placementTime && task.placementTime.includes(':')
                  ? (() => {
                      const [h, m] = task.placementTime.split(':').map(Number)
                      return h + m / 60
                    })()
                  : 0

              return (
                <DraggableTaskBox
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  startHour={start}
                  done={task.completed ?? false} 
                />
              )
            })}
          </ScrollView>
        </View>
      </ScreenWithSidebar>
    </GestureHandlerRootView>
  )
}

/* 스크롤바 길이 계산 */
function thumbH(visibleH: number, contentH: number) {
  const minH = 18
  const h = (visibleH * visibleH) / Math.max(contentH, 1)
  return Math.max(minH, Math.min(h, visibleH))
}

function DraggableFixedEvent() {
  const ROW_H = 48
  const translateY = useSharedValue(7 * ROW_H) 

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / ROW_H) * ROW_H
      translateY.value = withSpring(snapped)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height: ROW_H * 3,
            backgroundColor: '#B04FFF26',
            paddingHorizontal: 4,
            paddingTop: 10,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 11,
            lineHeight: 10,
          }}
        >
          name(fixed)
        </Text>
        <Text
          style={{
            color: '#6B6B6B',
            fontSize: 10,
            marginTop: 10,
            lineHeight: 10,
          }}
        >
          place
        </Text>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableTaskBoxProps = {
  id: string
  title: string
  startHour: number
  done?: boolean
}

function DraggableTaskBox({
  id,
  title,
  startHour,
  done: initialDone = false,
}: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)
  const [done, setDone] = useState(initialDone)
  const triggerHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

  const handleDrop = async (newTime: string) => {
    try {
      await http.put(`/task/${id}`, { placementTime: newTime })
      bus.emit("calendar:mutated", { op: "update", item: { id } })
    } catch (err: any) {
      console.error("❌ 테스크 이동 실패:", err.message)
    }
  }
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      translateY.value += e.changeY
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

      const fmt = (n: number) => String(n).padStart(2, "0")
      const newTime = `${fmt(hour)}:${fmt(min)}:00`

      runOnJS(handleDrop)(newTime)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + 2 },
      { translateX: translateX.value },
    ],
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 18,
            right: 18,
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
        <Pressable
          onPress={() => setDone((prev) => !prev)}
          style={{
            width: 17,
            height: 17,
            borderWidth: 2,
            borderColor: done ? '#333333' : '#333',
            borderRadius: 3,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: done ? '#333333' : '#FFFFFF00',
          }}
        >
          {done && (
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 13,
                lineHeight: 16,
              }}
            >
              ✓
            </Text>
          )}
        </Pressable>

        <View>
          <Text
            style={{
              color: done ? '#999' : '#000',
              fontWeight: 'bold',
              fontSize: 12,
              marginBottom: 2,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            {title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableFlexalbeEventProps = {
  id: string
  title: string
  place: string
  startMin: number
  endMin: number
  color: string
  anchorDate: string
}

function DraggableFlexalbeEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
}: DraggableFlexalbeEventProps) {
  const translateY = useSharedValue(0)
  const dragEnabled = useSharedValue(false)
  const rawHeight = (endMin - startMin) * PIXELS_PER_MIN
  const height = rawHeight - 2
  const offsetY = 1
  const triggerHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

  const handleDrop = useCallback(async (movedY: number) => {
    draggingEventId = id
    try {
      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const snappedY = Math.round(movedY / SNAP_UNIT) * SNAP_UNIT
      translateY.value = withSpring(snappedY)

      const deltaMin = snappedY / PIXELS_PER_MIN
      const newStart = startMin + deltaMin
      const newEnd = endMin + deltaMin

      const fmt = (min: number) =>
        `${String(Math.floor(min / 60)).padStart(2,"0")}:${String(min % 60).padStart(2,"0")}:00`

      await http.put(`/event/${id}`, {
        startDate: anchorDate,
        endDate: anchorDate,
        startTime: fmt(newStart),
        endTime: fmt(newEnd),
      })

      bus.emit("calendar:mutated", { op: "update", item: { id } })
    } catch (err: any) {
      console.error('❌ 요청 설정 오류:', err.message)
    }
  }, [])

  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      translateY.value += e.changeY
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const movedY = translateY.value
      runOnJS(handleDrop)(movedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    top: startMin * PIXELS_PER_MIN + offsetY + translateY.value,
  }))

  const backgroundColor = color.startsWith("#") ? color : `#${color}`

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 18,
            right: 18,
            height,
            backgroundColor,
            paddingHorizontal: 6,
            paddingTop: 10,
            borderRadius: 3,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 13,
            lineHeight: 15,
          }}
        >
          {title}
        </Text>
        {!!place && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
               marginTop: 10,
               lineHeight: 10,
            }}
          >
            {place}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  )
}

/* Styles */
const BORDER = 'rgba(0,0,0,0.08)'

const VERTICAL_LINE_WIDTH = 0.5

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral.surface },

  taskBox: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral.surface,
    overflow: 'hidden',
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  boxContent: { paddingVertical: 4 },

  chip: {
    marginHorizontal: 12,
    marginTop: 4,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chipBar: {
    width: 5,
    height: 22,
    marginRight: 8,
  },

  chipText: { 
    ...ts('daySchedule'), 
    color: '#000000', 
    fontSize: 12,
    fontWeight: '600',
 },

  checkRow: {
    height: 22,
    marginHorizontal: 11.5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.neutral.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  checkbox: {
    width: 10,
    height: 10,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 8,
    backgroundColor: colors.neutral.surface,
  },

  checkboxOn: { backgroundColor: '#000000' },
  checkText: { 
    ...ts('daySchedule'), 
    color: '#000000', 
    fontSize: 12,
    fontWeight: '600',
 },

  checkboxWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: colors.neutral.surface,
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
    textAlign: 'center',
  },

  checkTextDone: {
    color: '#888',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    fontSize: 12,
    fontWeight: '600',
  },

  scrollTrack: {
    position: 'absolute',
    right: 4,
    top: 10,
    bottom: 6,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
    backgroundColor: colors.neutral.gray,
  },

  gridScroll: { flex: 1 },

  row: {
    position: 'relative',
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderColor: 'transparent',
  },

  timeCol: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 10,
  },

  slotCol: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },

  verticalLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0.3,
    backgroundColor: colors.neutral.timeline,
  },

  guideLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 0.3,
    backgroundColor: colors.neutral.timeline,
  },
  timeText: { ...ts('time'), color: colors.neutral.gray },

  taskBoxWrap: {
    position: 'relative',
    overflow: 'visible',
  },

  boxBottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth || 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 2,
  },

  fadeBelow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: '100%',
    height: 18,
    zIndex: 1,
  },

  fadeGap: {
    height: 13, // taskBox와 그리드 사이 간격
  },

  gridContent: {
    paddingBottom: 10,
  },

  liveBar: {
    position: 'absolute',
    left: 50 + 16,
    right: 16,
    height: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    zIndex: 10,
  },

  liveDot: {
    position: 'absolute',
    left: 50 + 16 - 3, 
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
    zIndex: 11, 
  },
})
