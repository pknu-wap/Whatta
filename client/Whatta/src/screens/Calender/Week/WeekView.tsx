import React, { useRef, useState, useEffect, useCallback } from 'react'
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
  Vibration,
  Alert,
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

import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import AddImageSheet from '@/screens/More/Ocr'
import OCREventCardSlider, { OCREvent } from '@/screens/More/OcrEventCardSlider'

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
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`
}

const startOfWeek = (iso: string) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, dd)
  const wd = base.getDay()
  const s = new Date(base.getFullYear(), base.getMonth(), base.getDate() - wd)
  return `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`
}

const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

// 1일(24시간)의 전체 높이(px)
const DAY_PX = 24 * 60 * PIXELS_PER_MIN

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const TIME_COL_W = 50

const SIDE_PADDING = 16 * 2 // ← 좌우 여백 합 = 32
const getDayColWidth = (count: number) =>
  (SCREEN_W - TIME_COL_W - SIDE_PADDING) / (count > 0 ? count : 7)

let prevLayoutMap: Record<string, LayoutedEvent> = {}

/* -------------------------------------------------------------------------- */
/* 공통 컴포넌트 */
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

function mixWhite(hex: string, whitePercent: number) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  const w = whitePercent / 100
  const base = 1 - w

  const mix = (c: number) => Math.round(c * base + 255 * w)

  const newR = mix(r)
  const newG = mix(g)
  const newB = mix(b)

  return (
    '#' +
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase()
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
  isRepeat?: boolean
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
  isRepeat?: boolean
}

/* -------------------------------------------------------------------------- */
/* Day 일정 레이아웃 계산 */
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

    const overlappingGroup = sorted.filter(
      (other) =>
        other.id !== ev.id && other.startMin < ev.endMin && other.endMin > ev.startMin,
    )

    const hasOverlap = overlappingGroup.length > 0
    const prev = prevLayoutMap[ev.id]
    const wasPartial = prev?.isPartialOverlap ?? false

    let overlapDepth = 0
    let isPartialOverlap = false

    if (hasOverlap) {
      const group = [...overlappingGroup, ev].sort((a, b) => a.startMin - b.startMin)
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

    const list = [...(bucket.spanEvents || []), ...(bucket.checks || [])]

    list.forEach((e: any) => {
      const id = String(e.id)
      const title = e.title ?? ''

      const isTask =
        e.isTask === true ||
        typeof e.completed !== 'undefined' ||
        typeof e.done !== 'undefined' ||
        e.type === 'task'

      const colorKey = isTask
        ? '000000'
        : (e.colorKey && String(e.colorKey).replace('#', '')) || '8B5CF6'
      const color = colorKey.startsWith('#') ? colorKey : `#${colorKey}`

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
        (other) => !(ev.endIdx < other.startIdx || ev.startIdx > other.endIdx),
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
/* Task 시간 파싱 헬퍼 */
/* -------------------------------------------------------------------------- */

function getTaskTime(t: any): string {
  if (t?.placementTime && typeof t.placementTime === 'string') {
    return t.placementTime
  }
  if (t?.dueDateTime && typeof t.dueDateTime === 'string') {
    const parts = t.dueDateTime.split('T')
    if (parts.length > 1) {
      return parts[1].slice(0, 8)
    }
  }
  return '00:00:00'
}

/**
 * 서버 TaskUpdateRequest 스펙에 맞는 payload 생성 헬퍼
 */
function buildTaskUpdatePayload(task: any, overrides: Partial<any> = {}) {
  if (!task) return overrides

  const labels = Array.isArray(task.labels)
    ? task.labels.map((l: any) => (typeof l === 'number' ? l : (l.id ?? l.labelId ?? l)))
    : undefined

  const base: any = {
    title: task.title,
    content: task.content,
    completed: task.completed,
    placementDate: task.placementDate,
    placementTime: task.placementTime,
    dueDateTime: task.dueDateTime,
    sortNumber: task.sortNumber,
  }

  if (labels) base.labels = labels
  if (task.repeat) base.repeat = task.repeat
  if (task.endDate) base.endDate = task.endDate

  return {
    ...base,
    ...overrides,
  }
}

/* -------------------------------------------------------------------------- */
/* TaskGroupBox */
/* -------------------------------------------------------------------------- */

