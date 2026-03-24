import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native'
import type { Label } from '@/api/label_api'
import { createLabel } from '@/api/label_api'
import Xbutton from '@/assets/icons/x.svg'
import Check from '@/assets/icons/check.svg'
import type { CreateEventPayload } from '@/api/event_api'
import { getMyLabels } from '@/api/label_api'
import {
  getScheduleColorSet,
  resolveScheduleColor,
  resolveSlotIndex,
  slotKey,
} from '@/styles/scheduleColorSets'
import CreateEventDetailStep from '@/screens/More/CreateEventDetailStep'
import CreateEventDateStep from '@/screens/More/CreateEventDateStep'


interface OCREventEditCardProps {
  title: string
  date: string
  week?: string
  startTime?: string
  endTime?: string
  onClose: () => void
  isFromOCR?: boolean
  colorKey?: string
  onSubmit: (data: CreateEventPayload) => void

  registerPayloadGetter?: (getter: () => CreateEventPayload) => void
  unregisterPayloadGetter?: () => void
}

export default function OCREventEditCard({
  title,
  date,
  startTime,
  endTime,
  onSubmit,
  onClose,
  colorKey,
  registerPayloadGetter,
  unregisterPayloadGetter,
}: OCREventEditCardProps) {

  // ⭐ 색상 선택 state
const paletteColors = getScheduleColorSet()

const [selectedColorIndex, setSelectedColorIndex] = useState(
  resolveSlotIndex(resolveScheduleColor(colorKey))
)

useEffect(() => {
  setSelectedColorIndex(resolveSlotIndex(resolveScheduleColor(colorKey)))
}, [colorKey])

  // 제목/메모
  const [titleInput, setTitleInput] = useState(title)
  const [memo, setMemo] = useState('')
  const [hasTime, setHasTime] = useState(!!startTime)

// Date 객체로 변환
const parseTime = (t?: string) => {
  const d = new Date(date)   // ⭐ props.date 기반으로 날짜를 생성해야 함
  if (!t) return d
  const [h, m] = t.split(':').map(Number)
  d.setHours(h)
  d.setMinutes(m)
  return d
}

  const [startDate, setStartDate] = useState(parseTime(startTime))
  const [endDate, setEndDate] = useState(parseTime(endTime))

  const [openCalendar, setOpenCalendar] = useState(false)

  const [editDatePicking, setEditDatePicking] = useState(false)


  // 시간 형식 변환 HH:mm
  const formatHM = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const formatLocalDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAY_ENUM = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

// 🔥 1) 일정이 멀티데이 span인지 여부 (지금은 false 고정)
const isMultiDaySpan = false

// 🔥 2) 알림 on/off 토글
const [remindOn, setRemindOn] = useState(false)

// 🔥 3) 알림 드롭다운 열림 여부
const [remindOpen, setRemindOpen] = useState(false)

// 🔥 4) 맞춤설정 피커 열림 여부
const [customOpen, setCustomOpen] = useState(false)

// 🔥 5) 맞춤설정 hour/minute 피커
const [customHour, setCustomHour] = useState(1)
const [customMinute, setCustomMinute] = useState(0)

// 🔥 6) 현재 선택된 알림 값
  const [remindValue, setRemindValue] = useState<RemindOpt>('정시')

// 🔥 7) 알림 옵션 리스트
const REMIND_OPTIONS = [
  '정시',
  '5분 전',
  '10분 전',
  '30분 전',
  '1시간 전',
  '맞춤 설정'
]
type RemindOpt = (typeof REMIND_OPTIONS)[number]

const remindOptions = [
  { type: 'preset', id: '0m', day: 0, hour: 0, minute: 0, label: '정시' },
  { type: 'preset', id: '5m', day: 0, hour: 0, minute: 5, label: '5분 전' },
  { type: 'preset', id: '10m', day: 0, hour: 0, minute: 10, label: '10분 전' },
  { type: 'preset', id: '30m', day: 0, hour: 0, minute: 30, label: '30분 전' },
  { type: 'preset', id: '1h', day: 0, hour: 1, minute: 0, label: '1시간 전' },
  { type: 'custom', label: '맞춤 설정' },
]

const remindDisplayText =
  remindValue === '맞춤 설정'
    ? `${customHour > 0 ? `${customHour}시간 ` : ''}${customMinute}분 전`
    : remindValue

    const remindSelectedKey =
  remindValue === '맞춤 설정'
    ? 'custom'
    : remindValue === '정시'
      ? '0m'
      : remindValue === '5분 전'
        ? '5m'
        : remindValue === '10분 전'
          ? '10m'
          : remindValue === '30분 전'
            ? '30m'
            : '1h'

const handleSelectRemindOption = (opt: typeof remindOptions[number]) => {
  if (opt.type === 'custom') {
    setRemindValue('맞춤 설정')
    setCustomOpen(true)
    return
  }

  setCustomOpen(false)
  setRemindValue(opt.label)
}

// 🔥 8) 맞춤설정 피커 옵션
const HOURS = Array.from({ length: 12 }, (_, i) => i)   // 0~11시간
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,10,...55

// 🔥 9) 표시용 텍스트
const displayRemind =
  remindValue === '맞춤 설정'
    ? `${customHour > 0 ? `${customHour}시간 ` : ''}${customMinute}분 전`
    : remindValue

// 🔥 10) Picker 터치 중인지 확인 (드롭다운 닫힘 방지)
const pickerTouchingRef = React.useRef(false)

/** Toggle Props 타입 */
type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
}

