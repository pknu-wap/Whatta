import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '@/components/Header' // Header.tsx 경로에 맞게 수정
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'
import Slider from '@react-native-community/slider'

// --------------------------------------------------------------------
// 상수 및 필터 데이터
// --------------------------------------------------------------------
const INITIAL_DATE = new Date()

// 🎨 색상 상수
const SAFE_GRAY_COLOR = '#E0E0E0'
// 💡 투명도 슬라이더 선 색상: UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1) -> #333333
const SLIDER_TRACK_COLOR = '#333333'
const DARK_GRAY_COLOR = '#555555'
const UNIFIED_LABEL_COLOR = '#B04FFF'

// 🎨 새로운 일정 색상 값 적용
// 진한 보라색: #B04FFF
const SCHEDULE_COLOR = '#B04FFF'
// 연한 보라색: #E8CCFF
const SCHEDULE_LIGHT_COLOR = '#E8CCFF'

const TASK_BOX_COLOR = '#DDDDDD'
const CHECKBOX_SIZE = 8

colors.primary = { main: UNIFIED_LABEL_COLOR }

const SWITCH_WIDTH = 48
const SWITCH_HEIGHT = 28
const SWITCH_RADIUS = 14
const SWITCH_PADDING = 3
const THUMB_SIZE = SWITCH_HEIGHT - SWITCH_PADDING * 2
const CUSTOM_THUMB_DIAMETER = 20
const CUSTOM_THUMB_COLOR = SAFE_GRAY_COLOR

// ⭐️ 수정: 항목 높이를 58px에서 25px 감소한 33px로 설정
const ITEM_HEIGHT = 33 // 33px 거리 간격을 위한 높이

const MAX_FILTER_HEIGHT = 44 + (ITEM_HEIGHT + 9) + ITEM_HEIGHT * 4 + 30
const HEADER_HEIGHT_WITH_STATUSBAR =
  44 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)

// 📏 투명도 슬라이더 선 너비 (실제 보이는 선의 길이: 38px)
const SLIDER_WIDTH = 38
// 📏 라벨 텍스트와 On/Off 버튼 사이의 마진
const ITEM_BUTTON_MARGIN = 18
// 💡 슬라이더 트랙의 높이 상수 정의
const SLIDER_TRACK_HEIGHT = 2

// ⭐️ 슬라이더가 움직여야 하는 총 트랙 영역 길이 (선 길이 38px + 썸 직경 20px = 58px)
const SLIDER_TOTAL_WIDTH = SLIDER_WIDTH + CUSTOM_THUMB_DIAMETER

// 일정/태스크 박스 높이 12px
const SCHEDULE_BOX_HEIGHT = 12
const TASK_BOX_HEIGHT = 12
// 📏 일정/태스크 간 세로 마진: 2px
const ITEM_MARGIN_VERTICAL = 2
// 📏 날짜 제목과 일정 사이 거리: 5px
const EVENT_AREA_PADDING_TOP = 5

// ⭐️ 단일 일정 양쪽 보라색 선 너비
const SINGLE_SCHEDULE_BORDER_WIDTH = 5
const TEXT_HORIZONTAL_PADDING = 4

// ⭐️ 라벨 색상 사각형 크기 상수
const LABEL_COLOR_WIDTH = 5
const LABEL_COLOR_HEIGHT = 12
// ⭐️ 라벨 색상 사각형과 텍스트 사이 간격
const LABEL_COLOR_MARGIN_RIGHT = 7

const filterLabels = [
  { id: '1', name: '업무', color: SCHEDULE_COLOR },
  { id: '2', name: '개인', color: SCHEDULE_COLOR },
  { id: '3', name: '기타', color: SCHEDULE_COLOR },
  { id: '4', name: 'Label 4', color: SCHEDULE_COLOR },
  { id: '5', name: 'Label 5', color: SCHEDULE_COLOR },
  { id: '6', name: 'Label 6', color: SCHEDULE_COLOR },
  { id: '7', name: 'Label 7', color: SCHEDULE_COLOR },
  { id: '8', name: 'Label 8', color: SCHEDULE_COLOR },
  { id: '9', name: 'Label 9', color: SCHEDULE_COLOR },
  { id: '10', name: 'Label 10', color: SCHEDULE_COLOR },
]

const initialLabelStates = filterLabels.reduce(
  (acc, label) => {
    acc[label.id] = true
    return acc
  },
  {} as Record<string, boolean>,
)

// --------------------------------------------------------------------
// 공휴일 데이터 및 계산 로직
// --------------------------------------------------------------------

