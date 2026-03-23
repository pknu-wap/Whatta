import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import AiIcon from '@/assets/icons/aiplus_no.svg'
import AiIconActive from '@/assets/icons/aiplus_yes.svg'
import HomeIcon from '@/assets/icons/home_no.svg'
import HomeIconActive from '@/assets/icons/home_yes.svg'
import MonthIcon from '@/assets/icons/month.svg'
import PillMonthIcon from '@/assets/icons/pill_month.svg'
import colors from '@/styles/colors'
import HomeScreen from '@/screens/Home/HomeScreen'
import MyPageStack from '@/navigation/MyPageStack'
import CalendarScreen from '@/screens/Calender/CalendarScreen'

const Tab = createBottomTabNavigator()
const TAB_BAR_H = 83
const TAB_ACTIVE_COLOR = '#464A4D'

function AiTabStack() {
  return <MyPageStack initialRouteName="AiChat" />
}

export default function RootTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: TAB_BAR_H,
          paddingTop: 3,
          paddingHorizontal: 10,
          backgroundColor: colors.background.bg1,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowColor: '#D2D2D2',
          shadowOpacity: 0.25,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 0 },
          elevation: 15,
        },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: colors.icon.default,
        tabBarLabelStyle: { fontSize: 12, textAlign: 'center', marginTop: -2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <HomeIconActive width={24} height={24}/>
            ) : (
              <HomeIcon width={24} height={24} color={colors.icon.default} />
            ),
        }}
      />

      <Tab.Screen
        name="AI"
        component={AiTabStack}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <AiIconActive width={24} height={24} />
            ) : (
              <AiIcon width={24} height={24} />
            ),
        }}
      />

      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: '달력',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <PillMonthIcon width={24} height={24} />
            ) : (
              <MonthIcon width={24} height={24} color={colors.icon.default} />
            ),
        }}
      />
    </Tab.Navigator>
  )
}
