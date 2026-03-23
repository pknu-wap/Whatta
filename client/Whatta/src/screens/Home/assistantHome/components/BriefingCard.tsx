import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantBriefing } from '@/screens/Home/assistantHome/types'

type Props = {
  briefing: AssistantBriefing
}

function BriefingList({
  title,
  items,
}: {
  title: string
  items: { id: string; title: string; timeLabel: string }[]
}) {
  return (
    <View style={S.listBlock}>
      <Text style={S.listTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.id} style={S.itemRow}>
          <Text style={S.itemTitle}>{item.title}</Text>
          <Text style={S.itemTime}>{item.timeLabel}</Text>
        </View>
      ))}
    </View>
  )
}

export default function BriefingCard({ briefing }: Props) {
  return (
    <View style={S.card}>
      <Text style={S.dateLabel}>{briefing.dateLabel}</Text>
      <Text style={S.heading}>오늘의 일정/할일 브리핑</Text>
      <Text style={S.summary}>{briefing.summary}</Text>

      <BriefingList title="오늘의 일정" items={briefing.schedules} />
      <BriefingList title="할 일" items={briefing.todos} />
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#FFF7E8',
    marginBottom: 20,
    shadowColor: '#A66A00',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  dateLabel: {
    ...ts('body3'),
    color: '#B97100',
  },
  heading: {
    ...ts('titleM'),
    color: colors.text.text1,
    marginTop: 8,
  },
  summary: {
    ...ts('body1'),
    color: colors.text.text2,
    marginTop: 8,
  },
  listBlock: {
    marginTop: 16,
  },
  listTitle: {
    ...ts('label3'),
    color: '#7B5A1D',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0DFC0',
  },
  itemTitle: {
    ...ts('body1'),
    color: colors.text.text1,
    flex: 1,
    marginRight: 12,
  },
  itemTime: {
    ...ts('label4'),
    color: colors.text.text3,
  },
})
