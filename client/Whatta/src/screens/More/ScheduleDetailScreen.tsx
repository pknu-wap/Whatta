import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Platform,
  ScrollView,
} from 'react-native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

// =================================================================
// 1. 타입 정의 및 상수 설정
// =================================================================

type DateType = Date
type DateTimeFormatOptions = Intl.DateTimeFormatOptions

const PRIMARY_PURPLE = '#5831c1ff'
const LIGHT_PURPLE = '#B69ACD'
const COLORS = [
  '#50108dff',
  '#5831c1ff',
  '#9d80cbff',
  '#8696caff',
  '#3b6cc9ff',
  '#2432f1ff',
  '#0c1db7ff',
]
const INITIAL_COLOR = LIGHT_PURPLE

type RepeatFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'NONE'
const REPEAT_FREQUENCY_OPTIONS: {
  label: string
  value: RepeatFrequency
  text: string
}[] = [
  { label: '반복 안 함', value: 'NONE', text: '반복 안 함' },
  { label: '1일마다', value: 'DAILY', text: '1일마다' },
  { label: '1주마다', value: 'WEEKLY', text: '1주마다' },
  { label: '1개월마다', value: 'MONTHLY', text: '1개월마다' },
  { label: '1년마다', value: 'YEARLY', text: '1년마다' },
]

const REPEAT_END_OPTIONS = [
  { label: '계속 반복', type: 0 },
  { label: '종료 날짜', type: 2 },
]

// =================================================================
// 2. ScheduleDetailScreen 메인 컴포넌트 정의
// =================================================================

