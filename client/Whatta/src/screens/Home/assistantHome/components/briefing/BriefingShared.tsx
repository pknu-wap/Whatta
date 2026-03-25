import React, { type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import BeforeIcon from '@/assets/icons/before.svg'
import CurrentIcon from '@/assets/icons/current.svg'
import AfterIcon from '@/assets/icons/after.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

export type TimelineState = 'past' | 'current' | 'upcoming'

const CARD_WIDTH = 358
const ROW_WIDTH = 310
const ROW_HEIGHT = 30
const TRAILING_WIDTH = 56

type BriefingFrameProps = {
  dateLabel: string
  heading: string
  onPress?: () => void
  children: ReactNode
}

type BriefingEmptyStateProps = {
  title: string
  description: string
}

type BriefingListRowProps = {
  title: string
  bordered?: boolean
  leadingAccessory?: ReactNode
  trailingAccessory?: ReactNode
  isLast?: boolean
  compact?: boolean
}

type BriefingTimelineRowProps = {
  title: string
  timeRange: string
  state: TimelineState
  showConnector: boolean
  beforeTitleAccessory?: ReactNode
  trailingAccessory?: ReactNode
  timeTextWidth?: number
  timeTextMarginRight?: number
  accessoryGap?: number
}

type BriefingSectionHeaderProps = {
  marginTop?: number
  title?: string
}

function parseTimeValue(value: string) {
  const [hourText = '0', minuteText = '0'] = value.trim().split(':')
  return Number(hourText) * 60 + Number(minuteText)
}

export function getTimelineState(timeRange: string): TimelineState {
  const [startText = '00:00', endText = '00:00'] = timeRange.split('~').map((value) => value.trim())
  const startMinutes = parseTimeValue(startText)
  const endMinutes = parseTimeValue(endText)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (startMinutes === endMinutes) {
    if (nowMinutes === startMinutes) return 'current'
    if (nowMinutes < startMinutes) return 'upcoming'
    return 'past'
  }

  if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return 'current'
  if (nowMinutes < startMinutes) return 'upcoming'
  return 'past'
}

export function getStartMinutes(timeRange: string) {
  const [startText = '00:00'] = timeRange.split('~')
  return parseTimeValue(startText)
}

export function BriefingCardFrame({
  dateLabel,
  heading,
  onPress,
  children,
}: BriefingFrameProps) {
  return (
    <View style={S.card}>
      <Text style={S.dateLabel}>{dateLabel}</Text>
      <Pressable style={S.content} onPress={onPress} disabled={!onPress}>
        <Text style={S.heading}>{heading}</Text>
        {children}
      </Pressable>
    </View>
  )
}

export function BriefingEmptyState({ title, description }: BriefingEmptyStateProps) {
  return (
    <View style={S.emptyCard}>
      <Text style={S.emptyTitle}>{title}</Text>
      <Text style={S.emptyDescription}>{description}</Text>
    </View>
  )
}

export function BriefingListRow({
  title,
  bordered = true,
  leadingAccessory,
  trailingAccessory,
  isLast = false,
  compact = false,
}: BriefingListRowProps) {
  return (
    <View
      style={[
        S.listRow,
        !bordered && S.listRowBorderless,
        compact && S.listRowCompact,
        isLast && S.listRowLast,
        Boolean(trailingAccessory) ? S.rowWithTrailing : null,
      ]}
    >
      {leadingAccessory ? <View style={S.listLeading}>{leadingAccessory}</View> : null}
      <Text style={S.listTitle} numberOfLines={1}>
        {title}
      </Text>
      {trailingAccessory ? <View style={S.listTrailingAbsolute}>{trailingAccessory}</View> : null}
    </View>
  )
}

export function BriefingSectionHeader({
  marginTop,
  title = '시간별 일정',
}: BriefingSectionHeaderProps) {
  return (
    <View style={[S.sectionHeaderRow, marginTop != null ? { marginTop } : null]}>
      <Text style={S.sectionTitle}>{title}</Text>
      <View style={S.sectionDivider} />
    </View>
  )
}

export function BriefingTimelineRow({
  title,
  timeRange,
  state,
  showConnector,
  beforeTitleAccessory,
  trailingAccessory,
  timeTextWidth,
  timeTextMarginRight,
  accessoryGap = 12,
}: BriefingTimelineRowProps) {
  return (
    <View style={S.timelineRow}>
      <View
        style={[
          S.timelineBox,
          state === 'current' && S.timelineBoxCurrent,
          Boolean(trailingAccessory) ? S.rowWithTrailing : null,
        ]}
      >
        <View style={S.timelineIconSlot}>
          {state === 'past' ? (
            <BeforeIcon width={8} height={8} />
          ) : state === 'current' ? (
            <CurrentIcon width={8} height={8} />
          ) : (
            <AfterIcon width={8} height={8} />
          )}
          {showConnector ? <View style={S.timelineConnector} /> : null}
        </View>

        <Text
          style={[
            S.timelineTime,
            state === 'current' ? S.timelineTimeCurrent : S.timelineTimeInactive,
            timeTextWidth != null ? { width: timeTextWidth } : null,
            timeTextMarginRight != null ? { marginRight: timeTextMarginRight } : null,
          ]}
        >
          {timeRange}
        </Text>

        {beforeTitleAccessory ? (
          <View style={[S.timelineAccessory, { marginRight: accessoryGap }]}>
            {beforeTitleAccessory}
          </View>
        ) : null}

        <Text
          style={[S.timelineTitle, state === 'past' ? S.timelineTitlePast : S.timelineTitleActive]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {trailingAccessory ? (
          <View style={S.timelineTrailingAbsolute}>{trailingAccessory}</View>
        ) : null}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
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
  content: {
    marginTop: 0,
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
  listRow: {
    width: ROW_WIDTH,
    height: ROW_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    backgroundColor: colors.background.bg1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 10,
  },
  listRowBorderless: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 0,
    paddingRight: 0,
  },
  listRowCompact: {
    marginBottom: 4,
  },
  listRowLast: {
    marginBottom: 0,
  },
  rowWithTrailing: {
    paddingRight: 60,
  },
  listLeading: {
    marginRight: 12,
  },
  listTitle: {
    ...ts('body1'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text1,
    flex: 1,
  },
  listTrailingAbsolute: {
    position: 'absolute',
    right: 0,
    width: TRAILING_WIDTH,
    alignItems: 'flex-end',
  },
  sectionHeaderRow: {
    width: ROW_WIDTH,
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
    flex: 1,
    height: 1,
    backgroundColor: colors.divider.divider1,
  },
  timelineRow: {
    width: ROW_WIDTH,
    height: ROW_HEIGHT,
    marginBottom: 8,
  },
  timelineBox: {
    width: ROW_WIDTH,
    height: ROW_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 12,
  },
  timelineBoxCurrent: {
    backgroundColor: '#B04FFF0D',
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
  timelineTime: {
    ...ts('body1'),
    fontSize: 15,
    lineHeight: 19,
    marginLeft: 16,
    marginRight: 16,
  },
  timelineTimeCurrent: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '400',
    letterSpacing: 0,
    color: colors.primary.main,
  },
  timelineTimeInactive: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '400',
    letterSpacing: 0,
    color: colors.text.text4,
  },
  timelineAccessory: {
    marginRight: 12,
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
  timelineTrailingAbsolute: {
    position: 'absolute',
    right: 0,
    width: TRAILING_WIDTH,
    alignItems: 'flex-end',
  },
})
