import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  Pressable,
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
import {
  useNavigation,
  useFocusEffect,
  useNavigationState,
} from '@react-navigation/native'
import { bus } from '@/lib/eventBus'
import { useLabelFilter } from '@/providers/LabelFilterProvider'

const AnimatedMenu = AnimatedRe.createAnimatedComponent(Menu)

type ViewMode = 'month' | 'week' | 'day'

/* 날짜 관련 유틸 함수 */
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
const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toISO = (dt: Date) =>
  `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
const startOfWeek = (iso: string) => {
  const dt = toDate(iso)
  const wd = dt.getDay()
  const s = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - wd)
  return toISO(s)
}
const endOfWeek = (iso: string) =>
  toISO(new Date(toDate(startOfWeek(iso)).getTime() + 6 * 86400000))
const dot = (ymd: string) => ymd.split('-').join('.')
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}년 ${pad2(m)}월 ${pad2(d)}일 (${w})`
}
const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`
}

/* Custom Toggle 컴포넌트 정의 */
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
      style={{
        width: 51,
        height: 31,
        borderRadius: 26,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: disabled ? '#E3E5EA' : value ? '#B04FFF' : '#B3B3B3',
        opacity: disabled ? 0.4 : 1,
        marginRight: 16, // 기존 레이아웃 맞춤용 여백
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

/* 전역 필터 상태 */
const globalPopupState = {
  popup: false,
  opacity: 1,
  sliderX: 38,
}

export default function Header() {
  const { progress, toggle, close } = useDrawer()

  const [calVisible, setCalVisible] = useState(false)
  const [popup, setPopup] = useState(globalPopupState.popup)
  const popupOpacity = useState(new Animated.Value(globalPopupState.opacity))[0]
  const sliderX = useState(new Animated.Value(globalPopupState.sliderX))[0]
  const maxSlide = 38
  const [mode, setMode] = useState<ViewMode>('month')

  const [days, setDays] = useState<number>(7)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)

  /* ✅ 현재 활성 탭 감지 */
  const currentRouteName = useNavigationState((state) => {
    const route = state.routes[state.index]
    return route.name
  })

  /* ✅ 마이페이지/할일관리 이동 시 필터창 자동 닫기 */
  useEffect(() => {
    if (popup && (currentRouteName === 'MyPage' || currentRouteName === 'Task')) {
      setPopup(false)
      globalPopupState.popup = false
    }
  }, [currentRouteName])

  useFocusEffect(
    React.useCallback(() => {
      if (globalPopupState.popup) {
        setPopup(true)
        popupOpacity.setValue(globalPopupState.opacity)
        sliderX.setValue(globalPopupState.sliderX)
      }
      return () => {}
    }, []),
  )

  const headerCatcherStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.01], [0, 1]),
  }))

  // 앵커/모드는 방송으로 동기화
  const [anchorDate, setAnchorDate] = useState<string>(today())

  // 헤더는 상태 방송만 구독: 모드/기준일 동기화
  useEffect(() => {
    const onState = (st: {
      date: string
      mode: ViewMode
      days?: number
      rangeStart?: string
      rangeEnd?: string
    }) => {
      setAnchorDate(st.date)
      setMode(st.mode)

      if (st.days) setDays(st.days)
      if (st.rangeStart) setRangeStart(st.rangeStart)
      if (st.rangeEnd) setRangeEnd(st.rangeEnd)
    }

    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null)
    return () => bus.off('calendar:state', onState)
  }, [])

  const goPrev = () => {
    const iso =
      mode === 'month'
        ? addMonths(anchorDate, -1)
        : mode === 'week'
          ? addDays(anchorDate, -days)
          : addDays(anchorDate, -1)
    bus.emit('calendar:set-date', iso)
  }
  const goNext = () => {
    const iso =
      mode === 'month'
        ? addMonths(anchorDate, +1)
        : mode === 'week'
          ? addDays(anchorDate, +days)
          : addDays(anchorDate, +1)
    bus.emit('calendar:set-date', iso)
  }

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

  const { items: filterLabels, toggleLabel, toggleAll } = useLabelFilter()

  const allOn = filterLabels.length > 0 && filterLabels.every((l) => l.enabled)

  // ✅ 슬라이더: 드래그 & 터치 이동 가능
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const x = Math.min(Math.max(g.dx, 0), maxSlide)
      sliderX.setValue(x)
      const opacity = 0.7 + (x / maxSlide) * 0.3
      popupOpacity.setValue(opacity)
      globalPopupState.opacity = opacity
      globalPopupState.sliderX = x
    },
  })

  const menuIconProps = useAnimatedProps(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.icon.default, colors.primary.main],
    ),
  }))

  useEffect(() => {
    const closeHandler = () => {
      setPopup(false)
      globalPopupState.popup = false
      bus.emit('filter:popup', false)
    }
    bus.on('filter:close', closeHandler)
    return () => bus.off('filter:close', closeHandler)
  }, [])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {/* ☰ 메뉴 */}
        <TouchableOpacity onPress={toggle}>
          <AnimatedMenu width={28} height={28} animatedProps={menuIconProps} />
        </TouchableOpacity>

        {/* 날짜 그룹 */}
        <View style={styles.dateGroup}>
          <TouchableOpacity onPress={goPrev}>
            <Left width={24} height={24} color={colors.icon.default} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (popup) {
                setPopup(false)
                globalPopupState.popup = false
              } else {
                setCalVisible(true)
              }
            }}
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
            const next = !popup
            setPopup(next)
            globalPopupState.popup = next
            if (next) {
              sliderX.setValue(maxSlide)
              popupOpacity.setValue(1)
              globalPopupState.sliderX = maxSlide
              globalPopupState.opacity = 1
            }
            bus.emit('filter:popup', next)
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

      {/* 필터 팝업 닫기용 투명 영역 (왼쪽/오른쪽) */}
      {popup && (
        <>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 44,
              width: 40,
              height: 48,
              zIndex: 2,
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{ flex: 1 }}
              onPress={() => {
                setPopup(false)
                globalPopupState.popup = false
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 50,
              width: 40,
              height: 48,
              zIndex: 2,
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{ flex: 1 }}
              onPress={() => {
                setPopup(false)
                globalPopupState.popup = false
              }}
            />
          </View>
        </>
      )}

      <AnimatedRe.View
        style={[StyleSheet.absoluteFill, headerCatcherStyle, { zIndex: 10 }]}
        pointerEvents="none"
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={close} />
      </AnimatedRe.View>

      {/* 필터창 팝업 */}
      {popup && (
        <Animated.View style={[styles.popupContainer, { opacity: popupOpacity }]}>
          <Animated.View
            style={[styles.popupBox, { opacity: popupOpacity }]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height
              bus.emit('filter:popup-height', h)
            }}
          >
            <Text style={styles.popupTitle}>필터</Text>

            {/* 투명도 슬라이더 */}
            <TouchableWithoutFeedback
              onPress={(e) => {
                const { locationX } = e.nativeEvent
                const clampedX = Math.min(Math.max(locationX, 0), maxSlide)
                sliderX.setValue(clampedX)
                const opacity = 0.7 + (clampedX / maxSlide) * 0.3
                popupOpacity.setValue(opacity)
                globalPopupState.opacity = opacity
                globalPopupState.sliderX = clampedX
              }}
            >
              <View style={styles.sliderTrack}>
                <Animated.View
                  {...pan.panHandlers}
                  style={[styles.sliderThumb, { transform: [{ translateX: sliderX }] }]}
                />
              </View>
            </TouchableWithoutFeedback>

            <View style={{ height: 16 }} />

            {/* 전체 선택 토글 */}
            <View style={styles.row}>
              <Text style={styles.allText}>전체</Text>
              <CustomToggle
                value={allOn}
                onChange={() => {
                  toggleAll()
                  bus.emit('filter:changed', filterLabels)
                }}
              />
            </View>

            <View style={{ height: 7 }} />
            <View style={styles.divider} />
            <View style={{ height: 15 }} />

            {/* 개별 라벨 토글 */}
            {filterLabels.map((l) => (
              <View key={l.id} style={styles.row}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelText}>{l.title}</Text>
                </View>
                <CustomToggle
                  value={l.enabled}
                  onChange={() => {
                    toggleLabel(l.id)
                    bus.emit('filter:changed', filterLabels)
                  }}
                />
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
        onPressToday={() => bus.emit('calendar:set-date', today())}
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
    backgroundColor: 'rgba(0.2,0.2,0.2,1)',
    borderRadius: 1,
    position: 'absolute',
    right: 25,
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
  labelText: { fontSize: 14 },
  divider: { width: 126, height: 1, backgroundColor: '#e1e1e1', alignSelf: 'center' },
})
