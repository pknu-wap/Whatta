import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar'
import {
  clearAppleCalendarEventLinks,
  clearAppleCalendarEventMirrors,
  findAppleCalendarEventMirrorByWhattaId,
  getAppleCalendarEventLinksByPrefix,
  getAppleCalendarEventLink,
  getAppleCalendarEventMirrors,
  getAppleCalendarSyncState,
  removeAppleCalendarEventMirror,
  removeAppleCalendarEventLinksByPrefix,
  removeAppleCalendarEventLink,
  setAppleCalendarEventMirror,
  setAppleCalendarEventLink,
  setAppleCalendarPromptDismissed,
  setAppleCalendarSyncState,
  type AppleCalendarEventSnapshot,
} from '@/lib/appleCalendarSync'
import { http } from '@/lib/http'

const WHATTA_CALENDAR_TITLE = 'Whatta'
const WHATTA_CALENDAR_COLOR = '#B04FFF'
const APPLE_IMPORT_COLOR_KEY = 'C00'

export type AppleCalendarConnectResult =
  | { ok: true; calendarId: string; created: boolean }
  | {
      ok: false
      reason: 'unsupported_platform' | 'permission_denied' | 'icloud_unavailable' | 'unknown'
      message: string
    }

type WhattaEventDetail = {
  id: string
  title: string
  content?: string | null
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  repeat?: {
    interval?: number | null
    unit?: 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | null
    on?: string[] | null
    endDate?: string | null
    exceptionDates?: string[] | null
  } | null
}

type WeeklyCalendarResponse = {
  allDaySpanEvents?: Array<{ id?: string | number | null }>
  days?: Array<{
    date?: string
    allDayEvents?: Array<{ id?: string | number | null }>
    timedEvents?: Array<{
      id?: string | number | null
      title?: string | null
      startAt?: string | null
      endAt?: string | null
      clippedStartTime?: string | null
      clippedEndTime?: string | null
      isRepeat?: boolean | null
    }>
  }>
}

type WeeklyOccurrence = {
  occurrenceKey: string
  eventId: string
  title: string
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
}

type DailyCalendarResponse = {
  allDayEvents?: Array<{ id?: string | number | null; title?: string | null }>
  timedEvents?: Array<{
    id?: string | number | null
    title?: string | null
    clippedStartTime?: string | null
    clippedEndTime?: string | null
    startTime?: string | null
    endTime?: string | null
  }>
}

type ReverseSyncResult = {
  created: number
  updated: number
  deleted: number
  skipped: number
}

function isICloudLikeSource(source: Calendar.Source) {
  const sourceType = String(source.type ?? '').toLowerCase()
  const sourceName = String(source.name ?? '').toLowerCase()
  return (
    sourceType === Calendar.SourceType.MOBILEME ||
    sourceName.includes('icloud') ||
    (sourceType === Calendar.SourceType.CALDAV && sourceName.includes('icloud'))
  )
}

async function getWritableWhattaCalendar(sourceId?: string) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  return (
    calendars.find((calendar) => {
      if (calendar.title !== WHATTA_CALENDAR_TITLE) return false
      if (!calendar.allowsModifications) return false
      if (sourceId && calendar.source?.id !== sourceId) return false
      return true
    }) ?? null
  )
}

async function findICloudSource() {
  const sources = await Calendar.getSourcesAsync()
  return sources.find((source) => isICloudLikeSource(source) && !!source.id) ?? null
}

async function createWhattaCalendar(source: Calendar.Source) {
  return Calendar.createCalendarAsync({
    title: WHATTA_CALENDAR_TITLE,
    color: WHATTA_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source,
    sourceId: source.id,
    name: WHATTA_CALENDAR_TITLE,
  })
}

async function recreateWhattaCalendar() {
  const state = await getAppleCalendarSyncState()
  const sources = await Calendar.getSourcesAsync()
  const source =
    sources.find((item) => item.id === state.sourceId) ??
    sources.find((item) => isICloudLikeSource(item) && !!item.id) ??
    null

  if (!source?.id) {
    throw new Error('ICLOUD_SOURCE_NOT_FOUND')
  }

  if (state.calendarId) {
    try {
      await Calendar.deleteCalendarAsync(state.calendarId)
    } catch (error) {
      console.log('Apple calendar delete failed', error)
    }
  }

  const calendarId = await createWhattaCalendar(source)
  await setAppleCalendarSyncState({
    isConnected: true,
    calendarId,
    calendarTitle: WHATTA_CALENDAR_TITLE,
    sourceId: source.id,
    sourceName: source.name,
    sourceType: String(source.type),
  })

  return calendarId
}

