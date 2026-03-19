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
  labelTitleById: Record<string, string>
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

type TaskVisualBlock = {
  kind: 'single' | 'group'
  key: string
  startMin: number
  endMin: number
  task?: any
  tasks?: any[]
}

type DayVisualBlock =
  | {
      kind: 'event'
      key: string
      startMin: number
      endMin: number
      event: any
    }
  | ({
      kind: 'single' | 'group'
      key: string
      startMin: number
      endMin: number
    } & (
      | {
          kind: 'single'
          task: any
        }
      | {
          kind: 'group'
          tasks: any[]
        }
    ))

type LayoutedDayVisualBlock = DayVisualBlock & {
  column: number
  columnsTotal: number
}

function layoutDayVisualBlocks(blocks: DayVisualBlock[]): LayoutedDayVisualBlock[] {
  if (!blocks.length) return []

  const sorted = [...blocks].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    if (a.endMin !== b.endMin) return a.endMin - b.endMin
    if (a.kind !== b.kind) return a.kind === 'event' ? -1 : 1
    return a.key.localeCompare(b.key)
  })

  const out: LayoutedDayVisualBlock[] = []
  let i = 0

  while (i < sorted.length) {
    const cluster: DayVisualBlock[] = [sorted[i]]
    let clusterEnd = sorted[i].endMin
    let j = i + 1

    while (j < sorted.length && sorted[j].startMin < clusterEnd) {
      cluster.push(sorted[j])
      clusterEnd = Math.max(clusterEnd, sorted[j].endMin)
      j++
    }

    const colEndTimes: number[] = []
    const placed = cluster.map((b) => {
      let col = colEndTimes.findIndex((end) => end <= b.startMin)
      if (col === -1) {
        col = colEndTimes.length
        colEndTimes.push(b.endMin)
      } else {
        colEndTimes[col] = b.endMin
      }
      return { ...b, column: col }
    })

    const columnsTotal = Math.max(1, colEndTimes.length)
    placed.forEach((p) => out.push({ ...p, columnsTotal }))
    i = j
  }

  return out
}

function WeekTimeline({
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
  labelTitleById,
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
            {hours.map((_, i) => {
              if (i === hours.length - 1) return null
              return <View key={`hline-${i}`} style={[styles.hourLine, { top: (i + 1) * rowH }]} />
            })}
          </View>

          <View style={T.row}>
            <View style={styles.timeCol}>
              {hours.map((h) => (
                <View key={`hour-${h}`} style={[styles.timeRow, { height: rowH }]}>
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
              const getEventSubText = (ev: any) => {
                const place = String(ev?.place ?? '').trim()
                if (place) return place

                const names = (ev?.labels ?? [])
                  .map((id: number | string) => labelTitleById[String(id)])
                  .filter((name: string | undefined): name is string => !!name && name.trim().length > 0)

                return names.length ? names.join(', ') : ''
              }

              const taskBlocks: TaskVisualBlock[] = []
              for (const [timeKey, group] of Object.entries(groupedTasks)) {
                const list = group as any[]
                if (!list.length) continue

                const [h, m] = getTaskTime(list[0]).split(':').map((n) => Number(n) || 0)
                const startMin = h * 60 + m
                const endMin = Math.min(24 * 60, startMin + 60)

                if (list.length > 1) {
                  taskBlocks.push({
                    kind: 'group',
                    key: `${d}-${timeKey}-group`,
                    startMin,
                    endMin,
                    tasks: list,
                  })
                  continue
                }

                taskBlocks.push({
                  kind: 'single',
                  key: `${d}-${timeKey}-single-${list[0].id}`,
                  startMin,
                  endMin,
                  task: list[0],
                })
              }

              const dayVisualBlocks: DayVisualBlock[] = [
                ...layoutEvents.map(
                  (ev, i) =>
                    ({
                      kind: 'event',
                      key: `event-${ev.id}-${i}`,
                      startMin: ev.startMin,
                      endMin: ev.endMin,
                      event: ev,
                    }) as DayVisualBlock,
                ),
                ...taskBlocks.map((block) => block as DayVisualBlock),
              ]
              const layoutedDayBlocks = layoutDayVisualBlocks(dayVisualBlocks)

              return (
                <View
                  key={`${d}-col`}
                  style={[styles.dayCol, { width: dayColWidth }, colIdx === 0 && styles.firstDayCol]}
                >
                  {hours.map((_, i) => (
                    <View key={`${d}-row-${i}`} style={[styles.hourRow, { height: rowH }]} />
                  ))}

                  {isTodayCol && nowTop !== null && (
                    <>
                      <View style={[styles.liveBar, { top: nowTop }]} />
                      <View style={[styles.liveDot, { top: nowTop - 3 }]} />
                    </>
                  )}

                  {layoutedDayBlocks.map((block) => {
                    if (block.kind === 'event') {
                      const ev = block.event
                      return (
                        <DraggableFlexibleEventComponent
                          key={block.key}
                          id={ev.id}
                          title={ev.title}
                          labelText={getEventSubText(ev)}
                          startMin={ev.startMin}
                          endMin={ev.endMin}
                          color={ev.color}
                          dateISO={d}
                          column={block.column}
                          columnsTotal={block.columnsTotal}
                          dayColWidth={dayColWidth}
                          weekDates={weekDates}
                          dayIndex={colIdx}
                          rowH={rowH}
                          openEventDetail={openEventDetail}
                          isRepeat={ev.isRepeat}
                        />
                      )
                    }

                    const start = block.startMin / 60

                    if (block.kind === 'group') {
                      return (
                        <TaskGroupBoxComponent
                          key={block.key}
                          tasks={block.tasks}
                          startHour={start}
                          dayColWidth={dayColWidth}
                          dateISO={d}
                          dayIndex={colIdx}
                          weekCount={weekDates.length}
                          rowH={rowH}
                          column={block.column}
                          columnsTotal={block.columnsTotal}
                          openTaskPopupFromApi={openTaskPopupFromApi}
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

                    if (block.kind === 'single') {
                      return (
                        <DraggableTaskBoxComponent
                          key={block.key}
                          id={String(block.task.id)}
                          title={block.task.title}
                          startHour={start}
                          done={block.task.completed ?? false}
                          dateISO={d}
                          dayColWidth={dayColWidth}
                          dayIndex={colIdx}
                          weekCount={weekDates.length}
                          rowH={rowH}
                          column={block.column}
                          columnsTotal={block.columnsTotal}
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
                    }

                    return null
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

export default React.memo(WeekTimeline)

const T = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
})
