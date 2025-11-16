import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Swipeable } from 'react-native-gesture-handler'
import colors from '@/styles/colors'
import Pencil from '@/assets/icons/pencil.svg'
import Trash from '@/assets/icons/trash.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import Plus from '@/assets/icons/plusbtn.svg'
import { Picker } from '@react-native-picker/picker'
import { http } from '@/lib/http'

type ReminderItem = {
  id: string
  day: number // 0: 당일, 1: 전날
  hour: number // 0~23
  minute: number // 0~59
}

type ReminderDTO = {
  id: string
  day: number
  hour: number
  minute: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0~23
const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0~59

const DAY_OPTIONS = [
  { label: '당일', value: 0 },
  { label: '전날', value: 1 },
]

const MAX_REMINDERS = 5

function formatLabel(item: ReminderItem) {
  const dayLabel = item.day === 0 ? '당일' : item.day === 1 ? '전날' : `${item.day}일 전`
  const hh = String(item.hour).padStart(2, '0')
  const mm = String(item.minute).padStart(2, '0')
  return `${dayLabel} ${hh}:${mm}`
}

type RowProps = {
  item: ReminderItem
  isOpen: boolean
  editMode: boolean
  selected: boolean
  onToggleOpen: () => void
  onToggleSelect: () => void
  onChange: (patch: Partial<ReminderItem>) => void
}

// 한 섹션
function ReminderRow({
  item,
  isOpen,
  editMode,
  selected,
  onToggleOpen,
  onToggleSelect,
  onChange,
}: RowProps) {
  const update = (patch: Partial<ReminderItem>) => onChange(patch)

  const header = (
    <View style={S.rowHeader}>
      {editMode ? (
        <Pressable onPress={onToggleSelect} style={S.checkboxWrap}>
          {selected ? <CheckOn /> : <CheckOff />}
        </Pressable>
      ) : null}

      <Pressable
        style={S.rowTitleArea}
        onPress={editMode ? onToggleSelect : onToggleOpen}
      >
        <Text style={S.rowTitleText}>{formatLabel(item)}</Text>
      </Pressable>

      {!editMode ? (
        <Pressable style={S.rowRightIcon} onPress={onToggleOpen}>
          <Pencil width={24} height={24} color="#333" />
        </Pressable>
      ) : (
        <View style={S.rowRightIcon} />
      )}
    </View>
  )

  const accordion = isOpen ? (
    <View style={S.accordion}>
      <Text style={S.optionLabel}>알림 시점</Text>

      <View style={S.pickerRow}>
        {/* 당일 / 전날 */}
        <Picker
          style={S.picker}
          selectedValue={item.day}
          onValueChange={(v) => update({ day: v as number })}
        >
          {DAY_OPTIONS.map((d) => (
            <Picker.Item key={d.value} label={d.label} value={d.value} />
          ))}
        </Picker>

        {/* 시 (0~23) */}
        <Picker
          style={S.picker}
          selectedValue={item.hour}
          onValueChange={(v) => update({ hour: v as number })}
        >
          {HOURS.map((h) => (
            <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} />
          ))}
        </Picker>

        {/* 분 (0~59) */}
        <Picker
          style={S.picker}
          selectedValue={item.minute}
          onValueChange={(v) => update({ minute: v as number })}
        >
          {MINUTES.map((m) => (
            <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
          ))}
        </Picker>
      </View>
    </View>
  ) : null

  return (
    <View>
      {header}
      {accordion}
    </View>
  )
}

