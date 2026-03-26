import { http } from '@/lib/http'
import { isAxiosError } from 'axios'

export type HomeWeatherRainSnow = {
  willRain: boolean
  chanceOfRain: number
  willSnow: boolean
  chanceOfSnow: number
  rainStartTime: string | null
  snowStartTime: string | null
}

export type HomeWeatherApiData = {
  todayMinTemperatureC: number | null
  todayMaxTemperatureC: number | null
  todayWeather: string | null
  todayWeatherGroupNumber: number
  currentTemperatureC: number | null
  feelsLikeTemperatureC: number | null
  pm25: number | null
  pm10: number | null
  pm25Grade: number
  pm10Grade: number
  rainSnow: HomeWeatherRainSnow
}

const HOME_WEATHER_ENDPOINT = '/weather'

export async function fetchHomeWeather(params: {
  latitude: number
  longitude: number
}) {
  console.log('[weather] request params:', params)

  try {
    const res = await http.get(HOME_WEATHER_ENDPOINT, {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
    })

    console.log('[weather] response status:', res.status)
    console.log('[weather] response data:', res.data?.data)

    return res.data?.data as HomeWeatherApiData
  } catch (error) {
    if (isAxiosError(error)) {
      console.log('[weather] response status:', error.response?.status)
      console.log('[weather] response body:', error.response?.data)
    }
    throw error
  }
}
