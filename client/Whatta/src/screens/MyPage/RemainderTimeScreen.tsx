// screens/MyPage/Remainder/RemainderTimeScreen.tsx
import React, { useState } from 'react'
import EditableListScreen, { EditableItem } from '@/screens/MyPage/EditableListScreen'

const kTime = (h: number, m: number) => {
  const ap = h < 12 ? '오전' : '오후'
  const hh = ((h + 11) % 12) + 1
  const mm = String(m).padStart(2, '0')
  return `${ap} ${hh}:${mm}`
}

export default function RemainderTimeScreen() {
  const [items, setItems] = useState<EditableItem[]>([
    { id: '1', label: kTime(9, 0) },
    { id: '2', label: kTime(10, 45) },
    { id: '3', label: kTime(13, 0) },
  ])

  const openPickerToAdd = async () => {
    /* 시간 피커 → setItems([...]) */
  }
  const openPickerToEdit = async (it: EditableItem) => {
    /* 시간 피커 → setItems(map) */
  }

  return (
    <EditableListScreen
      title="알림 시간 설정"
      initialItems={items}
      onChange={setItems}
      inlineText={false}
      onAddPress={openPickerToAdd}
      onEditPress={openPickerToEdit}
    />
  )
}
