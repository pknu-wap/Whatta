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
const MINI_WIDTH_THRESHOLD = 60
const NARROW_WIDTH_THRESHOLD = 80
const COMPACT_WIDTH_THRESHOLD = 90
const WIDE_WIDTH_THRESHOLD = 180
const WEEK_SINGLE_CELL_THRESHOLD = 44
const WEEK_COMPACT_HEADER_THRESHOLD = 52
const SMALL_TASK_ICON_WIDTH_THRESHOLD = 54
const WEEK_VERTICAL_WIDTH_THRESHOLD = 36
const WEEK_VERTICAL_RADIUS = 4
const TASK_DETAIL_OPEN_MIN_WIDTH = 120

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

const LABEL3_TEXT_STYLE = ts('label3')
const MONTH_TASK_TEXT_STYLE = ts('label4')
const WEEK_TEXT_STYLE = ts('label4Week')

function TaskGroupCard({
  groupId,
  tasks,
  density = 'day',
  expanded = false,
  layoutWidthHint,
  hideText = false,
  onToggleExpand,
  onToggleTask,
  onPressTask,
}: TaskGroupCardProps) {
  // 그룹 컨테이너의 실제 width를 읽어 헤더/아이콘 표시를 분기한다.
  const [layoutWidth, setLayoutWidth] = React.useState(0)
  const resolvedWidth = layoutWidthHint ?? layoutWidth
  const d = TASK_GROUP_SIZE[density]
  const isMini = resolvedWidth > 0 && resolvedWidth <= MINI_WIDTH_THRESHOLD
  const isCompact = resolvedWidth > 0 && resolvedWidth <= COMPACT_WIDTH_THRESHOLD
  const isWide = resolvedWidth > 0 && resolvedWidth >= WIDE_WIDTH_THRESHOLD
  const isNarrow = resolvedWidth > 0 && resolvedWidth <= NARROW_WIDTH_THRESHOLD
  const isWeekGroup = density === 'week'
  const isDayGroup = density === 'day'
  const isWeekSingleCell = isWeekGroup && resolvedWidth > 0 && resolvedWidth <= WEEK_SINGLE_CELL_THRESHOLD
  const isWeekVertical = isWeekGroup && resolvedWidth > 0 && resolvedWidth <= WEEK_VERTICAL_WIDTH_THRESHOLD
  const isWeekCompactHeader =
    isWeekGroup && resolvedWidth > 0 && resolvedWidth <= WEEK_COMPACT_HEADER_THRESHOLD
  const spacingKey: keyof typeof TASK_GROUP_SPACING =
    density === 'month' ? 'month' : isWeekCompactHeader ? 'week7' : isWeekGroup ? 'week5' : 'default'
  const spacing = TASK_GROUP_SPACING[spacingKey]
  const effectivePadLeft = isWeekSingleCell ? 3 : d.padX
  const effectivePadRight = isWeekGroup ? (expanded ? 1 : 0) : d.padX
  const outerPadLeft = isWeekGroup && expanded ? 0 : effectivePadLeft
  const outerPadRight = isWeekGroup && expanded ? 0 : effectivePadRight
  const expandedWeekHeaderInset =
    isWeekGroup && expanded && resolvedWidth > 0
      ? clamp(Math.round(resolvedWidth * 0.13), 5, 9)
      : 0
  const expandedWeekRowInset =
    isWeekGroup && expanded && resolvedWidth > 0
      ? clamp(Math.round(resolvedWidth * 0.06), 2, 5)
      : 0
  const minGroupHeight = isWeekGroup ? 0 : isDayGroup ? 60 : 24
  const headerMinHeight = expanded ? (isCompact ? 30 : 34) : minGroupHeight
  const groupRadius = isWeekVertical ? WEEK_VERTICAL_RADIUS : isDayGroup ? 12 : 8
  // 좁은 칸에서는 아이콘/텍스트를 줄여 가독성을 유지한다.
  const taskIconSize = resolvedWidth > 0 && resolvedWidth <= SMALL_TASK_ICON_WIDTH_THRESHOLD ? 14 : 16
  const headerIconSize = isMini ? 8 : 10
  const canExpand = typeof onToggleExpand === 'function' && !hideText
  const canToggleTask = typeof onToggleTask === 'function'
  const canOpenTask =
    typeof onPressTask === 'function' && resolvedWidth >= TASK_DETAIL_OPEN_MIN_WIDTH
  const baseHeader = expanded
    ? isCompact
      ? '할 일'
      : '할 일 목록'
    : isWide
      ? '할 일이 있어요!'
      : '할 일'
  const displayHeader = isWeekVertical ? baseHeader.replace(/\s+/g, '').split('').join('\n') : baseHeader
  const headerTextStyle =
    density === 'month'
      ? LABEL3_TEXT_STYLE
      : density === 'week'
        ? (isCompact ? LABEL3_TEXT_STYLE : WEEK_TEXT_STYLE)
        : LABEL3_TEXT_STYLE
  const taskTextStyle =
    density === 'month' ? MONTH_TASK_TEXT_STYLE : density === 'week' ? WEEK_TEXT_STYLE : LABEL3_TEXT_STYLE

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    if (width > 0 && width !== layoutWidth) setLayoutWidth(width)
  }

  return (
    <View
      onLayout={layoutWidthHint == null ? handleLayout : undefined}
      style={[
        S.wrap,
        {
          paddingLeft: outerPadLeft,
          paddingRight: outerPadRight,
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
          expanded && { paddingBottom: 6 },
          expandedWeekHeaderInset > 0 && {
            paddingLeft: expandedWeekHeaderInset,
            paddingRight: expandedWeekHeaderInset,
          },
          isWeekVertical && S.headerVertical,
          isWeekCompactHeader && S.headerCompactCentered,
          !expanded && S.headerCollapsedFill,
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
                  marginLeft: isWeekCompactHeader ? 0 : spacing.arrowMarginLeft,
                  marginRight: isWeekCompactHeader ? 4 : spacing.arrowMarginRight,
                },
                isMini &&
                  !isWeekCompactHeader && {
                    marginLeft: spacing.arrowMarginLeft - 1,
                    marginRight: spacing.arrowMarginRight - 1,
                  },
                !expanded && S.arrowCollapsed,
              ]}
            />
            <Text
              style={[
                S.headerText,
                {
                  fontSize: headerTextStyle.fontSize ?? d.font,
                  lineHeight: headerTextStyle.lineHeight,
                  fontWeight: headerTextStyle.fontWeight,
                },
                isMini && !isWeekCompactHeader && { marginLeft: spacing.miniHeaderTextOffset },
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
      {expanded ? <View style={S.headerDivider} /> : null}

      {expanded ? (
        <View style={S.listWrap}>
          {tasks.map((task) => (
            <View
              key={task.id}
              style={[
                S.taskRow,
                expandedWeekRowInset > 0 && {
                  paddingLeft: expandedWeekRowInset,
                  paddingRight: expandedWeekRowInset,
                },
              ]}
            >
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
                disabled={!canOpenTask && !canToggleTask}
                pointerEvents={canOpenTask || canToggleTask ? 'auto' : 'none'}
                onPress={() => {
                  if (canOpenTask) {
                    onPressTask?.(task.id)
                    return
                  }
                  onToggleTask?.(task.id, !task.done)
                }}
                style={S.taskTextWrap}
              >
                <Text
                  style={[
                    S.taskText,
                    {
                      fontSize: taskTextStyle.fontSize,
                      lineHeight: taskTextStyle.lineHeight,
                      fontWeight: taskTextStyle.fontWeight,
                    },
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
  headerCompactCentered: {
    justifyContent: 'center',
  },
  headerCollapsedFill: {
    flex: 1,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: TASK_BORDER_COLOR,
    marginHorizontal: 0,
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
