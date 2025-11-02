import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native'
import AnimatedRe, { interpolateColor, useAnimatedProps } from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import CalendarModal from '@/components/CalendarModal'
import Menu from '@/assets/icons/menu.svg'
import Filter from '@/assets/icons/filter.svg'
import Left from '@/assets/icons/left.svg'
import Right from '@/assets/icons/right.svg'
import colors from '@/styles/colors'
import { useNavigation } from '@react-navigation/native'
import { bus, EVENT } from '@/lib/eventBus'

const AnimatedMenu = AnimatedRe.createAnimatedComponent(Menu)

/* --- 타입 추가(오류 해결 핵심) --- */
type CustomSwitchProps = {
  value: boolean
  onToggle: () => void
}
type ViewMode = 'month' | 'week' | 'day'

const pad2 = (n: number) => String(n).padStart(2, '0')
const addDays = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, dd + d)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}
const addMonths = (iso: string, dm: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const t = new Date(y, m - 1 + dm, dd)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

const startOfWeek = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = dt.getDay() // 일:0 ~ 토:6  (월요일 시작 쓰시면 보정)
  const s = new Date(y, m - 1, d - wd) // 일요일 시작 기준
  return `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`
}
const endOfWeek = (iso: string) => addDays(startOfWeek(iso), 6)

