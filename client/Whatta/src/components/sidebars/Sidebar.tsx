import React, { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'
import { useFocusEffect } from '@react-navigation/native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { runOnJS } from 'react-native-worklets'
import { bus } from '@/lib/eventBus'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { http } from '@/lib/http'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import * as Haptics from 'expo-haptics'

// type 정의
export type Task = {
  id: string
  title: string
  content?: string
  completed: boolean
  sortNumber: number // 작을수록 위
  labels?: any
  placementDate?: string | null
  placementTime?: string | null
  dueDateTime?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// API 호출: PUT /api/task/sidebar/:id
type SidebarPutBody = {
  title: string
  sortNumber: number
  completed: boolean
}

// 서버에서 받아온 raw를 내부 Task로 변환할 때
function mapTask(d: any): Task {
  return {
    id: d.id ?? d._id ?? '',
    title: d.title ?? '',
    content: d.content ?? '',
    completed: !!d.completed,
    sortNumber: Number(d.sortNumber ?? 0),
    // 시간 관련
    placementDate: d.placementDate ?? null,
    placementTime: d.placementTime ?? null,
    dueDateTime: d.dueDateTime ?? null,
    // 라벨
    labels: d.labels?.labels ?? [],
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

function TaskCardDraggable({ item }: { item: Task }) {
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY
      bus.emit('sidebar:dragging', { task: item, x: e.absoluteX, y: e.absoluteY })
    })
    .onEnd((e) => {
      bus.emit('sidebar:drop', { task: item, x: e.absoluteX, y: e.absoluteY })
      translateY.value = withTiming(0)
      opacity.value = withTiming(1)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[S.card, style]}>
        <TaskCard
          id={item.id}
          title={item.title}
          checked={item.completed}
          onToggle={() => {}}
        />
      </Animated.View>
    </GestureDetector>
  )
}

function isTimelessTask(t: Task) {
  // placementTime(예: "18:00:00")이나 dueDateTime(ISO)이 하나라도 있으면 시간 있음
  const hasPlacementTime =
    typeof t.placementTime === 'string' && t.placementTime.trim() !== ''
  const hasDueDateTime = typeof t.dueDateTime === 'string' && t.dueDateTime.trim() !== ''
  return !(hasPlacementTime || hasDueDateTime)
}

async function putSidebarTask(taskId: string, payload: SidebarPutBody) {
  // console.log('🔵 [PATCH 요청 시작]', {
  //   taskId,
  //   payload,
  // })

  try {
    const res = await http.patch(`/task/${taskId}`, payload)

    // console.log('🟢 [PATCH 성공 응답]', {
    //   status: res.status,
    //   data: res.data,
    // })

    return res
  } catch (err: any) {
    // console.log('🔴 [PATCH 실패]', {
    //   taskId,
    //   payload,
    //   errorMessage: err?.message,
    //   responseStatus: err?.response?.status,
    //   responseData: err?.response?.data,
    // })
    throw err
  }
}

// 서버 스펙: GET /task/sidebar
async function fetchTasksFromServer(): Promise<Task[]> {
  const res = await http.get('/task/sidebar')
  const list = res?.data?.data ?? []
  return list.map(mapTask) as Task[]
}

// ✅ 서버 스펙: POS /task (생성)
async function createTaskAPI(title: string, labelIds?: number[] | null) {
  const payload = {
    title,
    content: '',
    labels: labelIds ?? null, // 기본 '할 일' 라벨 세팅
    placementDate: null,
    placementTime: null,
    dueDateTime: null,
    repeat: null,
  }
  return http.post('/task', payload)
}
const TOP_GAP = 1024 // 최상단/최하단 배치 시 충분히 큰 간격 확보용
function getTopSortNumber(list: Task[], excludeId?: string) {
  const arr = list.filter((t) => t.id !== excludeId)
  if (arr.length === 0) return 0
  const min = Math.min(...arr.map((t) => Number(t.sortNumber)))
  return min - TOP_GAP // 작은 수가 위
}

function getBottomSortNumber(list: Task[], excludeId?: string) {
  const arr = list.filter((t) => t.id !== excludeId)
  if (arr.length === 0) return 0
  const max = Math.max(...arr.map((t) => Number(t.sortNumber)))
  return max + TOP_GAP
}

const SECTION_HEIGHT = 260

export default function Sidebar() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const { items: filterLabels } = useLabelFilter()

  const todoLabelId = useMemo(() => {
    const found = (filterLabels ?? []).find((l) => l.title === '할 일')
    return found ? Number(found.id) : null
  }, [filterLabels])

  const safeTitle = (v: any) =>
    typeof v === 'string' && v.trim().length > 0 ? v : '(제목 없음)'

  // 최초 1회 로드
  useEffect(() => {
    let mounted = true
    fetchTasksFromServer()
      .then((list) => {
        if (!mounted) return
        setTasks(list)
      })
      .catch((e) => console.warn('Task fetch failed:', e))
    return () => {
      mounted = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const list = await fetchTasksFromServer()
      setTasks(list)
    } catch (e) {
      console.warn('Task refresh failed:', e)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
      return () => {}
    }, [refresh]),
  )

  useEffect(() => {
    const remove = ({ id }: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
    bus.on('sidebar:remove-task', remove)
    return () => bus.off('sidebar:remove-task', remove)
  }, [])

  // 입력창 제출 -> 생성 -> 자동 재조회
  const handleCreate = useCallback(async () => {
    const title = newTitle.trim()
    if (!title) return

    const snapshot = tasks
    const baseUpcoming = snapshot.filter((t) => !t.completed && isTimelessTask(t))
    const optimisticSort = getTopSortNumber(baseUpcoming)
    const tempId = `temp-${Date.now()}`

    // ‘할 일’ 라벨을 기본으로 넣기
    const defaultLabels = todoLabelId ? [todoLabelId] : []

    const tempTask: Task = {
      id: tempId,
      title,
      content: '',
      completed: false,
      sortNumber: optimisticSort,
      labels: defaultLabels,
      placementDate: null,
      placementTime: null,
      dueDateTime: null,
      createdAt: null,
      updatedAt: null,
    }
    setTasks((prev) => [tempTask, ...prev])
    setNewTitle('')

    try {
      // 서버 생성 시에도 같은 라벨 전달
      const res = await createTaskAPI(title, defaultLabels)
      const created = mapTask(res?.data?.data ?? {})

      const current = ((prev) => prev)(tasks)
      const upcomingNow = current.filter((t) => !t.completed && isTimelessTask(t))
      const topSort = getTopSortNumber(upcomingNow, created.id)

      // console.log('🟡 [handleCreate → PATCH 직전]', {
      //   createdId: created.id,
      //   title: created.title,
      //   topSort,
      //   safeTitle: created.title || '(제목 없음)',
      // })

      await refresh()
    } catch (e) {
      console.warn('Task create failed:', e)
      setTasks(snapshot)
      setNewTitle(title)
    }
  }, [newTitle, tasks, refresh, todoLabelId])

  // 토글 - 리스트 이동 시 항상 목표 섹션의 최상단으로 배치
  const toggleDone = async (id: string) => {
    const prevSnapshot = tasks

    setTasks((prev) => {
      const cur = prev.find((t) => t.id === id)
      if (!cur) return prev
      const nextCompleted = !cur.completed

      // 옮겨갈 섹션의 현재 목록 기준으로 최상단 번호 부여
      const base = nextCompleted
        ? prev.filter((t) => t.completed)
        : prev.filter((t) => !t.completed)

      const newSort = getTopSortNumber(base, id)

      return prev.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted, sortNumber: newSort } : t,
      )
    })

    try {
      const cur = prevSnapshot.find((t) => t.id === id)
      if (!cur) return
      const nextCompleted = !cur.completed
      const base = nextCompleted
        ? prevSnapshot.filter((t) => t.completed)
        : prevSnapshot.filter((t) => !t.completed)
      const newSort = getTopSortNumber(base, id)
      // console.log('🟡 [toggleDone → PATCH 직전]', {
      //   id,
      //   nextCompleted,
      //   newSort,
      //   safeTitle: safeTitle(cur.title),
      // })

      await putSidebarTask(id, {
        title: safeTitle(cur.title),
        completed: nextCompleted,
        sortNumber: newSort,
      })
    } catch (e) {
      console.warn('toggleDone failed:', e)
      setTasks(prevSnapshot)
    }
  }

  // 예정 섹션 내부 드래그 종료 시 sortNumber 재계산 + 서버 저장
  const onUpcomingReorderEnd = async (data: Task[], from: number, to: number) => {
    if (from === to) return

    const moved = data[to]
    let newSort: number

    if (to === 0) {
      newSort = getTopSortNumber(data, moved.id)
    } else if (to === data.length - 1) {
      newSort = getBottomSortNumber(data, moved.id)
    } else {
      const upper = data[to - 1]
      const lower = data[to + 1]
      newSort = (upper.sortNumber + lower.sortNumber) / 2
    }

    const prevSnapshot = tasks

    setTasks((prev) =>
      prev.map((t) => (t.id === moved.id ? { ...t, sortNumber: newSort } : t)),
    )

    try {
      await putSidebarTask(moved.id, {
        title: safeTitle(moved.title),
        sortNumber: newSort,
        completed: moved.completed,
      })
    } catch (e) {
      console.warn('reorder failed:', e)
      setTasks(prevSnapshot)
    }
  }

  // 예정/완료 분리 (sortNumber 오름차순: 작은 값이 위)
  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => !t.completed && isTimelessTask(t))
        .sort((a, b) => a.sortNumber - b.sortNumber),
    [tasks],
  )

  const completed = useMemo(
    () =>
      tasks
        .filter((t) => t.completed && isTimelessTask(t))
        .sort((a, b) => a.sortNumber - b.sortNumber),
    [tasks],
  )

  return (
    <View style={S.board}>
      <SectionUpcoming
        title="예정"
        data={upcoming}
        onToggle={toggleDone}
        onDragEnd={onUpcomingReorderEnd}
      />

      {/* ✅ 입력창: 제출 시 즉시 생성 */}
      <View style={{ marginTop: 12, marginBottom: 6 }}>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="할 일을 입력하세요"
          placeholderTextColor="#B9A7EA"
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          style={S.newInput}
        />
      </View>

      <View style={S.divider} />

      <SectionCompleted title="완료" data={completed} onToggle={toggleDone} />
    </View>
  )
}

