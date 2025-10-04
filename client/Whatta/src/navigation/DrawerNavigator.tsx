import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import MainStack from '@/navigation/MainStack'
import Sidebar from '@/components/sidebar/Sidebar'

const Drawer = createDrawerNavigator()

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        drawerType: 'slide',
        headerShown: true,
        drawerStyle: { width: 240 },
      }}
    >
      <Drawer.Screen name="Calendar" component={MainStack} />
    </Drawer.Navigator>
  )
}
