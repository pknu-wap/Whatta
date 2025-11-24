import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
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
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
} //이게 지금 필요한가 굳이

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
  withDelay,
} from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'

import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import colors from '@/styles/colors'
import axios from 'axios'
import { token } from '@/lib/token'
import { refreshTokens } from '@/api/auth'
import { bus } from '@/lib/eventBus'
import { ts } from '@/styles/typography'
import * as Haptics from 'expo-haptics'

import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import { useLabelFilter } from '@/providers/LabelFilterProvider'

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
  dayIndex,
  weekCount,
}: {
  tasks: any[]
  startHour: number
  dayColWidth: number
  dateISO: string
  dayIndex: number
  weekCount: number
  onLocalChange?: (payload: {
    id: string
    dateISO: string
    completed?: boolean
    placementTime?: string | null
  }) => void
}) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [contentWidth, setContentWidth] = useState<number | null>(null)

  const topBase = startHour * 60 * PIXELS_PER_MIN
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = ROW_H
  const [expanded, setExpanded] = useState(false)
  const isActiveDrag = useSharedValue(false)
  const [extraLeft, setExtraLeft] = useState(0)
  const [lastShift, setLastShift] = useState(0)

  useEffect(() => {
    setLocalTasks(tasks)
    // 내용이 바뀌면 다시 펼쳤을 때 폭을 재계산할 수 있도록 초기화// setContentWidth(null);
  }, [tasks])

  const triggerHaptic = () => {
    Vibration.vibrate(50)
  }

  // ✅ 단일 Task 박스와 동일한 기본 위치 (left: 1, width: dayColWidth - 2)
  const baseLeftInCol = 1
  const collapsedWidth = dayColWidth - 2

  // ✅ 펼쳤을 때: title 길이 기반 기본 최소/최대 폭
  const expandedMin = Math.max(collapsedWidth, 150)
  const expandedMax = 320
  const longestTitle = localTasks.reduce((m, t) => Math.max(m, t.title?.length ?? 0), 0)
  const textWidth = longestTitle * 8 + 40
  const estimatedExpandedWidth = Math.min(Math.max(textWidth, expandedMin), expandedMax)

  // 실제 내용(width) + 14px 여백을 기준으로 폭 결정
  const rawExpandedWidth =
    contentWidth != null ? contentWidth + 14 : estimatedExpandedWidth
  const clampedExpandedWidth = Math.min(
    Math.max(rawExpandedWidth, expandedMin),
    expandedMax,
  )
  const finalWidth = expanded ? clampedExpandedWidth : collapsedWidth

  // 이 그룹 박스의 "기본 글로벌 left" (시간열 기준)
  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + baseLeftInCol

  const handleDropGroup = useCallback(
    async (movedY: number, dayOffset: number) => {
      try {
        const SNAP_MIN = 5
        const SNAP = SNAP_MIN * PIXELS_PER_MIN
        let snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const actualTopPx = topBase + snappedY
        let newStart = actualTopPx / PIXELS_PER_MIN
        const DAY_MIN = 24 * 60

        if (newStart < 0) newStart = 0
        if (newStart > DAY_MIN - SNAP_MIN) newStart = DAY_MIN - SNAP_MIN

        // 분 단위도 5분 단위로 확실하게 스냅
        let snappedMin = Math.round(newStart / SNAP_MIN) * SNAP_MIN
        if (snappedMin < 0) snappedMin = 0
        if (snappedMin > DAY_MIN - SNAP_MIN) snappedMin = DAY_MIN - SNAP_MIN

        const h = Math.floor(snappedMin / 60)
        const m = snappedMin % 60
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
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      let nextY = translateY.value + e.changeY

      const minY = -topBase
      const maxY = DAY_PX - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      let nextX = translateX.value + e.changeX
      const currentBaseLeft = baseGlobalLeft + extraLeft
      const allowedMinX = TIME_COL_W - currentBaseLeft

      const boxWidth = finalWidth
      const fullRight = TIME_COL_W + weekCount * dayColWidth
      const allowedMaxX = fullRight - boxWidth - currentBaseLeft

      if (nextX > allowedMaxX) nextX = allowedMaxX
      if (nextX < allowedMinX) nextX = allowedMinX

      translateX.value = nextX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP_MIN = 5
      const SNAP = SNAP_MIN * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

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
    top: topBase + translateY.value,
    transform: [{ translateX: translateX.value }],
  }))

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => {
      const next = !v
      if (!next) {
        setExtraLeft(0)
        setLastShift(0)
      }
      return next
    })
  }

  const onToggleGroupTask = async (task: any) => {
    const taskId = String(task.id)
    const newCompleted = !task.completed

    const taskDateISO = dateISO

    try {
      const full = await http.get(`/task/${taskId}`)
      const fullTask = full.data.data

      const payload = buildTaskUpdatePayload(fullTask, {
        completed: newCompleted,
        placementDate: fullTask.placementDate ?? taskDateISO,
      })

      await http.patch(`/task/${taskId}`, payload)

      // 서버 반영 후에만 로컬 업데이트 (깜빡임 제거)
      setLocalTasks((prev) =>
        prev.map((t) =>
          String(t.id) === taskId ? { ...t, completed: newCompleted } : t,
        ),
      )

      onLocalChange?.({ id: taskId, dateISO: taskDateISO, completed: newCompleted })
    } catch (err: any) {
      console.error(
        '❌ TaskGroup PATCH 실패:',
        err && (err as any).response && (err as any).response.data
          ? (err as any).response.data
          : ((err as any).message ?? String(err)),
      )
    }
  }

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
    // ✅ TaskGroupBox는 항상 해당 열(dateISO)에 속한 timedTasks만 가지므로
    //    날짜는 placementDate로 다시 계산하지 않고, props로 받은 dateISO를 그대로 사용합니다.
    const taskDateISO = dateISO

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
      console.error('❌ TaskGroup 체크 업데이트 실패:', err?.message ?? String(err))
    }
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width

          if (expanded && contentWidth == null) {
            // 처음 펼쳐진 상태에서 내용 폭 측정
            setContentWidth(w)
          }

          // 펼쳐지지 않은 상태에서는 위치 보정값 초기화
          if (!expanded) {
            if (extraLeft !== 0 || lastShift !== 0) {
              setExtraLeft(0)
              setLastShift(0)
            }
            return
          }

          const GRID_LEFT = TIME_COL_W
          const GRID_RIGHT = TIME_COL_W + weekCount * dayColWidth

          const currentLeftGlobal = TIME_COL_W + dayIndex * dayColWidth + baseLeftInCol
          const currentRightGlobal = currentLeftGlobal + w

          let shift = 0

          // 오른쪽 경계를 넘으면 → 왼쪽으로 당겨서 맞추기
          if (currentRightGlobal > GRID_RIGHT) {
            let shiftGlobal = GRID_RIGHT - currentRightGlobal // (음수, 왼쪽으로 이동)

            // 너무 왼쪽(TIME_COL_W) 밖으로 나가지 않게 최소 shift 제한
            const minShift = GRID_LEFT - currentLeftGlobal
            if (shiftGlobal < minShift) {
              shiftGlobal = minShift
            }
            shift = shiftGlobal
          }

          if (shift !== lastShift) {
            setExtraLeft(shift)
            setLastShift(shift)
          }
        }}
        style={[
          S.taskGroupBox,
          expanded
            ? contentWidth == null
              ? null
              : { width: finalWidth }
            : { width: collapsedWidth },
          style,
          // 🔽 left 보정은 React state 기반
          { left: baseLeftInCol + extraLeft },
        ]}
      >
        <View style={S.taskGroupInner}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              toggleExpand()
            }}
            style={[
              S.groupHeaderRow,
              expanded ? { paddingLeft: 14 } : { paddingLeft: 5 },
            ]}
          >
            <View
              style={[
                S.groupHeaderArrow,
                !expanded && {
                  transform: [{ rotate: '180deg' }],
                  marginTop: 0, // 펼쳤을 때만 10px 아래로
                },
              ]}
            />

            <Text
              style={[
                S.groupHeaderText,
                expanded && { paddingTop: 10 }, // 펼쳤을 때만 10px 아래로
              ]}
            >
              할 일
            </Text>
          </Pressable>

          {expanded && (
            <View style={S.groupList}>
              {localTasks.map((t: any) => (
                <View key={String(t.id)} style={S.groupTaskRow}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.()
                      onToggleGroupTask(t)
                    }}
                  >
                    <View
                      style={[S.groupTaskCheckbox, t.completed && S.groupTaskCheckboxOn]}
                    >
                      {t.completed && <Text style={S.groupTaskCheckmark}>✓</Text>}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.()
                      onToggleGroupTask(t)
                    }}
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={[
                        S.groupTaskTitle,
                        t.completed && {
                          color: '#999999',
                          textDecorationLine: 'line-through',
                        },
                      ]}
                      numberOfLines={0}
                    >
                      {t.title}
                    </Text>
                  </Pressable>
                </View>
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
  dayIndex,
  weekCount,
  onLocalChange,
  openDetail,
}: DraggableTaskBoxProps) {
  const startMin = startHour * 60
  const topBase = startMin * PIXELS_PER_MIN
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = ROW_H - 6
  const [done, setDone] = useState(initialDone)
  const isActiveDrag = useSharedValue(false)

  // ⏱️ Task 시간(=startHour)이 서버/상태 변경으로 달라지면
  // 남아 있던 translate 오프셋 때문에 topBase + translateY가 두 번 더해져서 튀는 현상이 생길 수 있다.
  // → startHour가 바뀔 때마다 드래그 오프셋을 0으로 초기화한다.
  const prevStartHourRef = useRef(startHour)

  useEffect(() => {
    if (prevStartHourRef.current !== startHour) {
      translateY.value = 0
      translateX.value = 0
    }
    prevStartHourRef.current = startHour
  }, [startHour])

  // 이 Task 박스의 기본 글로벌 left (시간열 기준)
  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + 1

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
      const SNAP_MIN = 5
      const SNAP = SNAP_MIN * PIXELS_PER_MIN
      const snappedY = Math.round(movedY / SNAP) * SNAP
      translateY.value = withSpring(snappedY)

      const actualTopPx = topBase + snappedY
      let newStart = actualTopPx / PIXELS_PER_MIN
      const DAY_MIN = 24 * 60

      if (newStart < 0) newStart = 0
      if (newStart > DAY_MIN - SNAP_MIN) newStart = DAY_MIN - SNAP_MIN

      let snappedMin = Math.round(newStart / SNAP_MIN) * SNAP_MIN
      if (snappedMin < 0) snappedMin = 0
      if (snappedMin > DAY_MIN - SNAP_MIN) snappedMin = DAY_MIN - SNAP_MIN

      const h = Math.floor(snappedMin / 60)
      const m = snappedMin % 60
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
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      let nextY = translateY.value + e.changeY

      const minY = -topBase
      const maxY = DAY_PX - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      let nextX = translateX.value + e.changeX
      const allowedMinX = TIME_COL_W - baseGlobalLeft
      if (dayIndex === weekCount - 1) {
        const boxWidth = dayColWidth - 2
        const fullRight = TIME_COL_W + weekCount * dayColWidth
        const allowedMaxX = fullRight - boxWidth - baseGlobalLeft
        if (nextX > allowedMaxX) nextX = allowedMaxX
      }
      if (nextX < allowedMinX) nextX = allowedMinX
      translateX.value = nextX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP_MIN = 5
      const SNAP = SNAP_MIN * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

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
    top: topBase + translateY.value,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[S.taskBox, style]}>
        <View style={S.taskInnerBox}>
          <Pressable
            onPress={toggleDone}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <View style={[S.taskCheckbox, done && S.taskCheckboxOn]}>
              {done && <Text style={S.taskCheckmark}>✓</Text>}
            </View>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                if (!isActiveDrag.value) {
                  runOnJS(openDetail)(id) // 👈 여기서 상세 팝업 열림
                }
              }}
            >
              <Text
                style={[S.taskTitle, done && S.taskTitleDone]}
                numberOfLines={3}
                ellipsizeMode="clip"
              >
                {title}
              </Text>
            </Pressable>
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
}: DraggableFlexalbeEventProps) {
  const durationMin = endMin - startMin
  const height = (durationMin / 60) * ROW_H
  const topBase = (startMin / 60) * ROW_H
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const isDragging = useSharedValue(0)
  const isActiveDrag = useSharedValue(false)
  const dragStartTop = useSharedValue(topBase)
  const dropBoost = useSharedValue(0)

  // ⏱️ 드롭 이후 서버에서 startMin/endMin이 변경되면
  // topBase는 새 값 기준으로 바뀌지만 이전 드래그 오프셋(translateY/translateX)이 그대로 남아 있어서
  // 화면 위치가 '새 topBase + 예전 오프셋'으로 계산되며 튀는 문제가 생길 수 있다.
  // → time props가 바뀔 때마다 오프셋과 dragStartTop을 리셋해서 기준을 다시 맞춰 준다.
  const prevStartRef = useRef(startMin)
  const prevEndRef = useRef(endMin)

  useEffect(() => {
    if (prevStartRef.current !== startMin || prevEndRef.current !== endMin) {
      translateY.value = 0
      translateX.value = 0
      dragStartTop.value = (startMin / 60) * ROW_H
    }
    prevStartRef.current = startMin
    prevEndRef.current = endMin
  }, [startMin, endMin])

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

        const topBasePx = (startMin / 60) * ROW_H
        const actualTopPx = topBasePx + snappedY
        let newStart = Math.round(actualTopPx / PIXELS_PER_MIN)

        const DAY_MIN = 24 * 60
        if (newStart < 0) newStart = 0
        if (newStart + duration > DAY_MIN) {
          newStart = DAY_MIN - duration
        }

        let newEnd = newStart + duration
        if (newEnd > DAY_MIN) newEnd = DAY_MIN

        const fmtTime = (min: number, isEnd: boolean) => {
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

        const full = await http.get(`/event/${id}`)
        const eventData = full.data.data

        await http.patch(`/event/${id}`, {
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
      isDragging.value = 1
      dragStartTop.value = topBase + translateY.value
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
    })

  const safeColor = color.startsWith('#') ? color : `#${color}`
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

      // 절대 Y 위치 기준으로 계산
      let absoluteY = dragStartTop.value + e.translationY

      const minAbsY = 0
      const maxAbsY = DAY_PX - height

      if (absoluteY < minAbsY) absoluteY = minAbsY
      if (absoluteY > maxAbsY) absoluteY = maxAbsY

      // translateY는 항상 topBase를 기준으로 한 상대값
      translateY.value = absoluteY - topBase

      // X축 이동은 기존 로직과 동일하게, translation 기반으로 처리
      let nextX = e.translationX
      const allowedMinX = TIME_COL_W - baseGlobalLeft
      const fullRight = TIME_COL_W + weekDates.length * dayColWidth
      const allowedMaxX = fullRight - width - baseGlobalLeft
      if (nextX > allowedMaxX) nextX = allowedMaxX
      if (nextX < allowedMinX) nextX = allowedMinX
      translateX.value = nextX
    })
    .onEnd(() => {
      if (!isActiveDrag.value) return

      const SNAP = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      const minY = -topBase
      const maxY = DAY_PX - topBase - height
      if (snappedY < minY) snappedY = minY
      if (snappedY > maxY) snappedY = maxY

      translateY.value = withSpring(snappedY)

      const dayOffset = Math.round(translateX.value / dayColWidth)
      translateX.value = withTiming(dayColWidth * dayOffset, { duration: 80 })

      // 드롭 시에는 잠깐 동안 최상단 zIndex를 유지해서
      // 겹침 레이아웃 재계산 과정에서도 방금 놓은 일정이 뒤로 갔다가 다시 앞으로
      // 튀어오르는 현상이 없도록 dropBoost로 강조한다.
      dropBoost.value = 1
      isActiveDrag.value = false
      isDragging.value = withDelay(200, withTiming(0))
      dropBoost.value = withDelay(220, withTiming(0))

      runOnJS(handleDrop)(snappedY, dayOffset)
    })

  const composedGesture = Gesture.Simultaneous(longPress, drag)

  const style = useAnimatedStyle(() => ({
    top: topBase + translateY.value,
    transform: [{ translateX: translateX.value }],
    zIndex: isDragging.value || dropBoost.value ? 9999 : overlapDepth,
    elevation: isDragging.value || dropBoost.value ? 50 : 0,
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          S.eventBox,
          {
            left,
            width: width,
            height,
            backgroundColor: safeColor,
            ...overlapStyle,
          },
          style,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            if (!isActiveDrag.value) {
              runOnJS(openEventDetail)(id)
            }
          }}
        >
          <Text style={S.eventTitle} numberOfLines={2}>
            {title}
          </Text>
          {!!place && <Text style={S.eventPlace}>{place}</Text>}
        </Pressable>
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

  // inserted handleSwipe
  const handleSwipe = useCallback(
    (direction: string) => {
      const step = isZoomed ? 5 : 7
      const offset = direction === 'next' ? step : -step
      setAnchorDate((prev) => addDays(prev, offset))
    },
    [isZoomed],
  )
  const [weekDates, setWeekDates] = useState<string[]>([])

  // 🧹 주(weekDates)가 완전히 바뀔 때는 겹침 레이아웃 메모리를 초기화해서
  // 이전 주의 overlap 정보가 새 주에 섞여 들어와 위치가 튀는 것을 방지한다.
  useEffect(() => {
    prevLayoutMap = {}
  }, [weekDates])

  const [weekData, setWeekData] = useState<WeekData>({})
  const [loading, setLoading] = useState(true)

  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  const [spanWrapH, setSpanWrapH] = useState(150)
  const [spanContentH, setSpanContentH] = useState(150)
  const [spanThumbTop, setSpanThumbTop] = useState(0)
  const spanScrollRef = useRef<ScrollView>(null)

  const gridScrollRef = useRef<ScrollView>(null)
  const scrollOffsetRef = useRef(0)

  const SINGLE_HEIGHT = 22

  // Task Popup
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)

  const { items: filterLabels } = useLabelFilter()

  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일')
    return found ? Number(found.id) : null
  }, [filterLabels])

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
        labels: todoLabelId ? [todoLabelId] : [],
        placementDate: anchorDate,
        placementTime: null,
        dueDateTime: null,
      })
      setTaskPopupVisible(true)
    }

    bus.on('task:create', h)
    return () => bus.off('task:create', h)
  }, [anchorDate, todoLabelId])

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

  const toISO = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate(),
    ).padStart(2, '0')}`

  const toDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  useEffect(() => {
    if (isZoomed) {
      // 5일뷰: anchorDate 기준 -2 ~ +2
      const centerDate = anchorDate
      const base = toDate(centerDate)

      const arr = [
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 2)),
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1)),
        centerDate,
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)),
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 2)),
      ]

      setWeekDates(arr)

      bus.emit('calendar:state', {
        date: arr[0],
        mode: 'week',
        days: 5,
        rangeStart: arr[0],
        rangeEnd: arr[arr.length - 1],
      })
    } else {
      // 7일뷰: anchorDate가 포함된 주 전체
      const s = startOfWeek(anchorDate)
      const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))

      setWeekDates(arr)

      bus.emit('calendar:state', {
        date: arr[0],
        mode: 'week',
        days: 7,
        rangeStart: arr[0],
        rangeEnd: arr[arr.length - 1],
      })
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
      // weekDates가 아직 준비 안 되었으면 아무것도 하지 않음
      if (!weekDates.length) {
        return () => {}
      }

      const emit = () =>
        bus.emit('calendar:state', {
          date: weekDates[0],
          mode: 'week',
          days: weekDates.length, // 5 또는 7
          rangeStart: weekDates[0],
          rangeEnd: weekDates[weekDates.length - 1],
        })

      const onReq = () => emit()
      const onSet = (iso: string) => {
        // iso는 "이동하려는 주의 첫날"이 아니라
        // 단순히 Header가 보내는 기준값일 뿐이므로
        // 우리가 원하는 이동폭으로 재계산해야 한다.

        if (isZoomed) {
          // ⭐ 5일뷰 → +5 / -5 이동
          const diff = 5
          // iso는 이동 방향을 알 수 없으므로
          // iso가 현재 anchorDate보다 크면 +5, 아니면 -5
          if (iso > anchorDate) {
            setAnchorDate(addDays(anchorDate, +diff))
          } else {
            setAnchorDate(addDays(anchorDate, -diff))
          }
        } else {
          // ⭐ 7일뷰 → +7 / -7 이동
          const diff = 7
          if (iso > anchorDate) {
            setAnchorDate(addDays(anchorDate, +diff))
          } else {
            setAnchorDate(addDays(anchorDate, -diff))
          }
        }
      }

      emit()
      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)

      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
      }
    }, [weekDates.length, weekDates[0]]),
  )

  useFocusEffect(
    useCallback(() => {
      setHasScrolledOnce(false) // ← 요거 하나로 DayView와 동일한 동작 완성
    }, []),
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

  const today = todayISO()
  const spanBars = buildWeekSpanEvents(weekDates, weekData)
  const maxSpanRow = spanBars.reduce((m, s) => (s.row > m ? s.row : m), -1)
  const spanAreaHeight = maxSpanRow < 0 ? 0 : (maxSpanRow + 1) * (SINGLE_HEIGHT + 4)

  const dayColWidth = getDayColWidth(weekDates.length)
  const showSpanScrollbar = spanContentH > spanWrapH - 10

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

  const scale = useSharedValue(1)
  const swipeTranslateX = useSharedValue(0)

  const SWIPE_THRESHOLD = SCREEN_W * 0.25

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet'
      let next = e.translationX
      const maxOffset = SCREEN_W * 0.15
      if (next > maxOffset) next = maxOffset
      if (next < -maxOffset) next = -maxOffset
      swipeTranslateX.value = next
    })
    .onEnd(() => {
      'worklet'
      const current = swipeTranslateX.value
      const trigger = SCREEN_W * 0.06

      if (current > trigger) {
        swipeTranslateX.value = withTiming(SCREEN_W * 0.15, { duration: 120 }, () => {
          runOnJS(handleSwipe)('prev')
          swipeTranslateX.value = withTiming(0, { duration: 160 })
        })
      } else if (current < -trigger) {
        swipeTranslateX.value = withTiming(-SCREEN_W * 0.15, { duration: 120 }, () => {
          runOnJS(handleSwipe)('next')
          swipeTranslateX.value = withTiming(0, { duration: 160 })
        })
      } else {
        swipeTranslateX.value = withTiming(0, { duration: 150 })
      }
    })
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

  const composedGesture = Gesture.Simultaneous(pinchGesture, swipeGesture)

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }))
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

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
            {/* 헤더 - 기존 WeekView 스타일 유지 */}
            <FullBleed padH={16}>
              <View style={S.weekHeaderRow}>
                <View style={S.weekHeaderTimeCol} />
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

            {/* spanbar 영역 */}
            <FullBleed padH={16}>
              <View style={S.spanTaskBoxWrap}>
                <View
                  style={[S.spanTaskBox, { height: 150 }]}
                  onLayout={(e) => setSpanWrapH(e.nativeEvent.layout.height)}
                >
                  {/* spanbar 요일선 (task/일정 뒤에) */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: TIME_COL_W,
                      width: weekDates.length * dayColWidth,
                      height: 185,
                      flexDirection: 'row',
                    }}
                  >
                    {weekDates.map((d, colIdx) => (
                      <View
                        key={`spanbar-colline-${d}`}
                        style={{
                          width: dayColWidth,
                          borderLeftWidth: colIdx === 0 ? 0 : 0.3,
                          borderLeftColor: '#E6E6E6',
                        }}
                      />
                    ))}
                  </View>
                  <ScrollView
                    ref={spanScrollRef}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const { contentOffset, contentSize, layoutMeasurement } =
                        e.nativeEvent

                      const ratio =
                        contentSize.height <= layoutMeasurement.height
                          ? 0
                          : contentOffset.y /
                            (contentSize.height - layoutMeasurement.height)

                      // 기본 top 계산
                      const rawTop =
                        ratio *
                        (layoutMeasurement.height -
                          thumbH(layoutMeasurement.height, contentSize.height))

                      // thumb 높이 (진한색 부분)
                      const thumbHeight = thumbH(
                        layoutMeasurement.height,
                        contentSize.height,
                      )

                      // track의 실제 높이 (지금 너는 top:0, bottom:6 → trackHeight = layoutMeasurement.height - 6)
                      const trackHeight = layoutMeasurement.height - 6

                      // clamp: thumb이 트랙 밖으로 절대 못 나가게 제한
                      const maxTop = trackHeight - thumbHeight
                      const clampedTop = Math.max(0, Math.min(rawTop, maxTop))

                      setSpanThumbTop(clampedTop)
                    }}
                    onContentSizeChange={(_, h) => setSpanContentH(h)}
                    contentContainerStyle={{
                      height: spanAreaHeight,
                      position: 'relative',
                      paddingVertical: 4,
                      paddingBottom: 4,
                    }}
                  >
                    {spanBars.map((s, i) => {
                      const left = TIME_COL_W + s.startIdx * dayColWidth

                      const width = (s.endIdx - s.startIdx + 1) * dayColWidth

                      const isSingleDay = s.startISO === s.endISO
                      const isTask = s.color === '#000000'

                      if (isTask) {
                        return (
                          <Pressable
                            key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
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
                              left: Math.min(
                                Math.max(left + 2, TIME_COL_W + 2),
                                TIME_COL_W + weekDates.length * dayColWidth - (width - 4),
                              ),
                              width: width - 4,
                              height: SINGLE_HEIGHT,
                              backgroundColor: '#FFFFFF80',
                              borderWidth: 0.4,
                              borderColor: '#333333',
                              borderRadius: 3,
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <View style={[S.taskCheckbox, s.done && S.taskCheckboxOn]}>
                              {s.done && <Text style={S.taskCheckmark}>✓</Text>}
                            </View>

                            <Text
                              style={[S.taskTitle, s.done && S.taskTitleDone]}
                              numberOfLines={1}
                              ellipsizeMode="clip"
                            >
                              {s.title}
                            </Text>
                          </Pressable>
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

                      const mainColor = s.color?.startsWith('#')
                        ? s.color
                        : `#${s.color || 'B04FFF'}`
                      const lightColor = mixWhite(mainColor, 70)

                      const baseStyle: any = {
                        position: 'absolute',
                        top: s.row * (SINGLE_HEIGHT + 4),
                        left: Math.min(
                          Math.max(left + 2, TIME_COL_W + 2),
                          TIME_COL_W + weekDates.length * dayColWidth - (width - 4),
                        ),
                        width: width - 4,
                        height: SINGLE_HEIGHT,
                        justifyContent: 'center',
                        alignItems: isSingleDay ? 'flex-start' : 'center',
                        paddingHorizontal: 6,
                        backgroundColor: isSingleDay ? mainColor : lightColor,
                        borderRadius: isSingleDay ? 3 : 0,
                      }

                      return (
                        <Pressable
                          key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
                          onPress={() => openEventDetail(String(s.id))}
                        >
                          <View style={baseStyle}>
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
                                    borderTopLeftRadius: isSingleDay ? 3 : 0,
                                    borderBottomLeftRadius: isSingleDay ? 3 : 0,
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
                                    borderTopRightRadius: isSingleDay ? 3 : 0,
                                    borderBottomRightRadius: isSingleDay ? 3 : 0,
                                  }}
                                />
                              )}

                            <Text
                              style={{
                                color: isSingleDay ? '#FFFFFF' : '#000000',
                                fontWeight: '700',
                                fontSize: 12,
                                maxWidth: '90%',
                                includeFontPadding: false,
                              }}
                              numberOfLines={1}
                              ellipsizeMode="clip"
                            >
                              {s.title}
                            </Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                  {showSpanScrollbar && (
                    <View
                      pointerEvents="none"
                      style={[
                        S.spanScrollTrack,
                        {
                          right: -10,
                        },
                      ]}
                    >
                      <View
                        style={[
                          S.spanScrollThumb,
                          {
                            height: thumbH(spanWrapH, spanContentH),
                            transform: [{ translateY: spanThumbTop }],
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

            {/* 타임라인 영역 */}
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
              <View style={S.timelineInner}>
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

                <View style={{ flexDirection: 'row' }}>
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

                  {weekDates.map((d, colIdx) => {
                    const bucket = weekData[d] || {
                      timelineEvents: [],
                      timedTasks: [],
                    }
                    const isTodayCol = d === today
                    const layoutEvents = layoutDayEvents(bucket.timelineEvents || [])
                    // timedTasks 라벨 필터링
                    const timedTasks = (bucket.timedTasks || []).filter((t: any) =>
                      (t.labels ?? []).some((lid: number) =>
                        enabledLabelIds.includes(lid),
                      ),
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
                      <View
                        key={`${d}-col`}
                        style={[
                          S.dayCol,
                          { width: dayColWidth },
                          colIdx === 0 && S.firstDayCol,
                        ]}
                      >
                        {HOURS.map((_, i) => (
                          <View key={`${d}-row-${i}`} style={S.hourRow} />
                        ))}

                        {isTodayCol && nowTop !== null && (
                          <>
                            <View style={[S.liveBar, { top: nowTop }]} />
                            <View style={[S.liveDot, { top: nowTop - 3 }]} />
                          </>
                        )}
                        {layoutEvents.map((ev, i) => (
                          <DraggableFlexalbeEvent
                            key={`ev-${ev.id}-${i}`}
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
                            dayIndex={colIdx}
                            openEventDetail={openEventDetail}
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
              </View>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
        {/* ✅ (merge) TaskDetailPopup 그대로 유지 */}
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

            if (form.hasDate && form.date) {
              const d = form.date
              placementDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            } else {
              fieldsToClear.push('placementDate')
            }

            if (form.hasTime && form.time) {
              const t = form.time
              placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(
                t.getSeconds(),
              )}`
            } else {
              fieldsToClear.push('placementTime')
            }

            const reminderNoti = form.reminderNoti ?? null // ✅ (merge) 알림 연동
            if (!reminderNoti) fieldsToClear.push('reminderNoti')

            try {
              if (taskPopupMode === 'edit') {
                if (!taskPopupId) return

                await http.patch(`/task/${taskPopupId}`, {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  fieldsToClear,
                })

                bus.emit('calendar:mutated', {
                  op: 'update',
                  item: { id: taskPopupId },
                })
              } else {
                const res = await http.post('/task', {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  date: placementDate ?? anchorDate,
                })

                const newId = res.data?.data?.id

                bus.emit('calendar:mutated', {
                  op: 'create',
                  item: { id: newId },
                })
              }

              await fetchWeek(weekDates)

              setTaskPopupVisible(false)
              setTaskPopupId(null)
              setTaskPopupTask(null)
            } catch (err) {
              console.error('❌ 테스크 저장 실패:', err)
              Alert.alert('오류', '테스크를 저장하지 못했습니다.')
            }
          }}
        />

        {/* ✅ (merge) EventDetailPopup 그대로 유지 */}
        <EventDetailPopup
          visible={eventPopupVisible}
          eventId={eventPopupData?.id ?? null}
          mode={eventPopupMode}
          initial={eventPopupData ?? undefined}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            fetchWeek(weekDates)
          }}
        />
      </ScreenWithSidebar>
    </GestureHandlerRootView>
  )
}

function thumbH(visibleH: number, contentH: number) {
  const minH = 18
  const h = (visibleH * visibleH) / Math.max(contentH, 1)
  return Math.max(minH, Math.min(h, visibleH))
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
    justifyContent: 'center',
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

  spanTaskBoxWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  spanTaskBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
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
    height: 13,
  },

  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },

  timeCol: {
    width: TIME_COL_W,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  timeRow: {
    height: ROW_H,
    paddingTop: 2,
    justifyContent: 'flex-start',
  },
  timeText: {
    ...ts('time'),
    color: colors.neutral.gray,
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 0,
    includeFontPadding: false,
  },

  dayCol: {
    borderLeftWidth: 0.3,
    borderLeftColor: colors.neutral.timeline,
    position: 'relative',
  },
  firstDayCol: {
    borderLeftWidth: 0,
  },
  hourRow: {
    height: ROW_H,
  },

  eventBox: {
    position: 'absolute',
    borderRadius: 3,
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
    borderRadius: 3,
  },
  taskInnerBox: {
    flex: 1,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 3,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskGroupBox: {
    position: 'absolute',
    minHeight: ROW_H,
    borderRadius: 3,
    zIndex: 21,
    overflow: 'visible',
  },
  taskGroupInner: {
    minHeight: ROW_H,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 3,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  taskCheckbox: {
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
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    zIndex: 50,
  },
  liveDot: {
    position: 'absolute',
    left: -3,
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
    marginLeft: -8,
  },
  groupHeaderArrow: {
    width: 0,
    height: 0,
    marginTop: 10,
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
    marginTop: 10,
    marginBottom: 5,
    paddingRight: 6,
    paddingLeft: 0,
    flexWrap: 'nowrap',
    overflow: 'visible',
  },
  groupTaskCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
    marginRight: 6,
    marginTop: 2,
  },
  groupTaskCheckboxOn: {
    backgroundColor: '#333333',
    borderColor: '#333333',
  },
  groupTaskCheckmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
    textAlign: 'center',
  },
  groupTaskTitle: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
    flexGrow: 0,
    flexWrap: 'wrap',
    overflow: 'visible',
    includeFontPadding: false,
  },

  spanScrollTrack: {
    position: 'absolute',
    top: 0,
    bottom: 6,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  spanScrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
    backgroundColor: colors.neutral.gray,
  },

  timelineInner: {
    position: 'relative',
  },
  hourLinesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0.3,
    backgroundColor: colors.neutral.timeline,
  },
  mainVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: TIME_COL_W,
    width: 0.3,
    backgroundColor: colors.neutral.timeline,
  },
})
