import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
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

  // 시간 화면용
  onAddPress?: () => void
  onEditPress?: (item: EditableItem) => void

  // 라벨 화면용
  inlineText?: boolean
  addFooterText?: string
  maxCount?: number
  onCreate?: (title: string) => Promise<EditableItem>
  onUpdate?: (id: string, title: string) => Promise<void>
  onDelete?: (ids: string[]) => Promise<void>

  addPlacement?: 'header' | 'footer' | 'none'
}

export default function EditableListScreen({
  title,
  initialItems = [],
  onChange,
  onAddPress,
  onEditPress,

  inlineText = false,
  addFooterText,
  maxCount,
  onCreate,
  onUpdate,
  onDelete,
  addPlacement = 'header',
}: Props) {
  const nav = useNavigation()
  const [items, setItems] = useState<EditableItem[]>(initialItems)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const openedRef = useRef<Swipeable | null>(null)
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const SwipeableRow = ({
    item,
    Row,
    openedRef,
    renderRightActions,
  }: {
    item: EditableItem
    Row: React.ComponentType<{ item: EditableItem }>
    openedRef: React.MutableRefObject<Swipeable | null>
    renderRightActions: (id: string) => React.ReactNode
  }) => {
    const swipeRef = useRef<Swipeable | null>(null)

    return (
      <Swipeable
        ref={swipeRef}
        friction={2}
        rightThreshold={24}
        overshootRight={false}
        renderRightActions={() => renderRightActions(item.id)}
        onSwipeableWillOpen={() => {
          const prev = openedRef.current
          if (
            prev &&
            typeof (prev as any).close === 'function' &&
            prev !== swipeRef.current
          ) {
            ;(prev as any).close()
          }
          openedRef.current = swipeRef.current
        }}
        onSwipeableClose={() => {
          if (openedRef.current === swipeRef.current) openedRef.current = null
        }}
      >
        <Row item={item} />
      </Swipeable>
    )
  }

  useLayoutEffect(() => {
    nav.setOptions?.({ headerShown: false })
  }, [nav])

  // 1) notify 단순화
  const notify = (
    updater: EditableItem[] | ((prev: EditableItem[]) => EditableItem[]),
  ) => {
    setItems((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater))
  }

  // 2) items 변경 후 부모로 통지
  useEffect(() => {
    onChange?.(items)
  }, [items, onChange])
  const canBulkDelete = selected.size > 0
  const atMax = typeof maxCount === 'number' ? items.length >= maxCount : false

  const addPress = async () => {
    if (!inlineText) return onAddPress?.()
    if (atMax) return
    const id = `temp-${Date.now()}`
    notify((prev) => [...prev, { id, label: '' }])
    setEditingId(id)
  }

  const commitInline = async (id: string, value: string) => {
    const title = value.trim()

    // 1) 비어 있으면: 신규는 삭제, 기존은 변경 없음
    if (!title) {
      if (id.startsWith('temp-')) {
        notify((prev) => prev.filter((x) => x.id !== id))
      }
      setEditingId(null)
      return
    }

    // 2) 신규 라벨(temp-*) 인 경우
    if (id.startsWith('temp-')) {
      if (!onCreate) {
        // 서버 연동 없으면 로컬만 생성
        const created = { id: String(Date.now()), label: title }
        notify((prev) => prev.map((x) => (x.id === id ? created : x)))
        setEditingId(null)
        return
      }

      try {
        const created = await onCreate(title)
        // 서버에서 정상 생성된 id / label로 교체
        notify((prev) => prev.map((x) => (x.id === id ? created : x)))
      } catch (e) {
        // ❗ 서버에서 막힌 경우: 임시 행 제거 + 안내
        notify((prev) => prev.filter((x) => x.id !== id))

        if (maxCount) {
          Alert.alert('라벨 한도', `라벨은 최대 ${maxCount}개까지 생성할 수 있습니다.`)
        } else {
          Alert.alert('생성 실패', '라벨을 추가할 수 없습니다.')
        }
      } finally {
        setEditingId(null)
      }
      return
    }

    // 3) 기존 라벨 수정
    if (!onUpdate) {
      notify((prev) => prev.map((x) => (x.id === id ? { ...x, label: title } : x)))
      setEditingId(null)
      return
    }

    try {
      await onUpdate(id, title)
      notify((prev) => prev.map((x) => (x.id === id ? { ...x, label: title } : x)))
    } catch {
      // 필요하면 에러 처리
    } finally {
      setEditingId(null)
    }
  }

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const confirmDelete = async (ids: string[]) => {
    if (!ids.length) return
    const prev = items
    notify(prev.filter((x) => !ids.includes(x.id)))
    setSelected(new Set())

    try {
      await onDelete?.(ids)
    } catch {
      // 실패 시 롤백
      notify(prev)
    } finally {
      if (editingId && ids.includes(editingId)) setEditingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const renderRightActions = (id: string) => (
    <View style={S.rightActions}>
      <Pressable
        style={S.deleteBtn}
        hitSlop={8}
        onPress={() => {
          const sw = openedRef.current
          if (sw && typeof (sw as any).close === 'function') (sw as any).close()
          confirmDelete([id])
        }}
      >
        <Trash width={20} height={20} color="#fff" />
      </Pressable>
    </View>
  )
  const Row = ({ item }: { item: EditableItem }) => {
    const isEditing = inlineText && editingId === item.id
    const [text, setText] = useState(item.label)
    const inputRef = React.useRef<TextInput | null>(null)

    React.useEffect(() => {
      if (isEditing) {
        setText(item.label)
        const t = setTimeout(() => inputRef.current?.focus(), 0)
        return () => clearTimeout(t)
      }
    }, [isEditing, item.label])

    return (
      <View style={S.row}>
        {/* 편집 모드: 체크박스 */}
        {editMode ? (
          <Pressable
            onPress={() => toggleSelect(item.id)}
            hitSlop={8}
            style={S.checkboxWrap}
          >
            {selected.has(item.id) ? (
              <CheckOn width={24} height={24} />
            ) : (
              <CheckOff width={24} height={24} />
            )}
          </Pressable>
        ) : null}

        {/* 중앙: 텍스트 or 인라인 입력 */}
        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={S.input}
            value={text}
            onChangeText={setText}
            placeholder="내용을 입력하세요"
            placeholderTextColor="#B3B3B3"
            returnKeyType="done"
            multiline={false}
            blurOnSubmit={false}
            onSubmitEditing={() => {
              // 엔터 눌렀을 때 커밋
              commitInline(item.id, text)
            }}
            onBlur={() => {
              // 포커스 나갈 때도 커밋 (예전이랑 동일)
              commitInline(item.id, text)
            }}
          />
        ) : (
          <Pressable
            style={[S.centerPressable, editMode && { marginLeft: 0 }]}
            onPress={() => {
              if (editMode) return toggleSelect(item.id)
              inlineText ? setEditingId(item.id) : onEditPress?.(item)
            }}
          >
            <Text style={S.itemText}>{item.label}</Text>
          </Pressable>
        )}

        {/* 우측 액세서리: 연필(인라인 편집 시작) 또는 자리 유지 */}
        {!editMode ? (
          inlineText ? (
            <Pressable
              onPress={() => setEditingId(item.id)}
              hitSlop={8}
              style={S.pencilWrap}
            >
              <Pencil width={24} height={24} color="#333" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onEditPress?.(item)}
              hitSlop={8}
              style={S.pencilWrap}
            >
              <Pencil width={24} height={24} color="#333" />
            </Pressable>
          )
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    )
  }

  const renderItem = ({ item }: { item: EditableItem }) =>
    editMode ? (
      <Row item={item} />
    ) : (
      <SwipeableRow
        item={item}
        Row={Row}
        openedRef={openedRef}
        renderRightActions={renderRightActions}
      />
    )

  const Footer = () =>
    addPlacement === 'footer' && inlineText && !editMode ? (
      <>
        <View style={S.separator} />
        <Pressable
          style={[S.addRow, atMax && { opacity: 0.4 }]}
          onPress={addPress}
          hitSlop={8}
          disabled={atMax}
        >
          <View style={{ marginRight: 8 }}>
            <Plus width={16} height={16} color="#B3B3B3" />
          </View>
          <Text style={S.addText}>
            {atMax ? `최대 ${maxCount}개` : (addFooterText ?? '추가')}
          </Text>
        </Pressable>
      </>
    ) : null

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      {/* 헤더 */}
      <View style={S.header}>
        <Pressable style={S.backBtn} hitSlop={8} onPress={() => nav.goBack()}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <Text style={S.headerTitle}>{title}</Text>
        {/* 헤더 플러스: 위치가 header일 때만 표시 */}
        {addPlacement === 'header' ? (
          <Pressable
            style={S.plusBtn}
            hitSlop={8}
            onPress={addPress}
            disabled={inlineText && atMax}
          >
            <Plus
              width={22}
              height={22}
              color={inlineText && atMax ? '#D7D8DD' : '#B04FFF'}
            />
          </Pressable>
        ) : (
          <View style={S.plusBtn} />
        )}
      </View>

      {/* 헤더 하단 바: 편집/삭제/완료 */}
      {editMode ? (
        <View style={S.headerBottom}>
          <Pressable
            onPress={() => {
              if (!canBulkDelete) return
              const sw = openedRef.current
              if (sw && typeof (sw as any).close === 'function') (sw as any).close()
              confirmDelete(Array.from(selected))
            }}
            hitSlop={8}
          >
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
            hitSlop={8}
          >
            <Text style={S.headerRight}>완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={S.headerBottom}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setEditMode(true)} hitSlop={8}>
            <Text style={S.headerRight}>편집</Text>
          </Pressable>
        </View>
      )}
      {/* 리스트 */}
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={S.separator} />}
        contentContainerStyle={{ backgroundColor: colors.neutral.surface }}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={Footer}
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
    backgroundColor: colors.neutral.surface,
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
    height: 48,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
  },
  checkboxWrap: {
    marginRight: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPressable: { flex: 1, height: '100%', justifyContent: 'center' },
  itemText: { fontSize: 19, fontWeight: '600', color: colors.text.title },
  input: { flex: 1, fontSize: 16, paddingVertical: 6, color: colors.text.title },

  pencilWrap: { paddingHorizontal: 4, height: '100%', justifyContent: 'center' },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E3E5EA',
    marginLeft: 16,
  },

  rightActions: { width: 72, alignItems: 'stretch', justifyContent: 'center' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.neutral.surface,
  },
  addText: { fontSize: 17, color: '#B3B3B3', fontWeight: '600', marginLeft: 2 },
})
