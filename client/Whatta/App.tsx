import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ActivityIndicator, View, Text, StyleSheet, Animated, StatusBar } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import RootStack from '@/navigation/RootStack'
import { ensureAuthReady } from '@/app/bootstrap'
import { DrawerProvider } from '@/providers/DrawerProvider'
import { LabelProvider } from '@/providers/LabelProvider'
import { LabelFilterProvider } from '@/providers/LabelFilterProvider'
import messaging from '@react-native-firebase/messaging'
import CustomSplash from '@/screens/CustomSplash'
import { SafeAreaProvider,useSafeAreaInsets } from 'react-native-safe-area-context'

// 포그라운드 메시지 핸들러
// messaging().onMessage(async (remoteMessage) => {
//   console.log('Foreground Message received:', remoteMessage)
//   Alert.alert('[FCM] Foreground Message received:', JSON.stringify(remoteMessage))
// })

function ForegroundBanner({
  message,
  onHide,
  topInset,
}: {
  message: { title: string; body: string } | null
  onHide: () => void
  topInset: number
}) {
  const translateY = useRef(new Animated.Value(-120)).current 

  useEffect(() => {
    if (!message) return

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide()
    })
  }, [message, onHide, translateY])

  if (!message) return null

  return (
    <Animated.View
      style={[
        S.banner,
        {
          top: topInset + 6, // 다이나믹 아일랜드/노치 아래로 내림
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={S.title}>{message.title}</Text>
      {!!message.body && <Text style={S.body}>{message.body}</Text>}
    </Animated.View>
  )
}

export default function App() {
  const insets = useSafeAreaInsets()
  const [ready, setReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)

  const [fgMsg, setFgMsg] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        await ensureAuthReady()
      } finally {
        setReady(true)
      }
    })()
  }, [])

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground Message received:', remoteMessage)

      const toStr = (v: unknown): string | undefined => {
        if (v == null) return undefined
        if (typeof v === 'string') return v
        try {
          return JSON.stringify(v)
        } catch {
          return String(v)
        }
      }

      const title =
        remoteMessage.notification?.title ||
        toStr(remoteMessage.data?.title) ||
        '알림'

      const body =
        remoteMessage.notification?.body ||
        toStr(remoteMessage.data?.body) ||
        ''

      setFgMsg({ title, body })
    })

    return unsubscribe
  }, [])

  if (!ready || !splashDone) {
    return (
      // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      //   <ActivityIndicator size="large" />
      // </View>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CustomSplash onFinish={() => setSplashDone(true)} />
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ForegroundBanner 
      message={fgMsg} onHide={() => setFgMsg(null)}
      topInset={insets.top}
      />
      <LabelProvider>
        <LabelFilterProvider>
          <DrawerProvider>
            <NavigationContainer>
              <RootStack />
            </NavigationContainer>
          </DrawerProvider>
        </LabelFilterProvider>
      </LabelProvider>
    </GestureHandlerRootView>
  )
}

const S = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,

    // 카드처럼 보이도록 여백/라운드/배경
    //marginTop: (StatusBar.currentHeight ?? 0) + 8, // status bar 아래 살짝 띄움
    marginHorizontal: 12,                          // 좌우 여백
    paddingHorizontal: 14,                         // 패딩 조금 줄여서 깔끔
    paddingVertical: 12,                          
    backgroundColor: '#FFFFFF',                    // 하얀 배경
    borderRadius: 16,                              // 동글동글
    borderWidth: 1,                                // 살짝 테두리
    borderColor: 'rgba(0,0,0,0.06)',               // 아주 연한 테두리

    // iOS 그림자
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },

    // Android 그림자
    elevation: 6,

    zIndex: 9999,
  },

  title: {
    color: '#111111',      // 검정 계열
    fontSize: 15,
    fontWeight: '700',
  },

  body: {
    color: '#444444',      // 본문은 살짝 연하게
    fontSize: 13,
    marginTop: 3,          // 간격 조금
  },
})