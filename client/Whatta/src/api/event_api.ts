import { http } from '@/lib/http'

export type RepeatUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type Repeat = {
  interval: number
  unit: RepeatUnit
  on?: string[]
  endDate?: string
}

export interface RepeatRule {
  interval: number // 1, 2, 3... 반복 간격
  unit: 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  on: string[] // WEEK일 때 ["MON","TUE"] 이런 식
  endDate: string | null // yyyy-mm-dd
  exceptionDates?: string[]
}

export type CreateEventPayload = {
  title: string
  content?: string
  labels?: number[]
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  startTime?: string | null // "HH:mm:ss"
  endTime?: string | null // "HH:mm:ss"
  repeat?: RepeatRule | null
  colorKey?: string // "FFFFFF"
  reminderNoti?: { day: number; hour: number; minute: number } | null
}

type CreateEventResponse<Data = any> = {
  data?: Data
  id?: string
  eventId?: string
  _id?: string
}

export async function createEvent(payload: CreateEventPayload) {
  const res = await http.post<CreateEventResponse>('/event', payload)
  const raw = res.data
  const eventId =
    (raw as any)?.data?.id ??
    (raw as any)?.data?._id ??
    (raw as any)?.id ??
    (raw as any)?._id ??
    (raw as any)?.eventId

  //console.log('✅ createEvent response:', JSON.stringify(raw, null, 2))
  if (!eventId) {
    //console.warn('⚠️ eventId를 응답에서 찾지 못했습니다. 응답 구조를 확인해주세요.')
  }
  return { eventId, raw }
}

export async function getEvent(eventId: string) {
  const res = await http.get(`/event/${eventId}`)
  //console.log('📥 getEvent detail:', JSON.stringify(res.data, null, 2))
  return res.data
}

// 1. 월 시작/끝 yyyy-mm-dd
export const monthRange = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0) // 말일
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: toISO(start), end: toISO(end) }
}

// 2. Task 조회
export async function fetchTasksRaw(ym: string): Promise<any[]> {
  const res = await http.get('/task', {
    params: { month: ym }, // 백엔드가 month 파라미터 안 쓰면 이 줄은 빼도 됩니다
  })

  return Array.isArray(res.data?.data) ? res.data.data : []
}

// 3. Task → MonthView용 ScheduleData로 변환
//    - 시작 날짜: placementDate
//    - 시작 시간: placementTime(정렬용)
//    - 라벨: labels.labels[0]?.id
export type ScheduleData = {
  id: string
  name: string
  date: string // 'YYYY-MM-DD'
  isRecurring: boolean
  isTask: boolean
  labelId: string
  isCompleted: boolean
  sortTime?: string // 'HH:mm:ss' 정렬용(옵션)
  multiDayStart?: string
  multiDayEnd?: string
}

export type EventItem = {
  id: string
  title: string
  content?: string
  labels?: number[]
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  startTime?: string | null // "HH:mm:ss"
  endTime?: string | null // "HH:mm:ss"
  colorKey?: string // "FFFFFF"
  repeat?: RepeatRule | null
}

export type EventSummaryItem = {
  title: string
  content: string
  startTime: string | null
  endTime: string | null
}

type EventSummaryResponse = {
  statusCode: string
  message: string
  data: EventSummaryItem[]
}

// 3. Task → MonthView용 ScheduleData로 변환
export async function fetchTasksForMonth(ym: string): Promise<ScheduleData[]> {
  const raw = await fetchTasksRaw(ym)

  const normalized: ScheduleData[] = raw.map((t) => {
    // ✅ labels 가 비어있어도 안전하게 처리
    const labelId =
      Array.isArray(t.labels) && t.labels.length > 0 && t.labels[0] != null
        ? String(t.labels[0])
        : ''

    return {
      id: String(t?.id ?? ''),
      name: String(t?.title ?? ''),
      date: String(t?.placementDate ?? '').slice(0, 10),
      isRecurring: false,
      isTask: true,
      labelId,
      isCompleted: !!t?.completed,
    }
  })

  return normalized
}

export async function fetchEventSummary(): Promise<EventSummaryItem[]> {
  const res = await http.get<EventSummaryResponse>('/event/summary')
  return Array.isArray(res.data?.data) ? res.data.data : []
}

export async function updateEvent(
  eventId: string,
  payload: Partial<CreateEventPayload> & {
    startDate?: string
    endDate?: string
    startTime?: string | null
    endTime?: string | null
    repeat?: RepeatRule | null
  }
) {
  const res = await http.patch(`/event/${eventId}`, payload)
  return res.data
}

export async function deleteEvent(eventId: string) {
  const res = await http.delete(`/event/${eventId}`)
  return res.data
}
