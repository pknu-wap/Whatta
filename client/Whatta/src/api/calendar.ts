import { http } from '@/lib/http'
import { token } from '@/lib/token'

export type MonthlyEvent = {
  id: string
  title: string
  colorKey: string
  labels: number[]
  isRepeat: boolean | null
}
export type MonthlyDay = {
  date: string // '2025-11-01'
  events: MonthlyEvent[]
  taskCount: number
}

export async function fetchMonthly(ym: string) {
  const access = token.getAccess()
  const res = await http.get('/calendar/monthly', { params: { month: ym } })

  // 디버그 로그(서버 응답 확인용)
  //   console.log(
  //     '📥 monthly res:',
  //     res.status,
  //     res.data?.message,
  //     'days:',
  //     res.data?.data?.days?.length,
  //   )

  return res.data?.data?.days ?? []
}
