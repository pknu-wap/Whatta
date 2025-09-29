import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import ReminderOffsetTimeModal, {
  OffsetUnit,
} from '@/screens/MyPage/Remainder/RemainderOffset'
import { Ionicons } from '@expo/vector-icons'
import colors from '@/styles/colors'

type Item = { id: string; display: string }

export default function RemainderScreen() {
  const [items, setItems] = useState<Item[]>([])
  const [PickerOpen, setPickerOpen] = useState(false)
  const [date, setDate] = useState(0) // 몇 일/주 전
  const [unit, setUnit] = useState<OffsetUnit>('day') // 단위 day | week
  const [time, setTime] = useState(new Date()) // 최종 시간 선택

  // Confirm 핸들러
  const HandleConfirm = (v: { date: number; unit: OffsetUnit; time: Date }) => {
    setDate(v.date)
    setUnit(v.unit)
    setTime(v.time)

    const formating = formatRemainder(v.date, v.unit, v.time)
    const newItem = { id: Date.now().toString(), display: formating }
    setItems((prev) => [...prev, newItem])
    setPickerOpen(false)
  }

  const formatRemainder = (date: number, unit: 'day' | 'week', time: Date) => {
    const dateText = date === 0 ? '당일' : `${date}${unit === 'day' ? '일' : '주'} 전`
    const ampm = time.getHours() >= 12 ? '오후' : '오전'
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    return `${dateText}, ${ampm} ${hours}:${minutes}`
  }

  // 삭제
  const deleteReminder = (id: string) => {
    Alert.alert('삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((item) => item.id !== id))
        },
      },
    ])
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.addBtn} onPress={() => setPickerOpen(true)}>
          <Text style={S.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* 등록된 리마인더 목록 */}
      {items.map((item) => (
        <View key={item.id} style={S.listItem}>
          <Text style={S.listText}>{item.display}</Text>
          <TouchableOpacity
            style={{ position: 'absolute', right: 16, top: 12 }}
            onPress={() => {
              deleteReminder(item.id)
            }}
          >
            <Ionicons name="close" size={24} color={colors.text.body} />
          </TouchableOpacity>
        </View>
      ))}

      <ReminderOffsetTimeModal
        key={String(PickerOpen)} // visible이 바뀔 때마다 강제 리렌더링
        visible={PickerOpen}
        initialDate={date}
        initialUnit={unit}
        initialTime={time}
        onClose={() => setPickerOpen(false)}
        onConfirm={HandleConfirm}
      />
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  addText: { color: 'white', fontSize: 22, lineHeight: 22 },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.secondary.main,
  },
  listText: { fontSize: 16, fontWeight: 'bold', color: colors.text.body },
})
