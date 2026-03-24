import React from 'react'
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

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
const TAB_BAR_RADIUS = 20
const TAB_ACTIVE_COLOR = '#464A4D'
const AI_BUBBLE_W = 112
const AI_BUBBLE_H = 110
const AI_BUBBLE_RISE = 10
const AI_ICON_W = 130
const AI_ICON_H = 68
const TAB_BAR_SHADOW_STYLE = {
  shadowColor: '#17191A',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: -6 } as const,
  elevation: 18,
}
const TAB_BAR_HIDDEN_STYLE = {
  display: 'none' as const,
}

function AiTabStack() {
  return <MyPageStack initialRouteName="AiChat" />
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
    tabBarStyle: focusedRouteName === 'AiChat' ? TAB_BAR_HIDDEN_STYLE : undefined,
  }
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focusedRoute = state.routes[state.index]
  const focusedStyle = descriptors[focusedRoute.key]?.options.tabBarStyle as
    | { display?: 'none' }
    | undefined

  if (focusedStyle?.display === 'none') return null

  return (
    <View style={S.shell} pointerEvents="box-none">
      <View style={S.bgWrap} pointerEvents="none">
        <View style={S.bgShadow} />
        <View style={S.bgBump} />
        <View style={S.bgMain} />
      </View>

      <View style={S.contentRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index
          const { options } = descriptors[route.key]

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            })
          }

          if (route.name === 'AI') {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
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

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : route.name === 'Calendar'
                ? '캘린더'
                : route.name

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={S.sideTabButton}
            >
              <View style={S.sideTabInner}>
                {route.name === 'Home' ? (
                  isFocused ? (
                    <HomeIconActive width={24} height={24} />
                  ) : (
                    <HomeIcon width={24} height={24} color={colors.icon.default} />
                  )
                ) : isFocused ? (
                  <PillMonthIcon width={26} height={26} />
                ) : (
                  <MonthIcon width={26} height={26} color={colors.icon.default} />
                )}
                <Text
                  style={[
                    S.tabLabel,
                    route.name === 'Calendar' ? S.tabLabelCalendar : null,
                    isFocused ? S.tabLabelActive : null,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
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
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
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
        }}
      />
    </Tab.Navigator>
  )
}

const S = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H + AI_BUBBLE_RISE,
  },
  bgWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H + AI_BUBBLE_RISE,
    overflow: 'visible',
    borderTopLeftRadius: TAB_BAR_RADIUS,
    borderTopRightRadius: TAB_BAR_RADIUS,
  },
  bgMain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H,
    backgroundColor: colors.icon.w,
    borderTopLeftRadius: TAB_BAR_RADIUS,
    borderTopRightRadius: TAB_BAR_RADIUS,
  },
  bgShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H,
    backgroundColor: colors.icon.w,
    borderTopLeftRadius: TAB_BAR_RADIUS,
    borderTopRightRadius: TAB_BAR_RADIUS,
    ...TAB_BAR_SHADOW_STYLE,
  },
  bgBump: {
    position: 'absolute',
    top: -AI_BUBBLE_RISE,
    left: '50%',
    marginLeft: -(AI_BUBBLE_W / 2),
    width: AI_BUBBLE_W,
    height: AI_BUBBLE_H,
    borderRadius: AI_BUBBLE_H / 2,
    backgroundColor: colors.icon.w,
    ...TAB_BAR_SHADOW_STYLE,
  },
  contentRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 10,
  },
  sideTabButton: {
    flex: 1,
  },
  sideTabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 9,
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
    marginTop: -56,
  },
  tabLabel: {
    ...ts('body3'),
    color: colors.icon.default,
    textAlign: 'center',
    marginTop: -1,
  },
  tabLabelActive: {
    color: TAB_ACTIVE_COLOR,
  },
  tabLabelCalendar: {
    color: colors.text.text1,
  },
})
