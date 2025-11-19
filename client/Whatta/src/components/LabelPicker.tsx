import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native'
import { createLabel } from '@/api/label_api'

export type UiLabel = { id: number; title: string }
type Anchor = { x: number; y: number; w: number; h: number }

type Props = {
  visible: boolean
  all: UiLabel[]
  selected: number[]
  onChange: (ids: number[]) => void
  onRequestClose: () => void
  anchor: Anchor | null
  onCreateLabel?: (title: string) => Promise<UiLabel>
  canAdd?: boolean
}

export default function LabelPickerModal({
  visible,
  all,
  selected,
  onChange,
  onRequestClose,
  anchor,
  onCreateLabel,
  canAdd = true,
}: Props) {
  const [draft, setDraft] = useState('')
  const cardW = 145
  const screenW = Dimensions.get('window').width
  // 버튼 바로 아래 +8px, 버튼의 오른쪽에 맞춰 정렬(오른쪽이 화면 밖이면 자동 보정)
  const pos = (() => {
    if (!anchor) return { top: 100, left: screenW - cardW - 24 }
    const top = anchor.y + anchor.h + 8
    const leftIdeal = anchor.x + anchor.w - cardW
    const left = Math.max(12, Math.min(leftIdeal, screenW - cardW - 12))
    return { top, left }
  })()

  const toggle = (id: number) => {
    const already = selected.includes(id)
    const next = already ? selected.filter((x) => x !== id) : [...selected, id]
    onChange(next)
  }

  const add = async () => {
    const name = draft.trim()
    if (!name) return

    try {
      if (onCreateLabel) {
        const newLabel = await onCreateLabel(name) // API 호출은 부모에게 맡김
        // 선택 목록 업데이트
        onChange([...selected, newLabel.id])

        setDraft('')
      }
    } catch (err) {
      console.log('라벨 생성 실패', err)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* 정렬 없음. 절대 좌표만 사용 */}
      <View style={styles.container} pointerEvents="box-none">
        {/* 오직 한 겹 카드 + absolute */}
        <View
          style={[
            styles.card,
            {
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              width: cardW,
              zIndex: 1000,
            },
          ]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {all.map((l) => (
              <Pressable key={l.id} style={styles.item} onPress={() => toggle(l.id)}>
                <Text
                  style={[
                    styles.itemText,
                    selected.includes(l.id) && styles.itemTextActive,
                  ]}
                >
                  {l.title}
                </Text>
              </Pressable>
            ))}

            <View style={styles.sep} />

            {canAdd && (
              <>
                {/* <View style={styles.sep} /> */}
                <View style={styles.inputRow}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="입력..."
                    placeholderTextColor="#B3B3B3"
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={add}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingTop: 8,
  },
  card: {
    width: 145,
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#525252',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  header: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#B04FFF',
  },
  item: { paddingVertical: 16, paddingHorizontal: 19, alignItems: 'center' },
  itemText: { fontSize: 16, color: '#111', fontWeight: '600' },
  itemTextActive: { color: '#B04FFF' },
  sep: { height: 1, backgroundColor: '#E9E9E9' },
  inputRow: { paddingHorizontal: 22, paddingVertical: 14 },
  input: { fontSize: 16, color: '#9B9B9B' },
})
