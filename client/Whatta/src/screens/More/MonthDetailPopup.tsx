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
import { ts } from '@/styles/typography'
import { Easing } from 'react-native'

const { width, height } = Dimensions.get('window')

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
}

interface MonthlyDetailPopupProps {
  visible: boolean
  onClose: () => void
  dayData: {
    date?: string
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
  const fadeAnim = React.useRef(new Animated.Value(0)).current
const scaleAnim = React.useRef(new Animated.Value(0.95)).current
const [isVisible, setIsVisible] = React.useState(visible)


  // ✅ 시간 미정 Task 상태 관리
  const [tasks, setTasks] = React.useState<DayEvent[]>([])

  React.useEffect(() => {
    if (dayData.timeEvents) {
      setTasks(
        dayData.timeEvents
          .filter(ev => !ev.startAt && !ev.endAt)
          .map(ev => ({ ...ev, done: false }))
      )
    }
  }, [dayData])

  const toggleTask = (idx: number) => {
    setTasks(prev =>
      prev.map((t, i) => (i === idx ? { ...t, done: !t.done } : t))
    )
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

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[S.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[S.container, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
<View style={S.header}>
  <View style={S.headerInner}>
    <Text style={[S.headerText]}>{dayData.date} ({dayData.dayOfWeek})</Text>
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
            {/* Span Events */}
            {dayData.spanEvents && dayData.spanEvents.length > 0 && (
              <View style={S.section}>
                {dayData.spanEvents.map((t, i) => { 
                    const currentDate = dayData.date?.trim()

  let startDate = ''
  let endDate = ''
  if (t.period?.includes('~')) {
    const [start, end] = t.period.split('~').map(s => s.trim())
    startDate = start
    endDate = end
  }

  // ✅ YYYY-MM-DD → MM월 DD일로 변환
  const formatToKoreanDate = (isoDate: string) => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${parseInt(month)}월 ${parseInt(day)}일`
  }

  const startKorean = formatToKoreanDate(startDate)
  const endKorean = formatToKoreanDate(endDate)

  // ✅ 비교
  const isStart = currentDate === startKorean
  const isEnd = currentDate === endKorean

  // ✅ 마진 조건
  const marginStyle =
    isStart
      ? { marginLeft: 24, marginRight: 0 }
      : isEnd
      ? { marginLeft: 0, marginRight: 24 }
      : { marginLeft: 0, marginRight: 0 }

const rawColor = t.colorKey || t.color
const formatted = rawColor
  ? rawColor.startsWith('#')
    ? rawColor
    : `#${rawColor}`
  : null

const baseColor =
  !formatted || formatted.toUpperCase() === '#FFFFFF'
    ? '#8B5CF6'
    : formatted

const bgWithOpacity = baseColor.length === 7 ? `${baseColor}26` : baseColor

  return (
    <View
  key={t.id ?? i}
  style={[
    S.chip,
    marginStyle,
    {
      backgroundColor: bgWithOpacity,
      borderTopLeftRadius: isStart ? 6 : 0,
      borderBottomLeftRadius: isStart ? 6 : 0,
      borderTopRightRadius: isEnd ? 6 : 0,
      borderBottomRightRadius: isEnd ? 6 : 0,
    },
  ]}
>
  {isStart && (
  <View
    style={[
      S.chipBar,
      { left: 0, backgroundColor: baseColor }, 
    ]}
  />
)}
{isEnd && (
  <View
    style={[
      S.chipBar,
      { right: 0, backgroundColor: baseColor }, 
    ]}
  />
)}

  {/* ✅ 내용 */}
  <View style={{ flex: 1, paddingLeft: isStart ? 14 : 10, paddingRight: isEnd ? 14 : 10 }}>
    <Text style={S.chipText} numberOfLines={1}>
      {t.title}
    </Text>
    {t.period && (
      <Text
        style={[ts('place'), { color: '#333333', fontSize: 10, marginTop: 2 }]}
        numberOfLines={1}
      >
        {t.period}
      </Text>
    )}
  </View>
</View>
  )
})}
              </View>
            )}

<View style={S.divider} />
<View style={S.section}>
  <Text
    style={{
      fontSize: 12,
      fontWeight: '600',
      color: '#333333',
      marginLeft: 24,
      marginBottom: 12,
      marginTop: -6,
    }}
  >
    시간별 일정
  </Text>

  {/* spanEvents) */}
  {dayData.timeEvents
    ?.filter(ev => ev.startAt && ev.endAt)
    .map((ev, i) => (
      <View key={i} style={[S.card, { backgroundColor: ev.color || '#FFF8F0' }]}>
        <View
          style={{
            width: 8,
            height: '100%',
            backgroundColor: ev.color || '#FFD966',
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            marginRight: 10,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[ts('daySchedule'), { fontWeight: '700', color: '#000' }]}>
            {ev.title}
          </Text>
          <Text style={[ts('time'), { color: '#333', marginTop: 3 }]}>
            {ev.startAt && ev.endAt
              ? formatTimeRange(ev.startAt, ev.endAt)
              : '시간 미정'}
          </Text>
        </View>
      </View>
    ))}

</View>

{/* 🧾 Task (시간 미정 일정) */}
            {tasks.length > 0 && (
             <View style={{ gap: 8 }}>
                {tasks.map((task, i) => (
                  <Pressable
                    key={i}
                    onPress={() => toggleTask(i)}
                    style={[S.taskCard, task.done && S.taskCardDone]}
                  >
                    <View style={S.checkboxWrap}>
                      <View
                        style={[
                          S.checkbox,
                          task.done ? S.checkboxOn : S.checkboxOff,
                        ]}
                      >
                        {task.done && <Text style={S.checkMark}>✓</Text>}
                      </View>
                    </View>

                    <Text
                      style={[S.taskText, task.done && S.taskTextDone]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

{/* DnD Events */}
{dayData.normalEvents && dayData.normalEvents.length > 0 && (
  <View style={S.section}>
    {dayData.normalEvents.map((ev: DayEvent, i: number) => (
      <View
  key={i}
  style={[
    S.card,
    {
      backgroundColor: colors.neutral.surface,
    },
  ]}
>
  {/* 왼쪽 컬러 바 */}
  <View
    style={{
      width: 10,
      height: 44,
      backgroundColor: ev.color || '#FFD966', // 노란색 기본
      marginRight: 10,
    }}
  />

  {/* 내용 */}
  <View style={{ flex: 1 }}>
    <Text style={[ts('daySchedule'), { fontSize: 11 ,fontWeight: '600', color: '#000000' }]}>
      {ev.title}
    </Text>
    <Text style={[ts('time'), { color: '#333', marginTop: 3 }]}>
  {ev.time?.trim()
    ? ev.time
    : (ev.startAt && ev.endAt
        ? formatTimeRange(ev.startAt, ev.endAt)
        : '시간 미정')}
</Text>
  </View>
</View>
    ))}
  </View>
)}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  height: 0.5,
  backgroundColor: '#333333',
  marginHorizontal: 7,
  marginTop: 12,
  marginBottom: 10,
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