const HOLIDAYS: Record<string, string> = {
  '0-1': '신정',
  '2-1': '삼일절',
  '4-5': '어린이날',
  '5-6': '현충일',
  '7-15': '광복절',
  '9-3': '개천절',
  '9-9': '한글날',
  '11-25': '크리스마스',
}

const LUNAR_HOLIDAYS_MAP: Record<string, string> = {
  '2024-1-9': '설날',
  '2024-1-10': '설날',
  '2024-1-11': '설날',
  '2024-1-12': '대체공휴일',
  '2024-4-15': '부처님 오신 날',
  '2024-8-16': '추석',
  '2024-8-17': '추석',
  '2024-8-18': '추석',
  '2025-0-28': '설날',
  '2025-0-29': '설날',
  '2025-0-30': '설날',
  '2025-4-24': '부처님 오신 날',
  '2025-9-5': '추석',
  '2025-9-6': '추석',
  '2025-9-7': '추석',
  '2025-9-8': '대체공휴일',
  '2024-4-6': '어린이날 대체공휴일',
}

function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  let holidayName: string | null = null

  const solarKey = `${month}-${day}`
  if (HOLIDAYS[solarKey]) {
    holidayName = HOLIDAYS[solarKey]
  }

  const mapKey = `${year}-${month}-${day}`
  if (LUNAR_HOLIDAYS_MAP[mapKey]) {
    holidayName = LUNAR_HOLIDAYS_MAP[mapKey]
  }

  if (holidayName) {
    if (holidayName.includes('대체공휴일')) {
      return '대체휴일'
    }
    return holidayName
  }

  return null
}
// --------------------------------------------------------------------

// --------------------------------------------------------------------
// ⭐️ 더미 일정 데이터 및 로직
// --------------------------------------------------------------------
interface ScheduleData {
  id: string
  name: string
  date: string // YYYY-MM-DD
  isRecurring: boolean // 주기적 일정 여부
  isTask: boolean // 태스크 여부
  labelId: string // 필터용
  isCompleted: boolean // ⭐️ 완료 상태 추가
}

// ⭐️ DisplayItem 타입에 id 속성을 추가하여 렌더링 key 오류 해결
interface TaskSummaryItem {
  isTaskSummary: true
  id: string
  count: number
  tasks: ScheduleData[] // ⭐️ 추가: 요약된 실제 태스크 목록
}
type DisplayItem = ScheduleData | TaskSummaryItem

