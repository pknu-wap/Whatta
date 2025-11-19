import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MyPageScreen from '@/screens/MyPage/MyPageScreen'
import { PlaceholderScreen } from '@/screens/MyPage/PlaceholderScreen'
import LabelsScreen from '@/screens/MyPage/LabelScreen'
import RemainderScreen from '@/screens/MyPage/RemainderTimeScreen'
import SummaryScreean from '@/screens/MyPage/SummaryTimeScreen'

export type MyPageStackList = {
  MyPageList: undefined
  Profile: undefined
  Preferences: undefined
  NotifDefaults: undefined
  vibration: undefined
  TransitAlerts: undefined
  Labels: undefined
  Transitvibration: undefined
  CalendarNotif: undefined
  FirstPages: undefined
  CalendarVibration: undefined
  UsageReminders: undefined
}

const Stack = createNativeStackNavigator<MyPageStackList>()

export default function MyPageStack() {
  return (
    <Stack.Navigator>
      {/* 목록(섹션 리스트) */}
      <Stack.Screen name="MyPageList" component={MyPageScreen} />

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
        name="CalendarNotif"
        component={SummaryScreean}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="vibration"
        component={PlaceholderScreen}
        options={{ title: 'OCR 시간표 등록' }}
      />
      <Stack.Screen
        name="TransitAlerts"
        component={PlaceholderScreen}
        options={{ title: '교통 알림' }}
      />
      <Stack.Screen
        name="NotifDefaults"
        component={RemainderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Transitvibration"
        component={PlaceholderScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="Labels"
        component={LabelsScreen}
        options={{ title: '라벨 관리', headerShown: false }}
      />
      <Stack.Screen
        name="FirstPages"
        component={PlaceholderScreen}
        options={{ title: '시작 페이지 설정' }}
      />
      <Stack.Screen
        name="CalendarVibration"
        component={PlaceholderScreen}
        options={{ title: '소리 및 진동' }}
      />
      <Stack.Screen
        name="UsageReminders"
        component={PlaceholderScreen}
        options={{ title: '사용방법 안내' }}
      />
    </Stack.Navigator>
  )
}
