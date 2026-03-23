import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantNewsBanner } from '@/screens/Home/assistantHome/types'

type Props = {
  item: AssistantNewsBanner
}

export default function NewsBannerCard({ item }: Props) {
  return (
    <View style={S.card}>
      <View style={S.badge}>
        <Text style={S.badgeText}>{item.badge}</Text>
      </View>
      <Text style={S.title}>{item.title}</Text>
      <Text style={S.body}>{item.body}</Text>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#17324D',
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: {
    ...ts('body3'),
    color: colors.text.text1w,
  },
  title: {
    ...ts('titleM'),
    color: colors.text.text1w,
    marginTop: 12,
  },
  body: {
    ...ts('body1'),
    color: '#D7E5F1',
    marginTop: 10,
  },
})
