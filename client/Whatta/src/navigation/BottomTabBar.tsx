import React, { useRef, useState, useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import PagerView from 'react-native-pager-view'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DrawerToggleButton } from '@react-navigation/drawer'
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native'

import TaskDetail from '@/screens/More/TaskDetailScreen'
import MyPageStack from '@/navigation/MyPageStack'
import Day from '@/screens/Calender/DayView'
import Week from '@/screens/Calender/WeekView'
import Month from '@/screens/Calender/MonthView'

import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import colors from '@/styles/colors'

enum Tab {
  Day = 0,
  Week = 1,
  Month = 2,
  MyPage = 3,
  TaskDetail = 4,
}

export default function BottomBar() {
  const pageRef = useRef<PagerView>(null)
  const [tab, setTab] = useState<Tab>(Tab.Day) // 초기값 = Day

  const isPageTab = tab === Tab.Day || tab === Tab.Week || tab === Tab.Month

  const goTab = (idx: Tab) => {
    if (idx === Tab.MyPage || idx === Tab.TaskDetail) {
      setTab(idx)
      console.log(idx)
      return
    }

    if (isPageTab) {
      pageRef.current?.setPage(idx)
      setTab(idx)
    } else {
      setTab(idx)
    }
    console.log(idx)
  }

  const navigation = useNavigation<NavigationProp<ParamListBase>>()

  useEffect(() => {
    const stack = navigation.getParent()
    const drawer = navigation.getParent()
    if (!drawer) return

    const titleMap: Record<Tab, string> = {
      [Tab.Day]: '일간',
      [Tab.Week]: '주간',
      [Tab.Month]: '월간',
      [Tab.MyPage]: '마이페이지',
      [Tab.TaskDetail]: '테스크',
    }

    drawer.setOptions({
      headerShown: isPageTab, // 캘린더에서만 헤더 표시
      headerTitle: titleMap[tab],
      headerLeft: () => <DrawerToggleButton />,
      swipeEnabled: isPageTab, // 마이페이지/테스크는 스와이프 막기
      headerStyle: { height: 105 },
      headerTitleStyle: { fontSize: 16, color: colors.text.title },
    })
  }, [navigation, isPageTab, tab])

  return (
    <SafeAreaView
      style={styles.container}
      edges={isPageTab ? ['bottom'] : ['top', 'bottom']}
    >
      {/* 내용 영역 */}
      {isPageTab ? (
        <PagerView
          key={`page-${tab}`}
          ref={pageRef}
          style={styles.pagerView}
          initialPage={tab}
          onPageSelected={(e) => {
            const position = e.nativeEvent.position as Tab
            if (position !== tab) setTab(position)
          }}
        >
          <View style={styles.page}>
            <Day />
          </View>
          <View style={styles.page}>
            <Week />
          </View>
          <View style={styles.page}>
            <Month />
          </View>
        </PagerView>
      ) : tab === Tab.MyPage ? (
        <MyPageStack />
      ) : (
        <TaskDetail />
      )}

      {/* 하단 바 */}
      <View style={styles.tabBar}>
        {/* 테스크 상세 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.TaskDetail)}>
          <MaterialIcons
            name="task"
            size={25}
            color={tab === Tab.TaskDetail ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 일간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Day)}>
          <FontAwesome5
            name="dailymotion"
            size={25}
            color={tab === Tab.Day ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 주간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Week)}>
          <MaterialCommunityIcons
            name="calendar-week"
            size={25}
            color={tab === Tab.Week ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 월간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Month)}>
          <MaterialIcons
            name="calendar-month"
            size={25}
            color={tab === Tab.Month ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 마이페이지 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.MyPage)}>
          <MaterialIcons
            name="account-box"
            size={25}
            color={tab === Tab.MyPage ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.surface },

  pagerView: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabBar: {
    flex: 0.1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.primary.main,
    backgroundColor: colors.neutral.surface,
  },
  tab: { padding: 20 },
})
