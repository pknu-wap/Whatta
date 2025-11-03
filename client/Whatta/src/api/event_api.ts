import { http } from '@/lib/http'

export type RepeatUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type Repeat = {
  interval: number
  unit: RepeatUnit
  on?: string[]
  endDate?: string
}

export type CreateEventPayload = {
  title: string
  content?: string
  labels?: number[]
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  startTime?: string | null // "HH:mm:ss"
  endTime?: string | null // "HH:mm:ss"
  repeat?: Repeat
  colorKey?: string // "FFFFFF"
}

type CreateEventResponse<Data = any> = {
  data?: Data
  id?: string
  eventId?: string
  _id?: string
}

export async function createEvent(payload: CreateEventPayload) {
  const res = await http.post<CreateEventResponse>('/api/event', payload)
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
  const res = await http.get(`/api/event/${eventId}`)
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
export async function fetchTasksRaw(): Promise<any[]> {
  const res = await http.get('/api/task')
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

export async function fetchTasksForMonth(ym: string): Promise<ScheduleData[]> {
  const raws = await fetchTasksRaw()
  const { start, end } = monthRange(ym)

  // 월범위 안의 task만 사용
  const inRange = raws.filter((t: any) => {
    const d = t?.placementDate
    return typeof d === 'string' && d >= start && d <= end
  })

  return inRange.map((t: any) => {
    const labelId = (t?.labels?.labels?.[0]?.id ?? '').toString()

    return {
      id: String(t.id ?? t._id ?? ''),
      name: String(t.title ?? ''),
      date: String(t.placementDate),
      isRecurring: false,
      isTask: true,
      labelId,
      isCompleted: !!t.completed,
      sortTime: typeof t.placementTime === 'string' ? t.placementTime : '00:00:00',
    } as ScheduleData
  })
}