const ScheduleDetailScreen = () => {
  // ---------------------------------------------------------------
  // 2.1. 상태(State) 정의
  // ---------------------------------------------------------------

  const [modalVisible, setModalVisible] = useState(false)
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [selectedColor, setSelectedColor] = useState(INITIAL_COLOR)
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false)
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [isRepeatOn, setIsRepeatOn] = useState(false)
  const [isRemindOn, setIsRemindOn] = useState(true)
  const [isTrafficOn, setIsTrafficOn] = useState(false)
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false)
  const [isStartTimePickerVisible, setStartTimePickerVisible] = useState(false)
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false)
  const [isEndTimePickerVisible, setEndTimePickerVisible] = useState(false)
  const [isRepeatEndDatePickerVisible, setRepeatEndDatePickerVisible] =
    useState(false)
  const [repeatEndDate, setRepeatEndDate] = useState(new Date())

  const [isRepeatSettingsVisible, setIsRepeatSettingsVisible] = useState(false)
  const [selectedFrequency, setSelectedFrequency] =
    useState<RepeatFrequency>('NONE')
  const [repeatEndType, setRepeatEndType] = useState(0)

  // ---------------------------------------------------------------
  // 2.2. 함수(Function) 정의
  // ---------------------------------------------------------------

  const formatDateOnly = (date: DateType): string =>
    date
      .toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      })
      .replace(/(\d{4}\.)\s*/, '')

  const formatTimeOnly = (date: DateType): string =>
    !date || isNaN(date.getTime())
      ? '시간 선택'
      : date.toLocaleString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })

  const getRepeatSummary = () => {
    const frequencyOption = REPEAT_FREQUENCY_OPTIONS.find(
      (opt) => opt.value === selectedFrequency,
    )

    if (selectedFrequency === 'NONE') {
      return '반복 안 함'
    }

    const frequencyText = frequencyOption?.text || '반복 설정'

    let endText = ''
    if (repeatEndType === 0) {
      endText = '계속 반복'
    } else if (repeatEndType === 2) {
      endText = formatDateOnly(repeatEndDate) + '까지'
    }

    return `${frequencyText}, ${endText}`
  }

  const handleDateChange = (
    setter: React.Dispatch<React.SetStateAction<DateType>>,
    visibilitySetter: React.Dispatch<React.SetStateAction<boolean>>,
    event: DateTimePickerEvent,
    selectedDate?: DateType,
  ) => {
    visibilitySetter(false)
    if (selectedDate) {
      if (Platform.OS === 'ios' && event.type === 'set') setter(selectedDate)
      else if (Platform.OS === 'android') setter(selectedDate)
    }
  }

  // ---------------------------------------------------------------
  // 2.3. RepeatSettingsModal 컴포넌트 정의
  // ---------------------------------------------------------------

  const RepeatSettingsModal = () => {
    const isRepeatActive = selectedFrequency !== 'NONE'

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRepeatSettingsVisible}
        onRequestClose={() => setIsRepeatSettingsVisible(false)}
      >
        <View style={styles.fullScreenCenteredView}>
          <View style={styles.repeatModalView}>
            {/* 헤더: 취소, 제목, 완료 버튼 */}
            <View style={styles.repeatHeader}>
              <Pressable onPress={() => setIsRepeatSettingsVisible(false)}>
                <Text style={styles.cancelButton}>취소</Text>
              </Pressable>
              <Text style={styles.modalHeaderTitle}>반복</Text>
              <Pressable
                onPress={() => {
                  setIsRepeatSettingsVisible(false)
                  setIsRepeatOn(isRepeatActive)
                }}
              >
                <Text style={styles.saveButton}>완료</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.repeatContentContainer}>
              {/* 반복 주기 섹션 */}
              <Text style={styles.repeatSectionTitle}>반복 주기</Text>
              {REPEAT_FREQUENCY_OPTIONS.map((option, index) => (
                <Pressable
                  key={index}
                  style={styles.repeatOptionRow}
                  onPress={() => {
                    setSelectedFrequency(option.value)
                    if (
                      option.value === 'NONE' ||
                      selectedFrequency === 'NONE'
                    ) {
                      setRepeatEndType(0)
                    }
                  }}
                >
                  <Text style={styles.repeatOptionText}>{option.label}</Text>
                  <View
                    style={[
                      styles.radioButton,
                      selectedFrequency === option.value &&
                        styles.radioButtonSelected,
                    ]}
                  />
                </Pressable>
              ))}

              {/* 기간 섹션 (레이아웃 고정) */}
              <View
                style={{ opacity: isRepeatActive ? 1 : 0 }}
                pointerEvents={isRepeatActive ? 'auto' : 'none'}
              >
                <View style={styles.separator} />

                {/* 기간 설정 섹션 */}
                <Text style={styles.repeatSectionTitle}>기간</Text>
                {REPEAT_END_OPTIONS.map((option, index) => (
                  <Pressable
                    key={index}
                    style={styles.repeatOptionRow}
                    onPress={() => {
                      setRepeatEndType(option.type)

                      // '종료 날짜' 옵션을 선택했을 때 날짜 피커 상태만 true로 설정
                      if (option.type === 2) {
                        // DatePicker는 최상위 레벨에서 렌더링되므로, 이 모달을 닫지 않아도 앞에 뜰 수 있음.
                        setRepeatEndDatePickerVisible(true)
                      }
                    }}
                  >
                    <Text style={styles.repeatOptionText}>{option.label}</Text>
                    <View
                      style={[
                        styles.radioButton,
                        repeatEndType === option.type &&
                          styles.radioButtonSelected,
                      ]}
                    />
                  </Pressable>
                ))}

                {/* 종료 날짜 표시 및 재선택 버튼 */}
                {repeatEndType === 2 && (
                  <Pressable
                    onPress={() => setRepeatEndDatePickerVisible(true)}
                    style={styles.repeatDateOption}
                  >
                    <Text style={styles.repeatDateText}>
                      {formatDateOnly(repeatEndDate)}
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  // ---------------------------------------------------------------
  // 2.4. 메인 렌더링 영역
  // ---------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* 테스트를 위한 모달 열기 버튼 */}
      <Text>여기에 캘린더나 버튼이 들어갑니다.</Text>
      <Pressable
        style={styles.openModalButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.openModalButtonText}>일정 상세 모달 열기</Text>
      </Pressable>

      {/* 일정 상세 정보 입력 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {/*메인 모달 내용*/}
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.headerContainer}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>취소</Text>
              </Pressable>
              <Text style={styles.modalHeaderTitle}>일정 상세</Text>
              <Pressable
                onPress={() => {
                  alert('저장: ' + scheduleTitle + ', 색상: ' + selectedColor)
                  setModalVisible(false)
                }}
              >
                <Text style={styles.saveButton}>저장</Text>
              </Pressable>
            </View>

            <View style={styles.contentContainer}>
              {/* 제목 */}
              <View style={styles.itemRow}>
                <Pressable
                  onPress={() => setIsColorPickerVisible((prev) => !prev)}
                >
                  <Text style={[styles.colorDot, { color: selectedColor }]}>
                    ●
                  </Text>
                </Pressable>
                <TextInput
                  style={styles.titleInput}
                  onChangeText={setScheduleTitle}
                  value={scheduleTitle}
                  placeholder="제목"
                />
              </View>

              {/* 색상 선택 */}
              {isColorPickerVisible && (
                <View style={[styles.itemRow, styles.colorSelectionRow]}>
                  <Text style={styles.itemLabel}>색상</Text>
                  <View style={styles.colorPalette}>
                    {COLORS.map((color) => (
                      <Pressable
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          selectedColor === color && styles.selectedColor,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.separator} />

              {/* 날짜/시간 */}
              <View style={styles.datePickerGroup}>
                <Pressable onPress={() => setStartDatePickerVisible(true)}>
                  <Text style={styles.dateText}>
                    {formatDateOnly(startDate)}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setStartTimePickerVisible(true)}>
                  <Text style={styles.timeText}>
                    {formatTimeOnly(startDate)}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.arrowText}>→</Text>
              <View style={styles.datePickerGroup}>
                <Pressable onPress={() => setEndDatePickerVisible(true)}>
                  <Text style={styles.dateText}>{formatDateOnly(endDate)}</Text>
                </Pressable>
                <Pressable onPress={() => setEndTimePickerVisible(true)}>
                  <Text style={styles.timeText}>{formatTimeOnly(endDate)}</Text>
                </Pressable>
              </View>
              <View style={styles.separator} />

              {/* 반복 설정 요약 */}
              <Pressable
                style={styles.itemRow}
                onPress={() => setIsRepeatSettingsVisible(true)}
              >
                <Text style={styles.itemLabel}>반복</Text>
                <View style={styles.subItemRow}>
                  <Text
                    style={[
                      styles.subItemValue,
                      { color: PRIMARY_PURPLE, marginRight: 5 },
                    ]}
                  >
                    {getRepeatSummary()}
                  </Text>
                  <Text style={styles.subItemArrow}>&gt;</Text>
                </View>
              </Pressable>

              <View style={styles.separator} />

              {/* 리마인드 */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>리마인드 알림</Text>
                <Switch
                  onValueChange={setIsRemindOn}
                  value={isRemindOn}
                  trackColor={{ false: '#767577', true: LIGHT_PURPLE }}
                  thumbColor={isRemindOn ? PRIMARY_PURPLE : '#f4f3f4'}
                />
              </View>
              {isRemindOn && (
                <View style={[styles.itemRow, styles.subItemRow]}>
                  <Text style={styles.subItemLabel}>
                    10분 전<Text style={styles.subItemValue}> </Text>
                  </Text>
                </View>
              )}
              <View style={styles.separator} />

              {/* 교통 */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>교통 알림</Text>
                <Switch
                  onValueChange={setIsTrafficOn}
                  value={isTrafficOn}
                  trackColor={{ false: '#767577', true: LIGHT_PURPLE }}
                  thumbColor={isTrafficOn ? PRIMARY_PURPLE : '#f4f3f4'}
                />
              </View>
              <View style={styles.separator} />

              {/* 메모 */}
              <View style={styles.memoContainer}>
                <TextInput
                  style={styles.memoInput}
                  onChangeText={setMemo}
                  value={memo}
                  placeholder="메모를 입력하세요"
                  multiline={true}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 반복 설정 상세 모달 렌더링 */}
      <RepeatSettingsModal />

      {/* -------------------------------------------------------------
        DateTimePicker 컴포넌트들 (모든 모달 위에 뜰 수 있도록 최상위에 위치)
        -> isRepeatEndDatePickerVisible 상태가 true일 때,
           반복 설정 모달 위에 날짜 탭이 표시됨
      -------------------------------------------------------------- */}

      {/* 시작 날짜 피커 */}
      {isStartDatePickerVisible && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) =>
            handleDateChange(
              setStartDate,
              setStartDatePickerVisible,
              event,
              selectedDate,
            )
          }
          textColor="#000000"
        />
      )}
      {/* 시작 시간 피커 */}
      {isStartTimePickerVisible && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) =>
            handleDateChange(
              setStartDate,
              setStartTimePickerVisible,
              event,
              selectedDate,
            )
          }
          textColor="#000000"
        />
      )}
      {/* 종료 날짜 피커 */}
      {isEndDatePickerVisible && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) =>
            handleDateChange(
              setEndDate,
              setEndDatePickerVisible,
              event,
              selectedDate,
            )
          }
          textColor="#000000"
        />
      )}
      {/* 종료 시간 피커 */}
      {isEndTimePickerVisible && (
        <DateTimePicker
          value={endDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) =>
            handleDateChange(
              setEndDate,
              setEndTimePickerVisible,
              event,
              selectedDate,
            )
          }
          textColor="#000000"
        />
      )}
      {/*반복 종료 날짜 피커 (최상위 레벨에 위치) */}
      {isRepeatEndDatePickerVisible && (
        <DateTimePicker
          value={repeatEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) =>
            handleDateChange(
              setRepeatEndDate,
              setRepeatEndDatePickerVisible,
              event,
              selectedDate,
            )
          }
          textColor="#000000"
        />
      )}
    </View>
  )
}

