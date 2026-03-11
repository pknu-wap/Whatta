import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native'
import colors from '@/styles/colors'
import { Easing } from 'react-native'
import { http } from '@/lib/http'
import { bus } from '@/lib/eventBus'
import { useNavigation } from '@react-navigation/native'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

const { width, height } = Dimensions.get('window')
const DETAIL_ITEM_WIDTH = 302
const DETAIL_ITEM_HEIGHT = 50
const DETAIL_ITEM_RADIUS = 12

export interface DayEvent {
  title: string
  period?: string
  memo?: string
  place?: string
  time?: string
  color?: string
  borderColor?: string
  colorKey?: string
  id?: string | number
  isStart?: boolean
  isEnd?: boolean
  startAt?: string
  endAt?: string
  done?: boolean
  isRecurring?: boolean
}

interface MonthlyDetailPopupProps {
  visible: boolean
  onClose: () => void
  dayData: {
    date?: string
    dateISO?: string
    dayOfWeek?: string
    spanEvents?: DayEvent[]
    normalEvents?: DayEvent[]
    timeEvents?: DayEvent[]
  }
}

export default function MonthlyDetailPopup({
  visible,
  onClose,
  dayData,
}: MonthlyDetailPopupProps) {
  const nav = useNavigation<any>()
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current
  const [isVisible, setIsVisible] = React.useState(visible)

  // ✅ 시간 미정 Task 상태 관리
  const [tasks, setTasks] = React.useState<DayEvent[]>([])

  React.useEffect(() => {
    if (dayData.timeEvents) {
      setTasks(
        dayData.timeEvents
          .filter((ev) => !ev.startAt && !ev.endAt)
          .map((ev) => ({ ...ev, done: ev.done ?? false })),
      )
    }
  }, [dayData])

  const toggleTask = async (idx: number) => {
    const task = tasks[idx]
    if (!task.id) return

    const nextDone = !task.done

    // 1. UI 즉시 반영
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, done: nextDone } : t)))

    // 2. 서버 요청 & 이벤트 발행
    try {
      await http.patch(`/task/${task.id}`, {
        completed: nextDone,
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id: task.id, isTask: true, isCompleted: nextDone },
      })
    } catch (e) {
      console.error('Task toggle failed:', e)
      setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, done: !nextDone } : t)))
    }
  }

  // ✅ 애니메이션 지속 시간 늘리기
  const ANIM_DURATION = 450

  React.useEffect(() => {
    if (visible) {
      setIsVisible(true)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // ✅ 닫힘 애니메이션 (살짝 느리게)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIM_DURATION + 100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: ANIM_DURATION + 100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 애니 끝난 후 unmount
        setIsVisible(false)
      })
    }
  }, [visible])

  if (!isVisible) return null

  const handleHeaderDatePress = () => {
    const iso = dayData.dateISO
    if (!iso) return
    nav.navigate('Day')
    onClose()
  }

  // ✅ ISO 시간 변환 함수
  const formatTimeRange = (startAt?: string, endAt?: string) => {
    if (!startAt || !endAt) return ''
    try {
      const start = startAt.split('T')[1]?.slice(0, 5) ?? ''
      const end = endAt.split('T')[1]?.slice(0, 5) ?? ''
      return `${start}~${end}`
    } catch {
      return ''
    }
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
    const subText = isUntimed ? undefined : ev.isRecurring ? timeText : (ev.place ?? '')

    return (
      <View key={key} style={S.itemWrap}>
        <ScheduleCard
          id={String(ev.id ?? key)}
          title={ev.title}
          color={color}
          density="day"
          isUntimed={isUntimed}
          timeRangeText={subText}
          style={S.itemCard}
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
    const periodText = ev.period || (fallbackISO ? `${fallbackISO}~${fallbackISO}` : undefined)

    return (
      <View key={key} style={S.itemWrap}>
        <RangeScheduleBar
          id={String(ev.id ?? key)}
          title={ev.title}
          color={color}
          startISO={startISO}
          endISO={endISO}
          isStart
          isEnd
          density="day"
          isUntimed={!periodText}
          timeRangeText={periodText}
          radiusOverride={DETAIL_ITEM_RADIUS}
          capWidthOverride={DETAIL_ITEM_RADIUS}
          style={S.itemCard}
        />
      </View>
    )
  }

  const spanEvents = dayData.spanEvents ?? []
  const recurringEvents = (dayData.normalEvents ?? []).filter((ev) => !!ev.isRecurring)
  const basicEvents = (dayData.normalEvents ?? []).filter((ev) => !ev.isRecurring)
  const hasAnySchedule = spanEvents.length > 0 || recurringEvents.length > 0 || basicEvents.length > 0

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[S.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[S.container, { transform: [{ scale: scaleAnim }] }]}>
            {/* Header */}
            <View style={S.header}>
              <View style={S.headerInner}>
                <Pressable onPress={handleHeaderDatePress}>
                  <Text style={[S.headerText]}>
                    {dayData.date} ({dayData.dayOfWeek})
                  </Text>
                </Pressable>
                {/* 커스텀 X 아이콘 */}
                <Pressable onPress={onClose} hitSlop={10} style={S.closeWrap}>
                  <View style={S.closeLine1} />
                  <View style={S.closeLine2} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {hasAnySchedule && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>일정</Text>
                  {spanEvents.map((ev, i) => renderSpanCard(ev, `span-${String(ev.id ?? i)}`))}

                  {recurringEvents.map((ev, i) => {
                    const timeText = ev.time?.trim()
                      ? ev.time
                      : ev.startAt && ev.endAt
                      ? formatTimeRange(ev.startAt, ev.endAt)
                      : undefined

                    return renderScheduleCard(
                      ev,
                      `repeat-${String(ev.id ?? i)}`,
                      timeText,
                      !timeText,
                    )
                  })}

                  {basicEvents.map((ev, i) => {
                    const timeText = ev.time?.trim()
                      ? ev.time
                      : ev.startAt && ev.endAt
                        ? formatTimeRange(ev.startAt, ev.endAt)
                        : undefined

                    return renderScheduleCard(
                      ev,
                      `normal-${String(ev.id ?? i)}`,
                      timeText,
                      !timeText,
                    )
                  })}
                </View>
              )}

              {hasAnySchedule && tasks.length > 0 ? <View style={S.divider} /> : null}

              {tasks.length > 0 && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>할 일</Text>
                  {tasks.map((task, i) => (
                    <View key={`task-${String(task.id ?? i)}`} style={S.itemWrap}>
                      <TaskItemCard
                        id={String(task.id ?? i)}
                        title={task.title}
                        done={!!task.done}
                        density="day"
                        layoutWidthHint={DETAIL_ITEM_WIDTH}
                        style={S.itemCard}
                        onPress={() => toggleTask(i)}
                        onToggle={() => toggleTask(i)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000B2',
  },
  container: {
    width: width * 0.877,
    maxHeight: height * 0.678,
    backgroundColor: colors.neutral.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    height: height * 0.071,
    backgroundColor: '#F7F7F7',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E6E6',
    justifyContent: 'center',
  },

  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#000',
  },

  closeWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeLine1: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#808080',
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },

  closeLine2: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#808080',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },

  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.text1,
    marginLeft: 24,
    marginBottom: 4,
  },
  itemWrap: {
    width: DETAIL_ITEM_WIDTH,
    alignSelf: 'center',
  },
  itemCard: {
    width: DETAIL_ITEM_WIDTH,
    height: DETAIL_ITEM_HEIGHT,
    minHeight: 0,
    borderRadius: DETAIL_ITEM_RADIUS,
  },

  chip: {
    position: 'relative',
    overflow: 'visible',
    marginTop: 4,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  chipBar: {
    position: 'absolute',
    width: 10,
    top: 0,
    bottom: 0,
  },

  chipText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
  },

  divider: {
    height: 0.7,
    backgroundColor: colors.divider.divider1,
    marginHorizontal: 7,
    marginTop: 16,
    marginBottom: 7,
  },

  card: {
    width: '86%',
    alignSelf: 'center',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B3B3B3',
    borderRightWidth: 0,
    borderLeftWidth: 0,
    marginHorizontal: '4%',
  },

  taskCard: {
    width: '86%',
    alignSelf: 'center',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  checkboxWrap: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 11,
    height: 11,
    borderRadius: 1,
  },
  taskText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
  checkboxOff: {
    width: 18,
    height: 18,
    borderColor: '#333',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {
    width: 18,
    height: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  taskCardDone: {
    backgroundColor: '#FFFFFF',
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    fontSize: 12,
  },
})
