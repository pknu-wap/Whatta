import React, { useEffect, useState } from 'react'
import { View, Image, StyleSheet, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'

export default function CustomSplash({ onFinish }: { onFinish: () => void }) {
  // 애니메이션 값
  const translateY = useSharedValue(-40)
  const opacity = useSharedValue(0)

  // 타이핑용 상태
  const [typed, setTyped] = useState('')
  const fullText = 'Whatta'

  // 로고 슬라이드 + 페이드
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  useEffect(() => {
    // 1) 로고 등장
    opacity.value = withTiming(1, { duration: 600 })
    translateY.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    })

    // 2) 로고 등장 후, 텍스트 타이핑 시작
    setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        setTyped(fullText.slice(0, i))
        i++
        if (i > fullText.length) clearInterval(interval)
      }, 90)
    }, 600)

    // 3) 종료 & 화면 전환 (2.2초 뒤)
    setTimeout(() => {
      onFinish()
    }, 2200)
  }, [])

  return (
    <View style={S.container}>
      <Animated.Image
        source={require('@/assets/whatta_logo3.png')}
        style={[S.logo, logoStyle]}
        resizeMode="contain"
      />
      <Text style={S.text}>{typed}</Text>
    </View>
  )
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  text: {
    fontSize: 39,
    fontWeight: '600',
    color: '#B04FFF',
    fontFamily: 'Righteous',
  },
})
