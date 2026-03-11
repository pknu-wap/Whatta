import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import CheckOn from '@/assets/icons/check_on.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import { updateTask } from '@/api/task'
import { bus } from '@/lib/eventBus'
import { DayViewTask } from './overlapUtils'
import { updateEvent, getEvent, createEvent } from '@/api/event_api'
import { Alert } from 'react-native'
import { ROW_H, PIXELS_PER_MIN } from './constants'
import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'
let draggingEventId: string | null = null

const { width: SCREEN_W } = Dimensions.get('window')

type DraggableTaskBoxProps = {
  id: string
  title: string | undefined
  startHour: number
  placementDate?: string | null
  done?: boolean
  anchorDate: string
  onPress?: () => void
  column: number | undefined
  totalColumns: number | undefined
  events: any[]
}

export function DraggableTaskBox({
  id,
  title,
  startHour,
  placementDate,
  done: initialDone = false,
  anchorDate,
  onPress,
  column,
  totalColumns,
  events,
}: DraggableTaskBoxProps) {
  const translateY = useSharedValue(startHour * 60 * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)
  const [done, setDone] = useState(initialDone)
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  useEffect(() => {
    translateY.value = withSpring(startHour * 60 * PIXELS_PER_MIN)
  }, [startHour])

  const handleDrop = async (newTime: string) => {
    try {
      await updateTask(id, {
        placementDate: anchorDate,
        placementTime: newTime,
      })

      bus.emit('calendar:mutated', {
        op: 'update',
        item: { id, isTask: true, date: anchorDate },
      })
      bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
    } catch (err: any) {
      console.error('❌ 테스크 시간 이동 실패:', err.message)
    }
  }

  // 롱프레스 후에만 드래그 허용
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      const maxY = 23 * 60 * PIXELS_PER_MIN // 24시 직전까지만
      const nextY = translateY.value + e.changeY
      translateY.value = Math.max(0, Math.min(maxY, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      const newMinutes = snappedY / PIXELS_PER_MIN
      const hour = Math.floor(newMinutes / 60)
      const min = Math.round(newMinutes % 60)

      const fmt = (n: number) => String(n).padStart(2, '0')
      const newTime = `${fmt(hour)}:${fmt(min)}:00`

      runOnJS(handleDrop)(newTime)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
  }))

  const COLUMN_GAP = 4
  const LEFT_OFFSET = 50 + 18
  const RIGHT_OFFSET = 18
  const usableWidth = SCREEN_W - LEFT_OFFSET - RIGHT_OFFSET

  const safeColumn = column ?? 0
  const safeTotalColumns = totalColumns ?? 1

const startMin = startHour * 60
const endMin = startMin + 60 

const overlappingEvents = events.filter(ev => {
  return !(ev.endMin <= startMin || ev.startMin >= endMin)
})

const widthPercent = 1 / safeTotalColumns
  
const isOverlapWithEvent = overlappingEvents.length > 0

let boxWidth = usableWidth * widthPercent - COLUMN_GAP
let left = LEFT_OFFSET + safeColumn * (usableWidth * widthPercent)

if (isOverlapWithEvent) {
  boxWidth = usableWidth * 0.5
  left = LEFT_OFFSET + usableWidth * 0.5
}

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left,
            width: boxWidth,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFF80',
            borderWidth: 0.4,
            borderColor: '#333333',
            borderRadius: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 20,
          },
          style,
        ]}
      >
<TaskItemCard
  id={id}
  title={title ?? ''}
  done={done}
  density="day"
  onPress={onPress}
  onToggle={(taskId, next) => {
    setDone(next)

    updateTask(taskId, {
      completed: next,
    }).catch((err) =>
      console.error('❌ 테스크 체크 상태 업데이트 실패:', err)
    )
  }}
/>
      </Animated.View>
    </GestureDetector>
  )
}

