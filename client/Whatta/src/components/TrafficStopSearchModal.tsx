import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import SearchIcon from '@/assets/icons/search.svg'
import OneIcon from '@/assets/icons/one.svg'
import { http } from '@/lib/http'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

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

const MOCK_BUS_NUMBER = '96'
const MOCK_SUBWAY_STATION = '서면'
const MOCK_BUS_DIRECTIONS = ['서구청 방면', '다대포 방면']
const MOCK_ROUTE_STOPS: Record<string, string[]> = {
  '서구청 방면': ['다대포해수욕장', '다대포항', '낫개', '장림', '신평', '하단'],
  '다대포 방면': ['서구청', '대신역', '토성역', '자갈치', '남포역', '다대포항'],
}
const MOCK_SUBWAY_LINES = [
  { busRouteId: 'mock-subway-line-1', line: '1호선', directions: ['노포행', '다대포행'] },
  { busRouteId: 'mock-subway-line-2', line: '2호선', directions: ['장산행', '??행'] },
]
const CITY_OPTIONS = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
]

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
  const [selectedMockDirection, setSelectedMockDirection] = React.useState<string | null>(null)
  const [selectedMockStop, setSelectedMockStop] = React.useState<string | null>(null)
  const [selectedSubwayDirection, setSelectedSubwayDirection] = React.useState<string | null>(null)
  const [selectedCity, setSelectedCity] = React.useState('부산')
  const [cityPickerOpen, setCityPickerOpen] = React.useState(false)
  const isBusNumberSearch = search.trim() === MOCK_BUS_NUMBER
  const isSubwaySearch = search.trim() === MOCK_SUBWAY_STATION
  const displayList = isBusNumberSearch
    ? [
        {
          busStationId: `mock-bus-${MOCK_BUS_NUMBER}`,
          busStationName: MOCK_BUS_NUMBER,
          busStationNo: null,
          cityCode: '21',
          latitude: 0,
          longitude: 0,
        },
      ]
    : isSubwaySearch
      ? [
          {
            busStationId: `mock-subway-${MOCK_SUBWAY_STATION}`,
            busStationName: `${MOCK_SUBWAY_STATION}역`,
            busStationNo: null,
            cityCode: '21',
            latitude: 0,
            longitude: 0,
          },
      ]
    : list

  React.useEffect(() => {
    setExpandedStationId(null)
    setRoutes([])
    setRouteLoading(false)
    setSelectedMockDirection(null)
    setSelectedMockStop(null)
    setSelectedSubwayDirection(null)
  }, [search])

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
          <Pressable
            style={[S.cityChip, cityPickerOpen && S.cityChipActive]}
            onPress={() => setCityPickerOpen((prev) => !prev)}
          >
            <Text style={[S.cityChipText, cityPickerOpen && S.cityChipTextActive]}>
              {selectedCity}
            </Text>
          </Pressable>

          {/* 검색바 */}
          <View style={S.searchRow}>
            <View style={S.searchBox}>
              <TextInput style={S.input} value={search} onChangeText={setSearch} />

              {!search && (
                <Text style={S.placeholder} pointerEvents="none">
                  {cityPickerOpen ? '지역 명을 입력하세요' : '정류장 및 노선을 입력하세요'}
                </Text>
              )}

              <SearchIcon width={24} height={24} />
            </View>
          </View>

          {cityPickerOpen ? (
            <ScrollView
              style={S.cityListScroll}
              contentContainerStyle={S.cityGrid}
              showsVerticalScrollIndicator={false}
            >
              {CITY_OPTIONS.map((city) => {
                const selected = selectedCity === city
                return (
                  <Pressable
                    key={city}
                    style={[S.cityOption, selected && S.cityOptionSelected]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text style={[S.cityOptionText, selected && S.cityOptionTextSelected]}>
                      {city}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : (
            <FlatList
              data={displayList}
              keyExtractor={(item) => item.busStationId}
              contentContainerStyle={S.listContent}
              renderItem={({ item }) => {
              const isExpanded = expandedStationId === item.busStationId

              return (
                <View style={S.stationBlock}>
                  {/* 정류장 한 줄 */}
                  <Pressable
                    style={[S.item, isExpanded && S.itemActive]}
                    onPress={async () => {
                      if (isExpanded) {
                        setExpandedStationId(null)
                        setRoutes([])
                        setSelectedMockDirection(null)
                        setSelectedMockStop(null)
                        setSelectedSubwayDirection(null)
                        return
                      }
                      if (isBusNumberSearch) {
                        setExpandedStationId(item.busStationId)
                        setRoutes(
                          MOCK_BUS_DIRECTIONS.map((direction, idx) => ({
                            busRouteId: `mock-route-${idx}`,
                            direction,
                          })),
                        )
                        return
                      }
                      if (isSubwaySearch) {
                        setExpandedStationId(item.busStationId)
                        setRoutes(MOCK_SUBWAY_LINES)
                        setSelectedSubwayDirection(null)
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
                    <View style={S.itemRow}>
                      <Text style={[S.itemText, isExpanded && S.itemTextActive]}>
                        {item.busStationName}
                        {item.busStationNo ? ` (${item.busStationNo})` : ''}
                      </Text>
                      {isSubwaySearch ? <Text style={S.subwayTag}>지하철</Text> : null}
                    </View>
                  </Pressable>

                  {/* 정류장 아래 노선 리스트 */}
                  {isExpanded && (
                    <View style={S.routeBox}>
                      {/* ▣ 헤더 */}
                      <View style={S.routeHeader}>
                        <Text style={S.routeHeaderNo}>
                          {isBusNumberSearch || isSubwaySearch ? '노선' : '번호'}
                        </Text>
                        <Text style={S.routeHeaderDir}>
                          {isBusNumberSearch
                            ? ''
                            : isSubwaySearch
                              ? '방면'
                              : '출발지 → 도착지'}
                        </Text>
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
                              onPress={() => {
                                if (isBusNumberSearch) {
                                  setSelectedMockDirection(rt.direction)
                                  const firstStop = MOCK_ROUTE_STOPS[rt.direction]?.[0] ?? null
                                  setSelectedMockStop(firstStop)
                                  return
                                }
                                onSelect({ station: item, route: rt })
                              }}
                            >
                              {isSubwaySearch ? (
                                <View style={S.subwayDirectionList}>
                                  {rt.directions.map((direction: string, dirIdx: number) => (
                                    <Pressable
                                      key={direction}
                                      onPress={() => setSelectedSubwayDirection(direction)}
                                      style={[
                                        S.subwayDirectionRow,
                                        dirIdx === rt.directions.length - 1 &&
                                          S.subwayDirectionBoxLast,
                                      ]}
                                    >
                                      <View style={S.routeLeft}>
                                        {dirIdx === 0 ? (
                                          <View style={S.routeBadge}>
                                            <Text style={S.routeBadgeText}>{rt.line}</Text>
                                          </View>
                                        ) : null}
                                      </View>
                                      <View style={S.routeRight}>
                                        <View style={S.subwayDirectionBox}>
                                          <Text
                                            style={[
                                              S.routeMainText,
                                              selectedSubwayDirection === direction &&
                                                S.routeMainTextSelected,
                                            ]}
                                          >
                                            {direction}
                                          </Text>
                                        </View>
                                      </View>
                                    </Pressable>
                                  ))}
                                </View>
                              ) : isBusNumberSearch ? (
                                <View style={S.routeOnlyRight}>
                                  <Text
                                    style={[
                                      S.routeMainText,
                                      selectedMockDirection === rt.direction &&
                                        S.routeMainTextSelected,
                                    ]}
                                  >
                                    {rt.direction}
                                  </Text>
                                </View>
                              ) : (
                                <>
                                  <View style={S.routeLeft}>
                                    <View style={S.routeBadge}>
                                      <Text style={S.routeBadgeText}>{rt.busRouteNo}</Text>
                                    </View>
                                  </View>

                                  <View style={S.routeRight}>
                                    <Text style={S.routeMainText}>
                                      {rt.startBusStationName} → {rt.endBusStationName}
                                    </Text>
                                  </View>
                                </>
                              )}
                            </Pressable>

                            {isBusNumberSearch && selectedMockDirection === rt.direction ? (
                              <View style={S.mockStopsCard}>
                                <ScrollView
                                  style={S.mockStopsScroll}
                                  contentContainerStyle={S.mockStopsScrollContent}
                                  showsVerticalScrollIndicator={false}
                                >
                                  {(
                                    selectedMockDirection
                                      ? MOCK_ROUTE_STOPS[selectedMockDirection] ?? []
                                      : []
                                  ).map((stop: string, stopIdx: number, arr: string[]) => {
                                      const isSelected = selectedMockStop === stop
                                      const showConnector = stopIdx < arr.length - 1
                                      return (
                                        <Pressable
                                          key={stop}
                                          style={S.mockStopRow}
                                          onPress={() => setSelectedMockStop(stop)}
                                        >
                                          <View style={S.mockStopIconSlot}>
                                            <OneIcon
                                              width={8}
                                              height={8}
                                              color={
                                                isSelected
                                                  ? colors.brand.primary
                                                  : colors.icon.default
                                              }
                                            />
                                            {showConnector ? (
                                              <View style={S.mockStopConnector} />
                                            ) : null}
                                          </View>
                                          <Text
                                            style={[
                                              S.mockStopText,
                                              isSelected && S.mockStopTextSelected,
                                            ]}
                                          >
                                            {stop}
                                          </Text>
                                        </Pressable>
                                      )
                                    })}
                                </ScrollView>
                              </View>
                            ) : null}

                            {/* 노선 사이 구분선 */}
                            {idx < routes.length - 1 && <View style={S.routeLineDivider} />}
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
                  ) : search.length >= 2 ? (
                    <Text style={S.emptyText}>검색 결과가 없습니다.</Text>
                  ) : null}
                </View>
              }
            />
          )}
        </View>
      </Pressable>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 350,
    height: 569,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingTop: 24,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 0,
    shadowColor: '#BBC5CC',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 0,
  },
  cityChip: {
    width: 39,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.icon.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityChipActive: {
    backgroundColor: colors.icon.selected,
  },
  cityChipText: {
    ...ts('label3'),
    fontSize: 14,
    color: colors.text.text1,
  },
  cityChipTextActive: {
    color: colors.text.text1w,
  },
  searchRow: {
    marginTop: 28,
    marginBottom: 18,
    alignItems: 'center',
  },
  searchBox: {
    width: 302,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider1,
  },
  input: {
    flex: 1,
    ...ts('label1'),
    fontSize: 18,
    color: '#333',
    paddingVertical: 0,
    paddingLeft: 10,
    paddingRight: 12,
  },
  placeholder: {
    position: 'absolute',
    ...ts('label1'),
    fontSize: 18,
    color: colors.text.text4,
    left: 10,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  item: {
    width: 302,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  itemText: {
    ...ts('body1'),
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.text1,
  },
  itemActive: {
    backgroundColor: colors.background.bg2,
  },
  itemTextActive: {
    ...ts('label3'),
    fontSize: 15,
    lineHeight: 22,
  },
  subwayTag: {
    ...ts('label4'),
    color: colors.text.text3,
  },
  listContent: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  stationBlock: {
    width: 302,
    marginBottom: 8,
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
  cityListScroll: {
    marginTop: 8,
    flex: 1,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 16,
    paddingBottom: 24,
  },
  cityOption: {
    width: 90,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityOptionSelected: {
    backgroundColor: colors.icon.selected,
    borderColor: colors.icon.selected,
  },
  cityOptionText: {
    ...ts('label3'),
    fontSize: 15,
    color: colors.text.text2,
  },
  cityOptionTextSelected: {
    color: colors.text.text1w,
  },

  /** 노선 영역 전체 박스 */
  routeBox: {
    width: 302,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    padding: 20,
    marginTop: 12,
    backgroundColor: colors.background.bg1,
  },

  // 노선 카드
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  routeLeft: {
    width: 78,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 32,
  },

  routeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.brand.primary,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadgeText: {
    ...ts('label2'),
    color: colors.brand.primary,
  },

  routeRight: {
    flex: 1,
    alignItems: 'flex-start',
  },
  routeOnlyRight: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  routeMainText: {
    ...ts('label4'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text2,
    textAlign: 'left',
  },
  routeMainTextSelected: {
    color: colors.brand.primary,
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
    paddingVertical: 0,
  },
  routeHeaderNo: {
    width: 78,
    marginRight: 32,
    ...ts('label4'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text4,
    textAlign: 'left',
  },
  routeHeaderDir: {
    flex: 1,
    ...ts('label4'),
    fontSize: 14,
    lineHeight: 18,
    color: colors.text.text4,
    textAlign: 'left',
  },
  routeHeaderDivider: {
    height: 1,
    backgroundColor: colors.divider.divider2,
    marginTop: 12,
    marginBottom: 12,
  },

  routeItemRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },

  routeDivider: {
    height: 12,
  },
  routeLineDivider: {
    height: 1,
    backgroundColor: colors.divider.divider2,
    marginVertical: 16,
  },
  subwayDirectionList: {
    width: '100%',
  },
  subwayDirectionRow: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subwayDirectionBox: {
    minHeight: 50,
    justifyContent: 'center',
  },
  subwayDirectionBoxLast: {
    marginBottom: 0,
  },
  mockStopsCard: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    backgroundColor: colors.background.bg2,
    marginTop: 16,
    paddingVertical: 14,
    paddingLeft: 20,
    paddingRight: 18,
    paddingBottom: 0,
  },
  mockStopsScroll: {
    flex: 1,
  },
  mockStopsScrollContent: {
    paddingBottom: 0,
  },
  mockStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  mockStopIconSlot: {
    width: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 18,
    zIndex: 1,
  },
  mockStopConnector: {
    position: 'absolute',
    top: 18,
    left: 3.5,
    width: 1,
    height: 36,
    backgroundColor: colors.divider.divider1,
    zIndex: -1,
  },
  mockStopText: {
    ...ts('label4'),
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.text3,
  },
  mockStopTextSelected: {
    color: colors.brand.primary,
  },
})
