import React from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Easing } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { http } from '@/lib/http'
import { bus } from '@/lib/eventBus'
import PlusBtn from '@/assets/icons/plusbtn.svg'
import XIcon from '@/assets/icons/x.svg'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

const DETAIL_ITEM_WIDTH = 302
const DETAIL_RIGHT_EXTENSION = 24
const DETAIL_ITEM_HEIGHT = 60
const QUICK_INPUT_HEIGHT = 50
const DETAIL_ITEM_RADIUS = 12
const APP_HEADER_HEIGHT = 45

export interface DayEvent {
  id?: string | number
  title: string
  labelText?: string
  period?: string
  memo?: string
  place?: string
  time?: string
  color?: string
  borderColor?: string
  colorKey?: string
  isStart?: boolean
  isEnd?: boolean
  startAt?: string
  endAt?: string
  done?: boolean
  isRecurring?: boolean
  isTask?: boolean
}

interface MonthlyDetailPopupProps {
  visible: boolean
  onClose: () => void
  interactionLocked?: boolean
  onPressEvent?: (event: DayEvent) => void
  onPressTask?: (task: DayEvent) => void
  dayData: {
    date?: string
    dateISO?: string
    dayOfWeek?: string
    spanEvents?: DayEvent[]
    normalEvents?: DayEvent[]
    timedScheduleEvents?: DayEvent[]
    untimedTasks?: DayEvent[]
    timedTasks?: DayEvent[]
    timeEvents?: DayEvent[]
  }
}

const hasTime = (ev: DayEvent) => {
  if (ev?.time && String(ev.time).trim().length > 0) return true
  return !!ev?.startAt && !!ev?.endAt
}

const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

const buildHeaderTitle = (dayData: MonthlyDetailPopupProps['dayData']) => {
  const rawDate = dayData.date?.trim()
  const rawDow = dayData.dayOfWeek?.trim()
  if (rawDate && rawDow) return `${rawDate}(${rawDow})`

  const iso = dayData.dateISO
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(y, m - 1, d)
  return `${m}월 ${d}일(${WEEK_KO[dt.getDay()]})`
}

const toStartMinutes = (ev: DayEvent) => {
  if (ev.startAt && ev.startAt.includes('T')) {
    const hm = ev.startAt.split('T')[1]?.slice(0, 5) ?? ''
    const [h, m] = hm.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m
  }

  const raw = (ev.time ?? '').trim()
  if (!raw) return Number.MAX_SAFE_INTEGER

  const direct = raw.match(/(\d{1,2}):(\d{2})/)
  if (direct) {
    let h = Number(direct[1])
    const m = Number(direct[2])
    if (raw.includes('오후') && h < 12) h += 12
    if (raw.includes('오전') && h === 12) h = 0
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m
  }

  return Number.MAX_SAFE_INTEGER
}

