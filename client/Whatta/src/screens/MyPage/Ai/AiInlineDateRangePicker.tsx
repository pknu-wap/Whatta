import React, { useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import PagerView from 'react-native-pager-view'

import DropDown from '@/assets/icons/drop_down.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  start: Date
  end: Date
  width?: number
  onChangeRange: (nextStart: Date, nextEnd: Date) => void
}

const PILL_BG = '#B04FFF1A'
const DAY_H = 44
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

function getMonthCells(base: Date): Array<Date | null> {
  const y = base.getFullYear()
  const m = base.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const total = Math.ceil((firstDow + daysInMonth) / 7) * 7

  const cells: Array<Date | null> = []
  for (let i = 0; i < total; i += 1) {
    const dayNum = i - firstDow + 1
    cells.push(dayNum < 1 || dayNum > daysInMonth ? null : new Date(y, m, dayNum))
  }
  return cells
}

export default function AiInlineDateRangePicker({
  start,
  end,
  width = 326,
  onChangeRange,
}: Props) {
  const pickingEndRef = useRef(false)
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(start.getFullYear(), start.getMonth(), 1),
  )
  const [pagerSeed, setPagerSeed] = useState(0)
  const [ymOpen, setYmOpen] = useState(false)
  const [pickYear, setPickYear] = useState(start.getFullYear())
  const [pickMonth, setPickMonth] = useState(start.getMonth() + 1)

  const dayWidth = Math.floor(width / 7)
  const pages = useMemo(
    () => [
      new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
      monthCursor,
      new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
    ],
    [monthCursor],
  )
  const s0 = startOfDay(start)
  const e0 = startOfDay(end)
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])

  const onSelectDate = (picked: Date) => {
    Keyboard.dismiss()
    const d = startOfDay(picked)

    if (pickingEndRef.current) {
      if (d.getTime() >= s0.getTime()) {
        onChangeRange(s0, d)
      } else {
        onChangeRange(d, d)
      }
      pickingEndRef.current = false
      return
    }

    const isSingle = s0.getTime() === e0.getTime()
    if (isSingle) {
      if (d.getTime() > s0.getTime()) {
        onChangeRange(s0, d)
      } else if (d.getTime() < s0.getTime()) {
        onChangeRange(d, d)
        pickingEndRef.current = true
      } else {
        pickingEndRef.current = true
      }
      return
    }

    onChangeRange(d, d)
    pickingEndRef.current = true
  }

  return (
    <View style={[S.card, { width }]}>
      <View style={S.header}>
        <Pressable style={S.headerPress} onPress={() => setYmOpen((v) => !v)}>
          <Text style={S.headerText}>{`${monthCursor.getFullYear()}년 ${monthCursor.getMonth() + 1}월`}</Text>
          <DropDown
            width={24}
            height={24}
            color={ymOpen ? colors.icon.selected : colors.icon.default}
          />
        </Pressable>
      </View>

      {ymOpen ? (
        <>
          <View style={S.ymWrap}>
            <View style={S.ymRow}>
              <View style={S.ymCol}>
                <Picker
                  selectedValue={pickYear}
                  onValueChange={(v) => setPickYear(Number(v))}
                  style={S.ymPicker}
                  itemStyle={S.ymPickerItem}
                >
                  {yearOptions.map((y) => (
                    <Picker.Item key={y} label={`${y}년`} value={y} />
                  ))}
                </Picker>
              </View>
              <View style={S.ymCol}>
                <Picker
                  selectedValue={pickMonth}
                  onValueChange={(v) => setPickMonth(Number(v))}
                  style={S.ymPicker}
                  itemStyle={S.ymPickerItem}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <Picker.Item key={m} label={`${m}월`} value={m} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          <View style={S.footerRow}>
            <Pressable
              onPress={() => {
                const next = new Date(pickYear, pickMonth - 1, 1)
                setMonthCursor(next)
                setPagerSeed((v) => v + 1)
                setYmOpen(false)
              }}
              hitSlop={10}
            >
              <Text style={S.actionText}>이동</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={[S.weekRow, { width }]}>
            {WEEKDAY.map((label, idx) => (
              <Text
                key={label}
                style={[S.weekText, { width: dayWidth }, idx === 0 && S.weekTextSunday]}
              >
                {label}
              </Text>
            ))}
          </View>
          <PagerView
            key={`${monthCursor.getFullYear()}-${monthCursor.getMonth()}-${pagerSeed}`}
            style={[S.pager, { width }]}
            initialPage={1}
            onPageSelected={(e) => {
              const position = e.nativeEvent.position
              if (position === 1) return
              const next =
                position === 0
                  ? new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
                  : new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
              setMonthCursor(next)
              setPickYear(next.getFullYear())
              setPickMonth(next.getMonth() + 1)
              setPagerSeed((v) => v + 1)
            }}
          >
            {pages.map((baseMonth, pageIndex) => {
              const cells = getMonthCells(baseMonth)
              const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1)
              const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0)
              const visibleRangeStart = s0.getTime() > monthStart.getTime() ? s0 : monthStart
              const visibleRangeEnd = e0.getTime() < monthEnd.getTime() ? e0 : monthEnd
              const hasVisibleRange = visibleRangeStart.getTime() <= visibleRangeEnd.getTime()
              const singleVisible =
                hasVisibleRange &&
                visibleRangeStart.getTime() === visibleRangeEnd.getTime()

              return (
                <View
                  key={`${baseMonth.getFullYear()}-${baseMonth.getMonth()}-${pageIndex}`}
                  style={[S.gridWrap, { width }]}
                >
                  {cells.map((cell, idx) => {
                    if (!cell) return <View key={`empty-${idx}`} style={[S.cell, { width: dayWidth }]} />

                    const t = startOfDay(cell).getTime()
                    const inRange =
                      hasVisibleRange &&
                      t >= visibleRangeStart.getTime() &&
                      t <= visibleRangeEnd.getTime()
                    const single = singleVisible && isSameDay(cell, visibleRangeStart)
                    const isStart = !single && isSameDay(cell, visibleRangeStart)
                    const isEnd = !single && isSameDay(cell, visibleRangeEnd)
                    const isMid = inRange && !single && !isStart && !isEnd

                    return (
                      <Pressable
                        key={cell.toISOString()}
                        style={[S.cell, { width: dayWidth }]}
                        onPress={() => onSelectDate(cell)}
                      >
                        {inRange && (
                          <View
                            style={[
                              S.pill,
                              { width: dayWidth },
                              single && S.singlePill,
                              isStart && S.startPill,
                              isEnd && S.endPill,
                              isMid && S.midPill,
                            ]}
                          />
                        )}
                        <Text style={[S.dayText, inRange && S.selectedDayText]}>{cell.getDate()}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              )
            })}
          </PagerView>
        </>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 0,
  },
  headerPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    ...ts('label1'),
    color: colors.text.text1,
  },
  ymWrap: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  ymRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  ymCol: {
    width: 130,
    height: 150,
    justifyContent: 'center',
  },
  ymPicker: {
    width: 130,
    height: 150,
  },
  ymPickerItem: {
    fontSize: 20,
    color: colors.text.text1,
  },
  footerRow: {
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionText: {
    ...ts('label1'),
    color: colors.brand.primary,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 2,
  },
  weekText: {
    textAlign: 'center',
    ...ts('date3'),
    color: colors.text.text3,
  },
  weekTextSunday: {
    color: '#FF474A',
  },
  pager: {
    height: DAY_H * 6,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  cell: {
    height: DAY_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    height: DAY_H,
    backgroundColor: PILL_BG,
  },
  singlePill: {
    borderRadius: 12,
  },
  startPill: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  endPill: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  midPill: {
    borderRadius: 0,
  },
  dayText: {
    ...ts('date1'),
    color: colors.text.text1,
  },
  selectedDayText: {
    ...ts('label2'),
    color: colors.brand.primary,
  },
})