function TaskGroupBox({
  tasks,
  startHour,
  onLocalChange,
  dayColWidth,
  dateISO,
}: {
  tasks: any[]
  startHour: number
  dayColWidth: number
  dateISO: string
  onLocalChange?: (payload: {
    id: string
    dateISO: string
    completed?: boolean
    placementTime?: string | null
  }) => void
}) {
  const [localTasks, setLocalTasks] = useState(tasks)

  const topBase = startHour * 60 * PIXELS_PER_MIN
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = ROW_H
  const maxBottom = 24 * ROW_H - height
  const [expanded, setExpanded] = useState(false)
  const isActiveDrag = useSharedValue(false)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const triggerHaptic = () => {
    Vibration.vibrate(50)
  }

  const handleDropGroup = useCallback(
    async (movedY: number, dayOffset: number) => {
      try {
        const SNAP = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const actualTopPx = topBase + snappedY
        let newStart = actualTopPx / PIXELS_PER_MIN
        if (newStart < 0) newStart = 0
        if (newStart > 24 * 60 - 5) newStart = 24 * 60 - 5

        const h = Math.floor(newStart / 60)
        const m = Math.round(newStart % 60)
        const fmt = (n: number) => String(n).padStart(2, '0')
        const newTime = `${fmt(h)}:${fmt(m)}:00`

        const newDateISO = addDays(dateISO, dayOffset)

        await Promise.all(
          localTasks.map(async (t: any) => {
            const taskId = String(t.id)
            try {
              const payload = buildTaskUpdatePayload(t, {
                placementDate: newDateISO,
                placementTime: newTime,
              })

              await http.patch(`/task/${taskId}`, payload)

              bus.emit('calendar:mutated', {
                op: 'update',
                item: {
                  id: taskId,
                  placementDate: newDateISO,
                  placementTime: newTime,
                  date: newDateISO,
                  startDate: newDateISO,
                },
              })

              onLocalChange?.({
                id: taskId,
                dateISO: newDateISO,
                placementTime: newTime,
              })
            } catch (err: any) {
              console.error('❌ TaskGroup 이동 실패:', err.message)
            }
          }),
        )

        translateX.value = withTiming(dayColWidth * dayOffset, {
          duration: 80,
        })
      } catch (err: any) {
        console.error('❌ TaskGroup 이동 처리 중 오류:', err.message)
      }
    },
    [dateISO, localTasks, onLocalChange, startHour, translateX, translateY, dayColWidth],
  )

  const longPress = Gesture.LongPress()
    .minDuration(250)
    .maxDistance(1000)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      isActiveDrag.value = true
      runOnJS(triggerHaptic)()
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      let nextY = translateY.value + e.changeY

      // 드래그 Y 제한 (0~24시 범위 보장)
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN

      const minY = -topBase
      const maxY = DAY_PX - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      // 드롭 시에도 0~24시 범위로 한 번 더 clamp
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN
      const minY = -topBase
      const maxY = DAY_PX - topBase - height
      if (snappedY < minY) snappedY = minY
      if (snappedY > maxY) snappedY = maxY

      translateY.value = withSpring(snappedY)

      const dayOffset = Math.round(translateX.value / dayColWidth)
      translateX.value = withTiming(dayColWidth * dayOffset, { duration: 80 })
      isActiveDrag.value = false
      runOnJS(handleDropGroup)(snappedY, dayOffset)
    })

  const composedGesture = Gesture.Simultaneous(longPress, drag)

  const style = useAnimatedStyle(() => ({
    top: topBase + translateY.value + 2,
    transform: [{ translateX: translateX.value }],
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
    const base = target.placementDate ?? target.dueDateTime ?? target.date ?? todayISO()
    const taskDateISO = String(base).slice(0, 10)

    try {
      const full = await http.get(`/task/${taskId}`)
      const task = full.data.data

      await http.patch(`/task/${taskId}`, {
        ...task,
        completed,
      })

      onLocalChange?.({ id: String(taskId), dateISO: taskDateISO, completed })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id: taskId,
          completed,
          date: taskDateISO,
          startDate: taskDateISO,
        },
      })
    } catch (err: any) {
      console.error('❌ TaskGroup 체크 업데이트 실패:', err.message)
    }
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[S.taskGroupBox, style, !expanded && { justifyContent: 'center' }]}
      >
        <View style={S.taskGroupInner}>
          <Pressable onPress={toggleExpand} style={S.groupHeaderRow}>
            <View
              style={[
                S.groupHeaderArrow,
                expanded && { transform: [{ rotate: '180deg' }] },
              ]}
            />
            <Text style={S.groupHeaderText}>할일</Text>
          </Pressable>

          {expanded && (
            <View style={S.groupList}>
              {localTasks.map((t: any) => (
                <Pressable
                  key={String(t.id)}
                  style={S.groupTaskRow}
                  onPress={() => toggleTaskDone(t.id)}
                >
                  <View
                    style={[S.groupTaskCheckbox, t.completed && S.groupTaskCheckboxOn]}
                  >
                    {t.completed && <Text style={S.groupTaskCheckmark}>✓</Text>}
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
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

/* -------------------------------------------------------------------------- */
/* DraggableTaskBox */
/* -------------------------------------------------------------------------- */

type DraggableTaskBoxProps = {
  id: string
  title: string
  startHour: number
  done?: boolean
  dateISO: string
  dayColWidth: number
  dayIndex: number
  weekCount: number
  openDetail: (id: string) => void
  isRepeat?: boolean
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
  dayColWidth,
  onLocalChange,
  openDetail,
  isRepeat,
}: DraggableTaskBoxProps) {
  const startMin = startHour * 60
  const topBase = startMin * PIXELS_PER_MIN
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = ROW_H - 6
  const maxBottom = 24 * ROW_H - height
  const [done, setDone] = useState(initialDone)
  const isActiveDrag = useSharedValue(false)

  const toggleDone = async () => {
    const next = !done
    setDone(next)
    try {
      const full = await http.get(`/task/${id}`)
      const task = full.data.data
      const payload = buildTaskUpdatePayload(task, { completed: next })

      await http.patch(`/task/${id}`, payload)

      onLocalChange?.({ id, dateISO, completed: next })

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

  const handleDrop = async (movedY: number, dayOffset: number) => {
    try {
      const SNAP = 5 * PIXELS_PER_MIN
      const snappedY = Math.round(movedY / SNAP) * SNAP
      translateY.value = withSpring(snappedY)

      const actualTopPx = topBase + snappedY
      let newStart = actualTopPx / PIXELS_PER_MIN

      // 24시간 범위 안에서만 이동
      if (newStart < 0) newStart = 0
      if (newStart > 24 * 60 - 1) newStart = 24 * 60 - 1

      const h = Math.floor(newStart / 60)
      const m = Math.floor(newStart % 60)
      const fmt = (n: number) => String(n).padStart(2, '0')

      const newTime = `${fmt(h)}:${fmt(m)}:00`

      const newDateISO = addDays(dateISO, dayOffset)

      const full = await http.get(`/task/${id}`)
      const task = full.data.data
      const payload = buildTaskUpdatePayload(task, {
        placementDate: newDateISO,
        placementTime: newTime,
      })

      await http.patch(`/task/${id}`, payload)

      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id,
          placementDate: newDateISO,
          placementTime: newTime,
          date: newDateISO,
          startDate: newDateISO,
        },
      })
    } catch (err: any) {
      console.log('❌ Task 이동 실패 디버그:', err.response?.data || err.message)
    }
  }

  const triggerHaptic = () => {
    Vibration.vibrate(50)
  }

  const longPress = Gesture.LongPress()
    .minDuration(250)
    .maxDistance(1000)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      isActiveDrag.value = true
      runOnJS(triggerHaptic)()
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      let nextY = translateY.value + e.changeY

      // 드래그 Y 제한 (0~24시 범위 보장)
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN

      const minY = -topBase
      const maxY = DAY_PX - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      // 드롭 시에도 0~24시 범위로 한 번 더 clamp
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN
      const minY = -topBase
      const maxY = DAY_PX - topBase - height
      if (snappedY < minY) snappedY = minY
      if (snappedY > maxY) snappedY = maxY

      translateY.value = withSpring(snappedY)

      const dayOffset = Math.round(translateX.value / dayColWidth)
      translateX.value = withTiming(dayColWidth * dayOffset, { duration: 80 })
      isActiveDrag.value = false
      runOnJS(handleDrop)(snappedY, dayOffset)
    })

  const composedGesture = Gesture.Simultaneous(longPress, drag)

  const style = useAnimatedStyle(() => ({
    top: topBase + translateY.value + 2,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[S.taskBox, style]}>
        <View style={S.taskInnerBox}>
          <Pressable
            onPress={() => {
              if (!isActiveDrag.value) runOnJS(openDetail)(id)
            }}
            hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            {/* 체크박스 */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation() // 상세 팝업 방지
                toggleDone()
              }}
              hitSlop={12}
            >
              <View style={[S.taskCheckbox, done && S.taskCheckboxOn]}>
                {done && <Text style={S.taskCheckmark}>✓</Text>}
              </View>
            </Pressable>

            {/* 타이틀 */}
            <Text style={[S.taskTitle, done && S.taskTitleDone]} numberOfLines={3}>
              {title}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

/* -------------------------------------------------------------------------- */
/* 드래그 가능한 일정 박스 */
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
  overlapDepth: number
  dayColWidth: number
  weekDates: string[]
  dayIndex: number
  openEventDetail: (id: string) => void
  isRepeat?: boolean
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
  isPartialOverlap,
  overlapDepth,
  dayColWidth,
  weekDates,
  dayIndex,
  openEventDetail,
  isRepeat,
}: DraggableFlexalbeEventProps) {
  const durationMin = endMin - startMin
  const height = (durationMin / 60) * ROW_H
  const topBase = (startMin / 60) * ROW_H
  const baseTop = startMin * PIXELS_PER_MIN
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const isActiveDrag = useSharedValue(false)

  const triggerHaptic = () => {
    Vibration.vibrate(50)
  }

  const handleDrop = useCallback(
    async (movedY: number, dayOffset: number) => {
      try {
        const SNAP = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const duration = endMin - startMin

        // 1) 드래그 후 실제 Y 좌표 기반 정확한 start 계산 (분 단위, 소수점 반올림)
        const topBasePx = (startMin / 60) * ROW_H
        const actualTopPx = topBasePx + snappedY
        let newStart = Math.round(actualTopPx / PIXELS_PER_MIN)

        // 2) 0분 ~ 1440분(24시) 범위 안으로 clamp
        const DAY_MIN = 24 * 60
        if (newStart < 0) newStart = 0
        if (newStart + duration > DAY_MIN) {
          newStart = DAY_MIN - duration
        }

        // 3) 새로운 종료시간 계산 (정확히 24:00이면 23:59:59로 보정)
        let newEnd = newStart + duration
        if (newEnd > DAY_MIN) newEnd = DAY_MIN

        const fmtTime = (min: number, isEnd: boolean) => {
          // 24:00 이상값은 모두 23:59:59로 보정
          if (min >= DAY_MIN && isEnd) {
            return '23:59:59'
          }
          if (min < 0) min = 0
          const h = Math.floor(min / 60)
          const m = Math.floor(min % 60)
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
        }

        const nextStartTime = fmtTime(newStart, false)
        const nextEndTime = fmtTime(newEnd, true)

        const newDateISO = addDays(dateISO, dayOffset)

        await http.put(`/event/${id}`, {
          startDate: newDateISO,
          endDate: newDateISO,
          startTime: nextStartTime,
          endTime: nextEndTime,
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            startDate: `${newDateISO}T${nextStartTime}`,
            endDate: `${newDateISO}T${nextEndTime}`,
          },
        })
      } catch (err: any) {
        console.error('❌ 이벤트 이동 실패:', err.message)
      }
    },
    [id, startMin, endMin, dateISO, translateY],
  )

  const longPress = Gesture.LongPress()
    .minDuration(250)
    .maxDistance(1000)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      isActiveDrag.value = true
      runOnJS(triggerHaptic)()
    })

  const safeColor = color.startsWith('#') ? color : `#${color}`
  const displayColor = isRepeat ? mixWhite(safeColor, 60) : safeColor
  const colGap = 0.5
  const colCount = Math.max(columnsTotal, 1)
  const slotWidth = dayColWidth / colCount

  let width = slotWidth - colGap * 2
  let left = slotWidth * column + colGap

  const overlapStyle: any = {}

  if (isPartialOverlap) {
    if (overlapDepth === 0) {
      // 그대로
    } else {
      const baseWidth = slotWidth - colGap * 2
      const effectiveDepth = Math.min(overlapDepth, 7)
      const shrink = effectiveDepth * 2
      width = baseWidth - shrink
      left = baseWidth - width + 2
      overlapStyle.borderWidth = 1
      overlapStyle.borderColor = '#FFFFFF'
    }
  }

  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + left

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      let nextY = translateY.value + e.changeY

      // 드래그 Y 제한 (0~24시 범위 보장)
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN

      const minY = -topBase
      const maxY = DAY_PX - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      // 드롭 시에도 0~24시 범위로 한 번 더 clamp
      const DAY_PX = 24 * 60 * PIXELS_PER_MIN
      const minY = -topBase
      const maxY = DAY_PX - topBase - height
      if (snappedY < minY) snappedY = minY
      if (snappedY > maxY) snappedY = maxY

      translateY.value = withSpring(snappedY)

      const dayOffset = Math.round(translateX.value / dayColWidth)
      translateX.value = withTiming(dayColWidth * dayOffset, { duration: 80 })
      isActiveDrag.value = false
      runOnJS(handleDrop)(snappedY, dayOffset)
    })

  const composedGesture = Gesture.Simultaneous(longPress, drag)

  const safeColor = color.startsWith('#') ? color : `#${color}`
  const colGap = 1
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

  const style = useAnimatedStyle(() => ({
    top: topBase + translateY.value,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          S.eventBox,
          {
            left,
            width: width - 2,
            height,
            backgroundColor: displayColor,
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

  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  const gridScrollRef = useRef<ScrollView>(null)
  const gridOffsetRef = useRef({ x: 0, y: 0 })
  const scrollOffsetRef = useRef(0)

  const SINGLE_HEIGHT = 22

  // Task Popup
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)

  const openTaskPopupFromApi = async (taskId: string) => {
    const res = await http.get(`/task/${taskId}`)
    const data = res.data.data
    if (!data) return

    setTaskPopupMode('edit')
    setTaskPopupId(data.id)
    setTaskPopupTask(data)
    setTaskPopupVisible(true)
  }

  useEffect(() => {
    const h = (payload?: { source?: string }) => {
      if (payload?.source !== 'Week') return

      // Create mode
      setTaskPopupMode('create')
      setTaskPopupId(null)
      setTaskPopupTask({
        id: null,
        title: '',
        content: '',
        labels: [],
        placementDate: anchorDate,
        placementTime: null,
        dueDateTime: null,
      })
      setTaskPopupVisible(true)
    }

    bus.on('task:create', h)
    return () => bus.off('task:create', h)
  }, [anchorDate])

  // Event Popup
  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')
  const [eventPopupData, setEventPopupData] = useState<any | null>(null)

  const openEventDetail = async (eventId: string) => {
    const res = await http.get(`/event/${eventId}`)
    const ev = res.data.data
    if (!ev) return

    setEventPopupMode('edit')
    setEventPopupData(ev)
    setEventPopupVisible(true)
  }

  useEffect(() => {
    const h = (payload?: { source?: string }) => {
      if (payload?.source !== 'Week') return

      setEventPopupMode('create')
      setEventPopupData(null)
      setEventPopupVisible(true)
    }

    bus.on('popup:schedule:create', h)
    return () => bus.off('popup:schedule:create', h)
  }, [])

  useEffect(() => {
    if (isZoomed) {
      const arr = Array.from({ length: 5 }, (_, i) => addDays(anchorDate, i - 2))
      setWeekDates(arr)
    } else {
      const s = startOfWeek(anchorDate)
      const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))
      setWeekDates(arr)
    }
  }, [anchorDate, isZoomed])

  useEffect(() => {
    const updateNowTop = (scrollToCenter: boolean) => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const topPos = (h * 60 + m) * PIXELS_PER_MIN
      setNowTop(topPos)

      if (scrollToCenter && !hasScrolledOnce) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            gridScrollRef.current?.scrollTo({
              y: Math.max(topPos - SCREEN_H * 0.35, 0),
              animated: true,
            })
            setHasScrolledOnce(true)
          })
        })
      }
    }

    updateNowTop(true)
    const id = setInterval(() => updateNowTop(false), 60000)
    return () => clearInterval(id)
  }, [hasScrolledOnce])

  useEffect(() => {
    if (nowTop !== null && gridScrollRef.current && !hasScrolledOnce) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(nowTop - SCREEN_H * 0.35, 0),
            animated: true,
          })
          setHasScrolledOnce(true)
        })
      })
    }
  }, [nowTop, weekData, hasScrolledOnce])

  useFocusEffect(
    useCallback(() => {
      currentCalendarView.set('week')
    }, []),
  )

  const fetchWeek = useCallback(async (dates: string[]) => {
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
          .filter((e: any) => !e.isSpan)
          .map((e: any) => {
            const sTime = e.clippedStartTime || e.startTime
            const eTime = e.clippedEndTime || e.endTime
            if (!sTime || !eTime) return null

            const [sh, sm] = sTime.split(':').map(Number)
            const [eh, em] = eTime.split(':').map(Number)

            return {
              id: String(e.id),
              title: e.title,
              place: e.place ?? '',
              startMin: sh * 60 + sm,
              endMin: eh * 60 + em,
              color: `#${(e.colorKey ?? 'B04FFF').replace('#', '')}`,
              isRepeat: e.isRepeat ?? false,
            }
          })
          .filter(Boolean) as DayTimelineEvent[]

        const spanEvents = [
          ...timed.filter((e: any) => {
            const s = e.startDate?.slice(0, 10)
            const ed = e.endDate?.slice(0, 10)
            return e.isSpan || (s && ed && s !== ed)
          }),
          ...allDaySpan,
          ...allDayEvents,
        ].map((e: any) => ({
          ...e,
          isRepeat: e.isRepeat ?? false,
        }))

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

        for (const [d, bucket] of Object.entries(next)) {
          const prevBucket = prev[d]
          const nextBucket = bucket as DayBucket

          if (!prevBucket) {
            merged[d] = nextBucket
            continue
          }

          const mergedChecks = nextBucket.checks.map((c) => {
            const old = prevBucket.checks.find((p) => p.id === c.id)
            return old ? { ...c, done: old.done } : c
          })

          const mergedSpans = nextBucket.spanEvents.map((s: any) => {
            const old = prevBucket.spanEvents.find(
              (p: any) => String(p.id) === String(s.id),
            )
            return old ? { ...s, done: old.done } : s
          })

          const mergedTimedTasks = nextBucket.timedTasks.map((t: any) => {
            const old = prevBucket.timedTasks.find(
              (p: any) => String(p.id) === String(t.id),
            )
            return old ? { ...t, completed: old.completed } : t
          })

          merged[d] = {
            ...nextBucket,
            checks: mergedChecks,
            spanEvents: mergedSpans,
            timedTasks: mergedTimedTasks,
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

  useEffect(() => {
    if (weekDates.length) {
      fetchWeek(weekDates)
    }
  }, [weekDates, fetchWeek])

  useFocusEffect(
    useCallback(() => {
      const emit = () =>
        bus.emit('calendar:state', {
          date: anchorDate,
          mode: 'week',
          days: isZoomed ? 5 : 7,
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
        setTimeout(() => fetchWeek(weekDates), 250)
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [weekDates, fetchWeek])

  const today = todayISO()
  const spanBars = buildWeekSpanEvents(weekDates, weekData)
  const maxSpanRow = spanBars.reduce((m, s) => (s.row > m ? s.row : m), -1)
  const spanAreaHeight = maxSpanRow < 0 ? 0 : (maxSpanRow + 1) * (SINGLE_HEIGHT + 4)

  const dayColWidth = getDayColWidth(weekDates.length)
  const showSpanScrollbar = spanContentH > spanWrapH - 10
  useEffect(() => {
    bus.emit('calendar:meta', {
      mode: 'week',
      dayColWidth,
      rowH: ROW_H,
    })
  }, [dayColWidth])

  const gridWrapRef = useRef<View>(null)

  type GridRect = {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }

  type DragDropPayload = {
    task: any
    x: number
    y: number
  }
  const [gridRect, setGridRect] = useState<GridRect | null>(null)

  const measureWeekLayouts = () => {
    if (!gridWrapRef.current) return

    gridWrapRef.current.measure((x, y, w, h, px, py) => {
      setGridRect({
        left: px,
        top: py,
        right: px + w,
        bottom: py + h,
        width: w,
        height: h,
      })
    })
  }

  useEffect(() => {
    const handler = () => requestAnimationFrame(measureWeekLayouts)
    bus.on('calendar:force-measure', handler)
    return () => bus.off('calendar:force-measure', handler)
  }, [])

  // 사이드바 → WeekView 드롭 처리 (좌표 기반)
  useEffect(() => {
    const onReady = () => {
      console.log('[xdrag:ready] WeekView ready, gridRect=', gridRect)
    }

    const onMove = ({ x, y }: DragDropPayload) => {
      // console.log('[xdrag:move]', { x, y })
    }

    const onDrop = async ({ task, x, y }: DragDropPayload) => {
      if (currentCalendarView.get() !== 'week') {
        // console.log('[DROP] WeekView 아님 → 드롭 무시')
        return
      }
      console.log('---------------- [xdrag:drop] ----------------')
      console.log('[DROP] raw payload:', { taskId: task?.id, x, y })

      if (!task) {
        console.log('[DROP] ❌ task 없음, return')
        return
      }
      if (!gridRect) {
        console.log('[DROP] ❌ gridRect 없음, 아직 measure 안됨')
        return
      }

      console.log('[DROP] gridRect:', gridRect)

      // 1) X좌표 → 요일 인덱스 계산
      const relX = x - gridRect.left
      const relY = y - gridRect.top

      console.log('[DROP] rel coords (grid 기준):', {
        relX,
        relY,
        scrollY: scrollOffsetRef.current,
      })

      const insideX = relX - TIME_COL_W

      const rawIndex = insideX / dayColWidth
      let dayIndex = Math.floor(rawIndex + 0.0001)

      console.log('[DROP] day index 계산 전:', {
        TIME_COL_W,
        dayColWidth,
        insideX,
        rawIndex,
        dayIndexBeforeClamp: dayIndex,
        weekDates,
      })

      // 클램프
      if (dayIndex < 0) dayIndex = 0
      if (dayIndex >= weekDates.length) dayIndex = weekDates.length - 1

      const targetDate = weekDates[dayIndex]

      console.log('[DROP] dayIndex after clamp:', {
        dayIndex,
        targetDate,
      })

      // 2) 시간(y) 계산
      const innerY_raw = y - gridRect.top
      let placementTime: string | null = null

      if (innerY_raw < 0) {
        console.log('[DROP] 상단바 드랍 → placementTime = null')
        placementTime = null
      } else {
        const innerY = innerY_raw + scrollOffsetRef.current
        let min = innerY / PIXELS_PER_MIN
        if (min < 0) min = 0
        if (min > 1439) min = 1439

        let snapped = Math.round(min / 5) * 5
        if (snapped >= 1440) snapped = 1435

        const h = Math.floor(snapped / 60)
        const m = snapped % 60
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        placementTime = `${hh}:${mm}:00`

        console.log('[DROP] time calc:', { innerY, min, snapped, hh, mm, placementTime })
      }

      // 3) 새 Task 생성 + 원본 삭제 + 로컬 반영
      try {
        // 3-1) 원본 Task 전체 정보 조회
        const full = await http.get(`/task/${task.id}`)
        const baseTask = full.data.data

        // label id 배열 추출 (숫자만)
        const labelIds = Array.isArray(baseTask.labels)
          ? baseTask.labels.map((l: any) =>
              typeof l === 'number' ? l : (l.id ?? l.labelId ?? l),
            )
          : null

        const createPayload: any = {
          title: baseTask.title ?? task.title ?? '(제목 없음)',
          content: baseTask.content ?? '',
          labels: labelIds && labelIds.length ? labelIds : null,
          placementDate: targetDate,
          placementTime: placementTime,
          dueDateTime: baseTask.dueDateTime ?? null,
          repeat: baseTask.repeat ?? null,
          reminderNoti: baseTask.reminderNoti ?? null,
        }

        console.log('🟣 [DROP DEBUG] ===== CREATE 직전 전체 정보 =====')
        console.log('originTaskId:', task.id)
        console.log('targetDate:', targetDate)
        console.log('placementTime:', placementTime)
        console.log('baseTask (GET /task):', baseTask)
        console.log('createPayload (POST /task):', createPayload)

        // 3-2) 새 Task 생성
        const createRes = await http.post('/task', createPayload)
        const created = createRes.data?.data

        console.log('🟢 [DROP DEBUG] CREATE 성공')
        console.log('status:', createRes.status)
        console.log('created:', created)

        // 3-3) 원래 사이드바 Task 삭제 (실패해도 치명적이지 않으므로 try-catch 분리)
        try {
          await http.delete(`/task/${task.id}`)
          console.log('🟢 [DROP DEBUG] 원본 Task 삭제 성공:', task.id)
        } catch (delErr: any) {
          console.warn(
            '🟡 [DROP DEBUG] 원본 Task 삭제 실패 (무시 가능):',
            delErr?.message ?? String(delErr),
          )
        }

        // 사이드바에 바로 반영
        bus.emit('sidebar:remove-task', { id: task.id })

        // 3-4) 로컬 weekData에 새 Task 추가
        setWeekData((prev) => {
          const next = { ...prev }

          const targetBucket: DayBucket =
            next[targetDate] ??
            ({
              spanEvents: [],
              timelineEvents: [],
              checks: [],
              timedTasks: [],
            } as DayBucket)

          // 혹시 같은 id가 이미 있으면 제거
          targetBucket.timedTasks = (targetBucket.timedTasks || []).filter(
            (t: any) => String(t.id) !== String(created?.id),
          )

          targetBucket.timedTasks = [
            ...(targetBucket.timedTasks || []),
            {
              ...created,
              placementDate: targetDate,
              placementTime: placementTime,
            },
          ]

          next[targetDate] = targetBucket

          console.log(
            `[DROP]   targetDate=${targetDate} 에 새 task 추가 후 timedTasks len=`,
            targetBucket.timedTasks.length,
          )

          return next
        })

        // 3-5) 다른 뷰들에 생성 알림
        bus.emit('calendar:mutated', {
          op: 'create',
          item: {
            id: created?.id,
            placementDate: targetDate,
            placementTime: placementTime,
            date: targetDate,
            startDate: targetDate,
          },
        })

        console.log('---------------- [/xdrag:drop] ----------------')
      } catch (err: any) {
        console.log('🔴 [DROP DEBUG] 드롭 처리 실패')
        console.log('message:', err?.message)
        console.log('status:', err?.response?.status)
        console.log('response:', err?.response?.data)
        console.log('---------------- [/xdrag:drop] ----------------')
      }
    }

    bus.on('xdrag:ready', onReady)
    bus.on('xdrag:move', onMove)
    bus.on('xdrag:drop', onDrop)
    return () => {
      bus.off('xdrag:ready', onReady)
      bus.off('xdrag:move', onMove)
      bus.off('xdrag:drop', onDrop)
    }
  }, [weekDates, gridRect, dayColWidth])

  const toggleSpanTaskCheck = async (
    taskId: string,
    prevDone: boolean,
    dateISO: string,
  ) => {
    try {
      const nextCompleted = !prevDone

      const full = await http.get(`/task/${taskId}`)
      const task = full.data.data
      const payload = buildTaskUpdatePayload(task, {
        completed: nextCompleted,
      })

      await http.patch(`/task/${taskId}`, payload)

      setWeekData((prev) => {
        const copy = { ...prev }
        const bucket = copy[dateISO]
        if (!bucket) return copy

        bucket.spanEvents = bucket.spanEvents.map((e: any) => {
          if (String(e.id) === String(taskId)) {
            return { ...e, done: nextCompleted }
          }
          return e
        })

        bucket.checks = bucket.checks.map((c) => {
          if (String(c.id) === String(taskId)) {
            return { ...c, done: nextCompleted }
          }
          return c
        })

        return copy
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id: taskId,
          completed: nextCompleted,
          date: dateISO,
          startDate: dateISO,
        },
      })
    } catch (err) {
      console.error('❌ spanBar Task 체크 실패:', err)
    }
  }

  useEffect(() => {
    if (!gridWrapRef.current) return

    gridWrapRef.current.measure((x, y, w, h, px, py) => {
      console.log('[measure] gridWrapRef:', { x, y, w, h, px, py })
      setGridRect({
        left: px,
        top: py,
        right: px + w,
        bottom: py + h,
        width: w,
        height: h,
      })
    })
  }, [weekDates])

  const scale = useSharedValue(1)
  const swipeX = useSharedValue(0)

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
  const handleDeleteTask = () => {
    if (!taskPopupId) return

    Alert.alert('삭제', '이 테스크를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            // 서버에서 삭제
            await http.delete(`/task/${taskPopupId}`)

            // 캘린더 쪽에 변경 알리기 (Day/Month/Week 모두)
            bus.emit('calendar:mutated', {
              op: 'delete',
              item: { id: taskPopupId },
            })
            bus.emit('calendar:invalidate', {
              ym: anchorDate.slice(0, 7),
            })

            // 주간 데이터 새로고침
            await fetchWeek(weekDates)

            // 팝업 닫기 + 상태 초기화
            setTaskPopupVisible(false)
            setTaskPopupId(null)
            setTaskPopupTask(null)
          } catch (err) {
            console.error('❌ 테스크 삭제 실패:', err)
            Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
          }
        },
      },
    ])
  }
  
  // 🟣 주간뷰 좌우 스와이프 제스처
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    swipeX.value = e.translationX
  })
  .onEnd(() => {
    const threshold = SCREEN_W * 0.25

    if (swipeX.value > threshold) {
      // 오른쪽 스와이프 → 이전 주 / 이전 5일
      runOnJS(setAnchorDate)(addDays(anchorDate, -(isZoomed ? 5 : 7)))
    } else if (swipeX.value < -threshold) {
      // 왼쪽 스와이프 → 다음 주 / 다음 5일
      runOnJS(setAnchorDate)(addDays(anchorDate, isZoomed ? 5 : 7))
    }

    swipeX.value = withTiming(0, { duration: 200 })
  })

const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture)

const swipeStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: swipeX.value }],
}))

const { items: filterLabels } = useLabelFilter()

  const enabledLabelIds = filterLabels.filter((l) => l.enabled).map((l) => l.id)
  if (loading && !weekDates.length) {
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
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[S.screen, animatedStyle, swipeStyle]}>
            <FullBleed padH={16}>
              <View style={S.weekHeaderRow}>
                <View
                  style={S.weekHeaderTimeCol}
                  onLayout={(e) => {
                    const { x, y } = e.nativeEvent.layout
                    gridOffsetRef.current = { x, y }
                  }}
                />
                {weekDates.map((d, colIdx) => {
                  const dt = parseDate(d)
                  const dow = dt.getDay()
                  const label = ['일', '월', '화', '수', '목', '금', '토'][dow]
                  const isToday = d === today
                  return (
                    <View
                      key={`${d}-header`}
                      style={[S.weekHeaderCol, { width: dayColWidth }]}
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

            <FullBleed padH={0}>
              <View style={S.topArea}>
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
                      const left = TIME_COL_W + s.startIdx * dayColWidth + 2
                      const width = (s.endIdx - s.startIdx + 1) * dayColWidth - 4
                      const isSingleDay = s.startISO === s.endISO
                      const isTask = s.color === '#000000'

                      if (isTask) {
                        return (
                          <Pressable
                            key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
                            onPress={() =>
                              toggleSpanTaskCheck(
                                String(s.id),
                                !!s.done,
                                weekDates[s.startIdx],
                              )
                            }
                            style={{
                              position: 'absolute',
                              top: s.row * (SINGLE_HEIGHT + 4),
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
                                backgroundColor: s.done ? '#000000' : '#FFFFFF',
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
                                color: s.done ? '#888888' : '#000000',
                                fontSize: 11,
                                fontWeight: '700',
                                maxWidth: '90%',
                                includeFontPadding: false,
                                textDecorationLine: s.done ? 'line-through' : 'none',
                              }}
                              numberOfLines={1}
                            >
                              {s.title}
                            </Text>
                          </Pressable>
                        )
                      }

                      const mainColor = s.color?.startsWith('#')
                        ? s.color
                        : `#${s.color || 'B04FFF'}`
                      const lightColor = mixWhite(mainColor, 70)
                      const displayColor = s.isRepeat
                        ? mixWhite(mainColor, 70)
                        : isSingleDay
                          ? mainColor
                          : mixWhite(mainColor, 70)

                      const baseStyle: any = {
                        position: 'absolute',
                        top: s.row * (SINGLE_HEIGHT + 4),
                        left,
                        width,
                        height: SINGLE_HEIGHT,
                        justifyContent: 'center',
                        alignItems: isSingleDay ? 'flex-start' : 'center',
                        paddingHorizontal: 6,
                        backgroundColor: displayColor,
                        borderRadius: isSingleDay ? 3 : 0,
                      }

                      return (
                        <View
                          key={`${s.id}-${s.row}-${s.startIdx}-${s.endIdx}`}
                          style={baseStyle}
                        >
                          {weekDates.includes(s.startISO) &&
                            weekDates[s.startIdx] === s.startISO && (
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

                          {weekDates.includes(s.endISO) &&
                            weekDates[s.endIdx] === s.endISO && (
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

            <ScrollView
              ref={gridScrollRef}
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                scrollOffsetRef.current = e.nativeEvent.contentOffset.y
              }}
              scrollEventThrottle={16}
              style={S.timelineScroll}
              contentContainerStyle={S.timelineContent}
              showsVerticalScrollIndicator={false}
            >
              <View ref={gridWrapRef} style={S.timelineInner}>
                <View pointerEvents="none" style={S.hourLinesOverlay}>
                  <View style={S.mainVerticalLine} />

                  {HOURS.map((_, i) => {
                    if (i === HOURS.length - 1) return null
                    return (
                      <View
                        key={`hline-${i}`}
                        style={[S.hourLine, { top: (i + 1) * ROW_H }]}
                      />
                    )
                  })}
                </View>

                {weekDates.map((d) => {
                  const bucket = weekData[d] || {
                    timelineEvents: [],
                    timedTasks: [],
                  }
                  const isTodayCol = d === today
                  const layoutEvents = layoutDayEvents(bucket.timelineEvents || [])
                  const timedTasks = (bucket.timedTasks || []).filter((t: any) =>
                    (t.labels ?? []).some((lid: number) => enabledLabelIds.includes(lid)),
                  )

                  const groupedTasks = timedTasks.reduce(
                    (acc: Record<string, any[]>, t: any) => {
                      const timeKey = getTaskTime(t)
                      acc[timeKey] = acc[timeKey] ? [...acc[timeKey], t] : [t]
                      return acc
                    },
                    {},
                  )

                  return (
                    <View key={`${d}-col`} style={[S.dayCol, { width: dayColWidth }]}>
                      {HOURS.map((_, i) => (
                        <View key={`${d}-row-${i}`} style={S.hourRow} />
                      ))}

                      {isTodayCol && nowTop !== null && (
                        <>
                          <View style={[S.liveBar, { top: nowTop }]} />
                          <View style={[S.liveDot, { top: nowTop - 3 }]} />
                        </>
                      )}

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
                          weekDates={weekDates}
                        />
                      ))}

                      {Object.entries(groupedTasks).map(([timeKey, group]) => {
                        const list = group as any[]
                        if (!list.length) return null

                        const timeStr = getTaskTime(list[0])
                        const [h, m] = timeStr.split(':').map((n) => Number(n) || 0)
                        const start = h + m / 60

                        return list.length > 1 ? (
                          <TaskGroupBox
                            key={`${d}-${timeKey}-${list.length}`}
                            tasks={list}
                            startHour={start}
                            dayColWidth={dayColWidth}
                            weekDates={weekDates}
                            dayIndex={colIdx}
                            openEventDetail={openEventDetail}
                            isRepeat={ev.isRepeat}
                          />
                        ))}

                        {Object.entries(groupedTasks).map(([timeKey, group]) => {
                          const list = group as any[]
                          if (!list.length) return null

                          const timeStr = getTaskTime(list[0])
                          const [h, m] = timeStr.split(':').map((n) => Number(n) || 0)
                          const start = h + m / 60

                          if (list.length > 1) {
                            return (
                              <TaskGroupBox
                                key={`${d}-${timeKey}-${dayColWidth}`}
                                tasks={list}
                                startHour={start}
                                dayColWidth={dayColWidth}
                                dateISO={d}
                                dayIndex={colIdx}
                                weekCount={weekDates.length}
                                onLocalChange={({ id, dateISO, completed }) => {
                                  if (typeof completed === 'boolean') {
                                    setWeekData((prev: WeekData) => {
                                      const copy = { ...prev }
                                      const bucket = copy[dateISO]
                                      if (!bucket) return copy

                                      if (bucket.timedTasks) {
                                        bucket.timedTasks = bucket.timedTasks.map(
                                          (t: any) =>
                                            String(t.id) === String(id)
                                              ? { ...t, completed }
                                              : t,
                                        )
                                      }

                                      return copy
                                    })
                                  }
                                }}
                              />
                            )
                          }

                          return (
                            <DraggableTaskBox
                              key={`${d}-${timeKey}-single-${list[0].id}`}
                              id={String(list[0].id)}
                              title={list[0].title}
                              startHour={start}
                              done={list[0].completed ?? false}
                              dateISO={d}
                              dayColWidth={dayColWidth}
                              dayIndex={colIdx}
                              weekCount={weekDates.length}
                              openDetail={openTaskPopupFromApi}
                              onLocalChange={({ id, dateISO, completed }) => {
                                if (typeof completed === 'boolean') {
                                  setWeekData((prev: WeekData) => {
                                    const copy = { ...prev }
                                    const bucket = copy[dateISO]
                                    if (!bucket) return copy
                                    bucket.timedTasks = bucket.timedTasks.map(
                                      (t: any) => {
                                        if (String(t.id) !== String(id)) {
                                          return t
                                        }
                                        return {
                                          ...t,
                                          completed,
                                        }
                                      },
                                    )
                                  }

                                  return copy
                                })
                              }
                            }}
                          />
                        ) : (
                          <DraggableTaskBox
                            key={`${d}-${timeKey}-single-${list[0].id}`}
                            id={String(list[0].id)}
                            title={list[0].title}
                            startHour={start}
                            done={list[0].completed ?? false}
                            dateISO={d}
                            dayColWidth={dayColWidth}
                            onLocalChange={({ id, dateISO, completed }) => {
                              if (typeof completed === 'boolean') {
                                setWeekData((prev: WeekData) => {
                                  const copy = { ...prev }
                                  const bucket = copy[dateISO]
                                  if (!bucket) return copy
                                  bucket.timedTasks = bucket.timedTasks.map((t: any) => {
                                    if (String(t.id) !== String(id)) {
                                      return t
                                    }
                                    return {
                                      ...t,
                                      completed,
                                    }
                                  })
                                  return copy
                                })
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
        <TaskDetailPopup
          visible={taskPopupVisible}
          mode={taskPopupMode}
          taskId={taskPopupId ?? undefined}
          initialTask={taskPopupTask}
          onClose={() => {
            setTaskPopupVisible(false)
            setTaskPopupId(null)
            setTaskPopupTask(null)
          }}
          onSave={async (form) => {
            const pad = (n: number) => String(n).padStart(2, '0')

            let placementDate: string | null = null
            let placementTime: string | null = null
            const fieldsToClear: string[] = []

            // 날짜 변환
            if (form.hasDate && form.date) {
              const d = form.date
              placementDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            } else {
              fieldsToClear.push('placementDate')
            }

            // 시간 변환
            if (form.hasTime && form.time) {
              const t = form.time
              placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(
                t.getSeconds(),
              )}`
            } else {
              fieldsToClear.push('placementTime')
            }

            try {
              if (taskPopupMode === 'edit') {
                // 기존 테스크 수정
                if (!taskPopupId) return

                await http.patch(`/task/${taskPopupId}`, {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  fieldsToClear,
                })

                bus.emit('calendar:mutated', {
                  op: 'update',
                  item: { id: taskPopupId },
                })
              } else {
                // 새 테스크 생성
                const res = await http.post('/task', {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  date: placementDate ?? anchorDate,
                })

                const newId = res.data?.data?.id

                bus.emit('calendar:mutated', {
                  op: 'create',
                  item: { id: newId },
                })
              }

              // 주간뷰 갱신
              await fetchWeek(weekDates)

              // 팝업 닫기
              setTaskPopupVisible(false)
              setTaskPopupId(null)
              setTaskPopupTask(null)
            } catch (err) {
              console.error('❌ 테스크 저장 실패:', err)
              Alert.alert('오류', '테스크를 저장하지 못했습니다.')
            }
          }}
          onDelete={taskPopupMode === 'edit' ? handleDeleteTask : undefined}
        />

        <EventDetailPopup
          visible={eventPopupVisible}
          eventId={eventPopupData?.id ?? null}
          mode={eventPopupMode}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            fetchWeek(weekDates) // 일정 새로 반영
          }}
        />
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
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
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
    left: 1,
    right: 1,
    height: ROW_H,
    borderRadius: 10,
  },
  taskInnerBox: {
    flex: 1,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskGroupBox: {
    position: 'absolute',
    left: 1,
    right: 1,
    minHeight: ROW_H,
    borderRadius: 10,

    zIndex: 21,
    overflow: 'visible',
  },
  taskGroupInner: {
    flex: 1,
    minHeight: ROW_H,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
