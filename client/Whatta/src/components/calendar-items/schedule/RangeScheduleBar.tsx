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
  radiusOverride,
  capWidthOverride,
  style,
  onPress,
}: RangeScheduleBarProps) {
  const mainColor = resolveScheduleColor(color)
  const d = RANGE_BAR_SIZE[density]
  const untimed = isUntimed
  // 세그먼트 규칙:
  // 시작만: 왼쪽 캡, 중간: 캡 없음, 끝만: 오른쪽 캡, 하루짜리(시작+끝): 양쪽 캡
  const showStartCap = !!isStart
  const showEndCap = !!isEnd
  const fixedHeight = density === 'month' ? d.height : density === 'week' && untimed ? 26 : untimed ? 30 : d.height
  const baseRadius = radiusOverride ?? (density === 'month' ? d.radius : untimed ? 8 : d.radius)
  const capWidth = capWidthOverride ?? Math.max(d.chip, baseRadius)
  const hasAnyCap = showStartCap || showEndCap
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
          backgroundColor: hasAnyCap ? mainColor : colors.background.bg1,
          borderRadius: baseRadius,
          borderTopLeftRadius: showStartCap ? baseRadius : 0,
          borderBottomLeftRadius: showStartCap ? baseRadius : 0,
          borderTopRightRadius: showEndCap ? baseRadius : 0,
          borderBottomRightRadius: showEndCap ? baseRadius : 0,
          borderLeftWidth: showStartCap ? 1 : 0,
          borderRightWidth: showEndCap ? 1 : 0,
        },
        style,
      ]}
    >
      <View
        style={[S.chipLeft, { width: showStartCap ? capWidth : 0, backgroundColor: mainColor }]}
      />

      <View style={[S.centerContent, hasAnyCap ? { backgroundColor: colors.background.bg1 } : null]}>
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
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {normalizedTimeRangeText}
          </Text>
        ) : null}
      </View>

      <View
        style={[S.chipRight, { width: showEndCap ? capWidth : 0, backgroundColor: mainColor }]}
      />
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
    includeFontPadding: false,
  },
})
