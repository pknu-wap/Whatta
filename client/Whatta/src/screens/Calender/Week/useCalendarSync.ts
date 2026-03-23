import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import { bus } from '@/lib/eventBus'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import { todayISO } from '@/screens/Calender/Week/date'
import type { WeekData } from '@/screens/Calender/Week/useWeekCalendarData'

type UseCalendarSyncParams = {
  active: boolean
  weekDates: string[]
  anchorDateRef: MutableRefObject<string>
  dayColWidth: number
  rowH: number
  setAnchorDate: Dispatch<SetStateAction<string>>
  setWeekData: Dispatch<SetStateAction<WeekData>>
  fetchWeek: (dates: string[]) => void | Promise<void>
}

export function useCalendarSync({
  active,
  weekDates,
  anchorDateRef,
  dayColWidth,
  rowH,
  setAnchorDate,
  setWeekData,
  fetchWeek,
}: UseCalendarSyncParams) {
  useEffect(() => {
      if (!active) return
      currentCalendarView.set('week')

      if (weekDates.length > 0) {
        bus.emit('calendar:state', {
          date: anchorDateRef.current,
          mode: 'week',
          days: weekDates.length,
          rangeStart: weekDates[0],
          rangeEnd: weekDates[weekDates.length - 1],
        })
      }

      bus.emit('calendar:meta', {
        mode: 'week',
        dayColWidth,
        rowH,
      })

      bus.emit('calendar:request-sync')

      if (weekDates.length > 0) {
        fetchWeek(weekDates)
      }
  }, [active, anchorDateRef, dayColWidth, fetchWeek, rowH, weekDates])

  useEffect(() => {
    if (!weekDates.length || !active) return

    bus.emit('calendar:state', {
      date: weekDates[0],
      mode: 'week',
      days: weekDates.length,
      rangeStart: weekDates[0],
      rangeEnd: weekDates[weekDates.length - 1],
    })

    bus.emit('calendar:meta', {
      mode: 'week',
      dayColWidth,
      rowH,
    })
  }, [active, dayColWidth, rowH, weekDates])

  useEffect(() => {
      if (!active) return
      const onReq = () => {
        if (!weekDates.length) return

        bus.emit('calendar:state', {
          date: anchorDateRef.current,
          mode: 'week',
          days: weekDates.length,
          rangeStart: weekDates[0],
          rangeEnd: weekDates[weekDates.length - 1],
        })
      }

      const onSet = (iso: string) => {
        setAnchorDate((prev) => (prev === iso ? prev : iso))
      }

      const onState = (payload: any) => {
        if (payload.mode !== 'week' && payload.date) {
          setAnchorDate((prev) => (prev === payload.date ? prev : payload.date))
        }
      }

      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)
      bus.on('calendar:state', onState)
      bus.emit('calendar:request-sync')

      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
        bus.off('calendar:state', onState)
      }
  }, [active, anchorDateRef, setAnchorDate, weekDates])

  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const item = payload.item

      const rawDate =
        item.startDate ??
        item.date ??
        item.endDate ??
        item.placementDate ??
        item.placementTimeDate ??
        todayISO()
      const itemDateISO = String(rawDate).slice(0, 10)

      if (weekDates.includes(itemDateISO) && typeof item.completed === 'boolean') {
        const itemId = String(item.id)
        const completed = item.completed

        setWeekData((prev) => {
          const bucket = prev[itemDateISO]
          if (!bucket) return prev

          return {
            ...prev,
            [itemDateISO]: {
              ...bucket,
              timedTasks: (bucket.timedTasks || []).map((task: any) =>
                String(task.id) === itemId ? { ...task, completed } : task,
              ),
              checks: (bucket.checks || []).map((check: any) =>
                String(check.id) === itemId ? { ...check, done: completed } : check,
              ),
              spanEvents: (bucket.spanEvents || []).map((event: any) =>
                String(event.id) === itemId
                  ? { ...event, done: completed, completed }
                  : event,
              ),
            },
          }
        })
        return
      }

      if (weekDates.includes(itemDateISO)) {
        setTimeout(() => fetchWeek(weekDates), 250)
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [fetchWeek, setWeekData, weekDates])
}
