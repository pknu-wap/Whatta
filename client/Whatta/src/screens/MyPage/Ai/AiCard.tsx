import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
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
}

type Props = {
  item: AiCardDraftItem
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
  return `${year}년 ${month}월 ${day}일(${weekdays[date.getDay()]})`
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
  const start = item.startTime ?? due.time
  const end = item.isEvent ? item.endTime : null

  if (start && end) {
    return `${formatPeriodTime(start)} ~ ${formatPeriodTime(end)}`
  }

  return formatPeriodTime(start)
}

export default function AiCard({
  item,
  onChange,
  onSave,
  onEdit,
  onDelete,
  showDelete,
  showInlineSave = true,
}: Props) {
  const due = splitDueDateTime(item.dueDateTime)
  const displayDate = item.isEvent
    ? formatDisplayDateWithWeekday(item.startDate)
    : formatDisplayDateWithWeekday(item.startDate ?? due.date)
  const displayTime = formatDraftTime(item)
  const isLocked = item.saved || item.saving
  const hasTime = displayTime.trim().length > 0

  return (
    <View style={[S.cardBlock, isLocked && S.cardBlockLocked]}>
      <View style={[S.card, isLocked && S.cardLocked]}>
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
          {showDelete && !isLocked ? (
            <Pressable style={S.deleteButton} onPress={onDelete} hitSlop={8}>
              <XIcon width={14} height={14} color={colors.icon.default} />
            </Pressable>
          ) : (
            <View style={S.deletePlaceholder} />
          )}
        </View>
        <Text style={S.cardTitleText} numberOfLines={1}>
          {item.title || '제목'}
        </Text>
        <Text style={S.cardDateText}>{displayDate}</Text>
        {hasTime ? <Text style={S.cardTimeText}>{displayTime}</Text> : null}
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

const S = StyleSheet.create({
  cardBlock: {
    width: 250,
    alignSelf: 'flex-start',
  },
  card: {
    width: 250,
    minHeight: 152,
    backgroundColor: colors.background.bg1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary.main,
    padding: 20,
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
    marginLeft: 8,
  },
  deletePlaceholder: {
    width: 24,
    height: 24,
    marginLeft: 8,
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
    marginTop: 10,
    ...ts('body1'),
    color: colors.text.text1,
    fontSize: 14,
    fontWeight: 500,
  },
  cardTimeText: {
    ...ts('body1'),
    color: colors.text.text1,
    fontSize: 14,
    fontWeight: 500,
    marginTop: 5,
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
