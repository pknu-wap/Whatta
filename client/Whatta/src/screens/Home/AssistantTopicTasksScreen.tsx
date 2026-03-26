import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import LeftIcon from '@/assets/icons/left.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { RootStackParamList } from '@/navigation/RootStack'
import { assistantTopicSlides } from '@/screens/Home/assistantHome/mockData'

type Props = NativeStackScreenProps<RootStackParamList, 'AssistantTopicTasks'>

export default function AssistantTopicTasksScreen({ navigation, route }: Props) {
  const topic = assistantTopicSlides.find((item) => item.id === route.params.topicId)

  return (
    <SafeAreaView style={S.safeArea} edges={['top']}>
      <View style={S.header}>
        <Pressable style={S.backButton} onPress={() => navigation.goBack()}>
          <LeftIcon width={24} height={24} color={colors.icon.selected} />
        </Pressable>
        <Text style={S.headerTitle}>주제별 태스크</Text>
        <View style={S.headerRightSpace} />
      </View>

      <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        <View style={S.heroCard}>
          <Text style={S.heroTag}>SCHEDULED TOPIC</Text>
          <Text style={S.heroTitle}>{topic?.title ?? '주제를 찾을 수 없습니다.'}</Text>
          <Text style={S.heroDescription}>
            {topic?.summary ?? '선택한 주제에 연결된 태스크를 이 화면에서 모아보게 됩니다.'}
          </Text>
        </View>

        {(topic?.tasks ?? []).map((task) => (
          <View key={task.id} style={S.taskCard}>
            <View style={S.taskRow}>
              <View
                style={[
                  S.statusDot,
                  task.completed ? S.statusDone : S.statusPending,
                ]}
              />
              <Text style={S.taskTitle}>{task.title}</Text>
            </View>

            <View style={S.metaRow}>
              <Text style={S.metaLabel}>{task.completed ? '완료' : '미완료'}</Text>
              <Text style={S.metaDivider}>·</Text>
              <Text style={S.metaLabel}>마감 {task.dueLabel}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg1,
  },
  headerTitle: {
    ...ts('titleS'),
    color: colors.text.text1,
  },
  headerRightSpace: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#17324D',
    marginBottom: 18,
  },
  heroTag: {
    ...ts('body3'),
    color: '#C7DCF5',
  },
  heroTitle: {
    ...ts('titleM'),
    color: colors.text.text1w,
    marginTop: 8,
  },
  heroDescription: {
    ...ts('body1'),
    color: '#E3EDF7',
    marginTop: 10,
  },
  taskCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: colors.background.bg1,
    marginBottom: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusDone: {
    backgroundColor: colors.feedback.success,
  },
  statusPending: {
    backgroundColor: colors.feedback.warning,
  },
  taskTitle: {
    ...ts('label2'),
    color: colors.text.text1,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaLabel: {
    ...ts('body1'),
    color: colors.text.text3,
  },
  metaDivider: {
    marginHorizontal: 6,
    color: colors.text.text4,
  },
})