// 스타일시트 정의
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  openModalButton: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 20,
  },
  openModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cancelButton: { color: '#555555', fontSize: 16, fontWeight: '500' },
  saveButton: { color: PRIMARY_PURPLE, fontSize: 16, fontWeight: 'bold' },
  modalHeaderTitle: { fontWeight: 'bold', fontSize: 18 },
  contentContainer: { marginTop: 10 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: { marginRight: 10, fontSize: 18, lineHeight: 18 },
  colorSelectionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  titleInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flex: 1,
    marginLeft: 5,
    paddingVertical: 5,
    fontSize: 18,
  },
  datePickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginVertical: 5,
    paddingHorizontal: 15,
  },
  dateText: { marginRight: 20, fontSize: 16, color: '#333', fontWeight: '500' },
  timeText: { fontSize: 16, color: '#333', fontWeight: '500' },
  arrowText: {
    marginVertical: 5,
    textAlign: 'center',
    fontSize: 16,
    color: '#aaa',
  },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  itemLabel: { fontSize: 16, color: '#555' },
  subItemLabel: { fontSize: 14, color: '#888' },
  subItemValue: {},
  subItemArrow: { marginLeft: 10, color: '#aaa' },
  memoContainer: { marginTop: 10, paddingHorizontal: 5 },
  memoInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    height: 80,
    textAlignVertical: 'top',
    padding: 10,
    fontSize: 14,
  },
  fullScreenCenteredView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  repeatModalView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    padding: Platform.OS === 'ios' ? 0 : 20,
  },
  repeatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  repeatContentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  repeatSectionTitle: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 15,
    marginBottom: 5,
  },
  repeatOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  repeatOptionText: {
    fontSize: 16,
    color: '#333',
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#aaa',
  },
  radioButtonSelected: {
    borderColor: PRIMARY_PURPLE,
    backgroundColor: PRIMARY_PURPLE,
    padding: 3,
    borderWidth: 6,
  },
  repeatDateOption: {
    paddingVertical: 10,
    marginLeft: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  repeatDateText: {
    fontSize: 16,
    color: '#333',
  },
})

export default ScheduleDetailScreen
