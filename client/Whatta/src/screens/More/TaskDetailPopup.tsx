import React, { useState, useRef, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import InlineCalendar from '@/components/lnlineCalendar'
import Xbutton from '@/assets/icons/x.svg'
import Check from '@/assets/icons/check.svg'
import Down from '@/assets/icons/down.svg'
import LabelChip from '@/components/LabelChip'
import LabelPickerModal, { UiLabel } from '@/components/LabelPicker'
import { Picker } from '@react-native-picker/picker'
import { useLabels } from '@/providers/LabelProvider'
import { http } from '@/lib/http'
import { bus } from '@/lib/eventBus'
import { ensureNotificationPermissionForToggle } from '@/lib/fcm'
import CreateModeTypeStep from '@/screens/More/CreateModeTypeStep'
import CreateEventDetailStep from '@/screens/More/CreateEventDetailStep'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

const H_PAD = 18

type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
}

type TaskFormValue = {
  title: string
  hasDate: boolean
  date?: Date
  hasTime: boolean
  time?: Date
  labels: number[]
  memo: string
  reminderNoti: { day: number; hour: number; minute: number } | null
}

type TaskDetailPopupProps = {
  visible: boolean
  mode?: 'create' | 'edit'
  source?: 'Day' | 'Week' | 'Month'
  initialTitle?: string
  initialDate?: Date
  initialHasDate?: boolean
  initialHasTime?: boolean
  initialTime?: Date
  initialLabelIds?: number[]
  labels?: UiLabel[]
  onClose: () => void
  onSave: (value: TaskFormValue) => void
  onDelete?: () => void
  taskId?: string
  initialTask?: any
}

