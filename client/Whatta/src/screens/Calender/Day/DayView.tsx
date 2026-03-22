import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Alert,
  Modal,
} from 'react-native'

import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { bus } from '@/lib/eventBus'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import type { EventItem } from '@/api/event_api'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import AddImageSheet from '@/screens/More/Ocr'
import OCREventCardSlider from '@/screens/More/OcrEventCardSlider'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import OcrSplash from '@/screens/More/OcrSplash'

import { DraggableTaskBox } from './DayViewItems'
import { DraggableTaskGroupBox } from './DayViewItems'
import { DraggableFixedEvent } from './DayViewItems'
import { DraggableFlexibleEvent } from './DayViewItems'
import { PIXELS_PER_MIN } from './constants'
import S from './S'
import { useDayData } from './eventUtils'
import { useDaySwipe } from './swipeUtils'
import { useOCR } from '@/hooks/useOCR'
import { useDayDrag } from './dragUtils'
import {
  computeEventOverlap,
  groupTasksByOverlap,
  type DayViewTask,
} from './overlapUtils'
import { createEvent, getEvent } from '@/api/event_api'
import { getTask, updateTask, createTask, deleteTask } from '@/api/task'
import { today, getInstanceDates } from '../../../utils/dateUtils'
import { getMyLabels } from '@/api/label_api'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'
import colors from '@/styles/colors'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'
import { SCREEN_H } from './constants'

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

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const TIME_COL_W = 50
const DAY_LEFT_OFFSET = TIME_COL_W + 18
const TOP_ITEM_WIDTH = 308
const EXPANDED_GROUP_WIDTH = TOP_ITEM_WIDTH

let draggingEventId: string | null = null

const formatHourLabel = (hour: number) =>
  hour === 0
    ? '오전 12시'
    : hour < 12
      ? `오전 ${hour}시`
      : hour === 12
        ? '오후 12시'
        : `오후 ${hour - 12}시`

const buildTaskGroupId = (group: { startMin: number; tasks: DayViewTask[] }) =>
  `day-group-${group.startMin}-${group.tasks
    .map((task) => String(task.id))
    .sort()
    .join('-')}`

const getTaskStartHour = (placementTime?: string | null) => {
  if (!placementTime?.includes(':')) return 0
  const [h, m] = placementTime.split(':').map(Number)
  return h + m / 60
}

