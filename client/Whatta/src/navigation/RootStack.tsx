import { createNativeStackNavigator } from '@react-navigation/native-stack'
import RootTabs from '@/navigation/RootTabs'
import MyPageStack from '@/navigation/MyPageStack'
import TrafficAlertStack from '@/navigation/TrafficAlertStack'
import AssistantTopicTasksScreen from '@/screens/Home/AssistantTopicTasksScreen'
import WeatherCardPreviewScreen from '@/screens/Dev/WeatherCardPreviewScreen'

export type RootStackParamList = {
  RootTabs: undefined
  MyPage: undefined
  TrafficAlerts: undefined
  AssistantTopicTasks: { topicId: string }
  WeatherCardPreview: undefined
}

const Root = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <Root.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: 'transparent',
        },
        animation: 'none',
      }}
    >
      <Root.Screen
        name="RootTabs"
        component={RootTabs}
        options={{
          headerTitle: '',
        }}
      />
      <Root.Screen
        name="MyPage"
        component={MyPageStack}
        options={{
          headerShown: false,
        }}
      />
      <Root.Screen
        name="TrafficAlerts"
        component={TrafficAlertStack}
        options={{
          headerShown: false,
        }}
      />
      <Root.Screen
        name="AssistantTopicTasks"
        component={AssistantTopicTasksScreen}
        options={{
          headerShown: false,
        }}
      />
      <Root.Screen
        name="WeatherCardPreview"
        component={WeatherCardPreviewScreen}
        options={{
          headerShown: false,
        }}
      />
    </Root.Navigator>
  )
}