export function DraggableTaskGroupBox({
  group,
  startMin,
  count,
  anchorDate,
  onPress,
  setIsDraggingTask, 
}: {
  group: DayViewTask[]
  startMin: number
  count: number
  anchorDate: string
  onPress: () => void
  setIsDraggingTask: (v: boolean) => void
}) {
  const translateY = useSharedValue(startMin * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  useEffect(() => {
    translateY.value = withSpring(startMin * PIXELS_PER_MIN)
  }, [startMin])

  const handleDrop = useCallback(
    async (snappedY: number) => {
      try {
        const newStartMin = snappedY / PIXELS_PER_MIN
        const delta = newStartMin - startMin
        const fmt = (n: number) => String(n).padStart(2, '0')

        await Promise.all(
          group.map(async (t) => {
            const m = t.placementTime?.match(/(\d+):(\d+)/)
            if (!t.placementTime || !m) return

            const oldH = Number(m[1])
            const oldM = Number(m[2])
            const oldMin = oldH * 60 + oldM

            const newMin = oldMin + delta
            const newH = Math.floor(newMin / 60)
            const newM = newMin % 60
            const newTime = `${fmt(newH)}:${fmt(newM)}:00`

            return updateTask(t.id, {
              placementDate: anchorDate,
              placementTime: newTime,
            })
          }),
        )

        // 캘린더 갱신 이벤트 (1번만)
        bus.emit('calendar:mutated', {
          op: 'update',
          item: { id: null, isTask: true, date: anchorDate },
        })
      } catch (err) {
        console.log('❌ Group drop error:', err)
      } finally {
        runOnJS(setIsDraggingTask)(false) // 드래그 종료
      }
    },
    [group, startMin, anchorDate],
  )

  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      runOnJS(setIsDraggingTask)(true) 
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      const maxY = 23 * 60 * PIXELS_PER_MIN
      const nextY = translateY.value + e.changeY
      translateY.value = Math.max(0, Math.min(maxY, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      let snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      snappedY = Math.max(0, Math.min(23 * 60 * PIXELS_PER_MIN, snappedY))

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      runOnJS(handleDrop)(snappedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 2 }, { translateX: translateX.value }],
  }))

  const LEFT_OFFSET = 50 + 18
  const RIGHT_OFFSET = 18
  const usableWidth = SCREEN_W - LEFT_OFFSET - RIGHT_OFFSET
  const boxWidth = usableWidth - 4

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: LEFT_OFFSET,
            width: boxWidth,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFF80',
            borderWidth: 0.4,
            borderRadius: 10,
            borderColor: '#333333',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            zIndex: 30,
          },
          style,
        ]}
      >
<TaskGroupCard
  groupId={group[0]?.id ?? 'group'}
tasks={group.map(t => ({
  id: t.id,
  title: t.title ?? '',
  done: Boolean(t.completed)
}))}
  density="day"
  expanded={false}
  onToggleTask={(taskId, next) => {
    updateTask(taskId, { completed: next }).catch(err =>
      console.error('❌ 그룹 테스크 업데이트 실패:', err)
    )
  }}
  onToggleExpand={() => {
    onPress()
  }}
/>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableFixedEventProps = {
  id: string
  title: string
  place: string
  startMin: number
  endMin: number
  color: string
  anchorDate: string
  onPress?: () => void
}

