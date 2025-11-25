type CalendarViewMode = 'day' | 'week' | 'month'

// 내부 상태
let _currentView: CalendarViewMode = 'day'

// 구독자 저장용
const listeners = new Set<() => void>()

export const currentCalendarView = {
  get(): CalendarViewMode {
    return _currentView
  },

  set(mode: CalendarViewMode) {
    if (_currentView === mode) return
    _currentView = mode
    listeners.forEach((fn) => fn())
  },

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
