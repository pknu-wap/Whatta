import { useCallback, useState } from 'react'
import { fetchHomeWeather, type HomeWeatherApiData } from '@/api/weather'
import type {
  AssistantWeatherCard,
  AssistantWeatherHighlight,
} from '@/screens/Home/assistantHome/types'

const WEATHER_REFETCH_DISTANCE_METERS = 500
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000

type WeatherCache = {
  data: HomeWeatherApiData | null
  coords: {
    latitude: number
    longitude: number
  } | null
  fetchedAt: number | null
}

let weatherCache: WeatherCache = {
  data: null,
  coords: null,
  fetchedAt: null,
}

function formatTemperatureLabel(value: number | null, prefix: string) {
  if (value == null) return `${prefix} --°`
  return `${prefix} ${Math.round(value)}°`
}

function formatHighLowLabel(min: number | null, max: number | null) {
  const maxText = max == null ? '--' : Math.round(max).toString()
  const minText = min == null ? '--' : Math.round(min).toString()
  return `최고 ${maxText}° / 최저 ${minText}°`
}

function formatAirGrade(grade: number) {
  switch (grade) {
    case 0:
      return '알 수 없음'
    case 1:
      return '좋음'
    case 2:
      return '보통'
    case 3:
      return '나쁨'
    case 4:
      return '매우 나쁨'
    default:
      return '정보 없음'
  }
}

function buildDustMessage(grade: number) {
  switch (grade) {
    case 1:
      return '공기가 맑은 편이에요'
    case 2:
      return '공기는 무난한 편이에요'
    case 3:
      return '미세먼지가 나빠요. 마스크 챙기세요'
    case 4:
      return '공기가 탁해요. 마스크 챙기세요'
    default:
      return '공기 정보를 확인하고 있어요'
  }
}

function toStartTimeLabel(value: string | null) {
  if (!value) return '시간 정보 없음'
  const parts = value.split(' ')
  return parts[1] ?? value
}

function toHourText(value: string | null) {
  if (!value) return ''

  const [, time] = value.split(' ')
  if (!time) return ''

  const [hourText] = time.split(':')
  const hour = Number(hourText)
  if (Number.isNaN(hour)) return ''

  const period = hour < 12 ? '오전' : '오후'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12
  return `${period} ${normalizedHour}시`
}

function toConditionEmoji(todayWeather: string | null, weatherGroupNumber: number) {
  const text = todayWeather ?? ''

  if (weatherGroupNumber === 14) return '⛈️'
  if (weatherGroupNumber >= 11 && weatherGroupNumber <= 13) return '❄️'
  if (weatherGroupNumber >= 5 && weatherGroupNumber <= 10) return '☔️'
  if (weatherGroupNumber === 4) return '🌫️'
  if (weatherGroupNumber >= 2 && weatherGroupNumber <= 3) return '☁️'
  if (weatherGroupNumber === 1) return '☀️'
  if (text.includes('눈')) return '❄️'
  if (text.includes('비')) return '☔️'
  if (text.includes('흐') || text.includes('구름')) return '☁️'
  return '☀️'
}

function toWeatherTheme(groupNumber: number) {
  if (groupNumber === 1) return 'sunny' as const
  if (groupNumber === 2) return 'cloudy' as const
  if (groupNumber === 3 || groupNumber === 4) return 'overcast' as const
  if (groupNumber >= 5 && groupNumber <= 14) return 'rainy' as const
  return 'sunny' as const
}

function buildConditionMessage(groupNumber: number, todayWeather: string | null) {
  switch (groupNumber) {
    case 0:
      return '오늘 날씨를 확인하고 있어요'
    case 1:
      return '오늘은 가볍게 나서기 좋아요'
    case 2:
      return '구름은 있지만 편하게 움직이기 좋아요'
    case 3:
      return '하늘이 흐려요, 차분하게 시작해봐요'
    case 4:
      return '안개가 있어요, 이동할 때 조심하세요'
    case 5:
      return '비가 살짝 와요, 작은 우산 챙겨보세요'
    case 6:
      return '약한 비가 와요, 우산 챙기면 좋아요'
    case 7:
      return '비 오는 날이에요, 조금 여유 있게 움직여요'
    case 8:
      return '비가 많이 와요, 우산 꼭 챙겨주세요'
    case 9:
      return '진눈깨비가 내려요, 길이 미끄러워요'
    case 10:
      return '날씨가 거칠어요, 실외 이동은 조심하세요'
    case 11:
      return '눈이 조금 와요, 발밑을 조심하세요'
    case 12:
      return '눈이 와요, 따뜻하게 입고 나가세요'
    case 13:
      return '눈이 많이 와요, 교통 상황을 먼저 확인하세요'
    case 14:
      return '천둥 번개 가능성이 있어요, 야외 일정은 조심하세요'
    default:
      return todayWeather ?? '오늘 날씨를 확인하고 있어요'
  }
}

function buildRainSnowMessage(data: HomeWeatherApiData) {
  const { rainSnow } = data

  if (rainSnow.willRain && rainSnow.willSnow) {
    return '비나 눈이 올 수 있어요, 따뜻하게 챙겨주세요'
  }

  if (rainSnow.willRain) {
    const startLabel = toHourText(rainSnow.rainStartTime)
    if (startLabel) return `${startLabel}쯤 비가 와요, 우산 챙겨주세요`
    return '비 소식이 있어요, 우산 챙겨주세요'
  }

  if (rainSnow.willSnow) {
    const startLabel = toHourText(rainSnow.snowStartTime)
    if (startLabel) return `${startLabel}쯤 눈이 와요, 따뜻하게 챙겨주세요`
    return '눈 소식이 있어요, 따뜻하게 챙겨주세요'
  }

  return null
}

