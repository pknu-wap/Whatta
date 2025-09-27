import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function PlaceholderScreen() {
  return (
    <View style={S.wrap}>
      <Text style={S.title}>준비 중 화면</Text>
      <Text style={S.desc}>디자인/백엔드 확정 후 실제 컴포넌트로 교체합니다.</Text>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  desc: { fontSize: 14, color: '#666', textAlign: 'center' },
})
