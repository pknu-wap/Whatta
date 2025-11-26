import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import Down from '@/assets/icons/down.svg'
import { ensureNotificationPermissionForToggle } from '@/lib/fcm'
import LabelChip from '@/components/LabelChip'
import LabelPickerModal from '@/components/LabelPicker'
import type { Label } from '@/api/label_api'
import { createLabel } from '@/api/label_api'
import { ScrollView } from 'react-native'
import InlineCalendar from '@/components/lnlineCalendar'
import Xbutton from '@/assets/icons/x.svg'
import Check from '@/assets/icons/check.svg'
import type { CreateEventPayload } from '@/api/event_api'
import { getMyLabels } from '@/api/label_api'


interface OCREventEditCardProps {
  title: string
  date: string
  week?: string
  startTime?: string
  endTime?: string
  onClose: () => void
  isFromOCR?: boolean

onSubmit: (data: CreateEventPayload) => void

}

export default function OCREventEditCard({
  title,
  date,
  week,
  startTime,
  endTime,
  onSubmit,
  onClose,
}: OCREventEditCardProps) {
  // 제목/메모
  const [titleInput, setTitleInput] = useState(title)
  const [memo, setMemo] = useState('')
  const [dateValue, setDateValue] = useState(date)
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

  const [openStartPicker, setOpenStartPicker] = useState(false)
  const [openEndPicker, setOpenEndPicker] = useState(false)
  const [dateTarget, setDateTarget] = useState<'start' | 'end'>('start')
  const [openCalendar, setOpenCalendar] = useState(false)


  const formatFullDate = (d: Date) => {
  const yoil = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${yoil[d.getDay()]}요일`
}

  // 시간 형식 변환 HH:mm
  const formatHM = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  // 탭 (일정/반복)
  const [tab, setTab] = useState<'일정' | '반복'>('반복')

  // day 값으로 실제 Date 생성
const buildDate = (base: Date, day: number) => {
  const d = new Date(base)
  d.setDate(day)
  return d
}

// 범위 안에 있는 날짜인지
const isInRange = (day: number) => {
  const d = buildDate(startDate, day)
  return d > startDate && d < endDate
}

// 선택된 날짜인지
const isSame = (d: Date, day: number) => d.getDate() === day

const WEEKDAY = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일']

const kDateParts = (d: Date) => ({
  month: d.getMonth() + 1,
  day: d.getDate(),
  weekday: WEEKDAY[d.getDay()],
})

const formatKoreanTime = (d: Date) => {
  const h24 = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')

  const period = h24 < 12 ? '오전' : '오후'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12

  return `${period} ${h12}:${m}`
}

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
  const [remindValue, setRemindValue] = useState<RemindOpt>('하루 전')

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
const [labelModalOpen, setLabelModalOpen] = useState(false)
const [labelAnchor, setLabelAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 })

const labelBtnRef = React.useRef<any>(null)

const handleCreateLabel = async (title: string) => {
  const newLabel = await createLabel(title)
  setLabels((prev) => [...prev, newLabel])
  setSelectedLabelIds((prev) => [...prev, newLabel.id])
  return newLabel   
}

// 반복
const [repeatOpen, setRepeatOpen] = useState(false)
const [repeatMode, setRepeatMode] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('weekly')

// monthly 옵션
const [monthlyOpen, setMonthlyOpen] = useState(false)
const [monthlyOpt, setMonthlyOpt] = useState<'byDate' | 'byNthWeekday' | 'byLastWeekday'>('byDate')

// custom 옵션
const [repeatCustomOpen, setRepeatCustomOpen] = useState(false)
const [repeatEvery, setRepeatEvery] = useState(1)
const [repeatUnit, setRepeatUnit] = useState<'day' | 'week' | 'month'>('day')

// 마감일
const [endOpen, setEndOpen] = useState(false)
const [endMode, setEndMode] = useState<'none' | 'date'>('none')
const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null)
const [endDateCustomOpen, setEndDateCustomOpen] = useState(false)

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

// 🔥 탭 변경 시 반복 관련 드롭다운 자동 닫기
useEffect(() => {
  if (tab === '일정') {
    setRepeatOpen(false)
    setMonthlyOpen(false)
    setRepeatCustomOpen(false)
    setEndOpen(false)
  }
}, [tab])

// 🔥 매월 옵션 label에 필요한 값들
const { nth } = getWeekIndexOfMonth(startDate); // 몇 번째 주
const wd = WD_TXT[startDate.getDay()];          // 요일 텍스트

const endLabel = (mode: 'none' | 'date', d: Date | null) => {
  if (mode === 'none' || !d) return '마감일 없음'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// ⭐ 서버에 보낼 최종 payload 생성 함수
const buildEventPayload = () => {
  // 시간
  const startHM = hasTime ? formatHM(startDate) + ':00' : null
  const endHM   = hasTime ? formatHM(endDate) + ':00' : null

  // 반복 옵션
  let repeat: any = null

  if (tab === '반복' && repeatMode !== 'none') {
    if (repeatMode === 'daily') {
      repeat = {
        interval: 1,
        unit: 'DAY',
        on: [],
        endDate: repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'weekly') {
      repeat = {
        interval: 1,
        unit: 'WEEK',
        on: [ WEEKDAY[startDate.getDay()] ],
        endDate: repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'monthly') {
      repeat = {
        interval: 1,
        unit: 'MONTH',
        on:
          monthlyOpt === 'byDate'
            ? [String(startDate.getDate())]
            : monthlyOpt === 'byNthWeekday'
              ? [`${nth}-${startDate.getDay()}`]        // 예: "2-1"
              : [`LAST-${startDate.getDay()}`],        // 예: "LAST-1"
        endDate: repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : null,
        exceptionDates: [],
      }
    } else if (repeatMode === 'custom') {
      repeat = {
        interval: repeatEvery,
        unit: repeatUnit.toUpperCase(),  // DAY/WEEK/MONTH
        on: [],
        endDate: repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : null,
        exceptionDates: [],
      }
    }
  }

  // 알림 옵션
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
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startTime: startHM,
    endTime: endHM,
    repeat,
    colorKey: 'FFD966',
    reminderNoti,
  }
}

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
  <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: 40 }}
  >

{/* 제목 입력 */}
<TextInput
  style={styles.titleInput}
  value={titleInput}
  onChangeText={setTitleInput}
  placeholder="제목"
  placeholderTextColor="#b5b5b5"
/>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('일정')}
          style={[styles.tab, tab === '일정' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === '일정' && styles.tabTextActive]}>
            일정
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('반복')}
          style={[styles.tab, tab === '반복' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === '반복' && styles.tabTextActive]}>
            반복
          </Text>
        </Pressable>
      </View>

<View style={styles.dateBlock}>
  <Text style={styles.label}>날짜</Text>

  <View style={styles.dateRow}>
    {/* 시작 날짜 */}
    <Pressable
  onPress={() => {
    if (openCalendar && dateTarget === 'start') setOpenCalendar(false)
    else {
      setDateTarget('start')
      setOpenCalendar(true)
    }
  }}
>
  {(() => {
    const p = kDateParts(startDate)
    return (
      <View style={styles.inlineRow}>
        <Text style={styles.num}>{p.month}</Text>
        <Text style={styles.unit}>월</Text>
        <Text style={styles.spacer}> </Text>
        <Text style={styles.num}>{p.day}</Text>
        <Text style={styles.unit}>일</Text>
        <Text style={styles.spacer}> </Text>
        <Text style={styles.week}>{p.weekday}</Text>
      </View>
    )
  })()}
</Pressable>

    <Text style={{ marginHorizontal: 10, color: '#333333', fontSize: 10 }}>▶</Text>

    {/* 종료 날짜 */}
<Pressable
  onPress={() => {
    if (openCalendar && dateTarget === "end") setOpenCalendar(false)
    else {
      setDateTarget("end")
      setOpenCalendar(true)
    }
  }}
>
{(() => {
  const p = kDateParts(endDate)

  // 종료 날짜 색상 조건
  const isSelected = endDate.getTime() !== startDate.getTime()
  const isFocusing = dateTarget === 'end'

  const color = isSelected || isFocusing ? '#222' : '#B3B3B3'

  return (
    <View style={styles.inlineRow}>
      <Text style={[styles.num, { color }]}>{p.month}</Text>
      <Text style={[styles.unit, { color }]}>월</Text>
      <Text style={styles.spacer}> </Text>

      <Text style={[styles.num, { color }]}>{p.day}</Text>
      <Text style={[styles.unit, { color }]}>일</Text>
      <Text style={styles.spacer}> </Text>

      <Text style={[styles.week, { color }]}>{p.weekday}</Text>
    </View>
  )
})()}
</Pressable>
  </View>
</View>


{openCalendar && (
  <View style={{ paddingVertical: 12 }}>

    {/* 🔥 월 이동 버튼 */}
    <View style={{
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10
    }}>
      <Pressable
        onPress={() => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() - 1);
          setStartDate(d);
          setEndDate(d);
        }}
        hitSlop={16}
      >
        <Text style={{fontSize: 14, fontWeight: '600'}}>◀</Text>
      </Pressable>

      <Text style={{ marginHorizontal: 16, fontSize: 14, fontWeight: '700', color: '#222'}}>
        {startDate.getFullYear()}년 {startDate.getMonth() + 1}월
      </Text>

      <Pressable
        onPress={() => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + 1);
          setStartDate(d);
          setEndDate(d);
        }}
        hitSlop={16}
      >
        <Text style={{fontSize: 14, fontWeight: '600'}}>▶</Text>
      </Pressable>
    </View>

    {/* 🔥 요일 헤더 */}
    <View style={styles.weekHeaderRow}>
      {['일','월','화','수','목','금','토'].map((w) => (
        <Text key={w} style={styles.weekHeaderText}>
          {w}
        </Text>
      ))}
    </View>

    {/* 🔥 날짜 그리드 */}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {(() => {
        const y = startDate.getFullYear();
        const m = startDate.getMonth();
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m+1, 0).getDate();

        const arr = [];

        for (let i = 0; i < first; i++) arr.push(null);
        for (let d = 1; d <= days; d++) arr.push(d);

        return arr.map((d, i) => {
          if (d === null)
            return <View key={i} style={{ width: '14.2%', paddingVertical: 8 }} />

          const isStart = startDate.getDate() === d;
          const isEnd = endDate.getDate() === d;
          const inRange = (() => {
            const _d = new Date(y, m, d);
            return _d > startDate && _d < endDate;
          })();

          return (
            <Pressable
              key={i}
              style={{
                width: '14.2%',
                alignItems: 'center',
                paddingVertical: 8
              }}
              onPress={() => {
                const next = new Date(y, m, d);

                if (dateTarget === 'start') {
                  setStartDate(next);
                  setEndDate(next);
                  setDateTarget('end');
                } else {
                  if (next < startDate) {
                    setStartDate(next);
                  } else {
                    setEndDate(next);
                  }
                  setDateTarget('start');
                }
              }}
            >
              {/* Range BG */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: isStart ? '50%' : 0,
                  right: isEnd ? '50%' : 0,
                  height: 28,
                  backgroundColor: inRange || isStart || isEnd ? '#E8CCFF4D' : 'transparent',
                }}
              />

              {/* Circle */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isStart || isEnd ? '#E8CCFF' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontWeight: isStart || isEnd ? '700' : '500',
                    color: isStart || isEnd ? '#B04FFF' : '#444',
                  }}
                >
                  {d}
                </Text>
              </View>

            </Pressable>
          );
        });
      })()}
    </View>

  </View>
)}

{openCalendar && <View style={styles.timeDivider} />}

{hasTime && (
  <View style={styles.timeInlineRow}>
    <Pressable
      onPress={() => {
        setOpenStartPicker((prev) => !prev)
        setOpenEndPicker(false)
      }}
      hitSlop={8}
    >
      <Text
        style={[
          styles.timeText,
          openStartPicker && styles.timeTextActive
        ]}
      >
        {formatKoreanTime(startDate)}
      </Text>
    </Pressable>

    <Text style={styles.timeArrow}>▶</Text>

    <Pressable
      onPress={() => {
        setOpenEndPicker((prev) => !prev)
        setOpenStartPicker(false)
      }}
      hitSlop={8}
    >
      <Text
        style={[
          styles.timeText,
          openEndPicker && styles.timeTextActive
        ]}
      >
        {formatKoreanTime(endDate)}
      </Text>
    </Pressable>
  </View>
)}

{/* 시간 선택 */}
      {hasTime && (
        <>
          {openStartPicker && (
            <View style={styles.pickerRow}>
              {/* HOUR */}
              <Picker
                style={styles.picker}
                selectedValue={startDate.getHours() % 12 || 12}
                onValueChange={(v) => {
                  const next = new Date(startDate)
                  const isPM = startDate.getHours() >= 12
                  next.setHours(isPM ? (v === 12 ? 12 : v + 12) : v === 12 ? 0 : v)
                  setStartDate(next)

                  if (next > endDate) {
                    const fix = new Date(next.getTime() + 60 * 60 * 1000)
                    setEndDate(fix)
                  }
                }}
              >
                {hours.map((h) => (
                  <Picker.Item key={h} value={h} label={`${h}`} />
                ))}
              </Picker>

              {/* MIN */}
              <Picker
                style={styles.picker}
                selectedValue={startDate.getMinutes() - (startDate.getMinutes() % 5)}
                onValueChange={(v) => {
                  const next = new Date(startDate)
                  next.setMinutes(v)
                  setStartDate(next)
                }}
              >
                {minutes.map((m) => (
                  <Picker.Item key={m} value={m} label={String(m).padStart(2, '0')} />
                ))}
              </Picker>

              {/* AM/PM */}
              <Picker
                style={styles.picker}
                selectedValue={startDate.getHours() < 12 ? 'AM' : 'PM'}
                onValueChange={(v) => {
                  const next = new Date(startDate)
                  const h = next.getHours()

                  if (v === 'AM' && h >= 12) next.setHours(h - 12)
                  if (v === 'PM' && h < 12) next.setHours(h + 12)

                  setStartDate(next)

                  if (next > endDate) {
                    const fix = new Date(next.getTime() + 60 * 60 * 1000)
                    setEndDate(fix)
                  }
                }}
              >
                <Picker.Item label="AM" value="AM" />
                <Picker.Item label="PM" value="PM" />
              </Picker>
            </View>
          )}

          {openEndPicker && (
            <View style={styles.pickerRow}>
              {/* HOUR */}
              <Picker
                style={styles.picker}
                selectedValue={endDate.getHours() % 12 || 12}
                onValueChange={(v) => {
                  const next = new Date(endDate)
                  const isPM = endDate.getHours() >= 12
                  next.setHours(isPM ? (v === 12 ? 12 : v + 12) : v === 12 ? 0 : v)
                  setEndDate(next)
                }}
              >
                {hours.map((h) => (
                  <Picker.Item key={h} value={h} label={`${h}`} />
                ))}
              </Picker>

              {/* MIN */}
              <Picker
                style={styles.picker}
                selectedValue={endDate.getMinutes() - (endDate.getMinutes() % 5)}
                onValueChange={(v) => {
                  const next = new Date(endDate)
                  next.setMinutes(v)
                  setEndDate(next)
                }}
              >
                {minutes.map((m) => (
                  <Picker.Item key={m} value={m} label={String(m).padStart(2, '0')} />
                ))}
              </Picker>

              {/* AM/PM */}
              <Picker
                style={styles.picker}
                selectedValue={endDate.getHours() < 12 ? 'AM' : 'PM'}
                onValueChange={(v) => {
                  const next = new Date(endDate)
                  const h = next.getHours()

                  if (v === 'AM' && h >= 12) next.setHours(h - 12)
                  if (v === 'PM' && h < 12) next.setHours(h + 12)

                  setEndDate(next)
                }}
              >
                <Picker.Item label="AM" value="AM" />
                <Picker.Item label="PM" value="PM" />
              </Picker>
            </View>
          )}
        </>
      )}

      {/* 시간 스위치 */}
      <View style={styles.row}>
        <Text style={styles.label}>시간</Text>

<Switch
  value={hasTime}
  onValueChange={(v) => {
    setHasTime(v)
    if (!v) {
      setOpenStartPicker(false)
      setOpenEndPicker(false)
    }
  }}
  trackColor={{ false: '#ccc', true: colors.primary.main }}
/>
      </View>

      <View style={styles.sep} />

{/* 🔁 반복 (반복 탭일 때만 보임) */}
{tab === '반복' && (
    <View style={styles.row}>
      <Text style={styles.label}>반복</Text>

      {(() => {
        const baseColor = '#333'
        const arrowColor = repeatOpen ? '#B04FFF' : baseColor

        const label =
          repeatMode === 'monthly'
            ? monthlyOpt === 'byDate'
              ? `매월 ${startDate.getDate()}일 반복`
              : monthlyOpt === 'byNthWeekday'
                ? `매월 ${nth}번째 ${wd}요일에 반복`
                : `매월 마지막주 ${wd}요일에 반복`
            : repeatMode === 'weekly'
              ? '매주'
              : repeatMode === 'daily'
                ? '매일'
                : repeatMode === 'custom'
                  ? `${repeatEvery}${repeatUnit === 'day' ? '일' : repeatUnit === 'week' ? '주' : '개월'}마다`
                  : '없음'

        return (
          <Pressable
            style={styles.remindButton}
            onPress={() => {
              setRepeatOpen(!repeatOpen)
              setMonthlyOpen(false)
              setRepeatCustomOpen(false)
            }}
            hitSlop={8}
          >
            <Text style={styles.dropdownText}>{label}</Text>
            <Down width={8} height={8} color={arrowColor} />
          </Pressable>
        )
      })()}
    </View>
)}

{repeatOpen && (
  <View style={styles.remindDropdown}>
    {/* 매일 */}
    <Pressable
      style={[styles.remindItem, styles.remindItemDivider]}
      onPress={() => {
        setRepeatMode('daily')
        setRepeatOpen(false)
      }}
    >
      {repeatMode === 'daily' && <View style={styles.remindSelectedBg} />}
      <Text style={[styles.remindItemText, repeatMode === 'daily' && { color: '#A84FF0', fontWeight: '700' }]}>
        매일
      </Text>
    </Pressable>

    {/* 매주 */}
    <Pressable
      style={[styles.remindItem, styles.remindItemDivider]}
      onPress={() => {
        setRepeatMode('weekly')
        setRepeatOpen(false)
      }}
    >
      {repeatMode === 'weekly' && <View style={styles.remindSelectedBg} />}
      <Text style={[styles.remindItemText, repeatMode === 'weekly' && { color: '#A84FF0', fontWeight: '700' }]}>
        매주
      </Text>
    </Pressable>

    {/* 매월 */}
    <Pressable
      style={[styles.remindItem, styles.remindItemDivider]}
      onPress={() => {
        setRepeatMode('monthly')
        setMonthlyOpen(!monthlyOpen)
        setRepeatCustomOpen(false)
      }}
    >
      {repeatMode === 'monthly' && <View style={styles.remindSelectedBg} />}
      <Text style={[styles.remindItemText, repeatMode === 'monthly' && { color: '#A84FF0', fontWeight: '700' }]}>
        매월
      </Text>
    </Pressable>

    {/* 매월 인라인 */}
    {repeatMode === 'monthly' && monthlyOpen && (
 <View style={styles.inlinePickerInList}>
<View style={styles.monthlyGroup}>
    
  {/* 첫 번째 항목 */}
  <Pressable
    style={[
      styles.monthlyInnerItem,
      monthlyOpt === 'byDate' && styles.monthlyInnerItemSelected
    ]}
    onPress={() => {
      setMonthlyOpt('byDate')
      setRepeatOpen(false)
      setMonthlyOpen(false)
    }}
  >
    <Text
      style={[
        styles.monthlyInnerItemText,
        monthlyOpt === 'byDate' && styles.monthlyInnerItemTextSelected
      ]}
    >
      매월 {startDate.getDate()}일에 반복
    </Text>
  </Pressable>
  <View style={styles.monthlyDivider} />

  {/* 두 번째 항목 */}
  <Pressable
    style={[
      styles.monthlyInnerItem,
      monthlyOpt === 'byNthWeekday' && styles.monthlyInnerItemSelected
    ]}
    onPress={() => {
      setMonthlyOpt('byNthWeekday')
      setRepeatOpen(false)
      setMonthlyOpen(false)
    }}
  >
    <Text
      style={[
        styles.monthlyInnerItemText,
        monthlyOpt === 'byNthWeekday' && styles.monthlyInnerItemTextSelected
      ]}
    >
      매월 {nth}번째 {wd}요일에 반복
    </Text>
  </Pressable>
  <View style={styles.monthlyDivider} />

  {/* 세 번째 항목 */}
  <Pressable
    style={[
      styles.monthlyInnerItem,
      monthlyOpt === 'byLastWeekday' && styles.monthlyInnerItemSelected
    ]}
    onPress={() => {
      setMonthlyOpt('byLastWeekday')
      setRepeatOpen(false)
      setMonthlyOpen(false)
    }}
  >
    <Text
      style={[
        styles.monthlyInnerItemText,
        monthlyOpt === 'byLastWeekday' && styles.monthlyInnerItemTextSelected
      ]}
    >
      매월 마지막주 {wd}요일에 반복
    </Text>
  </Pressable>

</View>
</View>
)}

    {/* 맞춤 설정 */}
    <Pressable
      style={styles.remindItem}
      onPress={() => {
        setRepeatMode('custom')
        setRepeatCustomOpen(!repeatCustomOpen)
        setMonthlyOpen(false)
      }}
    >
      {repeatMode === 'custom' && <View style={styles.remindSelectedBg} />}
      <Text style={[styles.remindItemText, repeatMode === 'custom' && { color: '#A84FF0', fontWeight: '700' }]}>
        맞춤 설정
      </Text>
    </Pressable>

    {/* 맞춤 설정 인라인 */}
    {repeatMode === 'custom' && repeatCustomOpen && (
      <View style={styles.inlinePickerInList}>
        <View style={styles.inlinePickerRow}>
          <View style={styles.inlinePickerBox}>
            <Picker
              selectedValue={repeatEvery}
              onValueChange={setRepeatEvery}
              style={styles.inlinePicker}
              itemStyle={{ fontSize: 16 }}
            >
              {[1,2,3,4,5,6].map((n) => (
                <Picker.Item key={n} label={`${n}`} value={n} />
              ))}
            </Picker>
          </View>

          <View style={styles.inlinePickerBox}>
            <Picker
              selectedValue={repeatUnit}
              onValueChange={setRepeatUnit}
              style={styles.inlinePicker}
              itemStyle={{ fontSize: 16 }}
            >
              <Picker.Item label="일" value="day" />
              <Picker.Item label="주" value="week" />
              <Picker.Item label="개월" value="month" />
            </Picker>
          </View>

          <Text style={styles.inlineSuffix}>마다</Text>
        </View>
      </View>
    )}
  </View>
)}
{tab === '반복' && (
  <>
    {/* 🔥 마감일 */}
    <View
      style={[styles.endDate, { flexDirection: 'row', justifyContent: 'flex-end' }]}
    >
      {(() => {
        const baseColor = '#333'
        const arrowColor = endOpen ? '#B04FFF' : baseColor

        return (
          <Pressable
            style={styles.remindButton}
            onPress={() => {
              setEndOpen((v) => !v)
              setRepeatCustomOpen(false)
              setMonthlyOpen(false)
              if (!endOpen) setEndDateCustomOpen(false)
            }}
          >
            <Text style={[styles.dropdownText, { color: baseColor }]}>
              {endLabel(endMode, repeatEndDate)}
            </Text>
            <Down width={8} height={8} color={arrowColor} />
          </Pressable>
        )
      })()}
    </View>

    {endOpen && (
      <View style={styles.remindDropdown}>
        {/* 없음 */}
        <Pressable
          style={[styles.remindItem, styles.remindItemDivider]}
          onPress={() => {
            setEndMode('none')
            setRepeatEndDate(null)
            setEndOpen(false)
            setEndDateCustomOpen(false)
          }}
        >
          {endMode === 'none' && <View style={styles.remindSelectedBg} />}
          <Text
            style={[
              styles.remindItemText,
              endMode === 'none' && { color: '#A84FF0', fontWeight: '700' },
            ]}
          >
            없음
          </Text>
        </Pressable>

        {/* 맞춤 설정 */}
        <Pressable
          style={styles.remindItem}
          onPress={() => {
            if (endMode !== 'date') {
              setEndMode('date')
              setEndDateCustomOpen(true)
            } else {
              setEndDateCustomOpen((v) => !v)
            }
          }}
        >
          {endMode === 'date' && <View style={styles.remindSelectedBg} />}
          <Text
            style={[
              styles.remindItemText,
              endMode === 'date' && { color: '#A84FF0', fontWeight: '700' },
            ]}
          >
            맞춤 설정
          </Text>
        </Pressable>

        {endMode === 'date' && endDateCustomOpen && (
          <InlineCalendar
            open
            value={repeatEndDate ?? startDate}
            onSelect={(d: Date) => setRepeatEndDate(d)}
          />
        )}
      </View>
    )}
  </>
)}

      {/* 🔔 일정/알림 */}
{!isMultiDaySpan && (
  <>
    {/* 알림 Row */}
    <View style={styles.row}>
      <Text style={styles.label}>알림</Text>

      {/* 오른쪽 버튼 + 토글 */}
      <View style={styles.rowRight}>
        {(() => {
          const baseColor = remindOn ? '#333' : '#B3B3B3'
          const arrowColor = remindOpen ? '#B04FFF' : baseColor

          return (
            <Pressable
              style={styles.remindButton}
              disabled={!remindOn}
              onPress={() => remindOn && setRemindOpen((v) => !v)}
              hitSlop={10}
            >
              <Text style={[styles.remindTextBtn, { color: baseColor }]}>
                {displayRemind}
              </Text>
              <Down width={10} height={10} color={arrowColor} />
            </Pressable>
          )
        })()}

        {/* Toggle */}
        <Toggle
          value={remindOn}
          onChange={async (v: boolean) => {
            if (!v) {
              setRemindOn(false)
              setRemindOpen(false)
              return
            }

            const ok = await ensureNotificationPermissionForToggle()
            if (!ok) {
              setRemindOn(false)
              setRemindOpen(false)
              return
            }
            setRemindOn(true)
          }}
        />
      </View>
    </View>

    {/* 드롭다운 리스트 */}
    {remindOn && remindOpen && (
      <View style={styles.remindDropdown}>
        {REMIND_OPTIONS.map((opt, idx) => {
          const selected = opt === remindValue
          const isLast = idx === REMIND_OPTIONS.length - 1
          const isCustom = opt === '맞춤 설정'

          return (
            <View key={opt}>
              {/* 리스트 아이템 */}
              <Pressable
                style={[
                  styles.remindItem,
                  !isLast && styles.remindItemDivider,
                ]}
                onStartShouldSetResponderCapture={() => true}
                onPress={() => {
                  if (isCustom) {
                    setRemindValue('맞춤 설정')
                    setCustomOpen((prev) => !prev)
                    return
                  }
                  setRemindValue(opt)
                  setCustomOpen(false)
                  setRemindOpen(false)
                }}
              >
                {selected && (
                  <View style={styles.remindSelectedBg} pointerEvents="none" />
                )}
                <Text
                  style={[
                    styles.remindItemText,
                    selected && { color: '#A84FF0', fontWeight: '700' },
                  ]}
                >
                  {isCustom ? '맞춤 설정' : opt}
                </Text>
              </Pressable>

              {/* 맞춤설정 인라인 피커 */}
              {isCustom && customOpen && (
                <View
                  style={styles.inlinePickerInList}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onTouchStart={() => (pickerTouchingRef.current = true)}
                  onTouchEnd={() =>
                    setTimeout(() => (pickerTouchingRef.current = false), 0)
                  }
                >
                  <View style={{ height: 8 }} />

                  <View style={styles.inlinePickerRow}>
                    {/* 시간 */}
                    <View style={styles.inlinePickerBox}>
                      <Picker
                        selectedValue={customHour}
                        onValueChange={(v) => {
                          setCustomHour(v)
                          setRemindValue('맞춤 설정')
                        }}
                        style={styles.inlinePicker}
                        itemStyle={styles.inlinePickerItem}
                      >
                        {HOURS.map((h) => (
                          <Picker.Item key={h} label={`${h}시간`} value={h} />
                        ))}
                      </Picker>
                    </View>

                    {/* 분 */}
                    <View style={styles.inlinePickerBox}>
                      <Picker
                        selectedValue={customMinute}
                        onValueChange={(v) => {
                          setCustomMinute(v)
                          setRemindValue('맞춤 설정')
                        }}
                        style={styles.inlinePicker}
                        itemStyle={styles.inlinePickerItem}
                      >
                        {MINUTES.map((m) => (
                          <Picker.Item key={m} label={`${m}분`} value={m} />
                        ))}
                      </Picker>
                    </View>

                    <Text style={styles.inlineSuffix}>전</Text>
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </View>
    )}
  </>
)}

<View style={styles.sep} />

{/* 라벨 */}
<View style={[styles.row, { alignItems: 'center' }]}>
  <Text style={[styles.label, { marginTop: 4 }]}>라벨</Text>

  <View
    style={{
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    }}
  >
    {/* 선택된 라벨 칩들 */}
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        maxWidth: 210,
        flexShrink: 1,
      }}
    >
      {selectedLabelIds.map((id) => {
        const item = labels.find((l) => l.id === id)
        if (!item) return null
        return (
          <LabelChip
            key={id}
            title={item.title}
            onRemove={() =>
              setSelectedLabelIds((prev) => prev.filter((x) => x !== id))
            }
          />
        )
      })}
    </View>

    {/* 라벨 선택 버튼 */}
    <Pressable
      style={[styles.remindButton, { alignSelf: 'flex-end' }]}
      ref={labelBtnRef}
      onPress={() => {
labelBtnRef.current?.measureInWindow?.(
  (x: number, y: number, w: number, h: number) => {
    setLabelAnchor({ x, y, w, h })
    setLabelModalOpen(true)
  }
)
      }}
      hitSlop={8}
    >
      {!selectedLabelIds.length && (
        <Text style={[styles.dropdownText, { color: '#B3B3B3' }]}>
          없음
        </Text>
      )}
      <Down
        width={10}
        height={10}
        color={selectedLabelIds.length ? '#333' : '#B3B3B3'}
      />
    </Pressable>
  </View>
</View>

{/* 라벨 모달 */}
{labelModalOpen && (
  <LabelPickerModal
    visible
    all={labels}
    selected={selectedLabelIds}
    onChange={(nextIds) => setSelectedLabelIds(nextIds)}
    onRequestClose={() => setLabelModalOpen(false)}
    anchor={labelAnchor}
    onCreateLabel={handleCreateLabel}
  />
)}

<View style={styles.sep} />

      {/* 메모 */}
      <View style={{ marginTop: 12}}>
        <Text style={styles.label}>메모</Text>
        <TextInput
          placeholder="메모를 입력하세요"
          placeholderTextColor="#b9b9b9"
          multiline
          value={memo}
          onChangeText={setMemo}
        />
      </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 342,
    height: 573,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    overflow: 'hidden',
  },

  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    paddingBottom: 8,
    marginBottom: 16,
  },

  tabRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },

  tabActive: {
    borderBottomColor: colors.primary.main,
  },

  tabText: {
    fontSize: 15,
    color: '#777',
    fontWeight: '600',
  },

  tabTextActive: {
    color: colors.primary.main,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },

  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  datePress: {
    paddingVertical: 4,
  },

  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    marginBottom: 30,
  },

  picker: {
    width: 90,
    height: 150,
  },

  memo: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    minHeight: 80,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },

  submitButton: {
    marginTop: 24,
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},
dateBlock: {
  paddingVertical: 12,

},
dateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 6,
},
inlineRow: { flexDirection: 'row', alignItems: 'baseline' },

num: { 
  fontSize: 18,
  fontWeight: '700',
  color: '#222',
},

unit: { 
  fontSize: 18,
  fontWeight: '700',
  color: '#222',
  marginLeft: 1
},

week: { 
  fontSize: 18,
  fontWeight: '700',
  color: '#222',
},

spacer: { width: 6 },
monthHeader: {
  fontFamily: 'SF Pro',
  fontWeight: '700',
  fontSize: 14,
  lineHeight: 20,
  textAlign: 'center',
  color: '#222',
  marginBottom: 12,
},

weekHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
  paddingHorizontal: 4,
},

weekHeaderText: {
  width: '14.2%',
  textAlign: 'center',
  fontFamily: 'SF Pro',
  fontWeight: '400',
  fontSize: 10,
  lineHeight: 20,
  color: '#B3B3B3',
},
timeInlineRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 10,
},

timeText: {
  fontFamily: 'SF Pro',
  fontWeight: '700',
  fontSize: 14,
  color: '#333333',
},

timeArrow: {
  marginHorizontal: 12,
  fontSize: 12,
  color: '#444',
},
timeDivider: {
  height: 1,
  backgroundColor: '#f0f0f0',
  marginTop: 12,
  marginBottom: 12,
  marginLeft: -20,
  marginRight: -20,
},
timeTextActive: {
  color: colors.primary.main,
},

rowRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

remindButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 6,
  paddingVertical: 4,
},

remindTextBtn: {
  fontFamily: 'SF Pro',
  fontWeight: '600',
  fontSize: 14,
  marginRight: 4,
},

remindDropdown: {
  backgroundColor: '#fff',
  marginTop: 8,
},

remindItem: {
  paddingVertical: 14,
  paddingHorizontal: 8,
  alignItems: 'center',
  justifyContent: 'center',
},
remindItemDivider: {
  borderBottomWidth: 1,
  borderBottomColor: '#F2F2F2',
},

remindItemText: {
  fontFamily: 'SF Pro',
  fontSize: 14,
  color: '#444',
},

remindSelectedBg: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#EDEDED', 
  borderRadius: 12,          
  zIndex: -1,
},

inlinePickerInList: {
  backgroundColor: 'transparent',
  paddingBottom: 0,
  borderBottomWidth: 0,
},

inlinePickerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

inlinePickerBox: {
  width: 100,
  height: 140,
  marginHorizontal: 6,
  backgroundColor: '#fff',
  overflow: 'hidden',
},

inlinePicker: {
  width: 100,
  height: 140,
},

inlinePickerItem: {
  fontSize: 14,
  fontFamily: 'SF Pro',
  color: '#333',
},

inlineSuffix: {
  fontFamily: 'SF Pro',
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
  marginLeft: 4,
},

sep: {
  height: 1,
  backgroundColor: '#f3f3f3',
  marginVertical: 12,
  marginLeft: -20,
  marginRight: -20,
},
dropdownText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
},
endDate: {
  marginTop: 4,
},
monthlyGroup: {
  backgroundColor: '#F5F5F5',
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 8,
},
monthlyInnerItem: {
  paddingVertical: 16,
  paddingHorizontal: 16,
  alignItems: 'center',
  justifyContent: 'center',
},

monthlyInnerItemSelected: {
  backgroundColor: '#F7EBFF',
},

monthlyDivider: {
  height: 1,
  backgroundColor: '#E5E5E5',
},

monthlyInnerItemText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#333',
},

monthlyInnerItemTextSelected: {
  color: '#A84FF0',
  fontWeight: '700',
},
})