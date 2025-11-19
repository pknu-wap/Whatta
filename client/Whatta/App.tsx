import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, ActivityIndicator, View, Text } from 'react-native'
import React, { createContext, useState, useCallback, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import RootStack from '@/navigation/RootStack'
import { ensureAuthReady } from '@/app/bootstrap'
import { DrawerProvider } from '@/providers/DrawerProvider'
import { LabelProvider } from '@/providers/LabelProvider'

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

  // ✅ 앱 시작 시 게스트 로그인 / 인증 준비
  useEffect(() => {
    ;(async () => {
      try {
        await ensureAuthReady()
      } finally {
        setReady(true)
      }
    })()
  }, [])

  // ✅ 라벨 상태 (시간표 제거됨)
  const [labels, setLabels] = useState<LabelItem[]>([
    { id: '1', name: '과제', color: '#B04FFF', enabled: true },
    { id: '3', name: '약속', color: '#B04FFF', enabled: true },
    { id: '4', name: '동아리', color: '#B04FFF', enabled: true },
    { id: '5', name: '수업', color: '#B04FFF', enabled: true },
  ])

  // ✅ 개별 토글
  const toggleLabel = useCallback((id: string) => {
    setLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    )
  }, [])

  // ✅ 전체 on/off
  const toggleAll = useCallback(() => {
    const allOn = labels.every((l) => l.enabled)
    setLabels((prev) => prev.map((l) => ({ ...l, enabled: !allOn })))
  }, [labels])

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
        <FilterContext.Provider value={{ labels, toggleLabel, toggleAll }}>
          <DrawerProvider>
            <NavigationContainer>
              <RootStack />
            </NavigationContainer>
          </DrawerProvider>
        </FilterContext.Provider>
      </LabelProvider>
    </GestureHandlerRootView>
  )
}
