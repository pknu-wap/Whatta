import React, { useEffect, useState } from 'react'
import { View, Pressable, Dimensions, StyleSheet, TouchableOpacity } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDrawer } from '@/providers/DrawerProvider'
import { bus } from '@/lib/eventBus'

import MyPageStack from '@/navigation/MyPageStack'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'
import FabHybrid from '@/components/FloatingButton'

import MyPageIcon from '@/assets/icons/mypage.svg'
import MonthIcon from '@/assets/icons/month.svg'
import WeekIcon from '@/assets/icons/week.svg'
import DayIcon from '@/assets/icons/day.svg'
import PillMonthIcon from '@/assets/icons/pill_month.svg'
import PiliWeekIcon from '@/assets/icons/pili_week.svg'
import PillDayIcon from '@/assets/icons/pill_day.svg'
import PillMypageIcon from '@/assets/icons/pill_mypage.svg'
import colors from '@/styles/colors'

const TAB_BAR_H = 83
const TAB_ACTIVE_COLOR = '#464A4D'
const Tab = createBottomTabNavigator()

function GuardedTabButton(props: any) {
  const { isOpen, close } = useDrawer()
  const { onPress, onLongPress, ...rest } = props
  const CLOSE_ANIM_MS = 220

  return (
    <TouchableOpacity
      {...rest}
      onPress={(e) => {
        if (isOpen) {
          close()
          setTimeout(() => onPress?.(e), CLOSE_ANIM_MS)
          return
        }
        onPress?.(e)
      }}
      onLongPress={onLongPress}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
    />
  )
}

const defaultTabBarStyle = {
  height: TAB_BAR_H,
  paddingTop: 3,
  paddingHorizontal: 10,
  backgroundColor: colors.background.bg1,
  borderTopWidth: 0,
  borderTopColor: 'transparent' as const,
  shadowColor: '#D2D2D2',
  shadowOpacity: 0.25,
  shadowRadius: 15,
  shadowOffset: { width: 0, height: 0 },
  elevation: 15,
}

export default function CalendarTabs() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState('Month')
  const [popupHeight, setPopupHeight] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)

  const POPUP_WIDTH = 158
  const POPUP_RIGHT_MARGIN = 10
  const POPUP_TOP = 48
  const { width: screenWidth } = Dimensions.get('window')

  useEffect(() => {
    const handler = (h: number) => setPopupHeight(h)
    bus.on('filter:popup-height', handler)
    return () => bus.off('filter:popup-height', handler)
  }, [])

  useEffect(() => {
    const handler = (open: boolean) => setFilterOpen(open)
    bus.on('filter:popup', handler)
    return () => bus.off('filter:popup', handler)
  }, [])

  const showFab = ['Month', 'Week', 'Day'].includes(activeTab)

  return (
    <View style={{ flex: 1 }}>
      {filterOpen && (
        <>
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: POPUP_TOP,
              zIndex: 9999,
            }}
            onPress={() => bus.emit('filter:close')}
          />

          <Pressable
            style={{
              position: 'absolute',
              top: POPUP_TOP,
              left: 0,
              width: screenWidth - POPUP_WIDTH - POPUP_RIGHT_MARGIN,
              bottom: 0,
              zIndex: 9999,
            }}
            onPress={() => bus.emit('filter:close')}
          />

          <Pressable
            style={{
              position: 'absolute',
              top: POPUP_TOP,
              right: 0,
              width: POPUP_RIGHT_MARGIN,
              bottom: 0,
              zIndex: 9999,
            }}
            onPress={() => bus.emit('filter:close')}
          />

          <Pressable
            style={{
              position: 'absolute',
              top: POPUP_TOP + popupHeight + 50,
              left: screenWidth - POPUP_WIDTH - POPUP_RIGHT_MARGIN,
              right: 0,
              bottom: 0,
              zIndex: 9999,
            }}
            onPress={() => bus.emit('filter:close')}
          />
        </>
      )}

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
          tabBarBackground: () => <View style={S.tabBarBg} />,
          tabBarStyle: defaultTabBarStyle,
          tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
          tabBarActiveTintColor: TAB_ACTIVE_COLOR,
          tabBarInactiveTintColor: colors.icon.default,
          tabBarLabelStyle: { fontSize: 12, textAlign: 'center', marginTop: -2 },
          tabBarButton: (props) => <GuardedTabButton {...props} />,
        }}
      >
        <Tab.Screen
          name="MyPage"
          component={MyPageStack}
          options={({ route }) => {
            const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyPageList'
            const hideTabBar = focusedRouteName === 'AiChat'

            return {
              tabBarLabel: '마이페이지',
              tabBarStyle: hideTabBar ? { display: 'none' } : defaultTabBarStyle,
              tabBarIcon: ({ focused }) =>
                focused ? (
                  <PillMypageIcon width={24} height={24} />
                ) : (
                  <MyPageIcon width={24} height={24} color={colors.icon.default} />
                ),
            }
          }}
        />

        <Tab.Screen
          name="Month"
          component={MonthView}
          options={{
            tabBarLabel: '월간',
            tabBarIcon: ({ focused }) =>
              focused ? (
                <PillMonthIcon width={24} height={24} />
              ) : (
                <MonthIcon width={24} height={24} color={colors.icon.default} />
              ),
          }}
        />

        <Tab.Screen
          name="Week"
          component={WeekView}
          options={{
            tabBarLabel: '주간',
            tabBarIcon: ({ focused }) =>
              focused ? (
                <PiliWeekIcon width={24} height={24} />
              ) : (
                <WeekIcon width={24} height={24} color={colors.icon.default} />
              ),
          }}
        />

        <Tab.Screen
          name="Day"
          component={DayView}
          options={{
            tabBarLabel: '일간',
            tabBarIcon: ({ focused }) =>
              focused ? (
                <PillDayIcon width={24} height={24} />
              ) : (
                <DayIcon width={24} height={24} color={colors.icon.default} />
              ),
          }}
        />
      </Tab.Navigator>

      {showFab && (
        <FabHybrid
          bottomOffset={TAB_BAR_H + insets.bottom - 36}
          rightOffset={20}
          onPressTop1={() => {
            bus.emit('popup:schedule:create', { source: activeTab, createType: 'task' })
          }}
          onPressTop2={() => {
            bus.emit('popup:image:create', { source: activeTab })
          }}
          onPressPrimaryWhenOpen={() => {
            bus.emit('popup:schedule:create', { source: activeTab })
          }}
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  tabBarBg: {
    flex: 1,
    backgroundColor: colors.background.bg1,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
})
