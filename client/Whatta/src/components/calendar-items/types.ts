export type CalendarItemPressHandler = () => void

export type CalendarDensity = 'day' | 'week' | 'month'

export type ScheduleCardProps = {
  id: string
  title: string
  color: string
  timeRangeText?: string // e.g. "09:00~10:30"
  density?: CalendarDensity
  isRepeat?: boolean
  onPress?: CalendarItemPressHandler
}

export type RangeScheduleBarProps = {
  id: string
  title: string
  color: string
  startISO: string
  endISO: string
  isStart: boolean
  isEnd: boolean
  timeRangeText?: string // e.g. "00:00~23:59"
  density?: CalendarDensity
  onPress?: CalendarItemPressHandler
}

export type TaskItemModel = {
  id: string
  title: string
  done: boolean
}

export type TaskItemCardProps = {
  id: string
  title: string
  done: boolean
  density?: CalendarDensity
  onPress?: CalendarItemPressHandler
  onToggle?: (id: string, nextDone: boolean) => void
}

export type TaskGroupCardProps = {
  groupId: string
  tasks: TaskItemModel[]
  density?: CalendarDensity
  expanded?: boolean
  title?: string
  onPressTask?: (taskId: string) => void
  onToggleExpand?: (groupId: string, nextExpanded: boolean) => void
  onToggleTask?: (taskId: string, nextDone: boolean) => void
}
