import React, { type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantQuickAction, AssistantQuickActionId } from '@/screens/Home/assistantHome/types'

type Props = {
  items: AssistantQuickAction[]
  onPress: (item: AssistantQuickAction) => void
  iconMap: Partial<Record<AssistantQuickActionId, ReactNode>>
}

export default function QuickActionGrid({ items, onPress, iconMap }: Props) {
  return (
    <View style={S.grid}>
      {items.map((item) => (
        <Pressable key={item.id} style={S.card} onPress={() => onPress(item)}>
          <View style={S.iconWrap}>{iconMap[item.id] ?? null}</View>
          <Text style={S.title}>{item.title}</Text>
          <Text style={S.description}>{item.description}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const S = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48.8%',
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.background.bg1,
    marginBottom: 12,
    shadowColor: '#17324D',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg2,
  },
  title: {
    ...ts('label2'),
    color: colors.text.text1,
    marginTop: 12,
  },
  description: {
    ...ts('body1'),
    color: colors.text.text3,
    marginTop: 6,
  },
})
