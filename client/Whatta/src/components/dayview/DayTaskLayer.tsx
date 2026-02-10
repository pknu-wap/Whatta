// components/dayview/DayTaskLayer.tsx
import React from 'react'
import { View, Pressable, Text } from 'react-native'
import DraggableTaskBox from './DraggableTaskBox'
import DraggableTaskGroupBox from './DraggableTaskGroupBox'

type DayTaskLayerProps = {
  taskGroups: any[]
  anchorDate: string
  events: any[]
  openGroupIndex: number | null
  setOpenGroupIndex: (v: number | null) => void
  openTaskPopupFromApi: (taskId: string) => void
  setIsDraggingTask: (v: boolean) => void
}

export default function DayTaskLayer({
  taskGroups,
  anchorDate,
  events,
  openGroupIndex,
  setOpenGroupIndex,
  openTaskPopupFromApi,
  setIsDraggingTask,
}: DayTaskLayerProps) {
  return (
    <>
      {taskGroups.map((group, idx) => {
        const { tasks: list, startMin } = group

        if (list.length >= 4) {
          return (
            <DraggableTaskGroupBox
              key={`group-${idx}`}
              group={list}
              startMin={startMin}
              count={list.length}
              anchorDate={anchorDate}
              onPress={() =>
                setOpenGroupIndex(openGroupIndex === idx ? null : idx)
              }
              setIsDraggingTask={setIsDraggingTask}
            />
          )
        }

        return list.map((task: any) => {
          const start = task.placementTime?.includes(':')
            ? (() => {
                const [h, m] = task.placementTime.split(':').map(Number)
                return h + m / 60
              })()
            : 0

          return (
            <DraggableTaskBox
              key={task.id}
              id={task.id}
              title={task.title}
              startHour={start}
              anchorDate={anchorDate}
              placementDate={task.placementDate}
              done={task.completed}
              onPress={() => openTaskPopupFromApi(task.id)}
              column={task._column}
              totalColumns={task._totalColumns}
              events={events}
            />
          )
        })
      })}
    </>
  )
}