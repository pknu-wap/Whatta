import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import MyPageStack from '@/navigation/MyPageStack'
import MonthScreen from '@/screens/Calender/Month/MonthView'
import WeekScreen from '@/screens/Calender/Week/WeekView'
import DayScreen from '@/screens/Calender/Day/DayView'
import TaskScreen from '@/screens/More/TaskDetailPopup'

import MyPageIcon from '@/assets/icons/mypage.svg'
import MonthIcon from '@/assets/icons/month.svg'
import WeekIcon from '@/assets/icons/week.svg'
import DayIcon from '@/assets/icons/day.svg'
import TaskIcon from '@/assets/icons/task.svg'

import colors from '@/styles/colors'

const Tab = createBottomTabNavigator()

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Month"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 120,
          paddingTop: 12,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.icon.default,
        tabBarLabelStyle: { fontSize: 12, textAlign: 'center' },
      }}
    >
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
      <Tab.Screen
        name="Month"
        component={MonthScreen}
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
      <Tab.Screen
        name="Week"
        component={WeekScreen}
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
      <Tab.Screen
        name="Day"
        component={DayScreen}
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
      <Tab.Screen
        name="Todo"
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
  )
}
