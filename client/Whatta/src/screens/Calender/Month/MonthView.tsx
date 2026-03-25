import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { MonthlyDay } from '@/api/calendar'
import { ScheduleData } from '@/api/adapter'
import { bus } from '@/lib/eventBus'
import { http } from '@/lib/http'
import { fetchTasksForMonth, getEvent } from '@/api/event_api'
import { useIsFocused } from '@react-navigation/native'
import MonthDetailPopup from '@/screens/More/MonthDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import type { EventItem } from '@/api/event_api'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import AddImageSheet from '@/screens/More/AddImageSheet'
import OCREventCardSlider from '@/screens/More/OcrEventCardSlider'
import { S } from './S'
import { buildLaneMap, getDisplayItems, getCalendarDates, CalendarDateItem } from './MonthView.utils'
import { useOCR } from '@/hooks/useOCR'

import OcrSplash from '@/screens/More/OcrSplash'


import { today } from './dateUtils'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'
import { cellWidth } from './S'
import { normalizeScheduleColorKey, resolveScheduleColor } from '@/styles/scheduleColorSets'
import { getTask } from '@/api/task'
import { invalidateDayCache } from '@/screens/Calender/Day/eventUtils'



const isSpan = (s: ScheduleData) => !!(s.multiDayStart && s.multiDayEnd)
type UISchedule = ScheduleData & { colorKey?: string }
type MonthCacheSnapshot = {
  days: MonthlyDay[]
  schedules: UISchedule[]
}
const MONTH_ITEM_WIDTH = cellWidth
const MONTH_CARD_WIDTH = Math.min(56, Math.max(0, MONTH_ITEM_WIDTH - 2))
const MONTH_ITEM_HEIGHT = 24
const MONTH_ITEM_GAP = 2
const MONTH_ITEM_SLOT_HEIGHT = MONTH_ITEM_HEIGHT + MONTH_ITEM_GAP
const MONTH_WEEK_MIN_HEIGHT = 120
const MONTH_DATE_HEADER_HEIGHT = 32
const HOLIDAY_HEADER_BASE_OFFSET = 13
const HOLIDAY_EVENT_OFFSET = Math.max(
  0,
  MONTH_ITEM_SLOT_HEIGHT - HOLIDAY_HEADER_BASE_OFFSET,
)
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const monthDataCache = new Map<string, MonthCacheSnapshot>()

const getOccurrenceDedupKey = (item: UISchedule) => {
  const prefix = item.isTask ? 'TASK' : 'EVENT'
  const occurrenceKey =
    item.multiDayStart && item.multiDayEnd
      ? `${item.multiDayStart}_${item.multiDayEnd}`
      : item.date
  return `${prefix}-${item.id}-${occurrenceKey}`
}

const dedupeSchedules = (items: UISchedule[]) => {
  const dedup = new Map<string, UISchedule>()
  for (const item of items) {
    const key = getOccurrenceDedupKey(item)
    if (!dedup.has(key)) dedup.set(key, item)
  }
  return Array.from(dedup.values())
}