export function DraggableFixedEvent({
  id,
  title,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
  onPress,
}: DraggableFixedEventProps) {

  const rawHeight = (endMin - startMin) * PIXELS_PER_MIN
  const height = rawHeight

  const translateY = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleDrop = useCallback(
    async (movedY: number) => {
      try {
        const SNAP_UNIT = 5 * PIXELS_PER_MIN
        const snappedY = Math.round(movedY / SNAP_UNIT) * SNAP_UNIT
        translateY.value = withSpring(snappedY)

        const deltaMin = snappedY / PIXELS_PER_MIN
        const newStart = startMin + deltaMin
        const newEnd = endMin + deltaMin

        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`

        const newStartTime = fmt(newStart)
        const newEndTime = fmt(newEnd)

        const detailRes = await getEvent(id)
        const ev = detailRes.data

        if (ev?.repeat) {
          const basePayload = {
            title: ev.title,
            content: ev.content ?? '',
            labels: ev.labels ?? [],
            startDate: anchorDate,
            endDate: anchorDate,
            startTime: newStartTime,
            endTime: newEndTime,
            colorKey: ev.colorKey,
          }

          const prevDay = (iso: string) => {
            const d = new Date(iso)
            d.setDate(d.getDate() - 1)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          }

          Alert.alert('반복 일정 수정', '이후 반복하는 일정들도 반영할까요?', [
            { text: '취소', style: 'cancel' },

            {
              text: '이 일정만',
              onPress: async () => {
                try {
                  const occ = anchorDate
                  const prev = ev.repeat.exceptionDates ?? []
                  const next = prev.includes(occ) ? prev : [...prev, occ]

                  // 기존 반복 일정에서 제외
                  await updateEvent(id, {
                    repeat: {
                      ...ev.repeat,
                      exceptionDates: next,
                    },
                  })

                  // 단일 일정 만들기
                  await createEvent({
                    ...basePayload,
                    repeat: null,
                  })

                  bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
                } catch (e) {
                  console.error('❌ 반복 단일 수정 실패:', e)
                }
              },
            },

            {
              text: '이후 일정 모두',
              onPress: async () => {
                try {
                  const cutEnd = prevDay(anchorDate)

                  // 기존 반복 일정 잘라내기
                  await updateEvent(id, {
                    repeat: {
                      ...ev.repeat,
                      endDate: cutEnd,
                    },
                  })

                  // 이후 반복 일정 새로 만들기
                  await createEvent({
                    ...basePayload,
                    repeat: ev.repeat,
                  })

                  bus.emit('calendar:invalidate', { ym: anchorDate.slice(0, 7) })
                } catch (e) {
                  console.error('❌ 반복 전체 수정 실패:', e)
                }
              },
            },
          ])

          return
        }

        // 🔥 일반 일정 PATCH (기존 Fixed 로직)
        await updateEvent(id, {
          startDate: anchorDate,
          endDate: anchorDate,
          startTime: newStartTime,
          endTime: newEndTime,
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            isTask: false,
            startDate: anchorDate,
            endDate: anchorDate,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
      } catch (err: any) {
        console.error('❌ FixedEvent 드롭 실패:', err.message)
      }
    },
    [id, startMin, endMin, anchorDate],
  )

  // ===== 롱프레스 후 드래그 시작 =====
  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  // ===== 드래그 =====
  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return
      const totalHeight = 24 * 60 * PIXELS_PER_MIN
      const topOffset = startMin * PIXELS_PER_MIN + translateY.value + e.changeY

      const minTop = 0
      const maxTop = totalHeight - rawHeight
      const clampedTop = Math.max(minTop, Math.min(maxTop, topOffset))
      translateY.value = clampedTop - startMin * PIXELS_PER_MIN
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const totalHeight = 24 * 60 * PIXELS_PER_MIN
      const topOffset = startMin * PIXELS_PER_MIN + translateY.value

      const minTop = 0
      const maxTop = totalHeight - rawHeight

      const clampedTop = Math.max(minTop, Math.min(maxTop, topOffset))
      const delta = clampedTop - startMin * PIXELS_PER_MIN

      translateY.value = delta
      runOnJS(handleDrop)(delta)
    })

  // ===== 합성 제스처 =====
  const composedGesture = Gesture.Simultaneous(hold, drag)

  // ===== 스타일 =====
  const style = useAnimatedStyle(() => ({
    top: startMin * PIXELS_PER_MIN + translateY.value,
  }))

  const base = color.startsWith('#') ? color : `#${color}`
  const bg = `${base}` 

  const fmt = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const startTime = fmt(startMin)
const endTime = fmt(endMin)

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height,
            backgroundColor: 'transparent',
            paddingHorizontal: 6,
            paddingTop: 10,
            borderRadius: 12,
            zIndex: 10,
          },
          style,
        ]}
      >
<FixedScheduleCard
  id={id}
  title={title}
  color={color}
  timeRangeText={`${startTime} ~ ${endTime}`}
  density="day"
  onPress={onPress}
/>
      </Animated.View>
    </GestureDetector>
  )
}

