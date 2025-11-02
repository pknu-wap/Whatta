import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native'

import { useRoute } from '@react-navigation/native'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { MonthlyDay } from '@/api/calendar'
import { adaptMonthlyToSchedules, ScheduleData } from '@/api/adapter'
import { bus } from '@/lib/eventBus'
import { http } from '@/lib/http'
import { fetchTasksForMonth } from '@/api/event_api'

// --------------------------------------------------------------------
// 1. 상수 및 타입 정의
// --------------------------------------------------------------------
const DARK_GRAY_COLOR = '#555555'
const FONT_MAIN = '#000000'
const FONT_SUB = '#999999'
const COLOR_PRIMARY = '#B04FFF'
const COLOR_LIGHT = '#EAD7FF'

// 반복 일정 배경, 경계선/멀티데이 시작/종료 표시용
const SCHEDULE_COLOR = '#B04FFF'
// 단일 일정 및 멀티데이(기간이 긴 일정) 바 배경색
const SCHEDULE_LIGHT_COLOR = '#E5CCFF'

const CHECKBOX_SIZE = 6

const SCHEDULE_BOX_HEIGHT = 12
const TASK_BOX_HEIGHT = 12
const ITEM_MARGIN_VERTICAL = 2
const EVENT_AREA_PADDING_TOP = 5
const SINGLE_SCHEDULE_BORDER_WIDTH = 5
const TEXT_HORIZONTAL_PADDING = 4
const EVENT_HPAD = 4
const MULTI_LEFT_GAP = 3 // 시작일 왼쪽 여백
const MULTI_RIGHT_GAP = 3 // 종료일 오른쪽 여백
const CAP_W = 6 // 캡 두께

//  HOLIDAYS: 양력 공휴일 (JS getMonth() 0-11월 기준)
const HOLIDAYS: Record<string, string> = {
  '0-1': '신정', // 1월 1일
  '2-1': '삼일절', // 3월 1일
  '4-1': '노동절', // 5월 1일
  '4-5': '어린이날', // 5월 5일
  '5-6': '현충일', // 6월 6일
  '7-14': '광복절', // 8월 15일
  '9-3': '개천절', // 10월 3일
  '9-9': '한글날', // 10월 9일
  '11-25': '크리스마스', // 12월 25일
}

// 연도별 음력/대체공휴일 2026까지만 표시함
const LUNAR_HOLIDAYS_OFFSETS: Record<
  number,
  {
    설날: { month: number; day: number }[]
    추석: { month: number; day: number }[]
    부처님오신날: { month: number; day: number }
    대체휴일: { month: number; day: number }[]
  }
> = {
  2024: {
    설날: [
      { month: 1, day: 9 },
      { month: 1, day: 10 },
      { month: 1, day: 11 },
    ],
    추석: [
      { month: 8, day: 16 },
      { month: 8, day: 17 },
      { month: 8, day: 18 },
    ],
    부처님오신날: { month: 4, day: 15 },
    대체휴일: [{ month: 1, day: 12 }],
  },
  2025: {
    설날: [
      { month: 0, day: 28 },
      { month: 0, day: 29 },
      { month: 0, day: 30 },
    ],
    추석: [
      { month: 9, day: 5 },
      { month: 9, day: 6 },
      { month: 9, day: 7 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [{ month: 9, day: 8 }],
  },
  2026: {
    설날: [
      { month: 1, day: 16 },
      { month: 1, day: 17 },
      { month: 1, day: 18 },
    ],
    추석: [
      { month: 8, day: 24 },
      { month: 8, day: 25 },
      { month: 8, day: 26 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [
      { month: 2, day: 2 },
      { month: 4, day: 25 },
      { month: 7, day: 17 },
      { month: 9, day: 5 },
    ],
  },
}

interface TaskSummaryItem {
  isTaskSummary: true
  id: string
  count: number
  tasks: ScheduleData[]
}
type DisplayItem = ScheduleData | TaskSummaryItem

interface CalendarDateItem {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isFocused: boolean
  fullDate: Date
  holidayName: string | null
  isHoliday: boolean
  dayOfWeek: number
  schedules: ScheduleData[]
  tasks: ScheduleData[]
}

// --------------------------------------------------------------------
// 2. 유틸리티 함수
// --------------------------------------------------------------------
const ts = (styleName: string): any => {
  if (styleName === 'monthDate') {
    return { fontSize: 12 }
  }
  return {}
}

const today = (): string => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
const TODAY_ISO = today()

function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const day = date.getDate()
  let holidayName: string | null = null

  // 1. 양력 공휴일
  const solarKey = `${month}-${day}`
  if (HOLIDAYS[solarKey]) {
    holidayName = HOLIDAYS[solarKey]
  }

  // 2. 음력/특정 연도 공휴일 및 대체휴일
  const lunarData = LUNAR_HOLIDAYS_OFFSETS[year]

  if (lunarData) {
    for (const h of lunarData.설날) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '설날'
        break
      }
    }

    for (const h of lunarData.추석) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '추석'
        break
      }
    }

    if (lunarData.부처님오신날.month === month && lunarData.부처님오신날.day === day) {
      holidayName = holidayName || '부처님 오신 날'
    }

    for (const h of lunarData.대체휴일) {
      if (h.month === month && h.day === day) {
        holidayName = '대체휴일'
        break
      }
    }
  }

  if (holidayName) {
    if (holidayName.length > 4) return holidayName.substring(0, 4)
    return holidayName
  }
  return null
}

