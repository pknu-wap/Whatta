import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'

import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { bus } from '@/lib/eventBus'
import axios from 'axios'
import { token } from '@/lib/token'
import { refreshTokens } from '@/api/auth'

/* -------------------------------------------------------------------------- */
/* Axios 설정 (DayView와 동일 구조) */
/* -------------------------------------------------------------------------- */

const http = axios.create({
  baseURL: 'https://whatta-server-741565423469.asia-northeast3.run.app/api',
  timeout: 8000,
})

http.interceptors.request.use(
  (config) => {
    const access = token.getAccess()
    if (access) {
      config.headers.Authorization = `Bearer ${access}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

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
  },
)

/* -------------------------------------------------------------------------- */
/* 유틸 & 상수 */
/* -------------------------------------------------------------------------- */

const pad2 = (n: number) => String(n).padStart(2, '0')

const todayISO = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

const addDays = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, dd + d)
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`
}

const startOfWeek = (iso: string) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, dd)
  const wd = base.getDay() // 0:일
  const s = new Date(base.getFullYear(), base.getMonth(), base.getDate() - wd)
  return `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`
}

const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const diffDays = (a: string, b: string) => {
  const da = parseDate(a).getTime()
  const db = parseDate(b).getTime()
  return Math.round((da - db) / (1000 * 60 * 60 * 24))
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const TIME_COL_W = 50
const DAY_COL_W = (SCREEN_W - TIME_COL_W) / 7

const BORDER = 'rgba(0,0,0,0.08)'
const VERTICAL_LINE_WIDTH = 0.5

let draggingEventId: string | null = null

/* -------------------------------------------------------------------------- */
/* FullBleed - DayView와 동일 레이아웃 헬퍼 */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* 타입 */
/* -------------------------------------------------------------------------- */

type CheckItem = {
  id: string
  title: string
  done: boolean
}

type DayTimelineEvent = {
  id: string
  title: string
  place?: string
  startMin: number
  endMin: number
  color: string
}

type LayoutedEvent = DayTimelineEvent & {
  column: number
  columnsTotal: number
}

type DayBucket = {
  spanEvents: any[]
  timelineEvents: DayTimelineEvent[]
  checks: CheckItem[]
  timedTasks: any[]
}

type WeekData = Record<string, DayBucket>

type WeekSpanEvent = {
  id: string
  title: string
  color: string
  startIdx: number
  endIdx: number
  row: number
  startISO: string    // ✅ 추가
  endISO: string      // ✅ 추가
}

/* -------------------------------------------------------------------------- */
/* 겹치는 일정 n등분 레이아웃 */
/* -------------------------------------------------------------------------- */

function layoutDayEvents(events: DayTimelineEvent[]): LayoutedEvent[] {
  if (!events.length) return []

  const sorted = [...events].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return a.endMin - b.endMin
  })

  const layout: LayoutedEvent[] = []

  // ✅ 동일시간대끼리 grouping
  const groups: DayTimelineEvent[][] = []
  sorted.forEach((ev) => {
    const group = groups.find(
      (g) => g[0].startMin === ev.startMin && g[0].endMin === ev.endMin,
    )
    if (group) group.push(ev)
    else groups.push([ev])
  })

  // ✅ 그룹별로 n등분 처리
  groups.forEach((group) => {
    if (group.length === 1) {
      // 단독 일정 → columnsTotal = 1
      layout.push({ ...group[0], column: 0, columnsTotal: 1 })
    } else {
      // 동일시간대 일정 → 균등 분할
      const n = group.length
      group.forEach((ev, i) => {
        layout.push({ ...ev, column: i, columnsTotal: n })
      })
    }
  })

  return layout
}


/* -------------------------------------------------------------------------- */
/* 주간 상단 멀티데이(span) 막대 계산 */
/* -------------------------------------------------------------------------- */

