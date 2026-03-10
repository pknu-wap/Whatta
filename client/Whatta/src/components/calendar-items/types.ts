export type CalendarItemPressHandler = () => void

export type CalendarDensity = 'day' | 'week' | 'month'

export type ItemFrame = {
  top: number
  left: number
  width: number
  height: number
  zIndex?: number
}

export type ScheduleCardProps = {
  id: string
  title: string
  color: string
  timeRangeText?: string // e.g. "09:00~10:30"
  isUntimed?: boolean
  density?: CalendarDensity
  layoutWidthHint?: number
  isRepeat?: boolean
  hideText?: boolean
  style?: any
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
  isUntimed?: boolean
  density?: CalendarDensity
  layoutWidthHint?: number
  radiusOverride?: number
  capWidthOverride?: number
  style?: any
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
  isUntimed?: boolean
  density?: CalendarDensity
  layoutWidthHint?: number
  hideText?: boolean
  style?: any
  onPress?: CalendarItemPressHandler
  onToggle?: (id: string, nextDone: boolean) => void
}

export type TaskGroupCardProps = {
  groupId: string
  tasks: TaskItemModel[]
  density?: CalendarDensity
  expanded?: boolean
  title?: string
  layoutWidthHint?: number
  hideText?: boolean
  onToggleExpand?: (groupId: string, nextExpanded: boolean) => void
  onToggleTask?: (taskId: string, nextDone: boolean) => void
}