// 예정(드래그 가능)
function SectionUpcoming({
  title,
  data,
  onToggle,
  onDragEnd,
}: {
  title: string
  data: Task[]
  onToggle: (id: string) => void
  onDragEnd: (data: Task[], from: number, to: number) => void
}) {
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => (
    <TaskCard
      id={item.id}
      title={item.title}
      checked={item.completed}
      onToggle={() => onToggle(item.id)}
      onLongPressHandle={drag} // ← 점 세개(핸들) 길게 → 내부 정렬
      isActive={!!isActive}
    />
  )

  return (
    <View>
      <Text style={[ts('date'), S.sectionTitle]}>{title}</Text>

      <DraggableFlatList
        data={data}
        extraData={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data: newData, from, to }) =>
          onDragEnd(newData as Task[], from, to)
        }
        style={{ height: SECTION_HEIGHT }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        autoscrollThreshold={40}
        autoscrollSpeed={80}
        containerStyle={{ overflow: 'hidden' }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

// 완료(드래그 불가)
function SectionCompleted({
  title,
  data,
  onToggle,
}: {
  title: string
  data: Task[]
  onToggle: (id: string) => void
}) {
  return (
    <View>
      <Text style={[ts('date'), S.sectionTitle]}>{title}</Text>
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            id={item.id}
            title={item.title}
            checked={item.completed}
            onToggle={() => onToggle(item.id)}
          />
        )}
        // 드래그 불가하게
        onDragBegin={() => {}}
        onDragEnd={() => {}}
        activationDistance={99999}
        style={{ height: SECTION_HEIGHT }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const TaskCard = memo(function TaskCard({
  id,
  title,
  checked,
  onToggle,
  onLongPressHandle,
  isActive,
  registerSimultaneous,
}: {
  id: string
  title: string
  checked: boolean
  onToggle: () => void
  onLongPressHandle?: () => void // 우측 3점(핸들) 롱프레스 → 내부 정렬
  isActive?: boolean
  registerSimultaneous?: (gh: any) => void
}) {
  const start = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:start', { task: { id, title }, x, y })
    },
    [id, title],
  )

  const move = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:move', { task: { id, title }, x, y })
    },
    [id, title],
  )

  const drop = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:drop', { task: { id, title }, x, y })
    },
    [id, title],
  )
  const midPanRef = React.useRef<any>(null)
  // Pan 제스처: 롱프레스 후 활성 + 바깥으로 나가도 유지
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withRef(midPanRef)
        .activateAfterLongPress(180)
        .minDistance(10)
        .shouldCancelWhenOutside(false)
        .onStart((e) => {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
          runOnJS(start)(e.absoluteX, e.absoluteY)
        })
        .onChange((e) => {
          runOnJS(move)(e.absoluteX, e.absoluteY)
        })
        .onFinalize((e) => {
          runOnJS(drop)(e.absoluteX, e.absoluteY)
        }),
    [start, move, drop],
  )

  useEffect(() => {
    registerSimultaneous?.(midPanRef.current)
  }, [registerSimultaneous])

  return (
    <View style={[S.card, isActive && { opacity: 0.9 }]}>
      {/* 체크박스 */}
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        {checked ? (
          <CheckOn width={24} height={24} />
        ) : (
          <CheckOff width={24} height={24} />
        )}
      </Pressable>

      {/* 제목 영역 */}
      {checked ? (
        // 완료된 테스크: 드래그 비활성화
        <Text
          style={[
            ts('taskName'),
            { fontSize: 15, color: colors.task.taskName, marginLeft: 12, flex: 1 },
            { textDecorationLine: 'line-through' },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        // 예정 테스크만 드래그 가능
        <GestureDetector gesture={pan}>
          <Text
            style={[
              ts('taskName'),
              { fontSize: 15, color: colors.task.taskName, marginLeft: 12, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </GestureDetector>
      )}

      {/* 점3개 핸들: 내부 순서 변경용 */}
      <Pressable
        onLongPress={onLongPressHandle}
        delayLongPress={180}
        hitSlop={12}
        style={S.handle}
        accessibilityLabel="drag handle"
      >
        <Text style={S.handleText}>···</Text>
      </Pressable>
    </View>
  )
})

const S = StyleSheet.create({
  board: {
    flex: 1,
    backgroundColor: colors.task.sideBar,
    borderTopRightRadius: 10,
    padding: 16,
    borderRadius: 10,
  },
  card: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: -5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.task.taskName,
  },
  divider: {
    height: 1,
    backgroundColor: colors.task.taskName,
    opacity: 0.1,
    marginVertical: 10,
  },
  handle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginLeft: 6,
  },
  handleText: {
    fontSize: 22,
    lineHeight: 22,
    includeFontPadding: false,
    textAlign: 'center',
    opacity: 0.5,
  },
  // ✅ 입력창 스타일 (피그마 느낌의 보더/라운드)
  newInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#B9A7EA', // 연보라
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    color: colors.task.taskName,
  },
})
