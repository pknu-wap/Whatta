import React from 'react'
import { StyleSheet, View } from 'react-native'
import { bus } from '@/lib/eventBus'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'
import { calendarViewTransition, currentCalendarView } from '@/providers/CalendarViewProvider'

type CalendarMode = 'month' | 'week' | 'day'

const layerZIndex = (active: boolean, order: number) => (active ? 10 + order : order)

export default function CalendarScreen() {
  const [mode, setMode] = React.useState<CalendarMode>(currentCalendarView.get())
  const anchorDateRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const unsubscribe = currentCalendarView.subscribe(() => {
      setMode(currentCalendarView.get())
    })

    const onState = (payload: { date?: string }) => {
      if (typeof payload?.date === 'string' && payload.date.length >= 10) {
        anchorDateRef.current = payload.date
      }
    }

    const onSetMode = (nextMode: CalendarMode) => {
      const prevMode = currentCalendarView.get()
      if (nextMode === prevMode) return

      calendarViewTransition.markNextEntranceSuppressed()
      currentCalendarView.set(nextMode)

      const anchorDate = anchorDateRef.current
      bus.emit('calendar:state', {
        date: anchorDate ?? new Date().toISOString().slice(0, 10),
        mode: nextMode,
      })
      if (anchorDate) {
        setTimeout(() => {
          bus.emit('calendar:set-date', anchorDate)
        }, 0)
      }
    }

    bus.on('calendar:state', onState)
    bus.on('calendar:set-mode', onSetMode)

      return () => {
        unsubscribe()
        bus.off('calendar:state', onState)
        bus.off('calendar:set-mode', onSetMode)
      }
  }, [])

  return (
    <View style={S.root}>
      <View style={S.layer}>
        <View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'month', 1) },
            mode !== 'month' ? S.hiddenLayer : null,
          ]}
          pointerEvents={mode === 'month' ? 'auto' : 'none'}
        >
          <MonthView active={mode === 'month'} initialDateISO={anchorDateRef.current} />
        </View>
        <View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'week', 2) },
            mode !== 'week' ? S.hiddenLayer : null,
          ]}
          pointerEvents={mode === 'week' ? 'auto' : 'none'}
        >
          <WeekView active={mode === 'week'} />
        </View>
        <View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'day', 3) },
            mode !== 'day' ? S.hiddenLayer : null,
          ]}
          pointerEvents={mode === 'day' ? 'auto' : 'none'}
        >
          <DayView active={mode === 'day'} />
        </View>
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
  absoluteLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenLayer: {
    opacity: 0,
  },
})
