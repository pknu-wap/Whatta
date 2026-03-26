import { useCallback, useState } from 'react'
import * as Location from 'expo-location'

export type CurrentLocationState = {
  loading: boolean
  permissionDenied: boolean
  coords: {
    latitude: number
    longitude: number
  } | null
  error: string | null
}

export default function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>({
    loading: false,
    permissionDenied: false,
    coords: null,
    error: null,
  })

  const fetchCurrentLocation = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }))

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      console.log('[location] permission status:', permission.status)

      if (permission.status !== 'granted') {
        console.log('[location] permission denied')
        setState({
          loading: false,
          permissionDenied: true,
          coords: null,
          error: null,
        })
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      console.log('[location] raw coords:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })

      setState({
        loading: false,
        permissionDenied: false,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
      })
    } catch {
      console.log('[location] fetch failed')
      setState({
        loading: false,
        permissionDenied: false,
        coords: null,
        error: '위치 정보를 가져오지 못했습니다.',
      })
    }
  }, [])

  return {
    ...state,
    fetchCurrentLocation,
  }
}
