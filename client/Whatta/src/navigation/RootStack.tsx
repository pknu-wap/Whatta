import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import DrawerNavigator from '@/navigation/DrawerNavigator'

const Root = createNativeStackNavigator()

export default function RootStack() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Main" component={DrawerNavigator} />
    </Root.Navigator>
  )
}
