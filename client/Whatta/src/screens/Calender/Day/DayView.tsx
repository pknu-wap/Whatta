import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Dimensions,
  Alert,
  Modal
} from 'react-native'

import { GestureDetector } from 'react-native-gesture-handler'
import Animated, {

} from 'react-native-reanimated'

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'
import { bus } from '@/lib/eventBus'
import TaskDetailPopup from '@/screens/More/TaskDetailPopup'
import EventDetailPopup from '@/screens/More/EventDetailPopup'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import type { EventItem } from '@/api/event_api'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import AddImageSheet from '@/screens/More/Ocr'
import OCREventCardSlider from '@/screens/More/OcrEventCardSlider'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import type { TaskDTO } from '@/api/task'

import OcrSplash from '@/screens/More/OcrSplash'
import { DraggableTaskBox } from './DayViewItems'
import { DraggableTaskGroupBox } from './DayViewItems'
import { DraggableFixedEvent } from './DayViewItems'
import { DraggableFlexalbeEvent } from './DayViewItems'
import { PIXELS_PER_MIN } from './constants'
import S from './S'
import { useDayData } from './eventUtils'
import { useDaySwipe } from './swipeUtils'
import { useDayOCR } from './ocrUtils'
import { useDayDrag } from './dragUtils'
import {
  createEvent,
  getEvent,
} from '@/api/event_api'
import {
  getTask,
  updateTask,
  createTask,
  deleteTask,
} from '@/api/task'
import {
  groupTasksByOverlap,
} from './overlapUtils'
import {
  today,
  getInstanceDates,
} from './dateUtils'
import { getMyLabels } from '@/api/label_api'

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

const HOURS = Array.from({ length: 24 }, (_, i) => i)

let draggingEventId: string | null = null

interface DayViewTask {
  id: string
  title?: string
  placementDate?: string | null
  placementTime?: string | null
  completed?: boolean
  labels?: number[]
  content?: string

  // 내부 계산용
  startMin?: number
  endMin?: number
  _column?: number
  _totalColumns?: number
}

