import { useEffect, useRef } from 'react'
import { bus } from '@/lib/eventBus'
import { updateTask } from '@/api/task'
import { PIXELS_PER_MIN } from './constants'

interface Params {
  anchorDateRef: React.MutableRefObject<string>
  fetchDailyEvents: () => void
  measureLayouts: () => void
  taskBoxRectRef: React.MutableRefObject<any>
  gridRectRef: React.MutableRefObject<any>
  gridScrollYRef: React.MutableRefObject<number>
}

export function useDayDrag({
  anchorDateRef,
  fetchDailyEvents,
  measureLayouts,
  taskBoxRectRef,
  gridRectRef,
  gridScrollYRef,
}: Params) {
  const draggingTaskIdRef = useRef<string | null>(null)
  const dragReadyRef = useRef(false)

  // 드래그 시작
  useEffect(() => {
    const onStart = ({ task }: any) => {
      draggingTaskIdRef.current = task?.id ?? null
    }
    bus.on('xdrag:start', onStart)
    return () => bus.off('xdrag:start', onStart)
  }, [])

  // ready / cancel
  useEffect(() => {
    const onReady = () => (dragReadyRef.current = true)
    const onCancel = () => {
      draggingTaskIdRef.current = null
      dragReadyRef.current = false
    }

    bus.on('xdrag:ready', onReady)
    bus.on('xdrag:cancel', onCancel)

    return () => {
      bus.off('xdrag:ready', onReady)
      bus.off('xdrag:cancel', onCancel)
    }
  }, [])

  // drop
  useEffect(() => {
    const within = (r: any, x: number, y: number) =>
      x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

    const onDrop = async ({ x, y }: any) => {
      const id = draggingTaskIdRef.current
      if (!id) return
      if (!dragReadyRef.current) {
        draggingTaskIdRef.current = null
        return
      }

      measureLayouts()

      requestAnimationFrame(async () => {
        const dateISO = anchorDateRef.current
        const taskBox = taskBoxRectRef.current
        const gridBox = gridRectRef.current

        // ① 상단 박스
        if (within(taskBox, x, y)) {
          await updateTask(id, {
            placementDate: dateISO,
            placementTime: null,
            date: dateISO,
          })

          bus.emit('calendar:mutated', {
            op: 'update',
            item: { id, isTask: true, date: dateISO },
          })

          fetchDailyEvents()
          draggingTaskIdRef.current = null
          return
        }

        // ② 시간 그리드
        if (within(gridBox, x, y)) {
          const innerY = Math.max(0, y - gridBox.top)

          const minRaw = innerY / PIXELS_PER_MIN
          const minSnap = Math.round(minRaw / 5) * 5
          const hh = String(Math.floor(minSnap / 60)).padStart(2, '0')
          const mm = String(minSnap % 60).padStart(2, '0')

          await updateTask(id, {
            placementDate: dateISO,
            placementTime: `${hh}:${mm}:00`,
            date: dateISO,
          })

          bus.emit('calendar:mutated', {
            op: 'update',
            item: {
              id,
              isTask: true,
              placementDate: dateISO,
              placementTime: `${hh}:${mm}:00`,
              date: dateISO,
            },
          })

          fetchDailyEvents()
        }

        draggingTaskIdRef.current = null
      })
    }

    bus.on('xdrag:drop', onDrop)
    return () => bus.off('xdrag:drop', onDrop)
  }, [fetchDailyEvents, measureLayouts])
}