import React, { memo, useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native'
import InlineCalendar from '@/components/lnlineCalendar'
import InlineTime from '@/components/InlineTime'
import axios from 'axios'
import { token } from '@/lib/token'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bus } from '@/lib/eventBus'
import { getMyLabels, Label } from '@/api/label_api'

/** Toggle Props 타입 */
type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
}

type Panel = 'calendar' | 'start' | 'end' | null

const areSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()
const MemoCalendar = memo(
  InlineCalendar,
  (p, n) => p.open === n.open && areSameDate(p.value, n.value),
)

const MemoTime = memo(
  InlineTime,
  (p, n) => p.open === n.open && areSameDate(p.value, n.value),
)

export default function ScheduleDetailScreen() {
  const navigation = useNavigation()
  const [visible] = useState(true)
  const [openCalendar, setOpenCalendar] = useState(false)
  const [whichDate, setWhichDate] = useState<'start' | 'end'>('start')
  const [openStartTime, setOpenStartTime] = useState(false)
  const [openEndTime, setOpenEndTime] = useState(false)
  const titleRef = useRef<TextInput>(null)

  const insets = useSafeAreaInsets()
  const MARGIN = 10

  const scrollRef = useRef<ScrollView>(null)
  const { width: W, height: H } = Dimensions.get('window')
  const SHEET_W = Math.min(W - MARGIN, 380)
  const MAX_H = H - (insets.top + insets.bottom) - MARGIN * 2
  const SHEET_H = Math.min(560, MAX_H)
  const HEADER_H = 40
  const KEYBOARD_OFFSET = insets.top + MARGIN + HEADER_H

  // 로컬 날짜를 YYYY-MM-DD 문자열로
  const ymdLocal = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 로컬 시간을 HH:mm:ss 로
  const hms = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  // null/undefined 필드 제거
  const stripNil = <T extends Record<string, any>>(obj: T): T =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
    ) as T

  const closeAll = () => {
    setOpenCalendar(false)
    setOpenStartTime(false)
    setOpenEndTime(false)
  }

  const switchPanel = (p: Panel) => {
    if (p === null) return closeAll()
    closeAll()
    setTimeout(() => {
      if (p === 'calendar') setOpenCalendar(true)
      else if (p === 'start') setOpenStartTime(true)
      else setOpenEndTime(true)
    }, 140) // Inline*의 duration(=120~220ms)에 맞춰 120~160ms 정도
  }

  const [posCal, setPosCal] = useState(0)
  const [posTime, setPosTime] = useState(0)

  const close = () => navigation.goBack()

  /** 색상 */
  const COLORS = [
    '#FF0000',
    '#FF7A00',
    '#FFD500',
    '#00C700',
    '#0085FF',
    '#001AFF',
    '#7A00FF',
    '#C400FF',
    '#FFFFFF',
  ]
  const [selectedColor, setSelectedColor] = useState('#7A00FF')
  const [showPalette, setShowPalette] = useState(false)

  /** 라벨 */
  /*const LABELS = ['약속', '동아리', '수업', '과제']
  const [selectedLabel, setSelectedLabel] = useState('약속')
  const [labelOpen, setLabelOpen] = useState(false)*/
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null)
  const [labelOpen, setLabelOpen] = useState(false)

  // 라벨 목록 불러오기
  React.useEffect(() => {
    (async () => {
      try {
        const list = await getMyLabels()
        setLabels(list)
        // 첫 번째 라벨을 기본 선택
        if (list.length && selectedLabelId == null) {
          setSelectedLabelId(list[0].id)
        }
      } catch (e) {
        console.log('⚠️ 라벨 불러오기 실패:', e)
      }
    })()
  }, [])

  /** 일정 입력값 */
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [memo, setMemo] = useState('')

  /** 날짜 & 시간 */
  const [start, setStart] = useState(new Date())
  const [end, setEnd] = useState(new Date())

  /** 토글 상태 */
  const [timeOn, setTimeOn] = useState(false)
  const [repeatOn, setRepeatOn] = useState(false)
  const [remindOn, setRemindOn] = useState(false)
  const [trafficOn, setTrafficOn] = useState(false)

  /** Toggle 컴포넌트 */
  const Toggle = ({ value, onChange }: ToggleProps) => (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? '#9D7BFF' : '#ccc' }]}
    >
      <View style={[styles.thumb, { transform: [{ translateX: value ? 22 : 0 }] }]} />
    </Pressable>
  )

  /** 저장 */
  const handleSave = async () => {
    try {
      // 1) 서버 규격에 맞춰 로컬 값으로 페이로드 구성
      const hex = (selectedColor ?? '#6B46FF').replace(/^#/, '').toUpperCase()
      const base = {
        title: scheduleTitle,
        content: memo ?? '',
        labels: selectedLabelId != null ? [selectedLabelId] : undefined, //라벨
        startDate: ymdLocal(start), // 로컬 날짜
        endDate: ymdLocal(end), // 로컬 날짜
        startTime: timeOn ? hms(start) : undefined, // 시간 사용 시에만 포함
        endTime: timeOn ? hms(end) : undefined,
        colorKey: hex,
      }

      // 2) null/undefined 제거
      const payload = stripNil(base)

      // 3) 전송
      const access = token.getAccess()
      const res = await axios.post(
        'https://whatta-server-741565423469.asia-northeast3.run.app/api/event',
        payload,
        { headers: { Authorization: `Bearer ${access}` } },
      )

      const saved = res?.data
      //console.log('일정 저장 성공:', { saved, payload })

      // 저장 성공 직후
      if (saved) {
        const enriched = {
          ...(saved ?? {}),
          colorKey: hex,
          startDate: saved?.startDate ?? payload.startDate,
          endDate: saved?.endDate ?? payload.endDate,
        }

        // 월간 화면 즉시 반영(색 포함된 객체 전달)
        bus.emit('calendar:mutated', { op: 'create', item: enriched })

        // 같은 달 캐시 무효화(백그라운드 재조회)
        const anchor = enriched.startDate ?? enriched.date ?? payload.startDate
        const ym = `${anchor?.slice(0, 7)}`
        if (ym) bus.emit('calendar:invalidate', { ym })
      }

      navigation.goBack()
    } catch (err) {
      //console.log('일정 저장 실패:', err)
      alert('저장 실패')
    }
  }

  const formatDate = (d: Date) =>
    d
      .toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      })
      .replace(/\d{4}\.\s*/, '')

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

  // 모달이 뜰 때 헤더(일간뷰)의 현재 날짜로 start/end를 초기화
  useEffect(() => {
    const applyAnchor = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number)
      const anchor = new Date(y, m - 1, d)
      setStart(anchor)
      setEnd(anchor)
    }

    const onState = (st: { date: string; mode: 'day' | 'week' | 'month' }) => {
      // 일간뷰일 때만 사용 (요구사항에 맞춤)
      if (st?.mode === 'day' && typeof st?.date === 'string') {
        applyAnchor(st.date)
      }
    }

    // 현재 헤더 상태 요청 → 응답으로 start/end 세팅
    bus.on('calendar:state', onState)
    bus.emit('calendar:request-sync', null)

    return () => bus.off('calendar:state', onState)
  }, [])

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          keyboardVerticalOffset={KEYBOARD_OFFSET}
        >
          <View
            style={[
              styles.overlay,
              { paddingTop: insets.top + MARGIN, paddingBottom: insets.bottom + MARGIN },
            ]}
          >
            <View style={[styles.box, { width: SHEET_W, height: SHEET_H }]}>
              {/* HEADER */}
              <View style={styles.header}>
                <Pressable onPress={close}>
                  <Text style={styles.cancel}>취소</Text>
                </Pressable>
                <Text style={styles.hTitle}>일정 생성</Text>
                <Pressable onPress={handleSave}>
                  <Text style={styles.saveBtn}>저장</Text>
                </Pressable>
              </View>
              {/* 제목 + 색 */}
              <View style={styles.body}>
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  automaticallyAdjustKeyboardInsets={true} // iOS 15+
                >
                  <View style={styles.row}>
                    <Pressable onPress={() => setShowPalette(!showPalette)}>
                      <Text style={[styles.colorDot, { color: selectedColor }]}>●</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => titleRef.current?.focus()}
                      style={{ flex: 1, justifyContent: 'center', minHeight: 36 }}
                      hitSlop={10} // 살짝 여유
                    >
                      <TextInput
                        ref={titleRef}
                        placeholder="제목"
                        placeholderTextColor="#B7B7B7"
                        style={[styles.titleInput, { paddingVertical: 8 }]}
                        value={scheduleTitle}
                        onChangeText={setScheduleTitle}
                      />
                    </Pressable>
                  </View>
                  {/* 색상 선택 */}
                  {showPalette && (
                    <View style={styles.paletteRow}>
                      {COLORS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => {
                            setSelectedColor(c)
                            setShowPalette(false)
                          }}
                          style={[
                            styles.colorOption,
                            { backgroundColor: c },
                            selectedColor === c && styles.selected,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  <View style={styles.sep1} />
                  {/* 날짜 */}
                  <View style={styles.dateWrap}>
                    <View style={styles.dateSide}>
                      <Pressable
                        onPress={() => {
                          if (openCalendar && whichDate === 'start') switchPanel(null)
                          else {
                            setWhichDate('start')
                            switchPanel('calendar')
                          }
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.dateText}>{formatDate(start)}</Text>
                      </Pressable>
                      {timeOn && (
                        <Pressable
                          onPress={() => {
                            if (openStartTime) switchPanel(null)
                            else switchPanel('start')
                          }}
                          hitSlop={8}
                        >
                          <Text style={styles.timeText}>{formatTime(start)}</Text>
                        </Pressable>
                      )}
                    </View>

                    <Text style={styles.arrow}>→</Text>

                    <View style={styles.dateSide}>
                      <Pressable
                        onPress={() => {
                          if (openCalendar && whichDate === 'end') switchPanel(null)
                          else {
                            setWhichDate('end')
                            switchPanel('calendar')
                          }
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.dateText}>{formatDate(end)}</Text>
                      </Pressable>
                      {timeOn && (
                        <Pressable
                          onPress={() => {
                            if (openStartTime) switchPanel(null)
                            else switchPanel('end')
                          }}
                          hitSlop={8}
                        >
                          <Text style={styles.timeText}>{formatTime(end)}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <View onLayout={(e) => setPosCal(e.nativeEvent.layout.y)}>
                    <MemoCalendar
                      open={openCalendar}
                      value={whichDate === 'start' ? start : end}
                      onSelect={(d) => {
                        if (whichDate === 'start') {
                          setStart(d)
                          if (d > end) setEnd(d)
                        } else {
                          setEnd(d)
                          if (d < start) setStart(d)
                        }
                        switchPanel(null)
                      }}
                    />
                  </View>
                  {timeOn && (
                    <View onLayout={(e) => setPosTime(e.nativeEvent.layout.y)}>
                      <MemoTime
                        open={timeOn && openStartTime}
                        value={start}
                        onChange={(d) => {
                          if (d > end) setEnd(d) // 필요 시 범위 보정만
                          setStart(d)
                        }}
                      />
                      <MemoTime
                        open={timeOn && openEndTime}
                        value={end}
                        onChange={(d) => {
                          if (d < start) setStart(d)
                          setEnd(d)
                        }}
                      />
                    </View>
                  )}
                  <View style={styles.sep} />
                  {/* 시간입력 */}
                  <View style={styles.row}>
                    <Text style={styles.label}>시간 입력</Text>
                    <Toggle value={timeOn} onChange={setTimeOn} />
                  </View>
                  <View style={styles.sep} />
                  {/* 라벨 */}
                  <Pressable
                  onPress={() => setLabelOpen(!labelOpen)}
                  style={{ marginBottom: 7, marginTop: 8 }}
                  >
                    <Text style={styles.label}>
                      라벨:{' '}
                      {selectedLabelId
                      ? labels.find((l) => l.id === selectedLabelId)?.title ?? '선택 없음'
                      : '선택 없음'}
                      </Text>
                      </Pressable>
                      {labelOpen && (
                        <View style={styles.labelList}>
                          {labels.map((l) => (
                            <Pressable
                            key={l.id}
                            onPress={() => {
                              setSelectedLabelId(l.id)
                              setLabelOpen(false)
                            }}
                            >
                              <Text
                              style={[
                                styles.labelOption,
                                selectedLabelId === l.id && styles.selectedLabel,
                              ]}
                              >
                                {l.title}
                                </Text>
                                </Pressable>
                              ))}
                              </View>
                            )}
                  <View style={styles.sep} />
                  {/* 반복/알림 */}
                  <View style={styles.row}>
                    <Text style={styles.label}>반복</Text>
                    <Toggle value={repeatOn} onChange={setRepeatOn} />
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>리마인드 알림</Text>
                    <Toggle value={remindOn} onChange={setRemindOn} />
                  </View>
                  {remindOn && <Text style={styles.remindText}>10분 전</Text>}
                  <View style={styles.row}>
                    <Text style={styles.label}>교통 알림</Text>
                    <Toggle value={trafficOn} onChange={setTrafficOn} />
                  </View>
                  <View style={styles.sep} />
                  {/* 메모 */}
                  <TextInput
                    placeholder="메모 입력"
                    value={memo}
                    onChangeText={setMemo}
                    multiline
                    onFocus={() => {
                      // 포커스 직후 레이아웃이 잡힌 다음 스크롤
                      requestAnimationFrame(() =>
                        scrollRef.current?.scrollToEnd({ animated: true }),
                      )
                    }}
                    style={styles.memo}
                  />
                </ScrollView>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: '#fff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
  },
  cancel: { color: '#555', fontSize: 16 },
  hTitle: { fontSize: 18, fontWeight: 'bold' },
  saveBtn: { color: '#7A4CFF', fontSize: 16, fontWeight: 'bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  colorDot: { fontSize: 22 },
  titleInput: {
    flex: 1,
    borderBottomColor: '#eee',
    marginLeft: 6,
    fontSize: 21,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorOption: {
    width: 22,
    height: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selected: { borderColor: '#000', borderWidth: 2 },
  sep: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  sep1: { height: 1, backgroundColor: '#eee', marginBottom: 19 },
  dateWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dateSide: { alignItems: 'center', marginHorizontal: 28 },
  dateText: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  timeText: { fontSize: 19 },
  arrow: { fontSize: 20, color: '#555' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  remindText: { marginLeft: 10, marginBottom: 5, fontSize: 13, color: '#888' },
  memo: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    height: 90,
    padding: 10,
    fontSize: 14,
  },
  toggle: { width: 50, height: 26, borderRadius: 20, padding: 2 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  labelList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  labelOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  selectedLabel: { backgroundColor: '#9D7BFF', color: '#fff' },
})
