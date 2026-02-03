export function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

// hex → 대비되는 텍스트 색(검정/흰색) 결정
export const textColorFor = (hex?: string) => {
  if (!hex) return '#FFFFFF'
  const h = hex.replace('#', '').toUpperCase()
  if (h === 'FFF' || h === 'FFFFFF') return '#000000'
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.7 ? '#000000' : '#FFFFFF'
}

// 컬러키 → 진한색/연한색 계산
export const colorsFromKey = (hex?: string) => {
  const base = (hex && `#${hex.replace('#', '')}`) || '#8B5CF6'
  const light = base.startsWith('#')
    ? `rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(
        base.slice(3, 5),
        16,
      )},${parseInt(base.slice(5, 7), 16)},0.2)`
    : 'rgba(139,92,246,0.2)'
  return { primary: base, light }
}