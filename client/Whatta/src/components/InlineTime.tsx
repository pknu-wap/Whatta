import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
type ColType = 'ampm' | 'hour' | 'minute'

type Props = {
  open: boolean
  value: Date
  onChange: (d: Date) => void
  height?: number
  fontSize?: number
  color?: string
  columnOrder?: ColType[]
  amLabel?: string // 기본 '오전'
  pmLabel?: string // 기본 '오후'
  hourLabelFormatter?: (h12: number) => string
  minuteLabelFormatter?: (m: number) => string
}

const minutes5 = Array.from({ length: 12 }, (_, i) => i * 5) // 0..55
const BOX_W = 180 // 전체 너비
const BOX_H = 159 // 전체 높이
const HILITE_H = 24 // 중앙 선택 박스 높이
const GAP = 0 // 컬럼 사이 간격

const avail = BOX_W - GAP * 2 // 143 - 16 = 127

const W_AMPM = 58
const W_HOUR = 56 // 50 → 56
const W_MIN = 56 // 50 → 56

const FONT_HOURMIN = 14
const FONT_AMPM = 13

const COL_MARGIN = {
  ampm: { marginLeft: -4 },
  hour: { marginLeft: -6, marginRight: -6 },
  minute: { marginRight: -10 },
} as const

export default function InlineTime({
  open,
  value,
  onChange,
  height = 130, // 작게
  color = '#111',
  columnOrder = ['ampm', 'hour', 'minute'],
  amLabel = '오전',
  pmLabel = '오후',
  hourLabelFormatter = (h) => `${h}`,
  minuteLabelFormatter = (m) => m.toString().padStart(2, '0'),
}: Props) {
  const animH = useRef(new Animated.Value(open ? height : 0)).current

  useEffect(() => {
    Animated.timing(animH, {
      toValue: open ? height : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [open, height])

  const hour24 = value.getHours()
  const isPM = hour24 >= 12
  const hour12 = ((hour24 + 11) % 12) + 1
  const minute = Math.round(value.getMinutes() / 5) * 5

  const setTime = (h12: number, m: number, nextPM: boolean) => {
    const base = h12 % 12
    const h24 = base + (nextPM ? 12 : 0)
    const next = new Date(value)
    next.setHours(h24, m, 0, 0)
    onChange(next)
  }

  const Item = useMemo(
    () =>
      function Item({ label, value: v }: { label: string; value: any }) {
        return <Picker.Item label={label} value={v} color={color} />
      },
    [color],
  )

  // (1) 개별 컬럼 빌더는 그대로 두고
  const renderCol = (type: ColType) => {
    if (type === 'ampm') {
      const selected: 'AM' | 'PM' = isPM ? 'PM' : 'AM'
      return (
        <Picker<'AM' | 'PM'>
          selectedValue={selected}
          onValueChange={(ampm) => setTime(hour12, minute, ampm === 'PM')}
          style={{ width: W_AMPM, height: BOX_H }}
          itemStyle={{
            fontSize: FONT_AMPM,
            lineHeight: FONT_AMPM * 1.35,
            textAlign: 'center',
          }}
        >
          <Item label={amLabel} value="AM" />
          <Item label={pmLabel} value="PM" />
        </Picker>
      )
    }
    if (type === 'hour') {
      return (
        <Picker<number>
          selectedValue={hour12}
          onValueChange={(h) => setTime(h, minute, isPM)}
          style={{ width: W_HOUR, height: BOX_H }}
          itemStyle={{
            fontSize: FONT_HOURMIN,
            lineHeight: FONT_HOURMIN * 1.35,
            textAlign: 'center',
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Item key={h} label={hourLabelFormatter(h)} value={h} />
          ))}
        </Picker>
      )
    }
    // minute
    return (
      <Picker<number>
        selectedValue={minute}
        onValueChange={(m) => setTime(hour12, m, isPM)}
        style={{ width: W_MIN, height: BOX_H }}
        itemStyle={{
          fontSize: FONT_HOURMIN,
          lineHeight: FONT_HOURMIN * 1.35,
          textAlign: 'center',
        }}
      >
        {minutes5.map((m) => (
          <Item key={m} label={minuteLabelFormatter(m)} value={m} />
        ))}
      </Picker>
    )
  }

  // (2) 반환부에서 고정 순서 ➜ columnOrder 순서로 렌더
  return (
    <Animated.View
      style={{ height: open ? BOX_H : 0, overflow: 'hidden' }}
      pointerEvents={open ? 'auto' : 'none'}
    >
      <View
        style={{
          width: BOX_W,
          height: BOX_H,
          alignSelf: 'center',
          position: 'relative',
          justifyContent: 'center',
        }}
      >
        {/* 3컬럼 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: BOX_W,
            height: BOX_H,
          }}
        >
          {columnOrder.map((t) => (
            <View key={t} style={COL_MARGIN[t]}>
              {renderCol(t)}
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  )
}

const S = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12 },
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: GAP,
  },
})
