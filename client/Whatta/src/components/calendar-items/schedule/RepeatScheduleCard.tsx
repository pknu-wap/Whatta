import React from 'react'

import type { ScheduleCardProps } from '@/components/calendar-items/types'
import ScheduleBaseCard from '@/components/calendar-items/schedule/ScheduleBaseCard'
import colors from '@/styles/colors'

function normalizeColor(color: string): string {
  if (!color) return colors.brand.primary
  return color.startsWith('#') ? color : `#${color}`
}

function RepeatScheduleCard({
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
      backgroundColor={colors.background.bg1}
      borderColor={mainColor}
      borderWidth={1}
      titleColor={colors.text.text1}
      subTextColor={colors.text.text1}
    />
  )
}

export default React.memo(RepeatScheduleCard)
