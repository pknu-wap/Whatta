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
import Animated,
{
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'

import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { bus } from '@/lib/eventBus'
import axios from 'axios'
import { token } from '@/lib/token'
import { refreshTokens } from '@/api/auth'

/* -------------------------------------------------------------------------- */
/* Axios 설정 */
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
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(
    base.getDate(),
  )}`
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
let lastChangedEventId: string | null = null
let prevLayoutMap: Record<string, LayoutedEvent> = {}

/* -------------------------------------------------------------------------- */
/* 레이아웃 헬퍼 */
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
  isPartialOverlap?: boolean
  overlapDepth?: number
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
  startISO: string
  endISO: string
}

/* -------------------------------------------------------------------------- */
/* 겹치는 일정 레이아웃 */
/* -------------------------------------------------------------------------- */

function layoutDayEvents(events: DayTimelineEvent[]): LayoutedEvent[] {
  if (!events.length) return []

  const sorted = [...events].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return a.endMin - b.endMin
  })

  const layout: LayoutedEvent[] = []
  const used = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i]
    if (used.has(ev.id)) continue

    // 완전히 동일한 시간대 → n등분
    const sameGroup = sorted.filter(
      (e) => e.startMin === ev.startMin && e.endMin === ev.endMin,
    )

    if (sameGroup.length > 1) {
      const n = sameGroup.length
      sameGroup.forEach((e, idx) => {
        layout.push({
          ...e,
          column: idx,
          columnsTotal: n,
          isPartialOverlap: false,
          overlapDepth: 0,
        })
        used.add(e.id)
      })
      continue
    }

    // 부분 겹침
    const overlappingGroup = sorted.filter(
      (other) =>
        other.id !== ev.id &&
        other.startMin < ev.endMin &&
        other.endMin > ev.startMin,
    )

    const hasOverlap = overlappingGroup.length > 0
    const prev = prevLayoutMap[ev.id]
    const wasPartial = prev?.isPartialOverlap ?? false

    let overlapDepth = 0
    let isPartialOverlap = false

    if (hasOverlap) {
      const group = [...overlappingGroup, ev].sort(
        (a, b) => a.startMin - b.startMin,
      )
      group.forEach((e, idx) => {
        const depth = idx
        layout.push({
          ...e,
          column: 0,
          columnsTotal: 1,
          isPartialOverlap: true,
          overlapDepth: depth,
        })
        used.add(e.id)
      })
      continue
    } else if (wasPartial) {
      overlapDepth = 0
      isPartialOverlap = false
    }

    layout.push({
      ...ev,
      column: 0,
      columnsTotal: 1,
      isPartialOverlap,
      overlapDepth,
    })
  }

  prevLayoutMap = Object.fromEntries(layout.map((ev) => [ev.id, ev]))
  return layout
}

/* -------------------------------------------------------------------------- */
/* 상단 span 이벤트 계산 */
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

      const s = (e.startDate || e.date || dateISO).slice(0, 10)
    const ed = (e.endDate || e.date || s).slice(0, 10)

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

  // ✅ 하루짜리 일정도 표시되게 수정된 부분
byId.forEach((base) => {
  if (base.endISO < weekStart || base.startISO > weekEnd) return

  const startIdxRaw = diffDays(base.startISO, weekStart)
  const endIdxRaw = diffDays(base.endISO, weekStart)

  let startIdx = Math.max(0, Math.min(6, startIdxRaw))
  let endIdx = Math.max(0, Math.min(6, endIdxRaw))

  // ✅ 시작과 종료가 같을 경우(하루짜리 일정)도 표시되게 보정
  if (base.startISO === base.endISO) {
    endIdx = startIdx
  }

  spans.push({
    id: base.id,
    title: base.title,
    color: base.color,
    startIdx,
    endIdx,
    row: 0,
    startISO: base.startISO,
    endISO: base.endISO,
  })
})



  // ✅ 추가된 정렬 로직
// 기간이 긴 일정이 위쪽에, 길이가 같고 겹치는 일정이면 나중에 생성된 게 아래로
spans.sort((a, b) => {
  const lenA = new Date(a.endISO).getTime() - new Date(a.startISO).getTime()
  const lenB = new Date(b.endISO).getTime() - new Date(b.startISO).getTime()

  // ① 기간이 긴 일정이 위로
  if (lenA !== lenB) return lenB - lenA

  // ② 기간이 같고 겹치는 일정은 생성 순서대로 (나중 생성된 게 아래)
  if (a.startISO <= b.endISO && b.startISO <= a.endISO) {
    return a.id.localeCompare(b.id)
  }

  // ③ 그 외엔 시작일이 빠른 게 위로
  return a.startISO.localeCompare(b.startISO)
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
/* TaskGroupBox (타임라인 같은 시간대 Task 묶음) */
/* -------------------------------------------------------------------------- */

function TaskGroupBox({ tasks, startHour }: { tasks: any[]; startHour: number }) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const SNAP_UNIT = 5 * PIXELS_PER_MIN

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
      translateX.value += e.changeX
    })
    .onEnd(() => {
      const snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)
    })

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + 2 },
      { translateX: translateX.value },
    ],
  }))

  const toggleExpand = () => setExpanded((v) => !v)

  // ✅ task처럼: 로컬 상태만 바로 토글해서 즉시 UI 반영
  const toggleTaskDone = (taskId: string) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        String(t.id) === String(taskId)
          ? { ...t, completed: !t.completed }
          : t,
      ),
    )
  }

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          S.taskGroupBox,
          style,
          !expanded && { justifyContent: 'center' }, // 닫혀있을 때 가운데 정렬
        ]}
      >
        {/* 상단 "할일" 버튼 줄 */}
        <Pressable onPress={toggleExpand} style={S.groupHeaderRow}>
          <View
            style={[
              S.groupHeaderArrow,
              expanded && { transform: [{ rotate: '180deg' }] },
            ]}
          />
          <Text style={S.groupHeaderText}>할일</Text>
        </Pressable>

        {/* 드롭다운 영역 */}
        {expanded && (
          <View style={S.groupList}>
  {localTasks.map((t: any) => (
    <Pressable
      key={String(t.id)}
      style={S.groupTaskRow}
      onPress={() => toggleTaskDone(t.id)} // ✅ 체크박스/텍스트 클릭 시 토글
    >
      {/* ✅ 체크박스 */}
      <View
        style={[
          S.groupTaskCheckbox,
          t.completed && S.groupTaskCheckboxOn,
        ]}
      >
        {t.completed && <Text style={S.groupTaskCheckmark}>✓</Text>}
      </View>

      {/* ✅ 타이틀 - 완료 시 줄 표시 및 회색 변경 */}
      <Text
        style={[
          S.groupTaskTitle,
          t.completed && {
            color: '#999999',
            textDecorationLine: 'line-through',
          },
        ]}
        numberOfLines={1}
      >
        {t.title}
      </Text>
    </Pressable>
  ))}
</View>

        )}
      </Animated.View>
    </GestureDetector>
  )
}

/* Draggable TaskBox (단일 타임라인 Task) */
/* -------------------------------------------------------------------------- */

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
          numberOfLines={0}
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
  isPartialOverlap?: boolean
  overlapDepth?: number
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
  isPartialOverlap = false,
  overlapDepth = 0,
}: DraggableFlexalbeEventProps) {
  const durationMin = endMin - startMin
  const height = (durationMin / 60) * ROW_H
  const topBase = (startMin / 60) * ROW_H
  const translateY = useSharedValue(0)

  const handleDrop = useCallback(
    async (movedY: number) => {
      try {
        const SNAP = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const deltaMin = snappedY / PIXELS_PER_MIN
        const duration = endMin - startMin
        let newStart = startMin + deltaMin
        if (newStart < 0) newStart = 0
        if (newStart + duration > 24 * 60) {
          newStart = 24 * 60 - duration
        }
        const newEnd = newStart + duration

        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(
            min % 60,
          ).padStart(2, '0')}:00`

        const nextStartTime = fmt(newStart)
        const nextEndTime = fmt(newEnd)

        lastChangedEventId = id

        await http.put(`/event/${id}`, {
          startDate: dateISO,
          endDate: dateISO,
          startTime: nextStartTime,
          endTime: nextEndTime,
        })

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
      }
    },
    [id, startMin, endMin, dateISO, translateY],
  )

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
    })
    .onEnd(() => {
      runOnJS(handleDrop)(translateY.value)
    })

  const style = useAnimatedStyle(() => ({
    top: topBase + translateY.value,
  }))

  const safeColor = color.startsWith('#') ? color : `#${color}`
  const colGap = 3
  const innerWidth = DAY_COL_W - colGap * 2
  let width = innerWidth / Math.max(columnsTotal, 1)
  let left = colGap + width * column
  const overlapStyle: any = {}

  if (isPartialOverlap) {
    const shrink = 4 * overlapDepth
    width -= shrink
    left = DAY_COL_W - width - 2
    overlapStyle.borderWidth = 1
    overlapStyle.borderColor = '#FFFFFF'
  }

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          S.eventBox,
          {
            left,
            width: width - 2,
            height,
            backgroundColor: safeColor,
            ...overlapStyle,
          },
          style,
        ]}
      >
        <Text style={S.eventTitle} numberOfLines={2}>
          {title}
        </Text>
        {!!place && <Text style={S.eventPlace}>{place}</Text>}
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

  const [wrapH, setWrapH] = useState(80)
  const [contentH, setContentH] = useState(80)
  const [thumbTop, setThumbTop] = useState(0)
  const checksScrollRef = useRef<ScrollView>(null)

  const gridScrollRef = useRef<ScrollView>(null)
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  useEffect(() => {
    const s = startOfWeek(anchorDate)
    const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))
    setWeekDates(arr)
  }, [anchorDate])

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
          const allDayEvents = payload.allDayEvents || []

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

          const spanEvents = [
  // 1️⃣ 여러 날짜에 걸친 일정
  ...timed.filter(
    (e: any) =>
      e.isSpan ||
      (e.startDate && e.endDate && e.startDate.slice(0, 10) !== e.endDate.slice(0, 10))
  ),

  // 2️⃣ 시간 없는 하루짜리 / 종일 일정
  ...timed.filter((e: any) => e.clippedEndTime === '23:59:59.999999999'),

  // 3️⃣ 서버에서 따로 내려주는 종일/기간 이벤트
  ...allDaySpan,

  // ✅ 4️⃣ ← 이 부분 추가 : Swagger에서 allDayEvents 배열로 내려오는 하루짜리 일정
  ...allDayEvents,
]


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

      if (weekDates.includes(itemDateISO)) {
        fetchWeek(weekDates)
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [weekDates, fetchWeek])

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
          {/* 요일 헤더 */}
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
                        isToday && {
                          color: colors.primary.main,
                          fontWeight: '800',
                        },
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

          {/* 상단 span + 체크리스트 */}
          <FullBleed padH={0}>
            <View style={S.topArea}>
              {/* span bar */}
              <View style={[S.multiDayArea, { height: spanAreaHeight }]}>
                {spanBars.map((s) => {
  const left = TIME_COL_W + s.startIdx * DAY_COL_W + 2
  const width = (s.endIdx - s.startIdx + 1) * DAY_COL_W - 4
  const isSingleDay = s.startISO === s.endISO

  // ✅ 색상 정의
  const mainColor = s.color?.startsWith('#') ? s.color : `#${s.color || 'B04FFF'}`
  const lightColor = `${mainColor}33` // 연한 배경

  // ✅ 스타일 구분
  const baseStyle: any = isSingleDay
    ? {
        position: 'absolute',
        top: s.row * 24 + 2,
        left,
        width,
        height: 22,
        backgroundColor: mainColor,
        borderRadius: 6, // 하루짜리는 둥근 모서리 유지
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: 6,
      }
    : {
        position: 'absolute',
        top: s.row * 24,
        left,
        width,
        height: 22,
        backgroundColor: lightColor,
        justifyContent: 'center',
        paddingHorizontal: 8,
        borderRadius: 0, // ✅ 모서리 뾰족하게
      }

  // ✅ 강조바 조건: 실제 일정의 시작일/종료일만 표시
  const showLeftAccent = !isSingleDay && weekDates[s.startIdx] === s.startISO
  const showRightAccent = !isSingleDay && weekDates[s.endIdx] === s.endISO

  return (
    <View
      key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
      style={[baseStyle]}
    >
      <Text
        style={{
          color: isSingleDay ? '#FFFFFF' : '#000000',
          fontWeight: '700',
          fontSize: 12,
        }}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {s.title}
      </Text>

      {/* ✅ 시작일 칸에만 왼쪽 진한색 바 */}
      {showLeftAccent && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: mainColor,
          }}
        />
      )}

      {/* ✅ 종료일 칸에만 오른쪽 진한색 바 */}
      {showRightAccent && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: mainColor,
          }}
        />
      )}
    </View>
  )
})}


              </View>

              {/* 체크리스트 */}
              <View
  style={[S.checksWrapOuter, { height: 60, overflow: 'hidden' }]}
  onLayout={onLayoutWrap}
