import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import MypageNoIcon from '@/assets/icons/mypage_no.svg'
import MypageYesIcon from '@/assets/icons/mypage_yes.svg'
import TransportNoIcon from '@/assets/icons/transport_no.svg'
import TransportYesIcon from '@/assets/icons/transport_yes.svg'
import { fetchEventSummary, type EventSummaryItem } from '@/api/event_api'
import {
  fetchTaskSummary,
  type TaskSummaryDueTodayItem,
  type TaskSummaryPlacedTodayItem,
  updateTask,
} from '@/api/task'
import colors from '@/styles/colors'
import type { RootStackParamList } from '@/navigation/RootStack'
import {
  assistantNews,
  assistantQuickActions,
} from '@/screens/Home/assistantHome/mockData'
import NewsBannerCard from '@/screens/Home/assistantHome/components/NewsBannerCard'
import QuickActionGrid from '@/screens/Home/assistantHome/components/QuickActionGrid'
import BriefingCard from '@/screens/Home/assistantHome/components/BriefingCard'
import TaskBriefingCard from '@/screens/Home/assistantHome/components/TaskBriefingCard'
import WeatherSummaryCard from '@/screens/Home/assistantHome/components/WeatherSummaryCard'
import useCurrentLocation from '@/hooks/useCurrentLocation'
import useHomeWeather from '@/hooks/useHomeWeather'
import useToday from '@/hooks/useToday'
import { bus } from '@/lib/eventBus'
import { currentCalendarView } from '@/providers/CalendarViewProvider'
import type { AssistantWeatherCard } from '@/screens/Home/assistantHome/types'
import type {
  AssistantBriefing,
  AssistantTaskBriefing,
} from '@/screens/Home/assistantHome/types'
import { ts } from '@/styles/typography'

const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
}
const HEADLINE_HOLD_MS = 3000
const HEADLINE_TRANSITION_MS = 380
const HEADLINE_TOTAL_MS = HEADLINE_HOLD_MS + HEADLINE_TRANSITION_MS
let headlineTickerOriginMs = Date.now()

const DEFAULT_WEATHER_CARD: AssistantWeatherCard = {
  locationLabel: '지금 있는 곳 기준',
  headline: '오늘 날씨를 준비하고 있어요',
  compactSummary: '날씨 조회 중',
  currentTemperatureLabel: '현재 --°',
  feelsLikeLabel: '체감 --°',
  highLowLabel: '최고 --° / 최저 --°',
  conditionEmoji: '☁️',
  conditionLabel: '날씨 정보',
  weatherTheme: 'cloudy',
  dustGradeLabel: '알 수 없음',
  dustDetailLabel: '공기 정보를 확인하고 있어요',
  noPermissionMessage: '위치 권한이 없으면 현재 위치 기반 날씨를 불러올 수 없어요.',
  highlights: [],
}

function toDisplayTime(time: string | null | undefined) {
  if (!time) return null
  const [hours = '00', minutes = '00'] = time.split(':')
  return `${hours}:${minutes}`
}

function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateTime(dateTime: string | null | undefined) {
  if (!dateTime) return null
  const normalized = dateTime.replace(' ', 'T')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDueLabel(dueDateTime: string | null | undefined) {
  const dueDate = parseDateTime(dueDateTime)
  if (!dueDate) return undefined

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86400000)

  if (diffDays <= 0) return 'D-day'
  return `D-${diffDays}`
}

function isAllDaySummaryItem(item: EventSummaryItem) {
  const start = item.startTime ?? ''
  const end = item.endTime ?? ''

  return (
    (start === '00:00:00' || start === '00:00') &&
    (end === '24:00:00' ||
      end === '24:00' ||
      end === '23:59:59' ||
      end === '23:59')
  )
}

