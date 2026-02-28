import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'

import { layoutDayEvents } from '@/screens/Calender/Week/layout'

type WeekTimelineProps = {
  styles: Record<string, any>
  gridContainerRef: React.RefObject<View | null>
  gridScrollRef: React.RefObject<ScrollView | null>
  gridWrapRef: React.RefObject<View | null>
  hours: number[]
  rowH: number
  weekDates: string[]
  weekData: Record<string, any>
  todayISO: string
  nowTop: number | null
  dayColWidth: number
  getTaskTime: (task: any) => string
  openEventDetail: (id: string, occDate?: string) => void
  openTaskPopupFromApi: (taskId: string) => void
  onGridScroll: (offsetY: number) => void
  onTimedTaskCompletedChange: (payload: {
    id: string
    dateISO: string
    completed: boolean
  }) => void
  DraggableFlexibleEventComponent: React.ComponentType<any>
  TaskGroupBoxComponent: React.ComponentType<any>
  DraggableTaskBoxComponent: React.ComponentType<any>
}

export default function WeekTimeline({
  styles,
  gridContainerRef,
  gridScrollRef,
  gridWrapRef,
  hours,
  rowH,
  weekDates,
  weekData,
  todayISO,
  nowTop,
  dayColWidth,
  getTaskTime,
  openEventDetail,
  openTaskPopupFromApi,
  onGridScroll,
  onTimedTaskCompletedChange,
  DraggableFlexibleEventComponent,
  TaskGroupBoxComponent,
  DraggableTaskBoxComponent,
}: WeekTimelineProps) {
  return (
    <View ref={gridContainerRef} style={T.flex1}>
      <ScrollView
        ref={gridScrollRef}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          onGridScroll(e.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        <View ref={gridWrapRef} style={styles.timelineInner}>
          <View pointerEvents="none" style={styles.hourLinesOverlay}>
            <View style={styles.mainVerticalLine} />

            {hours.map((_, i) => {
              if (i === hours.length - 1) return null
              return <View key={`hline-${i}`} style={[styles.hourLine, { top: (i + 1) * rowH }]} />
            })}
          </View>

          <View style={T.row}>
            <View style={styles.timeCol}>
              {hours.map((h) => (
                <View key={`hour-${h}`} style={styles.timeRow}>
                  <Text style={styles.timeText}>
                    {h === 0
                      ? '오전 12시'
                      : h < 12
                        ? `오전 ${h}시`
                        : h === 12
                          ? '오후 12시'
                          : `오후 ${h - 12}시`}
                  </Text>
                </View>
              ))}
            </View>

            {weekDates.map((d, colIdx) => {
              const bucket = weekData[d] || {
                timelineEvents: [],
                timedTasks: [],
              }
              const isTodayCol = d === todayISO
              const layoutEvents = layoutDayEvents(bucket.timelineEvents || [], d)
              const timedTasks = bucket.timedTasks || []

              const groupedTasks = timedTasks.reduce((acc: Record<string, any[]>, t: any) => {
                const timeKey = getTaskTime(t)
                acc[timeKey] = acc[timeKey] ? [...acc[timeKey], t] : [t]
                return acc
              }, {})

              return (
                <View
                  key={`${d}-col`}
                  style={[styles.dayCol, { width: dayColWidth }, colIdx === 0 && styles.firstDayCol]}
                >
                  {hours.map((_, i) => (
                    <View key={`${d}-row-${i}`} style={styles.hourRow} />
                  ))}

                  {isTodayCol && nowTop !== null && (
                    <>
                      <View style={[styles.liveBar, { top: nowTop }]} />
                      <View style={[styles.liveDot, { top: nowTop - 3 }]} />
                    </>
                  )}

                  {layoutEvents.map((ev, i) => (
                    <DraggableFlexibleEventComponent
                      key={`ev-${ev.id}-${i}`}
                      id={ev.id}
                      title={ev.title}
                      place={ev.place}
                      startMin={ev.startMin}
                      endMin={ev.endMin}
                      color={ev.color}
                      dateISO={d}
                      column={ev.column}
                      columnsTotal={ev.columnsTotal}
                      isPartialOverlap={ev.isPartialOverlap}
                      overlapDepth={ev.overlapDepth ?? 0}
                      dayColWidth={dayColWidth}
                      weekDates={weekDates}
                      dayIndex={colIdx}
                      openEventDetail={openEventDetail}
                      isRepeat={ev.isRepeat}
                    />
                  ))}

                  {Object.entries(groupedTasks).map(([timeKey, group]) => {
                    const list = group as any[]
                    if (!list.length) return null

                    const timeStr = getTaskTime(list[0])
                    const [h, m] = timeStr.split(':').map((n) => Number(n) || 0)
                    const start = h + m / 60

                    if (list.length > 1) {
                      return (
                        <TaskGroupBoxComponent
                          key={`${d}-${timeKey}-${dayColWidth}`}
                          tasks={list}
                          startHour={start}
                          dayColWidth={dayColWidth}
                          dateISO={d}
                          dayIndex={colIdx}
                          weekCount={weekDates.length}
                          onLocalChange={({ id, dateISO, completed }: any) => {
                            if (typeof completed === 'boolean') {
                              onTimedTaskCompletedChange({
                                id: String(id),
                                dateISO,
                                completed,
                              })
                            }
                          }}
                        />
                      )
                    }

                    return (
                      <DraggableTaskBoxComponent
                        key={`${d}-${timeKey}-single-${list[0].id}`}
                        id={String(list[0].id)}
                        title={list[0].title}
                        startHour={start}
                        done={list[0].completed ?? false}
                        dateISO={d}
                        dayColWidth={dayColWidth}
                        dayIndex={colIdx}
                        weekCount={weekDates.length}
                        openDetail={openTaskPopupFromApi}
                        onLocalChange={({ id, dateISO, completed }: any) => {
                          if (typeof completed === 'boolean') {
                            onTimedTaskCompletedChange({
                              id: String(id),
                              dateISO,
                              completed,
                            })
                          }
                        }}
                      />
                    )
                  })}
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const T = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
})
