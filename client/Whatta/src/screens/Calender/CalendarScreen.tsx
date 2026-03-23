import React from 'react'
import { StyleSheet, View } from 'react-native'
import { bus } from '@/lib/eventBus'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'
import { currentCalendarView } from '@/providers/CalendarViewProvider'

type CalendarMode = 'month' | 'week' | 'day'

const MODE_ORDER: Record<CalendarMode, number> = {
  month: 0,
  week: 1,
  day: 2,
}

function renderCalendarMode(mode: CalendarMode) {
  if (mode === 'week') return <WeekView />
  if (mode === 'day') return <DayView />
  return <MonthView />
}

export default function CalendarScreen() {
  const [mode, setMode] = React.useState<CalendarMode>(currentCalendarView.get())
  const anchorDateRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const onState = (payload: { date?: string }) => {
      if (typeof payload?.date === 'string' && payload.date.length >= 10) {
        anchorDateRef.current = payload.date
      }
    }

    const onSetMode = (nextMode: CalendarMode) => {
      const prevMode = currentCalendarView.get()
      if (nextMode === prevMode) return

      currentCalendarView.set(nextMode)
      setMode(nextMode)

      const anchorDate = anchorDateRef.current
      if (anchorDate) {
        setTimeout(() => {
          bus.emit('calendar:set-date', anchorDate)
        }, 0)
      }
    }

    bus.on('calendar:state', onState)
    bus.on('calendar:set-mode', onSetMode)

      return () => {
        bus.off('calendar:state', onState)
        bus.off('calendar:set-mode', onSetMode)
      }
  }, [])

  return (
    <View style={S.root}>
      <View style={S.layer}>
        {renderCalendarMode(mode)}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  root: {
    flex: 1,
  },
  layer: {
    flex: 1,
  },
})
