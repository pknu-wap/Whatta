import { useCallback, useState } from 'react'
import { type DayTimelineEvent } from '@/screens/Calender/Week/layout'

type CheckItem = {
  id: string
  title: string
  done: boolean
}

export type DayBucket = {
  spanEvents: any[]
  timelineEvents: DayTimelineEvent[]
  checks: CheckItem[]
  timedTasks: any[]
  tasks?: any[]
}

export type WeekData = Record<string, DayBucket>

type HttpClient = {
  get: (url: string, config?: any) => Promise<any>
}

export function useWeekCalendarData(http: HttpClient) {
  const [weekData, setWeekData] = useState<WeekData>({})
  const [loading, setLoading] = useState(true)

  const fetchWeek = useCallback(
    async (dates: string[]) => {
      if (!dates.length) return
      try {
        setLoading(true)
        const resList = await Promise.all(
          dates.map((d) =>
            http.get('/calendar/daily', { params: { date: d } }).catch(() => null),
          ),
        )

        const next: WeekData = {}

        dates.forEach((dateISO, idx) => {
          const payload = resList[idx]?.data?.data ?? {}
          const timed = payload.timedEvents || []
          const timedTasks = payload.timedTasks || []
          const allDay = payload.allDayTasks || []
          const floating = payload.floatingTasks || []
          const allDaySpan = payload.allDaySpanEvents || []
          const allDayEvents = payload.allDayEvents || []

          const timelineEvents: DayTimelineEvent[] = timed
            .filter((e: any) => !e.isSpan)
            .map((e: any) => {
              const sTime = e.clippedStartTime || e.startTime
              const eTime = e.clippedEndTime || e.endTime
              if (!sTime || !eTime) return null

              const [sh, sm] = sTime.split(':').map(Number)
              const [eh, em] = eTime.split(':').map(Number)

              return {
                id: String(e.id),
                title: e.title,
                place: e.place ?? '',
                startMin: sh * 60 + sm,
                endMin: eh * 60 + em,
                color: `#${(e.colorKey ?? 'B04FFF').replace('#', '')}`,
                isRepeat: e.isRepeat ?? false,
              }
            })
            .filter(Boolean) as DayTimelineEvent[]

          const spanEvents = [
            ...timed.filter((e: any) => {
              const s = e.startDate?.slice(0, 10)
              const ed = e.endDate?.slice(0, 10)
              return e.isSpan || (s && ed && s !== ed)
            }),
            ...allDaySpan,
            ...allDayEvents,
          ].map((e: any) => ({
            ...e,
            isRepeat: e.isRepeat ?? false,
          }))

          const checks: CheckItem[] = [
            ...allDay.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              done: t.completed ?? false,
            })),
            ...floating.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              done: t.completed ?? false,
            })),
          ]

          next[dateISO] = {
            spanEvents,
            timelineEvents,
            checks,
            timedTasks,
          }
        })

        setWeekData((prev: WeekData) => {
          const merged: WeekData = {}

          for (const [d, bucket] of Object.entries(next)) {
            const prevBucket = prev[d]
            const nextBucket = bucket as DayBucket

            if (!prevBucket) {
              merged[d] = nextBucket
              continue
            }

            const mergedChecks = nextBucket.checks.map((c) => {
              const old = prevBucket.checks.find((p) => p.id === c.id)
              return old ? { ...c, done: old.done } : c
            })

            const mergedSpans = nextBucket.spanEvents.map((s: any) => {
              const old = prevBucket.spanEvents.find(
                (p: any) => String(p.id) === String(s.id),
              )
              return old ? { ...s, done: old.done } : s
            })

            const mergedTimedTasks = nextBucket.timedTasks.map((t: any) => {
              const old = prevBucket.timedTasks.find(
                (p: any) => String(p.id) === String(t.id),
              )
              return old ? { ...t, completed: old.completed } : t
            })

            merged[d] = {
              ...nextBucket,
              checks: mergedChecks,
              spanEvents: mergedSpans,
              timedTasks: mergedTimedTasks,
            }
          }

          return merged
        })
      } catch (err) {
        console.error('❌ 주간 일정 불러오기 실패:', err)
      } finally {
        setLoading(false)
      }
    },
    [http],
  )

  return {
    weekData,
    setWeekData,
    loading,
    fetchWeek,
  }
}
