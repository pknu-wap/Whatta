import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantTransitStatus } from '@/screens/Home/assistantHome/types'

type Props = {
  item: AssistantTransitStatus
  onPress: () => void
}

export default function TransitStatusCard({ item, onPress }: Props) {
  return (
    <View style={S.card}>
      <View style={S.headerRow}>
        <Text style={S.title}>{item.title}</Text>
        <View style={S.badge}>
          <Text style={S.badgeText}>{item.leaveByLabel}</Text>
        </View>
      </View>

      <Text style={S.routeLabel}>{item.routeLabel}</Text>
      <Text style={S.departureStatus}>{item.departureStatusLabel}</Text>
      <Text style={S.summary}>{item.summary}</Text>

      <Pressable style={S.ctaButton} onPress={onPress}>
        <Text style={S.ctaText}>{item.ctaLabel}</Text>
      </Pressable>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#EEF6F3',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...ts('titleS'),
    color: colors.text.text1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#D7ECE4',
  },
  badgeText: {
    ...ts('body3'),
    color: '#23674F',
  },
  routeLabel: {
    ...ts('label3'),
    color: '#23674F',
    marginTop: 12,
  },
  departureStatus: {
    ...ts('label2'),
    color: colors.text.text1,
    marginTop: 8,
  },
  summary: {
    ...ts('body1'),
    color: colors.text.text3,
    marginTop: 8,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background.bg1,
    marginTop: 14,
  },
  ctaText: {
    ...ts('label4'),
    color: colors.text.text1,
  },
})
