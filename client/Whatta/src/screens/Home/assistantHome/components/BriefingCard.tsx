import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { AssistantBriefing } from '@/screens/Home/assistantHome/types'
import {
  BriefingCardFrame,
  BriefingEmptyState,
  BriefingListRow,
  BriefingSectionHeader,
  BriefingTimelineRow,
  getStartMinutes,
  getTimelineState,
} from '@/screens/Home/assistantHome/components/briefing/BriefingShared'

type Props = {
  briefing: AssistantBriefing
  onPressScheduleArea?: () => void
}

export default function BriefingCard({ briefing, onPressScheduleArea }: Props) {
  const timelineItems = React.useMemo(
    () =>
      [...briefing.timeline].sort(
        (left, right) => getStartMinutes(left.timeRange) - getStartMinutes(right.timeRange),
      ),
    [briefing.timeline],
  )
  const isEmpty = briefing.schedules.length === 0 && timelineItems.length === 0

  return (
    <BriefingCardFrame
      dateLabel={briefing.dateLabel}
      heading="오늘의 일정"
      onPress={onPressScheduleArea}
    >
      {isEmpty ? (
        <BriefingEmptyState title="오늘 일정이 없어요." description="일정을 만들어보세요!" />
      ) : (
        <View style={S.content}>
          <View>
            {briefing.schedules.map((item, index) => (
              <BriefingListRow
                key={item.id}
                title={item.title}
                isLast={index === briefing.schedules.length - 1}
              />
            ))}
          </View>

          {timelineItems.length > 0 ? (
            <>
              <BriefingSectionHeader />

              <View>
                {timelineItems.map((item, index) => (
                  <BriefingTimelineRow
                    key={item.id}
                    title={item.title}
                    timeRange={item.timeRange}
                    state={getTimelineState(item.timeRange)}
                    showConnector={index !== timelineItems.length - 1}
                    timeTextWidth={86}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      )}
    </BriefingCardFrame>
  )
}

const S = StyleSheet.create({
  content: {
    marginTop: 18,
  },
})
