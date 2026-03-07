import React from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import colors from '@/styles/colors'
import { parseDate } from '@/screens/Calender/Week/date'
import { mixWhite, thumbH, type WeekSpanEvent } from '@/screens/Calender/Week/layout'

type FullBleedProps = {
  children: React.ReactNode
  padH?: number
  fill?: boolean
}

type WeekHeaderSpanProps = {
  FullBleed: React.ComponentType<FullBleedProps>
  styles: Record<string, any>
  spanWrapRef: React.RefObject<View | null>
  spanScrollRef: React.RefObject<ScrollView | null>
  weekDates: string[]
  todayISO: string
  selectedDateISO: string
  dayColWidth: number
  timeColWidth: number
  singleHeight: number
  spanBars: WeekSpanEvent[]
  spanAreaHeight: number
  showSpanScrollbar: boolean
  spanWrapH: number
  spanContentH: number
  spanThumbTop: number
  onSetSpanWrapH: (h: number) => void
  onSetSpanThumbTop: (y: number) => void
  onSetSpanContentH: (h: number) => void
  onToggleSpanTask: (taskId: string, prevDone: boolean, dateISO: string) => void
  onOpenEventDetail: (eventId: string, occDate?: string) => void
  onSelectDate?: (dateISO: string) => void
  onHeaderTimeColLayout?: (x: number, y: number) => void
}

