import React, { createContext, useContext, useMemo, useState } from 'react'
import { Dimensions } from 'react-native'
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

type Ctx = {
  progress: SharedValue<number>
  open: () => void
  close: () => void
  toggle: () => void
  width: number
  selectedDate: string // 'YYYY-MM-DD'
  setSelectedDate: (iso: string) => void
  setMonth: (ym: string) => void // 'YYYY-MM-01' 같은 월 기준 변경
}

const Ctx = createContext<Ctx | null>(null)

export const DrawerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const width = Math.round(Dimensions.get('window').width * 0.55)
  const progress = useSharedValue(0)

  const today = () => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }
  const [selectedDate, setSelectedDate] = useState<string>(today())

  const open = () => {
    progress.value = withTiming(1, { duration: 220 })
  }
  const close = () => {
    progress.value = withTiming(0, { duration: 220 })
  }
  const toggle = () => {
    progress.value = withTiming(progress.value ? 0 : 1, { duration: 220 })
  }

  const setMonth = (ym: string) => {
    // ym은 'YYYY-MM-01' 형태라고 가정, 날짜는 1일로 고정
    setSelectedDate(ym)
  }

  const value = useMemo(
    () => ({
      progress,
      open,
      close,
      toggle,
      width,
      selectedDate,
      setSelectedDate,
      setMonth,
    }),
    [width, selectedDate],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useDrawer = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDrawer must be inside DrawerProvider')
  return v
}