const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}년 ${pad2(m)}월 ${pad2(d)}일 (${w})`
}

const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/* 스위치 UI */
const CustomSwitch = ({ value, onToggle }: CustomSwitchProps) => (
  <TouchableOpacity
    onPress={onToggle}
    activeOpacity={0.8}
    style={[styles.switchTrack, { backgroundColor: value ? '#B04FFF' : '#ccc' }]}
  >
    <View
      style={[
        styles.switchThumb,
        value ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
      ]}
    />
  </TouchableOpacity>
)

export default function Header() {
  const { progress, toggle } = useDrawer()
  const navigation = useNavigation<any>()

  const [selectedDate, setSelectedDate] = useState(today())
  const [calVisible, setCalVisible] = useState(false)
  const [popup, setPopup] = useState(false)
  const [mode, setMode] = useState<ViewMode>('month') // 외부에서 바뀌면 구독으로 반영

  // 앵커/모드는 방송으로 동기화
  const [anchorDate, setAnchorDate] = useState<string>(today())

  useEffect(() => {
    const onState = (st: { date: string; mode: ViewMode }) => {
      setAnchorDate((prev) => (prev === st.date ? prev : st.date))
      setMode((m) => (m === st.mode ? m : st.mode))
    }
    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null)
    return () => bus.off('calendar:state', onState)
  }, [])

  // 일간뷰로 "진입"할 때만 오늘로 한 번 맞춰주기
  const prevModeRef = useRef<ViewMode>('month')
  useEffect(() => {
    if (prevModeRef.current !== mode && mode === 'day') {
      const t = today()
      // 현재 기준일이 이미 오늘이면 생략
      if (anchorDate !== t) bus.emit('calendar:set-date', t)
    }
    prevModeRef.current = mode
  }, [mode, anchorDate])

  const pad2 = (n: number) => String(n).padStart(2, '0')

  // 'YYYY-MM-DD' -> Date
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // Date -> 'YYYY-MM-DD'
  const toISO = (dt: Date) =>
    `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`

  // 주 시작(일요일 기준) 반환
  const startOfWeek = (iso: string): string => {
    const dt = toDate(iso)
    const wd = dt.getDay() // 0:일 ~ 6:토
    const s = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - wd)
    return toISO(s)
  }

  // 주 끝(토요일) 반환
  const endOfWeek = (iso: string): string => {
    const s = toDate(startOfWeek(iso))
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
    return toISO(e)
  }

  // 안전한 포맷 변환(폴리필 불필요)
  const dot = (ymd: string) => ymd.split('-').join('.')

  // 헤더 마운트/모달 오픈 시 동기화: 지금 달이 뭔지 요청
  React.useEffect(() => {
    const onState = (st: { date: string; mode: ViewMode }) => {
      setAnchorDate(st.date)
      setMode(st.mode)
    }
    bus.on('calendar:state', onState)

    // 현재 상태 요청
    bus.emit('calendar:request-sync', null)

    return () => bus.off('calendar:state', onState)
  }, [])

  // 좌/우 화살표: 한 달 이동 → MonthView에게 명령만
  const goPrev = () => {
    const iso =
      mode === 'month'
        ? addMonths(anchorDate, -1)
        : mode === 'week'
          ? addDays(anchorDate, -7)
          : addDays(anchorDate, -1)
    bus.emit('calendar:set-date', iso)
  }
  const goNext = () => {
    const iso =
      mode === 'month'
        ? addMonths(anchorDate, +1)
        : mode === 'week'
          ? addDays(anchorDate, +7)
          : addDays(anchorDate, +1)
    bus.emit('calendar:set-date', iso)
  }
  // 타이틀(피커 열기)
  const openCalendar = () => setCalVisible(true)

  // 타이틀 문자열: 월간뷰 컨텍스트면 “YYYY년 MM월”
  const title = useMemo(() => {
    if (mode === 'month') {
      const [y, m] = anchorDate.split('-')
      return `${y}년 ${m}월`
    }
    if (mode === 'week') {
      const s = startOfWeek(anchorDate)
      const e = endOfWeek(anchorDate)
      return `${dot(s)} ~ ${dot(e)}`
    }
    return fmtDay(anchorDate)
  }, [anchorDate, mode])

  // ✅ 라벨 목록 (시간표 제거)
  const [labels, setLabels] = useState([
    { id: '1', name: '과제', color: '#B04FFF', enabled: true },
    { id: '3', name: '약속', color: '#B04FFF', enabled: true },
    { id: '4', name: '동아리', color: '#B04FFF', enabled: true },
    { id: '5', name: '수업', color: '#B04FFF', enabled: true },
  ])

  // ✅ toggle logic (즉시 적용)
  const allOn = labels.every((l) => l.enabled)

  const toggleAll = () => {
    const newLabels = labels.map((l) => ({ ...l, enabled: !allOn }))
    setLabels(newLabels)
    navigation.setParams({ labels: newLabels })
  }

  const toggleLabel = (i: number) => {
    const newArr = [...labels]
    newArr[i].enabled = !newArr[i].enabled
    setLabels(newArr)
    navigation.setParams({ labels: newArr })
  }

  // 애니메이션 준비
  const popupOpacity = useState(new Animated.Value(1))[0]
  const sliderX = useState(new Animated.Value(0))[0]
  const maxSlide = 38

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      let x = Math.min(Math.max(g.dx, 0), maxSlide)
      sliderX.setValue(x)
      popupOpacity.setValue(1 - x / maxSlide)
    },
  })

  const menuIconProps = useAnimatedProps(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.icon.default, colors.primary.main],
    ),
  }))

  return (
    <View style={styles.root}>
      {/* Header 영역 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggle}>
          <AnimatedMenu width={28} height={28} animatedProps={menuIconProps} />
        </TouchableOpacity>

        <View style={styles.dateGroup}>
          <TouchableOpacity onPress={goPrev}>
            <Left width={24} height={24} color={colors.icon.default} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCalVisible(true)}
            style={styles.titleContainer}
          >
            <Text style={styles.title}>{title}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goNext}>
            <Right
              width={24}
              height={24}
              color={colors.icon.default}
              style={{ marginTop: 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* 필터 버튼 */}
        <TouchableOpacity
          onPress={() => {
            sliderX.setValue(0)
            popupOpacity.setValue(1)
            setPopup((p) => !p)
          }}
        >
          <Filter
            width={22}
            height={22}
            color={popup ? colors.primary.main : colors.icon.default}
            style={{ marginRight: 15, marginTop: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* 필터 팝업 */}
      {popup && (
        <Animated.View style={[styles.popupContainer, { opacity: popupOpacity }]}>
          <Animated.View style={[styles.popupBox, { opacity: popupOpacity }]}>
            <Text style={styles.popupTitle}>필터</Text>

            <View style={styles.sliderTrack}>
              <Animated.View
                {...pan.panHandlers}
                style={[styles.sliderThumb, { transform: [{ translateX: sliderX }] }]}
              />
            </View>

            <View style={{ height: 16 }} />

            <View style={styles.row}>
              <Text style={styles.allText}>전체</Text>
              <CustomSwitch value={allOn} onToggle={toggleAll} />
            </View>

            <View style={{ height: 7 }} />
            <View style={styles.divider} />
            <View style={{ height: 15 }} />

            {labels.map((l, i) => (
              <View key={l.id} style={styles.row}>
                <View style={styles.labelRow}>
                  <View style={[styles.colorDot, { backgroundColor: l.color }]} />
                  <Text style={styles.labelText}>{l.name}</Text>
                </View>
                <CustomSwitch value={l.enabled} onToggle={() => toggleLabel(i)} />
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      )}

      {/* 달력 모달 */}
      <CalendarModal
        visible={calVisible}
        onClose={() => setCalVisible(false)}
        currentDate={anchorDate}
        onSelectDate={(iso) => bus.emit('calendar:set-date', iso)}
      />
    </View>
  )
}

/* 스타일 */
const styles = StyleSheet.create({
  root: { borderBottomWidth: 0.3, borderBottomColor: '#B3B3B3', height: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
    marginLeft: 14,
  },

  dateGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    letterSpacing: -0.4,
  },

  popupContainer: { position: 'absolute', right: 10, top: 48, zIndex: 999 },

  popupBox: {
    width: 158,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 16,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  popupTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 16 },

  sliderTrack: {
    width: 38,
    height: 2,
    backgroundColor: 'rgba(0.2,0.2,0.2,1)',
    borderRadius: 1,
    position: 'absolute',
    right: 17,
    top: 22,
  },
  sliderThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B4B4B4',
    position: 'absolute',
    top: -5,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  allText: { fontSize: 12, marginLeft: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 16 },
  colorDot: { width: 5, height: 12, marginRight: 4 },
  labelText: { fontSize: 12 },
  divider: { width: 126, height: 1, backgroundColor: '#e1e1e1', alignSelf: 'center' },

  switchTrack: {
    width: 51,
    height: 31,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    marginRight: 16,
  },
  switchThumb: { width: 25, height: 25, borderRadius: 12.5, backgroundColor: '#fff' },
})
