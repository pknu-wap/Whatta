import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import colors from '@/styles/colors'
import type { RootStackParamList } from '@/navigation/RootStack'

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <View style={S.wrap}>
      <Text style={S.title}>홈 화면</Text>
      <Text style={S.desc}>첫 진입 하단바의 시작 화면입니다. 이후 실제 홈 UI로 교체하면 됩니다.</Text>
      <Pressable style={S.myPageButton} onPress={() => navigation.navigate('MyPage')}>
        <Text style={S.myPageButtonText}>마이페이지</Text>
      </Pressable>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background.bg1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.text1,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: colors.text.text3,
    textAlign: 'center',
  },
  myPageButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.background.bg2,
  },
  myPageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.text1,
  },
})
