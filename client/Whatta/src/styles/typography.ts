export type TypographyToken =
  | 'titleL'
  | 'titleM'
  | 'titleS'
  | 'label1'
  | 'label2'
  | 'label3'
  | 'label4'
  | 'label4Length'
  | 'label4Week'
  | 'body1'
  | 'body2'
  | 'body3'
  | 'date1'
  | 'date2'
  | 'date3'

// Legacy keys currently used in the app.
export type LegacyTypeVariant =
  | 'date'
  | 'label'
  | 'daySchedule'
  | 'time'
  | 'taskName'
  | 'monthDate'
  | 'place'
  | 'monthSchedule'
  | 'holiday'

export type TypeVariant = TypographyToken | LegacyTypeVariant

type FontWeight = '400' | '600' | '700'

type TypeStyle = {
  size: number
  lineHeight: number
  fontWeight: FontWeight
  letterSpacing: number
}

// Latest typography spec (SF Pro)
export const typographyScale: Record<TypographyToken, TypeStyle> = {
  titleL: { size: 20, lineHeight: 20, fontWeight: '700', letterSpacing: 0 },
  titleM: { size: 18, lineHeight: 20, fontWeight: '700', letterSpacing: 0 },
  titleS: { size: 16, lineHeight: 16, fontWeight: '700', letterSpacing: 0 },

  label1: { size: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0 },
  label2: { size: 14, lineHeight: 16, fontWeight: '700', letterSpacing: 0 },
  label3: { size: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0 },
  label4: { size: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 0 },
  label4Length: { size: 11, lineHeight: 11, fontWeight: '600', letterSpacing: 0 },
  label4Week: { size: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0 },

  body1: { size: 12, lineHeight: 17, fontWeight: '400', letterSpacing: 0 },
  body2: { size: 11, lineHeight: 15, fontWeight: '400', letterSpacing: 0 },
  body3: { size: 10, lineHeight: 14, fontWeight: '400', letterSpacing: 0 },

  date1: { size: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
  date2: { size: 12, lineHeight: 17, fontWeight: '400', letterSpacing: 0 },
  date3: { size: 11, lineHeight: 15, fontWeight: '400', letterSpacing: 0 },
}

// Compatibility map so existing ts('...') calls do not break.
const legacyMap: Record<LegacyTypeVariant, TypographyToken> = {
  date: 'date1',
  label: 'label3',
  daySchedule: 'label4',
  time: 'label4',
  taskName: 'label4',
  monthDate: 'date3',
  place: 'body3',
  monthSchedule: 'label4Length',
  holiday: 'body3',
}

export const typeScale: Record<TypeVariant, TypeStyle> = {
  ...typographyScale,
  date: typographyScale[legacyMap.date],
  label: typographyScale[legacyMap.label],
  daySchedule: typographyScale[legacyMap.daySchedule],
  time: typographyScale[legacyMap.time],
  taskName: typographyScale[legacyMap.taskName],
  monthDate: typographyScale[legacyMap.monthDate],
  place: typographyScale[legacyMap.place],
  monthSchedule: typographyScale[legacyMap.monthSchedule],
  holiday: typographyScale[legacyMap.holiday],
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
