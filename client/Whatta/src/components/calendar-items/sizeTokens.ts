import type { CalendarDensity } from '@/components/calendar-items/types'

// 일정
export const SCHEDULE_BASE_SIZE: Record<
  CalendarDensity,
  {
    minHeight: number
    padX: number
    padY: number
    title: number
    sub: number
    radius: number
    subGap: number
  }
> = {
  day: { minHeight: 60, padX: 12, padY: 12, title: 13, sub: 11, radius: 12, subGap: 4 },
  week: { minHeight: 30, padX: 2, padY: 8, title: 12, sub: 10, radius: 8, subGap: 4 },
  month: { minHeight: 24, padX: 4, padY: 8, title: 10, sub: 9, radius: 8, subGap: 0 },
}

// 기간 일정
export const RANGE_BAR_SIZE: Record<
  CalendarDensity,
  { height: number; font: number; chip: number; radius: number }
> = {
  day: { height: 30, font: 12, chip: 6, radius: 6 },
  week: { height: 30, font: 11, chip: 5, radius: 5 },
  month: { height: 24, font: 10, chip: 4, radius: 8 },
}

// 테스크
export const TASK_ITEM_SIZE: Record<
  CalendarDensity,
  { minHeight: number; padX: number; padY: number; font: number; box: number }
> = {
  day: { minHeight: 60, padX: 8, padY: 4, font: 12, box: 16 },
  week: { minHeight: 30, padX: 2, padY: 4, font: 12, box: 14 },
  month: { minHeight: 24, padX: 2, padY: 4, font: 10, box: 10 },
}

// 테스크 그룹
export const TASK_GROUP_SIZE: Record<CalendarDensity, { padX: number; padY: number; font: number; gap: number }> = {
  day: { padX: 12, padY: 8, font: 14, gap: 8 },
  week: { padX: 10, padY: 8, font: 13, gap: 6 },
  month: { padX: 8, padY: 8, font: 11, gap: 4 },
}