function buildBriefing(dateLabel: string, items: EventSummaryItem[]): AssistantBriefing {
  return {
    dateLabel,
    schedules: items
      .filter((item) => !item.startTime || !item.endTime || isAllDaySummaryItem(item))
      .map((item, index) => ({
        id: `schedule-${index}-${item.title}`,
        title: item.title,
        timeLabel: '',
      })),
    timeline: items
      .filter((item) => item.startTime && item.endTime && !isAllDaySummaryItem(item))
      .map((item, index) => ({
        id: `timeline-${index}-${item.title}`,
        title: item.title,
        timeRange: `${toDisplayTime(item.startTime)} ~ ${toDisplayTime(item.endTime)}`,
        accentColor: '',
        status: 'upcoming',
      })),
  }
}

function buildTaskBriefing(
  dateLabel: string,
  placedToday: TaskSummaryPlacedTodayItem[],
  dueToday: TaskSummaryDueTodayItem[],
): AssistantTaskBriefing {
  return {
    dateLabel,
    tasks: [
      ...placedToday
        .filter((item) => !item.placementTime)
        .map((item) => ({
          id: item.id,
          title: item.title,
          completed: item.complete,
          dueLabel: formatDueLabel(item.dueDateTime),
        })),
      ...dueToday.map((item) => ({
        id: item.id,
        title: item.title,
        completed: item.complete,
        dueLabel: formatDueLabel(item.dueDateTime),
      })),
    ],
    timeline: placedToday
      .filter((item) => !!item.placementTime)
      .map((item) => {
        const displayTime = toDisplayTime(item.placementTime) ?? '--:--'

        return {
          id: item.id,
          title: item.title,
          timeRange: `${displayTime} ~ ${displayTime}`,
          completed: item.complete,
          dueLabel: formatDueLabel(item.dueDateTime),
        }
      }),
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [isMypageActive, setIsMypageActive] = useState(false)
  const [isTransportActive, setIsTransportActive] = useState(false)
  const [tickerNow, setTickerNow] = useState(Date.now())
  const todayLabel = useToday('YYYY.MM.DD (dd)')
  const [briefing, setBriefing] = useState<AssistantBriefing>({
    dateLabel: todayLabel,
    schedules: [],
    timeline: [],
  })
  const [taskBriefing, setTaskBriefing] = useState<AssistantTaskBriefing>({
    dateLabel: todayLabel,
    tasks: [],
    timeline: [],
  })
  const {
    permissionDenied,
    coords,
    fetchCurrentLocation,
  } = useCurrentLocation()
  const {
    weatherCard,
    loading: weatherLoading,
    error: weatherError,
    fetchWeather,
  } = useHomeWeather()

  useFocusEffect(
    useCallback(() => {
      fetchCurrentLocation()
    }, [fetchCurrentLocation]),
  )

  useFocusEffect(
    useCallback(() => {
      let active = true

      const loadBriefing = async () => {
        try {
          const summaryItems = await fetchEventSummary()
          if (!active) return
          setBriefing(buildBriefing(todayLabel, summaryItems))
        } catch (error) {
          console.warn('event summary get error', error)
          if (!active) return
          setBriefing({
            dateLabel: todayLabel,
            schedules: [],
            timeline: [],
          })
        }
      }

      loadBriefing()

      return () => {
        active = false
      }
    }, [todayLabel]),
  )

  useFocusEffect(
    useCallback(() => {
      let active = true

      const loadTaskBriefing = async () => {
        try {
          const summary = await fetchTaskSummary()
          if (!active) return
          setTaskBriefing(buildTaskBriefing(todayLabel, summary.placedToday, summary.dueToday))
        } catch (error) {
          console.warn('task summary get error', error)
          if (!active) return
          setTaskBriefing({
            dateLabel: todayLabel,
            tasks: [],
            timeline: [],
          })
        }
      }

      loadTaskBriefing()

      return () => {
        active = false
      }
    }, [todayLabel]),
  )

  useEffect(() => {
    setBriefing((prev) => ({
      ...prev,
      dateLabel: todayLabel,
    }))
    setTaskBriefing((prev) => ({
      ...prev,
      dateLabel: todayLabel,
    }))
  }, [todayLabel])

  useEffect(() => {
    if (permissionDenied) {
      fetchWeather(SEOUL_COORDS)
      return
    }

    if (!coords) return

    fetchWeather({
      latitude: coords.latitude,
      longitude: coords.longitude,
    })
  }, [coords, fetchWeather, permissionDenied])

  const weatherHeadline = useMemo(() => {
    if (weatherLoading) {
      return permissionDenied ? '서울 날씨를 불러오고 있어요' : '오늘 날씨를 불러오고 있어요'
    }
    if (weatherError) return weatherError
    if (weatherCard) return weatherCard.headline
    return permissionDenied ? '서울 날씨를 준비하고 있어요' : '오늘 날씨를 준비하고 있어요'
  }, [permissionDenied, weatherCard, weatherError, weatherLoading])

  const rotatingHeadlines = useMemo(() => {
    if (weatherLoading) {
      return [permissionDenied ? '서울 날씨를 불러오고 있어요' : '오늘 날씨를 불러오고 있어요']
    }

    if (weatherError) return [weatherError]

    if (!weatherCard) {
      return [permissionDenied ? '서울 날씨를 준비하고 있어요' : '오늘 날씨를 준비하고 있어요']
    }

    const weatherMessage = weatherCard.headline
      .split(/그리고\s*미세먼지|미세먼지가/)
      .map((text) => text.trim())
      .find(Boolean) ?? weatherHeadline

    const dustMessage =
      weatherCard.dustDetailLabel?.trim()
        ? weatherCard.dustDetailLabel
        : `미세먼지 ${weatherCard.dustGradeLabel}`

    return [weatherMessage, dustMessage]
  }, [permissionDenied, weatherCard, weatherError, weatherHeadline, weatherLoading])

  useEffect(() => {
    if (rotatingHeadlines.length <= 1) return

    const timer = setInterval(() => {
      setTickerNow(Date.now())
    }, 50)

    return () => clearInterval(timer)
  }, [rotatingHeadlines.length])

  const elapsedMs = Math.max(0, tickerNow - headlineTickerOriginMs)
  const cycleIndex =
    rotatingHeadlines.length > 1
      ? Math.floor(elapsedMs / HEADLINE_TOTAL_MS) % rotatingHeadlines.length
      : 0
  const phaseMs =
    rotatingHeadlines.length > 1
      ? elapsedMs % HEADLINE_TOTAL_MS
      : 0
  const transitionProgress =
    phaseMs <= HEADLINE_HOLD_MS
      ? 0
      : Math.min(1, (phaseMs - HEADLINE_HOLD_MS) / HEADLINE_TRANSITION_MS)

  const currentHeadline = rotatingHeadlines[cycleIndex] ?? weatherHeadline
  const nextHeadline =
    rotatingHeadlines[(cycleIndex + 1) % rotatingHeadlines.length] ?? weatherHeadline
  const currentHeadlineStyle = {
    transform: [{ translateY: -52 * transitionProgress }],
    opacity: 1 - transitionProgress,
  }
  const nextHeadlineStyle = {
    transform: [{ translateY: 52 * (1 - transitionProgress) }],
    opacity: transitionProgress,
  }

  const weatherCardToRender = weatherCard ?? DEFAULT_WEATHER_CARD
  const handlePressTrafficAlerts = () => {
    navigation.navigate('TrafficAlerts')
  }

  const handlePressMypage = () => {
    navigation.navigate('MyPage')
  }

  const handlePressBriefing = () => {
    const todayIso = getLocalDateIso()

    currentCalendarView.set('day')
    ;(navigation as any).navigate('Calendar')

    setTimeout(() => {
      bus.emit('calendar:state', { date: todayIso, mode: 'day' })
      bus.emit('calendar:set-date', todayIso)
    }, 0)
  }

  const handleToggleTaskBriefingItem = useCallback(async (taskId: string, nextCompleted: boolean) => {
    setTaskBriefing((prev) => ({
      ...prev,
      tasks: prev.tasks.map((item) =>
        item.id === taskId ? { ...item, completed: nextCompleted } : item,
      ),
      timeline: prev.timeline.map((item) =>
        item.id === taskId ? { ...item, completed: nextCompleted } : item,
      ),
    }))

    try {
      await updateTask(taskId, { completed: nextCompleted })
    } catch (error) {
      console.warn('task briefing toggle error', error)
      setTaskBriefing((prev) => ({
        ...prev,
        tasks: prev.tasks.map((item) =>
          item.id === taskId ? { ...item, completed: !nextCompleted } : item,
        ),
        timeline: prev.timeline.map((item) =>
          item.id === taskId ? { ...item, completed: !nextCompleted } : item,
        ),
      }))
    }
  }, [])

  return (
    <SafeAreaView style={S.safeArea} edges={['top']}>
      <View style={S.container}>
        <ScrollView
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={S.contentBody}>
            <View style={S.headerRow}>
              <View style={S.headerTopRow}>
                <Text style={S.eyebrow}>안녕하세요, 사용자님</Text>

                <View style={S.headerActionRow}>
                  <Pressable
                    style={S.iconButton}
                    onPress={handlePressTrafficAlerts}
                    onPressIn={() => setIsTransportActive(true)}
                    onPressOut={() => setIsTransportActive(false)}
                  >
                    {isTransportActive ? (
                      <TransportYesIcon width={28} height={28} />
                    ) : (
                      <TransportNoIcon width={28} height={28} />
                    )}
                  </Pressable>

                  <Pressable
                    style={S.iconButton}
                    onPress={handlePressMypage}
                    onPressIn={() => setIsMypageActive(true)}
                    onPressOut={() => setIsMypageActive(false)}
                  >
                    {isMypageActive ? (
                      <MypageYesIcon width={28} height={28} />
                    ) : (
                      <MypageNoIcon width={28} height={28} />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={S.headerMessageBlock}>
                <View style={S.titleTickerWrap}>
                  <View style={[S.titleTickerText, currentHeadlineStyle]}>
                    <Text style={S.title}>{currentHeadline}</Text>
                  </View>
                  <View style={[S.titleTickerText, nextHeadlineStyle]}>
                    <Text style={S.title}>{nextHeadline}</Text>
                  </View>
                </View>
              </View>
            </View>

            <WeatherSummaryCard weather={weatherCardToRender} />

            <BriefingCard briefing={briefing} onPressScheduleArea={handlePressBriefing} />

            <NewsBannerCard item={assistantNews} />

            <TaskBriefingCard
              briefing={taskBriefing}
              onToggleTask={handleToggleTaskBriefingItem}
            />

            <View style={S.projectSection}>
              <Text style={S.projectSectionTitle}>프로젝트 스케줄</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.projectSliderContent}
              >
                {[0, 1, 2].map((item) => (
                  <View key={item} style={S.projectCard}>
                    <Text style={S.projectCardText}>준비중</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {assistantQuickActions.length > 0 ? (
              <QuickActionGrid
                items={assistantQuickActions}
                onPress={() => {}}
                iconMap={{}}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  headerRow: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerMessageBlock: {
    marginTop: 4,
  },
  eyebrow: {
    ...ts('label2'),
    fontSize: 17,
    lineHeight: 21,
    color: colors.text.text2,
  },
  title: {
    ...ts('titleL'),
    lineHeight: 28,
    color: colors.text.text1,
    maxWidth: 280,
    letterSpacing: -0.4,
  },
  titleTickerWrap: {
    height: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  titleTickerText: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 6,
    paddingBottom: 48,
  },
  contentBody: {
    paddingHorizontal: 17.5,
  },
  projectSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  projectSectionTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text.text1,
  },
  projectSliderContent: {
    paddingTop: 12,
    paddingRight: 20,
  },
  projectCard: {
    width: 300,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCardText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text.text3,
  },
})
