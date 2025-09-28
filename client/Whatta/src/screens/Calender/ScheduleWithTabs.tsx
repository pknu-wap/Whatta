import React, { useRef, useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import PagerView from 'react-native-pager-view'
import { SafeAreaView } from 'react-native-safe-area-context'

import TaskDetail from '@/screens/More/TaskDetailScreen'
import MyPage from '@/screens/MyPage/MyPageScreen'
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

export default function ScheduleWithTabs() {
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        <View style={styles.page}>
          <MyPage />
        </View>
      ) : (
        <View style={styles.page}>
          <TaskDetail />
        </View>
      )}

      {/* 하단 바 */}
      <View style={styles.tabBar}>
        {/* 테스크 상세 */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => goTab(Tab.TaskDetail)}
        >
          <MaterialIcons
            name="task"
            size={30}
            color={
              tab === Tab.TaskDetail ? colors.secondary.main : colors.text.body
            }
          />
        </TouchableOpacity>

        {/* 일간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Day)}>
          <FontAwesome5
            name="dailymotion"
            size={30}
            color={tab === Tab.Day ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 주간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Week)}>
          <MaterialCommunityIcons
            name="calendar-week"
            size={30}
            color={tab === Tab.Week ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 월간 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.Month)}>
          <MaterialIcons
            name="calendar-month"
            size={30}
            color={tab === Tab.Month ? colors.secondary.main : colors.text.body}
          />
        </TouchableOpacity>

        {/* 마이페이지 */}
        <TouchableOpacity style={styles.tab} onPress={() => goTab(Tab.MyPage)}>
          <MaterialIcons
            name="account-box"
            size={30}
            color={
              tab === Tab.MyPage ? colors.secondary.main : colors.text.body
            }
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  pagerView: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabBar: {
    flex: 0.2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 4,
    borderTopColor: 'pink',
    backgroundColor: '#fff',
  },
  tab: { padding: 20 },
})
