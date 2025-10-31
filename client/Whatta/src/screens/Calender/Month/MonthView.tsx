import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import ScreenWithSidebar from '../../../components/sidebars/ScreenWithSidebar';

// --------------------------------------------------------------------
// 1. 상수 및 타입 정의
// --------------------------------------------------------------------
const DARK_GRAY_COLOR = '#555555'
const FONT_MAIN = '#000000'
const FONT_SUB = '#999999'
const COLOR_PRIMARY = '#B04FFF'
const COLOR_LIGHT = '#EAD7FF'

// 반복 일정 배경, 경계선/멀티데이 시작/종료 표시용
const SCHEDULE_COLOR = '#B04FFF';
// 단일 일정 및 멀티데이(기간이 긴 일정) 바 배경색
const SCHEDULE_LIGHT_COLOR = '#E5CCFF';

const CHECKBOX_SIZE = 8

const SCHEDULE_BOX_HEIGHT = 12
const TASK_BOX_HEIGHT = 12
const ITEM_MARGIN_VERTICAL = 2
const EVENT_AREA_PADDING_TOP = 5
const SINGLE_SCHEDULE_BORDER_WIDTH = 5
const TEXT_HORIZONTAL_PADDING = 4

//  HOLIDAYS: 양력 공휴일 (JS getMonth() 0-11월 기준)
const HOLIDAYS: Record<string, string> = {
  '0-1': '신정', // 1월 1일
  '2-1': '삼일절', // 3월 1일
  '4-1': '노동절', // 5월 1일
  '4-5': '어린이날', // 5월 5일
  '5-6': '현충일', // 6월 6일
  '7-14': '광복절', // 8월 15일
  '9-3': '개천절', // 10월 3일
  '9-9': '한글날', // 10월 9일
  '11-25': '크리스마스', // 12월 25일
}

// 연도별 음력/대체공휴일 2026까지만 표시함
const LUNAR_HOLIDAYS_OFFSETS: Record<
  number,
  {
    설날: { month: number; day: number }[]
    추석: { month: number; day: number }[]
    부처님오신날: { month: number; day: number }
    대체휴일: { month: number; day: number }[]
  }
