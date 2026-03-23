import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import AiIcon from '@/assets/icons/ai_icon.svg'
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
        sceneStyle: {
          backgroundColor: 'transparent',
        },
        tabBarStyle: {
          height: TAB_BAR_H,
          paddingTop: 0,
          paddingHorizontal: 10,
          backgroundColor: colors.icon.wlabel,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#17191A',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 18,
        },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarIconStyle: { marginTop: 7.5 },
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
          tabBarLabel: '',
          tabBarIcon: ({ focused }) =>
            <AiIcon
              width={24}
              height={24}
              color={focused ? TAB_ACTIVE_COLOR : colors.icon.default}
            />,
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
