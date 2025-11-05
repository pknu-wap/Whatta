import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { DrawerProvider, useDrawer } from '@/providers/DrawerProvider'
import { bus } from '@/lib/eventBus'

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

const TAB_BAR_H = 83
const Tab = createBottomTabNavigator()

type RootStackParamList = {
  MainTabs: undefined
  AddSchedule: { date?: string } | undefined
}

// ✅ DrawerProvider 내부에서만 useDrawer를 사용하기 위해
//    하단바 터치 캐처를 별도 컴포넌트로 분리
function BottomBarCatcher({
  isFilterOpen,
  onCloseFilter,
  barHeight,
}: {
  isFilterOpen: boolean
  onCloseFilter: () => void
  barHeight: number
}) {
  const insets = useSafeAreaInsets()
  const { isOpen, close } = useDrawer()

  if (!isFilterOpen && !isOpen) return null

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: barHeight + insets.bottom,
        zIndex: 999,
      }}
      onPress={() => {
        if (isOpen) {
          close()
          return
        }
        if (isFilterOpen) onCloseFilter()
      }}
    />
  )
}

// ✅ DrawerProvider 내부에서만 useDrawer를 사용하기 위해
//    탭 버튼도 별도 컴포넌트로 분리
function GuardedTabButton(props: any) {
  const { isOpen, close } = useDrawer()
  const { onPress, onLongPress, ...rest } = props
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  useEffect(() => {
    const h = (v: boolean) => setIsFilterOpen(v)
    bus.on('filter:state', h)
    return () => bus.off('filter:state', h)
  }, [])

  return (
    <TouchableOpacity
      {...rest}
      onPress={(e) => {
        if (isFilterOpen) {
          bus.emit('header:close-filter')
          return
        }
        if (isOpen) {
          // 열려 있으면: 이동 막고 닫기만
          close()
          return
        }
        onPress?.(e) //닫혀 있으면 원래 동작
      }}
      onLongPress={onLongPress}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
    />
  )
}

export default function MainTabs() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState('Month')
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const showFab = ['Month', 'Week', 'Day'].includes(activeTab)

  // ✅ 필터 열림 상태 구독 
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  useEffect(() => {
    const h = (v: boolean) => setIsFilterOpen(v)
    bus.on('filter:state', h)
    return () => bus.off('filter:state', h)
  }, [])

  const closeFilter = () => bus.emit('header:close-filter')

  return (
    // ✅ 여기서부터가 DrawerProvider 내부. 이 아래 계층에서만 useDrawer 사용
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
              paddingTop: 3,
            },
            tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
            tabBarActiveTintColor: colors.primary.main,
            tabBarInactiveTintColor: colors.icon.default,
            tabBarLabelStyle: { fontSize: 12, textAlign: 'center', marginTop: -2 },
            tabBarButton: (p) => <GuardedTabButton {...p} />, // ✅ Provider 내부에서 훅 사용
          }}
        >
          <Tab.Screen
            name="MyPage"
            component={MyPageStack}
            options={{
              tabBarLabel: '마이페이지',
              tabBarIcon: ({ focused }) => (
                <MyPageIcon width={24} height={24} color={focused ? colors.primary.main : colors.icon.default} />
              ),
            }}
          />
          <Tab.Screen
            name="Month"
            component={MonthView}
            options={{
              tabBarLabel: '월간',
              tabBarIcon: ({ focused }) => (
                <MonthIcon width={24} height={24} color={focused ? colors.primary.main : colors.icon.default} />
              ),
            }}
          />
          <Tab.Screen
            name="Week"
            component={WeekView}
            options={{
              tabBarLabel: '주간',
              tabBarIcon: ({ focused }) => (
                <WeekIcon width={24} height={24} color={focused ? colors.primary.main : colors.icon.default} />
              ),
            }}
          />
          <Tab.Screen
            name="Day"
            component={DayView}
            options={{
              tabBarLabel: '일간',
              tabBarIcon: ({ focused }) => (
                <DayIcon width={24} height={24} color={focused ? colors.primary.main : colors.icon.default} />
              ),
            }}
          />
          <Tab.Screen
            name="Task"
            component={TaskScreen}
            options={{
              tabBarLabel: '할 일 관리',
              tabBarIcon: ({ focused }) => (
                <TaskIcon width={24} height={24} color={focused ? colors.primary.main : colors.icon.default} />
              ),
            }}
          />
        </Tab.Navigator>

        {/* ✅ 하단바 전체 터치 → 필터/사이드바 닫기 (Provider 내부에서만 훅 사용) */}
        <BottomBarCatcher
          isFilterOpen={isFilterOpen}
          onCloseFilter={closeFilter}
          barHeight={TAB_BAR_H}
        />

        {/* 플로팅 버튼*/}
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
