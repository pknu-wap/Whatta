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
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import type { EventItem } from '@/api/event_api'
import { useLabelFilter } from '@/providers/LabelFilterProvider'

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
  (error) => Promise.reject(error),
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
  },
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
const SCREEN_WIDTH = Dimensions.get('window').width
const TIME_COL_WIDTH = 50 // 시간 텍스트 공간
const PADDING_LEFT = 18 // 왼쪽 여백
const PADDING_RIGHT = 18 // 오른쪽 여백
const GHOST_WIDTH = SCREEN_WIDTH - (TIME_COL_WIDTH + PADDING_LEFT) - PADDING_RIGHT

export default function DayView() {
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
  const [checks, setChecks] = useState(INITIAL_CHECKS)
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([])
  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')

  async function openEventDetail(id: string) {
    const res = await http.get(`/event/${id}`)
    setEventPopupData(res.data.data)
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

  const [tasks, setTasks] = useState<any[]>([])
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

  const taskBoxRef = useRef<View>(null)
  const gridWrapRef = useRef<View>(null)
  const [taskBoxTop, setTaskBoxTop] = useState(0)
  const [gridTop, setGridTop] = useState(0)
  const [gridScrollY, setGridScrollY] = useState(0)
  const draggingTaskIdRef = useRef<string | null>(null)
  const dragReadyRef = useRef(false)
  const draggingKindRef = useRef<'task' | 'event' | null>(null)

  const [taskBoxRect, setTaskBoxRect] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  const [gridRect, setGridRect] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
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
      draggingKindRef.current = null
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

  // 라벨
  const [labelList, setLabelList] = useState([])
  const fetchLabels = async () => {
    try {
      const res = await http.get('/user/setting/label')
      const labels = res.data?.data?.labels ?? []
      setLabelList(labels)
    } catch (err) {
      console.error('❌ 라벨 조회 실패:', err)
    }
  }

  useEffect(() => {
    fetchLabels()
  }, [])

  // Task 팝업 상태
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [popupVisible, setPopupVisible] = useState(false)

  // Task 상세 조회
  async function fetchTaskDetail(taskId: string) {
    const res = await http.get(`/task/${taskId}`)
    return res.data.data
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
      const res = await http.get(`/task/${taskId}`)
      const data = res.data?.data
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
      })

      setTaskPopupVisible(true)
    } catch (e) {
      console.warn('task detail load error', e)
      Alert.alert('오류', '테스크 정보를 가져오지 못했습니다.')
    }
  }

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
      labels: [],
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
  const { items: filterLabels } = useLabelFilter()
  const enabledLabelIds = filterLabels.filter((l) => l.enabled).map((l) => l.id)

  const fetchDailyEvents = useCallback(
    async (dateISO: string) => {
      try {
        const res = await http.get('/calendar/daily', { params: { date: dateISO } })
        const data = res.data.data

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
            completed: t.completed ?? false,
            labels: t.labels ?? [],
          })),
          ...floating.map((t: any) => ({
            id: t.id,
            title: t.title,
            completed: t.completed ?? false,
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
        setEvents(timelineEvents.filter(filterEvent))
        setSpanEvents(span.filter(filterEvent))
        setTasks(timedTasks.filter(filterTask))
        setChecks(checksAll.filter(filterTask))
      } catch (err) {
        console.error('❌ 일간 일정 불러오기 실패:', err)
        alert('일간 일정 불러오기 실패')
      }
    },
    [enabledLabelIds],
  )
  useEffect(() => {
    fetchDailyEvents(anchorDate)
  }, [enabledLabelIds])

  const measureLayouts = useCallback(() => {
    taskBoxRef.current?.measureInWindow((px, py, w, h) => {
      setTaskBoxRect({
        left: px,
        top: py,
        right: px + w,
        bottom: py + h,
      })
    })

    gridWrapRef.current?.measureInWindow((px, py, w, h) => {
      setGridRect({
        left: px,
        top: py,
        right: px + w,
        bottom: py + h,
      })
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
  const checksRef = useRef(checks)
  /* 스크롤바 길이 계산 */
  function thumbH(visibleH: number, contentH: number) {
    const minH = 18
    const h = (visibleH * visibleH) / Math.max(contentH, 1)
    return Math.max(minH, Math.min(h, visibleH))
  }

  useEffect(() => {
    checksRef.current = checks
  }, [checks])

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

    const nextDone = !current.completed

    // UI 즉시 변경
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: nextDone } : c)),
    )

    // 서버에 보낼 값도 nextDone 사용
    try {
      await http.patch(`/task/${id}`, {
        completed: nextDone,
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id },
      })
    } catch (err) {
      console.error('❌ 테스크 상태 업데이트 실패:', err)
    }
  }

  useEffect(() => {
    const onStart = ({ task, event }: any) => {
      if (task?.id) {
        draggingTaskIdRef.current = task.id
        draggingKindRef.current = 'task'
      } else if (event?.id) {
        draggingTaskIdRef.current = event.id
        draggingKindRef.current = 'event'
      } else {
        draggingTaskIdRef.current = null
        draggingKindRef.current = null
      }
    }

    bus.on('xdrag:start', onStart)
    return () => bus.off('xdrag:start', onStart)
  }, [])

  useEffect(() => {
    const onDrop = async ({ x, y, id: droppedId, kind: droppedKind }: any) => {
      console.log('DROP EVENT', { x, y, droppedId, droppedKind })

      const id = droppedId as string
      const kind = droppedKind as 'task' | 'event'
      console.log('[onDrop] STEP 1 - id/kind', id, kind)
      console.log('[onDrop] dragReadyRef.current =', dragReadyRef.current)

      if (!id || !kind) {
        console.log('[onDrop] ❌ no id or kind, return')
        return
      }

      if (!id || !kind) return
      measureLayouts()
      requestAnimationFrame(async () => {
        const dateISO = anchorDateRef.current
        const taskBox = taskBoxRectRef.current
        const gridBox = gridRectRef.current
        const scrollY = gridScrollYRef.current
        console.log('[onDrop] rects', { taskBox, gridBox, scrollY })

        const within = (r: any, px: number, py: number) =>
          px >= r.left && px <= r.right && py >= r.top && py <= r.bottom

        // ① 상단 박스에 다시 드롭한 경우
        if (within(taskBox, x, y)) {
          if (kind === 'task') {
            await http.patch(`/task/${id}`, {
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
          }
          return
        }
        // ② 시간 그리드로 드롭한 경우
        if (within(gridBox, x, y)) {
          const innerY = y - gridBox.top

          const minRaw = innerY / PIXELS_PER_MIN
          const minSnap = Math.round(minRaw / 5) * 5
          const hh = String(Math.floor(minSnap / 60)).padStart(2, '0')
          const mm = String(minSnap % 60).padStart(2, '0')

          if (kind === 'task') {
            await http.patch(`/task/${id}`, {
              placementDate: dateISO,
              placementTime: `${hh}:${mm}:00`,
              date: dateISO,
            })

            const src = checksRef.current.find((c: any) => c.id === id)
            const startHour = minSnap / 60

            setChecks((prev) => prev.filter((c: any) => c.id !== id))

            setTasks((prev) => {
              const base = {
                id,
                title: src?.title ?? '',
                placementDate: dateISO,
                placementTime: `${hh}:${mm}:00`,
                completed: src?.completed ?? false,
                labels: src?.labels ?? [],
              }

              const exists = prev.some((t: any) => t.id === id)
              if (exists) {
                return prev.map((t: any) => (t.id === id ? { ...t, ...base } : t))
              }
              return [...prev, base]
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
          } else if (kind === 'event') {
            console.log('[onDrop] ▶ EVENT PATCH 준비', id, `${hh}:${mm}:00`)
            const span = spanEvents.find((e) => e.id === id)
            const durationMin = (() => {
              if (span && span.clippedStartTime && span.clippedEndTime) {
                const [sh, sm] = span.clippedStartTime.split(':').map(Number)
                const [eh, em] = span.clippedEndTime.split(':').map(Number)
                return Math.max(5, eh * 60 + em - (sh * 60 + sm))
              }
              return 60
            })()

            // 1. 드롭된 y좌표 → 분(minute) 변환
            const fmt = (n: number) => String(n).padStart(2, '0')

            const startTotal = minSnap
            const endTotal = minSnap + durationMin

            const sH = Math.floor(startTotal / 60)
            const sM = startTotal % 60
            const eH = Math.floor(endTotal / 60)
            const eM = endTotal % 60

            const startTimeStr = `${fmt(sH)}:${fmt(sM)}:00`
            const endTimeStr = `${fmt(eH)}:${fmt(eM)}:00`
            console.log('[onDrop] 🔥 EVENT PATCH 호출 직전', id, startTimeStr, endTimeStr)

            // 2. UI 즉시 이동 (spanEvents → events)
            setSpanEvents((prev) => prev.filter((e) => e.id !== id))
            setEvents((prev) => [
              ...prev,
              {
                ...span,
                id,
                clippedStartTime: `${fmt(sH)}:${fmt(sM)}`,
                clippedEndTime: `${fmt(eH)}:${fmt(eM)}`,
                isSpan: false,
              },
            ])

            // 3. 서버 PATCH (한 번만)
            try {
              await http.patch(`/event/${id}`, {
                startDate: dateISO,
                endDate: dateISO,
                startTime: startTimeStr,
                endTime: endTimeStr,
              })

              bus.emit('calendar:mutated', {
                op: 'update',
                item: {
                  id,
                  isTask: false,
                  startDate: dateISO,
                  endDate: dateISO,
                  startTime: startTimeStr,
                  endTime: endTimeStr,
                },
              })

              // DayView 상단의 calendar:mutated 리스너가 알아서 1번만 호출해 줄 것
            } catch (err: any) {
              console.log(
                '[onDrop] ❌ EVENT PATCH 실패',
                err?.response?.status,
                err?.response?.data,
                err?.message,
              )
            }
            return
          }
          console.log('[onDrop] ❌ not in any known area, cancel')
          bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
          await fetchDailyEvents(dateISO)
          return
        }

        // ③ 영역 밖: 취소
        draggingTaskIdRef.current = null
        draggingKindRef.current = null
      })
    }

    bus.on('xdrag:drop', onDrop)
    return () => bus.off('xdrag:drop', onDrop)
  }, [anchorDate, fetchDailyEvents, gridScrollY, taskBoxRect, gridRect, spanEvents])

  type GhostState = null | {
    active: boolean
    kind: 'task' | 'event'
    id: string
    title: string
    completed?: boolean
    labels?: number[]
    color?: string
  }

  const [ghost, setGhost] = useState<GhostState>(null)

  const ghostX = useSharedValue(0)
  const ghostY = useSharedValue(0)
  const ghostActive = useSharedValue(0)
  const updateGhostPosition = useCallback((x: number, y: number) => {
    'worklet'
    if (!ghostActive.value) return
    ghostX.value = x
    ghostY.value = y
  }, [])

  // 고스트 시작/이동/삭제 헬퍼
  const startTaskGhost = (p: any) => {
    setGhost({
      active: true,
      kind: 'task',
      id: p.id,
      title: p.title,
      completed: p.completed,
      labels: p.labels,
    })
    ghostActive.value = 1
    ghostX.value = p.x
    ghostY.value = p.y
  }
  const startEventGhost = (p: any) => {
    setGhost({
      active: true,
      kind: 'event',
      id: p.id,
      title: p.title,
      color: p.color,
    })
    ghostActive.value = 1
    ghostX.value = p.x
    ghostY.value = p.y
  }

  const clearGhost = () => {
    setGhost(null)
    ghostActive.value = 0
  }

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    // 하단 TaskBox / Event 와 동일한 width
    width: GHOST_WIDTH,
    left: ghostX.value - GHOST_WIDTH / 2, // 손가락 기준 가운데 정렬
    top: ghostY.value - (ROW_H - 4) / 2, // 높이 절반만큼 올려서 중앙 정렬
  }))

  type CheckItem = {
    id: string
    title: string
    completed?: boolean
    labels?: number[]
  }

  type DraggableCheckRowProps = {
    item: CheckItem
    onStartGhost: (payload: {
      id: string
      title: string
      completed?: boolean
      labels?: number[]
      x: number
      y: number
    }) => void
    onMoveGhost: (x: number, y: number) => void
    onClearGhost: () => void
  }

  function DraggableCheckRow({
    item,
    onStartGhost,
    onMoveGhost,
    onClearGhost,
  }: DraggableCheckRowProps) {
    const triggerHaptic = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    const dragEnabled = useSharedValue(false)

    const notifyDragStart = (id: string) => {
      bus.emit('xdrag:start', { task: { id } })
      bus.emit('xdrag:ready')
    }

    const notifyDrop = (payload: { x: number; y: number; id: string }) => {
      bus.emit('xdrag:drop', { ...payload, kind: 'task' })
    }

    // 롱프레스: 고스트 생성 + 드래그 모드 활성화
    const hold = Gesture.LongPress()
      .minDuration(250) // 너무 짧으면 스크롤이랑 자주 충돌하니 250ms 정도로
      .maxDistance(2) // 롱프레스 중에 손가락이 조금 움직여도 유지되도록
      .onStart((e) => {
        dragEnabled.value = true
        runOnJS(triggerHaptic)()
        runOnJS(notifyDragStart)(item.id)

        runOnJS(onStartGhost)({
          id: item.id,
          title: item.title,
          completed: item.completed,
          labels: item.labels ?? [],
          x: e.absoluteX,
          y: e.absoluteY,
        })
      })
      .onEnd((_e) => {
        // 롱프레스가 끝났는데 팬 제스처가 안 따라온 경우 롤백
        if (dragEnabled.value) {
          dragEnabled.value = false
          runOnJS(onClearGhost)()
        }
      })
      .onFinalize(() => {
        // 어떤 이유로든 제스처가 종료되면 안전하게 초기화
        dragEnabled.value = false
        runOnJS(onClearGhost)()
      })

    // 팬: 롱프레스 이후에만 고스트 이동 + 드롭 처리
    const drag = Gesture.Pan()
      .onUpdate((e) => {
        // 롱프레스가 아직 안 됐으면 아무것도 하지 않음 → 스크롤만 동작
        if (!dragEnabled.value) return
        onMoveGhost(e.absoluteX, e.absoluteY)
      })
      .onEnd((e) => {
        if (!dragEnabled.value) return
        dragEnabled.value = false

        // 드롭 위치 알려주기
        runOnJS(notifyDrop)({
          x: e.absoluteX,
          y: e.absoluteY,
          id: item.id,
        })
        runOnJS(onClearGhost)()
      })
      .onFinalize(() => {
        // 제스처가 취소되었을 때도 고스트 정리
        dragEnabled.value = false
        runOnJS(onClearGhost)()
      })

    // 롱프레스 + 팬 동시 구성
    const composed = Gesture.Simultaneous(hold, drag)

    return (
      <GestureDetector gesture={composed}>
        <Animated.View style={S.checkRow}>
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => openTaskPopupFromApi(item.id)} // 상세 팝업 그대로 동작
          >
            {/* 체크박스 */}
            <Pressable
              onPress={() => toggleCheck(item.id)}
              style={S.checkboxWrap}
              hitSlop={10}
            >
              <View style={[S.checkbox, item.completed && S.checkboxOn]}>
                {item.completed && <Text style={S.checkmark}>✓</Text>}
              </View>
            </Pressable>

            <Text
              style={[S.checkText, item.completed && S.checkTextDone]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    )
  }

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
            //DELETE /task/{taskId}
            await http.delete(`/task/${taskPopupId}`)

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
        <View style={S.screen}>
          {/* ✅ 상단 테스크 박스 */}
          <FullBleed padH={12}>
            <View style={S.taskBoxWrap} ref={taskBoxRef} onLayout={measureLayouts}>
              <View
                style={S.taskBox}
                onLayout={(e) => {
                  onLayoutWrap(e)
                  measureLayouts()
                }}
              >
                <ScrollView
                  ref={boxScrollRef}
                  onScroll={onScroll}
                  onContentSizeChange={onContentSizeChange}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  contentContainerStyle={S.boxContent}
                  bounces={false}
                >
                  {spanEvents.map((t, i) => (
                    <DraggableEvent
                      key={t.id ?? i}
                      item={t}
                      currentDate={anchorDate}
                      onPress={() => openEventDetail(t.id)}
                      onStartGhost={(payload) => startEventGhost(payload)}
                      onMoveGhost={updateGhostPosition}
                      onClearGhost={() => clearGhost()}
                    />
                  ))}

                  {checks.map((c) => (
                    <DraggableCheckRow
                      key={c.id}
                      item={c}
                      onStartGhost={(payload) => startTaskGhost(payload)}
                      onMoveGhost={updateGhostPosition}
                      onClearGhost={() => clearGhost()}
                    />
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

              return (
                <DraggableFlexalbeEvent
                  key={evt.id}
                  id={evt.id}
                  title={evt.title}
                  place={`label ${evt.labels?.[0] != null ? String(evt.labels[0]) : ''}`}
                  startMin={startMin}
                  endMin={endMin}
                  color={`#${evt.colorKey}`}
                  anchorDate={anchorDate}
                  onPress={() => openEventDetail(evt.id)}
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
                  anchorDate={anchorDate}
                  placementDate={task.placementDate}
                  completed={task.completed ?? false}
                  onPress={() => openTaskPopupFromApi(task.id)}
                />
              )
            })}
          </ScrollView>
        </View>
        {ghost?.active && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={ghostStyle}>
              {ghost.kind === 'task' ? (
                <View
                  style={{
                    height: ROW_H - 4, // 높이 맞춤 (44px)
                    backgroundColor: '#FFFFFF80', // DraggableTaskBox와 동일한 투명도
                    borderWidth: 0.4,
                    borderColor: '#333333',
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    {ghost.completed ? (
                      <CheckOn width={18} height={18} />
                    ) : (
                      <CheckOff width={18} height={18} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: 12,
                      color: ghost.completed ? '#999' : '#000',
                      textDecorationLine: ghost.completed ? 'line-through' : 'none',
                    }}
                    numberOfLines={1}
                  >
                    {ghost.title}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    height: ROW_H - 2,
                    backgroundColor: ghost.color ?? '#B04FFF',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingTop: 10,
                    justifyContent: 'flex-start',
                  }}
                >
                  <Text
                    style={{
                      color: '#000000',
                      fontWeight: '600',
                      fontSize: 13,
                      lineHeight: 15,
                    }}
                  >
                    {ghost.title}
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
        )}
        <TaskDetailPopup
          visible={taskPopupVisible}
          mode={taskPopupMode}
          taskId={taskPopupId ?? undefined}
          initialTask={popupTaskMemo}
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
              placementDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            } else {
              fieldsToClear.push('placementDate')
            }

            // 시간
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
                // ✅ 기존 수정 로직
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
                  item: { id: taskPopupId, date: anchorDate },
                })
              } else {
                // 새 테스크 생성 로직
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
                  item: { id: newId, date: anchorDate },
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
          mode={eventPopupMode}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            fetchDailyEvents(anchorDate) // 일정 새로 반영
          }}
        />
      </ScreenWithSidebar>
    </GestureHandlerRootView>
  )
}

