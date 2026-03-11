const SLOT_KEY_RE = /^C\d{2}$/
const HEX_6_RE = /^#?[0-9A-Fa-f]{6}$/

// 일정 전용 팔레트(세트별 칩 개수는 동일하게 유지)
export const SCHEDULE_COLOR_SETS = {
  basic: [
    '#B04FFF',
    '#4775FF',
    '#FF7F2A',
    '#FFD52B',
    '#FF5025',
    '#FF79B3',
    '#5ECD1D',
    '#1DCD8D',
    '#6BC4D8',
    '#6B6BC8',
    '#7236AF',
    '#FF3434',
  ],
  set1: [
    '#957DB3',
    '#B8B654',
    '#735C45',
    '#AC7486',
    '#87494A',
    '#645E82',
    '#5C7766',
    '#999F70',
    '#CDB876',
    '#C27A4F',
    '#718F96',
    '#BFAFA2',
  ],
  set2: [
    '#EC7370',
    '#EE8181',
    '#F0A49A',
    '#F0BB8C',
    '#ECD4B4',
    '#EDE1A8',
    '#905D8F',
    '#B780B5',
    '#BE94BC',
    '#D3ABD7',
    '#B9B4E7',
    '#D7D5F5',
  ],
  set3: [
    '#899F78',
    '#88BA8B',
    '#A9CCAB',
    '#CDE1C8',
    '#B9C187',
    '#C7CBAD',
    '#78839F',
    '#889EBA',
    '#A9BCCC',
    '#C8D5E1',
    '#87C1BB',
    '#ADCBCB',
  ],
} as const

export type ScheduleColorSetId = keyof typeof SCHEDULE_COLOR_SETS
export type ScheduleSlotKey = `C${string}`
export const SCHEDULE_COLOR_SET_IDS = Object.keys(
  SCHEDULE_COLOR_SETS,
) as ScheduleColorSetId[]

export const DEFAULT_SET: ScheduleColorSetId = 'basic'
export const MAX_SCHEDULE_COLOR_SLOTS = SCHEDULE_COLOR_SETS[DEFAULT_SET].length
let activeScheduleColorSetId: ScheduleColorSetId = DEFAULT_SET
const resolvedColorCache = new Map<string, string>()

const resolveSetId = (setId?: ScheduleColorSetId): ScheduleColorSetId =>
  setId ?? activeScheduleColorSetId

export const getActiveScheduleColorSetId = (): ScheduleColorSetId => activeScheduleColorSetId

export const setActiveScheduleColorSetId = (setId: ScheduleColorSetId): ScheduleColorSetId => {
  activeScheduleColorSetId = setId
  resolvedColorCache.clear()
  return activeScheduleColorSetId
}

const formatSlotKey = (index: number): ScheduleSlotKey =>
  `C${String(index).padStart(2, '0')}`

// 슬롯키 생성: 0 -> C00, 1 -> C01
export const slotKey = (index: number): ScheduleSlotKey => {
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0
  const clamped = Math.min(Math.max(safeIndex, 0), MAX_SCHEDULE_COLOR_SLOTS - 1)
  return formatSlotKey(clamped)
}

// 슬롯키 파싱: 유효하지 않으면 -1
export const slotIndex = (key?: string | null): number => {
  if (!key || !SLOT_KEY_RE.test(key)) return -1
  return Number(key.slice(1))
}

// 선택 세트의 칩 목록 반환
export const getScheduleColorSet = (setId?: ScheduleColorSetId) =>
  SCHEDULE_COLOR_SETS[resolveSetId(setId)]

// 슬롯 목록(C00..)
export const getScheduleColorSlots = (setId?: ScheduleColorSetId): ScheduleSlotKey[] =>
  getScheduleColorSet(setId).map((_, i) => slotKey(i))

const normalizeHex = (value?: string | null): string | null => {
  if (!value) return null
  if (!HEX_6_RE.test(value)) return null
  return `#${value.replace('#', '').toUpperCase()}`
}

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

const findClosestSlotIndex = (hex: string, setId?: ScheduleColorSetId): number => {
  const target = hexToRgb(hex)
  const set = getScheduleColorSet(setId)
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY

  set.forEach((chip, idx) => {
    const c = hexToRgb(chip)
    const dr = target.r - c.r
    const dg = target.g - c.g
    const db = target.b - c.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = idx
    }
  })

  return best
}

// colorKey -> 화면 표시 HEX
// 1) Cnn 이면 세트 인덱스 색상
// 2) 기존 6자리 HEX면 basic에서 같은/가장 가까운 슬롯 색상으로 보정
// 3) 그 외 기본 슬롯(C00)
export const resolveScheduleColor = (
  colorKey: string | undefined,
  setId?: ScheduleColorSetId,
): string => {
  const resolvedSetId = resolveSetId(setId)
  const cacheKey = `${resolvedSetId}::${colorKey ?? '__EMPTY__'}`
  const cached = resolvedColorCache.get(cacheKey)
  if (cached) return cached

  const set = getScheduleColorSet(resolvedSetId)
  const idx = slotIndex(colorKey)
  if (idx >= 0 && idx < set.length) {
    const out = set[idx]
    resolvedColorCache.set(cacheKey, out)
    return out
  }

  const legacyHex = normalizeHex(colorKey)
  if (legacyHex) {
    const exact = set.findIndex((hex) => hex === legacyHex)
    const out = exact >= 0 ? set[exact] : set[findClosestSlotIndex(legacyHex, resolvedSetId)]
    resolvedColorCache.set(cacheKey, out)
    return out
  }

  const fallback = set[0]
  resolvedColorCache.set(cacheKey, fallback)
  return fallback
}

// 편집화면에서 현재 colorKey를 "선택 슬롯 index"로 맞출 때 사용
// - 슬롯키면 그대로 index
// - 레거시 HEX면 현재 세트에서 같은 칩을 찾아 index 반환
// - 못 찾으면 0
export const resolveSlotIndex = (
  colorKey: string | undefined,
  setId?: ScheduleColorSetId,
): number => {
  const set = getScheduleColorSet(setId)
  const idx = slotIndex(colorKey)
  if (idx >= 0 && idx < set.length) return idx

  const legacyHex = normalizeHex(colorKey)
  if (!legacyHex) return 0

  const found = set.findIndex((hex) => hex === legacyHex)
  if (found >= 0) return found

  return findClosestSlotIndex(legacyHex, setId)
}

// 서버/레거시 colorKey를 클라이언트 표준 키로 정규화
// - Cnn -> Cnn
// - basic 세트와 일치하는 HEX -> 해당 Cnn
// - 일치하지 않는 HEX -> 가장 가까운 basic 슬롯의 Cnn
// - 그 외 -> undefined
export const normalizeScheduleColorKey = (
  colorKey?: string | null,
  setId?: ScheduleColorSetId,
): string | undefined => {
  if (!colorKey) return undefined
  const trimmed = String(colorKey).trim()
  if (!trimmed) return undefined

  const normalizedSlot = trimmed.toUpperCase()
  const idx = slotIndex(normalizedSlot)
  if (idx >= 0 && idx < getScheduleColorSet(setId).length) return normalizedSlot

  const legacyHex = normalizeHex(trimmed)
  if (!legacyHex) return undefined

  return slotKey(findClosestSlotIndex(legacyHex, setId))
}
