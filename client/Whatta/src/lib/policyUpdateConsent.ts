import * as SecureStore from 'expo-secure-store'

const POLICY_UPDATE_CONSENT_STORE_KEY = 'whatta_policy_update_consent'
export const POLICY_UPDATE_EFFECTIVE_DATE = '2026년 03월 26일'

type StoredPolicyUpdateConsent = {
  version?: string
  status?: 'agreed' | 'declined'
}

export async function hasAgreedToCurrentPolicyUpdate() {
  const raw = await SecureStore.getItemAsync(POLICY_UPDATE_CONSENT_STORE_KEY)
  if (!raw) return false

  try {
    const parsed = JSON.parse(raw) as StoredPolicyUpdateConsent
    return (
      parsed.version === POLICY_UPDATE_EFFECTIVE_DATE &&
      parsed.status === 'agreed'
    )
  } catch {
    return false
  }
}

export async function writePolicyUpdateConsent(status: 'agreed' | 'declined') {
  await SecureStore.setItemAsync(
    POLICY_UPDATE_CONSENT_STORE_KEY,
    JSON.stringify({
      version: POLICY_UPDATE_EFFECTIVE_DATE,
      status,
    } satisfies StoredPolicyUpdateConsent),
  )
}
