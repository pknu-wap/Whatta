import 'react-native-gesture-handler'
import React, { createContext, useState, useCallback } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import RootStack from '@/navigation/RootStack'

// ✅ 타입 정의
export interface LabelItem {
  id: string
  name: string
  color: string
  enabled: boolean
}

interface FilterContextType {
  labels: LabelItem[]
  toggleLabel: (id: string) => void
  toggleAll: () => void
}

// ✅ Context 생성
export const FilterContext = createContext<FilterContextType>({
  labels: [],
  toggleLabel: () => {},
  toggleAll: () => {},
})

export default function App() {
  const [labels, setLabels] = useState<LabelItem[]>([
    { id: '1', name: '과제', color: '#B04FFF', enabled: true },
    { id: '2', name: '시간표', color: '#B04FFF', enabled: true },
    { id: '3', name: '약속', color: '#B04FFF', enabled: true },
    { id: '4', name: '동아리', color: '#B04FFF', enabled: true },
  ])

  // ✅ 특정 라벨 토글
  const toggleLabel = useCallback((id: string) => {
    setLabels(prev =>
      prev.map(l => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    )
  }, [])

  // ✅ 전체 토글
  const toggleAll = useCallback(() => {
    const allOn = labels.every(l => l.enabled)
    setLabels(prev => prev.map(l => ({ ...l, enabled: !allOn })))
  }, [labels])

  return (
    <FilterContext.Provider value={{ labels, toggleLabel, toggleAll }}>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </FilterContext.Provider>
  )
}
