import React, { useState, memo, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

import CheckOff from '@/assets/check_off.svg'
import CheckOn from '@/assets/check_on.svg'

type Task = {
  id: string
  title: string
  done: boolean
  touchedAt?: number
}

const initialTasks: Task[] = [
  { id: '1', title: 'React 공부하기', done: false },
  { id: '2', title: '개발하기', done: false },
  { id: '3', title: '밥 먹기', done: true },
  { id: '4', title: 'a', done: false },
  { id: '5', title: 'b', done: false },
  { id: '6', title: 'c', done: true },
  { id: '7', title: 'd', done: false },
  { id: '8', title: 'r', done: false },
  { id: '9', title: 'q', done: true },
]

const SECTION_HEIGHT = 260

export default function Sidebar(props: DrawerContentComponentProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const seqRef = useRef(0) // 동시 클릭 대비
  const insets = useSafeAreaInsets()

  const now = () => ++seqRef.current + Date.now() // 항상 증가

  const toggleDone = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done, touchedAt: now() } : t)),
    )

  // 정렬 규칙
  // 완료: 최근에 체크 한 순서
  // 예정: 최근에 취소 한 순서
  // touchedAt이 없는 항목은 아래쪽으로
  const sortByRecent = (a: Task, b: Task) =>
    (b.touchedAt ?? -Infinity) - (a.touchedAt ?? -Infinity)

  const upcoming = tasks.filter((t) => !t.done).sort(sortByRecent)
  const completed = tasks.filter((t) => t.done).sort(sortByRecent)

  return (
    <SafeAreaView style={S.root} edges={['left', 'right', 'top']}>
      <View style={S.board}>
        <Section
          title="예정"
          data={upcoming}
          onToggle={toggleDone}
          style={S.sectionTitle}
        />
        <View style={S.divider} />
        <Section
          title="완료"
          data={completed}
          onToggle={toggleDone}
          style={[S.sectionTitle, { marginTop: 16 }]}
        />
      </View>
    </SafeAreaView>
  )
}

function Section({
  title,
  data,
  onToggle,
  style,
}: {
  title: string
  data: Task[]
  onToggle: (id: string) => void
  style?: any
}) {
  return (
    <View style={[S.section, style]}>
      <Text style={[ts('date'), S.sectionTitle]}>{title}</Text>

      {/* 개수가 넘치면 이 안에서만 스크롤 */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            title={item.title}
            checked={item.done}
            onToggle={() => onToggle(item.id)}
          />
        )}
        style={{ height: SECTION_HEIGHT }}
        contentContainerStyle={S.sectionListContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={true}
      />
    </View>
  )
}

const TaskCard = memo(function TaskCard({
  title,
  checked,
  onToggle,
}: {
  title: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <View style={S.card}>
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
          { fontSize: 15, marginLeft: 12, color: colors.task.taskName },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  )
})

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.task.sideBar, borderRadius: 24 },
  board: {
    flex: 1,
    backgroundColor: colors.task.sideBar,
    borderRadius: 24,
    padding: 16,
    marginTop: 40,
  },
  section: {},
  card: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
    color: colors.task.taskName,
  },
  sectionListContent: {},
  divider: {
    height: 1, // 선의 두께
    backgroundColor: colors.task.taskName, // 원하는 색상 (예: 옅은 회색)
    opacity: 0.1, // 투명도를 줘서 옅게 만듭니다.
    marginVertical: 10, // 위아래 여백 추가 (필요하다면 더 늘리거나 줄일 수 있습니다)
  },
})
