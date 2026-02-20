import React, { useState, useEffect } from 'react'
import { View, Pressable, Dimensions } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TouchableOpacity } from 'react-native'
import { DrawerProvider, useDrawer } from '@/providers/DrawerProvider'
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
import TaskIcon from '@/assets/icons/task.svg'
import colors from '@/styles/colors'

const TAB_BAR_H = 83
const Tab = createBottomTabNavigator()

type RootStackParamList = {
  MainTabs: undefined
  AddSchedule: { date?: string } | undefined
}

export default function MainTabs() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState('Month')
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const POPUP_WIDTH = 158
  const POPUP_RIGHT_MARGIN = 10
  const POPUP_TOP = 48
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
  const [popupHeight, setPopupHeight] = useState(0)

  useEffect(() => {
    const handler = (h: number) => setPopupHeight(h)
    bus.on('filter:popup-height', handler)
    return () => bus.off('filter:popup-height', handler)
  }, [])

  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    const handler = (open: boolean) => setFilterOpen(open)
    bus.on('filter:popup', handler)
    return () => bus.off('filter:popup', handler)
  }, [])

  const showFab = ['Month', 'Week', 'Day'].includes(activeTab)

  function GuardedTabButton(props: any) {
    const { isOpen, close } = useDrawer()
    const { onPress, onLongPress, ...rest } = props
    const CLOSE_ANIM_MS = 220
    return (
      <TouchableOpacity
        {...rest}
        onPress={(e) => {
          if (isOpen) {
            // 열려 있으면: 이동 막고 닫기만
            close()
            setTimeout(() => onPress?.(e), CLOSE_ANIM_MS)
            return
          }
          onPress?.(e) // 닫혀 있으면: 원래 동작
        }}
        onLongPress={onLongPress}
        accessibilityRole={props.accessibilityRole}
        accessibilityState={props.accessibilityState}
        accessibilityLabel={props.accessibilityLabel}
        testID={props.testID}
      />
    )
  }

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        {filterOpen && (
          <>
            {/* TOP 영역 */}
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

            {/* LEFT 영역 */}
            <Pressable
              style={{
                position: 'absolute',
                top: POPUP_TOP,
                left: 0,
                width: SCREEN_WIDTH - POPUP_WIDTH - POPUP_RIGHT_MARGIN,
                bottom: 0,
                zIndex: 9999,
              }}
              onPress={() => bus.emit('filter:close')}
            />

            {/* RIGHT 영역 */}
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

            {/* BOTTOM 영역 (동적 높이) */}
            <Pressable
              style={{
                position: 'absolute',
                top: POPUP_TOP + popupHeight + 50,
                left: SCREEN_WIDTH - POPUP_WIDTH - POPUP_RIGHT_MARGIN,
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
            tabBarStyle: {
              height: TAB_BAR_H,
              paddingTop: 3,
              paddingHorizontal: 10,
            },
            tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
            tabBarActiveTintColor: colors.primary.main,
            tabBarInactiveTintColor: colors.icon.default,
            tabBarLabelStyle: { fontSize: 12, textAlign: 'center', marginTop: -2 },
            tabBarButton: (p) => <GuardedTabButton {...p} />,
          }}
        >
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

          {/* ✅ 할 일 관리
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
          /> */}

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
        </Tab.Navigator>

        {/* ✅ 플로팅 버튼 */}
        {showFab && (
          <FabHybrid
            bottomOffset={TAB_BAR_H + insets.bottom - 36}
            rightOffset={20}
            onPressTop1={() => {
              bus.emit('task:create', { source: activeTab })
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
    </DrawerProvider>
  )
}