function buildTemperatureMessage(data: HomeWeatherApiData) {
  const current = data.currentTemperatureC
  const feelsLike = data.feelsLikeTemperatureC
  const target = feelsLike ?? current

  if (target == null) return null

  if (target >= 30) {
    return '많이 더워요, 선크림 바르고 물도 챙겨주세요'
  }

  if (target >= 27) {
    return '더운 날이에요, 선풍기 챙기면 좋아요'
  }

  if (target <= -5) {
    return '많이 추워요, 따뜻하게 단단히 챙겨주세요'
  }

  if (target <= 5) {
    return '쌀쌀해요, 겉옷 챙기면 좋아요'
  }

  return null
}

function buildWeatherHeadline(data: HomeWeatherApiData) {
  const dustGrade = Math.max(data.pm25Grade, data.pm10Grade)
  const rainSnowMessage = buildRainSnowMessage(data)
  const dustMessage = dustGrade >= 3 ? buildDustMessage(dustGrade) : null
  const temperatureMessage = buildTemperatureMessage(data)
  const conditionMessage = buildConditionMessage(
    data.todayWeatherGroupNumber,
    data.todayWeather,
  )

  if (rainSnowMessage && dustMessage) {
    return `${rainSnowMessage} 그리고 ${dustMessage}`
  }

  if (rainSnowMessage && temperatureMessage) {
    return `${rainSnowMessage} 오늘은 ${temperatureMessage}`
  }

  if (dustMessage && temperatureMessage) {
    return `${dustMessage} 오늘은 ${temperatureMessage}`
  }

  if (
    !rainSnowMessage &&
    !dustMessage &&
    !temperatureMessage &&
    dustGrade === 1 &&
    (data.todayWeatherGroupNumber === 1 || data.todayWeatherGroupNumber === 2)
  ) {
    return '오늘은 공기도 맑고, 가볍게 나서기 좋아요'
  }

  return rainSnowMessage ?? dustMessage ?? temperatureMessage ?? conditionMessage
}

function buildHighlights(data: HomeWeatherApiData): AssistantWeatherHighlight[] {
  const items: AssistantWeatherHighlight[] = [
    {
      id: 'feel',
      label: '체감 기온',
      value: formatTemperatureLabel(data.feelsLikeTemperatureC, '체감'),
      tone: 'neutral',
    },
    {
      id: 'pm25',
      label: '초미세먼지',
      value: `PM2.5 ${data.pm25 ?? '--'} · ${formatAirGrade(data.pm25Grade)}`,
      tone: 'dust',
    },
    {
      id: 'pm10',
      label: '미세먼지',
      value: `PM10 ${data.pm10 ?? '--'} · ${formatAirGrade(data.pm10Grade)}`,
      tone: 'dust',
    },
  ]

  if (data.rainSnow.willRain) {
    items.unshift({
      id: 'rain',
      label: '비 예보',
      value: `${data.rainSnow.chanceOfRain}% · ${toStartTimeLabel(data.rainSnow.rainStartTime)}`,
      tone: 'rain',
    })
  }

  if (data.rainSnow.willSnow) {
    items.unshift({
      id: 'snow',
      label: '눈 예보',
      value: `${data.rainSnow.chanceOfSnow}% · ${toStartTimeLabel(data.rainSnow.snowStartTime)}`,
      tone: 'rain',
    })
  }

  return items
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const earthRadius = 6371000
  const dLat = toRadians(right.latitude - left.latitude)
  const dLng = toRadians(right.longitude - left.longitude)
  const lat1 = toRadians(left.latitude)
  const lat2 = toRadians(right.latitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function mapWeatherApiToCard(data: HomeWeatherApiData): AssistantWeatherCard {
  const weatherMessage = buildWeatherHeadline(data)
  const dustGrade = Math.max(data.pm25Grade, data.pm10Grade)

  return {
    locationLabel: '지금 있는 곳 기준',
    headline: weatherMessage,
    compactSummary: weatherMessage,
    currentTemperatureLabel: formatTemperatureLabel(data.currentTemperatureC, '현재'),
    feelsLikeLabel: formatTemperatureLabel(data.feelsLikeTemperatureC, '체감'),
    highLowLabel: formatHighLowLabel(data.todayMinTemperatureC, data.todayMaxTemperatureC),
    conditionEmoji: toConditionEmoji(data.todayWeather, data.todayWeatherGroupNumber),
    conditionLabel: data.todayWeather ?? '날씨 정보',
    weatherTheme: toWeatherTheme(data.todayWeatherGroupNumber),
    dustGradeLabel: formatAirGrade(dustGrade),
    dustDetailLabel: buildDustMessage(dustGrade),
    noPermissionMessage: '위치 권한이 없으면 현재 위치 기반 날씨를 불러올 수 없어요.',
    highlights: buildHighlights(data),
  }
}

export default function useHomeWeather() {
  const [data, setData] = useState<HomeWeatherApiData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async (params: { latitude: number; longitude: number }) => {
    if (weatherCache.data && weatherCache.coords && weatherCache.fetchedAt != null) {
      const distance = getDistanceMeters(weatherCache.coords, params)
      const age = Date.now() - weatherCache.fetchedAt
      if (distance < WEATHER_REFETCH_DISTANCE_METERS && age < WEATHER_CACHE_TTL_MS) {
        setData(weatherCache.data)
        setError(null)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const next = await fetchHomeWeather(params)
      weatherCache = {
        data: next,
        coords: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        fetchedAt: Date.now(),
      }
      setData(next)
    } catch (e) {
      console.log('[weather] fetch failed:', e)
      setError('날씨 정보 준비 중이에요')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    weatherCard: data ? mapWeatherApiToCard(data) : null,
    loading,
    error,
    fetchWeather,
  }
}