>
  <ScrollView
    ref={checksScrollRef}
    onScroll={onScrollChecks}
    onContentSizeChange={onContentSizeChange}
    showsVerticalScrollIndicator={false}
    scrollEventThrottle={16}
    contentContainerStyle={S.checksScrollContent}
    bounces={false}
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
                  <View style={[S.checkbox, c.done && S.checkboxOn]}>
                    {c.done && <Text style={S.checkmark}>✓</Text>}
                  </View>
                </View>
                <Text
                  style={[S.checkText, c.done && S.checkTextDone]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
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

              <View
                pointerEvents="none"
                style={S.boxBottomLine}
              />
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
                  <View
                    key={`hour-${h}`}
                    style={S.timeRow}
                  >
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

              {/* 요일별 타임라인 */}
              {weekDates.map((d) => {
                const bucket = weekData[d] || {
                  timelineEvents: [],
                  timedTasks: [],
                }
                const isTodayCol = d === today
                const layoutEvents = layoutDayEvents(
                  bucket.timelineEvents || [],
                )
                const timedTasks = bucket.timedTasks || []

                return (
                  <View
                    key={`${d}-col`}
                    style={S.dayCol}
                  >
                    {/* 시간 격자 */}
                    {HOURS.map((_, i) => (
                      <View
                        key={`${d}-row-${i}`}
                        style={S.hourRow}
                      />
                    ))}

                    {/* 현재 시간 라인 */}
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

                    {/* 일정 박스 */}
                    {layoutEvents.map((ev, idx) => (
                      <DraggableFlexalbeEvent
                        key={`${d}-${ev.id}-event-${idx}`}
                        id={ev.id}
                        title={ev.title}
                        place={ev.place}
                        startMin={ev.startMin}
                        endMin={ev.endMin}
                        color={ev.color}
                        dateISO={d}
                        column={ev.column}
                        columnsTotal={ev.columnsTotal}
                        isPartialOverlap={ev.isPartialOverlap}
                        overlapDepth={ev.overlapDepth ?? 0}
                      />
                    ))}

                    

                    {/* 타임라인 Task 박스 (동일 시간대 묶음 처리) */}
                    {Object.entries(
                      timedTasks.reduce(
                        (acc: Record<string, any[]>, t: any) => {
                          const key = `${t.placementDate}-${t.placementTime}-${t.dueDateTime}`
                          acc[key] = acc[key]
                            ? [...acc[key], t]
                            : [t]
                          return acc
                        },
                        {},
                      ),
                    ).map(([key, group]) => {
                      const list = group as any[]
                      if (!list.length) return null
                      const [h, m] = list[0].placementTime
                        .split(':')
                        .map(Number)
                      const start = h + m / 60

                      return list.length > 1 ? (
                        <TaskGroupBox
                          key={key}
                          tasks={list}
                          startHour={start}
                        />
                      ) : (
                        <DraggableTaskBox
                          key={key}
                          id={String(list[0].id)}
                          title={list[0].title}
                          startHour={start}
                          done={list[0].completed ?? false}
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
/* 스타일 */
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

  topArea: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 4,
  },
  multiDayArea: {
    position: 'relative',
  },
  spanBar: {
    position: 'absolute',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5CCFF',
    borderRadius: 0,
    marginHorizontal: 12,
    marginVertical: 2,
  },
  spanBarAccentLeft: {
    width: 5,
    height: '100%',
    backgroundColor: '#B04FFF',
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
    height: 0,
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
    fontWeight: '700',
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
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#CFCFCF',
  },
  timeText: {
    fontSize: 12,
    color: '#707070',
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

  taskBox: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ROW_H - 6,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 20,
  },
  taskGroupBox: {
    position: 'absolute',
    left: 4,
    right: 4,
    minHeight: ROW_H - 6,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'column',
    alignItems: 'flex-start',
    zIndex: 21,
    flexWrap: 'nowrap',
    width: 'auto',
    overflow: 'visible',
  },

  taskCheckbox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -7,
    marginRight: 3,
  },
  taskCheckboxOn: {
    backgroundColor: '#333333',
  },
  taskCheckmark: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    lineHeight: 10,
  },
  taskTitle: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 13,
    flexShrink: 0,
    flexGrow: 0,
    flexWrap: 'wrap',
  },
  taskTitleDone: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },

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

  // --- "할 일" 그룹 드롭다운 전용 스타일 ---
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 2,
    marginLeft: -6,
  },
  groupHeaderArrow: {
    width: 0,
    height: 0,
    marginRight: 6,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#000000',
  },
  groupHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B04FFF',
  },
  groupList: {
    marginTop: 4,
    alignSelf: 'stretch',
  },
  groupTaskRow: {
    flexDirection: 'row',
    alignItems: 'center', // ✅ 텍스트 세로 중앙 대신 위로 정렬
    marginTop: 3,
    marginLeft: -10,
    paddingRight: 6,
    flexWrap: 'nowrap',         // ✅ 여러 줄 표시 허용
    overflow: 'visible',
  },
  groupTaskCheckbox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
    marginRight: 3,
  },
  groupTaskCheckboxOn: {
    backgroundColor: '#333333', // ✅ task와 동일하게
    borderColor: '#333333',
  },
  groupTaskCheckmark: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    lineHeight: 9,
    textAlign: 'center',
  },
  groupTaskTitle: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 13,
    flexShrink: 1,
    flexGrow: 1,
    flexWrap: 'wrap',
    overflow: 'visible',
    flex:1,
    minWidth: 100,               // ✅ 최소 폭 확보
    includeFontPadding: false,
  },
})
