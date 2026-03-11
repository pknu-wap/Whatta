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
      backgroundColor={colors.background.bg1}
      borderColor={mainColor}
      borderWidth={1}
      titleColor={colors.text.text1}
      subTextColor={colors.text.text1}
    />
  )
}

export default React.memo(FixedScheduleCard)
