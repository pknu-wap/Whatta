import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type {
  AssistantWeatherCard,
  AssistantWeatherHighlight,
} from '@/screens/Home/assistantHome/types'

type Props = {
  weather: AssistantWeatherCard
}

const toneStyles: Record<
  AssistantWeatherHighlight['tone'],
  { backgroundColor: string; textColor: string }
> = {
  sunny: { backgroundColor: '#FFF3D6', textColor: '#A65A00' },
  rain: { backgroundColor: '#E1EEFF', textColor: '#235B9C' },
  wind: { backgroundColor: '#E8F7F1', textColor: '#18785A' },
  dust: { backgroundColor: '#EEF1D9', textColor: '#5B6A00' },
  neutral: { backgroundColor: '#EEF3F7', textColor: '#4F5B66' },
}

export default function WeatherSummaryCard({ weather }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % weather.highlights.length)
    }, 2600)

    return () => clearInterval(timer)
  }, [weather.highlights.length])

  const activeItem = weather.highlights[activeIndex]
  const activeTone = toneStyles[activeItem.tone]
  const compactTemperature = weather.currentTemperatureLabel.replace('현재 ', '')

  return (
    <View style={S.card}>
      <View style={S.topAccent} />
      <View style={S.bottomAccent} />

      <View style={S.topRow}>
        <View style={S.leftBlock}>
          <View style={S.identityRow}>
            <Text style={S.emoji}>{weather.conditionEmoji}</Text>
            <Text style={S.locationLabel}>{weather.locationLabel}</Text>
          </View>
          <Text style={S.summary} numberOfLines={2}>
            {weather.compactSummary}
          </Text>
        </View>

        <View style={S.rightBlock}>
          <Text style={S.currentTemperature}>{compactTemperature}</Text>
          <Text style={S.temperatureMeta}>{weather.highLowLabel}</Text>
        </View>
      </View>

      <View style={S.infoRow}>
        <View style={[S.infoChip, { backgroundColor: activeTone.backgroundColor }]}>
          <Text style={[S.infoChipLabel, { color: activeTone.textColor }]}>
            {activeItem.label}
          </Text>
          <Text style={S.infoChipValue} numberOfLines={1}>
            {activeItem.value}
          </Text>
        </View>

        <View style={S.deltaChip}>
          <Text style={S.deltaChipText}>{weather.comparedToYesterdayLabel}</Text>
        </View>
      </View>

      <View style={S.footerRow}>
        <View style={S.paginationRow}>
          {weather.highlights.map((item, index) => (
            <View
              key={item.id}
              style={[S.paginationDot, index === activeIndex && S.paginationDotActive]}
            />
          ))}
        </View>

        <Pressable style={S.permissionHint}>
          <Text style={S.permissionHintText}>위치 off</Text>
        </Pressable>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#E1EEF8',
    marginBottom: 14,
    shadowColor: '#90AFC9',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  topAccent: {
    position: 'absolute',
    top: -10,
    right: -4,
    width: 110,
    height: 66,
    borderRadius: 999,
    backgroundColor: '#DDEFFD',
  },
  bottomAccent: {
    position: 'absolute',
    bottom: -18,
    left: -12,
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(194, 227, 255, 0.35)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftBlock: {
    flex: 1,
    marginRight: 10,
  },
  rightBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    ...ts('body3'),
    color: '#6B8AA6',
    marginLeft: 4,
  },
  summary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#183B56',
    marginTop: 6,
    maxWidth: 196,
  },
  emoji: {
    fontSize: 16,
    lineHeight: 18,
  },
  currentTemperature: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
    color: '#183B56',
    textAlign: 'right',
    letterSpacing: -0.8,
  },
  temperatureMeta: {
    ...ts('body3'),
    color: '#7D98B2',
    marginTop: 4,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
  },
  infoChip: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 0,
  },
  deltaChip: {
    maxWidth: 104,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EAF3FB',
    justifyContent: 'center',
  },
  infoChipLabel: {
    ...ts('body3'),
    opacity: 0.95,
  },
  infoChipValue: {
    ...ts('body1'),
    color: colors.text.text1,
    marginTop: 5,
  },
  deltaChipText: {
    ...ts('body3'),
    color: '#4E6A85',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  paginationRow: {
    flexDirection: 'row',
  },
  paginationDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#BCD2E5',
    marginRight: 5,
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: '#3B82C4',
  },
  permissionHint: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#EEF5FB',
  },
  permissionHintText: {
    ...ts('body3'),
    color: '#7B95AD',
  },
})
