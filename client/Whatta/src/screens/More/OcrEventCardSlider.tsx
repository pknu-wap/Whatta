import React from 'react'
import { Modal, View, FlatList, Dimensions, StyleSheet } from 'react-native'
import OCREventCard from './OcrEventCard'

export interface OCREvent {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  week?: string
}

interface Props {
  visible: boolean
  events: OCREvent[]
  onClose: () => void
  onAddEvent: (ev: OCREvent) => void
}

export default function OCREventCardSlider({
  visible,
  events,
  onClose,
  onAddEvent,
}: Props) {
  const { width } = Dimensions.get('window')
  const ITEM_WIDTH = width * 0.88
  const SPACING = 16

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay} onTouchEnd={onClose} />

      <View style={styles.sliderWrap}>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={ITEM_WIDTH + SPACING} // 카드 하나씩 스냅
          contentContainerStyle={{
            paddingHorizontal: (width - ITEM_WIDTH) / 2,
          }}
          renderItem={({ item }) => (
            <View style={{ width: ITEM_WIDTH, marginRight: SPACING }}>
              <OCREventCard
                title={item.title}
                date={item.date}
                week={item.week}
                startTime={item.startTime}
                endTime={item.endTime}
                onAdd={() => onAddEvent(item)}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sliderWrap: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
  },
})