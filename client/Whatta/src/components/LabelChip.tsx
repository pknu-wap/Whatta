import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Xbutton from '@/assets/icons/x.svg'

type Props = {
  title: string
  onRemove?: () => void
  removeIconSize?: number
}

export default function LabelChip({ title, onRemove, removeIconSize = 10 }: Props) {
  return (
    <View style={styles.wrap}>
      <Text numberOfLines={1} ellipsizeMode="clip" style={styles.txt}>
        {title}
      </Text>

      {!!onRemove && (
        <Pressable
          hitSlop={8}
          onPress={onRemove}
          style={[styles.xBtn, { transform: [{ translateY: -(removeIconSize / 2) }] }]}
        >
          <Xbutton width={removeIconSize} height={removeIconSize} color="#808080" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 44,
    maxWidth: 140,
    height: 24,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: 6,
    borderWidth: 0.3,
    borderColor: '#B3B3B3',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  txt: {
    color: '#000',
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 22,
    includeFontPadding: false,
  },
  xBtn: {
    position: 'absolute',
    right: 5,
    top: '50%',
  },
})
