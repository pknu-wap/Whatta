import React, { createContext, useContext, useMemo } from 'react'
import { Dimensions } from 'react-native'
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

type Ctx = {
  progress: SharedValue<number>
  open: () => void
  close: () => void
  toggle: () => void
  width: number
}

const Ctx = createContext<Ctx | null>(null)

export const DrawerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const width = Math.round(Dimensions.get('window').width * 0.55)
  const progress = useSharedValue(0)

  const open = () => {
    progress.value = withTiming(1, { duration: 220 })
  }
  const close = () => {
    progress.value = withTiming(0, { duration: 220 })
  }
  const toggle = () => {
    progress.value = withTiming(progress.value ? 0 : 1, { duration: 220 })
  }

  const value = useMemo(() => ({ progress, open, close, toggle, width }), [])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useDrawer = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDrawer must be inside DrawerProvider')
  return v
}
