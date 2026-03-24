import { useCallback, useState } from 'react'
import { fetchHomeWeather, type HomeWeatherApiData } from '@/api/weather'
import type {
  AssistantWeatherCard,
  AssistantWeatherHighlight,
} from '@/screens/Home/assistantHome/types'

function formatTemperatureLabel(value: number | null, prefix: string) {
  if (value == null) return `${prefix} --도`
  return `${prefix} ${Math.round(value)}도`
}

function formatHighLowLabel(min: number | null, max: number | null) {
  const maxText = max == null ? '--' : Math.round(max).toString()
  const minText = min == null ? '--' : Math.round(min).toString()
  return `최고 ${maxText}도 · 최저 ${minText}도`
}

function formatAirGrade(grade: number) {
  switch (grade) {
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

function toStartTimeLabel(value: string | null) {
  if (!value) return '시간 정보 없음'
  const parts = value.split(' ')
  return parts[1] ?? value
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

function toWarmWeatherMessage(groupNumber: number, todayWeather: string | null) {
  switch (groupNumber) {
    case 0:
      return '오늘 날씨를 다시 살펴보고 있어요'
    case 1:
      return '오늘은 가볍게 나가도 좋은 날이에요'
    case 2:
      return '구름은 있지만 편하게 움직이기 좋아요'
    case 3:
      return '하늘이 흐려요, 차분하게 하루를 시작해봐요'
    case 4:
      return '안개가 있어요, 이동할 때 조금 더 살펴주세요'
    case 5:
      return '비가 살짝 올 수 있어요, 작은 우산 챙겨보세요'
    case 6:
      return '약한 비가 와요, 우산 챙기면 좋아요'
    case 7:
      return '비 오는 날이에요, 조금 여유 있게 움직여요'
    case 8:
      return '비가 많이 와요. 우산 꼭 챙겨주세요'
    case 9:
      return '진눈깨비가 내려요, 길이 미끄러울 수 있어요'
    case 10:
      return '날씨가 거칠어요, 실외 이동은 특히 조심하세요'
    case 11:
      return '눈이 조금 와요, 발밑을 조심해 주세요'
    case 12:
      return '눈이 꽤 와요, 따뜻하게 입고 나가세요'
    case 13:
      return '눈이 많이 와요, 교통 상황을 먼저 확인해 보세요'
    case 14:
      return '천둥 번개 가능성이 있어요, 야외 일정은 조심하세요'
    default:
      return todayWeather ?? '오늘 날씨를 확인하고 있어요'
  }
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

export function mapWeatherApiToCard(data: HomeWeatherApiData): AssistantWeatherCard {
  const weatherMessage = toWarmWeatherMessage(
    data.todayWeatherGroupNumber,
    data.todayWeather,
  )

  return {
    locationLabel: '지금 있는 곳 기준',
    headline: weatherMessage,
    compactSummary: weatherMessage,
    currentTemperatureLabel: formatTemperatureLabel(data.currentTemperatureC, '현재'),
    highLowLabel: formatHighLowLabel(data.todayMinTemperatureC, data.todayMaxTemperatureC),
    comparedToYesterdayLabel: formatTemperatureLabel(data.feelsLikeTemperatureC, '체감'),
    conditionEmoji: toConditionEmoji(data.todayWeather, data.todayWeatherGroupNumber),
    noPermissionMessage: '위치 권한이 없으면 현재 위치 기반 날씨를 불러올 수 없어요.',
    highlights: buildHighlights(data),
  }
}

export default function useHomeWeather() {
  const [data, setData] = useState<HomeWeatherApiData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async (params: { latitude: number; longitude: number }) => {
    setLoading(true)
    setError(null)

    try {
      const next = await fetchHomeWeather(params)
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
