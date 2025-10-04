import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MainTabs from '@/navigation/MainStack'
import colors from '@/styles/colors'
import { DrawerToggleButton } from '@react-navigation/drawer'

const Root = createNativeStackNavigator()

export default function RootNavigator() {
  return (
    <Root.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerTintColor: colors.primary.main,
      }}
    >
      <Root.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          headerTitle: '',
        }}
      />
    </Root.Navigator>
  )
}
