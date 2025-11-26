import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import colors from '@/styles/colors'
import Left from '@/assets/icons/left.svg'
import Plus from '@/assets/icons/plusbtn.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { TrafficAlertStackList } from '@/navigation/TrafficAlertStack'
import { http } from '@/lib/http'
import {
  ensureNotificationPermissionForToggle,
  hasNotificationPermission,
} from '@/lib/fcm'

type TransitAlertItem = {
  id: string
  enabled: boolean
  hour: number
  minute: number
  stopLabels: string[]
  repeatDays: number[]
}

const DAY_MAP = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]
const DAY_LABEL_KO = ['월', '화', '수', '목', '금', '토', '일']

function formatRepeatLabel(days: number[]) {
  if (!days || days.length === 0) return ''
  const isWeekend = days.length === 2 && days.includes(5) && days.includes(6)
  const isWeekday = days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))
  const isEveryday = days.length === 7

  if (isWeekend) return '주말마다'
  if (isWeekday) return '평일마다'
  if (isEveryday) return '매일'

  const ordered = [...days].sort((a, b) => a - b)
  const text = ordered.map((d) => DAY_LABEL_KO[d]).join('·')
  return `매주 ${text}`
}

/** Custom Toggle */
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

type RowProps = {
  item: TransitAlertItem
  editMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onToggleEnabled: () => void
  onPressDetail: () => void
}

