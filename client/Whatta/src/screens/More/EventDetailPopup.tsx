import React, { memo, useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
} from 'react-native'
import InlineCalendar from '@/components/lnlineCalendar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bus } from '@/lib/eventBus'
import { useLabels } from '@/providers/LabelProvider'
import { createLabel } from '@/api/label_api'
import Xbutton from '@/assets/icons/x.svg'
import Check from '@/assets/icons/check.svg'
import Arrow from '@/assets/icons/arrow.svg'
import Down from '@/assets/icons/down.svg'
import { Picker } from '@react-native-picker/picker'
import LabelChip from '@/components/LabelChip'
import LabelPickerModal from '@/components/LabelPicker'
import CreateModeTypeStep from '@/screens/More/CreateModeTypeStep'
import CreateEventDateStep from '@/screens/More/CreateEventDateStep'
import CreateEventDetailStep from '@/screens/More/CreateEventDetailStep'
import colors from '@/styles/colors'
import type { EventItem } from '@/api/event_api'
import { http } from '@/lib/http'
import { ensureNotificationPermissionForToggle } from '@/lib/fcm'
import {
  getActiveScheduleColorSetId,
  getScheduleColorSet,
  resolveSlotIndex,
  slotKey,
} from '@/styles/scheduleColorSets'
import { ts } from '@/styles/typography'

/** Toggle Props 타입 */
type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
}

type Panel = 'calendar' | 'start' | 'end' | null

const areSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()
const MemoCalendar = memo(
  InlineCalendar,
  (p, n) =>
    p.open === n.open && areSameDate(p.value, n.value) && p.markedDates === n.markedDates, // 💡 markedDates 비교 조건 추가
)

const H_PAD = 18
const FILELD_ROW_H = 44

type Anchor = { x: number; y: number; w: number; h: number }

type RouteParams = {
  mode?: 'create' | 'edit'
  eventId?: string
  initial?: Partial<EventItem>
}

type CreateStep = 'intro' | 'detail'

