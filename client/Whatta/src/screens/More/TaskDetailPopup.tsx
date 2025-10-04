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
}
