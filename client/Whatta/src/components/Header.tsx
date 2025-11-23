// ★ 통합 Header.tsx — 두 파일의 모든 기능 완전 병합 버전

import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native'
import AnimatedRe, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import CalendarModal from '@/components/CalendarModal'
import Menu from '@/assets/icons/menu.svg'
import Filter from '@/assets/icons/filter.svg'
import Left from '@/assets/icons/left.svg'
import Right from '@/assets/icons/right.svg'
import colors from '@/styles/colors'
import { useNavigation } from '@react-navigation/native'
import { bus } from '@/lib/eventBus'

const AnimatedMenu = AnimatedRe.createAnimatedComponent(Menu)

type CustomSwitchProps = { value: boolean; onToggle: () => void }
type ViewMode = 'month' | 'week' | 'day'

const pad2 = (n: number) => String(n).padStart(2, '0')
const addDays = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, dd + d)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}
const addMonthsToStart = (iso: string, dm: number) => {
  const [y, m] = iso.split('-').map(Number)
  const t = new Date(y, m - 1 + dm, 1)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-01`
}

const dot = (ymd: string) => ymd.split('-').join('.')

const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}년 ${pad2(m)}월 ${pad2(d)}일 (${w})`
}

const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

/* 스위치 */
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
  const { progress, toggle, close } = useDrawer()
  const navigation = useNavigation<any>()

  const [calVisible, setCalVisible] = useState(false)
  const [popup, setPopup] = useState(false)
  const [mode, setMode] = useState<ViewMode>('month')

  // ★ 주간뷰의 실제 rangeStart ~ rangeEnd 를 보관
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [days, setDays] = useState<number>(7) // 5일뷰/7일뷰 지원

  const [anchorDate, setAnchorDate] = useState(today())

  /* drawer dimmer */
  const headerCatcherStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.01], [0, 1]),
    pointerEvents: progress.value > 0.01 ? 'auto' : 'none',
  }))

  /* Calendar state sync */
  useEffect(() => {
    const onState = (st: {
      date: string
      mode: ViewMode
      days?: number
      rangeStart?: string
      rangeEnd?: string
    }) => {
      setAnchorDate((p) => (p === st.date ? p : st.date))
      setMode((m) => (m === st.mode ? m : st.mode))

      if (st.days) setDays(st.days)
      if (st.rangeStart) setRangeStart(st.rangeStart)
      if (st.rangeEnd) setRangeEnd(st.rangeEnd)
    }

    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null)

    return () => bus.off('calendar:state', onState)
  }, [])

  /* 좌/우 이동 로직 통합 */
  const goPrev = () => {
    const iso =
      mode === 'month'
        ? addMonthsToStart(anchorDate, -1)
        : mode === 'week'
          ? addDays(anchorDate, -(days ?? 7))
          : addDays(anchorDate, -1)

    bus.emit('calendar:set-date', iso)
  }

  const goNext = () => {
    const iso =
      mode === 'month'
        ? addMonthsToStart(anchorDate, +1)
        : mode === 'week'
          ? addDays(anchorDate, +(days ?? 7))
          : addDays(anchorDate, +1)

    bus.emit('calendar:set-date', iso)
  }

  /* ★ 제목 계산 — 주간뷰는 rangeStart ~ rangeEnd 사용 */
  const title = useMemo(() => {
    if (mode === 'month') {
      const [y, m] = anchorDate.split('-')
      return `${y}년 ${m}월`
    }
    if (mode === 'week') {
      if (rangeStart && rangeEnd) {
        return `${dot(rangeStart)} ~ ${dot(rangeEnd)}`
      }
      return dot(anchorDate)
    }
    return fmtDay(anchorDate)
  }, [anchorDate, mode, rangeStart, rangeEnd])

  /* 라벨 필터 */
  const [labels, setLabels] = useState([
    { id: '1', name: '과제', color: '#B04FFF', enabled: true },
    { id: '2', name: '약속', color: '#B04FFF', enabled: true },
    { id: '3', name: '동아리', color: '#B04FFF', enabled: true },
    { id: '4', name: '수업', color: '#B04FFF', enabled: true },
  ])

  const allOn = labels.every((l) => l.enabled)

  const toggleAll = () => {
    const next = labels.map((l) => ({ ...l, enabled: !allOn }))
    setLabels(next)
    navigation.setParams({ labels: next })
  }

  const toggleLabel = (i: number) => {
    const next = [...labels]
    next[i].enabled = !next[i].enabled
    setLabels(next)
    navigation.setParams({ labels: next })
  }

  /* filter popup */
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

  /* --------------- render --------------- */

  return (
    <View style={styles.root}>
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
            <Right width={24} height={24} color={colors.icon.default} />
          </TouchableOpacity>
        </View>

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
            style={{ marginRight: 15 }}
          />
        </TouchableOpacity>
      </View>

      {/* drawer dimmer */}
      <AnimatedRe.View
        style={[StyleSheet.absoluteFill, headerCatcherStyle, { zIndex: 10 }]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={close} />
      </AnimatedRe.View>

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

      {/* 캘린더 모달 */}
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

  dateGroup: { flexDirection: 'row', alignItems: 'center' },
  titleContainer: { marginHorizontal: 10 },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0,0,0,1)',
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
  allText: { fontSize: 14, marginLeft: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 16 },
  colorDot: { width: 5, height: 12, marginRight: 4 },
  labelText: { fontSize: 14 },
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
