import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Xbutton from '@/assets/icons/x.svg'

type Props = {
  title: string
  onRemove?: () => void
}

export default function LabelChip({ title, onRemove }: Props) {
  return (
    <View style={styles.wrap}>
      <Text numberOfLines={1} ellipsizeMode="clip" style={styles.txt}>
        {title}
      </Text>

      {!!onRemove && (
        <Pressable hitSlop={8} onPress={onRemove} style={styles.xBtn}>
          <Xbutton width={10} height={10} color="#808080" />
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
    transform: [{ translateY: -5 }],
  },
})
