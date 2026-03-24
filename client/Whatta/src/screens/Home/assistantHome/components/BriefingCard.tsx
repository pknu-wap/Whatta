import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import BeforeIcon from '@/assets/icons/before.svg'
import CurrentIcon from '@/assets/icons/current.svg'
import AfterIcon from '@/assets/icons/after.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { AssistantBriefing } from '@/screens/Home/assistantHome/types'

type Props = {
  briefing: AssistantBriefing
  onPressScheduleArea?: () => void
}

type TimelineState = 'past' | 'current' | 'upcoming'

function parseTimeValue(value: string) {
  const [hourText = '0', minuteText = '0'] = value.trim().split(':')
  const hours = Number(hourText)
  const minutes = Number(minuteText)
  return hours * 60 + minutes
}

function getTimelineState(timeRange: string): TimelineState {
  const [startText = '00:00', endText = '00:00'] = timeRange.split('~').map((value) => value.trim())
  const startMinutes = parseTimeValue(startText)
  const endMinutes = parseTimeValue(endText)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (nowMinutes > startMinutes && nowMinutes < endMinutes) return 'current'
  if (nowMinutes < startMinutes && nowMinutes < endMinutes) return 'upcoming'
  return 'past'
}

function getStartMinutes(timeRange: string) {
  const [startText = '00:00'] = timeRange.split('~')
  return parseTimeValue(startText)
}

export default function BriefingCard({ briefing, onPressScheduleArea }: Props) {
  const timelineItems = [...briefing.timeline].sort(
    (left, right) => getStartMinutes(left.timeRange) - getStartMinutes(right.timeRange),
  )
  const isEmpty = briefing.schedules.length === 0 && timelineItems.length === 0

  return (
    <View style={S.card}>
      <Text style={S.dateLabel}>{briefing.dateLabel}</Text>
      <Pressable style={S.scheduleContent} onPress={onPressScheduleArea}>
        <Text style={S.heading}>오늘의 일정</Text>

        {isEmpty ? (
          <View style={S.emptyCard}>
            <Text style={S.emptyTitle}>오늘 일정이 없어요.</Text>
            <Text style={S.emptyDescription}>일정을 만들어보세요!</Text>
          </View>
        ) : null}

        {!isEmpty ? (
          <View>
            <View style={S.scheduleList}>
              {briefing.schedules.map((item) => (
                <View key={item.id} style={S.scheduleCard}>
                  <Text style={S.scheduleTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
              ))}
            </View>

            <View style={S.sectionHeaderRow}>
              <Text style={S.sectionTitle}>시간별 일정</Text>
              <View style={S.sectionDivider} />
            </View>

            <View style={S.timelineList}>
              {timelineItems.map((item, index) => {
                const timelineState = getTimelineState(item.timeRange)

                return (
                  <View
                    key={item.id}
                    style={[
                      S.timelineRow,
                      index === 0 && S.timelineRowFirst,
                      index === timelineItems.length - 1 && S.timelineRowLast,
                    ]}
                  >
                    <View
                      style={[S.timelineBox, timelineState === 'current' && S.timelineBoxCurrent]}
                    >
                      <View style={S.timelineIconSlot}>
                        {timelineState === 'past' ? (
                          <BeforeIcon width={8} height={8} />
                        ) : timelineState === 'current' ? (
                          <CurrentIcon width={8} height={8} />
                        ) : (
                          <AfterIcon width={8} height={8} />
                        )}
                        {index !== timelineItems.length - 1 ? (
                          <View style={S.timelineConnector} />
                        ) : null}
                      </View>

                      <Text
                        style={[
                          S.timelineTime,
                          timelineState === 'current'
                            ? S.timelineTimeCurrent
                            : S.timelineTimeInactive,
                        ]}
                      >
                        {item.timeRange}
                      </Text>

                      <Text
                        style={[
                          S.timelineTitle,
                          timelineState === 'past' ? S.timelineTitlePast : S.timelineTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}
      </Pressable>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    width: 358,
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#1C2430',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  dateLabel: {
    ...ts('date3'),
    fontSize: 13,
    lineHeight: 17,
    color: colors.text.text3,
  },
  heading: {
    ...ts('titleM'),
    color: colors.text.text1,
    marginTop: 12,
  },
  emptyCard: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    alignItems: 'center',
  },
  emptyEyebrow: {
    ...ts('body3'),
    color: colors.text.text4,
    letterSpacing: 1,
  },
  emptyTitle: {
    ...ts('titleS'),
    lineHeight: 24,
    color: colors.text.text1,
  },
  emptyDescription: {
    ...ts('body1'),
    color: colors.text.text3,
    marginTop: 8,
  },
  scheduleContent: {
    marginTop: 0,
  },
  scheduleList: {
    marginTop: 18,
  },
  scheduleCard: {
    width: 310,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    backgroundColor: colors.background.bg1,
    justifyContent: 'center',
    marginBottom: 10,
  },
  scheduleTitle: {
    ...ts('body1'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text1,
    paddingLeft: 12,
    paddingRight: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 24,
  },
  sectionTitle: {
    ...ts('label3'),
    color: colors.text.text1,
    marginRight: 12,
  },
  sectionDivider: {
    width: 234,
    height: 1,
    backgroundColor: colors.divider.divider1,
  },
  timelineList: {
    marginTop: 0,
  },
  timelineRow: {
    width: 310,
    height: 30,
    marginBottom: 8,
  },
  timelineRowFirst: {
    marginTop: 0,
  },
  timelineRowLast: {
    marginBottom: 0,
  },
  timelineBox: {
    width: 310,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  timelineIconSlot: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    top: 8,
    left: 3.5,
    width: 1,
    height: 30,
    backgroundColor: colors.divider.divider1,
  },
  timelineBoxCurrent: {
    backgroundColor: '#B04FFF0D',
  },
  timelineTime: {
    ...ts('body1'),
    fontSize: 15,
    lineHeight: 19,
    marginLeft: 16,
    marginRight: 16,
  },
  timelineTimeCurrent: {
    color: colors.primary.main,
  },
  timelineTimeInactive: {
    color: colors.text.text4,
  },
  timelineTitle: {
    ...ts('body1'),
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  timelineTitlePast: {
    color: colors.text.text4,
  },
  timelineTitleActive: {
    color: colors.text.text1,
  },
})
