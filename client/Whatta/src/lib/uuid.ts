import * as SecureStore from 'expo-secure-store'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

const KEY = 'whatta_installation_id'

// 앱 최초 1회 생성 후 계속 재사용
export async function getInstallationId(): Promise<string> {
  const saved = await SecureStore.getItemAsync(KEY)
  if (saved) return saved

  const fresh = uuidv4()
  await SecureStore.setItemAsync(KEY, fresh)
  return fresh
}