function buildLaneMap(spans: ScheduleData[]) {
  const days = (d: string) => Date.parse(d) / 86400000
  const list = spans
    .filter((s) => s.multiDayStart && s.multiDayEnd)
    .map((s) => ({ ...s, start: s.multiDayStart!, end: s.multiDayEnd! }))
    .sort(
      (a, b) =>
        days(b.end) - days(b.start) - (days(a.end) - days(a.start)) ||
        a.start.localeCompare(b.start) ||
        (a.name || '').localeCompare(b.name || ''),
    )

  const map = new Map<string, number>()
  const laneEnd: string[] = []

  list.forEach((ev) => {
    let lane = 0
    while (laneEnd[lane] && laneEnd[lane] >= ev.start) lane++
    map.set(String(ev.id), lane)
    laneEnd[lane] = ev.end
  })

  return map
}
function getEventsForDate(
  fullDate: Date,
  allSchedules: ScheduleData[],
  laneMap: Map<string, number>,
): { schedules: ScheduleData[]; tasks: ScheduleData[] } {
  type WithLane = ScheduleData & { __lane?: number }

  const yyyy = fullDate.getFullYear()
  const mm = String(fullDate.getMonth() + 1).padStart(2, '0')
  const dd = String(fullDate.getDate()).padStart(2, '0')
  const iso = `${yyyy}-${mm}-${dd}`
  const dow = fullDate.getDay()

  const spans: WithLane[] = []
  const singles: WithLane[] = []
  const tasks: WithLane[] = []

  // 오늘 해당되는 항목 분배
  allSchedules.forEach((it) => {
    // 멀티데이
    if (it.multiDayStart && it.multiDayEnd) {
      if (it.multiDayStart <= iso && iso <= it.multiDayEnd) spans.push(it as WithLane)
      return
    }
    // 반복
    if (it.isRecurring) {
      const [y, m, d] = it.date.split('-').map(Number)
      const base = new Date(y, m - 1, d)
      if (base.getDay() === dow && iso >= it.date) {
        ;(it.isTask ? tasks : singles).push(it as WithLane)
      }
      return
    }
    // 단일
    if (it.date === iso) {
      ;(it.isTask ? tasks : singles).push(it as WithLane)
    }
  })

  // 멀티데이 알고리즘
  const spansOnly = allSchedules.filter(
    (it) => it.multiDayStart && it.multiDayEnd,
  ) as (ScheduleData & { __lane?: number })[]
  const spansToday = spansOnly.filter(
    (s) => s.multiDayStart! <= iso && iso <= s.multiDayEnd!,
  )

  // 레인 → 길이(desc) → 이름 순으로 정렬 (항상 같은 높이 유지 + 긴 게 위)
  const spanLen = (s: WithLane) =>
    new Date(s.multiDayEnd!).getTime() - new Date(s.multiDayStart!).getTime()

  spansToday.sort(
    (a, b) =>
      (a.__lane ?? 0) - (b.__lane ?? 0) ||
      spanLen(b) - spanLen(a) ||
      (a.name || '').localeCompare(b.name || ''),
  )

  // 길이 긴 순으로 정렬
  spansOnly.sort((a, b) => {
    const startA = a.multiDayStart ? new Date(a.multiDayStart).getTime() : 0
    const endA = a.multiDayEnd ? new Date(a.multiDayEnd).getTime() : 0
    const startB = b.multiDayStart ? new Date(b.multiDayStart).getTime() : 0
    const endB = b.multiDayEnd ? new Date(b.multiDayEnd).getTime() : 0
    const lenA = endA - startA
    const lenB = endB - startB
    return lenB - lenA
  })

  const lanes: (ScheduleData & { __lane?: number })[][] = []

  for (const ev of spansOnly) {
    if (!ev.multiDayStart || !ev.multiDayEnd) continue
    const start = new Date(ev.multiDayStart)
    const end = new Date(ev.multiDayEnd)
    let placed = false

    for (let i = 0; i < lanes.length; i++) {
      const conflict = lanes[i].some((other) => {
        if (!other.multiDayStart || !other.multiDayEnd) return false
        const oStart = new Date(other.multiDayStart)
        const oEnd = new Date(other.multiDayEnd)
        return !(end < oStart || start > oEnd)
      })
      if (!conflict) {
        lanes[i].push(ev)
        ev.__lane = i
        placed = true
        break
      }
    }

    if (!placed) {
      ev.__lane = lanes.length
      lanes.push([ev])
    }
  }

  // 단일/Task 배치
  const used = new Set<number>(spansOnly.map((s) => s.__lane!))
  const firstFreeLane = Math.max(-1, ...spansToday.map((s) => s.__lane ?? -1)) + 1

  const toMinutes = (x: any) => {
    const t = x?.startTime ?? x?.start_at ?? x?.time
    if (!t) return 24 * 60
    const m = /(\d{1,2}):(\d{2})/.exec(String(t))
    return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60
  }

  const byName = (a: ScheduleData, b: ScheduleData) =>
    (a.name || '').localeCompare(b.name || '')

  singles.sort((a, b) => toMinutes(a) - toMinutes(b) || byName(a, b))
  singles.forEach((ev, i) => {
    ev.__lane = firstFreeLane + i
  })

  tasks.sort((a, b) => toMinutes(a) - toMinutes(b) || byName(a, b))
  tasks.forEach((t, i) => {
    t.__lane = firstFreeLane + singles.length + i
  })

  // 렌더 순서: 멀티데이(레인순) → 단일
  const schedulesForRender: ScheduleData[] = [...spansToday, ...singles]
  return { schedules: schedulesForRender, tasks }
}

