// api 호출, 페이로더 생성
type HttpClient = {
  get: (url: string, config?: any) => Promise<any>
  patch: (url: string, data?: any, config?: any) => Promise<any>
}

// 반복 일정
export type EventApplyMode = 'single' | 'future'

export async function getEventDetail(http: HttpClient, eventId: string) {
  const res = await http.get(`/event/${eventId}`)
  return res.data?.data
}

export function isRepeatEvent(event: any): boolean {
  if (!event) return false
  return !!(event.isRepeat || event.repeat)
}

export function buildMoveEventPayload(
  dateISO: string,
  startTime: string,
  endTime: string,
  applyMode: EventApplyMode,
) {
  return {
    startDate: dateISO,
    endDate: dateISO,
    startTime,
    endTime,
    applyMode,
  }
}

export async function moveEventToDateTime(
  http: HttpClient,
  params: {
    eventId: string
    dateISO: string
    startTime: string
    endTime: string
    applyMode: EventApplyMode
  },
) {
  const { eventId, dateISO, startTime, endTime, applyMode } = params
  const payload = buildMoveEventPayload(dateISO, startTime, endTime, applyMode)
  await http.patch(`/event/${eventId}`, payload)
}
