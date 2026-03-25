import React from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { bus } from '@/lib/eventBus'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'
import { calendarViewTransition, currentCalendarView } from '@/providers/CalendarViewProvider'

type CalendarMode = 'month' | 'week' | 'day'

const layerZIndex = (active: boolean, order: number) => (active ? 10 + order : order)

export default function CalendarScreen() {
  const [mode, setMode] = React.useState<CalendarMode>(currentCalendarView.get())
  const [outgoingMode, setOutgoingMode] = React.useState<CalendarMode | null>(null)
  const anchorDateRef = React.useRef<string | null>(null)
  const prevModeRef = React.useRef<CalendarMode>(currentCalendarView.get())
  const transitionProgress = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    const prevMode = prevModeRef.current
    if (prevMode === mode) return

    setOutgoingMode(prevMode)
    transitionProgress.setValue(0)
    Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setOutgoingMode(null)
    })
    prevModeRef.current = mode
  }, [mode, transitionProgress])

  const getLayerStyle = React.useCallback(
    (layerMode: CalendarMode) => {
      if (mode === layerMode) {
        return {
          opacity: transitionProgress,
          transform: [
            {
              translateY: transitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
            {
              scale: transitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            },
          ],
        }
      }

      if (outgoingMode === layerMode) {
        return null
      }

      return null
    },
    [mode, outgoingMode, transitionProgress],
  )

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
        <Animated.View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'month' || outgoingMode === 'month', 1) },
            mode !== 'month' && outgoingMode !== 'month' ? S.hiddenLayer : null,
            getLayerStyle('month'),
          ]}
          pointerEvents={mode === 'month' ? 'auto' : 'none'}
        >
          <MonthView active={mode === 'month'} initialDateISO={anchorDateRef.current} />
        </Animated.View>
        <Animated.View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'week' || outgoingMode === 'week', 2) },
            mode !== 'week' && outgoingMode !== 'week' ? S.hiddenLayer : null,
            getLayerStyle('week'),
          ]}
          pointerEvents={mode === 'week' ? 'auto' : 'none'}
        >
          <WeekView active={mode === 'week'} />
        </Animated.View>
        <Animated.View
          style={[
            S.absoluteLayer,
            { zIndex: layerZIndex(mode === 'day' || outgoingMode === 'day', 3) },
            mode !== 'day' && outgoingMode !== 'day' ? S.hiddenLayer : null,
            getLayerStyle('day'),
          ]}
          pointerEvents={mode === 'day' ? 'auto' : 'none'}
        >
          <DayView active={mode === 'day'} />
        </Animated.View>
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
