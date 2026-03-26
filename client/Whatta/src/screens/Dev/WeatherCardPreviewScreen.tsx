import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootStack'
import colors from '@/styles/colors'

type PreviewTheme = 'sunny' | 'sunnyNight' | 'cloudy' | 'overcast' | 'rainy' | 'snowy'

type PreviewCard = {
  id: string
  name: string
  currentTemperatureLabel: string
  feelsLikeLabel: string
  highLowLabel: string
  conditionEmoji: string
  theme: PreviewTheme
}

const sunnyPreviewCards: PreviewCard[] = [
  {
    id: 'sunny',
    name: '맑음',
    currentTemperatureLabel: '27°',
    feelsLikeLabel: '체감 26°',
    highLowLabel: '최고 29° / 최저 21°',
    conditionEmoji: '☀️',
    theme: 'sunny',
  },
  {
    id: 'sunny-night',
    name: '맑음(밤)',
    currentTemperatureLabel: '21°',
    feelsLikeLabel: '체감 20°',
    highLowLabel: '최고 24° / 최저 17°',
    conditionEmoji: '☀️',
    theme: 'sunnyNight',
  },
]

const weatherPreviewCards: PreviewCard[] = [
  {
    id: 'cloudy',
    name: '구름',
    currentTemperatureLabel: '22°',
    feelsLikeLabel: '체감 21°',
    highLowLabel: '최고 24° / 최저 18°',
    conditionEmoji: '⛅️',
    theme: 'cloudy',
  },
  {
    id: 'overcast',
    name: '흐림',
    currentTemperatureLabel: '19°',
    feelsLikeLabel: '체감 18°',
    highLowLabel: '최고 20° / 최저 16°',
    conditionEmoji: '☁️',
    theme: 'overcast',
  },
  {
    id: 'rainy',
    name: '비',
    currentTemperatureLabel: '17°',
    feelsLikeLabel: '체감 15°',
    highLowLabel: '최고 18° / 최저 13°',
    conditionEmoji: '🌧️',
    theme: 'rainy',
  },
  {
    id: 'snowy',
    name: '눈',
    currentTemperatureLabel: '5°',
    feelsLikeLabel: '체감 2°',
    highLowLabel: '최고 8° / 최저 -1°',
    conditionEmoji: '❄️',
    theme: 'snowy',
  },
]

const dustPreviewCards = [
  { id: 'dust-good', label: '좋음', count: 0 },
  { id: 'dust-normal', label: '보통', count: 2 },
  { id: 'dust-bad', label: '나쁨', count: 4 },
  { id: 'dust-worst', label: '매우 나쁨', count: 7 },
] as const

const dustPreviewTheme = {
  좋음: {
    panel: ['#EDF7FF', '#BDD9FF'] as const,
    text: '#4F7BFF',
  },
  보통: {
    panel: ['#ECFFF4', '#BEEFD1'] as const,
    text: '#34C98D',
  },
  나쁨: {
    panel: ['#FFF5E7', '#FFD19A'] as const,
    text: '#FFAA47',
  },
  '매우 나쁨': {
    panel: ['#FFF0F4', '#FFB5C6'] as const,
    text: '#FF5E7A',
  },
} as const

const themePalette: Record<PreviewTheme, readonly [string, string]> = {
  sunny: ['#F67E6A', '#FFB74B'],
  sunnyNight: ['#264A98', '#1A2F73'],
  cloudy: ['#63B5F6', '#418BEF'],
  overcast: ['#879AAF', '#6D829B'],
  rainy: ['#6B63BA', '#4F54A1'],
  snowy: ['#40B8FF', '#1A9EEE'],
}

function FlowBands({
  tone,
}: {
  tone: 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'night'
}) {
  const palette = {
    cloudy: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.24)'],
    overcast: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.18)'],
    rainy: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.16)'],
    snowy: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.13)', 'rgba(255,255,255,0.2)'],
    night: ['rgba(74,96,174,0.40)', 'rgba(106,128,207,0.24)', 'rgba(255,255,255,0.08)'],
  }[tone]

  return (
    <Svg
  width="100%"
  height="100%"
  viewBox="0 0 180 86"
  preserveAspectRatio="none"
>
  {/* 메인 흰 면 */}
  <Path
    d="
      M42 0
      C42 10 44 18 52 22
      C64 28 80 24 96 22
      C112 20 126 28 138 36
      C150 44 164 46 180 44
      V0
      Z
    "
    fill="rgba(255,255,255,0.15)"
  />

  {/* 위쪽 하이라이트 */}
  <Path
    d="
      M78 0
      C78 7 80 12 86 15
      C96 20 108 18 120 18
      C136 18 152 24 180 34
      V0
      Z
    "
    fill="rgba(255,255,255,0.08)"
  />
</Svg>
  )
}

