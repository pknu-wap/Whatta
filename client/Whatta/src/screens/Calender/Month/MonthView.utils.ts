import { ScheduleData } from '@/api/adapter'
import { getHolidayName } from './holidayUtils'
import { today } from './dateUtils'

export const ts = (styleName: string): any => {
  if (styleName === 'monthDate') {
    return { fontSize: 15 }
  }
  return {}
}

// 일정 위치 계산
export function buildLaneMap(spans: ScheduleData[]) {
  const list = spans
    .filter((s) => s.multiDayStart && s.multiDayEnd)
    .map((s) => ({ ...s, start: s.multiDayStart!, end: s.multiDayEnd! }))
    .sort(
      (a, b) =>
        Number(Boolean((b as any).__holidayReserve)) - Number(Boolean((a as any).__holidayReserve)) ||
        a.start.localeCompare(b.start) ||
        b.end.localeCompare(a.end) ||
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

// 특정 날짜 분리
export function getEventsForDate(
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

  const spansOnly = allSchedules.filter(
    (it) => it.multiDayStart && it.multiDayEnd,
  ) as (ScheduleData & { __lane?: number })[]
  const spansToday = spansOnly.filter(
    (s) => s.multiDayStart! <= iso && iso <= s.multiDayEnd!,
  )

  const spanLen = (s: WithLane) =>
    new Date(s.multiDayEnd!).getTime() - new Date(s.multiDayStart!).getTime()

  spansToday.forEach((ev) => {
    ev.__lane = laneMap.get(String(ev.id)) ?? 0
  })
  spansToday.sort(
    (a, b) =>
      (a.__lane ?? 0) - (b.__lane ?? 0) ||
      spanLen(b) - spanLen(a) ||
      (a.name || '').localeCompare(b.name || ''),
  )

  // 단일/Task 배치
  const firstFreeLane = Math.max(-1, ...spansToday.map((s) => s.__lane ?? -1)) + 1

  const toMinutes = (x: any) => {
    const t = x?.startTime ?? x?.start_at ?? x?.time
    if (!t) return 24 * 60
    const m = /(\d{1,2}):(\d{2})/.exec(String(t))
    return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60
  }

  const byName = (a: ScheduleData, b: ScheduleData) =>
    (a.name || '').localeCompare(b.name || '')

  singles.sort(
    (a, b) =>
      Number(Boolean(b.isRecurring)) - Number(Boolean(a.isRecurring)) ||
      toMinutes(a) - toMinutes(b) ||
      byName(a, b),
  )
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

interface TaskSummaryItem {
  isTaskSummary: true
  id: string
  count: number
  tasks: ScheduleData[]
}

export type DisplayItem = ScheduleData | TaskSummaryItem

// 할 일이 2개 이상이면 요약박스
export function getDisplayItems(
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

export interface CalendarDateItem {
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

const TODAY_ISO = today()

// 달력 날짜 만들기
export function getCalendarDates(
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
  const totalCells = Math.ceil((startWeekDay + totalDays) / 7) * 7
  const prevMonthLastDate = new Date(year, month, 0).getDate()
  const systemTodayISO = TODAY_ISO

  for (let i = 0; i < totalCells; i++) {
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