export async function refreshAppleCalendarPermissionState() {
  if (Platform.OS !== 'ios') {
    return setAppleCalendarSyncState({ permissionStatus: 'denied' })
  }

  const permission = await Calendar.getCalendarPermissionsAsync()
  return setAppleCalendarSyncState({
    permissionStatus: permission.granted ? 'granted' : permission.canAskAgain ? 'unknown' : 'denied',
  })
}

export async function ensureAppleCalendarConnected(): Promise<AppleCalendarConnectResult> {
  if (Platform.OS !== 'ios') {
    return {
      ok: false,
      reason: 'unsupported_platform',
      message: '애플 캘린더 연동은 현재 iPhone에서만 지원합니다.',
    }
  }

  try {
    const permission = await Calendar.requestCalendarPermissionsAsync()
    const permissionStatus = permission.granted ? 'granted' : 'denied'
    await setAppleCalendarSyncState({ permissionStatus })

    if (!permission.granted) {
      return {
        ok: false,
        reason: 'permission_denied',
        message: '캘린더 권한이 허용되지 않아 연동을 진행할 수 없습니다.',
      }
    }

    const source = await findICloudSource()
    if (!source?.id) {
      return {
        ok: false,
        reason: 'icloud_unavailable',
        message: '기기에서 iCloud 캘린더를 찾을 수 없습니다. 설정에서 iCloud 캘린더를 켜주세요.',
      }
    }

    const existing = await getWritableWhattaCalendar(source.id)
    const calendarId = existing?.id ?? (await createWhattaCalendar(source))

    await setAppleCalendarSyncState({
      isConnected: true,
      calendarId,
      calendarTitle: WHATTA_CALENDAR_TITLE,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: String(source.type),
      permissionStatus: 'granted',
    })
    await setAppleCalendarPromptDismissed(false)

    return { ok: true, calendarId, created: !existing }
  } catch (error) {
    console.log('Apple calendar connect failed', error)
    return {
      ok: false,
      reason: 'unknown',
      message: '애플 캘린더 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}

export async function disconnectAppleCalendarLocally() {
  const current = await getAppleCalendarSyncState()
  return setAppleCalendarSyncState({
    ...current,
    isConnected: false,
    calendarId: null,
    calendarTitle: null,
    sourceId: null,
    sourceName: null,
    sourceType: null,
    initialExportDone: false,
    lastSyncedAt: null,
  })
}

export async function getAppleCalendarConnectionSummary() {
  const state = await getAppleCalendarSyncState()
  if (state.isConnected && state.calendarTitle) {
    return `${state.sourceName ?? 'iCloud'} / ${state.calendarTitle}`
  }
  if (state.permissionStatus === 'denied') {
    return '권한 필요'
  }
  return '연동 안 됨'
}

function toDate(date: string, time?: string | null) {
  const timeText = time && time.length >= 5 ? time : '00:00:00'
  return new Date(`${date}T${timeText}`)
}

function toAllDayDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function addOneDay(date: string) {
  const value = toAllDayDate(date)
  value.setDate(value.getDate() + 1)
  return value
}

const WHATTA_WEEKDAY_TO_IOS: Record<string, Calendar.DayOfTheWeek> = {
  SUN: Calendar.DayOfTheWeek.Sunday,
  MON: Calendar.DayOfTheWeek.Monday,
  TUE: Calendar.DayOfTheWeek.Tuesday,
  WED: Calendar.DayOfTheWeek.Wednesday,
  THU: Calendar.DayOfTheWeek.Thursday,
  FRI: Calendar.DayOfTheWeek.Friday,
  SAT: Calendar.DayOfTheWeek.Saturday,
}

function buildRecurrenceRule(event: WhattaEventDetail): Calendar.RecurrenceRule | null {
  const repeat = event.repeat
  if (!repeat?.unit) return null

  const interval = Math.max(1, Number(repeat.interval ?? 1))
  const endDate = repeat.endDate ? addOneDay(repeat.endDate) : undefined

  if (repeat.unit === 'DAY') {
    return {
      frequency: Calendar.Frequency.DAILY,
      interval,
      endDate,
    }
  }

  if (repeat.unit === 'WEEK') {
    const daysOfTheWeek = (repeat.on ?? [])
      .map((value) => WHATTA_WEEKDAY_TO_IOS[String(value)])
      .filter(Boolean)
      .map((dayOfTheWeek) => ({ dayOfTheWeek }))

    return {
      frequency: Calendar.Frequency.WEEKLY,
      interval,
      endDate,
      daysOfTheWeek: daysOfTheWeek.length ? daysOfTheWeek : undefined,
    }
  }

  if (repeat.unit === 'MONTH') {
    const token = String(repeat.on?.[0] ?? '')
    const byDateMatch = token.match(/^D(\d{1,2})$/)
    const nthWeekdayMatch = token.match(/^(-?\d+|LAST)(SUN|MON|TUE|WED|THU|FRI|SAT)$/)

    if (byDateMatch) {
      return {
        frequency: Calendar.Frequency.MONTHLY,
        interval,
        endDate,
        daysOfTheMonth: [Number(byDateMatch[1])],
      }
    }

    if (nthWeekdayMatch) {
      const rawWeek = nthWeekdayMatch[1]
      const rawDay = nthWeekdayMatch[2]
      const weekNumber = rawWeek === 'LAST' ? -1 : Number(rawWeek)
      const dayOfTheWeek = WHATTA_WEEKDAY_TO_IOS[rawDay]

      if (dayOfTheWeek) {
        return {
          frequency: Calendar.Frequency.MONTHLY,
          interval,
          endDate,
          daysOfTheWeek: [{ dayOfTheWeek, weekNumber }],
        }
      }
    }

    return {
      frequency: Calendar.Frequency.MONTHLY,
      interval,
      endDate,
    }
  }

  return null
}

function buildAppleEventDetails(event: WhattaEventDetail, options?: { disableRecurrence?: boolean }): Partial<Calendar.Event> {
  const isAllDay = !event.startTime && !event.endTime
  const recurrenceRule = options?.disableRecurrence ? null : buildRecurrenceRule(event)

  if (isAllDay) {
    return {
      title: event.title ?? '',
      notes: event.content ?? '',
      allDay: true,
      startDate: toAllDayDate(event.startDate),
      endDate: addOneDay(event.endDate),
      recurrenceRule,
    }
  }

  return {
    title: event.title ?? '',
    notes: event.content ?? '',
    allDay: false,
    startDate: toDate(event.startDate, event.startTime),
    endDate: toDate(event.endDate, event.endTime ?? event.startTime ?? '23:59:59'),
    timeZone: 'Asia/Seoul',
    url: `whatta://event/${event.id}`,
    recurrenceRule,
  }
}

function buildWhattaSnapshot(event: WhattaEventDetail): AppleCalendarEventSnapshot {
  return {
    title: event.title ?? '',
    content: event.content ?? '',
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime ?? null,
    endTime: event.endTime ?? null,
    allDay: !event.startTime && !event.endTime,
  }
}

function toISODateTimeText(value: string | Date | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function toISODateText(value: string | Date | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function minusOneDay(value: string | Date | undefined) {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() - 1)
  return toISODateText(date)
}

function normalizeAppleEventSnapshot(event: Calendar.Event): AppleCalendarEventSnapshot | null {
  const startDate = toISODateText(event.startDate)
  if (!startDate) return null

  if (event.allDay) {
    const inclusiveEndDate = minusOneDay(event.endDate) ?? startDate
    return {
      title: event.title ?? '',
      content: event.notes ?? '',
      startDate,
      endDate: inclusiveEndDate,
      startTime: null,
      endTime: null,
      allDay: true,
    }
  }

  return {
    title: event.title ?? '',
    content: event.notes ?? '',
    startDate,
    endDate: toISODateText(event.endDate) ?? startDate,
    startTime: toISODateTimeText(event.startDate),
    endTime: toISODateTimeText(event.endDate),
    allDay: false,
  }
}

function snapshotsEqual(left: AppleCalendarEventSnapshot, right: AppleCalendarEventSnapshot) {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.startTime === right.startTime &&
    left.endTime === right.endTime &&
    left.allDay === right.allDay
  )
}

async function upsertMirrorForWhattaEvent(
  whattaEventId: string,
  appleEventId: string,
  snapshot: AppleCalendarEventSnapshot,
) {
  await setAppleCalendarEventLink(whattaEventId, appleEventId)
  await setAppleCalendarEventMirror({
    appleEventId,
    whattaEventId,
    snapshot,
  })
}

async function fetchWhattaEventDetail(eventId: string): Promise<WhattaEventDetail | null> {
  try {
    const res = await http.get(`/event/${eventId}`)
    const data = res.data?.data
    if (!data?.id) return null
    return {
      id: String(data.id),
      title: String(data.title ?? ''),
      content: data.content ?? '',
      startDate: String(data.startDate ?? ''),
      endDate: String(data.endDate ?? ''),
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      repeat: data.repeat ?? null,
    }
  } catch (error) {
    console.log('Failed to fetch event detail for Apple sync', error)
    return null
  }
}

function buildOccurrenceKey(eventId: string, startDate: string, startTime?: string | null) {
  return `${eventId}::${startDate}::${startTime ?? 'ALL_DAY'}`
}

async function fetchFutureOccurrencesByEventId(
  eventId: string,
  repeatUnit?: string | null,
  daysAhead = 180,
): Promise<WeeklyOccurrence[]> {
  if (repeatUnit === 'WEEK') {
    const start = new Date(`${todayISO()}T00:00:00`)
    const occurrences = new Map<string, WeeklyOccurrence>()

    for (let offset = 0; offset <= daysAhead; offset += 1) {
      const dateISO = toISODate(addDays(start, offset))
      const res = await http.get('/calendar/daily', {
        params: {
          date: dateISO,
        },
      })

      const data = (res.data?.data ?? {}) as DailyCalendarResponse

      for (const item of data.allDayEvents ?? []) {
        if (String(item?.id ?? '') !== eventId) continue
        const occurrenceKey = buildOccurrenceKey(eventId, dateISO, null)
        occurrences.set(occurrenceKey, {
          occurrenceKey,
          eventId,
          title: String(item.title ?? ''),
          startDate: dateISO,
          endDate: dateISO,
          startTime: null,
          endTime: null,
        })
      }

      for (const item of data.timedEvents ?? []) {
        if (String(item?.id ?? '') !== eventId) continue
        const startTime = item.clippedStartTime ?? item.startTime ?? null
        const endTime = item.clippedEndTime ?? item.endTime ?? null
        const occurrenceKey = buildOccurrenceKey(eventId, dateISO, startTime)
        occurrences.set(occurrenceKey, {
          occurrenceKey,
          eventId,
          title: String(item.title ?? ''),
          startDate: dateISO,
          endDate: dateISO,
          startTime,
          endTime,
        })
      }
    }

    return [...occurrences.values()]
  }

  const start = new Date(`${todayISO()}T00:00:00`)
  const occurrences = new Map<string, WeeklyOccurrence>()

  for (let offset = 0; offset <= daysAhead; offset += 28) {
    const rangeStart = toISODate(addDays(start, offset))
    const rangeEnd = toISODate(addDays(start, Math.min(offset + 27, daysAhead)))

    const res = await http.get('/calendar/weekly', {
      params: {
        startDate: rangeStart,
        endDate: rangeEnd,
      },
    })

    const data = (res.data?.data ?? {}) as WeeklyCalendarResponse

    for (const day of data.days ?? []) {
      const dateISO = String(day.date ?? '').slice(0, 10)
      if (!dateISO) continue

      for (const item of day.allDayEvents ?? []) {
        if (String(item?.id ?? '') !== eventId) continue
        const occurrenceKey = buildOccurrenceKey(eventId, dateISO, null)
        occurrences.set(occurrenceKey, {
          occurrenceKey,
          eventId,
          title: '',
          startDate: dateISO,
          endDate: dateISO,
          startTime: null,
          endTime: null,
        })
      }

      for (const item of day.timedEvents ?? []) {
        if (String(item?.id ?? '') !== eventId) continue
        const startTime = item.clippedStartTime ?? item.startAt?.slice(11, 19) ?? null
        const endTime = item.clippedEndTime ?? item.endAt?.slice(11, 19) ?? null
        const occurrenceKey = buildOccurrenceKey(eventId, dateISO, startTime)
        occurrences.set(occurrenceKey, {
          occurrenceKey,
          eventId,
          title: String(item.title ?? ''),
          startDate: dateISO,
          endDate: dateISO,
          startTime,
          endTime,
        })
      }
    }
  }

  return [...occurrences.values()]
}

async function ensureConnectedCalendarId() {
  const state = await getAppleCalendarSyncState()
  if (!state.isConnected || !state.calendarId) return null
  return state.calendarId
}

export async function syncEventToAppleCalendar(whattaEventId: string) {
  const calendarId = await ensureConnectedCalendarId()
  if (!calendarId) return

  const event = await fetchWhattaEventDetail(whattaEventId)
  if (!event?.startDate || !event?.endDate) return

  if (event.repeat) {
    const occurrences = await fetchFutureOccurrencesByEventId(
      whattaEventId,
      event.repeat.unit ?? null,
    )
    for (const occurrence of occurrences) {
      const linkedAppleEventId = await getAppleCalendarEventLink(occurrence.occurrenceKey)
      const details = buildAppleEventDetails(
        {
          ...event,
          startDate: occurrence.startDate,
          endDate: occurrence.endDate,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          repeat: null,
        },
        { disableRecurrence: true },
      )

      try {
        if (linkedAppleEventId) {
          try {
            await Calendar.updateEventAsync(linkedAppleEventId, details)
          } catch {
            const appleEventId = await Calendar.createEventAsync(calendarId, details)
            await setAppleCalendarEventLink(occurrence.occurrenceKey, appleEventId)
          }
        } else {
          const appleEventId = await Calendar.createEventAsync(calendarId, details)
          await setAppleCalendarEventLink(occurrence.occurrenceKey, appleEventId)
        }
      } catch (error) {
        console.log('Apple recurring occurrence sync failed', error)
      }
    }

    await setAppleCalendarSyncState({
      lastSyncedAt: new Date().toISOString(),
    })
    return
  }

  const linkedAppleEventId = await getAppleCalendarEventLink(whattaEventId)
  const details = buildAppleEventDetails(event)
  const snapshot = buildWhattaSnapshot(event)

  try {
    if (linkedAppleEventId) {
      try {
        await Calendar.updateEventAsync(linkedAppleEventId, details)
        await upsertMirrorForWhattaEvent(whattaEventId, linkedAppleEventId, snapshot)
      } catch {
        const appleEventId = await Calendar.createEventAsync(calendarId, details)
        await upsertMirrorForWhattaEvent(whattaEventId, appleEventId, snapshot)
      }
    } else {
      const appleEventId = await Calendar.createEventAsync(calendarId, details)
      await upsertMirrorForWhattaEvent(whattaEventId, appleEventId, snapshot)
    }

    await setAppleCalendarSyncState({
      lastSyncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.log('Apple calendar event sync failed', error)
  }
}

export async function deleteEventFromAppleCalendar(whattaEventId: string) {
  const prefixedLinks = await getAppleCalendarEventLinksByPrefix(`${whattaEventId}::`)
  if (prefixedLinks.length) {
    for (const { value } of prefixedLinks) {
      try {
        await Calendar.deleteEventAsync(value)
      } catch (error) {
        console.log('Apple calendar recurring event delete failed', error)
      }
    }
    await removeAppleCalendarEventLinksByPrefix(`${whattaEventId}::`)
    await setAppleCalendarSyncState({
      lastSyncedAt: new Date().toISOString(),
    })
    return
  }

  const linkedAppleEventId = await getAppleCalendarEventLink(whattaEventId)
  if (!linkedAppleEventId) return

  try {
    await Calendar.deleteEventAsync(linkedAppleEventId)
  } catch (error) {
    console.log('Apple calendar event delete failed', error)
  } finally {
    await removeAppleCalendarEventLink(whattaEventId)
    await removeAppleCalendarEventMirror(linkedAppleEventId)
    await setAppleCalendarSyncState({
      lastSyncedAt: new Date().toISOString(),
    })
  }
}

function todayISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function toISODate(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchFutureEventIds(rangeStart: string, rangeEnd: string) {
  const res = await http.get('/calendar/weekly', {
    params: {
      startDate: rangeStart,
      endDate: rangeEnd,
    },
  })

  const data = (res.data?.data ?? {}) as WeeklyCalendarResponse
  const ids = new Set<string>()

  for (const item of data.allDaySpanEvents ?? []) {
    if (item?.id != null) ids.add(String(item.id))
  }

  for (const day of data.days ?? []) {
    for (const item of day.allDayEvents ?? []) {
      if (item?.id != null) ids.add(String(item.id))
    }
    for (const item of day.timedEvents ?? []) {
      if (item?.id != null) ids.add(String(item.id))
    }
  }

  return [...ids]
}

async function exportFutureWhattaEvents(daysAhead = 180, force = false) {
  let calendarId = await ensureConnectedCalendarId()
  if (!calendarId) return { exported: 0, skipped: true as const }

  const state = await getAppleCalendarSyncState()
  if (!force && state.initialExportDone) {
    return { exported: 0, skipped: true as const }
  }

  if (force) {
    calendarId = await recreateWhattaCalendar()
    await clearAppleCalendarEventLinks()
    await clearAppleCalendarEventMirrors()
  }

  const start = new Date(`${todayISO()}T00:00:00`)
  const allIds = new Set<string>()

  for (let offset = 0; offset <= daysAhead; offset += 28) {
    const rangeStart = toISODate(addDays(start, offset))
    const rangeEnd = toISODate(addDays(start, Math.min(offset + 27, daysAhead)))
    const ids = await fetchFutureEventIds(rangeStart, rangeEnd)
    ids.forEach((id) => allIds.add(id))
  }

  for (const eventId of allIds) {
    await syncEventToAppleCalendar(eventId)
  }

  await setAppleCalendarSyncState({
    initialExportDone: true,
    lastSyncedAt: new Date().toISOString(),
  })

  return { exported: allIds.size, skipped: false as const }
}

export async function exportFutureWhattaEventsToAppleCalendar(daysAhead = 180) {
  return exportFutureWhattaEvents(daysAhead, false)
}

export async function forceExportFutureWhattaEventsToAppleCalendar(daysAhead = 180) {
  return exportFutureWhattaEvents(daysAhead, true)
}

export async function exportFutureWhattaEventsIfNeeded(daysAhead = 180) {
  const state = await getAppleCalendarSyncState()
  if (!state.isConnected || !state.calendarId || state.initialExportDone) {
    return { exported: 0, skipped: true as const }
  }

  return exportFutureWhattaEvents(daysAhead, false)
}

export async function importAppleCalendarChangesToWhatta(daysAhead = 180): Promise<ReverseSyncResult> {
  const calendarId = await ensureConnectedCalendarId()
  if (!calendarId) return { created: 0, updated: 0, deleted: 0, skipped: 0 }

  const start = new Date(`${todayISO()}T00:00:00`)
  const end = addDays(start, daysAhead)
  const events = await Calendar.getEventsAsync([calendarId], start, end)
  const mirrors = await getAppleCalendarEventMirrors()

  const result: ReverseSyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
  }

  const seenAppleIds = new Set<string>()

  for (const event of events) {
    seenAppleIds.add(event.id)

    if (event.recurrenceRule) {
      result.skipped += 1
      continue
    }

    const snapshot = normalizeAppleEventSnapshot(event)
    if (!snapshot) {
      result.skipped += 1
      continue
    }

    const mirror = mirrors[event.id]
    if (mirror) {
      if (!snapshotsEqual(snapshot, mirror.snapshot)) {
        try {
          await http.patch(`/event/${mirror.whattaEventId}`, {
            title: snapshot.title,
            content: snapshot.content,
            startDate: snapshot.startDate,
            endDate: snapshot.endDate,
            startTime: snapshot.allDay ? null : snapshot.startTime,
            endTime: snapshot.allDay ? null : snapshot.endTime,
            fieldsToClear: snapshot.allDay ? ['startTime', 'endTime'] : [],
          })
          await upsertMirrorForWhattaEvent(mirror.whattaEventId, event.id, snapshot)
          result.updated += 1
        } catch (error) {
          console.log('Apple -> Whatta update failed', error)
        }
      }
      continue
    }

    try {
      const res = await http.post('/event', {
        title: snapshot.title,
        content: snapshot.content,
        startDate: snapshot.startDate,
        endDate: snapshot.endDate,
        startTime: snapshot.allDay ? null : snapshot.startTime,
        endTime: snapshot.allDay ? null : snapshot.endTime,
        colorKey: APPLE_IMPORT_COLOR_KEY,
      })
      const whattaEventId =
        res.data?.data?.id ?? res.data?.id ?? res.data?.eventId ?? res.data?._id ?? null
      if (whattaEventId) {
        await upsertMirrorForWhattaEvent(String(whattaEventId), event.id, snapshot)
        result.created += 1
      }
    } catch (error) {
      console.log('Apple -> Whatta create failed', error)
    }
  }

  for (const mirror of Object.values(mirrors)) {
    if (seenAppleIds.has(mirror.appleEventId)) continue

    try {
      await http.delete(`/event/${mirror.whattaEventId}`)
    } catch (error) {
      console.log('Apple -> Whatta delete failed', error)
    }

    await removeAppleCalendarEventMirror(mirror.appleEventId)
    await removeAppleCalendarEventLink(mirror.whattaEventId)
    result.deleted += 1
  }

  await setAppleCalendarSyncState({
    lastSyncedAt: new Date().toISOString(),
  })

  return result
}
