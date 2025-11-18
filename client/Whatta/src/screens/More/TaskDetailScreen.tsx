import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'

export default function TaskScreen() {
  const navigation = useNavigation()
  return (
    <View style={styles.container}>
      <Text>테스크 상세</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
