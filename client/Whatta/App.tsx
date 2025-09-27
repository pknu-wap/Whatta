import 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import colors from '@/styles/colors'
import RootStack from '@/navigation/RootStack'

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
})
