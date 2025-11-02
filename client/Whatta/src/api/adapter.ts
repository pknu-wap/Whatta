import type { MonthlyDay } from '@/api/calendar'

// 월간 API가 주는 payload 모양을 사용처와 동일하게 타입화
export type MonthlyPayload = {
  days: MonthlyDay[]
  spanEvents: MonthlyEvent[]
}

export type MonthlyEvent = {
  id: string
  title: string
  colorKey?: string
  labels?: any[]
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  isRepeat?: boolean | null
}

export type MonthlyDayAdapter = {
  date: string // 'YYYY-MM-DD'
  events: Array<{
    id: string
    title: string
    colorKey?: string
    isRepeat?: boolean
  }>
  taskCount?: number
}

// 화면 공통 모델
export type ScheduleData = {
  id: string
  name: string
  date: string
  isRecurring: boolean
  isTask: boolean
  labelId: string
  isCompleted: boolean
  multiDayStart?: string
  multiDayEnd?: string
  startTime?: string // 'HH:mm'
  sortTime?: string // 'HH:mm' (Task 정렬용)
}

// payload.days(단일) + payload.spanEvents(멀티데이) → ScheduleData[]
export function adaptMonthlyToSchedules(payload: MonthlyPayload): ScheduleData[] {
  const singles: ScheduleData[] = (payload?.days ?? []).flatMap((d) =>
    (d.events ?? []).map((ev) => ({
      id: String(ev.id),
      name: String(ev.title ?? ''),
      date: String(d.date),
      isRecurring: !!ev.isRepeat,
      isTask: false,
      labelId: '',
      isCompleted: false,
    })),
  )

  const spans: ScheduleData[] = (payload?.spanEvents ?? []).map((se) => ({
    id: String(se.id),
    name: String(se.title ?? ''),
    date: String(se.startDate),
    isRecurring: false,
    isTask: false,
    labelId: '',
    isCompleted: false,
    multiDayStart: String(se.startDate),
    multiDayEnd: String(se.endDate),
  }))

  return [...spans, ...singles]
}
