import React from 'react'
import { StyleSheet, View } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native'

import Plus from '@/assets/icons/fab-main.svg'

type FabProps = {
  bottomOffset?: number
  rightOffset?: number
  collapsedIcon?: React.ReactNode
  onPressPrimary?: () => void
}

const BTN_SIZE = 66

export default function FabHybridIOS({
  bottomOffset = 97,
  rightOffset = 18,
  collapsedIcon = <Plus width={BTN_SIZE} height={BTN_SIZE} />,
  onPressPrimary,
}: FabProps) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[S.wrap, { bottom: bottomOffset, right: rightOffset }]}
      >
        <TouchableWithoutFeedback
          accessibilityRole="button"
          onPress={onPressPrimary}
          hitSlop={10}
          style={[S.iconContainer, S.shadow]}
        >
          {collapsedIcon}
        </TouchableWithoutFeedback>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 36,
  },
  iconContainer: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: 'rgb(82, 82, 82)',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
})