function WeatherBackdrop({ theme }: { theme: PreviewTheme }) {
  if (theme === 'sunny') {
    return (
      <>
        <View style={S.sunWaveOne} />
        <View style={S.sunWaveTwo} />
        <View style={S.sunCore} />
        <View style={S.sunHaloLarge} />
      </>
    )
  }

  if (theme === 'sunnyNight') {
    return (
      <>
        <View style={S.nightMoonGlow} />
        <View style={S.nightMoon} />
      </>
    )
  }

  if (theme === 'cloudy') {
    return (
      <View style={S.topBands}>
        <FlowBands tone="cloudy" />
      </View>
    )
  }

  if (theme === 'overcast') {
    return (
      <View style={S.topBands}>
        <FlowBands tone="overcast" />
      </View>
    )
  }

  if (theme === 'rainy') {
    return (
      <>
        <View style={S.topBands}>
          <FlowBands tone="rainy" />
        </View>
        <View style={[S.rainLine, S.rainLineOne]} />
        <View style={[S.rainLine, S.rainLineTwo]} />
        <View style={[S.rainLine, S.rainLineThree]} />
      </>
    )
  }

  return (
    <>
      <View style={S.topBands}>
        <FlowBands tone="snowy" />
      </View>
      <View style={[S.snowDot, S.snowDotOne]} />
      <View style={[S.snowDot, S.snowDotTwo]} />
      <View style={[S.snowDot, S.snowDotThree]} />
      <View style={[S.snowDot, S.snowDotFour]} />
    </>
  )
}

function WeatherPreviewTile({ card }: { card: PreviewCard }) {
  return (
    <View style={S.tileWrap}>
      <Text style={S.tileLabel}>{card.name}</Text>

      <LinearGradient
        colors={themePalette[card.theme]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.tile}
      >
        <WeatherBackdrop theme={card.theme} />

        <View style={S.weatherInfo}>
          <View style={S.temperatureRow}>
            <Text style={S.currentTemperature}>{card.currentTemperatureLabel}</Text>
            <Text style={S.emoji}>{card.conditionEmoji}</Text>
          </View>

          <View style={S.metricsBlock}>
            <Text style={S.metricText}>{card.feelsLikeLabel}</Text>
            <Text style={S.metricText}>{card.highLowLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}

function CircleBackdrop({ theme }: { theme: PreviewTheme }) {
  if (theme === 'sunny') {
    return (
      <>
        <View style={S.circleSunLarge} />
        <View style={S.circleSunSmall} />
      </>
    )
  }

  if (theme === 'sunnyNight') {
    return (
      <>
        <View style={S.circleNightLarge} />
        <View style={S.circleNightSmall} />
      </>
    )
  }

  if (theme === 'cloudy') {
    return (
      <>
        <View style={S.circleCloudLarge} />
        <View style={S.circleCloudMid} />
      </>
    )
  }

  if (theme === 'overcast') {
    return (
      <>
        <View style={S.circleOvercastLarge} />
        <View style={S.circleOvercastMid} />
      </>
    )
  }

  if (theme === 'rainy') {
    return (
      <>
        <View style={S.circleRainLarge} />
        <View style={S.circleRainMid} />
      </>
    )
  }

  return (
    <>
      <View style={S.circleSnowLarge} />
      <View style={S.circleSnowMid} />
    </>
  )
}

function CirclePreviewTile({ card }: { card: PreviewCard }) {
  return (
    <View style={S.tileWrap}>
      <Text style={S.tileLabel}>{card.name}</Text>

      <LinearGradient
        colors={themePalette[card.theme]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.tile}
      >
        <CircleBackdrop theme={card.theme} />

        <View style={S.weatherInfo}>
          <View style={S.temperatureRow}>
            <Text style={S.currentTemperature}>{card.currentTemperatureLabel}</Text>
            <Text style={S.emoji}>{card.conditionEmoji}</Text>
          </View>

          <View style={S.metricsBlock}>
            <Text style={S.metricText}>{card.feelsLikeLabel}</Text>
            <Text style={S.metricText}>{card.highLowLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}

function DustCluster({ size = 36 }: { size?: number }) {
  const dot = Math.round(size * 0.28)

  return (
    <View style={[S.dustCluster, { width: size, height: size }]}>
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, top: 0, left: size * 0.36 }]} />
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, top: size * 0.18, left: size * 0.1 }]} />
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, top: size * 0.18, right: size * 0.1 }]} />
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, bottom: size * 0.18, left: size * 0.14 }]} />
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, bottom: size * 0.18, right: size * 0.14 }]} />
      <View style={[S.dustDot, { width: dot, height: dot, borderRadius: dot / 2, bottom: 0, left: size * 0.36 }]} />
    </View>
  )
}

