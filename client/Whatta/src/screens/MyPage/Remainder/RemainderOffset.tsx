import React, { useMemo, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import Icons from '@expo/vector-icons/AntDesign'
import colors from '@/styles/colors'

export type OffsetUnit = 'day' | 'week'

type Props = {
  visible: boolean // 모달 표시 여부
  initialDate?: number // 초기 값: 몇 일/주 전 (0~30)
  initialUnit?: OffsetUnit // 초기 값: 단위 day | week
  initialTime?: Date // 초기 값: 시:분
  onClose: () => void // 닫기 버튼
  onConfirm: (val: { date: number; unit: OffsetUnit; time: Date }) => void // 완료 버튼
}

export default function ReminderOffsetTimeModal({ visible, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(0) // 0일 전
  const [unit, setUnit] = useState<OffsetUnit>('day') // 'day' | 'week'
  const [time, setTime] = useState<Date>(defaultTime())
  const [timePickerOpen, setTimePickerOpen] = useState(false) // 시간 선택기 열기/닫기

  const numbers = useMemo(() => {
    // 0~30 범위
    return Array.from({ length: 31 }, (_, i) => i)
  }, [])

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={S.backdrop}>
        <View style={S.sheet}>
          {/* 헤더 */}
          <View style={S.header}>
            <TouchableOpacity
              onPress={() => {
                onClose()
              }}
            >
              <Text style={S.headerBtn}>취소</Text>
            </TouchableOpacity>
            <Text style={S.headerTitle}>맞춤</Text>
            <TouchableOpacity onPress={() => onConfirm({ date, unit, time })}>
              <Text style={[S.headerBtn, { color: '#2563eb' }]}>완료</Text>
            </TouchableOpacity>
          </View>

          {/* “몇 일/주 전” 선택 */}
          <View style={S.section}>
            <View style={S.wheelBox}>
              <Picker
                selectedValue={date}
                onValueChange={(v) => setDate(v)}
                style={S.picker}
                itemStyle={S.pickerItem}
              >
                {numbers.map((n) => (
                  <Picker.Item key={n} label={`${n}`} value={n} />
                ))}
              </Picker>

              <Picker
                selectedValue={unit}
                onValueChange={(v) => setUnit(v)}
                style={S.picker}
                itemStyle={S.pickerItem}
              >
                <Picker.Item label="일" value="day" />
                <Picker.Item label="주" value="week" />
              </Picker>
              <Text style={[S.sectionTitle]}>전</Text>

              <View style={S.unitLabel}></View>
            </View>
          </View>

          {/* 시간 선택 */}
          <View style={S.section}>
            <TouchableOpacity style={S.timeBtn} onPress={() => setTimePickerOpen(true)}>
              <Icons
                name="clock-circle"
                size={25}
                color={colors.primary.main}
                style={{ position: 'absolute', left: 12 }}
              />
              <Text style={S.timeText}>
                {formatTime(time)} {/* AM/PM hh:mm 표시 */}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 하단 여백 */}
          <View style={{ height: 12 }} />
        </View>
      </View>
      {/* 시간 피커(시:분만 선택) */}
      <DateTimePickerModal
        isVisible={timePickerOpen}
        mode="time"
        date={time}
        onConfirm={(d) => {
          setTime(d)
          setTimePickerOpen(false)
        }}
        onCancel={() => setTimePickerOpen(false)}
        locale="ko-KR"
        minuteInterval={1}
        is24Hour={false} // 12시간제(오전/오후)
      />
    </Modal>
  )
}

// 기본 시간: 00:00
function defaultTime() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// 시:분을 "오전 10:05"으로 변환
function formatTime(d: Date) {
  let h = d.getHours()
  let m = d.getMinutes()
  let ampm = h < 12 ? '오전' : '오후'
  let hh = ((h + 11) % 12) + 1 // 12시간 표기
  let mm = String(m).padStart(2, '0')
  return `${ampm} ${hh}:${mm}`
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerBtn: {
    fontWeight: '700',
    fontSize: 16,
    color: '#6b7280',
    height: 32,
    lineHeight: 32,
  },

  section: { paddingHorizontal: 16, paddingVertical: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#6b7280' },

  wheelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F6F7FA',
    overflow: 'hidden',
  },
  picker: { flex: 1, height: 160, justifyContent: 'center' }, // iOS는 휠
  pickerItem: { fontSize: 20 },

  unitLabel: { justifyContent: 'center', paddingHorizontal: 12 },
  unitText: { fontSize: 18, color: '#374151' },

  timeBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F6F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { fontSize: 18, fontWeight: '600' },
})
