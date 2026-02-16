import { useState, useEffect, useCallback } from 'react'
import { fetchDaily } from '@/api/calendar'
import { computeEventOverlap } from '@/utils/calender/overlap'

export default function useDayData(
  anchorDate: string,
  enabledLabelIds: number[],
) {
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [checks, setChecks] = useState<any[]>([])

  const fetchDailyEvents = useCallback(
    async (dateISO: string) => {
      const data = await fetchDaily(dateISO)

      const timed = data.timedEvents || []
      const timedTasks = data.timedTasks || []
      const allDay = data.allDayTasks || []
      const floating = data.floatingTasks || []
      const allDaySpan = data.allDaySpanEvents || []
      const allDayEvents = data.allDayEvents || []

      const filterTask = (t: any) => {
        if (!t.labels || t.labels.length === 0) return true
        return t.labels.some((id: number) =>
          enabledLabelIds.includes(id),
        )
      }

      const filterEvent = (ev: any) => {
        if (!ev.labels || ev.labels.length === 0) return true
        return ev.labels.some((id: number) =>
          enabledLabelIds.includes(id),
        )
      }

      const parsedEvents = timed.map((e: any) => {
        const [sh, sm] = e.clippedStartTime.split(':').map(Number)
        const [eh, em] = e.clippedEndTime.split(':').map(Number)

        return {
          ...e,
          startMin: sh * 60 + sm,
          endMin: eh * 60 + em,
        }
      })

      const overlapped = computeEventOverlap(parsedEvents)

      setEvents(overlapped.filter(filterEvent))
      setSpanEvents([...allDaySpan, ...allDayEvents].filter(filterEvent))
      setTasks(timedTasks.filter(filterTask))
      setChecks([
        ...allDay.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
          labels: t.labels ?? [],
        })),
        ...floating.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
          labels: t.labels ?? [],
        })),
      ].filter(filterTask))
    },
    [enabledLabelIds],
  )

  useEffect(() => {
    fetchDailyEvents(anchorDate)
  }, [anchorDate, enabledLabelIds, fetchDailyEvents])

  return {
    events,
    spanEvents,
    tasks,
    checks,
    fetchDailyEvents,
    setChecks,
  }
}