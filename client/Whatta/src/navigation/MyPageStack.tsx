import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MyPageScreen from '@/screens/MyPage/MyPageScreen'
import { PlaceholderScreen } from '@/screens/MyPage/PlaceholderScreen'
import RemainderScreen from '@/screens/MyPage/Remainder/RemainderScreen'

export type MyPageStackList = {
  MyPage: undefined
  Profile: undefined
  Preferences: undefined
  UsageReminders: undefined
  NotifDefaults: undefined
  OCRWizard: undefined
  TransitAlerts: undefined
}

const Stack = createNativeStackNavigator<MyPageStackList>()

export default function MyPageStack() {
  return (
    <Stack.Navigator>
      {/* 목록(섹션 리스트) */}
      <Stack.Screen name="MyPage" component={MyPageScreen} />

      {/* 플레이스홀더들: 나중에 실제 화면으로 대체 */}
      <Stack.Screen
        name="Profile"
        component={PlaceholderScreen}
        options={{ title: '프로필' }}
      />
      <Stack.Screen
        name="Preferences"
        component={PlaceholderScreen}
        options={{ title: '환경설정' }}
      />
      <Stack.Screen
        name="UsageReminders"
        component={PlaceholderScreen}
        options={{ title: '사용방법 리마인드' }}
      />
      <Stack.Screen
        name="NotifDefaults"
        component={RemainderScreen}
        options={{ title: '리마인드 기본값' }}
      />
      <Stack.Screen
        name="OCRWizard"
        component={PlaceholderScreen}
        options={{ title: 'OCR 시간표 등록' }}
      />
      <Stack.Screen
        name="TransitAlerts"
        component={PlaceholderScreen}
        options={{ title: '교통 알림' }}
      />
    </Stack.Navigator>
  )
}
