import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { token } from '@/lib/token'
import { refreshTokens, guestLogin } from '@/api/auth'
import { getInstallationId } from '@/lib/uuid'

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://whatta-server-741565423469.asia-northeast3.run.app/api'

export const http = axios.create({
  baseURL: API_BASE_URL,
})

http.interceptors.request.use((config) => {
  ;(config.headers as any).accept = 'application/json'

  const at = token.getAccess()
  if (at) {
    ;(config.headers as any).Authorization = `Bearer ${at}`
  }
  return config
})

let refreshPromise: Promise<any> | null = null

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }

    // 액세스 만료로 추정되는 401만 처리
    if (status === 401 && !original?._retry) {
      original._retry = true

      try {
        // 동시에 여러 요청이 401을 맞아도 리프레시는 한 번만 수행
        refreshPromise = refreshPromise ?? refreshTokens()
        await refreshPromise
      } catch {
        // 리프레시도 실패 → 게스트 재로그인
        const iid = await getInstallationId()
        await guestLogin(iid)
      } finally {
        refreshPromise = null
      }

      // 새 토큰으로 원래 요청 1회 재시도
      const at = token.getAccess()
      if (at) (original.headers ||= {}).Authorization = `Bearer ${at}`
      return http(original)
    }

    return Promise.reject(error)
  },
)
