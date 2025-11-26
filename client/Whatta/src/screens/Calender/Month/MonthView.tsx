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
  Alert,
  Modal,
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { useRoute } from '@react-navigation/native'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { MonthlyDay } from '@/api/calendar'
import { adaptMonthlyToSchedules, ScheduleData } from '@/api/adapter'
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
import OcrSplash from '@/screens/More/OcrSplash'

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

const CHECKBOX_SIZE = 9

const SCHEDULE_BOX_HEIGHT = 17
const TASK_BOX_HEIGHT = 17
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
    return { fontSize: 15 }
  }
  return {}
}

const today = (): string => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`
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

    if (
      lunarData.부처님오신날.month === month &&
      lunarData.부처님오신날.day === day
    ) {
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
      if (it.date === iso) {
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

  // 레인 → 길이(desc) → 이름 순으로 정렬
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

    const itemDateISO = `${itemDate.getFullYear()}-${String(
      itemDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`
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

const pad2 = (n: number) => String(n).padStart(2, '0')

function getDateOfWeek(weekDay: string): string {
  if (!weekDay) return today()

  const key = weekDay.trim().toUpperCase()

  const map: any = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 0,
  }

  const target = map[key]
  if (target === undefined) {
    console.log('❌ Unknown weekDay:', weekDay)
    return today()
  }

  const now = new Date()
  const todayIdx = now.getDay()

  const diff = target - todayIdx
  const d = new Date()
  d.setDate(now.getDate() + diff)

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
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
  if (h === 'FFF' || h === 'FFFFFF') return '#000000'
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.7 ? '#000000' : '#FFFFFF'
}

// 컬러키 → 진한색/연한색 계산
const colorsFromKey = (hex?: string) => {
  const base = (hex && `#${hex.replace('#', '')}`) || '#8B5CF6'
  const light = base.startsWith('#')
    ? `rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(
        base.slice(3, 5),
        16,
      )},${parseInt(base.slice(5, 7), 16)},0.2)`
    : 'rgba(139,92,246,0.2)'
  return { primary: base, light }
}

// 타입가드
function isTaskSummaryItem(item: DisplayItem): item is TaskSummaryItem {
  return (
    typeof (item as any)?.isTaskSummary !== 'undefined' &&
    (item as any).isTaskSummary === true
  )
}
type UISchedule = ScheduleData & { colorKey?: string }

// 월 문자열(YYYY-MM) 기준으로 개월 수 이동
function addMonthsFromYm(ym: string, diff: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}`
}

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

  // Task
  if (schedule.isTask) {
    return (
      <View style={[S.taskBox, S.taskBoxBordered, dimmedStyle]}>
        <View style={S.checkboxTouchArea}>
          <View style={[S.checkboxBase, S.checkboxOff]} />
        </View>
        <Text style={S.taskText} numberOfLines={1} ellipsizeMode="clip">
          {schedule.name}
        </Text>
      </View>
    )
  }

  // Multi-day
  if (schedule.multiDayStart && schedule.multiDayEnd) {
    const dayISO = currentDateISO

    const isWithinRange =
      dayISO >= schedule.multiDayStart && dayISO <= schedule.multiDayEnd
    const inToday = dayISO >= schedule.multiDayStart && dayISO <= schedule.multiDayEnd

    const toLocalISO = (d: Date) => {
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      )
    }

    const cur = new Date(dayISO + 'T00:00:00')
    const prev = new Date(cur)
    prev.setDate(prev.getDate() - 1)
    const prevStr = toLocalISO(prev)
    const inPrev = prevStr >= schedule.multiDayStart && prevStr <= schedule.multiDayEnd
    const dow = cur.getDay()
    const isRowStart = inToday && (!inPrev || dow === 0)

    if (!isRowStart) {
      return <View style={S.laneSpacer} />
    }

    const spanToWeekEnd = 7 - dow
    const end = new Date(schedule.multiDayEnd + 'T00:00:00')
    const daysDiff =
      Math.floor((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const colSpan = Math.max(1, Math.min(spanToWeekEnd, daysDiff))
    const reachWeekEnd = colSpan === spanToWeekEnd

    const { primary: primaryColor, light: softColor } = colorsFromKey(
      schedule.colorKey,
    )

    const isRealStart = dayISO === schedule.multiDayStart
    const isRealEndInThisRow = colSpan === daysDiff

    const width =
      colSpan * cellWidth -
      EVENT_HPAD * 2 +
      (isRealEndInThisRow ? SINGLE_SCHEDULE_BORDER_WIDTH : 0)
    const segPosStyle = reachWeekEnd ? { left: -1, right: 0 } : { left: -EVENT_HPAD }

    return (
      <View style={[S.multiDayContainer, !isCurrentMonth ? S.dimmedItem : null]}>
        <View
          style={[
            S.multiSegAbs,
            segPosStyle,
            {
              width,
              backgroundColor: softColor,
              borderLeftWidth: isRealStart ? SINGLE_SCHEDULE_BORDER_WIDTH : 0,
              borderRightWidth: isRealEndInThisRow ? SINGLE_SCHEDULE_BORDER_WIDTH : 0,
              borderColor: primaryColor,
              borderTopLeftRadius: isRealStart ? 3 : 0,
              borderBottomLeftRadius: isRealStart ? 3 : 0,
              borderTopRightRadius: isRealEndInThisRow ? 3 : 0,
              borderBottomRightRadius: isRealEndInThisRow ? 3 : 0,
              paddingLeft: isRealStart ? TEXT_HORIZONTAL_PADDING : 4,
              paddingRight: isRealEndInThisRow ? TEXT_HORIZONTAL_PADDING : 4,
            },
          ]}
        >
          {isRealStart ? (
            <Text numberOfLines={1} ellipsizeMode="clip" style={S.multiBarText}>
              {schedule.name}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  // 단일 일정
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
        ellipsizeMode="clip"
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
    <View style={[S.taskBox, S.taskBoxBordered, dimmedStyle]}>
      <View style={S.checkboxTouchArea}>
        <View style={[S.checkboxBase, S.checkboxOff]} />
      </View>
      <Text style={S.taskText} numberOfLines={1}>
        {`${count}개`}
      </Text>
    </View>
  )
}

// --------------------------------------------------------------------
// 4. 메인 컴포넌트: MonthView
// --------------------------------------------------------------------
export default function MonthView() {
  const [ocrSplashVisible, setOcrSplashVisible] = useState(false)
  const [ocrModalVisible, setOcrModalVisible] = useState(false)
  const [ocrEvents, setOcrEvents] = useState<OCREventDisplay[]>([])

  // 📌 OCR 이미지 추가 이벤트
  const [imagePopupVisible, setImagePopupVisible] = useState(false)

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

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Month') return
      setImagePopupVisible(true)
    }

    bus.on('popup:image:create', handler)
    return () => bus.off('popup:image:create', handler)
  }, [])

  // 월별 캐시 (ym -> days/schedules)
  const cacheRef = useRef<Map<string, { days: MonthlyDay[]; schedules: ScheduleData[] }>>(
    new Map(),
  )
  const laneMapRef = useRef<Map<string, number>>(new Map())

  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')

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

  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

  async function openTaskPopupFromApi(taskId: string) {
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

  const mapApiToScheduleData = (raw: any): UISchedule => ({
    id: String(raw.id),
    name: raw.title ?? raw.name ?? '',
    date: (raw.date ?? raw.startDate ?? '').slice(0, 10),
    isRecurring: !!raw.isRepeat,
    isTask: !!raw.isTask,
    labelId: String(raw.labelId ?? ''),
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

  const fade = useRef(new Animated.Value(1)).current

  const pad = (n: number) => String(n).padStart(2, '0')
  const toYM = (src: string | Date): string => {
    const d = typeof src === 'string' ? new Date(src) : src
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  const monthStart = (ym: string) => `${ym}-01`

  const parseYM = (s: string) => {
    const [y, m] = s.split('-').map(Number)
    return { year: y, monthIndex: m - 1 }
  }

  const [focusedDateISO, setFocusedDateISO] = useState<string>(today())
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

  const [ym, setYm] = useState<string>(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
  })

  // 월 이동 + 스와이프에서 호출
  const goMonth = useCallback(
    (diff: number) => {
      setYm((prevYm) => addMonthsFromYm(prevYm, diff))
    },
    [],
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

  // 외부에서 날짜 세팅
  useEffect(() => {
    const onSetDate = (iso: string) => {
      const nextYM = toYM(iso)
      setYm((prev) => (prev === nextYM ? prev : nextYM))
    }
    bus.on('calendar:set-date', onSetDate)
    return () => bus.off('calendar:set-date', onSetDate)
  }, [])

  // (2) ym이 확정되면 → 모두에게 현재 상태 방송 + API 조회
  // useEffect(() => {
  //   if (!ym) return
  //   // 방송만 유지: 헤더/모달 동기화
  //   bus.emit('calendar:state', { date: monthStart(ym), mode: 'month' })
  // }, [ym])

  // // (3) 다른 컴포넌트가 현재 상태를 물으면 즉시 회신
  // useEffect(() => {
  //   const reply = () =>
  //     bus.emit('calendar:state', { date: monthStart(ym), mode: 'month' })
  //   bus.on('calendar:request-sync', reply)
  //   return () => bus.off('calendar:request-sync', reply)
  // }, [ym])

  useFocusEffect(
    React.useCallback(() => {
      bus.emit('calendar:state', { date: monthStart(ym), mode: 'month' })
    }, [ym]),
  )

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

        const merged: UISchedule[] = [...schedulesFromMonth, ...tasksThisMonth].map(
          (it) => ({
            ...it,
            colorKey: (it as any).colorKey ?? colorById.get(String(it.id)) ?? undefined,
          }),
        )

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

  const { year, monthIndex } = useMemo(() => parseYM(ym), [ym])

  const [calendarDates, setCalendarDates] = useState<CalendarDateItem[]>([])
  const focusedDate = useMemo(() => new Date(focusedDateISO), [focusedDateISO])
  const [days, setDays] = useState<MonthlyDay[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return

      const raw = {
        ...payload.item,
        colorKey:
          typeof payload.item?.colorKey === 'string'
            ? payload.item.colorKey.replace(/^#/, '').toUpperCase()
            : undefined,
      }

      const normalized = mapApiToScheduleData(raw)

      const ymOf = (iso?: string) => (iso ? iso.slice(0, 7) : '')
      const itemYM = normalized.multiDayStart
        ? ymOf(normalized.multiDayStart)
        : ymOf(normalized.date)
      if (itemYM !== ym) return

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

  type ExtendedScheduleData = ScheduleData & {
    memo?: string
    place?: string
    time?: string
  }

  type ExtendedScheduleDataWithColor = ExtendedScheduleData & {
    colorKey?: string
  }

  const handleDatePress = (dateItem: CalendarDateItem) => {
    if (!dateItem.isCurrentMonth) return

    const d = dateItem.fullDate
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setFocusedDateISO(isoDate)
    bus.emit('calendar:set-date', isoDate)

    setSelectedDayData({
      date: `${d.getMonth() + 1}월 ${d.getDate()}일`,
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
      spanEvents: (dateItem.schedules as ExtendedScheduleDataWithColor[])
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
      normalEvents: (dateItem.schedules as ExtendedScheduleDataWithColor[])
        .filter((s) => !s.multiDayStart && !s.multiDayEnd && !s.isTask)
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

      ;(day.events ?? []).forEach((ev: any) => {
        list.push({
          id: String(ev.id),
          name: ev.title ?? ev.name ?? '',
          date: dateISO,
          isRecurring: !!ev.isRepeat,
          isTask: !!ev.isTask,
          isCompleted: !!ev.isCompleted,
          labelId: pickLabelId(ev),
          colorKey:
            typeof ev.colorKey === 'string'
              ? ev.colorKey.replace(/^#/, '').toUpperCase()
              : undefined,
        })
      })
    })

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

        const merged: UISchedule[] = [...monthlySchedules, ...tasksThisMonth]
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

  useEffect(() => {
    setFocusedDateISO(`${year}-${pad(monthIndex + 1)}-01`)
  }, [year, monthIndex])

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

  return (
    <ScreenWithSidebar mode="overlay">
      <GestureDetector gesture={swipeGesture}>
        <View collapsable={false} style={{ flex: 1 }}>
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

                      const isCurrentMonth = dateItem.isCurrentMonth

                      const dayOfWeekStyle = isCurrentMonth
                        ? i % 7 === 0
                          ? S.sunDate
                          : (i + 1) % 7 === 0
                            ? S.satDate
                            : null
                        : null

                      const currentDateISO = `${dateItem.fullDate.getFullYear()}-${String(
                        dateItem.fullDate.getMonth() + 1,
                      ).padStart(2, '0')}-${String(
                        dateItem.fullDate.getDate(),
                      ).padStart(2, '0')}`

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
                              const taskSummary = itemsToRender.find(
                                (it) => (it as any).isTaskSummary,
                              )
                              const onlySchedules = itemsToRender.filter(
                                (it) => !(it as any).isTaskSummary,
                              )

                              const laneSlots: (ScheduleData | null)[] = Array.from(
                                { length: Math.max(0, weekMaxLane + 1) },
                                () => null,
                              )

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
                                        isCurrentMonth={isCurrentMonth}
                                      />
                                    ) : (
                                      <View
                                        key={`spacer-${idx}`}
                                        style={S.laneSpacer}
                                      />
                                    ),
                                  )}

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
        onClose={() => {
          setEventPopupVisible(false)
          setEventPopupData(null)
        }}
      />
      <TaskDetailPopup
        visible={taskPopupVisible}
        mode={taskPopupMode}
        taskId={taskPopupId ?? undefined}
        initialTask={taskPopupTask}
        onClose={() => {
          setTaskPopupVisible(false)
          setTaskPopupTask(null)
          setTaskPopupId(null)
        }}
        onSave={async (form) => {
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
          } catch (err) {
            console.error('❌ 테스크 저장 실패:', err)
            Alert.alert('오류', '테스크를 저장하지 못했습니다.')
          }
        }}
        onDelete={
          taskPopupMode === 'edit'
            ? async () => {
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
              }
            : undefined
        }
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
        onAddEvent={(ev) => {
          // 월간 뷰에서 OCR로 가져온 이벤트를 어떻게 추가할지 필요하면 여기 구현
        }}
      />
    </ScreenWithSidebar>
  )
}

// --------------------------------------------------------------------
// 5. 스타일시트 정의 (S)
// --------------------------------------------------------------------
const { width: screenWidth } = Dimensions.get('window')
const horizontalPadding = 12
const cellWidth = (screenWidth - horizontalPadding) / 7
const MIN_CELL_HEIGHT = 115

const S = StyleSheet.create({
  contentContainerWrapper: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  contentArea: { flex: 1, paddingHorizontal: 6, paddingTop: 5 },
  scrollContentContainer: { paddingBottom: 20 },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 5,
    marginTop: 2,
    paddingHorizontal: 6,
  },
  dayCellFixed: { width: cellWidth, alignItems: 'center' },
  dayTextBase: { textAlign: 'center', color: '#333', fontWeight: '600', fontSize: 15 },
  sunText: { color: 'red' },
  satText: { color: '#000000' },

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
    height: 18,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 6,
    paddingTop: 0,
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

  sunDate: { color: 'red' },
  satDate: { color: '#000000' },
  otherMonthDateText: { color: 'gray' },
  otherMonthSunDate: { color: '#F0A0A0' },
  otherMonthSatDate: { color: '#A0A0FF' },
  otherMonthHolidayText: { color: '#F08080' },

  todayDateText: { fontWeight: 'bold' },
  holidayDateText: { color: 'red' },
  todayRoundedSquare: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 4,
    top: 1,
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
    overflow: 'hidden',
  },
  recurringSchedule: {
    backgroundColor: SCHEDULE_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
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
  singleScheduleBorder: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
  },
  scheduleText: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: SCHEDULE_BOX_HEIGHT,
  },
  recurringScheduleText: {
    color: '#FFFFFF',
    marginTop: 0.5,
    fontWeight: '700',
    paddingLeft: 4,
  },
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
  taskText: {
    fontSize: 12,
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

  multiDayContainer: {
    width: '100%',
    marginBottom: ITEM_MARGIN_VERTICAL,
    height: SCHEDULE_BOX_HEIGHT,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
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
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
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

  multiSegAbs: {
    position: 'absolute',
    left: -EVENT_HPAD,
    top: 0,
    height: SCHEDULE_BOX_HEIGHT,
    justifyContent: 'center',
    zIndex: 10,
  },
})