export default function RemainderTimeScreen() {
  const nav = useNavigation()

  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const canBulkDelete = selected.size > 0

  // 서버 DTO -> 클라이언트 타입 변환
  const fromDto = (d: ReminderDTO): ReminderItem => ({
    id: String(d.id),
    day: d.day,
    hour: d.hour,
    minute: d.minute,
  })

  // 클라이언트 -> 서버 DTO 변환
  const toDto = (item: ReminderItem): Omit<ReminderDTO, 'id'> => ({
    day: item.day,
    hour: item.hour,
    minute: item.minute,
  })

  // 최초 로딩: GET /api/user/setting/reminder
  useEffect(() => {
    ;(async () => {
      try {
        const res = await http.get('/api/user/setting/reminder')
        const data = res.data?.data
        const list: ReminderDTO[] = Array.isArray(data) ? data : data ? [data] : []
        const mapped = list.map(fromDto)
        setReminders(mapped)
        setOpenId(null)
      } catch (e) {
        console.warn('reminder get error', e)
      }
    })()
  }, [])

  const toggleOpen = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // 피커 변경 시: state 업데이트 + 서버 PUT
  const updateReminder = (id: string, patch: Partial<ReminderItem>) => {
    setReminders((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
      const updated = next.find((it) => it.id === id)
      if (updated) {
        ;(async () => {
          try {
            await http.put(`/api/user/setting/reminder/${id}`, toDto(updated))
          } catch (e) {
            console.warn('reminder update error', e)
          }
        })()
      }
      return next
    })
  }

  // 단건 삭제
  const handleDeleteOne = (id: string) => {
    setReminders((prev) => prev.filter((it) => it.id !== id))
    setSelected((prev) => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })
    if (openId === id) setOpenId(null)
    ;(async () => {
      try {
        await http.delete('/api/user/setting/reminder', {
          data: [id],
        })
      } catch (e) {
        console.warn('reminder delete error', e)
      }
    })()
  }

  // 여러 개 선택 삭제
  const handleBulkDelete = () => {
    if (!canBulkDelete) return
    const ids = Array.from(selected)

    Alert.alert('삭제', '선택한 알림을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setReminders((prev) => prev.filter((it) => !selected.has(it.id)))
          setSelected(new Set())
          if (openId && selected.has(openId)) setOpenId(null)
          ;(async () => {
            try {
              await http.delete('/api/user/setting/reminder', {
                data: ids,
              })
            } catch (e) {
              console.warn('reminder bulk delete error', e)
            }
          })()
        },
      },
    ])
  }

  // 플러스: 기본값 하나 생성 후 서버 POST
  const handleAdd = () => {
    // 1) 개수 제한
    if (reminders.length >= MAX_REMINDERS) {
      Alert.alert(
        '알림 한도',
        `리마인드 알림은 최대 ${MAX_REMINDERS}개까지 설정할 수 있습니다.`,
      )
      return
    }

    // 2) 기본값 후보 찾기: day 0, hour 9부터 시작해서 겹치지 않는 시간 찾기
    let day = 0
    let hour = 9
    let minute = 0

    // 최대 48번 정도만 돌면서 빈 슬롯 찾기 (무한루프 방지)
    for (let i = 0; i < 48; i++) {
      const exists = reminders.some(
        (r) => r.day === day && r.hour === hour && r.minute === minute,
      )
      if (!exists) break

      // 시만 +1씩 올리다가 한 바퀴 돌면 day를 1로 바꿈(전날)
      hour = (hour + 1) % 24
      if (hour === 9) {
        day = 1
      }
    }

    ;(async () => {
      try {
        const body = { day, hour, minute }
        const res = await http.post('/api/user/setting/reminder', body)
        const d: ReminderDTO = res.data?.data ?? res.data
        const item = fromDto(d)
        setReminders((prev) => [...prev, item])
        setOpenId(item.id) // 새로 만든 거는 바로 열어 주기
      } catch (e: any) {
        console.warn('reminder create error', e.response?.data ?? e)
        if (e.response?.data?.statuscode === '902') {
          Alert.alert('알림 생성 실패', '이미 동일한 시간의 리마인드 알림이 있습니다.')
        } else {
          Alert.alert('알림 생성 실패', '리마인드 알림을 추가할 수 없습니다.')
        }
      }
    })()
  }

  return (
    <SafeAreaView style={S.safe}>
      {/* 상단 헤더 */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>

        <Text style={S.headerTitle}>리마인드 알림 시간</Text>

        <Pressable style={S.plusBtn} onPress={handleAdd}>
          <Plus width={22} height={22} color="#B04FFF" />
        </Pressable>
      </View>

      {/* 편집/삭제 헤더 */}
      {editMode ? (
        <View style={S.headerBottom}>
          <Pressable onPress={handleBulkDelete}>
            <Text
              style={[S.headerLeft, { color: canBulkDelete ? '#B04FFF' : '#C0C2C7' }]}
            >
              삭제
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditMode(false)
              setSelected(new Set())
            }}
          >
            <Text style={S.headerRight}>완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={S.headerBottom}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setEditMode(true)}>
            <Text style={S.headerRight}>편집</Text>
          </Pressable>
        </View>
      )}

      {/* 리스트 */}
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={S.separator} />}
        renderItem={({ item }) => (
          <Swipeable
            friction={2}
            rightThreshold={24}
            overshootRight={false}
            renderRightActions={() => (
              <View style={S.rightActions}>
                <Pressable style={S.deleteBtn} onPress={() => handleDeleteOne(item.id)}>
                  <Trash color="#fff" />
                </Pressable>
              </View>
            )}
          >
            <ReminderRow
              item={item}
              isOpen={openId === item.id}
              editMode={editMode}
              selected={selected.has(item.id)}
              onToggleOpen={() => toggleOpen(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onChange={(patch) => updateReminder(item.id, patch)}
            />
          </Swipeable>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.surface },

  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#B3B3B3',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.title },
  backBtn: { position: 'absolute', left: 16, height: 48, justifyContent: 'center' },
  plusBtn: { position: 'absolute', right: 16, height: 48, justifyContent: 'center' },

  headerBottom: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: { fontSize: 16, fontWeight: '700' },
  headerRight: { fontSize: 16, fontWeight: '700', color: '#B04FFF' },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E3E5EA',
    marginLeft: 16,
  },

  // Row
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    minHeight: 48,
  },
  checkboxWrap: { marginRight: 12 },
  rowTitleArea: { flex: 1, justifyContent: 'center' },
  rowTitleText: { fontSize: 17, fontWeight: '600', color: colors.text.title },
  rowRightIcon: { width: 24, alignItems: 'flex-end' },

  // Swipe delete
  rightActions: { width: 72, height: '100%', justifyContent: 'center' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Accordion
  accordion: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.neutral.surface,
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 15,
    color: colors.text.title,
  },
  pickerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  picker: {
    flex: 1,
    height: 160,
  },
})