const INITIAL_DUMMY_SCHEDULES: ScheduleData[] = [
  {
    id: 'h8',
    name: 'H_테스크 4',
    date: '2025-10-28',
    isRecurring: false,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  }, // 10/28
  // 10/30 (4 tasks, 2 schedules)
  {
    id: 's7',
    name: '운동',
    date: '2025-10-30',
    isRecurring: false,
    isTask: false,
    labelId: '2',
    isCompleted: false,
  },
  {
    id: 's8',
    name: '병원 예약',
    date: '2025-10-30',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 't1',
    name: '전화 통화',
    date: '2025-10-30',
    isRecurring: true,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  },
  {
    id: 't2',
    name: '이메일 확인',
    date: '2025-10-30',
    isRecurring: false,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  },
  {
    id: 't3',
    name: '보고서 작성',
    date: '2025-10-30',
    isRecurring: true,
    isTask: true,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 't4',
    name: '청소',
    date: '2025-10-30',
    isRecurring: false,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  },

  // 11/07 (2 schedules)
  {
    id: 's9',
    name: '발표 준비',
    date: '2025-11-07',
    isRecurring: true,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's10',
    name: '여행 예약',
    date: '2025-11-07',
    isRecurring: true,
    isTask: false,
    labelId: '2',
    isCompleted: false,
  },

  // 기타 일정 (기존 데이터 유지)
  {
    id: 's1',
    name: '외할머니댁',
    date: '2025-10-06',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's2',
    name: '친할머니댁',
    date: '2025-10-07',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's3',
    name: 'WAP회의',
    date: '2025-10-07',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's4',
    name: '정보통신과 뉴미디어',
    date: '2025-10-10',
    isRecurring: true,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's5',
    name: '프로그래밍기초2',
    date: '2025-10-10',
    isRecurring: true,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 't1_old',
    name: '감성공학과제제출',
    date: '2025-10-16',
    isRecurring: false,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  },
  {
    id: 's6',
    name: '연희곡 연극관람',
    date: '2025-10-16',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's11',
    name: '연극시험',
    date: '2025-10-21',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's12',
    name: '영어시험',
    date: '2025-10-21',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's13',
    name: '감성공학시험',
    date: '2025-10-21',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 't2_old',
    name: '환경과학과제',
    date: '2025-10-21',
    isRecurring: false,
    isTask: true,
    labelId: '3',
    isCompleted: false,
  },
  {
    id: 's14',
    name: '코딩공부',
    date: '2025-10-21',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's15',
    name: '중간고사',
    date: '2025-10-21',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's16',
    name: '중간고사',
    date: '2025-10-22',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's17',
    name: '중간고사',
    date: '2025-10-23',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
  {
    id: 's18',
    name: '중간고사',
    date: '2025-10-24',
    isRecurring: false,
    isTask: false,
    labelId: '1',
    isCompleted: false,
  },
]

function getEventsForDate(
  fullDate: Date,
  allSchedules: ScheduleData[],
): { schedules: ScheduleData[]; tasks: ScheduleData[] } {
  const dateString = fullDate.getDate().toString().padStart(2, '0')
  const month = (fullDate.getMonth() + 1).toString().padStart(2, '0')
  const targetDateSuffix = `${month}-${dateString}`

  const schedules: ScheduleData[] = []
  const tasks: ScheduleData[] = []

  const currentYear = INITIAL_DATE.getFullYear()
  const targetYear =
    fullDate.getMonth() === 0 && INITIAL_DATE.getMonth() === 11
      ? currentYear + 1
      : fullDate.getMonth() === 11 && INITIAL_DATE.getMonth() === 0
        ? currentYear - 1
        : currentYear
  const fullDateString = `${targetYear}-${targetDateSuffix}`

  // ⭐️ date.endsWith 로직 대신, 정확히 일치하는 날짜를 찾습니다.
  allSchedules
    .filter((s) => s.date === fullDateString)
    .forEach((item) => {
      if (item.isTask) {
        tasks.push(item)
      } else {
        schedules.push(item)
      }
    })

  return { schedules, tasks }
}

// ⭐️ 수정된 getDisplayItems 함수 (태스크 2개 이상이면 요약 박스)
function getDisplayItems(
  schedules: ScheduleData[],
  tasks: ScheduleData[],
): DisplayItem[] {
  let displayList: DisplayItem[] = [...schedules]

  if (tasks.length === 0) {
    return displayList
  }

  // ⭐️ 태스크가 1개인 경우: 모두 표시
  if (tasks.length === 1) {
    displayList.push(tasks[0])
  }
  // ⭐️ 태스크가 2개 이상인 경우: 요약 박스(전체 개수) 표시
  else {
    // ⭐️ isTaskSummary 객체에 key로 사용할 id 속성과 함께 tasks 목록 전달
    displayList.push({
      isTaskSummary: true,
      id: `task-summary-${tasks[0].date}-${tasks.length}`,
      count: tasks.length, // 전체 개수 표시
      tasks: tasks, // ⭐️ 요약된 실제 태스크 목록을 함께 저장
    })
  }

  // 캘린더 셀 높이에 따라 표시 개수를 제한해야 할 수 있지만,
  // 여기서는 요구사항에 따라 로직만 적용하고 리스트를 그대로 반환합니다.

  return displayList
}
// --------------------------------------------------------------------

function getCalendarDates(
  year: number,
  month: number,
  currentFocusedDate: Date,
  allSchedules: ScheduleData[],
) {
  const dates: any[] = []
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startWeekDay = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()
  const prevMonthLastDate = new Date(year, month, 0).getDate()
  const systemToday = new Date()

  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekDay + 1
    let date: number
    let isCurrentMonth = true
    let itemDate = new Date(year, month, dayNum)

    if (dayNum < 1) {
      date = prevMonthLastDate + dayNum
      isCurrentMonth = false
      itemDate = new Date(year, month - 1, date)
    } else if (dayNum > totalDays) {
      date = dayNum - totalDays
      isCurrentMonth = false
      itemDate = new Date(year, month + 1, date)
    } else {
      date = dayNum
    }

    const isToday =
      isCurrentMonth &&
      systemToday.getFullYear() === year &&
      systemToday.getMonth() === month &&
      systemToday.getDate() === date

    const isFocused = itemDate.toDateString() === currentFocusedDate.toDateString()

    const holidayName = getHolidayName(itemDate)
    const isHoliday = !!holidayName

    const dayOfWeek = itemDate.getDay()

    const { schedules, tasks } = getEventsForDate(itemDate, allSchedules)

    dates.push({
      day: date,
      isCurrentMonth,
      isToday,
      isFocused,
      fullDate: itemDate,
      holidayName: holidayName,
      isHoliday: isHoliday,
      dayOfWeek: dayOfWeek,
      schedules: schedules,
      tasks: tasks,
    })
  }
  return dates
}

