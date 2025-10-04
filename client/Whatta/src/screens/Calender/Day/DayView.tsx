import { View, Text, StyleSheet } from 'react-native'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'

export default function DayView() {
  return (
    <ScreenWithSidebar mode="push">
      <View style={S.container}>
        <Text> 일간 화면일간 화면일간 화면일간 화면일간 화면</Text>
      </View>
    </ScreenWithSidebar>
  )
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
