import React from 'react'
import { View, Text, Dimensions } from 'react-native'

import { ScheduleData } from '@/api/adapter'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'

import {
  SINGLE_SCHEDULE_BORDER_WIDTH,
  TEXT_HORIZONTAL_PADDING,
  EVENT_HPAD,
} from './constants'
import { colorsFromKey } from './colorUtils'
import { S } from './S'

export type UISchedule = ScheduleData & { colorKey?: string }

interface ScheduleItemProps {
  schedule: UISchedule
  currentDateISO: string
  isCurrentMonth: boolean
}

const { width: screenWidth } = Dimensions.get('window')
const horizontalPadding = 12
const cellWidth = (screenWidth - horizontalPadding) / 7

export const ScheduleItem: React.FC<ScheduleItemProps> = ({
  schedule,
  currentDateISO,
  isCurrentMonth,
}) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null
  const { primary: baseColor } = colorsFromKey(schedule.colorKey)

  // Task
  if (schedule.isTask) {
    return (
      <View style={[S.taskBox, S.taskBoxBordered, dimmedStyle]}>
        <View style={S.checkboxTouchArea}>
          {/* 완료 여부에 따라 아이콘 변경 */}
          {schedule.isCompleted ? (
            <CheckOn width={10} height={10} />
          ) : (
            <CheckOff width={10} height={10} />
          )}
        </View>
        <Text
          style={[
            S.taskText,
            // 완료된 경우 취소선 스타일 추가
            schedule.isCompleted && {
              textDecorationLine: 'line-through',
              color: '#999',
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {schedule.name}
        </Text>
      </View>
    )
  }

  // Multi-day
  if (schedule.multiDayStart && schedule.multiDayEnd) {
    const dayISO = currentDateISO

    const inToday = dayISO >= schedule.multiDayStart && dayISO <= schedule.multiDayEnd

    const toLocalISO = (d: Date) => {
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      )
    }

    const cur = new Date(dayISO + 'T00:00:00')
    const prev = new Date(cur)
    prev.setDate(prev.getDate() - 1)
    const prevStr = toLocalISO(prev)
    const inPrev = prevStr >= schedule.multiDayStart && prevStr <= schedule.multiDayEnd
    const dow = cur.getDay()
    const isRowStart = inToday && (!inPrev || dow === 0)

    if (!isRowStart) {
      return <View style={S.laneSpacer} />
    }

    const spanToWeekEnd = 7 - dow
    const end = new Date(schedule.multiDayEnd + 'T00:00:00')
    const daysDiff =
      Math.floor((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const colSpan = Math.max(1, Math.min(spanToWeekEnd, daysDiff))
    const reachWeekEnd = colSpan === spanToWeekEnd

    const { primary: primaryColor, light: softColor } = colorsFromKey(schedule.colorKey)

    const isRealStart = dayISO === schedule.multiDayStart
    const isRealEndInThisRow = colSpan === daysDiff

    const width =
      colSpan * cellWidth -
      EVENT_HPAD * 2 +
      (isRealEndInThisRow ? SINGLE_SCHEDULE_BORDER_WIDTH : 0)
    const segPosStyle = reachWeekEnd ? { left: -1, right: 0 } : { left: -EVENT_HPAD }

    return (
      <View style={[S.multiDayContainer, !isCurrentMonth ? S.dimmedItem : null]}>
        <View
          style={[
            S.multiSegAbs,
            segPosStyle,
            {
              width,
              backgroundColor: softColor,
              borderLeftWidth: isRealStart ? SINGLE_SCHEDULE_BORDER_WIDTH : 0,
              borderRightWidth: isRealEndInThisRow ? SINGLE_SCHEDULE_BORDER_WIDTH : 0,
              borderColor: primaryColor,
              borderTopLeftRadius: isRealStart ? 3 : 0,
              borderBottomLeftRadius: isRealStart ? 3 : 0,
              borderTopRightRadius: isRealEndInThisRow ? 3 : 0,
              borderBottomRightRadius: isRealEndInThisRow ? 3 : 0,
              paddingLeft: isRealStart ? TEXT_HORIZONTAL_PADDING : 4,
              paddingRight: isRealEndInThisRow ? TEXT_HORIZONTAL_PADDING : 4,
            },
          ]}
        >
          {isRealStart ? (
            <Text numberOfLines={1} ellipsizeMode="clip" style={S.multiBarText}>
              {schedule.name}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  //  하루짜리 반복일정인지 판별
  const isOneDayRecurring =
    schedule.isRecurring && !schedule.multiDayStart && !schedule.multiDayEnd

  if (isOneDayRecurring) {
    const main = schedule.colorKey ? `#${schedule.colorKey}` : baseColor
    const bg = `${main}33` // 반복일정 투명도

    return (
      <View
        style={[
          S.scheduleBox,
          {
            backgroundColor: bg, // 연한색
            borderRadius: 0, // 둥근 모서리 제거
            paddingLeft: TEXT_HORIZONTAL_PADDING,
          },
          dimmedStyle,
        ]}
      >
        <Text
          style={[
            S.scheduleText,
            { color: '#000' }, // 반복일정은 검정 텍스트
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {schedule.name}
        </Text>
      </View>
    )
  }

  // 단일 일정
  return (
    <View
      style={[
        S.scheduleBox,
        { backgroundColor: baseColor, paddingLeft: TEXT_HORIZONTAL_PADDING },
        dimmedStyle,
      ]}
    >
      <Text
        style={[S.scheduleText, { color: '#000' }]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {schedule.name}
      </Text>
    </View>
  )
}

interface TaskSummaryBoxProps {
  count: number
  isCurrentMonth: boolean
  tasks: ScheduleData[]
}

export const TaskSummaryBox: React.FC<TaskSummaryBoxProps> = ({
  count,
  isCurrentMonth,
  tasks,
}) => {
  const dimmedStyle = !isCurrentMonth ? S.dimmedItem : null
  const allCompleted = tasks.length > 0 && tasks.every((t: any) => t.isCompleted)

  return (
    <View style={[S.taskBox, S.taskBoxBordered, dimmedStyle]}>
      <View style={S.checkboxTouchArea}>
        {/* 모두 완료면 On, 아니면 Off */}
        {allCompleted ? (
          <CheckOn width={10} height={10} />
        ) : (
          <CheckOff width={10} height={10} />
        )}
      </View>
      <Text
        style={[
          S.taskText,
          allCompleted && { textDecorationLine: 'line-through', color: '#999' },
        ]}
        numberOfLines={1}
      >
        {`${count}개`}
      </Text>
    </View>
  )
}
