import React, { useMemo, useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import Xbutton from '@/assets/icons/x.svg'
import Down from '@/assets/icons/down.svg'
import Check from '@/assets/icons/check.svg'
import TrafficStopSearchModal from '@/components/TrafficStopSearchModal'
import { http } from '@/lib/http'

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

  const handleSave = async () => {
    if (selectedItemIds.length === 0) {
      Alert.alert('오류', '정류장 및 노선을 최소 1개 선택해주세요.')
      return
    }
    const alarmTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    const days = repeatOn ? getDayStrings() : null
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
          <Xbutton width={15} height={15} color="#808080" />
        </Pressable>
        <Pressable style={S.headerSide} onPress={handleSave}>
          <Check width={15} height={15} color="#808080" />
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
          <Picker
            style={S.timePicker}
            itemStyle={S.timePickerItem}
            selectedValue={ampm}
            onValueChange={(v) => handleChangeAmpm(v as 'AM' | 'PM')}
          >
            <Picker.Item label="AM" value="AM" />
            <Picker.Item label="PM" value="PM" />
          </Picker>
        </View>

        <View style={{ marginTop: 30 }}>
          <Pressable
            style={S.selectHeaderBtn}
            onPress={() => setStopOpen((v) => !v)}
            hitSlop={8}
          >
            <Text style={S.sectionLabel} numberOfLines={1} ellipsizeMode="tail">
              {getSelectedStopLabel() ?? '정류장 및 노선 선택 (최대 2개)'}
            </Text>
            <Down width={10} height={10} color={stopOpen ? '#B04FFF' : '#333'} />
          </Pressable>

          {stopOpen && (
            <View style={S.dropdownCard}>
              {[
                ...stopOptions,
                {
                  itemId: 'ADD',
                  label: '정류장 및 노선 추가',
                  busRouteNo: '',
                } as FavoriteOption,
              ].map((opt, idx, arr) => {
                const isAdd = opt.itemId === 'ADD'
                const isSelected = selectedItemIds.includes(opt.itemId)
                const isLastItem = idx === arr.length - 1

                return (
                  <View key={opt.itemId}>
                    <Pressable
                      style={[
                        S.dropdownItem,
                        !isLastItem && { borderBottomWidth: 0.5, borderColor: '#E3E5EA' },
                      ]}
                      onPress={() => {
                        if (isAdd) {
                          setSearchOpen(true)
                          return
                        }
                        toggleStopSelection(opt.itemId)
                      }}
                    >
                      {isSelected && <View style={S.selectedBg} />}
                      <View style={S.dropdownContentCenter}>
                        <Text
                          style={[
                            S.dropdownItemText,
                            isSelected && S.dropdownItemTextSelected,
                            isAdd && { color: '#777', fontWeight: '500' },
                          ]}
                        >
                          {opt.label}
                        </Text>

                        {!isAdd && opt.busRouteNo && (
                          <Text
                            style={[
                              S.dropdownSubText,
                              isSelected && { color: '#B04FFF' },
                            ]}
                          >
                            {' '}
                            {opt.busRouteNo && `버스 ${opt.busRouteNo}번`}
                          </Text>
                        )}
                      </View>
                      {/* 삭제 버튼 (추가 버튼 제외, 우측 고정) */}
                      {!isAdd && (
                        <Pressable
                          style={S.deleteOptionBtn}
                          hitSlop={15}
                          onPress={() => {
                            Alert.alert('즐겨찾기 삭제', `${opt.label} 삭제할까요?`, [
                              { text: '취소', style: 'cancel' },
                              {
                                text: '삭제',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await http.delete(`/traffic/items/${opt.itemId}`)
                                    setStopOptions((prev) =>
                                      prev.filter((x) => x.itemId !== opt.itemId),
                                    )
                                    if (selectedItemIds.includes(opt.itemId)) {
                                      setSelectedItemIds((prev) =>
                                        prev.filter((id) => id !== opt.itemId),
                                      )
                                    }
                                  } catch (err: any) {
                                    console.log('삭제 실패:', err)
                                  }
                                },
                              },
                            ])
                          }}
                        >
                          <Xbutton width={10} height={10} color="#B4B4B4" />
                        </Pressable>
                      )}
                    </Pressable>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View style={S.sectionDivider} />

        <View style={{ marginTop: 8 }}>
          <Pressable
            style={S.repeatHeader}
            onPress={() => {
              if (repeatOn) setRepeatOpen((v) => !v)
            }}
          >
            <View>
              <Text style={S.sectionLabelSimple}>반복</Text>
            </View>
            <View style={S.repeatSelectBtn}>
              <Text
                style={[S.repeatSelectText, { color: repeatOn ? '#333' : '#B3B3B3' }]}
              >
                {getRepeatText()}
              </Text>
              <Down
                width={10}
                height={10}
                color={repeatOn ? '#333' : '#B3B3B3'}
                style={{ marginRight: 10 }}
              />
              <CustomToggle
                value={repeatOn}
                onChange={(v) => {
                  setRepeatOn(v)
                  if (!v) setRepeatOpen(false)
                }}
              />
            </View>
          </Pressable>

          {repeatOn && repeatOpen && (
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
        </View>

        {mode === 'edit' && (
          <View style={S.footer}>
            <Pressable
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
              <Text style={S.deleteTxt}>삭제</Text>
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
    borderBottomWidth: 0.3,
    borderBottomColor: '#B3B3B3',
  },
  headerSide: { width: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 32,
    paddingTop: 66,
    paddingBottom: 40,
  },
  timeLabelWrap: { alignItems: 'center', marginBottom: 16 },
  timeAmPm: { fontSize: 16, color: '#474A54', marginRight: 10 },
  timeMain: { fontSize: 32, color: '#B04FFF', fontWeight: '800' },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timePicker: { flex: 1, height: 160 },
  timePickerItem: { fontSize: 22, fontWeight: '500' },

  selectHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    width: '100%',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'left',
    flex: 1,
    lineHeight: 20,
  },
  sectionLabelSimple: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  dropdownCard: {
    marginTop: 6,
    width: '100%',
    backgroundColor: '#FFF',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },

  dropdownItem: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
  },

  dropdownContentCenter: {
    flexDirection: 'row', // ✅ [수정] 가로 배치
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '85%',
    zIndex: 1,
  },

  selectedBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    paddingVertical: 20,
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
    zIndex: 0,
  },

  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  dropdownItemTextSelected: {
    color: '#B04FFF',
    fontWeight: '700',
  },
  dropdownSubText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
    textAlign: 'center',
  },

  deleteOptionBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
  },

  dropdownDivider: {
    height: 1,
    backgroundColor: '#F4F4F4',
    width: '80%',
  },

  sectionDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: -32,
  },

  repeatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  repeatSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  repeatSelectText: { fontSize: 13 },

  weekRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { borderColor: '#B04FFF' },
  dayChipText: { fontSize: 15, color: '#474A54', fontWeight: '700' },
  dayChipTextActive: { color: '#B04FFF' },

  footer: { marginTop: 40 },
  deleteTxt: { fontSize: 15, color: '#9D7BFF', fontWeight: '700' },
})
