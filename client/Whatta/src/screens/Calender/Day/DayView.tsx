import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native'

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFocusEffect } from '@react-navigation/native'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import api from '@/api/client'
import { bus, EVENT } from '@/lib/eventBus'

const pad2 = (n: number) => String(n).padStart(2, '0')
const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

function FullBleed({
  children,
  padH = 12,
  fill = false,
}: {
  children: React.ReactNode
  padH?: number
  fill?: boolean
}) {
  const [parentW, setParentW] = useState<number | null>(null)
  const screenW = Dimensions.get('window').width
  const side = parentW == null ? 0 : (screenW - parentW) / 2
  return (
    <View
      onLayout={(e) => setParentW(e.nativeEvent.layout.width)}
      style={{
        marginLeft: parentW == null ? 0 : -side,
        width: screenW,
        paddingHorizontal: padH,
        ...(fill ? { flex: 1 } : null),
      }}
    >
      {children}
    </View>
  )
}

const INITIAL_CHECKS: any[] = [] // ✅ 기본값 빈 배열로 설정

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0시 ~ 24시

export default function DayView() {
  const [anchorDate, setAnchorDate] = useState<string>(today())
  const [checks, setChecks] = useState(INITIAL_CHECKS)
  const [events, setEvents] = useState<any[]>([])
  const [spanEvents, setSpanEvents] = useState<any[]>([]) // ✅ 추가
  const [tasks, setTasks] = useState<any[]>([]) // ✅ 추가

  // ✅ 라이브바 위치 계산
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false) // ✅ 추가
  const ROW_H = 48

  useEffect(() => {
    const updateNowTop = (scrollToCenter = false) => {
      const now = new Date()
      const hour = now.getHours()
      const min = now.getMinutes()
      const elapsed = hour + min / 60
      const topPos = elapsed * ROW_H
      setNowTop(topPos)

      // ✅ 렌더 직후 바로 스크롤 (setTimeout 제거)
      if (scrollToCenter) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(topPos - Dimensions.get('window').height * 0.4, 0),
            animated: false,
          })
        })
        setHasScrolledOnce(true)
      }
    }

    // ✅ 첫 렌더 시 항상 실행
    updateNowTop(true)
    
  }, [])

  // ✅ 포커스 시 (다른 탭 갔다 돌아올 때도 중앙 보이게)
  useFocusEffect(
    React.useCallback(() => {
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      if (nowTop != null) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(nowTop - Dimensions.get('window').height * 0.2, 0),
            animated: true,
          })
        })
      }
    }, [nowTop, anchorDate]),
  )

  const fetchDailyEvents = useCallback(async (dateISO: string) => {
    try {
      const res = await api.get('/calendar/daily', { params: { date: dateISO } })
      const data = res.data.data
      const timed = data.timedEvents || []
      const timedTasks = data.timedTasks || []
      const allDay = data.allDayTasks || []
      const floating = data.floatingTasks || []

      const timelineEvents = timed.filter(
        (e: any) =>
          !e.isSpan &&
          e.clippedEndTime !== '23:59:59.999999999' &&
          e.clippedStartTime &&
          e.clippedEndTime,
      )
      const span = timed.filter(
        (e: any) => e.isSpan || e.clippedEndTime === '23:59:59.999999999',
      )

      setEvents(timelineEvents)
      setSpanEvents(span)
      setTasks(timedTasks)
      setChecks([
        ...allDay.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
        })),
        ...floating.map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.completed ?? false,
        })),
      ])
    } catch (err) {
      console.error('❌ 일간 일정 불러오기 실패:', err)
      alert('일간 일정 불러오기 실패')
    }
  }, [])

  // 새 일정이 추가되면 즉시 재조회
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const date =
        payload.item.startDate ?? payload.item.date ?? payload.item.endDate ?? today()
      const itemDateISO = date.slice(0, 10)

      // 현재 anchorDate(일간뷰의 기준일)와 같으면 즉시 새로고침
      if (itemDateISO === anchorDate) {
        fetchDailyEvents(anchorDate)
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [anchorDate, fetchDailyEvents])

  // 2) 날짜가 바뀔 때마다 재조회: useEffect 한 개만
  useEffect(() => {
    fetchDailyEvents(anchorDate)
  }, [anchorDate, fetchDailyEvents])

  // 헤더 동기화는 "포커스 상태에서만" 수행
  useFocusEffect(
    React.useCallback(() => {
      const onReq = () => bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      const onSet = (iso: string) => setAnchorDate(iso)
      bus.on('calendar:request-sync', onReq)
      bus.on('calendar:set-date', onSet)
      // 포커스 들어올 때 현재 상태 1회 방송
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      return () => {
        bus.off('calendar:request-sync', onReq)
        bus.off('calendar:set-date', onSet)
      }
    }, [anchorDate]),
  )

  // 상단 박스 스크롤바 계산
  const [wrapH, setWrapH] = useState(150)
  const [contentH, setContentH] = useState(150)
  const [thumbTop, setThumbTop] = useState(0)
  const boxScrollRef = useRef<ScrollView>(null)
  const gridScrollRef = useRef<ScrollView>(null)

  const onLayoutWrap = (e: any) => setWrapH(e.nativeEvent.layout.height)
  const onContentSizeChange = (_: number, h: number) => setContentH(h)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const ratio =
      contentSize.height <= layoutMeasurement.height
        ? 0
        : contentOffset.y / (contentSize.height - layoutMeasurement.height)
    const top =
      ratio *
      (layoutMeasurement.height - thumbH(layoutMeasurement.height, contentSize.height))
    setThumbTop(top)
  }
  const showScrollbar = contentH > wrapH

  const toggleCheck = (id: string) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <View style={S.screen}>
          {/* ✅ 상단 테스크 박스 */}
          <FullBleed padH={12}>
            <View style={S.taskBoxWrap}>
              <View style={S.taskBox} onLayout={onLayoutWrap}>
                <ScrollView
                  ref={boxScrollRef}
                  onScroll={onScroll}
                  onContentSizeChange={onContentSizeChange}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  contentContainerStyle={S.boxContent}
                  bounces={false}
                >
                  {spanEvents.map((t, i) => {
                    const baseColor =
                      t.colorKey && t.colorKey.toUpperCase() !== 'FFFFFF'
                        ? `#${t.colorKey}`
                        : '#8B5CF6' // ✅ 컬러키가 흰색인 경우 기본 보라색 대체
                    const bgWithOpacity = `${baseColor}26`

                    return (
                      <View
                        key={t.id ?? i}
                        style={[
                          S.chip,
                          i === 0 && { marginTop: 8 },
                          { backgroundColor: bgWithOpacity }, // ✅ colorKey 기반 배경
                        ]}
                      >
                        <View style={[S.chipBar, { backgroundColor: baseColor }]} />
                        <Text style={S.chipText} numberOfLines={1}>
                          {t.title}
                        </Text>
                      </View>
                    )
                  })}

                  {/* ✅ 체크박스 할 일 */}
                  {checks.map((c) => (
                    <Pressable
                      key={c.id}
                      style={S.checkRow}
                      onPress={() => toggleCheck(c.id)}
                    >
                      <View style={S.checkboxWrap}>
                        <View style={[S.checkbox, c.done && S.checkboxOn]}>
                          {c.done && <Text style={S.checkmark}>✓</Text>}
                        </View>
                      </View>
                      <Text
                        style={[S.checkText, c.done && S.checkTextDone]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </Pressable>
                  ))}

                  <View style={{ height: 8 }} />
                </ScrollView>

                {showScrollbar && (
                  <View pointerEvents="none" style={S.scrollTrack}>
                    <View
                      style={[
                        S.scrollThumb,
                        {
                          height: thumbH(wrapH, contentH),
                          transform: [{ translateY: thumbTop }],
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* ⬇️ taskBox '바깥'에 경계선 + 아래로 페이드 */}
              <View pointerEvents="none" style={S.boxBottomLine} />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }} // 위(경계선)에서 시작
                end={{ x: 0, y: 1 }} // 아래로 사라짐
                style={S.fadeBelow}
              />
            </View>
            <View style={S.fadeGap} />
          </FullBleed>

          {/* ✅ 시간대 그리드 */}
          <ScrollView
            ref={gridScrollRef}
            style={S.gridScroll}
            contentContainerStyle={[S.gridContent, { position: 'relative' }]}
            showsVerticalScrollIndicator={false}
          >
            {HOURS.map((h, i) => {
              const isLast = i === HOURS.length - 1 // ✅ 마지막 행 여부 계산

              return (
                <View key={h} style={S.row}>
                  <View style={S.timeCol}>
                    <Text style={S.timeText}>
                      {h === 0
                        ? '오전 12시'
                        : h < 12
                          ? `오전 ${h}시`
                          : h === 12
                            ? '오후 12시'
                            : `오후 ${h - 12}시`}
                    </Text>
                  </View>

                  <View style={S.slotCol}>
                    <View style={S.verticalLine} />
                  </View>

                  {/* ✅ 마지막 행이 아닐 때만 가로줄 표시 */}
                  {!isLast && <View pointerEvents="none" style={S.guideLine} />}
                </View>
              )
            })}
            {/* ✅ 현재시간 라이브바 */}
            {nowTop !== null && (
              <>
                <View style={[S.liveBar, { top: nowTop }]} />
                <View style={[S.liveDot, { top: nowTop - 3 }]} />
              </>
            )}
            {events.map((evt) => (
              <DraggableFlexalbeEvent
                key={evt.id}
                title={evt.title}
                place={`label ${evt.labels?.[0] ?? ''}`}
                startHour={parseInt(evt.clippedStartTime.split(':')[0])}
                endHour={parseInt(evt.clippedEndTime.split(':')[0])}
                color={`#${evt.colorKey}`}
              />
            ))}

            {tasks.map((task) => {
              // ✅ placementTime 기준으로 시작 시각 계산
              const start =
                task.placementTime && task.placementTime.includes(':')
                  ? (() => {
                      const [h, m] = task.placementTime.split(':').map(Number)
                      return h + m / 60
                    })()
                  : 0

              return (
                <DraggableTaskBox
                  key={task.id}
                  title={task.title}
                  startHour={start}
                  done={task.completed ?? false} // ✅ 체크박스 반영 가능
                />
              )
            })}
          </ScrollView>
        </View>
      </ScreenWithSidebar>
    </GestureHandlerRootView>
  )
}

/* 스크롤바 길이 계산 */
function thumbH(visibleH: number, contentH: number) {
  const minH = 18
  const h = (visibleH * visibleH) / Math.max(contentH, 1)
  return Math.max(minH, Math.min(h, visibleH))
}

function DraggableFixedEvent() {
  const ROW_H = 48
  const translateY = useSharedValue(7 * ROW_H) // 초기 9시 위치

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / ROW_H) * ROW_H
      translateY.value = withSpring(snapped)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height: ROW_H * 3,
            backgroundColor: '#B04FFF26',
            paddingHorizontal: 4,
            paddingTop: 10,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 11,
            lineHeight: 10,
          }}
        >
          name(fixed)
        </Text>
        <Text
          style={{
            color: '#6B6B6B',
            fontSize: 10,
            marginTop: 10,
            lineHeight: 10,
          }}
        >
          place
        </Text>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableTaskBoxProps = {
  title: string
  startHour: number
  color: string
  done?: boolean
}

