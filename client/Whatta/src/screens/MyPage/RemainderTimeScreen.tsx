import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Swipeable } from 'react-native-gesture-handler'
import colors from '@/styles/colors'
import Pencil from '@/assets/icons/pencil.svg'
import Trash from '@/assets/icons/trash.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { Picker } from '@react-native-picker/picker'
import { http } from '@/lib/http'
import Left from '@/assets/icons/left.svg'
import { bus } from '@/lib/eventBus'
import { ts } from '@/styles/typography'

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
  const dayLabel = item.day === 0 ? '당일' : '전날'

  let parts = []
  if (item.hour > 0) parts.push(`${item.hour}시간`)
  if (item.minute > 0) parts.push(`${item.minute}분`)

  const timeLabel = parts.length ? parts.join(' ') + ' 전' : '0분 전'

  return `${dayLabel} ${timeLabel}`
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
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const MINUTES = Array.from({ length: 60 }, (_, i) => i)

  return (
    <View>
      <Pressable
        style={[S.rowHeader, editMode && selected && S.rowHeaderSelected]}
        onPress={editMode ? onToggleSelect : onToggleOpen}
        hitSlop={8}
      >
        {editMode ? (
          <Pressable onPress={onToggleSelect} style={S.checkboxWrap}>
            {selected ? <CheckOn /> : <CheckOff />}
          </Pressable>
        ) : null}

        <View style={S.rowTitleArea}>
          <Text style={S.rowTitleText}>{formatLabel(item)}</Text>
        </View>

        <Pressable
          style={[S.rowRightIcon, editMode && S.rowRightIconDisabled]}
          onPress={onToggleOpen}
          disabled={editMode}
          hitSlop={8}
        >
          <Pencil width={24} height={24} color={editMode ? colors.text.text4 : '#333'} />
        </Pressable>
      </Pressable>

      {/* DROPDOWN */}
      {isOpen && (
        <View style={S.accordion}>
          <View style={S.pickerRow}>
            {/* 당일 / 전날 */}
            <Picker
              style={S.picker}
              selectedValue={item.day}
              onValueChange={(v) => onChange({ day: v as number })}
              itemStyle={S.pickerItem}
            >
              <Picker.Item label="당일" value={0} />
              <Picker.Item label="전날" value={1} />
            </Picker>

            {/* 시간 */}
            <Picker
              style={S.picker}
              selectedValue={item.hour}
              onValueChange={(v) => onChange({ hour: v as number })}
              itemStyle={S.pickerItem}
            >
              {HOURS.map((h) => (
                <Picker.Item key={h} label={`${h}시간`} value={h} />
              ))}
            </Picker>

            {/* 분 */}
            <Picker
              style={S.picker}
              selectedValue={item.minute}
              onValueChange={(v) => onChange({ minute: v as number })}
              itemStyle={S.pickerItem}
            >
              {MINUTES.map((m) => (
                <Picker.Item key={m} label={`${m}분`} value={m} />
              ))}
            </Picker>

            <View style={S.unitBox}>
              <Text style={S.unitText}>전</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default function RemainderTimeScreen() {
  const nav = useNavigation()

  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

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
        const res = await http.get('/user/setting/reminder')
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
      if (!updated) return prev

      // 중복 검사
      const duplicated = next.some(
        (it) =>
          it.id !== id &&
          it.day === updated.day &&
          it.hour === updated.hour &&
          it.minute === updated.minute,
      )
      if (duplicated) {
        Alert.alert('중복 알림', '이미 동일한 리마인드 알림이 있습니다.')
        return prev
      }

      // 서버 전송용 offsetMinutes 계산
      const offsetMinutes = updated.day * -1440 + updated.hour * -60 + updated.minute * -1

      ;(async () => {
        try {
          await http.put(`/user/setting/reminder/${id}`, {
            day: updated.day,
            hour: updated.hour,
            minute: updated.minute,
            offsetMinutes,
          })
          bus.emit('reminder:mutated')
        } catch (e) {
          console.warn('reminder update error', e)
        }
      })()

      return next
    })
  }

  // 단건 삭제
  const handleDeleteOne = (id: string) => {
    setPendingDeleteIds([id])
    setDeleteConfirmOpen(true)
  }

  // 여러 개 선택 삭제
  const handleBulkDelete = () => {
    if (!canBulkDelete) return
    setPendingDeleteIds(Array.from(selected))
    setDeleteConfirmOpen(true)
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

    // 2) 기본값 후보 찾기: day 0, hour 1부터 시작해서 겹치지 않는 시간 찾기
    let day = 0
    let hour = 1
    let minute = 0

    // 최대 48번 정도만 돌면서 빈 슬롯 찾기 (무한루프 방지)
    for (let i = 0; i < 48; i++) {
      const exists = reminders.some(
        (r) => r.day === day && r.hour === hour && r.minute === minute,
      )
      if (!exists) break

      // 시만 +1씩 올리다가 한 바퀴 돌면 day를 1로 바꿈(전날)
      hour = (hour + 1) % 24
      if (hour === 1) {
        day = 1
      }
    }

    ;(async () => {
      try {
        const body = { day, hour, minute }
        const res = await http.post('/user/setting/reminder', body)
        const d: ReminderDTO = res.data?.data ?? res.data
        const item = fromDto(d)
        setReminders((prev) => [...prev, item])
        setOpenId(item.id) // 새로 만든 거는 바로 열어 주기
        bus.emit('reminder:mutated')
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
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()} hitSlop={16}>
          <Left width={24} height={24} color={colors.icon.default} />
        </Pressable>

        <Text style={S.headerTitle}>리마인드 알림 시간 수정</Text>

        <Pressable style={S.plusBtn} onPress={handleAdd}>
          <View style={S.plusIcon}>
            <View style={S.plusIconHorizontal} />
            <View style={S.plusIconVertical} />
          </View>
        </Pressable>
      </View>

      {editMode ? (
        <View style={S.headerBottomEdit}>
          <Pressable onPress={handleBulkDelete} hitSlop={16}>
            <Text
              style={[
                S.headerActionText,
                { color: canBulkDelete ? colors.brand.primary : colors.text.text3 },
              ]}
            >
              삭제
            </Text>
          </Pressable>
          <Pressable
            hitSlop={16}
            onPress={() => {
              setEditMode(false)
              setSelected(new Set())
            }}
          >
            <Text style={S.headerActionText}>완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={S.headerBottomIdle}>
          <Pressable onPress={() => setEditMode(true)} hitSlop={16}>
            <Text style={[S.headerActionText, S.headerRightIdle]}>편집</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Swipeable
            friction={2}
            rightThreshold={24}
            overshootRight={false}
            renderRightActions={(_, dragX) => (
              <View style={S.rightActions}>
                <Animated.View
                  style={[
                    S.deleteBtnWrap,
                    {
                      transform: [
                        {
                          translateX: dragX.interpolate({
                            inputRange: [-60, 0],
                            outputRange: [0, 60],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable style={S.deleteBtn} onPress={() => handleDeleteOne(item.id)}>
                    <Trash color="#fff" />
                  </Pressable>
                </Animated.View>
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
        contentContainerStyle={S.listContent}
      />

      {deleteConfirmOpen && (
        <View style={S.deleteOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setDeleteConfirmOpen(false)
              setPendingDeleteIds([])
            }}
          />
          <View style={S.deleteCard}>
            <Text style={S.deleteTitle}>
              {pendingDeleteIds.length > 1
                ? '선택하신 리마인드 알림을 삭제할까요?'
                : '리마인드 알림을 삭제할까요?'}
            </Text>
            <View style={S.deleteRow}>
              <Pressable
                style={[S.deleteActionBtn, S.deleteCancelBtn]}
                onPress={() => {
                  setDeleteConfirmOpen(false)
                  setPendingDeleteIds([])
                }}
              >
                <Text style={S.deleteCancelTxt}>취소</Text>
              </Pressable>
              <Pressable
                style={[S.deleteActionBtn, S.deleteConfirmBtn]}
                onPress={async () => {
                  const ids = pendingDeleteIds
                  setDeleteConfirmOpen(false)
                  setPendingDeleteIds([])
                  setReminders((prev) => prev.filter((it) => !ids.includes(it.id)))
                  setSelected((prev) => {
                    const next = new Set(prev)
                    ids.forEach((id) => next.delete(id))
                    return next
                  })
                  if (openId && ids.includes(openId)) setOpenId(null)
                  try {
                    await http.delete('/user/setting/reminder', {
                      data: ids,
                    })
                    bus.emit('reminder:mutated')
                  } catch (e) {
                    console.warn('reminder bulk delete error', e)
                    Alert.alert('오류', '리마인드 알림 삭제에 실패했습니다.')
                  }
                }}
              >
                <Text style={S.deleteConfirmTxt}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.bg1 },

  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...ts('titleM'), color: colors.text.text1 },
  backBtn: { position: 'absolute', left: 14, height: 48, justifyContent: 'center' },
  plusBtn: { position: 'absolute', right: 14, height: 48, justifyContent: 'center' },
  plusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconHorizontal: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.icon.selected,
  },
  plusIconVertical: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.icon.selected,
  },

  headerBottomEdit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  headerBottomIdle: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 12,
    paddingRight: 14,
  },
  headerActionText: { ...ts('label3'), fontSize: 15, color: colors.text.text1 },
  headerRightIdle: { color: colors.text.text3 },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCard: {
    width: 302,
    height: 152,
    borderRadius: 20,
    backgroundColor: colors.background.bg1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#A4ADB2',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 0,
  },
  deleteTitle: {
    ...ts('label1'),
    fontWeight: '700',
    color: colors.text.text1,
    textAlign: 'center',
  },
  deleteRow: {
    width: 302,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 16,
  },
  deleteActionBtn: {
    width: 119,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtn: {
    backgroundColor: colors.background.bg1,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
  },
  deleteConfirmBtn: {
    backgroundColor: colors.brand.primary,
  },
  deleteCancelTxt: {
    ...ts('label1'),
    color: colors.text.text3,
  },
  deleteConfirmTxt: {
    ...ts('label1'),
    color: colors.text.text1w,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Row
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider2,
  },
  rowHeaderSelected: {
    backgroundColor: colors.background.bg2,
  },
  checkboxWrap: { marginRight: 12 },
  rowTitleArea: { flex: 1, justifyContent: 'center' },
  rowTitleText: { ...ts('label2'), color: colors.text.text1 },
  rowRightIcon: { width: 24, alignItems: 'flex-end' },
  rowRightIconDisabled: { opacity: 1 },

  // Swipe delete
  rightActions: { width: 60, justifyContent: 'center', alignItems: 'center' },
  deleteBtnWrap: {
    width: 60,
    height: 60,
  },
  deleteBtn: {
    width: 60,
    height: 60,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Accordion
  accordion: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background.bg1,
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 15,
    color: colors.text.title,
  },
  pickerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  picker: {
    flex: 1,
    height: 220,
  },
  pickerItem: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  unitBox: {
    height: 160,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
})
