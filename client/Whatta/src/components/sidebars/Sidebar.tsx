import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'
import { useFocusEffect } from '@react-navigation/native'
import { bus } from '@/lib/eventBus'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { http } from '@/lib/http'
import { useLabelFilter } from '@/providers/LabelFilterProvider'
import SidebarTaskItem from '@/components/sidebars/SidebarTaskItem'

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
  const onUpcomingReorderEnd = (data: Task[], from: number, to: number) => {
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

    void putSidebarTask(moved.id, {
        title: safeTitle(moved.title),
        sortNumber: newSort,
        completed: moved.completed,
      })
      .catch((e) => {
        console.warn('reorder failed:', e)
        setTasks(prevSnapshot)
      })
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
        title="할 일"
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
          placeholderTextColor={colors.brand.primary}
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
    <SidebarTaskItem
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
      <Text style={S.sectionTitle}>{title}</Text>

      <DraggableFlatList
        data={data}
        extraData={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data: newData, from, to }) => {
          onDragEnd(newData as Task[], from, to)
        }}
        renderPlaceholder={() => <View style={S.dragPlaceholder} />}
        style={{ height: SECTION_HEIGHT }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
      <Text style={S.sectionTitle}>{title}</Text>
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SidebarTaskItem
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
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const S = StyleSheet.create({
  board: {
    flex: 1,
    backgroundColor: colors.background.bg2,
    borderTopRightRadius: 22,
    padding: 16,
  },
  sectionTitle: {
    ...ts('titleS'),
    lineHeight: 20,
    marginBottom: 8,
    color: colors.text.text1,
  },
  divider: {
    height: 1.2,
    backgroundColor: colors.divider.divider1,
    marginTop: 10,
    marginBottom: 24,
  },
  dragPlaceholder: {
    width: 155,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand.primary,
    backgroundColor: '#FFFFFF80',
  },
  // ✅ 입력창 스타일 (피그마 느낌의 보더/라운드)
  newInput: {
    ...ts('body1'),
    height: 48,
    borderWidth: 0.5,
    borderColor: colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    opacity: 0.5,
    color: colors.brand.primary,
    fontWeight: 400
  },
})
