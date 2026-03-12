import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import type { CalendarDensity, CalendarItemPressHandler } from '@/components/calendar-items/types'
import { SCHEDULE_BASE_SIZE } from '@/components/calendar-items/sizeTokens'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'

const WEEK_VERTICAL_WIDTH_THRESHOLD = 36
const WEEK_VERTICAL_RADIUS = 4

type ScheduleBaseCardProps = {
  title: string
  timeRangeText?: string
  isUntimed?: boolean
  density?: CalendarDensity
  layoutWidthHint?: number
  hideText?: boolean
  onPress?: CalendarItemPressHandler
  backgroundColor: string
  borderColor?: string
  borderWidth?: number
  titleColor?: string
  subTextColor?: string
  style?: StyleProp<ViewStyle>
}

function ScheduleBaseCard({
  title,
  timeRangeText,
  isUntimed = false,
  density = 'day',
  layoutWidthHint,
  hideText = false,
  onPress,
  backgroundColor,
  borderColor,
  borderWidth,
  titleColor = colors.text.text1,
  subTextColor = colors.text.text1,
  style,
}: ScheduleBaseCardProps) {

  // 부모가 width를 정하고, 여기서는 onLayout으로 폭을 읽어
  // week 하단 겹침(<=30) 타이포 분기를 적용한다.
  const [layoutWidth, setLayoutWidth] = React.useState<number>(0)
  const densityStyle = SCHEDULE_BASE_SIZE[density]
  const untimed = isUntimed
  const normalizedTimeRangeText = timeRangeText?.replace(/\s+/g, '')
  const resolvedWidth = layoutWidthHint ?? layoutWidth
  const isWeekBottomTiny = density === 'week' && !untimed && resolvedWidth > 0 && resolvedWidth <= 30
  const isWeekBottomNarrow = density === 'week' && !untimed && resolvedWidth > 0 && resolvedWidth <= 61
  const isWeekVertical = density === 'week' && !untimed && resolvedWidth > 0 && resolvedWidth <= WEEK_VERTICAL_WIDTH_THRESHOLD
  const displayTitle = isWeekVertical ? title.replace(/\s+/g, '').split('').join('\n') : title
  const displayTimeRangeText =
    density === 'week' && !untimed && normalizedTimeRangeText?.includes('~')
      ? (() => {
          const [start, end] = normalizedTimeRangeText.split('~')
          return start && end ? `${start}~\n${end}` : normalizedTimeRangeText
        })()
      : normalizedTimeRangeText
  const monthLabel4 = ts('label4')
  const dayLabel3 = ts('label3')
  const weekLabel3 = ts('label3')
  const weekLabel4 = ts('label4Week')
  const weekLabel4Length = ts('label4Length')
  const dayBody3 = ts('body3')
  const weekBody3 = ts('body3')

  const showSubText =
    density !== 'month' &&
    !untimed &&
    !!normalizedTimeRangeText &&
    !isWeekBottomTiny &&
    !isWeekVertical &&
    !hideText

  const fixedHeight = density === 'month' ? densityStyle.minHeight : density === 'week' && untimed ? 26 : untimed ? 30 : undefined
  const minCardHeight = fixedHeight ?? densityStyle.minHeight
  const isWeekTimed = density === 'week' && !untimed
  const effectivePadX =
    density === 'month'
      ? densityStyle.padX
      : density === 'week' && untimed
      ? 3
      : untimed
      ? 12
      : densityStyle.padX
  const effectivePadY = fixedHeight ? 0 : densityStyle.padY

  const titleTokenStyle =
    density === 'day'
      ? dayLabel3
      : density === 'month'
      ? monthLabel4
      : density === 'week'
        ? untimed
          ? weekLabel3
          : isWeekBottomTiny
            ? weekLabel4Length
            : weekLabel4
        : null

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    if (width !== layoutWidth) setLayoutWidth(width)
  }

  return (
    <Pressable
      disabled={!onPress}
      onLayout={density === 'week' && !untimed && layoutWidthHint == null ? handleLayout : undefined}
      onPress={onPress}
      style={[
        S.base,
        {
          // 세로 길이(height) 기준:
          // 1) timed는 density 기본 최소 높이를 사용
          // 2) month는 24 고정, untimed(상단바)는 30 고정
          minHeight: minCardHeight,
          height: fixedHeight,
          paddingHorizontal: effectivePadX,
          paddingVertical: effectivePadY,
          borderRadius: untimed ? 8 : isWeekVertical ? WEEK_VERTICAL_RADIUS : densityStyle.radius,
          justifyContent: isWeekTimed ? 'flex-start' : 'center',
          backgroundColor,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? (borderWidth ?? StyleSheet.hairlineWidth) : 0,
        },
        style,
      ]}
    >
      {!hideText ? (
        <Text
          style={[
            S.title,
            titleTokenStyle
              ? {
                  fontSize: titleTokenStyle.fontSize,
                  lineHeight: titleTokenStyle.lineHeight,
                  fontWeight: titleTokenStyle.fontWeight,
                }
              : {
                  fontSize: densityStyle.title,
                },
            {
              color: titleColor,
              textAlign: isWeekVertical ? 'center' : 'left',
              includeFontPadding: false,
              textAlignVertical: 'center',
            },
          ]}
          numberOfLines={isWeekVertical ? 6 : isWeekTimed && !isWeekBottomTiny ? 2 : 1}
          ellipsizeMode={isWeekTimed ? 'tail' : 'clip'}
        >
          {displayTitle}
        </Text>
      ) : null}

      {showSubText ? (
        <Text
          style={[
            S.subText,
            density === 'day'
              ? {
                  fontSize: dayBody3.fontSize,
                  lineHeight: dayBody3.lineHeight,
                  fontWeight: dayBody3.fontWeight,
                  color: subTextColor,
                  marginTop: densityStyle.subGap,
                }
              : density === 'week'
              ? {
                  fontSize: isWeekBottomNarrow ? 11 : Math.max(12, Number(weekBody3.fontSize)),
                  lineHeight: isWeekBottomNarrow ? 13 : Math.max(15, Number(weekBody3.lineHeight)),
                  fontWeight: weekBody3.fontWeight,
                  color: subTextColor,
                  marginTop: isWeekBottomNarrow ? 3 : densityStyle.subGap,
                  includeFontPadding: false,
                }
              : {
                  fontSize: densityStyle.sub,
                  color: subTextColor,
                  marginTop: densityStyle.subGap,
                },
          ]}
          numberOfLines={density === 'week' && !untimed ? 2 : isWeekBottomNarrow ? 2 : 1}
          ellipsizeMode="clip"
        >
          {displayTimeRangeText}
        </Text>
      ) : null}
    </Pressable>
  )
}

export default React.memo(ScheduleBaseCard)

const S = StyleSheet.create({
  base: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontWeight: '700',
  },
  subText: {
    fontWeight: '500',
    flexShrink: 1,
  },
})