export default function DayView() {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  const isFocused = useIsFocused()

  const [anchorDate, setAnchorDate] = useState<string>(today())
  const [, setColorSetVersion] = useState(0)

  const { swipeGesture, swipeStyle } = useDaySwipe(setAnchorDate)

  const {
    ocrSplashVisible,
    ocrModalVisible,
    ocrEvents,
    imagePopupVisible,
    setImagePopupVisible,
    setOcrModalVisible,
    sendToOCR,
  } = useOCR()

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  const anchorDateRef = useRef(anchorDate)
  useEffect(() => {
    anchorDateRef.current = anchorDate
  }, [anchorDate])
  // 중복 방송 방지용
  const lastBroadcastRef = useRef<string | null>(null)
  useEffect(() => {
    if (lastBroadcastRef.current !== anchorDate) {
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      lastBroadcastRef.current = anchorDate
    }
  }, [anchorDate])

  useEffect(() => {
    if (!isFocused) return

    bus.emit('calendar:state', {
      date: anchorDate,
      mode: 'day',
    })
    bus.emit('calendar:meta', {
      mode: 'day',
    })
  }, [anchorDate, isFocused])
  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')
  const [eventPopupCreateType, setEventPopupCreateType] = useState<'event' | 'task'>(
    'event',
  )

  async function openEventDetail(ev: any) {
    const data = await getEvent(ev.id)

    const { startDate, endDate } = getInstanceDates(ev, anchorDateRef.current)

    setEventPopupData({
      ...data.data,
      startDate,
      endDate,
    })
    setEventPopupMode('edit')
    setEventPopupCreateType('event')
    setEventPopupVisible(true)
  }
  useEffect(() => {
    const h = (payload?: { source?: string; createType?: 'event' | 'task' }) => {
      if (payload?.source !== 'Day') return
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

  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

  const taskBoxRef = useRef<View>(null)
  const gridWrapRef = useRef<View>(null)
  const [gridScrollY, setGridScrollY] = useState(0)

  const [taskBoxRect, setTaskBoxRect] = useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  })
  const [gridRect, setGridRect] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  useFocusEffect(
    useCallback(() => {
      currentCalendarView.set('day')

      // 헤더나 WeekView에서 현재 상태를 알려줄 때
      const onState = (payload: any) => {
        // 날짜 정보가 있고, 내 날짜와 다르면 업데이트
        if (payload.date && payload.date !== anchorDateRef.current) {
          setAnchorDate(payload.date)
        }
      }

      // 강제 날짜 변경 명령 (달력 팝업 등)
      const onSet = (iso: string) => {
        setAnchorDate((prev) => (prev === iso ? prev : iso))
      }

      bus.on('calendar:state', onState)
      bus.on('calendar:set-date', onSet)
      bus.emit('calendar:request-sync')

      return () => {
        bus.off('calendar:state', onState)
        bus.off('calendar:set-date', onSet)
      }
    }, []), // 의존성 비움 - 스와이프 시 재실행 방지
  )
  useFocusEffect(
    useCallback(() => {
      bus.emit('calendar:state', {
        date: anchorDate,
        mode: 'day',
      })
    }, [anchorDate]),
  )

  useEffect(() => {
    if (isFocused) {
      bus.emit('calendar:set-date', anchorDate)
    }
  }, [anchorDate, isFocused])

  useEffect(() => {
    const onReq = () =>
      bus.emit('calendar:state', { date: anchorDateRef.current, mode: 'day' })
    const onSet = (iso: string) => {
      anchorDateRef.current = iso // 드롭 직전에도 최신 날짜가 ref에 존재
      setAnchorDate((prev) => (prev === iso ? prev : iso))
    }

    bus.on('calendar:request-sync', onReq)
    bus.on('calendar:set-date', onSet)
    // 헤더가 처음 켜질 때 상태를 원할 수 있으므로 1회 제공
    bus.emit('calendar:state', { date: anchorDateRef.current, mode: 'day' })

    return () => {
      bus.off('calendar:request-sync', onReq)
      bus.off('calendar:set-date', onSet)
    }
  }, [])

  const gridScrollYRef = useRef(0)
  const taskBoxRectRef = useRef(taskBoxRect)
  const gridRectRef = useRef(gridRect)
  useEffect(() => {
    gridScrollYRef.current = gridScrollY
  }, [gridScrollY])
  useEffect(() => {
    taskBoxRectRef.current = taskBoxRect
  }, [taskBoxRect])
  useEffect(() => {
    gridRectRef.current = gridRect
  }, [gridRect])

  // ✅ 라이브바 위치 계산
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)
  const isToday = anchorDate === today()

  useFocusEffect(
    React.useCallback(() => {
      setOpenGroupId(null)
    }, []),
  )

  useEffect(() => {
    setOpenGroupId(null)
  }, [anchorDate])

  // 라벨

  interface LabelItem {
    id: number
    title: string
    color?: string
    colorKey?: string
  }

  const [labelList, setLabelList] = useState<LabelItem[]>([])
  const fetchLabels = useCallback(async () => {
    try {
      const labels = await getMyLabels()
      setLabelList(labels)
    } catch (err) {
      console.error('❌ 라벨 조회 실패:', err)
    }
  }, [])

  const getLabelName = useCallback(
    (labelId?: number) => {
      if (!labelId) return ''
      const found = labelList.find((label) => label.id === labelId)
      return found ? found.title : ''
    },
    [labelList],
  )

  useEffect(() => {
    fetchLabels()
  }, [])

  // Task 팝업 상태
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  // taskId 로 서버에서 Task 상세 조회해서 팝업 열기
  const openTaskPopupFromApi = async (taskId: string) => {
    try {
      const data = await getTask(taskId)
      if (!data) return
      setTaskPopupMode('edit')

      setTaskPopupId(data.id)
      setTaskPopupTask({
        id: data.id,
        title: data.title ?? '',
        content: data.content ?? '',
        labels: data.labels ?? [],
        completed: data.completed ?? false,
        placementDate: data.placementDate,
        placementTime: data.placementTime,
        dueDateTime: data.dueDateTime ?? null,
        reminderNoti: data.reminderNoti ?? null,
      })

      setTaskPopupVisible(true)
    } catch (e) {
      console.warn('task detail load error', e)
      Alert.alert('오류', '테스크 정보를 가져오지 못했습니다.')
    }
  }

  const { items: filterLabels } = useLabelFilter()

  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일') // 수정: "할 일" 라벨 탐색
    return found ? Number(found.id) : null
  }, [filterLabels])

  // FAB에서 사용하는 '할 일 생성' 팝업 열기
  const openCreateTaskPopup = useCallback(
    (source?: string) => {
      setTaskPopupMode('create')
      setTaskPopupId(null)

      const placementDate = source === 'Day' ? anchorDateRef.current : null
      const placementTime = null

      setTaskPopupTask({
        id: null,
        title: '',
        content: '',
        labels: todoLabelId ? [todoLabelId] : [],
        completed: false,
        placementDate,
        placementTime,
        dueDateTime: null,
      })

      setTaskPopupVisible(true)
    },
    [todoLabelId],
  )

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      openCreateTaskPopup(payload.source)
    }

    bus.on('task:create', handler)
    return () => bus.off('task:create', handler)
  }, [openCreateTaskPopup])

  useEffect(() => {
    const updateNowTop = (scrollToCenter: boolean) => {
      const now = new Date()
      const hour = now.getHours()
      const min = now.getMinutes()
      const topPos = (hour * 60 + min) * PIXELS_PER_MIN
      setNowTop(topPos)

      if (isToday && scrollToCenter && !hasScrolledOnce) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(topPos - SCREEN_H * 0.35, 0),
            animated: true,
          })
        })
        setHasScrolledOnce(true)
      }
    }

    updateNowTop(true)
    const id = setInterval(() => updateNowTop(false), 60000)
    return () => clearInterval(id)
  }, [hasScrolledOnce, isToday])

  useFocusEffect(
    React.useCallback(() => {
      setHasScrolledOnce(false)
    }, []),
  )

  useEffect(() => {
    if (isToday && nowTop != null && gridScrollRef.current && !hasScrolledOnce) {
      requestAnimationFrame(() => {
        gridScrollRef.current?.scrollTo({
          y: Math.max(nowTop - SCREEN_H * 0.35, 0),
          animated: true,
        })
        setHasScrolledOnce(true)
      })
    }
  }, [hasScrolledOnce, isToday, nowTop])

  // 라벨 필터링
  const enabledLabelIds = useMemo(
    () => filterLabels.filter((l) => l.enabled).map((l) => l.id),
    [filterLabels],
  )

  const measureLayouts = useCallback(() => {
    taskBoxRef.current?.measure?.((x, y, w, h, px, py) => {
      setTaskBoxRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
    gridWrapRef.current?.measure?.((x, y, w, h, px, py) => {
      setGridRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
  }, [])

  const { events, spanEvents, tasks, setTasks, checks, setChecks, fetchDailyEvents } =
    useDayData(anchorDate, enabledLabelIds)

  const overlappedEvents = useMemo(() => {
    const normalized = events.map((ev) => {
      const [sh, sm] = ev.clippedStartTime.split(':').map(Number)
      const [eh, em] = ev.clippedEndTime.split(':').map(Number)

      return {
        ...ev,
        startMin: sh * 60 + sm,
        endMin: eh * 60 + em,
      }
    })

    // ⭐ 고정 일정 먼저 오도록 정렬
    normalized.sort((a, b) => {
      if (a.isRepeat && !b.isRepeat) return -1
      if (!a.isRepeat && b.isRepeat) return 1
      return a.startMin - b.startMin
    })

    return computeEventOverlap(normalized)
  }, [events])

  useDayDrag({
    anchorDateRef,
    fetchDailyEvents,
    measureLayouts,
    taskBoxRectRef,
    gridRectRef,
    gridScrollYRef,
  })

  const taskGroups = useMemo(
    () =>
      groupTasksByOverlap(tasks).map((group) => ({
        ...group,
        groupId: buildTaskGroupId(group),
      })),
    [tasks],
  )

  useEffect(() => {
    // 사이드바 닫힐 때 레이아웃 재측정
    const handler = measureLayouts
    bus.on('drawer:close', handler)
    requestAnimationFrame(handler) // 초기 1회 측정

    return () => {
      bus.off('drawer:close', handler)
    }
  }, [measureLayouts])

  // 새 일정이 추가되면 즉시 재조회
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const date =
        payload.item.startDate ??
        payload.item.date ??
        payload.item.endDate ??
        payload.item.placementDate ??
        today()
      const itemDateISO = date.slice(0, 10)

      if (itemDateISO === anchorDate && typeof payload.item.completed === 'boolean') {
        const completed = payload.item.completed
        const itemId = String(payload.item.id)

        setTasks((prev) =>
          prev.map((task) =>
            String(task.id) === itemId ? { ...task, completed } : task,
          ),
        )
        setChecks((prev) =>
          prev.map((check) =>
            String(check.id) === itemId
              ? { ...check, done: completed, completed }
              : check,
          ),
        )
        return
      }

      if (itemDateISO === anchorDate && payload.item.id !== draggingEventId) {
        fetchDailyEvents()
      } else {
        draggingEventId = null
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [anchorDate, fetchDailyEvents, setChecks, setTasks])

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
  const anchorDateMeta = useMemo(() => {
    const [yy, mm, dd] = anchorDate.split('-').map(Number)
    const d = new Date(yy, (mm || 1) - 1, dd || 1)
    const weekdays = [
      '일요일',
      '월요일',
      '화요일',
      '수요일',
      '목요일',
      '금요일',
      '토요일',
    ]
    return {
      day: d.getDate(),
      weekday: weekdays[d.getDay()] ?? '',
      weekdayColor: d.getDay() === 0 ? '#FF3B30' : colors.text.text2,
    }
  }, [anchorDate])
  // 좌측 날짜 컬럼(50) 이후 시작하는 상단 아이템이 화면 오른쪽 끝까지 닿도록 하는 폭
  const TOP_PERIOD_SPAN_WIDTH = Math.max(
    TOP_ITEM_WIDTH,
    Dimensions.get('window').width - (16 + TIME_COL_W),
  )
  const topItems = useMemo(() => {
    type TopScheduleKind = 'basic' | 'period' | 'repeat'
    type TopScheduleItem = {
      type: 'schedule'
      kind: TopScheduleKind
      id: string
      title: string
      color: string
      isStart: boolean
      isEnd: boolean
      startISO: string
      endISO: string
      raw: any
    }
    type TopTaskItem = {
      type: 'task'
      id: string
      title: string
      done: boolean
    }

    const scheduleItems: TopScheduleItem[] = (spanEvents ?? []).map((ev: any) => {
      let startISO = anchorDate
      let endISO = anchorDate
      if (ev.startDate && ev.endDate) {
        startISO = String(ev.startDate).slice(0, 10)
        endISO = String(ev.endDate).slice(0, 10)
      } else if (ev.startAt && ev.endAt) {
        startISO = String(ev.startAt).slice(0, 10)
        endISO = String(ev.endAt).slice(0, 10)
      }

      const isStart = anchorDate === startISO
      const isEnd = anchorDate === endISO
      const isPeriod = startISO !== endISO
      const kind: TopScheduleKind = isPeriod ? 'period' : ev.isRepeat ? 'repeat' : 'basic'

      return {
        type: 'schedule',
        kind,
        id: String(ev.id ?? ''),
        title: ev.title ?? '',
        color: resolveScheduleColor(ev.colorKey || ev.color),
        isStart,
        isEnd,
        startISO,
        endISO,
        raw: ev,
      }
    })

    const taskItems: TopTaskItem[] = (checks ?? []).map((c: any) => ({
      type: 'task',
      id: String(c.id),
      title: c.title ?? '',
      done: !!c.done,
    }))

    const order: Record<TopScheduleKind, number> = {
      basic: 0,
      period: 1,
      repeat: 2,
    }
    scheduleItems.sort((a, b) => order[a.kind] - order[b.kind])

    return [...scheduleItems, ...taskItems]
  }, [spanEvents, checks, anchorDate])

  const toggleCheck = async (id: string) => {
    const current = checks.find((c) => String(c.id) === String(id))
    if (!current) return

    const nextDone = !(current.done ?? current.completed)

    // UI 즉시 변경
    setChecks((prev) =>
      prev.map((c) =>
        String(c.id) === String(id) ? { ...c, done: nextDone, completed: nextDone } : c,
      ),
    )

    // 서버에 보낼 값도 nextDone 사용
    try {
      await updateTask(id, { completed: nextDone })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id, completed: nextDone, date: anchorDate, isTask: true },
      })
    } catch (err) {
      setChecks((prev) =>
        prev.map((c) =>
          String(c.id) === String(id)
            ? { ...c, done: !nextDone, completed: !nextDone }
            : c,
        ),
      )
      console.error('❌ 테스크 상태 업데이트 실패:', err)
    }
  }

  const handleDeleteTask = async () => {
    if (!taskPopupId) return
    try {
      await deleteTask(taskPopupId)

      bus.emit('calendar:mutated', {
        op: 'delete',
        item: { id: taskPopupId, date: anchorDate },
      })

      bus.emit('calendar:invalidate', {
        ym: anchorDate.slice(0, 7),
      })

      await fetchDailyEvents()

      setTaskPopupVisible(false)
      setTaskPopupId(null)
      setTaskPopupTask(null)
    } catch (err) {
      console.error('❌ 테스크 삭제 실패:', err)
      Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[S.screen, swipeStyle]}>
            {/* ✅ 상단 테스크 박스 */}
            <FullBleed padH={16}>
              <View style={S.taskBoxWrap} ref={taskBoxRef} onLayout={measureLayouts}>
                <View
                  style={S.taskBox}
                  onLayout={(e) => {
                    onLayoutWrap(e)
                    measureLayouts()
                  }}
                >
                  <View style={S.taskBoxInner}>
                    <View style={S.taskBoxDateCol}>
                      <Text style={S.taskBoxDateText}>{`${anchorDateMeta.day}일`}</Text>
                      <Text
                        style={[
                          S.taskBoxWeekdayText,
                          { color: anchorDateMeta.weekdayColor },
                        ]}
                      >
                        {anchorDateMeta.weekday}
                      </Text>
                    </View>
                    <View style={S.taskBoxContentArea}>
                      <ScrollView
                        style={S.boxScroll}
                        ref={boxScrollRef}
                        onScroll={onScroll}
                        onContentSizeChange={onContentSizeChange}
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        contentContainerStyle={S.boxContent}
                        bounces={false}
                      >
                        {topItems.map((item, i) => {
                          if (item.type === 'task') {
                            return (
                              <View key={`task-${item.id}-${i}`} style={S.topItemRow}>
                                <TaskItemCard
                                  id={item.id}
                                  title={item.title}
                                  done={item.done}
                                  density="week"
                                  isUntimed
                                  layoutWidthHint={TOP_ITEM_WIDTH}
                                  style={S.topCard}
                                  onPress={() => openTaskPopupFromApi(item.id)}
                                  onToggle={(id) => toggleCheck(id)}
                                />
                              </View>
                            )
                          }

                          if (item.kind === 'period') {
                            const periodStyle = item.isEnd
                              ? S.topCard
                              : [
                                  S.topCard,
                                  { width: TOP_PERIOD_SPAN_WIDTH },
                                  S.topCardSpanExtend,
                                ]
                            return (
                              <View key={`period-${item.id}-${i}`} style={S.topItemRow}>
                                <RangeScheduleBar
                                  id={item.id}
                                  title={item.title}
                                  color={item.color}
                                  startISO={item.startISO}
                                  endISO={item.endISO}
                                  isStart={item.isStart}
                                  isEnd={item.isEnd}
                                  density="day"
                                  isUntimed
                                  style={periodStyle}
                                  onPress={() => openEventDetail(item.raw)}
                                />
                              </View>
                            )
                          }

                          const ScheduleCard =
                            item.kind === 'repeat'
                              ? RepeatScheduleCard
                              : FixedScheduleCard
                          return (
                            <View key={`schedule-${item.id}-${i}`} style={S.topItemRow}>
                              <ScheduleCard
                                id={item.id}
                                title={item.title}
                                color={item.color}
                                density="day"
                                isUntimed
                                layoutWidthHint={TOP_ITEM_WIDTH}
                                style={S.topCard}
                                onPress={() => openEventDetail(item.raw)}
                              />
                            </View>
                          )
                        })}

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
                  </View>
                </View>

                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    'rgba(0,0,0,0.07)',
                    'rgba(0,0,0,0.04)',
                    'rgba(0,0,0,0.015)',
                    'rgba(0,0,0,0)',
                  ]}
                  locations={[0, 0.35, 0.72, 1]}
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
              onLayout={measureLayouts}
              onScroll={(e) => {
                setGridScrollY(e.nativeEvent.contentOffset.y)
              }}
              scrollEventThrottle={16}
            >
              <View ref={gridWrapRef}>
                {HOURS.map((h, i) => {
                  const isLast = i === HOURS.length - 1

                  return (
                    <View key={h} style={S.row}>
                      <View style={S.timeCol}>
                        <Text style={S.timeText}>{formatHourLabel(h)}</Text>
                      </View>

                      <View style={S.slotCol}></View>

                      {!isLast && <View pointerEvents="none" style={S.guideLine} />}
                    </View>
                  )
                })}
              </View>

              {/* ✅ 현재시간 라이브바 */}
              {isToday && nowTop !== null && (
                <>
                  <View style={[S.liveBar, { top: nowTop }]} />
                  <View style={[S.liveDot, { top: nowTop - 3 }]} />
                </>
              )}
              {overlappedEvents.map((evt) => {
                const [sh, sm] = evt.clippedStartTime.split(':').map(Number)
                const [eh, em] = evt.clippedEndTime.split(':').map(Number)
                const startMin = sh * 60 + sm
                const endMin = eh * 60 + em

                // 반복 일정이면 DraggableFixedEvent 사용
                if (evt.isRepeat) {
                  return (
                    <DraggableFixedEvent
                      key={evt.id}
                      id={evt.id}
                      title={evt.title}
                      startMin={startMin}
                      endMin={endMin}
                      color={resolveScheduleColor(evt.colorKey)}
                      anchorDate={anchorDate}
                      onPress={() => openEventDetail(evt)}
                    />
                  )
                }

                // 일반 일정
                return (
                  <DraggableFlexibleEvent
                    key={evt.id}
                    id={evt.id}
                    title={evt.title}
                    place={getLabelName(evt.labels?.[0])}
                    startMin={startMin}
                    endMin={endMin}
                    color={resolveScheduleColor(evt.colorKey)}
                    anchorDate={anchorDate}
                    isRepeat={!!evt.isRepeat}
                    onPress={() => openEventDetail(evt)}
                    events={events}
                  />
                )
              })}

              {/* ⭐ Task groups 적용 */}
              {taskGroups.map((group) => {
                const { tasks: list, startMin, groupId } = group

                // 펼쳐진 그룹은 접힘 카드 렌더를 숨긴다.
                if (openGroupId === groupId) return null

                // 2개 이상 겹치면 그룹박스 1개로 표시
                if (list.length >= 2) {
                  return (
                    <DraggableTaskGroupBox
                      key={groupId}
                      group={list}
                      startMin={startMin}
                      anchorDate={anchorDate}
                      onPress={() => setOpenGroupId(groupId)}
                    />
                  )
                }

                // 1~3개 → 기존 개별 Task 렌더
                return list.map((task) => {
                  return (
                    <DraggableTaskBox
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      startHour={getTaskStartHour(task.placementTime)}
                      anchorDate={anchorDate}
                      done={task.completed}
                      onPress={() => openTaskPopupFromApi(task.id)}
                      events={events}
                    />
                  )
                })
              })}

              {/* ⭐ 펼쳐지는 상세 UI는 map 밖에서 단 한 번만 렌더 */}
              {openGroupId !== null &&
                (() => {
                  const group = taskGroups.find((item) => item.groupId === openGroupId)
                  if (!group) return null
                  const { tasks: list, startMin, groupId } = group

                  return (
                    <View
                      style={{
                        position: 'absolute',
                        top: startMin * PIXELS_PER_MIN + 2,
                        left: DAY_LEFT_OFFSET,
                        width: EXPANDED_GROUP_WIDTH,
                        backgroundColor: 'transparent',
                        zIndex: 500,
                      }}
                    >
                      <TaskGroupCard
                        groupId={`day-group-open-${groupId}`}
                        density="day"
                        expanded
                        layoutWidthHint={EXPANDED_GROUP_WIDTH}
                        tasks={list.map((task) => ({
                          id: String(task.id),
                          title: task.title ?? '',
                          done: !!task.completed,
                        }))}
                        onToggleExpand={() => setOpenGroupId(null)}
                        onPressTask={(taskId) => {
                          void openTaskPopupFromApi(taskId)
                        }}
                        onToggleTask={(taskId, nextDone) => {
                          setTasks((prev) =>
                            prev.map((task) =>
                              String(task.id) === String(taskId)
                                ? { ...task, completed: nextDone }
                                : task,
                            ),
                          )
                          void updateTask(taskId, { completed: nextDone })
                            .then(() => {
                              bus.emit('calendar:mutated', {
                                op: 'update',
                                item: {
                                  id: taskId,
                                  isTask: true,
                                  date: anchorDate,
                                  completed: nextDone,
                                },
                              })
                            })
                            .catch((err) => {
                              setTasks((prev) =>
                                prev.map((task) =>
                                  String(task.id) === String(taskId)
                                    ? { ...task, completed: !nextDone }
                                    : task,
                                ),
                              )
                              console.error('❌ 그룹 테스크 상태 업데이트 실패:', err)
                            })
                        }}
                      />
                    </View>
                  )
                })()}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
        <TaskDetailPopup
          visible={taskPopupVisible}
          source="Day"
          mode={taskPopupMode}
          taskId={taskPopupId ?? undefined}
          initialDate={new Date(`${anchorDate}T00:00:00`)}
          initialHasDate
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

            // 날짜
            if (form.hasDate && form.date) {
              const d = form.date
              placementDate = `${d.getFullYear()}-${pad(
                d.getMonth() + 1,
              )}-${pad(d.getDate())}`
            } else {
              fieldsToClear.push('placementDate')
            }

            // 시간
            if (form.hasTime && form.time) {
              const t = form.time
              placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:00`
            } else {
              fieldsToClear.push('placementTime')
            }

            const reminderNoti = form.reminderNoti ?? null
            if (!reminderNoti) fieldsToClear.push('reminderNoti')
            const dueDateTime = form.dueDateTime ?? null
            if (!dueDateTime) fieldsToClear.push('dueDateTime')

            const targetDate = placementDate ?? anchorDate

            try {
              if (taskPopupMode === 'edit') {
                if (!taskPopupId) return

                await updateTask(taskPopupId, {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  dueDateTime,
                  fieldsToClear,
                })

                bus.emit('calendar:mutated', {
                  op: 'update',
                  item: { id: taskPopupId, date: targetDate },
                })
              } else {
                // 새 테스크 생성 로직
                const res = await createTask({
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  dueDateTime,
                  date: targetDate,
                })

                const newId = res.id

                bus.emit('calendar:mutated', {
                  op: 'create',
                  item: { id: newId, date: targetDate },
                })
              }

              // 💥 DayView 화면 즉시 갱신
              await fetchDailyEvents()

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
          source="Day"
          eventId={eventPopupData?.id ?? null}
          initial={eventPopupData ?? undefined}
          mode={eventPopupMode}
          initialCreateType={eventPopupCreateType}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            setEventPopupCreateType('event')
            fetchDailyEvents() // 일정 새로 반영
          }}
        />
        <Modal
          visible={ocrSplashVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
        >
          <OcrSplash />
        </Modal>
        <AddImageSheet
          visible={imagePopupVisible}
          onClose={() => setImagePopupVisible(false)}
          onPickImage={(uri, base64, ext) => sendToOCR(base64, ext)}
          onTakePhoto={(uri, base64, ext) => sendToOCR(base64, ext)}
        />
       <OCREventCardSlider
  visible={ocrModalVisible}
  events={ocrEvents}
  onClose={() => setOcrModalVisible(false)}

  // ✔ 단일 저장
  onAddEvent={async (payload) => {
    try {
      await fetchDailyEvents()
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err) {
      console.error(err)
    }
  }}

  // ✔ 전체 저장 → 슬라이더 내부에서 이미 저장 처리함
  onSaveAll={async () => {
    await fetchDailyEvents()
    bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    setOcrModalVisible(false)
  }}
/>
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
