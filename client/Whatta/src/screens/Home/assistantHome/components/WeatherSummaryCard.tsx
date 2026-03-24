import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
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
  '알 수 없음': '#8CA0B3',
  좋음: '#4E7CF3',
  보통: '#67C73D',
  나쁨: '#FFAF38',
  '매우 나쁨': '#FF534B',
}

const weatherPanelTheme = {
  sunny: {
    colors: ['#4D89F7', '#7ECDF8'] as const,
    glow: 'rgba(255,255,255,0.20)',
  },
  cloudy: {
    colors: ['#7B9CB8', '#B9CBDA'] as const,
    glow: 'rgba(255,255,255,0.14)',
  },
  overcast: {
    colors: ['#7C8D9A', '#B1BDC7'] as const,
    glow: 'rgba(255,255,255,0.10)',
  },
  rainy: {
    colors: ['#77879A', '#AAB6C3'] as const,
    glow: 'rgba(255,255,255,0.08)',
  },
}

const dustPanelTheme: Record<string, string> = {
  '알 수 없음': '#F2F5F8',
  좋음: '#EEF2FF',
  보통: '#EFF7F1',
  나쁨: '#FFF3E8',
  '매우 나쁨': '#FFECEC',
}

export default function WeatherSummaryCard({ weather }: Props) {
  const indicatorLeft = dustIndicatorOffset[weather.dustGradeLabel] ?? 10
  const indicatorColor = dustAccentColor[weather.dustGradeLabel] ?? '#8CA0B3'
  const weatherTheme = weatherPanelTheme[weather.weatherTheme]
  const dustPanelColor = dustPanelTheme[weather.dustGradeLabel] ?? '#F2F5F8'
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
          <View style={[S.weatherGlow, { backgroundColor: weatherTheme.glow }]} />
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

        <View style={[S.dustPanel, { backgroundColor: dustPanelColor }]}>
          <View>
            <Text style={S.dustTitle}>미세먼지</Text>
            <Text style={S.dustGrade}>{weather.dustGradeLabel}</Text>
            <Text style={S.dustDescription}>{weather.dustDetailLabel}</Text>
          </View>

          <View style={S.dustBarTrack}>
            <View style={[S.dustBarSegment, S.dustBarBlue]} />
            <View style={[S.dustBarSegment, S.dustBarGreen]} />
            <View style={[S.dustBarSegment, S.dustBarOrange]} />
            <View style={[S.dustBarSegment, S.dustBarRed]} />
            <View style={[S.dustIndicator, { left: `${indicatorLeft}%` }]} />
            <View
              style={[
                S.dustIndicatorInner,
                { left: `${indicatorLeft}%`, backgroundColor: indicatorColor },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 26,
    padding: 8,
    backgroundColor: '#F9FBFC',
    borderWidth: 1,
    borderColor: '#EDF1F4',
    shadowColor: '#121A22',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
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
  weatherGlow: {
    position: 'absolute',
    top: -14,
    right: -10,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  divider: {
    width: 8,
  },
  dustPanel: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#F5F7FC',
    minHeight: 140,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'hidden',
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
  dustTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#50555B',
  },
  dustGrade: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#3D64D7',
    letterSpacing: -0.6,
    marginTop: 8,
  },
  dustDescription: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: '#6C7580',
    minHeight: 28,
    marginTop: 6,
  },
  dustBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
    marginTop: 10,
  },
  dustBarSegment: {
    flex: 1,
  },
  dustBarBlue: {
    backgroundColor: '#4E83F1',
  },
  dustBarGreen: {
    backgroundColor: '#75D33D',
  },
  dustBarOrange: {
    backgroundColor: '#FFB039',
  },
  dustBarRed: {
    backgroundColor: '#FF4C46',
  },
  dustIndicator: {
    position: 'absolute',
    top: -3,
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dustIndicatorInner: {
    position: 'absolute',
    top: 1,
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 999,
  },
})
