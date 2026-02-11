import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import SearchIcon from '@/assets/icons/search.svg'
import { http } from '@/lib/http'

type StopItem = {
  busStationId: string
  busStationName: string
  busStationNo: string | null
  cityCode: string
  latitude: number
  longitude: number
}

type TrafficStopSearchModalProps = {
  visible: boolean
  onClose: () => void
  onSelect: (item: { station: StopItem; route: any }) => void

  list: StopItem[]
  search: string
  setSearch: (text: string) => void
  loading: boolean
}

export default function TrafficStopSearchModal({
  visible,
  onClose,
  onSelect,
  list = [],
  search,
  setSearch,
  loading,
}: TrafficStopSearchModalProps) {
  const [expandedStationId, setExpandedStationId] = React.useState<string | null>(null)
  const [routes, setRoutes] = React.useState<any[]>([])
  const [routeLoading, setRouteLoading] = React.useState(false)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
    >
      {/* overlay: 바깥 클릭 시 닫힘 */}
      <Pressable style={S.overlay} onPress={onClose}>
        {/* 카드: 내부 클릭 시 닫힘 방지 */}
        <View
          style={S.card}
          onStartShouldSetResponder={() => true}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* 검색바 */}
          <View style={S.searchRow}>
            <TextInput style={S.input} value={search} onChangeText={setSearch} />

            {!search && (
              <Text style={S.placeholder} pointerEvents="none">
                정류장 및 노선을 입력하세요
              </Text>
            )}

            <SearchIcon width={20} height={20} />
          </View>

          <View style={S.divider} />

          {/* 리스트 */}
          <FlatList
            data={list}
            keyExtractor={(item) => item.busStationId}
            renderItem={({ item }) => {
              const isExpanded = expandedStationId === item.busStationId

              return (
                <View>
                  {/* 정류장 한 줄 */}
                  <Pressable
                    style={S.item}
                    onPress={async () => {
                      if (isExpanded) {
                        setExpandedStationId(null)
                        setRoutes([])
                        return
                      }
                      console.log('요청한 stationId:', item.busStationId)
                      setExpandedStationId(item.busStationId)
                      setRouteLoading(true)
                      setRoutes([])

                      try {
                        const res = await http.get(
                          `/traffic/station/searchRoutes/${item.busStationId}`,
                        )
                        console.log('노선 응답:', res.data.data)
                        setRoutes(res.data.data ?? [])
                      } catch (err: any) {
                        console.log('노선 조회 실패', err.response?.data)
                        setRoutes([])
                      } finally {
                        setRouteLoading(false)
                      }
                    }}
                  >
                    <Text style={S.itemText}>
                      {item.busStationName}
                      {item.busStationNo ? ` (${item.busStationNo})` : ''}
                    </Text>
                  </Pressable>

                  {/* 정류장 아래 노선 리스트 */}
                  {isExpanded && (
                    <View style={S.routeBox}>
                      {/* ▣ 헤더 */}
                      <View style={S.routeHeader}>
                        <Text style={S.routeHeaderNo}>번호</Text>
                        <Text style={S.routeHeaderDir}>출발지 → 도착지</Text>
                      </View>

                      <View style={S.routeHeaderDivider} />

                      {/* ▣ 노선 목록 */}
                      {routeLoading ? (
                        <Text style={S.routeLoading}>노선을 불러오는 중…</Text>
                      ) : routes.length === 0 ? (
                        <Text style={S.routeEmpty}>등록된 노선이 없습니다.</Text>
                      ) : (
                        routes.map((rt, idx) => (
                          <View key={rt.busRouteId}>
                            <Pressable
                              style={S.routeItemRow}
                              onPress={() => onSelect({ station: item, route: rt })}
                            >
                              <View style={S.routeLeft}>
                                <Text style={S.routeBadge}>{rt.busRouteNo}</Text>
                              </View>

                              <View style={S.routeRight}>
                                <Text style={S.routeMainText}>
                                  {rt.startBusStationName} → {rt.endBusStationName}
                                </Text>
                              </View>
                            </Pressable>

                            {/* 노선 사이 구분선 */}
                            {idx < routes.length - 1 && <View style={S.routeDivider} />}
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )
            }}
            ListEmptyComponent={
              <View style={S.emptyWrap}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#B04FFF" />
                    <Text style={S.emptyText}>정류장을 검색 중입니다…</Text>
                  </>
                ) : (
                  <Text style={S.emptyText}>검색 결과가 없습니다.</Text>
                )}
              </View>
            }
          />
        </View>
      </Pressable>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    height: '72%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333',
  },
  placeholder: {
    position: 'absolute',
    fontSize: 22,
    color: '#D3D3D3',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 12,
  },
  item: {
    paddingVertical: 18,
  },
  itemText: {
    fontSize: 17,
    color: '#111',
    fontWeight: '600',
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },

  /** 노선 영역 전체 박스 */
  routeBox: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#B04FFF',
    borderRadius: 8,
  },

  // 노선 카드
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  routeLeft: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  routeBadge: {
    backgroundColor: '#B04FFF20',
    color: '#B04FFF',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },

  routeRight: {
    flex: 1,
  },

  routeMainText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginLeft: 10,
  },

  routeLoading: {
    paddingVertical: 12,
    fontSize: 14,
    color: '#999',
  },

  routeEmpty: {
    paddingVertical: 12,
    fontSize: 14,
    color: '#999',
  },
  // 헤더
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
    marginLeft: 20,
  },
  routeHeaderNo: {
    width: 70,
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    paddingLeft: 4,
  },
  routeHeaderDir: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  routeHeaderDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },

  routeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  routeDivider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 6,
  },
})
