import React from 'react'
import { Modal, View, FlatList, Dimensions, StyleSheet, Pressable, Text } from 'react-native'
import OCREventCard from './OcrEventCard'
import colors from '@/styles/colors'

export interface OCREvent {
  id: string
  title: string
  content?: string
  weekDay?: string
  date: string
  startTime?: string
  endTime?: string
}

interface Props {
  visible: boolean
  events: OCREvent[]
  onClose: () => void
  onAddEvent: (ev: OCREvent) => void
  onSaveAll?: () => void     // 🔥 옵션으로 전체 저장 기능
}

export default function OCREventCardSlider({
  visible,
  events,
  onClose,
  onAddEvent,
  onSaveAll,
}: Props) {
  const { width } = Dimensions.get('window')
  const ITEM_WIDTH = width * 0.88
  const SPACING = 6
  const SIDE_PADDING = (width - ITEM_WIDTH) / 1.55

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>

        <View style={styles.centerWrap}>
          {/* 🔵 카드 슬라이더 */}
   <FlatList
  data={events}
  keyExtractor={(item) => item.id}
  horizontal
  showsHorizontalScrollIndicator={false}
  decelerationRate="fast"
  snapToInterval={ITEM_WIDTH + SPACING}
  ListHeaderComponent={<View style={{ width: SIDE_PADDING }} />}
  ListFooterComponent={<View style={{ width: SIDE_PADDING }} />}
  renderItem={({ item, index }) => {
  const isLast = index === events.length - 1
  return (
    <View
      style={{
        width: ITEM_WIDTH,
        marginRight: isLast ? 0 : SPACING,  // 🔥 마지막 카드만 margin 제거
      }}
    >
      <OCREventCard
        title={item.title}
        date={item.date}
        week={item.weekDay}
        startTime={item.startTime}
        endTime={item.endTime}
        onSubmit={(data) => onAddEvent({ ...item, ...data })}
        onClose={onClose}
      />
    </View>
  )
}}
/>

          {/* 🔥 하단 고정 버튼 */}
          <Pressable
            style={styles.saveAllBtn}
            onPress={onSaveAll ?? onClose}
          >
            <Text style={styles.saveAllText}>모두 저장</Text>
          </Pressable>
        </View>

      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000B2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerWrap: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },

  saveAllBtn: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 64,
    width: 100,
    height: 44,
    alignItems: 'center',
  },

  saveAllText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2
  },
})