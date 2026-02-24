import axios from 'axios'
import Constants from 'expo-constants'
import { token } from '@/lib/token'
import { logToken } from '@/lib/debug'

const API_BASE_URL =
  ((Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    'https://whatta-server-741565423469.asia-northeast3.run.app/api').replace(/\/$/, '')
const GUEST_LOGIN_PATH = '/user/guest/login'
const REFRESH_PATH = '/auth/refresh'

type GuestLoginResp = {
  statuscode: string
  message: string
  data: { accessToken: string; refreshToken: string }
}

type RefreshResp = {
  statuscode: string
  message: string
  data: { accessToken: string; refreshToken: string }
}

export async function guestLogin(installationId: string) {
  const { data } = await axios.post<GuestLoginResp>(`${API_BASE_URL}${GUEST_LOGIN_PATH}`, {
    installationId,
  })
  await token.setBoth(data.data.accessToken, data.data.refreshToken)
  logToken('guestLogin', token.getAccess(), token.getRefresh())
}

export async function refreshTokens() {
  const rt = token.getRefresh()
  if (!rt) throw new Error('NO_REFRESH')
  const { data } = await axios.post<RefreshResp>(
    `${API_BASE_URL}${REFRESH_PATH}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${rt}`,
      },
    },
  )
  await token.setBoth(data.data.accessToken, data.data.refreshToken)
  logToken('refreshTokens', token.getAccess(), token.getRefresh())
}
