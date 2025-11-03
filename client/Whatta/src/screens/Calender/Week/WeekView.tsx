import { View, Text, StyleSheet } from 'react-native'
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'

export default function Week() {
  return (
    <ScreenWithSidebar mode="overlay">
      <View style={S.container}>
        <Text>주간 화면</Text>
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
