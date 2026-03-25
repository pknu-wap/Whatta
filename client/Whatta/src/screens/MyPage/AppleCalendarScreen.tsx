import React, { useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MyPageStackList } from '@/navigation/MyPageStack'
import colors from '@/styles/colors'
import { useAppleCalendarSync } from '@/hooks/useAppleCalendarSync'
import {
  disconnectAppleCalendarLocally,
  ensureAppleCalendarConnected,
  forceExportFutureWhattaEventsToAppleCalendar,
  importAppleCalendarChangesToWhatta,
} from '@/lib/appleCalendar'

type Props = NativeStackScreenProps<MyPageStackList, 'AppleCalendar'>

function formatSyncText(value: string | null) {
  if (!value) return '아직 내보내지 않음'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '아직 내보내지 않음'

  return date.toLocaleString('ko-KR')
}

export default function AppleCalendarScreen({ navigation }: Props) {
  const state = useAppleCalendarSync()
  const [connecting, setConnecting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const statusText = useMemo(() => {
    if (Platform.OS !== 'ios') return 'iPhone에서만 지원'
    if (!state) return '상태 확인 중'
    if (state.isConnected) return '연결됨'
    if (state.permissionStatus === 'denied') return '권한 필요'
    return '연결 안 됨'
  }, [state])

  useFocusEffect(
    React.useCallback(() => {
      if (!state?.isConnected || importing) return

      let cancelled = false
      ;(async () => {
        try {
          setImporting(true)
          await importAppleCalendarChangesToWhatta()
        } finally {
          if (!cancelled) {
            setImporting(false)
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }, [state?.isConnected]),
  )

  const onPressConnect = async () => {
    if (connecting) return
    setConnecting(true)
    try {
      const result = await ensureAppleCalendarConnected()
      if (!result.ok) {
        Alert.alert('애플 캘린더 연동', result.message)
        return
      }

      Alert.alert(
        '애플 캘린더 연동 완료',
        result.created
          ? 'iCloud에 Whatta 캘린더를 만들었습니다. 다음 단계에서 미래 일정 일괄 내보내기를 붙이면 됩니다.'
          : '기존 Whatta 캘린더를 찾았습니다. 다음 단계에서 미래 일정 일괄 내보내기를 붙이면 됩니다.'
      )
    } finally {
      setConnecting(false)
    }
  }

  const onPressDisconnect = () => {
    Alert.alert(
      '연동 해제',
      '앱 내부 연동 상태만 해제합니다. Apple Calendar에 이미 만들어진 Whatta 캘린더는 그대로 둡니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            await disconnectAppleCalendarLocally()
          },
        },
      ]
    )
  }

  const onPressReExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const result = await forceExportFutureWhattaEventsToAppleCalendar()
      Alert.alert(
        '애플 캘린더 다시 내보내기',
        `오늘 이후 일정 ${result.exported}개를 다시 Apple Calendar로 내보냈습니다.`,
      )
    } finally {
      setExporting(false)
    }
  }

  const onPressImport = async () => {
    if (importing) return
    setImporting(true)
    try {
      const result = await importAppleCalendarChangesToWhatta()
      Alert.alert(
        'Apple 변경 가져오기',
        `생성 ${result.created}개, 수정 ${result.updated}개, 삭제 ${result.deleted}개를 Whatta에 반영했습니다.`,
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={S.content} style={S.screen}>
      <View style={S.card}>
        <Text style={S.title}>애플 캘린더 연동</Text>
        <Text style={S.description}>
          Whatta 일정은 iCloud의 Whatta 전용 캘린더로 내보낼 예정입니다. 현재 단계에서는
          권한 확인과 iCloud 캘린더 생성까지 연결합니다.
        </Text>

        <View style={S.statusBox}>
          <Text style={S.statusLabel}>상태</Text>
          <Text style={S.statusValue}>{statusText}</Text>
        </View>

        <View style={S.statusBox}>
          <Text style={S.statusLabel}>연결 캘린더</Text>
          <Text style={S.statusValue}>
            {state?.isConnected ? `${state.sourceName ?? 'iCloud'} / ${state.calendarTitle}` : '-'}
          </Text>
        </View>

        <View style={S.statusBox}>
          <Text style={S.statusLabel}>초기 내보내기</Text>
          <Text style={S.statusValue}>
            {state?.initialExportDone ? '완료' : '아직 실행 전'}
          </Text>
        </View>

        <View style={S.statusBox}>
          <Text style={S.statusLabel}>마지막 동기화</Text>
          <Text style={S.statusValue}>{formatSyncText(state?.lastSyncedAt ?? null)}</Text>
        </View>

        <Pressable style={[S.primaryButton, connecting && S.buttonDisabled]} onPress={onPressConnect}>
          <Text style={S.primaryButtonText}>
            {connecting ? '연동 중...' : state?.isConnected ? '다시 확인하기' : '연동 시작하기'}
          </Text>
        </Pressable>

        {state?.permissionStatus === 'denied' ? (
          <Pressable style={S.secondaryButton} onPress={() => Linking.openSettings()}>
            <Text style={S.secondaryButtonText}>설정 열기</Text>
          </Pressable>
        ) : null}

        {state?.isConnected ? (
          <>
            <Pressable
              style={[S.secondaryButton, exporting && S.buttonDisabled]}
              onPress={onPressReExport}
            >
              <Text style={S.secondaryButtonText}>
                {exporting ? '내보내는 중...' : '오늘 이후 일정 다시 내보내기'}
              </Text>
            </Pressable>

            <Pressable
              style={[S.secondaryButton, importing && S.buttonDisabled]}
              onPress={onPressImport}
            >
              <Text style={S.secondaryButtonText}>
                {importing ? '가져오는 중...' : 'Apple 변경 가져오기'}
              </Text>
            </Pressable>

            <Pressable style={S.ghostButton} onPress={onPressDisconnect}>
              <Text style={S.ghostButtonText}>앱 연동 해제</Text>
            </Pressable>
          </>
        ) : null}
      </View>

    </ScrollView>
  )
}

const S = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.title,
  },
  description: {
    marginTop: 10,
    color: colors.text.body,
    fontSize: 14,
    lineHeight: 20,
  },
  statusBox: {
    marginTop: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider.divider2,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.text.caption,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.title,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#111111',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: colors.brand.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  ghostButtonText: {
    color: colors.text.body,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
