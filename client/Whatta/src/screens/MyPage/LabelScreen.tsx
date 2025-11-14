// screens/MyPage/LabelScreen.tsx
import React, { useEffect, useState } from 'react'
import EditableListScreen, { EditableItem } from '@/screens/MyPage/EditableListScreen'
import { http } from '@/lib/http'

type LabelDTO = { id: string; title: string }
const mapDto = (d: LabelDTO): EditableItem => ({ id: String(d.id), label: d.title })

export default function LabelsScreen() {
  const [items, setItems] = useState<EditableItem[]>([])
  const MAX = 10

  useEffect(() => {
    ;(async () => {
      const res = await http.get('/api/user/setting/label')

      // Swagger 응답 구조 기준
      const list: LabelDTO[] = res.data?.data?.labels ?? []

      setItems(list.map(mapDto))
    })()
  }, [])

  const onCreate = async (title: string): Promise<EditableItem> => {
    const res = await http.post('/api/user/setting/label', { title })
    const d: LabelDTO = res.data?.data ?? res.data
    return mapDto(d)
  }
  const onUpdate = async (id: string, title: string) => {
    await http.put(`/api/user/setting/label/${id}`, { title })
  }
  const onDelete = async (ids: string[]) => {
    await http.delete('/api/user/setting/label', {
      data: ids.map((x) => Number(x)),
    })

    // 삭제 후 즉시 다시 조회
    const res = await http.get('/api/user/setting/label')
    const list: LabelDTO[] = res.data?.data?.labels ?? []
    setItems(list.map(mapDto))
  }

  return (
    <EditableListScreen
      title="라벨관리"
      initialItems={items}
      onChange={setItems}
      inlineText // 인라인 편집 모드
      addFooterText="라벨 추가"
      maxCount={MAX}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
      addPlacement="footer"
    />
  )
}
