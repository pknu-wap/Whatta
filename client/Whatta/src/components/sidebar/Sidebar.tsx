import React, { useState } from 'react'
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native'
import Checkbox from 'expo-checkbox'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { SafeAreaView } from 'react-native-safe-area-context'
import colors from '@/styles/colors'

type Task = { id: string; title: string; done: boolean }

const initialTasks: Task[] = [
  { id: '1', title: 'React 공부하기', done: false },
  { id: '2', title: '개발하기', done: false },
  { id: '3', title: '밥 먹기', done: true },
]

export default function Sidebar(props: DrawerContentComponentProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const toggleDone = (id: string) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  return (
    <SafeAreaView style={S.container} edges={['left', 'bottom', 'right']}>
      {/* 노치 여백 */}
      <Text style={S.sectionTitle}>Task 리스트</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const checked = item.done
          return (
            <Pressable
              onPress={() => toggleDone(item.id)}
              style={({ pressed }) => [S.taskRow, pressed && { opacity: 0.5 }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View pointerEvents="none">
                <Checkbox
                  value={checked}
                  color={checked ? colors.primary.main : undefined}
                />
              </View>
              <Text style={[S.taskText, item.done && S.done]}>{item.title}</Text>
            </Pressable>
          )
        }}
        ItemSeparatorComponent={() => <View style={S.separator} />}
      />
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.neutral.surface,
    marginTop: 30,
  },
  sectionTitle: { fontWeight: 'bold', fontSize: 30, marginVertical: 30 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  taskText: { fontSize: 16, marginLeft: 8 },
  done: { textDecorationLine: 'line-through', color: colors.text.caption },
  separator: { height: 1, backgroundColor: colors.primary.main },
})