// --------------------------------------------------------------------
// Custom UI Components
// --------------------------------------------------------------------

const ScheduleItem: React.FC<{
  schedule: ScheduleData
  onToggleComplete: (id: string) => void
}> = ({ schedule, onToggleComplete }) => {
  if (schedule.isTask) {
    const isCompleted = schedule.isCompleted
    return (
      <View style={S.taskBox}>
        <TouchableOpacity
          style={S.checkboxTouchArea}
          onPress={() => onToggleComplete(schedule.id)}
          activeOpacity={0.8}
        >
          <View
            style={[
              S.checkboxBase,
              !isCompleted && S.checkboxOff,
              isCompleted && S.checkboxOn,
            ]}
          >
            {isCompleted && <Text style={S.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <Text style={S.taskText} numberOfLines={1}>
          {schedule.name}
        </Text>
      </View>
    )
  }

  const isRecurring = schedule.isRecurring

  return (
    <View
      style={[
        S.scheduleBox,
        isRecurring ? S.recurringSchedule : S.singleSchedule,
        !isRecurring && S.singleScheduleBorder,
      ]}
    >
      <Text
        style={[S.scheduleText, !isRecurring && S.singleScheduleText]}
        numberOfLines={1}
      >
        {schedule.name}
      </Text>
    </View>
  )
}

// ⭐️ TaskSummaryBox 컴포넌트 (n개 더 박스)
const TaskSummaryBox: React.FC<{
  count: number
  tasks: ScheduleData[] // 실제 태스크 목록
  onToggleAllComplete: (tasks: ScheduleData[], targetState: boolean) => void // 일괄 완료 핸들러
}> = ({ count, tasks, onToggleAllComplete }) => {
  // ⭐️ 모든 태스크가 완료되었는지 확인
  const isAllCompleted = tasks.every((t) => t.isCompleted)

  const handlePress = () => {
    // 하나라도 미완료가 있으면 -> 모두 완료 (true)로 토글
    // 모두 완료 상태이면 -> 모두 미완료 (false)로 토글
    const newState = !isAllCompleted
    onToggleAllComplete(tasks, newState)
  }

  return (
    <View style={S.taskSummaryBox}>
      <TouchableOpacity
        style={S.checkboxTouchArea}
        onPress={handlePress} // ⭐️ 체크박스 터치 영역을 onPress 핸들러로 감쌈
        activeOpacity={0.8}
      >
        <View
          style={[
            S.checkboxBase,
            !isAllCompleted && S.checkboxOff,
            isAllCompleted && S.checkboxOn,
          ]}
        >
          {isAllCompleted && <Text style={S.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text style={S.moreCountText} numberOfLines={1}>
        {count}개 태스크
      </Text>
    </View>
  )
}

const CustomThumb: React.FC = () => {
  return <View style={[S.customThumbContainer, { zIndex: 9999 }]} />
}
interface CustomSwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
}
const CustomSwitch: React.FC<CustomSwitchProps> = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      style={[
        S.customSwitchTrack,
        { backgroundColor: value ? colors.primary.main : SAFE_GRAY_COLOR },
      ]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
    >
      <View
        style={[
          S.customSwitchThumb,
          {
            transform: [
              { translateX: value ? SWITCH_WIDTH - THUMB_SIZE - SWITCH_PADDING * 2 : 0 },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  )
}

interface FilterContentProps {
  onOpacityChange: (value: number) => void
  onLabelToggle: (id: string, isEnabled: boolean) => void
  labelStates: Record<string, boolean>
  currentOpacity: number
}
const FilterContent: React.FC<FilterContentProps> = ({
  onOpacityChange,
  onLabelToggle,
  labelStates,
  currentOpacity,
}) => {
  return (
    <View style={[S.filterPopupContainer, { opacity: currentOpacity, zIndex: 1000 }]}>
      <ScrollView
        style={S.scrollableFilterContent}
        contentContainerStyle={S.filterContent}
      >
        <View style={S.filterHeaderRow}>
          <Text style={S.filterHeaderText}>필터</Text>
          {/* 💡 슬라이더 트랙 가시성 개선을 위한 컨테이너와 배경 추가 */}
          <View style={S.sliderContainer}>
            <View style={S.sliderTrackBackground} />
            <Slider
              style={S.opacitySlider}
              minimumValue={0.1}
              maximumValue={1}
              value={currentOpacity}
              onValueChange={onOpacityChange}
              // 트랙을 투명하게 설정하여 아래의 배경 View가 보이도록 함
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={SAFE_GRAY_COLOR}
              //@ts-ignore
              thumbComponent={CustomThumb}
            />
          </View>
        </View>
        <View style={S.itemRow}>
          <Text style={S.itemText}>전체</Text>
          <CustomSwitch
            value={Object.values(labelStates).every((state) => state)}
            onValueChange={(value) => {
              filterLabels.forEach((label) => onLabelToggle(label.id, value))
            }}
          />
        </View>
        <View style={[S.divider, { backgroundColor: SAFE_GRAY_COLOR }]} />
        {filterLabels.map((label) => (
          <View key={label.id} style={S.itemRow}>
            <View style={S.labelGroup}>
              {/* ⭐️ 라벨 색상 사각형 스타일 적용 */}
              <View style={[S.labelColor, { backgroundColor: UNIFIED_LABEL_COLOR }]} />
              {/* ⭐️ 라벨 텍스트 스타일 적용 */}
              <Text style={S.itemText}>{label.name}</Text>
            </View>
            <CustomSwitch
              value={labelStates[label.id]}
              onValueChange={(value) => onLabelToggle(label.id, value)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

interface MenuPopupProps {
  onClose: () => void
}
const MenuPopup: React.FC<MenuPopupProps> = ({ onClose }) => {
  const menuItems = [
    { name: '캘린더 관리', icon: 'Settings' },
    { name: '새 일정 추가', icon: 'Plus' },
    { name: '설정', icon: 'Cog' },
  ]
  const handleItemPress = (name: string) => {
    console.log(`${name} 클릭됨`)
    onClose()
  }
  return (
    <View style={S.popupOverlay}>
      <TouchableOpacity style={S.mask} onPress={onClose} />
      <View style={S.menuPopupContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={S.popupItem}
            onPress={() => handleItemPress(item.name)}
          >
            <Text style={S.popupItemText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
// --------------------------------------------------------------------

// --------------------------------------------------------------------
// 메인 컴포넌트: MonthView
// --------------------------------------------------------------------
export default function MonthView() {
  const [focusedDate, setFocusedDate] = useState(INITIAL_DATE)
  const [allSchedules, setAllSchedules] = useState<ScheduleData[]>(
    INITIAL_DUMMY_SCHEDULES,
  )

  const [calendarDates, setCalendarDates] = useState<any[]>([])
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [scheduleOpacity, setScheduleOpacity] = useState(1.0)
  const [labelStates, setLabelStates] = useState(initialLabelStates)
  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const isFocusOnToday = focusedDate.toDateString() === INITIAL_DATE.toDateString()

  useEffect(() => {
    setCalendarDates(
      getCalendarDates(
        focusedDate.getFullYear(),
        focusedDate.getMonth(),
        focusedDate,
        allSchedules,
      ),
    )
  }, [focusedDate, allSchedules, labelStates]) // ⭐️ labelStates가 변경될 때도 캘린더를 다시 계산하도록 추가

  const handlePrevMonth = () => {
    setFocusedDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1),
    )
  }
  const handleNextMonth = () => {
    setFocusedDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1),
    )
  }
  const handleDatePress = (dateItem: any) => {
    setFocusedDate(dateItem.fullDate)
  }
  const toggleFilter = () => {
    setIsFilterVisible((prev) => !prev)
    if (!isFilterVisible && isMenuVisible) {
      setIsMenuVisible(false)
    }
  }
  const toggleMenu = () => {
    setIsMenuVisible((prev) => !prev)
    if (!isMenuVisible && isFilterVisible) {
      setIsFilterVisible(false)
    }
  }
  const handleOpacityChange = (value: number) => {
    setScheduleOpacity(value)
  }
  const handleLabelToggle = (id: string, isEnabled: boolean) => {
    setLabelStates((prev) => ({ ...prev, [id]: isEnabled }))
  }

  const handleToggleComplete = (id: string) => {
    setAllSchedules((prevSchedules) =>
      prevSchedules.map((schedule) =>
        schedule.id === id
          ? { ...schedule, isCompleted: !schedule.isCompleted }
          : schedule,
      ),
    )
  }

  // ⭐️ 추가: 요약된 태스크 목록의 완료 상태를 일괄적으로 토글하는 핸들러
  const handleToggleAllComplete = (tasks: ScheduleData[], targetState: boolean) => {
    const taskIdsToUpdate = tasks.map((t) => t.id)

    setAllSchedules((prevSchedules) =>
      prevSchedules.map((schedule) =>
        taskIdsToUpdate.includes(schedule.id)
          ? { ...schedule, isCompleted: targetState }
          : schedule,
      ),
    )
  }

  const renderWeeks = (dates: any[]) => {
    const weeks = []
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7))
    }
    return weeks
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={S.safeAreaContent} edges={['top', 'left', 'right']}>
        <View style={S.headerWrapper}>
          <Header
            onLeftPress={handlePrevMonth}
            onRightPress={handleNextMonth}
            onFilterPress={toggleFilter}
            onMenuPress={toggleMenu}
            isFilterActive={isFilterVisible}
            // ⭐️ Header에서 CalendarModal을 통해 날짜를 변경할 수 있도록 props 전달
            selectedDate={focusedDate.toISOString().split('T')[0]}
            onSelectDate={(dateString) => setFocusedDate(new Date(dateString))}
          />
        </View>

        <View style={S.dayHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <View key={index} style={S.dayCellFixed}>
              <Text
                style={[
                  ts('monthDate'),
                  S.dayTextBase,
                  index === 0 && S.sunText,
                  index === 6 && S.satText,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView style={S.contentArea} contentContainerStyle={S.contentContainer}>
          <View style={S.calendarGrid}>
            {renderWeeks(calendarDates).map((week, weekIndex) => (
              <View key={weekIndex} style={S.weekRow}>
                {week.map((dateItem: any, i: number) => {
                  // ⭐️ 1. labelStates를 사용하여 일정 및 태스크를 필터링
                  const filteredSchedules = dateItem.schedules.filter(
                    (s: ScheduleData) => labelStates[s.labelId],
                  )
                  const filteredTasks = dateItem.tasks.filter(
                    (t: ScheduleData) => labelStates[t.labelId],
                  )

                  // ⭐️ 2. 필터링된 목록을 사용하여 표시 항목을 계산 (태스크 2개 이상이면 요약 박스)
                  const itemsToRender = getDisplayItems(filteredSchedules, filteredTasks)

                  return (
                    <TouchableOpacity
                      key={dateItem.day}
                      style={[
                        S.dateCell,
                        dateItem.isFocused && S.focusedDayBorder,
                        !dateItem.isFocused &&
                          dateItem.isToday &&
                          isFocusOnToday &&
                          S.todayBorder,
                      ]}
                      onPress={() => handleDatePress(dateItem)}
                    >
                      <View style={S.dateNumberWrapper}>
                        {dateItem.isToday && <View style={S.todayRoundedSquare} />}
                        <Text
                          style={[
                            ts('monthDate'),
                            S.dateNumberBase,
                            dateItem.isCurrentMonth && i % 7 === 0 && S.sunDate,
                            dateItem.isCurrentMonth && (i + 1) % 7 === 0 && S.satDate,
                            !dateItem.isCurrentMonth && S.otherMonthDateText,
                            !dateItem.isCurrentMonth &&
                              dateItem.dayOfWeek === 0 &&
                              S.otherMonthSunDate,
                            !dateItem.isCurrentMonth &&
                              dateItem.dayOfWeek === 6 &&
                              S.otherMonthSatDate,
                            dateItem.isToday && S.todayDateText,
                            !dateItem.isCurrentMonth &&
                              dateItem.isHoliday &&
                              S.otherMonthSunDate,
                            dateItem.isCurrentMonth &&
                              dateItem.isHoliday &&
                              S.holidayDateText,
                          ]}
                        >
                          {dateItem.day}
                        </Text>

                        {dateItem.holidayName && (
                          <Text
                            style={[
                              S.holidayText,
                              !dateItem.isCurrentMonth && S.otherMonthHolidayText,
                              dateItem.holidayName === '크리스마스' && S.smallHolidayText,
                            ]}
                          >
                            {dateItem.holidayName.substring(0, 4)}
                          </Text>
                        )}
                      </View>

                      <View style={S.eventArea}>
                        {itemsToRender.map((item, index) => {
                          // ⭐️ isTaskSummary 속성을 통해 요약 박스인지 확인합니다.
                          if ('isTaskSummary' in item && item.isTaskSummary) {
                            return (
                              // ⭐️ 요약 박스에 tasks 목록과 핸들러 전달
                              <TaskSummaryBox
                                key={item.id}
                                count={item.count}
                                tasks={item.tasks}
                                onToggleAllComplete={handleToggleAllComplete}
                              />
                            )
                          } else {
                            return (
                              <ScheduleItem
                                key={item.id}
                                schedule={item as ScheduleData}
                                onToggleComplete={handleToggleComplete}
                              />
                            )
                          }
                        })}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {isFilterVisible && (
        <FilterContent
          currentOpacity={scheduleOpacity}
          onOpacityChange={handleOpacityChange}
          onLabelToggle={handleLabelToggle}
          labelStates={labelStates}
        />
      )}

      {isMenuVisible && <MenuPopup onClose={toggleMenu} />}
    </View>
  )
}

// --------------------------------------------------------------------
// 스타일시트 정의 (S) - 필터 관련 스타일 수정
// --------------------------------------------------------------------
const { width } = Dimensions.get('window')
const horizontalPadding = 12
const cellWidth = (width - horizontalPadding) / 7
const MIN_CELL_HEIGHT = 102

const S = StyleSheet.create({
  safeArea: { backgroundColor: '#FFFFFF' },
  safeAreaContent: { flex: 1 },
  headerWrapper: { height: 44, width: '100%' },
  contentArea: { flex: 1, paddingHorizontal: 6, paddingTop: 10 },
  contentContainer: { paddingBottom: 20 },

  dayHeader: {
    flexDirection: 'row',
    marginBottom: 5,
    // 요일 헤더 위치: 10px로 유지
    marginTop: 10,
    paddingHorizontal: 6,
  },
  dayCellFixed: { width: cellWidth, alignItems: 'center' },
  dayTextBase: { textAlign: 'center', color: '#333', fontWeight: '600' },
  sunText: { color: 'red' },
  satText: { color: 'blue' },

  calendarGrid: {},

  weekRow: {
    flexDirection: 'row',
    width: '100%',
    // 주 구분선 제거 유지
  },

  dateCell: {
    width: cellWidth,
    minHeight: MIN_CELL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    position: 'relative',
    borderWidth: 0,
    paddingBottom: 2,
  },

  dateNumberWrapper: {
    height: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 6,
    paddingTop: 2,
    position: 'relative',
  },
  // 📏 날짜와 일정 사이 거리: 5px
  eventArea: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: EVENT_AREA_PADDING_TOP,
    paddingBottom: ITEM_MARGIN_VERTICAL,
  },

  focusedDayBorder: { borderWidth: 1.5, borderColor: '#AAAAAA', borderRadius: 4 },
  todayBorder: { borderWidth: 1.5, borderColor: '#CCCCCC', borderRadius: 4 },
  dateNumberBase: { color: 'black', zIndex: 1 },

  sunDate: { color: 'red' },
  satDate: { color: 'blue' },
  otherMonthDateText: { color: 'gray' },
  otherMonthSunDate: { color: '#F0A0A0' },
  otherMonthSatDate: { color: '#A0A0FF' },
  todayDateText: { fontWeight: 'bold' },
  holidayDateText: { color: 'red' },

  todayRoundedSquare: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 4,
    top: 3,
    left: 5,
    backgroundColor: 'rgba(176, 79, 255, 0.15)',
    zIndex: 0,
  },

  holidayText: {
    position: 'absolute',
    right: 6,
    top: 3,
    fontSize: 8,
    color: 'red',
    lineHeight: 14,
    fontWeight: 'normal',
  },
  smallHolidayText: {
    fontSize: 7,
  },
  otherMonthHolidayText: {
    color: '#F08080',
  },

  // 일정 박스 스타일 (높이 12px)
  scheduleBox: {
    height: SCHEDULE_BOX_HEIGHT,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    // 📏 일정들 간 세로 마진: 2px
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  recurringSchedule: {
    backgroundColor: SCHEDULE_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  singleSchedule: {
    backgroundColor: SCHEDULE_LIGHT_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // ⭐️ 단일 일정 테두리 스타일
  singleScheduleBorder: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
  },
  scheduleText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#FFFFFF', // 반복 일정은 흰색
    textAlign: 'left',
    lineHeight: SCHEDULE_BOX_HEIGHT,
    // ⭐️ 글자를 위로 1px 올림
    marginTop: -1,
  },
  singleScheduleText: {
    color: '#000', // 단발성 일정은 검정색
    // ⭐️ 글자를 위로 1px 올림
    marginTop: -1,
  },

  // ⭐️ 태스크 체크박스/텍스트 스타일
  checkboxTouchArea: {
    marginRight: 1,
    padding: 2,
    alignSelf: 'center',
  },
  checkboxBase: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkboxOff: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  checkboxOn: {
    backgroundColor: DARK_GRAY_COLOR,
    borderColor: DARK_GRAY_COLOR,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: CHECKBOX_SIZE,
  },
  taskBox: {
    height: TASK_BOX_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#000000',
    paddingLeft: 1,
    paddingRight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  taskText: {
    fontSize: 8,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    // ⭐️ 텍스트 2px 위로 올림 (기존 값 유지)
    marginTop: -2,
    textAlign: 'left',
    paddingRight: TEXT_HORIZONTAL_PADDING,
    lineHeight: TASK_BOX_HEIGHT,
  },

  // ⭐️ 태스크 요약 박스 스타일
  taskSummaryBox: {
    height: TASK_BOX_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 1,
    paddingRight: 0,
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  moreCountText: {
    fontSize: 8,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    // ⭐️ 텍스트 2px 위로 올림 (기존 값 유지)
    marginTop: -2,
    textAlign: 'left',
    paddingRight: TEXT_HORIZONTAL_PADDING,
    lineHeight: TASK_BOX_HEIGHT,
  },

  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1000,
    flexDirection: 'row',
  },
  mask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  filterPopupContainer: {
    position: 'absolute',
    top: HEADER_HEIGHT_WITH_STATUSBAR,
    right: 22,
    width: 158,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  scrollableFilterContent: { maxHeight: MAX_FILTER_HEIGHT },
  filterContent: {
    paddingTop: 10,
    paddingHorizontal: 15,
    // ⭐️ 항목 높이가 33px로 조정되었으므로 하단 패딩을 조정
    paddingBottom: 10,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    marginTop: 5,
    height: 44,
  },
  filterHeaderText: { fontSize: 14, fontWeight: 'bold' },

  // 💡 슬라이더와 배경을 감싸는 컨테이너: SLIDER_TOTAL_WIDTH(58px)로 확장
  sliderContainer: {
    width: SLIDER_TOTAL_WIDTH, // 58px
    height: 44,
    // ⭐️ 요청에 따라 마진을 12px로 변경하여 텍스트와의 간격 조정
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 💡 슬라이더 트랙 역할을 하는 View (실제 선은 38px 유지)
  sliderTrackBackground: {
    position: 'absolute',
    width: SLIDER_WIDTH, // 38px 길이 유지
    height: SLIDER_TRACK_HEIGHT,
    backgroundColor: SLIDER_TRACK_COLOR, // #333333
    borderRadius: SLIDER_TRACK_HEIGHT / 2,
    top: 22 - SLIDER_TRACK_HEIGHT / 2,
    // ⭐️ 썸이 끝까지 움직이도록 중앙 배치 (10px) 유지
    left: CUSTOM_THUMB_DIAMETER / 2, // 10px
  },
  // 💡 슬라이더 자체: SLIDER_TOTAL_WIDTH(58px)로 확장하여 썸이 끝까지 움직일 공간 확보
  opacitySlider: {
    width: '100%', // SLIDER_TOTAL_WIDTH
    height: 40,
    position: 'absolute',
    top: 2,
  },
  customThumbContainer: {
    width: CUSTOM_THUMB_DIAMETER,
    height: CUSTOM_THUMB_DIAMETER,
    borderRadius: CUSTOM_THUMB_DIAMETER / 2,
    backgroundColor: CUSTOM_THUMB_COLOR,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSwitchTrack: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    borderRadius: SWITCH_RADIUS,
    padding: SWITCH_PADDING,
    justifyContent: 'center',
  },
  customSwitchThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
    position: 'absolute',
    left: SWITCH_PADDING,
  },
  divider: { height: 1, marginVertical: 8 },
  // ⭐️ 수정: 항목 높이를 33px으로 설정하여 33px 간격 확보
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: ITEM_HEIGHT, // 33px 간격의 핵심
    paddingVertical: 0, // 수직 패딩 제거
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // ⭐️ 라벨 색상 사각형 크기 및 마진 수정
  labelColor: {
    width: LABEL_COLOR_WIDTH,
    height: LABEL_COLOR_HEIGHT,
    borderRadius: 2,
    marginRight: LABEL_COLOR_MARGIN_RIGHT,
  },
  // ⭐️ 라벨 텍스트 크기 12px 유지
  itemText: {
    fontSize: 12,
    color: '#333',
    marginRight: ITEM_BUTTON_MARGIN,
    // 텍스트가 컨테이너 내에서 중앙에 오도록 lineHeight 설정 (선택적)
    lineHeight: 18,
  },
  menuPopupContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    width: 126,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  popupItem: { paddingHorizontal: 15, paddingVertical: 8 },
  popupItemText: { fontSize: 16, color: '#333' },
})
