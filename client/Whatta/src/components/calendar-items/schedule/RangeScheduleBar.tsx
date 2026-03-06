import React from 'react'

import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { RangeScheduleBarProps } from '@/components/calendar-items/types'
import { RANGE_BAR_SIZE } from '@/components/calendar-items/sizeTokens'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

function RangeScheduleBar({
  title,
  color,
  timeRangeText,
  isUntimed = false,
  density = 'day',
  isStart,
  isEnd,
  onPress,
}: RangeScheduleBarProps) {
  const mainColor = resolveScheduleColor(color)
  const d = RANGE_BAR_SIZE[density]
  const untimed = isUntimed
  const fixedHeight = density === 'month' ? d.height : untimed ? 30 : d.height
  const baseRadius = density === 'month' ? d.radius : untimed ? 8 : d.radius
  const normalizedTimeRangeText = timeRangeText?.replace(/\s+/g, '')
  const dayLabel3 = ts('label3')
  const monthLabel4 = ts('label4')
  const weekLabel3 = ts('label3')
  const weekLabel4 = ts('label4Week')
  const dayBody3 = ts('body3')
  const weekBody3 = ts('body3')

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        S.wrap,
        {
          // 기간 일정 세로 길이:
          // month는 항상 24 고정, untimed(상단바)는 30
          minHeight: fixedHeight,
          height: fixedHeight,
          borderColor: mainColor,
          borderRadius: baseRadius,
          borderTopLeftRadius: isStart ? baseRadius : 0,
          borderBottomLeftRadius: isStart ? baseRadius : 0,
          borderTopRightRadius: isEnd ? baseRadius : 0,
          borderBottomRightRadius: isEnd ? baseRadius : 0,
        },
      ]}
    >
      <View style={[S.chipLeft, { width: d.chip, backgroundColor: mainColor }]} />

      <View style={S.centerContent}>
        <Text
          style={[
            S.title,
            density === 'day'
              ? {
                  fontSize: dayLabel3.fontSize,
                  lineHeight: dayLabel3.lineHeight,
                  fontWeight: dayLabel3.fontWeight,
                }
              : density === 'week'
              ? untimed
                ? {
                    fontSize: weekLabel3.fontSize,
                    lineHeight: weekLabel3.lineHeight,
                    fontWeight: weekLabel3.fontWeight,
                  }
                : {
                    fontSize: weekLabel4.fontSize,
                    lineHeight: weekLabel4.lineHeight,
                    fontWeight: weekLabel4.fontWeight,
                  }
              : density === 'month'
              ? {
                  fontSize: monthLabel4.fontSize,
                  lineHeight: monthLabel4.lineHeight,
                  fontWeight: monthLabel4.fontWeight,
                }
              : { fontSize: d.font },
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {title}
        </Text>
        {!untimed && normalizedTimeRangeText ? (
          <Text
            style={[
            S.sub,
              density === 'day'
                ? {
                    fontSize: dayBody3.fontSize,
                    lineHeight: dayBody3.lineHeight,
                    fontWeight: dayBody3.fontWeight,
                  }
                : density === 'week'
                ? {
                    fontSize: weekBody3.fontSize,
                    lineHeight: weekBody3.lineHeight,
                    fontWeight: weekBody3.fontWeight,
                  }
                : { fontSize: Math.max(9, d.font - 1) },
            ]}
          >
            {normalizedTimeRangeText}
          </Text>
        ) : null}
      </View>

      <View style={[S.chipRight, { width: d.chip, backgroundColor: mainColor }]} />
    </Pressable>
  )
}

export default React.memo(RangeScheduleBar)

const S = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background.bg1,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  chipLeft: {
    height: '100%',
  },
  chipRight: {
    height: '100%',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  title: {
    color: colors.text.text1,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sub: {
    color: colors.text.text1,
    marginTop: 1,
    fontWeight: '500',
  },
})
