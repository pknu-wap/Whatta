import React from 'react'
import { View, Text, StyleSheet, Dimensions, Modal } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'

const { width, height } = Dimensions.get('window')

interface Props {
  visible: boolean
}

export default function OcrSplash({ visible }: Props) {
  // 별 애니메이션
  const star1 = useSharedValue(0)
  const star2 = useSharedValue(0)
  const star3 = useSharedValue(0)

  const starStyle = (v: any) =>
    useAnimatedStyle(() => ({
      opacity: v.value,
    }))

  React.useEffect(() => {
    star1.value = withRepeat(
      withSequence(withTiming(1, { duration: 1400 }), withTiming(0.3, { duration: 1200 })),
      -1
    )

    star2.value = withRepeat(
      withSequence(withTiming(1, { duration: 1600 }), withTiming(0.3, { duration: 1000 })),
      -1
    )

    star3.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0.3, { duration: 1400 })),
      -1
    )
  }, [])

  React.useEffect(() => {
  const dotInterval = setInterval(() => {
    setDots(prev => (prev.length === 3 ? '' : prev + '.'));
  }, 450);

  return () => clearInterval(dotInterval);
}, []);

  const [dots, setDots] = React.useState('');

return (
  <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
    <View style={S.fill}>
      <View style={S.background} />

      <Animated.Image
        source={require('@/assets/ocrsplash.png')}
        style={S.arc}
        resizeMode="cover"
      />

      <Animated.Image
        source={require('@/assets/star.png')}
        style={[S.star, S.star1, starStyle(star1)]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require('@/assets/star.png')}
        style={[S.star, S.star2, starStyle(star2)]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require('@/assets/star.png')}
        style={[S.star, S.star3, starStyle(star3)]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require('@/assets/whatta_logo4.png')}
        style={S.logo}
        resizeMode="contain"
      />

      <Text style={S.loadingText}>일정을 추가하는 중{dots}</Text>
    </View>
  </Modal>
)
}

const S = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B04FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B04FFF',
  },

arc: {
  position: 'absolute',
  width: width ,
  height: width * (800.664 / 466.778), 
  left: -width * 0.2,     // 왼쪽으로 밀기
  bottom: -height * 0.0, // 아래로 밀기 (왼쪽 아래 기준)
  opacity: 1,
  transform: [{ rotate: '15deg' }],
},

  // ⭐ 별 스타일
star: {
  position: 'absolute',
},

star1: {
  width: 50,
  height: 50,
  left: 280,
  top: 270,
},

star2: {
  width: 80,
  height: 80,
  left: 35,
  top: 460,
},

star3: {
  width: 60,
  height: 60,
  left: 310,
  top: 580,
},

  logo: {
    width: 147.49,
    height: 150,
    marginBottom: 20,
  },

  loadingText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    textShadowColor: 'rgba(82, 82, 82, 0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
})