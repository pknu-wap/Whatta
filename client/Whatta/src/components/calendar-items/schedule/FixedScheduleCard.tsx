import React from 'react'

import type { ScheduleCardProps } from '@/components/calendar-items/types'
import ScheduleBaseCard from '@/components/calendar-items/schedule/ScheduleBaseCard'
import colors from '@/styles/colors'

function normalizeColor(color: string): string {
  if (!color) return colors.brand.primary
  return color.startsWith('#') ? color : `#${color}`
}

function FixedScheduleCard({
  title,
  color,
  timeRangeText,
  isUntimed,
  density,
  layoutWidthHint,
  onPress,
}: ScheduleCardProps) {
  const mainColor = normalizeColor(color)

  return (
    <ScheduleBaseCard
      title={title}
      timeRangeText={timeRangeText}
      isUntimed={isUntimed}
      density={density}
      layoutWidthHint={layoutWidthHint}
      onPress={onPress}
      backgroundColor={mainColor}
      borderColor="#D9D9D9"
      borderWidth={1}
      titleColor={colors.background.bg1}
      subTextColor={colors.background.bg1}
    />
  )
}

export default React.memo(FixedScheduleCard)
