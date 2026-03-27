import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import colors from '@/styles/colors'
import Left from '@/assets/icons/left.svg'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { TrafficAlertStackList } from '@/navigation/TrafficAlertStack'
import { http } from '@/lib/http'
import { ts } from '@/styles/typography'
import {
  ensureNotificationPermissionForToggle,
  hasNotificationPermission,
} from '@/lib/fcm'

type TransitAlertItem = {
  id: string
  enabled: boolean
  hour: number
  minute: number
  stopLabels: { station: string; busRouteNo?: string | null }[]
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
  return `${ordered.map((d) => DAY_LABEL_KO[d]).join(', ')}요일마다`
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
      <Pressable
        style={[S.rowCard, selected && S.rowCardSelected]}
        onPress={editMode ? onToggleSelect : onPressDetail}
      >
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
                <CheckOn width={22} height={22} />
              ) : (
                <CheckOff width={22} height={22} />
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
                <View key={idx} style={S.stopRow}>
                  <Text style={S.stopText} numberOfLines={1}>
                    {label.station}
                  </Text>
                  {label.busRouteNo ? (
                    <>
                      <Text style={S.stopSeparator}>·</Text>
                      <Text style={S.routeText} numberOfLines={1}>
                        버스 {label.busRouteNo}번
                      </Text>
                    </>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={S.stopTextPlaceholder} numberOfLines={1}>
                정류장 및 노선 추가
              </Text>
            )}
          </View>

          {!!repeatText && (
            <View style={S.repeatChip}>
              <Text style={S.repeatText} numberOfLines={1}>
                {repeatText}
              </Text>
            </View>
          )}
        </View>

        <View style={S.switchWrap}>
          <CustomToggle value={item.enabled} onChange={onToggleEnabled} />
        </View>
      </Pressable>
    </View>
  )
}

export default function TrafficAlertsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<TrafficAlertStackList>>()
  const [items, setItems] = useState<TransitAlertItem[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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
            const matchedLabels: { station: string; busRouteNo?: string | null }[] = []

            for (const id of targetIds) {
              const fav = favorites.find((f: any) => f.id === id)
              if (fav) {
                const station = fav.busStationNo
                  ? `${fav.busStationName} (${fav.busStationNo})`
                  : fav.busStationName
                matchedLabels.push({
                  station,
                  busRouteNo: fav.busRouteNo ?? null,
                })
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
    setDeleteConfirmOpen(true)
  }

  const handlePressAdd = () => nav.navigate('TrafficAlertEdit', { mode: 'create' })
  const handlePressDetail = (item: TransitAlertItem) =>
    nav.navigate('TrafficAlertEdit', { mode: 'edit', alertId: item.id })

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
          <Left width={24} height={24} color={colors.icon.default} />
        </Pressable>
        <Text style={S.headerTitle}>교통 알림</Text>
        <Pressable style={S.plusBtn} onPress={handlePressAdd}>
          <View style={S.plusIcon}>
            <View style={S.plusIconHorizontal} />
            <View style={S.plusIconVertical} />
          </View>
        </Pressable>
      </View>

      {editMode ? (
        <View style={S.headerBottomEdit}>
          <Pressable onPress={handleBulkDelete}>
            <Text
              style={[
                S.headerActionText,
                { color: canBulkDelete ? colors.brand.primary : colors.text.text3 },
              ]}
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
            <Text style={S.headerActionText}>완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={S.headerBottomIdle}>
          <Pressable onPress={() => setEditMode(true)}>
            <Text style={[S.headerActionText, S.headerRightIdle]}>편집</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={S.listContent}
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

      {deleteConfirmOpen && (
        <View style={S.deleteOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDeleteConfirmOpen(false)}
          />
          <View style={S.deleteCard}>
            <Text style={S.deleteTitle}>선택하신 교통알림을 삭제할까요?</Text>
            <View style={S.deleteRow}>
              <Pressable
                style={[S.deleteActionBtn, S.deleteCancelBtn]}
                onPress={() => setDeleteConfirmOpen(false)}
              >
                <Text style={S.deleteCancelTxt}>취소</Text>
              </Pressable>
              <Pressable
                style={[S.deleteActionBtn, S.deleteConfirmBtn]}
                onPress={async () => {
                  const ids = Array.from(selected)
                  try {
                    await Promise.all(ids.map((id) => http.delete(`/traffic/alarms/${id}`)))
                    setItems((prev) => prev.filter((it) => !ids.includes(it.id)))
                    setSelected(new Set())
                    setDeleteConfirmOpen(false)
                  } catch (err: any) {
                    setDeleteConfirmOpen(false)
                    Alert.alert('오류', '교통 알림 삭제에 실패했습니다.')
                  }
                }}
              >
                <Text style={S.deleteConfirmTxt}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.surface },
  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...ts('titleM'), color: colors.text.title },
  backBtn: { position: 'absolute', left: 14, height: 48, justifyContent: 'center' },
  plusBtn: { position: 'absolute', right: 14, height: 48, justifyContent: 'center' },
  plusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconHorizontal: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.icon.selected,
  },
  plusIconVertical: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.icon.selected,
  },
  headerBottomEdit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  headerBottomIdle: {
    alignItems: 'flex-end',
    marginTop: 4,
    paddingRight: 14,
  },
  headerActionText: { ...ts('label3'), fontSize: 13, color: colors.text.text1 },
  headerRightIdle: { color: colors.text.text3 },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCard: {
    width: 302,
    height: 152,
    borderRadius: 20,
    backgroundColor: colors.background.bg1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#A4ADB2',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 0,
  },
  deleteTitle: {
    ...ts('label1'),
    fontWeight: '700',
    color: colors.text.text1,
    textAlign: 'center',
  },
  deleteRow: {
    width: 302,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 16,
  },
  deleteActionBtn: {
    width: 119,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtn: {
    backgroundColor: colors.background.bg1,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
  },
  deleteConfirmBtn: {
    backgroundColor: colors.brand.primary,
  },
  deleteCancelTxt: {
    ...ts('label1'),
    color: colors.text.text3,
  },
  deleteConfirmTxt: {
    ...ts('label1'),
    color: colors.text.text1w,
  },
  listContent: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
    rowGap: 12,
  },
  rowCard: {
    width: 358,
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.background.bg1,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
  },
  rowCardSelected: {
    backgroundColor: colors.background.bg2,
  },
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
    marginBottom: 16,
  },
  timeAmPm: {
    ...ts('body1'),
    color: colors.text.text2,
    marginRight: 6,
  },
  timeMain: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text.title,
  },
  stopsContainer: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    minWidth: 0,
  },
  stopText: {
    ...ts('label3'),
    fontSize: 13,
    color: colors.brand.primary,
    flexShrink: 1,
  },
  stopSeparator: {
    ...ts('label4'),
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.text3,
    marginHorizontal: 4,
  },
  routeText: {
    ...ts('label3'),
    fontSize: 13,
    color: colors.text.text3,
    flexShrink: 1,
  },
  stopTextPlaceholder: {
    ...ts('label3'),
    fontSize: 13,
    color: colors.brand.primary,
  },
  repeatText: {
    ...ts('body2'),
    color: colors.text.text1,
  },
  repeatChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.divider.divider1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  switchWrap: {
    marginLeft: 12,
    alignSelf: 'flex-start',
    paddingTop: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
})