function TransitAlertRow({
  item,
  editMode,
  selected,
  onToggleSelect,
  onToggleEnabled,
  onPressDetail,
}: RowProps) {
  const repeatText = formatRepeatLabel(item.repeatDays)

  return (
    <View>
      <Pressable style={S.row} onPress={editMode ? onToggleSelect : onPressDetail}>
        {/* 체크박스 영역: 편집 모드 아니면 width 0 */}
        <View
          style={{
            width: editMode ? 45 : 0,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {editMode && (
            <Pressable onPress={onToggleSelect} style={{ marginRight: 15 }}>
              {selected ? (
                <CheckOn width={20} height={20} />
              ) : (
                <CheckOff width={20} height={20} />
              )}
            </Pressable>
          )}
        </View>

        {/* 텍스트 영역 */}
        <View style={S.rowTextBlock}>
          {/* 시간 표시 */}
          <View style={S.timeRow}>
            <Text style={S.timeAmPm}>{item.hour < 12 ? '오전' : '오후'}</Text>
            <Text style={S.timeMain}>
              {item.hour % 12 === 0 ? 12 : item.hour % 12}:
              {String(item.minute).padStart(2, '0')}
            </Text>
          </View>

          <View style={S.stopsContainer}>
            {item.stopLabels.length > 0 ? (
              item.stopLabels.map((label, idx) => (
                <Text
                  key={idx}
                  style={[S.stopText, { color: '#B04FFF' }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              ))
            ) : (
              <Text
                style={[S.stopTextPlaceholder, { color: '#B04FFF' }]}
                numberOfLines={1}
              >
                정류장 및 노선 추가
              </Text>
            )}
          </View>

          {!!repeatText && (
            <Text style={S.repeatText} numberOfLines={1}>
              {repeatText}
            </Text>
          )}
        </View>

        <View style={S.switchWrap}>
          <CustomToggle value={item.enabled} onChange={onToggleEnabled} />
        </View>
      </Pressable>

      {/* 구분선 */}
      <View style={S.rowDivider} />
    </View>
  )
}

export default function TrafficAlertsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<TrafficAlertStackList>>()
  const [items, setItems] = useState<TransitAlertItem[]>([])

  useFocusEffect(
    useCallback(() => {
      const fetchAlerts = async () => {
        try {
          const favRes = await http.get('/traffic/items')
          const favorites = favRes.data.data ?? []
          const res = await http.get('/traffic/alarms')
          const list = res.data.data ?? []

          const mapped: TransitAlertItem[] = list.map((it: any) => {
            const [h, m] = (it.alarmTime ?? '00:00:00').split(':').map(Number)
            const repeatDays = (it.days ?? []).map((d: string) => DAY_MAP.indexOf(d))

            const targetIds = it.targetItemIds || []
            const matchedLabels: string[] = []

            for (const id of targetIds) {
              const fav = favorites.find((f: any) => f.id === id)
              if (fav) {
                const stationName = fav.busStationNo
                  ? `${fav.busStationName} (${fav.busStationNo})`
                  : fav.busStationName
                const label = fav.busRouteNo
                  ? `${stationName} · 버스 ${fav.busRouteNo}번`
                  : stationName
                matchedLabels.push(label)
              }
            }

            return {
              id: it.id,
              enabled: it.isEnabled,
              hour: h,
              minute: m,
              stopLabels: matchedLabels, // 배열 그대로 저장
              repeatDays,
            }
          })

          // 권한 없으면 off 처리 로직 (생략없이 기존 유지)
          const permitted = await hasNotificationPermission()
          if (!permitted) {
            const enabledIds = mapped.filter((m) => m.enabled).map((m) => m.id)
            mapped.forEach((m) => (m.enabled = false))
            if (enabledIds.length > 0) {
              await Promise.all(
                enabledIds.map((id) =>
                  http.patch(`/traffic/alarms/${id}`, { isEnabled: false }),
                ),
              )
            }
          }

          setItems(mapped)
        } catch (err: any) {
          console.log('교통 알림 불러오기 실패:', err.response?.data)
        }
      }
      fetchAlerts()
    }, []),
  )

  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const canBulkDelete = selected.size > 0

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleEnabled = async (id: string) => {
    const target = items.find((it) => it.id === id)
    if (!target) return
    const nextEnabled = !target.enabled

    if (nextEnabled) {
      try {
        const ok = await ensureNotificationPermissionForToggle()
        if (ok === false) return
      } catch (e) {
        Alert.alert('알림 권한 필요', '교통 알림을 켜려면 알림 권한이 필요해요.')
        return
      }
    }

    try {
      await http.patch(`/traffic/alarms/${id}`, { isEnabled: nextEnabled })
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, enabled: nextEnabled } : it)),
      )
    } catch (err: any) {
      console.log('교통 알림 on/off 실패:', err.response?.data)
    }
  }

  const handleBulkDelete = () => {
    if (!canBulkDelete) return
    const ids = Array.from(selected)
    Alert.alert('삭제', '선택한 교통 알림을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(ids.map((id) => http.delete(`/traffic/alarms/${id}`)))
            setItems((prev) => prev.filter((it) => !ids.includes(it.id)))
            setSelected(new Set())
          } catch (err: any) {
            Alert.alert('오류', '교통 알림 삭제에 실패했습니다.')
          }
        },
      },
    ])
  }

  const handlePressAdd = () => nav.navigate('TrafficAlertEdit', { mode: 'create' })
  const handlePressDetail = (item: TransitAlertItem) =>
    nav.navigate('TrafficAlertEdit', { mode: 'edit', alertId: item.id })

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
          <Left width={30} height={30} color="#B4B4B4" />
        </Pressable>
        <Text style={S.headerTitle}>교통 알림</Text>
        <Pressable style={S.plusBtn} onPress={handlePressAdd}>
          <Plus width={22} height={22} color="#B04FFF" />
        </Pressable>
      </View>

      {editMode ? (
        <View style={S.headerBottom}>
          <Pressable onPress={handleBulkDelete}>
            <Text
              style={[S.headerLeft, { color: canBulkDelete ? '#B04FFF' : '#C0C2C7' }]}
            >
              삭제
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditMode(false)
              setSelected(new Set())
            }}
          >
            <Text style={S.headerRight}>완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={S.headerBottom}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setEditMode(true)}>
            <Text style={S.headerRight}>편집</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TransitAlertRow
            item={item}
            editMode={editMode}
            selected={selected.has(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
            onToggleEnabled={() => toggleEnabled(item.id)}
            onPressDetail={() => handlePressDetail(item)}
          />
        )}
      />
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.surface },
  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.3,
    borderBottomColor: '#B3B3B3',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.title },
  backBtn: { position: 'absolute', left: 16, height: 48, justifyContent: 'center' },
  plusBtn: { position: 'absolute', right: 16, height: 48, justifyContent: 'center' },
  headerBottom: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: { fontSize: 16, fontWeight: '700' },
  headerRight: { fontSize: 16, fontWeight: '700', color: '#B04FFF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 80,
    paddingVertical: 14,
  },
  rowTextBlock: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  timeAmPm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#474A54',
    marginRight: 6,
  },
  timeMain: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.title,
  },
  stopsContainer: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  stopText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  stopTextPlaceholder: {
    fontSize: 13,
    color: '#B3B3B3',
  },
  repeatText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  rowDivider: {
    height: 0.3,
    backgroundColor: '#E3E5EA',
    marginLeft: 16,
  },
  switchWrap: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
