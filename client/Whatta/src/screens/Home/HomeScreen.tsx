import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
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
  assistantWeather,
} from '@/screens/Home/assistantHome/mockData'
import type { AssistantQuickAction } from '@/screens/Home/assistantHome/types'
import NewsBannerCard from '@/screens/Home/assistantHome/components/NewsBannerCard'
import QuickActionGrid from '@/screens/Home/assistantHome/components/QuickActionGrid'
import BriefingCard from '@/screens/Home/assistantHome/components/BriefingCard'
import TopicSlidesSection from '@/screens/Home/assistantHome/components/TopicSlidesSection'
import WeatherSummaryCard from '@/screens/Home/assistantHome/components/WeatherSummaryCard'
import TransitStatusCard from '@/screens/Home/assistantHome/components/TransitStatusCard'

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

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
          <View>
            <Text style={S.eyebrow}>WHATTA ASSISTANT</Text>
            <Text style={S.title}>비서홈</Text>
          </View>

          <Pressable style={S.iconButton} onPress={() => navigation.navigate('MyPage')}>
            <MypageIcon width={22} height={22} color={colors.icon.selected} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <WeatherSummaryCard weather={assistantWeather} />

          <BriefingCard briefing={assistantBriefing} />

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

          <NewsBannerCard item={assistantNews} />

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  eyebrow: {
    ...ts('body3'),
    color: colors.brand.secondary,
    letterSpacing: 0.8,
  },
  title: {
    ...ts('titleL'),
    color: colors.text.text1,
    marginTop: 6,
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
})
