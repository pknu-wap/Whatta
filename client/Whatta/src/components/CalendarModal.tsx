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
import { CalendarList, LocaleConfig, DateData } from 'react-native-calendars'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import DropDown from '@/assets/icons/drop_down.svg'
import LeftArrow from '@/assets/icons/left.svg'
import RightArrow from '@/assets/icons/right.svg'
import { bus, EVENT } from '@/lib/eventBus'

const { width } = Dimensions.get('window')
const CALENDAR_WIDTH = width * 0.9 - 20
const CALENDAR_HEIGHT = 290

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
  onPressToday?: () => void
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
  onPressToday,
}: Props) {
  const [ymVisible, setYmVisible] = useState(false)

  // 캘린더가 현재 보여주고 있는 달 (YYYY-MM-01)
  const [currentMonth, setCurrentMonth] = useState(currentDate)

  // 상단 피커 상태
  const [pickYear, setPickYear] = useState(Number(currentDate.slice(0, 4)))
  const [pickMonth, setPickMonth] = useState(Number(currentDate.slice(5, 7)))

  // 캘린더 강제 리마운트 키
  const [calendarKey, setCalendarKey] = useState(0)

  // 모달이 열릴 때, props로 받은 currentDate(현재 보고 있는 날짜)로 캘린더와 피커를 동기화
  useEffect(() => {
    if (visible) {
      const y = Number(currentDate.slice(0, 4))
      const m = Number(currentDate.slice(5, 7))
      const ym = currentDate.slice(0, 7)

      setPickYear(y)
      setPickMonth(m)
      setCurrentMonth(`${ym}-01`)

      // 캘린더를 해당 월로 즉시 점프시키기 위해 리마운트
      setCalendarKey((prev) => prev + 1)
    }
  }, [visible, currentDate])

  // 년도 범위 생성 (현재 -50 ~ +50년)
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])

  // 화살표 버튼 이동
  const gotoPrevMonth = useCallback(() => {
    const d = new Date(currentMonth)
    const nd = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const ym = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`
    setCurrentMonth(`${ym}-01`)
    setPickYear(nd.getFullYear())
    setPickMonth(nd.getMonth() + 1)
  }, [currentMonth])

  const gotoNextMonth = useCallback(() => {
    const d = new Date(currentMonth)
    const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const ym = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`
    setCurrentMonth(`${ym}-01`)
    setPickYear(nd.getFullYear())
    setPickMonth(nd.getMonth() + 1)
  }, [currentMonth])

  // 스와이프 시 헤더 동기화
  const handleVisibleMonthsChange = useCallback((months: DateData[]) => {
    if (months.length > 0) {
      const item = months[0]
      setPickYear(item.year)
      setPickMonth(item.month)
    }
  }, [])

  // 피커 완료 버튼
  const confirmYM = useCallback(() => {
    const next = `${pickYear}-${pad(pickMonth)}-01`
    setCurrentMonth(next)
    setCalendarKey((prev) => prev + 1) // 점프
    setYmVisible(false)
  }, [pickYear, pickMonth])

  const closeYM = useCallback(() => {
    setYmVisible(false)
  }, [])

  const handleDayPress = useCallback(
    (day: DateData) => {
      onSelectDate(day.dateString)
      onClose()
    },
    [onSelectDate, onClose],
  )

  const getTodayString = () => {
    const today = new Date()
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  }

  // 마킹 로직: 오늘 + 현재 선택된 날짜
  const markedDates = useMemo(() => {
    const todayStr = getTodayString()
    const marks: any = {}

    // 1. 오늘 날짜
    marks[todayStr] = {
      today: true,
    }

    // 2. 현재 선택된 날짜
    // currentDate prop이 있으면 그 날짜를 선택된 상태로 표시
    if (currentDate) {
      marks[currentDate] = {
        ...(marks[currentDate] || {}),
        selected: true,
        selectedColor: colors.calendar.background,
        selectedTextColor: colors.primary.main,
      }
    }

    return marks
  }, [currentDate])

  // 오늘로 이동
  const goToToday = useCallback(() => {
    const todayStr = getTodayString()
    const todayYear = Number(todayStr.slice(0, 4))
    const todayMonth = Number(todayStr.slice(5, 7))

    setCurrentMonth(todayStr.slice(0, 7) + '-01')
    setPickYear(todayYear)
    setPickMonth(todayMonth)
    setCalendarKey((prev) => prev + 1) // 점프

    if (onPressToday) {
      onPressToday()
    } else {
      onSelectDate(todayStr)
    }
    onClose()
  }, [onPressToday, onSelectDate, onClose])

  const openYM = () => setYmVisible(true)

  const renderExternalHeader = () => {
    const name = getMonthName(pickMonth)
    const titleColor = ymVisible ? colors.primary.main : '#000'

    return (
      <View style={HeaderStyles.headerContainer}>
        {/* <TouchableOpacity
          onPress={gotoPrevMonth}
          style={HeaderStyles.arrowButton}
          hitSlop={10}
        >
          <LeftArrow width={24} height={24} color={titleColor} />
        </TouchableOpacity> */}

        <TouchableOpacity onPress={openYM} hitSlop={8}>
          <View style={HeaderStyles.titleGroup}>
            <Text style={[HeaderStyles.headerTitle, { color: titleColor }]}>
              {`${pickYear}년 ${name}`}
            </Text>
            <DropDown width={24} height={24} color={titleColor} />
          </View>
        </TouchableOpacity>

        {/* <TouchableOpacity
          onPress={gotoNextMonth}
          style={HeaderStyles.arrowButton}
          hitSlop={10}
        >
          <RightArrow width={24} height={24} color={titleColor} />
        </TouchableOpacity> */}
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
              <CalendarList
                key={`calendar-list-${calendarKey}`}
                horizontal={true}
                pagingEnabled={true}
                current={currentMonth}
                calendarWidth={CALENDAR_WIDTH}
                calendarHeight={CALENDAR_HEIGHT}
                style={{ width: CALENDAR_WIDTH, height: CALENDAR_HEIGHT }}
                pastScrollRange={24}
                futureScrollRange={24}
                hideArrows={true}
                hideDayNames={false}
                renderHeader={() => null}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                onVisibleMonthsChange={handleVisibleMonthsChange}
                showScrollIndicator={false}
                viewabilityConfig={{
                  itemVisiblePercentThreshold: 50,
                }}
                theme={
                  {
                    'stylesheet.calendar.header': {
                      header: { height: 0, opacity: 0 },
                      monthText: { fontSize: 0 },
                      dayHeader: { color: '#B3B3B3', marginBottom: 10 },
                    },
                    textDayHeaderFontSize: 10,
                    textDayHeaderFontWeight: '400',
                    textDayHeaderFontFamily: 'SF Pro',
                    textDayFontSize: 12,
                    textDayFontWeight: '500',
                    textDayFontFamily: 'SF Pro',
                    textDayLetterSpacing: -0.48,
                    todayTextColor: colors.primary.main,
                    selectedDayFontWeight: '600',
                    selectedDayBackgroundColor: colors.calendar.background,
                    textDayStyle: { color: '#000' },
                    'stylesheet.day.basic': {
                      selected: {
                        borderRadius: 100,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 29,
                        height: 29,
                      },
                      dayText: { color: '#000' },
                    },
                  } as any
                }
              />

              <TouchableOpacity style={TodayButtonStyles.todayButton} onPress={goToToday}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>오늘로 이동</Text>
              </TouchableOpacity>
            </View>

            {ymVisible && (
              <TouchableWithoutFeedback onPress={() => {}}>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginRight: 8,
    paddingLeft: 10,
  },
  arrowButton: { padding: 10 },
})

const YMStayle = StyleSheet.create({
  ymContainer: {
    position: 'absolute',
    top: 40,
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
    paddingTop: 16,
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
