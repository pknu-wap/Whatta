import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
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
  withDelay,
} from 'react-native-reanimated'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'

import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'
import colors from '@/styles/colors'
import { http } from '@/lib/http'
import { bus } from '@/lib/eventBus'
import { ts } from '@/styles/typography'
import * as Haptics from 'expo-haptics'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import { OCREventDisplay } from '@/screens/More/OcrEventCardSlider'
import WeekHeaderSpan from '@/screens/Calender/Week/WeekHeaderSpan'
import WeekTimeline from '@/screens/Calender/Week/WeekTimeline'
import WeekPopups from '@/screens/Calender/Week/WeekPopups'
import { useCalendarSync } from '@/screens/Calender/Week/useCalendarSync'
import { useWeekGestures } from '@/screens/Calender/Week/useWeekGestures'
import { useOCR } from '@/hooks/useOCR'
import {
  useWeekCalendarData,
  type DayBucket,
} from '@/screens/Calender/Week/useWeekCalendarData'
import {
  cloneTaskToDateTimeAndDeleteOriginal,
  moveTaskToDateTime,
  updateTaskCompleted,
} from '@/screens/Calender/Week/services/weekTaskService'
import {
  getEventDetail,
  isRepeatEvent,
  moveEventToDateTime,
} from '@/screens/Calender/Week/services/weekEventService'

import {
  addDays,
  getDateOfWeek,
  parseDate,
  startOfWeek,
  toISO,
  todayISO,
} from '@/screens/Calender/Week/date'

import {
  buildWeekSpanEvents,
  getDayColWidth,
  resetLayoutDayEventsCache,
} from '@/screens/Calender/Week/layout'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

/* -------------------------------------------------------------------------- */
/* 유틸 & 상수 */
/* -------------------------------------------------------------------------- */

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const BASE_ROW_H = 48
const DRAG_LONG_PRESS_MS = 380

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const TIME_COL_W = 50

const SIDE_PADDING = 16 * 2 // ← 좌우 여백 합 = 32
// 겹침(반분할) 카드 폭 튜닝: + 넓어지고, - 좁아진다
const OVERLAP_WIDTH_TUNE = 1.4
const OVERLAP_TEXT_VISIBLE_MAX = 4
const BOTTOM_ITEM_SIDE_INSET = 2 - OVERLAP_WIDTH_TUNE
const TASK_GROUP_WIDTH_OFFSET = 4 - OVERLAP_WIDTH_TUNE * 2
const EVENT_OVERLAP_GAP = 1.5 - OVERLAP_WIDTH_TUNE
const EVENT_LEFT_ADJUST = EVENT_OVERLAP_GAP
const EVENT_WIDTH_ADJUST = EVENT_OVERLAP_GAP * 2

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

/* -------------------------------------------------------------------------- */
/* TaskGroupBox */
/* -------------------------------------------------------------------------- */

