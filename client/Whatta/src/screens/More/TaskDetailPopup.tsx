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
  const SHEET_W = Math.min(W - MARGIN, 342)
  const MAX_H = H - (insets.top + insets.bottom) - MARGIN * 2
  const SHEET_H = Math.min(573, MAX_H)
  const HEADER_H = 40
  const KEYBOARD_OFFSET = insets.top + MARGIN + HEADER_H

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

  // 알림(리마인드) state
  const [remindOn, setRemindOn] = useState(false)
  const [remindOpen, setRemindOpen] = useState(false)
  const [remindValue, setRemindValue] = useState<'custom' | ReminderPreset | null>(null) // 추가

  const [customOpen, setCustomOpen] = useState(false)
  const [customHour, setCustomHour] = useState(1)
  const [customMinute, setCustomMinute] = useState(0)

  const [reminderPresets, setReminderPresets] = useState<
    { id: string; day: number; hour: number; minute: number }[]
  >([])

  // h,m을 사람이 읽는 "h시간 m분 전"
  const formatCustomLabel = (h: number, m: number) => {
    const hh = h > 0 ? `${h}시간` : ''
    const mm = m > 0 ? `${m}분` : ''
    const body = [hh, mm].filter(Boolean).join(' ')
    return body.length ? `${body} 전` : '0분 전'
  }

  // 라벨 피커 모달용
  type Anchor = { x: number; y: number; w: number; h: number }
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelAnchor, setLabelAnchor] = useState<Anchor | null>(null)
  const labelBtnRef = useRef<View>(null)
  const { labels: globalLabels } = useLabels()
  const labels = globalLabels ?? []
  const MAX_LABELS = 10
  const isFull = labels.length >= MAX_LABELS

  // 피커 열림 상태
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  // 알림 preset 서버에서 불러오기
  useEffect(() => {
    if (!visible) return

    const fetchPresets = async () => {
      try {
        const res = await http.get('/user/setting/reminder')
        setReminderPresets(res.data.data)
      } catch (err) {
        console.log('❌ 리마인드 preset 불러오기 실패:', err)
      }
    }

    fetchPresets()
  }, [visible])

  // preset + '맞춤 설정' 옵션 구성
  const presetOptions = (reminderPresets ?? []).map((p) => ({
    type: 'preset' as const,
    ...p,
    label: formatCustomLabel(p.hour, p.minute),
  }))

  const remindOptions = [
    ...presetOptions,
    { type: 'custom' as const, label: '맞춤 설정' },
  ]

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
  const customLabel = formatCustomLabel(customHour, customMinute)

  // 버튼에 뜨는 표시용 텍스트
  const displayRemind = React.useMemo(() => {
    if (!remindOn || !remindValue) return ''
    if (remindValue === 'custom') return customLabel
    return remindValue.label ?? formatCustomLabel(remindValue.hour, remindValue.minute)
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

    // 서버에서 받은 reminderNoti 초기 반영
    const rn = initialTask.reminderNoti
    if (rn && hasDateFlag && hasTimeFlag) {
      // 날짜+시간 둘다 있어야만 on 가능
      setRemindOn(true)

      // preset에서 동일 값 찾기
      const matched = reminderPresets.find(
        (p) => p.day === rn.day && p.hour === rn.hour && p.minute === rn.minute,
      )

      if (matched) {
        setRemindValue({
          ...(matched as any),
          label: formatCustomLabel(matched.hour, matched.minute),
        })
        setCustomOpen(false)
      } else {
        setRemindValue('custom')
        setCustomHour(rn.hour ?? 0)
        setCustomMinute(rn.minute ?? 0)
        setCustomOpen(true)
      }
    } else {
      setRemindOn(false)
      setRemindValue(null)
      setCustomOpen(false)
    }
  }, [visible, initialTask, reminderPresets])

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
    const value: TaskFormValue = {
      title,
      memo,
      hasDate,
      date: hasDate ? date : undefined,
      hasTime,
      time: hasTime ? time : undefined,
      labels: labelIds.slice(0, 3),
      reminderNoti: buildReminderNoti(), // 추가
    }

    onSave(value)
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
          <View style={[styles.box, { width: SHEET_W, height: SHEET_H }]}>
            {/* 헤더: X / 체크 */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} hitSlop={20}>
                <Xbutton width={12} height={12} color={'#808080'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave}>
                <Check width={12} height={12} hitSlop={25} color={'#808080'} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: H_PAD }}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets
              >
                {/* 제목 */}
                <View style={[styles.row, styles.titleHeader]}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center', minHeight: 42 }}
                    onPress={() => titleRef.current?.focus()}
                    hitSlop={10}
                  >
                    <TextInput
                      ref={titleRef}
                      placeholder="할 일을 입력하세요"
                      placeholderTextColor="#808080"
                      style={styles.titleInput}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </Pressable>
                </View>

                {/* 날짜 토글 */}
                <Pressable
                  style={[styles.row, { marginTop: 16 }]}
                  onPress={() => {
                    if (!hasDate) setHasDate(true)
                    setDateOpen((prev) => !prev)
                  }}
                >
                  <Text style={styles.label}>날짜</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasDate && <Text style={styles.dateBigText}>{kDateText(date)}</Text>}
                    <CustomToggle
                      value={hasDate}
                      onChange={(v) => {
                        setHasDate(v)
                        if (!v) {
                          setDateOpen(false)
                          setTimeOpen(false)
                          setHasTime(false)
                        }
                      }}
                    />
                  </View>
                </Pressable>

                {/* 날짜 선택 영역 */}
                {hasDate && dateOpen && (
                  <>
                    <View style={{ marginLeft: -H_PAD, marginRight: -H_PAD }}>
                      <InlineCalendar open value={date} onSelect={setDate} />
                    </View>
                    <View style={styles.sep} />
                  </>
                )}

                {/* 시간 토글 */}
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    if (!hasDate) setHasDate(true)
                    setTimeOpen((prev) => !prev)
                  }}
                >
                  <Text style={styles.label}>시간</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasTime && (
                      <Text style={styles.dateBigText}>{formatTimeLabel(time)}</Text>
                    )}
                    <CustomToggle
                      value={hasTime}
                      onChange={(v) => {
                        if (v && !hasDate) setHasDate(true)
                        setHasTime(v)
                        if (!v) setTimeOpen(false)
                        if (v) {
                          const t = new Date()
                          t.setHours(9)
                          t.setMinutes(0)
                          setTime(t)
                        }
                      }}
                    />
                  </View>
                </Pressable>

                {/* 시간 인라인 피커 */}
                {hasTime && timeOpen && (
                  <View style={{ marginTop: 9, marginBottom: 17, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {/* HOUR */}
                      <Picker
                        style={{ width: 90, height: 160 }}
                        selectedValue={
                          time.getHours() % 12 === 0 ? 12 : time.getHours() % 12
                        }
                        onValueChange={(v) => {
                          const t = new Date(time)
                          const isPM = t.getHours() >= 12

                          if (isPM) t.setHours(v === 12 ? 12 : v + 12)
                          else t.setHours(v === 12 ? 0 : v)

                          setTime(t)
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <Picker.Item key={h} label={String(h)} value={h} />
                        ))}
                      </Picker>

                      {/* MINUTE */}
                      <Picker
                        style={{ width: 90, height: 160 }}
                        selectedValue={time.getMinutes()}
                        onValueChange={(v) => {
                          const t = new Date(time)
                          t.setMinutes(v)
                          setTime(t)
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                          <Picker.Item
                            key={m}
                            label={String(m).padStart(2, '0')}
                            value={m}
                          />
                        ))}
                      </Picker>

                      {/* AM/PM */}
                      <Picker
                        style={{ width: 100, height: 160, fontSize: 13 }}
                        selectedValue={time.getHours() < 12 ? 'AM' : 'PM'}
                        onValueChange={(v) => {
                          const t = new Date(time)
                          const h = t.getHours()
                          if (v === 'AM') t.setHours(h >= 12 ? h - 12 : h)
                          else t.setHours(h < 12 ? h + 12 : h)
                          setTime(t)
                        }}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>
                )}

                <View style={styles.sep} />
                {/* 알림 */}
                <View style={styles.row}>
                  <Text style={styles.label}>알림</Text>
                  <View style={styles.rowRight}>
                    <Pressable
                      style={styles.alarmButton}
                      onPress={() => {
                        if (!remindOn) return
                        setRemindOpen((v) => !v)
                      }}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.remindTextBtn,
                          { color: remindOn ? '#333333' : '#B3B3B3' },
                        ]}
                      >
                        {displayRemind}
                      </Text>
                      <Down
                        width={10}
                        height={10}
                        color={remindOpen ? '#B04FFF' : remindOn ? '#333333' : '#B3B3B3'}
                      />
                    </Pressable>

                    <CustomToggle
                      value={remindOn}
                      disabled={!remindEligible}
                      onChange={async (v) => {
                        if (v && !remindEligible) {
                          Alert.alert(
                            '알림 설정 불가',
                            '날짜와 시간을 먼저 설정해주세요.',
                          )
                          setRemindOn(false)
                          return
                        }

                        if (!v) {
                          setRemindOn(false)
                          setRemindOpen(false)
                          setRemindValue(null)
                          setCustomOpen(false)
                          return
                        }

                        const ok = await ensureNotificationPermissionForToggle()
                        if (!ok) {
                          setRemindOn(false)
                          setRemindOpen(false)
                          return
                        }

                        setRemindOn(true)
                        setRemindOpen(true)
                      }}
                    />
                  </View>
                </View>
                {/* 드롭다운 리스트 */}
                {remindOn && remindOpen && (
                  <View style={styles.remindDropdown}>
                    {remindOptions.map((opt, idx) => {
                      const isLast = idx === remindOptions.length - 1
                      const selected =
                        opt.type === 'preset'
                          ? (remindValue as any)?.id === opt.id
                          : remindValue === 'custom'

                      return (
                        <View key={opt.type === 'preset' ? opt.id : 'custom'}>
                          <Pressable
                            style={[
                              styles.remindItem,
                              !isLast && styles.remindItemDivider,
                            ]}
                            onPress={() => {
                              if (opt.type === 'custom') {
                                setRemindValue('custom')
                                setCustomOpen((v) => !v)
                                return
                              }

                              setRemindValue(opt as any)
                              setCustomOpen(false)
                              setRemindOpen(false)
                            }}
                          >
                            {selected && (
                              <View
                                pointerEvents="none"
                                style={styles.remindSelectedBg}
                              />
                            )}
                            <Text
                              style={[
                                styles.remindItemText,
                                selected && { color: '#A84FF0', fontWeight: '700' },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        </View>
                      )
                    })}
                  </View>
                )}

                {/* 맞춤 설정 인라인 피커 */}
                {customOpen && remindOn && (
                  <View style={styles.remindPickerWrap}>
                    <View style={styles.remindPickerInner}>
                      {/* HOUR */}
                      <View style={styles.remindPickerBox}>
                        <Picker
                          selectedValue={customHour}
                          onValueChange={(v) => setCustomHour(v)}
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
                          onValueChange={(v) => setCustomMinute(v)}
                          style={styles.remindPicker}
                          itemStyle={styles.remindPickerItem}
                        >
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                            <Picker.Item
                              key={m}
                              label={String(m).padStart(2, '0')}
                              value={m}
                            />
                          ))}
                        </Picker>
                      </View>

                      <Text style={styles.remindPickerSuffix}>전</Text>
                    </View>
                  </View>
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
                    {/* 선택된 라벨 칩 */}
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 6,
                        maxWidth: 210,
                        flexShrink: 1,
                      }}
                    >
                      {labelIds.map((id) => {
                        const item = (labels ?? []).find((l) => l.id === id)
                        if (!item) return null
                        return (
                          <LabelChip
                            key={id}
                            title={item.title}
                            onRemove={() =>
                              setLabelIds((prev) => prev.filter((x) => x !== id))
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
                        labelBtnRef.current?.measureInWindow?.((x, y, w, h) => {
                          setLabelAnchor({ x, y, w, h })
                          setLabelModalOpen(true)
                        })
                      }}
                      hitSlop={8}
                    >
                      {btnText && (
                        <Text style={[styles.dropdownText, { color: btnBaseColor }]}>
                          {btnText}
                        </Text>
                      )}
                      <Down width={10} height={10} color={btnBaseColor} />
                    </Pressable>
                  </View>
                </View>

                {/* 라벨 피커 모달 */}
                {labelModalOpen && (
                  <LabelPickerModal
                    visible
                    all={labels ?? []}
                    selected={labelIds}
                    onChange={(ids) => setLabelIds(ids.slice(0, 3))}
                    onRequestClose={() => setLabelModalOpen(false)}
                    anchor={labelAnchor}
                    canAdd={!isFull}
                    onCreateLabel={async (title) => {
                      const res = await http.post('/user/setting/label', { title })
                      bus.emit('label:mutated')
                      return { id: res.data.data.id, title }
                    }}
                  />
                )}

                <View style={styles.sep} />

                {/* 메모 */}
                <View style={styles.memoSection}>
                  <View style={styles.memoLabelRow}>
                    <Text style={styles.memoLabel}>메모</Text>
                  </View>
                  <TextInput
                    placeholder="메모를 입력하세요"
                    placeholderTextColor="#B7B7B7"
                    value={memo}
                    onChangeText={setMemo}
                    multiline
                    textAlignVertical="top"
                    style={styles.memoBox}
                    onFocus={() => {
                      requestAnimationFrame(() =>
                        scrollRef.current?.scrollToEnd({ animated: true }),
                      )
                    }}
                  />
                </View>

                {/* 삭제 버튼 (편집 모드에서만) */}
                {mode === 'edit' && onDelete && (
                  <>
                    <View style={styles.sep} />
                    <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={13}>
                      <Text style={styles.deleteTxt}>삭제</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 342,
    height: 573,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    height: 40,
    marginTop: 3,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
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
  deleteBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  deleteTxt: {
    color: '#9D7BFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
