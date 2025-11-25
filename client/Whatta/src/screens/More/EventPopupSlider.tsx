import React from 'react'
import { Modal, View, StyleSheet } from 'react-native'
import PagerView from 'react-native-pager-view'
import EventDetailPopup from './EventDetailPopup'

export interface OCREvent {
  id: string
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
}

interface Props {
  visible: boolean
  events: OCREvent[]
  onClose: () => void
}

export default function EventPopupSlider({ visible, events, onClose }: Props) {
  if (!visible) return null
  if (!events || events.length === 0) return null

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <PagerView style={{ width: '100%', height: '100%' }} initialPage={0}>
          {events.map((ev, idx) => (
            <View key={ev.id ?? idx} style={{ flex: 1 }}>
              <EventDetailPopup
                visible={true}
                mode="create"
                eventId={null}
                onClose={onClose}
                initial={{
                  title: ev.title,
                  startDate: ev.date,
                  endDate: ev.date,
                  startTime: ev.startTime ?? undefined,
                  endTime: ev.endTime ?? undefined,
                }}
              />
            </View>
          ))}
        </PagerView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})