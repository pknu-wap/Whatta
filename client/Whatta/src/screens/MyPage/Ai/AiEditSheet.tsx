import React from 'react'
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import XIcon from '@/assets/icons/x.svg'
import { createLabel } from '@/api/label_api'
import type { AiCardDraftItem } from '@/screens/MyPage/Ai/AiCard'
import CreateEventDetailStep from '@/screens/More/CreateEventDetailStep'
import AiInlineDateRangePicker from '@/screens/MyPage/Ai/AiInlineDateRangePicker'
import { useLabels } from '@/providers/LabelProvider'
import colors from '@/styles/colors'
import {
  getActiveScheduleColorSetId,
  getScheduleColorSet,
} from '@/styles/scheduleColorSets'
import { ts } from '@/styles/typography'

type Props = {
  visible: boolean
  item: AiCardDraftItem | null
  onChange: (patch: Partial<AiCardDraftItem>) => void
  onClose: () => void
}

const REMIND_OPTIONS = [
  { type: 'preset' as const, id: 'same-day-10m', day: 0, hour: 0, minute: 10, label: '당일 10분 전' },
  { type: 'preset' as const, id: 'same-day-1h', day: 0, hour: 1, minute: 0, label: '당일 1시간 전' },
  { type: 'custom' as const, label: '맞춤 설정' },
]
const WEEKDAY_ENUM = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

