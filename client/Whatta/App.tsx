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
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

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
      Animated.delay(3000),
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

function ForegroundBannerHost({
  message,
  onHide,
}: {
  message: { title: string; body: string } | null
  onHide: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <ForegroundBanner
      message={message}
      onHide={onHide}
      topInset={insets.top}
    />
  )
}

export default function App() {
  
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CustomSplash onFinish={() => setSplashDone(true)} />
      </GestureHandlerRootView>
    )
  }

  return (
    <SafeAreaProvider> 
      {/* ✅ [수정] SafeAreaProvider로 전체 감싸기 */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* ✅ [수정] ForegroundBanner 직접 호출 대신 Host 사용 */}
        <ForegroundBannerHost 
          message={fgMsg}
          onHide={() => setFgMsg(null)}
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
    </SafeAreaProvider>
  )
}

const S = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,

    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,                          
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },

    elevation: 6,
    zIndex: 9999,
  },

  title: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },

  body: {
    color: '#444444',
    fontSize: 13,
    marginTop: 3,
  },
})
