import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, LayoutChangeEvent } from 'react-native'
import { CalendarList, DateData } from 'react-native-calendars'

type Props = {
  open: boolean
  value: Date
  minDate?: string
  maxDate?: string
  onSelect: (d: Date) => void
  dayRowHeight?: number
}

export default function InlineCalendar({
  open,
  value,
  minDate,
  maxDate,
  onSelect,
  dayRowHeight = 44, // 줄 높이 기본값
}: Props) {
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const weeksInMonth = (y: number, m0: number) => {
    // m0 0=1월
    const first = new Date(y, m0, 1)
    const dow = first.getDay() // 일=0, 월=1
    const days = new Date(y, m0 + 1, 0).getDate()
    return Math.max(4, Math.min(6, Math.ceil((dow + days) / 7))) // 4~6로 클램프
  }

  // 동적 높이 계산(헤더는 숨김, 요일행 + 날짜행*주수 + 여백)
  const WEEKDAY_H = 24
  const V_PAD = 8
  const computePanelH = (d: Date) =>
    WEEKDAY_H + weeksInMonth(d.getFullYear(), d.getMonth()) * dayRowHeight + V_PAD

  const [containerWidth, setContainerWidth] = useState(0)
  const [panelH, setPanelH] = useState<number>(computePanelH(value))

  // 보이는 달이 바뀔 때마다 주 수 반영
  const handleVisibleMonths = (arr: { dateString: string }[]) => {
    // 첫 번째 보이는 달 기준
    const ds = arr?.[0]?.dateString // 'YYYY-MM-DD'
    if (!ds) return
    const [Y, M] = ds.split('-').map(Number)
    const d = new Date(Y, M - 1, 1)
    const nextH = computePanelH(d)
    if (nextH !== panelH) setPanelH(nextH)
  }

  // 애니메이션 높이
  const animH = useRef(new Animated.Value(open ? panelH : 0)).current
  useEffect(() => {
    Animated.timing(animH, {
      toValue: open ? panelH : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [open, panelH])

  // 선택 날짜가 다른 달로 넘어가면 높이 재계산
  useEffect(() => {
    const next = computePanelH(value)
    if (next !== panelH) setPanelH(next)
  }, [value])

  const marked = useMemo(
    () => ({ [toYMD(value)]: { selected: true, selectedColor: '#7A4CFF' } }),
    [value],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width)
    if (w && w !== containerWidth) setContainerWidth(w)
  }

  return (
    <Animated.View
      style={[styles.wrap, { height: animH }]}
      pointerEvents={open ? 'auto' : 'none'}
    >
      {/* 내부 캔버스는 현재 패널 높이를 그대로 사용 */}
      <View style={{ height: panelH, width: '100%' }} onLayout={onLayout}>
        {containerWidth > 0 && (
          <CalendarList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            pastScrollRange={24}
            futureScrollRange={24}
            current={toYMD(value)}
            minDate={minDate}
            maxDate={maxDate}
            hideExtraDays
            hideArrows
            renderHeader={() => <View />} // 헤더 제거
            markedDates={marked}
            onDayPress={(d: DateData) => onSelect(new Date(d.year, d.month - 1, d.day))}
            onVisibleMonthsChange={handleVisibleMonths} // ★ 보이는 달 바뀔 때 높이 갱신
            calendarWidth={containerWidth}
            calendarHeight={panelH} // ★ 달마다 높이 반영
            style={[styles.calStyle, { width: containerWidth }]}
            theme={{
              todayTextColor: '#7A4CFF',
              selectedDayBackgroundColor: '#7A4CFF',
              selectedDayTextColor: '#fff',
              textDayFontSize: 14,
              textDayHeaderFontSize: 12,
              monthTextColor: '#222',
            }}
          />
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', marginTop: 0 },
  calStyle: {
    borderWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 2,
  },
})
