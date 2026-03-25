import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import PagerView from 'react-native-pager-view'

import BigRight from '@/assets/icons/rightB.svg'
import DownL from '@/assets/icons/downL.svg'
import DropDown from '@/assets/icons/drop_down.svg'
import Plus from '@/assets/icons/plusbtn.svg'
import LabelPickerModal, { UiLabel } from '@/components/LabelPicker'
import LabelChip from '@/components/LabelChip'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  title: string
  onChangeTitle: (value: string) => void
  memo: string
  onChangeMemo: (value: string) => void
  colors: readonly string[]
  selectedColorIndex: number
  onSelectColorIndex: (index: number) => void
  selectedType: 'event' | 'task' | null
  onSelectType: (value: 'event' | 'task') => void
  start: Date
  end?: Date
  endDisplay?: Date | null
  onPressDateBox: () => void
  onChangeStartTime: (next: Date) => void
  onChangeEndTime?: (next: Date) => void
  invalidEndTime?: boolean
  showEndTime?: boolean
  timeOn: boolean
  timeDisabled?: boolean
  onToggleTime: (next: boolean) => void
  repeatOn: boolean
  onToggleRepeat: (next: boolean) => void
  repeatMode: 'daily' | 'weekly' | 'monthly' | 'custom'
  repeatEvery: number
  repeatUnit: 'day' | 'week' | 'month'
  monthlyOpt: 'byDate' | 'byNthWeekday' | 'byLastWeekday'
  onChangeRepeatMode: (next: 'daily' | 'weekly' | 'monthly' | 'custom') => void
  onChangeRepeatEvery: (next: number) => void
  onChangeRepeatUnit: (next: 'day' | 'week' | 'month') => void
  onChangeMonthlyOpt: (next: 'byDate' | 'byNthWeekday' | 'byLastWeekday') => void
  repeatWeekdays: number[]
  onChangeRepeatWeekdays: (next: number[]) => void
  repeatEndDate: Date | null
  onChangeRepeatEndDate: (next: Date | null) => void
  remindOn: boolean
  remindDisabled?: boolean
  onToggleRemind: (next: boolean) => void
  remindOpen: boolean
  onSetRemindOpen: (next: boolean) => void
  remindDisplayText: string
  remindOptions: ReminderOption[]
  remindSelectedKey: string | null
  onSelectRemindOption: (opt: ReminderOption) => void
  customOpen: boolean
  onSetCustomOpen: (next: boolean) => void
  customHour: number
  customMinute: number
  onChangeCustomHour: (next: number) => void
  onChangeCustomMinute: (next: number) => void
  labels: UiLabel[]
  selectedLabelIds: number[]
  labelMaxSelected?: number
  onChangeSelectedLabelIds: (next: number[]) => void
  onCreateLabel: (title: string) => Promise<UiLabel>
  taskDate: Date | null
  onChangeTaskDate: (next: Date | null) => void
  taskDueOn: boolean
  onChangeTaskDueOn: (next: boolean) => void
  taskDueDate: Date | null
  onChangeTaskDueDate: (next: Date | null) => void
  taskDueTimeOn: boolean
  onChangeTaskDueTimeOn: (next: boolean) => void
  taskDueTime: Date
  onChangeTaskDueTime: (next: Date) => void
  contentWidth?: number
  contentPaddingHorizontal?: number
  eventDateInline?: React.ReactNode
}

type ReminderPresetOption = {
  type: 'preset'
  id: string
  day: number
  hour: number
  minute: number
  label: string
}

type ReminderCustomOption = {
  type: 'custom'
  label: string
}

type ReminderOption = ReminderPresetOption | ReminderCustomOption

function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      hitSlop={10}
      style={[
        styles.toggleRoot,
        value ? styles.toggleOn : styles.toggleOff,
        disabled && styles.toggleDisabled,
      ]}
    >
      <View style={[styles.toggleThumb, value ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  )
}

function formatKDate(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function formatKTime12(d: Date) {
  if (!isValidDate(d)) return '오전 12:00'
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = h < 12 ? '오전' : '오후'
  h = h % 12
  if (h === 0) h = 12
  return `${ap} ${h}:${m}`
}

function isValidDate(value: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

const TIME_WHEEL_FALLBACK_DATE = new Date(2000, 0, 1, 0, 0, 0, 0)
const END_CAL_PILL_BG = '#B04FFF1A'
const END_CAL_W = 301
const END_DAY_W = 43
const END_DAY_H = 44
const END_WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function getMonthCells(base: Date): Array<Date | null> {
  const y = base.getFullYear()
  const m = base.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const total = Math.ceil((firstDow + daysInMonth) / 7) * 7

  const cells: Array<Date | null> = []
  for (let i = 0; i < total; i += 1) {
    const dayNum = i - firstDow + 1
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null)
    } else {
      cells.push(new Date(y, m, dayNum))
    }
  }
  return cells
}

