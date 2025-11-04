import { token } from '@/lib/token'
import { guestLogin } from '@/api/auth'
import { getInstallationId } from '@/lib/uuid'
import { ensureDefaultLabels } from '@/app/ensureDefaultLabels'
import { bus } from '@/lib/eventBus'


export async function ensureAuthReady() {
  // 토큰이 없으면 게스트 로그인 1회 수행
  if (!token.getAccess() || !token.getRefresh()) {
    const iid = await getInstallationId()
    await guestLogin(iid)
  }
  await onSignedIn()
}

async function onSignedIn() {
  const labels = await ensureDefaultLabels()
  bus.emit('labels:changed', { labels })
}
