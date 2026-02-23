export const pad2 = (n: number) => String(n).padStart(2, '0')

export const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

export const addDays = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const b = new Date(y, m - 1, dd + d)
  return `${b.getFullYear()}-${pad2(b.getMonth() + 1)}-${pad2(b.getDate())}`
}

export function getDateOfWeek(weekDay: string): string {
  if (!weekDay) return today()

  const key = weekDay.trim().toUpperCase()

  const map: Record<string, number> = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 0,
  }

  const target = map[key]
  if (target === undefined) return today()

  const now = new Date()
  const diff = target - now.getDay()

  const d = new Date()
  d.setDate(now.getDate() + diff)

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getInstanceDates(ev: any, currentDateISO: string) {
  if (ev.startDate && ev.endDate) {
    return { startDate: ev.startDate, endDate: ev.endDate }
  }

  if (ev.startAt && ev.endAt) {
    return {
      startDate: ev.startAt.slice(0, 10),
      endDate: ev.endAt.slice(0, 10),
    }
  }

  return { startDate: currentDateISO, endDate: currentDateISO }
}