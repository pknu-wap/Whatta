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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#17324D',
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: {
    ...ts('body3'),
    color: colors.text.text1w,
  },
  title: {
    ...ts('titleS'),
    color: colors.text.text1w,
    marginTop: 10,
  },
  body: {
    ...ts('body2'),
    color: '#D7E5F1',
    marginTop: 8,
  },
})
