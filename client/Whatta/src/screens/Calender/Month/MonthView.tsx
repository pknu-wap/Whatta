import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { MonthlyDay } from '@/api/calendar'
import { ScheduleData } from '@/api/adapter'
import { bus } from '@/lib/eventBus'
import { http } from '@/lib/http'
import { fetchTasksForMonth } from '@/api/event_api'
import { useFocusEffect } from '@react-navigation/native'
import MonthDetailPopup from '@/screens/More/MonthDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import type { EventItem } from '@/api/event_api'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import AddImageSheet from '@/screens/More/Ocr'
import OCREventCardSlider, { OCREventDisplay } from '@/screens/More/OcrEventCardSlider'
import { S } from './S'
import { buildLaneMap, getDisplayItems, DisplayItem, getCalendarDates, CalendarDateItem, ts  } from './MonthView.utils'

import { createEvent } from '@/api/event_api'
import OcrSplash from '@/screens/More/OcrSplash'


import { today, getDateOfWeek } from './dateUtils'
import { ScheduleItem, TaskSummaryBox, UISchedule } from './MonthViewItems'


const isSpan = (s: ScheduleData) => !!(s.multiDayStart && s.multiDayEnd)

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


export default function MonthView() {

  // OCR hook & Popup hook
  const [ocrSplashVisible, setOcrSplashVisible] = useState(false)
  const [ocrModalVisible, setOcrModalVisible] = useState(false)
  const [ocrEvents, setOcrEvents] = useState<OCREventDisplay[]>([])
  const [imagePopupVisible, setImagePopupVisible] = useState(false)

  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')

  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

    useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Month') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  useEffect(() => {
      const h = (payload?: { source?: string }) => {
        if (payload?.source !== 'Month') return
        setEventPopupMode('create')
        setEventPopupData(null)
        setEventPopupVisible(true)
      }
      bus.on('popup:schedule:create', h)
      return () => bus.off('popup:schedule:create', h)
    }, [])

  // 캘린더 동기화 hooks
  const [focusedDateISO, setFocusedDateISO] = useState<string>(today())
  const [ym, setYm] = useState<string>(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
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

  useFocusEffect(
    React.useCallback(() => {
      bus.emit('calendar:state', { date: focusedDateISO, mode: 'month' })
    }, [ym, focusedDateISO]),
  )


  // 데이터 fetch
  const fetchFresh = useCallback(
    async (targetYM: string) => {
      try {
        const fresh = await fetchMonthlyApi(targetYM)
        const schedulesFromMonth = flattenMonthly(fresh)
        const tasksThisMonth = await fetchTasksForMonth(targetYM)

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

        cacheRef.current.set(targetYM, { days: fresh.days, schedules: merged })
        if (targetYM === ym) {
          setDays(fresh.days)
          setServerSchedules(merged)
        }
      } catch {}
    },
    [ym],
  )

  useEffect(() => {
    const onInvalidate = ({ ym: dirtyYM }: { ym: string }) => fetchFresh(dirtyYM)
    bus.on('calendar:invalidate', onInvalidate)
    return () => bus.off('calendar:invalidate', onInvalidate)
  }, [fetchFresh])

  useFocusEffect(
    React.useCallback(() => {
      // 다른 뷰에서 발생한 변경 이벤트를 놓쳤을 수 있으므로 포커스 복귀 시 현재 월 재조회
      void fetchFresh(ym)
    }, [fetchFresh, ym]),
  )

  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      fetchFresh(ym)
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [ym, fetchFresh])



  const sendToOCR = async (base64: string, ext?: string) => {
    try {
      setOcrSplashVisible(true)
      
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64
      const lower = (ext ?? 'jpg').toLowerCase()
      const format = lower === 'png' ? 'png' : lower === 'jpeg' ? 'jpeg' : 'jpg'

      const res = await http.post(
        '/ocr',
        {
          imageType: 'COLLEGE_TIMETABLE',
          image: {
            format,
            name: `timetable.${format}`,
            data: cleanBase64,
          },
        },
        
      )

      console.log('OCR 성공:', res.data)

      const events = res.data?.data?.events ?? []

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

  // 월별 캐시 (ym -> days/schedules)
  const cacheRef = useRef<Map<string, { days: MonthlyDay[]; schedules: ScheduleData[] }>>(
    new Map(),
  )
  const laneMapRef = useRef<Map<string, number>>(new Map())

  const fade = useRef(new Animated.Value(1)).current

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

  const { items: filterLabels } = useLabelFilter()

  // "할 일" 라벨 id 찾기 (없으면 null)
  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일')
    return found ? Number(found.id) : null
  }, [filterLabels])

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


  // 월 이동 + 스와이프에서 호출
  const goMonth = useCallback(
    (diff: number) => {
      // 1. 현재 잡고 있는 날짜 (예: 2025-10-27)
      const [y, m, d] = focusedDateISO.split('-').map(Number)

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

  // 좌우 스와이프 제스처 (DayView 구조 참고)
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onEnd((e) => {
          'worklet'
          const dx = e.translationX
          if (dx > 80) {
            // 오른쪽 → 이전 달
            runOnJS(goMonth)(-1)
          } else if (dx < -80) {
            // 왼쪽 → 다음 달
            runOnJS(goMonth)(+1)
          }
        }),
    [goMonth],
  )

  const { year, monthIndex } = useMemo(() => parseYM(ym), [ym])

  const [calendarDates, setCalendarDates] = useState<CalendarDateItem[]>([])
  const [days, setDays] = useState<MonthlyDay[]>([])
  const [loading, setLoading] = useState(false)

  
  // Memo로 캐싱
  const weeks = useMemo(() => {
    const result: CalendarDateItem[][] = []
    for(let i=0; i< calendarDates.length; i+= 7){
      result.push(calendarDates.slice(i, i+7))
    }
    return result
  }, [calendarDates])

  // weeks가 바뀔 때만 계산
  const weekMaxLanes = useMemo(() => {
  return weeks.map((week) =>
    Math.max(
      -1,
      ...week.flatMap((d) =>
        [...d.schedules, ...d.tasks].map((it) => (it as any).__lane ?? -1),
      ),
    ),
  )
}, [weeks])

// 주간 변경될 때만 계산
const displayItemsByWeek = useMemo(() => {
  return weeks.map((week) =>
    week.map((dateItem) =>
      getDisplayItems(dateItem.schedules, dateItem.tasks)
    )
  )
}, [weeks])


  type ExtendedScheduleData = ScheduleData & {
    memo?: string
    place?: string
    time?: string
  }

  type ExtendedScheduleDataWithColor = ExtendedScheduleData & {
    colorKey?: string
  }

  // 4. 상세 팝업 데이터 만듬
  const handleDatePress = (dateItem: CalendarDateItem) => {
    if (!dateItem.isCurrentMonth) return

    const d = dateItem.fullDate
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setFocusedDateISO(isoDate)
    bus.emit('calendar:set-date', isoDate)

    // 클릭한 날짜의 원본 day 데이터를 찾아서 all-day 단일 일정 구분
    const rawDay = days.find((day) => {
      const dayISO = (day.date ?? (day as any).targetDate ?? '').slice(0, 10)
      return dayISO === isoDate
    })
    const rawEvents: any[] = (rawDay as any)?.events ?? []
    const allDaySingles = rawEvents.filter(
      (ev) => ev.startTime == null && ev.endTime == null,
    )
    const allDaySingleIds = new Set(allDaySingles.map((ev) => String(ev.id)))


    setSelectedDayData({
      date: `${d.getMonth() + 1}월 ${d.getDate()}일`,
      dateISO: isoDate,
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
      spanEvents: [
        ...(dateItem.schedules as ExtendedScheduleDataWithColor[])
          .filter((s) => s.multiDayStart && s.multiDayEnd)
          .map((s) => {
            const baseColor = s.colorKey
              ? s.colorKey.startsWith('#')
                ? s.colorKey
                : `#${s.colorKey}`
              : '#8B5CF6'
            return {
              title: s.name,
              period: `${s.multiDayStart}~${s.multiDayEnd}`,
              colorKey: s.colorKey,
              color: baseColor,
            }
          }),
        ...allDaySingles.map((ev) => {
          const rawColor = ev.colorKey as string | undefined
          const formatted =              
            rawColor && rawColor.length > 0
              ? rawColor.startsWith('#')
                ? rawColor
                : `#${rawColor}`
              : null
          const baseColor = !formatted || formatted.toUpperCase() === '#FFFFFF'
            ? '#8B5CF6'
            : formatted                     
          return {
            title: ev.title ?? ev.name ?? '',
            // 단일 all-day 일정은 period 없이 제목만 표시 
            colorKey: ev.colorKey,
            color: baseColor,
          }
        }),
      ],
      normalEvents: (dateItem.schedules as ExtendedScheduleDataWithColor[])
        .filter(
          (s) =>
            !s.multiDayStart &&
            !s.multiDayEnd &&
            !s.isTask &&
            !allDaySingleIds.has(String(s.id)), // all-day 단일 일정은 여기서 제외
        )
        .map((s) => {
          const baseColor = s.colorKey
            ? s.colorKey.startsWith('#')
              ? s.colorKey
              : `#${s.colorKey}`
            : '#F4EAFF'
          return {
            title: s.name,
            memo: s.memo ?? '',
            color: baseColor,
          }
        }),
      timeEvents: (dateItem.tasks as ExtendedScheduleDataWithColor[]).map((t) => {
        const baseColor = t.colorKey
          ? t.colorKey.startsWith('#')
            ? t.colorKey
            : `#${t.colorKey}`
          : '#FFD966'
        return {
          id: t.id,
          done: t.isCompleted,
          title: t.name,
          place: t.place ?? '',
          time: t.time ?? '',
          color: baseColor,
          borderColor: baseColor,
        }
      }),
    })

    setPopupVisible(true)
  }

  const [serverSchedules, setServerSchedules] = useState<UISchedule[]>([])

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
    const res = await http.get('/calendar/monthly', { params: { month: ymStr } })
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
              ? ev.colorKey.replace(/^#/, '').toUpperCase()
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
            ? ev.colorKey.replace(/^#/, '').toUpperCase()
            : undefined,
        multiDayStart: start,
        multiDayEnd: end,
      })
    })

    return list
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
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
        setDays(fresh.days)
        setServerSchedules(merged)
      } catch (err) {
        if (!alive) return
        console.warn('[MonthView] fetchMonthlyApi 실패', err)
        setDays([])
        setServerSchedules([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [ym])

  // 월이 바뀔 때 살짝 페이드 아웃
  useEffect(() => {
    Animated.timing(fade, { toValue: 0.4, duration: 120, useNativeDriver: true }).start()
  }, [ym])

  // 로딩이 끝나면 다시 페이드 인
  useEffect(() => {
    if (!loading) {
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    }
  }, [loading])

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
            ts('monthDate'),
            S.dayTextBase,
            index === 0 ? S.sunText : null,
            index === 6 ? S.satText : null,
          ]}
        >
          {day}
        </Text>
      </View>
    ))}
    {loading && (
      <View style={S.loadingOverlay}>
        <ActivityIndicator />
      </View>
    )}
  </View>
)

  const renderDateCell = (dateItem: CalendarDateItem, weekIndex: number, dayIndex: number, ) => { 
    const weekMaxLane = weekMaxLanes[weekIndex] ?? -1
    const itemsToRender = displayItemsByWeek[weekIndex][dayIndex]
    const isCurrentMonth = dateItem.isCurrentMonth

    const dayOfWeekStyle = isCurrentMonth
      ? dayIndex % 7 === 0
        ? S.sunDate
        : (dayIndex + 1) % 7 === 0
          ? S.satDate
          : null
      : null

    const currentDateISO = `${dateItem.fullDate.getFullYear()}-${String(
      dateItem.fullDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(dateItem.fullDate.getDate()).padStart(2, '0')}`

    const onlySchedules = itemsToRender.filter((it) => !(it as any).isTaskSummary)

    const laneSlots: (ScheduleData | null)[] = Array.from(
      { length: Math.max(0, weekMaxLane + 1) },
      () => null,
    )

    for (const it of onlySchedules) {
      const l = (it as any).__lane ?? 0
      if (l >= 0 && l < laneSlots.length) laneSlots[l] = it as ScheduleData
    }

  return (
        <TouchableOpacity
          key={dateItem.fullDate.toISOString()}
          style={[S.dateCell]}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          onPress={() => handleDatePress(dateItem)}
          activeOpacity={isCurrentMonth ? 0.7 : 1}
          disabled={!isCurrentMonth}
          >
          {/* 날짜 번호 및 스타일 */}
            <View style={S.dateNumberWrapper}>
              {dateItem.isToday ? (
              <View style={S.todayRoundedSquare} />
              ) : null}
              <Text
              style={[
                ts('monthDate'),
                  S.dateNumberBase,
                  isCurrentMonth ? dayOfWeekStyle
                    : dayIndex % 7 === 0 ? S.otherMonthSunDate
                    : (dayIndex + 1) % 7 === 0 ? S.otherMonthSatDate
                    : S.otherMonthDateText,
                    isCurrentMonth && dateItem.isHoliday ? S.holidayDateText
                    : null,
            ]} >
              {String(dateItem.day)}
            </Text>
            {dateItem.holidayName ? (
              <Text
                style={[
                  S.holidayText,
                  !isCurrentMonth ? S.otherMonthHolidayText : null,
                  dateItem.holidayName === '크리스마스'
                  ? S.smallHolidayText
                  : null, ]} >
                  {dateItem.holidayName.substring(0, 4)}
              </Text> ) : null}
            </View>

          {/* 일정 및 할 일 영역 */}
          <View style={S.eventArea}>
            {(() => {
              const taskSummary = itemsToRender.find(
                (it) => (it as any).isTaskSummary, )
              const onlySchedules = itemsToRender.filter(
                (it) => !(it as any).isTaskSummary, )

              for (const it of onlySchedules) {
                const l = (it as any).__lane ?? 0
                if (l >= 0 && l < laneSlots.length)
                  laneSlots[l] = it as ScheduleData
              }

              return (
                <>
                {laneSlots.map((slot, idx) =>
                  slot ? (
                    <ScheduleItem
                      key={`${slot.id}-${currentDateISO}-lane${idx}`}
                      schedule={slot as UISchedule}
                      currentDateISO={currentDateISO}
                      isCurrentMonth={isCurrentMonth} />
                    ) : (
                    <View key={`spacer-${idx}`} style={S.laneSpacer} />
                    ),
              )}

              {taskSummary ? (
                <TaskSummaryBox
                  key={(taskSummary as any).id}
                  count={(taskSummary as any).count}
                  isCurrentMonth={isCurrentMonth}
                  tasks={(taskSummary as any).tasks}
                />
                ) : null}
                </>
              )
            })()}
          </View>
        </TouchableOpacity>
    )
}