function DraggableTaskBox({
  title,
  startHour,
  done: initialDone = false,
}: {
  title: string
  startHour: number
  done?: boolean
}) {
  const ROW_H = 48
  const translateY = useSharedValue(startHour * ROW_H)
  const translateX = useSharedValue(0)
  const [done, setDone] = useState(initialDone)

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
      translateX.value += e.changeX
    })
    .onEnd(() => {
      const snappedY = Math.round(translateY.value / ROW_H) * ROW_H
      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
  }))

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 18,
            right: 18,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFF80', // ✅ 반투명 흰색
            borderWidth: 0.3,
            borderColor: '#B3B3B3',
            borderRadius: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#525252',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 3,
            zIndex: 20,
          },
          style,
        ]}
      >
        <Pressable
          onPress={() => setDone((prev) => !prev)}
          style={{
            width: 17,
            height: 17,
            borderWidth: 2,
            borderColor: done ? '#333333' : '#333',
            borderRadius: 6,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: done ? '#333333' : '#FFF',
          }}
        >
          {done && (
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 13,
                lineHeight: 16,
              }}
            >
              ✓
            </Text>
          )}
        </Pressable>

        <View>
          <Text
            style={{
              color: done ? '#999' : '#000',
              fontWeight: 'bold',
              fontSize: 12,
              marginBottom: 2,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            {title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableFlexalbeEventProps = {
  title: string
  place: string
  startHour: number
  endHour: number
  color: string
}

function DraggableFlexalbeEvent({
  title,
  place,
  startHour,
  endHour,
  color,
}: DraggableFlexalbeEventProps) {
  const ROW_H = 48
  const translateY = useSharedValue(startHour * ROW_H)
  const height = (endHour - startHour) * ROW_H

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / ROW_H) * ROW_H
      translateY.value = withSpring(snapped)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backgroundColor = color.startsWith('#') ? color : `#${color}`

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height,
            backgroundColor,
            paddingHorizontal: 4,
            paddingTop: 10,
            borderRadius: 3,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 11,
            lineHeight: 10,
          }}
        >
          {title}
        </Text>
        {place ? (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              marginTop: 10,
              lineHeight: 10,
            }}
          >
            {place}
          </Text>
        ) : null}
      </Animated.View>
    </GestureDetector>
  )
}

