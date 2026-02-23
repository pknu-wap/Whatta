import { useCallback, useEffect, useState } from 'react'
import { http } from '@/lib/http'
import { computeEventOverlap } from './overlapUtils'

export function useDayData(anchorDate: string, enabledLabelIds: number[]) {
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [checks, setChecks] = useState<any[]>([])

  const fetchDailyEvents = useCallback(async () => {
    try {
      const res = await http.get('/calendar/daily', {
        params: { date: anchorDate },
      })

      const data = res.data.data

      const timed = data.timedEvents || []
      const timedTasks = data.timedTasks || []
      const allDay = data.allDayTasks || []
      const floating = data.floatingTasks || []
      const allDaySpan = data.allDaySpanEvents || []
      const allDayEvents = data.allDayEvents || []

      // 이벤트 시간 계산
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

      // 필터
      const filterByLabel = (item: any) => {
        if (!item.labels || item.labels.length === 0) return true
        return item.labels.some((id: number) =>
          enabledLabelIds.includes(id),
        )
      }

      setEvents(overlapped.filter(filterByLabel))
      setSpanEvents([...allDaySpan, ...allDayEvents].filter(filterByLabel))
      setTasks(timedTasks.filter(filterByLabel))
      setChecks([...allDay, ...floating].filter(filterByLabel))
    } catch (err) {
      console.error('❌ daily fetch error', err)
    }
  }, [anchorDate, enabledLabelIds])

  useEffect(() => {
    fetchDailyEvents()
  }, [fetchDailyEvents])

  return {
    events,
    spanEvents,
    tasks,
    checks,
    setChecks,
    fetchDailyEvents,
  }
}