import React, { useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import PagerView from 'react-native-pager-view'
import { Picker } from '@react-native-picker/picker'

import DropDown from '@/assets/icons/drop_down.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  start: Date
  end: Date
  onChangeRange: (nextStart: Date, nextEnd: Date) => void
  onNext: () => void
}

const PILL_BG = '#B04FFF1A'
const CALENDAR_W = 301
const DAY_W = 43
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
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null)
    } else {
      cells.push(new Date(y, m, dayNum))
    }
  }
  return cells
}

export default function CreateEventDateStep({
  start,
  end,
  onChangeRange,
  onNext,
}: Props) {
  const pickingEndRef = useRef(false)
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(start.getFullYear(), start.getMonth(), 1),
  )
  const [pagerSeed, setPagerSeed] = useState(0)
  const [ymOpen, setYmOpen] = useState(false)
  const [pickYear, setPickYear] = useState(start.getFullYear())
  const [pickMonth, setPickMonth] = useState(start.getMonth() + 1)

  const onSelectDate = (picked: Date) => {
    const d = startOfDay(picked)
    const s0 = startOfDay(start)
    const e0 = startOfDay(end)

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

  const monthBase = monthCursor
  const monthLabel = `${monthBase.getFullYear()}년 ${monthBase.getMonth() + 1}월`
  const pages = useMemo(
    () => [
      new Date(monthBase.getFullYear(), monthBase.getMonth() - 1, 1),
      monthBase,
      new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 1),
    ],
    [monthBase],
  )

  const s0 = startOfDay(start)
  const e0 = startOfDay(end)
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.guideText}>날짜를 지정하세요</Text>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable style={styles.calendarHeaderPress} onPress={() => setYmOpen((v) => !v)}>
            <Text style={styles.headerText}>{monthLabel}</Text>
            <DropDown width={24} height={24} color={ymOpen ? colors.icon.selected : colors.icon.default} />
          </Pressable>
        </View>

        {ymOpen ? (
          <View style={styles.ymWrap}>
            <View style={styles.ymRow}>
              <View style={styles.ymCol}>
                <Picker
                  selectedValue={pickYear}
                  onValueChange={(v) => setPickYear(Number(v))}
                  style={styles.ymPicker}
                  itemStyle={styles.ymPickerItem}
                >
                  {yearOptions.map((y) => (
                    <Picker.Item key={y} label={`${y}년`} value={y} />
                  ))}
                </Picker>
              </View>
              <View style={styles.ymCol}>
                <Picker
                  selectedValue={pickMonth}
                  onValueChange={(v) => setPickMonth(Number(v))}
                  style={styles.ymPicker}
                  itemStyle={styles.ymPickerItem}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <Picker.Item key={m} label={`${m}월`} value={m} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.weekRow}>
              {WEEKDAY.map((label, idx) => (
                <Text key={label} style={[styles.weekText, idx === 0 && styles.weekTextSunday]}>
                  {label}
                </Text>
              ))}
            </View>

            <PagerView
              key={`${monthBase.getFullYear()}-${monthBase.getMonth()}-${pagerSeed}`}
              style={styles.pager}
              initialPage={1}
              onPageSelected={(e) => {
                const position = e.nativeEvent.position
                if (position === 1) return
                const next =
                  position === 0
                    ? new Date(monthBase.getFullYear(), monthBase.getMonth() - 1, 1)
                    : new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 1)
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
                const visibleRangeStart =
                  s0.getTime() > monthStart.getTime() ? s0 : monthStart
                const visibleRangeEnd =
                  e0.getTime() < monthEnd.getTime() ? e0 : monthEnd
                const hasVisibleRange = visibleRangeStart.getTime() <= visibleRangeEnd.getTime()
                const singleVisible =
                  hasVisibleRange &&
                  visibleRangeStart.getTime() === visibleRangeEnd.getTime()
                return (
                  <View key={`${baseMonth.getFullYear()}-${baseMonth.getMonth()}-${pageIndex}`} style={styles.gridWrap}>
                    {cells.map((cell, idx) => {
                      if (!cell) {
                        return <View key={`empty-${idx}`} style={styles.cell} />
                      }

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
                        <Pressable key={cell.toISOString()} style={styles.cell} onPress={() => onSelectDate(cell)}>
                          {inRange && (
                            <View
                              style={[
                                styles.pill,
                                single && styles.singlePill,
                                isStart && styles.startPill,
                                isEnd && styles.endPill,
                                isMid && styles.midPill,
                              ]}
                            />
                          )}

                          <Text style={[styles.dayText, inRange && styles.selectedDayText]}>{cell.getDate()}</Text>
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

      <View style={styles.footerRow}>
        {ymOpen ? (
          <Pressable
            onPress={() => {
              setMonthCursor(new Date(pickYear, pickMonth - 1, 1))
              setPagerSeed((v) => v + 1)
              setYmOpen(false)
            }}
            hitSlop={10}
          >
            <Text style={styles.nextText}>이동</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onNext} hitSlop={10}>
            <Text style={styles.nextText}>다음</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  guideText: {
    ...ts('label1'),
    color: colors.text.text3,
  },
  calendarCard: {
    marginTop: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 0,
  },
  calendarHeaderPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    ...ts('label1'),
    color: colors.text.text1,
  },
  ymWrap: {
    width: CALENDAR_W,
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
    height: 190,
    justifyContent: 'center',
  },
  ymPicker: {
    width: 130,
    height: 190,
  },
  ymPickerItem: {
    fontSize: 20,
    color: colors.text.text1,
  },
  weekRow: {
    width: CALENDAR_W,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 2,
  },
  weekText: {
    width: DAY_W,
    textAlign: 'center',
    ...ts('date3'),
    color: colors.text.text3,
  },
  weekTextSunday: {
    color: '#FF474A',
  },
  gridWrap: {
    width: CALENDAR_W,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  pager: {
    width: CALENDAR_W,
    height: DAY_H * 6,
  },
  cell: {
    width: DAY_W,
    height: DAY_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: DAY_W,
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
    width: DAY_W,
  },
  dayText: {
    ...ts('date1'),
    color: colors.text.text1,
  },
  selectedDayText: {
    ...ts('label2'),
    color: colors.brand.primary,
  },
  footerRow: {
    width: CALENDAR_W,
    alignSelf: 'flex-start',
    marginTop: -6,
    alignItems: 'flex-end',
  },
  nextText: {
    ...ts('label1'),
    color: colors.brand.primary,
    fontWeight: '700',
  },
})