function buildWeekSpanEvents(weekDates: string[], data: WeekData): WeekSpanEvent[] {
  if (!weekDates.length) return []
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  type SpanBase = {
    id: string
    title: string
    color: string
    startISO: string
    endISO: string
  }

  const byId = new Map<string, SpanBase>()

  weekDates.forEach((dateISO) => {
    const bucket = data[dateISO]
    if (!bucket) return
    const list = bucket.spanEvents || []
    list.forEach((e: any) => {
      const id = String(e.id)
      const title = e.title ?? ''
      const colorKey =
        (e.colorKey && String(e.colorKey).replace('#', '')) || '8B5CF6'
      const color = `#${colorKey}`

      const s = (e.startDate || dateISO).slice(0, 10)
      const ed = (e.endDate || dateISO).slice(0, 10)

      const startISO = s
      const endISO = ed

      const existing = byId.get(id)
      if (!existing) {
        byId.set(id, { id, title, color, startISO, endISO })
      } else {
        if (startISO < existing.startISO) existing.startISO = startISO
        if (endISO > existing.endISO) existing.endISO = endISO
      }
    })
  })

  const spans: WeekSpanEvent[] = []

  byId.forEach((base) => {
    if (base.endISO < weekStart || base.startISO > weekEnd) return

    const startIdxRaw = diffDays(base.startISO, weekStart)
    const endIdxRaw = diffDays(base.endISO, weekStart)

    const startIdx = Math.max(0, Math.min(6, startIdxRaw))
    const endIdx = Math.max(0, Math.min(6, endIdxRaw))
    if (endIdx < startIdx) return

    spans.push({
      id: base.id,
      title: base.title,
      color: base.color,
      startIdx,
      endIdx,
      row: 0,
      startISO: base.startISO,   // ✅ 추가
      endISO: base.endISO,       // ✅ 추가
    })
  })

  // 행 배치
  spans.sort((a, b) => {
    if (a.startIdx !== b.startIdx) return a.startIdx - b.startIdx
    return a.endIdx - b.endIdx
  })

  const lastEndByRow: number[] = []
  spans.forEach((s) => {
    let row = 0
    while (row < lastEndByRow.length && s.startIdx <= lastEndByRow[row]) {
      row += 1
    }
    s.row = row
    if (row === lastEndByRow.length) lastEndByRow.push(s.endIdx)
    else lastEndByRow[row] = s.endIdx
  })

  return spans
}

/* -------------------------------------------------------------------------- */
/* 스크롤바 높이 */
/* -------------------------------------------------------------------------- */

function getThumbH(visibleH: number, contentH: number) {
  const minH = 18
  const h = (visibleH * visibleH) / Math.max(contentH, 1)
  return Math.max(minH, Math.min(h, visibleH))
}

/* -------------------------------------------------------------------------- */
/* Draggable TaskBox (타임라인용) */
/* -------------------------------------------------------------------------- */

type DraggableTaskBoxProps = {
  id: string
  title: string
  startHour: number
  done?: boolean
}

function DraggableTaskBox({ id, title, startHour, done: initialDone = false }: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const [done, setDone] = useState(initialDone)

  const handleDrop = async (newTime: string) => {
    try {
      await http.put(`/task/${id}`, { placementTime: newTime })
      bus.emit('calendar:mutated', { op: 'update', item: { id } })
    } catch (err: any) {
      console.error('❌ Task 이동 실패:', err.message)
    }
  }

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
      translateX.value += e.changeX
    })
    .onEnd(() => {
      const SNAP = 5 * PIXELS_PER_MIN
      const snappedY = Math.round(translateY.value / SNAP) * SNAP
      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      const newMinutes = snappedY / PIXELS_PER_MIN
      const h = Math.floor(newMinutes / 60)
      const m = Math.round(newMinutes % 60)
      const fmt = (n: number) => String(n).padStart(2, '0')
      const t = `${fmt(h)}:${fmt(m)}:00`
      runOnJS(handleDrop)(t)
    })

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + 2 },
      { translateX: translateX.value },
    ],
  }))

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[S.taskBox, style]}>
        <Pressable
          onPress={() => setDone((prev) => !prev)}
          style={[S.taskCheckbox, done && S.taskCheckboxOn]}
        >
          {done && <Text style={S.taskCheckmark}>✓</Text>}
        </Pressable>
        <Text
          style={[
            S.taskTitle,
            done && S.taskTitleDone,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </Animated.View>
    </GestureDetector>
  )
}

