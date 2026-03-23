import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import AlarmIcon from '@/assets/icons/alarm.svg'
import MonthIcon from '@/assets/icons/month.svg'
import TimeIcon from '@/assets/icons/time.svg'
import XIcon from '@/assets/icons/x.svg'
import type { AiScheduleDraft } from '@/api/ai'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

export type AiCardDraftItem = AiScheduleDraft & {
  id: string
  saved: boolean
  saving: boolean
  colorHex?: string
  labelIds?: number[]
  memo?: string
  reminderNoti?: {
    day: number
    hour: number
    minute: number
  } | null
}

type Props = {
  item: AiCardDraftItem
  labelTitles?: string[]
  onChange: (patch: Partial<AiCardDraftItem>) => void
  onSave: () => void
  onEdit: () => void
  onDelete: () => void
  showDelete: boolean
  showInlineSave?: boolean
}

function splitDueDateTime(value: string | null | undefined) {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date: date ?? '', time: (time ?? '').slice(0, 5) }
}

function formatDisplayDateWithWeekday(value: string | null | undefined) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value

  const date = new Date(year, month - 1, day)
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `${year}년 ${month}월 ${day}일 (${weekdays[date.getDay()]})`
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${year}년 ${month}월 ${day}일`
}

function formatEventDisplayDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  if (!startDate) return ''
  if (!endDate || endDate === startDate) {
    return formatDisplayDateWithWeekday(startDate)
  }
  return `${formatDisplayDateWithWeekday(startDate)} ~ ${formatDisplayDateWithWeekday(endDate)}`
}

function formatPeriodTime(value: string | null | undefined) {
  if (!value) return ''
  const [rawHour, rawMinute = '00'] = value.split(':')
  const hour = Number(rawHour)
  const minute = Number(rawMinute)

  if (Number.isNaN(hour) || Number.isNaN(minute)) return value

  const period = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12

  return minute === 0
    ? `${period} ${hour12}시`
    : `${period} ${hour12}시 ${minute}분`
}

function formatDraftTime(item: AiCardDraftItem) {
  const due = splitDueDateTime(item.dueDateTime)
  const start = item.isEvent ? item.startTime : (due.time || item.startTime)
  const end = item.isEvent ? item.endTime : null

  if (start && end) {
    return `${formatPeriodTime(start)} ~ ${formatPeriodTime(end)}`
  }

  return formatPeriodTime(start)
}

function parseDateString(value: string | null | undefined) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDueCountdown(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
) {
  const start = parseDateString(startDate)
  const due = parseDateString(dueDate)
  if (!start || !due) return ''
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffMs = dueOnly.getTime() - startOnly.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '(마감까지 D-Day)'
  if (diffDays > 0) return `(마감까지 D-${diffDays})`
  return `(마감까지 D+${Math.abs(diffDays)})`
}

export default function AiCard({
  item,
  labelTitles = [],
  onChange,
  onSave,
  onEdit,
  onDelete,
  showDelete,
  showInlineSave = true,
}: Props) {
  const cardBorderColor = item.isEvent ? (item.colorHex ?? colors.primary.main) : colors.primary.main
  const due = splitDueDateTime(item.dueDateTime)
  const taskDateSource = due.date || item.startDate
  const dueCountdown = !item.isEvent
    ? formatDueCountdown(item.startDate, due.date)
    : ''
  const rawDisplayDate = item.isEvent
    ? formatEventDisplayDateRange(item.startDate, item.endDate)
    : formatDisplayDateWithWeekday(taskDateSource)
  const hasDate = rawDisplayDate.trim().length > 0
  const displayDate = hasDate ? rawDisplayDate : '!! 날짜 지정안됨'
  const displayTime = formatDraftTime(item)
  const isLocked = item.saved || item.saving
  const hasTime = displayTime.trim().length > 0
  const hasRepeat = !!item.repeat?.unit && !!item.repeat?.interval
  const hasReminder = !!item.reminderNoti
  const summaryItems = [
    hasRepeat ? { kind: 'repeat' as const, text: formatRepeatSummary(item.repeat) } : null,
    hasReminder ? { kind: 'reminder' as const, text: formatReminderSummary(item.reminderNoti) } : null,
    ...labelTitles.map((title) => ({ kind: 'label' as const, text: `#${title}` })),
  ].filter(
    (
      value,
    ): value is { kind: 'repeat' | 'reminder' | 'label'; text: string } => !!value,
  )

  return (
    <View style={[S.cardBlock, isLocked && S.cardBlockLocked]}>
      <View
        style={[
          S.card,
          { borderColor: cardBorderColor },
          isLocked && S.cardLocked,
        ]}
      >
        <View style={S.cardTopRow}>
          <View style={S.segment}>
            <Pressable
              style={S.segmentButton}
              onPress={() => onChange({ isEvent: true })}
              disabled={isLocked}
            >
              <View style={[S.segmentButtonInner, item.isEvent && S.segmentButtonInnerActive]}>
                <Text style={[S.segmentText, item.isEvent && S.segmentTextActive]}>일정</Text>
              </View>
            </Pressable>
            <Pressable
              style={S.segmentButton}
              onPress={() => onChange({ isEvent: false })}
              disabled={isLocked}
            >
              <View style={[S.segmentButtonInner, !item.isEvent && S.segmentButtonInnerActive]}>
                <Text style={[S.segmentText, !item.isEvent && S.segmentTextActive]}>할 일</Text>
              </View>
            </Pressable>
          </View>
          <View style={S.topRightActions}>
            <View style={S.alarmBadge}>
              <AlarmIcon
                width={24}
                height={24}
                color={hasReminder ? colors.primary.main : colors.icon.default}
              />
            </View>
            {showDelete ? (
              !isLocked ? (
                <Pressable style={S.deleteButton} onPress={onDelete} hitSlop={8}>
                  <XIcon width={14} height={14} color={colors.icon.default} />
                </Pressable>
              ) : (
                <View style={S.deletePlaceholder} />
              )
            ) : null}
          </View>
        </View>
        <Text style={S.cardTitleText} numberOfLines={1}>
          {item.title || '제목'}
        </Text>
        <View style={S.infoRow}>
          <MonthIcon
            width={24}
            height={24}
            color={hasDate ? colors.icon.default : colors.icon.trash}
          />
          <View style={S.dateTextRow}>
            {dueCountdown ? <Text style={S.cardDueCountdownText}>{dueCountdown}</Text> : null}
            <Text style={[S.cardDateText, !hasDate && S.cardDateTextMissing]}>{displayDate}</Text>
          </View>
        </View>
        {hasTime ? (
          <View style={[S.infoRow, S.timeInfoRow]}>
            <TimeIcon width={24} height={24} color={colors.icon.default} />
            <Text style={S.cardTimeText}>{displayTime}</Text>
          </View>
        ) : null}
        {summaryItems.length > 0 ? (
          <View style={S.metaWrap}>
            {summaryItems.map((meta, index) => (
              <View
                key={`${meta.kind}-${meta.text}-${index}`}
                style={[
                  S.metaChip,
                  meta.kind === 'label' ? S.metaChipLabel : S.metaChipOutlined,
                ]}
              >
                <Text style={S.metaChipText} numberOfLines={1}>
                  {meta.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View
          style={[
            S.cardActionRow,
            !hasTime && S.cardActionRowCompact,
            !showInlineSave && S.cardActionRowSingle,
          ]}
        >
          <Pressable onPress={onEdit} hitSlop={8} disabled={isLocked}>
            <Text style={S.cardEditText}>수정하기</Text>
          </Pressable>
          {showInlineSave ? (
            <Pressable
              style={[S.saveButtonInline, item.saved && S.saveButtonInlineDone]}
              onPress={onSave}
              disabled={item.saving || item.saved}
            >
              {item.saving ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <Text style={S.saveButtonInlineText}>{item.saved ? '등록완료' : '등록하기'}</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function formatRepeatSummary(repeat: AiCardDraftItem['repeat']) {
  if (!repeat?.unit || !repeat.interval) return ''
  const unitLabel =
    repeat.unit === 'WEEK' ? '주' : repeat.unit === 'MONTH' ? '월' : '일'
  if (repeat.interval === 1) {
    return repeat.unit === 'WEEK'
      ? '매주 반복'
      : repeat.unit === 'MONTH'
        ? '매월 반복'
        : '매일 반복'
  }
  return `${repeat.interval}${unitLabel}마다 반복`
}

function formatReminderSummary(reminder: AiCardDraftItem['reminderNoti']) {
  if (!reminder) return ''
  const dayText = reminder.day === 1 ? '전날 ' : ''
  const hourText = reminder.hour > 0 ? `${reminder.hour}시간 ` : ''
  const minuteText = reminder.minute > 0 ? `${reminder.minute}분 전` : '전'
  return `알림 ${`${dayText}${hourText}${minuteText}`.trim()}`
}

const S = StyleSheet.create({
  cardBlock: {
    width: 334,
    alignSelf: 'flex-start',
  },
  card: {
    width: 334,
    minHeight: 228,
    backgroundColor: colors.background.bg1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    padding: 16,
    alignItems: 'flex-start',
    gap: 0,
    shadowColor: '#8D99A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  cardBlockLocked: {
    opacity: 0.56,
  },
  cardLocked: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segment: {
    flexDirection: 'row',
    gap: 10,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  segmentButton: {
    width: 60,
    height: 31,
    borderRadius: 49,
    backgroundColor: colors.background.bg2,
    overflow: 'hidden',
  },
  segmentButtonInner: {
    flex: 1,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg2,
  },
  segmentButtonInnerActive: {
    backgroundColor: colors.icon.selected,
  },
  segmentText: {
    ...ts('label4'),
    color: colors.text.text1,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.text.text1w,
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  deletePlaceholder: {
    width: 24,
    height: 24,
    marginLeft: 4,
  },
  cardTitleText: {
    marginTop: 15,
    ...ts('titleM'),
    color: colors.text.text1,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
  },
  cardDateText: {
    ...ts('body1'),
    color: colors.text.text1,
    fontWeight: '400',
    lineHeight: 16,
    fontSize: 14
  },
  cardDateTextMissing: {
    color: colors.icon.trash,
  },
  dateTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
  },
  cardDueCountdownText: {
    ...ts('body1'),
    color: colors.primary.main,
    fontWeight: '400',
    lineHeight: 16,
    fontSize: 14,
  },
  cardTimeText: {
    ...ts('body1'),
    color: colors.text.text1,
    fontWeight: '400',
    lineHeight: 16,
    fontSize: 14
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    minHeight: 24,
    overflow: 'visible',
  },
  timeInfoRow: {
    marginTop: 2,
  },
  metaWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    maxWidth: '100%',
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipOutlined: {
    borderWidth: 1,
    borderColor: colors.divider.divider1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  metaChipLabel: {
    backgroundColor: colors.background.bg3,
  },
  metaChipText: {
    ...ts('label4'),
    color: colors.text.text3,
    fontSize: 13,
  },
  cardActionRow: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActionRowCompact: {
    marginTop: 14,
  },
  cardActionRowSingle: {
    justifyContent: 'flex-start',
  },
  cardEditText: {
    ...ts('label4'),
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: 700,
  },
  saveButtonInline: {
    minWidth: 78,
    height: 32,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonInlineDone: {
    backgroundColor: '#F6EEFF',
    borderColor: colors.primary.main,
  },
  saveButtonInlineText: {
    ...ts('label4'),
    color: colors.primary.main,
    fontWeight: '700',
  },
})
