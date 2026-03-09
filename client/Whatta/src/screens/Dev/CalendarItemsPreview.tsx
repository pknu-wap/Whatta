// 컴포넌트 테스트 
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import FixedScheduleCard from '@/components/calendar-items/schedule/FixedScheduleCard'
import RepeatScheduleCard from '@/components/calendar-items/schedule/RepeatScheduleCard'
import RangeScheduleBar from '@/components/calendar-items/schedule/RangeScheduleBar'
import TaskItemCard from '@/components/calendar-items/task/TaskItemCard'
import TaskGroupCard from '@/components/calendar-items/task/TaskGroupCard'

const DAY_VIEW_WIDTH = 308
const TOP_HEIGHT = 30
const BOTTOM_HEIGHT = 60

export default function CalendarItemsPreview() {
  const [dayBottomGroupExpanded, setDayBottomGroupExpanded] = useState(false)
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({})

  return (
    <ScrollView contentContainerStyle={S.container}>
      <Text style={S.h1}>Day Items Preview</Text>

      <Text style={S.h2}>일간 상단 (너비 308, 높이 30)</Text>
      <View style={{ width: DAY_VIEW_WIDTH, height: TOP_HEIGHT }}>
        <FixedScheduleCard
          id="d-top-fixed"
          title="상단 고정 일정"
          color="#9B4FFF"
          density="day"
          isUntimed
          layoutWidthHint={DAY_VIEW_WIDTH}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: TOP_HEIGHT }}>
        <RepeatScheduleCard
          id="d-top-repeat"
          title="상단 가변 일정"
          color="#9B4FFF"
          density="day"
          isUntimed
          layoutWidthHint={DAY_VIEW_WIDTH}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: TOP_HEIGHT }}>
        <RangeScheduleBar
          id="d-top-range"
          title="상단 기간 일정"
          color="#9B4FFF"
          startISO="2026-03-06"
          endISO="2026-03-08"
          isStart
          isEnd
          density="day"
          isUntimed
          layoutWidthHint={DAY_VIEW_WIDTH}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: TOP_HEIGHT }}>
        <TaskItemCard
          id="d-top-task"
          title="상단 할 일"
          done={!!doneMap['d-top-task']}
          density="day"
          isUntimed
          layoutWidthHint={DAY_VIEW_WIDTH}
          onToggle={(id, next) => setDoneMap((prev) => ({ ...prev, [id]: next }))}
        />
      </View>

      <Text style={S.h2}>일간 하단 (너비 308, 높이 60)</Text>
      <View style={{ width: DAY_VIEW_WIDTH, height: BOTTOM_HEIGHT }}>
        <FixedScheduleCard
          id="d-bottom-fixed"
          title="하단 고정 일정"
          color="#9B4FFF"
          density="day"
          timeRangeText="10:00~11:00"
          layoutWidthHint={DAY_VIEW_WIDTH}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: BOTTOM_HEIGHT }}>
        <RepeatScheduleCard
          id="d-bottom-repeat"
          title="하단 가변 일정"
          color="#9B4FFF"
          density="day"
          timeRangeText="10:00~11:00"
          layoutWidthHint={DAY_VIEW_WIDTH}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: BOTTOM_HEIGHT }}>
        <TaskItemCard
          id="d-bottom-task"
          title="하단 할 일"
          done={!!doneMap['d-bottom-task']}
          density="day"
          layoutWidthHint={DAY_VIEW_WIDTH}
          onToggle={(id, next) => setDoneMap((prev) => ({ ...prev, [id]: next }))}
        />
      </View>

      <View style={S.space8} />
      <View style={{ width: DAY_VIEW_WIDTH, height: BOTTOM_HEIGHT }}>
        <TaskGroupCard
          groupId="g-day-bottom"
          density="day"
          layoutWidthHint={DAY_VIEW_WIDTH}
          expanded={dayBottomGroupExpanded}
          onToggleExpand={(_, next) => setDayBottomGroupExpanded(next)}
          onToggleTask={(id, next) => setDoneMap((prev) => ({ ...prev, [id]: next }))}
          tasks={[
            { id: 'd-group-1', title: '일간 하단 할 일 1', done: !!doneMap['d-group-1'] },
            { id: 'd-group-2', title: '일간 하단 할 일 2', done: !!doneMap['d-group-2'] },
          ]}
        />
      </View>
    </ScrollView>
  )
}

const S = StyleSheet.create({
  container: {
    marginTop: 60,
    padding: 16,
    backgroundColor: '#F8F8FA',
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 4,
  },
  h2: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555555',
    marginTop: 8,
  },
  space8: {
    height: 8,
  },
})
