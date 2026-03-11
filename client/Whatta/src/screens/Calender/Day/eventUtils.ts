import { useCallback, useEffect, useMemo, useState } from 'react'
import { http } from '@/lib/http'
import { computeEventOverlap } from './overlapUtils'
import { normalizeScheduleColorKey } from '@/styles/scheduleColorSets'

type DailyRawData = {
  timedEvents: any[]
  timedTasks: any[]
  allDayTasks: any[]
  floatingTasks: any[]
  allDaySpanEvents: any[]
  allDayEvents: any[]
}

const dayCache = new Map<string, DailyRawData>()
const dayInflight = new Map<string, Promise<DailyRawData>>()

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso: string, delta: number) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

async function fetchDailyRaw(date: string, force = false): Promise<DailyRawData> {
  if (!force) {
    const cached = dayCache.get(date)
    if (cached) return cached
  }

  const inflight = dayInflight.get(date)
  if (inflight) return inflight

  const req = (async () => {
    const res = await http.get('/calendar/daily', { params: { date } })
    const data = res?.data?.data ?? {}
    const normalized: DailyRawData = {
      timedEvents: data?.timedEvents ?? [],
      timedTasks: data?.timedTasks ?? [],
      allDayTasks: data?.allDayTasks ?? [],
      floatingTasks: data?.floatingTasks ?? [],
      allDaySpanEvents: data?.allDaySpanEvents ?? [],
      allDayEvents: data?.allDayEvents ?? [],
    }
    dayCache.set(date, normalized)
    return normalized
  })()

  dayInflight.set(date, req)
  try {
    return await req
  } finally {
    dayInflight.delete(date)
  }
}

export function useDayData(anchorDate: string, enabledLabelIds: number[]) {
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [checks, setChecks] = useState<any[]>([])

  const enabledSet = useMemo(() => new Set(enabledLabelIds), [enabledLabelIds])

  const applyData = useCallback(
    (raw: DailyRawData) => {
      const timed = raw.timedEvents
      const timedTasks = raw.timedTasks
      const allDay = raw.allDayTasks
      const floating = raw.floatingTasks
      const allDaySpan = raw.allDaySpanEvents
      const allDayEvents = raw.allDayEvents

      const parsedEvents = timed
        .filter((e: any) => e?.clippedStartTime && e?.clippedEndTime)
        .map((e: any) => {
          const [sh = 0, sm = 0] = e.clippedStartTime.split(':').map(Number)
          const [eh = 0, em = 0] = e.clippedEndTime.split(':').map(Number)

          return {
            ...e,
            colorKey: normalizeScheduleColorKey(e?.colorKey),
            startMin: sh * 60 + sm,
            endMin: eh * 60 + em,
          }
        })

      const overlapped = computeEventOverlap(parsedEvents)

      const filterByLabel = (item: any) => {
        if (!item.labels || item.labels.length === 0) return true
        return item.labels.some((id: number) => enabledSet.has(id))
      }

      setEvents(overlapped.filter(filterByLabel))
      setSpanEvents(
        [...allDaySpan, ...allDayEvents]
          .map((e: any) => ({
            ...e,
            colorKey: normalizeScheduleColorKey(e?.colorKey),
          }))
          .filter(filterByLabel),
      )
      setTasks(timedTasks.filter(filterByLabel))
      setChecks(
        [...allDay, ...floating]
          .filter(filterByLabel)
          .map((t: any) => ({
            ...t,
            done: t?.done ?? t?.completed ?? false,
            completed: t?.completed ?? t?.done ?? false,
          })),
      )
    },
    [enabledSet],
  )

  const fetchDailyEvents = useCallback(
    async (opts?: { date?: string; force?: boolean }) => {
      const date = opts?.date ?? anchorDate
      const force = opts?.force ?? true
      try {
        const raw = await fetchDailyRaw(date, force)
        if (date === anchorDate) {
          applyData(raw)
          const prevDate = addDays(date, -1)
          const nextDate = addDays(date, 1)
          void Promise.allSettled([fetchDailyRaw(prevDate), fetchDailyRaw(nextDate)])
        }
      } catch (err) {
        console.error('❌ daily fetch error', err)
      }
    },
    [anchorDate, applyData],
  )

  useEffect(() => {
    const cached = dayCache.get(anchorDate)
    if (cached) applyData(cached)
    fetchDailyEvents({ force: !cached })
  }, [anchorDate, applyData, fetchDailyEvents])

  return {
    events,
    spanEvents,
    tasks,
    checks,
    setChecks,
    fetchDailyEvents,
  }
}
