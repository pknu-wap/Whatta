import React from 'react'

import type { ScheduleCardProps } from '@/components/calendar-items/types'
import ScheduleBaseCard from '@/components/calendar-items/schedule/ScheduleBaseCard'
import colors from '@/styles/colors'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

function RepeatScheduleCard({
  title,
  color,
  timeRangeText,
  isUntimed,
  density,
  layoutWidthHint,
  hideText,
  style,
  onPress,
}: ScheduleCardProps) {
  const mainColor = resolveScheduleColor(color)

  return (
    <ScheduleBaseCard
      title={title}
      timeRangeText={timeRangeText}
      isUntimed={isUntimed}
      density={density}
      layoutWidthHint={layoutWidthHint}
      hideText={hideText}
      onPress={onPress}
      style={style}
      backgroundColor={mainColor}
      borderColor="transparent"
      borderWidth={0}
      titleColor={colors.background.bg1}
      subTextColor={colors.background.bg1}
    />
  )
}

export default React.memo(RepeatScheduleCard)