function TaskGroupBox({
  tasks,
  startHour,
  rowH,
  onLocalChange,
  dayColWidth,
  dateISO,
  dayIndex,
  weekCount,
  column = 0,
  columnsTotal = 1,
}: {
  tasks: any[]
  startHour: number
  rowH: number
  dayColWidth: number
  dateISO: string
  dayIndex: number
  weekCount: number
  column?: number
  columnsTotal?: number
  onLocalChange?: (payload: {
    id: string
    dateISO: string
    completed?: boolean
    placementTime?: string | null
  }) => void
}) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const pixelsPerMin = rowH / 60
  const dayPx = 24 * 60 * pixelsPerMin
  const topBase = startHour * 60 * pixelsPerMin
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = rowH
  const [expanded, setExpanded] = useState(false)
  const isActiveDrag = useSharedValue(false)
  const [extraLeft, setExtraLeft] = useState(0)
  const [lastShift, setLastShift] = useState(0)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // ✅ 단일 Task 박스와 동일한 기본 위치
  const colCount = Math.max(1, columnsTotal)
  const slotWidth = dayColWidth / colCount
  const baseLeftInCol = slotWidth * column + BOTTOM_ITEM_SIDE_INSET
  const collapsedWidth = slotWidth - TASK_GROUP_WIDTH_OFFSET

  // 펼침/접힘과 무관하게 주간 그리드 셀 폭에 고정한다.
  const finalWidth = Math.max(4, collapsedWidth)

  // 이 그룹 박스의 "기본 글로벌 left" (시간열 기준)
  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + baseLeftInCol

  const handleDropGroup = useCallback(
    async (movedY: number, dayOffset: number) => {
      try {
        const SNAP_MIN = 5
        const SNAP = SNAP_MIN * pixelsPerMin
        let snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const actualTopPx = topBase + snappedY
        let newStart = actualTopPx / pixelsPerMin
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
              await moveTaskToDateTime(http, taskId, newDateISO, newTime)

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
    .minDuration(DRAG_LONG_PRESS_MS)
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
      const maxY = dayPx - topBase - height

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
      const SNAP = SNAP_MIN * pixelsPerMin
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      const minY = -topBase
      const maxY = dayPx - topBase - height
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

  const onToggleGroupTask = async (task: any) => {
    const taskId = String(task.id)
    const newCompleted = !task.completed

    const taskDateISO = dateISO

    try {
      await updateTaskCompleted(http, taskId, newCompleted, taskDateISO)

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

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width

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
          { minHeight: rowH },
          { width: finalWidth },
          style,
          // 🔽 left 보정은 React state 기반
          { left: baseLeftInCol + extraLeft },
        ]}
      >
        <View
          style={[
            S.taskGroupInner,
            {
              minHeight: Math.max(0, rowH - 4),
              marginVertical: 2,
              paddingHorizontal: 0,
            },
          ]}
        >
          <TaskGroupCard
            groupId={`week-group-${dateISO}-${dayIndex}-${startHour}`}
            density="week"
            hideText={columnsTotal > OVERLAP_TEXT_VISIBLE_MAX}
            expanded={expanded}
            title="할 일"
            layoutWidthHint={finalWidth}
            tasks={localTasks.map((t: any) => ({
              id: String(t.id),
              title: t.title ?? '',
              done: !!t.completed,
            }))}
            onToggleExpand={(_groupId, nextExpanded) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setExpanded(nextExpanded)
            }}
            onToggleTask={(taskId) => {
              const target = localTasks.find((t: any) => String(t.id) === String(taskId))
              if (target) onToggleGroupTask(target)
            }}
          />
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
  rowH: number
  column?: number
  columnsTotal?: number
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
  rowH,
  column = 0,
  columnsTotal = 1,
  onLocalChange,
  openDetail,
}: DraggableTaskBoxProps) {
  const pixelsPerMin = rowH / 60
  const dayPx = 24 * 60 * pixelsPerMin
  const startMin = startHour * 60
  const topBase = startMin * pixelsPerMin
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const height = rowH
  const [done, setDone] = useState(initialDone)
  const isActiveDrag = useSharedValue(false)

  // ⏱️ Task 시간(=startHour)이 서버/상태 변경으로 달라지면
  // 남아 있던 translate 오프셋 때문에 topBase + translateY가 두 번 더해져서 튀는 현상이 생길 수 있다.
  // → startHour가 바뀔 때마다 드래그 오프셋을 0으로 초기화한다.
  const prevStartHourRef = useRef(startHour)
  const prevRowHRef = useRef(rowH)

  useEffect(() => {
    if (prevStartHourRef.current !== startHour || prevRowHRef.current !== rowH) {
      translateY.value = 0
      translateX.value = 0
    }
    prevStartHourRef.current = startHour
    prevRowHRef.current = rowH
  }, [startHour, rowH])

  useEffect(() => {
    setDone(initialDone)
  }, [initialDone])

  const colCount = Math.max(1, columnsTotal)
  const slotWidth = dayColWidth / colCount
  const taskLeft = slotWidth * column + BOTTOM_ITEM_SIDE_INSET
  // 슬롯 밖으로 넘치지 않도록 좌우 inset 기준으로 폭을 고정
  const taskWidth = Math.max(4, slotWidth - BOTTOM_ITEM_SIDE_INSET * 2)

  // 이 Task 박스의 기본 글로벌 left (시간열 기준)
  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + taskLeft

  const toggleDone = async () => {
    const next = !done
    setDone(next)
    try {
      await updateTaskCompleted(http, id, next, dateISO)

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
      const SNAP = SNAP_MIN * pixelsPerMin
      const snappedY = Math.round(movedY / SNAP) * SNAP
      translateY.value = withSpring(snappedY)

      const actualTopPx = topBase + snappedY
      let newStart = actualTopPx / pixelsPerMin
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

      await moveTaskToDateTime(http, id, newDateISO, newTime)

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

  const longPress = Gesture.LongPress()
    .minDuration(DRAG_LONG_PRESS_MS)
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
      const maxY = dayPx - topBase - height

      if (nextY < minY) nextY = minY
      if (nextY > maxY) nextY = maxY
      translateY.value = nextY

      let nextX = translateX.value + e.changeX
      const allowedMinX = TIME_COL_W - baseGlobalLeft
      if (dayIndex === weekCount - 1) {
        const boxWidth = taskWidth
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
      const SNAP = SNAP_MIN * pixelsPerMin
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      const minY = -topBase
      const maxY = dayPx - topBase - height
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
      <Animated.View style={[S.taskBox, { left: taskLeft, width: taskWidth, height }, style]}>
        <TaskItemCard
          id={id}
          title={title}
          done={done}
          density="week"
          hideText={columnsTotal > OVERLAP_TEXT_VISIBLE_MAX}
          layoutWidthHint={taskWidth}
          style={{ flex: 1, minHeight: 0, height: '100%', marginVertical: 1 }}
          onPress={() => {
            if (!isActiveDrag.value) openDetail(id)
          }}
          onToggle={() => {
            if (!isActiveDrag.value) toggleDone()
          }}
        />
      </Animated.View>
    </GestureDetector>
  )
}

/* -------------------------------------------------------------------------- */
/* 드래그 가능한 일정 박스 */
/* -------------------------------------------------------------------------- */
const askRepeatAction = (): Promise<'single' | 'future' | 'cancel'> => {
  return new Promise((resolve) => {
    Alert.alert(
      '반복 일정 이동',
      '이 일정을 어떻게 적용할까요?',
      [
        {
          text: '이번 일정만 변경',
          onPress: () => resolve('single'),
        },
        {
          text: '이후 모든 일정 변경',
          onPress: () => resolve('future'),
        },
        {
          text: '취소',
          style: 'cancel',
          onPress: () => resolve('cancel'),
        },
      ],
      { cancelable: true },
    )
  })
}

type DraggableFlexalbeEventProps = {
  id: string
  title: string
  labelText?: string
  startMin: number
  endMin: number
  color: string
  dateISO: string
  column: number
  columnsTotal: number
  dayColWidth: number
  weekDates: string[]
  dayIndex: number
  rowH: number
  openEventDetail: (id: string) => void
  isRepeat?: boolean
}

function DraggableFlexalbeEvent({
  id,
  title,
  labelText,
  startMin,
  endMin,
  color,
  dateISO,
  column,
  columnsTotal,
  dayColWidth,
  weekDates,
  dayIndex,
  rowH,
  openEventDetail,
  isRepeat,
}: DraggableFlexalbeEventProps) {
  const pixelsPerMin = rowH / 60
  const dayPx = 24 * 60 * pixelsPerMin
  const durationMin = Math.max(5, endMin - startMin)
  const height = (durationMin / 60) * rowH
  const topBase = (startMin / 60) * rowH
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
  const prevRowHRef = useRef(rowH)

  useEffect(() => {
    if (
      prevStartRef.current !== startMin ||
      prevEndRef.current !== endMin ||
      prevRowHRef.current !== rowH
    ) {
      translateY.value = 0
      translateX.value = 0
      dragStartTop.value = (startMin / 60) * rowH
    }
    prevStartRef.current = startMin
    prevEndRef.current = endMin
    prevRowHRef.current = rowH
  }, [startMin, endMin, rowH])

  const handleDrop = useCallback(
    async (movedY: number, dayOffset: number) => {
      try {
        const SNAP = 5 * pixelsPerMin
        const snappedY = Math.round(movedY / SNAP) * SNAP
        translateY.value = withSpring(snappedY)

        const duration = durationMin

        const topBasePx = (startMin / 60) * rowH
        const actualTopPx = topBasePx + snappedY
        let newStart = Math.round(actualTopPx / pixelsPerMin)

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

        const eventData = await getEventDetail(http, id)

        let applyMode: 'single' | 'future' = 'single'

        // 이벤트가 반복일 경우에만 선택창 띄우기
        if (isRepeatEvent(eventData)) {
          const choice = await askRepeatAction()
          if (choice === 'cancel') return // 취소 시 아무것도 안 함
          applyMode = choice
        }

        await moveEventToDateTime(http, {
          eventId: id,
          dateISO: newDateISO,
          startTime: nextStartTime,
          endTime: nextEndTime,
          applyMode, // 반복 포함 여부 결정
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
    [id, startMin, endMin, dateISO, durationMin, pixelsPerMin, rowH, translateY],
  )

  const longPress = Gesture.LongPress()
    .minDuration(DRAG_LONG_PRESS_MS)
    .maxDistance(1000)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      isActiveDrag.value = true
      isDragging.value = 1
      dragStartTop.value = topBase + translateY.value
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
    })

  const safeColor = resolveScheduleColor(color)
  const colGap = EVENT_OVERLAP_GAP
  const colCount = Math.max(columnsTotal, 1)
  const slotWidth = dayColWidth / colCount

  let width = slotWidth - colGap * 2
  let left = slotWidth * column + colGap

  // 컴포넌트 카드 적용 시 과도하게 좁아 보이지 않도록 폭 보정 최소화
  left += EVENT_LEFT_ADJUST
  width = Math.max(4, width - EVENT_WIDTH_ADJUST)

  const baseGlobalLeft = TIME_COL_W + dayIndex * dayColWidth + left

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!isActiveDrag.value) return

      // 절대 Y 위치 기준으로 계산
      let absoluteY = dragStartTop.value + e.translationY

      const minAbsY = 0
      const maxAbsY = dayPx - height

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

      const SNAP = 5 * pixelsPerMin
      let snappedY = Math.round(translateY.value / SNAP) * SNAP

      const minY = -topBase
      const maxY = dayPx - topBase - height
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

  const style = useAnimatedStyle(() => {
    // 반복 vs 일반 우선순위: 일반일정이 항상 반복일정보다 위에 오도록 가중치 부여
    const baseZ =
      isDragging.value || dropBoost.value
        ? 9999
        : column * 2 + (isRepeat ? 0 : 1) // 일반일정(1) > 반복일정(0)

    return {
      top: topBase + translateY.value,
      transform: [{ translateX: translateX.value }],
      zIndex: baseZ,
      elevation: isDragging.value || dropBoost.value ? 50 : 0,
    }
  })

  const fmtHm = (m: number) => {
    const hh = Math.floor(Math.max(0, m) / 60)
    const mm = Math.floor(Math.max(0, m) % 60)
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const timeRangeText = `${fmtHm(startMin)}~${fmtHm(endMin)}`
  const subText = isRepeat ? timeRangeText : (labelText ?? '')
  const EventCard = isRepeat ? RepeatScheduleCard : FixedScheduleCard

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          S.eventBox,
          {
            left,
            width,
            height,
            backgroundColor: 'transparent',
          },
          // ⭐ 반복 일정일 때 DayView와 동일한 강조 디자인
          isRepeat && {
            borderRadius: 0,
          },
          style,
        ]}
      >
        <EventCard
          id={id}
          title={title}
          color={safeColor}
          timeRangeText={subText}
          density="week"
          hideText={columnsTotal > OVERLAP_TEXT_VISIBLE_MAX}
          layoutWidthHint={width}
          style={{ minHeight: 0, height: '100%' }}
          onPress={() => {
            if (!isActiveDrag.value) openEventDetail(id)
          }}
        />
      </Animated.View>
    </GestureDetector>
  )
}

const MemoTaskGroupBox = React.memo(TaskGroupBox)
const MemoDraggableTaskBox = React.memo(DraggableTaskBox)
const MemoDraggableFlexibleEvent = React.memo(DraggableFlexalbeEvent)

/* -------------------------------------------------------------------------- */
/* WeekView 메인 */
/* -------------------------------------------------------------------------- */

export default function WeekView() {
  const isFocused = useIsFocused()
  const spanWrapRef = useRef<View>(null)
  const [spanRect, setSpanRect] = useState<GridRect | null>(null)

  const [imagePopupVisible, setImagePopupVisible] = useState(false)

const {
  ocrSplashVisible,
  ocrModalVisible,
  ocrEvents,
  setOcrModalVisible,
  sendToOCR,
} = useOCR()

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Week') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  const [anchorDate, setAnchorDate] = useState(todayISO())
  const [, setColorSetVersion] = useState(0)
  const anchorDateRef = useRef(anchorDate)
  const [isZoomed, setIsZoomed] = useState(false)
  useEffect(() => {
    anchorDateRef.current = anchorDate
  }, [anchorDate])

  const [weekDates, setWeekDates] = useState<string[]>([])

  // 🧹 주(weekDates)가 완전히 바뀔 때는 겹침 레이아웃 메모리를 초기화해서
  // 이전 주의 overlap 정보가 새 주에 섞여 들어와 위치가 튀는 것을 방지한다.
  useEffect(() => {
    resetLayoutDayEventsCache()
  }, [weekDates])

  const { weekData, setWeekData, loading, fetchWeek } = useWeekCalendarData(http)

  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  const [spanWrapH, setSpanWrapH] = useState(150)
  const [spanContentH, setSpanContentH] = useState(150)
  const [spanThumbTop, setSpanThumbTop] = useState(0)
  const spanScrollRef = useRef<ScrollView>(null)

  const gridScrollRef = useRef<ScrollView>(null)
  const gridOffsetRef = useRef({ x: 0, y: 0 })
  const scrollOffsetRef = useRef(0)

  const SINGLE_HEIGHT = 27

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
  const [eventPopupCreateType, setEventPopupCreateType] = useState<'event' | 'task'>('event')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  async function openEventDetail(eventId: string, occDate?: string) {
    setSelectedEventId(eventId)

    try {
      const data = await getEventDetail(http, eventId)
      if (!data) return

      setEventPopupMode('edit')
      setEventPopupCreateType('event')
      setEventPopupData(
        occDate
          ? {
              ...data,
              // 발생일을 startDate로 덮어서 Popup의 initial에 실어 보냄
              startDate: occDate,
            }
          : data,
      )
      setEventPopupVisible(true)
    } catch (e) {
      console.log('일정 상세 불러오기 실패:', e)
    }
  }

  useEffect(() => {
    const h = (payload?: { source?: string; createType?: 'event' | 'task' }) => {
      if (payload?.source !== 'Week') return

      setEventPopupMode('create')
      setEventPopupCreateType(payload?.createType ?? 'event')
      setEventPopupData(null)
      setEventPopupVisible(true)
    }

    bus.on('popup:schedule:create', h)
    return () => bus.off('popup:schedule:create', h)
  }, [])

  useEffect(() => {
    const onColorSetChanged = () => setColorSetVersion((v) => v + 1)
    bus.on('scheduleColorSet:changed', onColorSetChanged)
    return () => bus.off('scheduleColorSet:changed', onColorSetChanged)
  }, [])

  useEffect(() => {
    if (isZoomed) {
      // 5일뷰: anchorDate 기준 -2 ~ +2
      const centerDate = anchorDate
      const base = parseDate(centerDate)

      const arr = [
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 2)),
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1)),
        centerDate,
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)),
        toISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 2)),
      ]

      setWeekDates(arr)

      if (isFocused) {
        bus.emit('calendar:state', {
          date: arr[0],
          mode: 'week',
          days: 5,
          rangeStart: arr[0],
          rangeEnd: arr[arr.length - 1],
        })
      }
    } else {
      // 7일뷰: anchorDate가 포함된 주 전체
      const s = startOfWeek(anchorDate)
      const arr = Array.from({ length: 7 }, (_, i) => addDays(s, i))

      setWeekDates(arr)

      if (isFocused) {
        bus.emit('calendar:state', {
          date: arr[0],
          mode: 'week',
          days: 7,
          rangeStart: arr[0],
          rangeEnd: arr[arr.length - 1],
        })
      }
    }
  }, [anchorDate, isZoomed, isFocused])

  const rowH =
    weekDates.length === 7 ? 61 : weekDates.length === 5 ? 62 : BASE_ROW_H
  const pixelsPerMin = rowH / 60
  const computedDayColWidth = getDayColWidth(
    SCREEN_W,
    weekDates.length,
    TIME_COL_W,
    SIDE_PADDING,
  )
  const dayColWidth =
    weekDates.length === 7
      ? Math.max(43, computedDayColWidth)
      : weekDates.length === 5
        ? Math.max(62, computedDayColWidth)
        : computedDayColWidth

  useEffect(() => {
    const updateNowTop = (scrollToCenter: boolean) => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const topPos = (h * 60 + m) * pixelsPerMin
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
  }, [hasScrolledOnce, pixelsPerMin])

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
      setHasScrolledOnce(false) // ← 요거 하나로 DayView와 동일한 동작 완성
    }, []),
  )

  const today = todayISO()
  useCalendarSync({
    isFocused,
    weekDates,
    anchorDateRef,
    dayColWidth,
    rowH,
    setAnchorDate,
    fetchWeek,
  })
  const showSpanScrollbar = spanContentH > spanWrapH - 10

  const gridWrapRef = useRef<View>(null)
  const gridContainerRef = useRef<View>(null)

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
    // 1. 그리드 측정
    if (gridWrapRef.current) {
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

    // 상단 영역(spanWrap) 측정
    if (spanWrapRef.current) {
      spanWrapRef.current.measure((x, y, w, h, px, py) => {
        setSpanRect({
          left: px,
          top: py,
          right: px + w,
          bottom: py + h,
          width: w,
          height: h,
        })
      })
    }
  }

  useEffect(() => {
    const handler = () => requestAnimationFrame(measureWeekLayouts)
    bus.on('calendar:force-measure', handler)
    return () => bus.off('calendar:force-measure', handler)
  }, [])

  // 사이드바 → WeekView 드롭 처리 (좌표 기반)
  useEffect(() => {
    const onReady = () => {
      // console.log('[xdrag:ready] WeekView ready, gridRect=', gridRect)
    }

    const onMove = ({ x, y }: DragDropPayload) => {
      // console.log('[xdrag:move]', { x, y })
    }

    const onDrop = ({ task, x, y }: DragDropPayload) => {
      if (currentCalendarView.get() !== 'week') return
      if (!task) return

      // 1. 측정: 그리드 컨테이너(고정 위치)를 먼저 잽니다.
      gridContainerRef.current?.measure(
        (_cx, _cy, _cw, _ch, containerPx, containerPy) => {
          // 스크롤 뷰가 시작되는 절대 Y좌표 (불변의 기준선)
          const boundaryY = containerPy

          if (y < boundaryY) {
            // console.log('[DROP] 상단 영역 감지 (Boundary 기준)')

            // 상단바 기준 X좌표 계산 (spanWrapRef 측정)
            spanWrapRef.current?.measure((_sx, _sy, _sw, _sh, spanPx, spanPy) => {
              const relX = x - spanPx
              const insideX = relX - TIME_COL_W

              if (insideX >= 0) {
                const rawIndex = insideX / dayColWidth
                let dayIndex = Math.floor(rawIndex)
                if (dayIndex < 0) dayIndex = 0
                if (dayIndex >= weekDates.length) dayIndex = weekDates.length - 1

                const targetDate = weekDates[dayIndex]

                // 상단이므로 시간 없음(null)
                handleDropProcess(task, targetDate, null)
              }
            })
          } else {
            // console.log('[DROP] 그리드 영역 감지')

            // 그리드 기준 X/Y좌표 계산 (gridWrapRef 측정)
            gridWrapRef.current?.measure((_gx, _gy, _gw, _gh, gridPx, gridPy) => {
              const relX = x - gridPx
              const insideX = relX - TIME_COL_W

              if (insideX >= 0) {
                const rawIndex = insideX / dayColWidth
                let dayIndex = Math.floor(rawIndex)
                if (dayIndex < 0) dayIndex = 0
                if (dayIndex >= weekDates.length) dayIndex = weekDates.length - 1

                const targetDate = weekDates[dayIndex]

                // Y축 시간 계산
                // gridPy(음수일 수 있음)를 빼주면 스크롤된 만큼 더해져서 정확한 위치가 나옴
                const innerY = y - gridPy

                let min = innerY / pixelsPerMin
                if (min < 0) min = 0
                if (min > 1435) min = 1435

                let snapped = Math.round(min / 5) * 5
                const h = Math.floor(snapped / 60)
                const m = snapped % 60
                const hh = String(h).padStart(2, '0')
                const mm = String(m).padStart(2, '0')
                const placementTime = `${hh}:${mm}:00`

                handleDropProcess(task, targetDate, placementTime)
              }
            })
          }
        },
      )
    }

    // 드롭 처리 로직 분리 (코드 가독성 위함)
    const handleDropProcess = async (
      task: any,
      targetDate: string,
      placementTime: string | null,
    ) => {
      try {
        const created = await cloneTaskToDateTimeAndDeleteOriginal(
          http,
          task,
          targetDate,
          placementTime,
        )

        bus.emit('sidebar:remove-task', { id: task.id })

        setWeekData((prev) => {
          const prevBucket = prev[targetDate]
          const baseBucket: DayBucket = prevBucket ?? {
            spanEvents: [],
            timelineEvents: [],
            checks: [],
            timedTasks: [],
          }

          const nextTimedTasks = (baseBucket.timedTasks || []).filter(
            (t: any) => String(t.id) !== String(created?.id),
          )
          nextTimedTasks.push({
            ...created,
            placementDate: targetDate,
            placementTime: placementTime,
          })

          return {
            ...prev,
            [targetDate]: {
              ...baseBucket,
              timedTasks: nextTimedTasks,
            },
          }
        })

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
      } catch (err: any) {
        console.error('[DROP] 처리 실패:', err)
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
  }, [weekDates, gridRect, dayColWidth, spanRect, pixelsPerMin])

  const toggleSpanTaskCheck = async (
    taskId: string,
    prevDone: boolean,
    dateISO: string,
  ) => {
    try {
      const nextCompleted = !prevDone

      await updateTaskCompleted(http, taskId, nextCompleted, dateISO)

      setWeekData((prev) => {
        const bucket = prev[dateISO]
        if (!bucket) return prev

        const spanEvents = bucket.spanEvents.map((e: any) => {
          if (String(e.id) === String(taskId)) {
            return { ...e, done: nextCompleted }
          }
          return e
        })

        const checks = bucket.checks.map((c) => {
          if (String(c.id) === String(taskId)) {
            return { ...c, done: nextCompleted }
          }
          return c
        })

        return {
          ...prev,
          [dateISO]: {
            ...bucket,
            spanEvents,
            checks,
          },
        }
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
      // console.log('[measure] gridWrapRef:', { x, y, w, h, px, py })
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

  const { composedGesture, swipeStyle, animatedStyle } = useWeekGestures({
    anchorDate,
    isZoomed,
    setIsZoomed,
    screenWidth: SCREEN_W,
  })
  const handleDeleteTask = () => {
    if (!taskPopupId) return
    void (async () => {
      try {
        await http.delete(`/task/${taskPopupId}`)

        bus.emit('calendar:mutated', {
          op: 'delete',
          item: { id: taskPopupId },
        })
        bus.emit('calendar:invalidate', {
          ym: anchorDate.slice(0, 7),
        })

        await fetchWeek(weekDates)

        setTaskPopupVisible(false)
        setTaskPopupId(null)
        setTaskPopupTask(null)
      } catch (err) {
        console.error('❌ 테스크 삭제 실패:', err)
        Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
      }
    })()
  }

  const enabledLabelIds = useMemo(
    () => filterLabels.filter((l) => l.enabled).map((l) => l.id),
    [filterLabels],
  )

  const filteredWeekData = useMemo(() => {
    if (!filterLabels.length) return weekData
    if (enabledLabelIds.length === filterLabels.length) return weekData

    const enabledSet = new Set(enabledLabelIds)

    const matchesLabel = (item: any) => {
      const labels = Array.isArray(item?.labels) ? item.labels : []
      if (!labels.length) return true
      return labels.some((id: number) => enabledSet.has(id))
    }

    const next: Record<string, any> = {}
    for (const [dateISO, bucket] of Object.entries(weekData)) {
      next[dateISO] = {
        ...bucket,
        spanEvents: (bucket.spanEvents || []).filter(matchesLabel),
        timelineEvents: (bucket.timelineEvents || []).filter(matchesLabel),
        checks: (bucket.checks || []).filter(matchesLabel),
        timedTasks: (bucket.timedTasks || []).filter(matchesLabel),
      }
    }
    return next
  }, [weekData, enabledLabelIds, filterLabels])

  const spanBars = useMemo(
    () => buildWeekSpanEvents(weekDates, filteredWeekData),
    [weekDates, filteredWeekData],
  )
  const maxSpanRow = spanBars.reduce((m, s) => (s.row > m ? s.row : m), -1)
  const SPAN_ROW_GAP = 3
  const spanAreaHeight = maxSpanRow < 0 ? 0 : (maxSpanRow + 1) * (SINGLE_HEIGHT + SPAN_ROW_GAP)

  const handleTimedTaskCompletedChange = useCallback(
    ({
      id,
      dateISO,
      completed,
    }: {
      id: string
      dateISO: string
      completed: boolean
    }) => {
      setWeekData((prev) => {
        const bucket = prev[dateISO]
        if (!bucket) return prev

        const timedTasks = (bucket.timedTasks || []).map((t: any) =>
          String(t.id) === String(id) ? { ...t, completed } : t,
        )

        return {
          ...prev,
          [dateISO]: {
            ...bucket,
            timedTasks,
          },
        }
      })
    },
    [],
  )

  const handleHeaderTimeColLayout = useCallback((x: number, y: number) => {
    gridOffsetRef.current = { x, y }
  }, [])

  const handleGridScroll = useCallback((offsetY: number) => {
    scrollOffsetRef.current = offsetY
  }, [])

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
            <WeekHeaderSpan
              FullBleed={FullBleed}
              styles={S}
              spanWrapRef={spanWrapRef}
              spanScrollRef={spanScrollRef}
              weekDates={weekDates}
              todayISO={today}
              selectedDateISO={anchorDate}
              dayColWidth={dayColWidth}
              timeColWidth={TIME_COL_W}
              singleHeight={SINGLE_HEIGHT}
              spanRowGap={SPAN_ROW_GAP}
              spanBars={spanBars}
              spanAreaHeight={spanAreaHeight}
              showSpanScrollbar={showSpanScrollbar}
              spanWrapH={spanWrapH}
              spanContentH={spanContentH}
              spanThumbTop={spanThumbTop}
              onSetSpanWrapH={setSpanWrapH}
              onSetSpanThumbTop={setSpanThumbTop}
              onSetSpanContentH={setSpanContentH}
              onToggleSpanTask={toggleSpanTaskCheck}
              onOpenEventDetail={openEventDetail}
              onSelectDate={setAnchorDate}
              onHeaderTimeColLayout={handleHeaderTimeColLayout}
            />

            <WeekTimeline
              styles={S}
              gridContainerRef={gridContainerRef}
              gridScrollRef={gridScrollRef}
              gridWrapRef={gridWrapRef}
              hours={HOURS}
              rowH={rowH}
              weekDates={weekDates}
              weekData={filteredWeekData}
              todayISO={today}
              nowTop={nowTop}
              dayColWidth={dayColWidth}
              getTaskTime={getTaskTime}
              openEventDetail={openEventDetail}
              openTaskPopupFromApi={openTaskPopupFromApi}
              onGridScroll={handleGridScroll}
              onTimedTaskCompletedChange={handleTimedTaskCompletedChange}
              DraggableFlexibleEventComponent={MemoDraggableFlexibleEvent}
              TaskGroupBoxComponent={MemoTaskGroupBox}
              DraggableTaskBoxComponent={MemoDraggableTaskBox}
            />
          </Animated.View>
        </GestureDetector>
        <WeekPopups
          taskPopupVisible={taskPopupVisible}
          taskPopupMode={taskPopupMode}
          taskPopupId={taskPopupId}
          taskPopupTask={taskPopupTask}
          setTaskPopupVisible={setTaskPopupVisible}
          setTaskPopupId={setTaskPopupId}
          setTaskPopupTask={setTaskPopupTask}
          onDeleteTask={taskPopupMode === 'edit' ? handleDeleteTask : undefined}
          eventPopupVisible={eventPopupVisible}
          eventPopupMode={eventPopupMode}
          eventPopupData={eventPopupData}
          eventPopupCreateType={eventPopupCreateType}
          setEventPopupVisible={setEventPopupVisible}
          setEventPopupData={setEventPopupData}
          setEventPopupCreateType={setEventPopupCreateType}
          imagePopupVisible={imagePopupVisible}
          setImagePopupVisible={setImagePopupVisible}
          ocrSplashVisible={ocrSplashVisible}
          ocrModalVisible={ocrModalVisible}
          ocrEvents={ocrEvents}
          setOcrModalVisible={setOcrModalVisible}
          sendToOCR={sendToOCR}
          fetchWeek={fetchWeek}
          weekDates={weekDates}
          anchorDate={anchorDate}
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
    height: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-start',
  },
  weekHeaderTimeCol: {
    width: TIME_COL_W,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
    paddingTop: 1,
  },
  weekHeaderBigDate: {
    ...ts('label1'),
    fontSize: 19,
    color: '#000000',
  },
  weekHeaderCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  weekHeaderWeekday: {
    ...ts('date3'),
    fontSize: 13,
    fontWeight: 500,
    color: colors.text.text2,
    marginBottom: 4,
  },
  weekHeaderWeekdayToday: {
    fontWeight: 700,
  },
  weekHeaderDatePill: {
    height: 18,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  weekHeaderDatePillToday: {
    backgroundColor: '#EFE7F7',
  },
  weekHeaderDate: {
    ...ts('date3'),
    fontSize: 13,
    fontWeight: 500,
    color: '#4A4A4A',
  },
  weekHeaderDateToday: {
    color: colors.brand.primary,
    fontWeight: 700,
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
  spanBottomShadow: {
    position: 'absolute',
    left: -16,
    right: -16,
    top: '100%',
    height: 24,
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
    alignItems: 'flex-start',
    paddingRight: 0,
  },
  timeRow: {
    height: BASE_ROW_H,
    paddingTop: 0,
    justifyContent: 'flex-start',
  },
  timeText: {
    ...ts('date3'),
    fontSize: 12,
    lineHeight: 20,
    color: colors.text.text4,
    fontWeight: '500',
    textAlign: 'left',
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
    includeFontPadding: false,
  },

  dayCol: {
    borderLeftWidth: 0.3,
    borderLeftColor: '#C7D0D6',
    position: 'relative',
  },
  firstDayCol: {
    borderLeftWidth: 0,
  },
  hourRow: {
    height: BASE_ROW_H,
  },

  eventBox: {
    position: 'absolute',
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'flex-start',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  eventTitle: {
    color: '#000000',
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
    height: BASE_ROW_H,
    borderRadius: 6,
  },
  taskInnerBox: {
    flex: 1,
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskGroupBox: {
    position: 'absolute',
    minHeight: BASE_ROW_H,
    borderRadius: 8,
    zIndex: 21,
    overflow: 'visible',
  },
  taskGroupInner: {
    minHeight: BASE_ROW_H,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 6,
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
    flexShrink: 1,
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
    backgroundColor: '#C7D0D6',
  },
})