const addDaysToISO = (iso: string, delta: number) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const next = new Date(y, m - 1, d + delta)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
    next.getDate(),
  ).padStart(2, '0')}`
}


type MonthViewProps = {
  active?: boolean
  initialDateISO?: string | null
}

export default function MonthView({ active = true, initialDateISO }: MonthViewProps) {
  const isScreenFocused = useIsFocused()
  const [imagePopupVisible, setImagePopupVisible] = useState(false)
  const [, setColorSetVersion] = useState(0)

  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')
  const [eventPopupCreateType, setEventPopupCreateType] = useState<'event' | 'task'>('event')

  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')
  const [monthDetailDateChanging, setMonthDetailDateChanging] = useState(false)

    useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Month') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  useEffect(() => {
      const h = (payload?: { source?: string; createType?: 'event' | 'task' }) => {
        if (payload?.source !== 'Month') return
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

  // 캘린더 동기화 hooks
  const resolvedInitialDateISO = initialDateISO && initialDateISO.length >= 10
    ? initialDateISO.slice(0, 10)
    : today()
  const initialYM = resolvedInitialDateISO.slice(0, 7)
  const initialCache = monthDataCache.get(initialYM)
  const [focusedDateISO, setFocusedDateISO] = useState<string>(resolvedInitialDateISO)
  const [ym, setYm] = useState<string>(() => {
    return initialYM
  })

  useEffect(() => {
    const onSetDate = (iso: string) => {
      const nextYM = toYM(iso)
      setFocusedDateISO(iso)
      setYm((prev) => (prev === nextYM ? prev : nextYM))
    }
    bus.on('calendar:set-date', onSetDate)
    return () => bus.off('calendar:set-date', onSetDate)
  }, [])

  useEffect(() => {
    const onNavigate = (iso?: string) => {
      if (typeof iso !== 'string' || iso.length < 10) return
      const nextISO = iso.slice(0, 10)
      setPopupVisible(false)
      requestAnimationFrame(() => {
        bus.emit('calendar:set-date', nextISO)
      })

      void (async () => {
        try {
          await refreshSelectedDayData(nextISO)
          setTimeout(() => {
            setPopupVisible(true)
          }, 300)
        } catch (err) {
          console.warn('[MonthView] navigate detail reopen failed', err)
        }
      })()
    }

    bus.on('month:detail:navigate', onNavigate)
    return () => bus.off('month:detail:navigate', onNavigate)
  }, [refreshSelectedDayData])

  useEffect(() => {
    if (!active || !isScreenFocused) return
      bus.emit('calendar:state', { date: focusedDateISO, mode: 'month' })
  }, [active, isScreenFocused, ym, focusedDateISO])


  // 데이터 fetch
  const fetchFresh = useCallback(
    async (targetYM: string) => {
      try {
        const fresh = await fetchMonthlyApi(targetYM)
        const schedulesFromMonth = flattenMonthly(fresh)
        let tasksThisMonth: UISchedule[] = []
        try {
          tasksThisMonth = await fetchTasksForMonth(targetYM)
        } catch (err) {
          console.warn('[MonthView] fetchFresh: fetchTasksForMonth 실패, 일정만 갱신합니다.', err)
        }

        const colorById = new Map<string, string | undefined>()
        ;(fresh.spanEvents ?? []).forEach((e: any) => {
          colorById.set(String(e.id), e.colorKey)
        })
        ;(fresh.days ?? []).forEach((d: any) => {
          ;(d.events ?? []).forEach((ev: any) => {
            colorById.set(String(ev.id), ev.colorKey)
          })
        })

       const mergedRaw: UISchedule[] = [...schedulesFromMonth, ...tasksThisMonth].map( 
         (it) => ({
           ...it,
           colorKey: (it as any).colorKey ?? colorById.get(String(it.id)) ?? undefined,
         }),
       ) 

       const merged = dedupeSchedules(mergedRaw)

        if (targetYM === ym) {
          monthDataCache.set(targetYM, {
            days: fresh.days,
            schedules: merged,
          })
          setDays(fresh.days)
          setServerSchedules(merged)
        }
      } catch (err) {
        console.warn('[MonthView] fetchFresh 실패', err)
      }
    },
    [ym],
  )

  useEffect(() => {
    const onInvalidate = (payload?: { ym?: string }) => {
      const dirtyYM = payload?.ym
      const safeYM =
        typeof dirtyYM === 'string' && /^\d{4}-\d{2}$/.test(dirtyYM)
          ? dirtyYM
          : ym
      void fetchFresh(safeYM)
    }
    bus.on('calendar:invalidate', onInvalidate)
    return () => bus.off('calendar:invalidate', onInvalidate)
  }, [fetchFresh, ym])

  const isFirstFocusRef = useRef(true)
  useEffect(() => {
      if (!active || !isScreenFocused) return
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false
        return
      }
      void fetchFresh(ym)
  }, [active, isScreenFocused, fetchFresh, ym])

  useEffect(() => {
    const onMutated = (_payload?: { op?: 'create' | 'update' | 'delete'; item?: any }) => {
      void fetchFresh(ym)
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [ym, fetchFresh])

const {
  ocrSplashVisible,
  ocrModalVisible,
  ocrEvents,
  setOcrModalVisible,
  sendToOCR,
} = useOCR()

  const laneMapRef = useRef<Map<string, number>>(new Map())

  const pad = (n: number) => String(n).padStart(2, '0')
  const toYM = (src: string | Date): string => {
    const d = typeof src === 'string' ? new Date(src) : src
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }

  const parseYM = (s: string) => {
    const [y, m] = s.split('-').map(Number)
    return { year: y, monthIndex: m - 1 }
  }


  const [popupVisible, setPopupVisible] = useState(false)
  const [selectedDayData, setSelectedDayData] = useState<any>(null)

  useEffect(() => {
    const onResetView = () => {
      setPopupVisible(false)
      setEventPopupVisible(false)
      setTaskPopupVisible(false)
      setImagePopupVisible(false)
      setOcrModalVisible(false)
    }

    bus.on('calendar:reset-view', onResetView)
    return () => bus.off('calendar:reset-view', onResetView)
  }, [setImagePopupVisible, setOcrModalVisible])

  const { items: filterLabels } = useLabelFilter()
  const labelTitleById = useMemo(() => {
    const map = new Map<string, string>()
    ;(filterLabels ?? []).forEach((label) => {
      map.set(String(label.id), label.title)
    })
    return map
  }, [filterLabels])

  // "할 일" 라벨 id 찾기 (없으면 null)
  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일')
    return found ? Number(found.id) : null
  }, [filterLabels])

  const refreshSelectedDayData = useCallback(
    async (dateISO?: string | null) => {
      const targetISO = String(dateISO ?? '').slice(0, 10)
      if (!targetISO) return

      try {
        const nextYM = toYM(targetISO)
        const fresh = await fetchMonthlyApi(nextYM)
        let tasksThisMonth: UISchedule[] = []
        try {
          tasksThisMonth = await fetchTasksForMonth(nextYM)
        } catch (err) {
          console.warn('[MonthView] refreshSelectedDayData: fetchTasksForMonth 실패', err)
        }

        const monthlySchedules = flattenMonthly(fresh)
        const merged = dedupeSchedules([...monthlySchedules, ...tasksThisMonth])
        const nextCalendarDates = getCalendarDates(
          Number(targetISO.slice(0, 4)),
          Number(targetISO.slice(5, 7)) - 1,
          new Date(targetISO),
          merged,
          buildLaneMap(merged.filter(isSpan)),
        )
        const targetDateItem = nextCalendarDates.find((item) => {
          const iso = `${item.fullDate.getFullYear()}-${String(item.fullDate.getMonth() + 1).padStart(2, '0')}-${String(
            item.fullDate.getDate(),
          ).padStart(2, '0')}`
          return iso === targetISO
        })

        const rawDay = (fresh.days ?? []).find((day) => {
          const dayISO = (day.date ?? (day as any).targetDate ?? '').slice(0, 10)
          return dayISO === targetISO
        })

        if (!targetDateItem || !rawDay) return

        monthDataCache.set(nextYM, {
          days: fresh.days,
          schedules: merged,
        })
        if (nextYM === ym) {
          setDays(fresh.days)
          setServerSchedules(merged)
        }

        setSelectedDayData(buildSelectedDayDataFromDateItem(targetDateItem, rawDay))
      } catch (err) {
        console.warn('[MonthView] refreshSelectedDayData failed', err)
      }
    },
    [ym, setDays, setServerSchedules],
  )

  const changeMonthDetailDate = useCallback(
    async (delta: -1 | 1) => {
      if (monthDetailDateChanging) return
      const currentISO = String(selectedDayData?.dateISO ?? '').slice(0, 10)
      if (!currentISO) return

      const nextISO = addDaysToISO(currentISO, delta)
      setMonthDetailDateChanging(true)
      setFocusedDateISO(nextISO)
      setYm(toYM(nextISO))
      bus.emit('calendar:set-date', nextISO)

      try {
        await refreshSelectedDayData(nextISO)
      } finally {
        setMonthDetailDateChanging(false)
      }
    },
    [monthDetailDateChanging, refreshSelectedDayData, selectedDayData?.dateISO],
  )

  const openCreateTaskPopup = useCallback(
    (source?: string) => {
      setTaskPopupMode('create')
      setTaskPopupId(null)

      const placementDate = source === 'Month' ? today() : null
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
      if (payload?.source !== 'Month') return
      openCreateTaskPopup(payload.source)
    }

    bus.on('task:create', handler)
    return () => bus.off('task:create', handler)
  }, [openCreateTaskPopup])

  const openEventDetail = useCallback(async (eventId: string, occDate?: string) => {
    try {
      const data = await getEvent(eventId)
      const detail = data?.data
      if (!detail) return

      setEventPopupMode('edit')
      setEventPopupCreateType('event')
      setEventPopupData(
        occDate
          ? {
              ...detail,
              startDate: occDate,
            }
          : detail,
      )
      setEventPopupVisible(true)
    } catch (e) {
      console.warn('event detail load error', e)
      Alert.alert('오류', '일정 정보를 가져오지 못했습니다.')
    }
  }, [])

  const openTaskPopupFromApi = useCallback(async (taskId: string) => {
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
  }, [])


  // 월 이동 + 스와이프에서 호출
  const goMonth = useCallback(
    (diff: number) => {
      // 1. 현재 잡고 있는 날짜 (예: 2025-10-27)
      const [y, m] = focusedDateISO.split('-').map(Number)

      // 2. 달 이동
      const targetDate = new Date(y, m - 1 + diff, 1)

      // 3. 월말 보정
      const targetMonthIndex = (m - 1 + diff + 12) % 12
      if (targetDate.getMonth() !== targetMonthIndex) {
        targetDate.setDate(0) // 전달 마지막 날로 설정
      }

      // 4. ISO 변환
      const nextISO = `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1,
      ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

      bus.emit('calendar:set-date', nextISO)
    },
    [focusedDateISO],
  )

  const swipeTranslateX = useSharedValue(0)
  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }))

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
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
        .onEnd((e) => {
          'worklet'
          const cur = swipeTranslateX.value
          const th = SCREEN_W * 0.06

          if (cur > th) {
            swipeTranslateX.value = withTiming(
              SCREEN_W * 0.15,
              { duration: 120 },
              () => {
                runOnJS(goMonth)(-1)
                swipeTranslateX.value = withTiming(0, { duration: 160 })
              },
            )
          } else if (cur < -th) {
            swipeTranslateX.value = withTiming(
              -SCREEN_W * 0.15,
              { duration: 120 },
              () => {
                runOnJS(goMonth)(+1)
                swipeTranslateX.value = withTiming(0, { duration: 160 })
              },
            )
          } else {
            swipeTranslateX.value = withTiming(0, { duration: 150 })
          }
        }),
    [goMonth],
  )

  const { year, monthIndex } = useMemo(() => parseYM(ym), [ym])

  const [calendarDates, setCalendarDates] = useState<CalendarDateItem[]>([])
  const [days, setDays] = useState<MonthlyDay[]>(() => initialCache?.days ?? [])
  const [loading, setLoading] = useState(!initialCache)
  const [hasHydratedMonth, setHasHydratedMonth] = useState(!!initialCache)
  // Memo로 캐싱
  const weeks = useMemo(() => {
    const result: CalendarDateItem[][] = []
    for(let i=0; i< calendarDates.length; i+= 7){
      result.push(calendarDates.slice(i, i+7))
    }
    // 현재 연/월을 직접 기준으로 해당 달이 없는 주는 제거
    return result.filter((week) =>
      week.some(
        (d) => d.fullDate.getFullYear() === year && d.fullDate.getMonth() === monthIndex,
      ),
    )
  }, [calendarDates, year, monthIndex])

