import React, { useState } from 'react'
import { View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { DrawerProvider } from '@/providers/DrawerProvider'

import MyPageStack from '@/navigation/MyPageStack'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'
import TaskScreen from '@/screens/More/TaskDetailPopup'

import FabHybrid from '@/components/FloatingButton'

import MyPageIcon from '@/assets/icons/mypage.svg'
import MonthIcon from '@/assets/icons/month.svg'
import WeekIcon from '@/assets/icons/week.svg'
import DayIcon from '@/assets/icons/day.svg'
import TaskIcon from '@/assets/icons/task.svg'
import colors from '@/styles/colors'

const TAB_BAR_H = 100
const Tab = createBottomTabNavigator()

type RootStackParamList = {
  MainTabs: undefined
  AddSchedule: { date?: string } | undefined
}

export default function MainTabs() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState('Month')
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const showFab = ['Month', 'Week', 'Day'].includes(activeTab)

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          initialRouteName="Month"
          screenListeners={{
            state: (e) => {
              const route = e.data?.state?.routes[e.data.state.index]
              if (route?.name) setActiveTab(route.name)
            },
          }}
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              height: TAB_BAR_H,
              paddingTop: 12,
            },
            tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
            tabBarActiveTintColor: colors.primary.main,
            tabBarInactiveTintColor: colors.icon.default,
            tabBarLabelStyle: { fontSize: 12, textAlign: 'center' },
          }}
        >
          {/* ✅ 마이페이지 */}
          <Tab.Screen
            name="MyPage"
            component={MyPageStack}
            options={{
              tabBarLabel: '마이페이지',
              tabBarIcon: ({ focused }) => (
                <MyPageIcon
                  width={24}
                  height={24}
                  color={focused ? colors.primary.main : colors.icon.default}
                />
              ),
            }}
          />

          {/* ✅ 월간 */}
          <Tab.Screen
            name="Month"
            component={MonthView}
            options={{
              tabBarLabel: '월간',
              tabBarIcon: ({ focused }) => (
                <MonthIcon
                  width={24}
                  height={24}
                  color={focused ? colors.primary.main : colors.icon.default}
                />
              ),
            }}
          />

          {/* ✅ 주간 */}
          <Tab.Screen
            name="Week"
            component={WeekView}
            options={{
              tabBarLabel: '주간',
              tabBarIcon: ({ focused }) => (
                <WeekIcon
                  width={24}
                  height={24}
                  color={focused ? colors.primary.main : colors.icon.default}
                />
              ),
            }}
          />

          {/* ✅ 일간 */}
          <Tab.Screen
            name="Day"
            component={DayView}
            options={{
              tabBarLabel: '일간',
              tabBarIcon: ({ focused }) => (
                <DayIcon
                  width={24}
                  height={24}
                  color={focused ? colors.primary.main : colors.icon.default}
                />
              ),
            }}
          />

          {/* ✅ 할 일 관리 */}
          <Tab.Screen
            name="Task"
            component={TaskScreen}
            options={{
              tabBarLabel: '할 일 관리',
              tabBarIcon: ({ focused }) => (
                <TaskIcon
                  width={24}
                  height={24}
                  color={focused ? colors.primary.main : colors.icon.default}
                />
              ),
            }}
          />
        </Tab.Navigator>

        {/* ✅ 플로팅 버튼 */}
        {showFab && (
          <FabHybrid
            bottomOffset={TAB_BAR_H + insets.bottom - 36}
            rightOffset={20}
            onPressTop1={() => {}}
            onPressTop2={() => {}}
            onPressPrimaryWhenOpen={() => {
              navigation.navigate('AddSchedule')
            }}
          />
        )}
      </View>
    </DrawerProvider>
  )
}
