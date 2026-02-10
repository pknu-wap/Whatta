export const CHECKBOX_SIZE = 9

export const SCHEDULE_BOX_HEIGHT = 17
export const TASK_BOX_HEIGHT = 17
export const EVENT_AREA_PADDING_TOP = 5
export const ITEM_MARGIN_VERTICAL = 2
export const SINGLE_SCHEDULE_BORDER_WIDTH = 5
export const TEXT_HORIZONTAL_PADDING = 4
export const EVENT_HPAD = 4
export const MULTI_LEFT_GAP = 3 // 시작일 왼쪽 여백
export const MULTI_RIGHT_GAP = 3 // 종료일 오른쪽 여백
export const CAP_W = 6 // 캡 두께

export const DARK_GRAY_COLOR = '#555555'
// 반복 일정 배경, 경계선/멀티데이 시작/종료 표시용
export const SCHEDULE_COLOR = '#B04FFF'
// 단일 일정 및 멀티데이(기간이 긴 일정) 바 배경색
export const SCHEDULE_LIGHT_COLOR = '#E5CCFF'

//  HOLIDAYS: 양력 공휴일 (JS getMonth() 0-11월 기준)
export const HOLIDAYS: Record<string, string> = {
  '0-1': '신정', // 1월 1일
  '2-1': '삼일절', // 3월 1일
  '4-1': '노동절', // 5월 1일
  '4-5': '어린이날', // 5월 5일
  '5-6': '현충일', // 6월 6일
  '7-14': '광복절', // 8월 15일
  '9-3': '개천절', // 10월 3일
  '9-9': '한글날', // 10월 9일
  '11-25': '크리스마스', // 12월 25일
}

// 연도별 음력/대체공휴일 2026까지만 표시함
export const LUNAR_HOLIDAYS_OFFSETS: Record<
  number,
  {
    설날: { month: number; day: number }[]
    추석: { month: number; day: number }[]
    부처님오신날: { month: number; day: number }
    대체휴일: { month: number; day: number }[]
  }
> = {
  2024: {
    설날: [
      { month: 1, day: 9 },
      { month: 1, day: 10 },
      { month: 1, day: 11 },
    ],
    추석: [
      { month: 8, day: 16 },
      { month: 8, day: 17 },
      { month: 8, day: 18 },
    ],
    부처님오신날: { month: 4, day: 15 },
    대체휴일: [{ month: 1, day: 12 }],
  },
  2025: {
    설날: [
      { month: 0, day: 28 },
      { month: 0, day: 29 },
      { month: 0, day: 30 },
    ],
    추석: [
      { month: 9, day: 5 },
      { month: 9, day: 6 },
      { month: 9, day: 7 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [{ month: 9, day: 8 }],
  },
  2026: {
    설날: [
      { month: 1, day: 16 },
      { month: 1, day: 17 },
      { month: 1, day: 18 },
    ],
    추석: [
      { month: 8, day: 24 },
      { month: 8, day: 25 },
      { month: 8, day: 26 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [
      { month: 2, day: 2 },
      { month: 4, day: 25 },
      { month: 7, day: 17 },
      { month: 9, day: 5 },
    ],
  },
}