import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  LayoutChangeEvent,
  Pressable,
  Text,
} from 'react-native'
import { CalendarList, DateData } from 'react-native-calendars'

type Props = {
  open: boolean
  value: Date
  minDate?: string
  maxDate?: string
  onSelect: (d: Date) => void
  dayRowHeight?: number
  markedDates?: Record<string, any>
  headerHeight?: number
  weekdayHeight?: number
  verticalPadding?: number
}

export default function InlineCalendar({
  open,
  value,
  minDate,
  maxDate,
  onSelect,
  dayRowHeight = 30,
  markedDates,
}: Props) {
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`

  const weeksInMonth = (y: number, m0: number) => {
    const first = new Date(y, m0, 1)
    const dow = first.getDay()
    const days = new Date(y, m0 + 1, 0).getDate()
    return Math.max(4, Math.min(6, Math.ceil((dow + days) / 7)))
  }

  const WEEKDAY_H = 20
  const V_PAD = 8
  const HEADER_H = 126
  const computePanelH = (d: Date) =>
    HEADER_H +
    WEEKDAY_H +
    weeksInMonth(d.getFullYear(), d.getMonth()) * dayRowHeight +
    V_PAD

  const [containerWidth, setContainerWidth] = useState(0)
  const [panelH, setPanelH] = useState<number>(computePanelH(value))
  const [headerISO, setHeaderISO] = useState(
    toYMD(new Date(value.getFullYear(), value.getMonth(), 1)),
  )

  const handleVisibleMonths = (arr: { dateString: string }[]) => {
    const ds = arr?.[0]?.dateString
    if (!ds) return
    // 헤더에 표시할 달(해당 달의 1일) 저장
    setHeaderISO(ds.slice(0, 7) + '-01')

    const [Y, M] = ds.split('-').map(Number)
    const d = new Date(Y, M - 1, 1)
    const nextH = computePanelH(d)
    if (nextH !== panelH) setPanelH(nextH)
  }

  const animH = useRef(new Animated.Value(open ? panelH : 0)).current
  useEffect(() => {
    Animated.timing(animH, {
      toValue: open ? panelH : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [open, panelH])

  useEffect(() => {
    const next = computePanelH(value)
    if (next !== panelH) setPanelH(next)
  }, [value])

  // markedDates 미전달 시 단일 선택 강조 기본값
  const fallbackMarked = useMemo(
    () => ({
      [toYMD(value)]: {
        selected: true,
        selectedColor: '#EDEDED',
        selectedTextColor: '#333',
      },
    }),
    [value],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width)
    if (w && w !== containerWidth) setContainerWidth(w)
  }

  const ymLabel = (iso: string) => {
    const [y, m] = iso.split('-').map(Number)
    return `${y}년 ${m}월`
  }

  const DayCell = (props: any) => {
    const { date, state, onPress, marking } = props || {}
    if (!date) return <View style={{ height: dayRowHeight }} />

    const key = date.dateString
    const mark = (markedDates && (markedDates as any)[key]) || marking || {}

    const isSingle = !!mark.selected && !mark.startingDay && !mark.endingDay
    const isStart = !!mark.startingDay
    const isEnd = !!mark.endingDay
    const isBetween = !!mark.color && !isStart && !isEnd && !isSingle

    const MID_BG = 'rgba(232, 204, 255, 0.30)' // 범위 배경
    const EDGE_BG = '#E8CCFF' // 동그라미
    const TXT =
      isSingle || isStart || isEnd
        ? mark.textColor || mark.selectedTextColor || '#6C2BD9'
        : state === 'disabled'
          ? '#B8C0CC'
          : '#222'

    // 치수
    const CELL_W = containerWidth / 7
    const ROW_H = dayRowHeight ?? 44

    const CELL = Math.min(dayRowHeight - 4, CELL_W - 12, 40)
    const TOP = (dayRowHeight - CELL) / 2
    const BAR_H = Math.max(16, Math.round(CELL * 0.8)) // 바 높이(원 높이의 75%)
    const BAR_TOP = Math.max(0, (dayRowHeight - BAR_H) / 2) // 바의 상단 위치

    return (
      <Pressable
        onPress={() => onPress?.(date)}
        style={{
          height: dayRowHeight,
          width: CELL_W,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 중간 날짜: 칸 전체 폭 (겹침 없음) */}
        {isBetween && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: TOP,
              height: CELL,
              backgroundColor: MID_BG,
              zIndex: 0,
              left: 4,
              right: 0,
              width: 'auto',
            }}
          />
        )}
        {/* 2) 시작일: 오른쪽 절반 바 + 원 */}
        {isStart && (
          <>
            <View
              style={{
                position: 'absolute',
                top: TOP,
                height: CELL,
                left: CELL_W / 2,
                right: 0,
                backgroundColor: MID_BG,
                zIndex: 0,
              }}
            />
            {/* 원 */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: TOP,
                width: CELL,
                height: CELL,
                borderRadius: CELL / 2,
                backgroundColor: EDGE_BG,
                zIndex: 1,
              }}
            />
          </>
        )}

        {/* 3) 종료일: 왼쪽 절반 바 + 원 */}
        {isEnd && (
          <>
            <View
              style={{
                position: 'absolute',
                top: TOP,
                left: 4,
                right: CELL_W / 2,
                height: CELL,
                backgroundColor: MID_BG,
                zIndex: 0,
              }}
            />
            {/* 원 */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: TOP,
                width: CELL,
                height: CELL,
                borderRadius: CELL / 2,
                backgroundColor: EDGE_BG,
                zIndex: 1,
              }}
            />
          </>
        )}

        {/* 4) 단일 선택 원 (isSingle) 또는 시작/종료일의 원 (이전 블록에서 바를 그린 후 원을 다시 그림) */}
        {(isSingle || isStart || isEnd) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: CELL,
              height: CELL,
              top: TOP,
              borderRadius: CELL / 2,
              backgroundColor: EDGE_BG,
              zIndex: 1,
            }}
          />
        )}
        <Text style={{ fontSize: 14, color: TXT, zIndex: 2 }}>{date.day}</Text>
      </Pressable>
    )
  }

  return (
    <Animated.View
      style={[styles.wrap, { height: animH }]}
      pointerEvents={open ? 'auto' : 'none'}
    >
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
            renderHeader={() => (
              <View
                style={{
                  flexDirection: 'row',
                  paddingTop: 18,
                  paddingBottom: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#222',
                  }}
                >
                  {ymLabel(headerISO)}
                </Text>
              </View>
            )}
            // 범위 하이라이트 반영
            markedDates={markedDates ?? fallbackMarked}
            onDayPress={(d: DateData) => onSelect(new Date(d.year, d.month - 1, d.day))}
            onVisibleMonthsChange={handleVisibleMonths}
            calendarWidth={containerWidth}
            calendarHeight={panelH}
            style={[styles.calStyle, { width: containerWidth }]}
            dayComponent={DayCell}
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