/* Toggle 컴포넌트 – EventDetailPopup과 동일한 방식 */
const Toggle = ({ value, onChange }: ToggleProps) => (
  <Pressable
    onPress={() => onChange(!value)}
    style={{
      width: 50,
      height: 26,
      borderRadius: 20,
      padding: 2,
      justifyContent: 'center',
      backgroundColor: value ? '#9D7BFF' : '#ccc',
    }}
  >
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        transform: [{ translateX: value ? 22 : 0 }],
      }}
    />
  </Pressable>
)

const [labels, setLabels] = useState<Label[]>([])
const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])

const handleCreateLabel = async (title: string) => {
  const newLabel = await createLabel(title)
  setLabels((prev) => [...prev, newLabel])
  setSelectedLabelIds((prev) => [...prev, newLabel.id])
  return newLabel   
}

// 반복
const [repeatOn, setRepeatOn] = useState(true)
const [repeatMode, setRepeatMode] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly')
const [monthlyOpt, setMonthlyOpt] = useState<'byDate' | 'byNthWeekday' | 'byLastWeekday'>('byDate')
const [repeatEvery, setRepeatEvery] = useState(1)
const [repeatUnit, setRepeatUnit] = useState<'day' | 'week' | 'month'>('day')
const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([])
const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null)

// 🔢 이번 달 몇 번째 주인지 계산
const getWeekIndexOfMonth = (date: Date) => {
  const d = new Date(date);
  const day = d.getDate();
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  return {
    nth: Math.floor((day + firstDay - 1) / 7) + 1
  };
};

const WD_TXT = ['일', '월', '화', '수', '목', '금', '토'];

// 🔥 매월 옵션 label에 필요한 값들
const { nth } = getWeekIndexOfMonth(startDate); // 몇 번째 주
const wd = WD_TXT[startDate.getDay()];          // 요일 텍스트

