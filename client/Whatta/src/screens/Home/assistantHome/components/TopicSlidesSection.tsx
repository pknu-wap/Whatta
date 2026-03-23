import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantTopicSlide } from '@/screens/Home/assistantHome/types'

type Props = {
  items: AssistantTopicSlide[]
  onPressItem: (topicId: string) => void
}

export default function TopicSlidesSection({ items, onPressItem }: Props) {
  return (
    <View style={S.section}>
      <Text style={S.heading}>주제별 스케줄링 슬라이드</Text>
      <Text style={S.description}>
        슬라이드를 누르면 관련 태스크를 한 화면에서 볼 수 있는 상세 화면으로 이동합니다.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.sliderContent}
      >
        {items.map((item) => {
          const pendingCount = item.totalCount - item.completedCount

          return (
            <Pressable
              key={item.id}
              style={S.slideCard}
              onPress={() => onPressItem(item.id)}
            >
              <View style={S.topRow}>
                <Text style={S.title}>{item.title}</Text>
                <Text style={S.dueLabel}>{item.dueLabel}</Text>
              </View>

              <Text style={S.summary}>{item.summary}</Text>

              <View style={S.progressRow}>
                <View style={S.progressChip}>
                  <Text style={S.progressText}>완료 {item.completedCount}</Text>
                </View>
                <View style={[S.progressChip, S.progressChipMuted]}>
                  <Text style={S.progressTextMuted}>미완료 {pendingCount}</Text>
                </View>
              </View>

              <View style={S.taskPreviewList}>
                {item.tasks.slice(0, 3).map((task) => (
                  <View key={task.id} style={S.taskPreviewRow}>
                    <Text style={S.taskPreviewStatus}>
                      {task.completed ? '완료' : '미완료'}
                    </Text>
                    <Text style={S.taskPreviewTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={S.taskPreviewDue}>{task.dueLabel}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  heading: {
    ...ts('titleS'),
    color: colors.text.text1,
  },
  description: {
    ...ts('body1'),
    color: colors.text.text3,
    marginTop: 8,
  },
  sliderContent: {
    paddingTop: 14,
    paddingRight: 20,
  },
  slideCard: {
    width: 292,
    borderRadius: 24,
    padding: 20,
    marginRight: 12,
    backgroundColor: colors.background.bg1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...ts('label1'),
    color: colors.text.text1,
    flex: 1,
    marginRight: 12,
  },
  dueLabel: {
    ...ts('body3'),
    color: colors.brand.secondary,
  },
  summary: {
    ...ts('body1'),
    color: colors.text.text2,
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  progressChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E9F7EA',
    marginRight: 8,
  },
  progressChipMuted: {
    backgroundColor: '#FFF1E2',
  },
  progressText: {
    ...ts('body3'),
    color: '#1C7C33',
  },
  progressTextMuted: {
    ...ts('body3'),
    color: '#BA6A16',
  },
  taskPreviewList: {
    marginTop: 16,
  },
  taskPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider2,
  },
  taskPreviewStatus: {
    ...ts('body3'),
    color: colors.text.text3,
    width: 38,
  },
  taskPreviewTitle: {
    ...ts('body1'),
    color: colors.text.text1,
    flex: 1,
    marginHorizontal: 8,
  },
  taskPreviewDue: {
    ...ts('body3'),
    color: colors.text.text4,
  },
})
