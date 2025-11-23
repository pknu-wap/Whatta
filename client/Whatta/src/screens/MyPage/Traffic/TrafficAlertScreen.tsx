import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Switch } from 'react-native'
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

type TransitAlertItem = {
  id: string
  enabled: boolean
  hour: number // 0~23
  minute: number // 0~59
  stopLabel?: string
  repeatDays: number[] // 0:월 ~ 6:일
}

// 서버 요일 문자열 ↔ 인덱스 매핑 (0:월 ~ 6:일)
const DAY_MAP = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

// 한국어 요일
const DAY_LABEL_KO = ['월', '화', '수', '목', '금', '토', '일']

function formatRepeatLabel(days: number[]) {
  if (!days.length) return ''

  // days 는 0:월 ~ 6:일
  const isWeekend = days.length === 2 && days.includes(5) && days.includes(6) // 토,일
  const isWeekday = days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d)) // 월~금
  const isEveryday = days.length === 7

  if (isWeekend) return '주말마다'
  if (isWeekday) return '평일마다'
  if (isEveryday) return '매일'

  const ordered = [...days].sort((a, b) => a - b)
  const text = ordered.map((d) => DAY_LABEL_KO[d]).join('·')
  return `매주 ${text}`
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

          {item.stopLabel ? (
            <Text style={[S.stopText, { color: '#B04FFF' }]} numberOfLines={1}>
              {item.stopLabel}
            </Text>
          ) : (
            <Text style={[S.stopTextPlaceholder, { color: '#B04FFF' }]} numberOfLines={1}>
              정류장 및 노선 추가
            </Text>
          )}

          {!!repeatText && (
            <Text style={S.repeatText} numberOfLines={1}>
              {repeatText}
            </Text>
          )}
        </View>

        {/* 오른쪽 Switch */}
        <View style={S.switchWrap}>
          <Switch
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            value={item.enabled}
            onValueChange={onToggleEnabled}
            trackColor={{ false: '#E3E5EA', true: '#D9C5FF' }}
            thumbColor={item.enabled ? '#B04FFF' : '#FFFFFF'}
          />
        </View>
      </Pressable>

      {/* 구분선 */}
      <View style={S.rowDivider} />
    </View>
  )
}

export default function TrafficAlertsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<TrafficAlertStackList>>()

  // 서버에서 받아올 알림 리스트
  const [items, setItems] = useState<TransitAlertItem[]>([])

  useFocusEffect(
    useCallback(() => {
      const fetchAlerts = async () => {
        try {
          // 1) 즐겨찾기(traffic/items) 먼저 조회
          const favRes = await http.get('/traffic/items')
          const favorites = favRes.data.data ?? []

          // 2) 알림 목록 조회
          const res = await http.get('/traffic/alarms')
          const list = res.data.data ?? []

          const mapped: TransitAlertItem[] = list.map((it: any) => {
            const [h, m] = (it.alarmTime ?? '00:00:00').split(':').map(Number)
            const repeatDays = (it.days ?? []).map((d: string) => DAY_MAP.indexOf(d))

            // 알림에 있는 favorite id 찾기
            const fav = favorites.find((f: any) => f.id === it.targetItemIds?.[0])

            // 정류장 및 노선 표시 텍스트 생성
            let stopLabel = '정류장 및 노선을 선택해주세요.'
            if (fav) {
              const stationName = fav.busStationNo
                ? `${fav.busStationName} (${fav.busStationNo})`
                : fav.busStationName

              stopLabel = fav.busRouteNo
                ? `${stationName} · 버스 ${fav.busRouteNo}번`
                : stationName
            }

            return {
              id: it.id,
              enabled: it.isEnabled,
              hour: h,
              minute: m,
              stopLabel,
              repeatDays,
            }
          })

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

  const toggleEnabled = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)),
    )
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
            // 서버 삭제 API 호출 (병렬 처리)
            await Promise.all(ids.map((id) => http.delete(`/traffic/alarms/${id}`)))

            // 로컬 상태에서도 삭제 반영
            setItems((prev) => prev.filter((it) => !ids.includes(it.id)))
            setSelected(new Set())

            // 최신 데이터 다시 불러오기(선택)
            // useFocusEffect 때문에 화면 돌아오면 자동 새로고침 됨
          } catch (err: any) {
            console.log('교통 알림 삭제 실패:', err.response?.data)
            Alert.alert('오류', '교통 알림 삭제에 실패했습니다.')
          }
        },
      },
    ])
  }

  const handlePressAdd = () => {
    nav.navigate('TrafficAlertEdit', { mode: 'create' })
  }

  const handlePressDetail = (item: TransitAlertItem) => {
    nav.navigate('TrafficAlertEdit', {
      mode: 'edit',
      alertId: item.id,
    })
  }

  return (
    <SafeAreaView style={S.safe}>
      {/* 상단 헤더 */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => nav.goBack()}>
          <Left width={30} height={30} color="#B4B4B4" />
        </Pressable>

        <Text style={S.headerTitle}>교통 알림</Text>

        <Pressable style={S.plusBtn} onPress={handlePressAdd}>
          <Plus width={22} height={22} color="#B04FFF" />
        </Pressable>
      </View>

      {/* 편집 / 삭제 바 */}
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

      {/* 리스트 */}
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

  // row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 64,
  },
  checkboxWrap: { width: 32, alignItems: 'center' },

  rowTextBlock: {
    flex: 1,
    flexDirection: 'column',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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

  stopText: {
    marginTop: 2,
    fontSize: 14,
    color: colors.text.body,
  },
  stopTextPlaceholder: {
    marginTop: 2,
    fontSize: 13,
    color: '#B3B3B3',
  },
  repeatText: {
    marginTop: 2,
    fontSize: 14,
    color: '#8E8E93',
  },

  rowDivider: {
    height: 0.3,
    backgroundColor: '#E3E5EA',
    marginTop: 16,
  },

  toggle: {
    width: 50,
    height: 31,
    borderRadius: 20,
    padding: 2,
    justifyContent: 'center',
  },

  switchWrap: {
    marginLeft: 12,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
})
