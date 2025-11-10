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

// ✅ 요일 개수에 따라 동적으로 day column width 계산
const getDayColWidth = (count: number) =>
  (SCREEN_W - TIME_COL_W) / (count > 0 ? count : 7)


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
  tasks?: any[]
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
  isTask?: boolean
  done?: boolean
  completed?: boolean
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

function buildWeekSpanEvents(weekDates: string[], data: Record<string, any>) {
  const byId = new Map<string, WeekSpanEvent>()

  weekDates.forEach((dateISO) => {
    const bucket = data[dateISO]
    if (!bucket) return

    // ✅ ① spanEvents + 체크리스트/Task를 함께 처리
    const list = [
      ...(bucket.spanEvents || []),
      ...(bucket.checks || []),
    ]

    list.forEach((e: any) => {
      const id = String(e.id)
      const title = e.title ?? ''

      // ✅ ② Task 여부 판별 로직
      const isTask =
        e.isTask === true ||
        typeof e.completed !== 'undefined' ||
        typeof e.done !== 'undefined' ||
        e.type === 'task'

      // ✅ ③ 색상 결정
      const colorKey = isTask
        ? '000000'
        : (e.colorKey && String(e.colorKey).replace('#', '')) || '8B5CF6'
      const color = colorKey.startsWith('#') ? colorKey : `#${colorKey}`

      // ✅ ④ 기간 계산
      const s = (e.startDate || e.date || dateISO).slice(0, 10)
      const ed = (e.endDate || e.date || s).slice(0, 10)
      const startISO = s
      const endISO = ed

      const existing = byId.get(id)

      if (!existing) {
        byId.set(id, {
          id,
          title,
          color,
          startISO,
          endISO,
          startIdx: 0,
          endIdx: 0,
          row: 0,
          isTask,
          done: e.done ?? e.completed ?? false,
          completed: e.completed,
        })
      } else {
        if (startISO < existing.startISO) existing.startISO = startISO
        if (endISO > existing.endISO) existing.endISO = endISO
      }
    })
  })

  const items = Array.from(byId.values())
  const idxOf = (iso: string) => weekDates.indexOf(iso)

  items.forEach((ev) => {
    ev.startIdx = Math.max(0, idxOf(ev.startISO))
    const endIdxRaw = idxOf(ev.endISO)
    ev.endIdx = Math.min(
      weekDates.length - 1,
      endIdxRaw === -1 ? weekDates.length - 1 : endIdxRaw,
    )
  })

  const lanes: WeekSpanEvent[][] = []
  items.forEach((ev) => {
    let row = 0
    while (
      lanes[row] &&
      lanes[row].some(
        (other) =>
          !(ev.endIdx < other.startIdx || ev.startIdx > other.endIdx),
      )
    ) {
      row++
    }
    ev.row = row
    if (!lanes[row]) lanes[row] = []
    lanes[row].push(ev)
  })

  return items
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

function TaskGroupBox({
  tasks,
  startHour,
  onLocalChange,
}: {
  tasks: any[]
  startHour: number
  onLocalChange?: (payload: {
    id: string
    dateISO: string
    completed?: boolean
  }) => void
}) {
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

  const toggleTaskDone = async (taskId: string) => {
    let target: any | undefined

    setLocalTasks((prev) =>
      prev.map((t) => {
        if (String(t.id) === String(taskId)) {
          const next = { ...t, completed: !t.completed }
          target = next
          return next
        }
        return t
      }),
    )

    if (!target) return

    const completed = !!target.completed
    const dateISO = String(
      (target.placementDate || target.dueDateTime || '').slice(0, 10),
    )

    try {
      await http.put(`/task/${taskId}`, { completed })

      // 상위 WeekView에 상태 전달
      onLocalChange?.({ id: String(taskId), dateISO, completed })

      // DayView 등 다른 뷰에도 반영
      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id: taskId,
          completed,
          date: dateISO,
          startDate: dateISO,
        },
      })
    } catch (err: any) {
      console.error('❌ TaskGroupBox 체크 업데이트 실패:', err.message)
    }
  }


  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          S.taskGroupBox,
          style,
          !expanded && { justifyContent: 'center' },
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
                onPress={() => toggleTaskDone(t.id)}
              >
                <View
                  style={[
                    S.groupTaskCheckbox,
                    t.completed && S.groupTaskCheckboxOn,
                  ]}
                >
                  {t.completed && (
                    <Text style={S.groupTaskCheckmark}>✓</Text>
                  )}
                </View>
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