const CustomToggle = ({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) => {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      hitSlop={20}
      style={{
        width: 51,
        height: 31,
        borderRadius: 26,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: disabled ? '#E3E5EA' : value ? '#B04FFF' : '#B3B3B3',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 25,
          backgroundColor: '#fff',
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </Pressable>
  )
}

// 요일 텍스트 + 날짜 표현용
const WEEKDAY = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
] as const
const kDateText = (d: Date) => {
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAY[d.getDay()]
  return `${month}월 ${day}일 ${weekday}`
}

// 선택된 시간 표시용 (AM/PM)
const formatTimeLabel = (date: Date) => {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? 'AM' : 'PM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

const withSameDay = (base: Date, source: Date) => {
  const next = new Date(base)
  next.setHours(source.getHours(), source.getMinutes(), 0, 0)
  return next
}

// 추가: 일정 상세 알림 preset 타입 그대로 가져옴
type ReminderPreset = {
  id: string
  day: number
  hour: number
  minute: number
  label: string
}

export default function TaskDetailPopup(props: TaskDetailPopupProps) {
  const {
    visible,
    mode = 'create',
    source,
    initialTitle = '',
    initialDate,
    initialHasDate = true,
    initialHasTime = false,
    initialTime,
    initialLabelIds = [],
    onClose,
    onSave,
    onDelete,
    taskId,
    initialTask,
  } = props

  const insets = useSafeAreaInsets()
  const { width: W, height: H } = Dimensions.get('window')
  const MARGIN = 10
  const SHEET_W = Math.min(W - MARGIN, 350)
  const MAX_H = H - (insets.top + insets.bottom) - MARGIN * 2
  const SHEET_H = Math.min(569, MAX_H)
  const HEADER_H = 40
  const KEYBOARD_OFFSET = insets.top + MARGIN + HEADER_H
  const [showCreateIntro, setShowCreateIntro] = useState(mode === 'create')
  const [createTypeSelected, setCreateTypeSelected] = useState<'event' | 'task' | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const scrollRef = useRef<ScrollView>(null)
  const titleRef = useRef<TextInput>(null)

  // 폼 상태
  const [title, setTitle] = useState(initialTitle)
  const [hasDate, setHasDate] = useState(false)
  const [hasTime, setHasTime] = useState(false)

  const [date, setDate] = useState<Date>(initialDate ?? new Date())
  const [time, setTime] = useState<Date>(initialTime ?? new Date())

  const [labelIds, setLabelIds] = useState<number[]>(initialLabelIds)
  const [memo, setMemo] = useState('')
  const [taskDueOn, setTaskDueOn] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null)
  const [detailStart, setDetailStart] = useState<Date>(new Date())
  const [detailEnd, setDetailEnd] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000))
  const [invalidEndTime, setInvalidEndTime] = useState(false)
  const [invalidEndPreview, setInvalidEndPreview] = useState<Date | null>(null)
  const [repeatOn, setRepeatOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>(
    'daily',
  )
  const [repeatEvery, setRepeatEvery] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState<'day' | 'week' | 'month'>('day')
  const [monthlyOpt, setMonthlyOpt] = useState<'byDate' | 'byNthWeekday' | 'byLastWeekday'>(
    'byDate',
  )
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null)

  // 알림(리마인드) state
  const [remindOn, setRemindOn] = useState(false)
  const [remindOpen, setRemindOpen] = useState(false)
  const [remindValue, setRemindValue] = useState<'custom' | ReminderPreset | null>(null) // 추가

  const [customOpen, setCustomOpen] = useState(false)
  const [customHour, setCustomHour] = useState(0)
  const [customMinute, setCustomMinute] = useState(10)

  const [reminderPresets, setReminderPresets] = useState<
    { id: string; day: number; hour: number; minute: number }[]
  >([])

  // day, h, m
  const formatCustomLabel = (h: number, m: number, day: number = 0) => {
    const dayText = day >= 2 ? `${day}일 전` : day === 1 ? '전날' : '당일'
    const hh = h > 0 ? `${h}시간` : ''
    const mm = m > 0 ? `${m}분` : ''
    const body = [hh, mm].filter(Boolean).join(' ')
    const timeText = body.length ? `${body} 전` : '0분 전'
    return `${dayText} ${timeText}`
  }

  // 라벨 피커 모달용
  type Anchor = { x: number; y: number; w: number; h: number }
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelAnchor, setLabelAnchor] = useState<Anchor | null>(null)
  const labelBtnRef = useRef<View>(null)
  const { labels: globalLabels } = useLabels()
  const labels = globalLabels ?? []
  const MAX_SELECTED_LABELS = 10
  const MAX_LABELS = 10
  const isFull = labels.length >= MAX_LABELS

  // 피커 열림 상태
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [isPickerTouching, setIsPickerTouching] = useState(false)
  const reminderPresetLoadedRef = useRef(false)
  const [reminderPresetVersion, setReminderPresetVersion] = useState(0)
  const pickerTouchHandlers = {
    onTouchStart: () => setIsPickerTouching(true),
    onTouchEnd: () => setIsPickerTouching(false),
    onTouchCancel: () => setIsPickerTouching(false),
  }

  // 피커가 터치 중 닫히면 스크롤 잠금이 남을 수 있음
  // 1. 팝업 전체 visible 꺼질 때
  useEffect(() => {
    if (!visible) setIsPickerTouching(false)
  }, [visible])

  // 2. 시간 피커 timeOpen 닫힐 때
  useEffect(() => {
    if (!timeOpen) setIsPickerTouching(false)
  }, [timeOpen])

  // 3. 알림 맞춤 피커 customOpen 닫히거나 remindOn 꺼질 때
  useEffect(() => {
    if (!customOpen || !remindOn) setIsPickerTouching(false)
  }, [customOpen, remindOn])

  // 알림 preset 서버에서 불러오기
  useEffect(() => {
    if (!visible) return
    if (reminderPresetLoadedRef.current) return
    let cancelled = false

    const fetchPresets = async () => {
      try {
        const res = await http.get('/user/setting/reminder')
        if (cancelled) return
        const presets = Array.isArray(res.data?.data) ? res.data.data : []
        setReminderPresets(presets)
        reminderPresetLoadedRef.current = true
      } catch (err) {
        if (cancelled) return
        console.log('❌ 리마인드 preset 불러오기 실패:', err)
      }
    }

    fetchPresets()
    return () => {
      cancelled = true
    }
  }, [visible, reminderPresetVersion])

  useEffect(() => {
    const onReminderMutated = () => {
      reminderPresetLoadedRef.current = false
      setReminderPresetVersion((v) => v + 1)
    }

    bus.on('reminder:mutated', onReminderMutated)
    return () => bus.off('reminder:mutated', onReminderMutated)
  }, [])

  // preset + '맞춤 설정' 옵션 구성
  const presetOptions = (reminderPresets ?? []).map((p) => ({
    type: 'preset' as const,
    ...p,
    label: formatCustomLabel(p.hour, p.minute, p.day),
  }))

  const remindOptions = [
    ...presetOptions,
    { type: 'custom' as const, label: '맞춤 설정' },
  ]
  const remindSelectedKey = remindValue === 'custom' ? 'custom' : remindValue?.id ?? null

  // reminderNoti 빌더
  function buildReminderNoti() {
    if (!remindOn || !remindValue) return null

    if (remindValue === 'custom') {
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
  }

  // 현재 custom 라벨
  const customLabel = formatCustomLabel(customHour, customMinute, 0)

  // 버튼에 뜨는 표시용 텍스트
  const displayRemind = React.useMemo(() => {
    if (!remindOn || !remindValue) return ''
    if (remindValue === 'custom') return customLabel
    return (
      remindValue.label ??
      formatCustomLabel(remindValue.hour, remindValue.minute, remindValue.day)
    )
  }, [remindOn, remindValue, customLabel])

  // visible / initialTask 바뀔 때마다 폼 초기화
  useEffect(() => {
    if (!visible) return
    if (!initialTask) return

    // 기존 값 적용
    setTitle(initialTask.title ?? '')

    const hasDateFlag = !!initialTask.placementDate
    const hasTimeFlag = !!initialTask.placementTime

    setHasDate(hasDateFlag)
    setHasTime(hasTimeFlag)

    setDate(hasDateFlag ? new Date(initialTask.placementDate) : new Date())

    setTime(
      hasTimeFlag ? new Date(`2020-01-01T${initialTask.placementTime}`) : new Date(),
    )

    const dueRaw = initialTask.dueDateTime
    if (dueRaw) {
      const parsed = new Date(dueRaw)
      if (!Number.isNaN(parsed.getTime())) {
        setTaskDueOn(true)
        setTaskDueDate(parsed)
      } else {
        setTaskDueOn(false)
        setTaskDueDate(null)
      }
    } else {
      setTaskDueOn(false)
      setTaskDueDate(null)
    }

    if (Array.isArray(initialTask.labels)) {
      const first = initialTask.labels[0]

      if (typeof first === 'number') {
        setLabelIds(initialTask.labels as number[])
      } else if (typeof first === 'object' && first !== null) {
        setLabelIds((initialTask.labels as { id: number }[]).map((lb) => lb.id))
      } else {
        setLabelIds([])
      }
    } else {
      setLabelIds([])
    }

    setMemo(initialTask.content ?? '')

    setRemindOn(false)
    setRemindValue(null)
    setCustomOpen(false)
    setRemindOpen(false)

    const baseDate = hasDateFlag && initialTask.placementDate
      ? new Date(initialTask.placementDate)
      : new Date()
    const startAt = new Date(baseDate)
    if (hasTimeFlag && initialTask.placementTime) {
      const [hh, mm] = String(initialTask.placementTime)
        .split(':')
        .map((v: string) => Number(v))
      if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
        startAt.setHours(hh, mm, 0, 0)
      }
    } else {
      startAt.setHours(9, 0, 0, 0)
    }
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
    setDetailStart(startAt)
    setDetailEnd(endAt)
    setInvalidEndTime(false)
    setInvalidEndPreview(null)
  }, [visible, initialTask])

  // reminder preset 로딩/변경 시 리마인더 값만 동기화
  useEffect(() => {
    if (!visible) return
    if (!initialTask) return

    const rn = initialTask.reminderNoti
    if (!rn || !hasDate || !hasTime) {
      setRemindOn(false)
      setRemindValue(null)
      setCustomOpen(false)
      setRemindOpen(false)
      return
    }

    setRemindOn(true)

    const matched = reminderPresets.find(
      (p) => p.day === rn.day && p.hour === rn.hour && p.minute === rn.minute,
    )

    if (matched) {
      setRemindValue({
        ...(matched as any),
        label: formatCustomLabel(matched.hour, matched.minute, matched.day),
      })
      setCustomOpen(false)
      return
    }

    setRemindValue('custom')
    setCustomHour(rn.hour ?? 0)
    setCustomMinute(rn.minute ?? 0)
    setCustomOpen(true)
  }, [visible, initialTask, reminderPresets, hasDate, hasTime])

  useEffect(() => {
    if (!visible) return
    if (mode !== 'create') return
    if (initialTask) return

    const baseDate = initialDate ?? new Date()
    const baseTime = initialTime ?? new Date(baseDate)
    const startAt = new Date(baseDate)
    if (initialHasDate && initialHasTime && initialTime) {
      startAt.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0)
    } else {
      startAt.setHours(9, 0, 0, 0)
    }

    setDate(baseDate)
    setHasDate(initialHasDate)
    setHasTime(initialHasDate ? initialHasTime : false)
    if (initialTime) {
      setTime(initialTime)
    } else {
      setTime(startAt)
    }
    setDetailStart(startAt)
    setDetailEnd(new Date(startAt.getTime() + 60 * 60 * 1000))
    setInvalidEndTime(false)
    setInvalidEndPreview(null)
  }, [visible, mode, initialTask, initialDate, initialHasDate, initialHasTime, initialTime])

  useEffect(() => {
    if (!visible) return
    if (mode !== 'create') return
    if (!labels.length) return // 라벨 목록이 아직 없으면 패스

    setLabelIds((prev) => {
      if (prev.length) return prev
      const defaultLabel = labels.find((l) => l.title === '할 일')
      return defaultLabel ? [defaultLabel.id] : prev
    })
  }, [visible, mode, labels])

  // 팝업 열고 닫을 때 펼침 UI는 항상 닫힌 상태로 초기화
  useEffect(() => {
    setDateOpen(false)
    setTimeOpen(false)
    setRemindOpen(false)
    setCustomOpen(false)
    setLabelModalOpen(false)
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setShowCreateIntro(mode === 'create')
    setCreateTypeSelected(null)
  }, [visible, mode])

  // 알림 on 가능 조건 (날짜+시간 둘다 있어야 함)
  const remindEligible = hasDate && hasTime

  // 날짜/시간이 꺼지면 알림도 강제 off
  useEffect(() => {
    if (!remindEligible) {
      setRemindOn(false)
      setRemindOpen(false)
      setRemindValue(null)
      setCustomOpen(false)
    }
  }, [remindEligible])

  const handleSave = () => {
    if (hasTime && (invalidEndTime || detailEnd.getTime() < detailStart.getTime())) {
      Alert.alert('저장 실패', '종료 시간은 시작 시간보다 이후여야 합니다.')
      return
    }

    const value: TaskFormValue = {
      title,
      memo,
      hasDate,
      date: hasDate ? date : undefined,
      hasTime,
      time: hasTime ? detailStart : undefined,
      labels: labelIds.slice(0, MAX_SELECTED_LABELS),
      reminderNoti: buildReminderNoti(), // 추가
    }

    onSave(value)
  }

  const handleDeletePress = () => {
    if (!onDelete) return
    setDeleteConfirmOpen(true)
  }

  const handleCreateLabel = async (title: string): Promise<UiLabel> => {
    const res = await http.post('/user/setting/label', { title })
    bus.emit('label:mutated')
    return { id: res.data.data.id, title }
  }

  const handleSelectRemindOption = (opt: any) => {
    if (opt.type === 'custom') {
      setRemindValue('custom')
      setCustomOpen((v) => !v)
      return
    }
    setRemindValue(opt as ReminderPreset)
    setCustomOpen(false)
    setRemindOpen(false)
  }

  const hasLabels = labelIds.length > 0
  const btnBaseColor = hasLabels ? '#333333' : '#B3B3B3'
  const btnText = hasLabels ? undefined : '없음'

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1 }} keyboardVerticalOffset={KEYBOARD_OFFSET}>
        <View
          style={[
            styles.overlay,
            { paddingTop: insets.top + MARGIN, paddingBottom: insets.bottom + MARGIN },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.boxShadow, { width: SHEET_W, height: SHEET_H }]}>
            <View style={styles.box}>
              {/* 헤더: X / 체크 */}
              <View style={[styles.header, mode === 'edit' && styles.headerEdit]}>
                {mode === 'edit' && onDelete ? (
                  <Pressable onPress={handleDeletePress} style={styles.deletePillBtn} hitSlop={10}>
                    <Text style={styles.deletePillText}>삭제</Text>
                  </Pressable>
                ) : (
                  <TouchableOpacity onPress={onClose} hitSlop={20}>
                    <Xbutton width={12} height={12} color={'#808080'} />
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                onPress={() => {
                  if (showCreateIntro) {
                    const nextType = createTypeSelected ?? 'task'
                    if (nextType === 'event') {
                      if (!source) return
                      onClose()
                      requestAnimationFrame(() => {
                        bus.emit('popup:schedule:create', { source })
                      })
                      return
                    }
                    setShowCreateIntro(false)
                    return
                  }
                  handleSave()
                  }}
                >
                  <Check width={12} height={12} hitSlop={25} color={'#808080'} />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                {showCreateIntro ? (
                  <CreateModeTypeStep
                    title={title}
                    onChangeTitle={setTitle}
                    colors={['#B04FFF']}
                    selectedColorIndex={0}
                    onSelectColorIndex={() => {}}
                    selectedType={createTypeSelected}
                    onSelectType={(value) => {
                      setCreateTypeSelected(value)
                    }}
                  />
                ) : (
                  <CreateEventDetailStep
                    title={title}
                    onChangeTitle={setTitle}
                    memo={memo}
                    onChangeMemo={setMemo}
                    colors={['#B04FFF']}
                    selectedColorIndex={0}
                    onSelectColorIndex={() => {}}
                    selectedType={'task'}
                    onSelectType={() => {}}
                    start={detailStart}
                    end={detailEnd}
                    endDisplay={invalidEndPreview}
                    onPressDateBox={() => {}}
                    onChangeStartTime={(next) => {
                      const nextStart = withSameDay(hasDate ? date : detailStart, next)
                      const nextEnd = new Date(nextStart)
                      nextEnd.setHours((nextStart.getHours() + 1) % 24, nextStart.getMinutes(), 0, 0)
                      const wrappedPastMidnight = nextEnd.getTime() < nextStart.getTime()
                      setDetailStart(nextStart)
                      setDetailEnd(nextEnd)
                      setInvalidEndTime(wrappedPastMidnight)
                      setInvalidEndPreview(wrappedPastMidnight ? nextEnd : null)
                      setHasTime(true)
                      setTime(nextStart)
                    }}
                    onChangeEndTime={(next) => {
                      const nextEnd = withSameDay(hasDate ? date : detailStart, next)
                      if (nextEnd.getTime() < detailStart.getTime()) {
                        setInvalidEndTime(true)
                        setInvalidEndPreview(nextEnd)
                        return
                      }
                      setInvalidEndTime(false)
                      setInvalidEndPreview(null)
                      setDetailEnd(nextEnd)
                    }}
                    invalidEndTime={invalidEndTime}
                    timeOn={hasTime}
                    timeDisabled={!hasDate}
                    onToggleTime={(next) => {
                      if (next && !hasDate) {
                        Alert.alert('시간 설정 불가', '날짜를 먼저 설정해주세요.')
                        return
                      }
                      setHasTime(next)
                      if (next) {
                        const t = new Date(detailStart)
                        t.setSeconds(0, 0)
                        const nextEnd = new Date(t)
                        nextEnd.setHours((t.getHours() + 1) % 24, t.getMinutes(), 0, 0)
                        const wrappedPastMidnight = nextEnd.getTime() < t.getTime()
                        setDetailStart(t)
                        setDetailEnd(nextEnd)
                        setTime(t)
                        setInvalidEndTime(wrappedPastMidnight)
                        setInvalidEndPreview(wrappedPastMidnight ? nextEnd : null)
                      } else {
                        setInvalidEndTime(false)
                        setInvalidEndPreview(null)
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
                    repeatWeekdays={[]}
                    onChangeRepeatWeekdays={() => {}}
                    repeatEndDate={repeatEndDate}
                    onChangeRepeatEndDate={setRepeatEndDate}
                    remindOn={remindOn}
                    remindDisabled={!remindEligible}
                    onToggleRemind={async (next) => {
                      if (next) {
                        if (!remindEligible) {
                          Alert.alert('알림 설정 불가', '날짜와 시간을 먼저 설정해주세요.')
                          return
                        }
                        const granted = await ensureNotificationPermissionForToggle()
                        if (!granted) return
                      }
                      setRemindOn(next)
                    }}
                    remindOpen={remindOpen}
                    onSetRemindOpen={setRemindOpen}
                    remindDisplayText={displayRemind}
                    remindOptions={remindOptions as any}
                    remindSelectedKey={remindSelectedKey}
                    onSelectRemindOption={handleSelectRemindOption}
                    customOpen={customOpen}
                    onSetCustomOpen={setCustomOpen}
                    customHour={customHour}
                    customMinute={customMinute}
                    onChangeCustomHour={setCustomHour}
                    onChangeCustomMinute={setCustomMinute}
                    labels={labels}
                    selectedLabelIds={labelIds}
                    labelMaxSelected={MAX_SELECTED_LABELS}
                    onChangeSelectedLabelIds={(ids) => setLabelIds(ids.slice(0, MAX_SELECTED_LABELS))}
                    onCreateLabel={handleCreateLabel}
                    taskDate={hasDate ? date : null}
                    onChangeTaskDate={(next) => {
                      if (next) {
                        const nextStart = new Date(detailStart)
                        nextStart.setFullYear(next.getFullYear(), next.getMonth(), next.getDate())
                        const nextEnd = new Date(detailEnd)
                        nextEnd.setFullYear(next.getFullYear(), next.getMonth(), next.getDate())
                        setHasDate(true)
                        setDate(next)
                        setDetailStart(nextStart)
                        setDetailEnd(nextEnd)
                        if (hasTime) {
                          setTime(nextStart)
                        }
                        setInvalidEndTime(false)
                        setInvalidEndPreview(null)
                        if (taskDueDate && taskDueDate.getTime() < next.getTime()) {
                          setTaskDueDate(next)
                        }
                        return
                      }
                      setHasDate(false)
                      setHasTime(false)
                      setInvalidEndTime(false)
                      setInvalidEndPreview(null)
                      setRemindOn(false)
                      setRemindOpen(false)
                      setCustomOpen(false)
                      setTaskDueOn(false)
                      setTaskDueDate(null)
                    }}
                    taskDueOn={taskDueOn}
                    onChangeTaskDueOn={setTaskDueOn}
                    taskDueDate={taskDueDate}
                    onChangeTaskDueDate={setTaskDueDate}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      {deleteConfirmOpen && (
        <View style={styles.deleteOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDeleteConfirmOpen(false)}
          />
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>할 일을 삭제할까요?</Text>
            <View style={styles.deleteRow}>
              <Pressable
                style={[styles.deleteActionBtn, styles.deleteCancelBtn]}
                onPress={() => setDeleteConfirmOpen(false)}
              >
                <Text style={styles.deleteCancelTxt}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteActionBtn, styles.deleteConfirmBtn]}
                onPress={() => {
                  setDeleteConfirmOpen(false)
                  onDelete?.()
                }}
              >
                <Text style={styles.deleteConfirmTxt}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxShadow: {
    borderRadius: 20,
    shadowColor: '#8D99A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },
  box: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 40,
    marginTop: 3,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerEdit: {
    marginTop: 12,
  },
  deletePillBtn: {
    width: 40,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.feedback.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePillText: {
    ...ts('body1'),
    color: colors.feedback.error,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCard: {
    width: 302,
    height: 152,
    borderRadius: 20,
    backgroundColor: colors.background.bg1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 20,
    shadowColor: '#8D99A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },
  deleteTitle: {
    ...ts('label1'),
    fontWeight: '700',
    color: colors.text.text1,
  },
  deleteRow: {
    width: 302,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 16,
  },
  deleteActionBtn: {
    width: 119,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtn: {
    backgroundColor: colors.background.bg1,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
  },
  deleteConfirmBtn: {
    backgroundColor: colors.brand.primary,
  },
  deleteCancelTxt: {
    ...ts('label1'),
    color: colors.text.text3,
  },
  deleteConfirmTxt: {
    ...ts('label1'),
    color: colors.text.text1w,
  },
  body: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  titleHeader: {
    borderBottomColor: '#B3B3B3',
    borderBottomWidth: 0.3,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
    justifyContent: 'space-around',
  },
  titleInput: {
    flex: 1,
    borderBottomColor: '#EEEEEE',
    marginLeft: 6,
    fontSize: 22,
    fontWeight: '700',
    paddingLeft: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 26,
    borderRadius: 20,
    padding: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  sep: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
  },
  dateDisplayWrap: {
    marginTop: 14,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBigText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B04FFF',
    paddingRight: 10,
  },
  timeInlineWrap: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxWrap: {
    width: 180,
    height: 159,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 8,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  alarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remindTextBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  remindDropdown: {
    width: 278,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    overflow: 'hidden',
    marginTop: 6,
  },
  remindItem: {
    height: 44,
    width: 278,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  remindItemDivider: {
    borderBottomColor: '#B3B3B3',
    borderBottomWidth: 0.3,
  },
  remindItemText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
  remindSelectedBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 38,
    width: 278,
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
    alignSelf: 'center',
  },
  remindPickerWrap: {
    paddingVertical: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  remindPickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    color: '#333',
  },
  remindPickerColon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 6,
  },
  remindPickerSuffix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 6,
  },

  memoSection: {
    marginTop: 3,
  },
  memoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  memoBox: {
    minHeight: 88,
    fontSize: 14,
    color: '#222222',
    backgroundColor: '#FFFFFF',
  },
})
