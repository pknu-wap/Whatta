import { HOLIDAYS, LUNAR_HOLIDAYS_OFFSETS } from './constants'

export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const day = date.getDate()
  let holidayName: string | null = null

  // 1. 양력 공휴일
  const solarKey = `${month}-${day}`
  if (HOLIDAYS[solarKey]) {
    holidayName = HOLIDAYS[solarKey]
  }

  // 2. 음력/특정 연도 공휴일 및 대체휴일
  const lunarData = LUNAR_HOLIDAYS_OFFSETS[year]

  if (lunarData) {
    for (const h of lunarData.설날) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '설날'
        break
      }
    }

    for (const h of lunarData.추석) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '추석'
        break
      }
    }

    if (lunarData.부처님오신날.month === month && lunarData.부처님오신날.day === day) {
      holidayName = holidayName || '부처님 오신 날'
    }

    for (const h of lunarData.대체휴일) {
      if (h.month === month && h.day === day) {
        holidayName = '대체휴일'
        break
      }
    }
  }

  if (holidayName) {
    if (holidayName.length > 4) return holidayName.substring(0, 4)
    return holidayName
  }
  return null
}