import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native'
import { CalendarList, LocaleConfig, DateData } from 'react-native-calendars'
import { Picker } from '@react-native-picker/picker'
import colors from '@/styles/colors'
import DropDown from '@/assets/icons/drop_down.svg'
import Check from '@/assets/icons/check.svg'
import X from '@/assets/icons/x.svg'
import { ts } from '@/styles/typography'

const CALENDAR_WIDTH = 358
const CALENDAR_HEIGHT = 286
const CALENDAR_HEIGHT_SIX_WEEKS = 312
const MODAL_MAX_HEIGHT = 390
const ACTIONS_BOTTOM_OFFSET = 19
const MODAL_ACTIONS_HEIGHT = 56
const DAY_CELL_SIZE = 36

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
  initialOpenMode?: 'calendar' | 'picker'
  pickerConfirmVariant?: 'icon' | 'move'
  showPickerCancel?: boolean
  pickerActionsLift?: number
  autoConfirmOnDayPress?: boolean
  showCalendarActions?: boolean
  pickerContentHeight?: number
  modalTopOffset?: number
}

const getMonthName = (month: number) => {
  return LocaleConfig.locales.ko?.monthNames[month - 1] ?? `${month}월`
}

const pad = (n: number) => String(n).padStart(2, '0')
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const getWeeksInMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return Math.ceil((firstDay + daysInMonth) / 7)
}
export default function CalendarModal({
  visible,
  onClose,
  currentDate,
  onSelectDate,
  onPressToday,
  initialOpenMode = 'calendar',
  pickerConfirmVariant = 'icon',
  showPickerCancel = true,
  pickerActionsLift = 0,
  autoConfirmOnDayPress = false,
  showCalendarActions = true,
  pickerContentHeight = CALENDAR_HEIGHT,
  modalTopOffset = 110,
}: Props) {
  const safeCurrentDate =
    typeof currentDate === 'string' && currentDate.length >= 10 ? currentDate : todayISO()
  const [ymVisible, setYmVisible] = useState(initialOpenMode === 'picker')
  const [selectedDate, setSelectedDate] = useState(safeCurrentDate)

  // 캘린더가 현재 보여주고 있는 달 (YYYY-MM-01)
  const [currentMonth, setCurrentMonth] = useState(safeCurrentDate)

  // 상단 피커 상태
  const [pickYear, setPickYear] = useState(Number(safeCurrentDate.slice(0, 4)))
  const [pickMonth, setPickMonth] = useState(Number(safeCurrentDate.slice(5, 7)))

  // 캘린더 강제 리마운트 키
  const [calendarKey, setCalendarKey] = useState(0)

  // 모달이 열릴 때, props로 받은 currentDate(현재 보고 있는 날짜)로 캘린더와 피커를 동기화
  useEffect(() => {
    if (!visible) return
    const y = Number(safeCurrentDate.slice(0, 4))
    const m = Number(safeCurrentDate.slice(5, 7))
    const ym = safeCurrentDate.slice(0, 7)

    setPickYear(y)
    setPickMonth(m)
    setCurrentMonth(`${ym}-01`)
    setSelectedDate(safeCurrentDate)

    // 캘린더를 해당 월로 즉시 점프시키기 위해 리마운트
    setCalendarKey((prev) => prev + 1)
    setYmVisible(initialOpenMode === 'picker')
  }, [visible, initialOpenMode, safeCurrentDate])

  // 년도 범위 생성 (현재 -50 ~ +50년)
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 101 }, (_, i) => now - 50 + i)
  }, [])

  // 스와이프 시 헤더 동기화
  const handleVisibleMonthsChange = useCallback((months: DateData[]) => {
    if (months.length > 0) {
      const item = months[0]
      setPickYear((prev) => (prev === item.year ? prev : item.year))
      setPickMonth((prev) => (prev === item.month ? prev : item.month))
    }
  }, [])

  // 피커 완료 버튼
  const confirmYM = useCallback(() => {
    const next = `${pickYear}-${pad(pickMonth)}-01`
    if (pickerConfirmVariant === 'move') {
      onSelectDate(next)
      onClose()
      return
    }
    setCurrentMonth(next)
    setCalendarKey((prev) => prev + 1) // 점프
    setYmVisible(false)
  }, [pickYear, pickMonth, pickerConfirmVariant, onSelectDate, onClose])

  const closeYM = useCallback(() => {
    setYmVisible(false)
  }, [])

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString)
    if (!autoConfirmOnDayPress) return
    onSelectDate(day.dateString)
    onClose()
  }, [autoConfirmOnDayPress, onSelectDate, onClose])

  // 마킹 로직: 오늘 + 현재 선택된 날짜
  const markedDates = useMemo(() => {
    const todayStr = todayISO()
    const marks: Record<string, any> = {}

    // 1. 오늘 날짜
    marks[todayStr] = {
      today: true,
      textColor: colors.brand.primary,
    }

    // 2. 현재 선택된 날짜
    // currentDate prop이 있으면 그 날짜를 선택된 상태로 표시
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: '#B04FFF1A',
        selectedTextColor:
          selectedDate === todayStr ? colors.brand.primary : colors.text.text1,
      }
    }

    return marks
  }, [selectedDate])

  // 오늘로 이동
  const goToToday = useCallback(() => {
    const todayStr = todayISO()
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

  const moveToSelected = useCallback(() => {
    if (selectedDate) onSelectDate(selectedDate)
    onClose()
  }, [selectedDate, onSelectDate, onClose])

  const openYM = () => setYmVisible(true)
  const isSixWeekMonth = useMemo(
    () => getWeeksInMonth(pickYear, pickMonth) >= 6,
    [pickYear, pickMonth],
  )
  const displayedCalendarHeight = isSixWeekMonth
    ? CALENDAR_HEIGHT_SIX_WEEKS
    : CALENDAR_HEIGHT
  const isCompactHeaderModal = !showCalendarActions
  const appliedCalendarHeight = showCalendarActions
    ? Math.min(MODAL_MAX_HEIGHT, displayedCalendarHeight + MODAL_ACTIONS_HEIGHT + 32)
    : Math.min(MODAL_MAX_HEIGHT, displayedCalendarHeight + 78)
  const isMonthPickerMode = ymVisible && pickerConfirmVariant === 'move'

  const renderExternalHeader = () => {
    const name = getMonthName(pickMonth)
    const iconColor = ymVisible ? colors.icon.selected : colors.icon.default

    return (
      <View
        style={[
          HeaderStyles.headerContainer,
          isCompactHeaderModal ? HeaderStyles.headerContainerCompact : null,
        ]}
      >
        <TouchableOpacity onPress={openYM} hitSlop={8}>
          <View style={HeaderStyles.titleGroup}>
            <Text style={HeaderStyles.headerTitle}>
              {`${pickYear}년 ${name}`}
            </Text>
            <DropDown width={24} height={24} color={iconColor} />
          </View>
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[S.centeredView, { marginTop: modalTopOffset }]}>
          <View
            style={[
              S.modalView,
              !ymVisible && { height: appliedCalendarHeight },
            ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={[S.contentColumn, !ymVisible && S.contentColumnCalendar]}>
              {!isMonthPickerMode && renderExternalHeader()}

              {ymVisible ? (
                <View
                  style={[
                    YMStayle.ymContainer,
                    isMonthPickerMode && YMStayle.ymContainerCompact,
                    isCompactHeaderModal ? YMStayle.ymContainerCompactHeader : null,
                  ]}
                >
                  <View
                    style={[
                      YMStayle.ymContent,
                      { height: pickerContentHeight },
                      isCompactHeaderModal ? YMStayle.ymContentCompactHeader : null,
                    ]}
                  >
                    <View style={YMStayle.ymPickersRow}>
                      <View style={YMStayle.ymPickerCard}>
                        <Picker
                          selectedValue={pickYear}
                          onValueChange={setPickYear}
                          style={[
                            YMStayle.pickerWrapper,
                            { height: Math.max(168, pickerContentHeight - 96) },
                          ]}
                          itemStyle={YMStayle.pickerItem}
                        >
                          {years.map((y) => (
                            <Picker.Item key={y} label={`${y}년`} value={y} />
                          ))}
                        </Picker>
                      </View>
                      <View style={YMStayle.ymPickerCard}>
                        <Picker
                          selectedValue={pickMonth}
                          onValueChange={setPickMonth}
                          style={[
                            YMStayle.pickerWrapper,
                            { height: Math.max(168, pickerContentHeight - 96) },
                          ]}
                          itemStyle={YMStayle.pickerItem}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <Picker.Item key={m} label={`${m}월`} value={m} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    {pickerConfirmVariant === 'move' ? (
                      <View
                        style={[
                          YMStayle.moveActionsRow,
                          pickerActionsLift > 0 && { marginTop: -pickerActionsLift },
                        ]}
                      >
                        <TouchableOpacity style={YMStayle.moveBtn} onPress={confirmYM}>
                          <Text style={YMStayle.moveActionText}>이동</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View
                        style={[
                          YMStayle.buttonGroup,
                          !showPickerCancel && YMStayle.buttonGroupSingle,
                        ]}
                      >
                        {showPickerCancel && (
                          <TouchableOpacity onPress={closeYM} style={YMStayle.iconBtn}>
                            <X width={14} height={14} color={colors.icon.default} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={confirmYM}
                          style={[
                            YMStayle.iconBtn,
                            pickerActionsLift > 0 && { marginTop: -pickerActionsLift },
                          ]}
                        >
                          <Check width={14} height={14} color={colors.brand.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                  <View style={[S.calendarWrap, { height: displayedCalendarHeight }]}>
                    <CalendarList
                    key={`calendar-list-${calendarKey}`}
                    horizontal={true}
                    pagingEnabled={true}
                    bounces={false}
                    alwaysBounceHorizontal={false}
                    current={currentMonth}
                    calendarWidth={CALENDAR_WIDTH}
                    calendarHeight={displayedCalendarHeight}
                    style={{
                      width: CALENDAR_WIDTH,
                      height: displayedCalendarHeight,
                    }}
                    pastScrollRange={24}
                    futureScrollRange={24}
                    hideArrows={true}
                    hideDayNames={false}
                    showSixWeeks={true}
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
                          dayHeader: {
                            width: DAY_CELL_SIZE,
                            color: colors.text.text1,
                            marginBottom: 1,
                            textAlign: 'center',
                          },
                          dayTextAtIndex0: { color: colors.text.monday },
                        },
                        textDayHeaderFontSize: ts('date3').fontSize,
                        textDayHeaderFontWeight: ts('date3').fontWeight,
                        textDayHeaderFontFamily: 'SF Pro',
                        textDayFontSize: ts('date1').fontSize,
                        textDayFontWeight: ts('date1').fontWeight,
                        textDayFontFamily: 'SF Pro',
                        textDayLetterSpacing: ts('date1').letterSpacing,
                        todayTextColor: colors.brand.primary,
                        selectedDayFontWeight: '700',
                        selectedDayBackgroundColor: '#B04FFF1A',
                        selectedDayTextColor: colors.text.text1,
                        textDayStyle: { color: colors.text.text1 },
                        'stylesheet.day.basic': {
                          base: {
                            width: DAY_CELL_SIZE,
                            height: DAY_CELL_SIZE,
                            justifyContent: 'center',
                            alignItems: 'center',
                          },
                          selectedText: {
                            fontWeight: '500',
                            color: colors.text.text1,
                            zIndex: 2,
                          },
                          todayText: {
                            fontWeight: '700',
                            color: colors.brand.primary,
                            zIndex: 2,
                          },
                          selected: {
                            borderRadius: 12,
                            width: DAY_CELL_SIZE,
                            height: DAY_CELL_SIZE,
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 1,
                          },
                          dayText: { color: colors.text.text1, zIndex: 2 },
                        },
                      } as any
                    }
                  />
                </View>
              )}
            </View>

            {!ymVisible && showCalendarActions && (
              <View style={TodayButtonStyles.bottomActions}>
                <TouchableOpacity
                  style={[TodayButtonStyles.todayButton, TodayButtonStyles.calendarTodayButton]}
                  onPress={goToToday}
                >
                  <Text style={TodayButtonStyles.todayText}>오늘로 이동</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={TodayButtonStyles.moveButton}
                  onPress={moveToSelected}
                >
                  <Text style={TodayButtonStyles.moveText}>이동</Text>
                </TouchableOpacity>
              </View>
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
  },
  modalView: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 0,
    width: CALENDAR_WIDTH,
    maxHeight: MODAL_MAX_HEIGHT,
    shadowColor: '#A4ADB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7.5,
    elevation: 8,
    position: 'relative',
    alignItems: 'center',
  },
  contentColumn: {
    width: CALENDAR_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentColumnCalendar: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  calendarWrap: {
    width: CALENDAR_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
    height: CALENDAR_HEIGHT,
  },
})

const HeaderStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: CALENDAR_WIDTH,
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginTop: 10,
  },
  headerContainerCompact: {
    paddingVertical: 4,
    marginTop: 4,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    ...ts('label1'),
    color: colors.text.text1,
    marginRight: 6,
  },
})

const YMStayle = StyleSheet.create({
  ymContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingTop: 0,
    paddingBottom: 0,
  },
  ymContainerCompact: {
    paddingTop: 0,
  },
  ymContainerCompactHeader: {
    paddingTop: 2,
  },
  ymContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: MODAL_MAX_HEIGHT - 44,
    paddingTop: 8,
  },
  ymContentCompactHeader: {
    justifyContent: 'flex-start',
  },
  ymPickersRow: {
    width: CALENDAR_WIDTH,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  ymPickerCard: {
    width: 150,
    borderRadius: 14,
    backgroundColor: colors.background.bg1,
    overflow: 'hidden',
  },
  pickerWrapper: {
    width: 150,
    height: MODAL_MAX_HEIGHT - 120,
  },
  pickerItem: {
    fontSize: 22,
    color: colors.text.text1,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: CALENDAR_WIDTH - 24,
    alignSelf: 'center',
    paddingTop: 6,
    paddingHorizontal: 0,
  },
  buttonGroupSingle: {
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveActionsRow: {
    width: CALENDAR_WIDTH,
    height: 56,
    position: 'relative',
    marginTop: 2,
  },
  pickerTodayButton: {
    position: 'absolute',
    left: 15,
    top: 4,
  },
  moveBtn: {
    position: 'absolute',
    right: 36,
    top: 10,
    height: 52,
    justifyContent: 'center',
  },
  moveActionText: {
    ...ts('titleS'),
    color: colors.brand.primary,
  },
})

const TodayButtonStyles = StyleSheet.create({
  bottomActions: {
    width: CALENDAR_WIDTH,
    position: 'absolute',
    bottom: ACTIONS_BOTTOM_OFFSET,
    alignSelf: 'center',
    height: 56,
  },
  todayButton: {
    paddingHorizontal: 12,
    height: 45,
    borderRadius: 12,
    backgroundColor: colors.background.bg1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarTodayButton: {
    position: 'absolute',
    left: 15,
    top: 4,
  },
  todayText: {
    ...ts('titleS'),
    lineHeight: 20,
    color: colors.text.text2,
  },
  moveButton: {
    position: 'absolute',
    right: 15,
    height: 52,
    justifyContent: 'center',
  },
  moveText: {
    ...ts('titleS'),
    color: colors.brand.primary,
  },
})