> = {
  2024: {
    설날: [
      { month: 1, day: 9 },
      { month: 1, day: 10 },
      { month: 1, day: 11 },
    ],
    추석: [
      { month: 8, day: 16 },
      { month: 8, day: 17 },
      { month: 8, day: 18 },
    ],
    부처님오신날: { month: 4, day: 15 },
    대체휴일: [{ month: 1, day: 12 }],
  },
  2025: {
    설날: [
      { month: 0, day: 28 },
      { month: 0, day: 29 },
      { month: 0, day: 30 },
    ],
    추석: [
      { month: 9, day: 5 },
      { month: 9, day: 6 },
      { month: 9, day: 7 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [{ month: 9, day: 8 }],
  },
  2026: {
    설날: [
      { month: 1, day: 16 },
      { month: 1, day: 17 },
      { month: 1, day: 18 },
    ],
    추석: [
      { month: 8, day: 24 },
      { month: 8, day: 25 },
      { month: 8, day: 26 },
    ],
    부처님오신날: { month: 4, day: 24 },
    대체휴일: [
      { month: 2, day: 2 },
      { month: 4, day: 25 },
      { month: 7, day: 17 },
      { month: 9, day: 5 },
    ],
  },
}

interface ScheduleData {
  id: string
  name: string
  date: string
  isRecurring: boolean
  isTask: boolean
  labelId: string
  isCompleted: boolean
  // optional multi-day fields
  multiDayStart?: string
  multiDayEnd?: string
}
interface TaskSummaryItem {
  isTaskSummary: true
  id: string
  count: number
  tasks: ScheduleData[]
}
type DisplayItem = ScheduleData | TaskSummaryItem

interface CalendarDateItem {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFocused: boolean;
  fullDate: Date;
  holidayName: string | null;
  isHoliday: boolean;
  dayOfWeek: number;
  schedules: ScheduleData[];
  tasks: ScheduleData[];
}

// --------------------------------------------------------------------
//  초기 일정 데이터 (2025년 10월 기준) + 반복 일정 복구
// --------------------------------------------------------------------
const INITIAL_DUMMY_SCHEDULES: ScheduleData[] = [
  // 단일 일정
  { id: 's1', name: '외할머니댁', date: '2025-10-06', isRecurring: false, isTask: false, labelId: '3', isCompleted: false },
  { id: 't4', name: '코드제출', date: '2025-10-30', isRecurring: false, isTask: true, labelId: '1', isCompleted: false },
  { id: 's_wap', name: 'WAP회의', date: '2025-10-07', isRecurring: false, isTask: false, labelId: '4', isCompleted: false },
  { id: 't_emotion', name: '감성공학 과제제출', date: '2025-10-16', isRecurring: false, isTask: true, labelId: '1', isCompleted: false },

  // 멀티데이 일정
  { id: 's_midterm', name: '중간고사', date: '2025-10-21', isRecurring: false, isTask: false, labelId: '3', isCompleted: false, multiDayStart: '2025-10-21', multiDayEnd: '2025-10-24' },

  // Task Summary 테스트용 (동일 날짜 2개 이상)
  { id: 't_report', name: '레포트쓰기', date: '2025-10-13', isRecurring: false, isTask: true, labelId: '1', isCompleted: false },
  { id: 't_research', name: '자료조사', date: '2025-10-13', isRecurring: false, isTask: true, labelId: '1', isCompleted: false },

  // 기타 단일 일정
  { id: 's_wap_28', name: 'WAP회의', date: '2025-10-28', isRecurring: false, isTask: false, labelId: '4', isCompleted: false },
  { id: 's_h_friends', name: '고등학교친구들', date: '2025-10-12', isRecurring: false, isTask: false, labelId: '3', isCompleted: false },
  { id: 's_c_friends', name: '과친구들', date: '2025-10-26', isRecurring: false, isTask: false, labelId: '3', isCompleted: false },

  // 주간 반복 수업 일정 (시작일 2025-09-02~05)
  // 화요일 (2025-09-02 시작)
  { id: 's_tue_1', name: '연극과 희곡의 이해', date: '2025-09-02', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  { id: 's_tue_2', name: '대학영어', date: '2025-09-02', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  { id: 's_tue_3', name: '생활속의 감성공학', date: '2025-09-02', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  // 수요일 (2025-09-03 시작)
  { id: 's_wed_1', name: '환경과학', date: '2025-09-03', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  { id: 's_wed_2', name: '사유와 표현', date: '2025-09-03', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  // 목요일 (2025-09-04 시작)
  { id: 's_thu_1', name: '컴퓨팅사고', date: '2025-09-04', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  { id: 's_thu_2', name: '생활속의 감성공학', date: '2025-09-04', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  // 금요일 (2025-09-05 시작)
  { id: 's_fri_1', name: '정보통신과 뉴미디어', date: '2025-09-05', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
  { id: 's_fri_2', name: '프로그래밍기초2', date: '2025-09-05', isRecurring: true, isTask: false, labelId: '5', isCompleted: false },
];

// --------------------------------------------------------------------
// 2. 유틸리티 함수
// --------------------------------------------------------------------
const ts = (styleName: string): any => {
  if (styleName === 'monthDate') { return { fontSize: 12 }; }
  return {};
};

const today = (): string => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const TODAY_ISO = today();

function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const day = date.getDate()
  let holidayName: string | null = null

  // 1. 양력 공휴일
  const solarKey = `${month}-${day}`
  if (HOLIDAYS[solarKey]) {
    holidayName = HOLIDAYS[solarKey]
  }

  // 2. 음력/특정 연도 공휴일 및 대체휴일
  const lunarData = LUNAR_HOLIDAYS_OFFSETS[year]

  if (lunarData) {
    for (const h of lunarData.설날) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '설날'
        break
      }
    }

    for (const h of lunarData.추석) {
      if (h.month === month && h.day === day) {
        holidayName = holidayName || '추석'
        break
      }
    }

    if (lunarData.부처님오신날.month === month && lunarData.부처님오신날.day === day) {
      holidayName = holidayName || '부처님 오신 날'
    }

    for (const h of lunarData.대체휴일) {
      if (h.month === month && h.day === day) {
        holidayName = '대체휴일'
        break
      }
    }
  }

  if (holidayName) {
    if (holidayName.length > 4) return holidayName.substring(0, 4);
    return holidayName;
  }
  return null
}

function getEventsForDate(
  fullDate: Date,
  allSchedules: ScheduleData[],
): { schedules: ScheduleData[]; tasks: ScheduleData[] } {
  const schedules: ScheduleData[] = [];
  const tasks: ScheduleData[] = [];

  const month = (fullDate.getMonth() + 1).toString().padStart(2, '0');
  const dateString = fullDate.getDate().toString().padStart(2, '0');
  const targetYear = fullDate.getFullYear();
  const fullDateString = `${targetYear}-${month}-${dateString}`;
  const dayOfWeek = fullDate.getDay(); // 0 (Sun) to 6 (Sat)

  allSchedules.forEach((item) => {
    // 멀티데이
    if (item.multiDayStart && item.multiDayEnd) {
      if (item.multiDayStart <= fullDateString && fullDateString <= item.multiDayEnd) {
        schedules.push(item);
        return;
      }
    }

    // 반복
    if (item.isRecurring) {
      const parts = item.date.split('-').map(Number);
      const startDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const itemDayOfWeek = startDate.getDay();

      if (dayOfWeek === itemDayOfWeek) {
        if (fullDateString >= item.date) {
          if (item.isTask) tasks.push(item);
          else schedules.push(item);
          return;
        }
      }
    }

    // 단일
    if (item.date === fullDateString) {
      if (item.isTask) tasks.push(item);
      else schedules.push(item);
      return;
    }
  });

  return { schedules, tasks };
}

function getDisplayItems(schedules: ScheduleData[], tasks: ScheduleData[]): DisplayItem[] {
  let displayList: DisplayItem[] = [...schedules];
  if (tasks.length === 0) { return displayList; }
  if (tasks.length === 1) { displayList.push(tasks[0]); }
  else {
    displayList.push({
      isTaskSummary: true,
      id: `task-summary-${tasks[0].date}-${tasks.length}`,
      count: tasks.length,
      tasks: tasks,
    })
  }
  return displayList
}

function getCalendarDates(
  year: number,
  month: number,
  currentFocusedDate: Date,
  allSchedules: ScheduleData[],
): CalendarDateItem[] {
  const dates: CalendarDateItem[] = []
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startWeekDay = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()
  const prevMonthLastDate = new Date(year, month, 0).getDate()
  const systemTodayISO = TODAY_ISO

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

    const itemDateISO = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`
    const isToday = itemDateISO === systemTodayISO

    const isFocused = currentFocusedDate.toDateString() === itemDate.toDateString()

    const holidayName = getHolidayName(itemDate);
    const isHoliday = !!holidayName;
    const dayOfWeek = itemDate.getDay();
    const { schedules, tasks } = getEventsForDate(itemDate, allSchedules);

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
// 🔐 타입가드 (여기가 핵심 수정)
// --------------------------------------------------------------------
function isTaskSummaryItem(item: DisplayItem): item is TaskSummaryItem {
  return typeof (item as any)?.isTaskSummary !== 'undefined' && (item as any).isTaskSummary === true;
}

// --------------------------------------------------------------------
// 3. Custom UI Components (ScheduleItem, TaskSummaryBox)
// --------------------------------------------------------------------
interface ScheduleItemProps {
  schedule: ScheduleData;
  currentDateISO: string;
  isCurrentMonth: boolean;
}
const ScheduleItem: React.FC<ScheduleItemProps> = ({ schedule, currentDateISO, isCurrentMonth }) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null;

  // 멀티데이(기간이 긴 일정)
  if (schedule.multiDayStart && schedule.multiDayEnd) {
    const isStart = currentDateISO === schedule.multiDayStart
    const isEnd = currentDateISO === schedule.multiDayEnd

    return (
      <View style={[S.multiDayContainer, dimmedStyle]}>
        <View
          style={[
            S.multiBarBase,
            isStart ? S.multiBarLeftEdge : null,
            isEnd ? S.multiBarRightEdge : null,
          ]}
        >
          {isStart ? (
            <Text numberOfLines={1} ellipsizeMode="tail" style={S.multiBarText}>
              {schedule.name}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  // Task: 단일 Task
  if (schedule.isTask) {
    return (
      <View style={[S.taskBoxNoCheckbox, S.taskBoxBordered, dimmedStyle]}>
        <Text style={S.taskText} numberOfLines={1} ellipsizeMode="tail">{schedule.name}</Text>
      </View>
    )
  }

  const isRecurring = schedule.isRecurring

  // 반복 일정(진한 보라색 배경)은 흰색 텍스트, 단일 일정(연한 보라색 배경)은 검정색 텍스트
  const textColorStyle = isRecurring ? S.recurringScheduleText : S.singleScheduleText

  return (
    <View
      style={[
        S.scheduleBox,
        isRecurring ? S.recurringSchedule : S.singleSchedule,
        !isRecurring ? S.singleScheduleBorder : null,
        dimmedStyle,
      ]}
    >
      <Text style={[S.scheduleText, isRecurring ? S.recurringScheduleText : S.singleScheduleText]} numberOfLines={1} ellipsizeMode="tail">
        {schedule.name}
      </Text>
    </View>
  );
};

interface TaskSummaryBoxProps {
  count: number;
  isCurrentMonth: boolean;
}
const TaskSummaryBox: React.FC<TaskSummaryBoxProps> = ({ count, isCurrentMonth }) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null;
  return (
    <View style={[S.taskBoxNoCheckbox, S.taskBoxBordered, dimmedStyle]}>
      <Text style={S.taskText} numberOfLines={1}>
        {`${count}개`}
      </Text>
    </View>
  );
};

// --------------------------------------------------------------------
// 4. 메인 컴포넌트: MonthView (필터 반영 + 오류 수정)
// --------------------------------------------------------------------
export default function MonthView() {
  const route = useRoute<any>();
  const labelsParam = route.params?.labels ?? null;

  // labels → 활성 라벨 id 배열로 안전 변환
  const activeLabelIds: string[] | null = useMemo(() => {
    if (!Array.isArray(labelsParam)) return null;
    return labelsParam
      .filter((l: any) => l && typeof l === 'object' && 'enabled' in l && 'id' in l)
      .filter((l: any) => !!l.enabled)
      .map((l: any) => String(l.id));
  }, [labelsParam]);

  const [focusedDateISO, setFocusedDateISO] = useState<string>(today());
  const [allSchedules] = useState<ScheduleData[]>(INITIAL_DUMMY_SCHEDULES);

  // 필터링된 일정
  const filteredSchedules = useMemo(
    () => (activeLabelIds ? allSchedules.filter(s => activeLabelIds.includes(s.labelId)) : allSchedules),
    [activeLabelIds, allSchedules]
  );

  const [calendarDates, setCalendarDates] = useState<CalendarDateItem[]>([]);
  const focusedDate = useMemo(() => new Date(focusedDateISO), [focusedDateISO]);

  useEffect(() => {
    setCalendarDates(
      getCalendarDates(
        focusedDate.getFullYear(),
        focusedDate.getMonth(),
        focusedDate,
        filteredSchedules,
      ),
    );
  }, [focusedDate, filteredSchedules]);

  const renderWeeks = (dates: CalendarDateItem[]): CalendarDateItem[][] => {
    const weeks: CalendarDateItem[][] = []
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7))
    }
    return weeks;
  };

  const handleDatePress = (dateItem: CalendarDateItem) => {
    if (!dateItem.isCurrentMonth) return;
    const d = dateItem.fullDate;
    setFocusedDateISO(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  return (
    <ScreenWithSidebar mode="overlay">
      <View style={S.contentContainerWrapper}>
        {/* 요일 헤더 */}
        <View style={S.dayHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <View key={`dow-${index}`} style={S.dayCellFixed}>
              <Text
                style={[
                  ts('monthDate'),
                  S.dayTextBase,
                  index === 0 ? S.sunText : null,
                  index === 6 ? S.satText : null,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* 달력 그리드 */}
        <ScrollView style={S.contentArea} contentContainerStyle={S.scrollContentContainer}>
          <View style={S.calendarGrid}>
            {renderWeeks(calendarDates).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={S.weekRow}>
                {week.map((dateItem: CalendarDateItem, i: number) => {
                  const itemsToRender: DisplayItem[] = getDisplayItems(dateItem.schedules, dateItem.tasks);

                  const isFocusedThis = dateItem.fullDate.toDateString() === focusedDate.toDateString();
                  const isTodayButNotFocused = !isFocusedThis && dateItem.isToday;
                  const isCurrentMonth = dateItem.isCurrentMonth;

                  const dayOfWeekStyle = isCurrentMonth
                    ? i % 7 === 0
                      ? S.sunDate
                      : (i + 1) % 7 === 0
                        ? S.satDate
                        : null
                    : null

                  const currentDateISO = `${dateItem.fullDate.getFullYear()}-${String(dateItem.fullDate.getMonth() + 1).padStart(2, '0')}-${String(dateItem.fullDate.getDate()).padStart(2, '0')}`

                  return (
                    <TouchableOpacity
                      key={dateItem.fullDate.toISOString()}
                      style={[
                        S.dateCell,
                        isFocusedThis ? S.focusedDayBorder : null,
                        isTodayButNotFocused ? S.todayBorder : null,
                        { zIndex: 10 },
                      ]}
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                      onPress={() => handleDatePress(dateItem)}
                      activeOpacity={isCurrentMonth ? 0.7 : 1}
                      disabled={!isCurrentMonth}
                    >
                      {/* 날짜 번호 및 스타일 */}
                      <View style={S.dateNumberWrapper}>
                        {dateItem.isToday ? <View style={S.todayRoundedSquare} /> : null}
                        <Text style={[
                          ts('monthDate'),
                          S.dateNumberBase,
                          isCurrentMonth ? dayOfWeekStyle : (i % 7 === 0 ? S.otherMonthSunDate : ((i + 1) % 7 === 0 ? S.otherMonthSatDate : S.otherMonthDateText)),
                          isCurrentMonth && dateItem.isHoliday ? S.holidayDateText : null,
                        ]}>
                          {String(dateItem.day)}
                        </Text>

                        {dateItem.holidayName ? (
                          <Text
                            style={[
                              S.holidayText,
                              !isCurrentMonth ? S.otherMonthHolidayText : null,
                              dateItem.holidayName === '크리스마스'
                                ? S.smallHolidayText
                                : null,
                            ]}
                          >
                            {dateItem.holidayName.substring(0, 4)}
                          </Text>
                        ) : null}
                      </View>

                      {/* 일정 및 할 일 영역 */}
                      <View style={S.eventArea}>
                        {itemsToRender.map((it) => {
                          if (isTaskSummaryItem(it)) {
                            return (
                              <TaskSummaryBox
                                key={it.id}
                                count={it.count}
                                isCurrentMonth={isCurrentMonth}
                              />
                            )
                          }
                          const scheduleItem = it as ScheduleData;
                          return (
                            <ScheduleItem
                              key={`${scheduleItem.id}-${currentDateISO}`}
                              schedule={scheduleItem}
                              currentDateISO={currentDateISO}
                              isCurrentMonth={isCurrentMonth}
                            />
                          );
                        })}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  )
}

// --------------------------------------------------------------------
// 5. 스타일시트 정의 (S) - 기존 스타일 전부 유지
// --------------------------------------------------------------------
const { width: screenWidth } = Dimensions.get('window')
const horizontalPadding = 12
const cellWidth = (screenWidth - horizontalPadding) / 7
const MIN_CELL_HEIGHT = 115

const S = StyleSheet.create({
  contentContainerWrapper: { flex: 1, paddingBottom: 20, paddingTop: 0 },
  contentArea: { flex: 1, paddingHorizontal: 6, paddingTop: 5 },
  scrollContentContainer: { paddingBottom: 20 },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 0,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  dayCellFixed: { width: cellWidth, alignItems: 'center' },
  dayTextBase: { textAlign: 'center', color: '#333', fontWeight: '600', fontSize: 12 },
  sunText: { color: 'red' },
  satText: { color: 'blue' },

  calendarGrid: {},
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dateCell: {
    width: cellWidth,
    minHeight: MIN_CELL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    position: 'relative',
    borderWidth: 0,
    paddingBottom: 2,
    overflow: 'visible',
    zIndex: 1,
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
  eventArea: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: EVENT_AREA_PADDING_TOP,
    paddingBottom: ITEM_MARGIN_VERTICAL,
  },
  focusedDayBorder: { borderWidth: 0.8, borderColor: '#AAAAAA', borderRadius: 4 },
  todayBorder: { borderWidth: 1.5, borderColor: '#CCCCCC', borderRadius: 4 },
  dateNumberBase: { color: 'black', zIndex: 1 },

  // 빠진 스타일 전부 복구
  sunDate: { color: 'red' },
  satDate: { color: 'blue' },
  otherMonthDateText: { color: 'gray' },
  otherMonthSunDate: { color: '#F0A0A0' },
  otherMonthSatDate: { color: '#A0A0FF' },
  otherMonthHolidayText: { color: '#F08080' },

  todayDateText: { fontWeight: 'bold' },
  holidayDateText: { color: 'red' },
  todayRoundedSquare: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 4,
    top: 4,
    left: 2,
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
  smallHolidayText: { fontSize: 7 },
  scheduleBox: {
    height: SCHEDULE_BOX_HEIGHT,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  //  반복 일정: 진한 보라색 배경
  recurringSchedule: {
    backgroundColor: SCHEDULE_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING, paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // 단일 일정: 연한 보라색 배경
  singleSchedule: {
    backgroundColor: SCHEDULE_LIGHT_COLOR,
    paddingLeft: TEXT_HORIZONTAL_PADDING, paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // 경계선: 진한 보라색
  singleScheduleBorder: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
  },
  scheduleText: {
    fontSize: 8, fontWeight: '500',
    textAlign: 'left',
    lineHeight: SCHEDULE_BOX_HEIGHT, marginTop: -1,
  },
  //  반복 일정 텍스트: 흰색
  recurringScheduleText: {
    color: '#FFFFFF',
    marginTop: -1,
    fontWeight: '700'
  },
  // 단일 일정 텍스트: 검정색
  singleScheduleText: { color: '#000', marginTop: -1, },

  checkboxTouchArea: { marginRight: 1, padding: 2, alignSelf: 'center' },
  checkboxBase: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkboxOff: { backgroundColor: '#FFFFFF', borderColor: '#000000' },
  checkboxOn: { backgroundColor: DARK_GRAY_COLOR, borderColor: DARK_GRAY_COLOR },
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
  taskBoxNoCheckbox: {
    height: TASK_BOX_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 2,
    paddingLeft: 1,
    paddingRight: 0,
    justifyContent: 'center',
    marginBottom: ITEM_MARGIN_VERTICAL,
  },
  taskBoxBordered: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingLeft: TEXT_HORIZONTAL_PADDING,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  // Task 텍스트 스타일
  taskText: {
    fontSize: 8, color: '#333', fontWeight: '400', flex: 1,
    textAlign: 'left', lineHeight: TASK_BOX_HEIGHT,
    marginTop: -1,
    textAlignVertical: 'center',
  },

  dimmedItem: {
    opacity: 0.3,
  },

  // 멀티데이(기간이 긴 일정)스타일
  multiDayContainer: {
    width: '100%',
    marginBottom: ITEM_MARGIN_VERTICAL,
    height: SCHEDULE_BOX_HEIGHT,
    justifyContent: 'center',
    overflow: 'visible',
  },
  multiBarBase: {
    height: SCHEDULE_BOX_HEIGHT,
    backgroundColor: SCHEDULE_LIGHT_COLOR,
    paddingHorizontal: 0,
    justifyContent: 'center',
    borderRadius: 0,

    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'transparent',

    marginLeft: -6,
    marginRight: -6,
  },
  multiBarLeftEdge: {
    borderLeftWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    paddingLeft: TEXT_HORIZONTAL_PADDING,
  },
  multiBarRightEdge: {
    borderRightWidth: SINGLE_SCHEDULE_BORDER_WIDTH,
    borderColor: SCHEDULE_COLOR,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    paddingRight: TEXT_HORIZONTAL_PADDING,
  },
  multiBarText: {
    fontSize: 8,
    color: '#000',
    fontWeight: '500',
    lineHeight: SCHEDULE_BOX_HEIGHT,
    marginTop: -1,
  },
  multiStartContainer: {},
  multiEndContainer: {},
});
