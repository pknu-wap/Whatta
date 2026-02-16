export type DayTimelineEvent = {
  id: string
  title: string
  place?: string
  startMin: number
  endMin: number
  color: string
  isRepeat?: boolean
}

export type LayoutedEvent = DayTimelineEvent & {
  column: number
  columnsTotal: number
  isPartialOverlap?: boolean
  overlapDepth?: number
}

export type WeekSpanEvent = {
  id: string
  title: string
  color: string
  startIdx: number
  endIdx: number
  row: number
  startISO: string
  endISO: string
  isTask?: boolean
  done?: boolean
  completed?: boolean
  isRepeat?: boolean
}

// 이전 렌더의 겹침 배치 결과를 캐시해 이벤트 박스 위치 튐 줄임
let prevLayoutMap: Record<string, LayoutedEvent> = {}

// 주/화면 전환 시 겹침 캐시를 초기화
export function resetLayoutDayEventsCache() {
  prevLayoutMap = {}
}

export function getDayColWidth(
  screenWidth: number,
  count: number,
  timeColW = 50,
  sidePadding = 32,
) {
  return (screenWidth - timeColW - sidePadding) / (count > 0 ? count : 7)
}

export function mixWhite(hex: string, whitePercent: number) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  const w = whitePercent / 100
  const base = 1 - w
  const mix = (c: number) => Math.round(c * base + 255 * w)

  const newR = mix(r)
  const newG = mix(g)
  const newB = mix(b)

  return (
    '#' +
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase()
}

// 겹침 규칙에 배치
export function layoutDayEvents(events: DayTimelineEvent[]): LayoutedEvent[] {
  if (!events.length) return []

  const sorted = [...events].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return a.endMin - b.endMin
  })

  const layout: LayoutedEvent[] = []
  const used = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i]
    if (used.has(ev.id)) continue

    const sameGroup = sorted.filter(
      (e) => e.startMin === ev.startMin && e.endMin === ev.endMin,
    )

    if (sameGroup.length > 1) {
      const n = sameGroup.length
      sameGroup.forEach((e, idx) => {
        layout.push({
          ...e,
          column: idx,
          columnsTotal: n,
          isPartialOverlap: false,
          overlapDepth: 0,
        })
        used.add(e.id)
      })
      continue
    }

    const overlappingGroup = sorted.filter(
      (other) =>
        other.id !== ev.id && other.startMin < ev.endMin && other.endMin > ev.startMin,
    )

    const hasOverlap = overlappingGroup.length > 0
    const prev = prevLayoutMap[ev.id]
    const wasPartial = prev?.isPartialOverlap ?? false

    let overlapDepth = 0
    let isPartialOverlap = false

    if (hasOverlap) {
      const group = [...overlappingGroup, ev].sort((a, b) => a.startMin - b.startMin)
      group.forEach((e, idx) => {
        layout.push({
          ...e,
          column: 0,
          columnsTotal: 1,
          isPartialOverlap: true,
          overlapDepth: idx,
        })
        used.add(e.id)
      })
      continue
    } else if (wasPartial) {
      overlapDepth = 0
      isPartialOverlap = false
    }

    layout.push({
      ...ev,
      column: 0,
      columnsTotal: 1,
      isPartialOverlap,
      overlapDepth,
    })
  }

  prevLayoutMap = Object.fromEntries(layout.map((ev) => [ev.id, ev]))
  return layout
}

// span 이벤트 계산
export function buildWeekSpanEvents(weekDates: string[], data: Record<string, any>) {
  const byId = new Map<string, WeekSpanEvent>()

  weekDates.forEach((dateISO) => {
    const bucket = data[dateISO]
    if (!bucket) return

    const list = [...(bucket.spanEvents || []), ...(bucket.checks || [])]

    list.forEach((e: any) => {
      const id = String(e.id)
      const title = e.title ?? ''

      const isTask =
        e.isTask === true ||
        typeof e.completed !== 'undefined' ||
        typeof e.done !== 'undefined' ||
        e.type === 'task'

      const colorKey = isTask
        ? '000000'
        : (e.colorKey && String(e.colorKey).replace('#', '')) || '8B5CF6'
      const color = colorKey.startsWith('#') ? colorKey : `#${colorKey}`

      const s = (e.startDate || e.date || dateISO).slice(0, 10)
      const ed = (e.endDate || e.date || s).slice(0, 10)
      const startISO = s
      const endISO = ed

      const existing = byId.get(id)

      if (!existing) {
        byId.set(id, {
          id,
          title,
          color,
          startISO,
          endISO,
          startIdx: 0,
          endIdx: 0,
          row: 0,
          isTask,
          done: e.done ?? e.completed ?? false,
          completed: e.completed,
          isRepeat: e.isRepeat ?? false,
        })
      } else {
        if (startISO < existing.startISO) existing.startISO = startISO
        if (endISO > existing.endISO) existing.endISO = endISO
      }
    })
  })

  const items = Array.from(byId.values())
  const idxOf = (iso: string) => weekDates.indexOf(iso)

  items.forEach((ev) => {
    ev.startIdx = Math.max(0, idxOf(ev.startISO))
    const endIdxRaw = idxOf(ev.endISO)
    ev.endIdx = Math.min(
      weekDates.length - 1,
      endIdxRaw === -1 ? weekDates.length - 1 : endIdxRaw,
    )
  })

  const lanes: WeekSpanEvent[][] = []
  items.forEach((ev) => {
    let row = 0
    while (
      lanes[row] &&
      lanes[row].some(
        (other) => !(ev.endIdx < other.startIdx || ev.startIdx > other.endIdx),
      )
    ) {
      row++
    }
    ev.row = row
    if (!lanes[row]) lanes[row] = []
    lanes[row].push(ev)
  })

  return items
}

export function thumbH(visibleH: number, contentH: number) {
  const minH = 18
  const h = (visibleH * visibleH) / Math.max(contentH, 1)
  return Math.max(minH, Math.min(h, visibleH))
}
