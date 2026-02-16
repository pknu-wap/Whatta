import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
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
  Alert,
  Modal
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import { runOnJS } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { getTask } from '@/api/task'
import { updateTask } from '@/api/task'
import { deleteTask } from '@/api/task'
import { createTask } from '@/api/task'
import { fetchDaily } from '@/api/calendar'
import { getMyLabels } from '@/api/label_api'
import { getEvent } from '@/api/event_api'
import { requestOCR } from '@/api/ocr'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { bus, EVENT } from '@/lib/eventBus'
import axios from 'axios'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import type { EventItem } from '@/api/event_api'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import AddImageSheet from '@/screens/More/Ocr'
import type { OCREventDisplay } from '@/screens/More/OcrEventCardSlider'
import EventPopupSlider from '@/screens/More/EventPopupSlider'
import OCREventCardSlider from '@/screens/More/OcrEventCardSlider'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import OcrSplash from '@/screens/More/OcrSplash'
import { createEvent } from '@/api/event_api'
import { today, addDays, getDateOfWeek } from '@/utils/calender/date'
import { computeTaskOverlap, groupTasksByOverlap, computeEventOverlap, } from '@/utils/calender/overlap'
import DraggableFixedEvent from '@/components/dayview/DraggableFixedEvent'
import DraggableFlexibleEvent from '@/components/dayview/DraggableFlexibleEvent'
import DayTaskLayer from '@/components/dayview/DayTaskLayer'
import DayTaskBox from '@/components/dayview/DayTaskBox'

const { width: SCREEN_W } = Dimensions.get('window')

const INITIAL_CHECKS: any[] = []

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const ROW_H = 48
const PIXELS_PER_HOUR = ROW_H
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60

let draggingEventId: string | null = null

