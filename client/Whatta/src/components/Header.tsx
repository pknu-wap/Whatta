import React, { useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { interpolateColor, useAnimatedProps } from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import CalendarModal from '@/components/CalendarModal'

import Menu from '@/assets/icons/menu.svg'
import Filter from '@/assets/icons/filter.svg'
import Left from '@/assets/icons/left.svg'
import Right from '@/assets/icons/right.svg'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

const AnimatedMenu = Animated.createAnimatedComponent(Menu)

/* util */
const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}년 ${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일 (${w})`
}
const addDays = (iso: string, delta: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const nd = new Date(y, m - 1, d + delta)
  return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`
}
const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export default function Header() {
  const { progress, toggle } = useDrawer()
  const [selectedDate, setSelectedDate] = useState(today())
  const [calVisible, setCalVisible] = useState(false)
  const headerRef = useRef<View>(null)

  const menuIconProps = useAnimatedProps(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.icon.default, colors.primary.main],
    ),
  }))

  const openCalendar = useCallback(() => {
    setCalVisible(true)
  }, [])
  const closeCalendar = useCallback(() => setCalVisible(false), [])
  const goPrevDay = useCallback(() => setSelectedDate((d) => addDays(d, -1)), [])
  const goNextDay = useCallback(() => setSelectedDate((d) => addDays(d, +1)), [])

  const title = useMemo(() => fmt(selectedDate), [selectedDate])
  const dateTextColor = calVisible ? colors.primary.main : colors.text.title

  return (
    <View style={S.root}>
      <View ref={headerRef} style={S.header}>
        {/* 메뉴 */}
        <TouchableOpacity onPress={toggle}>
          <AnimatedMenu width={28} height={28} animatedProps={menuIconProps} />
        </TouchableOpacity>

        {/* 날짜/네비 */}
        <View style={S.dateGroup}>
          <TouchableOpacity
            onPress={!calVisible ? goPrevDay : undefined}
            disabled={calVisible}
          >
            <Left width={24} height={24} color={colors.icon.default} />
          </TouchableOpacity>

          <TouchableOpacity onPress={openCalendar} style={S.titleContainer} hitSlop={10}>
            <Text style={[S.title, { color: dateTextColor }]}>{title}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={!calVisible ? goNextDay : undefined}
            disabled={calVisible}
          >
            <Right
              width={24}
              height={24}
              color={colors.icon.default}
              style={{ marginTop: 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* 필터 */}
        <TouchableOpacity disabled={calVisible}>
          <Filter
            width={22}
            height={22}
            color={colors.icon.default}
            style={{ marginRight: 15, marginTop: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* 달력 모달 */}
      <CalendarModal
        visible={calVisible}
        onClose={closeCalendar}
        currentDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </View>
  )
}

const S = StyleSheet.create({
  root: {
    borderBottomWidth: 0.3,
    borderBottomColor: '#B3B3B3',
    height: 48,
  },
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
})
