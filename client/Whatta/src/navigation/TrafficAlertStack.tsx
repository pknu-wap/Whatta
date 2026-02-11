import { createNativeStackNavigator } from '@react-navigation/native-stack'
import TrafficAlertScreen from '@/screens/MyPage/Traffic/TrafficAlertScreen'
import TrafficAlertEditScreen from '@/screens/MyPage/Traffic/TrafficAlertEditScreen'

export type TrafficAlertStackList = {
  TrafficAlerts: undefined
  TrafficAlertEdit: { mode?: 'create' | 'edit'; alertId?: string }
}

const Stack = createNativeStackNavigator<TrafficAlertStackList>()

export default function TrafficAlertStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrafficAlerts" component={TrafficAlertScreen} />
      <Stack.Screen name="TrafficAlertEdit" component={TrafficAlertEditScreen} />
    </Stack.Navigator>
  )
}