export default function WeekHeaderSpan({
  FullBleed,
  styles,
  spanWrapRef,
  spanScrollRef,
  weekDates,
  todayISO,
  dayColWidth,
  timeColWidth,
  singleHeight,
  spanBars,
  spanAreaHeight,
  showSpanScrollbar,
  spanWrapH,
  spanContentH,
  spanThumbTop,
  onSetSpanWrapH,
  onSetSpanThumbTop,
  onSetSpanContentH,
  onToggleSpanTask,
  onOpenEventDetail,
  onSelectDate,
  onHeaderTimeColLayout,
}: WeekHeaderSpanProps) {
  const todayDate = parseDate(todayISO)
  const targetPillWidth = weekDates.length === 5 ? 61.6 : weekDates.length === 7 ? 44 : 44
  const datePillWidth = Math.min(targetPillWidth, dayColWidth)

  return (
    <>
      <FullBleed padH={16}>
        <View ref={spanWrapRef} style={styles.weekHeaderRow}>
          <View
            pointerEvents="none"
            style={[
              H.headerGrid,
              {
                left: timeColWidth,
                width: weekDates.length * dayColWidth,
              },
            ]}
          >
            {weekDates.map((d, colIdx) => (
              <View
                key={`header-colline-${d}`}
                style={[
                  H.headerGridColLine,
                  { width: dayColWidth, borderLeftWidth: colIdx === 0 ? 0 : 0.3 },
                ]}
              />
            ))}
          </View>

          <View
            style={styles.weekHeaderTimeCol}
            onLayout={(e) => {
              const { x, y } = e.nativeEvent.layout
              onHeaderTimeColLayout?.(x, y)
            }}
          >
            <Text style={styles.weekHeaderBigDate}>{todayDate.getDate()}일</Text>
          </View>
          {weekDates.map((d) => {
            const dt = parseDate(d)
            const dow = dt.getDay()
            const label = ['일', '월', '화', '수', '목', '금', '토'][dow]
            const isToday = d === todayISO
            const dayColor = isToday
              ? colors.primary.main
              : dow === 0
                ? colors.text.monday
                : colors.text.text2
            const dateColor = isToday
              ? colors.primary.main
              : dow === 0
                ? colors.text.monday
                : colors.text.text2
            return (
              <Pressable
                key={`${d}-header`}
                onPress={() => onSelectDate?.(d)}
                hitSlop={6}
                style={[styles.weekHeaderCol, { width: dayColWidth }]}
              >
                <Text
                  style={[
                    styles.weekHeaderWeekday,
                    { color: dayColor },
                    isToday && styles.weekHeaderWeekdayToday,
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.weekHeaderDatePill,
                    { width: datePillWidth },
                    isToday && styles.weekHeaderDatePillToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekHeaderDate,
                      { color: dateColor },
                      isToday && styles.weekHeaderDateToday,
                    ]}
                  >
                    {dt.getDate()}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </FullBleed>

      <FullBleed padH={16}>
        <View style={styles.spanTaskBoxWrap}>
          <View
            style={[styles.spanTaskBox, { height: 120 }]}
            onLayout={(e) => onSetSpanWrapH(e.nativeEvent.layout.height)}
          >
            <View
              pointerEvents="none"
              style={[
                H.spanGrid,
                {
                  left: timeColWidth,
                  width: weekDates.length * dayColWidth,
                },
              ]}
            >
              {weekDates.map((d, colIdx) => (
                <View
                  key={`spanbar-colline-${d}`}
                  style={[
                    H.spanGridColLine,
                    { width: dayColWidth, borderLeftWidth: colIdx === 0 ? 0 : 0.3 },
                  ]}
                />
              ))}
            </View>
            <ScrollView
              ref={spanScrollRef}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent

                const ratio =
                  contentSize.height <= layoutMeasurement.height
                    ? 0
                    : contentOffset.y / (contentSize.height - layoutMeasurement.height)

                const rawTop =
                  ratio * (layoutMeasurement.height - thumbH(layoutMeasurement.height, contentSize.height))

                const thumbHeight = thumbH(layoutMeasurement.height, contentSize.height)
                const trackHeight = layoutMeasurement.height - 6
                const maxTop = trackHeight - thumbHeight
                const clampedTop = Math.max(0, Math.min(rawTop, maxTop))
                onSetSpanThumbTop(clampedTop)
              }}
              onContentSizeChange={(_, h) => onSetSpanContentH(h)}
              contentContainerStyle={[H.spanScrollContent, { height: spanAreaHeight }]}
            >
              {spanBars.map((s, i) => {
                const left = timeColWidth + s.startIdx * dayColWidth
                const width = (s.endIdx - s.startIdx + 1) * dayColWidth
                const isSingleDay = s.startISO === s.endISO
                const isTask = !!s.isTask

                if (isTask) {
                  return (
                    <Pressable
                      key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
                      onPress={() =>
                        onToggleSpanTask(String(s.id), !!s.done, weekDates[s.startIdx])
                      }
                      style={[
                        H.spanTaskChip,
                        {
                          top: s.row * (singleHeight + 4),
                          left: Math.min(
                            Math.max(left + 2, timeColWidth + 2),
                            timeColWidth + weekDates.length * dayColWidth - (width - 4),
                          ),
                          width: width - 4,
                          height: singleHeight,
                        },
                      ]}
                    >
                      <View style={[styles.taskCheckbox, s.done && styles.taskCheckboxOn]}>
                        {s.done && <Text style={styles.taskCheckmark}>✓</Text>}
                      </View>
                      <Text
                        style={[styles.taskTitle, s.done && styles.taskTitleDone]}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                      >
                        {s.title}
                      </Text>
                    </Pressable>
                  )
                }

                const mainColor = s.color?.startsWith('#') ? s.color : `#${s.color || 'B04FFF'}`
                const displayColor = s.isRepeat
                  ? mixWhite(mainColor, 70)
                  : isSingleDay
                    ? mainColor
                    : mixWhite(mainColor, 70)

                const baseStyle: any = {
                  position: 'absolute',
                  top: s.row * (singleHeight + 4),
                  left: Math.min(
                    Math.max(left + 2, timeColWidth + 2),
                    timeColWidth + weekDates.length * dayColWidth - (width - 4),
                  ),
                  width: width - 4,
                  height: singleHeight,
                  justifyContent: 'center',
                  alignItems: isSingleDay ? 'flex-start' : 'center',
                  paddingHorizontal: 6,
                  backgroundColor: displayColor,
                  borderRadius: isSingleDay ? 3 : 0,
                }

                return (
                  <Pressable
                    key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
                    onPress={() => onOpenEventDetail(String(s.id), s.startISO)}
                  >
                    <View style={baseStyle}>
                      {weekDates.includes(s.startISO) && weekDates[s.startIdx] === s.startISO && (
                        <View
                          style={[
                            H.edgeBarLeft,
                            {
                              backgroundColor: mainColor,
                              borderTopLeftRadius: isSingleDay ? 3 : 0,
                              borderBottomLeftRadius: isSingleDay ? 3 : 0,
                            },
                          ]}
                        />
                      )}

                      {weekDates.includes(s.endISO) && weekDates[s.endIdx] === s.endISO && (
                        <View
                          style={[
                            H.edgeBarRight,
                            {
                              backgroundColor: mainColor,
                              borderTopRightRadius: isSingleDay ? 3 : 0,
                              borderBottomRightRadius: isSingleDay ? 3 : 0,
                            },
                          ]}
                        />
                      )}

                      <Text style={H.spanEventTitle} numberOfLines={1} ellipsizeMode="clip">
                        {s.title}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
            {showSpanScrollbar && (
              <View pointerEvents="none" style={[styles.spanScrollTrack, H.scrollTrackRight]}>
                <View
                  style={[
                    styles.spanScrollThumb,
                    {
                      height: thumbH(spanWrapH, spanContentH),
                      transform: [{ translateY: spanThumbTop }],
                    },
                  ]}
                />
              </View>
            )}
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(0,0,0,0.07)',
              'rgba(0,0,0,0.04)',
              'rgba(0,0,0,0.015)',
              'rgba(0,0,0,0)',
            ]}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.spanBottomShadow}
          />
        </View>
      </FullBleed>
    </>
  )
}

const H = StyleSheet.create({
  headerGrid: {
    position: 'absolute',
    top: 16,
    bottom: 0,
    flexDirection: 'row',
  },
  headerGridColLine: {
    borderLeftColor: '#C7D0D6',
  },
  spanGrid: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  spanGridColLine: {
    borderLeftColor: '#C7D0D6',
  },
  spanScrollContent: {
    position: 'relative',
    paddingVertical: 4,
    paddingBottom: 4,
  },
  spanTaskChip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF80',
    borderWidth: 0.4,
    borderColor: '#333333',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 1,
    overflow: 'hidden',
  },
  edgeBarLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  edgeBarRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  spanEventTitle: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
    maxWidth: '90%',
    includeFontPadding: false,
  },
  scrollTrackRight: {
    right: -10,
  },
})