export default function CreateEventDetailStep({
  title,
  onChangeTitle,
  memo,
  onChangeMemo,
  colors: paletteColors,
  selectedColorIndex,
  onSelectColorIndex,
  selectedType,
  onSelectType,
  start,
  end,
  endDisplay = null,
  onPressDateBox,
  onChangeStartTime,
  onChangeEndTime,
  invalidEndTime = false,
  showEndTime = selectedType === 'event',
  timeOn,
  timeDisabled = false,
  onToggleTime,
  repeatOn,
  onToggleRepeat,
  repeatMode,
  repeatEvery,
  repeatUnit,
  monthlyOpt,
  onChangeRepeatMode,
  onChangeRepeatEvery,
  onChangeRepeatUnit,
  onChangeMonthlyOpt,
  repeatWeekdays,
  onChangeRepeatWeekdays,
  repeatEndDate,
  onChangeRepeatEndDate,
  remindOn,
  remindDisabled = false,
  onToggleRemind,
  remindOpen,
  onSetRemindOpen,
  remindDisplayText,
  remindOptions,
  remindSelectedKey,
  onSelectRemindOption,
  customOpen,
  onSetCustomOpen,
  customHour,
  customMinute,
  onChangeCustomHour,
  onChangeCustomMinute,
  labels,
  selectedLabelIds,
  labelMaxSelected = 3,
  onChangeSelectedLabelIds,
  onCreateLabel,
  taskDate,
  onChangeTaskDate,
  taskDueOn,
  onChangeTaskDueOn,
  taskDueDate,
  onChangeTaskDueDate,
  taskDueTimeOn,
  onChangeTaskDueTimeOn,
  taskDueTime,
  onChangeTaskDueTime,
  contentWidth = 302,
  contentPaddingHorizontal = 24,
  eventDateInline = null,
}: Props) {
  const paletteWidth = contentWidth + 18
  const typeButtonWidth = (contentWidth - 16) / 2
  const timeBoxWidth = contentWidth - 76
  const eventEnd = end ?? start
  const displayedEnd = endDisplay ?? end ?? start
  const [openTimeTarget, setOpenTimeTarget] = React.useState<
    'start' | 'end' | 'due' | null
  >(null)
  const [repeatOpen, setRepeatOpen] = React.useState(false)
  const [monthlyOpen, setMonthlyOpen] = React.useState(false)
  const [repeatCustomOpen, setRepeatCustomOpen] = React.useState(false)
  const [openRepeatEndDate, setOpenRepeatEndDate] = React.useState(false)
  const [weekdayOpen, setWeekdayOpen] = React.useState(false)
  const [repeatEndMonthCursor, setRepeatEndMonthCursor] = React.useState(
    () => new Date(start.getFullYear(), start.getMonth(), 1),
  )
  const [repeatEndPagerSeed, setRepeatEndPagerSeed] = React.useState(0)
  const [repeatEndYmOpen, setRepeatEndYmOpen] = React.useState(false)
  const [repeatEndPickYear, setRepeatEndPickYear] = React.useState(start.getFullYear())
  const [repeatEndPickMonth, setRepeatEndPickMonth] = React.useState(start.getMonth() + 1)
  const plusBtnRef = React.useRef<View>(null)
  const [labelModalOpen, setLabelModalOpen] = React.useState(false)
  const [labelAnchor, setLabelAnchor] = React.useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [colorPaletteOpen, setColorPaletteOpen] = React.useState(false)
  const [openTaskCalendar, setOpenTaskCalendar] = React.useState<'date' | 'due' | null>(
    null,
  )

  const isRange = useMemo(
    () =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() !==
      new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()).getTime(),
    [start, eventEnd],
  )
  const WD_TXT = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const getWeekIndexOfMonth = (d: Date) => {
    const date = d.getDate()
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const firstDow = first.getDay()
    const nth = Math.floor((firstDow + date - 1) / 7) + 1
    return { nth }
  }
  const { nth } = getWeekIndexOfMonth(start)
  const wd = WD_TXT[start.getDay()]
  const repeatLabelText =
    repeatMode === 'daily'
      ? '매일'
      : repeatMode === 'weekly'
        ? '매주'
        : repeatMode === 'monthly'
          ? monthlyOpt === 'byDate'
            ? `매월 ${start.getDate()}일에 반복`
            : monthlyOpt === 'byNthWeekday'
              ? `매월 ${nth}번째 ${wd}에 반복`
              : `매월 마지막주 ${wd}에 반복`
          : `${repeatEvery}${repeatUnit === 'day' ? '일' : repeatUnit === 'week' ? '주' : '월'}마다`

  const applyRepeatMode = (nextMode: Props['repeatMode']) => {
    if (nextMode === 'weekly' && repeatMode !== 'weekly') {
      onChangeRepeatWeekdays([start.getDay()])
    }
    onChangeRepeatMode(nextMode)
  }
  React.useEffect(() => {
    if (!repeatOn) {
      setRepeatOpen(false)
      setMonthlyOpen(false)
      setRepeatCustomOpen(false)
      setOpenRepeatEndDate(false)
      setWeekdayOpen(false)
    }
  }, [repeatOn])
  const WEEKDAY_OPTIONS = [
    { label: '일', value: 0 },
    { label: '월', value: 1 },
    { label: '화', value: 2 },
    { label: '수', value: 3 },
    { label: '목', value: 4 },
    { label: '금', value: 5 },
    { label: '토', value: 6 },
  ] as const
  const K_DAY = ['일', '월', '화', '수', '목', '금', '토'] as const
  const repeatEndSelected = repeatEndDate ?? start
  const repeatEndHeader = `${repeatEndMonthCursor.getFullYear()}년 ${repeatEndMonthCursor.getMonth() + 1}월`
  const repeatEndPages = useMemo(
    () => [
      new Date(
        repeatEndMonthCursor.getFullYear(),
        repeatEndMonthCursor.getMonth() - 1,
        1,
      ),
      repeatEndMonthCursor,
      new Date(
        repeatEndMonthCursor.getFullYear(),
        repeatEndMonthCursor.getMonth() + 1,
        1,
      ),
    ],
    [repeatEndMonthCursor],
  )

  React.useEffect(() => {
    if (!openRepeatEndDate) return
    const base = repeatEndDate ?? start
    setRepeatEndMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1))
    setRepeatEndPickYear(base.getFullYear())
    setRepeatEndPickMonth(base.getMonth() + 1)
    setRepeatEndYmOpen(false)
    setRepeatEndPagerSeed((v) => v + 1)
  }, [openRepeatEndDate, repeatEndDate, start])
  const repeatEndYearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])
  const weekdayLabel = (() => {
    const appliedDays = Array.from(new Set(repeatWeekdays)).sort((a, b) => a - b)
    const hasDay = (d: number) => appliedDays.includes(d)
    const isWeekendEvery = hasDay(0) && hasDay(6)
    const isWeekdayEvery = [1, 2, 3, 4, 5].every((d) => hasDay(d))
    if (appliedDays.length === 0) return '요일 추가 없음'
    if (appliedDays.length === 1) return `${K_DAY[appliedDays[0]]}요일마다`
    if (isWeekendEvery) return '주말마다'
    if (isWeekdayEvery) return '평일마다'
    return appliedDays.map((d) => K_DAY[d]).join(', ')
  })()
  React.useEffect(() => {
    if (selectedType === 'task') setColorPaletteOpen(false)
  }, [selectedType])

  React.useEffect(() => {
    if (!taskDueOn && openTimeTarget === 'due') {
      setOpenTimeTarget(null)
    }
  }, [taskDueOn, openTimeTarget])

  const openTaskCalendarWithBase = (target: 'date' | 'due') => {
    const base =
      target === 'date'
        ? (taskDate ?? new Date())
        : (taskDueDate ?? taskDate ?? new Date())
    setRepeatEndMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1))
    setRepeatEndPickYear(base.getFullYear())
    setRepeatEndPickMonth(base.getMonth() + 1)
    setRepeatEndYmOpen(false)
    setRepeatEndPagerSeed((v) => v + 1)
    setOpenTaskCalendar((prev) => (prev === target ? null : target))
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.containerContent,
        { paddingHorizontal: contentPaddingHorizontal },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.topSection}>
        <View style={styles.titleRow}>
          <TextInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder="제목을 입력하세요..."
            placeholderTextColor={colors.text.text4}
            style={styles.titleText}
          />
          {selectedType === 'event' && (
            <Pressable
              style={[
                styles.titleColorBtn,
                {
                  backgroundColor: paletteColors[selectedColorIndex] ?? paletteColors[0],
                },
              ]}
              onPress={() => setColorPaletteOpen((v) => !v)}
            />
          )}
        </View>
        {selectedType === 'event' && colorPaletteOpen && (
          <View style={[styles.colorPaletteBox, { width: paletteWidth }]}>
            <View style={styles.colorPaletteGrid}>
              {paletteColors.slice(0, 12).map((c, idx) => (
                <Pressable
                  key={`C${String(idx).padStart(2, '0')}`}
                  style={[styles.colorPaletteChip, { backgroundColor: c }]}
                  onPress={() => {
                    onSelectColorIndex(idx)
                    setColorPaletteOpen(false)
                  }}
                />
              ))}
            </View>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.typeRow}>
          <Pressable
            style={[
              styles.typeButton,
              { width: typeButtonWidth },
              selectedType === 'event' && styles.typeButtonSelected,
            ]}
            onPress={() => onSelectType('event')}
          >
            <Text
              style={[
                styles.typeText,
                selectedType === 'event' && styles.typeTextSelected,
              ]}
            >
              일정
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeButton,
              { width: typeButtonWidth },
              selectedType === 'task' && styles.typeButtonSelected,
            ]}
            onPress={() => onSelectType('task')}
          >
            <Text
              style={[
                styles.typeText,
                selectedType === 'task' && styles.typeTextSelected,
              ]}
            >
              할 일
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionLabel}>날짜</Text>
      <Pressable
        style={[styles.dateBox, { width: contentWidth }]}
        onPress={
          selectedType === 'event'
            ? onPressDateBox
            : () => openTaskCalendarWithBase('date')
        }
      >
        {selectedType === 'event' ? (
          isRange ? (
            <View style={styles.rangeRow}>
              <View style={styles.rangeSide}>
                <Text
                  style={[styles.dateText, styles.rangeDateText, styles.rangeDateStart]}
                  numberOfLines={1}
                >
                  {formatKDate(start)}
                </Text>
              </View>
              <View style={styles.rangeArrowWrap}>
                <BigRight width={6} height={8} color={colors.text.text3} />
              </View>
              <View style={styles.rangeSide}>
                <Text
                  style={[styles.dateText, styles.rangeDateText, styles.rangeDateEnd]}
                  numberOfLines={1}
                >
                  {formatKDate(eventEnd)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.dateText}>{formatKDate(start)}</Text>
          )
        ) : (
          <Text style={[styles.dateText, !taskDate && styles.endDatePlaceholder]}>
            {taskDate ? formatKDate(taskDate) : '지정안함'}
          </Text>
        )}
      </Pressable>
      {selectedType === 'event' ? eventDateInline : null}
      {selectedType === 'task' && openTaskCalendar === 'date' && (
        <View style={styles.repeatEndCalendarWrap}>
          <View style={styles.repeatEndCalendarHeader}>
            <Pressable
              style={styles.repeatEndCalendarHeaderPress}
              onPress={() => setRepeatEndYmOpen((v) => !v)}
            >
              <Text style={styles.repeatEndCalendarHeaderText}>
                {`${repeatEndMonthCursor.getFullYear()}년 ${repeatEndMonthCursor.getMonth() + 1}월`}
              </Text>
              <DropDown
                width={24}
                height={24}
                color={repeatEndYmOpen ? colors.icon.selected : colors.icon.default}
              />
            </Pressable>
          </View>
          {repeatEndYmOpen ? (
            <View style={styles.repeatEndYmWrap}>
              <View style={styles.repeatEndYmRow}>
                <View style={styles.repeatEndYmCol}>
                  <Picker
                    selectedValue={repeatEndPickYear}
                    onValueChange={(v) => setRepeatEndPickYear(Number(v))}
                    style={styles.repeatEndYmPicker}
                    itemStyle={styles.repeatEndYmPickerItem}
                  >
                    {repeatEndYearOptions.map((y) => (
                      <Picker.Item key={y} label={`${y}년`} value={y} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.repeatEndYmCol}>
                  <Picker
                    selectedValue={repeatEndPickMonth}
                    onValueChange={(v) => setRepeatEndPickMonth(Number(v))}
                    style={styles.repeatEndYmPicker}
                    itemStyle={styles.repeatEndYmPickerItem}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <Picker.Item key={m} label={`${m}월`} value={m} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.repeatEndWeekRow}>
                {END_WEEKDAY.map((label, idx) => (
                  <Text
                    key={label}
                    style={[
                      styles.repeatEndWeekText,
                      idx === 0 && styles.repeatEndWeekTextSunday,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <PagerView
                key={`${repeatEndMonthCursor.getFullYear()}-${repeatEndMonthCursor.getMonth()}-${repeatEndPagerSeed}`}
                style={styles.repeatEndPager}
                initialPage={1}
                onPageSelected={(e) => {
                  const position = e.nativeEvent.position
                  if (position === 1) return
                  setRepeatEndMonthCursor((prev) =>
                    position === 0
                      ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      : new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                  setRepeatEndPagerSeed((v) => v + 1)
                }}
              >
                {repeatEndPages.map((baseMonth, pageIndex) => {
                  const cells = getMonthCells(baseMonth)
                  return (
                    <View
                      key={`${baseMonth.getFullYear()}-${baseMonth.getMonth()}-${pageIndex}`}
                      style={styles.repeatEndGridWrap}
                    >
                      {cells.map((cell, idx) => {
                        if (!cell)
                          return (
                            <View key={`empty-${idx}`} style={styles.repeatEndCell} />
                          )
                        const selected = taskDate
                          ? startOfDay(cell).getTime() === startOfDay(taskDate).getTime()
                          : false
                        return (
                          <Pressable
                            key={cell.toISOString()}
                            style={styles.repeatEndCell}
                            onPress={() => {
                              const picked = startOfDay(cell)
                              const sameDate = taskDate
                                ? picked.getTime() === startOfDay(taskDate).getTime()
                                : false

                              if (sameDate) {
                                onChangeTaskDate(null)
                                onChangeTaskDueDate(null)
                                setOpenTaskCalendar(null)
                                return
                              }

                              onChangeTaskDate(picked)
                              if (
                                taskDueDate &&
                                startOfDay(taskDueDate).getTime() < picked.getTime()
                              ) {
                                onChangeTaskDueDate(picked)
                              }
                              setOpenTaskCalendar(null)
                            }}
                          >
                            {selected && <View style={styles.repeatEndSinglePill} />}
                            <Text
                              style={[
                                styles.repeatEndDayText,
                                selected && styles.repeatEndDayTextSelected,
                              ]}
                            >
                              {cell.getDate()}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  )
                })}
              </PagerView>
            </>
          )}
          {repeatEndYmOpen && (
            <View style={styles.calendarBottomActionRow}>
              <Pressable
                onPress={() => {
                  setRepeatEndMonthCursor(
                    new Date(repeatEndPickYear, repeatEndPickMonth - 1, 1),
                  )
                  setRepeatEndPagerSeed((v) => v + 1)
                  setRepeatEndYmOpen(false)
                }}
                hitSlop={10}
              >
                <Text style={styles.repeatEndYmMoveText}>이동</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.sectionLabel}>시간</Text>
        <Toggle value={timeOn} disabled={timeDisabled} onChange={onToggleTime} />
      </View>
      {timeOn && (
        <View style={styles.timeDetail}>
          <View style={styles.timeRow}>
            <Text style={styles.timeRowLabel}>시작 시각</Text>
            <Pressable
              style={[
                styles.timeBox,
                { width: timeBoxWidth },
                openTimeTarget === 'start' && styles.timeBoxSelected,
              ]}
              onPress={() =>
                setOpenTimeTarget((prev) => (prev === 'start' ? null : 'start'))
              }
            >
              <Text
                style={[
                  styles.timeBoxText,
                  openTimeTarget === 'start' && styles.timeBoxTextSelected,
                ]}
              >
                {formatKTime12(start)}
              </Text>
            </Pressable>
          </View>
          {openTimeTarget === 'start' && (
            <View style={[styles.timePickerWrap, { width: contentWidth }]}>
              <TimeWheel
                value={start}
                onChange={onChangeStartTime}
              />
            </View>
          )}

          {showEndTime && onChangeEndTime && (
            <>
              <View style={[styles.timeRow, { marginTop: 14 }]}>
                <Text style={styles.timeRowLabel}>종료 시각</Text>
                <Pressable
                  style={[
                    styles.timeBox,
                    { width: timeBoxWidth },
                    openTimeTarget === 'end' && styles.timeBoxSelected,
                  ]}
                  onPress={() =>
                    setOpenTimeTarget((prev) => (prev === 'end' ? null : 'end'))
                  }
                >
                  <Text
                    style={[
                      styles.timeBoxText,
                      invalidEndTime
                        ? styles.timeBoxTextInvalid
                        : openTimeTarget === 'end' && styles.timeBoxTextSelected,
                    ]}
                  >
                    {formatKTime12(displayedEnd)}
                  </Text>
                </Pressable>
              </View>
              {openTimeTarget === 'end' && (
                <View style={[styles.timePickerWrap, { width: contentWidth }]}>
                  <TimeWheel
                    value={displayedEnd}
                    onChange={onChangeEndTime}
                  />
                </View>
              )}
            </>
          )}
        </View>
      )}

      {selectedType === 'event' && (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.sectionLabel}>반복</Text>
            <Toggle
              value={repeatOn}
              onChange={(next) => {
                onToggleRepeat(next)
                if (!next) {
                  onChangeRepeatMode('daily')
                  onChangeRepeatEvery(1)
                  onChangeRepeatUnit('day')
                  onChangeMonthlyOpt('byDate')
                  setRepeatOpen(false)
                  setMonthlyOpen(false)
                  setRepeatCustomOpen(false)
                }
              }}
            />
          </View>
          {repeatOn && (
            <View style={styles.repeatDetail}>
              <Pressable
                style={[styles.repeatBox, { width: contentWidth }]}
                onPress={() => {
                  setRepeatOpen((v) => !v)
                  setMonthlyOpen(false)
                  setRepeatCustomOpen(false)
                }}
              >
                <Text style={styles.repeatBoxText}>{repeatLabelText}</Text>
                <View style={styles.repeatArrow}>
                  <DownL width={12} height={10} color={colors.icon.selected} />
                </View>
              </Pressable>

              {repeatOpen && (
                <View style={[styles.repeatMenu, { width: contentWidth }]}>
                  {(
                    [
                      { k: 'daily', t: '매일' },
                      { k: 'weekly', t: '매주' },
                      { k: 'monthly', t: '매월' },
                      { k: 'custom', t: '맞춤 설정' },
                    ] as const
                  ).map(({ k, t }, idx, arr) => (
                    <View key={k}>
                      <Pressable
                        style={[
                          styles.repeatMenuItem,
                          idx !== arr.length - 1 && styles.repeatMenuItemDivider,
                          k === 'monthly' && monthlyOpen && styles.repeatMenuItemExpanded,
                        ]}
                        onPress={() => {
                          if (k === 'monthly') {
                            applyRepeatMode('monthly')
                            setMonthlyOpen((v) => !v)
                            setRepeatCustomOpen(false)
                            return
                          }
                          if (k === 'custom') {
                            if (repeatMode !== 'custom') {
                              onChangeRepeatEvery(1)
                              onChangeRepeatUnit('day')
                            }
                            applyRepeatMode('custom')
                            setRepeatCustomOpen((v) => !v)
                            setMonthlyOpen(false)
                            return
                          }
                          applyRepeatMode(k)
                          setRepeatOpen(false)
                          setMonthlyOpen(false)
                          setRepeatCustomOpen(false)
                        }}
                      >
                        <Text
                          style={[
                            styles.repeatMenuText,
                            repeatMode === k && styles.repeatMenuTextSelected,
                            k === 'monthly' && monthlyOpen && styles.repeatMenuTextOpenStrong,
                          ]}
                        >
                          {t}
                        </Text>
                        {k === 'monthly' && (
                          <View style={styles.repeatMenuItemArrow}>
                            <DownL
                              width={12}
                              height={10}
                              color={colors.icon.selected}
                              style={monthlyOpen ? styles.repeatMenuItemArrowOpen : undefined}
                            />
                          </View>
                        )}
                      </Pressable>

                      {k === 'monthly' && monthlyOpen && (
                        <View style={styles.monthlyGroup}>
                          <Pressable
                            style={[
                              styles.monthlyItem,
                              monthlyOpt === 'byDate' && styles.monthlyItemActive,
                            ]}
                            onPress={() => {
                              onChangeRepeatMode('monthly')
                              onChangeMonthlyOpt('byDate')
                              setMonthlyOpen(false)
                              setRepeatOpen(false)
                            }}
                          >
                            <Text
                              style={[
                                styles.monthlyText,
                                monthlyOpt === 'byDate' && styles.monthlyTextActive,
                              ]}
                            >
                              {`매월 ${start.getDate()}일에 반복`}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.monthlyItem,
                              monthlyOpt === 'byNthWeekday' && styles.monthlyItemActive,
                            ]}
                            onPress={() => {
                              onChangeRepeatMode('monthly')
                              onChangeMonthlyOpt('byNthWeekday')
                              setMonthlyOpen(false)
                              setRepeatOpen(false)
                            }}
                          >
                            <Text
                              style={[
                                styles.monthlyText,
                                monthlyOpt === 'byNthWeekday' && styles.monthlyTextActive,
                              ]}
                            >
                              {`매월 ${nth}번째 ${wd}에 반복`}
                            </Text>
                          </Pressable>
                          {nth >= 4 && (
                            <Pressable
                              style={[
                                styles.monthlyItem,
                                monthlyOpt === 'byLastWeekday' &&
                                  styles.monthlyItemActive,
                              ]}
                              onPress={() => {
                                onChangeRepeatMode('monthly')
                                onChangeMonthlyOpt('byLastWeekday')
                                setMonthlyOpen(false)
                                setRepeatOpen(false)
                              }}
                            >
                              <Text
                                style={[
                                  styles.monthlyText,
                                  monthlyOpt === 'byLastWeekday' &&
                                    styles.monthlyTextActive,
                                ]}
                              >
                                {`매월 마지막주 ${wd}에 반복`}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}

                      {k === 'custom' && repeatCustomOpen && (
                        <View style={[styles.customPickerInList, { width: contentWidth }]}>
                          <View style={{ height: 8, pointerEvents: 'none' }} />
                          <View style={styles.customRow}>
                            <View style={styles.customCol}>
                              <Picker
                                selectedValue={repeatEvery}
                                onValueChange={(v) => onChangeRepeatEvery(Number(v))}
                                style={styles.customPicker}
                                itemStyle={styles.customPickerItem}
                              >
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                  <Picker.Item key={n} label={`${n}`} value={n} />
                                ))}
                              </Picker>
                            </View>
                            <View style={styles.customCol}>
                              <Picker
                                selectedValue={repeatUnit}
                                onValueChange={(v) =>
                                  onChangeRepeatUnit(v as 'day' | 'week' | 'month')
                                }
                                style={styles.customPicker}
                                itemStyle={styles.customPickerItem}
                              >
                                <Picker.Item label="일" value="day" />
                                <Picker.Item label="주" value="week" />
                                <Picker.Item label="월" value="month" />
                              </Picker>
                            </View>
                            <View style={styles.customSuffixWrap}>
                              <Text style={styles.customSuffix}>마다</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {selectedType === 'event' && repeatOn && repeatMode === 'weekly' && (
        <>
          <View style={styles.weekdaySection}>
            <Pressable
              style={[styles.repeatBox, { width: contentWidth }]}
              onPress={() => setWeekdayOpen((v) => !v)}
            >
              <Text
                style={[
                  styles.repeatBoxText,
                  weekdayLabel === '요일 추가 없음' && styles.repeatBoxTextPlaceholder,
                ]}
              >
                {weekdayLabel}
              </Text>
              <View style={styles.repeatArrow}>
                <DownL width={12} height={10} color={colors.icon.selected} />
              </View>
            </Pressable>
            {weekdayOpen && (
              <View style={[styles.weekdayWrap, { width: contentWidth }]}>
                {WEEKDAY_OPTIONS.map(({ label, value }) => {
                  const selected = repeatWeekdays.includes(value)
                  return (
                    <Pressable
                      key={`${label}-${value}`}
                      style={[styles.weekdayItem, selected && styles.weekdayItemSelected]}
                      onPress={() => {
                        onChangeRepeatWeekdays(
                          selected
                            ? repeatWeekdays.filter((day) => day !== value)
                            : [...repeatWeekdays, value].sort((a, b) => a - b),
                        )
                      }}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          selected && styles.weekdayTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        </>
      )}

      {selectedType === 'event' && repeatOn && repeatMode !== 'weekly' && (
        <View style={styles.weekdaySectionSpacer} />
      )}

      {selectedType === 'event' && repeatOn && (
        <>
          <View style={styles.timeRow}>
            <Text style={styles.timeRowLabel}>종료일</Text>
            <Pressable
              style={[
                styles.timeBox,
                { width: timeBoxWidth },
                openRepeatEndDate && styles.timeBoxSelected,
              ]}
              onPress={() => setOpenRepeatEndDate((v) => !v)}
            >
              <Text
                style={[
                  styles.timeBoxText,
                  !repeatEndDate && styles.endDatePlaceholder,
                  openRepeatEndDate && repeatEndDate && styles.timeBoxTextSelected,
                ]}
              >
                {repeatEndDate ? formatKDate(repeatEndDate) : '지정안함'}
              </Text>
            </Pressable>
          </View>
          {openRepeatEndDate && (
            <View style={styles.repeatEndCalendarWrap}>
              <View style={styles.repeatEndCalendarHeader}>
                <Pressable
                  style={styles.repeatEndCalendarHeaderPress}
                  onPress={() => setRepeatEndYmOpen((v) => !v)}
                >
                  <Text style={styles.repeatEndCalendarHeaderText}>
                    {repeatEndHeader}
                  </Text>
                  <DropDown
                    width={24}
                    height={24}
                    color={repeatEndYmOpen ? colors.icon.selected : colors.icon.default}
                  />
                </Pressable>
              </View>
              {repeatEndYmOpen ? (
                <View style={styles.repeatEndYmWrap}>
                  <View style={styles.repeatEndYmRow}>
                    <View style={styles.repeatEndYmCol}>
                      <Picker
                        selectedValue={repeatEndPickYear}
                        onValueChange={(v) => setRepeatEndPickYear(Number(v))}
                        style={styles.repeatEndYmPicker}
                        itemStyle={styles.repeatEndYmPickerItem}
                      >
                        {repeatEndYearOptions.map((y) => (
                          <Picker.Item key={y} label={`${y}년`} value={y} />
                        ))}
                      </Picker>
                    </View>
                    <View style={styles.repeatEndYmCol}>
                      <Picker
                        selectedValue={repeatEndPickMonth}
                        onValueChange={(v) => setRepeatEndPickMonth(Number(v))}
                        style={styles.repeatEndYmPicker}
                        itemStyle={styles.repeatEndYmPickerItem}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <Picker.Item key={m} label={`${m}월`} value={m} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.repeatEndWeekRow}>
                    {END_WEEKDAY.map((label, idx) => (
                      <Text
                        key={label}
                        style={[
                          styles.repeatEndWeekText,
                          idx === 0 && styles.repeatEndWeekTextSunday,
                        ]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  <PagerView
                    key={`${repeatEndMonthCursor.getFullYear()}-${repeatEndMonthCursor.getMonth()}-${repeatEndPagerSeed}`}
                    style={styles.repeatEndPager}
                    initialPage={1}
                    onPageSelected={(e) => {
                      const position = e.nativeEvent.position
                      if (position === 1) return
                      setRepeatEndMonthCursor((prev) =>
                        position === 0
                          ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                      )
                      setRepeatEndPagerSeed((v) => v + 1)
                    }}
                  >
                    {repeatEndPages.map((baseMonth, pageIndex) => {
                      const cells = getMonthCells(baseMonth)
                      return (
                        <View
                          key={`${baseMonth.getFullYear()}-${baseMonth.getMonth()}-${pageIndex}`}
                          style={styles.repeatEndGridWrap}
                        >
                          {cells.map((cell, idx) => {
                            if (!cell)
                              return (
                                <View key={`empty-${idx}`} style={styles.repeatEndCell} />
                              )

                            const picked = startOfDay(cell)
                            const selected =
                              picked.getTime() === startOfDay(repeatEndSelected).getTime()

                            return (
                              <Pressable
                                key={cell.toISOString()}
                                style={styles.repeatEndCell}
                                onPress={() => {
                                  if (picked.getTime() < startOfDay(start).getTime()) {
                                    onChangeRepeatEndDate(start)
                                    return
                                  }
                                  onChangeRepeatEndDate(picked)
                                }}
                              >
                                {selected && <View style={styles.repeatEndSinglePill} />}
                                <Text
                                  style={[
                                    styles.repeatEndDayText,
                                    selected && styles.repeatEndDayTextSelected,
                                  ]}
                                >
                                  {cell.getDate()}
                                </Text>
                              </Pressable>
                            )
                          })}
                        </View>
                      )
                    })}
                  </PagerView>
                </>
              )}
              {repeatEndYmOpen && (
                <View style={styles.calendarBottomActionRow}>
                  <Pressable
                    onPress={() => {
                      setRepeatEndMonthCursor(
                        new Date(repeatEndPickYear, repeatEndPickMonth - 1, 1),
                      )
                      setRepeatEndPagerSeed((v) => v + 1)
                      setRepeatEndYmOpen(false)
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.repeatEndYmMoveText}>이동</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {selectedType === 'task' && (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.sectionLabel}>마감일</Text>
            <Toggle
              value={taskDueOn}
              onChange={(next) => {
                onChangeTaskDueOn(next)
                if (!next) {
                  onChangeTaskDueDate(null)
                  setOpenTaskCalendar(null)
                }
              }}
            />
          </View>
          {taskDueOn && (
            <>
              <Pressable
                style={[styles.dateBox, { width: contentWidth }]}
                onPress={() => openTaskCalendarWithBase('due')}
              >
                <Text
                  style={[styles.dateText, !taskDueDate && styles.endDatePlaceholder]}
                >
                  {taskDueDate ? formatKDate(taskDueDate) : '지정안함'}
                </Text>
              </Pressable>
              {openTaskCalendar === 'due' && (
                <View style={styles.repeatEndCalendarWrap}>
                  <View style={styles.repeatEndCalendarHeader}>
                    <Pressable
                      style={styles.repeatEndCalendarHeaderPress}
                      onPress={() => setRepeatEndYmOpen((v) => !v)}
                    >
                      <Text style={styles.repeatEndCalendarHeaderText}>
                        {`${repeatEndMonthCursor.getFullYear()}년 ${repeatEndMonthCursor.getMonth() + 1}월`}
                      </Text>
                      <DropDown
                        width={24}
                        height={24}
                        color={
                          repeatEndYmOpen ? colors.icon.selected : colors.icon.default
                        }
                      />
                    </Pressable>
                  </View>
                  {repeatEndYmOpen ? (
                    <View style={styles.repeatEndYmWrap}>
                      <View style={styles.repeatEndYmRow}>
                        <View style={styles.repeatEndYmCol}>
                          <Picker
                            selectedValue={repeatEndPickYear}
                            onValueChange={(v) => setRepeatEndPickYear(Number(v))}
                            style={styles.repeatEndYmPicker}
                            itemStyle={styles.repeatEndYmPickerItem}
                          >
                            {repeatEndYearOptions.map((y) => (
                              <Picker.Item key={y} label={`${y}년`} value={y} />
                            ))}
                          </Picker>
                        </View>
                        <View style={styles.repeatEndYmCol}>
                          <Picker
                            selectedValue={repeatEndPickMonth}
                            onValueChange={(v) => setRepeatEndPickMonth(Number(v))}
                            style={styles.repeatEndYmPicker}
                            itemStyle={styles.repeatEndYmPickerItem}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <Picker.Item key={m} label={`${m}월`} value={m} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.repeatEndWeekRow}>
                        {END_WEEKDAY.map((label, idx) => (
                          <Text
                            key={label}
                            style={[
                              styles.repeatEndWeekText,
                              idx === 0 && styles.repeatEndWeekTextSunday,
                            ]}
                          >
                            {label}
                          </Text>
                        ))}
                      </View>
                      <PagerView
                        key={`${repeatEndMonthCursor.getFullYear()}-${repeatEndMonthCursor.getMonth()}-${repeatEndPagerSeed}`}
                        style={styles.repeatEndPager}
                        initialPage={1}
                        onPageSelected={(e) => {
                          const position = e.nativeEvent.position
                          if (position === 1) return
                          setRepeatEndMonthCursor((prev) =>
                            position === 0
                              ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                              : new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                          )
                          setRepeatEndPagerSeed((v) => v + 1)
                        }}
                      >
                        {repeatEndPages.map((baseMonth, pageIndex) => {
                          const cells = getMonthCells(baseMonth)
                          return (
                            <View
                              key={`${baseMonth.getFullYear()}-${baseMonth.getMonth()}-${pageIndex}`}
                              style={styles.repeatEndGridWrap}
                            >
                              {cells.map((cell, idx) => {
                                if (!cell)
                                  return (
                                    <View
                                      key={`empty-${idx}`}
                                      style={styles.repeatEndCell}
                                    />
                                  )
                                const picked = startOfDay(cell)
                                const minBase = taskDate ? startOfDay(taskDate) : null
                                const disabled = minBase
                                  ? picked.getTime() < minBase.getTime()
                                  : false
                                const selected = taskDueDate
                                  ? picked.getTime() === startOfDay(taskDueDate).getTime()
                                  : false
                                return (
                                  <Pressable
                                    key={cell.toISOString()}
                                    style={styles.repeatEndCell}
                                    onPress={() => {
                                      if (disabled) return
                                      onChangeTaskDueDate(picked)
                                      setOpenTaskCalendar(null)
                                    }}
                                  >
                                    {selected && (
                                      <View style={styles.repeatEndSinglePill} />
                                    )}
                                    <Text
                                      style={[
                                        styles.repeatEndDayText,
                                        selected && styles.repeatEndDayTextSelected,
                                        disabled && styles.weekdayTextDisabled,
                                      ]}
                                    >
                                      {cell.getDate()}
                                    </Text>
                                  </Pressable>
                                )
                              })}
                            </View>
                          )
                        })}
                      </PagerView>
                    </>
                  )}
                  {repeatEndYmOpen && (
                    <View style={styles.calendarBottomActionRow}>
                      <Pressable
                        onPress={() => {
                          setRepeatEndMonthCursor(
                            new Date(repeatEndPickYear, repeatEndPickMonth - 1, 1),
                          )
                          setRepeatEndPagerSeed((v) => v + 1)
                          setRepeatEndYmOpen(false)
                        }}
                        hitSlop={10}
                      >
                        <Text style={styles.repeatEndYmMoveText}>이동</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
              <View style={[styles.timeRow, { marginTop: 14 }]}>
                <Text style={styles.timeRowLabel}>마감 시각</Text>
                <Pressable
                  style={[
                    styles.timeBox,
                    { width: timeBoxWidth },
                    openTimeTarget === 'due' && styles.timeBoxSelected,
                  ]}
                  onPress={() =>
                    setOpenTimeTarget((prev) => (prev === 'due' ? null : 'due'))
                  }
                >
                  <Text
                    style={[
                      styles.timeBoxText,
                      !taskDueTimeOn && styles.endDatePlaceholder,
                      openTimeTarget === 'due' &&
                        taskDueTimeOn &&
                        styles.timeBoxTextSelected,
                    ]}
                  >
                    {taskDueTimeOn ? formatKTime12(taskDueTime) : '지정안함'}
                  </Text>
                </Pressable>
              </View>
              {openTimeTarget === 'due' && (
                <View style={[styles.timePickerWrap, { width: contentWidth }]}>
                  <TimeWheel
                    value={taskDueTime}
                    onChange={onChangeTaskDueTime}
                  />
                  <View style={styles.dueTimeActionRow}>
                    <Pressable
                      onPress={() => {
                        onChangeTaskDueTimeOn(false)
                        setOpenTimeTarget(null)
                      }}
                      hitSlop={10}
                    >
                      <Text style={styles.dueTimeClearText}>지정 안함</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.sectionLabel}>알림</Text>
        <Toggle
          value={remindOn}
          disabled={remindDisabled}
          onChange={(next) => {
            onToggleRemind(next)
            if (!next) {
              onSetRemindOpen(false)
              onSetCustomOpen(false)
            } else {
              onSetRemindOpen(true)
            }
          }}
        />
      </View>
      {remindOn && (
        <View style={styles.repeatDetail}>
          <Pressable
            style={[styles.repeatBox, { width: contentWidth }]}
            onPress={() => {
              const nextOpen = !remindOpen
              onSetRemindOpen(nextOpen)
              if (!nextOpen) {
                onSetCustomOpen(false)
              }
            }}
          >
            <Text
              style={[
                styles.repeatBoxText,
                !remindDisplayText && styles.repeatBoxTextPlaceholder,
              ]}
            >
              {remindDisplayText || '알림 선택'}
            </Text>
            <View style={styles.repeatArrow}>
              <DownL width={12} height={10} color={colors.icon.selected} />
            </View>
          </Pressable>

          {remindOpen && (
            <View style={[styles.repeatMenu, { width: contentWidth }]}>
              {remindOptions.map((opt, idx) => {
                const isLast = idx === remindOptions.length - 1
                const key = opt.type === 'preset' ? opt.id : 'custom'
                const selected = remindSelectedKey === key
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.repeatMenuItem,
                      !isLast && styles.repeatMenuItemDivider,
                    ]}
                    onPress={() => onSelectRemindOption(opt)}
                  >
                    <Text
                      style={[
                        styles.repeatMenuText,
                        selected && styles.repeatMenuTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          {customOpen && (
            <View style={[styles.remindPickerWrap, { width: contentWidth }]}>
              <View style={styles.remindPickerInner}>
                <View style={styles.remindPickerBox}>
                  <Picker
                    selectedValue={customHour}
                    onValueChange={(v) => onChangeCustomHour(Number(v))}
                    style={styles.remindPicker}
                    itemStyle={styles.remindPickerItem}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <Picker.Item key={h} label={`${h}`} value={h} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.remindPickerColon}>:</Text>
                <View style={styles.remindPickerBox}>
                  <Picker
                    selectedValue={customMinute}
                    onValueChange={(v) => onChangeCustomMinute(Number(v))}
                    style={styles.remindPicker}
                    itemStyle={styles.remindPickerItem}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.remindPickerSuffix}>전</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.sectionLabel}>라벨</Text>
        <Pressable
          ref={plusBtnRef}
          onPress={() => {
            plusBtnRef.current?.measureInWindow?.((x, y, w, h) => {
              setLabelAnchor({ x, y, w, h })
              setLabelModalOpen(true)
            })
          }}
          hitSlop={10}
        >
          <Plus
            width={16}
            height={16}
            color={labelModalOpen ? colors.brand.primary : colors.icon.selected}
          />
        </Pressable>
      </View>
      <View style={[styles.labelBox, { width: contentWidth }]}>
        {selectedLabelIds.length > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.labelChipScroll}
            contentContainerStyle={styles.labelChipWrap}
          >
            {selectedLabelIds.map((id, idx) => {
              const item = labels.find((l) => l.id === id)
              if (!item) return null
              return (
                <View
                  key={id}
                  style={[
                    styles.labelChipItem,
                    idx === selectedLabelIds.length - 1 && { marginRight: 0 },
                  ]}
                >
                  <LabelChip
                    title={item.title}
                    removeIconSize={8}
                    onRemove={() =>
                      onChangeSelectedLabelIds(selectedLabelIds.filter((x) => x !== id))
                    }
                  />
                </View>
              )
            })}
          </ScrollView>
        ) : (
          <Text style={styles.labelBoxPlaceholder}>없음</Text>
        )}
      </View>
      {labelModalOpen && (
        <LabelPickerModal
          visible
          all={labels}
          selected={selectedLabelIds}
          maxSelected={labelMaxSelected}
          onChange={onChangeSelectedLabelIds}
          onRequestClose={() => setLabelModalOpen(false)}
          anchor={labelAnchor}
          onCreateLabel={onCreateLabel}
        />
      )}

      <Text style={[styles.sectionLabel, styles.memoLabel]}>메모</Text>
      <View style={[styles.memoBox, { width: contentWidth }]}>
        <TextInput
          value={memo}
          onChangeText={onChangeMemo}
          placeholder="내용을 입력하세요"
          placeholderTextColor={colors.text.text3}
          multiline
          textAlignVertical="top"
          style={styles.memoInput}
        />
      </View>
    </ScrollView>
  )
}

function TimeWheel({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const safeValue = isValidDate(value) ? value : TIME_WHEEL_FALLBACK_DATE
  const hour24 = safeValue.getHours()
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  let hour12 = hour24 % 12
  if (hour12 === 0) hour12 = 12
  const minute = safeValue.getMinutes()
  const canPropagateChange = isValidDate(value)

  const setTime = (nextHour12: number, nextMinute: number, nextAmPm: 'AM' | 'PM') => {
    if (!canPropagateChange) return
    let h = nextHour12 % 12
    if (nextAmPm === 'PM') h += 12
    const next = new Date(safeValue)
    next.setHours(h)
    next.setMinutes(nextMinute)
    next.setSeconds(0)
    next.setMilliseconds(0)
    if (!isValidDate(next)) return
    onChange(next)
  }

  return (
    <View style={styles.wheelRow}>
      <View style={styles.wheelCol}>
        <Picker
          selectedValue={hour12}
          onValueChange={(v) => setTime(Number(v), minute, ampm as 'AM' | 'PM')}
          style={styles.wheelPicker}
          itemStyle={styles.wheelItem}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Picker.Item key={h} label={String(h)} value={h} />
          ))}
        </Picker>
      </View>
      <View style={styles.wheelCol}>
        <Picker
          selectedValue={minute}
          onValueChange={(v) => setTime(hour12, Number(v), ampm as 'AM' | 'PM')}
          style={styles.wheelPicker}
          itemStyle={styles.wheelItem}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
          ))}
        </Picker>
      </View>
      <View style={styles.wheelCol}>
        <Picker
          selectedValue={ampm}
          onValueChange={(v) => setTime(hour12, minute, v as 'AM' | 'PM')}
          style={styles.wheelPicker}
          itemStyle={styles.wheelItem}
        >
          <Picker.Item label="AM" value="AM" />
          <Picker.Item label="PM" value="PM" />
        </Picker>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  topSection: {
    marginBottom: 26,
    position: 'relative',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    ...ts('label1'),
    color: colors.text.text1,
    minHeight: 24,
    flex: 1,
    marginRight: 12,
  },
  titleColorBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  colorPaletteBox: {
    width: 320,
    height: 136,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 58,
    left: -9,
    zIndex: 30,
    shadowColor: '#A4ADB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
    justifyContent: 'center',
  },
  colorPaletteGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  colorPaletteChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  divider: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider1,
  },
  typeRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: 143,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg1,
  },
  typeButtonSelected: {
    backgroundColor: colors.icon.selected,
  },
  typeText: {
    ...ts('body1'),
    color: colors.text.text3,
  },
  typeTextSelected: {
    color: colors.text.text1w,
    fontWeight: '700',
  },
  sectionLabel: {
    ...ts('label2'),
    color: colors.text.text3,
  },
  dateBox: {
    width: 302,
    height: 50,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  rangeRow: {
    width: '100%',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  rangeSide: {
    flex: 1,
    minWidth: 0,
  },
  rangeArrowWrap: {
    width: 26,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeDateText: {
    flexShrink: 1,
    lineHeight: 20,
  },
  rangeDateStart: {
    textAlign: 'right',
    paddingRight: 10,
  },
  rangeDateEnd: {
    textAlign: 'left',
    paddingLeft: 10,
  },
  dateText: {
    ...ts('label2'),
    color: colors.text.text1,
  },
  toggleRow: {
    marginTop: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatDetail: {
    marginTop: 10,
  },
  repeatBox: {
    width: 302,
    height: 50,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatBoxText: {
    ...ts('label2'),
    color: colors.text.text1,
  },
  repeatBoxTextPlaceholder: {
    color: colors.text.text4,
  },
  repeatArrow: {
    position: 'absolute',
    right: 10,
    width: 20,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatMenu: {
    marginTop: 6,
    width: 302,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  weekdaySection: {
    marginTop: 8,
    marginBottom: 8,
  },
  weekdaySectionSpacer: {
    height: 8,
  },
  weekdayWrap: {
    width: 302,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayItem: {
    width: 43,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayItemSelected: {
    backgroundColor: colors.background.bg2,
  },
  weekdayText: {
    ...ts('date1'),
    color: colors.text.text1,
  },
  weekdayTextSelected: {
    color: colors.text.text1,
    fontWeight: '700',
  },
  weekdayTextDisabled: {
    color: colors.text.text4,
  },
  repeatMenuItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatMenuItemDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider.divider2,
  },
  repeatMenuItemExpanded: {
    backgroundColor: colors.background.bg2,
  },
  repeatMenuText: {
    ...ts('date1'),
    color: colors.text.text1,
  },
  repeatMenuTextSelected: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  repeatMenuTextOpenStrong: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  repeatMenuItemArrow: {
    position: 'absolute',
    right: 10,
    width: 20,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatMenuItemArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  monthlyGroup: {
    borderTopWidth: 0.5,
    borderTopColor: colors.divider.divider2,
    backgroundColor: colors.background.bg2,
    paddingVertical: 4,
  },
  monthlyItem: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.divider.divider2,
  },
  monthlyItemActive: {
    backgroundColor: colors.background.bg2,
  },
  monthlyText: {
    ...ts('date1'),
    color: colors.text.text2,
  },
  monthlyTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPickerInList: {
    width: 302,
    alignSelf: 'center',
    marginTop: 8,
  },
  customCol: {
    width: 120,
    height: 140,
    justifyContent: 'center',
  },
  customPicker: {
    width: 120,
    height: 210,
  },
  customPickerItem: {
    fontSize: 18,
    color: colors.text.text1,
  },
  customSuffix: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.text1,
    paddingHorizontal: 4,
  },
  customSuffixWrap: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDetail: {
    marginTop: 17,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRowLabel: {
    ...ts('date1'),
    color: colors.text.text3,
    width: 59,
    marginRight: 17,
  },
  timeBox: {
    width: 226,
    height: 50,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxSelected: {
    backgroundColor: colors.background.bg2,
  },
  timeBoxText: {
    ...ts('label2'),
    color: colors.text.text1,
    fontWeight: '700',
  },
  timeBoxTextSelected: {
    color: colors.brand.primary,
  },
  timeBoxTextInvalid: {
    color: colors.text.monday,
  },
  endDatePlaceholder: {
    color: colors.text.text4,
    fontWeight: '600',
  },
  repeatEndCalendarWrap: {
    width: END_CAL_W,
    marginTop: 28,
    alignSelf: 'flex-start',
  },
  repeatEndCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingBottom: 0,
  },
  repeatEndCalendarHeaderText: {
    ...ts('label1'),
    color: colors.text.text1,
  },
  repeatEndCalendarHeaderPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repeatEndYmWrap: {
    width: END_CAL_W,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  repeatEndYmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  repeatEndYmCol: {
    width: 130,
    height: 150,
    justifyContent: 'center',
  },
  repeatEndYmPicker: {
    width: 130,
    height: 150,
  },
  repeatEndYmPickerItem: {
    fontSize: 20,
    color: colors.text.text1,
  },
  calendarBottomActionRow: {
    width: END_CAL_W,
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  repeatEndYmMoveText: {
    ...ts('label1'),
    color: colors.brand.primary,
    fontWeight: '700',
  },
  repeatEndWeekRow: {
    width: END_CAL_W,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 2,
  },
  repeatEndWeekText: {
    width: END_DAY_W,
    textAlign: 'center',
    ...ts('date3'),
    color: colors.text.text3,
  },
  repeatEndWeekTextSunday: {
    color: '#FF474A',
  },
  repeatEndPager: {
    width: END_CAL_W,
    height: END_DAY_H * 6,
  },
  repeatEndGridWrap: {
    width: END_CAL_W,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  repeatEndCell: {
    width: END_DAY_W,
    height: END_DAY_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatEndSinglePill: {
    position: 'absolute',
    width: END_DAY_W,
    height: END_DAY_H,
    borderRadius: 12,
    backgroundColor: END_CAL_PILL_BG,
  },
  repeatEndDayText: {
    ...ts('date1'),
    color: colors.text.text1,
  },
  repeatEndDayTextSelected: {
    ...ts('label2'),
    color: colors.brand.primary,
  },
  remindPickerWrap: {
    width: 302,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
  },
  remindPickerInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  remindPickerBox: {
    width: 100,
    height: 210,
    justifyContent: 'center',
  },
  remindPicker: {
    width: 100,
    height: 210,
  },
  remindPickerItem: {
    fontSize: 16,
    color: colors.text.text1,
  },
  remindPickerColon: {
    fontSize: 20,
    color: colors.text.text1,
    fontWeight: '700',
    marginHorizontal: 6,
  },
  remindPickerSuffix: {
    fontSize: 18,
    color: colors.text.text1,
    fontWeight: '700',
    marginLeft: 6,
  },
  labelBox: {
    width: 302,
    minHeight: 50,
    marginTop: 25,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    borderRadius: 12,
    backgroundColor: colors.background.bg2,
    paddingRight: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  labelChipScroll: {
    width: '100%',
    maxWidth: '100%',
  },
  labelChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
  },
  labelChipItem: {
    marginRight: 8,
  },
  labelBoxPlaceholder: {
    ...ts('label2'),
    color: colors.text.text4,
    paddingLeft: 16,
  },
  memoLabel: {
    marginTop: 25,
  },
  memoBox: {
    width: 302,
    minHeight: 86,
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memoInput: {
    ...ts('body1'),
    color: colors.text.text1,
    minHeight: 60,
  },
  timePickerWrap: {
    marginTop: 8,
    marginLeft: 0,
    width: 302,
    minHeight: 170,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  dueTimeActionRow: {
    width: '100%',
    height: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dueTimeClearText: {
    ...ts('label3'),
    color: colors.text.text3,
    fontWeight: '700',
  },
  wheelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCol: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
  },
  wheelPicker: {
    width: 90,
    height: 160,
  },
  wheelItem: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.text1,
  },
  toggleRoot: {
    width: 51,
    height: 31,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.brand.primary,
  },
  toggleOff: {
    backgroundColor: '#D9D9D9',
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  toggleThumb: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
})
