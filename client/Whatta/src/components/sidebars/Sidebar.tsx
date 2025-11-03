import React, { useEffect, useMemo, useState, memo, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, DeviceEventEmitter } from 'react-native'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'
import { useFocusEffect } from '@react-navigation/native'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { http } from '@/lib/http'

// type 정의
export type Task = {
  id: string
  title: string
  content?: string
  completed: boolean
  sortNumber: number // 작을수록 위
  labels?: any
  placementDate?: string
  placementTime?: string | null
  dueDateTime?: string | null
  createdAt?: string
  updatedAt?: string
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

function isTimelessTask(t: Task) {
  // placementTime(예: "18:00:00")이나 dueDateTime(ISO)이 하나라도 있으면 시간 있음
  const hasPlacementTime =
    typeof t.placementTime === 'string' && t.placementTime.trim() !== ''
  const hasDueDateTime = typeof t.dueDateTime === 'string' && t.dueDateTime.trim() !== ''
  return !(hasPlacementTime || hasDueDateTime)
}

async function putSidebarTask(taskId: string, payload: SidebarPutBody) {
  console.log('[SORT] send to server =>', { id: taskId, sortNumber: payload.sortNumber })
  return http.put(`/api/task/sidebar/${taskId}`, payload)
}

// 서버 스펙: GET /api/task
async function fetchTasksFromServer(): Promise<Task[]> {
  const res = await http.get('/api/task')
  const list = res?.data?.data ?? []
  return list.map(mapTask) as Task[]
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
      let alive = true
      refresh()
      return () => {
        alive = false
      }
    }, [refresh]),
  )

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
      title={item.title}
      checked={item.completed}
      onToggle={() => onToggle(item.id)}
      // 내부 정렬 드래그
      onLongPressHandle={drag}
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
        showsVerticalScrollIndicator
      />
    </View>
  )
}

// 완료(드래그 불가)(드래그 불가)
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
        showsVerticalScrollIndicator
      />
    </View>
  )
}

const TaskCard = memo(function TaskCard({
  title,
  checked,
  onToggle,
  onLongPressHandle,
  isActive,
}: {
  title: string
  checked: boolean
  onToggle: () => void
  onLongPressHandle?: () => void // 우측 3점(핸들) 롱프레스 → 내부 정렬
  isActive?: boolean
}) {
  return (
    <View style={[S.card, isActive && { opacity: 0.9 }]}>
      {/* 체크 토글 */}
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

      <Text
        style={[
          ts('taskName'),
          { fontSize: 15, color: colors.task.taskName, marginLeft: 12, flex: 1 },
          checked && { textDecorationLine: 'line-through' },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* 내부 정렬 드래그 */}
      <Pressable
        onLongPress={onLongPressHandle}
        delayLongPress={180}
        hitSlop={12}
        accessibilityLabel="drag handle"
        style={S.handle}
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
    borderTopRightRadius: 24,
    padding: 16,
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
})
