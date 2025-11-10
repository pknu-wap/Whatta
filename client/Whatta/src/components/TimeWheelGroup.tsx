import React from 'react'
import { View } from 'react-native'
import { TimeWheelColumn } from '@/components/TimWheelColumn'

const H = 32,
  VISIBLE = 5
const BOX_H = H * VISIBLE

export default function TimeWheelGroup({
  date,
  onChange,
  wHour = 44,
  wMin = 45,
  wAmPm = 54,
  gap = 10,
  fontSize = 18,
  minuteStep = 5,
}: {
  date: Date
  onChange: (d: Date) => void
  wHour?: number
  wMin?: number
  wAmPm?: number
  gap?: number
  fontSize?: number
  minuteStep?: number
}) {
  const h24 = date.getHours()
  const isPM = h24 >= 12
  const h12 = ((h24 + 11) % 12) + 1
  const m = date.getMinutes() - (date.getMinutes() % minuteStep)

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
  const MINUTES = Array.from({ length: 60 / minuteStep }, (_, i) =>
    String(i * minuteStep).padStart(2, '0'),
  )
  const AMPM = ['AM', 'PM']

  const set = (nh: number, nm: number, nap: number) => {
    const hh24 = nap === 1 ? (nh % 12) + 12 : nh % 12 // PM이면 12 더함(12는 0 처리)
    const d = new Date(date)
    d.setHours(hh24 === 24 ? 12 : hh24 === 0 ? 0 : hh24, nm, 0, 0)
    onChange(d)
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: BOX_H,
      }}
    >
      <TimeWheelColumn
        data={HOURS}
        index={h12 - 1}
        onChange={(idx) => set(idx + 1, m, isPM ? 1 : 0)}
        width={wHour}
        fontSize={fontSize}
      />
      <View style={{ width: gap }} />
      <TimeWheelColumn
        data={MINUTES}
        index={m / minuteStep}
        onChange={(idx) => set(h12, idx * minuteStep, isPM ? 1 : 0)}
        width={wMin}
        fontSize={fontSize}
      />
      <View style={{ width: gap }} />
      <TimeWheelColumn
        data={AMPM}
        index={isPM ? 1 : 0}
        onChange={(idx) => set(h12, m, idx)}
        width={wAmPm}
        fontSize={fontSize}
      />
    </View>
  )
}
