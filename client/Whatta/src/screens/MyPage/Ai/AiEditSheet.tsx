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
import type { AiCardDraftItem } from '@/screens/MyPage/Ai/AiCard'
import CreateEventDetailStep from '@/screens/More/CreateEventDetailStep'
import AiInlineDateRangePicker from '@/screens/MyPage/Ai/AiInlineDateRangePicker'
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

export default function AiEditSheet({ visible, item, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets()
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
  const [selectedLabelIds, setSelectedLabelIds] = React.useState<number[]>([])
  const [taskDate, setTaskDate] = React.useState<Date | null>(null)
  const [taskDueOn, setTaskDueOn] = React.useState(false)
  const [taskDueDate, setTaskDueDate] = React.useState<Date | null>(null)
  const [taskDueTimeOn, setTaskDueTimeOn] = React.useState(false)
  const [taskDueTime, setTaskDueTime] = React.useState(new Date())
  const [eventDateOpen, setEventDateOpen] = React.useState(false)

  React.useEffect(() => {
    if (!item) return

    const startDate = parseDateTime(item.startDate, item.startTime)
    const endDate =
      item.isEvent && (item.endDate || item.endTime)
        ? parseDateTime(item.endDate ?? item.startDate, item.endTime ?? item.startTime)
        : new Date(startDate.getTime() + 60 * 60 * 1000)
    const due = parseDueDateTime(item.dueDateTime)

    setTitle(item.title || '')
    setMemo('')
    setSelectedColorIndex(
      Math.max(0, paletteColors.findIndex((color) => color === item.colorHex)),
    )
    setSelectedType(item.isEvent ? 'event' : 'task')
    setStart(startDate)
    setEnd(endDate)
    setTimeOn(!!(item.startTime || item.endTime))
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
    setRepeatWeekdays((item.repeat?.on ?? []).map((v) => Number(v)).filter(Number.isFinite))
    setRepeatEndDate(parseDateOnly(item.repeat?.endDate))
    setRemindOn(false)
    setRemindOpen(false)
    setCustomOpen(false)
    setCustomHour(0)
    setCustomMinute(10)
    setSelectedLabelIds([])
    setTaskDate(parseDateOnly(item.startDate) ?? parseDateOnly(item.dueDateTime?.split('T')[0]))
    setTaskDueOn(!!due)
    setTaskDueDate(due ? new Date(due) : null)
    setTaskDueTimeOn(!!item.dueDateTime)
    setTaskDueTime(due ?? new Date())
    setEventDateOpen(false)
  }, [item, paletteColors])

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
                    onChangeMemo={setMemo}
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
                      onChange({ isEvent: value === 'event' })
                    }}
                    start={start}
                    end={end}
                    onPressDateBox={() => {
                      if (selectedType === 'event') {
                        setEventDateOpen((prev) => !prev)
                      }
                    }}
                    onChangeStartTime={(next) => {
                      setStart(next)
                      onChange({
                        startDate: formatDate(next),
                        startTime: formatTime(next),
                      })
                    }}
                    onChangeEndTime={(next) => {
                      setEnd(next)
                      onChange({
                        endDate: formatDate(next),
                        endTime: formatTime(next),
                      })
                    }}
                    invalidEndTime={false}
                    timeOn={timeOn}
                    onToggleTime={setTimeOn}
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
                    onToggleRemind={setRemindOn}
                    remindOpen={remindOpen}
                    onSetRemindOpen={setRemindOpen}
                    remindDisplayText={remindOn ? '당일 10분 전' : ''}
                    remindOptions={REMIND_OPTIONS}
                    remindSelectedKey={remindOn ? 'same-day-10m' : null}
                    onSelectRemindOption={() => {
                      setRemindOn(true)
                      setRemindOpen(false)
                    }}
                    customOpen={customOpen}
                    onSetCustomOpen={setCustomOpen}
                    customHour={customHour}
                    customMinute={customMinute}
                    onChangeCustomHour={setCustomHour}
                    onChangeCustomMinute={setCustomMinute}
                    labels={[]}
                    selectedLabelIds={selectedLabelIds}
                    onChangeSelectedLabelIds={setSelectedLabelIds}
                    onCreateLabel={async (labelTitle) => ({ id: Date.now(), title: labelTitle })}
                    taskDate={taskDate}
                    onChangeTaskDate={(next) => {
                      setTaskDate(next)
                      onChange({ startDate: formatDate(next) })
                    }}
                    taskDueOn={taskDueOn}
                    onChangeTaskDueOn={setTaskDueOn}
                    taskDueDate={taskDueDate}
                    onChangeTaskDueDate={(next) => {
                      setTaskDueDate(next)
                      onChange({ dueDateTime: toTaskDueDateTime(next, taskDueTimeOn ? taskDueTime : null) })
                    }}
                    taskDueTimeOn={taskDueTimeOn}
                    onChangeTaskDueTimeOn={setTaskDueTimeOn}
                    taskDueTime={taskDueTime}
                    onChangeTaskDueTime={(next) => {
                      setTaskDueTime(next)
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