const closeEventPopup = () => {
  setEventPopupVisible(false)
  setEventPopupData(null)
  fetchFresh(ym)
}

const closeTaskPopup = () => {
  setTaskPopupVisible(false)
  setTaskPopupTask(null)
  setTaskPopupId(null)
  fetchFresh(ym)
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
            date: targetDate,
          })

          const newId = res.data?.data?.id

          bus.emit('calendar:mutated', {
            op: 'create',
            item: { id: newId, date: targetDate },
          })
        }
        await fetchFresh(ym)
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
])

const handleTaskDelete = useCallback(async () => {
  if (!taskPopupId) return
  try {
    await http.delete(`/task/${taskPopupId}`)

    bus.emit('calendar:mutated', {
      op: 'delete',
      item: { id: taskPopupId, date: focusedDateISO },
    })

    await fetchFresh(ym)

    setTaskPopupVisible(false)
    setTaskPopupId(null)
    setTaskPopupTask(null)
  } catch (err) {
    console.error('❌ 테스크 삭제 실패:', err)
    Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
  }
}, [taskPopupId, focusedDateISO, fetchFresh, ym])

const handleOcrAddEvent = useCallback(
  async (payload:any) => {
    try {
      await createEvent(payload)
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

  return (
    <ScreenWithSidebar mode="overlay">
      <GestureDetector gesture={swipeGesture}>
        <View collapsable={false} style={{ flex: 1 }}>
          <View style={S.contentContainerWrapper}>
            {/* 요일 헤더 */}
            {renderDayHeader()}

            {/* 달력 그리드 */}
            <ScrollView
              style={S.contentArea}
              contentContainerStyle={S.scrollContentContainer}
            >
              <Animated.View style={[S.calendarGrid, { opacity: fade }]}>
                    {weeks.map((week, weekIndex) => (
                      <View key={`week-${weekIndex}`} style={S.weekRow}>
                        {week.map((dateItem, dayIndex) =>
                          renderDateCell(dateItem, weekIndex, dayIndex)
                        )}
                      </View>
                    ))}
              </Animated.View>
            </ScrollView>
          </View>
        </View>
      </GestureDetector>

      {/* 팝업들은 제스처 영역 밖 */}
      <MonthDetailPopup
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        dayData={selectedDayData || {}}
      />
      <EventDetailPopup
        visible={eventPopupVisible}
        eventId={eventPopupData?.id ?? null}
        mode={eventPopupMode}
        initial={eventPopupData ?? undefined}
        onClose={closeEventPopup}
      />
      <TaskDetailPopup
        visible={taskPopupVisible}
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
        onPickImage={(uri, base64, ext) => sendToOCR(base64, ext)}
        onTakePhoto={(uri, base64, ext) => sendToOCR(base64, ext)}
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
