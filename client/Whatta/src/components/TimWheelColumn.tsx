import React, { useRef, useEffect } from 'react'
import { FlatList, View, Text } from 'react-native'

const ITEM_H = 32 // 한 줄 높이
const VISIBLE = 5 // 위·아래 2줄씩 보이게
const SNAP = ITEM_H

export function TimeWheelColumn({
  data,
  index,
  onChange,
  width,
  fontSize = 18,
}: {
  data: (string | number)[]
  index: number // 선택 중인 인덱스
  onChange: (idx: number) => void
  width: number // 컬럼 폭 (시/분/AMPM 각각 다르게)
  fontSize?: number
}) {
  const listRef = useRef<FlatList>(null)

  // 외부 값 → 스크롤 위치 동기화
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: index * SNAP, animated: false })
  }, [index])

  return (
    <View style={{ width, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: SNAP, offset: SNAP * i, index: i })}
        snapToInterval={SNAP}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / SNAP)
          const clamped = Math.max(0, Math.min(idx, data.length - 1))
          onChange(clamped)
        }}
        renderItem={({ item }) => (
          <View
            style={{
              height: SNAP,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize, includeFontPadding: false }}>{item}</Text>
          </View>
        )}
      />
      {/* 중앙 하이라이트(선만) → 텍스트 위에 떠서 가리지 않음 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: (ITEM_H * VISIBLE - 24) / 2,
          height: 24,
          borderWidth: 2,
          borderColor: 'rgba(176,79,255,0.45)',
          borderRadius: 8,
        }}
      />
      {/* 상/하 페이드 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: ITEM_H,
          backgroundColor: 'white',
          opacity: 0.9,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: ITEM_H,
          backgroundColor: 'white',
          opacity: 0.9,
        }}
      />
    </View>
  )
}
