import * as SecureStore from 'expo-secure-store'

let accessMem: string | null = null
let refreshMem: string | null = null

export const token = {
  getAccess() {
    return accessMem
  },
  getRefresh() {
    return refreshMem
  },

  async setBoth(access: string, refresh: string) {
    accessMem = access
    refreshMem = refresh
    await SecureStore.setItemAsync('whatta_access_token', access)
    await SecureStore.setItemAsync('whatta_refresh_token', refresh)
  },

  async clear() {
    accessMem = null
    refreshMem = null
    await SecureStore.deleteItemAsync('whatta_access_token')
    await SecureStore.deleteItemAsync('whatta_refresh_token')
  },
}
