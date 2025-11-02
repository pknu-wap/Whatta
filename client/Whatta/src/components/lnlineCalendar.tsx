import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, LayoutChangeEvent } from 'react-native'
import { CalendarList, DateData } from 'react-native-calendars'

type Props = {
  open: boolean
  value: Date
  minDate?: string
  maxDate?: string
  onSelect: (d: Date) => void
  height?: number
}

export default function InlineCalendar({
  open,
  value,
  minDate,
  maxDate,
  onSelect,
  height = 258,
}: Props) {
  const animH = useRef(new Animated.Value(open ? height : 0)).current
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    Animated.timing(animH, {
      toValue: open ? height : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [open, height])

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
      {/* 부모 실제 너비를 측정 */}
      <View style={{ height, width: '100%' }} onLayout={onLayout}>
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
            calendarWidth={containerWidth} // 페이지 폭을 모달 폭으로
            calendarHeight={height}
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
  wrap: {
    overflow: 'hidden',
    marginTop: 6,
  },
  calStyle: {
    borderWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 2,
  },
})
