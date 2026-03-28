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
  Animated,
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
import Left from '@/assets/icons/left.svg'
import { ts } from '@/styles/typography'

export type EditableItem = { id: string; label: string; fixed?: boolean }

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
  const [footerEditing, setFooterEditing] = useState(false)
  const [footerText, setFooterText] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

  // Accordion 상태
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null)

  const openedRef = useRef<Swipeable | null>(null)
  const footerInputRef = useRef<TextInput | null>(null)
  const footerSubmittingRef = useRef(false)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    if (footerEditing) {
      setTimeout(() => footerInputRef.current?.focus(), 0)
    }
  }, [footerEditing])

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
      setFooterEditing(true)
      } else {
      onAddPress?.()
    }
  }

  const commitFooterInline = async () => {
    if (footerSubmittingRef.current) return
    footerSubmittingRef.current = true

    const title = footerText.trim()
    if (!title) {
      setFooterEditing(false)
      setFooterText('')
      footerSubmittingRef.current = false
      return
    }

    try {
      const created = await onCreate?.(title)
      if (created) {
        notify((prev) => [...prev, created])
      }
    } catch (err: any) {
      if (err?.code === 'duplicate') {
        Alert.alert('중복 라벨', '이미 같은 이름의 라벨이 있습니다.')
      } else {
        Alert.alert('라벨 한도', `라벨은 최대 ${maxCount}개까지 생성할 수 있습니다.`)
      }
    } finally {
      setFooterEditing(false)
      setFooterText('')
      footerSubmittingRef.current = false
    }
  }

  const commitInline = async (id: string, value: string) => {
    const title = value.trim()

    // 내용이 없으면: 새로 만든 temp 라벨은 삭제, 기존 라벨은 그대로
    if (!title) {
      if (id.startsWith('temp-')) {
        notify((prev) => prev.filter((x) => x.id !== id))
      }
      setEditingId(null)
      return
    }

    // 신규
    if (id.startsWith('temp-')) {
      try {
        const created = await onCreate?.(title)
        if (created) {
          // temp-로 된 가짜 아이템을 서버에서 받은 진짜 아이템으로 교체
          notify((prev) => prev.map((x) => (x.id === id ? created : x)))
        }
      } catch (err: any) {
        // 실패하면 temp 아이템 삭제
        notify((prev) => prev.filter((x) => x.id !== id))

        // 중복 에러
        if (err?.code === 'duplicate') {
          Alert.alert('중복 라벨', '이미 같은 이름의 라벨이 있습니다.')
        } else {
          // 그 외 에러는 "최대 10개"로 처리
          Alert.alert('라벨 한도', `라벨은 최대 ${maxCount}개까지 생성할 수 있습니다.`)
        }
      } finally {
        setEditingId(null)
      }
      return
    }

    // 기존 수정
    try {
      await onUpdate?.(id, title)
      notify((prev) => prev.map((x) => (x.id === id ? { ...x, label: title } : x)))
    } catch (err: any) {
      if (err?.code === 'duplicate') {
        Alert.alert('중복 라벨', '이미 같은 이름의 라벨이 있습니다.')
      }
      // 다른 에러는 일단 추가 Alert 없이 무시
    } finally {
      setEditingId(null)
    }
  }

  const confirmDelete = async (ids: string[]) => {
    if (!ids.length) return

    try {
      // 1) 서버 삭제 먼저
      await onDelete?.(ids)

      // 2) 성공하면 리스트에서 제거
      notify((prev) => prev.filter((x) => !ids.includes(x.id)))
      setSelected(new Set())
    } catch (e) {
      console.log('삭제 실패', e)
      Alert.alert('삭제 실패', '라벨 삭제 중 오류가 발생했습니다.')
    }
  }

  const deleteWithConfirm = (ids: string[]) => {
    if (!ids.length) return
    setPendingDeleteIds(ids)
    setDeleteConfirmOpen(true)
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
            labelMode && S.rowLabel,
            reminderMode && S.rowReminder, // 리마인더는 확장될 수 있어야 하므로 minHeight 유지
          ]}
        >
          {/* 편집 모드 체크박스 */}
          {editMode ? (
            item.fixed ? (
              <View style={{ width: 24 }} />
            ) : (
              <Pressable onPress={() => toggleSelect(item.id)} style={S.checkboxWrap}>
                {selected.has(item.id) ? <CheckOn /> : <CheckOff />}
              </Pressable>
            )
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
            item.fixed ? (
              <View style={{ width: 24 }} /> // 아이콘 없는 빈 공간
            ) : (
              <Pressable onPress={() => setEditingId(item.id)}>
                <Pencil width={24} height={24} color="#333" />
              </Pressable>
            )
          ) : null}
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
        renderRightActions={(_, dragX) =>
          item.fixed ? null : (
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
                <Pressable style={S.deleteBtn} onPress={() => deleteWithConfirm([item.id])}>
                  <Trash color="#fff" />
                </Pressable>
              </Animated.View>
            </View>
          )
        }
      >
        <Row item={item} />
      </Swipeable>
    )
  }

  const Footer =
    labelMode && !editMode && !atMax ? (
      <>
        <View style={S.separator} />
        <Pressable style={S.addRow} onPress={() => setFooterEditing(true)}>
          <View style={S.footerPlusWrap}>
            <Plus width={22} height={22} color={colors.icon.default} />
          </View>
          {footerEditing ? (
            <TextInput
              ref={footerInputRef}
              style={S.footerInput}
              value={footerText}
              onChangeText={setFooterText}
              placeholder="라벨 명을 입력하세요"
              placeholderTextColor={colors.text.text4}
              returnKeyType="done"
              onSubmitEditing={commitFooterInline}
              onBlur={commitFooterInline}
            />
          ) : (
            <Text style={S.addText}>라벨 명을 입력하세요</Text>
          )}
        </Pressable>
      </>
    ) : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
      <SafeAreaView style={S.safe}>
        {/* 헤더 */}
        <View style={S.header}>
          <Pressable style={S.backBtn} onPress={() => nav.goBack()} hitSlop={16}>
            <Left width={24} height={24} color={colors.icon.default} />
          </Pressable>

          <Text style={S.headerTitle}>{title}</Text>

          {addPlacement === 'header' ? (
            <Pressable style={S.plusBtn} onPress={addPress}>
              <View style={S.plusIcon}>
                <View style={S.plusIconHorizontal} />
                <View style={S.plusIconVertical} />
              </View>
            </Pressable>
          ) : (
            <View style={S.plusBtn} />
          )}
        </View>

        {editMode ? (
          <View style={S.headerBottomEdit}>
            <Pressable
              hitSlop={16}
              onPress={() => canBulkDelete && deleteWithConfirm(Array.from(selected))}
            >
              <Text
                style={[
                  S.headerActionText,
                  { color: canBulkDelete ? colors.brand.primary : colors.text.text3 },
                ]}
              >
                삭제
              </Text>
            </Pressable>
            <Pressable onPress={() => setEditMode(false)} hitSlop={16}>
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
                {pendingDeleteIds.length > 1 ? '선택하신 라벨을 삭제할까요?' : '라벨을 삭제할까요?'}
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
                    await confirmDelete(ids)
                  }}
                >
                  <Text style={S.deleteConfirmTxt}>삭제</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
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

  row: {
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider2,
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
    ...ts('label2'),
    color: colors.text.text1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    color: colors.text.title,
  },

  separator: {
    height: 0,
  },

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

  addRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerPlusWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    ...ts('label2'),
    color: colors.text.text4,
    marginLeft: 12,
  },
  footerInput: {
    flex: 1,
    marginLeft: 12,
    ...ts('label2'),
    color: colors.text.text1,
    paddingVertical: 0,
  },
  rowReminder: {
    paddingVertical: 4, // 위/아래 여백 최소화
  },
})
