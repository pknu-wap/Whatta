import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MainTabs from '@/navigation/MainStack'
import ScheduleDetailScreen from '@/screens/More/ScheduleDetailScreen'

const Root = createNativeStackNavigator()

export default function RootNavigator() {
  return (
    <Root.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Root.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          headerTitle: '',
        }}
      />
      <Root.Screen
        name="AddSchedule"
        component={ScheduleDetailScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
    </Root.Navigator>
  )
}
