import 'react-native-gesture-handler'
import React, { useEffect, useState } from 'react'
import { ensureAuthReady } from '@/app/bootstrap'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, ActivityIndicator, View, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import colors from '@/styles/colors'
import RootStack from '@/navigation/RootStack'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        await ensureAuthReady() // 토큰 없으면 게스트 로그인 + 저장
      } finally {
        setReady(true)
      }
    })()
  }, [])

  if (!ready) {
    // 토큰 준비 끝나기 전엔 간단한 로딩 화면만 표시
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
})
