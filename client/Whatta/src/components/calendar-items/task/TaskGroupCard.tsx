import React from 'react'
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'

import type { TaskGroupCardProps } from '@/components/calendar-items/types'
import { TASK_GROUP_SIZE } from '@/components/calendar-items/sizeTokens'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'
import DownIcon from '@/assets/icons/down.svg'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'

const TASK_GROUP_HEADER_COLOR = colors.brand.primary
const TASK_BORDER_COLOR = colors.divider.divider1

function TaskGroupCard({
  groupId,
  tasks,
  density = 'day',
  expanded = false,
  title: _title,
  layoutWidthHint,
  onToggleExpand,
  onToggleTask,
}: TaskGroupCardProps) {
  // 그룹 컨테이너의 실제 width를 읽어 헤더/아이콘 표시를 분기한다.
  const [layoutWidth, setLayoutWidth] = React.useState(0)
  const resolvedWidth = layoutWidthHint ?? layoutWidth
  const d = TASK_GROUP_SIZE[density]
  const dayLabel3 = ts('label3')
  const monthLabel3 = ts('label3')
  const monthLabel4 = ts('label4')
  const weekLabel4 = ts('label4Week')
  const isMini = resolvedWidth > 0 && resolvedWidth <= 60
  const isCompact = resolvedWidth > 0 && resolvedWidth <= 90
  const isWide = resolvedWidth > 0 && resolvedWidth >= 180
  const isNarrow = resolvedWidth > 0 && resolvedWidth <= 80
  const isWeekGroup = density === 'week'
  const isDayGroup = density === 'day'
  const isWeekSingleCell = isWeekGroup && resolvedWidth > 0 && resolvedWidth <= 44
  const effectivePadX = isWeekSingleCell ? 4 : d.padX
  const minGroupHeight = isWeekGroup ? 0 : isDayGroup ? 60 : 24
  const headerMinHeight = expanded ? (isCompact ? 30 : 34) : minGroupHeight
  const groupRadius = 8
  // 좁은 칸에서는 아이콘/텍스트를 줄여 가독성을 유지한다.
  const taskIconSize = resolvedWidth > 0 && resolvedWidth <= 54 ? 14 : 16
  const headerIconSize = isMini ? 8 : 10
  const canExpand = typeof onToggleExpand === 'function'
  const canToggleTask = typeof onToggleTask === 'function'
  const displayHeader = expanded
    ? isCompact
      ? '할 일'
      : '할 일 목록'
    : isWide
      ? '할 일이 있어요!'
      : '할 일'

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    if (width !== layoutWidth) setLayoutWidth(width)
  }

  return (
    <View
      onLayout={layoutWidthHint == null ? handleLayout : undefined}
      style={[
        S.wrap,
        {
          paddingHorizontal: effectivePadX,
          paddingVertical: expanded ? (isCompact ? 4 : 6) : 0,
          borderRadius: groupRadius,
          alignSelf: 'stretch',
          height: expanded ? undefined : '100%',
          // 그룹 세로 길이 제한:
          // week 하단에서는 최소 62, 그 외 최소 24
          minHeight: minGroupHeight,
          maxHeight: expanded ? undefined : isWeekGroup ? undefined : 60,
        },
      ]}
    >
      <Pressable
        disabled={!canExpand}
        pointerEvents={canExpand ? 'auto' : 'none'}
        onPress={() => onToggleExpand?.(groupId, !expanded)}
        style={[
          S.header,
          { minHeight: headerMinHeight },
          !expanded && S.headerCollapsedFill,
          expanded && S.headerExpanded,
        ]}
      >
        <DownIcon
          width={headerIconSize}
          height={headerIconSize}
          color={colors.text.text1}
          style={[S.arrowIcon, isMini && S.arrowIconMini, !expanded && S.arrowCollapsed]}
        />
        <Text
          style={[
            S.headerText,
            density === 'day'
              ? {
                  fontSize: dayLabel3.fontSize,
                  lineHeight: dayLabel3.lineHeight,
                  fontWeight: dayLabel3.fontWeight,
                }
              : density === 'week'
              ? {
                  fontSize: isCompact ? dayLabel3.fontSize : weekLabel4.fontSize,
                  lineHeight: isCompact ? dayLabel3.lineHeight : weekLabel4.lineHeight,
                  fontWeight: weekLabel4.fontWeight,
                }
              : density === 'month'
              ? {
                  fontSize: monthLabel3.fontSize,
                  lineHeight: monthLabel3.lineHeight,
                  fontWeight: monthLabel3.fontWeight,
                }
              : { fontSize: d.font },
            isMini && S.headerTextMini,
            expanded && { color: colors.text.text3 },
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {displayHeader}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={S.listWrap}>
          {tasks.map((task) => (
            <View key={task.id} style={S.taskRow}>
              <Pressable
                disabled={!canToggleTask}
                pointerEvents={canToggleTask ? 'auto' : 'none'}
                onPress={() => onToggleTask?.(task.id, !task.done)}
                hitSlop={8}
                style={[S.taskCheckbox, { width: taskIconSize, height: taskIconSize }]}
              >
                {task.done ? (
                  <CheckOn width={taskIconSize} height={taskIconSize} />
                ) : (
                  <CheckOff width={taskIconSize} height={taskIconSize} />
                )}
              </Pressable>

              <Pressable
                disabled={!canToggleTask}
                pointerEvents={canToggleTask ? 'auto' : 'none'}
                onPress={() => onToggleTask?.(task.id, !task.done)}
                style={S.taskTextWrap}
              >
                <Text
                  style={[
                    S.taskText,
                    density === 'day'
                      ? {
                          fontSize: dayLabel3.fontSize,
                          lineHeight: dayLabel3.lineHeight,
                          fontWeight: dayLabel3.fontWeight,
                        }
                      : density === 'week'
                      ? {
                          fontSize: weekLabel4.fontSize,
                          lineHeight: weekLabel4.lineHeight,
                          fontWeight: weekLabel4.fontWeight,
                        }
                      : density === 'month'
                      ? {
                          fontSize: monthLabel4.fontSize,
                          lineHeight: monthLabel4.lineHeight,
                          fontWeight: monthLabel4.fontWeight,
                        }
                      : null,
                    task.done && S.taskTextDone,
                  ]}
                  numberOfLines={isNarrow ? 2 : 1}
                  ellipsizeMode="tail"
                >
                  {task.title}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default React.memo(TaskGroupCard)

const S = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background.bg1,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TASK_BORDER_COLOR,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
    paddingVertical: 0,
  },
  headerCollapsedFill: {
    flex: 1,
  },
  headerExpanded: {
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TASK_BORDER_COLOR,
  },
  arrowIcon: {
    marginRight: 6,
  },
  arrowIconMini: {
    marginRight: 4,
  },
  arrowCollapsed: {
    transform: [{ rotate: '180deg' }],
  },
  headerText: {
    flex: 1,
    color: TASK_GROUP_HEADER_COLOR,
    fontWeight: '800',
  },
  headerTextMini: {
    marginLeft: -1,
  },
  listWrap: {
    paddingTop: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingVertical: 4,
  },
  taskCheckbox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  taskTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  taskText: {
    color: colors.text.text1,
    fontWeight: '700',
    fontSize: 12,
  },
  taskTextDone: {
    color: colors.text.text1,
    textDecorationLine: 'line-through',
  },
})
