export type TypeVariant =
  | 'date'
  | 'label'
  | 'daySchedule'
  | 'time'
  | 'taskName'
  | 'monthDate'
  | 'place'
  | 'monthSchedule'
  | 'holiday'

const ls = (size: number, pct: number) => Number((size * pct).toFixed(2))

export const typeScale: Record<
  TypeVariant,
  {
    size: number
    lineHeight: number
    fontWeight: '400' | '500' | '600'
    letterSpacing?: number
  }
> = {
  date: { size: 16, lineHeight: 23, fontWeight: '600', letterSpacing: ls(16, -0.04) }, // -4%
  label: { size: 12, lineHeight: 20, fontWeight: '400', letterSpacing: ls(12, -0.04) },
  daySchedule: { size: 11, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  time: { size: 11, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  taskName: { size: 11, lineHeight: 22, fontWeight: '500', letterSpacing: 0 },
  monthDate: {
    size: 11,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: ls(11, -0.04),
  },
  place: { size: 10, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
  monthSchedule: { size: 8, lineHeight: 10, fontWeight: '600', letterSpacing: 0 },
  holiday: { size: 7, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
}

export const ts = (v: TypeVariant) => {
  const t = typeScale[v]
  return {
    fontSize: t.size,
    lineHeight: t.lineHeight,
    fontWeight: t.fontWeight,
    letterSpacing: t.letterSpacing,
  }
}
