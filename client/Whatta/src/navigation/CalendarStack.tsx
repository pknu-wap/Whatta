import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MonthView from '@/screens/Calender/Month/MonthView'
import WeekView from '@/screens/Calender/Week/WeekView'
import DayView from '@/screens/Calender/Day/DayView'

export type CalendarStackParamList = {
  Month: undefined
  Week: undefined
  Day: undefined
}

const Stack = createNativeStackNavigator<CalendarStackParamList>()

export default function CalendarStack() {
  return (
    <Stack.Navigator
      initialRouteName="Month"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Month" component={MonthView} />
      <Stack.Screen name="Week" component={WeekView} />
      <Stack.Screen name="Day" component={DayView} />
    </Stack.Navigator>
  )
}
