import React from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import type {
  AssistantNewsBanner,
  AssistantNewsBannerSlide,
} from '@/screens/Home/assistantHome/types'

type Props = {
  item: AssistantNewsBanner
}

const CARD_WIDTH = 358
const CARD_GAP = 10
const AUTO_SCROLL_MS = 3000

const slideThemes: Record<
  string,
  {
    colors: [string, string]
    badgeBg: string
    badgeText: string
    heroText: string
    heroTextColor: string
    titleColor: string
    bodyColor: string
  }
> = {
  'assistant-home': {
    colors: ['#FFFFFF', '#F3F8FF'],
    badgeBg: '#EAF4FF',
    badgeText: '#4C7CFF',
    heroText: 'HOME',
    heroTextColor: '#E5EEFF',
    titleColor: '#17191A',
    bodyColor: '#5D6670',
  },
  'ai-chat': {
    colors: ['#FFF7FC', '#FFF2F9'],
    badgeBg: '#F6E8FF',
    badgeText: '#9A43F5',
    heroText: 'AI',
    heroTextColor: '#F1E2FF',
    titleColor: '#17191A',
    bodyColor: '#6A6073',
  },
}

function getTheme(slide: AssistantNewsBannerSlide) {
  return slideThemes[slide.id] ?? slideThemes['assistant-home']
}

export default function NewsBannerCard({ item }: Props) {
  const scrollRef = React.useRef<ScrollView | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const slideCount = item.slides.length

  React.useEffect(() => {
    if (slideCount <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % slideCount
        scrollRef.current?.scrollTo({
          x: nextIndex * (CARD_WIDTH + CARD_GAP),
          animated: true,
        })
        return nextIndex
      })
    }, AUTO_SCROLL_MS)

    return () => clearInterval(timer)
  }, [slideCount])

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
    )
    setActiveIndex(nextIndex)
  }

  return (
    <View style={S.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.sliderContent}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {item.slides.map((slide) => {
          const theme = getTheme(slide)

          return (
            <LinearGradient
              key={slide.id}
              colors={theme.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.card}
            >
              <View style={S.heroTextWrap}>
                <Text style={[S.heroTextMain, { color: theme.heroTextColor }]}>
                  {theme.heroText}
                </Text>
              </View>

              <View style={S.topRow}>
                <View style={[S.badge, { backgroundColor: theme.badgeBg }]}>
                  <Text style={[S.badgeText, { color: theme.badgeText }]}>
                    {slide.badge}
                  </Text>
                </View>
              </View>

              <Text style={[S.title, { color: theme.titleColor }]}>{slide.title}</Text>
              <Text style={[S.body, { color: theme.bodyColor }]}>{slide.body}</Text>
            </LinearGradient>
          )
        })}
      </ScrollView>

      <View style={S.indicatorRow}>
        {item.slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[S.indicator, index === activeIndex ? S.indicatorActive : null]}
          />
        ))}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  sliderContent: {
    paddingRight: 28,
  },
  card: {
    width: CARD_WIDTH,
    height: 80,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: CARD_GAP,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7EEF2',
  },
  heroTextWrap: {
    position: 'absolute',
    right: 14,
    bottom: 8,
    alignItems: 'flex-end',
  },
  heroTextMain: {
    ...ts('titleL'),
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0,
    fontFamily: 'SF Pro Rounded',
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    ...ts('label4'),
  },
  title: {
    ...ts('titleS'),
    marginTop: 8,
    maxWidth: 182,
    fontSize: 16,
    lineHeight: 18,
  },
  body: {
    ...ts('body2'),
    marginTop: 2,
    maxWidth: 186,
    fontSize: 11,
    lineHeight: 14,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  indicator: {
    width: 8,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#B5C1CC',
    opacity: 0.45,
  },
  indicatorActive: {
    width: 18,
    backgroundColor: '#7A40FF',
    opacity: 1,
  },
})
