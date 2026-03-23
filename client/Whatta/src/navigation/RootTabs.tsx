import React from 'react'
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { Pressable, StyleSheet, View } from 'react-native'

import AiIcon from '@/assets/icons/ai.svg'
import HomeIcon from '@/assets/icons/home_no.svg'
import HomeIconActive from '@/assets/icons/home_yes.svg'
import MonthIcon from '@/assets/icons/month.svg'
import PillMonthIcon from '@/assets/icons/pill_month.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import HomeScreen from '@/screens/Home/HomeScreen'
import MyPageStack from '@/navigation/MyPageStack'
import CalendarScreen from '@/screens/Calender/CalendarScreen'

const Tab = createBottomTabNavigator()
const TAB_BAR_H = 83
const TAB_ACTIVE_COLOR = '#464A4D'
const AI_BUBBLE_SIZE = 115
const AI_BUBBLE_RISE = 20
const AI_ICON_W = 130
const AI_ICON_H = 68
const TAB_BAR_SHADOW_STYLE = {
  shadowColor: '#17191A',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: -6 } as const,
  elevation: 18,
}
const TAB_BAR_BASE_STYLE = {
  height: TAB_BAR_H,
  paddingTop: 0,
  paddingHorizontal: 10,
  overflow: 'visible' as const,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  borderTopColor: 'transparent',
  elevation: 0,
  shadowOpacity: 0,
}

function AiTabStack() {
  return <MyPageStack initialRouteName="AiChat" />
}

function TabBarBackground() {
  return (
    <View style={S.tabBarBgWrap} pointerEvents="none">
      <View style={S.tabBarBgMainShadow} />
      <View style={S.tabBarBgCenterBump} />
      <View style={S.tabBarBgMain} />
    </View>
  )
}

function AiTabButton({ accessibilityState, onPress, onLongPress }: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onPress}
      onLongPress={onLongPress}
      style={S.aiTabButton}
    >
      <View style={S.aiIconWrap}>
        <AiIcon width={AI_ICON_W} height={AI_ICON_H} />
      </View>
    </Pressable>
  )
}

function getAiTabOptions(route: { key: string; name: string; params?: object | undefined }) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'AiChat'

  return {
    tabBarLabel: '',
    tabBarButton: (props: BottomTabBarButtonProps) => <AiTabButton {...props} />,
    tabBarStyle:
      focusedRouteName === 'AiChat'
        ? { ...TAB_BAR_BASE_STYLE, display: 'none' as const }
        : TAB_BAR_BASE_STYLE,
  }
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
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: TAB_BAR_BASE_STYLE,
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarIconStyle: { marginTop: 7.5 },
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: colors.icon.default,
        tabBarLabelStyle: {
          ...ts('body3'),
          color: colors.text.text1,
          textAlign: 'center',
          marginTop: -1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
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
        options={({ route }) => getAiTabOptions(route)}
      />

      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: '캘린더',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <PillMonthIcon width={26} height={26} />
            ) : (
              <MonthIcon width={26} height={26} color={colors.icon.default} />
            ),
        }}
      />
    </Tab.Navigator>
  )
}

const S = StyleSheet.create({
  tabBarBgWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  tabBarBgMain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.icon.w,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabBarBgMainShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.icon.w,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...TAB_BAR_SHADOW_STYLE,
  },
  tabBarBgCenterBump: {
    position: 'absolute',
    top: -AI_BUBBLE_RISE,
    left: '50%',
    marginLeft: -(AI_BUBBLE_SIZE / 2),
    width: AI_BUBBLE_SIZE,
    height: AI_BUBBLE_SIZE,
    borderRadius: AI_BUBBLE_SIZE / 2,
    backgroundColor: colors.icon.w,
    ...TAB_BAR_SHADOW_STYLE,
  },
  aiTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  aiIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
})
