import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import ScheduleWithTabs from '@/screens/Calender/ScheduleWithTabs'
import colors from '@/styles/colors'

export default function App() {
  return (
    <View style={styles.container}>
      <ScheduleWithTabs></ScheduleWithTabs>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
})