const endLabel = (mode: 'none' | 'date', d: Date | null) => {
  if (mode === 'none' || !d) return '마감일 없음'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// ⭐ 서버에 보낼 최종 payload 생성 함수
const buildEventPayload = () => {
  const startHM = hasTime ? formatHM(startDate) + ':00' : null
  const endHM = hasTime ? formatHM(endDate) + ':00' : null

  let repeat: any = null
  const wd = WEEKDAY_ENUM[startDate.getDay()]

  if (repeatOn) {
    if (repeatMode === 'daily') {
      repeat = {
        interval: 1,
        unit: 'DAY',
        on: [],
        endDate: repeatEndDate ? formatLocalDate(repeatEndDate) : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'weekly') {
      repeat = {
        interval: 1,
        unit: 'WEEK',
        on: [wd],
        endDate: repeatEndDate ? formatLocalDate(repeatEndDate) : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'monthly') {
      repeat = {
        interval: 1,
        unit: 'MONTH',
        on:
          monthlyOpt === 'byDate'
            ? [`D${startDate.getDate()}`]
            : monthlyOpt === 'byNthWeekday'
              ? [`${nth}${wd}`]
              : [`LAST${wd}`],
        endDate: repeatEndDate ? formatLocalDate(repeatEndDate) : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'custom') {
      repeat = {
        interval: repeatEvery,
        unit: repeatUnit.toUpperCase(),
        on: repeatUnit === 'week' ? [wd] : [],
        endDate: repeatEndDate ? formatLocalDate(repeatEndDate) : null,
        exceptionDates: [],
      }
    }
  }

  let reminderNoti = { day: 0, hour: 0, minute: 0 }

  if (remindOn) {
    if (remindValue === '정시') {
      reminderNoti = { day: 0, hour: 0, minute: 0 }
    } else if (remindValue === '5분 전') {
      reminderNoti = { day: 0, hour: 0, minute: 5 }
    } else if (remindValue === '10분 전') {
      reminderNoti = { day: 0, hour: 0, minute: 10 }
    } else if (remindValue === '30분 전') {
      reminderNoti = { day: 0, hour: 0, minute: 30 }
    } else if (remindValue === '1시간 전') {
      reminderNoti = { day: 0, hour: 1, minute: 0 }
    } else if (remindValue === '맞춤 설정') {
      reminderNoti = {
        day: 0,
        hour: customHour,
        minute: customMinute,
      }
    }
  }

  return {
    title: titleInput,
    content: memo || '',
    labels: selectedLabelIds,
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
    startTime: startHM,
    endTime: endHM,
    repeat,
    colorKey: slotKey(selectedColorIndex),
    reminderNoti,
  }
}

useEffect(() => {
  registerPayloadGetter?.(buildEventPayload)

  return () => {
    unregisterPayloadGetter?.()
  }
}, [
  titleInput,
  memo,
  selectedLabelIds,
  startDate,
  endDate,
  hasTime,
  repeatMode,
  monthlyOpt,
  repeatEvery,
  repeatUnit,
  repeatEndDate,
  remindOn,
  remindValue,
  customHour,
  customMinute,
  selectedColorIndex,
])

  // 🔥 OCR 카드 전용: '시간표' 라벨 자동 선택/자동 생성
// 🔥 라벨 목록 불러오기
useEffect(() => {
  const loadLabels = async () => {
    const list = await getMyLabels()
    setLabels(list)
  }
  loadLabels()
}, [])

// 🔥 시간표 자동 선택/생성
useEffect(() => {
  if (!labels.length) return

  const applyTimetable = async () => {
    let target = labels.find((l) => l.title === '시간표')

    if (!target) {
      const newLabel = await createLabel('시간표')
      setLabels((prev) => [...prev, newLabel])
      target = newLabel
    }

    setSelectedLabelIds((prev) =>
      prev.includes(target.id) ? prev : [...prev, target.id]
    )
  }

  applyTimetable()
}, [labels])


return (
  <View style={styles.cardShadow}>
  <View style={styles.card}>
{/* HEADER */}
<View style={styles.header}>
  <Pressable onPress={onClose} hitSlop={20}>
    <Xbutton width={12} height={12} color={'#808080'} />
  </Pressable>

<Pressable
  onPress={() => {
    const payload = buildEventPayload()
    onSubmit(payload)
  }}
  hitSlop={20}
>
  <Check width={12} height={12} color={'#808080'} />
</Pressable>
</View>

  {/* 내용 스크롤 가능 */}
{editDatePicking ? (
  <CreateEventDateStep
    start={startDate}
    end={endDate}
    onChangeRange={(nextStart, nextEnd) => {
      setStartDate(nextStart)
      setEndDate(nextEnd)
    }}
    onNext={() => setEditDatePicking(false)}
  />
) : (
  <CreateEventDetailStep
    title={titleInput}
    onChangeTitle={setTitleInput}
    memo={memo}
    onChangeMemo={setMemo}
    colors={paletteColors}
    selectedColorIndex={selectedColorIndex}
    onSelectColorIndex={setSelectedColorIndex}
    selectedType="event"
    onSelectType={() => {}}
    start={startDate}
    end={endDate}
    endDisplay={endDate}
    onPressDateBox={() => {
      setEditDatePicking(true)
    }}
    onChangeStartTime={setStartDate}
    onChangeEndTime={setEndDate}
    invalidEndTime={endDate.getTime() < startDate.getTime()}
    timeOn={hasTime}
    timeDisabled={false}
    onToggleTime={setHasTime}
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
    remindDisabled={false}
    onToggleRemind={setRemindOn}
    remindOpen={remindOpen}
    onSetRemindOpen={setRemindOpen}
    remindDisplayText={remindDisplayText}
    remindOptions={remindOptions as any}
    remindSelectedKey={remindSelectedKey}
    onSelectRemindOption={handleSelectRemindOption}
    customOpen={customOpen}
    onSetCustomOpen={setCustomOpen}
    customHour={customHour}
    customMinute={customMinute}
    onChangeCustomHour={setCustomHour}
    onChangeCustomMinute={setCustomMinute}
    labels={labels as any}
    selectedLabelIds={selectedLabelIds}
    labelMaxSelected={3}
    onChangeSelectedLabelIds={setSelectedLabelIds}
    onCreateLabel={handleCreateLabel as any}
    taskDate={null}
    onChangeTaskDate={() => {}}
    taskDueOn={false}
    onChangeTaskDueOn={() => {}}
    taskDueDate={null}
    onChangeTaskDueDate={() => {}}
    taskDueTimeOn={false}
    onChangeTaskDueTimeOn={() => {}}
    taskDueTime={new Date()}
    onChangeTaskDueTime={() => {}}
  />
)}
    </View>
    </View>
  )
}

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 24,
    marginTop: 10,
  },

  cardShadow: {
    borderRadius: 20,
    shadowColor: '#747e86',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },

card: {
  flex: 1,
  backgroundColor: '#ffffff',
  borderRadius: 20,
  overflow: 'hidden',
},

})