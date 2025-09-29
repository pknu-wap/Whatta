import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency'

export function useATTOnActive({ requestOnFirstActive = true, debug = false } = {}) {
  const requestedInThisSessionRef = useRef(false)

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const maybeRequest = async () => {
      if (requestedInThisSessionRef.current) return

      const { status: current } = await getTrackingPermissionsAsync()
      if (debug) console.log('[ATT] current:', current)

      if (
        current === 'granted' ||
        current === 'denied' ||
        current === 'blocked' ||
        current === 'limited'
      ) {
        requestedInThisSessionRef.current = true
        return
      }

      const { status } = await requestTrackingPermissionsAsync()
      if (debug) console.log('[ATT] requested ->', status)
      requestedInThisSessionRef.current = true
    }

    const onChange = async (state) => {
      if (state !== 'active') return
      if (requestOnFirstActive) {
        await maybeRequest()
      }
    }

    if (requestOnFirstActive && AppState.currentState === 'active') {
      maybeRequest()
    }

    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [requestOnFirstActive, debug])
}