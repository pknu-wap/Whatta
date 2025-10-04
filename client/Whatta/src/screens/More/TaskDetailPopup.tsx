import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, Switch } from 'react-native'
import colors from '@/styles/colors'

export default function TaskDetailPopup() {
  const [visible, setVisible] = useState(false)
  const [taskTitle] = useState('Whatta 정기 회의')
  const [hasContent] = useState(true)
  const [hasSchedule] = useState(true)

  const [reminderOn, setReminderOn] = useState(false)
  const [dueOn, setDueOn] = useState(false)

  return (
    <View style={s.container}>
      {/* 버튼 */}
      <TouchableOpacity style={s.button} onPress={() => setVisible(true)}>
        <Text style={s.buttonText}>{taskTitle}</Text>
      </TouchableOpacity>

      {/* 팝업 */}
      <Modal transparent visible={visible} animationType="fade">
        <View style={s.backdrop}>
          <View style={s.popup}>
            {/* 제목 */}
            <Text style={s.title}>{taskTitle}</Text>

            {/* 내용 (있을 때만 표시) */}
            {hasContent && <Text style={s.row}>내용: 주간 진행 상황 공유</Text>}

            {/* 상태 */}
            <Text style={s.row}>상태: 진행 전</Text>

            {/* 날짜/시간 (있을 때만 표시) */}
            {hasSchedule && (
              <Text style={s.row}>날짜·시간: 2025-10-04 10:00 ~ 11:00</Text>
            )}

            {/* 마감일 */}
            <Text style={s.row}>마감일: 2025-10-07 (D-3)</Text>

            {/* 리마인드 알림 on/off */}
            <View style={s.switchRow}>
              <Text style={s.label}>리마인드 알림</Text>
              <Switch value={reminderOn} onValueChange={setReminderOn} />
            </View>

            {/* 마감일 알림 on/off */}
            <View style={s.switchRow}>
              <Text style={s.label}>마감일 알림</Text>
              <Switch value={dueOn} onValueChange={setDueOn} />
            </View>

            {/* 닫기 버튼 */}
            <TouchableOpacity style={s.close} onPress={() => setVisible(false)}>
              <Text style={s.closeText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  button: {
    backgroundColor: colors.primary.main,
    padding: 16,
    borderRadius: 8,
  },
  buttonText: { color: colors.neutral.surface, fontSize: 16, fontWeight: '900' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: colors.text.caption,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text.title,
  },
  row: { fontSize: 15, color: colors.text.body, marginBottom: 8 },

  switchRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 15, color: colors.text.title, fontWeight: '600' },

  close: {
    marginTop: 20,
    backgroundColor: colors.primary.main,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  closeText: { color: colors.neutral.surface, fontSize: 15, fontWeight: '600' },
})
