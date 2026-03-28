import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import colors from '@/styles/colors'
import { http } from '@/lib/http'
import { Picker } from '@react-native-picker/picker' 
import Left from '@/assets/icons/left.svg'
import { ts } from '@/styles/typography'
import { ensureNotificationPermissionForToggle, hasNotificationPermission } from '@/lib/fcm';


type NotifyDay = 'TODAY' | 'TOMORROW' | string

type SummarySetting = {
  enabled: boolean
  notifyDay: NotifyDay
  hour: number
  minute: number
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0 ~ 59
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)

const CustomToggle = ({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) => {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      hitSlop={20}
      style={{
        width: 51,
        height: 31,
        borderRadius: 26,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: disabled ? '#E3E5EA' : value ? '#B04FFF' : '#B3B3B3',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 25,
          backgroundColor: '#fff',
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </Pressable>
  )
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
  const ampm = setting.hour < 12 ? 'AM' : 'PM'
  const hour12 = setting.hour % 12 === 0 ? 12 : setting.hour % 12

  useEffect(() => {
    ;(async () => {
      try {
        const res = await http.get('/user/setting/summary')
        const data = res.data?.data

        const permitted = await hasNotificationPermission()

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

          // ✅ 권한이 없는데 서버값이 enabled=true면 → 화면 OFF + 서버 OFF patch
          if (!permitted && enabled) {
            const next: SummarySetting = {
              enabled: false,
              notifyDay: notifyDay ?? 'TODAY',
              hour: Number(hh ?? 9),
              minute: Number(mm ?? 0),
            }

            setSetting(next)

            // 서버에도 enabled=false 반영
            await http.patch('/user/setting/summary', {
              enabled: false,
              notifyDay: next.notifyDay,
              time: `${String(next.hour).padStart(2, '0')}:${String(next.minute).padStart(
                2,
                '0',
              )}:00`,
            })

          } else {
            // ✅ 권한 문제 없으면 서버값 그대로 반영
            setSetting({
              enabled,
              notifyDay: notifyDay ?? 'TODAY',
              hour: Number(hh ?? 9),
              minute: Number(mm ?? 0),
            })
          }
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

  const handleChangeHour12 = (h12: number) => {
    updateTime({
      hour:
        ampm === 'PM'
          ? h12 === 12
            ? 12
            : h12 + 12
          : h12 === 12
            ? 0
            : h12,
    })
  }

  const handleChangeAmpm = (next: 'AM' | 'PM') => {
    updateTime({
      hour:
        next === 'AM'
          ? setting.hour >= 12
            ? setting.hour - 12
            : setting.hour
          : setting.hour < 12
            ? setting.hour + 12
            : setting.hour,
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.header}>
          <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
            <Left width={24} height={24} color={colors.icon.default} />
          </Pressable>
          <Text style={S.headerTitle}>일정 요약 알림 설정</Text>
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
          <Left width={24} height={24} color={colors.icon.default} />
        </Pressable>
        <Text style={S.headerTitle}>일정 요약 알림 설정</Text>
        <View style={S.headerRightEmpty} />
      </View>

      <View style={S.toggleCard}>
        <View style={S.toggleTextBlock}>
          <Text style={S.toggleTitle}>일정 요약 알림 받기</Text>
          <Text style={S.toggleDesc}>하루 일정과 할 일을 한번에 알려드려요</Text>
        </View>
        <CustomToggle value={setting.enabled} onChange={handleToggleEnabled} />
      </View>

      {/* ✅ 스위치가 on일 때만 아래 시간/편집/피커가 보이도록 감싼 부분 */}
      {setting.enabled ? (
        <View style={S.card}>
          <View style={S.timeLabelWrap}>
            <View style={S.timeLabelRow}>
              <Text style={S.timeAmPm}>{ampm === 'AM' ? '오전' : '오후'}</Text>
              <Text style={S.timeMain}>
                {hour12}:{String(setting.minute).padStart(2, '0')}
              </Text>
            </View>
          </View>

          <View style={S.timePickerRow}>
            <Picker
              style={S.timePicker}
              itemStyle={S.timePickerItem}
              selectedValue={ampm}
              onValueChange={(v) => handleChangeAmpm(v as 'AM' | 'PM')}
            >
              <Picker.Item label="AM" value="AM" />
              <Picker.Item label="PM" value="PM" />
            </Picker>
            <Picker
              style={S.timePicker}
              itemStyle={S.timePickerItem}
              selectedValue={hour12}
              onValueChange={(v) => handleChangeHour12(v as number)}
            >
              {HOURS_12.map((h) => (
                <Picker.Item key={h} label={String(h)} value={h} />
              ))}
            </Picker>
            <Picker
              style={S.timePicker}
              itemStyle={S.timePickerItem}
              selectedValue={setting.minute}
              onValueChange={(v) =>
                updateTime({
                  minute: v as number,
                })
              }
            >
              {MINUTES.map((m) => (
                <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
              ))}
            </Picker>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.bg1 },

  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...ts('titleM'), color: colors.text.text1 },
  backBtn: { position: 'absolute', left: 14, height: 48, justifyContent: 'center' },
  headerRightEmpty: { position: 'absolute', right: 14, height: 48, width: 24 },

  toggleCard: {
    width: 358,
    height: 85,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    backgroundColor: colors.background.bg1,
  },
  toggleTextBlock: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    ...ts('label1'),
    color: colors.text.text1,
  },
  toggleDesc: {
    marginTop: 4,
    ...ts('date2'),
    color: colors.text.text3,
  },

  card: {
    width: '100%',
    backgroundColor: colors.background.bg1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  timeLabelWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeAmPm: {
    ...ts('body1'),
    fontSize: 13,
    color: colors.text.text2,
    marginRight: 6,
  },
  timeMain: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.title,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  timePicker: {
    flex: 1,
    height: 160,
  },
  timePickerItem: {
    fontSize: 22,
    fontWeight: '500',
  },
})
