import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getMyLabels, type Label } from '@/api/label_api'
import { bus } from '@/lib/eventBus'

// 컨텍스트 안에서 쓸 값 타입
type LabelContextValue = {
  labels: Label[]
  refresh: () => Promise<void>
}

// 기본값: 아직 Provider 밖에서 쓰면 안 되므로 undefined 허용
const LabelContext = createContext<LabelContextValue | undefined>(undefined)

export function LabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Label[]>([])

  const FIXED_LABELS = ['일정', '할 일']

  const refresh = async () => {
    const list = await getMyLabels()

    const fixed = list.filter((l) => FIXED_LABELS.includes(l.title))
    const normal = list.filter((l) => !FIXED_LABELS.includes(l.title))

    // 항상 fixed → normal 순서로 정렬해서 저장
    setLabels([...fixed, ...normal])
  }

  // 앱 시작 시 1번 조회
  useEffect(() => {
    void refresh()
  }, [])

  // label:mutated 이벤트가 오면 다시 조회
  useEffect(() => {
    const handler = () => {
      void refresh()
    }
    bus.on('label:mutated', handler)
    return () => bus.off('label:mutated', handler)
  }, [])

  const value: LabelContextValue = { labels, refresh }

  return <LabelContext.Provider value={value}>{children}</LabelContext.Provider>
}

// 라벨 사용 훅 */
export function useLabels() {
  const ctx = useContext(LabelContext)
  if (!ctx) {
    throw new Error('useLabels는 LabelProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}