function DustPreviewTile({
  label,
  count,
}: {
  label: string
  count: number
}) {
  const theme = dustPreviewTheme[label as keyof typeof dustPreviewTheme] ?? {
    panel: ['#F2F6FA', '#E3EBF2'] as const,
    text: '#8B98A7',
  }
  const positions = [
    { bottom: 18, right: 18, size: 28 },
    { bottom: 34, right: 52, size: 24 },
    { bottom: 50, right: 12, size: 22 },
    { bottom: 60, right: 66, size: 24 },
    { bottom: 78, right: 38, size: 20 },
    { bottom: 92, right: 8, size: 18 },
    { bottom: 98, right: 68, size: 16 },
  ]

  return (
    <View style={S.tileWrap}>
      <Text style={S.tileLabel}>{label}</Text>
      <LinearGradient
        colors={theme.panel}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.dustPreviewTile}
      >
        <View style={S.dustPreviewGlowLarge} />
        <View style={S.dustPreviewGlowSmall} />
        <View style={S.dustPreviewContent}>
          <Text style={S.dustPreviewTitle}>미세먼지</Text>
          <Text style={[S.dustPreviewGrade, { color: theme.text }]}>{label}</Text>
        </View>

        {positions.slice(0, count).map((position, index) => (
          <View
            key={`${label}-${index}`}
            style={[
              S.dustPreviewClusterWrap,
              {
                bottom: position.bottom,
                right: position.right,
                opacity: 0.16 + index * 0.08,
              },
            ]}
          >
            <DustCluster size={position.size} />
          </View>
        ))}

        <View style={S.dustPreviewBar}>
          <LinearGradient
            colors={['#6D8EFF', '#63DA9D', '#FFB658', '#FF6C87']}
            locations={[0, 0.33, 0.68, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={S.dustPreviewBarGradient}
          />
        </View>
      </LinearGradient>
    </View>
  )
}

export default function WeatherCardPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <SafeAreaView style={S.safeArea} edges={['top']}>
      <View style={S.container}>
        <View style={S.header}>
          <Pressable onPress={() => navigation.goBack()} style={S.backButton}>
            <Text style={S.backText}>닫기</Text>
          </Pressable>
          <Text style={S.headerTitle}>날씨 배경 시안</Text>
          <Text style={S.headerBody}>
            홈에서 쓰는 날씨 박스 크기와 텍스트 구조는 유지하고, 뒤 배경만 비교할 수 있게 모아뒀어요.
          </Text>
        </View>

        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
          <Text style={S.sectionLabel}>맑음</Text>
          <View style={S.grid}>
            {sunnyPreviewCards.map((card) => (
              <WeatherPreviewTile key={card.id} card={card} />
            ))}
          </View>

          <View style={S.gridSection}>
            <Text style={S.sectionLabel}>날씨 변화</Text>
            <View style={S.grid}>
              {weatherPreviewCards.map((card) => (
                <WeatherPreviewTile key={card.id} card={card} />
              ))}
            </View>
          </View>

          <View style={S.gridSection}>
            <Text style={S.sectionLabel}>원형 레이어 안</Text>
            <View style={S.grid}>
              {[...sunnyPreviewCards, ...weatherPreviewCards].map((card) => (
                <CirclePreviewTile key={`${card.id}-circle`} card={card} />
              ))}
            </View>
          </View>

          <View style={S.gridSection}>
            <Text style={S.sectionLabel}>미세먼지 입자 안</Text>
            <View style={S.grid}>
              {dustPreviewCards.map((item) => (
                <DustPreviewTile key={item.id} label={item.label} count={item.count} />
              ))}
            </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EAF1F6',
  },
  backText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: '#57606A',
  },
  headerTitle: {
    marginTop: 14,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text.text1,
    letterSpacing: -0.4,
  },
  headerBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6E7781',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: '#6D7884',
  },
  gridSection: {
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  tileWrap: {
    width: '48%',
  },
  tileLabel: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#5D6975',
  },
  tile: {
    borderRadius: 20,
    padding: 16,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  weatherInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -6,
  },
  temperatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTemperature: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  emoji: {
    fontSize: 48,
    lineHeight: 52,
    marginLeft: 8,
    marginTop: 2,
  },
  metricsBlock: {
    marginTop: 10,
  },
  metricText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: 'rgba(248,252,255,0.88)',
    marginTop: 5,
  },
  topBands: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 86,
  zIndex: 0,
  pointerEvents: 'none',
},
  sunWaveOne: {
    position: 'absolute',
    right: -34,
    top: -44,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,210,108,0.22)',
  },
  sunWaveTwo: {
    position: 'absolute',
    right: 18,
    top: -12,
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: 'rgba(255,174,92,0.16)',
  },
  sunCore: {
    position: 'absolute',
    right: 24,
    top: -18,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,217,110,0.92)',
  },
  sunHaloLarge: {
    position: 'absolute',
    right: -18,
    top: -52,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(255,199,103,0.18)',
  },
  circleSunLarge: {
    position: 'absolute',
    right: -8,
    top: -28,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(255,223,155,0.28)',
  },
  circleSunSmall: {
    position: 'absolute',
    right: 34,
    top: -8,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  nightMoonGlow: {
    position: 'absolute',
    right: -2,
    top: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(244,223,142,0.08)',
  },
  nightMoon: {
    position: 'absolute',
    right: 18,
    top: -20,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(246,220,127,0.94)',
  },
  circleNightLarge: {
    position: 'absolute',
    right: -12,
    top: -32,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(92,121,214,0.24)',
  },
  circleNightSmall: {
    position: 'absolute',
    right: 36,
    top: -6,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleCloudLarge: {
    position: 'absolute',
    right: -18,
    top: -34,
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(224,242,255,0.20)',
  },
  circleCloudMid: {
    position: 'absolute',
    left: -34,
    top: 16,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleOvercastLarge: {
    position: 'absolute',
    right: -14,
    top: -28,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(225,233,241,0.14)',
  },
  circleOvercastMid: {
    position: 'absolute',
    left: -26,
    top: 18,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleRainLarge: {
    position: 'absolute',
    right: -10,
    top: -24,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(203,200,255,0.14)',
  },
  circleRainMid: {
    position: 'absolute',
    left: -24,
    bottom: -42,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleSnowLarge: {
    position: 'absolute',
    right: -12,
    top: -28,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(227,248,255,0.16)',
  },
  circleSnowMid: {
    position: 'absolute',
    left: -20,
    bottom: -38,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dustPreviewTile: {
    borderRadius: 20,
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
    padding: 16,
  },
  dustPreviewGlowLarge: {
    position: 'absolute',
    right: -18,
    top: -20,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(79,123,255,0.10)',
  },
  dustPreviewGlowSmall: {
    position: 'absolute',
    left: 12,
    bottom: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  dustPreviewContent: {
    zIndex: 1,
  },
  dustPreviewTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#50555B',
  },
  dustPreviewGrade: {
    marginTop: 10,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: '#4F7BFF',
  },
  dustPreviewClusterWrap: {
    position: 'absolute',
  },
  dustCluster: {
    position: 'relative',
  },
  dustDot: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dustPreviewBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  dustPreviewBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  sunnyNightGlowOne: {
    position: 'absolute',
    right: -20,
    top: 0,
    width: 180,
    height: 84,
    borderRadius: 999,
    backgroundColor: 'rgba(64,88,166,0.32)',
    transform: [{ rotate: '6deg' }],
  },
  sunnyNightGlowTwo: {
    position: 'absolute',
    left: -12,
    top: 10,
    width: 236,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-2deg' }],
  },
  rainLine: {
    position: 'absolute',
    width: 2,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '15deg' }],
  },
  rainLineOne: {
    top: 42,
    right: 32,
  },
  rainLineTwo: {
    top: 30,
    right: 58,
  },
  rainLineThree: {
    top: 42,
    right: 84,
  },
  snowDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  snowDotOne: {
    width: 8,
    height: 8,
    top: 40,
    right: 42,
  },
  snowDotTwo: {
    width: 6,
    height: 6,
    top: 54,
    right: 68,
  },
  snowDotThree: {
    width: 10,
    height: 10,
    top: 82,
    right: 26,
  },
  snowDotFour: {
    width: 7,
    height: 7,
    top: 96,
    right: 84,
  },
})
