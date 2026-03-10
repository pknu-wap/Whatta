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
import DownL from '@/assets/icons/downL.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { useFocusEffect, useNavigationState } from '@react-navigation/native'
import { bus } from '@/lib/eventBus'
import { useLabelFilter } from '@/providers/LabelFilterProvider'

const AnimatedMenu = AnimatedRe.createAnimatedComponent(Menu)

/* 날짜 관련 유틸 함수 */
const pad2 = (n: number) => String(n).padStart(2, '0')
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
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('day')
  const [popup, setPopup] = useState(globalPopupState.popup)
  const popupOpacity = useState(new Animated.Value(globalPopupState.opacity))[0]
  const sliderX = useState(new Animated.Value(globalPopupState.sliderX))[0]
  const maxSlide = 38
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
    const onState = (st: { date: string; mode?: 'day' | 'week' | 'month' }) => {
      if (typeof st?.date === 'string' && st.date.length >= 10) {
        setAnchorDate(st.date)
      }
      if (st.mode) setCalendarMode(st.mode)
    }

    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null)
    return () => bus.off('calendar:state', onState)
  }, [])

  const title = useMemo(() => {
    if (!anchorDate || anchorDate.length < 7) return ''
    const [y, m] = anchorDate.split('-')
    return `${y}년 ${m}월`
  }, [anchorDate])

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
      [colors.icon.default, colors.icon.selected],
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
        <TouchableOpacity onPress={toggle} style={styles.leftButton}>
          <AnimatedMenu width={24} height={24} animatedProps={menuIconProps} />
        </TouchableOpacity>

        {/* 날짜 그룹 */}
        <View style={styles.dateGroup} pointerEvents="box-none">
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
            <View style={styles.titleIconWrap}>
              <DownL
                width={12}
                height={10}
                color={calVisible ? colors.icon.selected : colors.icon.default}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* 필터 버튼 */}
        <TouchableOpacity
          style={styles.rightButton}
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
            width={19}
            height={19}
            color={popup ? colors.icon.selected : colors.icon.default}
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
        initialOpenMode={calendarMode === 'month' ? 'picker' : 'calendar'}
        pickerConfirmVariant={calendarMode === 'month' ? 'move' : 'icon'}
        showPickerCancel={calendarMode !== 'month'}
        pickerActionsLift={calendarMode === 'month' ? 8 : 0}
      />
    </View>
  )
}

/* 스타일 */
const styles = StyleSheet.create({
  root: { height: 48 },
  header: {
    position: 'relative',
    height: '100%',
  },
  leftButton: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  rightButton: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dateGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 75,
    zIndex: 1,
  },
  titleContainer: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    ...ts('titleL'),
    fontSize: 20,
    lineHeight: 30,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  titleIconWrap: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