export default function DayView() {


  function getLabelName(labelId?: number) {
  if (!labelId) return ''
  const found = labelList.find((l) => l.id === labelId)
  return found ? found.title : ''
}

  const [ocrSplashVisible, setOcrSplashVisible] = useState(false)
  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const taskGroups = useMemo(() => groupTasksByOverlap(tasks), [tasks])
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null)
  // OCR 카드
  const [ocrModalVisible, setOcrModalVisible] = useState(false)
  const [ocrEvents, setOcrEvents] = useState<OCREventDisplay[]>([])

  // 📌 이미지 추가 모달 열기
  const [imagePopupVisible, setImagePopupVisible] = useState(false)

  const sendToOCR = async (base64: string, ext?: string) => {
    try {
      setOcrSplashVisible(true)
      
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64
      const lower = (ext ?? 'jpg').toLowerCase()
      const format = lower === 'png' ? 'png' : lower === 'jpeg' ? 'jpeg' : 'jpg'

      const data = await requestOCR({
        imageType: 'COLLEGE_TIMETABLE',
        image: {
        format,
        name: `timetable.${format}`,
        data: cleanBase64,
        },
})

const events = data?.events ?? []

      console.log('OCR 성공:', data)

      const parsed = events
        .map((ev: any, idx: number) => {
          console.log('🔎 OCR raw weekDay:', ev.weekDay)
          console.log('🔎 Converted date:', getDateOfWeek(ev.weekDay))

          return {
            id: String(idx),
            title: ev.title ?? '',
            content: ev.content ?? '',
            weekDay: ev.weekDay ?? '',
            date: getDateOfWeek(ev.weekDay),
            startTime: ev.startTime ?? '',
            endTime: ev.endTime ?? '',
          }
        })
        .sort((a: OCREventDisplay, b: OCREventDisplay) => a.date.localeCompare(b.date))

      setOcrEvents(parsed)
      
        // OCR 성공한 시점에서 스플래쉬 끄기
  setOcrSplashVisible(false)

  // 바로 카드 켜기
  setOcrModalVisible(true)

  } catch (err) {
    Alert.alert('오류', 'OCR 처리 실패')
  }
}

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  const isFocused = useIsFocused()
  const [anchorDate, setAnchorDate] = useState<string>(today())
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
  const [checks, setChecks] = useState(INITIAL_CHECKS)
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([])
  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')

  function getInstanceDates(ev: any, currentDateISO: string) {
    // 1) 기간/종일 span: startDate/endDate가 내려오는 케이스
    if (ev.startDate && ev.endDate) {
      return { startDate: ev.startDate, endDate: ev.endDate }
    }

    // 2) 시간지정 일정(반복 포함): startAt/endAt이 내려오는 케이스
    if (ev.startAt && ev.endAt) {
      return {
        startDate: ev.startAt.slice(0, 10),
        endDate: ev.endAt.slice(0, 10),
      }
    }

    // 3) 시간지정 없는 단일 종일(allDayEvents): 날짜 필드가 아예 없는 케이스
    return { startDate: currentDateISO, endDate: currentDateISO }
  }

  async function openEventDetail(ev: any) {
  const data = await getEvent(ev.id)

  const { startDate, endDate } = getInstanceDates(ev, anchorDateRef.current)

  setEventPopupData({
    ...data?.data,   // getEvent는 res.data 반환하니까
    startDate,
    endDate,
  })
  setEventPopupMode('edit')
  setEventPopupVisible(true)
}

  useEffect(() => {
    const h = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      setEventPopupMode('create')
      setEventPopupData(null)
      setEventPopupVisible(true)
    }

    bus.on('popup:schedule:create', h)
    return () => bus.off('popup:schedule:create', h)
  }, [])

  // ✅ DayView 좌우 스와이프 애니메이션 (WeekView와 비슷한 구조, ±1일 이동)
  const swipeTranslateX = useSharedValue(0)

  const handleSwipe = useCallback((dir: 'prev' | 'next') => {
    setAnchorDate((prev) => addDays(prev, dir === 'next' ? 1 : -1))
  }, [])

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet'
      let nx = e.translationX
      const max = SCREEN_W * 0.15
      if (nx > max) nx = max
      if (nx < -max) nx = -max
      swipeTranslateX.value = nx
    })
    .onEnd(() => {
      'worklet'
      const cur = swipeTranslateX.value
      const th = SCREEN_W * 0.06

      if (cur > th) {
        swipeTranslateX.value = withTiming(SCREEN_W * 0.15, { duration: 120 }, () => {
          runOnJS(handleSwipe)('prev') // 왼→오 스와이프: 이전 날
          swipeTranslateX.value = withTiming(0, { duration: 160 })
        })
      } else if (cur < -th) {
        swipeTranslateX.value = withTiming(-SCREEN_W * 0.15, { duration: 120 }, () => {
          runOnJS(handleSwipe)('next') // 오→왼 스와이프: 다음 날
          swipeTranslateX.value = withTiming(0, { duration: 160 })
        })
      } else {
        swipeTranslateX.value = withTiming(0, { duration: 150 })
      }
    })

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }))

  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

  const taskBoxRef = useRef<View>(null)
  const gridWrapRef = useRef<View>(null)
  const [taskBoxTop, setTaskBoxTop] = useState(0)
  const [gridTop, setGridTop] = useState(0)
  const [gridScrollY, setGridScrollY] = useState(0)
  const draggingTaskIdRef = useRef<string | null>(null)
  const dragReadyRef = useRef(false)

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

  useEffect(() => {
    const onReady = () => (dragReadyRef.current = true)
    const onCancel = () => {
      draggingTaskIdRef.current = null // 드래그 취소
      dragReadyRef.current = false
    }
    bus.on('xdrag:ready', onReady)
    bus.on('xdrag:cancel', onCancel)
    return () => {
      bus.off('xdrag:ready', onReady)
      bus.off('xdrag:cancel', onCancel)
    }
  }, [])

  // ✅ 라이브바 위치 계산
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)
  const ROW_H_LOCAL = 48

  // 라벨

  interface LabelItem {
    id: number
    title: string
    color?: string
    colorKey?: string
  }

  const [labelList, setLabelList] = useState<LabelItem[]>([])
  const loadLabels = async () => {
  try {
    const labels = await getMyLabels()
    setLabelList(labels)
  } catch (err) {
    console.error('❌ 라벨 조회 실패:', err)
  }
}

  useEffect(() => {
  loadLabels()
}, [])

  // Task 팝업 상태
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [popupVisible, setPopupVisible] = useState(false)

  // Task 상세 조회
  async function fetchTaskDetail(taskId: string) {
    const detail = await getTask(taskId)
    return detail
  }

  async function handleTaskPress(taskId: string) {
    try {
      const detail = await fetchTaskDetail(taskId)
      setSelectedTask(detail)
      setPopupVisible(true)
    } catch (e) {
      console.warn('task detail load error', e)
      Alert.alert('오류', '테스크 정보를 가져오지 못했습니다.')
    }
  }

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
  const openCreateTaskPopup = useCallback((source?: string) => {
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
  }, [])

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      openCreateTaskPopup(payload.source)
    }

    bus.on('task:create', handler)
    return () => bus.off('task:create', handler)
  }, [openCreateTaskPopup])

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
      if (nowTop != null) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(nowTop - Dimensions.get('window').height * 0.2, 0),
            animated: true,
          })
        })
      }
    }, [nowTop]),
  )

  // 라벨 필터링
  const enabledLabelIds = filterLabels.filter((l) => l.enabled).map((l) => l.id)

  const fetchDailyEvents = useCallback(
    async (dateISO: string) => {
      try {
        const data = await fetchDaily(dateISO)

        const timed = data.timedEvents || []
        const timedTasks = data.timedTasks || []
        const allDay = data.allDayTasks || []
        const floating = data.floatingTasks || []
        const allDaySpan = data.allDaySpanEvents || []
        const allDayEvents = data.allDayEvents || []

        // 이벤트 정리
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
          ...allDayEvents,
        ]

        const checksAll = [
          ...allDay.map((t: any) => ({
            id: t.id,
            title: t.title,
            done: t.completed ?? false,
            labels: t.labels ?? [],
          })),
          ...floating.map((t: any) => ({
            id: t.id,
            title: t.title,
            done: t.completed ?? false,
            labels: t.labels ?? [],
          })),
        ]

        // 필터 적용
        const filterTask = (t: any) => {
          if (!t.labels || t.labels.length === 0) return true
          return t.labels.some((id: number) => enabledLabelIds.includes(id))
        }

        const filterEvent = (ev: any) => {
          if (!ev.labels || ev.labels.length === 0) return true
          return ev.labels.some((id: number) => enabledLabelIds.includes(id))
        }

        // 이제 필터 적용한 값으로 세팅
        // 1) 이벤트 startMin / endMin 계산
const parsedEvents = timelineEvents.map((e: any) => {
  const [sh, sm] = e.clippedStartTime.split(':').map(Number)
  const [eh, em] = e.clippedEndTime.split(':').map(Number)

  return {
    ...e,
    startMin: sh * 60 + sm,
    endMin: eh * 60 + em,
  }
})

// 2) overlap 계산해서 column 정보 부여
const overlapped = computeEventOverlap(parsedEvents)

// 3) 필터 적용
setEvents(overlapped.filter(filterEvent))

        setSpanEvents(span.filter(filterEvent))
        setTasks(timedTasks.filter(filterTask))
        setChecks(checksAll.filter(filterTask))
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.log('code:', err.code)
          console.log('message:', err.message)
          console.log('toJSON:', err.toJSON?.())

          // 네트워크/타임아웃 계열은 조용히 무시
          if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
            console.warn('일간 일정 네트워크 이슈, 잠시 후 자동 재시도 예정', err)
            return
          }
        }

        console.error('❌ 일간 일정 불러오기 실패:', err)
        alert('일간 일정 불러오기 실패') // 진짜 이상한 경우만 알림
      }
    },
    [enabledLabelIds],
  )
  useEffect(() => {
    fetchDailyEvents(anchorDate)
  }, [anchorDate, enabledLabelIds, fetchDailyEvents])

  const measureLayouts = useCallback(() => {
    taskBoxRef.current?.measure?.((x, y, w, h, px, py) => {
      setTaskBoxTop(py) // 기존 코드 유지
      setTaskBoxRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
    gridWrapRef.current?.measure?.((x, y, w, h, px, py) => {
      setGridTop(py) // 기존 코드 유지
      setGridRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
  }, [])

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
    const current = checks.find((c) => c.id === id)
    if (!current) return

    const nextDone = !current.done

    // UI 즉시 변경
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, done: nextDone } : c)))

    // 서버에 보낼 값도 nextDone 사용
    try {
      await updateTask(id, { completed: nextDone })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id },
      })
    } catch (err) {
      console.error('❌ 테스크 상태 업데이트 실패:', err)
    }
  }

  useEffect(() => {
    const onStart = ({ task }: any) => {
      draggingTaskIdRef.current = task?.id ?? null
    }
    bus.on('xdrag:start', onStart)
    return () => bus.off('xdrag:start', onStart)
  }, [])

  useEffect(() => {
    const within = (r: any, x: number, y: number) =>
      x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

    // 기존 onDrop 핸들러 내부의 gridRect/innerY 계산 직전 로직을 아래처럼 교체
    const onDrop = async ({ x, y }: any) => {
      const id = draggingTaskIdRef.current
      if (!id) return
      if (!dragReadyRef.current) {
        draggingTaskIdRef.current = null
        return
      }

      // ✅ 드롭 순간 좌표 기준으로 바로 처리
      measureLayouts()
      requestAnimationFrame(async () => {
        const dateISO = anchorDateRef.current
        const taskBox = taskBoxRectRef.current
        const gridBox = gridRectRef.current
        const scrollY = gridScrollYRef.current

        const within = (r: any, px: number, py: number) =>
          px >= r.left && px <= r.right && py >= r.top && py <= r.bottom

        // ① 상단 박스 드롭: 날짜만 배치
        if (within(taskBox, x, y)) {
          await updateTask(id, {
            placementDate: dateISO,
            placementTime: null,
            date: dateISO,
          })
          bus.emit('sidebar:remove-task', { id })
          bus.emit('calendar:mutated', {
            op: 'update',
            item: { id, isTask: true, date: anchorDateRef.current },
          })
          bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
          fetchDailyEvents(dateISO)
          draggingTaskIdRef.current = null
          return
        }

        // ② 시간 그리드 드롭: 5분 스냅
        if (within(gridBox, x, y)) {
          // ✅ 여기서는 scrollY 더해도 되고 / 안 더해도 되는 건 레이아웃 기준에 따라 선택,
          // 아까 말한 대로 현재 구조면 scrollY 빼고 하는 게 정확함
          const innerY = Math.max(0, y - gridBox.top) // ← scrollY 더하지 말기

          const minRaw = innerY / PIXELS_PER_MIN
          const minSnap = Math.round(minRaw / 5) * 5
          const hh = String(Math.floor(minSnap / 60)).padStart(2, '0')
          const mm = String(minSnap % 60).padStart(2, '0')

          await updateTask(id, {
            placementDate: dateISO,
            placementTime: `${hh}:${mm}:00`,
            date: dateISO,
          })

          bus.emit('sidebar:remove-task', { id })
          bus.emit('calendar:mutated', {
            op: 'update',
            item: {
              id,
              isTask: true,
              placementDate: dateISO,
              placementTime: `${hh}:${mm}:00`,
              date: dateISO,
            },
          })
          bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
          fetchDailyEvents(dateISO)
          draggingTaskIdRef.current = null
          return
        }

        // ③ 영역 밖: 취소
        draggingTaskIdRef.current = null
      })
    }

    bus.on('xdrag:drop', onDrop)
    return () => bus.off('xdrag:drop', onDrop)
  }, [anchorDate, fetchDailyEvents, gridScrollY, taskBoxRect, gridRect])
  const popupTaskMemo = useMemo(() => taskPopupTask, [taskPopupTask])

  const handleDeleteTask = async () => {
    if (!taskPopupId) return

    Alert.alert('삭제', '이 테스크를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(taskPopupId)

            // 캘린더 쪽에 변경 알리기
            bus.emit('calendar:mutated', {
              op: 'delete',
              item: { id: taskPopupId, date: anchorDate },
            })
            bus.emit('calendar:invalidate', {
              ym: anchorDate.slice(0, 7),
            })

            // 일간뷰 즉시 새로고침
            await fetchDailyEvents(anchorDate)

            // 팝업 닫기 + 상태 정리
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[S.screen, swipeStyle]}>

            <DayTaskBox
            spanEvents={spanEvents}
            checks={checks}
            anchorDate={anchorDate}
            openEventDetail={openEventDetail}
            openTaskPopupFromApi={openTaskPopupFromApi}
            toggleCheck={toggleCheck}
            boxScrollRef={boxScrollRef}
            onScroll={onScroll}
            onContentSizeChange={onContentSizeChange}
            showScrollbar={showScrollbar}
            wrapH={wrapH}
            contentH={contentH}
            thumbTop={thumbTop}
            thumbH={thumbH}
            styles={S}
            onLayoutWrap={onLayoutWrap}
            measureLayouts={measureLayouts}
            />

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
              </View>

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

                // 반복 일정이면 DraggableFixedEvent 사용
                if (evt.isRepeat) {
                  return (
                    <DraggableFixedEvent
                      key={evt.id}
                      id={evt.id}
                      title={evt.title}
                      place={getLabelName(evt.labels?.[0])}
                      startMin={startMin}
                      endMin={endMin}
                      color={`#${evt.colorKey}`}
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
  color={`#${evt.colorKey}`}
  anchorDate={anchorDate}
  isRepeat={!!evt.isRepeat}
  _column={evt._column}        
  _totalColumns={evt._totalColumns} 
  onPress={() => openEventDetail(evt)}
/>
                )
              })}

              <DayTaskLayer
  taskGroups={taskGroups}
  anchorDate={anchorDate}
  events={events}
  openGroupIndex={openGroupIndex}
  setOpenGroupIndex={setOpenGroupIndex}
  openTaskPopupFromApi={openTaskPopupFromApi}
  setIsDraggingTask={setIsDraggingTask}