export default function EventDetailPopup({
  visible,
  eventId,
  mode = 'create',
  onClose,
  initial,
  source,
  initialCreateType = 'event',
}: {
  visible: boolean
  eventId: string | null
  mode?: 'edit' | 'create'
  onClose: () => void
  initial?: Partial<EventItem>
  source?: 'Day' | 'Week' | 'Month'
  initialCreateType?: 'event' | 'task'
}) {
  const [openCalendar, setOpenCalendar] = useState(false)
  const [whichDate, setWhichDate] = useState<'start' | 'end'>('start')
  const [openStartTime, setOpenStartTime] = useState(false)
  const [openEndTime, setOpenEndTime] = useState(false)
  const [isPickerTouching, setIsPickerTouching] = useState(false)
  const titleRef = useRef<TextInput>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const insets = useSafeAreaInsets()
  const MARGIN = 10

  const scrollRef = useRef<ScrollView>(null)
  const { width: W, height: H } = Dimensions.get('window')
  const SHEET_W = Math.min(W - MARGIN, 350)
  const MAX_H = H - (insets.top + insets.bottom) - MARGIN * 2
  const SHEET_H = Math.min(569, MAX_H)
  const HEADER_H = 40
  const KEYBOARD_OFFSET = insets.top + MARGIN + HEADER_H
  const sheetRef = useRef<View>(null)
  const isCreateFlow = mode === 'create' && !initial
  const [createStep, setCreateStep] = useState<CreateStep>(isCreateFlow ? 'intro' : 'detail')
  const [createTypeSelected, setCreateTypeSelected] = useState<'event' | 'task' | null>(null)
  const [editDatePicking, setEditDatePicking] = useState(false)
  // ── 컬러 팝오버 배치 옵션 ──
  const POPOVER_W = 105 // 팝오버 너비
  const POP_GAP = 8 // 버튼과 팝오버 사이 간격
  const RIGHT_ALIGN = true // true: 버튼 오른쪽에 맞춤, false: 왼쪽에 맞춤

  // 미세 이동(클램프 영향 안받도록 transform에 적용)
  const NUDGE_X = -5 // 왼(−) / 오른쪽(+)
  const NUDGE_Y = -50 // 위(−) / 아래(+)
  const [rangePhase, setRangePhase] = useState<'start' | 'end'>('start')

  // 컴포넌트 내부 state (모달 열릴 때 유지할 상태)
  const [rangeStart, setRangeStart] = useState<Date | undefined>(new Date()) // 초기: 오늘
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined)
  const today0 = new Date()
  today0.setHours(0, 0, 0, 0)

  // 맞춤 설정 인라인 시간 피커
  const [customOpen, setCustomOpen] = useState(false)
  const [customHour, setCustomHour] = useState(0) // 기본 10분 전
  const [customMinute, setCustomMinute] = useState(10)

  const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0~23
  const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,10,...55

  /** Custom Toggle */
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
          padding: 3, // ← thumb가 중앙에 위치하도록 여백 부여
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
            transform: [{ translateX: value ? 20 : 0 }], // ← thumb 좌우 이동 거리 조정
          }}
        />
      </Pressable>
    )
  }

  // day, h, m
  const formatCustomLabel = (h: number, m: number, day: number = 0) => {
    const dayText = day === 1 ? '전날' : '당일'
    const hh = h > 0 ? `${h}시간` : ''
    const mm = m > 0 ? `${m}분` : ''
    const body = [hh, mm].filter(Boolean).join(' ')
    const timeText = body.length ? `${body} 전` : '0분 전'
    return `${dayText} ${timeText}`
  }
  const pickerTouchHandlers = {
    onTouchStart: () => setIsPickerTouching(true),
    onTouchEnd: () => setIsPickerTouching(false),
    onTouchCancel: () => setIsPickerTouching(false),
  }

  // 요일 한글
  const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

  type KDateParts = { month: number; day: number; weekday: string }
  const kDateParts = (d: Date): KDateParts => ({
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: WEEKDAY[d.getDay()],
  })

  const colorBtnRef = useRef<View>(null)
  const [palette, setPalette] = useState<{
    visible: boolean
    x: number
    y: number
    w: number
    h: number
  }>({
    visible: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  })

  // 반복 탭 상태
  type RepeatMode = 'daily' | 'weekly' | 'monthly' | 'custom'
  type EndMode = 'none' | 'date'

  const [repeatMode, setRepeatMode] = useState<RepeatMode>('daily')
  const [repeatOpen, setRepeatOpen] = useState(false) // 첫번째 드롭다운(반복)

  const [endMode, setEndMode] = useState<EndMode>('none')
  const [endOpen, setEndOpen] = useState(false) // 두번째 드롭다운(마감일)
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null)
  const [endDateCustomOpen, setEndDateCustomOpen] = useState(false)

  const [eventData, setEventData] = useState<EventItem | null>(null)

  // 시간 타겟
  const [timeTarget, setTimeTarget] = useState<'start' | 'end'>('start')

  // 반복 맞춤 설정(인라인 피커)
  const [repeatCustomOpen, setRepeatCustomOpen] = useState(false)
  const [repeatEvery, setRepeatEvery] = useState(1) // 왼쪽 숫자(1~6)
  type RepeatUnit = 'day' | 'week' | 'month'
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>('week') // 오른쪽 단위
  const REPEAT_NUMS = [1, 2, 3, 4, 5, 6]
  const REPEAT_UNITS: { k: RepeatUnit; label: string }[] = [
    { k: 'day', label: '일' },
    { k: 'week', label: '주' },
    { k: 'month', label: '월' },
  ]
  useEffect(() => {
    if (!repeatOpen) {
      setMonthlyOpen(false)
      setRepeatCustomOpen(false)
    }
  }, [repeatOpen])

  const formatRepeatCustom = (n: number, u: RepeatUnit) =>
    `${n}${u === 'day' ? '일' : u === 'week' ? '주' : '월'}마다`

  const repeatLabel = (m: RepeatMode) =>
    m === 'daily'
      ? '매일'
      : m === 'weekly'
        ? '매주'
        : m === 'monthly'
          ? '매월'
          : '맞춤 설정'

  const endLabel = (m: EndMode, d: Date | null) => {
    if (m === 'none') return '마감일'
    if (d) {
      const s = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      return s
    }
    return '날짜 선택'
  }

  // 로컬 yyyy-mm-dd
  const ymdLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 로컬 시간을 HH:mm:ss 로
  const hms = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  // 사람이 읽는 시간(오전/오후 h:mm)
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
  // null/undefined 필드 제거
  const stripNil = <T extends Record<string, any>>(obj: T): T =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
    ) as T

  const [start, setStart] = useState(new Date())

  const buildBasePayload = () => {
    const key = slotKey(selectedSlot)
    const reminderNoti = buildReminderNoti() // 최신 알림 값 계산

    const base = {
      title: scheduleTitle,
      content: memo ?? '',
      labels: selectedLabelIds.length ? selectedLabelIds : [],
      startDate: ymdLocal(start),
      endDate: ymdLocal(end),
      startTime: timeOn ? hms(start) : null,
      endTime: timeOn ? hms(end) : null,
      colorKey: key,
      reminderNoti,
    }
    return {
      payload: stripNil(base),
      colorHex: key,
    }
  }

  const WEEKDAY_ENUM = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

  const buildRepeatPayload = (opts?: { includeExceptions?: boolean }) => {
    const includeExceptions = opts?.includeExceptions ?? true

    // 1) interval / unit 결정
    let interval: number
    let unit: 'DAY' | 'WEEK' | 'MONTH'

    if (repeatMode === 'custom') {
      // 맞춤: 사용자가 선택한 숫자 + 단위 그대로 사용
      interval = repeatEvery
      unit = repeatUnit === 'day' ? 'DAY' : repeatUnit === 'week' ? 'WEEK' : 'MONTH'
    } else {
      // daily / weekly / monthly → 항상 interval = 1
      interval = 1
      unit = repeatMode === 'daily' ? 'DAY' : repeatMode === 'weekly' ? 'WEEK' : 'MONTH'
    }

    // 2) on 필드(WEEK / MONTH 전용)
    let on: string[] | null = null

    if (unit === 'WEEK') {
      // 매주 / n주마다 요일
      const wd = WEEKDAY_ENUM[start.getDay()] // 시작 날짜 기준 요일
      on = [wd]
    } else if (unit === 'MONTH') {
      const wd = WEEKDAY_ENUM[start.getDay()]
      const { nth } = getWeekIndexOfMonth(start)

      if (monthlyOpt === 'byDate') {
        // MONTH는 on 1개 필수, 날짜 기준은 "D10" 포맷
        on = [`D${start.getDate()}`]
      } else if (monthlyOpt === 'byNthWeekday') {
        // 매월 2번째 수요일 → "2WED"
        on = [`${nth}${wd}`]
      } else {
        // "LASTWED" (언더스코어 없음)
        on = [`LAST${wd}`]
      }
    }

    // 3) 종료일
    const endDateStr =
      endMode === 'date' && repeatEndDate ? ymdLocal(repeatEndDate) : null

    // 4) exceptionDates
    const exceptionDates =
      includeExceptions && eventData?.repeat?.exceptionDates
        ? eventData.repeat.exceptionDates
        : undefined

    return stripNil({
      interval,
      unit,
      on,
      endDate: endDateStr,
      exceptionDates,
    })
  }

  // 반복 설정 UI 초기화 (edit 모드에서만)
  useEffect(() => {
    if (!visible) return
    if (mode !== 'edit') return
    const r = eventData?.repeat
    if (!r) return

    let nextRepeatMode: RepeatMode = 'daily'
    let nextRepeatEvery = 1
    let nextRepeatUnit: RepeatUnit = 'day'
    let nextMonthlyOpt: MonthlyOpt = 'byDate'

    // 1) DAY
    if (r.unit === 'DAY') {
      if (r.interval === 1) {
        nextRepeatMode = 'daily'
      } else {
        nextRepeatMode = 'custom'
        nextRepeatEvery = r.interval
        nextRepeatUnit = 'day'
      }
    }

    // 2) WEEK
    if (r.unit === 'WEEK') {
      const wd = WEEKDAY_ENUM[start.getDay()]
      const isSimpleWeekly =
        r.interval === 1 && Array.isArray(r.on) && r.on.length === 1 && r.on[0] === wd

      if (isSimpleWeekly) {
        // "매주" 패턴
        nextRepeatMode = 'weekly'
      } else {
        // 그 외는 "맞춤 설정 - 주"로 처리
        nextRepeatMode = 'custom'
        nextRepeatEvery = r.interval
        nextRepeatUnit = 'week'
      }
    }

    // 3) MONTH
    if (r.unit === 'MONTH') {
      if (!r.on || r.on.length === 0) {
        // on 없음 → "매월 ○일"
        nextRepeatMode = 'monthly'
        nextMonthlyOpt = 'byDate'
      } else {
        const token = r.on[0] // 예: "2WED" 또는 "LAST_WED"
        if (/^D\d{1,2}$/.test(token)) {
          nextRepeatMode = 'monthly'
          nextMonthlyOpt = 'byDate'
        } else if (token.startsWith('LAST_') || /^LAST(MON|TUE|WED|THU|FRI|SAT|SUN)$/.test(token)) {
          nextRepeatMode = 'monthly'
          nextMonthlyOpt = 'byLastWeekday'
        } else {
          const nthStr = token[0] // 맨 앞 글자만 숫자로 가정 (2WED)
          const nthNum = Number(nthStr)
          if (!Number.isNaN(nthNum)) {
            nextRepeatMode = 'monthly'
            nextMonthlyOpt = 'byNthWeekday'
          } else {
            // 이상한 패턴 → 맞춤 설정 - 월
            nextRepeatMode = 'custom'
            nextRepeatEvery = r.interval
            nextRepeatUnit = 'month'
          }
        }
      }
    }

    setRepeatMode(nextRepeatMode)
    setRepeatEvery(nextRepeatEvery)
    setRepeatUnit(nextRepeatUnit)
    setMonthlyOpt(nextMonthlyOpt)

    // 종료일
    if (r.endDate) {
      const [y, m, d] = r.endDate.split('-').map(Number)
      setRepeatEndDate(new Date(y, m - 1, d))
      setEndMode('date')
    } else {
      setRepeatEndDate(null)
      setEndMode('none')
    }
  }, [visible, mode, eventData, start])

  const closeAll = () => {
    setOpenCalendar(false)
    setOpenStartTime(false)
    setOpenEndTime(false)
    setOpenTime(false)
  }

  const switchPanel = (p: Panel) => {
    closeAll()
    if (p === null) return
    if (p === 'calendar') setOpenCalendar(true)
    else if (p === 'start') setOpenStartTime(true)
    else setOpenEndTime(true)
  }

  const cmp = (a: Date, b: Date) => {
    const aa = new Date(a)
    aa.setHours(0, 0, 0, 0)
    const bb = new Date(b)
    bb.setHours(0, 0, 0, 0)
    return aa.getTime() - bb.getTime()
  }

  // 연속 구간 하이라이트(시작/끝 동그라미, 중간은 연한 배경)
  const buildMarked = (s?: Date, e?: Date) => {
    const out: Record<string, any> = {}
    if (!s || !e) return out

    const a = new Date(Math.min(s.getTime(), e.getTime()))
    const b = new Date(Math.max(s.getTime(), e.getTime()))
    const ks = ymdLocal(a)
    const ke = ymdLocal(b)

    // 단일일: 완전 동그라미
    if (ks === ke) {
      out[ks] = {
        selected: true,
        selectedColor: '#E8CCFF',
        selectedTextColor: '#B04FFF',
      }
      return out
    }

    // 사이 날짜들: 연보라 바탕
    const cur = new Date(a)
    cur.setDate(cur.getDate() + 1)
    while (cur.getTime() < b.getTime()) {
      out[ymdLocal(cur)] = { color: 'rgba(176,79,255,0.18)' }
      cur.setDate(cur.getDate() + 1)
    }

    // 양 끝: 동그라미 + 텍스트색
    const edge = { color: '#E8CCFF', textColor: '#B04FFF' }
    out[ks] = { ...edge, startingDay: true }
    out[ke] = { ...edge, endingDay: true }
    return out
  }

  const pickingEndRef = React.useRef(false) // 종료 선택 대기 플래그

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const close = () => onClose()

  /** 색상 */
  const [activeSetId, setActiveSetId] = useState(getActiveScheduleColorSetId())
  const COLORS = React.useMemo(
    () => getScheduleColorSet(activeSetId) as readonly string[],
    [activeSetId],
  )
  const [selectedSlot, setSelectedSlot] = useState(0)
  const selectedColor = COLORS[selectedSlot] ?? COLORS[0]
  const [showPalette, setShowPalette] = useState(false)

  useEffect(() => {
    const onColorSetChanged = (payload?: { setId?: string }) => {
      const nextSetId = (payload?.setId as any) ?? getActiveScheduleColorSetId()
      setActiveSetId(nextSetId)
    }
    bus.on('scheduleColorSet:changed', onColorSetChanged)
    return () => bus.off('scheduleColorSet:changed', onColorSetChanged)
  }, [])

  // 라벨
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelAnchor, setLabelAnchor] = useState<Anchor | null>(null)
  const labelBtnRef = useRef<View>(null)
  const { labels: globalLabels } = useLabels()
  const labels = globalLabels ?? []
  const [activeTab, setActiveTab] = useState<'schedule' | 'repeat'>(
    initial ? 'repeat' : 'schedule',
  )

  useEffect(() => {
    if (!visible) return

    const isRepeatInitial = initial?.repeat != null
    const isRepeatFetched = mode === 'edit' && eventData?.repeat != null

    if (isRepeatInitial || isRepeatFetched) {
      setActiveTab('repeat')
    } else {
      setActiveTab('schedule')
    }
  }, [visible, initial, eventData, mode])

  /** 일정 입력값 */
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [memo, setMemo] = useState('')

  /** 날짜 & 시간 */
  const [end, setEnd] = useState(new Date())

  /** 토글 상태 */
  const [timeOn, setTimeOn] = useState(false)
  const [remindOn, setRemindOn] = useState(false)
  const [repeatOn, setRepeatOn] = useState(false)
  const [taskDate, setTaskDate] = useState<Date | null>(null)
  const [taskDueOn, setTaskDueOn] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null)

  /** 기본 저장 로직 (반복 아닐 때 / 일반 수정·생성) */
  const saveNormal = async (opts?: { clearRepeat?: boolean }) => {
    try {
      const { payload, colorHex } = buildBasePayload()
      const fieldsToClear: string[] = []
      if (!timeOn) {
        fieldsToClear.push('startTime', 'endTime')
        payload.startTime = null
        payload.endTime = null
      }
      const clearRepeat = opts?.clearRepeat ?? false
      if (clearRepeat) {
        fieldsToClear.push('repeat')
      }

      let saved: any

      if (mode === 'edit' && eventId) {
        const patchPayload: any = { ...payload, fieldsToClear }
        if (clearRepeat) patchPayload.repeat = null
        const res = await http.patch(`/event/${eventId}`, patchPayload)
        saved = res?.data
      } else {
        const createPayload: any = { ...payload, fieldsToClear }
        if (clearRepeat) createPayload.repeat = null
        const res = await http.post('/event', createPayload)
        saved = res?.data
      }

      // API 성공 후 이벤트 발행
      if (saved) {
        const enriched = {
          ...(saved ?? {}),
          colorKey: colorHex,
          startDate: saved?.startDate ?? payload.startDate,
          endDate: saved?.endDate ?? payload.endDate,
        }
        bus.emit('calendar:mutated', { op: 'create', item: enriched })

        const anchor = enriched.startDate ?? payload.startDate
        const ym = anchor?.slice(0, 7)
        if (ym) bus.emit('calendar:invalidate', { ym })
      }

      onClose()
    } catch (err) {
      console.log('일정 저장 실패:', err)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const saveTask = async () => {
    const reminderNoti = buildReminderNoti()
    const placementDate = taskDate ? ymdLocal(taskDate) : null
    const placementTime = timeOn ? hms(start) : null
    const dueDateTime =
      taskDueOn && taskDueDate
        ? `${ymdLocal(taskDueDate)}T23:59:59`
        : null
    const targetDate = placementDate ?? ymdLocal(start)

    try {
      const res = await http.post('/task', {
        title: scheduleTitle,
        content: memo ?? '',
        labels: selectedLabelIds.length ? selectedLabelIds : [],
        placementDate,
        placementTime,
        reminderNoti,
        dueDateTime,
        date: targetDate,
      })

      const newId = res?.data?.data?.id
      bus.emit('calendar:mutated', {
        op: 'create',
        item: { id: newId, isTask: true, date: targetDate },
      })
      const ym = targetDate.slice(0, 7)
      if (ym) bus.emit('calendar:invalidate', { ym })
      onClose()
    } catch (err) {
      console.log('할 일 저장 실패:', err)
      Alert.alert('저장 실패', (err as any)?.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 반복 일정 수정 – "이 일정만"
  const saveRepeatOnlyThis = async () => {
    if (!eventId || !eventData?.repeat) {
      await saveNormal()
      return
    }

    try {
      const { payload, colorHex } = buildBasePayload()
      const occDate = payload.startDate as string // yyyy-MM-dd

      const prev = eventData.repeat.exceptionDates ?? []
      const next = prev.includes(occDate) ? prev : [...prev, occDate]

      // 1) 기존 반복 일정에 exceptionDates 패치
      await http.patch(`/event/${eventId}`, {
        repeat: {
          ...eventData.repeat,
          exceptionDates: next,
        },
      })

      // 2) 수정된 내용을 가진 단일 일정 생성 (repeat: null)
      if (!timeOn) {
        payload.startTime = null
        payload.endTime = null
      }

      const createPayload = {
        ...payload,
        repeat: null,
      }

      const resNew = await http.post('/event', createPayload)
      const saved = resNew?.data

      if (saved) {
        const enriched = {
          ...(saved ?? {}),
          colorKey: colorHex,
          startDate: saved?.startDate ?? createPayload.startDate,
          endDate: saved?.endDate ?? createPayload.endDate,
        }

        bus.emit('calendar:mutated', { op: 'create', item: enriched })
        const ym = enriched.startDate.slice(0, 7)
        bus.emit('calendar:invalidate', { ym })
      }

      onClose()
    } catch (err) {
      console.log('반복 일정 단일 수정 실패:', err)
      console.log('responseBody:', (err as any)?.response?.data)
      Alert.alert('저장 실패', (err as any)?.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 반복 일정 수정 – "이후 일정 모두"
  // 반복 일정 수정 – "이후 일정 모두"
  const saveRepeatApplyAll = async () => {
    if (!eventId || !eventData?.repeat) {
      await saveNormal()
      return
    }

    try {
      const { payload, colorHex } = buildBasePayload()
      const occDate = payload.startDate as string // yyyy-MM-dd

      // 1) 기존 반복 일정 끝을 "전날"로 자르기
      const d = new Date(
        Number(occDate.slice(0, 4)),
        Number(occDate.slice(5, 7)) - 1,
        Number(occDate.slice(8, 10)),
      )
      d.setDate(d.getDate() - 1)
      const prevDay = ymdLocal(d)

      await http.patch(`/event/${eventId}`, {
        repeat: {
          ...eventData.repeat,
          endDate: prevDay,
        },
      })

      // 2) 새 반복 설정(현재 UI 기준)을 적용한 새로운 반복 일정 생성
      const newRepeat = buildRepeatPayload({ includeExceptions: false })

      // 시간 토글에 따라 시간 필드 정리
      if (!timeOn) {
        payload.startTime = null
        payload.endTime = null
      }

      const createPayload: any = {
        ...payload,
        repeat: newRepeat,
      }

      const resNew = await http.post('/event', createPayload)
      const saved = resNew?.data

      if (saved) {
        const enriched = {
          ...(saved ?? {}),
          colorKey: colorHex,
          startDate: saved?.startDate ?? createPayload.startDate,
          endDate: saved?.endDate ?? createPayload.endDate,
        }

        bus.emit('calendar:mutated', { op: 'create', item: enriched })
        const ym = enriched.startDate?.slice(0, 7)
        if (ym) bus.emit('calendar:invalidate', { ym })
      }

      onClose()
    } catch (err) {
      console.log('반복 일정 전체 수정 실패:', err)
      console.log('responseBody:', (err as any)?.response?.data)
      Alert.alert('저장 실패', (err as any)?.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 반복 일정 수정 – "반복 끄기 + 이후 일정 모두"
  const saveRepeatTurnOffAllFuture = async () => {
    const repeatRule = eventData?.repeat ?? initial?.repeat
    if (!eventId || !repeatRule) {
      await saveNormal({ clearRepeat: true })
      return
    }

    try {
      const { payload, colorHex } = buildBasePayload()
      const occDate = payload.startDate as string

      const d = new Date(
        Number(occDate.slice(0, 4)),
        Number(occDate.slice(5, 7)) - 1,
        Number(occDate.slice(8, 10)),
      )
      d.setDate(d.getDate() - 1)
      const prevDay = ymdLocal(d)

      await http.patch(`/event/${eventId}`, {
        repeat: {
          ...repeatRule,
          endDate: prevDay,
        },
      })

      if (!timeOn) {
        payload.startTime = null
        payload.endTime = null
      }

      const createPayload: any = {
        ...payload,
        repeat: null,
      }

      const resNew = await http.post('/event', createPayload)
      const saved = resNew?.data

      if (saved) {
        const enriched = {
          ...(saved ?? {}),
          colorKey: colorHex,
          startDate: saved?.startDate ?? createPayload.startDate,
          endDate: saved?.endDate ?? createPayload.endDate,
        }

        bus.emit('calendar:mutated', { op: 'create', item: enriched })
        const ym = enriched.startDate?.slice(0, 7)
        if (ym) bus.emit('calendar:invalidate', { ym })
      }

      onClose()
    } catch (err) {
      console.log('반복 일정 끄기(이후 모두) 실패:', err)
      Alert.alert('저장 실패', (err as any)?.response?.data?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 저장 버튼 핸들러 – 반복 여부에 따라 분기
  const handleSave = async () => {
    if (mode === 'create' && createTypeSelected === 'task') {
      await saveTask()
      return
    }

    // 1) 반복 토글이 켜진 경우에만 반복 저장
    if (repeatOn) {
      // 편집 모드 + 기존에 repeat 있는 일정 → 분기(이 일정만 / 이후 모두)
      if (mode === 'edit' && eventData?.repeat != null) {
        setSaving(false)
        Alert.alert('반복 일정 수정', '이후 반복하는 일정들도 반영할까요?', [
          { text: '취소', style: 'cancel' },
          {
            text: '이 일정만',
            onPress: () => {
              void saveRepeatOnlyThis()
            },
          },
          {
            text: '이후 일정 모두',
            onPress: () => {
              void saveRepeatApplyAll()
            },
          },
        ])
        return
      }

      // (1) 기본 payload + 컬러
      const { payload, colorHex } = buildBasePayload()
      const repeatPayload = buildRepeatPayload()

      // (2) 시간 토글에 따라 시간 필드 / fieldsToClear 정리
      const fieldsToClear: string[] = []
      if (!timeOn) {
        fieldsToClear.push('startTime', 'endTime')
        payload.startTime = null
        payload.endTime = null
      }

      const finalPayload: any = {
        ...payload,
        repeat: repeatPayload,
      }
      if (fieldsToClear.length > 0) {
        finalPayload.fieldsToClear = fieldsToClear
      }

      try {
        let saved: any
        if (mode === 'edit' && eventId) {
          const res = await http.patch(`/event/${eventId}`, finalPayload)
          saved = res?.data
        } else {
          const res = await http.post('/event', finalPayload)
          saved = res?.data
        }

        if (saved) {
          const enriched = {
            ...(saved ?? {}),
            colorKey: colorHex,
            startDate: saved?.startDate ?? finalPayload.startDate,
            endDate: saved?.endDate ?? finalPayload.endDate,
          }

          bus.emit('calendar:mutated', { op: 'create', item: enriched })
          const ym = enriched.startDate?.slice(0, 7)
          if (ym) bus.emit('calendar:invalidate', { ym })
        }

        onClose()
      } catch (err) {
        console.log('반복 일정 저장 실패:', err)
        console.log('responseBody:', (err as any)?.response?.data)
        console.log('requestBody: ', finalPayload)
        Alert.alert('저장 실패', (err as any)?.response?.data?.message ?? '저장 실패')
      } finally {
        setSaving(false)
      }
      return
    }

    // 2) 일반 일정 저장
    // 기존 반복 일정에서 토글을 껐으면 repeat를 명시적으로 제거
    const hadRepeat = mode === 'edit' && (eventData?.repeat != null || initial?.repeat != null)
    if (hadRepeat) {
      setSaving(false)
      Alert.alert('반복 일정 수정', '반복 설정 변경을 어떻게 적용할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '이 일정만',
          onPress: () => {
            void saveRepeatOnlyThis()
          },
        },
        {
          text: '이후 일정 모두',
          onPress: () => {
            void saveRepeatTurnOffAllFuture()
          },
        },
      ])
      return
    }
    await saveNormal()
  }

  const onCalendarSelect = (d: Date) => {
    // 00:00 정규화
    const picked = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const s0 = startOfDay(start)
    const e0 = startOfDay(end)

    // 1. 종료 선택 대기 중 (pickingEndRef.current === true)
    if (pickingEndRef.current) {
      if (picked.getTime() >= s0.getTime()) {
        // 선택 날짜가 시작일보다 같거나 늦으면 종료일로 확정
        setEnd(picked)
        setStart(start) // 하이라이트 즉시 적용을 위해 start 상태도 명시적으로 호출
        setWhichDate('end')
      } else {
        // 선택 날짜가 시작일보다 빠르면: 새 시작일로 리셋 (단일)
        setStart(picked)
        setEnd(picked)
        setWhichDate('start')
      }
      pickingEndRef.current = false // 대기 해제
      return
    }

    // 2. 일반 선택/단일 상태
    const isSingle = s0.getTime() === e0.getTime()

    if (isSingle) {
      // 단일 상태에서 탭:
      if (picked.getTime() > s0.getTime()) {
        // 더 늦으면 즉시 범위 완성
        setEnd(picked)
        setStart(start)
        setWhichDate('end')
      } else if (picked.getTime() < s0.getTime()) {
        // 더 이르면 시작일만 리셋, 다음 탭 대기 진입
        setStart(picked)
        setEnd(picked)
        setWhichDate('start')
        pickingEndRef.current = true
      } else {
        // 같은 날을 다시 탭 (단일 상태 유지)
        pickingEndRef.current = true // 다음 탭에서 종료 선택하도록 대기 진입
      }
      return
    }

    // 3. 범위가 있는 상태에서 탭: 그 날로 단일 리셋 + 다음 탭에서 종료 선택 대기
    // → "그 날로 단일 리셋" + 다음 탭에서 종료 선택 대기
    setStart(picked)
    setEnd(picked)
    setWhichDate('start')
    pickingEndRef.current = true
  }

  const marked = React.useMemo(() => buildMarked(start, end), [start, end])
  const [openTime, setOpenTime] = useState(false)

  // 피커가 터치 중 닫히면 스크롤 잠금이 남을 수 있음
  // 1. 팝업 전체 visible 꺼질 때
  useEffect(() => {
    if (!visible) setIsPickerTouching(false)
  }, [visible])

  // 2. 시간 피커 openTime 닫힐 때
  useEffect(() => {
    if (!openTime) setIsPickerTouching(false)
  }, [openTime])

  // 3. 반복 맞춤 피커 repeatCustomOpen 닫힐 때
  useEffect(() => {
    if (!repeatCustomOpen) setIsPickerTouching(false)
  }, [repeatCustomOpen])

  // 4. 알림 맞춤 피커 customOpen 닫히거나 remindOn 꺼질 때
  useEffect(() => {
    if (!customOpen || !remindOn) setIsPickerTouching(false)
  }, [customOpen, remindOn])

  // 알림 드롭다운
  type ReminderPreset = {
    id: string
    day: number
    hour: number
    minute: number
    label: string
  }
  const [reminderPresets, setReminderPresets] = useState<
    { id: string; day: number; hour: number; minute: number }[]
  >([])
  const reminderPresetLoadedRef = useRef(false)
  const [reminderPresetVersion, setReminderPresetVersion] = useState(0)
  const [remindValue, setRemindValue] = useState<'custom' | ReminderPreset | null>(null)

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
  // 프리셋 + '맞춤 설정'
  const presetOptions = (reminderPresets ?? []).map((p) => ({
    type: 'preset' as const,
    ...p,
    label: formatCustomLabel(p.hour, p.minute, p.day),
  }))

  const remindOptions = [
    ...((presetOptions ?? []) as any[]),
    { type: 'custom' as const, label: '맞춤 설정' },
  ]
  const [remindOpen, setRemindOpen] = useState(false)

  function buildReminderNoti() {
    // 알림 토글 꺼져 있거나, 선택된 값이 없으면 null
    if (!remindOn || !remindValue) return null

    // 맞춤 설정
    if (remindValue === 'custom') {
      return {
        day: 0,
        hour: customHour,
        minute: customMinute,
      }
    }

    // remindValue는 preset 객체라고 확정
    return {
      day: remindValue.day,
      hour: remindValue.hour,
      minute: remindValue.minute,
    }
  }

  // 현재 h,m 포맷
  const customLabel = formatCustomLabel(customHour, customMinute, 0)
  // 버튼에 보여줄 텍스트: 맞춤 설정이면 항상 실시간 표시
  const displayRemind = React.useMemo(() => {
    // 알림이 꺼져 있거나, 아직 선택 안 했으면 빈 문자열
    if (!remindOn || !remindValue) return ''

    // 커스텀 알림이면 항상 커스텀 라벨
    if (remindValue === 'custom') {
      return customLabel
    }

    // preset이면 label 사용 (없으면 시간으로 만들어서 반환)
    return (
      remindValue.label ??
      formatCustomLabel(remindValue.hour, remindValue.minute, remindValue.day)
    )
  }, [remindOn, remindValue, customLabel])
  const remindSelectedKey = remindValue === 'custom' ? 'custom' : remindValue?.id ?? null

  // 반복 모드: monthly 세부 옵션 펼침 여부
  const [monthlyOpen, setMonthlyOpen] = useState(false)

  // 월간 옵션(저장용)
  type MonthlyOpt = 'byDate' | 'byNthWeekday' | 'byLastWeekday'
  const [monthlyOpt, setMonthlyOpt] = useState<MonthlyOpt>('byDate')

  // 보조
  const WD_TXT = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const getWeekIndexOfMonth = (d: Date) => {
    const day = d.getDate()
    const nth = Math.floor((day - 1) / 7) + 1
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const isLast = day > lastDay - 7
    return { nth, isLast }
  }
  const base = start ?? new Date()
  const nth = Math.floor((base.getDate() - 1) / 7) + 1
  const wd = WD_TXT[base.getDay()] // 이미 쓰던 요일 배열 그대로 사용

  useEffect(() => {
    if (!monthlyOpen) return
    const b = start ?? new Date()
    const { nth } = getWeekIndexOfMonth(b)
    if (nth < 4 && monthlyOpt === 'byLastWeekday') {
      setMonthlyOpt('byDate')
    }
  }, [monthlyOpen, start, monthlyOpt])

  useEffect(() => {
    if (!visible) return
    if (mode !== 'create') return
    if (initial) return

    if (selectedLabelIds.length > 0) return
    const defaultLabelTitle = createTypeSelected === 'task' ? '할 일' : '일정'
    const defaultLabel = labels.find((l) => l.title === defaultLabelTitle)
    if (defaultLabel) {
      setSelectedLabelIds([defaultLabel.id])
    }
  }, [visible, mode, labels, initial, createTypeSelected, selectedLabelIds.length])

  const handleCreateLabel = async (title: string) => {
    try {
      const newLabel = await createLabel(title)
      bus.emit('label:mutated')

      return newLabel
    } catch (err) {
      console.log('라벨 생성 실패', err)
      throw err
    }
  }
  useEffect(() => {
    if (!visible) return
    if (mode !== 'edit' || !eventId) return
    let cancelled = false

    async function fetchEventDetail() {
      try {
        const res = await http.get(`/event/${eventId}`)
        const ev = res.data.data
        if (!ev || cancelled) return

        const rawStartDate = ev.startDate // 원본 시작일 (YYYY-MM-DD)
        const rawEndDate = ev.endDate // 원본 종료일 (YYYY-MM-DD)

        // 1) 원본 기준으로 "며칠짜리 일정인지" 계산
        const [y1, m1, d1] = rawStartDate.split('-').map(Number)
        const [y2, m2, d2] = rawEndDate.split('-').map(Number)
        const baseStartOnly = new Date(y1, m1 - 1, d1)
        const baseEndOnly = new Date(y2, m2 - 1, d2)
        const DAY_MS = 24 * 60 * 60 * 1000
        const durationDays = Math.max(
          Math.round((baseEndOnly.getTime() - baseStartOnly.getTime()) / DAY_MS),
          0,
        )

        // 2) 팝업에서 "보여줄" 시작 날짜(발생일 우선)
        const effectiveStartYmd =
          initial?.startDate && initial.startDate !== rawStartDate
            ? initial.startDate // DayView / WeekView 에서 넘긴 발생일
            : rawStartDate // 없으면 원본 시작일

        const [ey, em, ed] = effectiveStartYmd.split('-').map(Number)
        const hasTime = Boolean(ev.startTime || ev.endTime)

        if (!hasTime) {
          // ⓐ 시간 없는 일정 → 날짜만, 발생일 기준으로 span 유지
          setTimeOn(false)

          const occStart = new Date(ey, em - 1, ed)
          const occEnd = new Date(occStart)
          occEnd.setDate(occEnd.getDate() + durationDays)

          setStart(occStart)
          setEnd(occEnd)
        } else {
          // ⓑ 시간 있는 일정 → 원본 "시작/종료 시각 차이" 유지해서 발생일로 이동

          // 원본 시작/종료 Date (날짜+시간)
          const baseStart = new Date(y1, m1 - 1, d1)
          if (ev.startTime) {
            const [sh, sm] = ev.startTime.split(':').map(Number)
            baseStart.setHours(sh, sm, 0, 0)
          }

          const baseEnd = new Date(y2, m2 - 1, d2)
          if (ev.endTime) {
            const [eh, em2] = ev.endTime.split(':').map(Number)
            baseEnd.setHours(eh, em2, 0, 0)
          }

          const spanMs = Math.max(baseEnd.getTime() - baseStart.getTime(), 0)

          // 발생일 기준 시작 시각
          const occStart = new Date(ey, em - 1, ed)
          if (ev.startTime) {
            const [sh, sm] = ev.startTime.split(':').map(Number)
            occStart.setHours(sh, sm, 0, 0)
          }

          const occEnd = new Date(occStart.getTime() + spanMs)

          setTimeOn(true)
          setStart(occStart)
          setEnd(occEnd)
        }

        setScheduleTitle(ev.title ?? '')
        setMemo(ev.content ?? '')
        setSelectedLabelIds(ev.labels ?? [])
        const idx = resolveSlotIndex(ev.colorKey, activeSetId)
        setSelectedSlot(idx)
        setRepeatOn(!!ev.repeat)
        setEventData(ev)
      } catch (err) {
        if (cancelled) return
        console.error('❌ 일정 상세 불러오기 실패:', err)
      }
    }

    fetchEventDetail()
    return () => {
      cancelled = true
    }
  }, [visible, mode, eventId, initial?.startDate, activeSetId]) // 발생일 변경 때만 재조회


  useEffect(() => {
    if (visible && mode === 'create' && !initial) {
      setEventData(null)
      setSaving(false)

      setScheduleTitle('')
      setMemo('')
      const effectiveCreateType = createTypeSelected ?? initialCreateType
      const defaultLabelTitle = effectiveCreateType === 'task' ? '할 일' : '일정'
      const defaultLabel = labels.find((l) => l.title === defaultLabelTitle)
      setSelectedLabelIds(defaultLabel ? [defaultLabel.id] : [])

      setSelectedSlot(0)

      const today = new Date()
      setStart(today)
      setEnd(today)
      setTimeOn(false)
      setRepeatOn(false)
      setRemindOn(false)
      setRemindValue(null)
      setRepeatMode('daily')
      setRepeatEvery(1)
      setRepeatUnit('week')
      setMonthlyOpt('byDate')
      setEndMode('none')
      setRepeatEndDate(null)
      setActiveTab('schedule')
    }
  }, [visible, mode, initial, initialCreateType])

  useEffect(() => {
    if (!visible) return
    if (mode !== 'create') return
    if (initial) return

    const applyAnchor = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number)
      const anchor = new Date(y, m - 1, d)

      // DayView 헤더 날짜로 start/end 초기화
      setStart(anchor)
      setEnd(anchor)
      setRangeStart(anchor)
      setRangePhase('start')
    }

    // DayView가 calendar:state 를 보낼 때만 동작
    const onState = (st: { date?: string; mode?: string }) => {
      if (st?.mode === 'day' && typeof st.date === 'string') {
        applyAnchor(st.date)
      }
    }

    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null) // DayView에게 현재 날짜 요청

    return () => bus.off('calendar:state', onState)
  }, [visible, mode, initial])

  useEffect(() => {
    if (!visible) return

    // 반복
    setRepeatOpen(false)
    setMonthlyOpen(false)
    setRepeatCustomOpen(false)
    setEndOpen(false)
    setEndDateCustomOpen(false)
    // 날짜/시간 패널
    setOpenCalendar(false)
    setOpenTime(false)
    setOpenStartTime(false)
    setOpenEndTime(false)
    // 알림 섹션만 닫기
    setRemindOpen(false)
    setCustomOpen(false)
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setSaving(false)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const inCreate = mode === 'create' && !initial
    const createType = inCreate ? initialCreateType : null
    setCreateStep(inCreate ? (createType === 'task' ? 'detail' : 'intro') : 'detail')
    setCreateTypeSelected(mode === 'edit' ? 'event' : createType)
    setEditDatePicking(false)
    setTaskDate(null)
    setTaskDueOn(false)
    setTaskDueDate(null)
  }, [visible, mode, initial, initialCreateType])

  const deleteNormal = async () => {
    try {
      await http.delete(`/event/${eventId}`)

      bus.emit('calendar:mutated', { op: 'delete', id: eventId })
      onClose()
    } catch (e) {
      console.log('일정 삭제 실패:', e)
      alert('삭제 실패')
    }
  }

  const deleteRepeatOnlyThis = async () => {
    const repeatRule = eventData?.repeat ?? initial?.repeat
    if (!repeatRule) {
      await deleteNormal()
      return
    }

    try {
      const occDate = ymdLocal(start)

      const prev = repeatRule.exceptionDates ?? []
      const next = prev.includes(occDate) ? prev : [...prev, occDate]

      await http.patch(`/event/${eventId}`, {
        repeat: {
          ...repeatRule,
          exceptionDates: next,
        },
      })

      const ym = occDate.slice(0, 7)
      bus.emit('calendar:invalidate', { ym })

      onClose()
    } catch (e) {
      console.log('반복 일정 단일 삭제 실패:', e)
      alert('삭제 실패')
    }
  }

  const deleteRepeatAllFuture = async () => {
    const repeatRule = eventData?.repeat ?? initial?.repeat
    if (!repeatRule) {
      await deleteNormal()
      return
    }

    try {
      const d = new Date(start)
      d.setDate(d.getDate() - 1)
      const prevDay = ymdLocal(d)

      await http.patch(`/event/${eventId}`, {
        repeat: {
          ...repeatRule,
          endDate: prevDay,
        },
      })

      const ym = ymdLocal(start).slice(0, 7)
      bus.emit('calendar:invalidate', { ym })

      onClose()
    } catch (e) {
      console.log('반복 일정 전체 삭제 실패:', e)
      alert('삭제 실패')
    }
  }

  const openDeletePrompt = () => {
    const hasRepeat = eventData?.repeat != null || initial?.repeat != null
    if (hasRepeat) {
      Alert.alert('반복 일정 삭제', '이후 반복하는 일정들도 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '이 일정만',
          onPress: () => {
            void deleteRepeatOnlyThis()
          },
        },
        {
          text: '이후 모두 삭제',
          style: 'destructive',
          onPress: () => {
            void deleteRepeatAllFuture()
          },
        },
      ])
      return
    }
    setDeleteConfirmOpen(true)
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          keyboardVerticalOffset={KEYBOARD_OFFSET}
        >
          <View
            style={[
              styles.overlay,
              { paddingTop: insets.top + MARGIN, paddingBottom: insets.bottom + MARGIN },
            ]}
            pointerEvents="box-none"
          >
            <View
              ref={sheetRef}
              style={[styles.boxShadow, { width: SHEET_W, height: SHEET_H }]}
            >
              <View style={styles.box}>
                {/* HEADER */}
                <View style={[styles.header, mode === 'edit' && styles.headerEdit]}>
                {mode === 'edit' ? (
                  <Pressable
                    onPress={openDeletePrompt}
                    style={styles.deletePillBtn}
                    hitSlop={10}
                  >
                    <Text style={styles.deletePillText}>삭제</Text>
                  </Pressable>
                ) : (
                  <TouchableOpacity onPress={close} hitSlop={20}>
                    <Xbutton width={12} height={12} color={'#808080'} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={async () => {
                    if (isCreateFlow && createStep === 'intro') {
                      setCreateTypeSelected((createTypeSelected ?? 'event'))
                      setCreateStep('detail')
                      return
                    }
                    if (saving) return
                    setSaving(true)
                    try {
                      await handleSave()
                    } catch (e) {
                      console.error(e)
                      setSaving(false) // 에러 시에만 닫음 (성공 시엔 어차피 unmount됨)
                    }
                  }}
                  hitSlop={20}
                >
                  <Check width={12} height={12} color={'#808080'} />
                </TouchableOpacity>
                </View>
                {/* 제목 + 색 */}
                <View style={styles.body}>
                  {isCreateFlow && createStep === 'intro' ? (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: 0 }}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      <CreateModeTypeStep
                        title={scheduleTitle}
                        onChangeTitle={setScheduleTitle}
                        colors={COLORS}
                        selectedColorIndex={selectedSlot}
                        onSelectColorIndex={setSelectedSlot}
                        selectedType={createTypeSelected}
                        onSelectType={(value) => {
                          setCreateTypeSelected(value)
                          const defaultLabel = labels.find((l) =>
                            l.title === (value === 'task' ? '할 일' : '일정'),
                          )
                          setSelectedLabelIds(defaultLabel ? [defaultLabel.id] : [])
                          if (value === 'task' && !taskDate) {
                            setTaskDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()))
                          }
                          if (value === 'task') {
                            setCreateStep('detail')
                          }
                        }}
                      />
                      {createTypeSelected === 'event' && (
                        <CreateEventDateStep
                          start={start}
                          end={end}
                          onChangeRange={(nextStart, nextEnd) => {
                            setStart(nextStart)
                            setEnd(nextEnd)
                          }}
                          onNext={() => setCreateStep('detail')}
                        />
                      )}
                    </ScrollView>
                  ) : mode === 'edit' && editDatePicking ? (
                    <CreateEventDateStep
                      start={start}
                      end={end}
                      onChangeRange={(nextStart, nextEnd) => {
                        setStart(nextStart)
                        setEnd(nextEnd)
                      }}
                      onNext={() => setEditDatePicking(false)}
                    />
                  ) : (isCreateFlow && createStep === 'detail') || mode === 'edit' ? (
                    <CreateEventDetailStep
                      title={scheduleTitle}
                      onChangeTitle={setScheduleTitle}
                      memo={memo}
                      onChangeMemo={setMemo}
                      colors={COLORS}
                      selectedColorIndex={selectedSlot}
                      onSelectColorIndex={setSelectedSlot}
                      selectedType={mode === 'edit' ? 'event' : createTypeSelected}
                      onSelectType={(value) => {
                        if (mode === 'edit') return
                        setCreateTypeSelected(value)
                        const defaultLabel = labels.find((l) =>
                          l.title === (value === 'task' ? '할 일' : '일정'),
                        )
                        setSelectedLabelIds(defaultLabel ? [defaultLabel.id] : [])
                        if (value === 'task' && !taskDate) {
                          setTaskDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()))
                        }
                      }}
                      start={start}
                      end={end}
                      onPressDateBox={() => {
                        if (mode === 'edit') {
                          setEditDatePicking(true)
                          return
                        }
                        setCreateTypeSelected('event')
                        setCreateStep('intro')
                      }}
                      onChangeStartTime={(next) => {
                        setStart(next)
                        if (end.getTime() < next.getTime()) {
                          const autoEnd = new Date(next)
                          autoEnd.setHours(next.getHours() + 1)
                          setEnd(autoEnd)
                        }
                      }}
                      onChangeEndTime={setEnd}
                      timeOn={timeOn}
                      onToggleTime={(next) => {
                        setTimeOn(next)
                        if (next) {
                          const now = new Date()
                          const snapMin = now.getMinutes() - (now.getMinutes() % 5)

                          const newStart = new Date(start)
                          newStart.setHours(now.getHours())
                          newStart.setMinutes(snapMin)
                          newStart.setSeconds(0)
                          newStart.setMilliseconds(0)
                          setStart(newStart)

                          const newEnd = new Date(newStart)
                          newEnd.setHours(newStart.getHours() + 1)
                          setEnd(newEnd)
                        } else {
                          setRemindOn(false)
                          setRemindOpen(false)
                          setCustomOpen(false)
                        }
                      }}
                      repeatOn={repeatOn}
                      onToggleRepeat={(next) => {
                        setRepeatOn(next)
                        if (!next) {
                          setEndMode('none')
                          setRepeatEndDate(null)
                        }
                      }}
                      repeatMode={repeatMode}
                      repeatEvery={repeatEvery}
                      repeatUnit={repeatUnit}
                      monthlyOpt={monthlyOpt}
                      onChangeRepeatMode={setRepeatMode}
                      onChangeRepeatEvery={setRepeatEvery}
                      onChangeRepeatUnit={setRepeatUnit}
                      onChangeMonthlyOpt={setMonthlyOpt}
                      repeatEndDate={endMode === 'date' ? repeatEndDate : null}
                      onChangeRepeatEndDate={(next) => {
                        if (!next) {
                          setEndMode('none')
                          setRepeatEndDate(null)
                          return
                        }
                        setEndMode('date')
                        setRepeatEndDate(next)
                      }}
                      remindOn={remindOn}
                      onToggleRemind={(next) => {
                        if (!next) {
                          setRemindOn(false)
                          setRemindOpen(false)
                          setCustomOpen(false)
                          return
                        }
                        void (async () => {
                          const ok = await ensureNotificationPermissionForToggle()
                          if (!ok) {
                            setRemindOn(false)
                            setRemindOpen(false)
                            setCustomOpen(false)
                            return
                          }
                          if (presetOptions.length > 0) {
                            setRemindValue(presetOptions[0])
                            setCustomOpen(false)
                          } else {
                            setRemindValue('custom')
                            setCustomOpen(false)
                          }
                          setRemindOn(true)
                          setRemindOpen(true)
                        })()
                      }}
                      remindOpen={remindOpen}
                      onSetRemindOpen={setRemindOpen}
                      remindDisplayText={displayRemind}
                      remindOptions={remindOptions}
                      remindSelectedKey={remindSelectedKey}
                      onSelectRemindOption={(opt) => {
                        if (opt.type === 'custom') {
                          setRemindValue('custom')
                          setCustomOpen((v) => !v)
                          return
                        }
                        setRemindValue(opt)
                        setCustomOpen(false)
                        setRemindOpen(false)
                      }}
                      customOpen={customOpen}
                      onSetCustomOpen={setCustomOpen}
                      customHour={customHour}
                      customMinute={customMinute}
                      onChangeCustomHour={setCustomHour}
                      onChangeCustomMinute={setCustomMinute}
                      labels={labels}
                      selectedLabelIds={selectedLabelIds}
                      onChangeSelectedLabelIds={setSelectedLabelIds}
                      onCreateLabel={handleCreateLabel}
                      taskDate={taskDate}
                      onChangeTaskDate={setTaskDate}
                      taskDueOn={taskDueOn}
                      onChangeTaskDueOn={setTaskDueOn}
                      taskDueDate={taskDueDate}
                      onChangeTaskDueDate={setTaskDueDate}
                    />
                  ) : (
                    <ScrollView
                      ref={scrollRef}
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 40 }}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      scrollEnabled={!isPickerTouching}
                      bounces={false}
                      showsVerticalScrollIndicator={true}
                      automaticallyAdjustKeyboardInsets={true} // iOS 15+
                      nestedScrollEnabled={true}
                    >
                    <View style={[styles.row, styles.titleHeader]}>
                      <Pressable
                        onPress={() => titleRef.current?.focus()}
                        style={{ flex: 1, justifyContent: 'center', minHeight: 42 }}
                        hitSlop={10} // 살짝 여유
                      >
                        <TextInput
                          ref={titleRef}
                          placeholder="제목"
                          placeholderTextColor="#808080"
                          style={[styles.titleInput]}
                          value={scheduleTitle}
                          onChangeText={setScheduleTitle}
                        />
                      </Pressable>
                      <Pressable
                        ref={colorBtnRef}
                        onPress={() => {
                          colorBtnRef.current?.measureInWindow((bx, by, bw, bh) => {
                            sheetRef.current?.measureInWindow((sx, sy) => {
                              const relX = bx - sx
                              const relY = by - sy

                              // 정렬 기준 좌표
                              const baseLeft = RIGHT_ALIGN ? relX + bw - POPOVER_W : relX
                              // 화면 가장자리 보호(좌우 클램프)
                              const left = Math.max(
                                8,
                                Math.min(baseLeft, SHEET_W - POPOVER_W - 8),
                              )

                              // 기본은 버튼 아래로
                              const top = relY + bh + POP_GAP

                              setPalette({ visible: true, x: left, y: top, w: bw, h: bh })
                            })
                          })
                        }}
                      >
                        <Text style={[styles.colorDot, { color: selectedColor }]}>●</Text>
                      </Pressable>
                    </View>
                  {/* 색상 선택 */}
                  {showPalette && (
                    <View style={styles.paletteRow}>
                      {COLORS.map((c, i) => (
                        <Pressable
                          key={`${c}-${i}`}
                          onPress={() => {
                            setSelectedSlot(i)
                            setShowPalette(false)
                          }}
                          style={[
                            styles.colorOption,
                            { backgroundColor: c },
                            selectedSlot === i && styles.selected,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  {/* 일정/반복 */}
                  <View style={styles.tabRow}>
                    <Pressable
                      style={[
                        styles.tab,
                        activeTab === 'schedule' && styles.activeTab,
                        { borderRightWidth: 0.3, borderRightColor: '#B3B3B3' },
                      ]}
                      onPress={() => setActiveTab('schedule')}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === 'schedule' && styles.activeTabText,
                        ]}
                      >
                        일정
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, activeTab === 'repeat' && styles.activeTab]}
                      onPress={() => setActiveTab('repeat')}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === 'repeat' && styles.activeTabText,
                        ]}
                      >
                        반복
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.sep1} />
                  {/* 날짜 */}
                  <View style={styles.dateSection}>
                    <Text style={styles.label}>날짜</Text>

                    <View style={styles.dateRow}>
                      {/* 시작 */}
                      <Pressable
                        style={[styles.dateDisplay]}
                        onPress={() => {
                          if (openCalendar && whichDate === 'start') switchPanel(null)
                          else {
                            setWhichDate('start')
                            switchPanel('calendar')
                          }
                        }}
                        hitSlop={8}
                      >
                        {(() => {
                          const p = kDateParts(start)
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

                      <Arrow width={8} height={8} style={styles.arrowGap} />

                      <Pressable
                        onPress={() => {
                          if (openCalendar && whichDate === 'end') switchPanel(null)
                          else {
                            setWhichDate('end')
                            switchPanel('calendar')
                          }
                        }}
                        hitSlop={8}
                        style={[styles.dateDisplay]}
                      >
                        {(() => {
                          const p = kDateParts(end)
                          const isSameDay = cmp(start, end) === 0 // 💡 시작일과 종료일이 같은지 확인
                          const textStyle = isSameDay ? styles.sameDayText : styles.num // 💡 조건부 스타일
                          return (
                            <View style={styles.inlineRow}>
                              <Text style={textStyle}>{p.month}</Text>
                              <Text style={textStyle}>월</Text>
                              <Text style={styles.spacer}> </Text>
                              <Text style={textStyle}>{p.day}</Text>
                              <Text style={textStyle}>일</Text>
                              <Text style={styles.spacer}> </Text>
                              <Text style={textStyle}>{p.weekday}</Text>
                            </View>
                          )
                        })()}
                      </Pressable>
                    </View>
                  </View>

                  {/* 달력 */}
                  <View style={{ marginLeft: -H_PAD, marginRight: -H_PAD }}>
                    <MemoCalendar
                      open={openCalendar}
                      value={whichDate === 'start' ? start : end}
                      onSelect={onCalendarSelect}
                      markedDates={marked}
                    />
                  </View>
                  {openCalendar && <View style={styles.sep} />}
                  {/* 시간(조건부 별도 줄) */}
                  {timeOn && (
                    <View style={styles.timeRow}>
                      {/* 시작 시간 */}
                      <Pressable
                        onPress={() => {
                          if (timeTarget === 'start' && openTime) {
                            setOpenTime(false)
                          } else {
                            setTimeTarget('start')
                            setOpenTime(true)
                          }
                        }}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            openTime && timeTarget === 'start' && { color: '#B04FFF' },
                          ]}
                        >
                          {formatTime(start)}
                        </Text>
                      </Pressable>

                      <Arrow width={8} height={8} style={[styles.arrowGap]} />

                      {/* 종료 시간 */}
                      <Pressable
                        onPress={() => {
                          if (timeTarget === 'end' && openTime) {
                            setOpenTime(false)
                          } else {
                            setTimeTarget('end')
                            setOpenTime(true)
                          }
                        }}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            openTime && timeTarget === 'end' && { color: '#B04FFF' }, // 선택된 쪽 강조
                          ]}
                        >
                          {formatTime(end)}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {timeOn && openTime && (
                    <View style={[styles.timePickerBox]} {...pickerTouchHandlers}>
                      {(() => {
                        const target = timeTarget === 'start' ? start : end
                        const hour24 = target.getHours()
                        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
                        const minute = target.getMinutes()
                        const ampm = hour24 < 12 ? 'AM' : 'PM'

                        const updateTarget = (next: Date) => {
                          if (timeTarget === 'start') {
                            setStart(next)
                            // 시작 시간이 종료보다 뒤로 가면 종료 최소 1시간 보장
                            if (timeOn && next.getTime() > end.getTime()) {
                              setEnd(new Date(next.getTime() + 60 * 60 * 1000))
                            }
                          } else {
                            setEnd(next)
                          }
                        }

                        return (
                          <View style={{ flexDirection: 'row', gap: 5 }}>
                            {/* 시간 피커 */}
                            {/* HOUR */}
                            <Picker
                              style={styles.timePicker}
                              itemStyle={styles.timePickerItem}
                              selectedValue={hour12}
                              onValueChange={(v) => {
                                const t = new Date(target)
                                const isPM = t.getHours() >= 12
                                if (isPM) {
                                  t.setHours(v === 12 ? 12 : v + 12)
                                } else {
                                  t.setHours(v === 12 ? 0 : v)
                                }
                                updateTarget(t)
                              }}
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <Picker.Item key={h} label={String(h)} value={h} />
                              ))}
                            </Picker>

                            {/* MINUTE */}
                            <Picker
                              style={styles.timePicker}
                              itemStyle={styles.timePickerItem}
                              selectedValue={minute - (minute % 5)} // 5분 단위 맞추기
                              onValueChange={(v) => {
                                const t = new Date(target)
                                t.setMinutes(v)
                                updateTarget(t)
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

                            {/* AM / PM */}
                            <Picker
                              style={styles.timePicker}
                              itemStyle={styles.timePickerItem}
                              selectedValue={ampm}
                              onValueChange={(v) => {
                                const t = new Date(target)
                                const h = t.getHours()
                                if (v === 'AM') {
                                  if (h >= 12) t.setHours(h - 12)
                                } else {
                                  if (h < 12) t.setHours(h + 12)
                                }
                                updateTarget(t)
                              }}
                            >
                              <Picker.Item label="AM" value="AM" />
                              <Picker.Item label="PM" value="PM" />
                            </Picker>
                          </View>
                        )
                      })()}
                    </View>
                  )}

                  {/* 시간 */}
                  <View style={[styles.row, { marginTop: 18 }]}>
                    <Text style={styles.label}>시간</Text>
                    <CustomToggle
                      value={timeOn}
                      onChange={(v) => {
                        setTimeOn(v)
                        if (v) {
                          const now = new Date()
                          const snapMin = now.getMinutes() - (now.getMinutes() % 5)

                          // 날짜 유지 → 기존 start의 날짜 사용
                          const newStart = new Date(start)
                          newStart.setHours(now.getHours())
                          newStart.setMinutes(snapMin)
                          setStart(newStart)

                          const newEnd = new Date(end)
                          newEnd.setHours(newStart.getHours() + 1)
                          newEnd.setMinutes(newStart.getMinutes())
                          setEnd(newEnd)
                        } else {
                          setOpenTime(false)
                          // 알림 관련 상태 초기화
                          setRemindOn(false)
                          setRemindOpen(false)
                          setCustomOpen(false)
                        }
                      }}
                    />
                  </View>
                  <View style={styles.sep} />
                  {activeTab === 'repeat' && (
                    <>
                      {/* 반복 */}
                      <View style={styles.row}>
                        <Text style={styles.label}>반복</Text>
                        {(() => {
                          const baseColor = '#333' // 기본 색
                          const arrowColor = repeatOpen ? '#B04FFF' : baseColor // 열리면 보라
                          return (
                            <Pressable
                              style={styles.remindButton} // 텍스트+아이콘 가로 정렬
                              onPress={() => {
                                setRepeatOpen((v) => !v)
                                setEndOpen(false)
                                setMonthlyOpen(false)
                                setRepeatCustomOpen(false)
                              }}
                              hitSlop={8}
                            >
                              {(() => {
                                const monthlyText =
                                  monthlyOpt === 'byDate'
                                    ? `매월 ${base.getDate()}일에 반복`
                                    : monthlyOpt === 'byNthWeekday'
                                      ? `매월 ${nth}번째 ${wd}에 반복`
                                      : `매월 마지막주 ${wd}에 반복`

                                const label =
                                  repeatMode === 'monthly'
                                    ? monthlyText
                                    : repeatMode === 'weekly'
                                      ? '매주'
                                      : repeatMode === 'daily'
                                        ? '매일'
                                        : repeatMode === 'custom'
                                          ? formatRepeatCustom(repeatEvery, repeatUnit) // 실시간 반영
                                          : '없음'

                                return <Text style={styles.dropdownText}>{label}</Text>
                              })()}
                              <Down width={8} height={8} color={arrowColor} />
                            </Pressable>
                          )
                        })()}
                      </View>
                      {repeatOpen && (
                        <View style={styles.remindDropdown}>
                          {(
                            [
                              { k: 'daily', t: '매일' },
                              { k: 'weekly', t: '매주' },
                              { k: 'monthly', t: '매월' },
                              { k: 'custom', t: '맞춤 설정' },
                            ] as const
                          ).map(({ k, t }, idx, arr) => {
                            const selected = repeatMode === k
                            const isLast = idx === arr.length - 1

                            return (
                              <View key={k}>
                                <Pressable
                                  style={[
                                    styles.remindItem,
                                    !isLast && styles.remindItemDivider,
                                  ]}
                                  onPress={() => {
                                    if (k === 'monthly') {
                                      // 매월은 리스트를 닫지 않고, 바로 아래에 인라인 옵션 토글
                                      setRepeatMode('monthly')
                                      setRepeatCustomOpen(false) // 다른 서브 닫기
                                      setMonthlyOpen((v) => !v)
                                      return
                                    }
                                    if (k === 'custom') {
                                      setRepeatMode('custom')
                                      setMonthlyOpen(false)
                                      setRepeatCustomOpen((v) => !v) // 맞춤 설정 인라인 피커 토글
                                      return
                                    }
                                    // 다른 옵션은 접고 닫기
                                    setRepeatMode(k as any)
                                    setMonthlyOpen(false)
                                    setRepeatCustomOpen(false)
                                    setRepeatOpen(false)
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
                                      selected && {
                                        color: '#B04FFF',
                                        fontWeight: '700',
                                      },
                                    ]}
                                  >
                                    {t}
                                  </Text>
                                </Pressable>

                                {/* '매월' 바로 아래에 인라인 옵션을 map 안에서 렌더 */}
                                {k === 'monthly' && monthlyOpen && (
                                  <View style={styles.monthlyInlineBox}>
                                    {(() => {
                                      const base = start ?? new Date()
                                      const date = base.getDate()
                                      const wd = WD_TXT[base.getDay()]
                                      const { nth } = getWeekIndexOfMonth(base)

                                      const labelByDate = `매월 ${date}일에 반복`
                                      const labelByNth = `매월 ${nth}번째 ${wd}에 반복`
                                      const labelByLast = `매월 마지막주 ${wd}에 반복`

                                      return (
                                        <View style={styles.monthlyGroup}>
                                          <Pressable
                                            style={[
                                              styles.monthlyItem,
                                              styles.monthlyTop,
                                              monthlyOpt === 'byDate' &&
                                                styles.monthlyActive,
                                            ]}
                                            onPress={() => {
                                              setRepeatMode('monthly')
                                              setMonthlyOpt('byDate')
                                              setMonthlyOpen(false)
                                              setRepeatOpen(false)
                                            }}
                                          >
                                            <Text
                                              style={[
                                                styles.monthlyText,
                                                monthlyOpt === 'byDate' &&
                                                  styles.monthlyTextActive,
                                              ]}
                                            >
                                              {labelByDate}
                                            </Text>
                                          </Pressable>

                                          <Pressable
                                            style={[
                                              styles.monthlyItem,
                                              styles.monthlyMiddle,
                                              monthlyOpt === 'byNthWeekday' &&
                                                styles.monthlyActive,
                                            ]}
                                            onPress={() => {
                                              setRepeatMode('monthly')
                                              setMonthlyOpt('byNthWeekday')
                                              setMonthlyOpen(false)
                                              setRepeatOpen(false)
                                            }}
                                          >
                                            <Text
                                              style={[
                                                styles.monthlyText,
                                                monthlyOpt === 'byNthWeekday' &&
                                                  styles.monthlyTextActive,
                                              ]}
                                            >
                                              {labelByNth}
                                            </Text>
                                          </Pressable>

                                          {nth >= 4 && (
                                            <Pressable
                                              style={[
                                                styles.monthlyItem,
                                                styles.monthlyBottom,
                                                monthlyOpt === 'byLastWeekday' &&
                                                  styles.monthlyActive,
                                              ]}
                                              onPress={() => {
                                                setRepeatMode('monthly')
                                                setMonthlyOpt('byLastWeekday')
                                                setMonthlyOpen(false)
                                                setRepeatOpen(false)
                                              }}
                                            >
                                              <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={[
                                                  styles.monthlyText,
                                                  monthlyOpt === 'byLastWeekday' &&
                                                    styles.monthlyTextActive,
                                                ]}
                                              >
                                                {labelByLast}
                                              </Text>
                                            </Pressable>
                                          )}
                                        </View>
                                      )
                                    })()}
                                  </View>
                                )}
                                {k === 'custom' && repeatCustomOpen && (
                                  <View style={styles.inlinePickerInList} {...pickerTouchHandlers}>
                                    <View style={{ height: 8, pointerEvents: 'none' }} />
                                    <View style={styles.inlinePickerRow}>
                                      {/* LEFT: 1~6 숫자 휠 */}
                                      <View style={styles.inlinePickerBox}>
                                        <Picker
                                          selectedValue={repeatEvery}
                                          onValueChange={(v) => setRepeatEvery(v)}
                                          style={styles.inlinePicker}
                                          itemStyle={[
                                            styles.inlinePickerItem,
                                            { color: '#333' },
                                          ]}
                                        >
                                          {REPEAT_NUMS.map((n) => (
                                            <Picker.Item
                                              key={n}
                                              label={`${n}`}
                                              value={n}
                                              color="#333"
                                            />
                                          ))}
                                        </Picker>
                                      </View>

                                      {/* RIGHT: 단위(일/주/월) 휠 */}
                                      <View style={styles.inlinePickerBox}>
                                        <Picker
                                          selectedValue={repeatUnit}
                                          onValueChange={(v) => setRepeatUnit(v)}
                                          style={styles.inlinePicker}
                                          itemStyle={[
                                            styles.inlinePickerItem,
                                            { color: '#333' },
                                          ]}
                                        >
                                          {REPEAT_UNITS.map((u) => (
                                            <Picker.Item
                                              key={u.k}
                                              label={u.label}
                                              value={u.k}
                                              color="#333"
                                            />
                                          ))}
                                        </Picker>
                                      </View>

                                      {/* “마다” 고정 텍스트(선택) */}
                                      <Text style={styles.inlineSuffix}>마다</Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            )
                          })}
                        </View>
                      )}

                      {/* 마감일 */}
                      <View style={[styles.row, styles.endDate]}>
                        {(() => {
                          const baseColor = '#333'
                          const arrowColor = endOpen ? '#B04FFF' : baseColor // 열리면 보라색
                          return (
                            <Pressable
                              style={styles.remindButton} // 반복과 동일한 버튼 레이아웃
                              onPress={() => {
                                setEndOpen((v) => !v)
                                setRepeatOpen(false)
                                setRepeatCustomOpen(false)
                                if (!endOpen) setEndDateCustomOpen(false)
                              }}
                              hitSlop={8}
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
                          <Pressable
                            style={[styles.remindItem, styles.remindItemDivider]}
                            onPress={() => {
                              setEndMode('none')
                              setRepeatEndDate(null)
                              setEndOpen(false)
                              setEndDateCustomOpen(false)
                            }}
                          >
                            {endMode === 'none' && (
                              <View
                                pointerEvents="none"
                                style={styles.remindSelectedBg}
                              />
                            )}
                            <Text
                              style={[
                                styles.remindItemText,
                                endMode === 'none' && {
                                  color: '#B04FFF',
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              없음
                            </Text>
                          </Pressable>
                          {/* 날짜 지정 */}

                          <Pressable
                            style={styles.remindItem}
                            onPress={() => {
                              if (endMode !== 'date') {
                                setEndMode('date') // 선택 상태는 '맞춤 설정'으로 유지
                                setEndDateCustomOpen(true) // 처음 클릭 시 열기
                              } else {
                                setEndDateCustomOpen((v) => !v) // 다시 클릭 시 토글(닫힘/열림)
                              }
                            }}
                          >
                            {endMode === 'date' && (
                              <View
                                pointerEvents="none"
                                style={styles.remindSelectedBg}
                              />
                            )}
                            <Text
                              style={[
                                styles.remindItemText,
                                endMode === 'date' && {
                                  color: '#B04FFF',
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              맞춤 설정
                            </Text>
                          </Pressable>
                          {/* 인라인 캘린더: '날짜 지정' 바로 아래에 붙여 표시 */}
                          {endMode === 'date' && endDateCustomOpen && (
                            <View style={{ marginTop: 2 }}>
                              <InlineCalendar
                                open
                                value={repeatEndDate ?? start}
                                onSelect={(d) => {
                                  if (d.getTime() < start.getTime()) {
                                    setRepeatEndDate(start)
                                  } else {
                                    setRepeatEndDate(d)
                                  }
                                }}
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}
                  {/* 일정/알림 */}
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>알림</Text>

                      {/* 오른쪽 영역 */}
                      <View style={styles.rowRight}>
                        {(() => {
                          const baseColor = remindOn ? '#333333' : '#B3B3B3'
                          const arrowColor = remindOpen ? '#B04FFF' : baseColor
                          return (
                            <Pressable
                              style={styles.remindButton}
                              onPress={() => {
                                if (!remindOn) return
                                setRemindOpen((v) => !v)
                              }}
                              hitSlop={8}
                            >
                              <Text style={[styles.remindTextBtn, { color: baseColor }]}>
                                {displayRemind}
                              </Text>

                              <Down width={10} height={10} color={arrowColor} />
                            </Pressable>
                          )
                        })()}

                        <CustomToggle
                          value={remindOn}
                          disabled={!timeOn}
                          onChange={async (v) => {
                            if (!v) {
                              setRemindOn(false)
                              setRemindOpen(false)
                              setCustomOpen(false)
                              return
                            }

                            const ok = await ensureNotificationPermissionForToggle()
                            if (!ok) {
                              setRemindOn(false)
                              setRemindOpen(false)
                              setCustomOpen(false)
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

                                  // preset 선택 → 바로 값 세팅
                                  setRemindValue(opt) // 전체 preset 객체 저장
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
                                    selected && {
                                      color: '#B04FFF',
                                      fontWeight: '700',
                                    },
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
                      <View style={styles.remindPickerWrap} {...pickerTouchHandlers}>
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

                          {/* MINUTE */}
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
                  </>

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
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
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
                                setSelectedLabelIds((prev) =>
                                  prev.filter((x) => x !== id),
                                )
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
                      textAlignVertical="top" // Android ↑ 위쪽 정렬
                      onFocus={() => {
                        requestAnimationFrame(() =>
                          scrollRef.current?.scrollToEnd({ animated: true }),
                        )
                      }}
                      style={styles.memoBox}
                    />
                  </View>
                    </ScrollView>
                  )}
                  {/* 팝오버: 시트(box) 기준 절대배치 */}
                  {(!isCreateFlow || createStep === 'detail') && palette.visible && (
                    <>
                      {/* 백드롭 */}
                      <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setPalette((p) => ({ ...p, visible: false }))}
                      />
                      <View
                        style={[
                          styles.palettePopover,
                          {
                            top: palette.y,
                            left: palette.x,
                            width: POPOVER_W,
                            transform: [{ translateX: NUDGE_X }, { translateY: NUDGE_Y }],
                          },
                        ]}
                      >
                        <Text style={styles.popoverTitle}>색상</Text>
                        {COLORS.map((c, i) => (
                          <Pressable
                            key={c}
                            onPress={() => {
                              setSelectedSlot(i)
                              setPalette((p) => ({ ...p, visible: false }))
                            }}
                            style={[styles.colorPill, { backgroundColor: c }]}
                          />
                        ))}
                      </View>
                    </>
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
                  <Text style={styles.deleteTitle}>일정을 삭제할까요?</Text>
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
                        void deleteNormal()
                      }}
                    >
                      <Text style={styles.deleteConfirmTxt}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  titleHeader: {
    borderBottomColor: '#B3B3B3',
    borderBottomWidth: 0.3,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
    justifyContent: 'space-around',
    alignContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  headerEdit: {
    marginTop: 16,
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
  sameDayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B3B3B3',
    marginLeft: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  colorDot: { fontSize: 30, paddingRight: 17 },
  titleInput: {
    flex: 1,
    borderBottomColor: '#eee',
    marginLeft: 6,
    fontSize: 22,
    fontWeight: '700',
    paddingLeft: 20,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colorOption: {
    width: 22,
    height: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selected: { borderColor: '#000', borderWidth: 2 },
  sep: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
  },
  sep1: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 19,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
  },

  calendarSeparator: {
    marginVertical: 0,
    height: 1,
    backgroundColor: '#eee',
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
  },
  dateWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dateSide: { alignItems: 'center', marginHorizontal: 28 },
  dateText: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  timeText: { fontSize: 18, fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
    marginLeft: 30,
    marginTop: 20,
  },
  label: { fontSize: 15, fontWeight: '500' },
  remindText: { marginLeft: 10, marginBottom: 5, fontSize: 13, color: '#888' },
  memoSection: {
    marginTop: 3,
  },

  memoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },

  memoBox: {
    minHeight: 50,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fff',
  },
  toggle: { width: 50, height: 26, borderRadius: 20, padding: 2 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  labelList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  labelOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  selectedLabel: { backgroundColor: '#B04FFF', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.3,
    borderColor: '#B3B3B3',
    height: 50,
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 0.9,
    borderColor: '#B04FFF',
    marginTop: 1,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '700',
  },
  activeTabText: {
    color: '#B04FFF',
    fontWeight: '700',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dropdownItem: {
    padding: 10,
    fontSize: 15,
  },
  selectedDropdown: {
    backgroundColor: '#EEE6FF',
    color: '#B04FFF',
  },

  palettePopover: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  popoverTitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    fontWeight: '600',
  },
  colorPill: {
    height: 24,
    borderRadius: 14,
    marginVertical: 4,
  },
  cardDropdown: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: 'hidden',
  },
  cardItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
  },
  cardTextActive: {
    color: '#B04FFF',
    fontWeight: '700',
  },
  endDate: {
    justifyContent: 'flex-end',
  },

  //날짜
  inlineRow: { flexDirection: 'row', alignItems: 'baseline' },
  num: { fontSize: 18, fontWeight: '700', color: '#222' }, // 12, 30
  unit: { fontSize: 18, fontWeight: '700', color: '#222', marginLeft: 1 }, // 월, 일
  week: { fontSize: 18, fontWeight: '700', color: '#222' }, // 월요일
  spacer: { width: 6 },

  dateSection: {
    marginTop: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15, // 타이틀 아래 여백
  },
  dateDisplay: {
    flex: 1,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowGap: { marginHorizontal: 13 }, // 화살표는 고정폭

  timeBoxWrap: {
    width: 143,
    height: 159,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  timeMaskLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
  },

  timeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 28,
    transform: [{ translateY: -10 }],
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },

  // 실제 보라 강조 레이어(디자인에 맞춰 색만 조정) - 삭제 예정
  timeHilite: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 24,
    transform: [{ translateY: 16 }],
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(176,79,255,0.45)',
    borderRadius: 8,
  },
  vDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#EEE',
    opacity: 0.9,
  },

  // 알림 스타일
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // 알림값 버튼과 토글 간 간격
  },

  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 8,
  },

  remindTextBtn: {
    fontSize: 16,
    fontWeight: '600',
  },

  remindDropdown: {
    width: 278,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    // overflow: 'hidden',
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

  inlinePickerWrap: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },

  inlinePickerInList: {
    width: 278,
    alignSelf: 'center',
    marginTop: 8,
  },

  inlinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlinePickerBox: {
    width: 120,
    height: 140,
    justifyContent: 'center',
  },

  inlinePicker: { height: 210 },
  inlinePickerItem: { fontSize: 18 },

  inlineSuffix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 4,
  },

  monthlyInlineBox: {
    marginTop: 8,
  },

  monthlyGroup: {
    width: '100%',
    alignSelf: 'center',
  },

  monthlyItem: {
    width: 278,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: '#F4F4F4',
    borderBottomWidth: 0.3,
    borderBottomColor: '#B3B3B3',
  },

  monthlyTop: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  monthlyMiddle: {},

  monthlyBottom: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },

  monthlyText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },

  monthlyActive: {
    backgroundColor: '#EEE6FF',
  },

  monthlyTextActive: {
    color: '#9D7BFF',
    fontWeight: '700',
  },
  timePickerBox: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  timePicker: {
    width: 90, // 폭
    height: 160, // 높이
  },
  timePickerItem: {
    fontSize: 16, // ← 글자 크기
    fontWeight: '500', // 굵기 조절하고 싶으면
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
})