function getDisplayItems(
  schedules: ScheduleData[],
  tasks: ScheduleData[],
): DisplayItem[] {
  let displayList: DisplayItem[] = [...schedules]
  if (tasks.length === 0) {
    return displayList
  }
  if (tasks.length === 1) {
    displayList.push(tasks[0])
  } else {
    displayList.push({
      isTaskSummary: true,
      id: `task-summary-${tasks[0].date}-${tasks.length}`,
      count: tasks.length,
      tasks: tasks,
    })
  }
  return displayList
}

function getCalendarDates(
  year: number,
  month: number,
  currentFocusedDate: Date,
  allSchedules: ScheduleData[],
  laneMap: Map<string, number>,
): CalendarDateItem[] {
  const dates: CalendarDateItem[] = []
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startWeekDay = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()
  const prevMonthLastDate = new Date(year, month, 0).getDate()
  const systemTodayISO = TODAY_ISO

  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekDay + 1
    let date: number
    let isCurrentMonth = true
    let itemDate = new Date(year, month, dayNum)

    if (dayNum < 1) {
      date = prevMonthLastDate + dayNum
      isCurrentMonth = false
      itemDate = new Date(year, month - 1, date)
    } else if (dayNum > totalDays) {
      date = dayNum - totalDays
      isCurrentMonth = false
      itemDate = new Date(year, month + 1, date)
    } else {
      date = dayNum
    }

    const itemDateISO = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`
    const isToday = itemDateISO === systemTodayISO

    const isFocused = currentFocusedDate.toDateString() === itemDate.toDateString()

    const holidayName = getHolidayName(itemDate)
    const isHoliday = !!holidayName
    const dayOfWeek = itemDate.getDay()
    const { schedules: dayItems, tasks: dayTasks } = getEventsForDate(
      itemDate,
      allSchedules,
      laneMap,
    )
    dates.push({
      day: date,
      isCurrentMonth,
      isToday,
      isFocused,
      fullDate: itemDate,
      holidayName: holidayName,
      isHoliday: isHoliday,
      dayOfWeek: dayOfWeek,
      schedules: dayItems,
      tasks: dayTasks,
    })
  }
  return dates
}

const isSpan = (s: ScheduleData) => !!(s.multiDayStart && s.multiDayEnd)

// HEX → {r,g,b}
function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

// --------------------------------------------------------------------
// 컬러키
// --------------------------------------------------------------------

// 연한색 제조
function softHex(hex: string, t = 0.7) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) => Math.round(c + (255 - c) * t)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

// hex → 대비되는 텍스트 색(검정/흰색) 결정
const textColorFor = (hex?: string) => {
  if (!hex) return '#FFFFFF'
  const h = hex.replace('#', '').toUpperCase()
  if (h === 'FFF' || h === 'FFFFFF') return '#000000' // 흰색이면 무조건 검정
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  // 상대 휘도(Rec. 709)
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.7 ? '#000000' : '#FFFFFF' // 밝으면 검정, 어두우면 흰색
}

// 컬러키 → 진한색/연한색(중앙 바탕용) 계산
const colorsFromKey = (hex?: string) => {
  const base = (hex && `#${hex.replace('#', '')}`) || '#8B5CF6' // 기본 보라
  const light = base.startsWith('#')
    ? `rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(base.slice(3, 5), 16)},${parseInt(base.slice(5, 7), 16)},0.2)`
    : 'rgba(139,92,246,0.2)'
  return { primary: base, light }
}

// --------------------------------------------------------------------
// 🔐 타입가드 (여기가 핵심 수정)
// --------------------------------------------------------------------
function isTaskSummaryItem(item: DisplayItem): item is TaskSummaryItem {
  return (
    typeof (item as any)?.isTaskSummary !== 'undefined' &&
    (item as any).isTaskSummary === true
  )
}
type UISchedule = ScheduleData & { colorKey?: string }

