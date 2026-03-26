import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import colors from '@/styles/colors'
import type { AssistantWeatherCard } from '@/screens/Home/assistantHome/types'

type Props = {
  weather: AssistantWeatherCard
}

const dustIndicatorOffset: Record<string, number> = {
  '알 수 없음': 10,
  좋음: 18,
  보통: 42,
  나쁨: 68,
  '매우 나쁨': 88,
}

const dustAccentColor: Record<string, string> = {
  '알 수 없음': '#8B98A7',
  좋음: '#4F7BFF',
  보통: '#34C98D',
  나쁨: '#FFAA47',
  '매우 나쁨': '#FF5E7A',
}

const weatherPanelTheme = {
  sunny: {
    colors: ['#FF9C78', '#FFC66C'] as const,
    largeCircle: 'rgba(255,223,155,0.28)',
    smallCircle: 'rgba(255,255,255,0.10)',
  },
  cloudy: {
    colors: ['#74BCF8', '#6797F0'] as const,
    largeCircle: 'rgba(224,242,255,0.20)',
    smallCircle: 'rgba(255,255,255,0.08)',
  },
  overcast: {
    colors: ['#99AEC4', '#7A92AE'] as const,
    largeCircle: 'rgba(225,233,241,0.14)',
    smallCircle: 'rgba(255,255,255,0.07)',
  },
  rainy: {
    colors: ['#7A73D0', '#6268BB'] as const,
    largeCircle: 'rgba(203,200,255,0.14)',
    smallCircle: 'rgba(255,255,255,0.06)',
  },
}

const dustPanelTheme: Record<string, readonly [string, string]> = {
  '알 수 없음': ['#F2F6FA', '#E3EBF2'],
  좋음: ['#EDF7FF', '#BDD9FF'],
  보통: ['#ECFFF4', '#BEEFD1'],
  나쁨: ['#FFF5E7', '#FFD19A'],
  '매우 나쁨': ['#FFF0F4', '#FFB5C6'],
}

const dustBarColors = ['#6D8EFF', '#63DA9D', '#FFB658', '#FF6C87'] as const
const dustBarLocations = [0, 0.33, 0.68, 1] as const
const defaultDustPanelColors = ['#F2F6FA', '#E3EBF2'] as const

export default function WeatherSummaryCard({ weather }: Props) {
  const indicatorLeft = dustIndicatorOffset[weather.dustGradeLabel] ?? 10
  const indicatorColor = dustAccentColor[weather.dustGradeLabel] ?? '#8CA0B3'
  const weatherTheme = weatherPanelTheme[weather.weatherTheme]
  const dustPanelColors = dustPanelTheme[weather.dustGradeLabel] ?? defaultDustPanelColors
  const currentTemperature = weather.currentTemperatureLabel.replace('현재 ', '')
  const feelsLike = weather.feelsLikeLabel.replace('체감 ', '체감 ')
  const [, highText = '--°', lowText = '--°'] =
    weather.highLowLabel.match(/최고\s([^/]+)\s\/\s최저\s(.+)/) ?? []

  return (
    <View style={S.wrap}>
      <View style={S.card}>
        <LinearGradient
          colors={weatherTheme.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.weatherPanel}
        >
          <View style={[S.weatherCircleLarge, { backgroundColor: weatherTheme.largeCircle }]} />
          <View style={[S.weatherCircleSmall, { backgroundColor: weatherTheme.smallCircle }]} />
          <View style={S.weatherInfo}>
            <View style={S.temperatureRow}>
              <Text style={S.currentTemperature}>{currentTemperature}</Text>
              <Text style={S.emoji}>{weather.conditionEmoji}</Text>
            </View>

            <View style={S.metricsBlock}>
              <Text style={S.metricText}>{feelsLike}</Text>
              <Text style={S.metricText}>
                최고 {highText} / 최저 {lowText}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={S.divider} />

        <LinearGradient
          colors={dustPanelColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.dustPanel}
        >
          <View style={S.dustContent}>
            <Text style={S.dustTitle}>미세먼지</Text>
            <Text style={[S.dustGradeText, { color: indicatorColor }]}>{weather.dustGradeLabel}</Text>
          </View>

          <View style={S.dustBarWrap}>
            <View style={S.dustBarTrack}>
              <LinearGradient
                colors={dustBarColors}
                locations={dustBarLocations}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={S.dustBarGradient}
              />
            </View>
            <View style={[S.dustIndicator, { left: `${indicatorLeft}%` }]} />
          </View>
        </LinearGradient>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 26,
    padding: 8,
    backgroundColor: colors.background.bg1,
  },
  weatherPanel: {
    flex: 1.18,
    borderRadius: 20,
    padding: 16,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  weatherCircleLarge: {
    position: 'absolute',
    right: -16,
    top: -26,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  weatherCircleSmall: {
    position: 'absolute',
    left: -24,
    bottom: -34,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  divider: {
    width: 8,
  },
  dustPanel: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 140,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  emoji: {
    fontSize: 48,
    lineHeight: 52,
    marginLeft: 8,
    marginTop: 2,
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
  metricsBlock: {
    marginTop: 10,
  },
  metricText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: 'rgba(248,252,255,0.86)',
    marginTop: 5,
  },
  dustContent: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    zIndex: 1,
  },
  dustTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#50555B',
    marginTop: 6,
    textAlign: 'right',
  },
  dustGradeText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 10,
    textAlign: 'right',
  },
  dustBarWrap: {
    width: '100%',
    position: 'relative',
    marginTop: 10,
    height: 18,
    justifyContent: 'center',
    zIndex: 1,
  },
  dustBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  dustBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  dustIndicator: {
    position: 'absolute',
    top: 0,
    marginLeft: -2.5,
    width: 5,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
})
