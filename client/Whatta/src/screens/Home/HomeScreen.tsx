import React from 'react'
import { useCallback, useEffect, useMemo } from 'react'
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
import MypageIcon from '@/assets/icons/mypage.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type { RootStackParamList } from '@/navigation/RootStack'
import {
  assistantBriefing,
  assistantNews,
  assistantQuickActions,
  assistantTopicSlides,
  assistantTransitStatus,
} from '@/screens/Home/assistantHome/mockData'
import type { AssistantQuickAction } from '@/screens/Home/assistantHome/types'
import NewsBannerCard from '@/screens/Home/assistantHome/components/NewsBannerCard'
import QuickActionGrid from '@/screens/Home/assistantHome/components/QuickActionGrid'
import BriefingCard from '@/screens/Home/assistantHome/components/BriefingCard'
import TopicSlidesSection from '@/screens/Home/assistantHome/components/TopicSlidesSection'
import WeatherSummaryCard from '@/screens/Home/assistantHome/components/WeatherSummaryCard'
import TransitStatusCard from '@/screens/Home/assistantHome/components/TransitStatusCard'
import useCurrentLocation from '@/hooks/useCurrentLocation'
import useHomeWeather from '@/hooks/useHomeWeather'

const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const {
    loading,
    permissionDenied,
    coords,
    error,
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

  const handleQuickActionPress = (action: AssistantQuickAction) => {
    switch (action.id) {
      case 'mypage':
        navigation.navigate('MyPage')
        return
    }
  }

  return (
    <SafeAreaView style={S.safeArea} edges={['top']}>
      <View style={S.container}>
        <View style={S.headerRow}>
          <View style={S.headerTextBlock}>
            <Text style={S.eyebrow}>안녕하세요, 사용자님</Text>
            <Text style={S.title}>{weatherHeadline}</Text>
          </View>

          <Pressable style={S.iconButton} onPress={() => navigation.navigate('MyPage')}>
            <MypageIcon width={22} height={22} color={colors.icon.selected} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {weatherCard ? (
            <WeatherSummaryCard weather={weatherCard} />
          ) : null}

          <BriefingCard briefing={assistantBriefing} />

          <NewsBannerCard item={assistantNews} />

          <TransitStatusCard
            item={assistantTransitStatus}
            onPress={() => navigation.navigate('TrafficAlerts')}
          />

          <QuickActionGrid
            items={assistantQuickActions}
            onPress={handleQuickActionPress}
            iconMap={{
              mypage: <MypageIcon width={18} height={18} color={colors.text.text1} />,
            }}
          />
          <TopicSlidesSection
            items={assistantTopicSlides}
            onPressItem={(topicId) => navigation.navigate('AssistantTopicTasks', { topicId })}
          />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#7D858C',
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.text.text1,
    marginTop: 8,
    maxWidth: 280,
    letterSpacing: -0.2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg1,
    shadowColor: '#17324D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
})
