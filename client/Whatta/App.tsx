import 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import colors from '@/styles/colors'
import RootStack from '@/navigation/RootStack'
import { useATTOnActive } from '@/hooks/useATTOnActive'

export default function App() {

  // 앱이 iOS에서 active 될 때 1회 ATT 요청
  useATTOnActive({ requestOnFirstActive: true, debug: __DEV__ })

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
