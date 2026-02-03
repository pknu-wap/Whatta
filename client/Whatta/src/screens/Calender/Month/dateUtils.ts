export const pad2 = (n: number) => String(n).padStart(2, '0')

export const today = (): string => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`
}

export function getDateOfWeek(weekDay: string): string {
  if (!weekDay) return today()

  const key = weekDay.trim().toUpperCase()
  const map: any = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 }

  const target = map[key]
  if (target === undefined) return today()

  const now = new Date()
  const todayIdx = now.getDay()
  const diff = target - todayIdx

  const d = new Date()
  d.setDate(now.getDate() + diff)

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}