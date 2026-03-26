type CalendarViewMode = 'day' | 'week' | 'month'

// 내부 상태
let _currentView: CalendarViewMode = 'month'
let _tabLaunchView: CalendarViewMode = 'month'
let _suppressNextViewEntrance = false

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
    return () => {
      listeners.delete(fn)
    }
  },
}

export const calendarTabLaunchView = {
  get(): CalendarViewMode {
    return _tabLaunchView
  },

  set(mode: CalendarViewMode) {
    _tabLaunchView = mode
  },
}

export const calendarViewTransition = {
  markNextEntranceSuppressed() {
    _suppressNextViewEntrance = true
  },
  consumeNextEntranceSuppressed() {
    const current = _suppressNextViewEntrance
    _suppressNextViewEntrance = false
    return current
  },
}
