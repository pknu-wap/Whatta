import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import EditableListScreen, { EditableItem } from '@/components/mypage/EditableListScreen'
import { http } from '@/lib/http'

type LabelDTO = { id: string; title: string }
const mapDto = (d: LabelDTO): EditableItem => ({ id: String(d.id), label: d.title })

export default function LabelsScreen() {
  const [items, setItems] = useState<EditableItem[]>([])
  const MAX = 10

  useEffect(() => {
    ;(async () => {
      const res = await http.get('/api/user/setting/label')
      const list: LabelDTO[] = res.data?.data?.labels ?? []
      setItems(list.map(mapDto))
    })()
  }, [])

  const onCreate = async (title: string): Promise<EditableItem> => {
    const exists = items.some((x) => x.label === title.trim())
    if (exists) {
      Alert.alert('중복 라벨', '이미 같은 이름의 라벨이 있습니다.')
      throw new Error('duplicate')
    }
    const res = await http.post('/api/user/setting/label', { title })
    const d: LabelDTO = res.data?.data ?? res.data
    return mapDto(d)
  }
  const onUpdate = async (id: string, title: string) => {
    const exists = items.some((x) => x.label === title.trim() && x.id !== id)
    if (exists) {
      Alert.alert('중복 라벨', '이미 같은 이름의 라벨이 있습니다.')
      throw new Error('duplicate')
    }
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
      inlineText
      addFooterText="라벨 추가"
      maxCount={10}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
      addPlacement="footer"
    />
  )
}