const parseDateOnly = (value: string | null | undefined) => {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

const parseDateTime = (date: string | null | undefined, time: string | null | undefined) => {
  const base = parseDateOnly(date)
  if (!base) return new Date()
  if (!time) return base
  const [hour = '0', minute = '0'] = time.split(':')
  base.setHours(Number(hour), Number(minute), 0, 0)
  return base
}

const parseDueDateTime = (value: string | null | undefined) => {
  if (!value) return null
  const [date, time] = value.split('T')
  return parseDateTime(date, time)
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatDate = (d: Date | null) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : null
const formatTime = (d: Date | null) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:00` : null)
const toTaskDueDateTime = (date: Date | null, time: Date | null) => {
  if (!date) return null
  const yyyyMmDd = formatDate(date)
  if (!yyyyMmDd) return null
  const hhmmss = time ? formatTime(time) : '00:00:00'
  return `${yyyyMmDd}T${hhmmss}`
}

const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const isEventEndBeforeStart = (start: Date, end: Date) => end.getTime() < start.getTime()

const buildAutoEndForEvent = (baseStart: Date, allowNextDay: boolean) => {
  const nextEnd = new Date(baseStart)
  if (allowNextDay) {
    nextEnd.setHours(baseStart.getHours() + 1, baseStart.getMinutes(), 0, 0)
    return nextEnd
  }
  const capped = new Date(baseStart)
  const nextHour = baseStart.getHours() + 1
  if (nextHour >= 24) {
    capped.setHours(23, 59, 0, 0)
    return capped
  }
  capped.setHours(nextHour, baseStart.getMinutes(), 0, 0)
  return capped
}

const getWeekIndexOfMonth = (d: Date) => {
  const day = d.getDate()
  const nth = Math.floor((day - 1) / 7) + 1
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const isLast = day > lastDay - 7
  return { nth, isLast }
}

function normalizeWeekdayOn(values: string[] | null | undefined) {
  if (!values?.length) return []

  const next = values
    .map((value) => {
      const asNumber = Number(value)
      if (Number.isFinite(asNumber)) return asNumber
      const idx = WEEKDAY_ENUM.indexOf(value as (typeof WEEKDAY_ENUM)[number])
      return idx >= 0 ? idx : null
    })
    .filter((value): value is number => value !== null && value >= 0 && value <= 6)

  return Array.from(new Set(next)).sort((a, b) => a - b)
}

function sameRepeat(
  left: AiCardDraftItem['repeat'] | null | undefined,
  right: AiCardDraftItem['repeat'] | null | undefined,
) {
  if (!left && !right) return true
  if (!left || !right) return false

  const leftOn = left.on ?? []
  const rightOn = right.on ?? []
  const leftExceptions = left.exceptionDates ?? []
  const rightExceptions = right.exceptionDates ?? []

  return (
    left.interval === right.interval &&
    left.unit === right.unit &&
    left.endDate === right.endDate &&
    leftOn.length === rightOn.length &&
    leftOn.every((value, index) => value === rightOn[index]) &&
    leftExceptions.length === rightExceptions.length &&
    leftExceptions.every((value, index) => value === rightExceptions[index])
  )
}

const FIXED_LABEL_TITLES = ['일정', '할 일'] as const

function ensureDefaultLabelIds(
  ids: number[],
  labels: Array<{ id: number; title: string }>,
  isEvent: boolean,
) {
  const defaultTitle = isEvent ? '일정' : '할 일'
  const defaultLabel = labels.find((label) => label.title === defaultTitle)
  const fixedIds = new Set(
    labels.filter((label) => FIXED_LABEL_TITLES.includes(label.title as (typeof FIXED_LABEL_TITLES)[number])).map((label) => label.id),
  )
  const next = ids.filter((id) => !fixedIds.has(id))
  if (defaultLabel && !next.includes(defaultLabel.id)) {
    next.unshift(defaultLabel.id)
  }
  return next
}

export default function AiEditSheet({ visible, item, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const prevItemIdRef = React.useRef<string | null>(null)
  const prevVisibleRef = React.useRef(false)
  const { labels: globalLabels, refresh: refreshLabels } = useLabels()
  const { height: screenHeight } = Dimensions.get('window')
  const sheetHeight = Math.min(screenHeight * 0.82, 720)
  const collapsedY = sheetHeight * 0.36
  const closeY = sheetHeight + 40
  const translateY = useSharedValue(closeY)
  const gestureStartY = useSharedValue(collapsedY)

  React.useEffect(() => {
    if (visible) {
      translateY.value = closeY
      translateY.value = withTiming(collapsedY, { duration: 260 })
    } else {
      translateY.value = closeY
    }
  }, [closeY, collapsedY, translateY, visible])

  const closeSheet = React.useCallback(() => {
    translateY.value = withTiming(closeY, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(onClose)()
      }
    })
  }, [closeY, onClose, translateY])

  const snapTo = React.useCallback(
    (nextY: number) => {
      translateY.value = withTiming(nextY, { duration: 220 })
    },
    [translateY],
  )

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      gestureStartY.value = translateY.value
    })
    .onUpdate((event) => {
      const next = Math.max(0, Math.min(closeY, gestureStartY.value + event.translationY))
      translateY.value = next
    })
    .onEnd((event) => {
      if (event.velocityY > 900 || translateY.value > collapsedY + 120) {
        runOnJS(closeSheet)()
        return
      }

      if (event.velocityY < -700 || translateY.value < collapsedY / 2) {
        runOnJS(snapTo)(0)
        return
      }

      const target = translateY.value < collapsedY / 2 ? 0 : collapsedY
      runOnJS(snapTo)(target)
    })

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, translateY.value / closeY),
  }))

  const paletteColors = React.useMemo(
    () => getScheduleColorSet(getActiveScheduleColorSetId()) as readonly string[],
    [],
  )
  const [title, setTitle] = React.useState('')
  const [memo, setMemo] = React.useState('')
  const [selectedColorIndex, setSelectedColorIndex] = React.useState(0)
  const [selectedType, setSelectedType] = React.useState<'event' | 'task' | null>('event')
  const [start, setStart] = React.useState(new Date())
  const [end, setEnd] = React.useState(new Date(Date.now() + 60 * 60 * 1000))
  const [timeOn, setTimeOn] = React.useState(true)
  const [invalidEndTime, setInvalidEndTime] = React.useState(false)
  const [invalidEndPreview, setInvalidEndPreview] = React.useState<Date | null>(null)
  const [repeatOn, setRepeatOn] = React.useState(false)
  const [repeatMode, setRepeatMode] = React.useState<'daily' | 'weekly' | 'monthly' | 'custom'>(
    'daily',
  )
  const [repeatEvery, setRepeatEvery] = React.useState(1)
  const [repeatUnit, setRepeatUnit] = React.useState<'day' | 'week' | 'month'>('day')
  const [monthlyOpt, setMonthlyOpt] = React.useState<'byDate' | 'byNthWeekday' | 'byLastWeekday'>(
    'byDate',
  )
  const [repeatWeekdays, setRepeatWeekdays] = React.useState<number[]>([])
  const [repeatEndDate, setRepeatEndDate] = React.useState<Date | null>(null)
  const [remindOn, setRemindOn] = React.useState(false)
  const [remindOpen, setRemindOpen] = React.useState(false)
  const [customOpen, setCustomOpen] = React.useState(false)
  const [customHour, setCustomHour] = React.useState(0)
  const [customMinute, setCustomMinute] = React.useState(10)
  const [remindValue, setRemindValue] = React.useState<(typeof REMIND_OPTIONS)[number] | 'custom' | null>(null)
  const [selectedLabelIds, setSelectedLabelIds] = React.useState<number[]>([])
  const [taskDate, setTaskDate] = React.useState<Date | null>(null)
  const [taskDueOn, setTaskDueOn] = React.useState(false)
  const [taskDueDate, setTaskDueDate] = React.useState<Date | null>(null)
  const [taskDueTimeOn, setTaskDueTimeOn] = React.useState(false)
  const [taskDueTime, setTaskDueTime] = React.useState(new Date())
  const [eventDateOpen, setEventDateOpen] = React.useState(false)

  React.useEffect(() => {
    const wasVisible = prevVisibleRef.current
    prevVisibleRef.current = visible

    if (!visible || !item) return

    const itemChanged = prevItemIdRef.current !== item.id
    const openedNow = !wasVisible
    if (!itemChanged && !openedNow) return
    prevItemIdRef.current = item.id

    const startDate = parseDateTime(item.startDate, item.startTime)
    const endDate =
      item.isEvent && (item.endDate || item.endTime)
        ? parseDateTime(item.endDate ?? item.startDate, item.endTime ?? item.startTime)
        : new Date(startDate.getTime() + 60 * 60 * 1000)
    const due = parseDueDateTime(item.dueDateTime)

    setTitle(item.title || '')
    setMemo(item.memo ?? '')
    setSelectedColorIndex(
      Math.max(0, paletteColors.findIndex((color) => color === item.colorHex)),
    )
    setSelectedType(item.isEvent ? 'event' : 'task')
    setStart(startDate)
    setEnd(endDate)
    setTimeOn(!!(item.startTime || item.endTime))
    const nextInvalidEndTime = item.isEvent && !!item.startTime && !!item.endTime && isEventEndBeforeStart(startDate, endDate)
    setInvalidEndTime(nextInvalidEndTime)
    setInvalidEndPreview(nextInvalidEndTime ? endDate : null)
    setRepeatOn(!!item.repeat)
    setRepeatMode(
      item.repeat?.unit === 'WEEK'
        ? 'weekly'
        : item.repeat?.unit === 'MONTH'
          ? 'monthly'
          : 'daily',
    )
    setRepeatEvery(item.repeat?.interval ?? 1)
    setRepeatUnit(
      item.repeat?.unit === 'WEEK'
        ? 'week'
        : item.repeat?.unit === 'MONTH'
          ? 'month'
          : 'day',
    )
    setMonthlyOpt('byDate')
    setRepeatWeekdays(normalizeWeekdayOn(item.repeat?.on))
    setRepeatEndDate(parseDateOnly(item.repeat?.endDate))
    const reminder = item.reminderNoti
    const matchedReminder =
      REMIND_OPTIONS.find(
        (option) =>
          option.type === 'preset' &&
          reminder &&
          option.day === reminder.day &&
          option.hour === reminder.hour &&
          option.minute === reminder.minute,
      ) ?? null
    setRemindOn(!!reminder)
    setRemindOpen(false)
    setCustomOpen(reminder ? !matchedReminder : false)
    setCustomHour(reminder?.hour ?? 0)
    setCustomMinute(reminder?.minute ?? 10)
    setRemindValue(
      !reminder
        ? null
        : matchedReminder
          ? matchedReminder
          : 'custom',
    )
    setSelectedLabelIds(
      ensureDefaultLabelIds(item.labelIds ?? [], globalLabels ?? [], item.isEvent),
    )
    setTaskDate(parseDateOnly(item.startDate) ?? parseDateOnly(item.dueDateTime?.split('T')[0]))
    setTaskDueOn(!!due)
    setTaskDueDate(due ? new Date(due) : null)
    setTaskDueTimeOn(!!item.dueDateTime)
    setTaskDueTime(due ?? new Date())
    setEventDateOpen(false)
    if (item.isEvent && (!item.startDate || !item.endDate)) {
      onChange({
        startDate: item.startDate ?? formatDate(startDate),
        endDate: item.endDate ?? formatDate(endDate),
      })
    }
    if (!item.isEvent && !item.startDate && !item.dueDateTime) {
      onChange({
        startDate: formatDate(startDate),
      })
      setTaskDate(startDate)
    }
  }, [globalLabels, item, paletteColors, visible])

  const buildReminderNoti = React.useCallback(() => {
    if (!remindOn || !remindValue) return null

    if (remindValue === 'custom' || remindValue.type === 'custom') {
      return {
        day: 0,
        hour: customHour,
        minute: customMinute,
      }
    }

    return {
      day: remindValue.day,
      hour: remindValue.hour,
      minute: remindValue.minute,
    }
  }, [customHour, customMinute, remindOn, remindValue])

  const remindDisplayText = React.useMemo(() => {
    if (!remindOn || !remindValue) return ''
    if (remindValue === 'custom' || remindValue.type === 'custom') {
      const hourText = customHour > 0 ? `${customHour}시간 ` : ''
      return `${hourText}${customMinute}분 전`
    }
    return remindValue.label
  }, [customHour, customMinute, remindOn, remindValue])

  const remindSelectedKey = React.useMemo(() => {
    if (!remindOn || !remindValue) return null
    if (remindValue === 'custom' || remindValue.type === 'custom') return 'custom'
    return remindValue.id
  }, [remindOn, remindValue])

  const nextRepeatDraft = React.useMemo<AiCardDraftItem['repeat']>(() => {
    if (selectedType !== 'event' || !repeatOn) return null

    let interval = repeatEvery
    let unit: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'
    let on: string[] = []

    if (repeatMode === 'custom') {
      interval = repeatEvery
      unit = repeatUnit === 'week' ? 'WEEK' : repeatUnit === 'month' ? 'MONTH' : 'DAY'
    } else {
      interval = 1
      unit = repeatMode === 'weekly' ? 'WEEK' : repeatMode === 'monthly' ? 'MONTH' : 'DAY'
    }

    if (unit === 'WEEK') {
      const weekdays =
        repeatMode === 'weekly'
          ? Array.from(new Set([start.getDay(), ...repeatWeekdays])).sort((a, b) => a - b)
          : [start.getDay()]
      on = weekdays.map((day) => WEEKDAY_ENUM[day])
    } else if (unit === 'MONTH') {
      const weekday = WEEKDAY_ENUM[start.getDay()]
      const { nth, isLast } = getWeekIndexOfMonth(start)

      if (monthlyOpt === 'byDate') {
        on = [`D${start.getDate()}`]
      } else if (monthlyOpt === 'byNthWeekday') {
        on = [`${nth}${weekday}`]
      } else {
        on = [isLast ? `LAST${weekday}` : `${nth}${weekday}`]
      }
    }

    return {
      interval,
      unit,
      on,
      endDate: formatDate(repeatEndDate),
      exceptionDates: item?.repeat?.exceptionDates ?? [],
    }
  }, [
    item?.repeat?.exceptionDates,
    monthlyOpt,
    repeatEndDate,
    repeatEvery,
    repeatMode,
    repeatOn,
    repeatUnit,
    repeatWeekdays,
    selectedType,
    start,
  ])

  React.useEffect(() => {
    if (!item) return
    if (sameRepeat(item.repeat, nextRepeatDraft)) return
    onChange({ repeat: nextRepeatDraft })
  }, [item, nextRepeatDraft, onChange])

  React.useEffect(() => {
    if (!item) return
    const nextReminder = buildReminderNoti()
    const currentReminder = item.reminderNoti ?? null
    const sameReminder =
      currentReminder?.day === nextReminder?.day &&
      currentReminder?.hour === nextReminder?.hour &&
      currentReminder?.minute === nextReminder?.minute

    if (sameReminder) return
    onChange({ reminderNoti: nextReminder })
  }, [buildReminderNoti, item, onChange])

  React.useEffect(() => {
    if (!item || !globalLabels.length) return
    const next = ensureDefaultLabelIds(selectedLabelIds, globalLabels, selectedType === 'event')
    const changed =
      next.length !== selectedLabelIds.length || next.some((id, index) => id !== selectedLabelIds[index])
    if (!changed) return
    setSelectedLabelIds(next)
    onChange({ labelIds: next })
  }, [globalLabels, item, onChange, selectedLabelIds, selectedType])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={S.overlay}>
        <Animated.View style={[S.backdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              S.sheet,
              sheetAnimatedStyle,
              {
                height: sheetHeight,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={S.handle} />
            <View style={S.header}>
              <Text style={S.title}>세부 설정</Text>
              <Pressable onPress={closeSheet} hitSlop={8} style={S.closeButton}>
                <XIcon width={16} height={16} color={colors.icon.default} />
              </Pressable>
            </View>
            <View style={S.content}>
              {item ? (
                <View style={S.contentScaleWrap}>
                  <CreateEventDetailStep
                    contentWidth={326}
                    contentPaddingHorizontal={14}
                    eventDateInline={
                      selectedType === 'event' && eventDateOpen ? (
                        <AiInlineDateRangePicker
                          width={326}
                          start={start}
                          end={end}
                          onChangeRange={(nextStart, nextEnd) => {
                            setStart(nextStart)
                            setEnd(nextEnd)
                            onChange({
                              startDate: formatDate(nextStart),
                              endDate: formatDate(nextEnd),
                            })
                          }}
                        />
                      ) : null
                    }
                    title={title}
                    onChangeTitle={(next) => {
                      setTitle(next)
                      onChange({ title: next })
                    }}
                    memo={memo}
                    onChangeMemo={(next) => {
                      setMemo(next)
                      onChange({ memo: next })
                    }}
                    colors={paletteColors}
                    selectedColorIndex={selectedColorIndex}
                    onSelectColorIndex={(index) => {
                      setSelectedColorIndex(index)
                      onChange({ colorHex: paletteColors[index] })
                    }}
                    selectedType={selectedType}
                    onSelectType={(value) => {
                      setSelectedType(value)
                      setEventDateOpen(false)
                      const nextLabelIds = ensureDefaultLabelIds(
                        item.labelIds ?? selectedLabelIds,
                        globalLabels ?? [],
                        value === 'event',
                      )
                      setSelectedLabelIds(nextLabelIds)
                      onChange({ isEvent: value === 'event', labelIds: nextLabelIds })
                    }}
                    start={start}
                    end={end}
                    endDisplay={invalidEndPreview}
                    onPressDateBox={() => {
                      if (selectedType === 'event') {
                        setEventDateOpen((prev) => !prev)
                      }
                    }}
                    onChangeStartTime={(next) => {
                      setStart(next)
                      setInvalidEndTime(false)
                      setInvalidEndPreview(null)
                      let nextEnd = end
                      if (selectedType === 'event' && end.getTime() < next.getTime()) {
                        const allowNextDay = ymdLocal(start) !== ymdLocal(end)
                        nextEnd = buildAutoEndForEvent(next, allowNextDay)
                        setEnd(nextEnd)
                      }
                      onChange({
                        startDate: formatDate(next),
                        startTime: formatTime(next),
                        ...(selectedType === 'event' && end.getTime() < next.getTime()
                          ? {
                              endDate: formatDate(nextEnd),
                              endTime: formatTime(nextEnd),
                            }
                          : null),
                      })
                    }}
                    onChangeEndTime={(next) => {
                      if (selectedType === 'event' && isEventEndBeforeStart(start, next)) {
                        setInvalidEndTime(true)
                        setInvalidEndPreview(next)
                        return
                      }
                      setInvalidEndTime(false)
                      setInvalidEndPreview(null)
                      setEnd(next)
                      onChange({
                        endDate: formatDate(next),
                        endTime: formatTime(next),
                      })
                    }}
                    invalidEndTime={invalidEndTime}
                    timeOn={timeOn}
                    timeDisabled={selectedType === 'task' && !taskDate}
                    onToggleTime={(next) => {
                      if (selectedType === 'task' && next && !taskDate) {
                        return
                      }
                      setTimeOn(next)
                      if (!next) {
                        setRemindOn(false)
                        setInvalidEndTime(false)
                        setInvalidEndPreview(null)
                      }
                      if (selectedType === 'event') {
                        onChange({
                          startTime: next ? formatTime(start) : null,
                          endTime: next ? formatTime(end) : null,
                        })
                      } else {
                        onChange({
                          startTime: next ? formatTime(start) : null,
                        })
                      }
                    }}
                    repeatOn={repeatOn}
                    onToggleRepeat={setRepeatOn}
                    repeatMode={repeatMode}
                    repeatEvery={repeatEvery}
                    repeatUnit={repeatUnit}
                    monthlyOpt={monthlyOpt}
                    onChangeRepeatMode={setRepeatMode}
                    onChangeRepeatEvery={setRepeatEvery}
                    onChangeRepeatUnit={setRepeatUnit}
                    onChangeMonthlyOpt={setMonthlyOpt}
                    repeatWeekdays={repeatWeekdays}
                    onChangeRepeatWeekdays={setRepeatWeekdays}
                    repeatEndDate={repeatEndDate}
                    onChangeRepeatEndDate={setRepeatEndDate}
                    remindOn={remindOn}
                    onToggleRemind={(next) => {
                      const hasAvailableTime =
                        selectedType === 'event'
                          ? timeOn
                          : !!taskDate && timeOn

                      if (next && !hasAvailableTime) {
                        return
                      }

                      setRemindOn(next)
                      if (next && !remindValue) {
                        setRemindValue(REMIND_OPTIONS[0])
                      }
                      if (!next) {
                        setRemindOpen(false)
                        setCustomOpen(false)
                      }
                    }}
                    remindOpen={remindOpen}
                    onSetRemindOpen={setRemindOpen}
                    remindDisplayText={remindDisplayText}
                    remindOptions={REMIND_OPTIONS}
                    remindSelectedKey={remindSelectedKey}
                    onSelectRemindOption={(option) => {
                      setRemindOn(true)
                      if (option.type === 'custom') {
                        setRemindValue('custom')
                        setCustomOpen((prev) => !prev)
                        return
                      }
                      setRemindValue(option)
                      setCustomOpen(false)
                      setRemindOpen(false)
                    }}
                    customOpen={customOpen}
                    onSetCustomOpen={setCustomOpen}
                    customHour={customHour}
                    customMinute={customMinute}
                    onChangeCustomHour={(next) => {
                      setCustomHour(next)
                      setRemindValue('custom')
                    }}
                    onChangeCustomMinute={(next) => {
                      setCustomMinute(next)
                      setRemindValue('custom')
                    }}
                    labels={globalLabels ?? []}
                    selectedLabelIds={selectedLabelIds}
                    onChangeSelectedLabelIds={(next) => {
                      const normalized = ensureDefaultLabelIds(
                        next,
                        globalLabels ?? [],
                        selectedType === 'event',
                      )
                      setSelectedLabelIds(normalized)
                      onChange({ labelIds: normalized })
                    }}
                    onCreateLabel={async (labelTitle) => {
                      const created = await createLabel(labelTitle)
                      await refreshLabels()
                      return created
                    }}
                    taskDate={taskDate}
                    onChangeTaskDate={(next) => {
                      setTaskDate(next)
                      if (!next) {
                        setTimeOn(false)
                        setRemindOn(false)
                      }
                      onChange({ startDate: formatDate(next) })
                    }}
                    taskDueOn={taskDueOn}
                    onChangeTaskDueOn={setTaskDueOn}
                    taskDueDate={taskDueDate}
                    onChangeTaskDueDate={(next) => {
                      setTaskDueDate(next)
                      if (!next) {
                        setTaskDueTimeOn(false)
                        setRemindOn(false)
                      }
                      onChange({ dueDateTime: toTaskDueDateTime(next, taskDueTimeOn ? taskDueTime : null) })
                    }}
                    taskDueTimeOn={taskDueTimeOn}
                    onChangeTaskDueTimeOn={(next) => {
                      if (next && !taskDueDate) {
                        return
                      }
                      setTaskDueTimeOn(next)
                      if (!next) {
                        setRemindOn(false)
                      }
                      onChange({ dueDateTime: toTaskDueDateTime(taskDueDate, next ? taskDueTime : null) })
                    }}
                    taskDueTime={taskDueTime}
                    onChangeTaskDueTime={(next) => {
                      setTaskDueTime(next)
                      setTaskDueTimeOn(true)
                      onChange({ dueDateTime: toTaskDueDateTime(taskDueDate, next) })
                    }}
                  />
                </View>
              ) : null}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,25,26,0.34)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D9DDE2',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    ...ts('label1'),
    color: colors.text.text1,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentScaleWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
})
