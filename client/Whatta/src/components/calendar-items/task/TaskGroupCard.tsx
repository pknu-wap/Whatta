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
const WEEK_VERTICAL_WIDTH_THRESHOLD = 36
const WEEK_VERTICAL_RADIUS = 4

type TaskGroupSpacing = {
  arrowMarginLeft: number
  arrowMarginRight: number
  checkboxTextGap: number
  miniHeaderTextOffset: number
}

const TASK_GROUP_SPACING: Record<'month' | 'week5' | 'week7' | 'default', TaskGroupSpacing> = {
  month: {
    arrowMarginLeft: -1,
    arrowMarginRight: 6,
    checkboxTextGap: 6,
    miniHeaderTextOffset: 0,
  },
  week5: {
    arrowMarginLeft: -4,
    arrowMarginRight: 6,
    checkboxTextGap: 5,
    miniHeaderTextOffset: 0,
  },
  week7: {
    arrowMarginLeft: -5,
    arrowMarginRight: 5,
    checkboxTextGap: 4,
    miniHeaderTextOffset: 0,
  },
  default: {
    arrowMarginLeft: -2,
    arrowMarginRight: 2,
    checkboxTextGap: 6,
    miniHeaderTextOffset: -1,
  },
}

function TaskGroupCard({
  groupId,
  tasks,
  density = 'day',
  expanded = false,
  title: _title,
  layoutWidthHint,
  hideText = false,
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
  const isWeekVertical = isWeekGroup && resolvedWidth > 0 && resolvedWidth <= WEEK_VERTICAL_WIDTH_THRESHOLD
  const isWeek7 = isWeekGroup && resolvedWidth > 0 && resolvedWidth <= 52
  const spacingKey: keyof typeof TASK_GROUP_SPACING =
    density === 'month' ? 'month' : isWeek7 ? 'week7' : isWeekGroup ? 'week5' : 'default'
  const spacing = TASK_GROUP_SPACING[spacingKey]
  const effectivePadLeft = isWeekSingleCell ? 3 : d.padX
  const effectivePadRight = isWeekGroup ? (expanded ? 1 : 0) : d.padX
  const minGroupHeight = isWeekGroup ? 0 : isDayGroup ? 60 : 24
  const headerMinHeight = expanded ? (isCompact ? 30 : 34) : minGroupHeight
  const groupRadius = isWeekVertical ? WEEK_VERTICAL_RADIUS : 8
  // 좁은 칸에서는 아이콘/텍스트를 줄여 가독성을 유지한다.
  const taskIconSize = resolvedWidth > 0 && resolvedWidth <= 54 ? 14 : 16
  const headerIconSize = isMini ? 8 : 10
  const canExpand = typeof onToggleExpand === 'function' && !hideText
  const canToggleTask = typeof onToggleTask === 'function'
  const baseHeader = expanded
    ? isCompact
      ? '할 일'
      : '할 일 목록'
    : isWide
      ? '할 일이 있어요!'
      : '할 일'
  const displayHeader = isWeekVertical ? baseHeader.replace(/\s+/g, '').split('').join('\n') : baseHeader

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
          paddingLeft: effectivePadLeft,
          paddingRight: effectivePadRight,
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
          isWeekVertical && S.headerVertical,
          !expanded && S.headerCollapsedFill,
          expanded && S.headerExpanded,
        ]}
      >
        {!hideText ? (
          <>
            <DownIcon
              width={headerIconSize}
              height={headerIconSize}
              color={colors.text.text1}
              style={[
                {
                  marginLeft: spacing.arrowMarginLeft,
                  marginRight: spacing.arrowMarginRight,
                },
                isMini && { marginLeft: spacing.arrowMarginLeft - 1, marginRight: spacing.arrowMarginRight - 1 },
                !expanded && S.arrowCollapsed,
              ]}
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
                isMini && { marginLeft: spacing.miniHeaderTextOffset },
                expanded && { color: colors.text.text3 },
                isWeekVertical && S.headerTextVertical,
              ]}
              numberOfLines={isWeekVertical ? 6 : 1}
              ellipsizeMode="clip"
            >
              {displayHeader}
            </Text>
          </>
        ) : null}
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
                style={[
                  S.taskCheckbox,
                  {
                    width: taskIconSize,
                    height: taskIconSize,
                    marginRight: spacing.checkboxTextGap,
                  },
                ]}
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
  headerVertical: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCollapsedFill: {
    flex: 1,
  },
  headerExpanded: {
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TASK_BORDER_COLOR,
  },
  arrowCollapsed: {
    transform: [{ rotate: '180deg' }],
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0,
    color: TASK_GROUP_HEADER_COLOR,
    fontWeight: '800',
  },
  headerTextVertical: {
    flex: 0,
    textAlign: 'center',
    lineHeight: 14,
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
