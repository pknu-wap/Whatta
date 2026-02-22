export interface DayViewTask {
  id: string
  title?: string
  placementDate?: string | null
  placementTime?: string | null
  completed?: boolean
  labels?: number[]
  content?: string

  startMin?: number
  endMin?: number
  _column?: number
  _totalColumns?: number
}

/**
 * Task 겹침 계산
 */
export function computeTaskOverlap(tasks: DayViewTask[]): DayViewTask[] {
  const filtered = tasks.filter((t) => t.placementTime)

  const converted: DayViewTask[] = filtered.map((t) => {
    const [h, m] = t.placementTime!.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + 60
    return { ...t, startMin, endMin }
  })

  const sorted = [...converted].sort(
    (a, b) => a.startMin! - b.startMin! || a.endMin! - b.endMin!,
  )

  const result: DayViewTask[] = []
  let group: DayViewTask[] = []
  let groupEnd = -1

  const flushGroup = () => {
    if (!group.length) return

    const columns: DayViewTask[][] = []

    group.forEach((t) => {
      let placed = false
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1]
        if (last.endMin! <= t.startMin!) {
          columns[i].push(t)
          t._column = i
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([t])
        t._column = columns.length - 1
      }
    })

    group.forEach((t) => {
      t._totalColumns = columns.length
      result.push(t)
    })

    group = []
  }

  for (const t of sorted) {
    if (t.startMin! > groupEnd) {
      flushGroup()
      group.push(t)
      groupEnd = t.endMin!
    } else {
      group.push(t)
      groupEnd = Math.max(groupEnd, t.endMin!)
    }
  }

  flushGroup()
  return result
}

/**
 * Task 그룹 계산
 */
export function groupTasksByOverlap(tasks: DayViewTask[]) {
  const overlapped = computeTaskOverlap(tasks)
  const sorted = overlapped.sort((a, b) => a.startMin! - b.startMin!)

  const groups: { tasks: DayViewTask[]; startMin: number }[] = []
  let cur: DayViewTask[] = []
  let curEnd = -1

  const flush = () => {
    if (!cur.length) return
    const startMin = Math.min(...cur.map((t) => t.startMin!))
    groups.push({ tasks: cur, startMin })
    cur = []
  }

  for (const t of sorted) {
    if (t.startMin! > curEnd) {
      flush()
      cur = [t]
      curEnd = t.endMin!
    } else {
      cur.push(t)
      curEnd = Math.max(curEnd, t.endMin!)
    }
  }

  flush()
  return groups
}

/**
 * Event 겹침 계산
 */
export function computeEventOverlap(events: any[]) {
  const sorted = [...events].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin,
  )

  let group: any[] = []
  let groupEnd = -1
  const result: any[] = []

  const flush = () => {
    if (!group.length) return
    const columns: any[][] = []

    group.forEach((ev) => {
      let placed = false
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1]
        if (last.endMin <= ev.startMin) {
          columns[i].push(ev)
          ev._column = i
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([ev])
        ev._column = columns.length - 1
      }
    })

    group.forEach((ev) => {
      ev._totalColumns = columns.length
      result.push(ev)
    })

    group = []
  }

  for (const ev of sorted) {
    if (ev.startMin > groupEnd) {
      flush()
      group = [ev]
      groupEnd = ev.endMin
    } else {
      group.push(ev)
      groupEnd = Math.max(groupEnd, ev.endMin)
    }
  }

  flush()
  return result
}