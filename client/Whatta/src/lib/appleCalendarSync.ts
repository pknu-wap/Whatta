import * as SecureStore from 'expo-secure-store'
import { bus } from '@/lib/eventBus'

const APPLE_CALENDAR_SYNC_STATE_KEY = 'whatta_apple_calendar_sync_state'
const APPLE_CALENDAR_PROMPT_DISMISSED_KEY = 'whatta_apple_calendar_prompt_dismissed'
const APPLE_CALENDAR_EVENT_LINKS_KEY = 'whatta_apple_calendar_event_links'
const APPLE_CALENDAR_EVENT_MIRRORS_KEY = 'whatta_apple_calendar_event_mirrors'

export type AppleCalendarPermissionState = 'unknown' | 'granted' | 'denied'

export type AppleCalendarSyncState = {
  isConnected: boolean
  calendarId: string | null
  calendarTitle: string | null
  sourceId: string | null
  sourceName: string | null
  sourceType: string | null
  permissionStatus: AppleCalendarPermissionState
  initialExportDone: boolean
  lastSyncedAt: string | null
}

const DEFAULT_STATE: AppleCalendarSyncState = {
  isConnected: false,
  calendarId: null,
  calendarTitle: null,
  sourceId: null,
  sourceName: null,
  sourceType: null,
  permissionStatus: 'unknown',
  initialExportDone: false,
  lastSyncedAt: null,
}

function normalizeState(raw: Partial<AppleCalendarSyncState> | null | undefined): AppleCalendarSyncState {
  return {
    ...DEFAULT_STATE,
    ...raw,
    permissionStatus:
      raw?.permissionStatus === 'granted' || raw?.permissionStatus === 'denied'
        ? raw.permissionStatus
        : 'unknown',
  }
}

export async function getAppleCalendarSyncState() {
  const raw = await SecureStore.getItemAsync(APPLE_CALENDAR_SYNC_STATE_KEY)
  if (!raw) return DEFAULT_STATE

  try {
    return normalizeState(JSON.parse(raw))
  } catch {
    return DEFAULT_STATE
  }
}

export async function setAppleCalendarSyncState(next: Partial<AppleCalendarSyncState>) {
  const current = await getAppleCalendarSyncState()
  const merged = normalizeState({ ...current, ...next })
  await SecureStore.setItemAsync(APPLE_CALENDAR_SYNC_STATE_KEY, JSON.stringify(merged))
  bus.emit('appleCalendar:state-changed', merged)
  return merged
}

export async function resetAppleCalendarSyncState() {
  await SecureStore.setItemAsync(APPLE_CALENDAR_SYNC_STATE_KEY, JSON.stringify(DEFAULT_STATE))
  await SecureStore.deleteItemAsync(APPLE_CALENDAR_PROMPT_DISMISSED_KEY)
  bus.emit('appleCalendar:state-changed', DEFAULT_STATE)
  return DEFAULT_STATE
}

export async function isAppleCalendarPromptDismissed() {
  return (await SecureStore.getItemAsync(APPLE_CALENDAR_PROMPT_DISMISSED_KEY)) === '1'
}

export async function setAppleCalendarPromptDismissed(dismissed: boolean) {
  if (dismissed) {
    await SecureStore.setItemAsync(APPLE_CALENDAR_PROMPT_DISMISSED_KEY, '1')
  } else {
    await SecureStore.deleteItemAsync(APPLE_CALENDAR_PROMPT_DISMISSED_KEY)
  }
}

export async function shouldShowAppleCalendarPrompt() {
  return false
}

export async function getAppleCalendarEventLinks() {
  const raw = await SecureStore.getItemAsync(APPLE_CALENDAR_EVENT_LINKS_KEY)
  if (!raw) return {} as Record<string, string>

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export async function getAppleCalendarEventLink(whattaEventId: string) {
  const links = await getAppleCalendarEventLinks()
  return links[whattaEventId] ?? null
}

export async function setAppleCalendarEventLink(whattaEventId: string, appleEventId: string) {
  const links = await getAppleCalendarEventLinks()
  links[whattaEventId] = appleEventId
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_LINKS_KEY, JSON.stringify(links))
}

export async function removeAppleCalendarEventLink(whattaEventId: string) {
  const links = await getAppleCalendarEventLinks()
  delete links[whattaEventId]
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_LINKS_KEY, JSON.stringify(links))
}

export async function getAppleCalendarEventLinksByPrefix(prefix: string) {
  const links = await getAppleCalendarEventLinks()
  return Object.entries(links)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({ key, value }))
}

export async function removeAppleCalendarEventLinksByPrefix(prefix: string) {
  const links = await getAppleCalendarEventLinks()
  let changed = false

  for (const key of Object.keys(links)) {
    if (key.startsWith(prefix)) {
      delete links[key]
      changed = true
    }
  }

  if (changed) {
    await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_LINKS_KEY, JSON.stringify(links))
  }
}

export async function clearAppleCalendarEventLinks() {
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_LINKS_KEY, JSON.stringify({}))
}

export type AppleCalendarEventSnapshot = {
  title: string
  content: string
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
}

export type AppleCalendarEventMirror = {
  appleEventId: string
  whattaEventId: string
  snapshot: AppleCalendarEventSnapshot
}

export async function getAppleCalendarEventMirrors() {
  const raw = await SecureStore.getItemAsync(APPLE_CALENDAR_EVENT_MIRRORS_KEY)
  if (!raw) return {} as Record<string, AppleCalendarEventMirror>

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, AppleCalendarEventMirror>)
      : {}
  } catch {
    return {}
  }
}

export async function getAppleCalendarEventMirror(appleEventId: string) {
  const mirrors = await getAppleCalendarEventMirrors()
  return mirrors[appleEventId] ?? null
}

export async function setAppleCalendarEventMirror(mirror: AppleCalendarEventMirror) {
  const mirrors = await getAppleCalendarEventMirrors()
  mirrors[mirror.appleEventId] = mirror
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_MIRRORS_KEY, JSON.stringify(mirrors))
}

export async function removeAppleCalendarEventMirror(appleEventId: string) {
  const mirrors = await getAppleCalendarEventMirrors()
  delete mirrors[appleEventId]
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_MIRRORS_KEY, JSON.stringify(mirrors))
}

export async function findAppleCalendarEventMirrorByWhattaId(whattaEventId: string) {
  const mirrors = await getAppleCalendarEventMirrors()
  return (
    Object.values(mirrors).find((mirror) => mirror.whattaEventId === whattaEventId) ?? null
  )
}

export async function clearAppleCalendarEventMirrors() {
  await SecureStore.setItemAsync(APPLE_CALENDAR_EVENT_MIRRORS_KEY, JSON.stringify({}))
}