/>


             {/* ⭐ 펼쳐지는 상세 UI는 map 밖에서 단 한 번만 렌더 */}
              {openGroupIndex !== null &&
                (() => {
                  const group = taskGroups[openGroupIndex]
                  if (!group) return null
                  const { tasks: list, startMin } = group

                  return (
                    <View
                      style={{
                        position: 'absolute',
                        top: startMin * PIXELS_PER_MIN + 52,
                        left: 50 + 18,
                        right: 18,
                        backgroundColor: '#FFF',
                        borderRadius: 10,
                        borderColor: '#B3B3B3',
                        borderWidth: 0.3,
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        zIndex: 500,
                      }}
                    >
                      {list.map((task) => (
                        <Pressable
                          key={task.id}
                          onPress={() => openTaskPopupFromApi(task.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 18,
                          }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderWidth: 2,
                              borderRadius: 2,
                              borderColor: '#333',
                              marginRight: 14,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#FFF', // ⭐ 추가
                            }}
                          >
                            {task.completed && (
                              <Text style={{ fontSize: 12, color: '#333' }}>✓</Text>
                            )}
                          </View>

                          <Text style={{ fontSize: 14, color: '#000' }}>
                            {task.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                })()}
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
                  fieldsToClear,
                })

                bus.emit('calendar:mutated', {
                  op: 'update',
                  item: { id: taskPopupId, date: targetDate },
                })
              } else {
                // 새 테스크 생성 로직
                const newTask = await createTask({
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  date: targetDate,
                })
                
                const newId = newTask?.id

                bus.emit('calendar:mutated', {
                  op: 'create',
                  item: { id: newId, date: targetDate },
                })
              }

              // 💥 DayView 화면 즉시 갱신
              await fetchDailyEvents(anchorDate)

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
          initial={eventPopupData ?? undefined}
          mode={eventPopupMode}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            fetchDailyEvents(anchorDate) // 일정 새로 반영
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
      await createEvent(payload)
      await fetchDailyEvents(anchorDate)
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err) {
      console.error(err)
    }
  }}

  // ✔ 전체 저장 → 슬라이더 내부에서 이미 저장 처리함
  onSaveAll={async () => {
    await fetchDailyEvents(anchorDate)
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 5,
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
    height: 13, // 와 그리드 사이 간격
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
