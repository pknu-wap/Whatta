import { createNativeStackNavigator } from '@react-navigation/native-stack'
import RootTabs from '@/navigation/RootTabs'
import MyPageStack from '@/navigation/MyPageStack'

export type RootStackParamList = {
  RootTabs: undefined
  MyPage: undefined
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
    </Root.Navigator>
  )
}
