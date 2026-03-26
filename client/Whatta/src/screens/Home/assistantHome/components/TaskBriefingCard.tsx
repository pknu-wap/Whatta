import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import CheckOffIcon from '@/assets/icons/check_off.svg'
import CheckOnIcon from '@/assets/icons/check_on.svg'
import type { AssistantTaskBriefing } from '@/screens/Home/assistantHome/types'
import {
  BriefingCardFrame,
  BriefingEmptyState,
  BriefingListRow,
  BriefingSectionHeader,
  BriefingTimelineRow,
  getStartMinutes,
  getTimelineState,
} from '@/screens/Home/assistantHome/components/briefing/BriefingShared'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  briefing: AssistantTaskBriefing
  onPressTaskArea?: () => void
  onToggleTask?: (taskId: string, nextCompleted: boolean) => void
}

function TaskCheckbox({ checked }: { checked: boolean }) {
  return checked ? <CheckOnIcon width={24} height={24} /> : <CheckOffIcon width={24} height={24} />
}

function DueLabel({ label }: { label?: string }) {
  if (!label) return null
  const isToday = label.trim().toLowerCase() === 'd-day'

  return <Text style={[S.dueLabel, isToday && S.dueLabelToday]}>{label}</Text>
}

export default function TaskBriefingCard({
  briefing,
  onPressTaskArea,
  onToggleTask,
}: Props) {
  const timelineItems = React.useMemo(
    () =>
      [...briefing.timeline].sort(
        (left, right) => getStartMinutes(left.timeRange) - getStartMinutes(right.timeRange),
      ),
    [briefing.timeline],
  )
  const isEmpty = briefing.tasks.length === 0 && timelineItems.length === 0

  return (
    <BriefingCardFrame dateLabel={briefing.dateLabel} heading="오늘의 할 일" onPress={onPressTaskArea}>
      {isEmpty ? (
        <BriefingEmptyState title="오늘 할 일이 없어요." description="할 일을 만들어보세요!" />
      ) : (
        <View style={S.content}>
          <View style={S.list}>
            {briefing.tasks.map((item, index) => (
              <BriefingListRow
                key={item.id}
                title={item.title}
                bordered={false}
                leadingAccessory={(
                  <Pressable hitSlop={8} onPress={() => onToggleTask?.(item.id, !item.completed)}>
                    <TaskCheckbox checked={item.completed} />
                  </Pressable>
                )}
                trailingAccessory={item.dueLabel ? <DueLabel label={item.dueLabel} /> : undefined}
                isLast={index === briefing.tasks.length - 1}
                compact
              />
            ))}
          </View>

          {timelineItems.length > 0 ? (
            <>
              <BriefingSectionHeader marginTop={24} title="시간별 할 일" />

              <View>
                {timelineItems.map((item, index) => (
                  <BriefingTimelineRow
                    key={item.id}
                    title={item.title}
                    timeRange={item.timeRange}
                    state={getTimelineState(item.timeRange)}
                    showConnector={index !== timelineItems.length - 1}
                    beforeTitleAccessory={(
                      <Pressable hitSlop={8} onPress={() => onToggleTask?.(item.id, !item.completed)}>
                        <TaskCheckbox checked={item.completed} />
                      </Pressable>
                    )}
                    trailingAccessory={item.dueLabel ? <DueLabel label={item.dueLabel} /> : undefined}
                    timeTextWidth={86}
                    timeTextMarginRight={10}
                    accessoryGap={8}
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
  list: {
    marginBottom: 0,
  },
  dueLabel: {
    ...ts('body1'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text3,
    textAlign: 'right',
    width: '100%',
  },
  dueLabelToday: {
    color: '#FF5A54',
  },
})
