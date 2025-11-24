import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import colors from '@/styles/colors'
import { http } from '@/lib/http'
import { Picker } from '@react-native-picker/picker' 
import { ensureNotificationPermissionForToggle } from '@/lib/fcm';


type NotifyDay = 'TODAY' | 'TOMORROW' | string

type SummarySetting = {
  enabled: boolean
  notifyDay: NotifyDay
  hour: number
  minute: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0 ~ 23
const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0 ~ 59

const DAY_OPTIONS: { label: string; value: NotifyDay }[] = [
  { label: '당일', value: 'TODAY' },
  { label: '전날', value: 'TOMORROW' }, //전날이 맞음! 서버입장에선 내일이지만!(헷갈리지 말기)
]

function formatLabel({ notifyDay, hour, minute }: SummarySetting) {
  const dayLabel =
    notifyDay === 'TODAY'
      ? '당일'
      : notifyDay === 'TOMORROW'
        ? '전날'
        : '당일'

  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${dayLabel} ${hh}:${mm}`
}

export default function CalendarNotifScreen() {
  const nav = useNavigation()

  const [setting, setSetting] = useState<SummarySetting>({
    enabled: false,
    notifyDay: 'TODAY',
    hour: 9,
    minute: 0,
  })
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await http.get('/user/setting/summary')
        const data = res.data?.data
        if (!data) {
         setSetting({
            enabled: false,
            notifyDay: 'TODAY',
            hour: 9,
            minute: 0,
          })
        } else {
          const { enabled, notifyDay, time } = data as {
            enabled: boolean
            notifyDay: NotifyDay
            time: string
          }
          const [hh, mm] = time.split(':')

          setSetting({
            enabled,
            notifyDay: notifyDay ?? 'TODAY',
            hour: Number(hh ?? 9),
            minute: Number(mm ?? 0),
          })
        }
      } catch (e) {
        console.warn('summary get error', e)
        Alert.alert(
          '오류',
          '일정 요약 알림 설정을 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.',
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const saveSummary = async (next: SummarySetting) => {
    const hh = String(next.hour).padStart(2, '0')
    const mm = String(next.minute).padStart(2, '0')
    const body = {
      enabled: next.enabled,
      notifyDay: next.notifyDay,
      time: `${hh}:${mm}:00`,
    }

    try {
      await http.patch('/user/setting/summary', body)
    } catch (e) {
      console.warn('summary patch error', e)
      Alert.alert(
        '저장 실패',
        '알림 설정을 저장하는 중 문제가 발생했습니다.\n다시 시도해 주세요.',
      )
    }
  }

  // 스위치 토글 핸들러
  const handleToggleEnabled = async (value: boolean) => {
    // on으로 변경하려 할 때 알림 권한 체크
    if (value) {
      const granted = await ensureNotificationPermissionForToggle()
      if (!granted) {
        return // 권한을 허용하지 않았으면 스위치를 다시 off 상태로 유지
      }
    }

    setSetting((prev) => {
      const next = { ...prev, enabled: value }
      saveSummary(next)
      if (!value) {
        setPickerOpen(false)
      }
      return next
    })
  }

  // 시간/요일 변경 핸들러
  const updateTime = (patch: Partial<SummarySetting>) => {
    setSetting((prev) => {
      const next = { ...prev, ...patch }
      saveSummary(next)
      return next
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.header}>
          <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={S.headerTitle}>일정 요약 알림</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text.caption }}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={S.safe}>
      {/* 상단 헤더 */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <Text style={S.headerTitle}>일정 요약 알림</Text>
        <View style={S.headerRightEmpty} />
      </View>

      {/* 설명 + 스위치 */}
      <View style={S.toggleRow}>
        <View>
          <Text style={S.toggleTitle}>요약 알림 받기</Text>
          <Text style={S.toggleDesc}>하루 일정과 할 일을 한 번에 알려드려요.</Text>
        </View>

        <Switch
          value={setting.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: '#E3E5EA', true: '#D9C5FF' }}
          thumbColor={setting.enabled ? '#B04FFF' : '#FFFFFF'}
        />
      </View>

      <View style={S.separator} />

      {/* ✅ 스위치가 on일 때만 아래 시간/편집/피커가 보이도록 감싼 부분 */}
      {setting.enabled ? (
        <View style={S.card}>
          {/* "당일 09:00   편집" 행 */}
          <View style={S.rowHeader}>
            <Pressable
              style={S.rowTitleArea}
              onPress={() => setPickerOpen((prev) => !prev)} // ✅ 제목 눌러도 접기/펼치기
            >
              <Text style={S.rowTitleText}>{formatLabel(setting)}</Text>
            </Pressable>

            <Pressable onPress={() => setPickerOpen((prev) => !prev)}>
              <Text style={S.rowRightText}>편집</Text>
            </Pressable>
          </View>

          {/* 편집 눌렀을 때 나타나는 피커 (리마인드 화면과 동일한 스타일) */}
          {pickerOpen && (
            <View style={S.accordion}>
              <Text style={S.optionLabel}>알림 시점</Text>
              <View style={S.pickerRow}>
                {/* 당일 / 내일 */}
                <Picker
                  style={S.picker}
                  selectedValue={setting.notifyDay}
                  onValueChange={(v) =>
                    updateTime({
                      notifyDay: v as NotifyDay,
                    })
                  }
                >
                  {DAY_OPTIONS.map((d) => (
                    <Picker.Item key={d.value} label={d.label} value={d.value} />
                  ))}
                </Picker>

                {/* 시 */}
                <Picker
                  style={S.picker}
                  selectedValue={setting.hour}
                  onValueChange={(v) =>
                    updateTime({
                      hour: v as number,
                    })
                  }
                >
                  {HOURS.map((h) => (
                    <Picker.Item
                      key={h}
                      label={String(h).padStart(2, '0')}
                      value={h}
                    />
                  ))}
                </Picker>

                {/* 분 */}
                <Picker
                  style={S.picker}
                  selectedValue={setting.minute}
                  onValueChange={(v) =>
                    updateTime({
                      minute: v as number,
                    })
                  }
                >
                  {MINUTES.map((m) => (
                    <Picker.Item
                      key={m}
                      label={String(m).padStart(2, '0')}
                      value={m}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.surface },

  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#B3B3B3',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.title },
  backBtn: { position: 'absolute', left: 16, height: 48, justifyContent: 'center' },
  headerRightEmpty: { position: 'absolute', right: 16, height: 48, width: 24 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.title,
  },
  toggleDesc: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text.caption,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E3E5EA',
    marginLeft: 16,
  },

  card: {
    width: '100%',
    backgroundColor: colors.neutral.surface,
    paddingTop: 8,
  },

  // 라벨 + 편집 행
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    minHeight: 48,
  },
  rowTitleArea: { flex: 1, justifyContent: 'center' },
  rowTitleText: { fontSize: 17, fontWeight: '600', color: colors.text.title },
  rowRightText: { fontSize: 15, fontWeight: '600', color: '#B04FFF' },

  // 리마인드 화면과 동일한 아코디언/피커 스타일들
  accordion: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.neutral.surface,
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 15,
    color: colors.text.title,
  },
  pickerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  picker: {
    flex: 1,
    height: 160,
  },
})