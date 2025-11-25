import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import Xbutton from '@/assets/icons/x.svg'
import Check from '@/assets/icons/check.svg'
import Down from '@/assets/icons/down.svg'
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

export default function TrafficAlertEditScreen() {
  const nav = useNavigation()
  const route = useRoute()
  const { mode = 'create', alertId } = (route.params ?? {}) as RouteParams

  // 시간 상태
  const [hour24, setHour24] = useState(9)
  const [minute, setMinute] = useState(0)

  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  // 정류장 및 노선 선택
  const [stopLabel, setStopLabel] = useState<string | null>(null)
  const [stopOpen, setStopOpen] = useState(false)
  const [stopOptions, setStopOptions] = useState<FavoriteOption[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [selectedStation, setSelectedStation] = useState<any | null>(null)

  // 즐겨찾기
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

          // 정류장 정보
          busStationId: it.busStationId,
          busStationName: it.busStationName,
          busStationNo: it.busStationNo,

          // 노선 정보
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

    const id = ++lastRequestId.current // 현재 요청 ID
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await http.get('/traffic/station/searchName', {
          params: { keyword: searchText },
        })

        // 최신 요청이 아니면 무시
        if (id !== lastRequestId.current) return

        setSearchResult(res.data.data ?? [])
      } catch (err) {
        if (id !== lastRequestId.current) return // 오래된 요청은 무시
        console.log('검색 실패')
      } finally {
        if (id === lastRequestId.current) setLoading(false)
      }
    }, 500) // 프로덕션에서 500~800ms 권장

    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    if (searchOpen) {
      // 모달이 '열릴 때' 초기화
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

    const weekday = [0, 1, 2, 3, 4] // 월~금
    const weekend = [5, 6] // 토,일

    const isWeekday = JSON.stringify(days) === JSON.stringify(weekday)
    const isWeekend = JSON.stringify(days) === JSON.stringify(weekend)

    if (isWeekday) return '평일마다'
    if (isWeekend) return '주말마다'

    // 그 외 조합
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

  const handleSave = async () => {
    if (!stopLabel) {
      Alert.alert('오류', '정류장 및 노선을 선택해주세요.')
      return
    }

    const selectedItemId = stopOptions.find((x) => x.label === stopLabel)?.itemId

    if (!selectedItemId) {
      Alert.alert('오류', '선택한 정류장 정보를 찾을 수 없습니다.')
      return
    }

    const alarmTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    const days = repeatOn ? getDayStrings() : [] // repeatOn이 false면 빈 배열

    const body = {
      alarmTime,
      days,
      targetItemIds: [selectedItemId],
    }

    try {
      if (mode === 'create') {
        // 생성 API
        await http.post('/traffic/alarms', body)
      } else if (mode === 'edit' && alertId) {
        // 수정 API
        await http.patch(`/traffic/alarms/${alertId}`, {
          ...body,
          isEnabled: true, // 기본 활성화
        })
      }

      nav.goBack()
    } catch (err: any) {
      console.log('알림 저장 실패:', err.response?.data)
      Alert.alert('오류', '알림 저장에 실패했습니다.')
    }
  }
  // TrafficAlertEditScreen: edit 모드시 목록에서 해당 알림만 찾아오기
  useEffect(() => {
    if (mode !== 'edit' || !alertId) return

    const fetchAlertDetail = async () => {
      try {
        const res = await http.get('/traffic/alarms') // 전체 목록 조회
        const all = res.data.data ?? []

        // 클릭한 id와 일치하는 알림만 찾기
        const info = all.find((x: any) => x.id === alertId)
        if (!info) return

        // 1) 시간 세팅
        const [h, m] = info.alarmTime.split(':').map(Number)
        setHour24(h)
        setMinute(m)

        // 2) 요일 세팅
        const mappedDays = info.days.map((d: string) => DAY_MAP.indexOf(d))
        if (mappedDays.length > 0) {
          setRepeatOn(true)
          setRepeatDays(mappedDays)
        }

        // 3) 정류장/노선 세팅
        // targetItemIds = ["즐겨찾기ID"]
        const itemId = info.targetItemIds?.[0]
        if (itemId) {
          // 즐겨찾기 목록이 이미 fetch 되어 있어야 함
          const found = stopOptions.find((s) => s.itemId === itemId)
          if (found) {
            setStopLabel(found.label)
            setSelectedStation({
              busStationId: found.busStationId,
              busStationName: found.busStationName,
              busStationNo: found.busStationNo,
            })
            setSelectedRoute({
              busRouteId: found.busRouteId,
              busRouteNo: found.busRouteNo,
              startBusStationName: found.startBusStationName,
              endBusStationName: found.endBusStationName,
            })
          }
        }
      } catch (err: any) {
        console.log('편집용 알림 값 조회 실패:', err.response?.data)
      }
    }

    // stopOptions (즐겨찾기 목록) 준비 후 실행
    if (stopOptions.length > 0) {
      fetchAlertDetail()
    }
  }, [mode, alertId, stopOptions])

  return (
    <SafeAreaView style={S.safe}>
      {/* 헤더 */}
      <View style={S.header}>
        <Pressable style={S.headerSide} onPress={() => nav.goBack()}>
          <Xbutton width={12} height={12} color="#808080" />
        </Pressable>
        <Pressable style={S.headerSide} onPress={handleSave}>
          <Check width={12} height={12} color="#808080" />
        </Pressable>
      </View>

      {/* 본문 */}
      <ScrollView
        style={S.body}
        contentContainerStyle={S.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 시간 표시 */}
        <View style={S.timeLabelWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={S.timeAmPm}>{ampm === 'AM' ? '오전' : '오후'}</Text>
            <Text style={S.timeMain}>
              {hour12}:{String(minute).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* 시간 피커 */}
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

        {/* 정류장 및 노선 섹션 */}
        <View style={{ marginTop: 30 }}>
          {/* 상단 라벨 + 선택값 버튼 */}
          <Pressable
            style={S.selectHeaderBtn}
            onPress={() => setStopOpen((v) => !v)}
            hitSlop={8}
          >
            <Text style={S.sectionLabel}>{stopLabel ?? '정류장 및 노선'}</Text>

            <Down width={10} height={10} color={stopOpen ? '#B04FFF' : '#333'} />
          </Pressable>

          {/* 드롭다운 */}
          {stopOpen && (
            <View style={S.dropdownCard}>
              {[
                ...stopOptions,
                {
                  itemId: 'ADD',
                  label: '정류장 및 노선 추가',

                  // 노선 정보 – 더미 값
                  busRouteId: '',
                  busRouteNo: '',
                  startBusStationName: '',
                  endBusStationName: '',

                  // 정류장 정보 – 더미 값
                  busStationId: '',
                  busStationName: '',
                  busStationNo: null,
                } as FavoriteOption,
              ].map((opt, idx) => {
                const isAdd = opt.itemId === 'ADD'
                const isSelected = stopLabel === opt.label

                return (
                  <View key={opt.itemId}>
                    <Pressable
                      style={S.dropdownItem}
                      onPress={() => {
                        if (isAdd) {
                          setSearchOpen(true)
                          return
                        }

                        setStopLabel(opt.label)
                        setSelectedRoute({
                          busRouteId: opt.busRouteId,
                          busRouteNo: opt.busRouteNo,
                          startBusStationName: opt.startBusStationName,
                          endBusStationName: opt.endBusStationName,
                        })
                        setStopOpen(false)
                      }}
                    >
                      {/* 선택 배경 */}
                      {isSelected && <View style={S.selectedBg} />}

                      <View style={{ flex: 1 }}>
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
                              {
                                fontSize: 12,
                                color: '#8E8E93',
                                marginTop: 3,
                              },
                              isSelected && { color: '#B04FFF' },
                            ]}
                          >
                            버스 {opt.busRouteNo}번
                          </Text>
                        )}
                      </View>

                      {/* 삭제 버튼 (추가 버튼 제외) */}
                      {!isAdd && (
                        <Pressable
                          style={S.deleteOptionBtn}
                          hitSlop={10}
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
                                    if (stopLabel === opt.label) {
                                      setStopLabel(null)
                                      setSelectedRoute(null)
                                    }
                                  } catch (err: any) {
                                    console.log('삭제 실패:', err.response?.data)
                                  }
                                },
                              },
                            ])
                          }}
                        >
                          <Xbutton width={11} height={11} color="#B4B4B4" />
                        </Pressable>
                      )}
                    </Pressable>

                    {idx < [...stopOptions, { itemId: 'ADD' }].length - 1 && (
                      <View style={S.dropdownDivider} />
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* 섹션 구분선 */}
        <View style={S.sectionDivider} />

        {/* 반복 섹션 */}
        <View style={{ marginTop: 8 }}>
          <Pressable
            style={S.repeatHeader}
            onPress={() => {
              if (repeatOn) setRepeatOpen((v) => !v) // 토글 ON일 때만 열기
            }}
          >
            <View>
              <Text style={S.sectionLabel}>반복</Text>
            </View>
            <View style={S.repeatSelectBtn}>
              <Text style={S.repeatSelectText}>{getRepeatText()}</Text>
              <Down
                width={10}
                height={10}
                color={repeatOn ? '#B04FFF' : '#333'}
                style={{ marginRight: 10 }}
              />

              <Switch
                style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                value={repeatOn}
                onValueChange={(v) => {
                  setRepeatOn(v)
                  if (!v) setRepeatOpen(false) // 꺼지면 드롭다운 자동 닫기
                }}
                trackColor={{ false: '#E3E5EA', true: '#D9C5FF' }}
                thumbColor={repeatOn ? '#B04FFF' : '#FFFFFF'}
              />
            </View>
          </Pressable>

          {/* 반복 요일 드롭다운 */}
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

        {/* 삭제 버튼 (편집 모드일 때만) */}
        {mode === 'edit' && (
          <View style={S.footer}>
            <Pressable
              onPress={() => {
                Alert.alert(
                  '알림 삭제',
                  '정말 삭제하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => {
                        // TODO: 서버 연동 시 삭제 API 호출 자리
                        // await deleteAlert(alertId);

                        nav.goBack() // 삭제 후 뒤로가기
                      },
                    },
                  ],
                  { cancelable: true },
                )
              }}
            >
              <Text style={S.deleteTxt}>삭제</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 검색 모달 */}
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

            const created = res.data.data // 서버 응답
            const createdId = created.id // itemId

            setStopOptions((prev) => {
              const exists = prev.some((it) => it.label === label)

              if (exists) return prev

              return [
                {
                  itemId: createdId,
                  label,

                  // 정류장 정보
                  busStationId: station.busStationId,
                  busStationName: station.busStationName,
                  busStationNo: station.busStationNo,

                  // 노선 정보
                  busRouteId: route.busRouteId,
                  busRouteNo: route.busRouteNo,
                  startBusStationName: route.startBusStationName,
                  endBusStationName: route.endBusStationName,
                },
                ...prev,
              ]
            })

            setStopLabel(label)
            setSelectedStation(station)
            setSelectedRoute(route)
          } catch (err: any) {
            console.log('즐겨찾기 추가 실패:', err.response?.data)
          }

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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#B3B3B3',
  },
  headerSide: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  section: { marginTop: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '600' },

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

  repeatSelectText: {
    fontSize: 13,
    color: '#8E8E93',
  },

  repeatLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#8E8E93',
  },

  toggle: {
    width: 50,
    height: 26,
    borderRadius: 20,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },

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
  dayChipActive: {
    borderColor: '#B04FFF',
  },
  dayChipText: { fontSize: 15, color: '#474A54', fontWeight: '700' },
  dayChipTextActive: { color: '#B04FFF' },

  footer: { marginTop: 40 },
  deleteTxt: { fontSize: 15, color: '#9D7BFF', fontWeight: '700' },

  repeatLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
  },

  repeatTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  // 검색
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    width: '80%',
    height: '60%',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 16,
  },
  searchInput: { fontSize: 14, color: '#fff', marginBottom: 12 },
  searchItem: { paddingVertical: 12 },
  searchItemText: { color: '#fff', fontSize: 14 },
  searchEmpty: { marginTop: 32, alignItems: 'center' },
  searchEmptyText: { color: '#aaa' },

  selectHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
    justifyContent: 'space-between',
  },

  selectHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  dropdownCard: {
    marginTop: 6,
    width: 320,
    backgroundColor: '#FFF',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  dropdownItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
  },

  dropdownDivider: {
    height: 0.5,
    backgroundColor: '#E3E5EA',
    marginLeft: 12,
    marginRight: 12,
  },

  selectedBg: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 44,
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
  },

  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  dropdownItemTextSelected: {
    color: '#9D7BFF',
    fontWeight: '700',
  },

  deleteOptionBtn: {
    position: 'absolute',
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },
  routeLoading: {
    fontSize: 14,
    color: '#999',
  },
  routeEmpty: {
    fontSize: 14,
    color: '#aaa',
  },
  routeItem: {
    paddingVertical: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#333',
  },
})
