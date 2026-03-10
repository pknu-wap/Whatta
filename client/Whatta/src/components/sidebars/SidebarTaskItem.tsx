import React, { memo, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-worklets'
import * as Haptics from 'expo-haptics'

import { bus } from '@/lib/eventBus'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import CheckOff from '@/assets/icons/check_off.svg'
import CheckOn from '@/assets/icons/check_on.svg'

type Props = {
  id: string
  title: string
  checked: boolean
  onToggle: () => void
  onLongPressHandle?: () => void
  isActive?: boolean
}

const SidebarTaskItem = memo(function SidebarTaskItem({
  id,
  title,
  checked,
  onToggle,
  onLongPressHandle,
  isActive,
}: Props) {
  const start = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:start', { task: { id, title }, x, y })
    },
    [id, title],
  )

  const move = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:move', { task: { id, title }, x, y })
    },
    [id, title],
  )

  const drop = useCallback(
    (x: number, y: number) => {
      bus.emit('xdrag:drop', { task: { id, title }, x, y })
    },
    [id, title],
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(180)
        .minDistance(10)
        .shouldCancelWhenOutside(false)
        .onStart((e) => {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)
          runOnJS(start)(e.absoluteX, e.absoluteY)
        })
        .onChange((e) => {
          runOnJS(move)(e.absoluteX, e.absoluteY)
        })
        .onFinalize((e) => {
          runOnJS(drop)(e.absoluteX, e.absoluteY)
        }),
    [start, move, drop],
  )

  return (
    <View style={[S.card, isActive && S.hiddenCard]}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        {checked ? <CheckOn width={24} height={24} /> : <CheckOff width={24} height={24} />}
      </Pressable>

      {checked ? (
        <View style={S.titleArea}>
          <Text style={[S.title, S.titleDone]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : (
        <GestureDetector gesture={pan}>
          <View style={S.titleArea}>
            <Text style={S.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </GestureDetector>
      )}

      {onLongPressHandle ? (
        <Pressable
          onLongPress={onLongPressHandle}
          delayLongPress={180}
          hitSlop={12}
          style={S.handle}
          accessibilityLabel="drag handle"
        />
      ) : (
        <View style={S.handleSpacer} />
      )}
    </View>
  )
})

export default SidebarTaskItem

const S = StyleSheet.create({
  card: {
    width: 155,
    height: 60,
    flexDirection: 'row',
    borderWidth: 0.4,
    borderColor: colors.divider.divider1,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 12,
  },
  title: {
    ...ts('label3'),
    color: colors.text.text1,
    marginLeft: 10,
    flexShrink: 1,
  },
  titleArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  hiddenCard: {
    opacity: 0,
  },
  handle: {
    width: 28,
    height: 36,
    marginLeft: 6,
    backgroundColor: 'transparent',
  },
  handleSpacer: {
    width: 34,
  },
})
