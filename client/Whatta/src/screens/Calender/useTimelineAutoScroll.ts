import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { ScrollView } from 'react-native'

type ViewportRect = {
  top: number
  bottom: number
  height: number
}

type DragBounds = {
  top: number
  bottom: number
}

type Params = {
  scrollRef: RefObject<ScrollView | null>
  onScrollSync?: (offsetY: number) => void
}

const EDGE_THRESHOLD_MIN = 72
const EDGE_THRESHOLD_MAX = 128
const MAX_SPEED_PX_PER_SEC = 900
const MIN_SPEED_RATIO = 0.2

export function useTimelineAutoScroll({ scrollRef, onScrollSync }: Params) {
  const viewportRectRef = useRef<ViewportRect>({ top: 0, bottom: 0, height: 0 })
  const contentHeightRef = useRef(0)
  const scrollYRef = useRef(0)
  const speedRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)

  const stopAutoScroll = useCallback(() => {
    speedRef.current = 0
    lastTsRef.current = 0
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const measureViewport = useCallback(() => {
    const scrollView = scrollRef.current as
      | (ScrollView & {
          measure?: (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number,
              pageX: number,
              pageY: number,
            ) => void,
          ) => void
        })
      | null

    scrollView?.measure?.((_x, _y, _w, h, px, py) => {
      viewportRectRef.current = {
        top: py,
        bottom: py + h,
        height: h,
      }
    })
  }, [scrollRef])

  const step = useCallback(
    (timestamp: number) => {
      const speed = speedRef.current
      if (!speed) {
        rafRef.current = null
        lastTsRef.current = 0
        return
      }

      const viewportHeight = viewportRectRef.current.height
      const contentHeight = contentHeightRef.current
      const maxScroll = Math.max(0, contentHeight - viewportHeight)

      if (maxScroll <= 0) {
        stopAutoScroll()
        return
      }

      if (!lastTsRef.current) {
        lastTsRef.current = timestamp
      }

      const deltaMs = Math.min(32, timestamp - lastTsRef.current || 16)
      lastTsRef.current = timestamp

      const nextScroll = Math.max(
        0,
        Math.min(maxScroll, scrollYRef.current + (speed * deltaMs) / 1000),
      )

      if (nextScroll === scrollYRef.current) {
        stopAutoScroll()
        return
      }

      scrollYRef.current = nextScroll
      onScrollSync?.(nextScroll)
      scrollRef.current?.scrollTo({ y: nextScroll, animated: false })
      rafRef.current = requestAnimationFrame(step)
    },
    [onScrollSync, scrollRef, stopAutoScroll],
  )

  const updateAutoScroll = useCallback(
    (position: number | DragBounds) => {
      const rect = viewportRectRef.current
      if (!rect.height) {
        measureViewport()
        return
      }

      const threshold = Math.min(
        EDGE_THRESHOLD_MAX,
        Math.max(EDGE_THRESHOLD_MIN, rect.height * 0.18),
      )

      let nextSpeed = 0
      const dragTop = typeof position === 'number' ? position : position.top
      const dragBottom = typeof position === 'number' ? position : position.bottom

      if (dragTop < rect.top + threshold) {
        const ratio = Math.min(1, (rect.top + threshold - dragTop) / threshold)
        nextSpeed =
          -MAX_SPEED_PX_PER_SEC * (MIN_SPEED_RATIO + (1 - MIN_SPEED_RATIO) * ratio)
      } else if (dragBottom > rect.bottom - threshold) {
        const ratio = Math.min(1, (dragBottom - (rect.bottom - threshold)) / threshold)
        nextSpeed =
          MAX_SPEED_PX_PER_SEC * (MIN_SPEED_RATIO + (1 - MIN_SPEED_RATIO) * ratio)
      }

      speedRef.current = nextSpeed

      if (!nextSpeed) {
        stopAutoScroll()
        return
      }

      if (rafRef.current === null) {
        lastTsRef.current = 0
        rafRef.current = requestAnimationFrame(step)
      }
    },
    [measureViewport, step, stopAutoScroll],
  )

  const setContentHeight = useCallback((height: number) => {
    contentHeightRef.current = height
  }, [])

  const setScrollY = useCallback((offsetY: number) => {
    scrollYRef.current = offsetY
  }, [])

  useEffect(() => stopAutoScroll, [stopAutoScroll])

  return {
    measureViewport,
    setContentHeight,
    setScrollY,
    stopAutoScroll,
    updateAutoScroll,
  }
}
