import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import BeforeIcon from '@/assets/icons/before.svg'
import CurrentIcon from '@/assets/icons/current.svg'
import AfterIcon from '@/assets/icons/after.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantBriefing } from '@/screens/Home/assistantHome/types'

type Props = {
  briefing: AssistantBriefing
}

export default function BriefingCard({ briefing }: Props) {
  return (
    <View style={S.card}>
      <Text style={S.dateLabel}>{briefing.dateLabel}</Text>
      <Text style={S.heading}>오늘의 일정</Text>

      <View style={S.scheduleList}>
        {briefing.schedules.map((item) => (
          <View key={item.id} style={S.scheduleCard}>
            <View style={[S.scheduleAccent, { backgroundColor: item.timeLabel }]} />
            <Text style={S.scheduleTitle}>{item.title}</Text>
          </View>
        ))}
      </View>

      <View style={S.sectionHeaderRow}>
        <Text style={S.sectionTitle}>시간별 일정</Text>
        <View style={S.sectionDivider} />
      </View>

      <View style={S.timelineList}>
        <View style={S.timelineSharedLine} />
        {briefing.timeline.map((item, index) => (
          <View
            key={item.id}
            style={[S.timelineRow, index === briefing.timeline.length - 1 && S.timelineRowLast]}
          >
            <View style={S.timelineIconColumn}>
              <View style={S.timelineIconWrap}>
                {item.status === 'past' ? (
                  <BeforeIcon width={12} height={12} />
                ) : item.status === 'current' ? (
                  <CurrentIcon width={12} height={12} />
                ) : (
                  <AfterIcon width={12} height={12} />
                )}
              </View>
            </View>

            <View style={[S.timelineBox, item.status === 'current' && S.timelineBoxCurrent]}>
              <Text style={[S.timelineTime, item.status === 'current' && S.timelineTimeCurrent]}>
                {item.timeRange}
              </Text>
              <Text style={S.timelineTitle}>{item.title}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#1C2430',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  dateLabel: {
    ...ts('body3'),
    color: '#8A9097',
  },
  heading: {
    ...ts('titleM'),
    color: colors.text.text1,
    marginTop: 8,
  },
  scheduleList: {
    marginTop: 18,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 310,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7EDF3',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 10,
  },
  scheduleAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  scheduleTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.text.text1,
    paddingHorizontal: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    ...ts('label2'),
    color: '#4E535A',
    marginRight: 12,
  },
  sectionDivider: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E7EB',
  },
  timelineList: {
    marginLeft: -6,
    position: 'relative',
  },
  timelineSharedLine: {
    position: 'absolute',
    left: 16,
    top: 15,
    bottom: 15,
    width: 1,
    backgroundColor: '#D5DDE5',
  },
  timelineRow: {
    width: 310,
    minHeight: 30,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineRowLast: {
    marginBottom: 0,
  },
  timelineBox: {
    width: 274,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  timelineBoxCurrent: {
    backgroundColor: '#B04FFF0D',
  },
  timelineIconColumn: {
    width: 36,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  timelineIconWrap: {
    width: 12,
    height: 12,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  timelineTime: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: '#A6AFB8',
    width: 104,
    marginRight: 10,
  },
  timelineTimeCurrent: {
    color: '#9D4EFF',
    fontWeight: '700',
  },
  timelineTitle: {
    fontSize: 13,
    lineHeight: 16,
    color: '#20242A',
    fontWeight: '500',
  },
})
