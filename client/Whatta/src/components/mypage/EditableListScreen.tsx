import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Swipeable } from 'react-native-gesture-handler'
import colors from '@/styles/colors'
import Pencil from '@/assets/icons/pencil.svg'
import Trash from '@/assets/icons/trash.svg'
import Plus from '@/assets/icons/plusbtn.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'

export type EditableItem = { id: string; label: string }

type Props = {
  title: string
  initialItems?: EditableItem[]
  onChange?: (next: EditableItem[]) => void

  // 라벨 화면
  inlineText?: boolean
  addFooterText?: string
  maxCount?: number
  onCreate?: (title: string) => Promise<EditableItem>
  onUpdate?: (id: string, title: string) => Promise<void>
  onDelete?: (ids: string[]) => Promise<void>

  addPlacement?: 'header' | 'footer' | 'none'

  // 리마인더·교통알림 화면
  accordion?: boolean
  renderAccordion?: (item: EditableItem) => React.ReactNode
  onAddPress?: () => void
  onEditPress?: (item: EditableItem) => void
}

export default function EditableListScreen({
  title,
  initialItems = [],
  onChange,

  // 라벨 옵션
  inlineText = false,
  addFooterText,
  maxCount,
  onCreate,
  onUpdate,
  onDelete,
  addPlacement = 'header',

  // 리마인더 옵션
  accordion = false,
  renderAccordion,
  onAddPress,
  onEditPress,
}: Props) {
  const nav = useNavigation()

  const [items, setItems] = useState<EditableItem[]>(initialItems)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)

  // Accordion 상태
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null)

  const openedRef = useRef<Swipeable | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // 라벨모드 vs 리마인더모드
  const labelMode = inlineText === true
  const reminderMode = accordion === true

  const notify = (
    updater: EditableItem[] | ((prev: EditableItem[]) => EditableItem[]),
  ) => {
    setItems((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater))
  }

  useEffect(() => {
    onChange?.(items)
  }, [items])

  const atMax = typeof maxCount === 'number' ? items.length >= maxCount : false
  const canBulkDelete = selected.size > 0

  const addPress = () => {
    if (labelMode) {
      if (atMax) return
      const id = `temp-${Date.now()}`
      notify((prev) => [...prev, { id, label: '' }])
      setEditingId(id)
    } else {
      onAddPress?.()
    }
  }

  const commitInline = async (id: string, value: string) => {
    const title = value.trim()

    if (!title) {
      if (id.startsWith('temp-')) notify((prev) => prev.filter((x) => x.id !== id))
      setEditingId(null)
      return
    }

    // 신규
    if (id.startsWith('temp-')) {
      try {
        const created = await onCreate?.(title)
        if (created) notify((prev) => prev.map((x) => (x.id === id ? created : x)))
      } catch {
        notify((prev) => prev.filter((x) => x.id !== id))
        Alert.alert('라벨 한도', `라벨은 최대 ${maxCount}개까지 생성할 수 있습니다.`)
      } finally {
        setEditingId(null)
      }
      return
    }

    // 기존 수정
    try {
      await onUpdate?.(id, title)
      notify((prev) => prev.map((x) => (x.id === id ? { ...x, label: title } : x)))
    } finally {
      setEditingId(null)
    }
  }

  const confirmDelete = async (ids: string[]) => {
    if (!ids.length) return

    const prev = items
    notify(prev.filter((x) => !ids.includes(x.id)))
    setSelected(new Set())

    try {
      await onDelete?.(ids)
    } catch {
      notify(prev)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const Row = ({ item }: { item: EditableItem }) => {
    const isEditing = inlineText && editingId === item.id
    const [text, setText] = useState(item.label)

    const inputRef = useRef<TextInput | null>(null)
    useEffect(() => {
      if (isEditing) {
        setText(item.label)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }, [isEditing])

    return (
      <View>
        <View
          style={[
            S.row,
            labelMode && { height: 48 }, // 라벨 화면은 딱 48 고정
            reminderMode && S.rowReminder, // 리마인더는 확장될 수 있어야 하므로 minHeight 유지
          ]}
        >
          {/* 편집 모드 체크박스 */}
          {editMode ? (
            <Pressable onPress={() => toggleSelect(item.id)} style={S.checkboxWrap}>
              {selected.has(item.id) ? <CheckOn /> : <CheckOff />}
            </Pressable>
          ) : null}

          {/* 중앙 영역 */}
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={S.input}
              value={text}
              onChangeText={setText}
              returnKeyType="done"
              onSubmitEditing={() => commitInline(item.id, text)}
              onBlur={() => commitInline(item.id, text)}
            />
          ) : (
            <Pressable
              style={S.centerPressable}
              onPress={() => {
                if (editMode) return toggleSelect(item.id)

                if (labelMode) setEditingId(item.id)
                else if (reminderMode) {
                  setOpenAccordionId((prev) => (prev === item.id ? null : item.id))
                } else onEditPress?.(item)
              }}
            >
              <Text style={S.itemText}>{item.label}</Text>
            </Pressable>
          )}

          {/* 우측 아이콘 */}
          {!editMode ? (
            labelMode ? (
              <Pressable onPress={() => setEditingId(item.id)}>
                <Pencil width={24} height={24} color="#333" />
              </Pressable>
            ) : (
              <Pressable onPress={() => onEditPress?.(item)}>
                <Pencil width={24} height={24} color="#333" />
              </Pressable>
            )
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {/* Accordion — 리마인더/교통알림 */}
        {reminderMode && openAccordionId === item.id && renderAccordion?.(item)}
      </View>
    )
  }

  const SwipeableRow = ({ item }: { item: EditableItem }) => {
    const rowRef = useRef<Swipeable | null>(null)

    return (
      <Swipeable
        ref={rowRef}
        friction={2}
        rightThreshold={24}
        overshootRight={false}
        renderRightActions={() => (
          <View style={S.rightActions}>
            <Pressable style={S.deleteBtn} onPress={() => confirmDelete([item.id])}>
              <Trash color="#fff" />
            </Pressable>
          </View>
        )}
      >
        <Row item={item} />
      </Swipeable>
    )
  }

  const Footer =
    labelMode && addPlacement === 'footer' && !editMode ? (
      <>
        <View style={S.separator} />
        <Pressable style={S.addRow} onPress={addPress} disabled={atMax}>
          <Plus width={16} height={16} color="#B3B3B3" />
          <Text style={S.addText}>
            {atMax ? `최대 ${maxCount}개` : (addFooterText ?? '추가')}
          </Text>
        </Pressable>
      </>
    ) : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
      <SafeAreaView style={S.safe}>
        {/* 헤더 */}
        <View style={S.header}>
          <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </Pressable>

          <Text style={S.headerTitle}>{title}</Text>

          {/* 리마인더/교통알림만 헤더 플러스 */}
          {!labelMode && addPlacement === 'header' ? (
            <Pressable style={S.plusBtn} onPress={addPress}>
              <Plus width={22} height={22} color="#B04FFF" />
            </Pressable>
          ) : (
            <View style={S.plusBtn} />
          )}
        </View>

        {/* 편집 모드 */}
        {editMode ? (
          <View style={S.headerBottom}>
            <Pressable
              onPress={() => canBulkDelete && confirmDelete(Array.from(selected))}
            >
              <Text
                style={[S.headerLeft, { color: canBulkDelete ? '#B04FFF' : '#C0C2C7' }]}
              >
                삭제
              </Text>
            </Pressable>
            <Pressable onPress={() => setEditMode(false)}>
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
          data={items}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) =>
            editMode || labelMode || reminderMode ? (
              <SwipeableRow item={item} />
            ) : (
              <Row item={item} />
            )
          }
          ItemSeparatorComponent={() => <View style={S.separator} />}
          ListFooterComponent={Footer}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
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

  row: {
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxWrap: {
    marginRight: 12,
  },
  centerPressable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.text.title,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    color: colors.text.title,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E3E5EA',
    marginLeft: 16,
  },

  rightActions: { width: 72, height: '100%', justifyContent: 'center' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  addText: { fontSize: 17, color: '#B3B3B3', fontWeight: '600', marginLeft: 6 },
  rowReminder: {
    paddingVertical: 4, // 위/아래 여백 최소화
  },
})
