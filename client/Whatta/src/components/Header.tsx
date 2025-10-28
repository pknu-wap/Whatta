// Header.tsx (수정된 파일)

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
// 날짜 포맷팅 및 조작 유틸리티는 그대로 유지합니다.
// ... (fmt, addDays, today 함수)

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

// 💡 1. MonthView.tsx에서 전달하는 props에 맞게 타입을 정의합니다.
export interface HeaderProps {
  // MonthView.tsx에서 전달하는 필수 핸들러
  onLeftPress: () => void
  onRightPress: () => void
  onFilterPress: () => void
  onMenuPress: () => void // MonthView에서 토글 메뉴로 사용된 것으로 보임
  isFilterActive: boolean

  // Header 자체 로직에서 필요한 props (선택적으로 외부에서 제어)
  selectedDate?: string // 현재 선택된 날짜 (외부에서 제어 가능하도록)
  onSelectDate?: (date: string) => void // 날짜 선택 핸들러
}

// 💡 2. Header 컴포넌트가 props를 받도록 수정합니다.
export default function Header({
  onLeftPress,
  onRightPress,
  onFilterPress,
  onMenuPress,
  isFilterActive,
  selectedDate: propDate,
  onSelectDate: propSetDate,
}: HeaderProps) {
  const { progress, toggle } = useDrawer()

  // 💡 3. Header 내부 상태를 제거하고 props로 대체 (또는 로컬 상태 유지 중 선택)
  // 현재 코드는 CalendarModal을 위해 날짜 상태를 내부에서 관리하므로, 이 로직은 유지하거나
  // MonthView에서 selectedDate와 onSelectDate를 props로 전달받는 것을 전제로 합니다.

  // 편의를 위해 내부 상태를 유지하고, MonthView가 이를 제어할 수 있도록 옵션화합니다.
  const [localSelectedDate, localSetSelectedDate] = useState(today())
  const [calVisible, setCalVisible] = useState(false)
  const headerRef = useRef<View>(null)

  // 실제 사용될 상태: props가 있으면 props 사용, 없으면 로컬 상태 사용
  const currentSelectedDate = propDate || localSelectedDate
  const currentSetSelectedDate = propSetDate || localSetSelectedDate

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

  // 💡 4. 날짜 네비게이션 함수를 prop으로 받은 onLeftPress/onRightPress를 사용하도록 수정
  // 이전/다음 날짜 이동 로직은 MonthView에서 처리하도록 위임합니다.
  const title = useMemo(() => fmt(currentSelectedDate), [currentSelectedDate])
  const dateTextColor = calVisible ? colors.primary.main : colors.text.title

  return (
    <View style={S.root}>
      <View ref={headerRef} style={S.header}>
        {/* 메뉴: 외부 onMenuPress와 내부 toggle 모두 가능하도록 유지 */}
        <TouchableOpacity onPress={onMenuPress || toggle}>
          <AnimatedMenu width={28} height={28} animatedProps={menuIconProps} />
        </TouchableOpacity>

        {/* 날짜/네비 */}
        <View style={S.dateGroup}>
          <TouchableOpacity
            // 💡 onLeftPress props 사용
            onPress={!calVisible ? onLeftPress : undefined}
            disabled={calVisible}
          >
            <Left width={24} height={24} color={colors.icon.default} />
          </TouchableOpacity>

          <TouchableOpacity onPress={openCalendar} style={S.titleContainer} hitSlop={10}>
            <Text style={[S.title, { color: dateTextColor }]}>{title}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            // 💡 onRightPress props 사용
            onPress={!calVisible ? onRightPress : undefined}
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
        <TouchableOpacity
          // 💡 onFilterPress props 사용
          onPress={onFilterPress}
          disabled={calVisible}
        >
          <Filter
            width={22}
            height={22}
            // 💡 필터 활성화 상태에 따라 색상 변경 (MonthView에서 isFilterActive를 전달함)
            color={isFilterActive ? colors.primary.main : colors.icon.default}
            style={{ marginRight: 15, marginTop: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* 달력 모달 */}
      <CalendarModal
        visible={calVisible}
        onClose={closeCalendar}
        currentDate={currentSelectedDate}
        onSelectDate={currentSetSelectedDate} // 로컬 또는 propSetDate 사용
      />
    </View>
  )
}

// ... (StyleSheet는 그대로 유지)
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