/* -------------------------------------------------------------------------- */
/* Draggable TaskBox (단일 타임라인 Task) */
/* -------------------------------------------------------------------------- */


type DraggableTaskBoxProps = {
  id: string
  title: string
  startHour: number
  done?: boolean
  dateISO: string
  onLocalChange?: (payload: {
    id: string
    dateISO: string
    completed?: boolean
    placementTime?: string
  }) => void
}

function DraggableTaskBox({
  id,
  title,
  startHour,
  done: initialDone = false,
  dateISO,
  onLocalChange,
}: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const [done, setDone] = useState(initialDone)

  // ✅ 체크 토글 (서버 + DayView + WeekView 동기화)
  const toggleDone = async () => {
    const next = !done
    setDone(next)
    try {
      await http.put(`/task/${id}`, { completed: next })

      // 상위 WeekView 상태 즉시 반영
      onLocalChange?.({ id, dateISO, completed: next })

      // 다른 뷰(DayView 등)에 변경사항 전파
      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id,
          completed: next,
          date: dateISO,
          startDate: dateISO,
        },
      })
    } catch (err: any) {
      console.error('❌ Task 체크 상태 업데이트 실패:', err.message)
      setDone(!next)
    }
  }

  // ✅ 시간 이동 드롭 처리
  const handleDrop = async (newTime: string) => {
    try {
      await http.put(`/task/${id}`, { placementTime: newTime })

      // 상위 WeekView 상태 즉시 반영
      onLocalChange?.({ id, dateISO, placementTime: newTime })

      // 다른 뷰(DayView 등)에 변경사항 전파
      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id,
          placementTime: newTime,
          date: dateISO,
          startDate: dateISO,
        },
      })
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
          onPress={toggleDone}
          style={[S.taskCheckbox, done && S.taskCheckboxOn]}
        >
          {done && <Text style={S.taskCheckmark}>✓</Text>}
        </Pressable>
        <Text
          style={[S.taskTitle, done && S.taskTitleDone]}
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
  dayColWidth: number
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
  dayColWidth,
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
  const innerWidth = dayColWidth - colGap * 2
  let width = innerWidth / Math.max(columnsTotal, 1)
  let left = colGap + width * column
  const overlapStyle: any = {}

  if (isPartialOverlap) {
    const shrink = 4 * overlapDepth
    width -= shrink
    left = dayColWidth - width - 2
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
  const [isZoomed, setIsZoomed] = useState(false)
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [weekData, setWeekData] = useState<WeekData>({})
  const [loading, setLoading] = useState(true)

  const [lastMutatedId, setLastMutatedId] = useState<string | null>(null)

  const [wrapH, setWrapH] = useState(80)
  const [contentH, setContentH] = useState(80)
  const [thumbTop, setThumbTop] = useState(0)
  const checksScrollRef = useRef<ScrollView>(null)

  const gridScrollRef = useRef<ScrollView>(null)
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  const SINGLE_HEIGHT = 22

  // weekDates: 확대 모드/기본 모드에 따라 계산
  // weekDates: 확대 모드/기본 모드에 따라 계산
  useEffect(() => {
    if (isZoomed) {
      // ✅ 5일뷰: anchorDate를 중앙으로, -2일 ~ +2일
      const arr = Array.from({ length: 5 }, (_, i) => addDays(anchorDate, i - 2))
      setWeekDates(arr)
    } else {
      // ✅ 7일뷰: anchorDate가 속한 주의 일~토
      const s = startOfWeek(anchorDate)
      const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))
      setWeekDates(arr)
    }
  }, [anchorDate, isZoomed])


  // 현재 시간 라인 위치
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

  // 주간 데이터 fetch
  const fetchWeek = useCallback(async (dates: string[]) => {
    if (!dates.length) return
    try {
      setLoading(true)
      const resList = await Promise.all(
        dates.map((d) =>
          http
            .get('/calendar/daily', { params: { date: d } })
            .catch(() => null),
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
              (e.colorKey && String(e.colorKey).replace('#', '')) ||
              'B04FFF'
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
              (e.startDate &&
                e.endDate &&
                e.startDate.slice(0, 10) !== e.endDate.slice(0, 10)),
          ),

          // 2️⃣ 시간 없는 하루짜리 / 종일 일정
          ...timed.filter(
            (e: any) =>
              e.clippedEndTime === '23:59:59.999999999',
          ),

          // 3️⃣ 서버에서 따로 내려주는 종일/기간 이벤트
          ...allDaySpan,

          // 4️⃣ allDayEvents: 하루짜리 일정
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

      setWeekData((prev: WeekData) => {
  const merged: WeekData = {}

  for (const date of Object.keys(next)) {
    const prevBucket = prev[date]
    const nextBucket = next[date]

    if (!prevBucket) {
      merged[date] = nextBucket
      continue
    }

    // ✅ 체크리스트 상태 유지
    const mergedChecks = nextBucket.checks.map((c) => {
      const old = prevBucket.checks.find((p) => p.id === c.id)
      return old ? { ...c, done: old.done } : c
    })

    // ✅ 상단 spanEvents 상태 유지
    const mergedSpans = nextBucket.spanEvents.map((s: any) => {
      const old = prevBucket.spanEvents.find(
        (p: any) => String(p.id) === String(s.id),
      )
      return old ? { ...s, done: old.done } : s
    })

    // ✅ 타임라인 Task 상태 유지 (개별 + 그룹)
    const mergedTimedTasks = nextBucket.timedTasks.map((t: any) => {
      const old = prevBucket.timedTasks.find(
        (p: any) => String(p.id) === String(t.id),
      )
      return old ? { ...t, completed: old.completed } : t
    })

    // ✅ (옵션) 할일박스에 사용하는 tasks 필드가 있다면 병합
    const mergedTasks =
      nextBucket.tasks?.map((t: any) => {
        const old = prevBucket.tasks?.find(
          (p: any) => String(p.id) === String(t.id),
        )
        return old ? { ...t, completed: old.completed } : t
      }) ?? nextBucket.tasks

    merged[date] = {
      ...nextBucket,
      checks: mergedChecks,
      spanEvents: mergedSpans,
      timedTasks: mergedTimedTasks,
      ...(mergedTasks ? { tasks: mergedTasks } : {}),
    }
  }

  return merged
})



    } catch (err) {
      console.error('❌ 주간 일정 불러오기 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // weekDates 변경 시 fetch
  useEffect(() => {
    if (weekDates.length) {
      // ✅ 이미 불러온 날짜면 fetch 안함
      const allCached = weekDates.every((d) => weekData[d])
      if (!allCached) fetchWeek(weekDates)
    }
  }, [weekDates, weekData, fetchWeek])


  // Header와 연동
  useFocusEffect(
    useCallback(() => {
      const emit = () =>
        bus.emit('calendar:state', {
          date: anchorDate,
          mode: 'week',
          days: isZoomed ? 5 : 7,   // ✅ 현재 뷰 일수 같이 전달
        })

      const onReq = () => emit()
      const onSet = (iso: string) => setAnchorDate(iso)

      emit()
      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)

      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
      }
    }, [anchorDate, isZoomed]),
  )


  // 변경사항 반영
  useEffect(() => {
    const onMutated = (payload: {
      op: 'create' | 'update' | 'delete'
      item: any
    }) => {
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
      const changedId = String(item.id ?? item.taskId ?? '')

      // ✅ 내가 방금 보낸 변경이면 무시 (자기 새로고침 방지)
      if (changedId && changedId === lastMutatedId) {
        setLastMutatedId(null)
        return
      }

      // ✅ 현재 표시 중인 주(또는 5일) 안에 해당 날짜가 있으면 새로 fetch
      if (weekDates.includes(itemDateISO)) {
        fetchWeek(weekDates)
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [weekDates, fetchWeek, lastMutatedId])

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
  let changedDate: string | null = null

  setWeekData((prev: WeekData) => {
    const next: WeekData = {}
    for (const [d, bucket] of Object.entries(prev)) {
      let updated = false

      const updatedChecks = bucket.checks.map((c) => {
        if (c.id === taskId) {
          const done = !c.done
          newDone = done
          changedDate = d
          updated = true
          return { ...c, done }
        }
        return c
      })

      const updatedSpans = bucket.spanEvents.map((s: any) => {
        if (String(s.id) === String(taskId)) {
          const done = !s.done
          newDone = done
          changedDate = d
          updated = true
          return { ...s, done }
        }
        return s
      })

      next[d] = { ...bucket, checks: updatedChecks, spanEvents: updatedSpans }
    }
    return next
  })

  if (!changedDate) return

  try {
    await http.put(`/task/${taskId}`, { completed: newDone })
    setLastMutatedId(taskId)
    // ✅ DayView도 즉시 반영되게 이벤트 broadcast
    bus.emit('calendar:mutated', {
      op: 'update',
      item: {
        id: taskId,
        completed: newDone,
        date: changedDate,
        startDate: changedDate,
      },
    })
  } catch (err: any) {
    console.error('❌ 체크 업데이트 실패:', err.message)
  }
}


  const today = todayISO()
  const spanBars = buildWeekSpanEvents(weekDates, weekData)
  const maxSpanRow = spanBars.reduce((m, s) => (s.row > m ? s.row : m), -1)
  
  const dayColWidth = getDayColWidth(weekDates.length)

  // 요일 개수에 따라 DAY_COL_W 계산
  const DAY_COL_W = getDayColWidth(weekDates.length)

  // 핀치 제스처 & 애니메이션 (Hook 규칙 지키도록 if 이전에서 선언)
  const scale = useSharedValue(1)

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale
    })
    .onEnd(() => {
      const current = scale.value
      if (current > 1.05 && !isZoomed) {
        runOnJS(setIsZoomed)(true)
      } else if (current < 0.95 && isZoomed) {
        runOnJS(setIsZoomed)(false)
      }
      scale.value = withTiming(1, { duration: 150 })
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  // spanbar 전체 컨텐츠 높이
  const spanAreaHeight =
    maxSpanRow < 0 ? 0 : (maxSpanRow + 1) * (SINGLE_HEIGHT + 4)

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={[S.screen, animatedStyle]}>
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
                    <View key={`${d}-header`} style={[S.weekHeaderCol, { width: dayColWidth }]}   // ✅ 폭 주입
                      >
                      <Text
                        style={[
                          S.weekHeaderText,
                          { color: '#333333' },
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
                <View style={[S.multiDayArea, { height: 150 }]}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      height: spanAreaHeight,
                      position: 'relative',
                      paddingBottom: 4,
                    }}
                  >
                    {spanBars.map((s) => {
                      const left =
                        TIME_COL_W + s.startIdx * dayColWidth + 2
                      const width =
                        (s.endIdx - s.startIdx + 1) * dayColWidth - 4
                      const isSingleDay =
                        s.startISO === s.endISO
                      const isTask = s.color === '#000000'

                      if (isTask) {
                        return (
                          <Pressable
                            key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
                            onPress={() => toggleCheck(s.id)}
                            style={{
                              position: 'absolute',
                              top:
                                s.row * (SINGLE_HEIGHT + 4),
                              left,
                              width,
                              height: SINGLE_HEIGHT,
                              borderWidth: 1,
                              borderColor: '#000000',
                              borderRadius: 3,
                              backgroundColor: '#FFFFFF',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              paddingHorizontal: 6,
                            }}
                          >
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderWidth: 1,
                                borderColor: '#000000',
                                marginRight: 5,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: s.done
                                  ? '#000000'
                                  : '#FFFFFF',
                              }}
                            >
                              {s.done && (
                                <Text
                                  style={{
                                    color: '#FFFFFF',
                                    fontSize: 7,
                                    fontWeight: '700',
                                  }}
                                >
                                  ✓
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{
                                color: s.done
                                  ? '#888888'
                                  : '#000000',
                                fontSize: 11,
                                fontWeight: '700',
                                textDecorationLine: s.done
                                  ? 'line-through'
                                  : 'none',
                                width: 'auto',
                                maxWidth: '90%',
                                overflow: 'hidden',
                                flexWrap: 'nowrap',
                                flexShrink: 1,
                                includeFontPadding: false,
                                textAlignVertical: 'center',
                              }}
                              numberOfLines={1}
                              ellipsizeMode="clip"
                            >
                              {s.title}
                            </Text>
                          </Pressable>
                        )
                      }

                      const mainColor = s.color?.startsWith('#')
                        ? s.color
                        : `#${s.color || 'B04FFF'}`
                      const lightColor = `${mainColor}33`

                      // ✅ 일정의 기본 스타일 계산
const baseStyle: any = {
  position: 'absolute',
  top: s.row * (SINGLE_HEIGHT + 4),
  left,
  width,
  height: SINGLE_HEIGHT,
  justifyContent: 'center',
  alignItems: isSingleDay ? 'flex-start' : 'center',
  paddingHorizontal: 6,
  backgroundColor: isSingleDay ? mainColor : lightColor,
  // ✅ 하루짜리 일정은 둥글게, 기간 일정은 각지게
  borderRadius: isSingleDay ? 6 : 0,
}


                      return (
  <View
    key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
    style={baseStyle}
  >
    {/* ✅ 왼쪽 끝 강조 */}
    {weekDates.includes(s.startISO) && weekDates[s.startIdx] === s.startISO && (
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          backgroundColor: mainColor,
          borderTopLeftRadius: isSingleDay ? 6 : 0,
          borderBottomLeftRadius: isSingleDay ? 6 : 0,
        }}
      />
    )}

    {/* ✅ 오른쪽 끝 강조 */}
    {weekDates.includes(s.endISO) && weekDates[s.endIdx] === s.endISO && (
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 5,
          backgroundColor: mainColor,
          borderTopRightRadius: isSingleDay ? 6 : 0,
          borderBottomRightRadius: isSingleDay ? 6 : 0,
        }}
      />
    )}

    {/* 일정 제목 */}
    <Text
      style={{
        color: isSingleDay ? '#FFFFFF' : '#000000',
        fontWeight: '700',
        fontSize: 12,
        width: 'auto',
        maxWidth: '90%',
        overflow: 'hidden',
        flexWrap: 'nowrap',
        flexShrink: 1,
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}
      numberOfLines={1}
      ellipsizeMode="clip"
    >
      {s.title}
    </Text>
  </View>
)

                    })}
                  </ScrollView>
                </View>
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
                      style={[S.dayCol, { width: dayColWidth }]}   // ✅ 폭 주입
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
                          dayColWidth={dayColWidth}
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
  onLocalChange={({ id, dateISO, completed }) => {
    if (typeof completed !== 'boolean') return

    setWeekData((prev: WeekData) => {
      const copy = { ...prev }
      const bucket = copy[dateISO]
      if (!bucket) return copy

      // ✅ 그룹 내 타임라인 task 상태 반영
      if (bucket.timedTasks) {
        bucket.timedTasks = bucket.timedTasks.map((t: any) =>
          String(t.id) === String(id)
            ? { ...t, completed }
            : t,
        )
      }

      // ✅ (옵션) bucket.tasks를 쓰는 곳이 있다면 함께 반영
      if (bucket.tasks) {
        bucket.tasks = bucket.tasks.map((t: any) =>
          String(t.id) === String(id)
            ? { ...t, completed }
            : t,
        )
      }

      return copy
    })

    // ✅ 내가 변경한 항목 표시 → bus.on에서 자기 이벤트 무시용
    setLastMutatedId(id)
  }}
/>

                        ) : (
                          <DraggableTaskBox
  key={key}
  id={String(list[0].id)}
  title={list[0].title}
  startHour={start}
  done={list[0].completed ?? false}
  dateISO={d}
  onLocalChange={({ id, dateISO, completed, placementTime }) => {
    setWeekData((prev: WeekData) => {
      const copy = { ...prev }
      const bucket = copy[dateISO]
      if (!bucket) return copy
      bucket.timedTasks = bucket.timedTasks.map((t: any) => {
        if (String(t.id) !== String(id)) return t
        return {
          ...t,
          ...(typeof completed === 'boolean' ? { completed } : {}),
          ...(placementTime ? { placementTime } : {}),
        }
      })
      return copy
    })
    if (typeof completed === 'boolean' || placementTime) {
      setLastMutatedId(id)
    }
  }}
/>

                        )
                      })}
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
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
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  weekHeaderTimeCol: {
    width: TIME_COL_W,
  },
  weekHeaderCol: {
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
    overflow: 'hidden',
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
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 0,
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
    textAlign: 'left',
    marginLeft: 2,
    marginRight: 0,
  },

  dayCol: {
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
    alignItems: 'center',
    marginTop: 3,
    marginLeft: -10,
    paddingRight: 6,
    flexWrap: 'nowrap',
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
    backgroundColor: '#333333',
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
    flex: 1,
    minWidth: 100,
    includeFontPadding: false,
  },
})
