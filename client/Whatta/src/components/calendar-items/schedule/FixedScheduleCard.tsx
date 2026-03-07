import React from 'react'

import type { ScheduleCardProps } from '@/components/calendar-items/types'
import ScheduleBaseCard from '@/components/calendar-items/schedule/ScheduleBaseCard'
import colors from '@/styles/colors'
import { resolveScheduleColor } from '@/styles/scheduleColorSets'

function FixedScheduleCard({
  title,
  color,
  timeRangeText,
  isUntimed,
  density,
  layoutWidthHint,
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
      onPress={onPress}
      style={style}
      backgroundColor={mainColor}
      borderColor="#D9D9D9"
      borderWidth={1}
      titleColor={colors.background.bg1}
      subTextColor={colors.background.bg1}
    />
  )
}

export default React.memo(FixedScheduleCard)