function DraggableFixedEvent() {
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
  placementDate?: string
  completed?: boolean
  anchorDate: string
  onPress?: () => void
}

function DraggableTaskBox({
  id,
  title,
  startHour,
  placementDate,
  completed: initialDone = false,
  anchorDate,
  onPress,
}: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)
  const [done, setDone] = useState(initialDone)
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  useEffect(() => {
    translateY.value = withSpring(startHour * 60 * PIXELS_PER_MIN)
  }, [startHour])

  const handleDrop = async (newTime: string) => {
    try {
      await http.patch(`/task/${id}`, {
        placementDate: anchorDate,
        placementTime: newTime,
        date: anchorDate,
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id, isTask: true, date: anchorDate },
      })
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err: any) {
      console.error('❌ 테스크 시간 이동 실패:', err.message)
    }
  }

  // 롱프레스 후에만 드래그 허용
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      const maxY = 23 * 60 * PIXELS_PER_MIN // 24시 직전까지만
      const nextY = translateY.value + e.changeY
      translateY.value = Math.max(0, Math.min(maxY, nextY))
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

      const fmt = (n: number) => String(n).padStart(2, '0')
      const newTime = `${fmt(hour)}:${fmt(min)}:00`

      runOnJS(handleDrop)(newTime)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
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
        {/* ✅ 체크박스 영역 */}
        <Pressable
          onPress={() => {
            const next = !done
            setDone(next)

            http
              .patch(`/task/${id}`, {
                completed: next,
              })
              .catch((err) => console.error('❌ 테스크 체크 상태 업데이트 실패:', err))
          }}
          style={{
            width: 18,
            height: 18,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={8}
        >
          {done ? (
            <CheckOn width={18} height={18} />
          ) : (
            <CheckOff width={18} height={18} />
          )}
        </Pressable>
        {/* 제목 / 팝업 영역 */}
        <Pressable onPress={onPress} style={{ flex: 1 }} hitSlop={8}>
          <Text
            numberOfLines={1}
            style={{
              color: done ? '#999' : '#000',
              fontWeight: 'bold',
              fontSize: 12,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            {title}
          </Text>
        </Pressable>

        <View></View>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableEventProps = {
  item: any
  currentDate: string
  onPress: () => void
  onStartGhost: (payload: {
    id: string
    title: string
    color?: string
    x: number
    y: number
  }) => void
  onMoveGhost: (x: number, y: number) => void
  onClearGhost: () => void
}

function DraggableEvent({
  item,
  currentDate,
  onPress,
  onStartGhost,
  onMoveGhost,
  onClearGhost,
}: DraggableEventProps) {
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }
  const notifyEventDragStart = (id: string) => {
    bus.emit('xdrag:start', { event: { id } })
    bus.emit('xdrag:ready')
  }
  const notifyDrop = (payload: { x: number; y: number; id: string }) => {
    bus.emit('xdrag:drop', { ...payload, kind: 'event' })
  }
  const dragEnabled = useSharedValue(false)

  // 시작/끝 날짜 계산 (기존 로직 유지)
  let start = ''
  let end = ''

  if (!item.startDate && !item.endDate && !item.startAt && !item.endAt) {
    start = currentDate
    end = currentDate
  } else if (item.startDate && item.endDate) {
    start = item.startDate
    end = item.endDate
  } else if (item.startAt && item.endAt) {
    start = item.startAt.slice(0, 10)
    end = item.endAt.slice(0, 10)
  }

  const isStart = currentDate === start
  const isEnd = currentDate === end

  const isMultiDaySpan = !!start && !!end && start !== end

  const raw = item.colorKey || item.color
  const base = raw ? (raw.startsWith('#') ? raw : `#${raw}`) : '#8B5CF6'
  const bg = `${base}26`

  // 기간 일정(여러 날 걸친 span)은 드래그 불가 → 그냥 칩만
  if (isMultiDaySpan) {
    return (
      <View style={[S.chip, { backgroundColor: bg }]}>
        {isStart && <View style={[S.chipBar, { left: 0, backgroundColor: base }]} />}
        {isEnd && <View style={[S.chipBar, { right: 0, backgroundColor: base }]} />}
        <Pressable onPress={onPress} style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={S.chipText} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      </View>
    )
  }

  // 단일 날짜 span만 드래그 허용
  const hold = Gesture.LongPress()
    .minDuration(200)
    .onStart((e) => {
      dragEnabled.value = true
      runOnJS(triggerHaptic)()
      runOnJS(notifyEventDragStart)(item.id)

      // 고스트 생성
      runOnJS(onStartGhost)({
        id: item.id,
        title: item.title,
        color: base,
        x: e.absoluteX,
        y: e.absoluteY,
      })
    })

  const drag = Gesture.Pan()
    .onUpdate((e) => {
      if (!dragEnabled.value) return
      // 고스트 위치 업데이트
      onMoveGhost(e.absoluteX, e.absoluteY)
      // runOnJS(onMoveGhost)(e.absoluteX, e.absoluteY)
      console.log('update - event Ghost', e.absoluteX, e.absoluteY)
    })
    .onEnd((e) => {
      if (dragEnabled.value) {
        dragEnabled.value = false // 드래그 종료
        runOnJS(notifyDrop)({
          x: e.absoluteX,
          y: e.absoluteY,
          id: item.id,
        })
        runOnJS(onClearGhost)()
      }
    })
    .onFinalize(() => {
      dragEnabled.value = false
      runOnJS(onClearGhost)()
    })

  const composed = Gesture.Simultaneous(hold, drag)

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[S.chip, { backgroundColor: bg }]}>
        {isStart && <View style={[S.chipBar, { left: 0, backgroundColor: base }]} />}
        {isEnd && <View style={[S.chipBar, { right: 0, backgroundColor: base }]} />}
        <Pressable onPress={onPress} style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={S.chipText} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
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
  onPress?: () => void
}

function DraggableFlexalbeEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
  onPress,
}: DraggableFlexalbeEventProps) {
  const durationMin = endMin - startMin
  const totalHeight = 24 * 60 * PIXELS_PER_MIN
  const rawHeight = durationMin * PIXELS_PER_MIN
  const height = rawHeight - 2
  const offsetY = 1

  // 절대 위치 기반 (테스크와 동일한 방식)
  const translateY = useSharedValue(startMin * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleDrop = useCallback(
    async (snappedY: number) => {
      draggingEventId = id
      try {
        // snappedY(픽셀) -> 분 단위로 변환
        const newStartMin = snappedY / PIXELS_PER_MIN
        const newEndMin = newStartMin + durationMin

        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(
            2,
            '0',
          )}:00`
        const dateISO = anchorDate

        await http.patch(`/event/${id}`, {
          startDate: dateISO,
          endDate: dateISO,
          startTime: fmt(newStartMin),
          endTime: fmt(newEndMin),
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            isTask: false,
            startDate: dateISO,
            endDate: dateISO,
            startTime: fmt(newStartMin),
            endTime: fmt(newEndMin),
          },
        })
      } catch (err: any) {
        console.error('❌ 이벤트 시간 이동 실패:', err.message)
      }
    },
    [id, durationMin, anchorDate],
  )

  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      // 손가락 따라 자유롭게 이동 (수평 살짝 움직이는 것도 허용)
      const nextY = translateY.value + e.changeY
      const minTop = 0
      const maxTop = totalHeight - rawHeight

      translateY.value = Math.max(minTop, Math.min(maxTop, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const minTop = 0
      const maxTop = totalHeight - rawHeight

      // 스냅 + 영역 클램프
      let snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      snappedY = Math.max(minTop, Math.min(maxTop, snappedY))

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      // 서버에 최종 시간 반영
      runOnJS(handleDrop)(snappedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    top: translateY.value + offsetY,
    transform: [{ translateX: translateX.value }],
  }))

  const backgroundColor = color.startsWith('#') ? color : `#${color}`

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
        <Pressable onPress={onPress} style={{ flex: 1 }} hitSlop={10}>
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
        </Pressable>
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