/* Styles */
const BORDER = 'rgba(0,0,0,0.08)'

const VERTICAL_LINE_WIDTH = 0.5 // S.verticalLine에서 쓰는 값

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral.surface },

  taskBox: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral.surface,
    overflow: 'hidden',
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  boxContent: { paddingVertical: 4 },

  chip: {
    marginHorizontal: 12,
    marginTop: 4,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chipBar: {
    width: 5, // ✅ 바 두께 5px
    height: 22, // ✅ 고정 높이 22p
    marginRight: 8, // 텍스트와 간격
  },

  chipText: { ...ts('daySchedule'), color: '#000000' },

  checkRow: {
    height: 22,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.neutral.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B3B3B3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  checkbox: {
    width: 10,
    height: 10,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 10,
    backgroundColor: colors.neutral.surface,
  },
  checkboxOn: { backgroundColor: '#000000' },
  checkText: { ...ts('daySchedule'), color: '#000000' },

  checkboxWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: colors.neutral.surface, // 체크 표시 색 (배경이 검정이라 흰색 추천)
    fontSize: 8, // 크기 조정 (checkbox 크기 맞춰서)
    fontWeight: '700',
    lineHeight: 10, // 중앙 정렬 맞춤
    textAlign: 'center',
  },

  checkTextDone: {
    color: '#888',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },

  scrollTrack: {
    position: 'absolute',
    right: 4,
    top: 10,
    bottom: 6,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
    backgroundColor: colors.neutral.gray,
  },

  gridScroll: { flex: 1 },

  row: {
    position: 'relative', // ✅ 가로줄 절대배치 기준
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 16, // ✅ 휴대폰 좌/우 끝 기준 여백
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderColor: 'transparent',
  },

  timeCol: {
    width: 50,
    //justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },

  slotCol: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },

  /* 세로 기준선: 시간 라벨 오른쪽 경계 */
  verticalLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0.5, // 원하면 1~2로 조정
    backgroundColor: colors.neutral.timeline,
  },

  /* ✅ 가로줄: row 기준으로 좌우 16px 여백 */
  guideLine: {
    position: 'absolute',
    left: 16, // 휴대폰 좌측 끝 기준
    right: 16, // 휴대폰 우측 끝 기준
    bottom: 0,
    height: 0.5, // 두께(원하면 1~2)
    backgroundColor: colors.neutral.timeline,
  },
  timeText: { ...ts('time'), color: colors.neutral.gray },

  taskBoxWrap: {
    position: 'relative',
    overflow: 'visible',
  },

  boxBottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // taskBox 하단과 정확히 일치
    height: StyleSheet.hairlineWidth || 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 2,
  },

  fadeBelow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: '100%', // ✅ 래퍼(=taskBox) 높이 바로 아래에서 시작
    height: 18, // 페이드 길이 (원하면 20~32 조절)
    zIndex: 1,
  },

  fadeGap: {
    height: 12, // 페이드와 시간대 그리드 사이 간격
  },

  gridContent: {
    paddingBottom: 10, // ✅ 아래쪽 여백 (필요한 만큼 조절)
  },

  liveBar: {
    position: 'absolute',
    left: 50 + 16,
    right: 16,
    height: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    zIndex: 10,
  },

  liveDot: {
    position: 'absolute',
    left: 50 + 16 - 3, // ✅ 세로줄 기준 + 간격 - 반지름 (liveBar 시작점 기준)
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
    zIndex: 11, // liveBar보다 위로
  },
})