export default function MonthlyDetailPopup({
  visible,
  onClose,
  interactionLocked = false,
  onPressEvent,
  onPressTask,
  dayData,
}: MonthlyDetailPopupProps) {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.96)).current
  const [taskDoneMap, setTaskDoneMap] = React.useState<Record<string, boolean>>({})
  const [quickTitle, setQuickTitle] = React.useState('')
  const [quickSaving, setQuickSaving] = React.useState(false)
  const [quickCreatedUntimed, setQuickCreatedUntimed] = React.useState<DayEvent[]>([])

  const ANIM_DURATION = 260

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    fadeAnim.setValue(0)
    scaleAnim.setValue(0.96)
  }, [visible, fadeAnim, scaleAnim])

  const spanEvents = dayData.spanEvents ?? []
  const normalEvents = dayData.normalEvents ?? []
  const timedScheduleEvents = dayData.timedScheduleEvents ?? []

  const legacyTimeEvents = dayData.timeEvents ?? []
  const fallbackUntimedTasks = React.useMemo(
    () => legacyTimeEvents.filter((ev) => !hasTime(ev)),
    [legacyTimeEvents],
  )
  const fallbackTimedTasks = React.useMemo(
    () => legacyTimeEvents.filter((ev) => hasTime(ev)),
    [legacyTimeEvents],
  )

  const untimedTasks = dayData.untimedTasks ?? fallbackUntimedTasks
  const timedTasks = dayData.timedTasks ?? fallbackTimedTasks
  const headerTitle = React.useMemo(() => buildHeaderTitle(dayData), [dayData])
  const untimedDisplayEvents = React.useMemo(
    () => [...normalEvents, ...quickCreatedUntimed],
    [normalEvents, quickCreatedUntimed],
  )
  const timedMerged = React.useMemo(() => {
    const merged = [
      ...timedScheduleEvents.map((ev) => ({ kind: 'schedule' as const, ev })),
      ...timedTasks.map((ev) => ({ kind: 'task' as const, ev })),
    ]
    return merged.sort((a, b) => toStartMinutes(a.ev) - toStartMinutes(b.ev))
  }, [timedScheduleEvents, timedTasks])

  React.useEffect(() => {
    if (!visible) return
    const next: Record<string, boolean> = {}
    ;[...untimedTasks, ...timedTasks].forEach((task) => {
      if (task.id == null) return
      next[String(task.id)] = !!task.done
    })
    setTaskDoneMap(next)
  }, [visible, dayData.dateISO])

  React.useEffect(() => {
    if (!visible) return
    setQuickTitle('')
    setQuickCreatedUntimed([])
  }, [visible, dayData.dateISO])

  const toggleTask = async (task: DayEvent) => {
    if (task.id == null) return
    const id = String(task.id)
    const nextDone = !(taskDoneMap[id] ?? !!task.done)
    const targetDateISO = String(dayData.dateISO ?? '').slice(0, 10)

    setTaskDoneMap((prev) => ({ ...prev, [id]: nextDone }))

    try {
      await http.patch(`/task/${id}`, { completed: nextDone })
      bus.emit('calendar:mutated', {
        op: 'update',
        item: {
          id,
          isTask: true,
          isCompleted: nextDone,
          date: targetDateISO,
          startDate: targetDateISO,
          placementDate: targetDateISO,
        },
      })
    } catch (e) {
      console.error('Task toggle failed:', e)
      setTaskDoneMap((prev) => ({ ...prev, [id]: !nextDone }))
    }
  }

  const formatTimeRange = (startAt?: string, endAt?: string) => {
    if (!startAt || !endAt) return ''
    const start = startAt.split('T')[1]?.slice(0, 5) ?? ''
    const end = endAt.split('T')[1]?.slice(0, 5) ?? ''
    return start && end ? `${start}~${end}` : ''
  }

  const normalizeColor = (rawColor?: string, fallback = '#8B5CF6') => {
    if (!rawColor) return fallback
    return resolveScheduleColor(rawColor)
  }

  const renderScheduleCard = (
    ev: DayEvent,
    key: string,
    timeText?: string,
    isUntimed = false,
  ) => {
    const color = normalizeColor(ev.colorKey || ev.color, '#8B5CF6')
    const ScheduleCard = ev.isRecurring ? RepeatScheduleCard : FixedScheduleCard
    const subText = isUntimed
      ? undefined
      : ev.isRecurring
      ? timeText || ev.time?.trim() || ev.labelText?.trim() || ''
      : ev.labelText?.trim() || timeText || ev.time?.trim() || ev.place?.trim() || ev.memo?.trim() || ''

    return (
      <View key={key} style={S.itemWrap}>
        <ScheduleCard
          id={String(ev.id ?? key)}
          title={ev.title}
          color={color}
          density="day"
          isUntimed={isUntimed}
          timeRangeText={subText}
          onPress={!interactionLocked && ev.id != null ? () => onPressEvent?.(ev) : undefined}
          style={
            isUntimed
              ? S.itemCard
              : ev.isRecurring
              ? S.itemCardRepeat
              : S.itemCardTimed
          }
        />
      </View>
    )
  }

  const renderSpanCard = (ev: DayEvent, key: string) => {
    const color = normalizeColor(ev.colorKey || ev.color, '#8B5CF6')
    const fallbackISO = dayData.dateISO ?? ''
    const [rawStart, rawEnd] = (ev.period ?? '').split('~').map((v) => v.trim())
    const startISO = rawStart || fallbackISO
    const endISO = rawEnd || startISO || fallbackISO
    const selectedISO = fallbackISO

    const isStart = !!startISO && selectedISO === startISO
    const isEnd = !!endISO && selectedISO === endISO
    const spanWidth = isEnd ? DETAIL_ITEM_WIDTH : DETAIL_ITEM_WIDTH + DETAIL_RIGHT_EXTENSION

    return (
      <View key={key} style={S.itemWrap}>
        <RangeScheduleBar
          id={String(ev.id ?? key)}
          title={ev.title}
          color={color}
          startISO={startISO}
          endISO={endISO}
          isStart={isStart}
          isEnd={isEnd}
          density="day"
          isUntimed
          onPress={!interactionLocked && ev.id != null ? () => onPressEvent?.(ev) : undefined}
          radiusOverride={DETAIL_ITEM_RADIUS}
          capWidthOverride={DETAIL_ITEM_RADIUS}
          style={[S.itemCard, { width: spanWidth }]}
        />
      </View>
    )
  }

  const renderTaskCard = (task: DayEvent, key: string) => {
    const id = task.id == null ? key : String(task.id)
    const done = taskDoneMap[id] ?? !!task.done

    return (
      <View key={key} style={S.itemWrap}>
        <TaskItemCard
          id={id}
          title={task.title}
          done={done}
          density="day"
          layoutWidthHint={DETAIL_ITEM_WIDTH}
          style={S.itemCard}
          onPress={!interactionLocked && task.id != null ? () => onPressTask?.(task) : undefined}
          onToggle={interactionLocked ? undefined : () => toggleTask(task)}
        />
      </View>
    )
  }

  const submitQuickAdd = async () => {
    const title = quickTitle.trim()
    const iso = dayData.dateISO?.slice(0, 10)
    if (!title || !iso || quickSaving) return

    setQuickSaving(true)
    try {
      const res = await http.post('/event', {
        title,
        content: '',
        labels: [],
        startDate: iso,
        endDate: iso,
        startTime: null,
        endTime: null,
        repeat: null,
        colorKey: 'C00',
      })
      const newId =
        res.data?.data?.id ??
        res.data?.data?._id ??
        res.data?.id ??
        res.data?._id

      setQuickCreatedUntimed((prev) => [
        ...prev,
        {
          id: String(newId ?? `quick-${Date.now()}`),
          title,
          isRecurring: false,
          colorKey: 'C00',
          color: resolveScheduleColor('C00'),
        },
      ])
      setQuickTitle('')

      bus.emit('calendar:mutated', {
        op: 'create',
        item: {
          id: newId,
          isTask: false,
          startDate: iso,
          endDate: iso,
          date: iso,
        },
      })
    } catch (e) {
      console.error('quick add event failed:', e)
    } finally {
      setQuickSaving(false)
    }
  }

  const handleHeaderPress = React.useCallback(() => {
    if (interactionLocked) return
    const iso = String(dayData.dateISO ?? '').slice(0, 10)
    if (!iso) return

    bus.emit('calendar:set-date', iso)
    onClose()
    requestAnimationFrame(() => {
      navigation.navigate('Day')
    })
  }, [dayData.dateISO, interactionLocked, navigation, onClose])

  if (!visible) return null

  return (
    <View
      style={[
        S.modalHost,
        {
          top: APP_HEADER_HEIGHT + insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={interactionLocked ? undefined : onClose}
      />
      <KeyboardAvoidingView
        style={S.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={24}
        pointerEvents="box-none"
      >
        <Animated.View style={[S.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[S.shadowWrap, { transform: [{ scale: scaleAnim }] }]}>
              <View style={S.container}>
                <View style={S.headerRow}>
                  <View style={S.headerLeft}>
                    <Pressable onPress={interactionLocked ? undefined : handleHeaderPress}>
                      <Text style={S.headerText}>{headerTitle}</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={interactionLocked ? undefined : onClose}
                    hitSlop={10}
                    style={S.headerRightIconWrap}
                  >
                    <XIcon width={13} height={13} color={colors.icon.default} />
                  </Pressable>
                </View>

              <ScrollView
                style={S.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={S.scrollContent}
              >
                {spanEvents.map((ev, i) => renderSpanCard(ev, `span-${String(ev.id ?? i)}`))}

                {untimedDisplayEvents.map((ev, i) =>
                  renderScheduleCard(ev, `normal-${String(ev.id ?? i)}`, undefined, false),
                )}

                {untimedTasks.map((task, i) =>
                  renderTaskCard(task, `untimed-task-${String(task.id ?? i)}`),
                )}

                <View style={S.divider} />
                <Text style={S.sectionTitle}>시간별 일정</Text>

                {timedMerged.map((item, i) => {
                  if (item.kind === 'task') {
                    return renderTaskCard(item.ev, `timed-task-${String(item.ev.id ?? i)}`)
                  }
                  const ev = item.ev
                  const timeText = ev.time?.trim()
                    ? ev.time
                    : ev.startAt && ev.endAt
                    ? formatTimeRange(ev.startAt, ev.endAt)
                    : undefined

                  return renderScheduleCard(
                    ev,
                    `timed-${String(ev.id ?? i)}`,
                    timeText,
                    false,
                  )
                })}
              </ScrollView>

              <View style={S.bottomReserved} />
              <View style={S.quickInputWrap}>
                <View style={S.quickInputBox}>
                  <Pressable
                    onPress={submitQuickAdd}
                    hitSlop={8}
                    disabled={quickSaving}
                    style={S.quickPlusBtn}
                  >
                    <PlusBtn width={18} height={18} color={colors.icon.default} />
                  </Pressable>
                  <TextInput
                    value={quickTitle}
                    onChangeText={setQuickTitle}
                    placeholder="일정 제목을 입력하세요..."
                    placeholderTextColor={colors.brand.primary}
                    style={S.quickInput}
                    returnKeyType="done"
                    onSubmitEditing={submitQuickAdd}
                    editable={!quickSaving}
                    blurOnSubmit={false}
                  />
                </View>
              </View>
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

const S = StyleSheet.create({
  modalHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFFB3',
  },
  shadowWrap: {
    width: 350,
    height: 569,
    shadowColor: '#8D99A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },
  container: {
    width: 350,
    height: 569,
    backgroundColor: colors.background.bg1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerRow: {
    marginTop: 24,
    paddingHorizontal: 24,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    flexShrink: 1,
  },
  headerText: {
    ...ts('titleM'),
    color: colors.text.text1,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: ts('titleM').lineHeight,
  },
  headerRightIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    marginTop: 22,
  },
  scrollContent: {
    paddingBottom: 118,
  },
  itemWrap: {
    width: DETAIL_ITEM_WIDTH,
    alignSelf: 'center',
    marginBottom: 8,
  },
  itemCard: {
    width: DETAIL_ITEM_WIDTH,
    height: DETAIL_ITEM_HEIGHT,
    minHeight: 0,
    borderRadius: DETAIL_ITEM_RADIUS,
  },
  itemCardTimed: {
    width: DETAIL_ITEM_WIDTH,
    height: DETAIL_ITEM_HEIGHT,
    minHeight: 0,
    borderRadius: DETAIL_ITEM_RADIUS,
  },
  itemCardRepeat: {
    width: DETAIL_ITEM_WIDTH,
    height: DETAIL_ITEM_HEIGHT,
    minHeight: 0,
    borderRadius: DETAIL_ITEM_RADIUS,
  },
  divider: {
    width: 304,
    height: 1,
    backgroundColor: colors.divider.divider1,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    ...ts('label3'),
    color: colors.text.text3,
    marginLeft: 24,
    marginBottom: 8,
  },
  bottomReserved: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 94,
    backgroundColor: colors.background.bg1,
    shadowColor: '#A4ADB2',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickInputWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInputBox: {
    width: DETAIL_ITEM_WIDTH,
    height: QUICK_INPUT_HEIGHT,
    borderRadius: DETAIL_ITEM_RADIUS,
    borderWidth: 0.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.background.bg1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  quickPlusBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickInput: {
    flex: 1,
    ...ts('body1'),
    color: colors.brand.primary,
    includeFontPadding: false,
  },
})