// 주간 변경될 때만 계산
const displayItemsByWeek = useMemo(() => {
  return weeks.map((week) =>
    week.map((dateItem) =>
      getDisplayItems(dateItem.schedules, dateItem.tasks)
    )
  )
}, [weeks])

const holidayIsoByWeek = useMemo(() => {
  return weeks.map((week) => {
    const set = new Set<string>()
    week.forEach((d) => {
      if (!d.holidayName) return
      const iso = `${d.fullDate.getFullYear()}-${String(d.fullDate.getMonth() + 1).padStart(2, '0')}-${String(
        d.fullDate.getDate(),
      ).padStart(2, '0')}`
      set.add(iso)
    })
    return set
  })
}, [weeks])

  const weekRowHeights = useMemo(() => {
    return weeks.map((week, weekIndex) => {
      let maxContentRows = 0

      week.forEach((_, dayIndex) => {
        const itemsToRender = displayItemsByWeek[weekIndex]?.[dayIndex] ?? []
        const scheduleItems = itemsToRender.filter(
          (it) => !(it as any).isTaskSummary && !(it as any).isTask,
        ) as ScheduleData[]
        const taskItems = itemsToRender.filter(
          (it) => !(it as any).isTaskSummary && !!(it as any).isTask,
        ) as ScheduleData[]
        const taskSummary = itemsToRender.find((it) => (it as any).isTaskSummary)

        const scheduleMaxLane = Math.max(-1, ...scheduleItems.map((it: any) => it.__lane ?? -1))
        const laneCount = Math.max(0, scheduleMaxLane + 1)
        const taskCount = taskItems.length + (taskSummary ? 1 : 0)
        const needsHolidayReserve =
          !week[dayIndex]?.holidayName &&
          scheduleItems.some((it) => {
            const schedule = it as UISchedule
            if (!schedule.multiDayStart || !schedule.multiDayEnd) return false

            return Array.from(holidayIsoByWeek[weekIndex] ?? []).some(
              (holidayISO) =>
                schedule.multiDayStart! <= holidayISO &&
                holidayISO <= schedule.multiDayEnd!,
            )
          })

        const reserveRows = needsHolidayReserve ? 1 : 0
        maxContentRows = Math.max(maxContentRows, laneCount + taskCount + reserveRows)
      })

      return Math.max(
        MONTH_WEEK_MIN_HEIGHT,
        MONTH_DATE_HEADER_HEIGHT + maxContentRows * MONTH_ITEM_SLOT_HEIGHT + 8,
      )
    })
  }, [weeks, displayItemsByWeek, holidayIsoByWeek])


  type ExtendedScheduleData = ScheduleData & {
    memo?: string
    place?: string
    time?: string
  }

  type ExtendedScheduleDataWithColor = ExtendedScheduleData & {
    colorKey?: string
  }

  function buildSelectedDayDataFromDateItem(dateItem: CalendarDateItem, rawDay: any) {
    const fullDate = dateItem.fullDate
    const isoDate = `${fullDate.getFullYear()}-${String(fullDate.getMonth() + 1).padStart(2, '0')}-${String(fullDate.getDate()).padStart(2, '0')}`
    const [y, m, day] = isoDate.split('-').map(Number)
    const dt = new Date(y, m - 1, day)
    const rawEvents: any[] = rawDay?.events ?? []
    const rawTasks: any[] = rawDay?.tasks ?? []
    const allDaySingles = rawEvents.filter(
      (ev) => ev.startTime == null && ev.endTime == null,
    )
    const allDaySingleIds = new Set(allDaySingles.map((ev) => String(ev.id)))
    const timedEventIds = new Set(
      rawEvents
        .filter((ev) => ev.startTime != null || ev.endTime != null)
        .map((ev) => String(ev.id)),
    )
    const timedTaskIds = new Set(
      rawTasks
        .filter((t) => t.placementTime != null && String(t.placementTime).trim() !== '')
        .map((t) => String(t.id)),
    )
    const rawEventById = new Map(rawEvents.map((ev) => [String(ev.id), ev]))
    const rawTaskById = new Map(rawTasks.map((t) => [String(t.id), t]))
    const pickLabelText = (raw: any): string => {
      const labels = Array.isArray(raw?.labels) ? raw.labels : []
      if (labels.length === 0) return '라벨 없음'
      const first = labels[0]
      if (typeof first === 'string') {
        return labelTitleById.get(first) ?? first
      }
      if (typeof first === 'number') {
        return labelTitleById.get(String(first)) ?? String(first)
      }
      if (first && typeof first === 'object') {
        const directTitle = String(first.title ?? first.name ?? first.labelName ?? '')
        if (directTitle) return directTitle
        const fallbackId = first.id ?? first.labelId
        return fallbackId != null
          ? labelTitleById.get(String(fallbackId)) ?? '라벨 없음'
          : '라벨 없음'
      }
      return '라벨 없음'
    }

    const daySchedules = (dateItem.schedules as ExtendedScheduleDataWithColor[]).filter(
      (s) => !s.isTask,
    )
    const isRealSpan = (s: ExtendedScheduleDataWithColor) =>
      !!s.multiDayStart && !!s.multiDayEnd && s.multiDayStart !== s.multiDayEnd
    const multiDaySchedules = daySchedules.filter((s) => isRealSpan(s))
    const singleDaySchedules = daySchedules.filter((s) => !isRealSpan(s))
    const hasTime = (x: any) =>
      !!(x?.time && String(x.time).trim().length > 0) || (!!x?.startAt && !!x?.endAt)

    const untimedSchedules = singleDaySchedules.filter(
      (s) =>
        !timedEventIds.has(String(s.id)) &&
        !hasTime(s) &&
        !allDaySingleIds.has(String(s.id)),
    )
    const timedSchedules = singleDaySchedules.filter(
      (s) =>
        timedEventIds.has(String(s.id)) ||
        (hasTime(s) && !allDaySingleIds.has(String(s.id))),
    )
    const dayTasks = dateItem.tasks as ExtendedScheduleDataWithColor[]
    const untimedTasks = dayTasks.filter(
      (t) => !timedTaskIds.has(String(t.id)) && !hasTime(t),
    )
    const timedTasks = dayTasks.filter(
      (t) => timedTaskIds.has(String(t.id)) || hasTime(t),
    )

    return {
      date: `${m}월 ${day}일`,
      dateISO: isoDate,
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()],
      spanEvents: multiDaySchedules.map((s) => {
        const baseColor = resolveScheduleColor(s.colorKey)
        return {
          id: s.id,
          title: s.name,
          period: `${s.multiDayStart}~${s.multiDayEnd}`,
          isRecurring: !!s.isRecurring,
          colorKey: s.colorKey,
          color: baseColor,
        }
      }),
      normalEvents: untimedSchedules
        .map((s) => {
          const baseColor = s.colorKey ? resolveScheduleColor(s.colorKey) : '#F4EAFF'
          const raw = rawEventById.get(String(s.id))
          return {
            id: s.id,
            title: s.name,
            labelText: pickLabelText(raw),
            memo: s.memo ?? '',
            time: s.time ?? '',
            isRecurring: !!s.isRecurring,
            color: baseColor,
          }
        })
        .concat(
          allDaySingles.map((ev) => {
            const formatted = resolveScheduleColor(ev.colorKey as string | undefined)
            const baseColor =
              !formatted || formatted.toUpperCase() === '#FFFFFF' ? '#8B5CF6' : formatted
            return {
              id: ev.id,
              title: ev.title ?? ev.name ?? '',
              labelText: pickLabelText(ev),
              memo: '',
              time: '',
              isRecurring: !!ev.isRepeat,
              color: baseColor,
              colorKey: ev.colorKey,
            }
          }),
        ),
      timedScheduleEvents: timedSchedules.map((s) => {
        const baseColor = s.colorKey ? resolveScheduleColor(s.colorKey) : '#F4EAFF'
        const raw = rawEventById.get(String(s.id))
        const startHHMM = String(raw?.startTime ?? '').slice(0, 5)
        const endHHMM = String(raw?.endTime ?? '').slice(0, 5)
        const timeText =
          startHHMM && endHHMM
            ? `${startHHMM}~${endHHMM}`
            : startHHMM || (s.time ?? '')
        return {
          id: s.id,
          title: s.name,
          labelText: pickLabelText(raw),
          memo: s.memo ?? '',
          time: timeText,
          startAt: (s as any).startAt,
          endAt: (s as any).endAt,
          isRecurring: !!s.isRecurring,
          color: baseColor,
          colorKey: s.colorKey,
        }
      }),
      untimedTasks: untimedTasks.map((t) => {
        const baseColor = t.colorKey ? resolveScheduleColor(t.colorKey) : '#FFD966'
        return {
          id: t.id,
          done: t.isCompleted,
          title: t.name,
          place: t.place ?? '',
          time: t.time ?? '',
          startAt: (t as any).startAt,
          endAt: (t as any).endAt,
          color: baseColor,
          borderColor: baseColor,
          isTask: true,
        }
      }),
      timedTasks: timedTasks.map((t) => {
        const baseColor = t.colorKey ? resolveScheduleColor(t.colorKey) : '#FFD966'
        const raw = rawTaskById.get(String(t.id))
        const placementHHMM = String(raw?.placementTime ?? '').slice(0, 5)
        return {
          id: t.id,
          done: t.isCompleted,
          title: t.name,
          place: t.place ?? '',
          time: placementHHMM || (t.time ?? ''),
          startAt: (t as any).startAt,
          endAt: (t as any).endAt,
          color: baseColor,
          borderColor: baseColor,
          isTask: true,
        }
      }),
    }
  }

  const openDetailPopupForDateItem = (dateItem: CalendarDateItem, syncCalendar = true) => {
    if (!dateItem.isCurrentMonth) return

    const d = dateItem.fullDate
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (syncCalendar) {
      setFocusedDateISO(isoDate)
      bus.emit('calendar:set-date', isoDate)
    }

    const rawDay = days.find((day) => {
      const dayISO = (day.date ?? (day as any).targetDate ?? '').slice(0, 10)
      return dayISO === isoDate
    })
    if (!rawDay) return

    setSelectedDayData(buildSelectedDayDataFromDateItem(dateItem, rawDay))

    setPopupVisible(true)
  }
  // 4. 상세 팝업 데이터 만듬
  const handleDatePress = (dateItem: CalendarDateItem) => {
    openDetailPopupForDateItem(dateItem, true)
  }

  const [serverSchedules, setServerSchedules] = useState<UISchedule[]>(
    () => initialCache?.schedules ?? [],
  )

  useEffect(() => {
    laneMapRef.current = buildLaneMap(serverSchedules.filter(isSpan))
  }, [serverSchedules])

  type MonthlyPayload = {
    days: MonthlyDay[]
    spanEvents: {
      id: string
      title: string
      colorKey?: string
      labels?: any[]
      startDate: string
      endDate: string
      isRepeat?: boolean | null
    }[]
  }

  const fetchMonthlyApi = async (ymStr: string): Promise<MonthlyPayload> => {
    const res = await http.get('/calendar/monthly', {
      params: {
        month: ymStr,
        _ts: Date.now(),
      },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    const data = res.data?.data ?? {}
    return {
      days: (data.days ?? []) as MonthlyDay[],
      spanEvents: (data.spanEvents ?? []) as MonthlyPayload['spanEvents'],
    }
  }

  const flattenMonthly = (fresh: MonthlyPayload): UISchedule[] => {
    const list: UISchedule[] = []

    const pickLabelId = (raw: any): string => {
      const arr = Array.isArray(raw?.labels) ? raw.labels : []
      if (arr.length === 0) return ''
      const first = arr[0]
      if (typeof first === 'object' && first !== null) {
        return String(first.id ?? first.labelId ?? '')
      }
      return String(first)
    }

    ;(fresh.days ?? []).forEach((day: any) => {
      const dateISO = (day.date ?? day.targetDate ?? '').slice(0, 10)

      // 1. 일정(Event) 처리
      ;(day.events ?? []).forEach((ev: any) => {
        list.push({
          id: String(ev.id),
          name: ev.title ?? ev.name ?? '',
          date: dateISO,
          isRecurring: !!ev.isRepeat,
          isTask: false,
          isCompleted: false,
          labelId: pickLabelId(ev),
          colorKey:
            typeof ev.colorKey === 'string'
              ? normalizeScheduleColorKey(ev.colorKey)
              : undefined,
        })
      })

      // 할 일(Task) 처리
      ;(day.tasks ?? []).forEach((t: any) => {
        list.push({
          id: String(t.id),
          name: t.title ?? '',
          date: dateISO,
          isRecurring: false,
          isTask: true, // Task임을 명시
          isCompleted: !!t.completed,
          labelId: pickLabelId(t),
        })
      })
    })

    // 3. 기간 일정(Span Events) 처리 (기존 코드 유지)
    ;(fresh.spanEvents ?? []).forEach((ev: any) => {
      const start = (ev.startDate ?? '').slice(0, 10)
      const end = (ev.endDate ?? '').slice(0, 10)

      list.push({
        id: String(ev.id),
        name: ev.title ?? ev.name ?? '',
        date: start,
        isRecurring: !!ev.isRepeat,
        isTask: false,
        isCompleted: false,
        labelId: pickLabelId(ev),
        colorKey:
          typeof ev.colorKey === 'string'
            ? normalizeScheduleColorKey(ev.colorKey)
            : undefined,
        multiDayStart: start,
        multiDayEnd: end,
      })
    })

    return list
  }

  useEffect(() => {
    let alive = true
    const cachedSnapshot = monthDataCache.get(ym)
    if (cachedSnapshot) {
      setDays(cachedSnapshot.days)
      setServerSchedules(cachedSnapshot.schedules)
      setHasHydratedMonth(true)
      setLoading(false)
    } else {
      setHasHydratedMonth(false)
      setLoading(true)
    }
    ;(async () => {
      try {
        const fresh = await fetchMonthlyApi(ym)
        const monthlySchedules = flattenMonthly(fresh)

        let tasksThisMonth: UISchedule[] = []
        try {
          tasksThisMonth = await fetchTasksForMonth(ym)
        } catch (err) {
          console.warn('[MonthView] fetchTasksForMonth 실패, 일정만 표시합니다.', err)
        }

        const mergedRaw: UISchedule[] = [...monthlySchedules, ...tasksThisMonth] 

       const merged = dedupeSchedules(mergedRaw)

       laneMapRef.current = buildLaneMap(merged.filter(isSpan))
        

        if (!alive) return
        monthDataCache.set(ym, {
          days: fresh.days,
          schedules: merged,
        })
        setDays(fresh.days)
        setServerSchedules(merged)
        setHasHydratedMonth(true)
      } catch (err) {
        if (!alive) return
        console.warn('[MonthView] fetchMonthlyApi 실패', err)
        setDays([])
        setServerSchedules([])
        setHasHydratedMonth(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [ym])

  // 필터링 된 일정 (라벨 on/off 반영)
  const filteredSchedules = useMemo(() => {
    if (!filterLabels || filterLabels.length === 0) return serverSchedules

    const enabledIds = filterLabels.filter((x) => x.enabled).map((x) => String(x.id))
    if (enabledIds.length === filterLabels.length) {
      return serverSchedules
    }

    return serverSchedules.filter((s) => {
      if (!s.labelId || s.labelId === '') return true
      return enabledIds.includes(String(s.labelId))
    })
  }, [filterLabels, serverSchedules])

  useEffect(() => {
    setCalendarDates(
      getCalendarDates(
        year,
        monthIndex,
        new Date(focusedDateISO),
        filteredSchedules,
        laneMapRef.current,
      ),
    )
  }, [year, monthIndex, focusedDateISO, filteredSchedules])


  const renderDayHeader = () => (
  <View style={S.dayHeader}>
    {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
      <View key={`dow-${index}`} style={S.dayCellFixed}>
        <Text
          style={[
            S.dayTextBase,
            index === 0 ? S.sunText : null,
          ]}
        >
          {day}
        </Text>
      </View>
    ))}
  </View>
)

  const renderDateCell = (dateItem: CalendarDateItem, weekIndex: number, dayIndex: number, ) => { 
    const itemsToRender = displayItemsByWeek[weekIndex][dayIndex]
    const isCurrentMonth = dateItem.isCurrentMonth

    const currentDateISO = `${dateItem.fullDate.getFullYear()}-${String(
      dateItem.fullDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(dateItem.fullDate.getDate()).padStart(2, '0')}`

    const scheduleItems = itemsToRender.filter(
      (it) => !(it as any).isTaskSummary && !(it as any).isTask,
    ) as ScheduleData[]
    const taskItems = itemsToRender.filter(
      (it) => !(it as any).isTaskSummary && !!(it as any).isTask,
    ) as ScheduleData[]
    const taskSummary = itemsToRender.find((it) => (it as any).isTaskSummary) as
      | { id: string; tasks: any[] }
      | undefined

    const scheduleMaxLane = Math.max(-1, ...scheduleItems.map((it: any) => it.__lane ?? -1))
    const laneSlots: (ScheduleData | null)[] = Array.from(
      { length: Math.max(0, scheduleMaxLane + 1) },
      () => null,
    )

    for (const it of scheduleItems) {
      const l = (it as any).__lane ?? 0
      if (l >= 0 && l < laneSlots.length) laneSlots[l] = it as ScheduleData
    }

    const needsHolidayReserveForDate = !dateItem.holidayName && scheduleItems.some((it) => {
      const schedule = it as UISchedule
      if (!schedule.multiDayStart || !schedule.multiDayEnd) return false

      return Array.from(holidayIsoByWeek[weekIndex] ?? []).some(
        (holidayISO) =>
          schedule.multiDayStart! <= holidayISO &&
          holidayISO <= schedule.multiDayEnd! &&
          currentDateISO >= schedule.multiDayStart! &&
          currentDateISO <= schedule.multiDayEnd!,
      )
    })

    const normalizeColor = (colorKey?: string, fallback = '#B04FFF') => {
      if (!colorKey) return fallback
      return resolveScheduleColor(colorKey)
    }

    const renderSlotItem = (
      slot: ScheduleData,
      laneIdx: number,
      keyPrefix: string,
    ) => {
      const item = slot as UISchedule
      const dimStyle = !isCurrentMonth ? { opacity: 0.3 } : null
      const itemKey = `${keyPrefix}-${item.id}-${currentDateISO}-lane${laneIdx}`
      const slotRowBaseStyle = {
        width: MONTH_ITEM_WIDTH,
        height: MONTH_ITEM_HEIGHT,
        marginBottom: MONTH_ITEM_GAP,
        overflow: 'visible' as const,
      }
      const slotCardRowStyle = {
        width: MONTH_CARD_WIDTH,
        height: MONTH_ITEM_HEIGHT,
        marginBottom: MONTH_ITEM_GAP,
        overflow: 'visible' as const,
        alignSelf: 'center' as const,
      }

      if (item.isTask) {
        return (
          <View key={itemKey} style={[slotCardRowStyle, dimStyle]}>
            <TaskItemCard
              id={String(item.id)}
              title={item.name}
              done={!!item.isCompleted}
              density="month"
              isUntimed
            />
          </View>
        )
      }

      if (item.multiDayStart && item.multiDayEnd) {
        const dayISO = currentDateISO
        const inToday = dayISO >= item.multiDayStart && dayISO <= item.multiDayEnd
        const cur = new Date(dayISO + 'T00:00:00')
        const prev = new Date(cur)
        prev.setDate(prev.getDate() - 1)
        const prevISO = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
          prev.getDate(),
        ).padStart(2, '0')}`
        const inPrev = prevISO >= item.multiDayStart && prevISO <= item.multiDayEnd
        const dow = cur.getDay()
        const isSegmentStart = inToday && (!inPrev || dow === 0)
        const isRealStart = dayISO === item.multiDayStart
        const isRealEnd = dayISO === item.multiDayEnd
        const segmentWidth = Math.max(1, MONTH_ITEM_WIDTH - (isRealEnd ? 1 : 0))
        const spanToWeekEnd = 7 - dow
        const end = new Date(item.multiDayEnd + 'T00:00:00')
        const daysDiff =
          Math.floor((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const colSpan = Math.max(1, Math.min(spanToWeekEnd, daysDiff))
        // 기간 바의 양끝 칩 영역(좌/우 캡)에는 제목이 겹치지 않도록 안전 여백을 넉넉히 확보한다.
        const CAP_SAFE_INSET = 12
        const titleLeftInset = isRealStart ? CAP_SAFE_INSET + 4 : 6
        const titleRightInset = isRealEnd ? CAP_SAFE_INSET + 4 : 6
        const titleWidth = Math.max(0, colSpan * MONTH_ITEM_WIDTH - titleLeftInset - titleRightInset)
        return (
          <View
            key={itemKey}
            style={[slotRowBaseStyle, dimStyle]}
          >
            <RangeScheduleBar
              id={String(item.id)}
              title=""
              color={normalizeColor(item.colorKey)}
              startISO={dayISO}
              endISO={item.multiDayEnd}
              isStart={isRealStart}
              isEnd={isRealEnd}
              density="month"
              isUntimed
              style={{ width: segmentWidth }}
            />
            {isSegmentStart ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: titleLeftInset,
                  top: 0,
                  width: titleWidth,
                  height: MONTH_ITEM_HEIGHT,
                  justifyContent: 'center',
                  zIndex: 20,
                  elevation: 20,
                }}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={{
                    fontSize: ts('label4').fontSize,
                    lineHeight: ts('label4').lineHeight,
                    fontWeight: ts('label4').fontWeight as any,
                    color: colors.text.text1,
                    includeFontPadding: false,
                  }}
                >
                  {item.name}
                </Text>
              </View>
            ) : null}
          </View>
        )
      }

      const ScheduleCard = item.isRecurring ? RepeatScheduleCard : FixedScheduleCard
      return (
        <View key={itemKey} style={[slotCardRowStyle, dimStyle]}>
          <ScheduleCard
            id={String(item.id)}
            title={item.name}
            color={normalizeColor(item.colorKey)}
            density="month"
            isUntimed
          />
        </View>
      )
    }

  return (
        <TouchableOpacity
          key={dateItem.fullDate.toISOString()}
          style={[
            S.dateCell,
            { minHeight: weekRowHeights[weekIndex] ?? MONTH_WEEK_MIN_HEIGHT },
            dayIndex === 6 ? { borderRightWidth: 0 } : null,
            { zIndex: 100 - dayIndex },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          onPress={() => handleDatePress(dateItem)}
          activeOpacity={isCurrentMonth ? 0.7 : 1}
          disabled={!isCurrentMonth}
          >
          {/* 날짜 번호 및 스타일 */}
            <View
              style={[
                S.dateNumberWrapper,
                dateItem.holidayName ? S.dateNumberWrapperWithHoliday : S.dateNumberWrapperNoHoliday,
              ]}
            >
              <View style={S.dateTopLine}>
                <View style={[S.datePill, dateItem.isToday ? S.datePillToday : null]}>
                <Text
                  style={[
                    S.dateNumberBase,
                    dateItem.isToday ? S.dateNumberToday : null,
                    isCurrentMonth ? null : S.otherMonthDateText,
                    isCurrentMonth && dateItem.isHoliday ? S.holidayDateText : null,
                  ]}
                >
                  {String(dateItem.day)}
                </Text>
                </View>
              </View>
              {dateItem.holidayName ? (
                <Text
                  style={[
                    S.holidayText,
                    !isCurrentMonth ? S.otherMonthHolidayText : null,
                    dateItem.holidayName === '크리스마스' ? S.smallHolidayText : null,
                  ]}
                >
                  {dateItem.holidayName.substring(0, 4)}
                </Text>
              ) : null}
            </View>

          {/* 일정 및 할 일 영역 */}
          <View style={S.eventArea}>
            {needsHolidayReserveForDate ? (
              <View
                style={{
                  width: MONTH_ITEM_WIDTH,
                  height: HOLIDAY_HEADER_BASE_OFFSET,
                }}
              />
            ) : null}

            {laneSlots.map((slot, idx) =>
              slot ? (
                renderSlotItem(slot, idx, 'slot')
              ) : (
                <View
                  key={`spacer-${idx}`}
                  style={{
                    width: MONTH_ITEM_WIDTH,
                    height: MONTH_ITEM_HEIGHT,
                    marginBottom: MONTH_ITEM_GAP,
                    overflow: 'visible',
                  }}
                />
              ),
            )}

            {taskItems.map((task, idx) => (
              <View
                key={`task-tail-${String(task.id)}-${idx}`}
                style={[
                  {
                    width: MONTH_CARD_WIDTH,
                    height: MONTH_ITEM_HEIGHT,
                    marginBottom: MONTH_ITEM_GAP,
                    overflow: 'visible',
                    alignSelf: 'center',
                  },
                  !isCurrentMonth ? { opacity: 0.3 } : null,
                ]}
              >
                <TaskItemCard
                  id={String(task.id)}
                  title={task.name}
                  done={!!task.isCompleted}
                  density="month"
                  isUntimed
                />
              </View>
            ))}

            {taskSummary ? (
                <View
                  style={[
                    {
                      width: MONTH_CARD_WIDTH,
                      height: MONTH_ITEM_HEIGHT,
                      marginBottom: MONTH_ITEM_GAP,
                      overflow: 'visible',
                      alignSelf: 'center',
                    },
                    !isCurrentMonth ? { opacity: 0.3 } : null,
                  ]}
                >
                  <TaskGroupCard
                    groupId={String(taskSummary.id)}
                    density="month"
                    expanded={false}
                    layoutWidthHint={MONTH_CARD_WIDTH}
                    tasks={(taskSummary.tasks ?? []).map((t: any) => ({
                      id: String(t.id),
                      title: t.name ?? '',
                      done: !!t.isCompleted,
                    }))}
                  />
                </View>
            ) : null}
          </View>
        </TouchableOpacity>
    )
}

const closeEventPopup = () => {
  setEventPopupVisible(false)
  setEventPopupData(null)
  setEventPopupCreateType('event')
  void (async () => {
    await fetchFresh(ym)
    await refreshSelectedDayData(selectedDayData?.dateISO)
  })()
}

const closeTaskPopup = () => {
  setTaskPopupVisible(false)
  setTaskPopupTask(null)
  setTaskPopupId(null)
  void (async () => {
    await fetchFresh(ym)
    await refreshSelectedDayData(selectedDayData?.dateISO)
  })()
}

const handleTaskSave = useCallback(async (form:any) => {
  const pad = (n: number) => String(n).padStart(2, '0')

  let placementDate: string | null = null
  let placementTime: string | null = null
  const fieldsToClear: string[] = []

  if (form.hasDate && form.date) {
    const d = form.date
    placementDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
        )}`
  } else {
    fieldsToClear.push('placementDate')
    }

  if (form.hasTime && form.time) {
    const t = form.time
    placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:00`
  } else {
    fieldsToClear.push('placementTime')
  }
    
  //reminderNoti
  const reminderNoti = form.reminderNoti ?? null
  if (!reminderNoti) fieldsToClear.push('reminderNoti')
  const dueDateTime = form.dueDateTime ?? null
  if (!dueDateTime) fieldsToClear.push('dueDateTime')

  const targetDate = placementDate ?? focusedDateISO

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
            dueDateTime,
            fieldsToClear,
      })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: { id: taskPopupId, date: targetDate },
        })
        } else {
          const res = await http.post('/task', {
            title: form.title,
            content: form.memo,
            labels: form.labels,
            placementDate,
            placementTime,
            reminderNoti,
            dueDateTime,
            date: targetDate,
          })

          const newId = res.data?.data?.id

          bus.emit('calendar:mutated', {
            op: 'create',
            item: { id: newId, date: targetDate },
          })
        }
        await fetchFresh(ym)
        await refreshSelectedDayData(selectedDayData?.dateISO)
        setTaskPopupVisible(false)
        setTaskPopupId(null)
        setTaskPopupTask(null)
        console.warn(' 테스크 저장 완료');
      } catch (err) {
        console.error('❌ 테스크 저장 실패:', err)
        Alert.alert('오류', '테스크를 저장하지 못했습니다.')
      }
    }, [
      taskPopupMode,
      taskPopupId,
      focusedDateISO,
      fetchFresh,
      refreshSelectedDayData,
      selectedDayData?.dateISO,
])

const handleTaskDelete = useCallback(async () => {
  if (!taskPopupId) return
  try {
    await http.delete(`/task/${taskPopupId}`)
    invalidateDayCache({ date: focusedDateISO })

    bus.emit('calendar:mutated', {
      op: 'delete',
      item: { id: taskPopupId, date: focusedDateISO },
    })

    await fetchFresh(ym)
    await refreshSelectedDayData(selectedDayData?.dateISO)

    setTaskPopupVisible(false)
    setTaskPopupId(null)
    setTaskPopupTask(null)
  } catch (err) {
    console.error('❌ 테스크 삭제 실패:', err)
    Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
  }
}, [taskPopupId, focusedDateISO, fetchFresh, ym, refreshSelectedDayData, selectedDayData?.dateISO])

const handleOcrAddEvent = useCallback(
  async (payload:any) => {
    try {
      await fetchFresh(ym)
      bus.emit('calendar:invalidate', { ym })
    } catch (err) {
      console.error(err)
    }
  },
  [fetchFresh, ym],
)

  const handleOcrSaveAll = useCallback(async () => {
  await fetchFresh(ym)
  bus.emit('calendar:invalidate', { ym })
  setOcrModalVisible(false)
}, [fetchFresh, ym])

  const shouldHideMonthGrid = loading && !hasHydratedMonth

  return (
    <ScreenWithSidebar
      mode="overlay"
      floatingVisible={
        !popupVisible &&
        !eventPopupVisible &&
        !taskPopupVisible &&
        !imagePopupVisible &&
        !ocrSplashVisible &&
        !ocrModalVisible
      }
      overlayChildren={
        <MonthDetailPopup
          visible={popupVisible}
          onClose={() => setPopupVisible(false)}
          interactionLocked={eventPopupVisible || taskPopupVisible || monthDetailDateChanging}
          onPressEvent={(event) => {
            if (event.id == null) return
            void openEventDetail(String(event.id), selectedDayData?.dateISO)
          }}
          onPressTask={(task) => {
            if (task.id == null) return
            void openTaskPopupFromApi(String(task.id))
          }}
          onSwipeDate={changeMonthDetailDate}
          dayData={selectedDayData || {}}
        />
      }
    >
      <GestureDetector gesture={swipeGesture}>
        <Animated.View collapsable={false} style={[{ flex: 1 }, swipeStyle]}>
          <View style={S.contentContainerWrapper}>
            {/* 요일 헤더 */}
            {renderDayHeader()}

            {/* 달력 그리드 */}
            <ScrollView
              style={S.contentArea}
              contentContainerStyle={S.scrollContentContainer}
            >
              <View
                style={[
                  S.calendarGrid,
                  shouldHideMonthGrid ? S.calendarGridHidden : null,
                ]}
                pointerEvents={shouldHideMonthGrid ? 'none' : 'auto'}
              >
                    {weeks.map((week, weekIndex) => (
                      <View
                        key={`week-${weekIndex}`}
                        style={[
                          S.weekRow,
                          { minHeight: weekRowHeights[weekIndex] ?? MONTH_WEEK_MIN_HEIGHT },
                          { zIndex: weeks.length - weekIndex },
                        ]}
                      >
                        {week.map((dateItem, dayIndex) =>
                          renderDateCell(dateItem, weekIndex, dayIndex)
                        )}
                      </View>
                    ))}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* 팝업들은 제스처 영역 밖 */}
      <EventDetailPopup
        visible={eventPopupVisible}
        source="Month"
        eventId={eventPopupData?.id ?? null}
        mode={eventPopupMode}
        initial={eventPopupData ?? undefined}
        initialCreateType={eventPopupCreateType}
        onClose={closeEventPopup}
      />
      <TaskDetailPopup
        visible={taskPopupVisible}
        source="Month"
        mode={taskPopupMode}
        taskId={taskPopupId ?? undefined}
        initialTask={taskPopupTask}
        onClose={closeTaskPopup} 
        onSave={handleTaskSave}
        onDelete={taskPopupMode === 'edit' ? handleTaskDelete : undefined}
      />
      <AddImageSheet
        visible={imagePopupVisible}
        onClose={() => setImagePopupVisible(false)}
        onPickImage={(_uri, base64, ext) => sendToOCR(base64, ext)}
        onTakePhoto={(_uri, base64, ext) => sendToOCR(base64, ext)}
      />
      <Modal
  visible={ocrSplashVisible}
  transparent={true}
  animationType="fade"
  statusBarTranslucent={true}
>
  <OcrSplash />
</Modal>
<OCREventCardSlider
  visible={ocrModalVisible}
  events={ocrEvents}
  onClose={() => setOcrModalVisible(false)}

  // 단일 저장
   onAddEvent={handleOcrAddEvent}

  // 전체 저장
  onSaveAll={handleOcrSaveAll}
/>
    </ScreenWithSidebar>
  )
}
