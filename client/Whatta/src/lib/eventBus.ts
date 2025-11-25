type Handler<T = any> = (payload: T) => void

class TinyBus {
  private map = new Map<string, Set<Handler>>()

  on<T = any>(event: string, fn: Handler<T>) {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(fn as Handler)
  }

  off<T = any>(event: string, fn: Handler<T>) {
    this.map.get(event)?.delete(fn as Handler)
  }

  emit<T = any>(event: string, payload?: T) {
    this.map.get(event)?.forEach((fn) => fn(payload as T))
  }

  once<T = any>(event: string, fn: Handler<T>) {
    const wrap: Handler<T> = (p) => {
      this.off(event, wrap)
      fn(p)
    }
    this.on(event, wrap)
  }
}

export const bus = new TinyBus()

// 2) 이벤트 키 추가
export const EVENT = {
  APPLY_DATE: 'calendar:apply-date', // payload: YYYY-MM-DD
  SET_MONTH: 'calendar:set-month', // payload: YYYY-MM
  MONTH_CHANGED: 'calendar:month-changed', // payload: YYYY-MM
  REQUEST_SYNC: 'calendar:request-sync', // payload: 없음
} as const
export type EventKeys = (typeof EVENT)[keyof typeof EVENT]
