import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ActivityIndicator, View } from 'react-native'
import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import RootStack from '@/navigation/RootStack'
import { ensureAuthReady } from '@/app/bootstrap'
import { DrawerProvider } from '@/providers/DrawerProvider'
import { LabelProvider } from '@/providers/LabelProvider'
import { LabelFilterProvider } from '@/providers/LabelFilterProvider' 
import messaging from '@react-native-firebase/messaging'
import { Alert } from "react-native";

// 포그라운드 메시지 핸들러
messaging().onMessage(async remoteMessage => {
  console.log('Foreground Message received:', remoteMessage);
  Alert.alert('[FCM] Foreground Message received:', JSON.stringify(remoteMessage));
});

// ✅ 라벨 타입
export interface LabelItem {
  id: string
  name: string
  color: string
  enabled: boolean
}

interface FilterContextType {
  labels: LabelItem[]
  toggleLabel: (id: string) => void
  toggleAll: () => void
}

// ✅ 전역 라벨 컨텍스트
export const FilterContext = createContext<FilterContextType>({
  labels: [],
  toggleLabel: () => {},
  toggleAll: () => {},
})

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        await ensureAuthReady()
      } finally {
        setReady(true)
      }
    })()
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