type DraggableFlexibleEventProps = {
  id: string
  title: string
  labels?: string[]
  place?: string
  startMin: number
  endMin: number
  color: string
  anchorDate: string
  isRepeat?: boolean
  onPress?: () => void
  _column?: number
  _totalColumns?: number
}

export function DraggableFlexalbeEvent({
  id,
  title,
  labels,
  place,
  startMin,
  endMin,
  color,
  anchorDate,
  isRepeat = false,
  onPress,
  _column
}: DraggableFlexibleEventProps) {
  const durationMin = endMin - startMin
  const totalHeight = 24 * 60 * PIXELS_PER_MIN
  const rawHeight = durationMin * PIXELS_PER_MIN
  const height = rawHeight - 2
  const offsetY = 1

  // 절대 Y(위에서부터의 픽셀)로 관리
  const translateY = useSharedValue(startMin * PIXELS_PER_MIN)
  const translateX = useSharedValue(0)
  const dragEnabled = useSharedValue(false)

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleDrop = useCallback(
    async (snappedY: number) => {
      draggingEventId = id
      try {
        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(
            2,
            '0',
          )}:00`

        // snappedY(절대 Y) → 분으로
        const newStartMin = snappedY / PIXELS_PER_MIN
        const newEndMin = newStartMin + durationMin

        const newStartTime = fmt(newStartMin)
        const newEndTime = fmt(newEndMin)
        const dateISO = anchorDate

        // 반복 일정 처리
        if (isRepeat) {
          const detailRes = await getEvent(id)
          const ev = detailRes.data
          if (!ev?.repeat) {
            // repeat 데이터가 없으면 그냥 일반 PATCH로 fallback
            await updateEvent(id, {
              startDate: dateISO,
              endDate: dateISO,
              startTime: newStartTime,
              endTime: newEndTime,
            })
            bus.emit('calendar:mutated', {
              op: 'update',
              item: {
                id,
                isTask: false,
                startDate: dateISO,
                endDate: dateISO,
                startTime: newStartTime,
                endTime: newEndTime,
              },
            })
            return
          }

          const basePayload = {
            title: ev.title,
            content: ev.content ?? '',
            labels: ev.labels ?? [],
            startDate: dateISO,
            endDate: dateISO,
            startTime: newStartTime,
            endTime: newEndTime,
            colorKey: ev.colorKey,
          }

          const ymdLocal = (iso: string) => iso // 이미 ISO라 그대로 사용
          const prevDay = (iso: string) => {
            const d = new Date(
              Number(iso.slice(0, 4)),
              Number(iso.slice(5, 7)) - 1,
              Number(iso.slice(8, 10)),
            )
            d.setDate(d.getDate() - 1)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          }

          Alert.alert('반복 일정 수정', '이후 반복하는 일정들도 반영할까요?', [
            { text: '취소', style: 'cancel' },

            {
              text: '이 일정만',
              onPress: async () => {
                try {
                  const occDate = ymdLocal(dateISO)
                  const prev = ev.repeat.exceptionDates ?? []
                  const next = prev.includes(occDate) ? prev : [...prev, occDate]

                  // 1) 기존 반복 일정에 exceptionDates 패치
                  await updateEvent(id, {
                    repeat: {
                      ...ev.repeat,
                      exceptionDates: next,
                    },
                  })

                  // 2) 단일 일정 생성
                  await createEvent({
                    ...basePayload,
                    repeat: null,
                  })

                  bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
                  bus.emit('calendar:mutated', {
                    op: 'update',
                    item: { id, startDate: dateISO, endDate: dateISO },
                  })
                } catch (e) {
                  console.error('❌ 반복 단일 수정(드래그) 실패:', e)
                }
              },
            },

            {
              text: '이후 일정 모두',
              onPress: async () => {
                try {
                  const cutEnd = prevDay(dateISO)

                  // 1) 기존 반복 일정 끝을 전날로 자름
                  await updateEvent(id, {
                    repeat: {
                      ...ev.repeat,
                      endDate: cutEnd,
                    },
                  })

                  // 2) 이후 구간 새 반복 일정 생성
                  await createEvent({
                    ...basePayload,
                    repeat: ev.repeat,
                  })

                  bus.emit('calendar:invalidate', { ym: dateISO.slice(0, 7) })
                  bus.emit('calendar:mutated', {
                    op: 'update',
                    item: { id, startDate: dateISO, endDate: dateISO },
                  })
                } catch (e) {
                  console.error('❌ 반복 전체 수정(드래그) 실패:', e)
                }
              },
            },
          ])

          return
        }

        await updateEvent(id, {
          startDate: dateISO,
          endDate: dateISO,
          startTime: newStartTime,
          endTime: newEndTime,
        })

        bus.emit('calendar:mutated', {
          op: 'update',
          item: {
            id,
            isTask: false,
            startDate: dateISO,
            endDate: dateISO,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
      } catch (err: any) {
        console.error('❌ 이벤트 시간 이동 실패:', err.message)
      }
    },
    [id, durationMin, anchorDate, isRepeat],
  )

  const hold = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      runOnJS(triggerHaptic)()
      dragEnabled.value = true
    })

  const drag = Gesture.Pan()
    .onChange((e) => {
      if (!dragEnabled.value) return

      const minTop = 0
      const maxTop = totalHeight - rawHeight

      const nextY = translateY.value + e.changeY

      translateY.value = Math.max(minTop, Math.min(maxTop, nextY))
      translateX.value += e.changeX
    })
    .onEnd(() => {
      if (!dragEnabled.value) return
      dragEnabled.value = false

      const SNAP_UNIT = 5 * PIXELS_PER_MIN
      const minTop = 0
      const maxTop = totalHeight - rawHeight

      let snappedY = Math.round(translateY.value / SNAP_UNIT) * SNAP_UNIT
      snappedY = Math.max(minTop, Math.min(maxTop, snappedY))

      translateY.value = withSpring(snappedY)
      translateX.value = withSpring(0)

      runOnJS(handleDrop)(snappedY)
    })

  const composedGesture = Gesture.Simultaneous(hold, drag)

  const style = useAnimatedStyle(() => ({
    top: translateY.value + offsetY,
    transform: [{ translateX: translateX.value }],
  }))

  const backgroundColor = color.startsWith('#') ? color : `#${color}`

  // ⭐ 겹침용 계단식 offset
const BASE_LEFT = 50 + 16
const STAGGER = 40       // 하나 겹칠 때마다 오른쪽으로 32px
const MAX_STAGGER = 120    // 너무 많아지면 제한

const shift = Math.min((_column ?? 0) * STAGGER, MAX_STAGGER)

const left = BASE_LEFT + shift

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left,
            right: 16,
            height,
            backgroundColor,
            paddingHorizontal: 6,
            paddingTop: 10,
            borderRadius: 12,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
<RepeatScheduleCard
  id={id}
  title={title}
  color={color}
  timeRangeText={place ?? labels?.[0]}
  density="day"
  onPress={onPress}
/>
      </Animated.View>
    </GestureDetector>
  )
}
