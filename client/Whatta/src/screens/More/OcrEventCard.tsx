import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import colors from '@/styles/colors'

interface OCREventCardProps {
  title: string
  date: string
  week?: string
  startTime?: string
  endTime?: string
  onAdd: () => void
}

export default function OCREventCard({
  title,
  date,
  week,
  startTime,
  endTime,
  onAdd,
}: OCREventCardProps) {
  return (
    <View style={styles.card}>
      {/* 제목 */}
      <Text style={styles.title}>{title}</Text>

      {/* 날짜 */}
      <View style={styles.infoRow}>
        <Text style={styles.label}>날짜</Text>
        <Text style={styles.value}>
          {date} {week ? `(${week})` : ''}
        </Text>
      </View>

      {/* 시간 */}
      {startTime && endTime ? (
        <View style={styles.infoRow}>
          <Text style={styles.label}>시간</Text>
          <Text style={styles.value}>
            {startTime} ~ {endTime}
          </Text>
        </View>
      ) : (
        <View style={styles.infoRow}>
          <Text style={styles.label}>시간</Text>
          <Text style={styles.value}>하루 일정</Text>
        </View>
      )}

      {/* 추가 버튼 */}
      <Pressable style={styles.addButton} onPress={onAdd}>
        <Text style={styles.addButtonText}>이 일정으로 추가</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },

  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
  },

  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },

  addButton: {
    marginTop: 18,
    backgroundColor: '#9D7BFF',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})