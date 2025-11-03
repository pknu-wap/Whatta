import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { Picker } from '@react-native-picker/picker'
import type { DateData } from 'react-native-calendars'
import colors from '@/styles/colors'
import DropDown from '@/assets/icons/drop_down.svg'
import LeftArrow from '@/assets/icons/left.svg'
import RightArrow from '@/assets/icons/right.svg'
import { bus, EVENT } from '@/lib/eventBus'

const { width } = Dimensions.get('window')
const CALENDAR_WIDTH = width * 0.9 - 20
const CALENDAR_HEIGHT = 288

LocaleConfig.locales.ko = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
}
LocaleConfig.defaultLocale = 'ko'

type Props = {
  visible: boolean
  onClose: () => void
  currentDate: string
  onSelectDate: (date: string) => void
}

const getMonthName = (month: number) => {
  return LocaleConfig.locales.ko?.monthNames[month - 1] ?? `${month}월`
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function CalendarModal({
  visible,
  onClose,
  currentDate,
  onSelectDate,
}: Props) {
  const [ymVisible, setYmVisible] = useState(false)
  // 월의 기준 날짜 (YYYY-MM-DD 형식)
  const [currentMonth, setCurrentMonth] = useState(currentDate)
  const toYM = (iso: string) => iso.slice(0, 7) // 'YYYY-MM'
  const toMonthStart = (ym: string) => `${ym}-01` // 'YYYY-MM-01'

  const [pickYear, setPickYear] = useState(Number(currentDate.slice(0, 4)))
  const [pickMonth, setPickMonth] = useState(Number(currentDate.slice(5, 7)))

  // 모달 열릴 때 현재 상태 동기화
  useEffect(() => {
    if (!visible) return
    bus.emit('calendar:request-sync', null)
  }, [visible])

  // 상태 방송 수신 시 모달 내부 표시만 맞춤
  useEffect(() => {
    const onState = (st: { date: string; mode: 'month' | 'week' | 'day' }) => {
      if (!visible) return
      const ym = toYM(st.date)
      setPickYear(Number(ym.slice(0, 4)))
      setPickMonth(Number(ym.slice(5, 7)))
      setCurrentMonth(toMonthStart(ym))
    }
    bus.on('calendar:state', onState)
    return () => bus.off('calendar:state', onState)
  }, [visible])

  // 월 이동/선택 확정 시 호출
  const pushSetMonth = (nextMonthStart: string) => {
    const ym = toYM(nextMonthStart)
    const nextYear = Number(ym.slice(0, 4))
    const nextMonth = Number(ym.slice(5, 7))

    // 외부(월/주/일 뷰)로 상태 변경 요청
    bus.emit('calendar:set-date', nextMonthStart)

    // 내부 표시도 동기화(동일 값이면 스킵)
    setCurrentMonth((prev) => (prev === nextMonthStart ? prev : nextMonthStart))
    setPickYear((prev) => (prev === nextYear ? prev : nextYear))
    setPickMonth((prev) => (prev === nextMonth ? prev : nextMonth))
  }

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])

  // 이전/다음 달 이동
  const gotoPrevMonth = useCallback(() => {
    const d = new Date(currentMonth) // 'YYYY-MM-01'
    const nd = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const ym = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`
    setCurrentMonth(toMonthStart(ym))
    setPickYear(nd.getFullYear())
    setPickMonth(nd.getMonth() + 1)
  }, [currentMonth])

  const gotoNextMonth = useCallback(() => {
    const d = new Date(currentMonth)
    const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const ym = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`
    setCurrentMonth(toMonthStart(ym))
    setPickYear(nd.getFullYear())
    setPickMonth(nd.getMonth() + 1)
  }, [currentMonth])

  // 월/연도 선택 후 적용
  const confirmYM = useCallback(() => {
    // 선택한 연, 월로 모달 내부 달력만 갱신
    const next = `${pickYear}-${pad(pickMonth)}-01`
    setCurrentMonth(next)
    setYmVisible(false)
  }, [pickYear, pickMonth])

  const cancelYM = useCallback(() => {
    setYmVisible(false) // 그냥 닫기만
  }, [])

  // 오늘로 이동
  const goToday = useCallback(() => {
    const now = new Date()
    const next = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    pushSetMonth(next)
  }, [])

  useEffect(() => {
    const syncFromOutside = (ym: string) => {
      const next = `${ym}-01`
      setCurrentMonth(next)
      setPickYear(Number(ym.slice(0, 4)))
      setPickMonth(Number(ym.slice(5, 7)))
    }
    bus.on(EVENT.MONTH_CHANGED, syncFromOutside)
    if (visible) bus.emit(EVENT.REQUEST_SYNC)
    return () => bus.off(EVENT.MONTH_CHANGED, syncFromOutside)
  }, [visible])

  const handleDayPress = useCallback(
    (day: DateData) => {
      onSelectDate(day.dateString)
      onClose()
    },
    [onSelectDate, onClose],
  )

  const markedDates = useMemo(
    () => ({
      [currentDate]: {
        selected: true,
        selectedColor: colors.calendar.background,
        selectedTextColor: colors.primary.main,
      },
    }),
    [currentDate, currentMonth],
  )

  const openYM = () => setYmVisible(true)
  const closeYM = () => setYmVisible(false)

  // 이전/다음 달 계산 및 갱신
  const navigateMonth = useCallback(
    (direction: 'prev' | 'next') => {
      // currentMonth의 'YYYY-MM-DD'를 기준으로 Date 객체 생성
      const current = new Date(currentMonth)
      const monthChange = direction === 'next' ? 1 : -1

      const targetDate = new Date(
        current.getFullYear(),
        current.getMonth() + monthChange,
        1,
      )

      const newYear = targetDate.getFullYear()
      const newMonth = targetDate.getMonth() + 1
      const newMonthStart = `${newYear}-${pad(newMonth)}-01`

      // 캘린더 월 갱신
      setCurrentMonth(newMonthStart)

      // 피커 상태 동기화
      setPickYear(newYear)
      setPickMonth(newMonth)
    },
    [currentMonth],
  )

  const getTodayString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1 // Date 월은 0부터 시작
    const day = today.getDate()
    return `${year}-${pad(month)}-${pad(day)}`
  }

  const goToToday = useCallback(() => {
    const todayString = getTodayString()
    const todayYear = Number(todayString.slice(0, 4))
    const todayMonth = Number(todayString.slice(5, 7))

    setCurrentMonth(todayString)

    setPickYear(todayYear)
    setPickMonth(todayMonth)
  }, [])

  const handlePrevMonth = () => navigateMonth('prev')
  const handleNextMonth = () => navigateMonth('next')

  // 헤더 렌더링
  const renderExternalHeader = () => {
    const y = Number(currentMonth.slice(0, 4))
    const m = Number(currentMonth.slice(5, 7))
    const name = getMonthName(m)

    const titleColor = ymVisible ? colors.primary.main : '#000'
    return (
      <View style={HeaderStyles.headerContainer}>
        <TouchableOpacity
          onPress={gotoPrevMonth}
          style={HeaderStyles.arrowButton}
          hitSlop={10}
        >
          <LeftArrow width={24} height={24} color={titleColor} />
        </TouchableOpacity>

        <TouchableOpacity onPress={openYM} hitSlop={8}>
          <View style={HeaderStyles.titleGroup}>
            <Text
              style={[HeaderStyles.headerTitle, { color: titleColor }]}
            >{`${y}년 ${name}`}</Text>
            <DropDown width={24} height={24} color={titleColor} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={gotoNextMonth}
          style={HeaderStyles.arrowButton}
          hitSlop={10}
        >
          <RightArrow width={24} height={24} color={titleColor} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={!ymVisible ? onClose : undefined}>
        <View style={S.centeredView}>
          <View
            style={S.modalView}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {renderExternalHeader()}

            <View
              style={{
                width: CALENDAR_WIDTH,
                alignSelf: 'center',
                overflow: 'hidden',
                height: CALENDAR_HEIGHT,
              }}
            >
              <Calendar
                key={`cal-${currentMonth}`}
                current={currentMonth}
                hideArrows={true}
                hideDayNames={false}
                style={{ width: CALENDAR_WIDTH }}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={
                  {
                    'stylesheet.calendar.header': {
                      header: { height: 0, opacity: 0 },
                      monthText: { fontSize: 0 },

                      dayHeader: {
                        color: '#B3B3B3',
                      },
                    },
                    textDayHeaderFontSize: 10,
                    textDayHeaderFontWeight: '400',
                    textDayHeaderFontFamily: 'SF Pro',

                    textDayFontSize: 12,
                    textDayFontWeight: '500',
                    textDayFontFamily: 'SF Pro',
                    textDayLetterSpacing: -0.48,

                    selectedDayFontWeight: '600',

                    selectedDayBackgroundColor: colors.calendar.background,
                    todayTextColor: colors.primary.main,

                    textDayStyle: {
                      color: '#000',
                    },

                    'stylesheet.day.basic': {
                      selected: {
                        borderRadius: 100,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 29,
                        height: 29,
                      },
                      dayText: {
                        color: '#000',
                      },
                    },
                  } as any
                }
              />
              <TouchableOpacity style={TodayButtonStyles.todayButton} onPress={goToToday}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>오늘로 이동</Text>
              </TouchableOpacity>
            </View>
            {ymVisible && (
              <TouchableWithoutFeedback
                // 피커가 열렸을 때 피커 영역을 터치해도 모달이 닫히지 않도록 이벤트 중단
                onPress={() => {}}
              >
                <View style={YMStayle.ymContainer}>
                  <View style={YMStayle.ymContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                      <Picker
                        selectedValue={pickYear}
                        onValueChange={setPickYear}
                        style={YMStayle.pickerWrapper}
                        itemStyle={{ fontSize: 20, color: '#000' }}
                      >
                        {years.map((y) => (
                          <Picker.Item key={y} label={`${y}년`} value={y} />
                        ))}
                      </Picker>
                      <Picker
                        selectedValue={pickMonth}
                        onValueChange={setPickMonth}
                        style={YMStayle.pickerWrapper}
                        itemStyle={{ fontSize: 20, color: '#000' }}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <Picker.Item key={m} label={`${m}월`} value={m} />
                        ))}
                      </Picker>
                    </View>
                    <View style={YMStayle.buttonGroup}>
                      <TouchableOpacity
                        onPress={closeYM}
                        style={[
                          YMStayle.btn,
                          { backgroundColor: '#EEE', marginRight: 10 },
                        ]}
                      >
                        <Text style={{ color: '#000', fontWeight: '700' }}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={confirmYM}
                        style={[YMStayle.btn, { backgroundColor: colors.primary.main }]}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '700' }}>완료</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const S = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 90,
  },
  modalView: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    width: '90%',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    position: 'relative',
  },
})

const HeaderStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    marginRight: 8,
    paddingLeft: 10,
  },
  arrowButton: { padding: 10 },
})

const YMStayle = StyleSheet.create({
  ymContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,

    backgroundColor: '#FFF',
    borderRadius: 10,
    zIndex: 100,
    paddingTop: 25,
  },
  ymContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    height: CALENDAR_HEIGHT,
  },
  pickerWrapper: {
    width: CALENDAR_WIDTH - 200,
    height: CALENDAR_HEIGHT - 70,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 28,
  },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
})

const TodayButtonStyles = StyleSheet.create({
  todayButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
})
