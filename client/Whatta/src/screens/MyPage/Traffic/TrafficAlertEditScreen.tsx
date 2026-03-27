import React, { useMemo, useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import Xbutton from '@/assets/icons/xL.svg'
import ClearIcon from '@/assets/icons/x.svg'
import Down from '@/assets/icons/down.svg'
import Check from '@/assets/icons/check.svg'
import TrafficStopSearchModal from '@/components/TrafficStopSearchModal'
import { http } from '@/lib/http'
import { ts } from '@/styles/typography'

type RouteParams = {
  mode?: 'create' | 'edit'
  alertId?: string
}

type FavoriteOption = {
  itemId: string
  label: string
  busRouteId: string
  busRouteNo: string
  startBusStationName: string
  endBusStationName: string
  busStationId: string
  busStationName: string
  busStationNo: string | null
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

const DAY_LABEL_FULL = ['월', '화', '수', '목', '금', '토', '일']
const DAY_MAP = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

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

export default function TrafficAlertEditScreen() {
  const nav = useNavigation()
  const route = useRoute()
  const { mode = 'create', alertId } = (route.params ?? {}) as RouteParams

  const [hour24, setHour24] = useState(9)
  const [minute, setMinute] = useState(0)
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  const [stopOpen, setStopOpen] = useState(false)
  const [stopOptions, setStopOptions] = useState<FavoriteOption[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const selectedStops = useMemo(
    () => stopOptions.filter((opt) => selectedItemIds.includes(opt.itemId)),
    [selectedItemIds, stopOptions],
  )

  // 초기 데이터 로드
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await http.get('/traffic/items')
        const list = res.data.data ?? []
        const mapped: FavoriteOption[] = list.map((it: any) => ({
          itemId: it.id,
          label: it.busStationNo
            ? `${it.busStationName} (${it.busStationNo})`
            : it.busStationName,
          busStationId: it.busStationId,
          busStationName: it.busStationName,
          busStationNo: it.busStationNo,
          busRouteId: it.busRouteId,
          busRouteNo: it.busRouteNo,
          startBusStationName: it.startBusStationName,
          endBusStationName: it.endBusStationName,
        }))
        setStopOptions(mapped)
      } catch (err: any) {
        console.log('즐겨찾기 가져오기 실패:', err.response?.data)
      }
    }
    fetchFavorites()
  }, [])

  // 검색 모달
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchResult, setSearchResult] = useState([])
  const [loading, setLoading] = useState(false)
  const lastRequestId = useRef(0)

  useEffect(() => {
    if (searchText.length < 2) {
      setSearchResult([])
      return
    }
    const id = ++lastRequestId.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await http.get('/traffic/station/searchName', {
          params: { keyword: searchText },
        })
        if (id !== lastRequestId.current) return
        setSearchResult(res.data.data ?? [])
      } catch (err) {
        if (id !== lastRequestId.current) return
      } finally {
        if (id === lastRequestId.current) setLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    if (searchOpen) {
      setSearchText('')
      setSearchResult([])
      setLoading(false)
    }
  }, [searchOpen])

  // 반복
  const [repeatOn, setRepeatOn] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [repeatOpen, setRepeatOpen] = useState(false)
  const getDayStrings = () => repeatDays.map((d) => DAY_MAP[d])

  const getRepeatText = () => {
    if (!repeatOn) return '반복 안함'
    const days = [...repeatDays].sort()
    const weekday = [0, 1, 2, 3, 4]
    const weekend = [5, 6]
    const isWeekday = JSON.stringify(days) === JSON.stringify(weekday)
    const isWeekend = JSON.stringify(days) === JSON.stringify(weekend)
    if (isWeekday) return '평일마다'
    if (isWeekend) return '주말마다'
    const DAY_LABEL_SHORT = ['월', '화', '수', '목', '금', '토', '일']
    return days.map((d) => DAY_LABEL_SHORT[d]).join(' ')
  }

  const handleChangeHour12 = (h12: number) => {
    setHour24((prev) => {
      const isPm = prev >= 12
      if (isPm) return h12 === 12 ? 12 : h12 + 12
      return h12 === 12 ? 0 : h12
    })
  }

  const handleChangeAmpm = (next: 'AM' | 'PM') => {
    setHour24((prev) => {
      const isPm = prev >= 12
      if (next === 'AM' && isPm) return prev - 12
      if (next === 'PM' && !isPm) return prev + 12
      return prev
    })
  }

  const toggleStopSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        if (prev.length >= 2) {
          Alert.alert('알림', '최대 2개까지만 선택할 수 있습니다.')
          return prev
        }
        return [...prev, itemId]
      }
    })
  }

  const getSelectedStopLabel = () => {
    if (selectedItemIds.length === 0) return null
    const labels = stopOptions
      .filter((opt) => selectedItemIds.includes(opt.itemId))
      .map((opt) => opt.label)
    return labels.join(', ')
  }
  const getSelectedRouteLabel = () => {
    if (selectedStops.length === 0) return null
    return selectedStops
      .map((opt) => (opt.busRouteNo ? `${opt.busRouteNo}번` : ''))
      .filter(Boolean)
      .join(', ')
  }

  const handleSave = async () => {
    if (selectedItemIds.length === 0) {
      Alert.alert('오류', '정류장 및 노선을 최소 1개 선택해주세요.')
      return
    }
    const alarmTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    const days = repeatOn ? getDayStrings() : []
    const body = {
      alarmTime,
      days,
      targetItemIds: selectedItemIds,
    }

    try {
      if (mode === 'create') {
        await http.post('/traffic/alarms', body)
      } else if (mode === 'edit' && alertId) {
        await http.patch(`/traffic/alarms/${alertId}`, {
          ...body,
          isEnabled: true,
        })
      }
      nav.goBack()
    } catch (err: any) {
      console.log('알림 저장 실패:', err.response?.data)
      Alert.alert('오류', '알림 저장에 실패했습니다.')
    }
  }

  useEffect(() => {
    if (mode !== 'edit' || !alertId) return
    const fetchAlertDetail = async () => {
      try {
        const res = await http.get('/traffic/alarms')
        const all = res.data.data ?? []
        const info = all.find((x: any) => x.id === alertId)
        if (!info) return
        const [h, m] = info.alarmTime.split(':').map(Number)
        setHour24(h)
        setMinute(m)
        if (info.days && info.days.length > 0) {
          const mappedDays = info.days.map((d: string) => DAY_MAP.indexOf(d))
          setRepeatOn(true)
          setRepeatDays(mappedDays)
        } else {
          setRepeatOn(false)
        }
        if (info.targetItemIds && info.targetItemIds.length > 0) {
          setSelectedItemIds(info.targetItemIds)
        }
      } catch (err: any) {}
    }
    if (stopOptions.length > 0) fetchAlertDetail()
  }, [mode, alertId, stopOptions])

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.header}>
        <Pressable style={S.headerSide} onPress={() => nav.goBack()}>
          {({ pressed }) => (
            <Xbutton
              width={20}
              height={20}
              color={pressed ? colors.icon.selected : colors.icon.default}
            />
          )}
        </Pressable>
        <Pressable style={S.headerSide} onPress={handleSave} hitSlop={16}>
          {({ pressed }) => (
            <Check
              width={16}
              height={16}
              color={pressed ? colors.icon.selected : colors.icon.default}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={S.body}
        contentContainerStyle={S.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={S.timeLabelWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={S.timeAmPm}>{ampm === 'AM' ? '오전' : '오후'}</Text>
            <Text style={S.timeMain}>
              {hour12}:{String(minute).padStart(2, '0')}
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
            selectedValue={minute}
            onValueChange={(v) => setMinute(v as number)}
          >
            {MINUTES.map((m) => (
              <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
            ))}
          </Picker>
        </View>

        <View style={S.stopSection}>
          <Text style={S.stopSectionTitle}>정류장 및 노선 검색 (최대 2개)</Text>

          <Pressable
            style={S.stopSelector}
            onPress={() => setStopOpen((v) => !v)}
            hitSlop={8}
          >
            <View style={S.stopSelectorMain}>
              <View style={S.stopSelectorContent}>
                <Text style={S.stopSelectorStation} numberOfLines={1} ellipsizeMode="tail">
                  {getSelectedStopLabel() ?? '정류장 선택'}
                </Text>
                {!!getSelectedRouteLabel() && (
                  <Text style={S.stopSelectorRoute} numberOfLines={1}>
                    {getSelectedRouteLabel()}
                  </Text>
                )}
              </View>
              <View style={S.stopSelectorIconWrap}>
                <Down width={12} height={12} color={colors.icon.selected} />
              </View>
            </View>
          </Pressable>

          {stopOpen && (
            <View style={S.favoriteList}>
              {stopOptions.map((opt) => {
                const isSelected = selectedItemIds.includes(opt.itemId)

                return (
                  <Pressable
                    key={opt.itemId}
                    style={[S.favoriteRow, isSelected && S.favoriteRowSelected]}
                    onPress={() => toggleStopSelection(opt.itemId)}
                  >
                    <View style={S.favoriteRowContent}>
                      <Text
                        style={[
                          S.favoriteStation,
                          isSelected && S.favoriteStationSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {!!opt.busRouteNo && (
                        <Text
                          style={[
                            S.favoriteRoute,
                            isSelected && S.favoriteRouteSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.busRouteNo}번
                        </Text>
                      )}
                    </View>
                    <Pressable
                      style={S.favoriteDeleteBtn}
                      hitSlop={12}
                      onPress={async (e) => {
                        e.stopPropagation()
                        try {
                          await http.delete(`/traffic/items/${opt.itemId}`)
                          setStopOptions((prev) => prev.filter((item) => item.itemId !== opt.itemId))
                          setSelectedItemIds((prev) =>
                            prev.filter((itemId) => itemId !== opt.itemId),
                          )
                        } catch (err: any) {
                          Alert.alert('오류', '즐겨찾기 삭제에 실패했습니다.')
                        }
                      }}
                    >
                      <ClearIcon width={12} height={12} color={colors.icon.default} />
                    </Pressable>
                  </Pressable>
                )
              })}

              <Pressable style={S.favoriteRow} onPress={() => setSearchOpen(true)}>
                <View style={S.favoriteSearchRow}>
                  <Text style={S.favoriteSearchText}>정류장 검색</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <View style={S.repeatSection}>
          <View style={S.repeatHeader}>
            <Text style={S.repeatLabel}>반복</Text>
            <CustomToggle
              value={repeatOn}
              onChange={(v) => {
                setRepeatOn(v)
                if (!v) setRepeatOpen(false)
              }}
            />
          </View>

          {repeatOn && (
            <>
              <Pressable
                style={S.repeatSelector}
                onPress={() => setRepeatOpen((v) => !v)}
                hitSlop={8}
              >
                <View style={S.repeatSelectorMain}>
                  <Text style={S.repeatSelectorText}>{getRepeatText()}</Text>
                  <View style={S.repeatSelectorIconWrap}>
                    <Down width={12} height={12} color={colors.icon.selected} />
                  </View>
                </View>
              </Pressable>

              {repeatOpen && (
                <View style={S.weekRow}>
                  {DAY_LABEL_FULL.map((label, idx) => {
                    const active = repeatDays.includes(idx)
                    return (
                      <Pressable
                        key={idx}
                        style={[S.dayChip, active && S.dayChipActive]}
                        onPress={() =>
                          setRepeatDays((prev) =>
                            prev.includes(idx)
                              ? prev.filter((x) => x !== idx)
                              : [...prev, idx],
                          )
                        }
                      >
                        <Text style={[S.dayChipText, active && S.dayChipTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {mode === 'edit' && (
          <View style={S.footer}>
            <Pressable
              style={S.deletePill}
              onPress={() => {
                Alert.alert('알림 삭제', '정말 삭제하시겠습니까?', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        if (alertId) await http.delete(`/traffic/alarms/${alertId}`)
                        nav.goBack()
                      } catch (e) {
                        Alert.alert('오류', '삭제 실패')
                      }
                    },
                  },
                ])
              }}
            >
              <Text style={S.deletePillText}>삭제</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <TrafficStopSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={async ({ station, route }) => {
          const label = station.busStationNo
            ? `${station.busStationName} (${station.busStationNo})`
            : station.busStationName
          try {
            const res = await http.post('/traffic/items', {
              busStationId: station.busStationId,
              busStationName: station.busStationName,
              busRouteId: route.busRouteId,
              busRouteNo: route.busRouteNo,
            })
            const created = res.data.data
            const createdId = created.id
            setStopOptions((prev) => {
              const exists = prev.some((it) => it.label === label)
              if (exists) return prev
              return [
                {
                  itemId: createdId,
                  label,
                  busStationId: station.busStationId,
                  busStationName: station.busStationName,
                  busStationNo: station.busStationNo,
                  busRouteId: route.busRouteId,
                  busRouteNo: route.busRouteNo,
                  startBusStationName: route.startBusStationName,
                  endBusStationName: route.endBusStationName,
                },
                ...prev,
              ]
            })
            setSelectedItemIds((prev) => {
              if (prev.length < 2) return [...prev, createdId]
              return prev
            })
          } catch (err: any) {}
          setSearchOpen(false)
        }}
        list={searchResult}
        search={searchText}
        setSearch={setSearchText}
        loading={loading}
      />
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.surface },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerSide: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 66,
    paddingBottom: 40,
  },
  timeLabelWrap: { alignItems: 'center', marginBottom: 16 },
  timeAmPm: { ...ts('body1'), fontSize: 13, color: colors.text.text2, marginRight: 6 },
  timeMain: { fontSize: 40, color: colors.text.title, fontWeight: '700' },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  timePicker: { flex: 1, height: 160 },
  timePickerItem: { fontSize: 22, fontWeight: '500' },

  stopSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  stopSectionTitle: {
    ...ts('label2'),
    color: colors.text.text3,
    width: 358,
  },
  stopSelector: {
    width: 358,
    height: 50,
    marginTop: 22,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    paddingHorizontal: 16,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopSelectorMain: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    maxWidth: '80%',
  },
  stopSelectorStation: {
    ...ts('label2'),
    color: colors.brand.primary,
    flexShrink: 1,
    textAlign: 'center',
  },
  stopSelectorRoute: {
    ...ts('date2'),
    color: colors.brand.primary,
    marginLeft: 8,
    flexShrink: 0,
  },
  stopSelectorIconWrap: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteList: {
    width: 358,
    marginTop: 4,
  },
  favoriteRow: {
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider.divider1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  favoriteRowSelected: {
    backgroundColor: colors.background.bg2,
  },
  favoriteRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  favoriteDeleteBtn: {
    position: 'absolute',
    right: 23.5,
    top: 0,
    bottom: 0,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteStation: {
    ...ts('date2'),
    color: colors.text.text1,
  },
  favoriteStationSelected: {
    ...ts('label2'),
    color: colors.text.text1,
  },
  favoriteRoute: {
    ...ts('date2'),
    color: colors.text.text3,
  },
  favoriteRouteSelected: {
    ...ts('date2'),
    color: colors.text.text1,
  },
  favoriteSearchRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteSearchText: {
    ...ts('label2'),
    color: colors.text.text1,
  },
  repeatSection: {
    width: 358,
    alignSelf: 'center',
    marginTop: 34,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatLabel: {
    ...ts('label2'),
    color: colors.text.text3,
  },
  repeatSelector: {
    width: 358,
    height: 50,
    marginTop: 22,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.divider.divider1,
    paddingHorizontal: 16,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatSelectorMain: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatSelectorText: {
    ...ts('label2'),
    color: colors.brand.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
  repeatSelectorIconWrap: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    width: 358,
    height: 50,
    marginTop: 4,
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider.divider2,
  },
  dayChip: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.background.bg2,
  },
  dayChipText: {
    ...ts('date1'),
    color: colors.text.text2,
  },
  dayChipTextActive: {
    ...ts('label2'),
    color: colors.text.text1,
  },

  footer: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  deletePill: {
    minWidth: 38,
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePillText: {
    ...ts('body1'),
    color: '#FF6B6B',
    fontWeight: '600',
  },
})
