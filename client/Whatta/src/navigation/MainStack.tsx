import { createNativeStackNavigator } from '@react-navigation/native-stack'
import BottomBar from '@/navigation/BottomTabBar'
import MyPageStack from '@/navigation/MyPageStack'
import TaskDetail from '@/screens/More/TaskDetailScreen'

const Stack = createNativeStackNavigator()

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BottomBar" component={BottomBar} />
      <Stack.Screen name="MyPageStack" component={MyPageStack} />
      <Stack.Screen name="TaskDetail" component={TaskDetail} />
    </Stack.Navigator>
  )
}
