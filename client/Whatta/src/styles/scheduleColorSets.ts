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

export const DEFAULT_SET: ScheduleColorSetId = 'basic'
export const MAX_SCHEDULE_COLOR_SLOTS = SCHEDULE_COLOR_SETS[DEFAULT_SET].length
export const SCHEDULE_COLOR_SET_CHANGED = 'schedule:color-set-changed'

let activeSetId: ScheduleColorSetId = DEFAULT_SET

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
export const getScheduleColorSet = (setId: ScheduleColorSetId) =>
  SCHEDULE_COLOR_SETS[setId]

export const getScheduleColorSetIds = (): ScheduleColorSetId[] =>
  Object.keys(SCHEDULE_COLOR_SETS) as ScheduleColorSetId[]

export const getActiveScheduleColorSet = (): ScheduleColorSetId => activeSetId

export const setActiveScheduleColorSet = (setId: string): ScheduleColorSetId => {
  const nextSet = (getScheduleColorSetIds().includes(setId as ScheduleColorSetId)
    ? setId
    : DEFAULT_SET) as ScheduleColorSetId
  activeSetId = nextSet
  return activeSetId
}

// 슬롯 목록(C00..)
export const getScheduleColorSlots = (setId: ScheduleColorSetId): ScheduleSlotKey[] =>
  getScheduleColorSet(setId).map((_, i) => slotKey(i))

const normalizeHex = (value?: string | null): string | null => {
  if (!value) return null
  if (!HEX_6_RE.test(value)) return null
  return `#${value.replace('#', '').toUpperCase()}`
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

// colorKey -> 화면 표시 HEX
// 1) Cnn 이면 세트 인덱스 색상
// 2) 기존 6자리 HEX면 그대로 사용(레거시 호환)
// 3) 그 외 기본 슬롯(C00)
export const resolveScheduleColor = (
  colorKey: string | undefined,
  setId: ScheduleColorSetId = getActiveScheduleColorSet(),
): string => {
  const set = getScheduleColorSet(setId)
  const idx = slotIndex(colorKey)
  if (idx >= 0 && idx < set.length) return set[idx]

  const legacyHex = normalizeHex(colorKey)
  if (legacyHex) return legacyHex

  return set[0]
}

// 편집화면에서 현재 colorKey를 "선택 슬롯 index"로 맞출 때 사용
// - 슬롯키면 그대로 index
// - 레거시 HEX면 현재 세트에서 같은 칩을 찾아 index 반환
// - 못 찾으면 0
export const resolveSlotIndex = (
  colorKey: string | undefined,
  setId: ScheduleColorSetId = getActiveScheduleColorSet(),
): number => {
  const set = getScheduleColorSet(setId)
  const idx = slotIndex(colorKey)
  if (idx >= 0 && idx < set.length) return idx

  const legacyHex = normalizeHex(colorKey)
  if (!legacyHex) return 0

  const found = set.findIndex((hex) => hex === legacyHex)
  return found >= 0 ? found : 0
}

// 저장 시점 변환:
// - Cnn이면 그대로 유지
// - HEX면 현재 세트에서 가장 가까운 칩으로 Cnn 변환
// - 유효하지 않으면 C00
export const toScheduleColorKeyForSave = (
  colorKey: string | undefined,
  setId: ScheduleColorSetId = getActiveScheduleColorSet(),
): string => {
  const idx = slotIndex(colorKey)
  if (idx >= 0 && idx < MAX_SCHEDULE_COLOR_SLOTS) return slotKey(idx)

  const normalizedHex = normalizeHex(colorKey)
  if (!normalizedHex) return slotKey(0)

  const set = getScheduleColorSet(setId)
  const found = set.findIndex((hex) => hex === normalizedHex)
  if (found >= 0) return slotKey(found)

  const src = hexToRgb(normalizedHex)
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  set.forEach((hex, idx) => {
    const dst = hexToRgb(hex)
    const dr = src.r - dst.r
    const dg = src.g - dst.g
    const db = src.b - dst.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < nearestDistance) {
      nearestDistance = dist
      nearestIndex = idx
    }
  })

  return slotKey(nearestIndex)
}

// 할 일처럼 colorKey가 없는 항목도 세트 변경 테스트가 가능하도록 seed 기반 슬롯을 만든다.
export const slotKeyFromSeed = (seed: string | number): ScheduleSlotKey => {
  const text = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return slotKey(hash % MAX_SCHEDULE_COLOR_SLOTS)
}
