import React from 'react'
import { Pressable, StyleSheet, Text, type LayoutChangeEvent } from 'react-native'

import type { TaskItemCardProps } from '@/components/calendar-items/types'
import { TASK_ITEM_SIZE } from '@/components/calendar-items/sizeTokens'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'

const WEEK_VERTICAL_WIDTH_THRESHOLD = 36
const WEEK_VERTICAL_RADIUS = 4

function TaskItemCard({
  id,
  title,
  done,
  isUntimed = false,
  density = 'day',
  layoutWidthHint,
  hideText = false,
  style,
  onPress,
  onToggle,
}: TaskItemCardProps) {
  // 부모가 준 실제 width를 읽어서 tiny(<=30) 여부를 판단한다.
  const [layoutWidth, setLayoutWidth] = React.useState(0)
  const resolvedWidth = layoutWidthHint ?? layoutWidth
  const d = TASK_ITEM_SIZE[density]
  // 좁은 셀에서는 아이콘/간격을 줄여 텍스트가 보이게 유지한다.
  const iconSize = resolvedWidth > 0 && resolvedWidth <= 54 ? 14 : resolvedWidth > 0 && resolvedWidth <= 60 ? 16 : 24
  const isTiny = resolvedWidth > 0 && resolvedWidth <= 30
  const isNarrow = resolvedWidth > 0 && resolvedWidth <= 60
  const dayLabel3 = ts('label3')
  const monthLabel4 = ts('label4')
  const weekLabel3 = ts('label3')
  const weekLabel4 = ts('label4Week')
  const isMonth = density === 'month'
  const isWeekTimed = density === 'week' && !isUntimed
  const isWeekTimedNarrow = isWeekTimed && resolvedWidth > 0 && resolvedWidth <= 61
  const isWeekVertical = isWeekTimed && resolvedWidth > 0 && resolvedWidth <= WEEK_VERTICAL_WIDTH_THRESHOLD
  const displayTitle = isWeekVertical ? title.replace(/\s+/g, '').split('').join('\n') : title
  const fixedHeight = isMonth ? d.minHeight : density === 'week' && isUntimed ? 26 : isUntimed ? 30 : undefined
  const titleLines = isWeekVertical
    ? undefined
    : isMonth || isUntimed
      ? 1
      : isWeekTimedNarrow || isNarrow
        ? 2
        : 1
  const minCardHeight = fixedHeight ?? d.minHeight
  const canToggle = !!onToggle
  const canPress = !!onPress
  const leadingPad = isTiny ? 0 : isUntimed ? 2 : isWeekTimed ? 1 : d.padX
  const trailingPad = isTiny ? 0 : isUntimed ? 0 : isWeekTimed ? 1 : d.padX
  const checkboxGap = isUntimed ? 1 : isWeekTimed ? 1 : 2

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    if (width !== layoutWidth) setLayoutWidth(width)
  }
  const handleTogglePress = (e: any) => {
    if (!onToggle) return
    e.stopPropagation()
    onToggle(id, !done)
  }

  const handleTitlePress = () => {
    if (onPress) {
      onPress()
      return
    }
    if (onToggle) {
      onToggle(id, !done)
    }
  }

  return (
    <Pressable
      disabled={!onPress}
      onLayout={layoutWidthHint == null ? handleLayout : undefined}
      onPress={onPress}
      style={[
        S.wrap,
        {
          // 세로 길이 기준:
          // month는 24 고정, untimed(상단)는 30, week timed(하단)는 최소 62
          minHeight: minCardHeight,
          height: fixedHeight,
          paddingLeft: leadingPad,
          paddingRight: trailingPad,
          paddingVertical: isWeekVertical || fixedHeight ? 0 : d.padY,
          borderRadius: isMonth || isUntimed ? 8 : isWeekVertical ? WEEK_VERTICAL_RADIUS : 10,
          flexDirection: isWeekVertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        style,
      ]}
    >
      {!hideText ? (
        <>
          <Pressable
            hitSlop={8}
            disabled={!canToggle}
            pointerEvents={canToggle ? 'auto' : 'none'}
            onPress={handleTogglePress}
            style={[
              S.checkbox,
              {
                width: iconSize,
                height: iconSize,
                marginRight: isWeekVertical ? 0 : checkboxGap,
                marginBottom: isWeekVertical ? 0 : 0,
              },
            ]}
          >
            {done ? (
              <CheckOn width={iconSize} height={iconSize} />
            ) : (
              <CheckOff width={iconSize} height={iconSize} />
            )}
          </Pressable>

          <Pressable
            disabled={!canPress && !canToggle}
            pointerEvents={canPress || canToggle ? 'auto' : 'none'}
            onPress={handleTitlePress}
            style={[S.titleWrap, isWeekVertical && S.titleWrapVertical]}
          >
            <Text
              style={[
                S.title,
                density === 'week'
                  ? isUntimed
                    ? {
                        fontSize: weekLabel3.fontSize,
                        lineHeight: weekLabel3.lineHeight,
                        fontWeight: weekLabel3.fontWeight,
                        textAlign: isWeekVertical ? 'center' : 'left',
                        flexShrink: 1,
                      }
                    : {
                        fontSize: weekLabel4.fontSize,
                        lineHeight: weekLabel4.lineHeight,
                        fontWeight: weekLabel4.fontWeight,
                        textAlign: isWeekVertical ? 'center' : 'left',
                        flexShrink: 1,
                      }
                  : density === 'day'
                  ? {
                      fontSize: dayLabel3.fontSize,
                      lineHeight: dayLabel3.lineHeight,
                      fontWeight: dayLabel3.fontWeight,
                      textAlign: isWeekVertical ? 'center' : 'left',
                      flexShrink: 1,
                    }
                  : density === 'month'
                  ? {
                      fontSize: monthLabel4.fontSize,
                      lineHeight: monthLabel4.lineHeight,
                      fontWeight: monthLabel4.fontWeight,
                      textAlign: isWeekVertical ? 'center' : 'left',
                      flexShrink: 1,
                    }
                  : {
                      fontSize: isTiny ? Math.max(9, d.font - 1) : d.font,
                      textAlign: isWeekVertical ? 'center' : 'left',
                      flexShrink: 1,
                    },
                done && S.titleDone,
                isWeekVertical && S.titleVertical,
              ]}
              numberOfLines={titleLines}
              ellipsizeMode="clip"
            >
              {displayTitle}
            </Text>
          </Pressable>
        </>
      ) : null}
    </Pressable>
  )
}

export default React.memo(TaskItemCard)

const S = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: colors.background.bg1,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider.divider1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: colors.text.text1,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleWrapVertical: {
    flex: 1,
    minWidth: undefined,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  titleVertical: {
    lineHeight: 16,
    includeFontPadding: true,
  },
  titleDone: {
    color: colors.text.text1,
    textDecorationLine: 'line-through',
  },
})
