import { useEffect, useState } from 'react'
import { bus } from '@/lib/eventBus'
import {
  AppleCalendarSyncState,
  getAppleCalendarSyncState,
} from '@/lib/appleCalendarSync'

export function useAppleCalendarSync() {
  const [state, setState] = useState<AppleCalendarSyncState | null>(null)

  useEffect(() => {
    let mounted = true

    getAppleCalendarSyncState().then((next) => {
      if (mounted) setState(next)
    })

    const onChange = (next: AppleCalendarSyncState) => {
      setState(next)
    }

    bus.on('appleCalendar:state-changed', onChange)
    return () => {
      mounted = false
      bus.off('appleCalendar:state-changed', onChange)
    }
  }, [])

  return state
}
