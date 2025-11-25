import axios from 'axios'
import { token } from '@/lib/token'
import { logToken } from '@/lib/debug'

const BASE = 'https://whatta-server-741565423469.asia-northeast3.run.app'
const GUEST_LOGIN_PATH = '/api/user/guest/login'
const REFRESH_PATH = '/api/auth/refresh'

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
  const { data } = await axios.post<GuestLoginResp>(`${BASE}${GUEST_LOGIN_PATH}`, {
    installationId,
  })
  await token.setBoth(data.data.accessToken, data.data.refreshToken)
  logToken('guestLogin', token.getAccess(), token.getRefresh())
}

export async function refreshTokens() {
  const rt = token.getRefresh()
  if (!rt) throw new Error('NO_REFRESH')
  const { data } = await axios.post<RefreshResp>(`${BASE}${REFRESH_PATH}`, 
{},
{
      headers: {
        Authorization: `Bearer ${rt}`,
      },
    }
)
  await token.setBoth(data.data.accessToken, data.data.refreshToken)
  logToken('refreshTokens', token.getAccess(), token.getRefresh())
}