/* -------------------------------------------------------------------------- */
/* DraggableFlexalbeEvent (일정 박스 드래그) */
/* -------------------------------------------------------------------------- */

type DraggableFlexalbeEventProps = {
  id: string
  title: string
  place?: string
  startMin: number
  endMin: number
  color: string
  dateISO: string
  column: number
  columnsTotal: number
}

function DraggableFlexalbeEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  dateISO,
  column,
  columnsTotal,
}: DraggableFlexalbeEventProps) {
  // ✅ 높이 계산 --------------------------------------------------------
  const durationMin = endMin - startMin
  let rawHeight = durationMin * PIXELS_PER_MIN

  // ✅ 1시간(=60분)짜리 일정은 시간선 한 칸(ROW_H) 전체를 꽉 채우기
  if (durationMin === 60) {
    rawHeight = ROW_H
  }

  const height = Math.max(rawHeight - 2, 18)
  // -------------------------------------------------------------------

  const translateY = useSharedValue(0)

  const handleDrop = useCallback(
    async (movedY: number) => {
      draggingEventId = id
      try {
        const SNAP = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const deltaMin = snappedY / PIXELS_PER_MIN
        const duration = endMin - startMin
        let newStart = startMin + deltaMin
        if (newStart < 0) newStart = 0
        if (newStart + duration > 24 * 60) newStart = 24 * 60 - duration
        const newEnd = newStart + duration

        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(
            min % 60,
          ).padStart(2, '0')}:00`

        const nextStartTime = fmt(newStart)
        const nextEndTime = fmt(newEnd)

        // ✅ 서버 업데이트
        await http.put(`/event/${id}`, {
          startDate: dateISO,
          endDate: dateISO,
          startTime: nextStartTime,
          endTime: nextEndTime,
        })

        // ✅ 새 시간 정보 포함해 WeekView 갱신 트리거
        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            startDate: `${dateISO}T${nextStartTime}`,
            endDate: `${dateISO}T${nextEndTime}`,
          },
        })
      } catch (err: any) {
        console.error('❌ 이벤트 이동 실패:', err.message)
      } finally {
        draggingEventId = null
      }
    },
    [id, startMin, endMin, dateISO, translateY],
  )

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
    })
    .onEnd(() => {
      const movedY = translateY.value
      runOnJS(handleDrop)(movedY)
    })

  const style = useAnimatedStyle(() => ({
    top: startMin * PIXELS_PER_MIN + 1 + translateY.value,
  }))

  const safeColor = color.startsWith('#') ? color : `#${color}`
  const colGap = 3
  const innerWidth = DAY_COL_W - colGap * 2
  const width = innerWidth / Math.max(columnsTotal, 1)
  const left = colGap + width * column

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          S.eventBox,
          {
            left,
            width: width - 2,
            height, // ✅ 추가된 높이 적용
            backgroundColor: safeColor,
          },
          style,
        ]}
      >
        <Text style={S.eventTitle} numberOfLines={2}>
          {title}
        </Text>
        {!!place && (
          <Text style={S.eventPlace} numberOfLines={1}>
            {place}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  )
}




/* -------------------------------------------------------------------------- */
/* WeekView 메인 */
/* -------------------------------------------------------------------------- */

export default function WeekView() {
  const [anchorDate, setAnchorDate] = useState(todayISO())
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [weekData, setWeekData] = useState<WeekData>({})
  const [loading, setLoading] = useState(true)

  // 상단 체크리스트 스크롤바
  const [wrapH, setWrapH] = useState(80)
  const [contentH, setContentH] = useState(80)
  const [thumbTop, setThumbTop] = useState(0)
  const checksScrollRef = useRef<ScrollView>(null)

  // 타임라인 스크롤 & 라이브바
  const gridScrollRef = useRef<ScrollView>(null)
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  /* anchorDate → weekDates */
  useEffect(() => {
    const s = startOfWeek(anchorDate)
    const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))
    setWeekDates(arr)
  }, [anchorDate])

  /* 현재 시각 라인 + 최초 진입 스크롤 */
  useEffect(() => {
    const updateNowTop = (scrollToCenter: boolean) => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const topPos = (h * 60 + m) * PIXELS_PER_MIN
      setNowTop(topPos)

      if (scrollToCenter && !hasScrolledOnce && gridScrollRef.current) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(topPos - SCREEN_H * 0.4, 0),
            animated: false,
          })
        })
        setHasScrolledOnce(true)
      }
    }

    updateNowTop(true)
    const id = setInterval(() => updateNowTop(false), 60000)
    return () => clearInterval(id)
  }, [hasScrolledOnce])

  /* 주간 데이터 fetch (DayView daily fetch를 7일에 적용) */
  const fetchWeek = useCallback(
    async (dates: string[]) => {
      if (!dates.length) return
      try {
        setLoading(true)
        const resList = await Promise.all(
          dates.map((d) =>
            http.get('/calendar/daily', { params: { date: d } }).catch(() => null),
          ),
        )

        const next: WeekData = {}

        dates.forEach((dateISO, idx) => {
          const payload = resList[idx]?.data?.data ?? {}
          const timed = payload.timedEvents || []
          const timedTasks = payload.timedTasks || []
          const allDay = payload.allDayTasks || []
          const floating = payload.floatingTasks || []
          const allDaySpan = payload.allDaySpanEvents || []

          // 타임라인 일정
          const timelineEvents: DayTimelineEvent[] = timed
            .filter(
              (e: any) =>
                !e.isSpan &&
                e.clippedEndTime !== '23:59:59.999999999' &&
                e.clippedStartTime &&
                e.clippedEndTime,
            )
            .map((e: any) => {
              const [sh, sm] = e.clippedStartTime.split(':').map(Number)
              const [eh, em] = e.clippedEndTime.split(':').map(Number)
              const startMin = sh * 60 + sm
              const endMin = eh * 60 + em
              const colorKey =
                (e.colorKey && String(e.colorKey).replace('#', '')) || 'B04FFF'
              return {
                id: String(e.id),
                title: e.title,
                place: e.place ?? '',
                startMin,
                endMin,
                color: `#${colorKey}`,
              }
            })

          // span / all-day
          const spanEvents = [
            ...timed.filter(
              (e: any) =>
                e.isSpan ||
                e.clippedEndTime === '23:59:59.999999999',
            ),
            ...allDaySpan,
          ]

          // 체크박스 항목
          const checks: CheckItem[] = [
            ...allDay.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              done: t.completed ?? false,
            })),
            ...floating.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              done: t.completed ?? false,
            })),
          ]

          next[dateISO] = {
            spanEvents,
            timelineEvents,
            checks,
            timedTasks,
          }
        })

        setWeekData(next)
      } catch (err) {
        console.error('❌ 주간 일정 불러오기 실패:', err)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (weekDates.length) {
      fetchWeek(weekDates)
    }
  }, [weekDates, fetchWeek])

  /* bus: 상태 동기화 */
  useFocusEffect(
    useCallback(() => {
      const emit = () =>
        bus.emit('calendar:state', { date: anchorDate, mode: 'week' })

      const onReq = () => emit()
      const onSet = (iso: string) => setAnchorDate(iso)

      emit()
      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)

      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
      }
    }, [anchorDate]),
  )

  /* bus: calendar:mutated → 주간 범위 안이면 리로드 (드래그 본인 제외) */
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const item = payload.item

      const rawDate =
        item.startDate ??
        item.date ??
        item.endDate ??
        item.placementDate ??
        item.placementTimeDate ??
        todayISO()
      const itemDateISO = String(rawDate).slice(0, 10)

      const inThisWeek = weekDates.includes(itemDateISO)
      if (!inThisWeek) {
        draggingEventId = null
        return
      }

      

       // ✅ 드래그해서 바뀐 일정도 포함해서 항상 주간 데이터 다시 불러오기
        fetchWeek(weekDates)
        draggingEventId = null
      }


    bus.on('calendar:mutated', onMutated)
    return () => {
      bus.off('calendar:mutated', onMutated)
    }
  }, [weekDates, fetchWeek])

  /* 체크리스트 스크롤 & 토글 */

  const onLayoutWrap = (e: any) => setWrapH(e.nativeEvent.layout.height)
  const onContentSizeChange = (_: number, h: number) => setContentH(h)
  const onScrollChecks = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const ratio =
      contentSize.height <= layoutMeasurement.height
        ? 0
        : contentOffset.y /
          (contentSize.height - layoutMeasurement.height)
    const top =
      ratio *
      (layoutMeasurement.height -
        getThumbH(layoutMeasurement.height, contentSize.height))
    setThumbTop(top)
  }

  const toggleCheck = async (taskId: string) => {
    let newDone = false

    setWeekData((prev) => {
      const next: WeekData = {}
      for (const [d, bucket] of Object.entries(prev)) {
        const updated = bucket.checks.map((c) => {
          if (c.id === taskId) {
            const done = !c.done
            newDone = done
            return { ...c, done }
          }
          return c
        })
        next[d] = { ...bucket, checks: updated }
      }
      return next
    })

    try {
      await http.put(`/task/${taskId}`, { completed: newDone })
      bus.emit('calendar:mutated', { op: 'update', item: { id: taskId } })
    } catch (err: any) {
      console.error('❌ 체크 업데이트 실패:', err.message)
    }
  }

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScreenWithSidebar mode="overlay">
          <View style={S.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        </ScreenWithSidebar>
      </GestureHandlerRootView>
    )
  }

  const today = todayISO()
  const spanBars = buildWeekSpanEvents(weekDates, weekData)
  const maxSpanRow = spanBars.reduce((m, s) => (s.row > m ? s.row : m), -1)
  const spanAreaHeight = maxSpanRow < 0 ? 0 : (maxSpanRow + 1) * 24 + 4
  const showScrollbar = contentH > wrapH

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <View style={S.screen}>
          {/* 요일 헤더 (스크린샷 스타일) */}
          <FullBleed padH={0}>
            <View style={S.weekHeaderRow}>
              <View style={S.weekHeaderTimeCol} />
              {weekDates.map((d) => {
                const dt = parseDate(d)
                const dow = dt.getDay()
                const label = ['일', '월', '화', '수', '목', '금', '토'][dow]
                const isToday = d === today
                return (
                  <View key={`${d}-header`} style={S.weekHeaderCol}>
                    <Text
                      style={[
                        S.weekHeaderText,
                        dow === 0 && { color: '#FF4D4D' },
                        dow === 6 && { color: '#4D6BFF' },
                        isToday && { color: colors.primary.main, fontWeight: '800' },
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[
                        S.weekHeaderDate,
                        isToday && { color: colors.primary.main },
                      ]}
                    >
                      {dt.getDate()}
                    </Text>
                  </View>
                )
              })}
            </View>
          </FullBleed>

          {/* 상단 멀티데이 바 + 체크리스트 */}
          <FullBleed padH={0}>
            <View style={S.topArea}>
              {/* 멀티데이 바 */}
              <View style={[S.multiDayArea, { height: spanAreaHeight }]}>
  {spanBars.map((s) => {
  const left = TIME_COL_W + s.startIdx * DAY_COL_W + 2
  let width = (s.endIdx - s.startIdx + 1) * DAY_COL_W - 4

  // ✅ 주의: 이번 주 날짜 범위
  const weekStartISO = weekDates[0]
  const weekEndISO = weekDates[6]

  // ✅ 실제 span의 시작일과 종료일
  const spanStartISO = s.startISO
  const spanEndISO = s.endISO

  // ✅ 시작점/끝점 표시 여부 계산
  const showLeftAccent = spanStartISO >= weekStartISO
  const showRightAccent = spanEndISO <= weekEndISO

  // ✅ 이번 주 이후로 이어지는 일정이라면, 오른쪽 16px만큼 잘라냄
  const continuesNextWeek = spanEndISO > weekEndISO
  if (continuesNextWeek) {
    width -= 20
  }

  return (
    <View
      key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
      style={[S.spanBar, { top: s.row * 24, left, width }]}
    >
      {showLeftAccent && <View style={S.spanBarAccentLeft} />}

<Text
  style={[
    S.spanBarText,
    !showLeftAccent && { marginLeft: 11 }, // ✅ 왼쪽 보라색이 없을 때만 15px 띄움
  ]}
  numberOfLines={1}
>
  {s.title}
</Text>

{showRightAccent && (
  <View
    style={[
      S.spanBarAccentRight,
      { position: 'absolute', right: 0, top: 0, bottom: 0 },
    ]}
  />
)}


    </View>
  )
})}


</View>


              {/* 체크리스트 (요일별) */}
              <View style={S.checksWrapOuter} onLayout={onLayoutWrap}>
                <ScrollView
                  ref={checksScrollRef}
                  onScroll={onScrollChecks}
                  onContentSizeChange={onContentSizeChange}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  contentContainerStyle={S.checksScrollContent}
                >
                  <View style={S.checksRow}>
                    <View style={{ width: TIME_COL_W }} />
                    {weekDates.map((d) => {
                      const bucket = weekData[d]
                      const checks = bucket?.checks || []
                      return (
                        <View key={`${d}-checks`} style={S.checkCol}>
                          {checks.map((c) => (
                            <Pressable
                              key={`${d}-${c.id}-check`}
                              style={S.checkRow}
                              onPress={() => toggleCheck(c.id)}
                            >
                              <View style={S.checkboxWrap}>
                                <View
                                  style={[
                                    S.checkbox,
                                    c.done && S.checkboxOn,
                                  ]}
                                >
                                  {c.done && <Text style={S.checkmark}>✓</Text>}
                                </View>
                              </View>
                              <Text
                                style={[
                                  S.checkText,
                                  c.done && S.checkTextDone,
                                ]}
                                numberOfLines={1}
                              >
                                {c.title}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )
                    })}
                  </View>
                  <View style={{ height: 4 }} />
                </ScrollView>

                {showScrollbar && (
                  <View pointerEvents="none" style={S.scrollTrack}>
                    <View
                      style={[
                        S.scrollThumb,
                        {
                          height: getThumbH(wrapH, contentH),
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
                colors={[
                  'rgba(0,0,0,0.06)',
                  'rgba(0,0,0,0.02)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={S.fadeBelow}
              />
            </View>
          </FullBleed>

          {/* 타임라인 */}
          <ScrollView
            ref={gridScrollRef}
            style={S.timelineScroll}
            contentContainerStyle={S.timelineContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row' }}>
              {/* 시간 컬럼 */}
              <View style={S.timeCol}>
                {HOURS.map((h) => (
                  <View key={`hour-${h}`} style={S.timeRow}>
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
                ))}
              </View>

              {/* 7일 컬럼 */}
              {weekDates.map((d) => {
                const bucket = weekData[d] || {
                  timelineEvents: [],
                  timedTasks: [],
                }
                const isTodayCol = d === today
                const layoutEvents = layoutDayEvents(bucket.timelineEvents || [])
                const timedTasks = bucket.timedTasks || []

                return (
                  <View key={`${d}-col`} style={S.dayCol}>
                    {/* 시간 격자 */}
                    {HOURS.map((_, i) => (
                      <View
                        key={`${d}-row-${i}`}
                        style={S.hourRow}
                      />
                    ))}

                    {/* 오늘 라이브바 */}
                    {isTodayCol && nowTop !== null && (
                      <>
                        <View
                          style={[
                            S.liveBar,
                            { top: nowTop },
                          ]}
                        />
                        <View
                          style={[
                            S.liveDot,
                            { top: nowTop - 3 },
                          ]}
                        />
                      </>
                    )}

                    {/* 일정 박스 (n등분) */}
                    {layoutEvents.map((ev) => (
                      <DraggableFlexalbeEvent
                        key={`${d}-${ev.id}-event`}
                        id={ev.id}
                        title={ev.title}
                        place={ev.place}
                        startMin={ev.startMin}
                        endMin={ev.endMin}
                        color={ev.color}
                        dateISO={d}
                        column={ev.column}
                        columnsTotal={ev.columnsTotal}
                      />
                    ))}

                    {/* 타임라인 Task 박스 */}
                    {timedTasks.map((task: any) => {
                      const start =
                        task.placementTime && task.placementTime.includes(':')
                          ? (() => {
                              const [h, m] = task.placementTime
                                .split(':')
                                .map(Number)
                              return h + m / 60
                            })()
                          : 0

                      return (
                        <DraggableTaskBox
                          key={`${d}-${task.id}-task`}
                          id={String(task.id)}
                          title={task.title}
                          startHour={start}
                          done={task.completed ?? false}
                        />
                      )
                    })}
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </ScreenWithSidebar>
    </GestureHandlerRootView>
  )
}

/* -------------------------------------------------------------------------- */
/* 스타일 - DayView 느낌 + 제공해주신 스샷 스타일 반영 */
/* -------------------------------------------------------------------------- */

const S = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 요일 헤더 */

  weekHeaderRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  weekHeaderTimeCol: {
    width: TIME_COL_W,
  },
  weekHeaderCol: {
    width: DAY_COL_W,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },
  weekHeaderDate: {
    fontSize: 11,
    color: '#B4B4B4',
    marginTop: 1,
  },

  /* 상단 멀티데이 + 체크리스트 */

  topArea: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 4,
  },

  multiDayArea: {
    position: 'relative',
  },

  /* ---------------- 시간 없는 일정 (All-day / SpanEvent) ---------------- */
  spanBar: {
    position: 'absolute',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5CCFF', // 기본 연보라 배경 (필요시 '#B04FFF26'로)
    borderRadius: 0, // 뾰족하게
    marginHorizontal: 12,
    marginVertical: 2,
  },

  spanBarAccentLeft: {
    width: 5,
    height: '100%',
    backgroundColor: '#B04FFF', // 진보라 바
    marginRight: 8,
  },

  spanBarAccentRight: {
    width: 5,
    height: '100%',
    backgroundColor: '#B04FFF',
  },

  spanBarText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },



  checksWrapOuter: {
    marginTop: 4,
    paddingBottom: 2,
    overflow: 'hidden',
  },
  checksScrollContent: {
    paddingBottom: 2,
  },
  checksRow: {
    flexDirection: 'row',
  },
  checkCol: {
    width: DAY_COL_W,
    paddingHorizontal: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    marginBottom: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  checkboxWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#999999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '700',
    lineHeight: 9,
  },
  checkText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '500',
  },
  checkTextDone: {
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },

  scrollTrack: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  boxBottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth || 1,
    backgroundColor: BORDER,
    zIndex: 2,
  },
  fadeBelow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -10,
    height: 18,
    zIndex: 1,
  },

  /* 타임라인 */

  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 16,
  },

  timeCol: {
    width: TIME_COL_W,
    paddingRight: 4,
  },
  timeRow: {
     height: ROW_H,
     justifyContent: 'center',  // 세로 가운데 정렬
     borderBottomWidth: 0.5,      // 시간줄 강조
     borderBottomColor: '#CFCFCF', // 진한 회색선
     },
  timeText: {
  fontSize: 12,                // 더 큼
   color: '#707070',            // 더 진함
   fontWeight: '500',
   textAlign: 'right',
   marginRight: 6,
},

  dayCol: {
    width: DAY_COL_W,
    borderLeftWidth: 0.5,
    borderLeftColor: '#E0E0E0',
    position: 'relative',
  },
  hourRow: {
    height: ROW_H,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },

  /* 이벤트 박스 */

  eventBox: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 12,
  },
  eventPlace: {
    color: '#F0F0F0',
    fontSize: 8,
    marginTop: 2,
  },

  /* Task 박스 */
  taskBox: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ROW_H - 6,
    backgroundColor: '#FFFFFF80', // 투명 흰색
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 20,
  },

  taskCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  taskCheckboxOn: {
    backgroundColor: '#333333',
  },

  taskCheckmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },

  taskTitle: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },

  taskTitleDone: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },

  

  /* 라이브바 */

  liveBar: {
    position: 'absolute',
    left: 3,
    right: 3,
    height: 1.2,
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    zIndex: 30,
  },
  liveDot: {
    position: 'absolute',
    left: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    zIndex: 31,
  },
})
