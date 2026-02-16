import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLabels } from '@/providers/LabelProvider'
import type { Label } from '@/api/label_api'

// 필터용 라벨 아이템
export type LabelFilterItem = {
  id: number
  title: string
  enabled: boolean
}

type LabelFilterContextValue = {
  items: LabelFilterItem[]
  toggleLabel: (id: number) => void
  toggleAll: () => void
}

const LabelFilterContext = createContext<LabelFilterContextValue | undefined>(undefined)

export function LabelFilterProvider({ children }: { children: ReactNode }) {
  const { labels } = useLabels() // 서버에서 받아온 Label[] (id, title)
  const [items, setItems] = useState<LabelFilterItem[]>([])

  // 서버 라벨 바뀔 때마다 enabled 상태 유지하면서 merge
  useEffect(() => {
    setItems((prev) => {
      const prevMap = new Map(prev.map((i) => [i.id, i.enabled]))
      return labels.map((l) => ({
        id: l.id,
        title: l.title,
        enabled: prevMap.get(l.id) ?? true, // 새로 생긴 라벨은 켜진 상태로
      }))
    })
  }, [labels])

  const toggleLabel = (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)))
  }

  const toggleAll = () => {
    setItems((prev) => {
      if (prev.length === 0) return prev
      const allOn = prev.every((i) => i.enabled)
      return prev.map((i) => ({ ...i, enabled: !allOn }))
    })
  }

  const value = useMemo(
    () => ({
      items,
      toggleLabel,
      toggleAll,
    }),
    [items],
  )

  return (
    <LabelFilterContext.Provider value={value}>{children}</LabelFilterContext.Provider>
  )
}

export function useLabelFilter() {
  const ctx = useContext(LabelFilterContext)
  if (!ctx) {
    throw new Error('useLabelFilter는 LabelFilterProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}
