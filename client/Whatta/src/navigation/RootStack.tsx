import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import BottomBar from '@/screens/Calender/ScheduleWithTabs'
import MyPageStack from '@/navigation/MyPageStack'
import TaskDetail from '@/screens/More/TaskDetailScreen'

const Root = createNativeStackNavigator()

export default function RootStack() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="ScheduleWithTabs" component={BottomBar} />
      <Root.Screen name="MyPageStack" component={MyPageStack} />
      <Root.Screen name="TaskDetail" component={TaskDetail} />
    </Root.Navigator>
  )
}
