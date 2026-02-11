import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import EditableListScreen, { EditableItem } from '@/components/mypage/EditableListScreen'
import { getMyLabels, createLabel, updateLabel, deleteLabels } from '@/api/label_api'
import { bus } from '@/lib/eventBus'

export default function LabelsScreen() {
  const [items, setItems] = useState<EditableItem[]>([])
  const MAX = 10
  const FIXED_LABELS = ['일정', '할 일']

  // 최초 진입 시 라벨 조회 (전역과 동일한 API 사용)
  const load = async () => {
    const list = await getMyLabels()

    const items = list.map((l) => ({
      id: String(l.id),
      label: l.title,
      fixed: FIXED_LABELS.includes(l.title),
    }))

    setItems(items)
  }
  useEffect(() => {
    load()
  }, [])

  const onCreate = async (title: string): Promise<EditableItem> => {
    const exists = items.some((x) => x.label === title.trim())
    if (exists) {
      return Promise.reject({ code: 'duplicate' })
    }

    const created = await createLabel(title)
    bus.emit('label:mutated') // 전역 갱신

    return { id: String(created.id), label: created.title }
  }
  const onUpdate = async (id: string, title: string) => {
    const exists = items.some((x) => x.label === title.trim() && x.id !== id)
    if (exists) {
      return Promise.reject({ code: 'duplicate' })
    }

    await updateLabel(Number(id), title)
    bus.emit('label:mutated')
  }

  const onDelete = async (ids: string[]) => {
    await deleteLabels(ids.map(Number))
    bus.emit('label:mutated')

    await load() // 삭제 후 리스트 다시 조회
  }

  return (
    <EditableListScreen
      title="라벨관리"
      initialItems={items}
      inlineText
      addFooterText="라벨 추가"
      maxCount={MAX}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
      addPlacement="footer"
    />
  )
}
