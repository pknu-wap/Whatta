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
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import { parseDate } from '@/screens/Calender/Week/date'
import { thumbH, type WeekSpanEvent } from '@/screens/Calender/Week/layout'

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
  spanRowGap: number
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

function WeekHeaderSpan({
  FullBleed,
  styles,
  spanWrapRef,
  spanScrollRef,
  weekDates,
  todayISO,
  dayColWidth,
  timeColWidth,
  singleHeight,
  spanRowGap,
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
                const isTask = !!s.isTask

                if (isTask) {
                  const cardLeft = Math.min(
                    Math.max(left + 2, timeColWidth + 2),
                    timeColWidth + weekDates.length * dayColWidth - (width - 4),
                  )
                  const cardWidth = width - 4
                  return (
                    <View
                      key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
                      style={[
                        {
                          position: 'absolute',
                          top: s.row * (singleHeight + spanRowGap),
                          left: cardLeft,
                          width: cardWidth,
                          height: singleHeight,
                        },
                      ]}
                    >
                      <TaskItemCard
                        id={String(s.id)}
                        title={s.title}
                        done={!!s.done}
                        density="week"
                        isUntimed
                        layoutWidthHint={cardWidth}
                        style={{ minHeight: 0, height: '100%' }}
                        onPress={() =>
                          onToggleSpanTask(String(s.id), !!s.done, weekDates[s.startIdx])
                        }
                        onToggle={(taskId, nextDone) =>
                          onToggleSpanTask(taskId, !nextDone, weekDates[s.startIdx])
                        }
                      />
                    </View>
                  )
                }

                const mainColor = s.color?.startsWith('#') ? s.color : `#${s.color || 'B04FFF'}`
                const barLeft = Math.min(
                  Math.max(left + 2, timeColWidth + 2),
                  timeColWidth + weekDates.length * dayColWidth - (width - 4),
                )
                const barWidth = width - 4
                const isRange =
                  !!s.isSpan || s.startISO !== s.endISO || s.startIdx !== s.endIdx
                const isStartCap = (s.rawStartISO ?? s.startISO) === s.startISO
                const isEndCap = (s.rawEndISO ?? s.endISO) === s.endISO
                const SpanScheduleCard = s.isRepeat ? FixedScheduleCard : RepeatScheduleCard

                return (
                  <View
                    key={`${s.id}-${s.startISO}-${s.endISO}-${s.row}-${s.startIdx}-${s.endIdx}-${i}`}
                    style={{
                      position: 'absolute',
                      top: s.row * (singleHeight + spanRowGap),
                      left: barLeft,
                      width: barWidth,
                      height: singleHeight,
                    }}
                  >
                    {isRange ? (
                      <RangeScheduleBar
                        id={String(s.id)}
                        title={s.title}
                        color={mainColor}
                        startISO={s.startISO}
                        endISO={s.endISO}
                        isStart={isStartCap}
                        isEnd={isEndCap}
                        density="week"
                        isUntimed
                        layoutWidthHint={barWidth}
                        style={{ minHeight: 0, height: '100%' }}
                        onPress={() => onOpenEventDetail(String(s.id), s.startISO)}
                      />
                    ) : (
                      <SpanScheduleCard
                        id={String(s.id)}
                        title={s.title}
                        color={mainColor}
                        density="week"
                        isUntimed
                        layoutWidthHint={barWidth}
                        style={{ minHeight: 0, height: '100%' }}
                        onPress={() => onOpenEventDetail(String(s.id), s.startISO)}
                      />
                    )}
                  </View>
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

export default React.memo(WeekHeaderSpan)

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
    paddingVertical: 3,
    paddingBottom: 3,
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
