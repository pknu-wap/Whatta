import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'

type Props = {
  open: boolean
  value: Date
  onChange: (d: Date) => void
  height?: number
  fontSize?: number
  color?: string
}

const minutes5 = Array.from({ length: 12 }, (_, i) => i * 5) // 0..55

export default function InlineTimePicker({
  open,
  value,
  onChange,
  height = 160,
  fontSize = 18,
  color = '#111',
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

  // 12시간
  const hour24 = value.getHours()
  const isPM = hour24 >= 12
  const hour12 = ((hour24 + 11) % 12) + 1
  const minute = Math.round(value.getMinutes() / 5) * 5

  const setTime = (h12: number, m: number, nextPM: boolean) => {
    const base = h12 % 12
    const h24 = base + (nextPM ? 12 : 0)
    const next = new Date(value)
    next.setHours(h24, m, 0, 0)
    onChange(next) // 자동 닫기 없음
  }

  const Item = useMemo(
    () =>
      function Item({ label, value: v }: { label: string; value: any }) {
        return <Picker.Item label={label} value={v} color={color} />
      },
    [color],
  )

  // 각 컬럼 폭을 좀 더 붙여서 배치
  const hourWidth = '34%'
  const minWidth = '34%'
  const apWidth = '24%'

  return (
    <Animated.View
      style={[S.wrap, { height: animH }]}
      pointerEvents={open ? 'auto' : 'none'}
    >
      <View style={[S.container, { height }]}>
        {/* 시 */}
        <Picker
          selectedValue={hour12}
          onValueChange={(h: number) => setTime(h, minute, isPM)}
          itemStyle={{ fontSize, color }}
          style={[S.col, { width: hourWidth }]}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Item key={h} label={`${h}`} value={h} />
          ))}
        </Picker>

        {/* 분(5분 간격) */}
        <Picker
          selectedValue={minute}
          onValueChange={(m: number) => setTime(hour12, m, isPM)}
          itemStyle={{ fontSize, color }}
          style={[S.col, { width: minWidth }]}
        >
          {minutes5.map((m) => (
            <Item key={m} label={m.toString().padStart(2, '0')} value={m} />
          ))}
        </Picker>

        {/* 오전/오후 */}
        <Picker
          selectedValue={isPM ? 'PM' : 'AM'}
          onValueChange={(ampm: 'AM' | 'PM') => setTime(hour12, minute, ampm === 'PM')}
          itemStyle={{ fontSize, color }}
          style={[S.col, { width: apWidth }]}
        >
          <Item label="오전" value="AM" />
          <Item label="오후" value="PM" />
        </Picker>
      </View>
    </Animated.View>
  )
}

const S = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
})