// --------------------------------------------------------------------
// 3. Custom UI Components (ScheduleItem, TaskSummaryBox)
// --------------------------------------------------------------------
interface ScheduleItemProps {
  schedule: UISchedule
  currentDateISO: string
  isCurrentMonth: boolean
}
const ScheduleItem: React.FC<ScheduleItemProps> = ({
  schedule,
  currentDateISO,
  isCurrentMonth,
}) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null
  const { primary: baseColor, light: lightColor } = colorsFromKey(schedule.colorKey)
  const labelColor = textColorFor(schedule.colorKey)

  // 1) Task (체크박스 + 네모 테두리)
  if (schedule.isTask) {
    return (
      <View style={[S.taskBox, S.taskBoxBordered, dimmedStyle]}>
        {/* 체크박스(보기용) — 나중에 onPress 연결 가능 */}
        <View style={S.checkboxTouchArea}>
          <View style={[S.checkboxBase, S.checkboxOff]} />
        </View>

        {/* 타이틀 */}
        <Text style={S.taskText} numberOfLines={1} ellipsizeMode="tail">
          {schedule.name}
        </Text>
      </View>
    )
  }

  // 2) Multi-day
  if (schedule.multiDayStart && schedule.multiDayEnd) {
    const isSpan = true
    const isStart = isSpan && currentDateISO === schedule.multiDayStart
    const isEnd = isSpan && currentDateISO === schedule.multiDayEnd

    const baseLeft = -EVENT_HPAD
    const baseRight = -EVENT_HPAD

    const ml = baseLeft + (isStart ? MULTI_LEFT_GAP : 0)
    const mr = baseRight + (isEnd ? MULTI_RIGHT_GAP : 0)

    return (
      <View style={[S.multiDayContainer, dimmedStyle]}>
        <View
          style={[
            S.multiBarBase,
            {
              backgroundColor: lightColor,
              marginLeft: ml,
              marginRight: baseRight + (isEnd ? MULTI_RIGHT_GAP : 0),
              paddingRight: isEnd ? CAP_W : 0,
            },

            // 시작일: 왼쪽 캡 + 텍스트 패딩
            isStart && {
              borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
              borderColor: baseColor,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
              paddingLeft: TEXT_HORIZONTAL_PADDING,
            },

            // 종료일: 오른쪽 캡 + 텍스트 패딩
            isEnd && {
              borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
              borderColor: baseColor,
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
              paddingRight: TEXT_HORIZONTAL_PADDING,
            },
          ]}
        >
          {isStart ? (
            <Text numberOfLines={1} ellipsizeMode="tail" style={S.multiBarText}>
              {schedule.name}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  // 3) 단일 / 반복
  const isRecurring = schedule.isRecurring
  const isTodaySingle = schedule.date === currentDateISO

  return (
    <View
      style={[
        S.scheduleBox,
        { backgroundColor: baseColor, paddingLeft: TEXT_HORIZONTAL_PADDING },
        dimmedStyle,
      ]}
    >
      <Text
        style={[S.scheduleText, { color: labelColor }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {schedule.name}
      </Text>
    </View>
  )
}

interface TaskSummaryBoxProps {
  count: number
  isCurrentMonth: boolean
}
const TaskSummaryBox: React.FC<TaskSummaryBoxProps> = ({ count, isCurrentMonth }) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null
  return (
    <View style={[S.taskBoxNoCheckbox, S.taskBoxBordered, dimmedStyle]}>
      <Text style={S.taskText} numberOfLines={1}>
        {`${count}개`}
      </Text>
    </View>
  )
}

// --------------------------------------------------------------------
// 4. 메인 컴포넌트: MonthView (필터 반영 + 오류 수정)
// --------------------------------------------------------------------
export default function MonthView() {
  const route = useRoute<any>()
  const labelsParam = route.params?.labels ?? null
  // 월별 캐시 (ym -> days/schedules)
  const cacheRef = useRef<Map<string, { days: MonthlyDay[]; schedules: ScheduleData[] }>>(
    new Map(),
  )
  const laneMapRef = useRef<Map<string, number>>(new Map())

  const mapApiToScheduleData = (raw: any): UISchedule => ({
    id: String(raw.id),
    name: raw.title ?? raw.name ?? '',
    date: (raw.date ?? raw.startDate ?? '').slice(0, 10),
    isRecurring: !!raw.isRepeat,
    isTask: !!raw.isTask,
    labelId: String(raw.labelId ?? ''), // ← 비면 '' 로 통일
    isCompleted: !!raw.isCompleted,
    colorKey:
      typeof raw.colorKey === 'string'
        ? raw.colorKey.replace(/^#/, '').toUpperCase()
        : undefined,

    ...(raw.startDate && raw.endDate
      ? {
          multiDayStart: raw.startDate.slice(0, 10),
          multiDayEnd: raw.endDate.slice(0, 10),
        }
      : {}),
  })

  // 페이드 값
  const fade = useRef(new Animated.Value(1)).current

  // labels → 활성 라벨 id 배열로 안전 변환
  const activeLabelIds: string[] | null = useMemo(() => {
    if (!Array.isArray(labelsParam)) return null
    const enabled = labelsParam
      .filter((l: any) => l && typeof l === 'object' && 'enabled' in l && 'id' in l)
      .filter((l: any) => !!l.enabled)
      .map((l: any) => String(l.id))
    // 전부 켜짐이면 = 필터 OFF
    const allOn = enabled.length === labelsParam.length
    return allOn ? null : enabled
  }, [labelsParam])

  const pad = (n: number) => String(n).padStart(2, '0')

  const toYM = (src: string | Date): string => {
    const d = typeof src === 'string' ? new Date(src) : src
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  const monthStart = (ym: string) => `${ym}-01`

  const parseYM = (s: string) => {
    const [y, m] = s.split('-').map(Number)
    return { year: y, monthIndex: m - 1 } // 0-index
  }

  const [focusedDateISO, setFocusedDateISO] = useState<string>(today())

  // 달 상태: 이 값만 바뀌면 전체가 그 달 기준으로 다시 그림
  const [ym, setYm] = useState<string>(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
  })

  // (1) 외부가 날짜를 바꾸면 해당 달로 이동
  useEffect(() => {
    const onSetDate = (iso: string) => {
      const nextYM = toYM(iso)
      setYm((prev) => (prev === nextYM ? prev : nextYM))
      // 캘린더 라이브러리 스크롤/이동이 필요하면 여기서 호출
      // calendarRef.current?.scrollToMonth(monthStart(nextYM))
    }
    bus.on('calendar:set-date', onSetDate)
    return () => bus.off('calendar:set-date', onSetDate)
  }, [])

  // (2) ym이 확정되면 → 모두에게 현재 상태 방송 + API 조회
  useEffect(() => {
    if (!ym) return
    // 방송만 유지: 헤더/모달 동기화
    bus.emit('calendar:state', { date: monthStart(ym), mode: 'month' })
  }, [ym])

  // (3) 다른 컴포넌트가 현재 상태를 물으면 즉시 회신
  useEffect(() => {
    const reply = () =>
      bus.emit('calendar:state', { date: monthStart(ym), mode: 'month' })
    bus.on('calendar:request-sync', reply)
    return () => bus.off('calendar:request-sync', reply)
  }, [ym])

  // 해당 월만 새로 조회
  const fetchFresh = useCallback(
    async (targetYM: string) => {
      try {
        // 1. 월간 페이로드
        const fresh = await fetchMonthlyApi(targetYM)

        // 2. 월간 → 화면 모델(ScheduleData[])
        const schedulesFromMonth = adaptMonthlyToSchedules(fresh) as ScheduleData[]

        // 3. 같은 달 Task
        const tasksThisMonth = await fetchTasksForMonth(targetYM)

        // 4. 색상 맵: spanEvents + days[*].events 모두에서 colorKey 수집
        const colorById = new Map<string, string | undefined>()
        ;(fresh.spanEvents ?? []).forEach((e: any) => {
          colorById.set(String(e.id), e.colorKey)
        })
        ;(fresh.days ?? []).forEach((d: any) => {
          ;(d.events ?? []).forEach((ev: any) => {
            colorById.set(String(ev.id), ev.colorKey)
          })
        })

        // 5. 병합 + colorKey 보충
        const merged: UISchedule[] = [...schedulesFromMonth, ...tasksThisMonth].map(
          (it) => ({
            ...it,
            colorKey: (it as any).colorKey ?? colorById.get(String(it.id)) ?? undefined,
          }),
        )

        // 6. 캐시/상태 반영
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

  // ym -> (year, monthIndex) 메모
  const { year, monthIndex } = useMemo(() => parseYM(ym), [ym])

  const [calendarDates, setCalendarDates] = useState<CalendarDateItem[]>([])
  const focusedDate = useMemo(() => new Date(focusedDateISO), [focusedDateISO])
  const [days, setDays] = useState<MonthlyDay[]>([])
  const [loading, setLoading] = useState(false)

  //이벤트 구독: 모달/다른 화면에서 월을 바꾸면 여기로 반영
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return

      // 1. 색상 정규화
      const raw = {
        ...payload.item,
        colorKey:
          typeof payload.item?.colorKey === 'string'
            ? payload.item.colorKey.replace(/^#/, '').toUpperCase()
            : undefined,
      }

      const normalized = mapApiToScheduleData(raw)

      // 2. 이번 달 아닌 건 무시
      const ymOf = (iso?: string) => (iso ? iso.slice(0, 7) : '')
      const itemYM = normalized.multiDayStart
        ? ymOf(normalized.multiDayStart)
        : ymOf(normalized.date)
      if (itemYM !== ym) return

      // 3. 병합: update 시 colorKey가 비면 기존 colorKey를 보존
      setServerSchedules((prev) => {
        let next: UISchedule[]
        if (payload.op === 'create') {
          next = [...prev, normalized]
        } else if (payload.op === 'update') {
          next = prev.map((it) =>
            it.id === normalized.id
              ? {
                  ...it,
                  ...normalized,
                  colorKey: normalized.colorKey ?? it.colorKey,
                }
              : it,
          )
        } else {
          next = prev.filter((it) => it.id !== normalized.id)
        }
        laneMapRef.current = buildLaneMap(next.filter(isSpan))
        return next
      })
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [ym])

  const renderWeeks = (dates: CalendarDateItem[]): CalendarDateItem[][] => {
    const weeks: CalendarDateItem[][] = []
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7))
    }
    return weeks
  }

  const handleDatePress = (dateItem: CalendarDateItem) => {
    if (!dateItem.isCurrentMonth) return
    const d = dateItem.fullDate
    setFocusedDateISO(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }

  // task API
  const hhmm = (s?: string | null) => {
    if (!s) return undefined
    const m = /(\d{1,2}):(\d{2})/.exec(String(s))
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : undefined
  }

  // 서버에서 가져온 월간
  const [serverSchedules, setServerSchedules] = useState<UISchedule[]>([])

  useEffect(() => {
    laneMapRef.current = buildLaneMap(serverSchedules.filter(isSpan))
  }, [serverSchedules])

  // 월간 fetch
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
    const res = await http.get('/api/calendar/monthly', { params: { month: ymStr } })
    const data = res.data?.data ?? {}
    return {
      days: (data.days ?? []) as MonthlyDay[],
      spanEvents: (data.spanEvents ?? []) as MonthlyPayload['spanEvents'],
    }
  }

  // 월간 조회
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)

        // 1. 월간 페이로드 가져오기
        const fresh = await fetchMonthlyApi(ym)

        // 2. 월간 → 화면 모델(ScheduleData[])
        const schedulesFromMonth = adaptMonthlyToSchedules(fresh)

        // 3. 같은 달 Task → 화면 모델(ScheduleData[])
        const tasksThisMonth = await fetchTasksForMonth(ym)

        // 4. 합치기
        // 새로: spanEvents + days[*].events 모두 스캔해서 색상 맵 구성
        const colorById = new Map<string, string | undefined>()
        // 멀티데이(기간 이벤트)
        fresh.spanEvents.forEach((e) => {
          colorById.set(String(e.id), e.colorKey)
        })
        // 단일/반복 이벤트(일자별)
        ;(fresh.days ?? []).forEach((d: any) => {
          ;(d.events ?? []).forEach((ev: any) => {
            colorById.set(String(ev.id), ev.colorKey)
          })
        })
        // schedulesFromMonth(단일/반복 + 스팬 변환 결과) + tasks 를 병합
        const merged: UISchedule[] = [...schedulesFromMonth, ...tasksThisMonth].map(
          (it) => ({
            ...it,
            // 이미 들어있으면 유지, 없으면 우리가 만든 맵에서 보충
            colorKey: (it as any).colorKey ?? colorById.get(String(it.id)) ?? undefined,
          }),
        )
        setServerSchedules(merged)

        const spansOnly = merged.filter((s) => s.multiDayStart && s.multiDayEnd)
        laneMapRef.current = buildLaneMap(merged.filter(isSpan))

        if (!alive) return
        setDays(fresh.days) // 배열만 세팅 (타입 에러 사라짐)
        setServerSchedules(merged) // 화면 렌더 소스
      } catch (e) {
        if (alive) setServerSchedules([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [ym])

  // ym 바뀌면 살짝 어둡게
  useEffect(() => {
    Animated.timing(fade, { toValue: 0.4, duration: 120, useNativeDriver: true }).start()
  }, [ym])

  // 로딩 끝나면 다시 밝게
  useEffect(() => {
    if (!loading) {
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    }
  }, [loading])

  useEffect(() => {
    setFocusedDateISO(`${year}-${pad(monthIndex + 1)}-01`)
  }, [year, monthIndex])

  // 필터링 된 일정
  const filteredSchedules = useMemo(
    () =>
      activeLabelIds
        ? serverSchedules.filter((s) => activeLabelIds.includes(s.labelId))
        : serverSchedules,
    [activeLabelIds, serverSchedules],
  )

  useEffect(() => {
    setCalendarDates(
      getCalendarDates(
        year, // ym의 연도
        monthIndex, // ym의 월(0-index)
        new Date(focusedDateISO), // 포커스 표시만 이 값 사용
        filteredSchedules,
        laneMapRef.current,
      ),
    )
  }, [year, monthIndex, focusedDateISO, filteredSchedules])

  return (
    <ScreenWithSidebar mode="overlay">
      <View style={S.contentContainerWrapper}>
        {/* 요일 헤더 */}
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

        {/* 달력 그리드 */}
        <ScrollView
          style={S.contentArea}
          contentContainerStyle={S.scrollContentContainer}
        >
          <Animated.View style={[S.calendarGrid, { opacity: fade }]}>
            {renderWeeks(calendarDates).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={S.weekRow}>
                {week.map((dateItem: CalendarDateItem, i: number) => {
                  const weekMaxLane = Math.max(
                    -1,
                    ...week.flatMap((d) =>
                      d.schedules.map((it) => (it as any).__lane ?? -1),
                    ),
                  )
                  const itemsToRender: DisplayItem[] = getDisplayItems(
                    dateItem.schedules,
                    dateItem.tasks,
                  )

                  const isFocusedThis =
                    dateItem.fullDate.toDateString() === focusedDate.toDateString()
                  const isTodayButNotFocused = !isFocusedThis && dateItem.isToday
                  const isCurrentMonth = dateItem.isCurrentMonth

                  const dayOfWeekStyle = isCurrentMonth
                    ? i % 7 === 0
                      ? S.sunDate
                      : (i + 1) % 7 === 0
                        ? S.satDate
                        : null
                    : null

                  const currentDateISO = `${dateItem.fullDate.getFullYear()}-${String(dateItem.fullDate.getMonth() + 1).padStart(2, '0')}-${String(dateItem.fullDate.getDate()).padStart(2, '0')}`

                  return (
                    <TouchableOpacity
                      key={dateItem.fullDate.toISOString()}
                      style={[S.dateCell]}
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                      onPress={() => handleDatePress(dateItem)}
                      activeOpacity={isCurrentMonth ? 0.7 : 1}
                      disabled={!isCurrentMonth}
                    >
                      <View
                        style={[
                          S.ringBase,
                          isFocusedThis ? S.focusRing : null,
                          !isFocusedThis && dateItem.isToday ? S.todayRing : null,
                        ]}
                      />
                      {/* 날짜 번호 및 스타일 */}
                      <View style={S.dateNumberWrapper}>
                        {dateItem.isToday ? <View style={S.todayRoundedSquare} /> : null}
                        <Text
                          style={[
                            ts('monthDate'),
                            S.dateNumberBase,
                            isCurrentMonth
                              ? dayOfWeekStyle
                              : i % 7 === 0
                                ? S.otherMonthSunDate
                                : (i + 1) % 7 === 0
                                  ? S.otherMonthSatDate
                                  : S.otherMonthDateText,
                            isCurrentMonth && dateItem.isHoliday
                              ? S.holidayDateText
                              : null,
                          ]}
                        >
                          {String(dateItem.day)}
                        </Text>

                        {dateItem.holidayName ? (
                          <Text
                            style={[
                              S.holidayText,
                              !isCurrentMonth ? S.otherMonthHolidayText : null,
                              dateItem.holidayName === '크리스마스'
                                ? S.smallHolidayText
                                : null,
                            ]}
                          >
                            {dateItem.holidayName.substring(0, 4)}
                          </Text>
                        ) : null}
                      </View>

                      {/* 일정 및 할 일 영역 */}
                      <View style={S.eventArea}>
                        {(() => {
                          // 1 TaskSummary는 분리
                          const taskSummary = itemsToRender.find(
                            (it) => (it as any).isTaskSummary,
                          )
                          const onlySchedules = itemsToRender.filter(
                            (it) => !(it as any).isTaskSummary,
                          )

                          // 2 이번 주의 최대 레인 수만큼 슬롯 준비(0..weekMaxLane)
                          const laneSlots: (ScheduleData | null)[] = Array.from(
                            { length: Math.max(0, weekMaxLane + 1) },
                            () => null,
                          )

                          // 3 오늘 표시할 일정들을 각자의 레인 위치에 꽂기
                          for (const it of onlySchedules) {
                            const l = (it as any).__lane ?? 0
                            if (l >= 0 && l < laneSlots.length)
                              laneSlots[l] = it as ScheduleData
                          }

                          // 4 레인 순서대로: 없으면 스페이서, 있으면 아이템
                          return (
                            <>
                              {laneSlots.map((slot, idx) =>
                                slot ? (
                                  <ScheduleItem
                                    key={`${slot.id}-${currentDateISO}-lane${idx}`}
                                    schedule={slot}
                                    currentDateISO={currentDateISO}
                                    isCurrentMonth={isCurrentMonth}
                                  />
                                ) : (
                                  <View key={`spacer-${idx}`} style={S.laneSpacer} />
                                ),
                              )}

                              {/* 5 태스크 요약은 레인 아래에 고정 */}
                              {taskSummary ? (
                                <TaskSummaryBox
                                  key={(taskSummary as any).id}
                                  count={(taskSummary as any).count}
                                  isCurrentMonth={isCurrentMonth}
                                />
                              ) : null}
                            </>
                          )
                        })()}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  )
}

// --------------------------------------------------------------------
// 5. 스타일시트 정의 (S) - 기존 스타일 전부 유지
// --------------------------------------------------------------------
const { width: screenWidth } = Dimensions.get('window')
const horizontalPadding = 12
const cellWidth = (screenWidth - horizontalPadding) / 7
const MIN_CELL_HEIGHT = 115

const S = StyleSheet.create({
  contentContainerWrapper: { flex: 1, paddingBottom: 20, paddingTop: 0 },
  contentArea: { flex: 1, paddingHorizontal: 6, paddingTop: 5 },
  scrollContentContainer: { paddingBottom: 20 },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 0,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  dayCellFixed: { width: cellWidth, alignItems: 'center' },
  dayTextBase: { textAlign: 'center', color: '#333', fontWeight: '600', fontSize: 12 },
  sunText: { color: 'red' },
  satText: { color: 'blue' },

  calendarGrid: {},
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dateCell: {
    width: cellWidth,
    minHeight: MIN_CELL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    position: 'relative',
    borderWidth: 0,
    paddingBottom: 2,
    overflow: 'visible',
    zIndex: 1,
  },
  dateNumberWrapper: {
    height: 18, // 날짜행 높이 고정
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 6,
    paddingTop: 0, // ⬅︎ 위 여백 제거
    position: 'relative',
  },
  eventArea: {
    width: '100%',
    paddingHorizontal: EVENT_HPAD,
    paddingTop: EVENT_AREA_PADDING_TOP,
    paddingBottom: ITEM_MARGIN_VERTICAL,
  },
  focusedDayBorder: { borderWidth: 0.8, borderColor: '#AAAAAA', borderRadius: 4 },
  todayBorder: { borderWidth: 1.5, borderColor: '#CCCCCC', borderRadius: 4 },
  dateNumberBase: { color: 'black', zIndex: 1 },

  // 오버레이 링
  ringBase: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 6,
    pointerEvents: 'none',
    zIndex: 3,
  },
  focusRing: { borderWidth: 0.8, borderColor: '#AAAAAA' },
  todayRing: { borderWidth: 1.0, borderColor: '#CCCCCC', zIndex: 0 },

  // 빠진 스타일 전부 복구
  sunDate: { color: 'red' },
  satDate: { color: 'blue' },
  otherMonthDateText: { color: 'gray' },
  otherMonthSunDate: { color: '#F0A0A0' },
  otherMonthSatDate: { color: '#A0A0FF' },
  otherMonthHolidayText: { color: '#F08080' },

  todayDateText: { fontWeight: 'bold' },
  holidayDateText: { color: 'red' },
  todayRoundedSquare: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 4,
    top: 3.2,
    left: 3,
    backgroundColor: 'rgba(176, 79, 255, 0.15)',
    zIndex: 1,
  },
  holidayText: {
    position: 'absolute',
    right: 6,
    top: 3,
    fontSize: 8,
    color: 'red',
    lineHeight: 14,
    fontWeight: 'normal',
  },
  smallHolidayText: { fontSize: 7 },
  scheduleBox: {
    height: SCHEDULE_BOX_HEIGHT,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  //  반복 일정: 진한 보라색 배경
  recurringSchedule: {
    backgroundColor: SCHEDULE_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // 단일 일정: 연한 보라색 배경
  singleSchedule: {
    backgroundColor: SCHEDULE_LIGHT_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  singleDaySolid: {
    backgroundColor: SCHEDULE_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  singleDayTextWhite: { color: '#FFF', fontWeight: '700', marginTop: -1 },
  // 경계선: 진한 보라색
  singleScheduleBorder: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
  },
  scheduleText: {
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: SCHEDULE_BOX_HEIGHT,
  },
  //  반복 일정 텍스트: 흰색
  recurringScheduleText: {
    color: '#FFFFFF',
    marginTop: 0.5,
    fontWeight: '700',
    paddingLeft: 4,
  },
  // 단일 일정 텍스트: 검정색
  singleScheduleText: { color: '#000', marginTop: -1 },
  endTodayCap: {
    position: 'absolute',
    right: -3,
    top: (SCHEDULE_BOX_HEIGHT - 8) / 2,
    width: 6,
    height: 8,
    borderRadius: 4,
  },

  checkboxTouchArea: { marginRight: 3, alignSelf: 'center' },
  checkboxBase: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkboxOff: { backgroundColor: '#FFFFFF', borderColor: '#000000' },
  checkboxOn: { backgroundColor: DARK_GRAY_COLOR, borderColor: DARK_GRAY_COLOR },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: CHECKBOX_SIZE,
  },
  taskBox: {
    height: TASK_BOX_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#000000',
    paddingLeft: 1,
    paddingRight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  taskBoxNoCheckbox: {
    height: TASK_BOX_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 2,
    paddingLeft: 1,
    paddingRight: 0,
    justifyContent: 'center',
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  taskBoxBordered: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingLeft: 2,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // Task 텍스트 스타일
  taskText: {
    fontSize: 8,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    lineHeight: TASK_BOX_HEIGHT,
    textAlignVertical: 'center',
  },

  dimmedItem: {
    opacity: 0.3,
  },

  // 멀티데이(기간이 긴 일정)스타일
  multiDayContainer: {
    width: '100%',
    marginBottom: ITEM_MARGIN_VERTICAL,
    height: SCHEDULE_BOX_HEIGHT,
    justifyContent: 'center',
    overflow: 'visible',
  },
  multiBarBase: {
    height: SCHEDULE_BOX_HEIGHT,
    backgroundColor: SCHEDULE_LIGHT_COLOR,
    paddingHorizontal: 0,
    justifyContent: 'center',
    borderRadius: 0,

    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'transparent',
  },
  multiBarLeftEdge: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
  },
  multiBarRightEdge: {
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  multiBarText: {
    fontSize: 9,
    color: '#000',
    fontWeight: '500',
    lineHeight: SCHEDULE_BOX_HEIGHT,
  },
  multiStartContainer: {},
  multiEndContainer: {},
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    zIndex: 99,
  },

  laneSpacer: {
    height: SCHEDULE_BOX_HEIGHT,
    marginBottom: ITEM_MARGIN_VERTICAL,
  },

  laneRow: { marginBottom: ITEM_MARGIN_VERTICAL },
  laneRowLast: { marginBottom: 0 },
})
