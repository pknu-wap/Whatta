import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
  AppState,
  Linking,
} from 'react-native'
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
import * as Font from 'expo-font'
import {
  deleteEventFromAppleCalendar,
  ensureAppleCalendarConnected,
  exportFutureWhattaEventsIfNeeded,
  exportFutureWhattaEventsToAppleCalendar,
  importAppleCalendarChangesToWhatta,
  refreshAppleCalendarPermissionState,
  syncEventToAppleCalendar,
} from '@/lib/appleCalendar'
import { shouldShowAppleCalendarPrompt } from '@/lib/appleCalendarSync'
import { bus } from '@/lib/eventBus'

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
  return <ForegroundBanner message={message} onHide={onHide} topInset={insets.top} />
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)

  const [fgMsg, setFgMsg] = useState<{ title: string; body: string } | null>(null)
  const appleImportInFlightRef = useRef(false)

  const runAppleImport = React.useCallback(async () => {
    if (appleImportInFlightRef.current) return
    appleImportInFlightRef.current = true
    try {
      await importAppleCalendarChangesToWhatta()
    } finally {
      appleImportInFlightRef.current = false
    }
  }, [])

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
        remoteMessage.notification?.title || toStr(remoteMessage.data?.title) || '알림'

      const body =
        remoteMessage.notification?.body || toStr(remoteMessage.data?.body) || ''

      setFgMsg({ title, body })
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    ;(async () => {
      await Font.loadAsync({
        Righteous: require('./assets/fonts/Righteous-Regular.ttf'),
      })
    })()
  }, [])

  useEffect(() => {
    if (!ready || !splashDone) return

    ;(async () => {
      await refreshAppleCalendarPermissionState()
      if (await shouldShowAppleCalendarPrompt()) {
        const result = await ensureAppleCalendarConnected()
        if (!result.ok) {
          if (result.reason !== 'permission_denied') {
            Alert.alert('애플 캘린더 연동', result.message)
          }
          return
        }

        const exportResult = await exportFutureWhattaEventsToAppleCalendar()
        if (!exportResult.skipped) {
          Alert.alert(
            '애플 캘린더 연동 완료',
            `오늘 이후 일정 ${exportResult.exported}개를 Apple Calendar로 내보냈습니다.`,
          )
        }
        return
      }

      const exportResult = await exportFutureWhattaEventsIfNeeded()
      if (!exportResult.skipped) {
        Alert.alert(
          '애플 캘린더 동기화',
          `연동 전에 있던 오늘 이후 일정 ${exportResult.exported}개를 Apple Calendar로 내보냈습니다.`,
        )
      }

      await runAppleImport()
    })()
  }, [ready, splashDone, runAppleImport])

  useEffect(() => {
    if (!ready || !splashDone) return

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runAppleImport()
      }
    })

    return () => subscription.remove()
  }, [ready, splashDone, runAppleImport])

  useEffect(() => {
    const openPrompt = async () => {
      const result = await ensureAppleCalendarConnected()
      if (!result.ok) {
        if (result.reason === 'permission_denied') {
          Alert.alert(
            '애플 캘린더 연동',
            `${result.message}\n\n이미 권한을 거부한 상태라면 설정 앱에서 다시 허용해야 합니다.`,
            [
              { text: '취소', style: 'cancel' },
              { text: '설정 열기', onPress: () => Linking.openSettings() },
            ]
          )
          return
        }
        Alert.alert('애플 캘린더 연동', result.message)
        return
      }

      const exportResult = await exportFutureWhattaEventsToAppleCalendar()
      if (!exportResult.skipped) {
        Alert.alert(
          '애플 캘린더 연동 완료',
          `오늘 이후 일정 ${exportResult.exported}개를 Apple Calendar로 내보냈습니다.`,
        )
      }
    }

    bus.on('appleCalendar:open-prompt', openPrompt)
    return () => bus.off('appleCalendar:open-prompt', openPrompt)
  }, [])

  useEffect(() => {
    const extractEventId = (payload?: {
      id?: string
      item?: {
        id?: string
        _id?: string
        eventId?: string
        data?: { id?: string; _id?: string; eventId?: string }
      }
    }) => {
      return (
        payload?.id ??
        payload?.item?.id ??
        payload?.item?._id ??
        payload?.item?.eventId ??
        payload?.item?.data?.id ??
        payload?.item?.data?._id ??
        payload?.item?.data?.eventId ??
        null
      )
    }

    const onCalendarMutated = async (payload?: {
      op?: 'create' | 'update' | 'delete'
      id?: string
      item?: {
        id?: string
        _id?: string
        eventId?: string
        isTask?: boolean
        data?: { id?: string; _id?: string; eventId?: string }
      }
    }) => {
      if (!payload) return

      const eventId = extractEventId(payload)
      const isTask = payload.item?.isTask === true
      if (!eventId || isTask) return

      if (payload.op === 'delete') {
        await deleteEventFromAppleCalendar(eventId)
        return
      }

      await syncEventToAppleCalendar(eventId)
    }

    bus.on('calendar:mutated', onCalendarMutated)
    return () => bus.off('calendar:mutated', onCalendarMutated)
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
        <ForegroundBannerHost message={fgMsg} onHide={() => setFgMsg(null)} />

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
