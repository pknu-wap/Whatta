import React from 'react'
import { View, Text, ScrollView } from 'react-native'

import { PIXELS_PER_MIN } from './constants'
import S from './S'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'
import { bus } from '@/lib/eventBus'
import { updateTask } from '@/api/task'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const TIME_COL_W = 50
const DAY_LEFT_OFFSET = TIME_COL_W + 18
const EXPANDED_GROUP_WIDTH = 308

const formatHourLabel = (hour: number) =>
  hour === 0
    ? '오전 12시'
    : hour < 12
      ? `오전 ${hour}시`
      : hour === 12
        ? '오후 12시'
        : `오후 ${hour - 12}시`

type DayTimelineProps = {
  gridScrollRef: React.RefObject<ScrollView | null>
  gridWrapRef: React.RefObject<View | null>
  measureLayouts: () => void
  setGridScrollY: React.Dispatch<React.SetStateAction<number>>
  isToday: boolean
  nowTop: number | null
  overlappedEvents: any[]
  anchorDate: string
  events: any[]
  getLabelName: (labelId?: number) => string
  getTaskStartHour: (placementTime?: string | null) => number
  openEventDetail: (event: any) => void | Promise<void>
  taskGroups: Array<{
    groupId: string
    startMin: number
    tasks: any[]
  }>
  openGroupId: string | null
  setOpenGroupId: React.Dispatch<React.SetStateAction<string | null>>
  setTasks: React.Dispatch<React.SetStateAction<any[]>>
  openTaskPopupFromApi: (taskId: string) => void | Promise<void>
  DraggableFixedEvent: React.ComponentType<any>
  DraggableFlexibleEvent: React.ComponentType<any>
  DraggableTaskGroupBox: React.ComponentType<any>
  DraggableTaskBox: React.ComponentType<any>
}

export default function DayTimeline({
  gridScrollRef,
  gridWrapRef,
  measureLayouts,
  setGridScrollY,
  isToday,
  nowTop,
  overlappedEvents,
  anchorDate,
  events,
  getLabelName,
  getTaskStartHour,
  openEventDetail,
  taskGroups,
  openGroupId,
  setOpenGroupId,
  setTasks,
  openTaskPopupFromApi,
  DraggableFixedEvent,
  DraggableFlexibleEvent,
  DraggableTaskGroupBox,
  DraggableTaskBox,
}: DayTimelineProps) {
  return (
    <ScrollView
      ref={gridScrollRef}
      style={S.gridScroll}
      contentContainerStyle={[S.gridContent, { position: 'relative' }]}
      showsVerticalScrollIndicator={false}
      onLayout={measureLayouts}
      onScroll={(e) => {
        setGridScrollY(e.nativeEvent.contentOffset.y)
      }}
      scrollEventThrottle={16}
    >
      <View ref={gridWrapRef} style={S.gridLayer}>
        {HOURS.map((h, i) => {
          const isLast = i === HOURS.length - 1

          return (
            <View key={h} style={S.row}>
              <View style={S.timeCol}>
                <Text style={S.timeText}>{formatHourLabel(h)}</Text>
              </View>

              <View style={S.slotCol} />

              {!isLast && <View pointerEvents="none" style={S.guideLine} />}
            </View>
          )
        })}

        {isToday && nowTop !== null && (
          <View pointerEvents="none" style={S.gridOverlay}>
            <View style={[S.liveBar, { top: nowTop }]} />
            <View style={[S.liveDot, { top: nowTop - 3 }]} />
          </View>
        )}
      </View>

      {overlappedEvents.map((evt) => {
        const [sh, sm] = evt.clippedStartTime.split(':').map(Number)
        const [eh, em] = evt.clippedEndTime.split(':').map(Number)
        const startMin = sh * 60 + sm
        const endMin = eh * 60 + em

        if (evt.isRepeat) {
          return (
            <DraggableFixedEvent
              key={evt.id}
              id={evt.id}
              title={evt.title}
              startMin={startMin}
              endMin={endMin}
              color={resolveScheduleColor(evt.colorKey)}
              anchorDate={anchorDate}
              onPress={() => openEventDetail(evt)}
            />
          )
        }

        return (
          <DraggableFlexibleEvent
            key={evt.id}
            id={evt.id}
            title={evt.title}
            place={getLabelName(evt.labels?.[0])}
            startMin={startMin}
            endMin={endMin}
            color={resolveScheduleColor(evt.colorKey)}
            anchorDate={anchorDate}
            isRepeat={!!evt.isRepeat}
            onPress={() => openEventDetail(evt)}
            events={events}
          />
        )
      })}

      {taskGroups.map((group) => {
        const { tasks: list, startMin, groupId } = group

        if (openGroupId === groupId) return null

        if (list.length >= 2) {
          return (
            <DraggableTaskGroupBox
              key={groupId}
              group={list}
              startMin={startMin}
              anchorDate={anchorDate}
              onPress={() => setOpenGroupId(groupId)}
            />
          )
        }

        return list.map((task) => (
          <DraggableTaskBox
            key={task.id}
            id={task.id}
            title={task.title}
            startHour={getTaskStartHour(task.placementTime)}
            anchorDate={anchorDate}
            done={task.completed}
            onPress={() => openTaskPopupFromApi(task.id)}
            events={events}
          />
        ))
      })}

      {openGroupId !== null &&
        (() => {
          const group = taskGroups.find((item) => item.groupId === openGroupId)
          if (!group) return null
          const { tasks: list, startMin, groupId } = group

          return (
            <View
              style={{
                position: 'absolute',
                top: startMin * PIXELS_PER_MIN + 2,
                left: DAY_LEFT_OFFSET,
                width: EXPANDED_GROUP_WIDTH,
                backgroundColor: 'transparent',
                zIndex: 500,
              }}
            >
              <TaskGroupCard
                groupId={`day-group-open-${groupId}`}
                density="day"
                expanded
                layoutWidthHint={EXPANDED_GROUP_WIDTH}
                tasks={list.map((task) => ({
                  id: String(task.id),
                  title: task.title ?? '',
                  done: !!task.completed,
                }))}
                onToggleExpand={() => setOpenGroupId(null)}
                onPressTask={(taskId) => {
                  void openTaskPopupFromApi(taskId)
                }}
                onToggleTask={(taskId, nextDone) => {
                  setTasks((prev) =>
                    prev.map((task) =>
                      String(task.id) === String(taskId)
                        ? { ...task, completed: nextDone }
                        : task,
                    ),
                  )
                  void updateTask(taskId, { completed: nextDone })
                    .then(() => {
                      bus.emit('calendar:mutated', {
                        op: 'update',
                        item: {
                          id: taskId,
                          isTask: true,
                          date: anchorDate,
                          completed: nextDone,
                        },
                      })
                    })
                    .catch((err) => {
                      setTasks((prev) =>
                        prev.map((task) =>
                          String(task.id) === String(taskId)
                            ? { ...task, completed: !nextDone }
                            : task,
                        ),
                      )
                      console.error('❌ 그룹 테스크 상태 업데이트 실패:', err)
                    })
                }}
              />
            </View>
          )
        })()}
    </ScrollView>
  )
}
