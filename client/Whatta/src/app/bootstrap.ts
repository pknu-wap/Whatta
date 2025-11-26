import { token } from '@/lib/token'
import { guestLogin } from '@/api/auth'
import { getInstallationId } from '@/lib/uuid'
import { ensureDefaultLabels } from '@/app/ensureDefaultLabels'
import { bus } from '@/lib/eventBus'
import { registerFcmToken } from '@/lib/fcm';


export async function ensureAuthReady() {
  const iid = await getInstallationId()

  // 토큰이 없으면 게스트 로그인 1회 수행
  if (!token.getAccess() || !token.getRefresh()) {
    await guestLogin(iid)
  }
  await onSignedIn(iid)
}

async function onSignedIn(installationId: string) {
  const labels = await ensureDefaultLabels()
  bus.emit('labels:changed', { labels })

  try {
    await registerFcmToken(installationId)
  } catch (e) {
    console.log('FCM 토큰 등록 실패', e)
  }
}