export default function DayView() {

  function getLabelName(labelId?: number) {
  if (!labelId) return ''
  const found = labelList.find((l) => l.id === labelId)
  return found ? found.title : ''
}

  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null)

  const isFocused = useIsFocused()

  const [anchorDate, setAnchorDate] = useState<string>(today())

  const { swipeGesture, swipeStyle } =
  useDaySwipe(setAnchorDate)

  const {
  ocrSplashVisible,
  ocrModalVisible,
  ocrEvents,
  imagePopupVisible,
  setImagePopupVisible,
  setOcrModalVisible,
  sendToOCR,
} = useDayOCR()

  const anchorDateRef = useRef(anchorDate)
  useEffect(() => {
    anchorDateRef.current = anchorDate
  }, [anchorDate])
  // 중복 방송 방지용
  const lastBroadcastRef = useRef<string | null>(null)
  useEffect(() => {
    if (lastBroadcastRef.current !== anchorDate) {
      bus.emit('calendar:state', { date: anchorDate, mode: 'day' })
      lastBroadcastRef.current = anchorDate
    }
  }, [anchorDate])

  useEffect(() => {
    if (!isFocused) return

    bus.emit('calendar:state', {
      date: anchorDate,
      mode: 'day',
    })
    bus.emit('calendar:meta', {
      mode: 'day',
    })
  }, [anchorDate, isFocused])
  const [eventPopupVisible, setEventPopupVisible] = useState(false)
  const [eventPopupData, setEventPopupData] = useState<EventItem | null>(null)
  const [eventPopupMode, setEventPopupMode] = useState<'create' | 'edit'>('create')

  async function openEventDetail(ev: any) {

    const data = await getEvent(ev.id)

    const { startDate, endDate } = getInstanceDates(ev, anchorDateRef.current)

    setEventPopupData({
      ...data.data,
      startDate,
      endDate,
    })
    setEventPopupMode('edit')
    setEventPopupVisible(true)
  }
  useEffect(() => {
    const h = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      setEventPopupMode('create')
      setEventPopupData(null)
      setEventPopupVisible(true)
    }

    bus.on('popup:schedule:create', h)
    return () => bus.off('popup:schedule:create', h)
  }, [])

  const [taskPopupMode, setTaskPopupMode] = useState<'create' | 'edit'>('create')

  const taskBoxRef = useRef<View>(null)
  const gridWrapRef = useRef<View>(null)
  const [taskBoxTop, setTaskBoxTop] = useState(0)
  const [gridTop, setGridTop] = useState(0)
  const [gridScrollY, setGridScrollY] = useState(0)

  const [taskBoxRect, setTaskBoxRect] = useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  })
  const [gridRect, setGridRect] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  useFocusEffect(
    useCallback(() => {
      currentCalendarView.set('day')

      // 헤더나 WeekView에서 현재 상태를 알려줄 때
      const onState = (payload: any) => {
        // 날짜 정보가 있고, 내 날짜와 다르면 업데이트
        if (payload.date && payload.date !== anchorDateRef.current) {
          setAnchorDate(payload.date)
        }
      }

      // 강제 날짜 변경 명령 (달력 팝업 등)
      const onSet = (iso: string) => {
        setAnchorDate((prev) => (prev === iso ? prev : iso))
      }

      bus.on('calendar:state', onState)
      bus.on('calendar:set-date', onSet)
      bus.emit('calendar:request-sync')

      return () => {
        bus.off('calendar:state', onState)
        bus.off('calendar:set-date', onSet)
      }
    }, []), // 의존성 비움 - 스와이프 시 재실행 방지
  )
  useFocusEffect(
    useCallback(() => {
      bus.emit('calendar:state', {
        date: anchorDate,
        mode: 'day',
      })
    }, [anchorDate]),
  )

  useEffect(() => {
    if (isFocused) {
      bus.emit('calendar:set-date', anchorDate)
    }
  }, [anchorDate, isFocused])

  useEffect(() => {
    const onReq = () =>
      bus.emit('calendar:state', { date: anchorDateRef.current, mode: 'day' })
    const onSet = (iso: string) => {
      anchorDateRef.current = iso // 드롭 직전에도 최신 날짜가 ref에 존재
      setAnchorDate((prev) => (prev === iso ? prev : iso))
    }

    bus.on('calendar:request-sync', onReq)
    bus.on('calendar:set-date', onSet)
    // 헤더가 처음 켜질 때 상태를 원할 수 있으므로 1회 제공
    bus.emit('calendar:state', { date: anchorDateRef.current, mode: 'day' })

    return () => {
      bus.off('calendar:request-sync', onReq)
      bus.off('calendar:set-date', onSet)
    }
  }, [])

  const gridScrollYRef = useRef(0)
  const taskBoxRectRef = useRef(taskBoxRect)
  const gridRectRef = useRef(gridRect)
  useEffect(() => {
    gridScrollYRef.current = gridScrollY
  }, [gridScrollY])
  useEffect(() => {
    taskBoxRectRef.current = taskBoxRect
  }, [taskBoxRect])
  useEffect(() => {
    gridRectRef.current = gridRect
  }, [gridRect])

  // ✅ 라이브바 위치 계산
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false)

  // 라벨

  interface LabelItem {
    id: number
    title: string
    color?: string
    colorKey?: string
  }

  const [labelList, setLabelList] = useState<LabelItem[]>([])
  const fetchLabels = async () => {
  try {
    const labels = await getMyLabels()
    setLabelList(labels)
  } catch (err) {
    console.error('❌ 라벨 조회 실패:', err)
  }
}

  useEffect(() => {
    fetchLabels()
  }, [])

  // Task 팝업 상태
  const [taskPopupVisible, setTaskPopupVisible] = useState(false)
  const [taskPopupTask, setTaskPopupTask] = useState<any | null>(null)
  const [taskPopupId, setTaskPopupId] = useState<string | null>(null)
  const [popupVisible, setPopupVisible] = useState(false)

  // Task 상세 조회
  async function fetchTaskDetail(taskId: string) {
    return await getTask(taskId)
  }

  async function handleTaskPress(taskId: string) {
    try {
      const detail = await fetchTaskDetail(taskId)
      setSelectedTask(detail)
      setPopupVisible(true)
    } catch (e) {
      console.warn('task detail load error', e)
      Alert.alert('오류', '테스크 정보를 가져오지 못했습니다.')
    }
  }

  // taskId 로 서버에서 Task 상세 조회해서 팝업 열기
  const openTaskPopupFromApi = async (taskId: string) => {
    try {
      const data = await getTask(taskId)
      if (!data) return
      setTaskPopupMode('edit')

      setTaskPopupId(data.id)
      setTaskPopupTask({
        id: data.id,
        title: data.title ?? '',
        content: data.content ?? '',
        labels: data.labels ?? [],
        completed: data.completed ?? false,
        placementDate: data.placementDate,
        placementTime: data.placementTime,
        dueDateTime: data.dueDateTime ?? null,
        reminderNoti: data.reminderNoti ?? null,
      })

      setTaskPopupVisible(true)
    } catch (e) {
      console.warn('task detail load error', e)
      Alert.alert('오류', '테스크 정보를 가져오지 못했습니다.')
    }
  }

  const { items: filterLabels } = useLabelFilter()

  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일') // 수정: "할 일" 라벨 탐색
    return found ? Number(found.id) : null
  }, [filterLabels])

  // FAB에서 사용하는 '할 일 생성' 팝업 열기
  const openCreateTaskPopup = useCallback((source?: string) => {
    setTaskPopupMode('create')
    setTaskPopupId(null)

    const placementDate = source === 'Day' ? anchorDateRef.current : null
    const placementTime = null

    setTaskPopupTask({
      id: null,
      title: '',
      content: '',
      labels: todoLabelId ? [todoLabelId] : [],
      completed: false,
      placementDate,
      placementTime,
      dueDateTime: null,
    })

    setTaskPopupVisible(true)
  }, [])

  useEffect(() => {
    const handler = (payload?: { source?: string }) => {
      if (payload?.source !== 'Day') return
      openCreateTaskPopup(payload.source)
    }

    bus.on('task:create', handler)
    return () => bus.off('task:create', handler)
  }, [openCreateTaskPopup])

  useEffect(() => {
    const updateNowTop = (scrollToCenter = false) => {
      const now = new Date()
      const hour = now.getHours()
      const min = now.getMinutes()
      const topPos = (hour * 60 + min) * PIXELS_PER_MIN
      setNowTop(topPos)

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

    updateNowTop(true)
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      if (nowTop != null) {
        requestAnimationFrame(() => {
          gridScrollRef.current?.scrollTo({
            y: Math.max(nowTop - Dimensions.get('window').height * 0.2, 0),
            animated: true,
          })
        })
      }
    }, [nowTop]),
  )

  // 라벨 필터링
  const enabledLabelIds = filterLabels.filter((l) => l.enabled).map((l) => l.id)

    const measureLayouts = useCallback(() => {
    taskBoxRef.current?.measure?.((x, y, w, h, px, py) => {
      setTaskBoxTop(py) // 기존 코드 유지
      setTaskBoxRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
    gridWrapRef.current?.measure?.((x, y, w, h, px, py) => {
      setGridTop(py) // 기존 코드 유지
      setGridRect({ left: px, top: py, right: px + w, bottom: py + h })
    })
  }, [])

  const {
  events,
  spanEvents,
  tasks,
  checks,
  setChecks,
  fetchDailyEvents,
} = useDayData(anchorDate, enabledLabelIds)

useDayDrag({
  anchorDateRef,
  fetchDailyEvents,
  measureLayouts,
  taskBoxRectRef,
  gridRectRef,
  gridScrollYRef,
})

const taskGroups = useMemo(() => groupTasksByOverlap(tasks), [tasks])

  useEffect(() => {
    // 사이드바 닫힐 때 레이아웃 재측정
    const handler = measureLayouts
    bus.on('drawer:close', handler)
    requestAnimationFrame(handler) // 초기 1회 측정

    return () => {
      bus.off('drawer:close', handler)
    }
  }, [measureLayouts])

  // 새 일정이 추가되면 즉시 재조회
  useEffect(() => {
    const onMutated = (payload: { op: 'create' | 'update' | 'delete'; item: any }) => {
      if (!payload?.item) return
      const date =
        payload.item.startDate ?? payload.item.date ?? payload.item.endDate ?? today()
      const itemDateISO = date.slice(0, 10)

      if (itemDateISO === anchorDate && payload.item.id !== draggingEventId) {
        fetchDailyEvents()
      } else {
        draggingEventId = null
      }
    }

    bus.on('calendar:mutated', onMutated)
    return () => bus.off('calendar:mutated', onMutated)
  }, [anchorDate, fetchDailyEvents])

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

  const toggleCheck = async (id: string) => {
    const current = checks.find((c) => c.id === id)
    if (!current) return

    const nextDone = !current.done

    // UI 즉시 변경
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, done: nextDone } : c)))

    // 서버에 보낼 값도 nextDone 사용
    try {
      await updateTask(id, { completed: nextDone })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id },
      })
    } catch (err) {
      console.error('❌ 테스크 상태 업데이트 실패:', err)
    }
  }

  const handleDeleteTask = async () => {
  if (!taskPopupId) return

  Alert.alert('삭제', '이 테스크를 삭제하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    {
      text: '삭제',
      style: 'destructive',
      onPress: async () => {
        try {
          await deleteTask(taskPopupId)

          bus.emit('calendar:mutated', {
            op: 'delete',
            item: { id: taskPopupId, date: anchorDate },
          })

          bus.emit('calendar:invalidate', {
            ym: anchorDate.slice(0, 7),
          })

          await fetchDailyEvents()

          setTaskPopupVisible(false)
          setTaskPopupId(null)
          setTaskPopupTask(null)
        } catch (err) {
          console.error('❌ 테스크 삭제 실패:', err)
          Alert.alert('오류', '테스크를 삭제하지 못했습니다.')
        }
      },
    },
  ])
}

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWithSidebar mode="overlay">
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[S.screen, swipeStyle]}>
            {/* ✅ 상단 테스크 박스 */}
            <FullBleed padH={12}>
              <View style={S.taskBoxWrap} ref={taskBoxRef} onLayout={measureLayouts}>
                <View
                  style={S.taskBox}
                  onLayout={(e) => {
                    onLayoutWrap(e)
                    measureLayouts()
                  }}
                >
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
                      const current = anchorDate

                      let start = ''
                      let end = ''

                      // 하루짜리 allDayEvents
                      if (!t.startDate && !t.endDate && !t.startAt && !t.endAt) {
                        start = current
                        end = current
                      }
                      // allDaySpan (기간 있음)
                      else if (t.startDate && t.endDate) {
                        start = t.startDate
                        end = t.endDate
                      }
                      // timed span
                      else if (t.startAt && t.endAt) {
                        start = t.startAt.slice(0, 10)
                        end = t.endAt.slice(0, 10)
                      }

                      const isStart = current === start
                      const isEnd = current === end

                      const raw = t.colorKey || t.color
                      const base = raw
                        ? raw.startsWith('#')
                          ? raw
                          : `#${raw}`
                        : '#8B5CF6'
                      const bg = `${base}4D`

                      return (
                        <Pressable key={t.id ?? i} onPress={() => openEventDetail(t)}>
                          <View
                            style={[
                              S.chip,
                              {
                                backgroundColor: bg,
                                borderTopLeftRadius: isStart ? 6 : 0,
                                borderBottomLeftRadius: isStart ? 6 : 0,
                                borderTopRightRadius: isEnd ? 6 : 0,
                                borderBottomRightRadius: isEnd ? 6 : 0,
                              },
                            ]}
                          >
                            {isStart && (
                              <View
                                style={[S.chipBar, { left: 0, backgroundColor: base }]}
                              />
                            )}
                            {isEnd && (
                              <View
                                style={[S.chipBar, { right: 0, backgroundColor: base }]}
                              />
                            )}
                            <View style={{ flex: 1, paddingHorizontal: 12 }}>
                              <Text style={S.chipText} numberOfLines={1}>
                                {t.title}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      )
                    })}

                    {checks.map((c) => (
                      <Pressable
                        key={c.id}
                        style={S.checkRow}
                        onPress={() => openTaskPopupFromApi(c.id)}
                      >
                        {/* 체크박스만 눌렀을 때 토글 */}
                        <Pressable
                          onPress={() => toggleCheck(c.id)}
                          style={S.checkboxWrap}
                          hitSlop={10}
                        >
                          <View style={[S.checkbox, c.done && S.checkboxOn]}>
                            {c.done && <Text style={S.checkmark}>✓</Text>}
                          </View>
                        </Pressable>

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

                <View pointerEvents="none" style={S.boxBottomLine} />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
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
              onLayout={measureLayouts}
              onScroll={(e) => {
                setGridScrollY(e.nativeEvent.contentOffset.y)
              }}
              scrollEventThrottle={16}
            >
              <View ref={gridWrapRef}>
                {HOURS.map((h, i) => {
                  const isLast = i === HOURS.length - 1

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

                      {!isLast && <View pointerEvents="none" style={S.guideLine} />}
                    </View>
                  )
                })}
              </View>

              {/* ✅ 현재시간 라이브바 */}
              {nowTop !== null && (
                <>
                  <View style={[S.liveBar, { top: nowTop }]} />
                  <View style={[S.liveDot, { top: nowTop - 3 }]} />
                </>
              )}
              {events.map((evt) => {
                const [sh, sm] = evt.clippedStartTime.split(':').map(Number)
                const [eh, em] = evt.clippedEndTime.split(':').map(Number)
                const startMin = sh * 60 + sm
                const endMin = eh * 60 + em

                // 반복 일정이면 DraggableFixedEvent 사용
                if (evt.isRepeat) {
                  return (
                    <DraggableFixedEvent
                      key={evt.id}
                      id={evt.id}
                      title={evt.title}
                      place={getLabelName(evt.labels?.[0])}
                      startMin={startMin}
                      endMin={endMin}
                      color={`#${evt.colorKey}`}
                      anchorDate={anchorDate}
                      onPress={() => openEventDetail(evt)}
                    />
                  )
                }

                // 일반 일정
                return (
<DraggableFlexalbeEvent
  key={evt.id}
  id={evt.id}
  title={evt.title}
  place={getLabelName(evt.labels?.[0])}
  startMin={startMin}
  endMin={endMin}
  color={`#${evt.colorKey}`}
  anchorDate={anchorDate}
  isRepeat={!!evt.isRepeat}
  _column={evt._column}        
  _totalColumns={evt._totalColumns} 
  onPress={() => openEventDetail(evt)}
/>
                )
              })}

              {/* ⭐ Task groups 적용 */}
              {taskGroups.map((group, idx) => {
                const { tasks: list, startMin } = group

                // 4개 이상 → 그룹박스 1개만
                if (list.length >= 4) {
                  return (
                    <DraggableTaskGroupBox
                      key={`group-${idx}`}
                      group={list}
                      startMin={startMin}
                      count={list.length}
                      anchorDate={anchorDate}
                      onPress={() =>
                        setOpenGroupIndex(openGroupIndex === idx ? null : idx)
                      }
                      setIsDraggingTask={setIsDraggingTask}
                    />
                  )
                }

                // 1~3개 → 기존 개별 Task 렌더
                return list.map((task) => {
                  const start = task.placementTime?.includes(':')
                    ? (() => {
                        const [h, m] = task.placementTime.split(':').map(Number)
                        return h + m / 60
                      })()
                    : 0

                  return (
                    <DraggableTaskBox
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      startHour={start}
                      anchorDate={anchorDate}
                      placementDate={task.placementDate}
                      done={task.completed}
                      onPress={() => openTaskPopupFromApi(task.id)}
                      column={task._column}
                      totalColumns={task._totalColumns}
                      events={events}
                    />
                  )
                })
              })}

              {/* ⭐ 펼쳐지는 상세 UI는 map 밖에서 단 한 번만 렌더 */}
              {openGroupIndex !== null &&
                (() => {
                  const group = taskGroups[openGroupIndex]
                  if (!group) return null
                  const { tasks: list, startMin } = group

                  return (
                    <View
                      style={{
                        position: 'absolute',
                        top: startMin * PIXELS_PER_MIN + 52,
                        left: 50 + 18,
                        right: 18,
                        backgroundColor: '#FFF',
                        borderRadius: 10,
                        borderColor: '#B3B3B3',
                        borderWidth: 0.3,
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        zIndex: 500,
                      }}
                    >
                      {list.map((task) => (
                        <Pressable
                          key={task.id}
                          onPress={() => openTaskPopupFromApi(task.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 18,
                          }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderWidth: 2,
                              borderRadius: 2,
                              borderColor: '#333',
                              marginRight: 14,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#FFF', // ⭐ 추가
                            }}
                          >
                            {task.completed && (
                              <Text style={{ fontSize: 12, color: '#333' }}>✓</Text>
                            )}
                          </View>

                          <Text style={{ fontSize: 14, color: '#000' }}>
                            {task.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                })()}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
        <TaskDetailPopup
          visible={taskPopupVisible}
          mode={taskPopupMode}
          taskId={taskPopupId ?? undefined}
          initialTask={taskPopupTask}
          onClose={() => {
            setTaskPopupVisible(false)
            setTaskPopupId(null)
            setTaskPopupTask(null)
          }}
          onSave={async (form) => {
            const pad = (n: number) => String(n).padStart(2, '0')

            let placementDate: string | null = null
            let placementTime: string | null = null
            const fieldsToClear: string[] = []

            // 날짜
            if (form.hasDate && form.date) {
              const d = form.date
              placementDate = `${d.getFullYear()}-${pad(
                d.getMonth() + 1,
              )}-${pad(d.getDate())}`
            } else {
              fieldsToClear.push('placementDate')
            }

            // 시간
            if (form.hasTime && form.time) {
              const t = form.time
              placementTime = `${pad(t.getHours())}:${pad(t.getMinutes())}:00`
            } else {
              fieldsToClear.push('placementTime')
            }

            const reminderNoti = form.reminderNoti ?? null
            if (!reminderNoti) fieldsToClear.push('reminderNoti')

            const targetDate = placementDate ?? anchorDate

            try {
              if (taskPopupMode === 'edit') {
                if (!taskPopupId) return

                await updateTask(taskPopupId, {
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  fieldsToClear,
                })

                bus.emit('calendar:mutated', {
                  op: 'update',
                  item: { id: taskPopupId, date: targetDate },
                })
              } else {
                // 새 테스크 생성 로직
                const res = await createTask({
                  title: form.title,
                  content: form.memo,
                  labels: form.labels,
                  placementDate,
                  placementTime,
                  reminderNoti,
                  date: targetDate,
                })

                console.log(
                  'task: ' +
                    form.time +
                    placementDate +
                    placementTime +
                    reminderNoti?.hour +
                    reminderNoti?.hour +
                    reminderNoti?.minute,
                )

                const newId = res.id

                bus.emit('calendar:mutated', {
                  op: 'create',
                  item: { id: newId, date: targetDate },
                })
              }

              // 💥 DayView 화면 즉시 갱신
              await fetchDailyEvents()

              // 팝업 닫기
              setTaskPopupVisible(false)
              setTaskPopupId(null)
              setTaskPopupTask(null)
            } catch (err) {
              console.error('❌ 테스크 저장 실패:', err)
              Alert.alert('오류', '테스크를 저장하지 못했습니다.')
            }
          }}
          onDelete={taskPopupMode === 'edit' ? handleDeleteTask : undefined}
        />

        <EventDetailPopup
          visible={eventPopupVisible}
          eventId={eventPopupData?.id ?? null}
          initial={eventPopupData ?? undefined}
          mode={eventPopupMode}
          onClose={() => {
            setEventPopupVisible(false)
            setEventPopupData(null)
            fetchDailyEvents() // 일정 새로 반영
          }}
        />
        <Modal
  visible={ocrSplashVisible}
  transparent={true}
  animationType="fade"
  statusBarTranslucent={true}
>
  <OcrSplash />
</Modal>
        <AddImageSheet
          visible={imagePopupVisible}
          onClose={() => setImagePopupVisible(false)}
          onPickImage={(uri, base64, ext) => sendToOCR(base64, ext)}
          onTakePhoto={(uri, base64, ext) => sendToOCR(base64, ext)}
        />
       <OCREventCardSlider
  visible={ocrModalVisible}
  events={ocrEvents}
  onClose={() => setOcrModalVisible(false)}

  // ✔ 단일 저장
  onAddEvent={async (payload) => {
    try {
      await createEvent(payload)
      await fetchDailyEvents()
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err) {
      console.error(err)
    }
  }}

  // ✔ 전체 저장 → 슬라이더 내부에서 이미 저장 처리함
  onSaveAll={async () => {
    await fetchDailyEvents()
    bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    setOcrModalVisible(false)
  }}
/>
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

