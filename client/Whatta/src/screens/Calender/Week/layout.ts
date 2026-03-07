export type DayTimelineEvent = {
  id: string
  title: string
  place?: string
  startMin: number
  endMin: number
  color: string
  isRepeat?: boolean
  labels?: Array<number | string>
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
  rawStartISO?: string
  rawEndISO?: string
  isSpan?: boolean
  isTask?: boolean
  done?: boolean
  completed?: boolean
  isRepeat?: boolean
}

// 이전 렌더의 겹침 배치 결과를 날짜별로 캐시해 이벤트 박스 위치 튐 줄임
let prevLayoutMapByDay: Record<string, Record<string, LayoutedEvent>> = {}

// 주/화면 전환 시 겹침 캐시를 초기화
export function resetLayoutDayEventsCache() {
  prevLayoutMapByDay = {}
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
export function layoutDayEvents(
  events: DayTimelineEvent[],
  dateKey = '__global__',
): LayoutedEvent[] {
  if (!events.length) return []

  const prevLayoutMap = prevLayoutMapByDay[dateKey] || {}

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
        // 이미 배치된 이벤트 재사용 금지 
        other.id !== ev.id &&
        !used.has(other.id) &&
        other.startMin < ev.endMin &&
        other.endMin > ev.startMin,
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

  prevLayoutMapByDay[dateKey] = Object.fromEntries(layout.map((ev) => [ev.id, ev]))
  return layout
}

// span 이벤트 계산
export function buildWeekSpanEvents(weekDates: string[], data: Record<string, any>) {
  const byId = new Map<string, WeekSpanEvent>()
  const weekStart = weekDates[0]
  const weekEnd = weekDates[weekDates.length - 1]
  const toDateISO = (v: any, fallback: string) => {
    if (!v || typeof v !== 'string') return fallback
    return v.slice(0, 10)
  }

  weekDates.forEach((dateISO) => {
    const bucket = data[dateISO]
    if (!bucket) return

    const list = [
      ...(bucket.spanEvents || []).map((e: any) => ({ ...e, __kind: 'event' as const })),
      ...(bucket.checks || []).map((e: any) => ({ ...e, __kind: 'check' as const })),
    ]

    list.forEach((e: any) => {
      const rawId = String(e.id)
      const kind = e.__kind === 'check' ? 'check' : 'event'
      const title = e.title ?? ''

      const isTask =
        kind === 'check' ||
        e.isTask === true ||
        e.type === 'task'

      const colorKey = isTask
        ? '000000'
        : (e.colorKey && String(e.colorKey).replace('#', '')) || '8B5CF6'
      const color = colorKey.startsWith('#') ? colorKey : `#${colorKey}`

      const rawStartISO = toDateISO(
        e.originalStartDate ?? e.originStartDate ?? e.startDate ?? e.startAt ?? e.date,
        dateISO,
      )
      const rawEndISO = toDateISO(
        e.originalEndDate ?? e.originEndDate ?? e.endDate ?? e.endAt ?? e.date ?? rawStartISO,
        rawStartISO,
      )
      const startISO = rawStartISO < weekStart ? weekStart : rawStartISO
      const endISO = rawEndISO > weekEnd ? weekEnd : rawEndISO
      const isSpan = rawStartISO !== rawEndISO || e.isSpan === true
      // 단일 일정(특히 반복/발생 인스턴스)은 id가 같아도 날짜별로 분리 유지.
      // 기간 일정만 같은 id를 주간 내에서 병합해 시작/중간/끝 모양을 만든다.
      const mapKey = isSpan
        ? `${kind}:${rawId}`
        : `${kind}:${rawId}:${startISO}`

      const existing = byId.get(mapKey)

      if (!existing) {
        byId.set(mapKey, {
          id: rawId,
          title,
          color,
          startISO,
          endISO,
          rawStartISO,
          rawEndISO,
          startIdx: 0,
          endIdx: 0,
          row: 0,
          isSpan,
          isTask,
          done: e.done ?? e.completed ?? false,
          completed: e.completed,
          isRepeat: e.isRepeat ?? false,
        })
      } else {
        if (startISO < existing.startISO) existing.startISO = startISO
        if (endISO > existing.endISO) existing.endISO = endISO
        if (rawStartISO < (existing.rawStartISO ?? existing.startISO)) {
          existing.rawStartISO = rawStartISO
        }
        if (rawEndISO > (existing.rawEndISO ?? existing.endISO)) {
          existing.rawEndISO = rawEndISO
        }
        existing.isSpan = existing.isSpan || isSpan
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
